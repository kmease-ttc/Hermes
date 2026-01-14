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

const NORMALIZERS: Record<string, KpiNormalizer> = {
  scotty: normalizeScottyOutput,
  speedster: normalizeSpeedsterOutput,
  popular: normalizePopularOutput,
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
