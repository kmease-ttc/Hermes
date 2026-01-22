import { storage } from "../storage";
import { db } from "../db";
import { CREW, type CrewId } from "@shared/registry";
import { 
  mergeAnomalies, 
  computePopularScore, 
  type CanonicalIssue 
} from "@shared/canonicalIssues";
import { getMissionsForCrew, MISSION_REGISTRY } from "@shared/missions/missionRegistry";

export type CrewTier = "looking_good" | "doing_okay" | "needs_attention";
export type CrewStatusValue = "looking_good" | "doing_okay" | "needs_attention";

export interface MissionsData {
  open: number;
  total: number;
  completed: number;
  completedThisWeek: number;
  highPriority: number;
  autoFixable: number;
}

export interface ScoreData {
  value: number | null;
  status: "ok" | "unknown";
  updatedAt: string;
}

export interface PrimaryMetricData {
  label: string;
  value: number | null;
  unit: string;
  deltaPercent: number | null;
  deltaLabel: string;
}

export interface ReadinessData {
  isReady: boolean;
  missingDependencies: string[];
  setupHint: string | null;
}

export interface CrewStatus {
  crewId: string;
  siteId: string;
  score: ScoreData;
  status: CrewStatusValue;
  tier: CrewTier;
  missions: MissionsData;
  primaryMetric: PrimaryMetricData;
  readiness: ReadinessData;
  updatedAt: string;
  isDegraded?: boolean;
  degradedSince?: string | null;
  consecutiveFailures?: number;
  lastErrorMessage?: string | null;
}

export interface ComputeCrewStatusOptions {
  siteId: string;
  crewId: string;
  timeWindowDays?: number;
}

async function computePopularCrewScore(siteId: string, timeWindowDays: number): Promise<{
  score: number;
  issues: CanonicalIssue[];
}> {
  const recentAnomalies = await storage.getRecentAnomalies(siteId, timeWindowDays);
  
  const rawAnomalies = recentAnomalies.map((anomaly, index) => ({
    id: `anomaly_${anomaly.id || index}`,
    date: anomaly.startDate || anomaly.endDate || new Date().toISOString().slice(0, 10),
    source: anomaly.anomalyType?.includes("gsc") ? "GSC" : "GA4",
    metric: anomaly.metric || "sessions",
    metricFamily: anomaly.anomalyType?.includes("traffic") ? "organic_traffic" : 
                  anomaly.anomalyType?.includes("click") ? "search_clicks" : "organic_traffic",
    dropPercent: anomaly.deltaPct || 0,
    currentValue: anomaly.observedValue || 0,
    baselineValue: anomaly.baselineValue || 0,
    zScore: anomaly.zScore || 0,
    severity: Math.abs(anomaly.zScore || 0) >= 3 ? "severe" as const : 
              Math.abs(anomaly.zScore || 0) >= 2 ? "moderate" as const : "mild" as const,
  }));
  
  const site = await storage.getSiteById(siteId);
  const domain = site?.baseUrl || "unknown";
  
  const canonicalIssues = mergeAnomalies(rawAnomalies, domain, 3);
  const score = canonicalIssues.length === 0 ? 100 : computePopularScore(canonicalIssues);
  
  return { score, issues: canonicalIssues };
}

async function computeLookoutCrewScore(): Promise<{
  score: number;
  totalKeywords: number;
  inTop10: number;
}> {
  const [keywords, rankings] = await Promise.all([
    storage.getSerpKeywords(true),
    storage.getLatestRankings(),
  ]);
  
  const totalKeywords = keywords.length;
  if (totalKeywords === 0) {
    return { score: 0, totalKeywords: 0, inTop10: 0 };
  }
  
  const inTop10 = rankings.filter(r => r.position !== null && r.position <= 10).length;
  const coverageRatio = inTop10 / totalKeywords;
  const score = Math.round(coverageRatio * 100);
  
  return { score, totalKeywords, inTop10 };
}

async function computeSpeedsterCrewScore(siteId: string): Promise<{
  score: number;
  performanceScore: number | null;
}> {
  const snapshots = await storage.getAgentSnapshots("speedster", siteId, 1);
  
  if (snapshots.length === 0) {
    return { score: 50, performanceScore: null };
  }
  
  const latestSnapshot = snapshots[0];
  const metricsJson = latestSnapshot.metricsJson as Record<string, any> | null;
  
  let performanceScore: number | null = null;
  
  if (metricsJson) {
    performanceScore = 
      metricsJson["vitals.performance_score"] ??
      metricsJson.performance_score ??
      metricsJson.performanceScore ??
      null;
  }
  
  if (performanceScore !== null && typeof performanceScore === "number") {
    return { score: Math.round(performanceScore), performanceScore };
  }
  
  return { score: 50, performanceScore: null };
}

async function computeHemingwayCrewScore(siteId: string): Promise<{
  score: number | null;
  contentQualityScore: number | null;
}> {
  const snapshots = await storage.getAgentSnapshots("hemingway", siteId, 1);
  
  if (snapshots.length === 0) {
    return { score: null, contentQualityScore: null };
  }
  
  const latestSnapshot = snapshots[0];
  const metricsJson = latestSnapshot.metricsJson as Record<string, any> | null;
  
  let contentQualityScore: number | null = null;
  
  if (metricsJson) {
    contentQualityScore = 
      metricsJson.contentQualityScore ??
      metricsJson.content_quality_score ??
      metricsJson["content.quality_score"] ??
      null;
  }
  
  if (contentQualityScore !== null && typeof contentQualityScore === "number") {
    return { score: Math.round(contentQualityScore), contentQualityScore };
  }
  
  return { score: null, contentQualityScore: null };
}

async function computeMissionsData(
  crewId: string,
  siteId: string,
  timeWindowDays: number
): Promise<MissionsData> {
  const now = new Date();
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - timeWindowDays);
  
  const allMissions = getMissionsForCrew(crewId);
  
  const twoWeekHours = timeWindowDays * 2 * 24;
  const allCompletions = await storage.getRecentMissionCompletions(siteId, "all", twoWeekHours);
  
  const crewCompletionsAll = allCompletions.filter(log => {
    const missionId = (log.details as any)?.missionId || (log.details as any)?.actionId;
    const mission = missionId ? MISSION_REGISTRY[missionId] : null;
    return mission?.crewId === crewId || (log.details as any)?.crewId === crewId;
  });
  
  const completedMissionIds = new Set(
    crewCompletionsAll.map(log => 
      (log.details as any)?.missionId || (log.details as any)?.actionId
    ).filter(Boolean)
  );
  
  const pendingMissions = allMissions.filter(m => !completedMissionIds.has(m.missionId));
  const highPriorityCount = pendingMissions.filter(m => m.impact === "high").length;
  const autoFixableCount = pendingMissions.filter(m => m.autoFixable).length;
  
  const thisWeekCompletions = crewCompletionsAll.filter(c => 
    new Date(c.createdAt) >= oneWeekAgo
  ).length;
  
  return {
    open: pendingMissions.length,
    total: allMissions.length,
    completed: completedMissionIds.size,
    completedThisWeek: thisWeekCompletions,
    highPriority: highPriorityCount,
    autoFixable: autoFixableCount,
  };
}

function determineStatusFromScore(score: number | null): CrewStatusValue {
  if (score === null) return "needs_attention";
  if (score >= 80) return "looking_good";
  if (score >= 50) return "doing_okay";
  return "needs_attention";
}

function determineTierFromStatus(status: CrewStatusValue): CrewTier {
  return status;
}

export async function computeCrewStatus(
  options: ComputeCrewStatusOptions
): Promise<CrewStatus> {
  const { siteId, crewId, timeWindowDays = 7 } = options;
  const now = new Date().toISOString();
  
  const crewDef = CREW[crewId as CrewId];
  if (!crewDef) {
    throw new Error(`Unknown crew: ${crewId}`);
  }
  
  let scoreValue: number | null = null;
  let scoreStatus: "ok" | "unknown" = "unknown";
  let missions: MissionsData = {
    open: 0,
    total: 0,
    completed: 0,
    completedThisWeek: 0,
    highPriority: 0,
    autoFixable: 0,
  };
  let primaryMetric: PrimaryMetricData = {
    label: "Score",
    value: null,
    unit: "/ 100",
    deltaPercent: null,
    deltaLabel: "Not enough data yet",
  };
  let readiness: ReadinessData = {
    isReady: true,
    missingDependencies: [],
    setupHint: null,
  };
  
  missions = await computeMissionsData(crewId, siteId, timeWindowDays);
  
  if (crewId === "popular") {
    const issueResult = await computePopularCrewScore(siteId, timeWindowDays);
    scoreValue = issueResult.score;
    scoreStatus = "ok";
    const activeIssues = issueResult.issues.filter(i => i.status !== "resolved");
    primaryMetric = {
      label: "Health Score",
      value: scoreValue,
      unit: "/ 100",
      deltaPercent: null,
      deltaLabel: activeIssues.length > 0 ? `${activeIssues.length} active issues` : "No issues",
    };
    
  } else if (crewId === "lookout") {
    const result = await computeLookoutCrewScore();
    if (result.totalKeywords > 0) {
      scoreValue = result.score;
      scoreStatus = "ok";
      primaryMetric = {
        label: "Ranking Coverage",
        value: scoreValue,
        unit: "/ 100",
        deltaPercent: null,
        deltaLabel: `${result.inTop10} of ${result.totalKeywords} in Top 10`,
      };
    } else {
      readiness = {
        isReady: false,
        missingDependencies: ["serp_api"],
        setupHint: "Add keywords to track SERP rankings",
      };
    }
    
  } else if (crewId === "speedster") {
    const result = await computeSpeedsterCrewScore(siteId);
    if (result.performanceScore !== null) {
      scoreValue = result.performanceScore;
      scoreStatus = "ok";
      primaryMetric = {
        label: "Performance Score",
        value: scoreValue,
        unit: "/ 100",
        deltaPercent: null,
        deltaLabel: scoreValue >= 90 ? "Excellent" : scoreValue >= 50 ? "Needs work" : "Poor",
      };
    } else {
      readiness = {
        isReady: false,
        missingDependencies: ["pagespeed"],
        setupHint: "Run a PageSpeed analysis to get performance metrics",
      };
    }
    
  } else if (crewId === "hemingway") {
    const result = await computeHemingwayCrewScore(siteId);
    if (result.contentQualityScore !== null) {
      scoreValue = result.contentQualityScore;
      scoreStatus = "ok";
      primaryMetric = {
        label: "Content Quality Score",
        value: scoreValue,
        unit: "/ 100",
        deltaPercent: null,
        deltaLabel: scoreValue >= 80 ? "Excellent" : scoreValue >= 60 ? "Good" : "Needs work",
      };
    } else {
      readiness = {
        isReady: false,
        missingDependencies: crewDef.dependencies.required,
        setupHint: "Run a content analysis to get quality metrics",
      };
    }
    
  } else {
    const scoreMetric = crewDef.scoreMetric;
    if (scoreMetric) {
      const snapshots = await storage.getAgentSnapshots(crewId, siteId, 1);
      if (snapshots.length > 0) {
        const metricsJson = snapshots[0].metricsJson as Record<string, any> | null;
        if (metricsJson) {
          const metricValue = metricsJson[scoreMetric.id] ?? metricsJson[scoreMetric.label] ?? null;
          if (metricValue !== null && typeof metricValue === "number") {
            scoreValue = Math.round(metricValue);
            scoreStatus = "ok";
            primaryMetric = {
              label: scoreMetric.label,
              value: scoreValue,
              unit: "/ 100",
              deltaPercent: null,
              deltaLabel: scoreValue >= 80 ? "Excellent" : scoreValue >= 50 ? "Doing okay" : "Needs attention",
            };
          }
        }
      }
    }
    
    if (scoreValue === null && missions.total === 0) {
      readiness = {
        isReady: false,
        missingDependencies: crewDef.dependencies.required,
        setupHint: `Configure ${crewDef.nickname} to start tracking`,
      };
    }
  }
  
  let status = determineStatusFromScore(scoreValue);
  
  // Check if agent is degraded due to consecutive failures
  const agentState = await storage.getCrewStateForAgent(siteId, crewId);
  const isDegraded = agentState?.health === "degraded" || (agentState?.consecutiveFailures ?? 0) >= 3;
  
  if (isDegraded) {
    status = "needs_attention";
    readiness = {
      ...readiness,
      isReady: false,
      setupHint: readiness.setupHint || `Agent has failed ${agentState?.consecutiveFailures ?? 3}+ times consecutively`,
    };
  }
  
  const tier = determineTierFromStatus(status);
  
  const score: ScoreData = {
    value: scoreValue,
    status: isDegraded ? "unknown" : scoreStatus,
    updatedAt: now,
  };
  
  return {
    crewId,
    siteId,
    score,
    status,
    tier,
    missions,
    primaryMetric,
    readiness,
    updatedAt: now,
    isDegraded,
    degradedSince: agentState?.degradedAt?.toISOString() ?? null,
    consecutiveFailures: agentState?.consecutiveFailures ?? 0,
    lastErrorMessage: agentState?.lastErrorMessage ?? null,
  };
}

export async function computeAllCrewStatuses(
  siteId: string,
  timeWindowDays: number = 7
): Promise<CrewStatus[]> {
  const crewIds = Object.keys(CREW).filter(id => id !== "major_tom");
  const now = new Date().toISOString();
  
  const statuses = await Promise.all(
    crewIds.map(crewId => 
      computeCrewStatus({ siteId, crewId, timeWindowDays })
        .catch(err => {
          console.error(`Failed to compute status for crew ${crewId}:`, err);
          return {
            crewId,
            siteId,
            score: { value: null, status: "unknown" as const, updatedAt: now },
            status: "needs_attention" as CrewStatusValue,
            tier: "needs_attention" as CrewTier,
            missions: { open: 0, total: 0, completed: 0, completedThisWeek: 0, highPriority: 0, autoFixable: 0 },
            primaryMetric: { label: "Error", value: null, unit: "", deltaPercent: null, deltaLabel: "" },
            readiness: { isReady: false, missingDependencies: [], setupHint: "Error loading status" },
            updatedAt: now,
          } as CrewStatus;
        })
    )
  );
  
  return statuses;
}

export const CrewStatusService = {
  computeCrewStatus,
  computeAllCrewStatuses,
};
