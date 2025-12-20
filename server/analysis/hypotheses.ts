import { 
  analysisConfig, 
  type HypothesisKey, 
  type Confidence, 
  type Priority,
  type EvidenceBlock 
} from '../config/analysis';
import type { AnalysisResult } from './engine';

export interface GeneratedHypothesis {
  rank: number;
  hypothesisKey: HypothesisKey;
  confidence: Confidence;
  summary: string;
  evidence: EvidenceBlock[];
  disconfirmedBy: EvidenceBlock[];
  missingData: string[];
}

interface WebCheckResult {
  url: string;
  statusCode: number;
  hasRobotsBlock?: boolean;
  hasNoindex?: boolean;
  canonicalMismatch?: boolean;
  redirectChain?: string[];
  bodyTextLength?: number;
  hasStructuredData?: boolean;
  h1Count?: number;
  titleEmpty?: boolean;
}

export function generateHypotheses(
  analysis: AnalysisResult,
  webChecks: WebCheckResult[] = []
): GeneratedHypothesis[] {
  const hypotheses: GeneratedHypothesis[] = [];
  const { classification, deltas, clusterLosses, topLosingPages, anomalyFlags } = analysis;
  
  const robotsBlocks = webChecks.filter(c => c.hasRobotsBlock || c.hasNoindex);
  if (robotsBlocks.length > 0) {
    hypotheses.push({
      rank: 0,
      hypothesisKey: 'ROBOTS_OR_NOINDEX',
      confidence: 'high',
      summary: `${robotsBlocks.length} page(s) have robots blocking or noindex tags preventing indexing`,
      evidence: [
        {
          type: 'check',
          statement: `Found ${robotsBlocks.length} pages with robots/noindex issues`,
          data: { affectedUrls: robotsBlocks.map(c => c.url).slice(0, 5) },
          strength: 'strong',
        },
        {
          type: 'metric',
          statement: `Impressions dropped ${Math.abs(deltas.gsc.impressionsDelta).toFixed(1)}%`,
          data: { impressionsDelta: deltas.gsc.impressionsDelta },
          strength: anomalyFlags.impressionsDropFlag ? 'strong' : 'moderate',
        },
      ],
      disconfirmedBy: [],
      missingData: [],
    });
  }
  
  const canonicalIssues = webChecks.filter(c => c.canonicalMismatch);
  if (canonicalIssues.length > 0) {
    hypotheses.push({
      rank: 0,
      hypothesisKey: 'CANONICAL_MISMATCH',
      confidence: canonicalIssues.length >= 3 ? 'high' : 'medium',
      summary: `${canonicalIssues.length} page(s) have canonical tag mismatches`,
      evidence: [
        {
          type: 'check',
          statement: `Canonical mismatch detected on ${canonicalIssues.length} pages`,
          data: { affectedUrls: canonicalIssues.map(c => c.url).slice(0, 5) },
          strength: canonicalIssues.length >= 3 ? 'strong' : 'moderate',
        },
      ],
      disconfirmedBy: [],
      missingData: ['Compare with last successful crawl to confirm regression'],
    });
  }
  
  const redirectIssues = webChecks.filter(c => c.redirectChain && c.redirectChain.length > 1);
  if (redirectIssues.length > 0) {
    hypotheses.push({
      rank: 0,
      hypothesisKey: 'REDIRECT_CHAIN_OR_HTTP_CHANGE',
      confidence: 'medium',
      summary: `${redirectIssues.length} page(s) have redirect chains`,
      evidence: [
        {
          type: 'check',
          statement: `Redirect chains found on ${redirectIssues.length} pages`,
          data: { 
            affectedUrls: redirectIssues.map(c => c.url).slice(0, 5),
            chains: redirectIssues.slice(0, 3).map(c => c.redirectChain),
          },
          strength: 'moderate',
        },
      ],
      disconfirmedBy: [],
      missingData: ['Check if redirect chains are new or existed previously'],
    });
  }
  
  const thinContent = webChecks.filter(c => 
    c.bodyTextLength !== undefined && 
    c.bodyTextLength < analysisConfig.thresholds.minTextLength
  );
  if (thinContent.length > 0) {
    hypotheses.push({
      rank: 0,
      hypothesisKey: 'SSR_OR_THIN_CONTENT_REGRESSION',
      confidence: thinContent.length >= 5 ? 'high' : 'medium',
      summary: `${thinContent.length} page(s) have thin content (<${analysisConfig.thresholds.minTextLength} chars)`,
      evidence: [
        {
          type: 'check',
          statement: `Low body text length detected on ${thinContent.length} pages`,
          data: { 
            affectedUrls: thinContent.map(c => c.url).slice(0, 5),
            lengths: thinContent.slice(0, 5).map(c => ({ url: c.url, chars: c.bodyTextLength })),
          },
          strength: thinContent.length >= 5 ? 'strong' : 'moderate',
        },
      ],
      disconfirmedBy: [],
      missingData: ['Compare with previous crawl to detect regression', 'Check if pages are JS-rendered'],
    });
  }
  
  const noStructuredData = webChecks.filter(c => c.hasStructuredData === false);
  if (noStructuredData.length > 0 && anomalyFlags.ctrDropFlag) {
    hypotheses.push({
      rank: 0,
      hypothesisKey: 'STRUCTURED_DATA_BREAK',
      confidence: 'low',
      summary: `${noStructuredData.length} page(s) missing structured data with CTR drop`,
      evidence: [
        {
          type: 'check',
          statement: `No structured data on ${noStructuredData.length} pages`,
          data: { affectedUrls: noStructuredData.map(c => c.url).slice(0, 5) },
          strength: 'weak',
        },
        {
          type: 'metric',
          statement: `CTR dropped ${Math.abs(deltas.gsc.ctrDelta).toFixed(1)}%`,
          data: { ctrDelta: deltas.gsc.ctrDelta },
          strength: 'moderate',
        },
      ],
      disconfirmedBy: [],
      missingData: ['Check if structured data was previously present', 'Validate JSON-LD syntax'],
    });
  }
  
  if (anomalyFlags.trackingGapFlag) {
    hypotheses.push({
      rank: 0,
      hypothesisKey: 'TRACKING_TAG_OR_GA4_CONFIG',
      confidence: 'high',
      summary: 'GA4 sessions dropped but GSC traffic is stable - likely tracking issue',
      evidence: [
        {
          type: 'metric',
          statement: `GA4 sessions down ${Math.abs(deltas.ga4.sessionsDelta).toFixed(1)}%`,
          data: { sessionsDelta: deltas.ga4.sessionsDelta },
          strength: 'strong',
        },
        {
          type: 'comparison',
          statement: 'GSC clicks and impressions are stable',
          data: { 
            clicksDelta: deltas.gsc.clicksDelta,
            impressionsDelta: deltas.gsc.impressionsDelta,
          },
          strength: 'strong',
        },
      ],
      disconfirmedBy: [],
      missingData: ['Check GA4 realtime events', 'Verify GTM configuration'],
    });
  }
  
  if (classification === 'PAGE_CLUSTER_REGRESSION' && clusterLosses.length > 0) {
    const topCluster = clusterLosses[0];
    hypotheses.push({
      rank: 0,
      hypothesisKey: 'CONTENT_INTENT_MISMATCH',
      confidence: 'medium',
      summary: `Traffic loss concentrated in ${topCluster.cluster} (${(topCluster.lossShare * 100).toFixed(0)}% of total loss)`,
      evidence: [
        {
          type: 'metric',
          statement: `Cluster ${topCluster.cluster} lost ${topCluster.clickLoss} clicks`,
          data: { 
            cluster: topCluster.cluster,
            baselineClicks: topCluster.baselineClicks,
            currentClicks: topCluster.currentClicks,
            lossShare: topCluster.lossShare,
          },
          strength: 'strong',
        },
      ],
      disconfirmedBy: [],
      missingData: ['Analyze SERP for cluster queries', 'Check competitor content changes'],
    });
  }
  
  if (anomalyFlags.ctrDropFlag && !anomalyFlags.impressionsDropFlag) {
    hypotheses.push({
      rank: 0,
      hypothesisKey: 'SERP_LAYOUT_OR_CTR_SHIFT',
      confidence: 'medium',
      summary: 'CTR dropped while impressions stable - possible SERP layout change',
      evidence: [
        {
          type: 'metric',
          statement: `CTR dropped ${Math.abs(deltas.gsc.ctrDelta).toFixed(1)}% while impressions stable`,
          data: { 
            ctrDelta: deltas.gsc.ctrDelta,
            impressionsDelta: deltas.gsc.impressionsDelta,
          },
          strength: 'moderate',
        },
      ],
      disconfirmedBy: [],
      missingData: ['Check SERP features for top queries', 'Compare title/description performance'],
    });
  }
  
  const hasHighConfidenceTechnical = hypotheses.some(h => 
    h.confidence === 'high' && 
    !['GOOGLE_UPDATE_OR_INDUSTRY_WIDE', 'SEASONALITY'].includes(h.hypothesisKey)
  );
  
  const isClusterConcentrated = clusterLosses.length > 0 && 
    clusterLosses[0].lossShare >= analysisConfig.thresholds.clusterLossShare;
  
  if (!hasHighConfidenceTechnical && !isClusterConcentrated && anomalyFlags.impressionsDropFlag) {
    hypotheses.push({
      rank: 0,
      hypothesisKey: 'GOOGLE_UPDATE_OR_INDUSTRY_WIDE',
      confidence: 'low',
      summary: 'No clear technical issues found - possible algorithm update or industry-wide change',
      evidence: [
        {
          type: 'metric',
          statement: 'Visibility loss detected across site',
          data: { impressionsDelta: deltas.gsc.impressionsDelta },
          strength: 'weak',
        },
      ],
      disconfirmedBy: hasHighConfidenceTechnical ? [
        {
          type: 'check',
          statement: 'Technical issues found that better explain the drop',
          data: {},
          strength: 'strong',
        },
      ] : [],
      missingData: [
        'Check Google Search Central blog for confirmed updates',
        'Compare with industry benchmarks',
        'Review competitor rankings for same queries',
      ],
    });
  }
  
  hypotheses.sort((a, b) => {
    const confOrder = { high: 0, medium: 1, low: 2 };
    const priorityOrder = getPriorityOrder(a.hypothesisKey) - getPriorityOrder(b.hypothesisKey);
    if (priorityOrder !== 0) return priorityOrder;
    return confOrder[a.confidence] - confOrder[b.confidence];
  });
  
  hypotheses.forEach((h, i) => { h.rank = i + 1; });
  
  return hypotheses;
}

function getPriorityOrder(key: HypothesisKey): number {
  if (analysisConfig.priorityRules.P0.includes(key as any)) return 0;
  if (analysisConfig.priorityRules.P1.includes(key as any)) return 1;
  if (analysisConfig.priorityRules.P2.includes(key as any)) return 2;
  return 3;
}

export function getPriorityForHypothesis(key: HypothesisKey): Priority {
  if (analysisConfig.priorityRules.P0.includes(key as any)) return 'P0';
  if (analysisConfig.priorityRules.P1.includes(key as any)) return 'P1';
  if (analysisConfig.priorityRules.P2.includes(key as any)) return 'P2';
  return 'P3';
}
