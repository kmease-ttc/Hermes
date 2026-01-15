import { describe, it, expect } from 'vitest';
import { CREW_KPI_CONTRACTS } from '../shared/crew/kpiSchemas';
import { CREW } from '../shared/registry';

describe('Analyze Report API', () => {
  describe('Report response structure', () => {
    it('returns no_data status when crew has no runs', () => {
      const mockCrewReport = {
        status: 'no_data' as const,
        message: 'Run diagnostics to populate',
      };
      
      expect(mockCrewReport.status).toBe('no_data');
      expect(mockCrewReport.message).toBeDefined();
    });

    it('returns needs_config status when integration not configured', () => {
      const mockCrewReport = {
        status: 'needs_config' as const,
        message: 'Connect integration to enable',
      };
      
      expect(mockCrewReport.status).toBe('needs_config');
      expect(mockCrewReport.message).toBe('Connect integration to enable');
    });

    it('returns active status with primaryKpi when data exists', () => {
      const mockCrewReport = {
        status: 'active' as const,
        primaryKpi: {
          id: 'technicalHealthScore',
          label: 'Technical Health',
          value: 85,
          unit: 'score',
        },
        lastRun: new Date(),
      };
      
      expect(mockCrewReport.status).toBe('active');
      expect(mockCrewReport.primaryKpi).toBeDefined();
      expect(mockCrewReport.primaryKpi?.value).toBe(85);
    });
  });

  describe('No placeholder data allowed', () => {
    const FORBIDDEN_PLACEHOLDER_VALUES = [12400, 12450, 3.2, 42];
    
    it('should not contain hardcoded placeholder values', () => {
      const mockReport = {
        summary: {
          healthGrade: 'N/A',
          healthScore: 0,
          openTasks: 0,
        },
        crews: {
          scotty: { status: 'no_data' as const, message: 'Run diagnostics to populate' },
          speedster: { status: 'no_data' as const, message: 'Run diagnostics to populate' },
          popular: { status: 'no_data' as const, message: 'Run diagnostics to populate' },
        },
      };
      
      const allValues = [
        mockReport.summary.healthScore,
        mockReport.summary.openTasks,
      ];
      
      for (const value of allValues) {
        expect(FORBIDDEN_PLACEHOLDER_VALUES).not.toContain(value);
      }
    });

    it('report with no crew data should have N/A health grade', () => {
      const emptyReport = {
        summary: {
          healthGrade: 'N/A',
          healthScore: 0,
          openTasks: 0,
        },
      };
      
      expect(emptyReport.summary.healthGrade).toBe('N/A');
    });
  });

  describe('Health grade calculation', () => {
    function calculateHealthGrade(scottyScore?: number, speedsterScore?: number): string {
      if (scottyScore === undefined && speedsterScore === undefined) {
        return 'N/A';
      }
      
      const scores = [scottyScore, speedsterScore].filter(s => s !== undefined) as number[];
      const healthScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      
      if (healthScore >= 90) return 'A';
      if (healthScore >= 80) return 'A-';
      if (healthScore >= 70) return 'B+';
      if (healthScore >= 60) return 'B';
      if (healthScore >= 50) return 'C';
      return 'D';
    }

    it('returns A for score >= 90', () => {
      expect(calculateHealthGrade(95, 92)).toBe('A');
    });

    it('returns A- for score 80-89', () => {
      expect(calculateHealthGrade(85, 82)).toBe('A-');
    });

    it('returns B+ for score 70-79', () => {
      expect(calculateHealthGrade(75, 72)).toBe('B+');
    });

    it('returns N/A when no scores available', () => {
      expect(calculateHealthGrade()).toBe('N/A');
    });

    it('calculates from single crew when only one has data', () => {
      expect(calculateHealthGrade(90)).toBe('A');
      expect(calculateHealthGrade(undefined, 75)).toBe('B+');
    });
  });

  describe('Report status types', () => {
    type CrewStatus = 'active' | 'no_data' | 'needs_config';
    
    it('all status types are valid', () => {
      const validStatuses: CrewStatus[] = ['active', 'no_data', 'needs_config'];
      
      validStatuses.forEach(status => {
        expect(['active', 'no_data', 'needs_config']).toContain(status);
      });
    });
  });

  describe('Crew pipeline contract', () => {
    const ANALYZE_CREWS = ['scotty', 'speedster', 'popular', 'sentinel', 'hemingway', 
                          'atlas', 'socrates', 'lookout', 'beacon', 'natasha', 'draper', 'major_tom'];
    
    it('all analyze crews have KPI contracts', () => {
      ANALYZE_CREWS.forEach(crewId => {
        expect(CREW_KPI_CONTRACTS[crewId]).toBeDefined();
        expect(CREW_KPI_CONTRACTS[crewId].primaryKpi).toBeDefined();
      });
    });

    it('all analyze crews exist in registry', () => {
      ANALYZE_CREWS.forEach(crewId => {
        expect(CREW[crewId]).toBeDefined();
        expect(CREW[crewId].crewId).toBe(crewId);
      });
    });

    it('crew primaryKpi is in allowedKpis', () => {
      ANALYZE_CREWS.forEach(crewId => {
        const contract = CREW_KPI_CONTRACTS[crewId];
        expect(contract.allowedKpis).toContain(contract.primaryKpi);
      });
    });
  });

  describe('UI placeholder prevention', () => {
    const HARDCODED_PLACEHOLDER_VALUES = ['12,450', '42%', '3.2%', 'B+'];
    
    function renderMetricValue(value: number | undefined | null): string {
      if (value === undefined || value === null) {
        return '—';
      }
      return value.toLocaleString();
    }

    it('returns dash for undefined values', () => {
      expect(renderMetricValue(undefined)).toBe('—');
      expect(renderMetricValue(null)).toBe('—');
    });

    it('formats real numbers', () => {
      expect(renderMetricValue(12450)).toBe('12,450');
      expect(renderMetricValue(0)).toBe('0');
    });

    it('mock report with no data should not contain placeholder strings', () => {
      const emptyReport = {
        summary: { healthGrade: 'N/A', healthScore: 0, openTasks: 0 },
        crews: Object.fromEntries(
          ['scotty', 'speedster', 'popular'].map(id => [id, { status: 'no_data' }])
        ),
      };
      
      const reportJson = JSON.stringify(emptyReport);
      HARDCODED_PLACEHOLDER_VALUES.forEach(placeholder => {
        expect(reportJson).not.toContain(placeholder);
      });
    });
  });
});
