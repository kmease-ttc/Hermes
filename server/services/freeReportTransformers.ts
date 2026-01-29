import type {
  FreeReportSummary,
  FreeReportCompetitors,
  FreeReportCompetitor,
  FreeReportKeywords,
  FreeReportKeywordTarget,
  FreeReportTechnical,
  FreeReportTechnicalBucket,
  FreeReportTechnicalFinding,
  FreeReportPerformance,
  FreeReportPerformanceUrl,
  FreeReportNextSteps,
  Finding,
  SerpRanking,
  CoreWebVitalsDaily,
} from "@shared/schema";
import { calculateHealthScore, type HealthScoreBreakdown } from "./freeReportScoring";

export interface TransformContext {
  domain: string;
  industry?: string;
}

export interface SerpCompetitorData {
  domain: string;
  keywordCount: number;
  positions: number[];
  examplePages: string[];
}

export function transformToSummary(
  technicalFindings: FreeReportTechnicalFinding[],
  performanceUrls: FreeReportPerformanceUrl[],
  keywordTargets: FreeReportKeywordTarget[],
  context: TransformContext
): FreeReportSummary {
  const scoreBreakdown = calculateHealthScore(
    technicalFindings,
    performanceUrls,
    keywordTargets
  );

  const allIssues: FreeReportSummary["top_issues"] = [];

  for (const finding of technicalFindings) {
    if (finding.severity === "high" || finding.severity === "medium") {
      allIssues.push({
        title: finding.title,
        explanation: finding.detail,
        severity: finding.severity,
        impact: finding.impact,
        mapped_section: "technical",
      });
    }
  }

  const poorPerformance = performanceUrls.filter((u) => u.overall === "critical");
  if (poorPerformance.length > 0) {
    allIssues.push({
      title: `${poorPerformance.length} pages have poor Core Web Vitals`,
      explanation: `Key pages are loading slowly or have layout shift issues, affecting user experience and rankings.`,
      severity: "high",
      impact: "both",
      mapped_section: "performance",
    });
  }

  const notRankingCount = keywordTargets.filter(
    (k) => k.current_bucket === "not_ranking" && k.intent === "high_intent"
  ).length;
  if (notRankingCount >= 5) {
    allIssues.push({
      title: `Not ranking for ${notRankingCount} high-intent keywords`,
      explanation: `Your site doesn't appear in search results for several valuable keywords potential customers are searching.`,
      severity: notRankingCount >= 10 ? "high" : "medium",
      impact: "traffic",
      mapped_section: "keywords",
    });
  }

  allIssues.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  const opportunities: FreeReportSummary["top_opportunities"] = [];

  const nearTop10 = keywordTargets.filter((k) => k.current_bucket === "11_30");
  if (nearTop10.length > 0) {
    opportunities.push({
      title: `${nearTop10.length} keywords are close to page 1`,
      explanation: `With targeted optimization, these keywords could move from positions 11-30 to the first page of search results.`,
      severity: "medium",
      impact: "traffic",
      mapped_section: "keywords",
    });
  }

  const needsWorkPerformance = performanceUrls.filter(
    (u) => u.overall === "needs_attention"
  );
  if (needsWorkPerformance.length > 0) {
    opportunities.push({
      title: `${needsWorkPerformance.length} pages can be optimized for speed`,
      explanation: `These pages have minor performance issues that can be improved with targeted fixes.`,
      severity: "low",
      impact: "conversion",
      mapped_section: "performance",
    });
  }

  const lowFindings = technicalFindings.filter((f) => f.severity === "low");
  if (lowFindings.length > 0) {
    opportunities.push({
      title: `${lowFindings.length} quick technical wins available`,
      explanation: `Minor technical improvements that are easy to fix and can improve overall SEO health.`,
      severity: "low",
      impact: "traffic",
      mapped_section: "technical",
    });
  }

  const estimatedOpportunity = calculateEstimatedOpportunity(
    keywordTargets,
    scoreBreakdown.score
  );

  return {
    health_score: scoreBreakdown.score,
    top_issues: allIssues.slice(0, 3),
    top_opportunities: opportunities.slice(0, 3),
    estimated_opportunity: estimatedOpportunity,
  };
}

function calculateEstimatedOpportunity(
  keywords: FreeReportKeywordTarget[],
  healthScore: number
): FreeReportSummary["estimated_opportunity"] {
  let totalMinTraffic = 0;
  let totalMaxTraffic = 0;

  for (const kw of keywords) {
    if (!kw.volume_range) continue;

    let ctrMultiplier = 0;
    if (kw.current_bucket === "not_ranking") {
      ctrMultiplier = 0.03;
    } else if (kw.current_bucket === "11_30") {
      ctrMultiplier = 0.05;
    } else if (kw.current_bucket === "4_10") {
      ctrMultiplier = 0.08;
    } else if (kw.current_bucket === "top_3") {
      ctrMultiplier = 0.02;
    } else {
      // rank_1 — already captured
      ctrMultiplier = 0.01;
    }

    totalMinTraffic += kw.volume_range.min * ctrMultiplier;
    totalMaxTraffic += kw.volume_range.max * ctrMultiplier;
  }

  const hasData = totalMaxTraffic > 0;
  const confidence: "low" | "medium" | "high" =
    keywords.length >= 15 ? "high" : keywords.length >= 8 ? "medium" : "low";

  return {
    traffic_range_monthly: hasData
      ? { min: Math.round(totalMinTraffic), max: Math.round(totalMaxTraffic) }
      : null,
    leads_range_monthly: hasData
      ? {
          min: Math.round(totalMinTraffic * 0.02),
          max: Math.round(totalMaxTraffic * 0.05),
        }
      : null,
    revenue_range_monthly: null,
    confidence,
  };
}

export function transformToCompetitors(
  serpData: SerpCompetitorData[],
  context: TransformContext
): FreeReportCompetitors {
  const competitors = serpData
    .filter((c) => c.domain !== context.domain)
    .map((c): FreeReportCompetitor => {
      const avgPosition =
        c.positions.length > 0
          ? c.positions.reduce((a, b) => a + b, 0) / c.positions.length
          : 100;

      const visibilityIndex = Math.round(
        (c.keywordCount * 10) / Math.max(avgPosition, 1)
      );

      return {
        domain: c.domain,
        visibility_index: Math.min(visibilityIndex, 100),
        keyword_overlap_count: c.keywordCount,
        example_pages: c.examplePages.slice(0, 3),
        notes: generateCompetitorNotes(c, avgPosition),
      };
    })
    .sort((a, b) => b.visibility_index - a.visibility_index)
    .slice(0, 5);

  const insight = generateCompetitorsInsight(competitors);

  return {
    items: competitors,
    insight,
  };
}

function generateCompetitorNotes(
  competitor: SerpCompetitorData,
  avgPosition: number
): string {
  if (avgPosition <= 3) {
    return `Dominant competitor ranking in top 3 for ${competitor.keywordCount} keywords`;
  } else if (avgPosition <= 10) {
    return `Strong competitor on page 1 for most shared keywords`;
  } else {
    return `Secondary competitor with opportunity to outrank`;
  }
}

function generateCompetitorsInsight(competitors: FreeReportCompetitor[]): string {
  if (competitors.length === 0) {
    return "No significant competitors found for your target keywords.";
  }

  const topCompetitor = competitors[0];
  return `Your main competitor ${topCompetitor.domain} has a visibility score of ${topCompetitor.visibility_index} and overlaps on ${topCompetitor.keyword_overlap_count} keywords. Focus on differentiating your content and building authority in your niche.`;
}

export interface RankingsDataInput {
  keyword: string;
  intent?: string;
  position: number | null;
  volume?: number;
  winnerDomain?: string;
}

export function transformToKeywords(
  rankingsData: RankingsDataInput[]
): FreeReportKeywords {
  const bucketCounts = {
    rank_1: 0,
    top_3: 0,
    "4_10": 0,
    "11_30": 0,
    not_ranking: 0,
  };

  const targets: FreeReportKeywordTarget[] = rankingsData
    .slice(0, 25)
    .map((r) => {
      let currentBucket: FreeReportKeywordTarget["current_bucket"];

      if (r.position === null || r.position > 100) {
        currentBucket = "not_ranking";
      } else if (r.position === 1) {
        currentBucket = "rank_1";
      } else if (r.position <= 3) {
        currentBucket = "top_3";
      } else if (r.position <= 10) {
        currentBucket = "4_10";
      } else {
        currentBucket = "11_30";
      }

      bucketCounts[currentBucket]++;

      const intent: FreeReportKeywordTarget["intent"] =
        r.intent === "transactional" ||
        r.intent === "commercial" ||
        r.intent === "high_intent"
          ? "high_intent"
          : "informational";

      return {
        keyword: r.keyword,
        intent,
        volume_range: r.volume ? { min: r.volume * 0.8, max: r.volume * 1.2 } : null,
        current_bucket: currentBucket,
        position: r.position,
        winner_domain: r.winnerDomain || null,
      };
    });

  const insight = generateKeywordsInsight(bucketCounts, targets);

  return {
    targets,
    bucket_counts: bucketCounts,
    insight,
  };
}

function generateKeywordsInsight(
  buckets: FreeReportKeywords["bucket_counts"],
  targets: FreeReportKeywordTarget[]
): string {
  const total = buckets.rank_1 + buckets.top_3 + buckets["4_10"] + buckets["11_30"] + buckets.not_ranking;
  if (total === 0) return "No keyword data available.";

  const onPage1 = buckets.rank_1 + buckets.top_3 + buckets["4_10"];
  const page1Percent = Math.round((onPage1 / total) * 100);

  if (buckets.not_ranking > 0) {
    return `${buckets.not_ranking} of ${total} keywords are not ranking at all — this is your biggest opportunity. Each unranked keyword represents potential traffic and revenue you're currently leaving on the table.`;
  } else if (page1Percent >= 50) {
    return `Strong keyword presence: ${page1Percent}% of tracked keywords are on page 1. Focus on maintaining positions and targeting new opportunities.`;
  } else {
    return `${buckets["11_30"]} keywords are close to page 1 (positions 11-30). Targeted optimization could quickly improve visibility.`;
  }
}

export interface CrawlFindingInput {
  category: string;
  severity: string;
  title: string;
  description?: string;
  evidence?: Array<{ type: string; value: string }>;
}

export function transformToTechnical(
  crawlFindings: CrawlFindingInput[]
): FreeReportTechnical {
  const bucketMap: Record<string, FreeReportTechnicalBucket["name"]> = {
    crawlability: "Indexing & Crawlability",
    indexation: "Indexing & Crawlability",
    internal_links: "Site Structure & Internal Links",
    structure: "Site Structure & Internal Links",
    content: "On-page Basics",
    on_page: "On-page Basics",
    errors: "Errors & Warnings",
    security_headers: "Errors & Warnings",
    performance: "Errors & Warnings",
  };

  const buckets: FreeReportTechnicalBucket[] = [
    { name: "Indexing & Crawlability", status: "good", findings: [] },
    { name: "Site Structure & Internal Links", status: "good", findings: [] },
    { name: "On-page Basics", status: "good", findings: [] },
    { name: "Errors & Warnings", status: "good", findings: [] },
  ];

  for (const finding of crawlFindings) {
    const bucketName = bucketMap[finding.category] || "Errors & Warnings";
    const bucket = buckets.find((b) => b.name === bucketName);
    if (!bucket) continue;

    const severity: FreeReportTechnicalFinding["severity"] =
      finding.severity === "critical" || finding.severity === "high"
        ? "high"
        : finding.severity === "medium"
        ? "medium"
        : "low";

    const impact: FreeReportTechnicalFinding["impact"] =
      bucketName === "Errors & Warnings" ? "both" : "traffic";

    const exampleUrls: string[] = [];
    if (finding.evidence) {
      for (const ev of finding.evidence) {
        if (ev.type === "url" || ev.type === "page") {
          exampleUrls.push(ev.value);
        }
      }
    }

    bucket.findings.push({
      title: finding.title,
      detail: finding.description || "",
      severity,
      impact,
      example_urls: exampleUrls.slice(0, 3),
    });
  }

  for (const bucket of buckets) {
    const hasHigh = bucket.findings.some((f) => f.severity === "high");
    const hasMedium = bucket.findings.some((f) => f.severity === "medium");

    if (hasHigh) {
      bucket.status = "critical";
    } else if (hasMedium) {
      bucket.status = "needs_attention";
    } else {
      bucket.status = "good";
    }

    bucket.findings.sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      return order[a.severity] - order[b.severity];
    });
  }

  return { buckets };
}

export function transformToPerformance(
  cwvData: CoreWebVitalsDaily[]
): FreeReportPerformance {
  const urlMap = new Map<string, CoreWebVitalsDaily>();

  for (const entry of cwvData) {
    const existing = urlMap.get(entry.url);
    if (!existing || entry.date > existing.date) {
      urlMap.set(entry.url, entry);
    }
  }

  const urls: FreeReportPerformanceUrl[] = [];

  for (const [url, data] of urlMap) {
    const lcpStatus = getMetricStatus(data.lcp || 0, 2500, 4000);
    const clsStatus = getMetricStatus(data.cls || 0, 0.1, 0.25);
    const inpStatus: FreeReportPerformanceUrl["inp_status"] = data.inp
      ? getMetricStatus(data.inp, 200, 500)
      : "not_available";

    const overall = getOverallStatus(lcpStatus, clsStatus, inpStatus);

    urls.push({
      url,
      lcp_status: lcpStatus,
      cls_status: clsStatus,
      inp_status: inpStatus,
      overall,
    });
  }

  urls.sort((a, b) => {
    const order = { critical: 0, needs_attention: 1, good: 2 };
    return order[a.overall] - order[b.overall];
  });

  const limitedUrls = urls.slice(0, 5);
  const globalInsight = generatePerformanceInsight(limitedUrls);

  return {
    urls: limitedUrls,
    global_insight: globalInsight,
  };
}

function getMetricStatus(
  value: number,
  goodThreshold: number,
  poorThreshold: number
): "good" | "needs_work" | "poor" {
  if (value <= goodThreshold) return "good";
  if (value <= poorThreshold) return "needs_work";
  return "poor";
}

function getOverallStatus(
  lcp: "good" | "needs_work" | "poor",
  cls: "good" | "needs_work" | "poor",
  inp: "good" | "needs_work" | "poor" | "not_available"
): "good" | "needs_attention" | "critical" {
  const statuses = [lcp, cls];
  if (inp !== "not_available") statuses.push(inp);

  if (statuses.includes("poor")) return "critical";
  if (statuses.includes("needs_work")) return "needs_attention";
  return "good";
}

function generatePerformanceInsight(urls: FreeReportPerformanceUrl[]): string {
  if (urls.length === 0) {
    return "No Core Web Vitals data available yet.";
  }

  const critical = urls.filter((u) => u.overall === "critical").length;
  const good = urls.filter((u) => u.overall === "good").length;

  if (critical > 0) {
    return `${critical} page(s) have poor Core Web Vitals scores affecting user experience and search rankings. Prioritize fixing LCP and CLS issues.`;
  } else if (good === urls.length) {
    return "All measured pages have good Core Web Vitals. Maintain current performance optimizations.";
  } else {
    return "Some pages need performance improvements. Focus on optimizing images and reducing layout shifts.";
  }
}

export function transformToNextSteps(
  technicalFindings: FreeReportTechnicalFinding[],
  performanceUrls: FreeReportPerformanceUrl[],
  keywordTargets: FreeReportKeywordTarget[],
  healthScore: number
): FreeReportNextSteps {
  const ifDoNothing: string[] = [];
  const ifYouFixThis: string[] = [];

  const highSeverityCount = technicalFindings.filter(
    (f) => f.severity === "high"
  ).length;
  const criticalPerformance = performanceUrls.filter(
    (u) => u.overall === "critical"
  ).length;
  const notRankingHighIntent = keywordTargets.filter(
    (k) => k.current_bucket === "not_ranking" && k.intent === "high_intent"
  ).length;

  if (highSeverityCount > 0) {
    ifDoNothing.push(
      `${highSeverityCount} critical technical issues will continue hurting your rankings`
    );
    ifYouFixThis.push(
      `Resolving technical issues can improve crawlability and index coverage`
    );
  }

  if (criticalPerformance > 0) {
    ifDoNothing.push(
      `Poor page speed on ${criticalPerformance} key pages will increase bounce rates`
    );
    ifYouFixThis.push(
      `Faster pages typically see 15-25% better conversion rates`
    );
  }

  if (notRankingHighIntent >= 5) {
    ifDoNothing.push(
      `You'll continue missing traffic from ${notRankingHighIntent} valuable search terms`
    );
    ifYouFixThis.push(
      `Targeting these keywords could bring significant new qualified traffic`
    );
  }

  if (ifDoNothing.length === 0) {
    ifDoNothing.push("Your site is in good shape, but competitors may catch up");
  }
  if (ifYouFixThis.length === 0) {
    ifYouFixThis.push("Maintain your strong SEO foundation and monitor for changes");
  }

  const implementationPlan = buildImplementationPlan(
    technicalFindings,
    performanceUrls,
    keywordTargets
  );

  return {
    if_do_nothing: ifDoNothing.slice(0, 3),
    if_you_fix_this: ifYouFixThis.slice(0, 3),
    ctas: [
      {
        id: "view_full_report",
        label: "View Full Report",
        action: "route",
        target: "/report",
      },
      {
        id: "deploy_fixes",
        label: "Deploy Automated Fixes",
        action: "modal",
        target: "deploy_modal",
      },
      {
        id: "send_to_dev",
        label: "Send to Developer",
        action: "modal",
        target: "export_modal",
      },
    ],
    implementation_plan: implementationPlan.slice(0, 5),
  };
}

function buildImplementationPlan(
  technicalFindings: FreeReportTechnicalFinding[],
  performanceUrls: FreeReportPerformanceUrl[],
  keywordTargets: FreeReportKeywordTarget[]
): FreeReportNextSteps["implementation_plan"] {
  const plan: FreeReportNextSteps["implementation_plan"] = [];
  let priority = 1;

  const criticalTechnical = technicalFindings.filter((f) => f.severity === "high");
  for (const finding of criticalTechnical.slice(0, 2)) {
    plan.push({
      priority: priority++,
      title: `Fix: ${finding.title}`,
      what_to_change: finding.detail,
      where_to_change:
        finding.example_urls.length > 0
          ? finding.example_urls[0]
          : "Affected pages",
      expected_impact: "Improved crawlability and indexation",
      acceptance_check: "Issue no longer detected in site audit",
    });
  }

  const criticalPerf = performanceUrls.filter((u) => u.overall === "critical");
  for (const url of criticalPerf.slice(0, 2)) {
    const issues: string[] = [];
    if (url.lcp_status === "poor") issues.push("LCP");
    if (url.cls_status === "poor") issues.push("CLS");
    if (url.inp_status === "poor") issues.push("INP");

    plan.push({
      priority: priority++,
      title: `Improve Core Web Vitals (${issues.join(", ")})`,
      what_to_change: `Optimize ${issues.join(" and ")} metrics`,
      where_to_change: url.url,
      expected_impact: "Better user experience and search ranking boost",
      acceptance_check: "PageSpeed Insights shows green scores",
    });
  }

  const nearPage1 = keywordTargets.filter((k) => k.current_bucket === "11_30");
  if (nearPage1.length > 0) {
    plan.push({
      priority: priority++,
      title: `Push ${nearPage1.length} keywords to page 1`,
      what_to_change:
        "Add relevant content, improve internal linking, build topic authority",
      where_to_change: "Content pages targeting these keywords",
      expected_impact: `Potential to reach page 1 for ${nearPage1.length} keywords`,
      acceptance_check: "Keywords move to positions 1-10 in rank tracking",
    });
  }

  return plan;
}
