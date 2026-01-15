import { z } from "zod";
import { CREW } from "../registry";

export const BaseKpiSchema = z.object({
  crewId: z.string(),
  kpiId: z.string(),
  value: z.union([z.number(), z.string()]),
  unit: z.string().optional(),
  measuredAt: z.string().datetime().optional(),
});

export type BaseKpi = z.infer<typeof BaseKpiSchema>;

export interface CrewKpiContract {
  allowedKpis: string[];
  primaryKpi: string;
  label: string;
  unit: string;
  sampleValue: string;
  whyItMatters: string;
}

export const CREW_KPI_CONTRACTS: Record<string, CrewKpiContract> = {
  scotty: {
    allowedKpis: ["crawlHealthPct", "technicalHealthScore", "tech.errors", "tech.warnings", "tech.pages_crawled", "indexCoverage"],
    primaryKpi: "crawlHealthPct",
    label: "Crawl Health",
    unit: "%",
    sampleValue: "~91%",
    whyItMatters: "Technical issues blocking search visibility",
  },
  speedster: {
    allowedKpis: ["performanceScore", "vitals.performance_score", "vitals.lcp", "vitals.cls", "vitals.inp"],
    primaryKpi: "performanceScore",
    label: "Performance Score",
    unit: "score",
    sampleValue: "~85",
    whyItMatters: "Speed directly impacts rankings and conversions",
  },
  popular: {
    allowedKpis: ["monthlySessions", "ga4.sessions", "ga4.users", "gsc.clicks", "gsc.impressions"],
    primaryKpi: "monthlySessions",
    label: "Monthly Sessions",
    unit: "count",
    sampleValue: "~12.4K",
    whyItMatters: "Traffic trends show growth or decline",
  },
  sentinel: {
    allowedKpis: ["pagesLosingTraffic", "content.decay_signals", "content.refresh_candidates"],
    primaryKpi: "pagesLosingTraffic",
    label: "Pages Losing Traffic",
    unit: "count",
    sampleValue: "~3",
    whyItMatters: "Content losing traffic needs attention",
  },
  hemingway: {
    allowedKpis: ["contentQualityScore", "content_score", "articles_generated"],
    primaryKpi: "contentQualityScore",
    label: "Content Quality",
    unit: "score",
    sampleValue: "~72",
    whyItMatters: "Quality signals that Google rewards",
  },
  beacon: {
    allowedKpis: ["domainAuthority", "links.domain_authority", "links.total", "links.new"],
    primaryKpi: "domainAuthority",
    label: "Domain Authority",
    unit: "score",
    sampleValue: "~35",
    whyItMatters: "Link equity and credibility",
  },
  lookout: {
    allowedKpis: ["keywordsTracked", "serp.keywords_tracked", "serp.keywords_top10", "serp.avg_position"],
    primaryKpi: "keywordsTracked",
    label: "Keywords Tracked",
    unit: "count",
    sampleValue: "~25",
    whyItMatters: "Monitor ranking movements",
  },
  natasha: {
    allowedKpis: ["competitorsTracked", "competitive.gaps", "competitive.opportunities"],
    primaryKpi: "competitorsTracked",
    label: "Competitors Tracked",
    unit: "count",
    sampleValue: "~5",
    whyItMatters: "Stay ahead of the competition",
  },
  draper: {
    allowedKpis: ["clicks", "ads.clicks", "ads.spend", "ads.impressions", "ads.conversions"],
    primaryKpi: "clicks",
    label: "Clicks",
    unit: "count",
    sampleValue: "~1.2K",
    whyItMatters: "Paid traffic driving to your site",
  },
  socrates: {
    allowedKpis: ["insightsGenerated", "kb.insights_written", "kb.guidance_used"],
    primaryKpi: "insightsGenerated",
    label: "Insights Generated",
    unit: "count",
    sampleValue: "~15",
    whyItMatters: "Learning from your site data",
  },
  atlas: {
    allowedKpis: ["aiOptimizationScore", "ai.coverage_score", "ai.llm_visibility"],
    primaryKpi: "aiOptimizationScore",
    label: "AI Optimization",
    unit: "score",
    sampleValue: "~68%",
    whyItMatters: "Optimize for AI search answers",
  },
  major_tom: {
    allowedKpis: ["orchestration_health"],
    primaryKpi: "orchestration_health",
    label: "Orchestration Health",
    unit: "score",
    sampleValue: "~100",
    whyItMatters: "System coordination status",
  },
};

export function validateKpiForCrew(crewId: string, kpiId: string): { valid: boolean; error?: string } {
  const contract = CREW_KPI_CONTRACTS[crewId];
  if (!contract) {
    return { valid: false, error: `Unknown crewId: ${crewId}` };
  }
  if (!contract.allowedKpis.includes(kpiId)) {
    return { valid: false, error: `KPI '${kpiId}' not allowed for crew '${crewId}'. Allowed: ${contract.allowedKpis.join(", ")}` };
  }
  return { valid: true };
}

export function validateCrewKpiContract(crewId: string): { valid: boolean; errors: string[] } {
  const contract = CREW_KPI_CONTRACTS[crewId];
  const errors: string[] = [];
  
  if (!contract) {
    return { valid: false, errors: [`No KPI contract defined for crew '${crewId}'`] };
  }
  
  if (!contract.allowedKpis.includes(contract.primaryKpi)) {
    errors.push(`Primary KPI '${contract.primaryKpi}' is not in allowedKpis for crew '${crewId}'`);
  }
  
  return { valid: errors.length === 0, errors };
}
