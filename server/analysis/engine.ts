import { 
  analysisConfig, 
  type ClassificationKey, 
  type Deltas, 
  type ClusterLoss, 
  type EvidenceBlock,
  type HypothesisKey,
  type Confidence,
  type Priority,
  getPageCluster 
} from '../config/analysis';
import { logger } from '../utils/logger';

interface MetricWindow {
  current: number;
  baseline: number;
  delta: number;
  deltaPct: number;
  zScore: number;
}

interface GSCPageData {
  date: string;
  pagePath: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GA4LandingData {
  date: string;
  landingPath: string;
  sessions: number;
  users: number;
}

export interface AnalysisResult {
  deltas: Deltas;
  classification: ClassificationKey;
  confidenceOverall: Confidence;
  clusterLosses: ClusterLoss[];
  topLosingPages: Array<{ page: string; clickLoss: number; cluster: string }>;
  topLosingQueries: Array<{ query: string; clickLoss: number }>;
  anomalyFlags: {
    impressionsDropFlag: boolean;
    clicksDropFlag: boolean;
    ctrDropFlag: boolean;
    sessionsDropFlag: boolean;
    trackingGapFlag: boolean;
  };
}

function computeZScore(values: number[], current: number): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return 0;
  return (current - mean) / stdDev;
}

function computeMetricWindow(
  currentValues: number[],
  baselineValues: number[]
): MetricWindow {
  const current = currentValues.reduce((a, b) => a + b, 0);
  const baseline = baselineValues.reduce((a, b) => a + b, 0);
  const delta = current - baseline;
  const deltaPct = baseline > 0 ? ((current - baseline) / baseline) * 100 : 0;
  const dailyBaseline = baseline / (baselineValues.length || 1);
  const zScore = computeZScore(baselineValues, current / (currentValues.length || 1));
  
  return { current, baseline, delta, deltaPct, zScore };
}

export function computeDeltas(
  ga4Data: Array<{ date: string; sessions: number; users: number }>,
  gscData: Array<{ date: string; clicks: number; impressions: number; ctr: number; position: number }>
): Deltas {
  const { windows, thresholds } = analysisConfig;
  
  const sortedGA4 = [...ga4Data].sort((a, b) => b.date.localeCompare(a.date));
  const sortedGSC = [...gscData].sort((a, b) => b.date.localeCompare(a.date));
  
  const ga4Current = sortedGA4.slice(0, windows.current);
  const ga4Baseline = sortedGA4.slice(windows.current, windows.current + windows.baseline);
  
  const gscCurrent = sortedGSC.slice(0, windows.current);
  const gscBaseline = sortedGSC.slice(windows.current, windows.current + windows.baseline);
  
  const ga4Sessions = computeMetricWindow(
    ga4Current.map(d => d.sessions),
    ga4Baseline.map(d => d.sessions)
  );
  const ga4Users = computeMetricWindow(
    ga4Current.map(d => d.users),
    ga4Baseline.map(d => d.users)
  );
  
  const gscClicks = computeMetricWindow(
    gscCurrent.map(d => d.clicks),
    gscBaseline.map(d => d.clicks)
  );
  const gscImpressions = computeMetricWindow(
    gscCurrent.map(d => d.impressions),
    gscBaseline.map(d => d.impressions)
  );
  
  const currentCtr = gscCurrent.reduce((a, b) => a + b.ctr, 0) / (gscCurrent.length || 1);
  const baselineCtr = gscBaseline.reduce((a, b) => a + b.ctr, 0) / (gscBaseline.length || 1);
  const ctrDelta = baselineCtr > 0 ? ((currentCtr - baselineCtr) / baselineCtr) * 100 : 0;
  
  const currentPos = gscCurrent.reduce((a, b) => a + b.position, 0) / (gscCurrent.length || 1);
  const baselinePos = gscBaseline.reduce((a, b) => a + b.position, 0) / (gscBaseline.length || 1);
  const positionDelta = baselinePos > 0 ? ((currentPos - baselinePos) / baselinePos) * 100 : 0;
  
  return {
    ga4: {
      sessionsDelta: ga4Sessions.deltaPct,
      usersDelta: ga4Users.deltaPct,
      sessionsDropFlag: ga4Sessions.deltaPct <= thresholds.dropPct && ga4Sessions.zScore <= thresholds.zScore,
    },
    gsc: {
      clicksDelta: gscClicks.deltaPct,
      impressionsDelta: gscImpressions.deltaPct,
      ctrDelta,
      positionDelta,
      impressionsDropFlag: gscImpressions.deltaPct <= thresholds.dropPct && gscImpressions.zScore <= thresholds.zScore,
      clicksDropFlag: gscClicks.deltaPct <= thresholds.dropPct && gscClicks.zScore <= thresholds.zScore,
      ctrDropFlag: ctrDelta <= thresholds.dropPct,
    },
  };
}

export function classifyPrimaryIssue(deltas: Deltas, clusterLosses: ClusterLoss[]): { classification: ClassificationKey; confidence: Confidence } {
  const { thresholds } = analysisConfig;
  const { ga4, gsc } = deltas;
  
  if (ga4.sessionsDropFlag && !gsc.clicksDropFlag && !gsc.impressionsDropFlag) {
    return { classification: 'TRACKING_OR_ATTRIBUTION_GAP', confidence: 'high' };
  }
  
  if (gsc.impressionsDropFlag) {
    return { classification: 'VISIBILITY_LOSS', confidence: 'high' };
  }
  
  if (!gsc.impressionsDropFlag && gsc.clicksDropFlag && gsc.ctrDropFlag) {
    return { classification: 'CTR_LOSS', confidence: 'medium' };
  }
  
  const topCluster = clusterLosses[0];
  if (topCluster && topCluster.lossShare >= thresholds.clusterLossShare) {
    return { classification: 'PAGE_CLUSTER_REGRESSION', confidence: 'high' };
  }
  
  return { classification: 'INCONCLUSIVE', confidence: 'low' };
}

export function computeClusterLosses(
  currentPageData: GSCPageData[],
  baselinePageData: GSCPageData[]
): ClusterLoss[] {
  const currentByCluster = new Map<string, number>();
  const baselineByCluster = new Map<string, number>();
  
  for (const page of currentPageData) {
    const cluster = getPageCluster(page.pagePath);
    currentByCluster.set(cluster, (currentByCluster.get(cluster) || 0) + page.clicks);
  }
  
  for (const page of baselinePageData) {
    const cluster = getPageCluster(page.pagePath);
    baselineByCluster.set(cluster, (baselineByCluster.get(cluster) || 0) + page.clicks);
  }
  
  const allClusters = new Set([...currentByCluster.keys(), ...baselineByCluster.keys()]);
  const totalLoss = Array.from(allClusters).reduce((sum, cluster) => {
    const baseline = baselineByCluster.get(cluster) || 0;
    const current = currentByCluster.get(cluster) || 0;
    return sum + Math.max(0, baseline - current);
  }, 0);
  
  const losses: ClusterLoss[] = [];
  for (const cluster of allClusters) {
    const baselineClicks = baselineByCluster.get(cluster) || 0;
    const currentClicks = currentByCluster.get(cluster) || 0;
    const clickLoss = baselineClicks - currentClicks;
    
    if (clickLoss > 0) {
      losses.push({
        cluster,
        baselineClicks,
        currentClicks,
        clickLoss,
        lossShare: totalLoss > 0 ? clickLoss / totalLoss : 0,
      });
    }
  }
  
  return losses.sort((a, b) => b.clickLoss - a.clickLoss);
}

export function computeTopLosingPages(
  currentPageData: GSCPageData[],
  baselinePageData: GSCPageData[],
  limit = 10
): Array<{ page: string; clickLoss: number; cluster: string }> {
  const baselineByPage = new Map<string, number>();
  const currentByPage = new Map<string, number>();
  
  for (const p of baselinePageData) {
    baselineByPage.set(p.pagePath, (baselineByPage.get(p.pagePath) || 0) + p.clicks);
  }
  for (const p of currentPageData) {
    currentByPage.set(p.pagePath, (currentByPage.get(p.pagePath) || 0) + p.clicks);
  }
  
  const losses: Array<{ page: string; clickLoss: number; cluster: string }> = [];
  for (const [page, baseline] of baselineByPage) {
    const current = currentByPage.get(page) || 0;
    const loss = baseline - current;
    if (loss > 0) {
      losses.push({ page, clickLoss: loss, cluster: getPageCluster(page) });
    }
  }
  
  return losses.sort((a, b) => b.clickLoss - a.clickLoss).slice(0, limit);
}

export function computeTopLosingQueries(
  currentQueryData: Array<{ query: string; clicks: number }>,
  baselineQueryData: Array<{ query: string; clicks: number }>,
  limit = 10
): Array<{ query: string; clickLoss: number }> {
  const baselineByQuery = new Map<string, number>();
  const currentByQuery = new Map<string, number>();
  
  for (const q of baselineQueryData) {
    baselineByQuery.set(q.query, (baselineByQuery.get(q.query) || 0) + q.clicks);
  }
  for (const q of currentQueryData) {
    currentByQuery.set(q.query, (currentByQuery.get(q.query) || 0) + q.clicks);
  }
  
  const losses: Array<{ query: string; clickLoss: number }> = [];
  for (const [query, baseline] of baselineByQuery) {
    const current = currentByQuery.get(query) || 0;
    const loss = baseline - current;
    if (loss > 0) {
      losses.push({ query, clickLoss: loss });
    }
  }
  
  return losses.sort((a, b) => b.clickLoss - a.clickLoss).slice(0, limit);
}

export function runAnalysis(
  ga4Data: Array<{ date: string; sessions: number; users: number }>,
  gscDailyData: Array<{ date: string; clicks: number; impressions: number; ctr: number; position: number }>,
  gscPageData: GSCPageData[],
  gscQueryData: Array<{ date: string; query: string; clicks: number; impressions: number }>
): AnalysisResult {
  const { windows } = analysisConfig;
  
  const deltas = computeDeltas(ga4Data, gscDailyData);
  
  const sortedPages = [...gscPageData].sort((a, b) => b.date.localeCompare(a.date));
  const currentDates = [...new Set(sortedPages.map(p => p.date))].slice(0, windows.current);
  const baselineDates = [...new Set(sortedPages.map(p => p.date))].slice(windows.current, windows.current + windows.baseline);
  
  const currentPageData = sortedPages.filter(p => currentDates.includes(p.date));
  const baselinePageData = sortedPages.filter(p => baselineDates.includes(p.date));
  
  const clusterLosses = computeClusterLosses(currentPageData, baselinePageData);
  const topLosingPages = computeTopLosingPages(currentPageData, baselinePageData);
  
  const sortedQueries = gscQueryData.sort((a, b) => b.date.localeCompare(a.date));
  const currentQueryData = sortedQueries.filter(q => currentDates.includes(q.date));
  const baselineQueryData = sortedQueries.filter(q => baselineDates.includes(q.date));
  const topLosingQueries = computeTopLosingQueries(currentQueryData, baselineQueryData);
  
  const { classification, confidence } = classifyPrimaryIssue(deltas, clusterLosses);
  
  const trackingGapFlag = deltas.ga4.sessionsDropFlag && !deltas.gsc.clicksDropFlag && !deltas.gsc.impressionsDropFlag;
  
  logger.info('Analysis', 'Analysis complete', {
    classification,
    confidence,
    clusterCount: clusterLosses.length,
    topCluster: clusterLosses[0]?.cluster,
  });
  
  return {
    deltas,
    classification,
    confidenceOverall: confidence,
    clusterLosses,
    topLosingPages,
    topLosingQueries,
    anomalyFlags: {
      impressionsDropFlag: deltas.gsc.impressionsDropFlag,
      clicksDropFlag: deltas.gsc.clicksDropFlag,
      ctrDropFlag: deltas.gsc.ctrDropFlag,
      sessionsDropFlag: deltas.ga4.sessionsDropFlag,
      trackingGapFlag,
    },
  };
}
