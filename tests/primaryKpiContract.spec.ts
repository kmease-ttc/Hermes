import { describe, it, expect } from 'vitest';
import { CREW_KPI_CONTRACTS } from '../shared/crew/kpiSchemas';
import { normalizeWorkerOutputToKpis } from '../server/crew/kpiNormalizers';

describe('Primary KPI Contract', () => {
  const ALL_CREWS = [
    'scotty', 'speedster', 'popular', 'sentinel', 'hemingway', 
    'atlas', 'socrates', 'lookout', 'beacon', 'natasha', 'draper', 'major_tom'
  ];

  describe('Registry contracts', () => {
    it('every crew has a KPI contract with primaryKpi', () => {
      ALL_CREWS.forEach(crewId => {
        const contract = CREW_KPI_CONTRACTS[crewId];
        expect(contract, `Missing contract for ${crewId}`).toBeDefined();
        expect(contract.primaryKpi, `Missing primaryKpi for ${crewId}`).toBeDefined();
        expect(contract.label, `Missing label for ${crewId}`).toBeDefined();
        expect(contract.sampleValue, `Missing sampleValue for ${crewId}`).toBeDefined();
        expect(contract.whyItMatters, `Missing whyItMatters for ${crewId}`).toBeDefined();
      });
    });

    it('primaryKpi is in allowedKpis for every crew', () => {
      ALL_CREWS.forEach(crewId => {
        const contract = CREW_KPI_CONTRACTS[crewId];
        expect(contract.allowedKpis).toContain(contract.primaryKpi);
      });
    });

    it('draper primaryKpi is clicks (per spec requirement)', () => {
      expect(CREW_KPI_CONTRACTS.draper.primaryKpi).toBe('clicks');
      expect(CREW_KPI_CONTRACTS.draper.label).toBe('Clicks');
    });
  });

  describe('No completionRate allowed', () => {
    it('completionRate is not in any crew allowedKpis', () => {
      ALL_CREWS.forEach(crewId => {
        const contract = CREW_KPI_CONTRACTS[crewId];
        expect(contract.allowedKpis).not.toContain('completionRate');
        expect(contract.allowedKpis).not.toContain('completion_rate');
      });
    });

    it('completionRate is not any crew primaryKpi', () => {
      ALL_CREWS.forEach(crewId => {
        const contract = CREW_KPI_CONTRACTS[crewId];
        expect(contract.primaryKpi).not.toBe('completionRate');
        expect(contract.primaryKpi).not.toBe('completion_rate');
      });
    });
  });

  describe('Normalizers emit primary KPI', () => {
    const mockWorkerOutputs: Record<string, any> = {
      scotty: { issues: [], crawl_summary: {} },
      speedster: { kpis: { performance_score: 85 } },
      popular: { kpis: { sessions: 12400 } },
      sentinel: { kpis: { pages_losing_traffic: 3 } },
      hemingway: { kpis: { content_score: 72 } },
      atlas: { kpis: { ai_coverage_score: 68 } },
      socrates: { kpis: { insights_written: 15 } },
      lookout: { kpis: { keywords_tracked: 25 } },
      beacon: { kpis: { domain_authority: 35 } },
      natasha: { kpis: { competitors_tracked: 5 } },
      draper: { kpis: { clicks: 1200 } },
      major_tom: { kpis: { orchestration_health: 100 } },
    };

    it('each normalizer emits the registry primaryKpi', () => {
      ALL_CREWS.forEach(crewId => {
        const contract = CREW_KPI_CONTRACTS[crewId];
        const result = normalizeWorkerOutputToKpis(crewId, 'test-site', mockWorkerOutputs[crewId]);
        
        const primaryKpiEmitted = result.kpis.find(k => k.metricKey === contract.primaryKpi);
        expect(primaryKpiEmitted, `${crewId} should emit ${contract.primaryKpi}`).toBeDefined();
      });
    });

    it('draper normalizer emits clicks as primary KPI', () => {
      const result = normalizeWorkerOutputToKpis('draper', 'test-site', { kpis: { clicks: 1500, conversions: 45 } });
      
      const primaryKpi = result.kpis.find(k => k.metricKey === 'clicks');
      expect(primaryKpi).toBeDefined();
      expect(primaryKpi?.value).toBe(1500);
    });

    it('normalizers never emit completionRate', () => {
      ALL_CREWS.forEach(crewId => {
        const result = normalizeWorkerOutputToKpis(crewId, 'test-site', mockWorkerOutputs[crewId]);
        
        const completionRate = result.kpis.find(k => 
          k.metricKey === 'completionRate' || k.metricKey === 'completion_rate'
        );
        expect(completionRate, `${crewId} should not emit completionRate`).toBeUndefined();
      });
    });
  });

  describe('Expected primary KPIs per spec', () => {
    const expectedPrimaryKpis: Record<string, string> = {
      scotty: 'crawlHealthPct',
      speedster: 'performanceScore',
      popular: 'monthlySessions',
      sentinel: 'pagesLosingTraffic',
      hemingway: 'contentQualityScore',
      beacon: 'domainAuthority',
      lookout: 'keywordsTracked',
      natasha: 'competitorsTracked',
      draper: 'clicks',
      socrates: 'insightsGenerated',
      atlas: 'aiOptimizationScore',
      major_tom: 'orchestration_health',
    };

    it('each crew has the correct primaryKpi per spec', () => {
      Object.entries(expectedPrimaryKpis).forEach(([crewId, expectedKpi]) => {
        expect(CREW_KPI_CONTRACTS[crewId].primaryKpi).toBe(expectedKpi);
      });
    });
  });
});
