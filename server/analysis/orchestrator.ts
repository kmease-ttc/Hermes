import { storage } from "../storage";
import { logger } from "../utils/logger";
import { ga4Connector } from "../connectors/ga4";
import { gscConnector } from "../connectors/gsc";
import { websiteChecker } from "../connectors/website";
import { runAnalysis, type AnalysisResult } from "./engine";
import { generateHypotheses, type GeneratedHypothesis } from "./hypotheses";
import { generateTicketsFromHypotheses, type GeneratedTicket } from "./tickets";
import { generateMarkdownReport, generateSummary, type ReportData } from "./report";
import { getPageCluster } from "../config/analysis";
import type { InsertAnomaly, InsertHypothesis, InsertTicket, InsertReport } from "@shared/schema";

interface OrchestratorResult {
  runId: string;
  analysis: AnalysisResult;
  hypotheses: GeneratedHypothesis[];
  tickets: GeneratedTicket[];
  reportId: number;
  summary: string;
}

export async function runFullDiagnostic(runId: string, days: number = 30): Promise<OrchestratorResult> {
  logger.info('Orchestrator', `Starting full diagnostic run ${runId} for ${days} days`);
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  const startDateStr = formatDate(startDate);
  const endDateStr = formatDate(endDate);
  
  const [ga4Data, gscData] = await Promise.all([
    storage.getGA4DataByDateRange(startDateStr, endDateStr),
    storage.getGSCDataByDateRange(startDateStr, endDateStr),
  ]);
  
  logger.info('Orchestrator', `Loaded ${ga4Data.length} GA4 records, ${gscData.length} GSC records`);
  
  const ga4Aggregated = aggregateGA4ByDate(ga4Data);
  const gscAggregated = aggregateGSCByDate(gscData);
  
  const gscPageData = gscData
    .filter(d => d.page)
    .map(d => ({
      date: d.date,
      pagePath: extractPath(d.page || ''),
      clicks: d.clicks,
      impressions: d.impressions,
      ctr: d.ctr,
      position: d.position,
    }));
  
  const gscQueryData = gscData
    .filter(d => d.query)
    .map(d => ({
      date: d.date,
      query: d.query || '',
      clicks: d.clicks,
      impressions: d.impressions,
    }));
  
  logger.info('Orchestrator', 'Running analysis engine');
  const analysis = runAnalysis(ga4Aggregated, gscAggregated, gscPageData, gscQueryData);
  
  const webChecks = await storage.getWebChecksByDate(endDateStr);
  const webCheckResults = webChecks.map(c => ({
    url: c.url,
    statusCode: c.statusCode,
    hasRobotsBlock: c.metaRobots?.includes('nofollow'),
    hasNoindex: c.metaRobots?.includes('noindex'),
    canonicalMismatch: c.canonical ? !c.canonical.includes(c.url.split('?')[0]) : false,
    redirectChain: c.redirectUrl ? [c.url, c.redirectUrl] : undefined,
    bodyTextLength: (c.rawData as any)?.bodyLength,
    hasStructuredData: (c.rawData as any)?.hasStructuredData,
  }));
  
  logger.info('Orchestrator', 'Generating hypotheses');
  const hypotheses = generateHypotheses(analysis, webCheckResults);
  
  logger.info('Orchestrator', 'Generating tickets');
  const tickets = generateTicketsFromHypotheses(runId, hypotheses, analysis);
  
  const anomaliesToSave: InsertAnomaly[] = [];
  
  if (analysis.anomalyFlags.impressionsDropFlag) {
    anomaliesToSave.push({
      runId,
      anomalyType: 'impressions_drop',
      startDate: endDateStr,
      metric: 'impressions',
      baselineValue: 100,
      observedValue: 100 + analysis.deltas.gsc.impressionsDelta,
      deltaPct: analysis.deltas.gsc.impressionsDelta,
      scope: { channel: 'Organic Search' },
    });
  }
  
  if (analysis.anomalyFlags.clicksDropFlag) {
    anomaliesToSave.push({
      runId,
      anomalyType: 'traffic_drop',
      startDate: endDateStr,
      metric: 'clicks',
      baselineValue: 100,
      observedValue: 100 + analysis.deltas.gsc.clicksDelta,
      deltaPct: analysis.deltas.gsc.clicksDelta,
      scope: { channel: 'Organic Search' },
    });
  }
  
  if (analysis.anomalyFlags.sessionsDropFlag) {
    anomaliesToSave.push({
      runId,
      anomalyType: 'traffic_drop',
      startDate: endDateStr,
      metric: 'sessions',
      baselineValue: 100,
      observedValue: 100 + analysis.deltas.ga4.sessionsDelta,
      deltaPct: analysis.deltas.ga4.sessionsDelta,
      scope: { source: 'GA4' },
    });
  }
  
  if (analysis.clusterLosses.length > 0 && analysis.clusterLosses[0].lossShare >= 0.6) {
    anomaliesToSave.push({
      runId,
      anomalyType: 'page_cluster_drop',
      startDate: endDateStr,
      metric: 'clicks',
      baselineValue: analysis.clusterLosses[0].baselineClicks,
      observedValue: analysis.clusterLosses[0].currentClicks,
      deltaPct: -analysis.clusterLosses[0].lossShare * 100,
      scope: { page_cluster: analysis.clusterLosses[0].cluster },
    });
  }
  
  if (anomaliesToSave.length > 0) {
    await storage.saveAnomalies(anomaliesToSave);
  }
  
  const hypothesesToSave: InsertHypothesis[] = hypotheses.map(h => ({
    runId,
    rank: h.rank,
    hypothesisKey: h.hypothesisKey,
    confidence: h.confidence,
    summary: h.summary,
    evidence: h.evidence,
    disconfirmedBy: h.disconfirmedBy.length > 0 ? h.disconfirmedBy : null,
    missingData: h.missingData.length > 0 ? h.missingData : null,
  }));
  
  if (hypothesesToSave.length > 0) {
    await storage.saveHypotheses(hypothesesToSave);
  }
  
  const summary = generateSummary(analysis, hypotheses);
  
  const reportData: ReportData = {
    runId,
    date: endDateStr,
    classification: analysis.classification,
    confidence: analysis.confidenceOverall,
    analysis,
    hypotheses,
    tickets,
  };
  
  const markdownReport = generateMarkdownReport(reportData);
  
  const report: InsertReport = {
    date: endDateStr,
    reportType: 'daily',
    summary,
    dropDates: anomaliesToSave.map(a => ({
      date: a.startDate,
      metric: a.metric,
      drop: a.deltaPct,
      source: a.scope?.source || 'GSC',
    })),
    rootCauses: hypotheses.map(h => ({
      hypothesis: h.summary,
      confidence: h.confidence,
      key: h.hypothesisKey,
    })),
    markdownReport,
  };
  
  const savedReport = await storage.saveReport(report);
  
  const ticketsToSave: InsertTicket[] = tickets.map(t => ({
    ticketId: t.ticketId,
    runId: t.runId,
    title: t.title,
    owner: t.owner,
    priority: t.priority,
    status: 'open',
    steps: t.steps,
    expectedImpact: t.expectedImpact,
    impactEstimate: t.impactEstimate,
    evidence: t.evidence,
    hypothesisKey: t.hypothesisKey,
    reportId: savedReport.id,
  }));
  
  if (ticketsToSave.length > 0) {
    await storage.saveTickets(ticketsToSave);
  }
  
  await storage.updateRun(runId, {
    status: 'completed',
    finishedAt: new Date(),
    summary,
    anomaliesDetected: anomaliesToSave.length,
    reportId: savedReport.id,
    ticketCount: tickets.length,
    primaryClassification: analysis.classification,
    confidenceOverall: analysis.confidenceOverall,
    deltas: analysis.deltas,
  });
  
  logger.info('Orchestrator', `Diagnostic complete: ${analysis.classification} (${analysis.confidenceOverall}), ${hypotheses.length} hypotheses, ${tickets.length} tickets`);
  
  return {
    runId,
    analysis,
    hypotheses,
    tickets,
    reportId: savedReport.id,
    summary,
  };
}

function aggregateGA4ByDate(data: Array<{ date: string; sessions: number; users: number }>): Array<{ date: string; sessions: number; users: number }> {
  const byDate = new Map<string, { sessions: number; users: number }>();
  
  for (const d of data) {
    const existing = byDate.get(d.date) || { sessions: 0, users: 0 };
    existing.sessions += d.sessions;
    existing.users += d.users;
    byDate.set(d.date, existing);
  }
  
  return Array.from(byDate.entries()).map(([date, vals]) => ({
    date,
    sessions: vals.sessions,
    users: vals.users,
  }));
}

function aggregateGSCByDate(data: Array<{ date: string; clicks: number; impressions: number; ctr: number; position: number }>): Array<{ date: string; clicks: number; impressions: number; ctr: number; position: number }> {
  const byDate = new Map<string, { clicks: number; impressions: number; ctrSum: number; posSum: number; count: number }>();
  
  for (const d of data) {
    const existing = byDate.get(d.date) || { clicks: 0, impressions: 0, ctrSum: 0, posSum: 0, count: 0 };
    existing.clicks += d.clicks;
    existing.impressions += d.impressions;
    existing.ctrSum += d.ctr;
    existing.posSum += d.position;
    existing.count += 1;
    byDate.set(d.date, existing);
  }
  
  return Array.from(byDate.entries()).map(([date, vals]) => ({
    date,
    clicks: vals.clicks,
    impressions: vals.impressions,
    ctr: vals.count > 0 ? vals.ctrSum / vals.count : 0,
    position: vals.count > 0 ? vals.posSum / vals.count : 0,
  }));
}

function extractPath(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname;
  } catch {
    return url.startsWith('/') ? url : `/${url}`;
  }
}
