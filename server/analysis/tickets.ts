import { type Priority } from '../config/analysis';
import { type GeneratedHypothesis, getPriorityForHypothesis } from './hypotheses';
import type { AnalysisResult } from './engine';

export interface GeneratedTicket {
  runId: string;
  ticketId: string;
  title: string;
  owner: 'SEO' | 'DEV' | 'ADS';
  priority: Priority;
  steps: string[];
  expectedImpact: 'high' | 'medium' | 'low';
  impactEstimate: {
    affectedPagesCount?: number;
    recoverableClicksEst?: number;
  };
  evidence: {
    metrics: Record<string, unknown>;
    affectedPaths?: string[];
    affectedQueries?: string[];
  };
  hypothesisKey: string;
}

const ticketTemplates: Record<string, {
  owner: 'SEO' | 'DEV' | 'ADS';
  titleTemplate: string;
  stepsTemplate: string[];
}> = {
  ROBOTS_OR_NOINDEX: {
    owner: 'DEV',
    titleTemplate: 'Fix robots/noindex blocking on {count} page(s)',
    stepsTemplate: [
      'Identify all pages with robots blocking or noindex tags',
      'Verify if blocking is intentional or accidental',
      'Remove noindex or allow in robots.txt for intended pages',
      'Request re-indexing via Search Console',
      'Monitor impressions recovery over 7 days',
    ],
  },
  CANONICAL_MISMATCH: {
    owner: 'DEV',
    titleTemplate: 'Fix canonical tag mismatches on {count} page(s)',
    stepsTemplate: [
      'Audit all pages with canonical mismatches',
      'Determine correct canonical URL for each page',
      'Update canonical tags to point to correct URLs',
      'Validate changes with URL Inspection tool',
      'Monitor indexing status in Search Console',
    ],
  },
  REDIRECT_CHAIN_OR_HTTP_CHANGE: {
    owner: 'DEV',
    titleTemplate: 'Simplify redirect chains on {count} URL(s)',
    stepsTemplate: [
      'Map all redirect chains exceeding 1 hop',
      'Update redirects to point directly to final destination',
      'Verify all internal links use final destination URLs',
      'Test redirects with curl or redirect checker',
      'Monitor crawl stats in Search Console',
    ],
  },
  SSR_OR_THIN_CONTENT_REGRESSION: {
    owner: 'DEV',
    titleTemplate: 'Fix thin/missing content on {count} page(s)',
    stepsTemplate: [
      'Identify pages with <300 chars body text',
      'Check if content is JS-rendered and not visible to Googlebot',
      'Implement server-side rendering or pre-rendering',
      'Verify content is visible in raw HTML response',
      'Use URL Inspection tool to verify Googlebot sees content',
      'Monitor Core Web Vitals for affected pages',
    ],
  },
  STRUCTURED_DATA_BREAK: {
    owner: 'SEO',
    titleTemplate: 'Restore structured data on {count} page(s)',
    stepsTemplate: [
      'Identify pages missing structured data',
      'Check for JSON-LD syntax errors using Schema.org validator',
      'Restore or add appropriate structured data markup',
      'Validate with Google Rich Results Test',
      'Monitor CTR for rich result appearances',
    ],
  },
  INTERNAL_LINKING_BREAK: {
    owner: 'SEO',
    titleTemplate: 'Fix internal linking issues for {cluster}',
    stepsTemplate: [
      'Audit internal links to affected pages',
      'Identify orphaned pages with no internal links',
      'Add contextual links from related content',
      'Update navigation menus if applicable',
      'Verify with site: search that pages are indexed',
    ],
  },
  CONTENT_INTENT_MISMATCH: {
    owner: 'SEO',
    titleTemplate: 'Improve content alignment for {cluster}',
    stepsTemplate: [
      'Analyze SERP results for top losing queries',
      'Compare content depth and format with ranking competitors',
      'Update content to better match search intent',
      'Add missing subtopics or sections',
      'Improve title and meta description for CTR',
      'Monitor ranking and CTR changes',
    ],
  },
  SERP_LAYOUT_OR_CTR_SHIFT: {
    owner: 'SEO',
    titleTemplate: 'Optimize snippets to improve CTR',
    stepsTemplate: [
      'Identify queries with largest CTR drops',
      'Analyze current SERP features (featured snippets, PAA, etc.)',
      'Optimize titles to be more compelling (under 60 chars)',
      'Improve meta descriptions with clear value props',
      'Add structured data for rich results eligibility',
      'Test and monitor CTR improvements',
    ],
  },
  GOOGLE_UPDATE_OR_INDUSTRY_WIDE: {
    owner: 'SEO',
    titleTemplate: 'Monitor potential algorithm update impact',
    stepsTemplate: [
      'Check Google Search Central blog for confirmed updates',
      'Compare traffic patterns with industry benchmarks',
      'Analyze competitor rankings for same queries',
      'Document affected queries and pages',
      'Continue monitoring for 2 weeks before taking action',
      'Focus on content quality improvements if confirmed',
    ],
  },
  TRACKING_TAG_OR_GA4_CONFIG: {
    owner: 'DEV',
    titleTemplate: 'Fix GA4 tracking gap',
    stepsTemplate: [
      'Verify GA4 tag is firing on all pages using Tag Assistant',
      'Check GTM configuration for any recent changes',
      'Validate measurement ID is correct',
      'Check for consent mode blocking events',
      'Review GA4 realtime reports to confirm events are received',
      'Compare GA4 session count with server logs if available',
    ],
  },
  SEASONALITY: {
    owner: 'SEO',
    titleTemplate: 'Seasonal traffic pattern detected',
    stepsTemplate: [
      'Compare current traffic with same period last year',
      'Document seasonal pattern for future reference',
      'No immediate action required if pattern is expected',
      'Plan content calendar for seasonal peaks',
    ],
  },
};

let ticketCounter = 1000;

export function generateTicketsFromHypotheses(
  runId: string,
  hypotheses: GeneratedHypothesis[],
  analysis: AnalysisResult,
  maxTickets = 10
): GeneratedTicket[] {
  const tickets: GeneratedTicket[] = [];
  
  for (const hypothesis of hypotheses.slice(0, maxTickets)) {
    const template = ticketTemplates[hypothesis.hypothesisKey];
    if (!template) continue;
    
    const priority = getPriorityForHypothesis(hypothesis.hypothesisKey);
    
    const affectedCount = hypothesis.evidence[0]?.data?.affectedUrls?.length || 
      (analysis.topLosingPages?.length || 0);
    
    const topCluster = analysis.clusterLosses[0]?.cluster || 'affected pages';
    
    const title = template.titleTemplate
      .replace('{count}', String(affectedCount))
      .replace('{cluster}', topCluster);
    
    const recoverableClicks = analysis.clusterLosses.length > 0
      ? analysis.clusterLosses.reduce((sum, c) => sum + c.clickLoss, 0)
      : analysis.topLosingPages?.reduce((sum, p) => sum + p.clickLoss, 0) || 0;
    
    tickets.push({
      runId,
      ticketId: `TICK-${++ticketCounter}`,
      title,
      owner: template.owner,
      priority,
      steps: template.stepsTemplate,
      expectedImpact: hypothesis.confidence === 'high' ? 'high' : hypothesis.confidence === 'medium' ? 'medium' : 'low',
      impactEstimate: {
        affectedPagesCount: affectedCount,
        recoverableClicksEst: Math.round(recoverableClicks * 0.5),
      },
      evidence: {
        metrics: {
          impressionsDelta: analysis.deltas.gsc.impressionsDelta,
          clicksDelta: analysis.deltas.gsc.clicksDelta,
          sessionsDelta: analysis.deltas.ga4.sessionsDelta,
        },
        affectedPaths: analysis.topLosingPages?.slice(0, 5).map(p => p.page),
        affectedQueries: analysis.topLosingQueries?.slice(0, 5).map(q => q.query),
      },
      hypothesisKey: hypothesis.hypothesisKey,
    });
  }
  
  return tickets;
}

export function resetTicketCounter(start: number = 1000) {
  ticketCounter = start;
}
