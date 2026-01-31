import {
  Gauge,
  AlertTriangle,
  TrendingUp,
  Users,
  FileText,
  DollarSign,
  Wrench,
  UserPlus,
  Calendar,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HealthScoreRing } from "./HealthScoreRing";
import { SeverityBadge } from "./badges/ReportBadges";
import type { Summary, KeywordData } from "./types";

interface ExecutiveSummaryProps {
  summary: Summary;
  keywords?: KeywordData;
  authenticated: boolean;
  scanId?: string;
  hasCompetitors: boolean;
}

export function ExecutiveSummarySection({ summary, keywords, authenticated, scanId, hasCompetitors }: ExecutiveSummaryProps) {
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
    <section data-testid="section-executive-summary" className="space-y-5">
      {/* Section Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Gauge className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Executive Summary</h2>
      </div>

      {/* Actions CTA Panel */}
      <Card className="border-primary/20 bg-primary/[0.03]" data-testid="actions-panel">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-base mb-0.5">Recommended Actions</h3>
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
          {/* Print-friendly fallback */}
          <div className="hidden print:block mt-3 text-sm text-muted-foreground space-y-1">
            <p>Next steps: Visit {typeof window !== "undefined" ? window.location.origin : ""}/signup to create an account and apply fixes.</p>
            <p>Or book a call at {typeof window !== "undefined" ? window.location.origin : ""}/contact</p>
          </div>
        </CardContent>
      </Card>

      {/* Health Score + Issues Grid */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Health Score Card */}
        <Card className="lg:col-span-1">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <p className="text-sm font-medium text-muted-foreground mb-4">SEO Health Score</p>
            <HealthScoreRing score={summary.health_score} />
            <p className="text-xs text-muted-foreground mt-3">
              {summary.health_score >= 80 ? "Looking strong" : summary.health_score >= 60 ? "Room for improvement" : summary.health_score >= 40 ? "Needs attention" : "Critical issues found"}
            </p>
          </CardContent>
        </Card>

        {/* Issues + Opportunities */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6 space-y-6">
            {/* Top Issues */}
            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-semantic-danger" />
                Top Issues
              </h3>
              <div className="space-y-2.5" data-testid="top-issues-list">
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

            {/* Top Opportunities */}
            <div>
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-semantic-success" />
                Top Opportunities
              </h3>
              <div className="space-y-2.5">
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

      {/* Estimated Opportunity */}
      {summary.estimated_opportunity && (
        <Card className="bg-gradient-to-r from-purple-soft to-semantic-info-soft border-purple-border" data-testid="estimated-opportunity">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple" />
              Estimated Opportunity
            </CardTitle>
            <CardDescription>
              Potential monthly gains if issues are addressed (Confidence: {summary.estimated_opportunity.confidence})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-white/50">
                <Users className="w-5 h-5 mx-auto mb-2 text-semantic-info" />
                <p className="text-xl font-bold text-foreground" data-testid="opportunity-traffic">
                  {summary.estimated_opportunity.traffic_range_monthly
                    ? `${summary.estimated_opportunity.traffic_range_monthly.min.toLocaleString()}-${summary.estimated_opportunity.traffic_range_monthly.max.toLocaleString()}`
                    : "N/A"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Monthly Traffic</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/50">
                <FileText className="w-5 h-5 mx-auto mb-2 text-semantic-success" />
                <p className="text-xl font-bold text-foreground" data-testid="opportunity-leads">
                  {summary.estimated_opportunity.leads_range_monthly
                    ? `${summary.estimated_opportunity.leads_range_monthly.min}-${summary.estimated_opportunity.leads_range_monthly.max}`
                    : "N/A"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Monthly Leads</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-white/50">
                <DollarSign className="w-5 h-5 mx-auto mb-2 text-gold" />
                <p className="text-xl font-bold text-foreground" data-testid="opportunity-revenue">
                  {summary.estimated_opportunity.revenue_range_monthly
                    ? `$${summary.estimated_opportunity.revenue_range_monthly.min.toLocaleString()}-$${summary.estimated_opportunity.revenue_range_monthly.max.toLocaleString()}`
                    : "N/A"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Monthly Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
