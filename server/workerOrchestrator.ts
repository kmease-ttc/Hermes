import { logger } from "./utils/logger";
import { resolveWorkerConfig, WorkerConfig } from "./workerConfigResolver";
import { getWorkerServices, ServiceSecretMapping } from "@shared/serviceSecretMap";
import { storage } from "./storage";
import { InsertSeoWorkerResult, InsertSeoSuggestion, InsertSeoKbaseInsight, InsertSeoRun } from "@shared/schema";

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
  tickets: { ticketId: string; runId: string; title: string; description: string; category: string; priority: string; status: string; assignee: string; steps: string[]; expectedImpact: string; evidence: Record<string, any> }[];
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
        const keywords = data.data.keywords;
        metrics.keywordCount = keywords.length;
        metrics.inTop10 = keywords.filter((k: any) => k.position && k.position <= 10).length;
        metrics.inPos11to20 = keywords.filter((k: any) => k.position && k.position >= 11 && k.position <= 20).length;
        metrics.inPos21to50 = keywords.filter((k: any) => k.position && k.position >= 21 && k.position <= 50).length;
        metrics.notRanking = keywords.filter((k: any) => !k.position || k.position > 100).length;
        
        const rankedKeywords = keywords.filter((k: any) => k.position && k.position <= 100);
        metrics.avgPosition = rankedKeywords.length > 0
          ? rankedKeywords.reduce((sum: number, k: any) => sum + k.position, 0) / rankedKeywords.length
          : null;
        
        // Extract opportunities (positions 11-20 that can be pushed to top 10)
        metrics.opportunities = keywords
          .filter((k: any) => k.position && k.position >= 11 && k.position <= 20)
          .slice(0, 10)
          .map((k: any) => ({
            keyword: k.keyword || k.query,
            position: k.position,
            url: k.url || k.landingPage,
            volume: k.volume,
          }));
      }
      break;
      
    case "crawl_render":
      if (data.data?.pages) {
        const pages = data.data.pages;
        metrics.pagesChecked = pages.length;
        metrics.totalPagesDiscovered = data.data.totalPagesDiscovered || data.data.totalPages || pages.length;
        metrics.errorsFound = pages.filter((p: any) => p.hasError || p.error).length;
        metrics.warningsFound = pages.filter((p: any) => p.hasWarning || p.warning).length;
        
        // Categorize issues by type
        metrics.issuesByType = {
          missingTitle: pages.filter((p: any) => p.issues?.missingTitle || !p.title).length,
          missingH1: pages.filter((p: any) => p.issues?.missingH1 || !p.h1).length,
          duplicateMeta: pages.filter((p: any) => p.issues?.duplicateMeta).length,
          missingMeta: pages.filter((p: any) => p.issues?.missingMeta || !p.metaDescription).length,
          canonicalIssues: pages.filter((p: any) => p.issues?.canonical || p.issues?.canonicalMismatch).length,
          brokenLinks: pages.filter((p: any) => p.issues?.brokenLinks?.length > 0).length,
          slowPages: pages.filter((p: any) => p.loadTime && p.loadTime > 3000).length,
        };
        
        // Top issues with URLs
        metrics.topIssues = pages
          .filter((p: any) => p.hasError || p.error || p.issues)
          .slice(0, 10)
          .map((p: any) => ({
            url: p.url,
            issues: p.issues || { error: p.error },
            statusCode: p.statusCode,
          }));
      }
      if (data.data?.summary) {
        metrics.pagesChecked = data.data.summary.pagesChecked || metrics.pagesChecked;
        metrics.totalPagesDiscovered = data.data.summary.totalPages || metrics.totalPagesDiscovered;
        metrics.errorsFound = data.data.summary.errors || metrics.errorsFound;
        metrics.warningsFound = data.data.summary.warnings || metrics.warningsFound;
      }
      break;
      
    case "core_web_vitals":
      if (data.data?.vitals) {
        const v = data.data.vitals;
        metrics.lcp = v.lcp ?? (v.lcp_ms ? v.lcp_ms / 1000 : null);
        metrics.fid = v.fid ?? v.fid_ms ?? null;
        metrics.cls = v.cls ?? null;
        metrics.inp = v.inp ?? v.inp_ms ?? null;
        metrics.score = v.score ?? v.performance_score ?? null;
        metrics.ttfb = v.ttfb ?? v.ttfb_ms ?? null;
        metrics.fcp = v.fcp ?? (v.fcp_ms ? v.fcp_ms / 1000 : null);
        metrics.tbt = v.tbt ?? v.tbt_ms ?? null;
        metrics.speed_index = v.speed_index ?? v.speed_index_ms ?? v.speedIndex ?? null;
        
        // Store raw _ms values for downstream consumers
        metrics.fcp_ms = v.fcp_ms ?? (v.fcp ? v.fcp * 1000 : null);
        metrics.ttfb_ms = v.ttfb_ms ?? v.ttfb ?? null;
        metrics.tbt_ms = v.tbt_ms ?? v.tbt ?? null;
        metrics.speed_index_ms = v.speed_index_ms ?? v.speed_index ?? v.speedIndex ?? null;
        metrics.inp_ms = v.inp_ms ?? v.inp ?? null;
        metrics.performance_score = v.performance_score ?? v.score ?? null;
        
        // Thresholds (lcp is in seconds)
        metrics.lcpStatus = metrics.lcp ? (metrics.lcp <= 2.5 ? "good" : metrics.lcp <= 4.0 ? "needs_improvement" : "poor") : null;
        metrics.clsStatus = metrics.cls ? (metrics.cls <= 0.1 ? "good" : metrics.cls <= 0.25 ? "needs_improvement" : "poor") : null;
        metrics.inpStatus = metrics.inp ? (metrics.inp <= 200 ? "good" : metrics.inp <= 500 ? "needs_improvement" : "poor") : null;
      }
      if (data.data?.urls || data.data?.pages) {
        const pages = data.data.urls || data.data.pages;
        metrics.failingUrlsCount = pages.filter((p: any) => p.score && p.score < 50).length;
        metrics.slowUrls = pages
          .filter((p: any) => p.lcp && p.lcp > 2500)
          .slice(0, 10)
          .map((p: any) => ({
            url: p.url,
            lcp: p.lcp,
            cls: p.cls,
            score: p.score,
          }));
      }
      break;
      
    case "backlink_authority":
      if (data.data) {
        metrics.domainAuthority = data.data.domain_authority || data.data.domainAuthority;
        metrics.backlinkCount = data.data.backlink_count || data.data.totalBacklinks;
        metrics.referringDomains = data.data.referring_domains || data.data.referringDomains;
        metrics.newLinks30d = data.data.new_links_30d || data.data.newLinks30d || 0;
        metrics.lostLinks30d = data.data.lost_links_30d || data.data.lostLinks30d || 0;
        
        // Link velocity (net change)
        metrics.linkVelocity = metrics.newLinks30d - metrics.lostLinks30d;
        
        // Lost links details
        if (data.data.lostLinks) {
          metrics.lostLinksDetails = data.data.lostLinks.slice(0, 10).map((l: any) => ({
            sourceUrl: l.sourceUrl || l.source,
            targetUrl: l.targetUrl || l.target,
            domainRating: l.domainRating || l.dr,
            lostDate: l.lostDate || l.date,
          }));
        }
      }
      break;
      
    case "competitive_snapshot":
      if (data.data?.competitors) {
        metrics.competitorCount = data.data.competitors.length;
        metrics.avgCompetitorDA = data.data.competitors.length > 0
          ? data.data.competitors.reduce((sum: number, c: any) => sum + (c.domainAuthority || 0), 0) / data.data.competitors.length
          : null;
        
        metrics.competitors = data.data.competitors.slice(0, 5).map((c: any) => ({
          domain: c.domain,
          da: c.domainAuthority,
          traffic: c.traffic,
        }));
      }
      if (data.data?.gaps) {
        metrics.contentGaps = data.data.gaps.slice(0, 10).map((g: any) => ({
          keyword: g.keyword,
          competitorUrl: g.competitorUrl || g.url,
          volume: g.volume,
          difficulty: g.difficulty,
        }));
        metrics.gapCount = data.data.gaps.length;
      }
      if (data.data?.newPages) {
        metrics.newCompetitorPages = data.data.newPages.slice(0, 10);
      }
      break;
      
    case "content_decay":
      if (data.data?.pages) {
        const pages = data.data.pages;
        metrics.pagesAnalyzed = pages.length;
        metrics.decayingPages = pages.filter((p: any) => p.isDecaying || p.decayScore > 0.5 || p.decay_score > 0.5).length;
        
        // Decayed pages details
        metrics.decayedPagesList = pages
          .filter((p: any) => p.isDecaying || p.decayScore > 0.5 || p.decay_score > 0.5)
          .slice(0, 10)
          .map((p: any) => ({
            url: p.url,
            title: p.title,
            decayScore: p.decayScore || p.decay_score,
            trafficDrop: p.trafficDrop || p.traffic_drop,
            lastUpdated: p.lastUpdated || p.last_updated,
          }));
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
  let suggestionIndex = 0;
  
  const getNextId = (prefix: string) => `sug_${timestamp}_${prefix}_${++suggestionIndex}`;
  
  for (const result of results) {
    if (result.status !== "success" || !result.metrics) continue;
    
    const { workerKey, metrics } = result;
    
    // SERP Quick Wins - Keywords in positions 11-20 that can be pushed to top 10
    if (workerKey === "serp_intel" && metrics.inPos11to20 > 0) {
      const opportunities = metrics.opportunities || [];
      suggestions.push({
        suggestionId: getNextId("serp_quick_win"),
        runId,
        siteId,
        suggestionType: "serp_quick_win",
        title: `Push ${metrics.inPos11to20} Keywords into Top 10`,
        description: `You have ${metrics.inPos11to20} keywords ranking in positions 11-20. These are quick wins that can move to page 1 with targeted optimization.`,
        severity: metrics.inPos11to20 >= 5 ? "high" : "medium",
        category: "serp",
        evidenceJson: { 
          metrics, 
          workerKey,
          opportunities,
        },
        actionsJson: [
          "Review and optimize on-page content for each keyword",
          "Add internal links from high-authority pages",
          "Include FAQ sections addressing related questions",
          "Update meta titles and descriptions for CTR improvement",
          "Add structured data markup where applicable",
        ],
        impactedKeywords: opportunities.map((o: any) => o.keyword),
        impactedUrls: opportunities.map((o: any) => o.url).filter(Boolean),
        estimatedImpact: "high",
        estimatedEffort: "quick_win",
        assignee: "SEO",
        sourceWorkers: [workerKey],
      });
    }
    
    // General keyword optimization
    if (workerKey === "serp_intel" && metrics.keywordCount > 0) {
      if (metrics.inTop10 < metrics.keywordCount * 0.3) {
        suggestions.push({
          suggestionId: getNextId("keyword_optimization"),
          runId,
          siteId,
          suggestionType: "keyword_optimization",
          title: "Improve Overall Keyword Rankings",
          description: `Only ${metrics.inTop10} of ${metrics.keywordCount} tracked keywords are in top 10 (${Math.round((metrics.inTop10 / metrics.keywordCount) * 100)}%). Focus on content quality and backlink building.`,
          severity: metrics.inTop10 < metrics.keywordCount * 0.1 ? "high" : "medium",
          category: "serp",
          evidenceJson: { 
            keywordCount: metrics.keywordCount,
            inTop10: metrics.inTop10,
            avgPosition: metrics.avgPosition,
            workerKey,
          },
          estimatedImpact: "high",
          estimatedEffort: "significant",
          assignee: "SEO",
          sourceWorkers: [workerKey],
        });
      }
    }
    
    // Technical SEO Blockers - Missing titles
    if (workerKey === "crawl_render" && metrics.issuesByType?.missingTitle > 0) {
      suggestions.push({
        suggestionId: getNextId("missing_titles"),
        runId,
        siteId,
        suggestionType: "technical_fix",
        title: `Fix ${metrics.issuesByType.missingTitle} Pages with Missing Titles`,
        description: `Pages without title tags won't rank well. Add unique, descriptive titles to improve search visibility.`,
        severity: "high",
        category: "technical",
        evidenceJson: { 
          count: metrics.issuesByType.missingTitle,
          topIssues: metrics.topIssues?.filter((i: any) => !i.issues?.title),
          workerKey,
        },
        actionsJson: [
          "Add unique title tags under 60 characters",
          "Include primary keyword near the beginning",
          "Make titles compelling for click-through",
        ],
        estimatedImpact: "high",
        estimatedEffort: "quick_win",
        assignee: "Dev",
        sourceWorkers: [workerKey],
      });
    }
    
    // Technical SEO - Missing H1
    if (workerKey === "crawl_render" && metrics.issuesByType?.missingH1 > 0) {
      suggestions.push({
        suggestionId: getNextId("missing_h1"),
        runId,
        siteId,
        suggestionType: "technical_fix",
        title: `Fix ${metrics.issuesByType.missingH1} Pages with Missing H1`,
        description: `H1 tags help search engines understand page content. Each page should have exactly one H1.`,
        severity: "medium",
        category: "technical",
        evidenceJson: { 
          count: metrics.issuesByType.missingH1,
          workerKey,
        },
        estimatedImpact: "medium",
        estimatedEffort: "quick_win",
        assignee: "Dev",
        sourceWorkers: [workerKey],
      });
    }
    
    // Technical SEO - Canonical issues
    if (workerKey === "crawl_render" && metrics.issuesByType?.canonicalIssues > 0) {
      suggestions.push({
        suggestionId: getNextId("canonical_issues"),
        runId,
        siteId,
        suggestionType: "technical_fix",
        title: `Fix ${metrics.issuesByType.canonicalIssues} Canonical Tag Issues`,
        description: `Canonical tag problems can cause duplicate content issues and dilute ranking signals.`,
        severity: "high",
        category: "technical",
        evidenceJson: { 
          count: metrics.issuesByType.canonicalIssues,
          workerKey,
        },
        actionsJson: [
          "Ensure each page has a self-referencing canonical",
          "Fix any canonical chains or loops",
          "Remove canonicals pointing to 404 pages",
        ],
        estimatedImpact: "high",
        estimatedEffort: "moderate",
        assignee: "Dev",
        sourceWorkers: [workerKey],
      });
    }
    
    // General technical errors
    if (workerKey === "crawl_render" && metrics.errorsFound > 0 && !metrics.issuesByType) {
      suggestions.push({
        suggestionId: getNextId("technical_errors"),
        runId,
        siteId,
        suggestionType: "technical_fix",
        title: "Fix Technical SEO Issues",
        description: `Found ${metrics.errorsFound} technical errors across ${metrics.pagesChecked} of ${metrics.totalPagesDiscovered || metrics.pagesChecked} pages.`,
        severity: metrics.errorsFound > 5 ? "high" : "medium",
        category: "technical",
        evidenceJson: { metrics, workerKey },
        estimatedImpact: "high",
        estimatedEffort: "moderate",
        assignee: "Dev",
        sourceWorkers: [workerKey],
      });
    }
    
    // Core Web Vitals - LCP Issues
    if (workerKey === "core_web_vitals" && metrics.lcpStatus === "poor") {
      suggestions.push({
        suggestionId: getNextId("cwv_lcp"),
        runId,
        siteId,
        suggestionType: "performance_fix",
        title: "Fix Slow Largest Contentful Paint (LCP)",
        description: `LCP is ${metrics.lcp}ms (target: <2500ms). This directly impacts Core Web Vitals ranking factor.`,
        severity: "critical",
        category: "performance",
        evidenceJson: { 
          lcp: metrics.lcp,
          slowUrls: metrics.slowUrls,
          workerKey,
        },
        actionsJson: [
          "Optimize largest image (compress, use modern formats)",
          "Implement lazy loading for below-fold images",
          "Reduce server response time (TTFB)",
          "Preload critical resources",
          "Use a CDN for static assets",
        ],
        impactedUrls: metrics.slowUrls?.map((u: any) => u.url),
        estimatedImpact: "high",
        estimatedEffort: "significant",
        assignee: "Dev",
        sourceWorkers: [workerKey],
      });
    }
    
    // Core Web Vitals - CLS Issues
    if (workerKey === "core_web_vitals" && metrics.clsStatus === "poor") {
      suggestions.push({
        suggestionId: getNextId("cwv_cls"),
        runId,
        siteId,
        suggestionType: "performance_fix",
        title: "Fix Layout Shift Issues (CLS)",
        description: `CLS is ${metrics.cls} (target: <0.1). Layout shifts frustrate users and hurt rankings.`,
        severity: "high",
        category: "performance",
        evidenceJson: { cls: metrics.cls, workerKey },
        actionsJson: [
          "Add width/height attributes to images and videos",
          "Reserve space for dynamic content and ads",
          "Avoid inserting content above existing content",
          "Use transform animations instead of layout-triggering properties",
        ],
        estimatedImpact: "high",
        estimatedEffort: "moderate",
        assignee: "Dev",
        sourceWorkers: [workerKey],
      });
    }
    
    // General CWV performance
    if (workerKey === "core_web_vitals" && metrics.score !== undefined && metrics.score < 50) {
      if (!suggestions.some(s => s.suggestionType === "performance_fix")) {
        suggestions.push({
          suggestionId: getNextId("performance"),
          runId,
          siteId,
          suggestionType: "performance_fix",
          title: "Improve Overall Page Performance",
          description: `Performance score is ${metrics.score}/100. Pages scoring below 50 may see ranking penalties.`,
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
    
    // Authority - Lost Links Recovery
    if (workerKey === "backlink_authority" && metrics.lostLinks30d > 5) {
      suggestions.push({
        suggestionId: getNextId("lost_links"),
        runId,
        siteId,
        suggestionType: "link_recovery",
        title: `Recover ${metrics.lostLinks30d} Lost Backlinks`,
        description: `You've lost ${metrics.lostLinks30d} backlinks in the past 30 days. Reclaiming these can restore authority.`,
        severity: metrics.lostLinks30d > 10 ? "high" : "medium",
        category: "authority",
        evidenceJson: { 
          lostLinks30d: metrics.lostLinks30d,
          lostLinksDetails: metrics.lostLinksDetails,
          workerKey,
        },
        actionsJson: [
          "Identify high-value lost links using Ahrefs/SEMrush",
          "Check if linked pages are returning 404 (fix with redirects)",
          "Reach out to site owners to restore removed links",
          "Create new content to attract replacement links",
        ],
        estimatedImpact: "high",
        estimatedEffort: "moderate",
        assignee: "SEO",
        sourceWorkers: [workerKey],
      });
    }
    
    // Authority - Low Domain Authority
    if (workerKey === "backlink_authority" && metrics.domainAuthority !== undefined) {
      if (metrics.domainAuthority < 30) {
        suggestions.push({
          suggestionId: getNextId("build_authority"),
          runId,
          siteId,
          suggestionType: "backlink_campaign",
          title: "Build Domain Authority",
          description: `Domain Authority is ${metrics.domainAuthority}. Building quality backlinks will improve rankings across all pages.`,
          severity: metrics.domainAuthority < 20 ? "high" : "medium",
          category: "authority",
          evidenceJson: { 
            domainAuthority: metrics.domainAuthority,
            referringDomains: metrics.referringDomains,
            workerKey,
          },
          actionsJson: [
            "Create linkable assets (guides, tools, research)",
            "Guest post on industry publications",
            "Pursue HARO and journalist opportunities",
            "Build relationships with industry influencers",
          ],
          estimatedImpact: "high",
          estimatedEffort: "significant",
          assignee: "SEO",
          sourceWorkers: [workerKey],
        });
      }
    }
    
    // Content Decay - Refresh declining pages
    if (workerKey === "content_decay" && metrics.decayingPages > 0) {
      suggestions.push({
        suggestionId: getNextId("content_decay"),
        runId,
        siteId,
        suggestionType: "content_refresh",
        title: `Refresh ${metrics.decayingPages} Decaying Pages`,
        description: `${metrics.decayingPages} pages are losing traffic. Updating these can recover lost organic visits.`,
        severity: metrics.decayingPages > 3 ? "high" : "medium",
        category: "content",
        evidenceJson: { 
          decayingPages: metrics.decayingPages,
          decayedPagesList: metrics.decayedPagesList,
          workerKey,
        },
        actionsJson: [
          "Update statistics and dates to current year",
          "Add new sections addressing recent developments",
          "Improve internal linking to/from decaying pages",
          "Add FAQ sections targeting related questions",
          "Republish with updated date",
        ],
        impactedUrls: metrics.decayedPagesList?.map((p: any) => p.url),
        estimatedImpact: "medium",
        estimatedEffort: "moderate",
        assignee: "Content",
        sourceWorkers: [workerKey],
      });
    }
    
    // Competitive Gaps - Missing content opportunities
    if (workerKey === "competitive_snapshot" && metrics.gapCount > 0) {
      suggestions.push({
        suggestionId: getNextId("competitive_gaps"),
        runId,
        siteId,
        suggestionType: "content_gap",
        title: `Create Content for ${metrics.gapCount} Competitive Gaps`,
        description: `Competitors rank for ${metrics.gapCount} keywords/topics you don't cover. Creating this content can capture new traffic.`,
        severity: metrics.gapCount >= 10 ? "high" : "medium",
        category: "competitive",
        evidenceJson: { 
          gapCount: metrics.gapCount,
          contentGaps: metrics.contentGaps,
          workerKey,
        },
        actionsJson: [
          "Prioritize gaps by search volume and difficulty",
          "Create comprehensive content better than competitors",
          "Include unique insights, data, or perspectives",
          "Optimize for featured snippets where applicable",
        ],
        impactedKeywords: metrics.contentGaps?.map((g: any) => g.keyword),
        estimatedImpact: "high",
        estimatedEffort: "significant",
        assignee: "Content",
        sourceWorkers: [workerKey],
      });
    }
    
    // Content QA issues
    if (workerKey === "content_qa" && metrics.issuesFound > 0) {
      suggestions.push({
        suggestionId: getNextId("content_quality"),
        runId,
        siteId,
        suggestionType: "content_quality",
        title: "Fix Content Quality Issues",
        description: `Content QA found ${metrics.issuesFound} issues affecting content quality and user experience.`,
        severity: metrics.issuesFound > 10 ? "high" : "medium",
        category: "content",
        evidenceJson: { metrics, workerKey },
        estimatedImpact: "medium",
        estimatedEffort: "quick_win",
        assignee: "Content",
        sourceWorkers: [workerKey],
      });
    }
  }
  
  // Sort by severity (critical > high > medium > low) and return
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return suggestions.sort((a, b) => {
    const aOrder = severityOrder[a.severity || "low"] ?? 4;
    const bOrder = severityOrder[b.severity || "low"] ?? 4;
    return aOrder - bOrder;
  });
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

// Generate tickets from suggestions
function generateTicketsFromSuggestions(
  runId: string,
  suggestions: InsertSeoSuggestion[]
): { ticketId: string; runId: string; title: string; description: string; category: string; priority: string; status: string; assignee: string; steps: string[]; expectedImpact: string; evidence: Record<string, any> }[] {
  const tickets: { ticketId: string; runId: string; title: string; description: string; category: string; priority: string; status: string; assignee: string; steps: string[]; expectedImpact: string; evidence: Record<string, any> }[] = [];
  const timestamp = Date.now();
  let ticketIndex = 0;
  
  for (const suggestion of suggestions) {
    // Only create tickets for high severity items or critical categories
    const shouldCreateTicket = 
      suggestion.severity === "critical" || 
      suggestion.severity === "high" ||
      suggestion.category === "performance" ||
      suggestion.category === "technical";
    
    if (!shouldCreateTicket) continue;
    
    // Determine ticket category (Engineering vs Content)
    let ticketCategory = "SEO";
    let assignee = suggestion.assignee || "SEO";
    
    if (suggestion.category === "performance" || suggestion.category === "technical") {
      ticketCategory = "Engineering";
      assignee = "Dev";
    } else if (suggestion.category === "content" || suggestion.category === "competitive") {
      ticketCategory = "Content";
      assignee = "Content";
    } else if (suggestion.category === "authority") {
      ticketCategory = "SEO";
      assignee = "SEO";
    }
    
    // Map severity to priority
    const priorityMap: Record<string, string> = {
      critical: "Urgent",
      high: "High",
      medium: "Medium",
      low: "Low",
    };
    
    tickets.push({
      ticketId: `TICK-${timestamp}-${++ticketIndex}`,
      runId,
      title: suggestion.title,
      description: suggestion.description || "",
      category: ticketCategory,
      priority: priorityMap[suggestion.severity || "medium"] || "Medium",
      status: "Open",
      assignee,
      steps: (suggestion.actionsJson as string[]) || [],
      expectedImpact: `${suggestion.estimatedImpact || "medium"} impact on SEO performance`,
      evidence: {
        suggestionId: suggestion.suggestionId,
        category: suggestion.category,
        impactedUrls: suggestion.impactedUrls?.slice(0, 5),
        impactedKeywords: suggestion.impactedKeywords?.slice(0, 10),
        sourceWorkers: suggestion.sourceWorkers,
      },
    });
  }
  
  return tickets;
}

export async function runWorkerOrchestration(
  runId: string,
  siteId: string = "empathyhealthclinic.com",
  domain?: string
): Promise<OrchestrationResult> {
  const startedAt = new Date();
  
  let resolvedDomain = domain;
  if (!resolvedDomain) {
    const site = await storage.getSiteById(siteId);
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
  
  // Create run record with "running" status
  await storage.createSeoRun({
    runId,
    siteId,
    domain: resolvedDomain!,
    status: "running",
    totalWorkers: workerServices.length,
    completedWorkers: 0,
    successWorkers: 0,
    failedWorkers: 0,
    skippedWorkers: 0,
    startedAt,
    workerStatusesJson: {},
  });
  
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
  
  // Generate tickets from suggestions
  const tickets = generateTicketsFromSuggestions(runId, suggestions);
  if (tickets.length > 0) {
    const ticketsToSave = tickets.map(t => ({
      ticketId: t.ticketId,
      runId: t.runId,
      title: t.title,
      description: t.description,
      category: t.category,
      priority: t.priority,
      status: t.status,
      owner: t.assignee,
      steps: t.steps,
      expectedImpact: t.expectedImpact,
      evidence: t.evidence,
    }));
    await storage.saveTickets(ticketsToSave);
  }
  
  const finishedAt = new Date();
  const successCount = results.filter(r => r.status === "success").length;
  const failedCount = results.filter(r => r.status === "failed" || r.status === "timeout").length;
  const skippedCount = results.filter(r => r.status === "skipped").length;
  
  // Build worker statuses map
  const workerStatusesJson: Record<string, any> = {};
  for (const result of results) {
    workerStatusesJson[result.workerKey] = {
      status: result.status,
      durationMs: result.durationMs,
      summary: result.summary,
      error: result.errorCode,
    };
  }
  
  // Determine final run status
  let runStatus: string;
  if (successCount === results.length) {
    runStatus = "complete";
  } else if (successCount > 0) {
    runStatus = "partial";
  } else {
    runStatus = "failed";
  }
  
  // Update run record with final status
  await storage.updateSeoRun(runId, {
    status: runStatus,
    completedWorkers: results.length,
    successWorkers: successCount,
    failedWorkers: failedCount,
    skippedWorkers: skippedCount,
    suggestionsGenerated: suggestions.length,
    insightsGenerated: insights.length,
    ticketsGenerated: tickets.length,
    finishedAt,
    workerStatusesJson,
  });
  
  logger.info("WorkerOrchestrator", "Orchestration complete", {
    runId,
    status: runStatus,
    successCount,
    failedCount,
    skippedCount,
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
    tickets,
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
