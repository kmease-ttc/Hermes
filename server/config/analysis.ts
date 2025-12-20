export const analysisConfig = {
  windows: {
    current: 3,
    baseline: 14,
  },
  
  thresholds: {
    dropPct: -30,
    zScore: -2.0,
    clusterLossShare: 0.6,
    minTextLength: 300,
  },
  
  clusterPatterns: [
    { pattern: /^\/services\//, cluster: '/services/*' },
    { pattern: /^\/locations\//, cluster: '/locations/*' },
    { pattern: /^\/conditions\//, cluster: '/conditions/*' },
    { pattern: /^\/blog\//, cluster: '/blog/*' },
    { pattern: /^\/providers\//, cluster: '/providers/*' },
    { pattern: /^\/treatments\//, cluster: '/treatments/*' },
    { pattern: /^\/$/, cluster: '/' },
  ],
  
  hypothesisKeys: [
    'ROBOTS_OR_NOINDEX',
    'CANONICAL_MISMATCH',
    'REDIRECT_CHAIN_OR_HTTP_CHANGE',
    'SSR_OR_THIN_CONTENT_REGRESSION',
    'STRUCTURED_DATA_BREAK',
    'INTERNAL_LINKING_BREAK',
    'CONTENT_INTENT_MISMATCH',
    'SERP_LAYOUT_OR_CTR_SHIFT',
    'GOOGLE_UPDATE_OR_INDUSTRY_WIDE',
    'SEASONALITY',
    'TRACKING_TAG_OR_GA4_CONFIG',
  ] as const,
  
  classificationKeys: [
    'VISIBILITY_LOSS',
    'CTR_LOSS',
    'PAGE_CLUSTER_REGRESSION',
    'TRACKING_OR_ATTRIBUTION_GAP',
    'INCONCLUSIVE',
  ] as const,
  
  priorityRules: {
    P0: ['ROBOTS_OR_NOINDEX', 'CANONICAL_MISMATCH', 'SSR_OR_THIN_CONTENT_REGRESSION'],
    P1: ['STRUCTURED_DATA_BREAK', 'INTERNAL_LINKING_BREAK', 'REDIRECT_CHAIN_OR_HTTP_CHANGE'],
    P2: ['CONTENT_INTENT_MISMATCH', 'SERP_LAYOUT_OR_CTR_SHIFT'],
    P3: ['GOOGLE_UPDATE_OR_INDUSTRY_WIDE', 'SEASONALITY'],
  },
};

export type ClassificationKey = typeof analysisConfig.classificationKeys[number];
export type HypothesisKey = typeof analysisConfig.hypothesisKeys[number];
export type Confidence = 'high' | 'medium' | 'low';
export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

export interface EvidenceBlock {
  type: 'metric' | 'check' | 'comparison' | 'log';
  statement: string;
  data: Record<string, unknown>;
  strength: 'strong' | 'moderate' | 'weak';
}

export interface Deltas {
  ga4: {
    sessionsDelta: number;
    usersDelta: number;
    sessionsDropFlag: boolean;
  };
  gsc: {
    clicksDelta: number;
    impressionsDelta: number;
    ctrDelta: number;
    positionDelta: number;
    impressionsDropFlag: boolean;
    clicksDropFlag: boolean;
    ctrDropFlag: boolean;
  };
}

export interface ClusterLoss {
  cluster: string;
  baselineClicks: number;
  currentClicks: number;
  clickLoss: number;
  lossShare: number;
}

export function getPageCluster(pagePath: string): string {
  for (const { pattern, cluster } of analysisConfig.clusterPatterns) {
    if (pattern.test(pagePath)) {
      return cluster;
    }
  }
  const firstSegment = pagePath.split('/')[1];
  return firstSegment ? `/${firstSegment}/*` : '/other';
}
