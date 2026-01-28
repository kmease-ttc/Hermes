import type { InsertCrewKpi } from "@shared/schema";

export interface KpiNormalizerResult {
  kpis: Omit<InsertCrewKpi, "runId">[];
  summary: string;
}

type KpiNormalizer = (crewId: string, siteId: string, workerResponse: any) => KpiNormalizerResult;

function normalizeScottyOutput(crewId: string, siteId: string, response: any): KpiNormalizerResult {
  const kpis: Omit<InsertCrewKpi, "runId">[] = [];
  
  let crawlHealthPct = 100;
  
  const crawlSummary = response?.crawl_summary || {};
  const indexability = response?.indexability || {};
  const issues = response?.issues || [];
  const kpisFromWorker = response?.kpis || {};
  
  const criticalCount = issues.filter((i: any) => i.severity === 'critical').length;
  const highCount = issues.filter((i: any) => i.severity === 'high').length;
  const mediumCount = issues.filter((i: any) => i.severity === 'medium').length;
  
  crawlHealthPct -= criticalCount * 15;
  crawlHealthPct -= highCount * 5;
  crawlHealthPct -= mediumCount * 2;
  
  if (criticalCount > 0) {
    crawlHealthPct = Math.min(crawlHealthPct, 70);
  }
  
  crawlHealthPct = Math.max(0, Math.min(100, crawlHealthPct));
  
  // Primary KPI: crawlHealthPct
  kpis.push({
    siteId,
    crewId,
    metricKey: "crawlHealthPct",
    value: crawlHealthPct,
    unit: "%",
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
    summary: `Crawl Health: ${crawlHealthPct}% (${criticalCount} critical, ${highCount} high issues)`,
  };
}

function normalizeSpeedsterOutput(crewId: string, siteId: string, response: any): KpiNormalizerResult {
  const kpis: Omit<InsertCrewKpi, "runId">[] = [];
  const vitalsSummary = response?.vitals_summary || {};
  const workerKpis = response?.kpis || {};
  const now = new Date();

  const performanceScore = workerKpis.performance_score ?? vitalsSummary.performance_score ?? null;
  if (performanceScore !== null) {
    // Primary KPI: performanceScore
    kpis.push({ siteId, crewId, metricKey: "performanceScore", value: performanceScore, unit: "score", measuredAt: now });
    // Also store under canonical key
    kpis.push({ siteId, crewId, metricKey: "vitals.performance_score", value: performanceScore, unit: "score", measuredAt: now });
  }

  // Core Web Vitals (the 3 Google ranking signals)
  const lcp = workerKpis.lcp ?? vitalsSummary.lcp ?? null;
  if (lcp !== null) {
    kpis.push({ siteId, crewId, metricKey: "vitals.lcp", value: lcp, unit: "seconds", measuredAt: now });
  }

  const cls = workerKpis.cls ?? vitalsSummary.cls ?? null;
  if (cls !== null) {
    kpis.push({ siteId, crewId, metricKey: "vitals.cls", value: cls, unit: "score", measuredAt: now });
  }

  const inp = workerKpis.inp ?? vitalsSummary.inp ?? null;
  if (inp !== null) {
    kpis.push({ siteId, crewId, metricKey: "vitals.inp", value: inp, unit: "milliseconds", measuredAt: now });
  }

  // Additional performance metrics
  const fcp = workerKpis.fcp ?? workerKpis.fcp_ms ?? vitalsSummary.fcp ?? null;
  if (fcp !== null) {
    kpis.push({ siteId, crewId, metricKey: "vitals.fcp", value: fcp, unit: "seconds", measuredAt: now });
  }

  const ttfb = workerKpis.ttfb ?? workerKpis.ttfb_ms ?? vitalsSummary.ttfb ?? null;
  if (ttfb !== null) {
    kpis.push({ siteId, crewId, metricKey: "vitals.ttfb", value: ttfb, unit: "milliseconds", measuredAt: now });
  }

  const tbt = workerKpis.tbt ?? workerKpis.tbt_ms ?? vitalsSummary.tbt ?? null;
  if (tbt !== null) {
    kpis.push({ siteId, crewId, metricKey: "vitals.tbt", value: tbt, unit: "milliseconds", measuredAt: now });
  }

  const speedIndex = workerKpis.speed_index ?? workerKpis.speed_index_ms ?? vitalsSummary.speed_index ?? null;
  if (speedIndex !== null) {
    kpis.push({ siteId, crewId, metricKey: "vitals.speed_index", value: speedIndex, unit: "milliseconds", measuredAt: now });
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
    // Primary KPI: monthlySessions
    kpis.push({
      siteId,
      crewId,
      metricKey: "monthlySessions",
      value: sessions,
      unit: "count",
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
  
  // Primary KPI: pagesLosingTraffic
  kpis.push({
    siteId,
    crewId,
    metricKey: "pagesLosingTraffic",
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
  
  const contentQualityScore = workerKpis.content_score 
    ?? contentSummary.quality_score 
    ?? workerKpis.quality_score 
    ?? 85;
  
  // Primary KPI: contentQualityScore
  kpis.push({
    siteId,
    crewId,
    metricKey: "contentQualityScore",
    value: Math.max(0, Math.min(100, contentQualityScore)),
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
    summary: `Content Quality: ${contentQualityScore}/100`,
  };
}

function normalizeAtlasOutput(crewId: string, siteId: string, response: any): KpiNormalizerResult {
  const kpis: Omit<InsertCrewKpi, "runId">[] = [];
  const workerKpis = response?.kpis || {};
  const aiSummary = response?.ai_summary || {};
  
  const aiOptimizationScore = workerKpis.ai_coverage_score 
    ?? aiSummary.coverage_score 
    ?? workerKpis.coverage_score 
    ?? 50;
  
  // Primary KPI: aiOptimizationScore
  kpis.push({
    siteId,
    crewId,
    metricKey: "aiOptimizationScore",
    value: Math.max(0, Math.min(100, aiOptimizationScore)),
    unit: "score",
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
    summary: `AI Optimization: ${aiOptimizationScore}%`,
  };
}

function normalizeSocratesOutput(crewId: string, siteId: string, response: any): KpiNormalizerResult {
  const kpis: Omit<InsertCrewKpi, "runId">[] = [];
  const workerKpis = response?.kpis || {};
  const kbSummary = response?.kb_summary || {};
  
  // Primary KPI: totalLearnings (per spec - this is what shows on Socrates page)
  const totalLearnings = workerKpis.total_learnings 
    ?? kbSummary.total_learnings 
    ?? response?.total_learnings
    ?? workerKpis.insights_generated
    ?? kbSummary.insights_generated
    ?? 0;
  
  kpis.push({
    siteId,
    crewId,
    metricKey: "totalLearnings",
    value: totalLearnings,
    unit: "count",
    measuredAt: new Date(),
  });
  
  // Secondary KPI: insightsGenerated
  const insightsGenerated = workerKpis.insights_written 
    ?? kbSummary.insights_generated 
    ?? workerKpis.insights_generated 
    ?? 0;
  
  if (insightsGenerated > 0) {
    kpis.push({
      siteId,
      crewId,
      metricKey: "insightsGenerated",
      value: insightsGenerated,
      unit: "count",
      measuredAt: new Date(),
    });
  }
  
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
    summary: `${totalLearnings} learnings collected`,
  };
}

function normalizeLookoutOutput(crewId: string, siteId: string, response: any): KpiNormalizerResult {
  const kpis: Omit<InsertCrewKpi, "runId">[] = [];
  const workerKpis = response?.kpis || {};
  const serpSummary = response?.serp_summary || {};
  
  // Primary KPI: keywordsTracked
  const keywordsTracked = workerKpis.keywords_tracked 
    ?? serpSummary.keywords_tracked 
    ?? workerKpis.keywords_total
    ?? 0;
  
  kpis.push({
    siteId,
    crewId,
    metricKey: "keywordsTracked",
    value: keywordsTracked,
    unit: "count",
    measuredAt: new Date(),
  });
  
  const keywordsTop10 = workerKpis.keywords_top10 ?? serpSummary.keywords_top10 ?? null;
  if (keywordsTop10 !== null) {
    kpis.push({
      siteId,
      crewId,
      metricKey: "serp.keywords_top10",
      value: keywordsTop10,
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
    summary: `${keywordsTracked} keywords tracked`,
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
  
  // Primary KPI: domainAuthority
  kpis.push({
    siteId,
    crewId,
    metricKey: "domainAuthority",
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
  
  // Primary KPI: competitorsTracked
  const competitorsTracked = workerKpis.competitors_tracked 
    ?? competitiveSummary.competitors_tracked 
    ?? workerKpis.competitors
    ?? 0;
  
  kpis.push({
    siteId,
    crewId,
    metricKey: "competitorsTracked",
    value: competitorsTracked,
    unit: "count",
    measuredAt: new Date(),
  });
  
  // Secondary: keyword gaps
  const keywordGaps = workerKpis.keyword_gaps ?? competitiveSummary.gaps_found ?? null;
  if (keywordGaps !== null) {
    kpis.push({
      siteId,
      crewId,
      metricKey: "competitive.gaps",
      value: keywordGaps,
      unit: "count",
      measuredAt: new Date(),
    });
  }
  
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
    summary: `${competitorsTracked} competitors tracked`,
  };
}

function normalizeDraperOutput(crewId: string, siteId: string, response: any): KpiNormalizerResult {
  const kpis: Omit<InsertCrewKpi, "runId">[] = [];
  const workerKpis = response?.kpis || {};
  const adsSummary = response?.ads_summary || {};
  
  // Primary KPI: clicks (per spec requirement)
  const clicks = workerKpis.clicks 
    ?? adsSummary.clicks 
    ?? 0;
  
  kpis.push({
    siteId,
    crewId,
    metricKey: "clicks",
    value: clicks,
    unit: "count",
    measuredAt: new Date(),
  });
  
  // Secondary KPIs
  const conversions = workerKpis.conversions ?? adsSummary.conversions ?? null;
  if (conversions !== null) {
    kpis.push({
      siteId,
      crewId,
      metricKey: "ads.conversions",
      value: conversions,
      unit: "count",
      measuredAt: new Date(),
    });
  }
  
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
    summary: `${clicks.toLocaleString()} clicks`,
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
