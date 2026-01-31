export interface IssueOpportunity {
  title: string;
  explanation: string;
  severity: "low" | "medium" | "high";
  impact: "traffic" | "conversion" | "both";
  mapped_section: "competitors" | "keywords" | "technical" | "performance";
}

export interface EstimatedOpportunity {
  traffic_range_monthly: { min: number; max: number } | null;
  leads_range_monthly: { min: number; max: number } | null;
  revenue_range_monthly: { min: number; max: number } | null;
  confidence: "low" | "medium" | "high";
}

export interface Summary {
  health_score: number;
  top_issues: IssueOpportunity[];
  top_opportunities: IssueOpportunity[];
  estimated_opportunity: EstimatedOpportunity;
}

export interface Competitor {
  domain: string;
  visibility_index: number;
  keyword_overlap_count: number;
  example_pages: string[];
  notes: string;
}

export interface CompetitorData {
  items: Competitor[];
  insight: string;
}

export interface KeywordTarget {
  keyword: string;
  intent: "high_intent" | "informational";
  volume_range: { min: number; max: number } | null;
  current_bucket: "rank_1" | "top_3" | "4_10" | "11_30" | "not_ranking";
  position: number | null;
  winner_domain: string | null;
}

export interface KeywordData {
  targets: KeywordTarget[];
  bucket_counts: {
    rank_1: number;
    top_3: number;
    "4_10": number;
    "11_30": number;
    not_ranking: number;
  };
  insight: string;
}

export interface Finding {
  title: string;
  detail: string;
  severity: "low" | "medium" | "high";
  impact: "traffic" | "conversion" | "both";
  example_urls: string[];
}

export interface TechnicalBucket {
  name: string;
  status: "good" | "needs_attention" | "critical";
  findings: Finding[];
}

export interface TechnicalData {
  buckets: TechnicalBucket[];
}

export interface PerformanceUrl {
  url: string;
  lcp_status: "good" | "needs_work" | "poor" | "not_available";
  cls_status: "good" | "needs_work" | "poor" | "not_available";
  inp_status: "good" | "needs_work" | "poor" | "not_available";
  overall: "good" | "needs_attention" | "critical";
}

export interface PerformanceData {
  urls: PerformanceUrl[];
  global_insight: string;
}

export interface CTA {
  id: "view_full_report" | "deploy_fixes" | "send_to_dev";
  label: string;
  action: "route" | "modal";
  target: string;
}

export interface ImplementationFix {
  priority: number;
  title: string;
  what_to_change: string;
  where_to_change: string;
  expected_impact: string;
  acceptance_check: string;
}

export interface NextSteps {
  if_do_nothing: string[];
  if_you_fix_this: string[];
  ctas: CTA[];
  implementation_plan?: ImplementationFix[];
}

export interface ReportMeta {
  missing?: {
    competitors_reason?: string;
    rank_reason?: string;
    technical_reason?: string;
    performance_reason?: string;
  };
}

export interface AISearchData {
  ai_visibility_score: number;
  structured_data_coverage: number;
  entity_coverage: number;
  llm_answerability: number;
  checklist: { title: string; status: "pass" | "fail" | "warning"; detail: string; category: string }[];
  findings: { finding_type: string; severity: string; category: string; description: string; recommended_action: string }[];
}

export interface FreeReportData {
  report_id: string;
  website_id: string;
  created_at: string;
  source_scan_id: string;
  report_version: number;
  inputs: { target_url: string };
  summary: Summary;
  competitors: CompetitorData;
  keywords: KeywordData;
  technical: TechnicalData;
  performance: PerformanceData;
  next_steps: NextSteps;
  meta: ReportMeta;
  visibilityMode?: "full" | "limited";
  limitedVisibilityReason?: string;
  limitedVisibilitySteps?: string[];
  scan_mode?: "light" | "full";
  ai_search?: AISearchData;
}
