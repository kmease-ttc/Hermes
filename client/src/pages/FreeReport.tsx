import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  ArrowRight,
  Share2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Printer,
  Zap,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Globe,
  Search,
  Wrench,
  FileWarning,
  Link2,
  FileText,
  Gauge,
  Download,
  Rocket,
  BarChart3,
  PenTool,
  Layout,
  Brain,
  ShieldAlert,
  UserPlus,
  LogIn,
  Target,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { toast } from "sonner";

interface IssueOpportunity {
  title: string;
  explanation: string;
  severity: "low" | "medium" | "high";
  impact: "traffic" | "conversion" | "both";
  mapped_section: "competitors" | "keywords" | "technical" | "performance";
}

interface EstimatedOpportunity {
  traffic_range_monthly: { min: number; max: number } | null;
  leads_range_monthly: { min: number; max: number } | null;
  revenue_range_monthly: { min: number; max: number } | null;
  confidence: "low" | "medium" | "high";
}

interface Summary {
  health_score: number;
  top_issues: IssueOpportunity[];
  top_opportunities: IssueOpportunity[];
  estimated_opportunity: EstimatedOpportunity;
}

interface Competitor {
  domain: string;
  visibility_index: number;
  keyword_overlap_count: number;
  example_pages: string[];
  notes: string;
}

interface CompetitorData {
  items: Competitor[];
  insight: string;
}

interface KeywordTarget {
  keyword: string;
  intent: "high_intent" | "informational";
  volume_range: { min: number; max: number } | null;
  current_bucket: "rank_1" | "top_3" | "4_10" | "11_30" | "not_ranking";
  position: number | null;
  winner_domain: string | null;
}

interface KeywordData {
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

interface Finding {
  title: string;
  detail: string;
  severity: "low" | "medium" | "high";
  impact: "traffic" | "conversion" | "both";
  example_urls: string[];
}

interface TechnicalBucket {
  name: string;
  status: "good" | "needs_attention" | "critical";
  findings: Finding[];
}

interface TechnicalData {
  buckets: TechnicalBucket[];
}

interface PerformanceUrl {
  url: string;
  lcp_status: "good" | "needs_work" | "poor" | "not_available";
  cls_status: "good" | "needs_work" | "poor" | "not_available";
  inp_status: "good" | "needs_work" | "poor" | "not_available";
  overall: "good" | "needs_attention" | "critical";
}

interface PerformanceData {
  urls: PerformanceUrl[];
  global_insight: string;
}

interface CTA {
  id: "view_full_report" | "deploy_fixes" | "send_to_dev";
  label: string;
  action: "route" | "modal";
  target: string;
}

interface ImplementationFix {
  priority: number;
  title: string;
  what_to_change: string;
  where_to_change: string;
  expected_impact: string;
  acceptance_check: string;
}

interface NextSteps {
  if_do_nothing: string[];
  if_you_fix_this: string[];
  ctas: CTA[];
  implementation_plan?: ImplementationFix[];
}

interface ReportMeta {
  missing?: {
    competitors_reason?: string;
    rank_reason?: string;
    technical_reason?: string;
    performance_reason?: string;
  };
}

interface FreeReportData {
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
  ai_search?: {
    ai_visibility_score: number;
    structured_data_coverage: number;
    entity_coverage: number;
    llm_answerability: number;
    checklist: { title: string; status: "pass" | "fail" | "warning"; detail: string; category: string }[];
    findings: { finding_type: string; severity: string; category: string; description: string; recommended_action: string }[];
  };
}

function HealthScoreRing({ score }: { score: number }) {
  let color = "text-semantic-danger";
  let bgColor = "bg-semantic-danger-soft";
  if (score >= 80) {
    color = "text-semantic-success";
    bgColor = "bg-semantic-success-soft";
  } else if (score >= 60) {
    color = "text-semantic-warning";
    bgColor = "bg-semantic-warning-soft";
  } else if (score >= 40) {
    color = "text-gold";
    bgColor = "bg-gold-soft";
  }

  return (
    <div className={`w-32 h-32 relative flex items-center justify-center rounded-full ${bgColor}`} data-testid="health-score-ring">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          className="text-muted"
        />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeDasharray={`${(score / 100) * 263.9} 263.9`}
          className={color}
          strokeLinecap="round"
        />
      </svg>
      <div className="text-center">
        <span className={`text-3xl font-bold ${color}`} data-testid="health-score-value">{score}</span>
        <span className="text-sm text-muted-foreground block">/100</span>
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: "low" | "medium" | "high" }) {
  const styles = {
    high: "bg-semantic-danger-soft text-semantic-danger border-semantic-danger-border",
    medium: "bg-semantic-warning-soft text-semantic-warning border-semantic-warning-border",
    low: "bg-semantic-info-soft text-semantic-info border-semantic-info-border",
  };
  return (
    <Badge variant="outline" className={styles[severity]}>
      {severity}
    </Badge>
  );
}

function StatusBadge({ status }: { status: "good" | "needs_attention" | "needs_work" | "critical" | "poor" | "not_available" }) {
  const styles: Record<string, string> = {
    good: "bg-semantic-success-soft text-semantic-success border-semantic-success-border",
    needs_attention: "bg-semantic-warning-soft text-semantic-warning border-semantic-warning-border",
    needs_work: "bg-semantic-warning-soft text-semantic-warning border-semantic-warning-border",
    critical: "bg-semantic-danger-soft text-semantic-danger border-semantic-danger-border",
    poor: "bg-semantic-danger-soft text-semantic-danger border-semantic-danger-border",
    not_available: "bg-muted text-muted-foreground border-border",
  };
  const labels: Record<string, string> = {
    good: "Good",
    needs_attention: "Needs Attention",
    needs_work: "Needs Work",
    critical: "Critical",
    poor: "Poor",
    not_available: "N/A",
  };
  return (
    <Badge variant="outline" className={styles[status] || styles.not_available}>
      {labels[status] || status}
    </Badge>
  );
}

function IntentBadge({ intent }: { intent: "high_intent" | "informational" }) {
  const styles = {
    high_intent: "bg-purple-soft text-purple border-purple-border",
    informational: "bg-system-soft text-system border-semantic-info-border",
  };
  return (
    <Badge variant="outline" className={styles[intent]}>
      {intent === "high_intent" ? "High Intent" : "Informational"}
    </Badge>
  );
}

function BucketBadge({ bucket }: { bucket: "rank_1" | "top_3" | "4_10" | "11_30" | "not_ranking" }) {
  const styles: Record<string, string> = {
    rank_1: "bg-emerald-100 text-emerald-800 border-emerald-300",
    top_3: "bg-semantic-success-soft text-semantic-success border-semantic-success-border",
    "4_10": "bg-semantic-info-soft text-semantic-info border-semantic-info-border",
    "11_30": "bg-semantic-warning-soft text-semantic-warning border-semantic-warning-border",
    not_ranking: "bg-muted text-muted-foreground border-border",
  };
  const labels: Record<string, string> = {
    rank_1: "#1",
    top_3: "Top 3",
    "4_10": "4-10",
    "11_30": "11-30",
    not_ranking: "Not Ranking",
  };
  return (
    <Badge variant="outline" className={styles[bucket]}>
      {labels[bucket]}
    </Badge>
  );
}

function TrafficLight({ status }: { status: "good" | "needs_work" | "poor" | "not_available" }) {
  const colors: Record<string, string> = {
    good: "bg-semantic-success",
    needs_work: "bg-semantic-warning",
    poor: "bg-semantic-danger",
    not_available: "bg-muted-foreground",
  };
  return (
    <span
      className={`inline-block w-3 h-3 rounded-full ${colors[status] || colors.not_available}`}
      title={status.replace("_", " ")}
    />
  );
}

function NotAvailableState({ reason }: { reason?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="not-available-state">
      <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
      <p className="text-lg font-medium text-foreground mb-2">Not Available</p>
      <p className="text-sm text-muted-foreground max-w-md">
        {reason || "This data is currently unavailable. Please try again later."}
      </p>
    </div>
  );
}

function LimitedVisibilityBanner({ reason, steps }: { reason?: string; steps?: string[] }) {
  return (
    <Card className="bg-gold-soft border-gold-border mb-6" data-testid="limited-visibility-banner">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-gold shrink-0 mt-0.5" />
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-foreground">Limited Visibility Report</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {reason || "Technical crawling was blocked or failed. Some sections have limited data."}
              </p>
            </div>
            {steps && steps.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Recommended next steps:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-gold font-bold">{idx + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ExecutiveSummarySection({
  summary,
  keywords,
  authenticated,
  scanId,
  hasCompetitors,
}: {
  summary: Summary;
  keywords?: KeywordData;
  authenticated: boolean;
  scanId?: string;
  hasCompetitors: boolean;
}) {
  const notRankingCount = keywords?.bucket_counts?.not_ranking ?? 0;
  const totalKeywords = keywords?.targets?.length ?? 0;
  const hasSerpIssue = keywords && totalKeywords > 0 && notRankingCount > 0;

  const scrollToRankingSnapshot = () => {
    const el = document.querySelector('[data-testid="section-keywords"]');
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToTopIssues = () => {
    const el = document.querySelector('[data-testid="top-issues-list"]');
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const signupUrl = scanId ? `/signup?scanId=${scanId}` : "/signup";

  return (
    <section data-testid="section-executive-summary" className="space-y-4">
      <div className="flex items-center gap-3">
        <Gauge className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Executive Summary</h2>
      </div>

      {/* Actions CTA Panel */}
      <Card className="border-primary/20 bg-primary/[0.02]" data-testid="actions-panel">
        <CardContent className="py-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-base mb-1">Recommended Actions</h3>
              <p className="text-sm text-muted-foreground">
                {authenticated
                  ? "Apply the fixes below to start improving your rankings."
                  : "Save this report and start fixing issues automatically."}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 shrink-0 print:hidden">
              {authenticated ? (
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-primary to-purple hover:from-primary/90 hover:to-purple/90"
                  style={{ color: "#FFFFFF" }}
                  onClick={scrollToTopIssues}
                  data-testid="cta-apply-fixes"
                >
                  <Wrench className="w-4 h-4 mr-1.5" />
                  Fix Top Issues
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-primary to-purple hover:from-primary/90 hover:to-purple/90"
                  style={{ color: "#FFFFFF" }}
                  onClick={() => { window.location.href = signupUrl; }}
                  data-testid="cta-save-report"
                >
                  <UserPlus className="w-4 h-4 mr-1.5" />
                  Save &amp; Run More Scans
                </Button>
              )}
              {!authenticated && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { window.location.href = "/pricing"; }}
                  data-testid="cta-unlock-full"
                >
                  Unlock Full Report
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => { window.location.href = "/contact"; }}
                data-testid="cta-book-call"
              >
                <Calendar className="w-4 h-4 mr-1.5" />
                Book a Call
              </Button>
            </div>
          </div>
          {/* Print-friendly fallback: render CTAs as text links */}
          <div className="hidden print:block mt-3 text-sm text-muted-foreground space-y-1">
            <p>Next steps: Visit {window.location.origin}/signup to create an account and apply fixes.</p>
            <p>Or book a call at {window.location.origin}/contact</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1 flex flex-col items-center justify-center py-4">
          <p className="text-sm text-muted-foreground mb-4">SEO Health Score</p>
          <HealthScoreRing score={summary.health_score} />
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="pt-6 space-y-6">
            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-semantic-danger" />
                Top Issues
              </h3>
              <div className="space-y-3" data-testid="top-issues-list">
                {/* SERP Not Ranking issue — injected first when data exists */}
                {hasSerpIssue && (
                  <button
                    type="button"
                    onClick={scrollToRankingSnapshot}
                    className="w-full text-left p-3 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100/70 transition-colors cursor-pointer"
                    data-testid="issue-serp-not-ranking"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-medium text-foreground flex items-center gap-1.5">
                        <Target className="w-4 h-4 text-red-500 shrink-0" />
                        Not ranking for high-intent keywords
                      </span>
                      <SeverityBadge severity="high" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      You're not ranking for {notRankingCount} of {totalKeywords} target keywords.
                    </p>
                    {hasCompetitors && (
                      <p className="text-xs text-red-600 mt-1">
                        Competitors are capturing this demand. See the Ranking Snapshot &darr;
                      </p>
                    )}
                  </button>
                )}
                {summary.top_issues.map((issue, idx) => (
                  <div key={idx} className="p-3 bg-semantic-danger-soft border border-semantic-danger-border rounded-lg" data-testid={`issue-${idx}`}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-medium text-foreground">{issue.title}</span>
                      <SeverityBadge severity={issue.severity} />
                    </div>
                    <p className="text-sm text-muted-foreground">{issue.explanation}</p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-semantic-success" />
                Top Opportunities
              </h3>
              <div className="space-y-3">
                {summary.top_opportunities.map((opp, idx) => (
                  <div key={idx} className="p-3 bg-semantic-success-soft border border-semantic-success-border rounded-lg" data-testid={`opportunity-${idx}`}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-medium text-foreground">{opp.title}</span>
                      <Badge variant="outline" className="bg-semantic-success-soft text-semantic-success border-semantic-success-border">
                        {opp.impact}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{opp.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {summary.estimated_opportunity && (
        <Card className="bg-gradient-to-r from-purple-soft to-semantic-info-soft border-purple-border" data-testid="estimated-opportunity">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple" />
              Estimated Opportunity
            </CardTitle>
            <CardDescription>
              Potential monthly gains if issues are addressed (Confidence: {summary.estimated_opportunity.confidence})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 text-center">
              <div>
                <Users className="w-6 h-6 mx-auto mb-2 text-semantic-info" />
                <p className="text-xl font-bold text-foreground" data-testid="opportunity-traffic">
                  {summary.estimated_opportunity.traffic_range_monthly
                    ? `${summary.estimated_opportunity.traffic_range_monthly.min.toLocaleString()} - ${summary.estimated_opportunity.traffic_range_monthly.max.toLocaleString()}`
                    : "N/A"}
                </p>
                <p className="text-sm text-muted-foreground">Monthly Traffic</p>
              </div>
              <div>
                <FileText className="w-6 h-6 mx-auto mb-2 text-semantic-success" />
                <p className="text-xl font-bold text-foreground" data-testid="opportunity-leads">
                  {summary.estimated_opportunity.leads_range_monthly
                    ? `${summary.estimated_opportunity.leads_range_monthly.min} - ${summary.estimated_opportunity.leads_range_monthly.max}`
                    : "N/A"}
                </p>
                <p className="text-sm text-muted-foreground">Monthly Leads</p>
              </div>
              <div>
                <DollarSign className="w-6 h-6 mx-auto mb-2 text-gold" />
                <p className="text-xl font-bold text-foreground" data-testid="opportunity-revenue">
                  {summary.estimated_opportunity.revenue_range_monthly
                    ? `$${summary.estimated_opportunity.revenue_range_monthly.min.toLocaleString()} - $${summary.estimated_opportunity.revenue_range_monthly.max.toLocaleString()}`
                    : "N/A"}
                </p>
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function TopCompetitorsBlock({
  competitors,
  scanId,
}: {
  competitors?: CompetitorData;
  scanId?: string;
}) {
  // Silently omit if no competitor data available
  if (!competitors?.items?.length) return null;

  // Show 3–5 competitor domains, ordered by the existing relevance sort
  const topDomains = competitors.items.slice(0, 5).map((c) => c.domain);
  if (topDomains.length === 0) return null;

  const signupUrl = scanId ? `/signup?scanId=${scanId}` : "/signup";

  return (
    <Card className="border-border" data-testid="top-competitors-block">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">
            Top Competitors
          </h3>
        </div>

        <p className="text-sm text-muted-foreground">
          These sites are currently competing with you for visibility in search
          results.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {topDomains.map((domain, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border"
              data-testid={`top-competitor-${idx}`}
            >
              <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-medium text-foreground truncate">
                {domain}
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground pt-2">
          <a
            href={signupUrl}
            className="underline underline-offset-2 hover:text-foreground transition-colors"
            data-testid="top-competitors-upgrade-link"
          >
            Unlock competitor keyword overlap and ranking comparisons
          </a>
        </p>
      </CardContent>
    </Card>
  );
}

function KeywordSection({ keywords, missingReason }: { keywords?: KeywordData; missingReason?: string }) {
  if (!keywords || !keywords.targets?.length) {
    return (
      <section data-testid="section-keywords" className="space-y-4">
        <div className="flex items-center gap-3">
          <Search className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Keyword Opportunity & Ranking</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <NotAvailableState reason={missingReason} />
          </CardContent>
        </Card>
      </section>
    );
  }

  const totalKeywords = keywords.targets.length;
  const topTenCount = (keywords.bucket_counts.rank_1 || 0) + (keywords.bucket_counts.top_3 || 0) + (keywords.bucket_counts["4_10"] || 0);

  return (
    <section data-testid="section-keywords" className="space-y-4">
      <div className="flex items-center gap-3">
        <Search className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Ranking Snapshot</h2>
      </div>

      <p className="text-muted-foreground">
        <span className="font-semibold text-foreground">{totalKeywords} target keywords</span> identified for your business and location.
      </p>

      {keywords.bucket_counts && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="bg-emerald-50 border-emerald-300">
            <CardContent className="px-3 pt-5 pb-4 flex flex-col items-center justify-center min-h-[90px]">
              <p className="text-3xl font-bold text-emerald-700 leading-none" data-testid="bucket-rank-1">{keywords.bucket_counts.rank_1 || 0}</p>
              <p className="text-xs text-emerald-600 mt-2 font-medium">Ranking #1</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="px-3 pt-5 pb-4 flex flex-col items-center justify-center min-h-[90px]">
              <p className="text-3xl font-bold text-green-700 leading-none" data-testid="bucket-top-3">{keywords.bucket_counts.top_3}</p>
              <p className="text-xs text-green-600 mt-2 font-medium">Top 3</p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="px-3 pt-5 pb-4 flex flex-col items-center justify-center min-h-[90px]">
              <p className="text-3xl font-bold text-blue-700 leading-none" data-testid="bucket-top-10">{topTenCount}</p>
              <p className="text-xs text-blue-600 mt-2 font-medium">Top 10</p>
            </CardContent>
          </Card>
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="px-3 pt-5 pb-4 flex flex-col items-center justify-center min-h-[90px]">
              <p className="text-3xl font-bold text-amber-700 leading-none" data-testid="bucket-11-30">{keywords.bucket_counts["11_30"]}</p>
              <p className="text-xs text-amber-600 mt-2 font-medium">Pos 11-30</p>
            </CardContent>
          </Card>
          <Card className="bg-red-50 border-red-200">
            <CardContent className="px-3 pt-5 pb-4 flex flex-col items-center justify-center min-h-[90px]">
              <p className="text-3xl font-bold text-red-600 leading-none" data-testid="bucket-not-ranking">{keywords.bucket_counts.not_ranking}</p>
              <p className="text-xs text-red-600 mt-2 font-medium">Not Ranking</p>
              <p className="text-[10px] text-red-400 mt-0.5">Biggest Opportunity</p>
            </CardContent>
          </Card>
        </div>
      )}

      {keywords.insight && (
        <p className="text-muted-foreground bg-muted/50 p-4 rounded-lg" data-testid="keywords-insight">
          {keywords.insight}
        </p>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Intent</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>Google Position</TableHead>
                  <TableHead>Ranking</TableHead>
                  <TableHead>Winner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keywords.targets.map((kw, idx) => (
                  <TableRow key={idx} data-testid={`keyword-row-${idx}`} className={kw.current_bucket === "not_ranking" ? "bg-red-50/50" : undefined}>
                    <TableCell className="font-medium">{kw.keyword}</TableCell>
                    <TableCell>
                      <IntentBadge intent={kw.intent} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {kw.volume_range ? `${kw.volume_range.min.toLocaleString()} - ${kw.volume_range.max.toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {kw.position !== null && kw.position !== undefined ? kw.position : "—"}
                    </TableCell>
                    <TableCell>
                      <BucketBadge bucket={kw.current_bucket} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]">
                      {kw.winner_domain || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function TechnicalSection({ technical, missingReason }: { technical?: TechnicalData; missingReason?: string }) {
  const bucketIcons: Record<string, typeof Wrench> = {
    "Indexing & Crawlability": Search,
    "Site Structure & Internal Links": Link2,
    "On-page Basics": FileText,
    "Errors & Warnings": FileWarning,
  };

  if (!technical || !technical.buckets?.length) {
    return (
      <section data-testid="section-technical" className="space-y-4">
        <div className="flex items-center gap-3">
          <Wrench className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Technical SEO Health</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <NotAvailableState reason={missingReason} />
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section data-testid="section-technical" className="space-y-4">
      <div className="flex items-center gap-3">
        <Wrench className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Technical SEO Health</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {technical.buckets.map((bucket, idx) => {
          const Icon = bucketIcons[bucket.name] || Wrench;
          return (
            <Card key={idx} data-testid={`technical-bucket-${idx}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    {bucket.name}
                  </CardTitle>
                  <StatusBadge status={bucket.status} />
                </div>
              </CardHeader>
              <CardContent>
                {bucket.findings?.length > 0 ? (
                  <Accordion type="single" collapsible className="w-full">
                    {bucket.findings.map((finding, fIdx) => (
                      <AccordionItem key={fIdx} value={`finding-${fIdx}`} className="border-b-0">
                        <AccordionTrigger className="py-2 text-sm hover:no-underline">
                          <div className="flex items-center gap-2 text-left">
                            <SeverityBadge severity={finding.severity} />
                            <span>{finding.title}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground pb-3">
                          <p className="mb-2">{finding.detail}</p>
                          {finding.example_urls?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-foreground mb-1">Affected URLs:</p>
                              {finding.example_urls.slice(0, 3).map((url, i) => (
                                <a
                                  key={i}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline block truncate"
                                >
                                  {url}
                                </a>
                              ))}
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <p className="text-sm text-muted-foreground">No issues found</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function PerformanceSection({ performance, missingReason }: { performance?: PerformanceData; missingReason?: string }) {
  if (!performance || !performance.urls?.length) {
    return (
      <section data-testid="section-performance" className="space-y-4">
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Performance & Speed</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <NotAvailableState reason={missingReason} />
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section data-testid="section-performance" className="space-y-4">
      <div className="flex items-center gap-3">
        <Zap className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Performance & Speed</h2>
      </div>

      {performance.global_insight && (
        <p className="text-muted-foreground bg-muted/50 p-4 rounded-lg" data-testid="performance-insight">
          {performance.global_insight}
        </p>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead className="text-center">LCP</TableHead>
                  <TableHead className="text-center">CLS</TableHead>
                  <TableHead className="text-center">INP</TableHead>
                  <TableHead>Overall</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performance.urls.map((item, idx) => (
                  <TableRow key={idx} data-testid={`performance-row-${idx}`}>
                    <TableCell className="font-medium truncate max-w-[200px]">
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                        {item.url}
                      </a>
                    </TableCell>
                    <TableCell className="text-center">
                      <TrafficLight status={item.lcp_status} />
                    </TableCell>
                    <TableCell className="text-center">
                      <TrafficLight status={item.cls_status} />
                    </TableCell>
                    <TableCell className="text-center">
                      <TrafficLight status={item.inp_status} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.overall} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center gap-6 text-sm text-muted-foreground justify-center">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-semantic-success" /> Good
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-semantic-warning" /> Needs Work
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-semantic-danger" /> Poor
        </span>
      </div>
    </section>
  );
}

function AISearchSection({ aiSearch }: { aiSearch: FreeReportData["ai_search"] }) {
  if (!aiSearch) return null;

  const scoreColor = aiSearch.ai_visibility_score >= 70
    ? "text-semantic-success"
    : aiSearch.ai_visibility_score >= 40
    ? "text-semantic-warning"
    : "text-semantic-danger";

  return (
    <section data-testid="section-ai-search" className="space-y-4">
      <div className="flex items-center gap-3">
        <Brain className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">AI Search Readiness</h2>
        <Badge variant="outline" className="text-xs">Beta</Badge>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className={`text-3xl font-bold ${scoreColor}`}>{aiSearch.ai_visibility_score}</div>
              <div className="text-xs text-muted-foreground mt-1">AI Visibility</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground">{aiSearch.structured_data_coverage}</div>
              <div className="text-xs text-muted-foreground mt-1">Structured Data</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground">{aiSearch.entity_coverage}</div>
              <div className="text-xs text-muted-foreground mt-1">Entity Coverage</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-foreground">{aiSearch.llm_answerability}</div>
              <div className="text-xs text-muted-foreground mt-1">LLM Answerability</div>
            </div>
          </div>

          {aiSearch.checklist.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Checklist</h3>
              {aiSearch.checklist.map((item, i) => (
                <div key={i} className="flex items-start gap-3 py-2 border-b last:border-0">
                  {item.status === "pass" ? (
                    <CheckCircle2 className="w-4 h-4 text-semantic-success mt-0.5 shrink-0" />
                  ) : item.status === "warning" ? (
                    <AlertTriangle className="w-4 h-4 text-semantic-warning mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-semantic-danger mt-0.5 shrink-0" />
                  )}
                  <div>
                    <span className="text-sm font-medium">{item.title}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground italic">
        AI Search Optimization analysis is in beta. Scores reflect homepage-only analysis.
      </p>
    </section>
  );
}

function NextStepsSection({ nextSteps, onCtaClick, scanId }: { nextSteps: NextSteps; onCtaClick: (cta: CTA) => void; scanId?: string }) {
  return (
    <section data-testid="section-next-steps" className="space-y-4">
      <div className="flex items-center gap-3">
        <ArrowRight className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">What This Means + Next Steps</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-semantic-danger-soft border-semantic-danger-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-semantic-danger">
              <TrendingDown className="w-4 h-4" />
              If You Do Nothing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {nextSteps.if_do_nothing.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2" data-testid={`do-nothing-${idx}`}>
                  <AlertTriangle className="w-4 h-4 text-semantic-danger mt-0.5 shrink-0" />
                  <span className="text-sm text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-semantic-success-soft border-semantic-success-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-semantic-success">
              <TrendingUp className="w-4 h-4" />
              If You Fix This
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {nextSteps.if_you_fix_this.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2" data-testid={`fix-this-${idx}`}>
                  <CheckCircle2 className="w-4 h-4 text-semantic-success mt-0.5 shrink-0" />
                  <span className="text-sm text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
        <Button
          size="lg"
          className="bg-gradient-to-r from-primary to-purple hover:from-primary/90 hover:to-purple/90 shadow-lg"
          style={{ color: "#FFFFFF" }}
          onClick={() => {
            const signupUrl = scanId ? `/signup?scanId=${scanId}` : '/signup';
            window.location.href = signupUrl;
          }}
          data-testid="cta-signup-primary"
        >
          Unlock Full Automation
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        {nextSteps.ctas
          .filter(cta => cta.id !== "deploy_fixes")
          .map((cta) => (
            <Button
              key={cta.id}
              variant="outline"
              size="lg"
              onClick={() => onCtaClick(cta)}
              data-testid={`cta-${cta.id}`}
            >
              {cta.label}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ))
        }
      </div>
    </section>
  );
}

function ImplementationPlanSection({ plan, onCopy }: { plan?: ImplementationFix[]; onCopy?: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!plan?.length) return null;

  const generatePlanText = () => {
    return plan.map((fix, idx) => `
## ${idx + 1}. ${fix.title}
Priority: ${fix.priority}

### What to Change
${fix.what_to_change}

### Where to Change
${fix.where_to_change}

### Expected Impact
${fix.expected_impact}

### Acceptance Check
${fix.acceptance_check}

---`).join("\n");
  };

  const copyPlan = async () => {
    await navigator.clipboard.writeText(generatePlanText());
    setCopied(true);
    toast.success("Implementation plan copied to clipboard!");
    onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  };

  const printPlan = () => {
    const printContent = `
      <html>
        <head>
          <title>Implementation Plan</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 2rem; line-height: 1.6; max-width: 800px; margin: 0 auto; }
            h1 { color: #1a1a1a; border-bottom: 2px solid #7C3AED; padding-bottom: 0.5rem; }
            h2 { color: #333; margin-top: 2rem; page-break-after: avoid; }
            h3 { color: #555; margin-top: 1rem; font-size: 1rem; }
            .priority { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.875rem; }
            .priority-1 { background: #fee2e2; color: #991b1b; }
            .priority-2 { background: #fef3c7; color: #92400e; }
            .priority-3 { background: #dbeafe; color: #1e40af; }
            p { margin: 0.5rem 0; }
            hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <h1>SEO Implementation Plan</h1>
          ${plan.map((fix, idx) => `
            <h2>${idx + 1}. ${fix.title}</h2>
            <span class="priority priority-${fix.priority <= 2 ? '1' : fix.priority <= 3 ? '2' : '3'}">Priority ${fix.priority}</span>
            <h3>What to Change</h3>
            <p>${fix.what_to_change}</p>
            <h3>Where to Change</h3>
            <p>${fix.where_to_change}</p>
            <h3>Expected Impact</h3>
            <p>${fix.expected_impact}</p>
            <h3>Acceptance Check</h3>
            <p>${fix.acceptance_check}</p>
            <hr />
          `).join("")}
        </body>
      </html>
    `;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <section data-testid="section-implementation-plan" className="print:block">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Implementation Plan (DIY)
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{plan.length} fixes</Badge>
                  {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>
              <CardDescription>Step-by-step guide to fix the identified issues</CardDescription>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="border-t border-border pt-4 space-y-4">
              <div className="flex gap-2 justify-end print:hidden">
                <Button variant="outline" size="sm" onClick={copyPlan} data-testid="btn-copy-plan">
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? "Copied!" : "Copy All"}
                </Button>
                <Button variant="outline" size="sm" onClick={printPlan} data-testid="btn-print-plan">
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
              </div>

              <div className="space-y-4">
                {plan.map((fix, idx) => (
                  <div
                    key={idx}
                    className="p-4 border border-border rounded-lg space-y-3"
                    data-testid={`implementation-fix-${idx}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-sm flex items-center justify-center">
                          {fix.priority}
                        </span>
                        {fix.title}
                      </h4>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium text-foreground mb-1">What to Change</p>
                        <p className="text-muted-foreground">{fix.what_to_change}</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground mb-1">Where to Change</p>
                        <p className="text-muted-foreground">{fix.where_to_change}</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground mb-1">Expected Impact</p>
                        <p className="text-muted-foreground">{fix.expected_impact}</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground mb-1">Acceptance Check</p>
                        <p className="text-muted-foreground">{fix.acceptance_check}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </section>
  );
}

const trackAnalyticsEvent = async (
  eventType: "free_report_cta_clicked" | "free_report_viewed" | "implementation_plan_copied",
  data: { reportId?: string; ctaId?: string; ctaLabel?: string; metadata?: Record<string, unknown> }
) => {
  try {
    await fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventType, ...data }),
    });
  } catch (error) {
    console.error("Failed to track analytics event:", error);
  }
};

export default function FreeReport() {
  const params = useParams<{ reportId: string; shareToken?: string }>();
  const { reportId, shareToken } = params;
  const { authenticated } = useAuth();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [hasTrackedView, setHasTrackedView] = useState(false);

  const apiUrl = shareToken
    ? `/api/report/free/${reportId}/share/${shareToken}`
    : `/api/report/free/${reportId}`;

  const { data: report, isLoading, error } = useQuery<FreeReportData>({
    queryKey: ["free-report", reportId, shareToken],
    queryFn: async () => {
      const res = await fetch(apiUrl);
      if (res.status === 202) {
        // Report is still being generated — throw so react-query retries
        throw new Error("__GENERATING__");
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to load report");
      }
      const data = await res.json();
      if (!data.ok || !data.report) {
        throw new Error(data.message || "Invalid report response");
      }
      const r = data.report;

      // Normalize summary.top_issues and top_opportunities to IssueOpportunity[]
      const normalizeIssue = (item: any): IssueOpportunity => {
        if (typeof item === "string") {
          return { title: item, explanation: "", severity: "medium", impact: "both", mapped_section: "technical" };
        }
        return {
          title: item.title || "Issue",
          explanation: item.explanation || item.description || "",
          severity: item.severity || "medium",
          impact: item.impact || "both",
          mapped_section: item.mapped_section || "technical",
        };
      };
      if (r.summary) {
        r.summary.top_issues = Array.isArray(r.summary.top_issues)
          ? r.summary.top_issues.map(normalizeIssue) : [];
        r.summary.top_opportunities = Array.isArray(r.summary.top_opportunities)
          ? r.summary.top_opportunities.map(normalizeIssue) : [];
      }

      // Normalize next_steps
      if (r.next_steps) {
        if (!Array.isArray(r.next_steps.if_do_nothing)) r.next_steps.if_do_nothing = [];
        if (!Array.isArray(r.next_steps.if_you_fix_this)) r.next_steps.if_you_fix_this = [];
        if (!Array.isArray(r.next_steps.ctas)) r.next_steps.ctas = [];
      }

      // Normalize keyword targets
      if (r.keywords?.targets) {
        r.keywords.targets = r.keywords.targets.map((kw: any) => ({
          ...kw,
          volume_range: kw.volume_range || (kw.volume ? { min: kw.volume, max: kw.volume } : null),
          current_bucket: kw.current_bucket || "not_ranking",
          position: kw.position ?? kw.rank ?? null,
        }));
      }

      // Normalize technical findings
      if (r.technical?.buckets) {
        r.technical.buckets = r.technical.buckets.map((b: any) => ({
          ...b,
          status: b.status === "ok" ? "good" : b.status === "warning" ? "needs_attention" : b.status,
          findings: (b.findings || []).map((f: any) => ({
            ...f,
            detail: f.detail || f.description || "",
            example_urls: f.example_urls || f.evidence || [],
          })),
        }));
      }

      return r as FreeReportData;
    },
    enabled: !!reportId,
    retry: (failureCount, error) => {
      // Keep retrying if still generating, up to 30 attempts (~60s)
      if (error instanceof Error && error.message === "__GENERATING__") return failureCount < 30;
      return failureCount < 2;
    },
    retryDelay: (attempt, error) => {
      if (error instanceof Error && error.message === "__GENERATING__") return 2000;
      return Math.min(1000 * 2 ** attempt, 8000);
    },
  });

  useEffect(() => {
    if (report && reportId && !hasTrackedView) {
      trackAnalyticsEvent("free_report_viewed", { 
        reportId,
        metadata: { 
          websiteDomain: report.inputs?.target_url,
          isSharedView: !!shareToken,
        }
      });
      setHasTrackedView(true);
    }
  }, [report, reportId, shareToken, hasTrackedView]);

  const shareMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/report/free/${reportId}/share`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to create share link");
      return res.json();
    },
    onSuccess: (data) => {
      const url = `${window.location.origin}/report/free/${reportId}/share/${data.share_token}`;
      setShareUrl(url);
      navigator.clipboard.writeText(url);
      setShareCopied(true);
      toast.success("Share link copied to clipboard!");
      setTimeout(() => setShareCopied(false), 3000);
    },
    onError: () => {
      toast.error("Failed to create share link");
    },
  });

  const handleCtaClick = useCallback((cta: CTA) => {
    trackAnalyticsEvent("free_report_cta_clicked", {
      reportId,
      ctaId: cta.id,
      ctaLabel: cta.label,
      metadata: { action: cta.action, target: cta.target },
    });

    if (cta.action === "route") {
      window.location.href = cta.target;
    } else {
      toast.info(`${cta.label} - Coming soon!`);
    }
  }, [reportId]);

  const handleCopyImplementationPlan = useCallback(() => {
    trackAnalyticsEvent("implementation_plan_copied", {
      reportId,
      metadata: { 
        planItemCount: report?.next_steps?.implementation_plan?.length || 0 
      },
    });
  }, [reportId, report]);

  const isGenerating = error instanceof Error && error.message === "__GENERATING__";

  if (isLoading || isGenerating) {
    return (
      <MarketingLayout>
        <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-[60vh]">
          <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
          <p className="text-lg text-muted-foreground">
            {isGenerating ? "Your report is still being generated..." : "Loading report..."}
          </p>
          {isGenerating && (
            <p className="text-sm text-muted-foreground mt-2">This page will refresh automatically.</p>
          )}
        </div>
      </MarketingLayout>
    );
  }

  if (error || !report) {
    return (
      <MarketingLayout>
        <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-[60vh]">
          <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Report Not Found</h1>
          <p className="text-muted-foreground mb-6">
            {error instanceof Error ? error.message : "This report may have expired or doesn't exist."}
          </p>
          <Button onClick={() => (window.location.href = "/")}>
            Run a New Scan
          </Button>
        </div>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      <div className="container mx-auto px-4 md:px-6 py-6 max-w-5xl" id="arclo-report">
        {/* Arclo-branded report header */}
        <div className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-violet-600 via-pink-500 to-amber-500" style={{ color: "#FFFFFF" }}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-3">
              <svg width="36" height="36" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M24 4l19 36h-8l-3.2-6.2H16.2L13 40H5L24 4zm-4.8 23h9.6L24 17.7 19.2 27z" fill="white" />
              </svg>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-bold" style={{ color: "#FFFFFF" }} data-testid="report-title">
                    Arclo Pro — Ranking Snapshot
                  </h1>
                  {report.scan_mode === "light" && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/20" style={{ color: "#FFFFFF" }}>
                      Light Scan
                    </span>
                  )}
                </div>
                <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.8)" }} data-testid="report-url">
                  {report.inputs?.target_url}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                className="bg-white text-violet-700 hover:bg-white/90 border-0 font-medium shadow-sm"
                onClick={() => window.print()}
                data-testid="btn-download-pdf"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
              {!shareToken && (
                <Button
                  size="sm"
                  className="bg-white text-violet-700 hover:bg-white/90 border-0 font-medium shadow-sm"
                  onClick={() => shareMutation.mutate()}
                  disabled={shareMutation.isPending}
                  data-testid="btn-share"
                >
                  {shareMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : shareCopied ? (
                    <Check className="w-4 h-4 mr-2" />
                  ) : (
                    <Share2 className="w-4 h-4 mr-2" />
                  )}
                  {shareCopied ? "Link Copied!" : "Share Report"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {shareUrl && (
          <Card className="mb-6 bg-primary/5 border-primary/20" data-testid="share-url-card">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Info className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground mb-1">Shareable link created:</p>
                <p className="text-sm text-muted-foreground truncate">{shareUrl}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  toast.success("Copied!");
                }}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          {report.visibilityMode === "limited" && (
            <LimitedVisibilityBanner 
              reason={report.limitedVisibilityReason}
              steps={report.limitedVisibilitySteps}
            />
          )}
          
          <ExecutiveSummarySection
            summary={report.summary}
            keywords={report.keywords}
            authenticated={authenticated}
            scanId={report.source_scan_id}
            hasCompetitors={!!report.competitors?.items?.length}
          />

          <TopCompetitorsBlock
            competitors={report.competitors}
            scanId={report.source_scan_id}
          />

          <KeywordSection
            keywords={report.keywords}
            missingReason={report.meta?.missing?.rank_reason}
          />

          {report.visibilityMode !== "limited" && (
            <div className="space-y-1">
              <TechnicalSection
                technical={report.technical}
                missingReason={report.meta?.missing?.technical_reason}
              />
              {report.scan_mode === "light" && (
                <p className="text-xs text-muted-foreground italic pl-1">
                  Light scan — homepage only. Create an account for a full site-wide audit.
                </p>
              )}
            </div>
          )}

          <div className="space-y-1">
            <PerformanceSection
              performance={report.performance}
              missingReason={report.meta?.missing?.performance_reason}
            />
            {report.scan_mode === "light" && (
              <p className="text-xs text-muted-foreground italic pl-1">
                Light scan — homepage only. Upgrade for multi-page performance analysis.
              </p>
            )}
          </div>

          {report.ai_search && (
            <AISearchSection aiSearch={report.ai_search} />
          )}

          <NextStepsSection nextSteps={report.next_steps} onCtaClick={handleCtaClick} scanId={report.source_scan_id} />

          <ImplementationPlanSection plan={report.next_steps?.implementation_plan} onCopy={handleCopyImplementationPlan} />

          {/* Premium Feature Teasers */}
          <section data-testid="section-feature-teasers" className="space-y-4">
            <div className="flex items-center gap-3">
              <Rocket className="w-6 h-6 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">What Arclo Pro Can Do Next</h2>
            </div>
            <p className="text-muted-foreground">
              This snapshot shows where you stand today. Here's how Arclo Pro actively improves your rankings over time:
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="border-primary/20 hover:border-primary/40 transition-colors">
                <CardContent className="pt-4 space-y-1.5">
                  <TrendingUp className="w-8 h-8 text-primary" />
                  <h3 className="font-semibold text-foreground">Automated Ranking Improvement</h3>
                  <p className="text-sm text-muted-foreground">
                    Arclo Pro identifies what's holding your rankings back and deploys targeted fixes — week by week, automatically.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-primary/20 hover:border-primary/40 transition-colors">
                <CardContent className="pt-4 space-y-1.5">
                  <BarChart3 className="w-8 h-8 text-primary" />
                  <h3 className="font-semibold text-foreground">Domain Authority Signals</h3>
                  <p className="text-sm text-muted-foreground">
                    Build and strengthen the backlink and authority signals that Google uses to decide who ranks on page 1.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-primary/20 hover:border-primary/40 transition-colors">
                <CardContent className="pt-4 space-y-1.5">
                  <PenTool className="w-8 h-8 text-primary" />
                  <h3 className="font-semibold text-foreground">Blog Creation</h3>
                  <p className="text-sm text-muted-foreground">
                    SEO-optimized blog content written and published to target the keywords your competitors are winning.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-primary/20 hover:border-primary/40 transition-colors">
                <CardContent className="pt-4 space-y-1.5">
                  <Layout className="w-8 h-8 text-primary" />
                  <h3 className="font-semibold text-foreground">Web Page Creation</h3>
                  <p className="text-sm text-muted-foreground">
                    Generate new landing pages and service pages designed to capture high-intent search traffic in your market.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-primary/20 hover:border-primary/40 transition-colors">
                <CardContent className="pt-4 space-y-1.5">
                  <Brain className="w-8 h-8 text-primary" />
                  <h3 className="font-semibold text-foreground">Learning Model</h3>
                  <p className="text-sm text-muted-foreground">
                    Arclo Pro learns from every ranking change and optimization result, improving its decisions over time for your site.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-primary/20 hover:border-primary/40 transition-colors">
                <CardContent className="pt-4 space-y-1.5">
                  <ShieldAlert className="w-8 h-8 text-primary" />
                  <h3 className="font-semibold text-foreground">Ranking Decay Detection</h3>
                  <p className="text-sm text-muted-foreground">
                    Continuous monitoring detects when rankings start slipping, so fixes are applied before you lose traffic.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Account Creation Transition */}
          <section data-testid="section-account-cta" className="space-y-4">
            <Card className="bg-gradient-to-r from-violet-600 via-pink-500 to-amber-500 border-0" style={{ color: "#FFFFFF" }}>
              <CardContent className="py-10 text-center space-y-4">
                <svg width="40" height="40" viewBox="0 0 48 48" aria-hidden="true" className="mx-auto">
                  <path d="M24 4l19 36h-8l-3.2-6.2H16.2L13 40H5L24 4zm-4.8 23h9.6L24 17.7 19.2 27z" fill="white" />
                </svg>
                <h2 className="text-2xl md:text-3xl font-bold" style={{ color: "#FFFFFF" }}>Ready to Improve These Rankings?</h2>
                <p className="max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.8)" }}>
                  Create your free Arclo Pro account and let us start applying fixes, building authority, and pushing your rankings upward — automatically.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <Button
                    size="lg"
                    className="bg-white text-violet-700 hover:bg-white/90 shadow-lg font-semibold text-base"
                    onClick={() => {
                      const signupUrl = report.source_scan_id
                        ? `/signup?scanId=${report.source_scan_id}`
                        : '/signup';
                      window.location.href = signupUrl;
                    }}
                    data-testid="cta-create-account"
                  >
                    Create Free Account
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>

        {/* Point-in-time snapshot disclaimer + footer */}
        <div className="mt-8 pt-6 border-t border-border text-center space-y-3">
          <div className="bg-muted/50 rounded-lg p-4 max-w-2xl mx-auto" data-testid="snapshot-disclaimer">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Point-in-time snapshot.</span>{" "}
              This report reflects ranking data captured on {new Date(report.created_at).toLocaleDateString()}.
              Google rankings are dynamic and change frequently based on algorithm updates, competitor activity, and content changes.
              For continuous tracking, create an Arclo Pro account.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Powered by Arclo Pro
            {report.report_version > 1 && ` · Version ${report.report_version}`}
          </p>
          <Button
            variant="outline"
            onClick={() => {
              const signupUrl = report.source_scan_id
                ? `/signup?scanId=${report.source_scan_id}`
                : '/signup';
              window.location.href = signupUrl;
            }}
          >
            Run Another Scan
          </Button>
        </div>
      </div>
    </MarketingLayout>
  );
}
