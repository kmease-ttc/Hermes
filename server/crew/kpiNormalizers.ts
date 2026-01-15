import type { InsertCrewKpi } from "@shared/schema";

export interface KpiNormalizerResult {
  kpis: Omit<InsertCrewKpi, "runId">[];
  summary: string;
}

type KpiNormalizer = (crewId: string, siteId: string, workerResponse: any) => KpiNormalizerResult;

function normalizeScottyOutput(crewId: string, siteId: string, response: any): KpiNormalizerResult {
  const kpis: Omit<InsertCrewKpi, "runId">[] = [];
  
  let technicalHealthScore = 100;
  
  const crawlSummary = response?.crawl_summary || {};
  const indexability = response?.indexability || {};
  const issues = response?.issues || [];
  const kpisFromWorker = response?.kpis || {};
  
  const criticalCount = issues.filter((i: any) => i.severity === 'critical').length;
  const highCount = issues.filter((i: any) => i.severity === 'high').length;
  const mediumCount = issues.filter((i: any) => i.severity === 'medium').length;
  
  technicalHealthScore -= criticalCount * 15;
  technicalHealthScore -= highCount * 5;
  technicalHealthScore -= mediumCount * 2;
  
  if (criticalCount > 0) {
    technicalHealthScore = Math.min(technicalHealthScore, 70);
  }
  
  technicalHealthScore = Math.max(0, Math.min(100, technicalHealthScore));
  
  kpis.push({
    siteId,
    crewId,
    metricKey: "technicalHealthScore",
    value: technicalHealthScore,
    unit: "score",
    measuredAt: new Date(),
  });
  
  const indexCoverage = kpisFromWorker.index_coverage 
    ?? indexability.coverage_percent 
    ?? crawlSummary.index_coverage 
    ?? null;
  if (indexCoverage !== null) {
    kpis.push({
      siteId,
      crewId,
      metricKey: "indexCoverage",
      value: indexCoverage,
      unit: "percent",
      measuredAt: new Date(),
    });
  }
  
  if (kpisFromWorker.pages_crawled !== undefined || crawlSummary.pages_crawled !== undefined) {
    kpis.push({
      siteId,
      crewId,
      metricKey: "tech.pages_crawled",
      value: kpisFromWorker.pages_crawled ?? crawlSummary.pages_crawled,
      unit: "count",
      measuredAt: new Date(),
    });
  }
  
  if (kpisFromWorker.errors !== undefined || issues.length > 0) {
    kpis.push({
      siteId,
      crewId,
      metricKey: "tech.errors",
      value: kpisFromWorker.errors ?? criticalCount + highCount,
      unit: "count",
      measuredAt: new Date(),
    });
  }
  
  return {
    kpis,
    summary: `Technical Health: ${technicalHealthScore}/100 (${criticalCount} critical, ${highCount} high issues)`,
  };
}

function normalizeSpeedsterOutput(crewId: string, siteId: string, response: any): KpiNormalizerResult {
  const kpis: Omit<InsertCrewKpi, "runId">[] = [];
  const vitalsSummary = response?.vitals_summary || {};
  const workerKpis = response?.kpis || {};
  
  const performanceScore = workerKpis.performance_score ?? vitalsSummary.performance_score ?? null;
  if (performanceScore !== null) {
    kpis.push({
      siteId,
      crewId,
      metricKey: "vitals.performance_score",
      value: performanceScore,
      unit: "score",
      measuredAt: new Date(),
    });
  }
  
  if (workerKpis.lcp !== undefined || vitalsSummary.lcp !== undefined) {
    kpis.push({
      siteId,
      crewId,
      metricKey: "vitals.lcp",
      value: workerKpis.lcp ?? vitalsSummary.lcp,
      unit: "seconds",
      measuredAt: new Date(),
    });
  }
  
  return {
    kpis,
    summary: performanceScore !== null ? `Performance Score: ${performanceScore}/100` : "No performance data",
  };
}

function normalizePopularOutput(crewId: string, siteId: string, response: any): KpiNormalizerResult {
  const kpis: Omit<InsertCrewKpi, "runId">[] = [];
  const ga4Summary = response?.ga4_summary || {};
  const gscSummary = response?.gsc_summary || {};
  const workerKpis = response?.kpis || {};
  
  const sessions = workerKpis.sessions ?? ga4Summary.sessions ?? null;
  if (sessions !== null) {
    kpis.push({
      siteId,
      crewId,
      metricKey: "ga4.sessions",
      value: sessions,
      unit: "count_monthly",
      measuredAt: new Date(),
    });
  }
  
  const clicks = workerKpis.clicks ?? gscSummary.clicks ?? null;
  if (clicks !== null) {
    kpis.push({
      siteId,
      crewId,
      metricKey: "gsc.clicks",
      value: clicks,
      unit: "count_monthly",
      measuredAt: new Date(),
    });
  }
  
  return {
    kpis,
    summary: sessions !== null ? `${sessions.toLocaleString()} sessions` : "No analytics data",
  };
}

function normalizeSentinelOutput(crewId: string, siteId: string, response: any): KpiNormalizerResult {
  const kpis: Omit<InsertCrewKpi, "runId">[] = [];
  const workerKpis = response?.kpis || {};
  const decaySummary = response?.decay_summary || {};
  
  const pagesLosingTraffic = workerKpis.pages_losing_traffic 
    ?? decaySummary.pages_losing_traffic 
    ?? workerKpis.decay_signals 
    ?? 0;
  
  kpis.push({
    siteId,
    crewId,
    metricKey: "content.decay_signals",
    value: pagesLosingTraffic,
    unit: "count",
    measuredAt: new Date(),
  });
  
  const refreshCandidates = workerKpis.refresh_candidates ?? decaySummary.refresh_candidates ?? null;
  if (refreshCandidates !== null) {
    kpis.push({
      siteId,
      crewId,
      metricKey: "content.refresh_candidates",
      value: refreshCandidates,
      unit: "count",
      measuredAt: new Date(),
    });
  }
  
  return {
    kpis,
    summary: `${pagesLosingTraffic} pages losing traffic`,
  };
}

function normalizeHemingwayOutput(crewId: string, siteId: string, response: any): KpiNormalizerResult {
  const kpis: Omit<InsertCrewKpi, "runId">[] = [];
  const workerKpis = response?.kpis || {};
  const contentSummary = response?.content_summary || {};
  
  const contentScore = workerKpis.content_score 
    ?? contentSummary.quality_score 
    ?? workerKpis.quality_score 
    ?? 85;
  
  kpis.push({
    siteId,
    crewId,
    metricKey: "content_score",
    value: Math.max(0, Math.min(100, contentScore)),
    unit: "score",
    measuredAt: new Date(),
  });
  
  const articlesGenerated = workerKpis.articles_generated ?? contentSummary.articles_generated ?? null;
  if (articlesGenerated !== null) {
    kpis.push({
      siteId,
      crewId,
      metricKey: "articles_generated",
      value: articlesGenerated,
      unit: "count",
      measuredAt: new Date(),
    });
  }
  
  return {
    kpis,
    summary: `Content Score: ${contentScore}/100`,
  };
}

function normalizeAtlasOutput(crewId: string, siteId: string, response: any): KpiNormalizerResult {
  const kpis: Omit<InsertCrewKpi, "runId">[] = [];
  const workerKpis = response?.kpis || {};
  const aiSummary = response?.ai_summary || {};
  
  const aiCoverageScore = workerKpis.ai_coverage_score 
    ?? aiSummary.coverage_score 
    ?? workerKpis.coverage_score 
    ?? 50;
  
  kpis.push({
    siteId,
    crewId,
    metricKey: "ai.coverage_score",
    value: Math.max(0, Math.min(100, aiCoverageScore)),
    unit: "percent",
    measuredAt: new Date(),
  });
  
  const llmVisibility = workerKpis.llm_visibility ?? aiSummary.llm_visibility ?? null;
  if (llmVisibility !== null) {
    kpis.push({
      siteId,
      crewId,
      metricKey: "ai.llm_visibility",
      value: llmVisibility,
      unit: "score",
      measuredAt: new Date(),
    });
  }
  
  return {
    kpis,
    summary: `AI Coverage: ${aiCoverageScore}%`,
  };
}

function normalizeSocratesOutput(crewId: string, siteId: string, response: any): KpiNormalizerResult {
  const kpis: Omit<InsertCrewKpi, "runId">[] = [];
  const workerKpis = response?.kpis || {};
  const kbSummary = response?.kb_summary || {};
  
  const insightsWritten = workerKpis.insights_written 
    ?? kbSummary.insights_generated 
    ?? workerKpis.insights_generated 
    ?? 0;
  
  kpis.push({
    siteId,
    crewId,
    metricKey: "kb.insights_written",
    value: insightsWritten,
    unit: "count",
    measuredAt: new Date(),
  });
  
  const guidanceUsed = workerKpis.guidance_used ?? kbSummary.guidance_used ?? null;
  if (guidanceUsed !== null) {
    kpis.push({
      siteId,
      crewId,
      metricKey: "kb.guidance_used",
      value: guidanceUsed,
      unit: "count",
      measuredAt: new Date(),
    });
  }
  
  return {
    kpis,
    summary: `${insightsWritten} insights generated`,
  };
}

function normalizeLookoutOutput(crewId: string, siteId: string, response: any): KpiNormalizerResult {
  const kpis: Omit<InsertCrewKpi, "runId">[] = [];
  const workerKpis = response?.kpis || {};
  const serpSummary = response?.serp_summary || {};
  
  const keywordsTop10 = workerKpis.keywords_top10 
    ?? serpSummary.keywords_top10 
    ?? workerKpis.keywords_up 
    ?? 0;
  
  kpis.push({
    siteId,
    crewId,
    metricKey: "serp.keywords_top10",
    value: keywordsTop10,
    unit: "count",
    measuredAt: new Date(),
  });
  
  const keywordsTracked = workerKpis.keywords_tracked ?? serpSummary.keywords_tracked ?? null;
  if (keywordsTracked !== null) {
    kpis.push({
      siteId,
      crewId,
      metricKey: "serp.keywords_tracked",
      value: keywordsTracked,
      unit: "count",
      measuredAt: new Date(),
    });
  }
  
  const avgPosition = workerKpis.avg_position ?? serpSummary.avg_position ?? null;
  if (avgPosition !== null) {
    kpis.push({
      siteId,
      crewId,
      metricKey: "serp.avg_position",
      value: avgPosition,
      unit: "position",
      measuredAt: new Date(),
    });
  }
  
  return {
    kpis,
    summary: `${keywordsTop10} keywords in top 10`,
  };
}

function normalizeBeaconOutput(crewId: string, siteId: string, response: any): KpiNormalizerResult {
  const kpis: Omit<InsertCrewKpi, "runId">[] = [];
  const workerKpis = response?.kpis || {};
  const linksSummary = response?.links_summary || {};
  
  const domainAuthority = workerKpis.domain_authority 
    ?? linksSummary.domain_authority 
    ?? workerKpis.da 
    ?? 0;
  
  kpis.push({
    siteId,
    crewId,
    metricKey: "links.domain_authority",
    value: Math.max(0, Math.min(100, domainAuthority)),
    unit: "score",
    measuredAt: new Date(),
  });
  
  const totalLinks = workerKpis.total_links ?? linksSummary.total ?? null;
  if (totalLinks !== null) {
    kpis.push({
      siteId,
      crewId,
      metricKey: "links.total",
      value: totalLinks,
      unit: "count",
      measuredAt: new Date(),
    });
  }
  
  const newLinks = workerKpis.new_links ?? linksSummary.new_30d ?? null;
  if (newLinks !== null) {
    kpis.push({
      siteId,
      crewId,
      metricKey: "links.new",
      value: newLinks,
      unit: "count",
      measuredAt: new Date(),
    });
  }
  
  return {
    kpis,
    summary: `Domain Authority: ${domainAuthority}`,
  };
}

function normalizeNatashaOutput(crewId: string, siteId: string, response: any): KpiNormalizerResult {
  const kpis: Omit<InsertCrewKpi, "runId">[] = [];
  const workerKpis = response?.kpis || {};
  const competitiveSummary = response?.competitive_summary || {};
  
  const keywordGaps = workerKpis.keyword_gaps 
    ?? competitiveSummary.gaps_found 
    ?? workerKpis.gaps 
    ?? 0;
  
  kpis.push({
    siteId,
    crewId,
    metricKey: "competitive.gaps",
    value: keywordGaps,
    unit: "count",
    measuredAt: new Date(),
  });
  
  const opportunities = workerKpis.opportunities ?? competitiveSummary.opportunities ?? null;
  if (opportunities !== null) {
    kpis.push({
      siteId,
      crewId,
      metricKey: "competitive.opportunities",
      value: opportunities,
      unit: "count",
      measuredAt: new Date(),
    });
  }
  
  return {
    kpis,
    summary: `${keywordGaps} keyword gaps found`,
  };
}

function normalizeDraperOutput(crewId: string, siteId: string, response: any): KpiNormalizerResult {
  const kpis: Omit<InsertCrewKpi, "runId">[] = [];
  const workerKpis = response?.kpis || {};
  const adsSummary = response?.ads_summary || {};
  
  const conversions = workerKpis.conversions 
    ?? adsSummary.conversions 
    ?? 0;
  
  kpis.push({
    siteId,
    crewId,
    metricKey: "ads.conversions",
    value: conversions,
    unit: "count",
    measuredAt: new Date(),
  });
  
  const spend = workerKpis.spend ?? adsSummary.spend ?? null;
  if (spend !== null) {
    kpis.push({
      siteId,
      crewId,
      metricKey: "ads.spend",
      value: spend,
      unit: "currency",
      measuredAt: new Date(),
    });
  }
  
  const clicks = workerKpis.clicks ?? adsSummary.clicks ?? null;
  if (clicks !== null) {
    kpis.push({
      siteId,
      crewId,
      metricKey: "ads.clicks",
      value: clicks,
      unit: "count",
      measuredAt: new Date(),
    });
  }
  
  const cpc = workerKpis.cpc ?? adsSummary.cpc ?? null;
  if (cpc !== null) {
    kpis.push({
      siteId,
      crewId,
      metricKey: "ads.cpc",
      value: cpc,
      unit: "currency",
      measuredAt: new Date(),
    });
  }
  
  return {
    kpis,
    summary: `${conversions} conversions`,
  };
}

function normalizeMajorTomOutput(crewId: string, siteId: string, response: any): KpiNormalizerResult {
  const kpis: Omit<InsertCrewKpi, "runId">[] = [];
  const workerKpis = response?.kpis || {};
  const orchestrationSummary = response?.orchestration_summary || {};
  
  const orchestrationHealth = workerKpis.orchestration_health 
    ?? orchestrationSummary.health_score 
    ?? 100;
  
  kpis.push({
    siteId,
    crewId,
    metricKey: "orchestration_health",
    value: Math.max(0, Math.min(100, orchestrationHealth)),
    unit: "score",
    measuredAt: new Date(),
  });
  
  return {
    kpis,
    summary: `Orchestration Health: ${orchestrationHealth}/100`,
  };
}

const NORMALIZERS: Record<string, KpiNormalizer> = {
  scotty: normalizeScottyOutput,
  speedster: normalizeSpeedsterOutput,
  popular: normalizePopularOutput,
  sentinel: normalizeSentinelOutput,
  hemingway: normalizeHemingwayOutput,
  atlas: normalizeAtlasOutput,
  socrates: normalizeSocratesOutput,
  lookout: normalizeLookoutOutput,
  beacon: normalizeBeaconOutput,
  natasha: normalizeNatashaOutput,
  draper: normalizeDraperOutput,
  major_tom: normalizeMajorTomOutput,
};

function genericNormalizer(crewId: string, siteId: string, response: any): KpiNormalizerResult {
  const kpis: Omit<InsertCrewKpi, "runId">[] = [];
  const workerKpis = response?.kpis || {};
  
  for (const [key, value] of Object.entries(workerKpis)) {
    if (typeof value === 'number') {
      kpis.push({
        siteId,
        crewId,
        metricKey: key,
        value,
        unit: "count",
        measuredAt: new Date(),
      });
    }
  }
  
  return {
    kpis,
    summary: `Extracted ${kpis.length} KPIs`,
  };
}

export function normalizeWorkerOutputToKpis(
  crewId: string,
  siteId: string,
  workerResponse: any
): KpiNormalizerResult {
  const normalizer = NORMALIZERS[crewId] || genericNormalizer;
  return normalizer(crewId, siteId, workerResponse);
}
