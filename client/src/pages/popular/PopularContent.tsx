import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getCrewMember } from "@/config/agents";
import { useSiteContext } from "@/hooks/useSiteContext";
import { useCrewStatus } from "@/hooks/useCrewStatus";
import { toast } from "sonner";
import {
  CrewDashboardShell,
  type CrewIdentity,
  type InspectorTab,
  type HeaderAction,
  type KpiDescriptor,
} from "@/components/crew-dashboard";
import { CrewPageLayout } from "@/components/crew/CrewPageLayout";
import { KeyMetricsGrid } from "@/components/key-metrics";
import { NoDeadEndsState, TableEmptyState, ChartEmptyState } from "@/components/empty-states";
import type { MetaStatus, RemediationAction } from "@shared/noDeadEnds";
import {
  CanonicalIssue,
  CorroborationCheck,
  RecommendedAction,
  formatDateDisplay,
  normalizeDate,
} from "@shared/canonicalIssues";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingDown,
  TrendingUp,
  Info,
  Activity,
  Users,
  MousePointerClick,
  Eye,
  Play,
  Zap,
  Shield,
  FileText,
  BrainCircuit,
  ListChecks,
  BarChart3,
  Plug,
  Search,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Use crew color from config for consistency

interface PopularKpi {
  id: string;
  label: string;
  value: number | null;
  delta?: number | null;
  deltaLabel?: string;
}

interface PopularDashboardData {
  score: number;
  missionCount: number;
  issues: CanonicalIssue[];
  kpis: PopularKpi[];
  meta: MetaStatus;
}

interface PopularApiResult {
  data: PopularDashboardData | null;
  isPreviewMode: boolean;
  errorStatus: number | null;
}

const MOCK_ISSUES: CanonicalIssue[] = [
  {
    id: "issue-1",
    key: {
      metricFamily: "organic_traffic",
      metric: "ga4_sessions",
      dimension: "all",
      windowStart: "2025-12-28",
      windowEnd: "2025-12-30",
      scope: { crewId: "popular", domain: "example.com" },
    },
    displayTitle: "Organic Traffic (Sessions)",
    severity: "critical",
    status: "confirmed",
    evidence: {
      rawAnomalies: [
        {
          id: "anom-1",
          date: "2025-12-29",
          source: "GA4",
          metric: "sessions",
          dropPercent: -32,
          currentValue: 2450,
          baselineValue: 3600,
          zScore: -4.2,
          severity: "severe",
        },
      ],
      primaryAnomaly: {
        id: "anom-1",
        date: "2025-12-29",
        source: "GA4",
        metric: "sessions",
        dropPercent: -32,
        currentValue: 2450,
        baselineValue: 3600,
        zScore: -4.2,
        severity: "severe",
      },
      confirmedMetrics: {
        confirmedPctChange: -32,
        confirmedCurrentValue: 2450,
        confirmedBaselineValue: 3600,
        confirmedMethod: "vs_prev_7day_avg",
        validatedAt: new Date().toISOString(),
      },
      corroborations: [
        {
          source: "speedster",
          status: "ok",
          checkedAt: new Date().toISOString(),
          summary: "Performance stable",
          degraded: false,
        },
        {
          source: "hemingway",
          status: "ok",
          checkedAt: new Date().toISOString(),
          summary: "No content changes",
          contentChanged: false,
        },
      ],
    },
    confidence: 92,
    aiInterpretation: "Significant drop in organic sessions coincides with algorithm update. Performance and content remain stable, suggesting external ranking factors.",
    recommendedActions: [
      {
        id: "action-1",
        title: "Check Search Console for ranking changes",
        description: "Review position changes for top landing pages",
        priority: 1,
        applicable: true,
        actionType: "investigate",
        targetCrew: "serp_intel",
      },
      {
        id: "action-2",
        title: "Analyze competitor movements",
        description: "Check if competitors gained rankings you lost",
        priority: 2,
        applicable: true,
        actionType: "investigate",
        targetCrew: "competitive_snapshot",
      },
    ],
    detectedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    lastUpdatedAt: new Date().toISOString(),
  },
  {
    id: "issue-2",
    key: {
      metricFamily: "search_clicks",
      metric: "gsc_clicks",
      dimension: "all",
      windowStart: "2025-12-30",
      windowEnd: "2025-12-31",
      scope: { crewId: "popular", domain: "example.com" },
    },
    displayTitle: "Search Clicks",
    severity: "high",
    status: "validating",
    evidence: {
      rawAnomalies: [
        {
          id: "anom-2",
          date: "2025-12-30",
          source: "GSC",
          metric: "clicks",
          dropPercent: -18,
          currentValue: 1200,
          baselineValue: 1460,
          zScore: -3.1,
          severity: "moderate",
        },
      ],
      primaryAnomaly: {
        id: "anom-2",
        date: "2025-12-30",
        source: "GSC",
        metric: "clicks",
        dropPercent: -18,
        currentValue: 1200,
        baselineValue: 1460,
        zScore: -3.1,
        severity: "moderate",
      },
      corroborations: [],
    },
    confidence: 68,
    recommendedActions: [
      {
        id: "action-3",
        title: "Run corroboration checks",
        description: "Gather evidence from other crew members",
        priority: 1,
        applicable: true,
        actionType: "investigate",
      },
    ],
    detectedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    lastUpdatedAt: new Date().toISOString(),
  },
  {
    id: "issue-3",
    key: {
      metricFamily: "organic_traffic",
      metric: "ga4_users",
      dimension: "landing_page",
      windowStart: "2025-12-29",
      windowEnd: "2025-12-29",
      scope: { crewId: "popular", domain: "example.com" },
    },
    displayTitle: "User Traffic (Landing Page)",
    severity: "medium",
    status: "detected",
    evidence: {
      rawAnomalies: [
        {
          id: "anom-3",
          date: "2025-12-29",
          source: "GA4",
          metric: "users",
          dropPercent: -12,
          currentValue: 890,
          baselineValue: 1010,
          zScore: -2.4,
          severity: "mild",
        },
      ],
      primaryAnomaly: {
        id: "anom-3",
        date: "2025-12-29",
        source: "GA4",
        metric: "users",
        dropPercent: -12,
        currentValue: 890,
        baselineValue: 1010,
        zScore: -2.4,
        severity: "mild",
      },
      corroborations: [],
    },
    confidence: 55,
    recommendedActions: [],
    detectedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
  },
];

const MOCK_DASHBOARD_DATA: PopularDashboardData = {
  score: 62,
  missionCount: 3,
  issues: MOCK_ISSUES,
  kpis: [
    { id: "sessions", label: "Sessions (7d)", value: 18420, delta: -8.2, deltaLabel: "vs prev week" },
    { id: "users", label: "Users (7d)", value: 12350, delta: -5.1, deltaLabel: "vs prev week" },
    { id: "clicks", label: "Search Clicks (7d)", value: 8940, delta: -12.3, deltaLabel: "vs prev week" },
    { id: "impressions", label: "Impressions (7d)", value: 142000, delta: 2.1, deltaLabel: "vs prev week" },
  ],
  meta: { status: "ok", reasonCode: "SUCCESS", userMessage: "Data loaded", actions: [] },
};

function getPopularMeta(result: PopularApiResult): MetaStatus {
  if (result.errorStatus === 401 || result.errorStatus === 403) {
    return {
      status: "needs_setup",
      reasonCode: "POPULAR_NOT_CONNECTED",
      userMessage: "Connect Google Analytics and Search Console to see traffic insights",
      developerMessage: "OAuth required for /api/popular endpoints",
      actions: [
        { id: "configure", label: "Connect Google", kind: "route", route: "/settings/integrations", priority: 1 },
        { id: "docs", label: "View Setup Guide", kind: "href", href: "#popular-setup", priority: 2 },
      ],
    };
  }
  if (result.errorStatus) {
    return {
      status: "error",
      reasonCode: "POPULAR_API_ERROR",
      userMessage: "Failed to load analytics data. Please try again.",
      developerMessage: `API returned status ${result.errorStatus}`,
      actions: [
        { id: "retry", label: "Retry", kind: "retry", priority: 1 },
        { id: "view_logs", label: "View Logs", kind: "view_logs", priority: 2 },
      ],
    };
  }
  if (!result.data || (result.data as any).status === "stub") {
    return {
      status: "empty",
      reasonCode: "NO_POPULAR_DATA",
      userMessage: "No analytics data yet. Connect your Google accounts to get started.",
      actions: [
        { id: "connect", label: "Connect Google", kind: "route", route: "/settings/integrations", priority: 1 },
      ],
    };
  }
  return { status: "ok", reasonCode: "SUCCESS", userMessage: "Data loaded", actions: [] };
}

function getEmptyIssuesMeta(): MetaStatus {
  return {
    status: "empty",
    reasonCode: "NO_ISSUES",
    userMessage: "No traffic drops detected. Your analytics look healthy!",
    actions: [
      { id: "run_scan", label: "Run Analysis", kind: "run_scan", priority: 1 },
    ],
  };
}

function getEmptyTrendsMeta(): MetaStatus {
  return {
    status: "empty",
    reasonCode: "NO_TRENDS_DATA",
    userMessage: "Run Popular analysis to start tracking traffic trends over time.",
    actions: [
      { id: "run_scan", label: "Start Analysis", kind: "run_scan", priority: 1 },
    ],
  };
}

function getSeverityColor(severity: CanonicalIssue["severity"]): string {
  switch (severity) {
    case "critical":
      return "bg-semantic-danger-soft border-semantic-danger-border";
    case "high":
      return "bg-semantic-warning-soft border-semantic-warning-border";
    case "medium":
      return "bg-semantic-gold-soft border-semantic-gold-border";
    case "low":
      return "bg-semantic-info-soft border-semantic-info-border";
    default:
      return "bg-muted/50 border-muted";
  }
}

function getSeverityBadgeClass(severity: CanonicalIssue["severity"]): string {
  switch (severity) {
    case "critical":
      return "bg-semantic-danger-soft text-semantic-danger border-semantic-danger-border";
    case "high":
      return "bg-semantic-warning-soft text-semantic-warning border-semantic-warning-border";
    case "medium":
      return "bg-semantic-gold-soft text-semantic-gold border-semantic-gold-border";
    case "low":
      return "bg-semantic-info-soft text-semantic-info border-semantic-info-border";
    default:
      return "";
  }
}

function getSeverityIcon(severity: CanonicalIssue["severity"]) {
  switch (severity) {
    case "critical":
      return <XCircle className="w-4 h-4 text-semantic-danger" />;
    case "high":
      return <AlertTriangle className="w-4 h-4 text-semantic-warning" />;
    case "medium":
      return <AlertTriangle className="w-4 h-4 text-semantic-gold" />;
    case "low":
      return <Info className="w-4 h-4 text-semantic-info" />;
    default:
      return <CheckCircle2 className="w-4 h-4 text-muted-foreground" />;
  }
}

function CorroborationBadge({ check }: { check: CorroborationCheck }) {
  const isPositive = check.status === "ok" && !check.degraded && !check.contentChanged;
  const isPending = check.status === "pending";
  const hasIssue = check.degraded || check.contentChanged;

  const sourceLabels: Record<string, string> = {
    speedster: "Performance",
    hemingway: "Content",
    sentinel: "Decay",
    scotty: "Technical",
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-2 py-1 rounded-md text-xs border",
        isPositive && "bg-semantic-success-soft border-semantic-success-border text-semantic-success",
        isPending && "bg-muted/50 border-muted text-muted-foreground",
        hasIssue && "bg-semantic-danger-soft border-semantic-danger-border text-semantic-danger",
        check.status === "no_data" && "bg-muted/30 border-muted text-muted-foreground",
        check.status === "error" && "bg-semantic-danger-soft border-semantic-danger-border text-semantic-danger"
      )}
    >
      {isPositive && <CheckCircle2 className="w-3 h-3" />}
      {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
      {hasIssue && <AlertTriangle className="w-3 h-3" />}
      {check.status === "no_data" && <Info className="w-3 h-3" />}
      {check.status === "error" && <XCircle className="w-3 h-3" />}
      <span>{sourceLabels[check.source] || check.source}: {check.summary}</span>
    </div>
  );
}

function IssueCard({
  issue,
  onCorroborate,
  onValidate,
  isCorroborating,
  isValidating,
}: {
  issue: CanonicalIssue;
  onCorroborate: (issueId: string) => void;
  onValidate: (issueId: string) => void;
  isCorroborating: boolean;
  isValidating: boolean;
}) {
  const confirmedDrop = issue.evidence.confirmedMetrics?.confirmedPctChange;
  const signalCount = issue.evidence.rawAnomalies.length;
  const dateStr = normalizeDate(issue.evidence.primaryAnomaly.date);
  const displayDate = formatDateDisplay(dateStr);
  const hasCorroborations = issue.evidence.corroborations.length > 0;

  return (
    <div
      className={cn(
        "p-4 rounded-lg border transition-all",
        getSeverityColor(issue.severity)
      )}
      data-testid={`issue-card-${issue.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {getSeverityIcon(issue.severity)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-sm">{issue.displayTitle}</span>
              <Badge variant="outline" className={cn("text-xs capitalize", getSeverityBadgeClass(issue.severity))}>
                {issue.severity}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {issue.status}
              </Badge>
            </div>

            <div className="flex items-center gap-3 text-sm mb-2">
              {confirmedDrop !== undefined && (
                <span className="flex items-center gap-1 text-semantic-danger">
                  <TrendingDown className="w-3 h-3" />
                  {confirmedDrop}% confirmed drop
                </span>
              )}
              <span className="text-muted-foreground">{displayDate}</span>
              <span className="text-muted-foreground">Based on {signalCount} signal{signalCount !== 1 ? "s" : ""}</span>
            </div>

            {hasCorroborations && (
              <div className="flex flex-wrap gap-2 mt-2">
                {issue.evidence.corroborations.map((check, idx) => (
                  <CorroborationBadge key={idx} check={check} />
                ))}
              </div>
            )}

            {issue.aiInterpretation && (
              <p className="text-xs text-muted-foreground mt-2 italic">
                {issue.aiInterpretation}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!hasCorroborations && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onCorroborate(issue.id)}
              disabled={isCorroborating}
              data-testid={`button-corroborate-${issue.id}`}
            >
              {isCorroborating ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Search className="w-3 h-3 mr-1" />
              )}
              Run Check
            </Button>
          )}
          {issue.status === "validating" && (
            <Button
              size="sm"
              onClick={() => onValidate(issue.id)}
              disabled={isValidating}
              data-testid={`button-validate-${issue.id}`}
            >
              {isValidating ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3 h-3 mr-1" />
              )}
              Validate
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function DetectedDropsTab({
  issues,
  onCorroborate,
  onValidate,
  corroboratingId,
  validatingId,
  onAction,
}: {
  issues: CanonicalIssue[];
  onCorroborate: (issueId: string) => void;
  onValidate: (issueId: string) => void;
  corroboratingId: string | null;
  validatingId: string | null;
  onAction?: (action: RemediationAction) => void;
}) {
  if (issues.length === 0) {
    return (
      <TableEmptyState
        meta={getEmptyIssuesMeta()}
        title="No Traffic Drops Detected"
        onAction={onAction}
      />
    );
  }

  const groupedIssues = useMemo(() => {
    const critical = issues.filter(i => i.severity === "critical");
    const high = issues.filter(i => i.severity === "high");
    const medium = issues.filter(i => i.severity === "medium");
    const low = issues.filter(i => i.severity === "low");
    return { critical, high, medium, low };
  }, [issues]);

  const renderGroup = (
    title: string,
    icon: React.ReactNode,
    items: CanonicalIssue[],
    description: string
  ) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="font-semibold text-sm">{title}</h4>
          <Badge variant="secondary" className="text-xs">{items.length}</Badge>
          <span className="text-xs text-muted-foreground ml-auto">{description}</span>
        </div>
        <div className="space-y-2">
          {items.map((issue) => (
            <IssueCard
              key={issue.id}
              issue={issue}
              onCorroborate={onCorroborate}
              onValidate={onValidate}
              isCorroborating={corroboratingId === issue.id}
              isValidating={validatingId === issue.id}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-4">
      {renderGroup(
        "Critical",
        <XCircle className="w-4 h-4 text-semantic-danger" />,
        groupedIssues.critical,
        "Significant drops requiring immediate attention"
      )}
      {renderGroup(
        "High",
        <AlertTriangle className="w-4 h-4 text-semantic-warning" />,
        groupedIssues.high,
        "Notable drops to investigate"
      )}
      {renderGroup(
        "Medium",
        <AlertTriangle className="w-4 h-4 text-semantic-gold" />,
        groupedIssues.medium,
        "Moderate changes to monitor"
      )}
      {renderGroup(
        "Low",
        <Info className="w-4 h-4 text-semantic-info" />,
        groupedIssues.low,
        "Minor fluctuations"
      )}
    </div>
  );
}

function RootCausesTab({ issues }: { issues: CanonicalIssue[] }) {
  const issuesWithInterpretation = issues.filter(i => i.aiInterpretation);

  if (issuesWithInterpretation.length === 0) {
    return (
      <div className="p-8 text-center">
        <BrainCircuit className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground mb-2">No AI interpretations available yet</p>
        <p className="text-xs text-muted-foreground">
          Run corroboration checks on detected issues to generate root cause analysis
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {issuesWithInterpretation.map((issue) => (
        <Card key={issue.id} className="bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <BrainCircuit className="w-5 h-5 text-semantic-warning shrink-0 mt-0.5" />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-semibold text-sm">{issue.displayTitle}</span>
                  <Badge variant="outline" className={cn("text-xs", getSeverityBadgeClass(issue.severity))}>
                    {issue.severity}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {issue.confidence}% confidence
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{issue.aiInterpretation}</p>

                {issue.evidence.corroborations.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Evidence Sources:</p>
                    <div className="flex flex-wrap gap-2">
                      {issue.evidence.corroborations.map((check, idx) => (
                        <CorroborationBadge key={idx} check={check} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ActionsTab({ issues }: { issues: CanonicalIssue[] }) {
  const allActions = useMemo(() => {
    const actions: Array<RecommendedAction & { issueTitle: string; issueSeverity: string }> = [];
    for (const issue of issues) {
      for (const action of issue.recommendedActions) {
        if (action.applicable) {
          actions.push({
            ...action,
            issueTitle: issue.displayTitle,
            issueSeverity: issue.severity,
          });
        }
      }
    }
    return actions.sort((a, b) => a.priority - b.priority);
  }, [issues]);

  if (allActions.length === 0) {
    return (
      <div className="p-8 text-center">
        <ListChecks className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground mb-2">No actions available</p>
        <p className="text-xs text-muted-foreground">
          Investigate detected drops to generate recommended actions
        </p>
      </div>
    );
  }

  const actionTypeIcons: Record<string, React.ReactNode> = {
    investigate: <Search className="w-4 h-4" />,
    fix: <Zap className="w-4 h-4" />,
    monitor: <Eye className="w-4 h-4" />,
    escalate: <AlertTriangle className="w-4 h-4" />,
  };

  return (
    <div className="p-4 space-y-3">
      {allActions.map((action) => (
        <div
          key={action.id}
          className="flex items-start gap-3 p-3 rounded-lg border bg-card/50"
          data-testid={`action-${action.id}`}
        >
          <div className="p-2 rounded-md bg-semantic-warning-soft text-semantic-warning">
            {actionTypeIcons[action.actionType] || <ListChecks className="w-4 h-4" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm">{action.title}</span>
              <Badge variant="outline" className="text-xs">
                Priority {action.priority}
              </Badge>
              {action.targetCrew && (
                <Badge variant="secondary" className="text-xs">
                  → {action.targetCrew}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{action.description}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Related to: <span className="text-foreground">{action.issueTitle}</span>
            </p>
          </div>
          <Button size="sm" variant="outline" data-testid={`button-run-action-${action.id}`}>
            <Play className="w-3 h-3 mr-1" />
            Run
          </Button>
        </div>
      ))}
    </div>
  );
}

function TrendsTab({ onAction }: { onAction?: (action: RemediationAction) => void }) {
  return (
    <ChartEmptyState
      meta={getEmptyTrendsMeta()}
      title="Traffic Trends"
      onAction={onAction}
      height={200}
    />
  );
}

export default function PopularContent() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { siteId } = useSiteContext();
  const [corroboratingId, setCorroboratingId] = useState<string | null>(null);
  const [validatingId, setValidatingId] = useState<string | null>(null);

  const { score: unifiedScore, isRefreshing: crewIsRefreshing, dataUpdatedAt: crewDataUpdatedAt } = useCrewStatus({
    siteId: siteId || 'default',
    crewId: 'popular',
  });

  const crewMember = getCrewMember("google_data_connector");

  const { data: apiResult, isLoading, refetch, isRefetching } = useQuery<PopularApiResult>({
    queryKey: ["popular-dashboard", siteId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/popular/dashboard${siteId ? `?siteId=${siteId}` : ""}`);
        if (!res.ok) {
          return { data: null, isPreviewMode: true, errorStatus: res.status };
        }
        const json = await res.json();
        return { data: json, isPreviewMode: false, errorStatus: null };
      } catch {
        return { data: MOCK_DASHBOARD_DATA, isPreviewMode: true, errorStatus: null };
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: dashboardStats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const corroborateMutation = useMutation({
    mutationFn: async (issueId: string) => {
      setCorroboratingId(issueId);
      const res = await fetch(`/api/popular/issues/${issueId}/corroborate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Corroboration failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Corroboration complete");
      queryClient.invalidateQueries({ queryKey: ["popular-dashboard"] });
    },
    onError: () => {
      toast.error("Failed to run corroboration");
    },
    onSettled: () => {
      setCorroboratingId(null);
    },
  });

  const validateMutation = useMutation({
    mutationFn: async (issueId: string) => {
      setValidatingId(issueId);
      const res = await fetch(`/api/popular/issues/${issueId}/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Validation failed");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Issue validated");
      queryClient.invalidateQueries({ queryKey: ["popular-dashboard"] });
    },
    onError: () => {
      toast.error("Failed to validate issue");
    },
    onSettled: () => {
      setValidatingId(null);
    },
  });

  const data = apiResult?.data || MOCK_DASHBOARD_DATA;
  const meta = apiResult ? getPopularMeta(apiResult) : { status: "ok" as const, reasonCode: "SUCCESS", userMessage: "Data loaded", actions: [] };
  const isPreviewMode = apiResult?.isPreviewMode ?? true;

  const score = typeof data.score === 'object' && data.score !== null ? (data.score as any).value : data.score;
  const issues = data.issues;
  
  // Transform kpis object to array format for display
  const kpisObj = data.kpis as { 
    sessions7d?: number; 
    users7d?: number; 
    clicks7d?: number; 
    impressions7d?: number;
    bounceRate?: number | null;
    conversionRate?: number | null;
    monthlySessions?: number | null;
  } | undefined;
  
  const sessionsTrend = dashboardStats?.organicTraffic?.trend?.slice(-7)?.map((p: { value: number }) => p.value) ?? [];
  const sessionsChange = dashboardStats?.organicTraffic?.change7d ?? null;

  const kpisRaw = kpisObj ? [
    { 
      id: "sessions", 
      label: "Sessions (7d)", 
      value: kpisObj.sessions7d ?? 0, 
      delta: sessionsChange, 
      deltaLabel: "vs prev week",
      sparklineData: sessionsTrend.length > 1 ? sessionsTrend : undefined,
      trendIsGood: "up" as const,
    },
    { 
      id: "users", 
      label: "Users (7d)", 
      value: kpisObj.users7d ?? 0, 
      delta: undefined, 
      deltaLabel: undefined,
      trendIsGood: "up" as const,
    },
    { 
      id: "clicks", 
      label: "Clicks (7d)", 
      value: kpisObj.clicks7d ?? 0, 
      delta: undefined, 
      deltaLabel: undefined,
      trendIsGood: "up" as const,
    },
    { 
      id: "impressions", 
      label: "Impressions (7d)", 
      value: kpisObj.impressions7d ?? 0, 
      delta: undefined, 
      deltaLabel: undefined,
      trendIsGood: "up" as const,
    },
    { 
      id: "bounceRate", 
      label: "Bounce Rate", 
      value: kpisObj.bounceRate != null ? `${kpisObj.bounceRate.toFixed(1)}%` : "—", 
      delta: undefined, 
      deltaLabel: undefined, 
      isMissing: kpisObj.bounceRate == null,
      trendIsGood: "down" as const,
    },
    { 
      id: "conversionRate", 
      label: "Conversion Rate", 
      value: kpisObj.conversionRate != null ? `${kpisObj.conversionRate.toFixed(2)}%` : "—", 
      delta: undefined, 
      deltaLabel: undefined, 
      isMissing: kpisObj.conversionRate == null,
      trendIsGood: "up" as const,
    },
    { 
      id: "monthlySessions", 
      label: "Monthly Sessions", 
      value: kpisObj.monthlySessions != null ? kpisObj.monthlySessions.toLocaleString() : "—", 
      delta: undefined, 
      deltaLabel: undefined, 
      isMissing: kpisObj.monthlySessions == null,
      trendIsGood: "up" as const,
    },
  ] : [];

  const crewIdentity: CrewIdentity = {
    crewId: "popular",
    crewName: crewMember.nickname,
    subtitle: crewMember.role,
    description: crewMember.blurb || "Monitors traffic, conversions, and analytics signals.",
    avatar: (
      <img
        src={crewMember.avatar}
        alt={crewMember.nickname}
        className="w-8 h-8 object-contain"
      />
    ),
    accentColor: crewMember.color,
    capabilities: crewMember.capabilities || ["GA4 Data", "GSC Data", "Traffic Metrics"],
    monitors: ["Sessions", "Users", "Search Clicks", "Impressions"],
  };

  const kpis: KpiDescriptor[] = kpisRaw.map((kpi) => ({
    id: kpi.id,
    label: kpi.label,
    value: kpi.value,
    delta: kpi.delta,
    deltaLabel: kpi.deltaLabel,
    deltaIsGood: kpi.trendIsGood === "up" ? Number(kpi.delta) > 0 : Number(kpi.delta) < 0,
    sparklineData: (kpi as any).sparklineData,
    trendIsGood: kpi.trendIsGood,
    icon:
      kpi.id === "sessions" ? <Activity className="w-4 h-4" /> :
      kpi.id === "users" ? <Users className="w-4 h-4" /> :
      kpi.id === "clicks" ? <MousePointerClick className="w-4 h-4" /> :
      kpi.id === "bounceRate" ? <TrendingDown className="w-4 h-4" /> :
      kpi.id === "conversionRate" ? <TrendingUp className="w-4 h-4" /> :
      kpi.id === "monthlySessions" ? <BarChart3 className="w-4 h-4" /> :
      <Eye className="w-4 h-4" />,
  }));

  const handleAction = (action: RemediationAction) => {
    if (action.kind === "route" && action.route) {
      navigate(action.route);
    } else if (action.kind === "href" && action.href) {
      window.open(action.href, "_blank");
    } else if (action.kind === "retry") {
      refetch();
    } else if (action.kind === "run_scan") {
      toast.info("Running analysis...");
      refetch();
    }
  };

  const headerActions: HeaderAction[] = [
    {
      id: "refresh",
      icon: <RefreshCw className="w-4 h-4" />,
      tooltip: "Refresh data",
      onClick: () => refetch(),
      loading: isRefetching,
    },
  ];

  const inspectorTabs: InspectorTab[] = [
    {
      id: "drops",
      label: "Detected Drops",
      icon: <TrendingDown className="w-4 h-4" />,
      badge: issues.length > 0 ? issues.length : undefined,
      content: (
        <DetectedDropsTab
          issues={issues}
          onCorroborate={(id) => corroborateMutation.mutate(id)}
          onValidate={(id) => validateMutation.mutate(id)}
          corroboratingId={corroboratingId}
          validatingId={validatingId}
          onAction={handleAction}
        />
      ),
    },
    {
      id: "causes",
      label: "Root Causes",
      icon: <BrainCircuit className="w-4 h-4" />,
      content: <RootCausesTab issues={issues} />,
    },
    {
      id: "actions",
      label: "Actions",
      icon: <ListChecks className="w-4 h-4" />,
      badge: autoFixableCount > 0 ? autoFixableCount : undefined,
      content: <ActionsTab issues={issues} />,
    },
    {
      id: "trends",
      label: "Trends",
      icon: <BarChart3 className="w-4 h-4" />,
      content: <TrendsTab onAction={handleAction} />,
    },
  ];

  if (meta.status !== "ok" && meta.status !== "empty") {
    return (
      <CrewPageLayout crewId="popular">
        <div className="p-6">
          <NoDeadEndsState
            meta={meta}
            title="Popular Dashboard"
            onAction={handleAction}
            isLoading={isLoading}
          />
        </div>
      </CrewPageLayout>
    );
  }

  return (
    <CrewPageLayout crewId="popular">
      <TooltipProvider>
        <CrewDashboardShell
          crew={crewIdentity}
          agentScore={score}
          agentScoreTooltip="Traffic health score based on analytics trends"
          kpis={kpis}
          inspectorTabs={inspectorTabs}
          headerActions={headerActions}
          onRefresh={() => refetch()}
          isRefreshing={isRefetching || crewIsRefreshing}
          dataUpdatedAt={crewDataUpdatedAt}
        />
      </TooltipProvider>
    </CrewPageLayout>
  );
}
