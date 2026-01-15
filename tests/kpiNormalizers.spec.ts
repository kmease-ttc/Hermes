import { describe, it, expect } from 'vitest';
import { normalizeWorkerOutputToKpis } from '../server/crew/kpiNormalizers';
import { CREW_KPI_CONTRACTS } from '../shared/crew/kpiSchemas';

const TEST_SITE_ID = 'site-123';

describe('KPI Normalizers', () => {
  describe('Scotty (Technical SEO)', () => {
    it('produces technicalHealthScore as primary KPI', () => {
      const workerResponse = {
        issues: [],
        crawl_summary: { pages_crawled: 100 },
        kpis: { pages_crawled: 100, errors: 0 },
      };
      
      const result = normalizeWorkerOutputToKpis('scotty', TEST_SITE_ID, workerResponse);
      const primaryKpi = CREW_KPI_CONTRACTS.scotty.primaryKpi;
      
      const hasPrimaryKpi = result.kpis.some(kpi => kpi.metricKey === primaryKpi);
      expect(hasPrimaryKpi).toBe(true);
    });

    it('calculates 100 for healthy site with no issues', () => {
      const workerResponse = { issues: [], kpis: {} };
      const result = normalizeWorkerOutputToKpis('scotty', TEST_SITE_ID, workerResponse);
      
      const healthScore = result.kpis.find(k => k.metricKey === 'technicalHealthScore');
      expect(healthScore?.value).toBe(100);
    });

    it('deducts points for critical issues and caps at 70', () => {
      const workerResponse = {
        issues: [
          { severity: 'critical', message: 'Blocked by robots.txt' },
          { severity: 'high', message: 'Missing canonical' },
        ],
        kpis: {},
      };
      
      const result = normalizeWorkerOutputToKpis('scotty', TEST_SITE_ID, workerResponse);
      const healthScore = result.kpis.find(k => k.metricKey === 'technicalHealthScore');
      
      expect(healthScore?.value).toBeLessThanOrEqual(70);
    });

    it('extracts secondary KPIs when present', () => {
      const workerResponse = {
        issues: [],
        kpis: { pages_crawled: 250, errors: 5 },
      };
      
      const result = normalizeWorkerOutputToKpis('scotty', TEST_SITE_ID, workerResponse);
      
      expect(result.kpis.some(k => k.metricKey === 'tech.pages_crawled')).toBe(true);
      expect(result.kpis.some(k => k.metricKey === 'tech.errors')).toBe(true);
    });

    it('extracts indexCoverage from various sources', () => {
      const workerResponse = {
        issues: [],
        indexability: { coverage_percent: 92 },
        kpis: {},
      };
      
      const result = normalizeWorkerOutputToKpis('scotty', TEST_SITE_ID, workerResponse);
      const indexCoverage = result.kpis.find(k => k.metricKey === 'indexCoverage');
      
      expect(indexCoverage?.value).toBe(92);
    });
  });

  describe('Speedster (Performance)', () => {
    it('produces vitals.performance_score as primary KPI', () => {
      const workerResponse = {
        vitals_summary: { performance_score: 85, lcp: 2.5 },
        kpis: {},
      };
      
      const result = normalizeWorkerOutputToKpis('speedster', TEST_SITE_ID, workerResponse);
      const primaryKpi = CREW_KPI_CONTRACTS.speedster.primaryKpi;
      
      const hasPrimaryKpi = result.kpis.some(kpi => kpi.metricKey === primaryKpi);
      expect(hasPrimaryKpi).toBe(true);
    });

    it('extracts performance score from vitals_summary', () => {
      const workerResponse = {
        vitals_summary: { performance_score: 92 },
      };
      
      const result = normalizeWorkerOutputToKpis('speedster', TEST_SITE_ID, workerResponse);
      const score = result.kpis.find(k => k.metricKey === 'vitals.performance_score');
      
      expect(score?.value).toBe(92);
    });
  });

  describe('Popular (Analytics)', () => {
    it('produces ga4.sessions as primary KPI', () => {
      const workerResponse = {
        ga4_summary: { sessions: 15000, users: 8000 },
        gsc_summary: { clicks: 500 },
        kpis: {},
      };
      
      const result = normalizeWorkerOutputToKpis('popular', TEST_SITE_ID, workerResponse);
      const primaryKpi = CREW_KPI_CONTRACTS.popular.primaryKpi;
      
      const hasPrimaryKpi = result.kpis.some(kpi => kpi.metricKey === primaryKpi);
      expect(hasPrimaryKpi).toBe(true);
    });

    it('extracts sessions and clicks', () => {
      const workerResponse = {
        ga4_summary: { sessions: 25000 },
        gsc_summary: { clicks: 1200 },
      };
      
      const result = normalizeWorkerOutputToKpis('popular', TEST_SITE_ID, workerResponse);
      
      const sessions = result.kpis.find(k => k.metricKey === 'ga4.sessions');
      const clicks = result.kpis.find(k => k.metricKey === 'gsc.clicks');
      
      expect(sessions?.value).toBe(25000);
      expect(clicks?.value).toBe(1200);
    });
  });

  describe('Generic normalizer (fallback)', () => {
    it('extracts numeric KPIs from unknown crews', () => {
      const workerResponse = {
        kpis: { custom_metric: 42, another_metric: 99 },
      };
      
      const result = normalizeWorkerOutputToKpis('unknown_crew', TEST_SITE_ID, workerResponse);
      
      expect(result.kpis.length).toBe(2);
      expect(result.kpis.some(k => k.metricKey === 'custom_metric' && k.value === 42)).toBe(true);
    });
  });

  describe('Primary KPI contract enforcement', () => {
    const ALL_CREWS = [
      'scotty', 'speedster', 'popular', 'sentinel', 'hemingway',
      'atlas', 'socrates', 'lookout', 'beacon', 'natasha', 'draper', 'major_tom'
    ];
    
    it.each(ALL_CREWS)('%s normalizer produces its primary KPI', (crewId) => {
      const mockResponse = getMockWorkerResponse(crewId);
      const result = normalizeWorkerOutputToKpis(crewId, TEST_SITE_ID, mockResponse);
      const primaryKpi = CREW_KPI_CONTRACTS[crewId].primaryKpi;
      
      const hasPrimaryKpi = result.kpis.some(kpi => kpi.metricKey === primaryKpi);
      expect(hasPrimaryKpi).toBe(true);
    });
  });

  describe('Additional crew normalizers', () => {
    it('Sentinel produces content.decay_signals', () => {
      const response = { decay_summary: { pages_losing_traffic: 5 } };
      const result = normalizeWorkerOutputToKpis('sentinel', TEST_SITE_ID, response);
      const decay = result.kpis.find(k => k.metricKey === 'content.decay_signals');
      expect(decay?.value).toBe(5);
    });

    it('Beacon produces links.domain_authority', () => {
      const response = { links_summary: { domain_authority: 45 } };
      const result = normalizeWorkerOutputToKpis('beacon', TEST_SITE_ID, response);
      const da = result.kpis.find(k => k.metricKey === 'links.domain_authority');
      expect(da?.value).toBe(45);
    });

    it('Lookout produces serp.keywords_top10', () => {
      const response = { serp_summary: { keywords_top10: 25 } };
      const result = normalizeWorkerOutputToKpis('lookout', TEST_SITE_ID, response);
      const kw = result.kpis.find(k => k.metricKey === 'serp.keywords_top10');
      expect(kw?.value).toBe(25);
    });

    it('Draper produces ads.conversions', () => {
      const response = { ads_summary: { conversions: 120 } };
      const result = normalizeWorkerOutputToKpis('draper', TEST_SITE_ID, response);
      const conv = result.kpis.find(k => k.metricKey === 'ads.conversions');
      expect(conv?.value).toBe(120);
    });
  });
});

function getMockWorkerResponse(crewId: string): any {
  switch (crewId) {
    case 'scotty':
      return { issues: [], kpis: {} };
    case 'speedster':
      return { vitals_summary: { performance_score: 85 } };
    case 'popular':
      return { ga4_summary: { sessions: 1000 } };
    case 'sentinel':
      return { decay_summary: { pages_losing_traffic: 3 } };
    case 'hemingway':
      return { content_summary: { quality_score: 88 } };
    case 'atlas':
      return { ai_summary: { coverage_score: 72 } };
    case 'socrates':
      return { kb_summary: { insights_generated: 15 } };
    case 'lookout':
      return { serp_summary: { keywords_top10: 20 } };
    case 'beacon':
      return { links_summary: { domain_authority: 55 } };
    case 'natasha':
      return { competitive_summary: { gaps_found: 8 } };
    case 'draper':
      return { ads_summary: { conversions: 50 } };
    case 'major_tom':
      return { orchestration_summary: { health_score: 95 } };
    default:
      return { kpis: { default_metric: 50 } };
  }
}
