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
  total: number;
  completed: number;
  pending: number;
  highPriority: number;
  autoFixable: number;
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
  score: number;
  status: CrewStatusValue;
  tier: CrewTier;
  missions: MissionsData;
  primaryMetric: PrimaryMetricData;
  readiness: ReadinessData;
  updatedAt: string;
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

async function computeMissionBasedScore(
  crewId: string,
  siteId: string,
  timeWindowDays: number
): Promise<{
  score: number;
  status: CrewStatusValue;
  missions: MissionsData;
  metricValue: number;
  deltaPercent: number | null;
}> {
  const now = new Date();
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - timeWindowDays);
  const twoWeeksAgo = new Date(now);
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - timeWindowDays * 2);
  
  const allMissions = getMissionsForCrew(crewId);
  
  const twoWeekHours = timeWindowDays * 2 * 24;
  const [allCompletions, serviceRuns] = await Promise.all([
    storage.getRecentMissionCompletions(siteId, "all", twoWeekHours),
    storage.getLatestServiceRuns(100),
  ]);
  
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
  
  let status: CrewStatusValue;
  const hasHighPriority = pendingMissions.some(m => m.impact === "high");
  if (hasHighPriority) {
    status = "needs_attention";
  } else if (pendingMissions.length > 0) {
    status = "doing_okay";
  } else {
    status = "looking_good";
  }
  
  const crewServiceRuns = serviceRuns.filter(r => r.serviceId === crewId);
  const thisWeekRuns = crewServiceRuns.filter(r => new Date(r.startedAt) >= oneWeekAgo);
  const lastWeekRuns = crewServiceRuns.filter(r => {
    const runDate = new Date(r.startedAt);
    return runDate >= twoWeeksAgo && runDate < oneWeekAgo;
  });
  
  const thisWeekSuccess = thisWeekRuns.filter(r => r.status === "success").length;
  const lastWeekSuccess = lastWeekRuns.filter(r => r.status === "success").length;
  
  let deltaPercent: number | null = null;
  let metricValue = 0;
  
  if (thisWeekRuns.length > 0 || lastWeekRuns.length > 0) {
    if (lastWeekSuccess > 0) {
      deltaPercent = Math.round(((thisWeekSuccess - lastWeekSuccess) / lastWeekSuccess) * 100);
    } else if (thisWeekSuccess > 0) {
      deltaPercent = 100;
    }
    metricValue = thisWeekSuccess;
  } else {
    const thisWeekCompletions = crewCompletionsAll.filter(c => 
      new Date(c.createdAt) >= oneWeekAgo
    ).length;
    const lastWeekCompletions = crewCompletionsAll.filter(c => {
      const cDate = new Date(c.createdAt);
      return cDate >= twoWeeksAgo && cDate < oneWeekAgo;
    }).length;
    
    if (lastWeekCompletions > 0) {
      deltaPercent = Math.round(((thisWeekCompletions - lastWeekCompletions) / lastWeekCompletions) * 100);
    } else if (thisWeekCompletions > 0) {
      deltaPercent = 100;
    }
    metricValue = thisWeekCompletions;
  }
  
  let score: number;
  const completedThisWeek = metricValue;
  const deltaBonus = deltaPercent !== null && deltaPercent > 0 ? Math.min(deltaPercent / 10, 10) : 0;
  
  if (status === "looking_good") {
    score = 80 + Math.min(completedThisWeek * 2, 15) + deltaBonus;
  } else if (status === "doing_okay") {
    score = 50 + Math.min(completedThisWeek * 3, 25) + deltaBonus;
  } else {
    const completionBonus = completedThisWeek * 5;
    score = Math.max(15, 35 - pendingMissions.length * 2 + completionBonus + deltaBonus);
  }
  score = Math.min(100, Math.max(0, Math.round(score)));
  
  return {
    score,
    status,
    missions: {
      total: allMissions.length,
      completed: completedMissionIds.size,
      pending: pendingMissions.length,
      highPriority: highPriorityCount,
      autoFixable: autoFixableCount,
    },
    metricValue,
    deltaPercent,
  };
}

function determineStatusFromScore(score: number): CrewStatusValue {
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
  
  const crewDef = CREW[crewId as CrewId];
  if (!crewDef) {
    throw new Error(`Unknown crew: ${crewId}`);
  }
  
  let score: number;
  let status: CrewStatusValue;
  let missions: MissionsData = {
    total: 0,
    completed: 0,
    pending: 0,
    highPriority: 0,
    autoFixable: 0,
  };
  let primaryMetric: PrimaryMetricData = {
    label: "Score",
    value: null,
    unit: "score",
    deltaPercent: null,
    deltaLabel: "vs last week",
  };
  let readiness: ReadinessData = {
    isReady: true,
    missingDependencies: [],
    setupHint: null,
  };
  
  if (crewId === "popular") {
    const result = await computePopularCrewScore(siteId, timeWindowDays);
    score = result.score;
    status = determineStatusFromScore(score);
    
    const activeIssues = result.issues.filter(i => i.status !== "resolved");
    primaryMetric = {
      label: "Active Issues",
      value: activeIssues.length,
      unit: "issues",
      deltaPercent: null,
      deltaLabel: "detected",
    };
    
    const missionResult = await computeMissionBasedScore(crewId, siteId, timeWindowDays);
    missions = missionResult.missions;
    
  } else if (crewId === "lookout") {
    const result = await computeLookoutCrewScore();
    score = result.score;
    status = determineStatusFromScore(score);
    
    primaryMetric = {
      label: "Keywords in Top 10",
      value: result.inTop10,
      unit: `of ${result.totalKeywords}`,
      deltaPercent: null,
      deltaLabel: "coverage",
    };
    
    if (result.totalKeywords === 0) {
      readiness = {
        isReady: false,
        missingDependencies: ["serp_api"],
        setupHint: "Add keywords to track SERP rankings",
      };
    }
    
    const missionResult = await computeMissionBasedScore(crewId, siteId, timeWindowDays);
    missions = missionResult.missions;
    
  } else if (crewId === "speedster") {
    const result = await computeSpeedsterCrewScore(siteId);
    score = result.score;
    status = determineStatusFromScore(score);
    
    primaryMetric = {
      label: "Performance Score",
      value: result.performanceScore,
      unit: "/ 100",
      deltaPercent: null,
      deltaLabel: "Core Web Vitals",
    };
    
    if (result.performanceScore === null) {
      readiness = {
        isReady: false,
        missingDependencies: ["pagespeed"],
        setupHint: "Run a PageSpeed analysis to get performance metrics",
      };
    }
    
    const missionResult = await computeMissionBasedScore(crewId, siteId, timeWindowDays);
    missions = missionResult.missions;
    
  } else {
    const missionResult = await computeMissionBasedScore(crewId, siteId, timeWindowDays);
    score = missionResult.score;
    status = missionResult.status;
    missions = missionResult.missions;
    
    primaryMetric = {
      label: "Completed this week",
      value: missionResult.metricValue,
      unit: "missions",
      deltaPercent: missionResult.deltaPercent,
      deltaLabel: "vs last week",
    };
    
    if (missions.total === 0 && missionResult.metricValue === 0) {
      readiness = {
        isReady: false,
        missingDependencies: crewDef.dependencies.required,
        setupHint: `Configure ${crewDef.nickname} to start tracking`,
      };
    }
  }
  
  const tier = determineTierFromStatus(status);
  
  return {
    crewId,
    siteId,
    score,
    status,
    tier,
    missions,
    primaryMetric,
    readiness,
    updatedAt: new Date().toISOString(),
  };
}

export async function computeAllCrewStatuses(
  siteId: string,
  timeWindowDays: number = 7
): Promise<CrewStatus[]> {
  const crewIds = Object.keys(CREW).filter(id => id !== "major_tom");
  
  const statuses = await Promise.all(
    crewIds.map(crewId => 
      computeCrewStatus({ siteId, crewId, timeWindowDays })
        .catch(err => {
          console.error(`Failed to compute status for crew ${crewId}:`, err);
          return {
            crewId,
            siteId,
            score: 0,
            status: "needs_attention" as CrewStatusValue,
            tier: "needs_attention" as CrewTier,
            missions: { total: 0, completed: 0, pending: 0, highPriority: 0, autoFixable: 0 },
            primaryMetric: { label: "Error", value: null, unit: "", deltaPercent: null, deltaLabel: "" },
            readiness: { isReady: false, missingDependencies: [], setupHint: "Error loading status" },
            updatedAt: new Date().toISOString(),
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
