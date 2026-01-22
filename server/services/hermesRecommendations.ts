import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import type { InsertHermesRecommendation } from "@shared/schema";

export interface AssemblyContext {
  siteId: string;
  domain: string;
  availableInputs: {
    ga4: boolean;
    gsc: boolean;
    serp: boolean;
    technicalSeo: boolean;
    competitive: boolean;
  };
}

export interface RawRecommendation {
  category: string;
  agentSource: string;
  action: string;
  steps?: string[];
  evidence?: any;
  priority?: number;
  definitionOfDone?: string;
  dependencies?: string[];
  risks?: string[];
  kbaseRefs?: string[];
}

const PHASE_LIMITS = {
  now: 3,
  next: 5,
  later: Infinity,
};

const PRIORITY_THRESHOLDS = {
  now: 70,
  next: 40,
};

function generateFingerprint(rec: RawRecommendation): string {
  const normalized = `${rec.category}:${rec.action.toLowerCase().trim()}`;
  return crypto.createHash("sha1").update(normalized).digest("hex").slice(0, 16);
}

function calculateConfidence(availableInputs: AssemblyContext["availableInputs"]): {
  confidence: "full" | "degraded";
  missingInputs: string[];
} {
  const missing: string[] = [];
  
  if (!availableInputs.ga4) missing.push("ga4");
  if (!availableInputs.gsc) missing.push("gsc");
  if (!availableInputs.serp) missing.push("serp");
  if (!availableInputs.technicalSeo) missing.push("technicalSeo");
  if (!availableInputs.competitive) missing.push("competitive");
  
  const inputCount = Object.values(availableInputs).filter(Boolean).length;
  const confidence: "full" | "degraded" = inputCount >= 3 ? "full" : "degraded";
  
  return { confidence, missingInputs: missing };
}

function assignPhase(priority: number): "now" | "next" | "later" {
  if (priority >= PRIORITY_THRESHOLDS.now) return "now";
  if (priority >= PRIORITY_THRESHOLDS.next) return "next";
  return "later";
}

export async function assembleRecommendations(
  context: AssemblyContext,
  rawRecommendations: RawRecommendation[]
): Promise<InsertHermesRecommendation[]> {
  const { confidence, missingInputs } = calculateConfidence(context.availableInputs);
  
  const seenFingerprints = new Set<string>();
  const deduped: RawRecommendation[] = [];
  
  for (const rec of rawRecommendations) {
    const fp = generateFingerprint(rec);
    if (!seenFingerprints.has(fp)) {
      seenFingerprints.add(fp);
      deduped.push(rec);
    }
  }
  
  const withPhases = deduped.map((rec) => {
    const priority = rec.priority ?? 50;
    const phase = assignPhase(priority);
    return { ...rec, priority, phase };
  });
  
  withPhases.sort((a, b) => b.priority - a.priority);
  
  const phaseCounts: Record<string, number> = { now: 0, next: 0, later: 0 };
  const filtered: typeof withPhases = [];
  
  for (const rec of withPhases) {
    if (phaseCounts[rec.phase] < PHASE_LIMITS[rec.phase as keyof typeof PHASE_LIMITS]) {
      phaseCounts[rec.phase]++;
      filtered.push(rec);
    } else if (rec.phase === "now" && phaseCounts.next < PHASE_LIMITS.next) {
      rec.phase = "next";
      phaseCounts.next++;
      filtered.push(rec);
    } else if (rec.phase !== "later") {
      rec.phase = "later";
      phaseCounts.later++;
      filtered.push(rec);
    } else {
      filtered.push(rec);
    }
  }
  
  const assembled: InsertHermesRecommendation[] = filtered.map((rec) => ({
    id: uuidv4(),
    siteId: context.siteId,
    category: rec.category,
    agentSources: [rec.agentSource],
    priority: rec.priority,
    confidence,
    missingInputs: missingInputs,
    phase: rec.phase,
    action: rec.action,
    steps: rec.steps || [],
    evidence: rec.evidence || {},
    definitionOfDone: rec.definitionOfDone || null,
    dependencies: rec.dependencies || [],
    risks: rec.risks || [],
    kbaseRefs: rec.kbaseRefs || [],
    status: "open",
  }));
  
  return assembled;
}

export function mergeAgentSources(
  existing: InsertHermesRecommendation,
  newAgentSource: string
): InsertHermesRecommendation {
  const sources = new Set(existing.agentSources);
  sources.add(newAgentSource);
  return {
    ...existing,
    agentSources: Array.from(sources),
  };
}
