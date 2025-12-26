import { logger } from "./utils/logger";
import { resolveWorkerConfig, WorkerConfig } from "./workerConfigResolver";
import { getWorkerServices, ServiceSecretMapping } from "@shared/serviceSecretMap";
import { storage } from "./storage";
import { InsertSeoWorkerResult, InsertSeoSuggestion, InsertSeoKbaseInsight } from "@shared/schema";

const TIMEOUT_MS = 30000;

export interface WorkerCallResult {
  workerKey: string;
  status: "success" | "failed" | "timeout" | "skipped";
  durationMs: number;
  payload: any;
  metrics: Record<string, any>;
  summary: string | null;
  errorCode: string | null;
  errorDetail: string | null;
}

export interface OrchestrationResult {
  runId: string;
  siteId: string;
  startedAt: Date;
  finishedAt: Date;
  workers: WorkerCallResult[];
  successCount: number;
  failedCount: number;
  suggestions: InsertSeoSuggestion[];
  insights: InsertSeoKbaseInsight[];
}

const WORKER_KEYS = [
  "competitive_snapshot",
  "serp_intel",
  "crawl_render",
  "core_web_vitals",
  "content_generator",
  "content_qa",
  "content_decay",
  "backlink_authority",
  "notifications",
] as const;

async function callWorker(
  config: WorkerConfig,
  mapping: ServiceSecretMapping,
  siteId: string,
  runId: string,
  domain: string
): Promise<WorkerCallResult> {
  const startTime = Date.now();
  const workerKey = mapping.serviceSlug;
  
  if (!config.valid || !config.base_url) {
    return {
      workerKey,
      status: "skipped",
      durationMs: 0,
      payload: null,
      metrics: {},
      summary: `Skipped: ${config.error || "No valid config"}`,
      errorCode: "NO_CONFIG",
      errorDetail: config.error,
    };
  }
  
  const runEndpoint = mapping.workerEndpoints?.run || "/run";
  const url = `${config.base_url}${runEndpoint}`;
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Request-Id": runId,
  };
  
  if (config.api_key) {
    headers["x-api-key"] = config.api_key;
    headers["Authorization"] = `Bearer ${config.api_key}`;
  }
  
  const body = {
    site_id: siteId,
    run_id: runId,
    domain,
  };
  
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    
    logger.info("WorkerOrchestrator", `Calling ${workerKey}`, { url });
    
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    const durationMs = Date.now() - startTime;
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      return {
        workerKey,
        status: "failed",
        durationMs,
        payload: null,
        metrics: {},
        summary: `HTTP ${response.status}: ${errorText.substring(0, 200)}`,
        errorCode: `HTTP_${response.status}`,
        errorDetail: errorText,
      };
    }
    
    const data = await response.json();
    const metrics = extractMetrics(workerKey, data);
    const summary = generateSummary(workerKey, data, metrics);
    
    return {
      workerKey,
      status: "success",
      durationMs,
      payload: data,
      metrics,
      summary,
      errorCode: null,
      errorDetail: null,
    };
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    
    if (error.name === "AbortError") {
      return {
        workerKey,
        status: "timeout",
        durationMs,
        payload: null,
        metrics: {},
        summary: `Timeout after ${TIMEOUT_MS}ms`,
        errorCode: "TIMEOUT",
        errorDetail: `Request timed out after ${TIMEOUT_MS}ms`,
      };
    }
    
    return {
      workerKey,
      status: "failed",
      durationMs,
      payload: null,
      metrics: {},
      summary: `Error: ${error.message}`,
      errorCode: "NETWORK_ERROR",
      errorDetail: error.message,
    };
  }
}

function extractMetrics(workerKey: string, data: any): Record<string, any> {
  const metrics: Record<string, any> = {};
  
  switch (workerKey) {
    case "serp_intel":
      if (data.data?.keywords) {
        metrics.keywordCount = data.data.keywords.length;
        metrics.inTop10 = data.data.keywords.filter((k: any) => k.position <= 10).length;
        metrics.avgPosition = data.data.keywords.length > 0
          ? data.data.keywords.reduce((sum: number, k: any) => sum + (k.position || 100), 0) / data.data.keywords.length
          : null;
      }
      break;
      
    case "crawl_render":
      if (data.data?.pages) {
        metrics.pagesChecked = data.data.pages.length;
        metrics.errorsFound = data.data.pages.filter((p: any) => p.hasError).length;
        metrics.warningsFound = data.data.pages.filter((p: any) => p.hasWarning).length;
      }
      if (data.data?.summary) {
        metrics.pagesChecked = data.data.summary.pagesChecked || metrics.pagesChecked;
        metrics.errorsFound = data.data.summary.errors || metrics.errorsFound;
        metrics.warningsFound = data.data.summary.warnings || metrics.warningsFound;
      }
      break;
      
    case "core_web_vitals":
      if (data.data?.vitals) {
        metrics.lcp = data.data.vitals.lcp;
        metrics.fid = data.data.vitals.fid;
        metrics.cls = data.data.vitals.cls;
        metrics.inp = data.data.vitals.inp;
        metrics.score = data.data.vitals.score;
      }
      break;
      
    case "backlink_authority":
      if (data.data) {
        metrics.domainAuthority = data.data.domain_authority || data.data.domainAuthority;
        metrics.backlinkCount = data.data.backlink_count || data.data.totalBacklinks;
        metrics.referringDomains = data.data.referring_domains || data.data.referringDomains;
      }
      break;
      
    case "competitive_snapshot":
      if (data.data?.competitors) {
        metrics.competitorCount = data.data.competitors.length;
        metrics.avgCompetitorDA = data.data.competitors.length > 0
          ? data.data.competitors.reduce((sum: number, c: any) => sum + (c.domainAuthority || 0), 0) / data.data.competitors.length
          : null;
      }
      break;
      
    case "content_decay":
      if (data.data?.pages) {
        metrics.pagesAnalyzed = data.data.pages.length;
        metrics.decayingPages = data.data.pages.filter((p: any) => p.isDecaying || p.decay_score > 0.5).length;
      }
      break;
      
    case "content_qa":
      if (data.data) {
        metrics.issuesFound = data.data.issueCount || data.data.issues?.length || 0;
        metrics.passedChecks = data.data.passedCount || 0;
      }
      break;
      
    case "content_generator":
      if (data.data) {
        metrics.draftsGenerated = data.data.drafts?.length || (data.data.content ? 1 : 0);
      }
      break;
      
    case "notifications":
      if (data.data) {
        metrics.notificationsSent = data.data.sent || 0;
      }
      break;
  }
  
  return metrics;
}

function generateSummary(workerKey: string, data: any, metrics: Record<string, any>): string {
  switch (workerKey) {
    case "serp_intel":
      if (metrics.keywordCount !== undefined) {
        return `Tracking ${metrics.keywordCount} keywords, ${metrics.inTop10} in top 10`;
      }
      break;
      
    case "crawl_render":
      if (metrics.pagesChecked !== undefined) {
        return `Checked ${metrics.pagesChecked} pages, ${metrics.errorsFound || 0} errors, ${metrics.warningsFound || 0} warnings`;
      }
      break;
      
    case "core_web_vitals":
      if (metrics.score !== undefined) {
        return `Performance score: ${metrics.score}, LCP: ${metrics.lcp}ms`;
      }
      break;
      
    case "backlink_authority":
      if (metrics.domainAuthority !== undefined) {
        return `DA: ${metrics.domainAuthority}, ${metrics.backlinkCount} backlinks from ${metrics.referringDomains} domains`;
      }
      break;
      
    case "competitive_snapshot":
      if (metrics.competitorCount !== undefined) {
        return `Analyzed ${metrics.competitorCount} competitors`;
      }
      break;
      
    case "content_decay":
      if (metrics.pagesAnalyzed !== undefined) {
        return `${metrics.decayingPages} of ${metrics.pagesAnalyzed} pages showing decay`;
      }
      break;
      
    case "content_qa":
      if (metrics.issuesFound !== undefined) {
        return `Found ${metrics.issuesFound} content issues`;
      }
      break;
      
    default:
      break;
  }
  
  if (data.ok) {
    return "Completed successfully";
  }
  
  return data.message || "Run completed";
}

function generateSuggestions(
  runId: string,
  siteId: string,
  results: WorkerCallResult[]
): InsertSeoSuggestion[] {
  const suggestions: InsertSeoSuggestion[] = [];
  const timestamp = Date.now();
  
  for (const result of results) {
    if (result.status !== "success" || !result.metrics) continue;
    
    const { workerKey, metrics } = result;
    
    if (workerKey === "serp_intel" && metrics.keywordCount > 0) {
      if (metrics.inTop10 < metrics.keywordCount * 0.3) {
        suggestions.push({
          suggestionId: `sug_${timestamp}_keyword_optimization`,
          runId,
          siteId,
          suggestionType: "keyword_optimization",
          title: "Improve Keyword Rankings",
          description: `Only ${metrics.inTop10} of ${metrics.keywordCount} tracked keywords are in top 10. Consider content optimization and link building for underperforming keywords.`,
          severity: metrics.inTop10 < metrics.keywordCount * 0.1 ? "high" : "medium",
          category: "serp",
          evidenceJson: { metrics, workerKey },
          estimatedImpact: "high",
          estimatedEffort: "significant",
          sourceWorkers: [workerKey],
        });
      }
    }
    
    if (workerKey === "crawl_render" && metrics.errorsFound > 0) {
      suggestions.push({
        suggestionId: `sug_${timestamp}_technical_fix`,
        runId,
        siteId,
        suggestionType: "technical_fix",
        title: "Fix Technical SEO Issues",
        description: `Found ${metrics.errorsFound} technical errors across ${metrics.pagesChecked} pages. These may impact search engine crawling and indexing.`,
        severity: metrics.errorsFound > 5 ? "high" : "medium",
        category: "technical",
        evidenceJson: { metrics, workerKey },
        estimatedImpact: "high",
        estimatedEffort: "moderate",
        assignee: "Dev",
        sourceWorkers: [workerKey],
      });
    }
    
    if (workerKey === "content_decay" && metrics.decayingPages > 0) {
      suggestions.push({
        suggestionId: `sug_${timestamp}_content_refresh`,
        runId,
        siteId,
        suggestionType: "content_refresh",
        title: "Refresh Declining Content",
        description: `${metrics.decayingPages} pages showing traffic decay. Consider updating content, adding new information, or improving internal linking.`,
        severity: metrics.decayingPages > 3 ? "high" : "medium",
        category: "content",
        evidenceJson: { metrics, workerKey },
        estimatedImpact: "medium",
        estimatedEffort: "moderate",
        assignee: "Content",
        sourceWorkers: [workerKey],
      });
    }
    
    if (workerKey === "backlink_authority" && metrics.domainAuthority !== undefined) {
      if (metrics.domainAuthority < 30) {
        suggestions.push({
          suggestionId: `sug_${timestamp}_backlink_campaign`,
          runId,
          siteId,
          suggestionType: "backlink_campaign",
          title: "Build Domain Authority",
          description: `Domain Authority is ${metrics.domainAuthority}. Consider a link building campaign to improve authority and rankings.`,
          severity: metrics.domainAuthority < 20 ? "high" : "medium",
          category: "authority",
          evidenceJson: { metrics, workerKey },
          estimatedImpact: "high",
          estimatedEffort: "significant",
          assignee: "SEO",
          sourceWorkers: [workerKey],
        });
      }
    }
    
    if (workerKey === "content_qa" && metrics.issuesFound > 0) {
      suggestions.push({
        suggestionId: `sug_${timestamp}_content_quality`,
        runId,
        siteId,
        suggestionType: "content_quality",
        title: "Address Content Quality Issues",
        description: `Content QA found ${metrics.issuesFound} issues. Review and fix these to improve user experience and search rankings.`,
        severity: metrics.issuesFound > 10 ? "high" : "medium",
        category: "content",
        evidenceJson: { metrics, workerKey },
        estimatedImpact: "medium",
        estimatedEffort: "quick_win",
        assignee: "Content",
        sourceWorkers: [workerKey],
      });
    }
    
    if (workerKey === "core_web_vitals" && metrics.score !== undefined) {
      if (metrics.score < 50) {
        suggestions.push({
          suggestionId: `sug_${timestamp}_performance`,
          runId,
          siteId,
          suggestionType: "performance_fix",
          title: "Improve Core Web Vitals",
          description: `Performance score is ${metrics.score}. LCP of ${metrics.lcp}ms may be impacting user experience and rankings.`,
          severity: metrics.score < 30 ? "critical" : "high",
          category: "performance",
          evidenceJson: { metrics, workerKey },
          estimatedImpact: "high",
          estimatedEffort: "significant",
          assignee: "Dev",
          sourceWorkers: [workerKey],
        });
      }
    }
  }
  
  return suggestions;
}

function generateKbaseInsights(
  runId: string,
  siteId: string,
  results: WorkerCallResult[]
): InsertSeoKbaseInsight[] {
  const insights: InsertSeoKbaseInsight[] = [];
  const timestamp = Date.now();
  
  const successfulResults = results.filter(r => r.status === "success");
  
  if (successfulResults.length > 0) {
    const summaries = successfulResults
      .filter(r => r.summary)
      .map(r => `• ${r.workerKey}: ${r.summary}`)
      .join("\n");
    
    insights.push({
      insightId: `ins_${timestamp}_daily_summary`,
      runId,
      siteId,
      title: "Daily SEO Health Summary",
      summary: `Analyzed ${successfulResults.length} data sources. Key findings across workers.`,
      fullContent: summaries,
      insightType: "weekly_summary",
      priority: 90,
    });
  }
  
  const techResult = results.find(r => r.workerKey === "crawl_render" && r.status === "success");
  const vitalsResult = results.find(r => r.workerKey === "core_web_vitals" && r.status === "success");
  
  if (techResult || vitalsResult) {
    const techMetrics = techResult?.metrics || {};
    const vitalsMetrics = vitalsResult?.metrics || {};
    
    insights.push({
      insightId: `ins_${timestamp}_technical`,
      runId,
      siteId,
      title: "Technical Health Report",
      summary: `Technical SEO status: ${techMetrics.errorsFound || 0} errors, Performance: ${vitalsMetrics.score || "N/A"}`,
      insightType: "technical_issues",
      priority: 70,
    });
  }
  
  return insights;
}

export async function runWorkerOrchestration(
  runId: string,
  siteId: string = "empathyhealthclinic.com",
  domain?: string
): Promise<OrchestrationResult> {
  const startedAt = new Date();
  
  let resolvedDomain = domain;
  if (!resolvedDomain) {
    const site = await storage.getSiteBySiteId(siteId);
    if (site?.baseUrl) {
      resolvedDomain = site.baseUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    } else {
      resolvedDomain = siteId;
    }
  }
  
  logger.info("WorkerOrchestrator", "Starting orchestration run", { runId, siteId, domain: resolvedDomain });
  
  const workerServices = getWorkerServices().filter(s => 
    WORKER_KEYS.includes(s.serviceSlug as any)
  );
  
  const configPromises = workerServices.map(async (mapping) => {
    const config = await resolveWorkerConfig(mapping.serviceSlug, siteId);
    return { mapping, config };
  });
  
  const configs = await Promise.all(configPromises);
  
  const callPromises = configs.map(({ mapping, config }) =>
    callWorker(config, mapping, siteId, runId, resolvedDomain!)
  );
  
  const results = await Promise.all(callPromises);
  
  const workerResultsToSave: InsertSeoWorkerResult[] = results.map(result => ({
    runId,
    siteId,
    workerKey: result.workerKey,
    status: result.status,
    payloadJson: result.payload,
    metricsJson: result.metrics,
    summaryText: result.summary,
    errorCode: result.errorCode,
    errorDetail: result.errorDetail,
    durationMs: result.durationMs,
    startedAt: startedAt,
    finishedAt: new Date(),
  }));
  
  await storage.saveSeoWorkerResults(workerResultsToSave);
  
  const suggestions = generateSuggestions(runId, siteId, results);
  if (suggestions.length > 0) {
    await storage.saveSeoSuggestions(suggestions);
  }
  
  const insights = generateKbaseInsights(runId, siteId, results);
  if (insights.length > 0) {
    await storage.saveSeoKbaseInsights(insights);
  }
  
  const finishedAt = new Date();
  const successCount = results.filter(r => r.status === "success").length;
  const failedCount = results.filter(r => r.status === "failed" || r.status === "timeout").length;
  
  logger.info("WorkerOrchestrator", "Orchestration complete", {
    runId,
    successCount,
    failedCount,
    suggestionsGenerated: suggestions.length,
    insightsGenerated: insights.length,
    durationMs: finishedAt.getTime() - startedAt.getTime(),
  });
  
  return {
    runId,
    siteId,
    startedAt,
    finishedAt,
    workers: results,
    successCount,
    failedCount,
    suggestions,
    insights,
  };
}

export async function getAggregatedDashboardMetrics(siteId: string): Promise<{
  traffic: { sessions: number | null; users: number | null; change: number | null };
  keywords: { total: number | null; inTop10: number | null; avgPosition: number | null };
  technical: { pagesChecked: number | null; errors: number | null; warnings: number | null };
  authority: { domainAuthority: number | null; backlinks: number | null; referringDomains: number | null };
  performance: { score: number | null; lcp: number | null; cls: number | null };
  lastUpdated: Date | null;
}> {
  const results = await storage.getLatestSeoWorkerResults(siteId);
  
  const defaults = {
    traffic: { sessions: null, users: null, change: null },
    keywords: { total: null, inTop10: null, avgPosition: null },
    technical: { pagesChecked: null, errors: null, warnings: null },
    authority: { domainAuthority: null, backlinks: null, referringDomains: null },
    performance: { score: null, lcp: null, cls: null },
    lastUpdated: null as Date | null,
  };
  
  if (results.length === 0) return defaults;
  
  defaults.lastUpdated = results[0].createdAt;
  
  for (const result of results) {
    const metrics = result.metricsJson as Record<string, any> | null;
    if (!metrics) continue;
    
    switch (result.workerKey) {
      case "serp_intel":
        defaults.keywords = {
          total: metrics.keywordCount ?? null,
          inTop10: metrics.inTop10 ?? null,
          avgPosition: metrics.avgPosition ?? null,
        };
        break;
        
      case "crawl_render":
        defaults.technical = {
          pagesChecked: metrics.pagesChecked ?? null,
          errors: metrics.errorsFound ?? null,
          warnings: metrics.warningsFound ?? null,
        };
        break;
        
      case "core_web_vitals":
        defaults.performance = {
          score: metrics.score ?? null,
          lcp: metrics.lcp ?? null,
          cls: metrics.cls ?? null,
        };
        break;
        
      case "backlink_authority":
        defaults.authority = {
          domainAuthority: metrics.domainAuthority ?? null,
          backlinks: metrics.backlinkCount ?? null,
          referringDomains: metrics.referringDomains ?? null,
        };
        break;
    }
  }
  
  return defaults;
}
