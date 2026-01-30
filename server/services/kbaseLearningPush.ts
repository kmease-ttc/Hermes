/**
 * KB Learning Push Service
 *
 * Converts agent findings, suggestions, and insights into KB learnings
 * and pushes them to the Knowledge Base worker via /api/learnings/upsert.
 *
 * This closes the loop: agents find issues → findings stored locally →
 * pushed to KB as articles → available for future agent decisions.
 */

import { logger } from "../utils/logger";
import { resolveWorkerConfig } from "../workerConfigResolver";

interface Learning {
  source: string;
  check_name: string;
  site_domain: string;
  page_url?: string;
  topic: string;
  problem: string;
  recommendation: string;
  evidence?: Array<{ type: string; value: string; url?: string }>;
  fix_steps?: string[];
  confidence?: number;
  labels?: string[];
}

interface PushResult {
  pushed: number;
  failed: number;
  skipped: number;
  errors: string[];
}

/**
 * Push a single learning to the Knowledge Base service
 */
async function pushLearning(
  baseUrl: string,
  writeKey: string,
  learning: Learning
): Promise<boolean> {
  const upsertUrl = `${baseUrl.replace(/\/+$/, "")}/learnings/upsert`;

  try {
    const response = await fetch(upsertUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": writeKey,
      },
      body: JSON.stringify(learning),
      signal: AbortSignal.timeout(15000),
    });

    if (response.ok) {
      return true;
    }

    const body = await response.text().catch(() => "");
    logger.warn("kbasePush", `Failed to push learning: HTTP ${response.status}`, {
      topic: learning.topic,
      body: body.slice(0, 200),
    });
    return false;
  } catch (error: any) {
    logger.warn("kbasePush", `Error pushing learning: ${error.message}`, {
      topic: learning.topic,
    });
    return false;
  }
}

/**
 * Convert worker suggestions into KB learnings and push them.
 *
 * Called after workerOrchestrator generates suggestions.
 */
export async function pushSuggestionsToKbase(
  siteId: string,
  domain: string,
  suggestions: Array<{
    suggestionType: string;
    title: string;
    description: string;
    severity: string;
    category: string;
    evidence?: Record<string, any>;
  }>
): Promise<PushResult> {
  const result: PushResult = { pushed: 0, failed: 0, skipped: 0, errors: [] };

  // Resolve KB config
  const config = await resolveWorkerConfig("seo_kbase");
  if (!config.valid || !config.base_url || !config.write_key) {
    logger.info("kbasePush", "KB not configured, skipping learning push", {
      valid: config.valid,
      hasBaseUrl: !!config.base_url,
      hasWriteKey: !!config.write_key,
    });
    result.skipped = suggestions.length;
    return result;
  }

  // Only push high/critical severity suggestions to avoid noise
  const worthPushing = suggestions.filter(
    (s) => s.severity === "critical" || s.severity === "high"
  );

  if (worthPushing.length === 0) {
    result.skipped = suggestions.length;
    return result;
  }

  result.skipped = suggestions.length - worthPushing.length;

  // Map suggestion categories to check_name values
  const categoryToCheckName: Record<string, string> = {
    performance: "SEO_CWV",
    technical: "SEO_CRAWL",
    content: "SEO_CONTENT",
    serp: "SEO_SERP_ANALYSIS",
    competitive: "SEO_COMPETITIVE_INTEL",
    authority: "SEO_BACKLINKS",
    indexing: "SEO_INDEXING",
    on_page: "SEO_ON_PAGE",
    schema: "SEO_SCHEMA",
  };

  for (const suggestion of worthPushing) {
    const checkName =
      categoryToCheckName[suggestion.category] || "SEO_CRAWL";

    const learning: Learning = {
      source: "hermes",
      check_name: checkName,
      site_domain: domain,
      topic: suggestion.title,
      problem: suggestion.description,
      recommendation: suggestion.description,
      confidence: suggestion.severity === "critical" ? 0.95 : 0.8,
      labels: [suggestion.category, suggestion.severity, suggestion.suggestionType],
      evidence: suggestion.evidence
        ? Object.entries(suggestion.evidence).map(([key, val]) => ({
            type: key,
            value: String(val),
          }))
        : undefined,
    };

    const success = await pushLearning(config.base_url, config.write_key, learning);
    if (success) {
      result.pushed++;
    } else {
      result.failed++;
      result.errors.push(`Failed: ${suggestion.title}`);
    }
  }

  logger.info("kbasePush", "Learning push complete", {
    pushed: result.pushed,
    failed: result.failed,
    skipped: result.skipped,
  });

  return result;
}

/**
 * Convert crew findings into KB learnings and push them.
 *
 * Called after crew/:crewId/run completes with findings.
 */
export async function pushFindingsToKbase(
  domain: string,
  crewId: string,
  findings: Array<{
    title: string;
    description: string;
    recommendation?: string;
    severity: string;
    category: string;
    affectedUrl?: string;
  }>
): Promise<PushResult> {
  const result: PushResult = { pushed: 0, failed: 0, skipped: 0, errors: [] };

  const config = await resolveWorkerConfig("seo_kbase");
  if (!config.valid || !config.base_url || !config.write_key) {
    result.skipped = findings.length;
    return result;
  }

  const crewToCheckName: Record<string, string> = {
    natasha: "SEO_COMPETITIVE_INTEL",
    lookout: "SEO_SERP_ANALYSIS",
    scotty: "SEO_CRAWL",
    speedster: "SEO_CWV",
    hemingway: "SEO_CONTENT",
    sentinel: "SEO_CONTENT",
    beacon: "SEO_BACKLINKS",
    popular: "SEO_SERP_ANALYSIS",
    atlas: "SEO_SCHEMA",
  };

  const checkName = crewToCheckName[crewId] || "SEO_CRAWL";

  for (const finding of findings) {
    const learning: Learning = {
      source: "hermes",
      check_name: checkName,
      site_domain: domain,
      page_url: finding.affectedUrl,
      topic: finding.title,
      problem: finding.description,
      recommendation: finding.recommendation || finding.description,
      confidence: finding.severity === "critical" ? 0.95 : finding.severity === "high" ? 0.85 : 0.7,
      labels: [crewId, finding.category, finding.severity],
    };

    const success = await pushLearning(config.base_url, config.write_key, learning);
    if (success) {
      result.pushed++;
    } else {
      result.failed++;
      result.errors.push(`Failed: ${finding.title}`);
    }
  }

  logger.info("kbasePush", `Findings push complete for crew ${crewId}`, {
    pushed: result.pushed,
    failed: result.failed,
    skipped: result.skipped,
  });

  return result;
}
