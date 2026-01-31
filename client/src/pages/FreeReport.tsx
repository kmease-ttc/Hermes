import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { toast } from "sonner";

// Report section components
import type { FreeReportData, IssueOpportunity, CTA } from "@/components/report/types";
import { trackAnalyticsEvent } from "@/components/report/utils";
import { LimitedVisibilityBanner } from "@/components/report/LimitedVisibilityBanner";
import { ReportHeader } from "@/components/report/ReportHeader";
import { ExecutiveSummarySection } from "@/components/report/ExecutiveSummarySection";
import { CompetitorsSection } from "@/components/report/CompetitorsSection";
import { KeywordSection } from "@/components/report/KeywordSection";
import { TechnicalSection } from "@/components/report/TechnicalSection";
import { PerformanceSection } from "@/components/report/PerformanceSection";
import { AISearchSection } from "@/components/report/AISearchSection";
import { NextStepsSection } from "@/components/report/NextStepsSection";
import { ImplementationPlanSection } from "@/components/report/ImplementationPlanSection";
import { FeatureTeasersSection } from "@/components/report/FeatureTeasersSection";
import { AccountCTASection } from "@/components/report/AccountCTASection";

// ---------------------------------------------------------------------------
// Data normalization helpers
// ---------------------------------------------------------------------------

function normalizeIssue(item: any): IssueOpportunity {
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
}

function normalizeReport(data: any): FreeReportData {
  const r = data.report;

  // Normalize summary
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
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

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

  // ---- Data fetching ----
  const { data: report, isLoading, error } = useQuery<FreeReportData>({
    queryKey: ["free-report", reportId, shareToken],
    queryFn: async () => {
      const res = await fetch(apiUrl);
      if (res.status === 202) throw new Error("__GENERATING__");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to load report");
      }
      const data = await res.json();
      if (!data.ok || !data.report) {
        throw new Error(data.message || "Invalid report response");
      }
      return normalizeReport(data);
    },
    enabled: !!reportId,
    retry: (failureCount, error) => {
      if (error instanceof Error && error.message === "__GENERATING__") return failureCount < 30;
      return failureCount < 2;
    },
    retryDelay: (attempt, error) => {
      if (error instanceof Error && error.message === "__GENERATING__") return 2000;
      return Math.min(1000 * 2 ** attempt, 8000);
    },
  });

  // ---- Analytics ----
  useEffect(() => {
    if (report && reportId && !hasTrackedView) {
      trackAnalyticsEvent("free_report_viewed", {
        reportId,
        metadata: {
          websiteDomain: report.inputs?.target_url,
          isSharedView: !!shareToken,
        },
      });
      setHasTrackedView(true);
    }
  }, [report, reportId, shareToken, hasTrackedView]);

  // ---- Share mutation ----
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

  // ---- Callbacks ----
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
        planItemCount: report?.next_steps?.implementation_plan?.length || 0,
      },
    });
  }, [reportId, report]);

  // ---- Loading state ----
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

  // ---- Error state ----
  if (error || !report) {
    return (
      <MarketingLayout>
        <div className="container mx-auto px-4 py-20 flex flex-col items-center justify-center min-h-[60vh]">
          <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Report Not Found</h1>
          <p className="text-muted-foreground mb-6">
            {error instanceof Error ? error.message : "This report may have expired or doesn't exist."}
          </p>
          <Button onClick={() => (window.location.href = "/")}>Run a New Scan</Button>
        </div>
      </MarketingLayout>
    );
  }

  // ---- Render report ----
  return (
    <MarketingLayout>
      <div className="container mx-auto px-4 md:px-6 py-6 max-w-5xl" id="arclo-report">
        <ReportHeader
          report={report}
          shareToken={shareToken}
          onShare={() => shareMutation.mutate()}
          isSharing={shareMutation.isPending}
          shareUrl={shareUrl}
          shareCopied={shareCopied}
        />

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

          <CompetitorsSection
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
                scanMode={report.scan_mode}
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
              scanMode={report.scan_mode}
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

          <NextStepsSection
            nextSteps={report.next_steps}
            onCtaClick={handleCtaClick}
            scanId={report.source_scan_id}
          />

          <ImplementationPlanSection
            plan={report.next_steps?.implementation_plan}
            onCopy={handleCopyImplementationPlan}
          />

          <FeatureTeasersSection />

          <AccountCTASection scanId={report.source_scan_id} />
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
                : "/signup";
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
