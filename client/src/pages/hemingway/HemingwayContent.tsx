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
} from "@/components/crew-dashboard";
import { KeyMetricsGrid } from "@/components/key-metrics";
import { CrewPageLayout } from "@/components/crew/CrewPageLayout";
import { NoDeadEndsState, TableEmptyState, ChartEmptyState } from "@/components/empty-states";
import type { MetaStatus, RemediationAction } from "@shared/noDeadEnds";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Zap,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Info,
  Search,
  BarChart3,
  BookOpen,
  Shield,
  User,
  PenTool,
  Settings,
  Play,
  Sparkles,
  Plug,
} from "lucide-react";
import { cn } from "@/lib/utils";

const HEMINGWAY_ACCENT_COLOR = "#0EA5E9";

interface ContentQualityMetrics {
  contentQualityScore: number;
  readabilityGrade: number;
  pagesNeedingImprovement: number;
  eeatCoverage: number;
  lastScanAt: string | null;
  isConfigured: boolean;
}

interface PageFinding {
  id: string;
  url: string;
  title: string;
  primaryKeyword: string;
  readabilityGrade: number;
  qualityScore: number;
  severity: "critical" | "warning" | "minor";
  issueTags: string[];
  recommendedAction: string;
  fixable: boolean;
  fixType: "auto" | "advisory";
  fixAction?: string;
}

interface QualityBreakdown {
  readabilityDistribution: { range: string; count: number }[];
  qualityScoreDistribution: { range: string; count: number; color: string }[];
  commonIssues: { issue: string; percent: number }[];
}

interface TrendDataPoint {
  date: string;
  avgQualityScore: number;
  avgReadabilityGrade: number;
  pagesImproved: number;
  pagesRegressed: number;
  eeatCoverage: number;
}

interface HemingwayData {
  metrics: ContentQualityMetrics;
  findings: PageFinding[];
  breakdown: QualityBreakdown;
  trends: TrendDataPoint[];
}

interface HemingwayApiResult {
  data: HemingwayData | null;
  isPreviewMode: boolean;
  errorStatus: number | null;
}

const MOCK_HEMINGWAY_DATA: HemingwayData = {
  metrics: {
    contentQualityScore: 72,
    readabilityGrade: 9.2,
    pagesNeedingImprovement: 7,
    eeatCoverage: 68,
    lastScanAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    isConfigured: true,
  },
  findings: [
    {
      id: "1",
      url: "/blog/mental-health-guide",
      title: "Complete Mental Health Guide",
      primaryKeyword: "mental health guide",
      readabilityGrade: 14.2,
      qualityScore: 45,
      severity: "critical",
      issueTags: ["too complex", "weak E-E-A-T", "missing citations"],
      recommendedAction: "Simplify language, add expert quotes and citations",
      fixable: true,
      fixType: "advisory",
      fixAction: "queue_improvement",
    },
    {
      id: "2",
      url: "/services/therapy-options",
      title: "Therapy Options Overview",
      primaryKeyword: "therapy options",
      readabilityGrade: 12.8,
      qualityScore: 52,
      severity: "critical",
      issueTags: ["too complex", "thin content", "poor structure"],
      recommendedAction: "Expand content and improve heading structure",
      fixable: true,
      fixType: "auto",
      fixAction: "fix_structure",
    },
    {
      id: "3",
      url: "/blog/anxiety-symptoms",
      title: "Understanding Anxiety Symptoms",
      primaryKeyword: "anxiety symptoms",
      readabilityGrade: 10.5,
      qualityScore: 64,
      severity: "warning",
      issueTags: ["passive voice", "missing author info"],
      recommendedAction: "Add author bio and reduce passive voice",
      fixable: true,
      fixType: "auto",
      fixAction: "fix_clarity",
    },
    {
      id: "4",
      url: "/resources/coping-strategies",
      title: "Coping Strategies for Stress",
      primaryKeyword: "coping strategies",
      readabilityGrade: 11.2,
      qualityScore: 61,
      severity: "warning",
      issueTags: ["long sentences", "missing headings"],
      recommendedAction: "Break up long sentences and add subheadings",
      fixable: true,
      fixType: "auto",
      fixAction: "fix_structure",
    },
    {
      id: "5",
      url: "/blog/depression-treatment",
      title: "Depression Treatment Options",
      primaryKeyword: "depression treatment",
      readabilityGrade: 9.8,
      qualityScore: 68,
      severity: "warning",
      issueTags: ["missing citations", "weak E-E-A-T"],
      recommendedAction: "Add research citations and expert endorsements",
      fixable: true,
      fixType: "advisory",
      fixAction: "queue_improvement",
    },
    {
      id: "6",
      url: "/about/our-approach",
      title: "Our Therapeutic Approach",
      primaryKeyword: "therapeutic approach",
      readabilityGrade: 8.5,
      qualityScore: 75,
      severity: "minor",
      issueTags: ["passive voice"],
      recommendedAction: "Minor rewrite to reduce passive voice",
      fixable: true,
      fixType: "auto",
      fixAction: "fix_clarity",
    },
    {
      id: "7",
      url: "/blog/wellness-tips",
      title: "Daily Wellness Tips",
      primaryKeyword: "wellness tips",
      readabilityGrade: 7.8,
      qualityScore: 78,
      severity: "minor",
      issueTags: ["missing author info"],
      recommendedAction: "Add author bio section",
      fixable: true,
      fixType: "auto",
      fixAction: "fix_author",
    },
  ],
  breakdown: {
    readabilityDistribution: [
      { range: "Grade 1-6", count: 12 },
      { range: "Grade 7-8", count: 28 },
      { range: "Grade 9-11", count: 35 },
      { range: "Grade 12+", count: 15 },
    ],
    qualityScoreDistribution: [
      { range: "0-59 (Poor)", count: 8, color: "#EF4444" },
      { range: "60-79 (Fair)", count: 24, color: "#F59E0B" },
      { range: "80-100 (Good)", count: 58, color: "#22C55E" },
    ],
    commonIssues: [
      { issue: "Long sentences (>25 words)", percent: 42 },
      { issue: "Passive voice overuse", percent: 38 },
      { issue: "Missing headings", percent: 25 },
      { issue: "Missing author info", percent: 22 },
      { issue: "Missing citations", percent: 18 },
    ],
  },
  trends: [
    { date: "2025-12-27", avgQualityScore: 68, avgReadabilityGrade: 10.2, pagesImproved: 2, pagesRegressed: 1, eeatCoverage: 62 },
    { date: "2025-12-28", avgQualityScore: 69, avgReadabilityGrade: 10.0, pagesImproved: 3, pagesRegressed: 0, eeatCoverage: 64 },
    { date: "2025-12-29", avgQualityScore: 70, avgReadabilityGrade: 9.8, pagesImproved: 2, pagesRegressed: 1, eeatCoverage: 65 },
    { date: "2025-12-30", avgQualityScore: 71, avgReadabilityGrade: 9.5, pagesImproved: 4, pagesRegressed: 1, eeatCoverage: 66 },
    { date: "2025-12-31", avgQualityScore: 71, avgReadabilityGrade: 9.4, pagesImproved: 1, pagesRegressed: 0, eeatCoverage: 67 },
    { date: "2026-01-01", avgQualityScore: 72, avgReadabilityGrade: 9.3, pagesImproved: 2, pagesRegressed: 0, eeatCoverage: 68 },
    { date: "2026-01-02", avgQualityScore: 72, avgReadabilityGrade: 9.2, pagesImproved: 1, pagesRegressed: 1, eeatCoverage: 68 },
  ],
};

function getHemingwayMeta(result: HemingwayApiResult): MetaStatus {
  if (result.errorStatus === 401 || result.errorStatus === 403) {
    return {
      status: "needs_setup",
      reasonCode: "HEMINGWAY_WORKER_NOT_CONNECTED",
      userMessage: "Connect Hemingway worker to see content quality insights",
      developerMessage: "API key required for /api/hemingway/data endpoint",
      actions: [
        { id: "configure", label: "Configure Hemingway", kind: "route", route: "/settings/integrations", priority: 1 },
        { id: "docs", label: "View Setup Guide", kind: "href", href: "#hemingway-setup", priority: 2 },
      ],
    };
  }
  if (result.errorStatus) {
    return {
      status: "error",
      reasonCode: "HEMINGWAY_API_ERROR",
      userMessage: "Failed to load content quality data. Please try again.",
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
      reasonCode: "NO_HEMINGWAY_DATA",
      userMessage: "No content quality data yet. Run a Hemingway scan to get started.",
      actions: [
        { id: "run_scan", label: "Run Content Analysis", kind: "run_scan", priority: 1 },
      ],
    };
  }
  return { status: "ok", reasonCode: "SUCCESS", userMessage: "Data loaded", actions: [] };
}

function getEmptyFindingsMeta(): MetaStatus {
  return {
    status: "empty",
    reasonCode: "NO_FINDINGS",
    userMessage: "All content meets quality standards. Run analysis to check for new issues.",
    actions: [
      { id: "run_scan", label: "Run Analysis", kind: "run_scan", priority: 1 },
    ],
  };
}

function getEmptyTrendsMeta(): MetaStatus {
  return {
    status: "empty",
    reasonCode: "NO_TRENDS_DATA",
    userMessage: "Run Hemingway analysis to start tracking quality trends over time.",
    actions: [
      { id: "run_scan", label: "Start Analysis", kind: "run_scan", priority: 1 },
    ],
  };
}

function getSeverityColor(severity: "critical" | "warning" | "minor"): string {
  switch (severity) {
    case "critical":
      return "bg-semantic-danger-soft border-semantic-danger-border";
    case "warning":
      return "bg-semantic-warning-soft border-semantic-warning-border";
    case "minor":
      return "bg-semantic-info-soft border-semantic-info-border";
    default:
      return "bg-muted/50 border-muted";
  }
}

function getSeverityIcon(severity: "critical" | "warning" | "minor") {
  switch (severity) {
    case "critical":
      return <XCircle className="w-4 h-4 text-semantic-danger" />;
    case "warning":
      return <AlertTriangle className="w-4 h-4 text-semantic-warning" />;
    case "minor":
      return <Info className="w-4 h-4 text-semantic-info" />;
    default:
      return <CheckCircle2 className="w-4 h-4 text-muted-foreground" />;
  }
}

function getSeverityBadge(severity: "critical" | "warning" | "minor") {
  const variants = {
    critical: "bg-semantic-danger-soft text-semantic-danger border-semantic-danger-border",
    warning: "bg-semantic-warning-soft text-semantic-warning border-semantic-warning-border",
    minor: "bg-semantic-info-soft text-semantic-info border-semantic-info-border",
  };
  return variants[severity] || "";
}

function PagesNeedingImprovementTable({ 
  findings, 
  onFix,
  fixingIssueId,
  onAction,
}: { 
  findings: PageFinding[]; 
  onFix: (finding: PageFinding) => void;
  fixingIssueId: string | null;
  onAction?: (action: RemediationAction) => void;
}) {
  const groupedFindings = useMemo(() => {
    const critical = findings.filter(f => f.severity === "critical");
    const warning = findings.filter(f => f.severity === "warning");
    const minor = findings.filter(f => f.severity === "minor");
    return { critical, warning, minor };
  }, [findings]);

  const renderGroup = (
    title: string, 
    icon: React.ReactNode, 
    items: PageFinding[], 
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
          {items.map((finding) => (
            <div
              key={finding.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                getSeverityColor(finding.severity)
              )}
              data-testid={`finding-${finding.id}`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {getSeverityIcon(finding.severity)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-sm truncate">{finding.title}</span>
                    <Badge variant="outline" className="text-xs">
                      Quality: {finding.qualityScore}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Grade: {finding.readabilityGrade}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{finding.url}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">Keyword:</span>
                    <Badge variant="secondary" className="text-xs">{finding.primaryKeyword}</Badge>
                    {finding.issueTags.slice(0, 3).map((tag) => (
                      <Badge 
                        key={tag} 
                        variant="outline" 
                        className={cn("text-xs", getSeverityBadge(finding.severity))}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{finding.recommendedAction}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4 shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    <p className="text-sm">View page</p>
                  </TooltipContent>
                </Tooltip>
                {finding.fixable ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant={finding.fixType === "auto" ? "default" : "outline"}
                        onClick={() => onFix(finding)}
                        disabled={fixingIssueId === finding.id}
                        data-testid={`button-fix-${finding.id}`}
                      >
                        {fixingIssueId === finding.id ? (
                          <>
                            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                            {finding.fixType === "auto" ? "Fixing..." : "Reviewing..."}
                          </>
                        ) : finding.fixType === "auto" ? (
                          <>
                            <Zap className="w-3 h-3 mr-1" />
                            Fix
                          </>
                        ) : (
                          <>
                            <PenTool className="w-3 h-3 mr-1" />
                            Review
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs font-medium mb-1">
                        {finding.fixType === "auto" ? "Auto-Fix Available" : "Advisory Review"}
                      </p>
                      <p className="text-xs">
                        {finding.fixType === "auto" 
                          ? "One-click fix for structure, headings, and clarity issues" 
                          : "Manual review needed for tone, expertise depth, and E-E-A-T signals"}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Badge variant="secondary" className="text-xs">Advisory</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (findings.length === 0) {
    return (
      <TableEmptyState
        meta={getEmptyFindingsMeta()}
        title="All Content Meets Quality Standards"
        onAction={onAction}
      />
    );
  }

  return (
    <div className="space-y-6">
      {renderGroup(
        "Critical",
        <XCircle className="w-4 h-4 text-semantic-danger" />,
        groupedFindings.critical,
        "Quality score <60 or Grade >11 - fix immediately"
      )}
      {renderGroup(
        "Warning",
        <AlertTriangle className="w-4 h-4 text-semantic-warning" />,
        groupedFindings.warning,
        "Quality 60-79 or Grade 9-11"
      )}
      {renderGroup(
        "Minor",
        <Info className="w-4 h-4 text-semantic-info" />,
        groupedFindings.minor,
        "Small improvements possible"
      )}
    </div>
  );
}

function TrendChart({ 
  data, 
  dataKey, 
  label, 
  color,
  isGradeBased = false,
  onAction,
}: { 
  data: any[]; 
  dataKey: string; 
  label: string; 
  color: string;
  isGradeBased?: boolean;
  onAction?: (action: RemediationAction) => void;
}) {
  if (!data || data.length === 0) {
    return (
      <ChartEmptyState
        meta={getEmptyTrendsMeta()}
        title={label}
        onAction={onAction}
        height={120}
      />
    );
  }
  
  const values = data.map(d => d[dataKey] ?? 0);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const latest = values[values.length - 1];
  const previous = values.length > 1 ? values[values.length - 2] : latest;
  const trend = latest - previous;
  const trendIsGood = isGradeBased ? trend < 0 : trend > 0;

  return (
    <div className="p-4 rounded-lg border bg-card/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1">
          {values.length > 1 && trend !== 0 && (
            <>
              {trendIsGood ? (
                <TrendingUp className="w-3 h-3 text-semantic-success" />
              ) : (
                <TrendingDown className="w-3 h-3 text-semantic-danger" />
              )}
              <span className={cn(
                "text-xs font-medium",
                trendIsGood ? "text-semantic-success" : "text-semantic-danger"
              )}>
                {trend > 0 ? "+" : ""}{trend.toFixed(1)}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="text-2xl font-bold mb-3">
        {typeof latest === 'number' ? latest.toFixed(1) : latest}
        {dataKey.includes("Coverage") && "%"}
      </div>
      <div className="flex items-end gap-1 h-12">
        {values.map((value, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm transition-all hover:opacity-80"
            style={{
              height: `${((value - min) / range) * 100}%`,
              minHeight: "4px",
              backgroundColor: color,
            }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-muted-foreground">{data[0]?.date?.slice(5) || ""}</span>
        <span className="text-xs text-muted-foreground">{data[data.length - 1]?.date?.slice(5) || ""}</span>
      </div>
    </div>
  );
}

function DualBarChart({ 
  data, 
  dataKey1, 
  dataKey2, 
  label1, 
  label2, 
  color1, 
  color2, 
  title,
  onAction,
}: {
  data: any[];
  dataKey1: string;
  dataKey2: string;
  label1: string;
  label2: string;
  color1: string;
  color2: string;
  title: string;
  onAction?: (action: RemediationAction) => void;
}) {
  if (!data || data.length === 0) {
    return (
      <ChartEmptyState
        meta={getEmptyTrendsMeta()}
        title={title}
        onAction={onAction}
        height={120}
      />
    );
  }
  
  const latest1 = data[data.length - 1]?.[dataKey1] ?? 0;
  const latest2 = data[data.length - 1]?.[dataKey2] ?? 0;
  const allValues = data.flatMap(d => [d[dataKey1] ?? 0, d[dataKey2] ?? 0]);
  const max = Math.max(...allValues, 1);

  return (
    <div className="p-4 rounded-lg border bg-card/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{title}</span>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color1 }} />
            {label1}: {latest1}
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color2 }} />
            {label2}: {latest2}
          </span>
        </div>
      </div>
      <div className="flex items-end gap-1 h-20">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex gap-0.5">
            <div
              className="flex-1 rounded-sm transition-all hover:opacity-80"
              style={{
                height: `${((d[dataKey1] ?? 0) / max) * 100}%`,
                minHeight: d[dataKey1] > 0 ? "4px" : "0",
                backgroundColor: color1,
              }}
            />
            <div
              className="flex-1 rounded-sm transition-all hover:opacity-80"
              style={{
                height: `${((d[dataKey2] ?? 0) / max) * 100}%`,
                minHeight: d[dataKey2] > 0 ? "4px" : "0",
                backgroundColor: color2,
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-muted-foreground">{data[0]?.date?.slice(5) || ""}</span>
        <span className="text-xs text-muted-foreground">{data[data.length - 1]?.date?.slice(5) || ""}</span>
      </div>
    </div>
  );
}

function DistributionBar({ 
  data, 
  title 
}: { 
  data: { range: string; count: number; color?: string }[]; 
  title: string;
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  const defaultColors = ["#3B82F6", "#22C55E", "#F59E0B", "#EF4444"];

  return (
    <div className="p-4 rounded-lg border bg-card/50">
      <span className="text-sm text-muted-foreground">{title}</span>
      <div className="flex h-6 rounded-lg overflow-hidden mt-3 mb-2">
        {data.map((d, i) => (
          <div
            key={d.range}
            className="transition-all hover:opacity-80"
            style={{
              width: `${(d.count / total) * 100}%`,
              backgroundColor: d.color || defaultColors[i % defaultColors.length],
            }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 mt-2">
        {data.map((d, i) => (
          <div key={d.range} className="flex items-center gap-1.5 text-xs">
            <span 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: d.color || defaultColors[i % defaultColors.length] }} 
            />
            <span className="text-muted-foreground">{d.range}</span>
            <span className="font-medium">{d.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function IssuesBreakdown({ issues }: { issues: { issue: string; percent: number }[] }) {
  return (
    <div className="p-4 rounded-lg border bg-card/50">
      <span className="text-sm text-muted-foreground">Common Issues Breakdown</span>
      <div className="space-y-3 mt-4">
        {issues.map((item) => (
          <div key={item.issue} className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-foreground">{item.issue}</span>
              <span className="text-muted-foreground">{item.percent}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${item.percent}%`,
                  backgroundColor: HEMINGWAY_ACCENT_COLOR,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HemingwayContent() {
  const crew = getCrewMember("content_generator");
  const { activeSite } = useSiteContext();
  const siteId = activeSite?.id || "default";
  const { score: unifiedScore, isRefreshing: crewIsRefreshing, dataUpdatedAt: crewDataUpdatedAt } = useCrewStatus({ siteId, crewId: 'hemingway' });
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [fixingIssue, setFixingIssue] = useState<string | null>(null);

  const { data: apiResult, isLoading, refetch, isRefetching } = useQuery<HemingwayApiResult>({
    queryKey: ["hemingway-data", siteId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/hemingway/data?site_id=${siteId}`);
        if (res.status === 401 || res.status === 403) {
          return { data: MOCK_HEMINGWAY_DATA, isPreviewMode: true, errorStatus: res.status };
        }
        if (!res.ok) {
          return { data: MOCK_HEMINGWAY_DATA, isPreviewMode: true, errorStatus: res.status };
        }
        const jsonData = await res.json();
        if (!jsonData || (jsonData as any).status === "stub") {
          return { data: MOCK_HEMINGWAY_DATA, isPreviewMode: true, errorStatus: null };
        }
        return { data: jsonData, isPreviewMode: false, errorStatus: null };
      } catch {
        return { data: MOCK_HEMINGWAY_DATA, isPreviewMode: true, errorStatus: 500 };
      }
    },
    refetchInterval: 60000,
  });

  const analyzeContentMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/hemingway/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId }),
      });
      if (!res.ok) throw new Error("Failed to start analysis");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Content quality analysis started");
      queryClient.invalidateQueries({ queryKey: ["hemingway-data"] });
    },
    onError: () => {
      toast.error("Failed to start analysis");
    },
  });

  const identifyWeakPagesMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/hemingway/identify-weak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId }),
      });
      if (!res.ok) throw new Error("Failed to identify weak pages");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Weak pages identified");
      queryClient.invalidateQueries({ queryKey: ["hemingway-data"] });
    },
    onError: () => {
      toast.error("Failed to identify weak pages");
    },
  });

  const improveContentMutation = useMutation({
    mutationFn: async (finding?: PageFinding) => {
      if (finding) {
        setFixingIssue(finding.id);
      }
      const res = await fetch(`/api/hemingway/improve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          site_id: siteId,
          finding_id: finding?.id,
          url: finding?.url,
          fix_action: finding?.fixAction,
          bulk: !finding,
        }),
      });
      if (!res.ok) throw new Error("Failed to queue improvement");
      return res.json();
    },
    onSuccess: (_, finding) => {
      if (finding) {
        toast.success(`Queued improvement for: ${finding.title}`);
      } else {
        toast.success("Bulk improvements queued");
      }
      queryClient.invalidateQueries({ queryKey: ["hemingway-data"] });
    },
    onError: () => {
      toast.error("Failed to queue improvement");
    },
    onSettled: () => {
      setFixingIssue(null);
    },
  });

  const result = apiResult || { data: MOCK_HEMINGWAY_DATA, isPreviewMode: true, errorStatus: null };
  const meta = getHemingwayMeta(result);
  const isPreviewMode = result.isPreviewMode;
  const data = result.data || MOCK_HEMINGWAY_DATA;
  const metrics = data.metrics;
  const findings = data.findings;
  const breakdown = data.breakdown;
  const trends = data.trends;

  const handleRemediationAction = (action: RemediationAction) => {
    switch (action.kind) {
      case "route":
        if (action.route) {
          setLocation(action.route);
        }
        break;
      case "href":
        if (action.href) {
          window.open(action.href, "_blank");
        }
        break;
      case "retry":
        refetch();
        break;
      case "run_scan":
        analyzeContentMutation.mutate();
        break;
      case "view_logs":
        toast.info("Opening logs panel...");
        break;
      default:
        break;
    }
  };

  const Icon = crew?.icon || BookOpen;

  const crewIdentity: CrewIdentity = {
    crewId: "content_generator",
    crewName: crew?.nickname || "Hemingway",
    subtitle: crew?.role || "Content Quality",
    description: "Analyzes content for readability, quality, and E-E-A-T signals to help your pages rank better.",
    avatar: <Icon className="w-6 h-6" style={{ color: HEMINGWAY_ACCENT_COLOR }} />,
    accentColor: HEMINGWAY_ACCENT_COLOR,
    capabilities: ["Quality Analysis", "Readability Scoring", "E-E-A-T Checks"],
    monitors: ["Content Quality", "Readability", "E-E-A-T Coverage"],
  };

  const getQualityScoreStatus = (score: number): "good" | "warning" | "neutral" => {
    if (score >= 80) return "good";
    if (score >= 60) return "warning";
    return "warning";
  };

  const getReadabilityStatus = (grade: number): "good" | "warning" | "neutral" => {
    if (grade <= 8) return "good";
    if (grade <= 11) return "warning";
    return "warning";
  };

  const getPagesNeedingImprovementStatus = (count: number): "good" | "warning" | "neutral" => {
    if (count <= 3) return "good";
    if (count <= 10) return "warning";
    return "warning";
  };

  const getEEATStatus = (coverage: number): "good" | "warning" | "neutral" => {
    if (coverage >= 80) return "good";
    if (coverage >= 60) return "warning";
    return "warning";
  };

  const keyMetrics = useMemo(() => [
    {
      id: "quality-score",
      label: "Content Quality Score",
      value: metrics.contentQualityScore,
      icon: Shield,
      status: getQualityScoreStatus(metrics.contentQualityScore),
    },
    {
      id: "readability-grade",
      label: "Readability Grade",
      value: metrics.readabilityGrade.toFixed(1),
      icon: BookOpen,
      status: getReadabilityStatus(metrics.readabilityGrade),
    },
    {
      id: "pages-needing-improvement",
      label: "Pages Needing Improvement",
      value: metrics.pagesNeedingImprovement,
      icon: AlertTriangle,
      status: getPagesNeedingImprovementStatus(metrics.pagesNeedingImprovement),
    },
    {
      id: "eeat-coverage",
      label: "E-E-A-T Coverage",
      value: `${metrics.eeatCoverage}%`,
      icon: User,
      status: getEEATStatus(metrics.eeatCoverage),
    },
  ], [metrics]);

  const criticalCount = findings.filter(f => f.severity === "critical").length;
  const warningCount = findings.filter(f => f.severity === "warning").length;
  const autoFixableCount = findings.filter(f => f.fixType === "auto").length;

  const handleFixFinding = (finding: PageFinding) => {
    improveContentMutation.mutate(finding);
  };

  const headerActions: HeaderAction[] = [
    {
      id: "refresh",
      icon: <RefreshCw className="w-4 h-4" />,
      tooltip: "Refresh data",
      onClick: () => refetch(),
      loading: isRefetching,
    },
    {
      id: "analyze",
      icon: <Play className="w-4 h-4" />,
      tooltip: "Run full analysis",
      onClick: () => analyzeContentMutation.mutate(),
      loading: analyzeContentMutation.isPending,
    },
  ];

  const findingsTab: InspectorTab = {
    id: "findings",
    label: "Pages Needing Improvement",
    icon: <FileText className="w-4 h-4" />,
    badge: findings.length || undefined,
    state: isLoading ? "loading" : findings.length > 0 ? "ready" : "empty",
    content: (
      <div className="p-4">
        {meta.status !== "ok" && !isPreviewMode ? (
          <NoDeadEndsState
            meta={meta}
            title="Content Quality Data Unavailable"
            onAction={handleRemediationAction}
          />
        ) : (
          <PagesNeedingImprovementTable 
            findings={findings} 
            onFix={handleFixFinding}
            fixingIssueId={fixingIssue}
            onAction={handleRemediationAction}
          />
        )}
      </div>
    ),
  };

  const breakdownTab: InspectorTab = {
    id: "breakdown",
    label: "Content Quality Breakdown",
    icon: <BarChart3 className="w-4 h-4" />,
    state: isLoading ? "loading" : "ready",
    content: (
      <div className="p-4 space-y-4">
        {meta.status !== "ok" && !isPreviewMode ? (
          <NoDeadEndsState
            meta={meta}
            title="Quality Breakdown Unavailable"
            onAction={handleRemediationAction}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DistributionBar 
                data={breakdown.readabilityDistribution.map((d, i) => ({
                  ...d,
                  color: i === 0 ? "#22C55E" : i === 1 ? "#22C55E" : i === 2 ? "#F59E0B" : "#EF4444"
                }))} 
                title="Readability Distribution" 
              />
              <DistributionBar 
                data={breakdown.qualityScoreDistribution} 
                title="Quality Score Distribution" 
              />
            </div>
            <IssuesBreakdown issues={breakdown.commonIssues} />
          </>
        )}
      </div>
    ),
  };

  const trendsTab: InspectorTab = {
    id: "trends",
    label: "Trends",
    icon: <TrendingUp className="w-4 h-4" />,
    state: isLoading ? "loading" : trends.length > 0 ? "ready" : "empty",
    content: (
      <div className="p-4 space-y-4">
        {meta.status !== "ok" && !isPreviewMode ? (
          <NoDeadEndsState
            meta={meta}
            title="Trend Data Unavailable"
            onAction={handleRemediationAction}
          />
        ) : trends.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TrendChart 
                data={trends} 
                dataKey="avgQualityScore" 
                label="Avg Quality Score" 
                color={HEMINGWAY_ACCENT_COLOR}
                onAction={handleRemediationAction}
              />
              <TrendChart 
                data={trends} 
                dataKey="avgReadabilityGrade" 
                label="Avg Readability Grade" 
                color="#F59E0B"
                isGradeBased={true}
                onAction={handleRemediationAction}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <DualBarChart
                data={trends}
                dataKey1="pagesImproved"
                dataKey2="pagesRegressed"
                label1="Improved"
                label2="Regressed"
                color1="#22C55E"
                color2="#EF4444"
                title="Pages Improved vs Regressed"
                onAction={handleRemediationAction}
              />
              <TrendChart 
                data={trends} 
                dataKey="eeatCoverage" 
                label="E-E-A-T Coverage Over Time" 
                color="#8B5CF6"
                onAction={handleRemediationAction}
              />
            </div>
          </>
        ) : (
          <ChartEmptyState
            meta={getEmptyTrendsMeta()}
            title="No Trend Data Yet"
            onAction={handleRemediationAction}
            height={200}
          />
        )}
      </div>
    ),
  };

  const inspectorTabs = [findingsTab, breakdownTab, trendsTab];

  const customMetrics = (
    <div className="space-y-4">
      {isPreviewMode && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-semantic-warning-border bg-semantic-warning-soft">
          <Plug className="w-4 h-4 text-semantic-warning" />
          <span className="text-sm text-semantic-warning">
            Preview Mode — Connect Hemingway worker for live data
          </span>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto"
            onClick={() => setLocation("/settings/integrations")}
          >
            <Settings className="w-3 h-3 mr-1" />
            Configure
          </Button>
        </div>
      )}
      <KeyMetricsGrid 
        metrics={keyMetrics} 
        accentColor={crewIdentity.accentColor} 
      />
    </div>
  );

  return (
    <CrewPageLayout crewId="hemingway">
      <CrewDashboardShell
        crew={crewIdentity}
        agentScore={metrics.contentQualityScore}
        agentScoreTooltip="Content quality score based on readability, structure, and E-E-A-T signals"
        customMetrics={customMetrics}
        inspectorTabs={inspectorTabs}
        headerActions={headerActions}
        onRefresh={() => refetch()}
        isRefreshing={isRefetching || crewIsRefreshing}
        dataUpdatedAt={crewDataUpdatedAt}
      />
    </CrewPageLayout>
  );
}
