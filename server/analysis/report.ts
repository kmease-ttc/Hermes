import type { AnalysisResult } from './engine';
import type { GeneratedHypothesis } from './hypotheses';
import type { GeneratedTicket } from './tickets';

export interface ReportData {
  runId: string;
  date: string;
  classification: string;
  confidence: string;
  analysis: AnalysisResult;
  hypotheses: GeneratedHypothesis[];
  tickets: GeneratedTicket[];
}

export function generateMarkdownReport(data: ReportData): string {
  const { runId, date, classification, confidence, analysis, hypotheses, tickets } = data;
  
  const sections: string[] = [];
  
  sections.push(`# Traffic Doctor Report`);
  sections.push(`**Date:** ${date}`);
  sections.push(`**Run ID:** ${runId}`);
  sections.push('');
  
  sections.push('## 1. Executive Summary');
  sections.push('');
  sections.push(`**Primary Classification:** ${formatClassification(classification)}`);
  sections.push(`**Confidence:** ${confidence.charAt(0).toUpperCase() + confidence.slice(1)}`);
  sections.push('');
  
  if (analysis.anomalyFlags.impressionsDropFlag || analysis.anomalyFlags.clicksDropFlag) {
    sections.push('**Incident Status:** Traffic drop detected');
  } else if (analysis.anomalyFlags.sessionsDropFlag) {
    sections.push('**Incident Status:** GA4 tracking issue suspected');
  } else {
    sections.push('**Incident Status:** No significant issues detected');
  }
  sections.push('');
  
  if (analysis.clusterLosses.length > 0) {
    sections.push('**Top 3 Affected Areas:**');
    for (const cluster of analysis.clusterLosses.slice(0, 3)) {
      sections.push(`- ${cluster.cluster}: -${cluster.clickLoss} clicks (${(cluster.lossShare * 100).toFixed(0)}% of loss)`);
    }
  }
  sections.push('');
  
  sections.push('## 2. What Changed');
  sections.push('');
  sections.push('### GA4 Organic Traffic');
  sections.push(`- Sessions: ${formatDelta(analysis.deltas.ga4.sessionsDelta)}%`);
  sections.push(`- Users: ${formatDelta(analysis.deltas.ga4.usersDelta)}%`);
  sections.push('');
  sections.push('### Search Console Performance');
  sections.push(`- Clicks: ${formatDelta(analysis.deltas.gsc.clicksDelta)}%`);
  sections.push(`- Impressions: ${formatDelta(analysis.deltas.gsc.impressionsDelta)}%`);
  sections.push(`- CTR: ${formatDelta(analysis.deltas.gsc.ctrDelta)}%`);
  sections.push(`- Avg Position: ${formatDelta(analysis.deltas.gsc.positionDelta)}%`);
  sections.push('');
  
  if (analysis.topLosingPages && analysis.topLosingPages.length > 0) {
    sections.push('### Top Losing Pages');
    for (const page of analysis.topLosingPages.slice(0, 5)) {
      sections.push(`- ${page.page}: -${page.clickLoss} clicks (${page.cluster})`);
    }
    sections.push('');
  }
  
  if (analysis.topLosingQueries && analysis.topLosingQueries.length > 0) {
    sections.push('### Top Losing Queries');
    for (const query of analysis.topLosingQueries.slice(0, 5)) {
      sections.push(`- "${query.query}": -${query.clickLoss} clicks`);
    }
    sections.push('');
  }
  
  sections.push('## 3. Root Cause Hypotheses');
  sections.push('');
  if (hypotheses.length === 0) {
    sections.push('No significant issues detected.');
  } else {
    for (const h of hypotheses.slice(0, 5)) {
      sections.push(`### ${h.rank}. ${formatHypothesisKey(h.hypothesisKey)} (${h.confidence} confidence)`);
      sections.push('');
      sections.push(h.summary);
      sections.push('');
      sections.push('**Evidence:**');
      for (const e of h.evidence) {
        sections.push(`- [${e.strength}] ${e.statement}`);
      }
      if (h.disconfirmedBy && h.disconfirmedBy.length > 0) {
        sections.push('');
        sections.push('**Counter-evidence:**');
        for (const e of h.disconfirmedBy) {
          sections.push(`- ${e.statement}`);
        }
      }
      sections.push('');
    }
  }
  
  sections.push('## 4. Recommended Actions');
  sections.push('');
  if (tickets.length === 0) {
    sections.push('No tickets generated - traffic appears healthy.');
  } else {
    for (const t of tickets.slice(0, 5)) {
      sections.push(`### ${t.ticketId}: ${t.title}`);
      sections.push(`**Priority:** ${t.priority} | **Owner:** ${t.owner} | **Impact:** ${t.expectedImpact}`);
      sections.push('');
      if (t.impactEstimate.recoverableClicksEst) {
        sections.push(`Estimated recoverable clicks: ~${t.impactEstimate.recoverableClicksEst}`);
        sections.push('');
      }
      sections.push('**Steps:**');
      for (let i = 0; i < t.steps.length; i++) {
        sections.push(`${i + 1}. ${t.steps[i]}`);
      }
      sections.push('');
    }
  }
  
  const allMissingData = hypotheses.flatMap(h => h.missingData || []);
  const uniqueMissing = [...new Set(allMissingData)];
  
  sections.push('## 5. Missing Data / Next Checks');
  sections.push('');
  if (uniqueMissing.length === 0) {
    sections.push('No additional data needed at this time.');
  } else {
    sections.push('To increase confidence in the analysis:');
    for (const item of uniqueMissing.slice(0, 10)) {
      sections.push(`- ${item}`);
    }
  }
  sections.push('');
  
  sections.push('---');
  sections.push(`*Generated by Traffic Doctor at ${new Date().toISOString()}*`);
  
  return sections.join('\n');
}

function formatClassification(key: string): string {
  const map: Record<string, string> = {
    VISIBILITY_LOSS: 'Visibility Loss (Impressions Down)',
    CTR_LOSS: 'CTR Loss (Clicks Down, Impressions Stable)',
    PAGE_CLUSTER_REGRESSION: 'Page Cluster Regression',
    TRACKING_OR_ATTRIBUTION_GAP: 'Tracking/Attribution Gap',
    INCONCLUSIVE: 'Inconclusive',
  };
  return map[key] || key;
}

function formatHypothesisKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatDelta(delta: number): string {
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(1)}`;
}

export function generateSummary(analysis: AnalysisResult, hypotheses: GeneratedHypothesis[]): string {
  const issues: string[] = [];
  
  if (analysis.anomalyFlags.impressionsDropFlag) {
    issues.push(`impressions down ${Math.abs(analysis.deltas.gsc.impressionsDelta).toFixed(0)}%`);
  }
  if (analysis.anomalyFlags.clicksDropFlag) {
    issues.push(`clicks down ${Math.abs(analysis.deltas.gsc.clicksDelta).toFixed(0)}%`);
  }
  if (analysis.anomalyFlags.sessionsDropFlag) {
    issues.push(`GA4 sessions down ${Math.abs(analysis.deltas.ga4.sessionsDelta).toFixed(0)}%`);
  }
  
  if (issues.length === 0) {
    return 'No significant traffic anomalies detected.';
  }
  
  const topHypothesis = hypotheses[0];
  const causeText = topHypothesis 
    ? ` Top hypothesis: ${formatHypothesisKey(topHypothesis.hypothesisKey)} (${topHypothesis.confidence} confidence).`
    : '';
  
  return `Detected: ${issues.join(', ')}.${causeText}`;
}
