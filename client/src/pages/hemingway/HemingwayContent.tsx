import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  FileText, 
  File,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  PenTool,
  BookOpen,
  Shield,
  Loader2,
  Settings,
  ListChecks,
  Search,
  Upload,
  User,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSiteContext } from "@/hooks/useSiteContext";
import { toast } from "sonner";
import { getCrewMember } from "@/config/agents";
import { useCrewMissions } from "@/hooks/useCrewMissions";
import { SERVICE_TO_CREW } from "@shared/registry";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CrewDashboardShell,
  type CrewIdentity,
  type MissionStatusState,
  type MissionItem,
  type KpiDescriptor,
  type InspectorTab,
  type MissionPromptConfig,
} from "@/components/crew-dashboard";

interface ContentMetrics {
  contentQualityScore: number | null;
  readabilityGrade: number | null;
  eeatCoverage: number | null;
  contentAtRisk: number | null;
  totalBlogs: number | null;
  totalPages: number | null;
  thinContent?: number | null;
  staleContent?: number | null;
  missingAuthor?: number | null;
  trends?: {
    qualityTrend?: number;
    readabilityTrend?: number;
    eeatTrend?: number;
    riskTrend?: number;
  };
}

interface HemingwayDashboardResponse {
  ok: boolean;
  configured?: boolean;
  error?: string;
  contentQualityScore?: number | null;
  readabilityGrade?: number | null;
  eeatCoverage?: number | null;
  contentAtRisk?: number | null;
  totalBlogs?: number | null;
  totalPages?: number | null;
  thinContent?: number | null;
  staleContent?: number | null;
  missingAuthor?: number | null;
  lastRunAt?: string | null;
}

interface HemingwayFinding {
  id: string;
  label: string;
  value: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
}

interface HemingwayFindingsResponse {
  ok: boolean;
  configured?: boolean;
  error?: string;
  findings?: HemingwayFinding[];
}

interface ContentItem {
  id: string;
  url: string;
  title: string;
  qualityScore: number;
  readability: number;
  status: 'healthy' | 'needs-update' | 'at-risk';
  lastUpdated: string;
  hasAuthor?: boolean;
  wordCount?: number;
}

interface HemingwayContentResponse {
  ok: boolean;
  configured?: boolean;
  error?: string;
  content?: ContentItem[];
}

interface MetricCardProps {
  label: string;
  value: number | null;
  unit?: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  tooltip?: string;
  trend?: number;
  isWarning?: boolean;
  isLoading?: boolean;
}

function MetricCard({
  label,
  value,
  unit,
  icon: Icon,
  accentColor,
  tooltip,
  trend,
  isWarning,
  isLoading,
}: MetricCardProps) {
  const displayValue = isLoading ? null : value;
  const hasValue = displayValue !== null && displayValue !== undefined;
  const showWarning = isWarning && hasValue && displayValue > 0;
  
  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all hover:shadow-lg",
        showWarning && "border-amber-500/50 shadow-amber-500/10"
      )}
      style={{ 
        borderColor: showWarning ? undefined : `${accentColor}30`,
        boxShadow: showWarning ? undefined : `0 0 20px ${accentColor}10`
      }}
      data-testid={`metric-card-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div 
        className="absolute top-0 left-0 w-1 h-full"
        style={{ backgroundColor: showWarning ? '#f59e0b' : accentColor }}
      />
      <CardHeader className="pb-2 pl-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="p-2 rounded-lg"
              style={{ backgroundColor: showWarning ? 'rgba(245, 158, 11, 0.1)' : `${accentColor}15` }}
            >
              <Icon 
                className="w-5 h-5" 
                style={{ color: showWarning ? '#f59e0b' : accentColor }}
              />
            </div>
            <div className="flex items-center gap-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              {tooltip && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-muted-foreground/60 hover:text-muted-foreground">
                        <AlertTriangle className="w-3 h-3" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs max-w-[200px]">{tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
          {showWarning && (
            <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600 bg-amber-500/10">
              Attention
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="pl-5">
        <div className="flex items-baseline gap-2">
          {isLoading ? (
            <Skeleton className="h-10 w-20" />
          ) : (
            <>
              <span 
                className="text-4xl font-bold"
                style={{ color: showWarning ? '#f59e0b' : (hasValue ? accentColor : undefined) }}
              >
                {hasValue ? displayValue : '—'}
              </span>
              {unit && hasValue && (
                <span className="text-lg text-muted-foreground">{unit}</span>
              )}
            </>
          )}
          {trend !== undefined && trend !== 0 && !isLoading && (
            <span 
              className={cn(
                "text-sm flex items-center gap-1 ml-2",
                trend > 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {trend > 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              {Math.abs(trend).toFixed(1)}%
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyStateCard() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-12 px-6 text-center bg-muted/30 rounded-xl border border-dashed border-border">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Search className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">No content data available</h3>
      <p className="text-sm text-muted-foreground max-w-md">
        Run a crawl to detect content and generate quality metrics. Hemingway will analyze your 
        blog posts and pages for readability, E-E-A-T coverage, and content health.
      </p>
    </div>
  );
}

function NotConfiguredCard() {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-12 px-6 text-center bg-amber-500/5 rounded-xl border border-dashed border-amber-500/30">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mb-4">
        <Settings className="w-8 h-8 text-amber-600" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Hemingway Worker Not Configured</h3>
      <p className="text-sm text-muted-foreground max-w-md">
        The Hemingway content quality worker needs to be configured. Please add the worker configuration 
        in the Integrations page to enable content analysis features.
      </p>
    </div>
  );
}

export default function HemingwayContent() {
  const { activeSite } = useSiteContext();
  const siteId = activeSite?.id || 'default';
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const crewId = SERVICE_TO_CREW['content_generator'] || 'hemingway';
  
  const { missionState, executeMission, isLoading: missionsLoading } = useCrewMissions({
    siteId,
    crewId,
  });

  // Query: Dashboard metrics from Hemingway worker
  const { data: dashboardData, isLoading: dashboardLoading, refetch: refetchDashboard } = useQuery<HemingwayDashboardResponse>({
    queryKey: ['hemingway-dashboard', siteId],
    queryFn: async () => {
      const res = await fetch(`/api/hemingway/dashboard`);
      if (!res.ok) {
        return { ok: false, error: 'Failed to fetch dashboard' };
      }
      return res.json();
    },
    staleTime: 60000,
  });

  // Query: Findings from Hemingway worker
  const { data: findingsData, isLoading: findingsLoading, refetch: refetchFindings } = useQuery<HemingwayFindingsResponse>({
    queryKey: ['hemingway-findings', siteId],
    queryFn: async () => {
      const res = await fetch(`/api/hemingway/findings`);
      if (!res.ok) {
        return { ok: false, findings: [] };
      }
      return res.json();
    },
    staleTime: 60000,
  });

  // Query: Content inventory from Hemingway worker
  const { data: contentData, isLoading: contentLoading, refetch: refetchContent } = useQuery<HemingwayContentResponse>({
    queryKey: ['hemingway-content', siteId],
    queryFn: async () => {
      const res = await fetch(`/api/hemingway/content`);
      if (!res.ok) {
        return { ok: false, content: [] };
      }
      return res.json();
    },
    staleTime: 60000,
  });

  // Mutation: Import content
  const importContentMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/hemingway/content/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId })
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.ok) {
        toast.success('Content import started');
        refetchContent();
        refetchDashboard();
      } else {
        toast.error(data.error || 'Import failed');
      }
    },
    onError: (error: any) => {
      toast.error(error.message || 'Import failed');
    }
  });

  const isWorkerConfigured = dashboardData?.configured !== false;
  const isLoading = dashboardLoading || findingsLoading || contentLoading;

  const metrics: ContentMetrics = {
    contentQualityScore: dashboardData?.contentQualityScore ?? null,
    readabilityGrade: dashboardData?.readabilityGrade ?? null,
    eeatCoverage: dashboardData?.eeatCoverage ?? null,
    contentAtRisk: dashboardData?.contentAtRisk ?? null,
    totalBlogs: dashboardData?.totalBlogs ?? null,
    totalPages: dashboardData?.totalPages ?? null,
    thinContent: dashboardData?.thinContent ?? null,
    staleContent: dashboardData?.staleContent ?? null,
    missingAuthor: dashboardData?.missingAuthor ?? null,
  };

  const hasRealData = dashboardData?.ok && isWorkerConfigured;
  const findings = findingsData?.findings || [];
  const contentAudit = contentData?.content || [];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refetchDashboard(), refetchFindings(), refetchContent()]);
      toast.success('Content metrics refreshed');
    } catch (error) {
      toast.error('Failed to refresh metrics');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleImportContent = async () => {
    setIsImporting(true);
    try {
      await importContentMutation.mutateAsync();
    } finally {
      setIsImporting(false);
    }
  };

  const crewMember = getCrewMember("content_generator");
  const Icon = crewMember.icon;

  const crew: CrewIdentity = {
    crewId: "content_generator",
    crewName: crewMember.nickname,
    subtitle: crewMember.role,
    description: crewMember.blurb || "Analyzes and optimizes content for search and readability.",
    avatar: crewMember.avatar ? (
      <img src={crewMember.avatar} alt={crewMember.nickname} className="w-7 h-7 object-contain" />
    ) : (
      <Icon className="w-7 h-7" style={{ color: crewMember.color }} />
    ),
    accentColor: crewMember.color,
    capabilities: crewMember.capabilities || ["Content Analysis", "Quality Scoring", "E-E-A-T Checks"],
    monitors: ["Content Quality", "Readability", "Blog Cadence"],
  };

  const missionStatus: MissionStatusState = useMemo(() => {
    const atRiskCount = metrics.contentAtRisk || 0;
    const qualityScore = metrics.contentQualityScore;
    const autoFixable = missionState?.nextActions?.filter(a => a.autoFixable)?.length || 0;

    let tier: "looking_good" | "doing_okay" | "needs_attention" = "looking_good";
    let summaryLine = "Content health is strong";
    let nextStep = "Continue monitoring content quality";

    if (!isWorkerConfigured) {
      tier = "needs_attention";
      summaryLine = "Worker not configured";
      nextStep = "Configure Hemingway worker in Integrations";
    } else if (!hasRealData) {
      tier = "needs_attention";
      summaryLine = "No content data available";
      nextStep = "Import content to start analysis";
    } else if (atRiskCount > 5) {
      tier = "needs_attention";
      summaryLine = `${atRiskCount} pieces of content at risk`;
      nextStep = "Review and refresh at-risk content";
    } else if (qualityScore !== null && qualityScore < 60) {
      tier = "needs_attention";
      summaryLine = "Content quality needs improvement";
      nextStep = "Focus on improving low-scoring content";
    } else if (atRiskCount > 0 || (qualityScore !== null && qualityScore < 80)) {
      tier = "doing_okay";
      summaryLine = qualityScore !== null ? `Quality score: ${qualityScore}` : "Some content needs attention";
      nextStep = "Work on improving content metrics";
    }

    return {
      tier,
      summaryLine,
      nextStep,
      blockerCount: atRiskCount > 5 ? atRiskCount : 0,
      priorityCount: atRiskCount,
      autoFixableCount: autoFixable,
      status: isLoading || missionsLoading ? "loading" as const : "ready" as const,
      performanceScore: metrics.contentQualityScore ?? null,
    };
  }, [metrics, hasRealData, isWorkerConfigured, isLoading, missionsLoading, missionState]);

  const missions: MissionItem[] = useMemo(() => {
    const items: MissionItem[] = [];
    
    if (missionState?.nextActions) {
      missionState.nextActions.forEach((action) => {
        items.push({
          id: action.missionId,
          title: action.title,
          reason: action.description,
          status: "pending",
          impact: action.impact as 'high' | 'medium' | 'low',
          effort: action.effort,
          action: {
            label: action.autoFixable ? "Fix it" : "Review",
            onClick: () => executeMission(action.missionId),
            disabled: false,
          },
        });
      });
    }

    if (items.length === 0 && hasRealData) {
      if (metrics.contentAtRisk && metrics.contentAtRisk > 0) {
        items.push({
          id: "review-at-risk",
          title: `Review ${metrics.contentAtRisk} at-risk content pieces`,
          reason: "Content showing signs of decay or quality issues",
          status: "pending",
          impact: "high",
        });
      }
      if (metrics.thinContent && metrics.thinContent > 0) {
        items.push({
          id: "fix-thin-content",
          title: `Expand ${metrics.thinContent} thin content pages`,
          reason: "Pages with insufficient word count",
          status: "pending",
          impact: "medium",
        });
      }
      if (metrics.missingAuthor && metrics.missingAuthor > 0) {
        items.push({
          id: "add-authors",
          title: `Add authors to ${metrics.missingAuthor} pages`,
          reason: "Improves E-E-A-T signals",
          status: "pending",
          impact: "medium",
        });
      }
      if (metrics.contentQualityScore !== null && metrics.contentQualityScore < 80) {
        items.push({
          id: "improve-quality",
          title: "Improve content quality scores",
          reason: `Current average quality score is ${metrics.contentQualityScore}`,
          status: "pending",
          impact: "medium",
        });
      }
    }

    return items;
  }, [missionState, metrics, hasRealData, executeMission]);

  const recentlyCompleted = missionState?.lastCompleted ? {
    id: missionState.lastCompleted.runId || missionState.lastCompleted.missionId,
    title: missionState.lastCompleted.summary || 'Mission completed',
    completedAt: missionState.lastCompleted.completedAt,
  } : null;

  const kpis: KpiDescriptor[] = [
    {
      id: "quality-score",
      label: "Quality Score",
      value: metrics.contentQualityScore,
      tooltip: "Overall content quality score based on readability, E-E-A-T, and optimization",
      status: dashboardLoading ? "loading" : "ready",
    },
    {
      id: "readability",
      label: "Readability",
      value: metrics.readabilityGrade,
      tooltip: "Average readability grade level",
      status: dashboardLoading ? "loading" : "ready",
    },
    {
      id: "eeat",
      label: "E-E-A-T Coverage",
      value: metrics.eeatCoverage !== null ? `${metrics.eeatCoverage}%` : null,
      tooltip: "Experience, Expertise, Authoritativeness, Trust coverage",
      status: dashboardLoading ? "loading" : "ready",
    },
    {
      id: "at-risk",
      label: "At Risk",
      value: metrics.contentAtRisk,
      tooltip: "Content pieces showing decay signals",
      status: dashboardLoading ? "loading" : "ready",
    },
    {
      id: "blogs",
      label: "Total Blogs",
      value: metrics.totalBlogs,
      icon: <FileText className="w-4 h-4" />,
      status: dashboardLoading ? "loading" : "ready",
    },
    {
      id: "pages",
      label: "Total Pages",
      value: metrics.totalPages,
      icon: <File className="w-4 h-4" />,
      status: dashboardLoading ? "loading" : "ready",
    },
  ];

  const missionPrompt: MissionPromptConfig = {
    label: `Ask ${crewMember.nickname}`,
    placeholder: `Ask about content strategy, quality improvements...`,
    onSubmit: (question) => {
      toast.info(`Asked: ${question}`, { description: "This feature is coming soon" });
    },
  };

  const findingsTab: InspectorTab = {
    id: "findings",
    label: "Findings",
    icon: <AlertTriangle className="w-4 h-4" />,
    badge: findings.length || undefined,
    state: findingsLoading ? "loading" : findings.length > 0 ? "ready" : "empty",
    content: (
      <div className="space-y-3 p-4">
        {!isWorkerConfigured ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Settings className="w-12 h-12 text-amber-500/30 mb-3" />
            <p className="text-muted-foreground">Worker not configured</p>
          </div>
        ) : findings.length > 0 ? (
          findings.map((finding) => (
            <div 
              key={finding.id} 
              className="flex justify-between items-center p-3 bg-muted/50 rounded-lg"
              data-testid={`finding-${finding.id}`}
            >
              <span className="text-sm text-muted-foreground">{finding.label}</span>
              <Badge 
                variant="secondary"
                className={cn(
                  finding.severity === 'critical' ? 'bg-red-500/20 text-red-600' :
                  finding.severity === 'high' ? 'bg-amber-500/20 text-amber-600' :
                  'bg-blue-500/20 text-blue-600'
                )}
              >
                {finding.value}
              </Badge>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500/30 mb-3" />
            <p className="text-muted-foreground">No findings</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Run a content audit to detect issues
            </p>
          </div>
        )}
      </div>
    ),
  };

  const contentAuditTab: InspectorTab = {
    id: "content-audit",
    label: "Content Audit",
    icon: <BookOpen className="w-4 h-4" />,
    badge: contentAudit.length || undefined,
    state: contentLoading ? "loading" : contentAudit.length > 0 ? "ready" : "empty",
    content: (
      <div className="space-y-3 p-4">
        {!isWorkerConfigured ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Settings className="w-12 h-12 text-amber-500/30 mb-3" />
            <p className="text-muted-foreground">Worker not configured</p>
          </div>
        ) : contentAudit.length > 0 ? (
          contentAudit.map((item) => (
            <div 
              key={item.id} 
              className="p-3 bg-muted/50 rounded-lg"
              data-testid={`audit-item-${item.id}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium truncate">{item.title}</h4>
                  <p className="text-xs text-muted-foreground truncate">{item.url}</p>
                </div>
                <Badge 
                  variant="secondary"
                  className={cn(
                    "ml-2 shrink-0",
                    item.status === 'healthy' ? 'bg-green-500/20 text-green-600' :
                    item.status === 'needs-update' ? 'bg-amber-500/20 text-amber-600' :
                    'bg-red-500/20 text-red-600'
                  )}
                >
                  {item.status === 'healthy' ? 'Healthy' : 
                   item.status === 'needs-update' ? 'Needs Update' : 'At Risk'}
                </Badge>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span>Quality: {item.qualityScore}</span>
                <span>Readability: {item.readability}</span>
                {item.wordCount && <span>Words: {item.wordCount}</span>}
                {item.hasAuthor !== undefined && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {item.hasAuthor ? 'Has author' : 'No author'}
                  </span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <BookOpen className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No content audited yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Import content to start analysis
            </p>
          </div>
        )}
      </div>
    ),
  };

  const controlsTab: InspectorTab = {
    id: "controls",
    label: "Controls",
    icon: <Settings className="w-4 h-4" />,
    state: "ready",
    content: (
      <div className="space-y-4 p-4">
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Import Content</h4>
          <p className="text-xs text-muted-foreground mb-3">
            Import pages from your sitemap or crawl results into Hemingway for analysis.
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleImportContent}
            disabled={isImporting || !isWorkerConfigured}
            data-testid="button-import-content"
          >
            {isImporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Import Content
          </Button>
        </div>
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Content Analysis Settings</h4>
          <p className="text-xs text-muted-foreground mb-3">
            Configure how Hemingway analyzes and scores your content.
          </p>
          <Button variant="outline" size="sm" disabled={!isWorkerConfigured}>
            <Settings className="w-4 h-4 mr-2" />
            Configure
          </Button>
        </div>
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="text-sm font-medium mb-2">Run Content Audit</h4>
          <p className="text-xs text-muted-foreground mb-3">
            Analyze all your content for quality, readability, and E-E-A-T coverage.
          </p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || !isWorkerConfigured}
            data-testid="button-run-audit"
          >
            {isRefreshing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Run Audit
          </Button>
        </div>
      </div>
    ),
  };

  const inspectorTabs = [findingsTab, contentAuditTab, controlsTab];

  const hasAnyMetrics = hasRealData && (
    metrics.contentQualityScore !== null ||
    metrics.totalBlogs !== null ||
    metrics.totalPages !== null
  );

  const customMetrics = (
    <div className="space-y-4">
      {!isWorkerConfigured ? (
        <NotConfiguredCard />
      ) : !hasAnyMetrics && !dashboardLoading ? (
        <EmptyStateCard />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricCard
            label="Content Quality Score"
            value={metrics.contentQualityScore}
            unit="/100"
            icon={Shield}
            accentColor="#F59E0B"
            tooltip="Overall content quality based on readability, structure, and optimization"
            trend={metrics.trends?.qualityTrend}
            isLoading={dashboardLoading}
          />
          <MetricCard
            label="Readability Grade"
            value={metrics.readabilityGrade}
            icon={BookOpen}
            accentColor="#3B82F6"
            tooltip="Average grade level required to understand your content (lower is more accessible)"
            trend={metrics.trends?.readabilityTrend}
            isLoading={dashboardLoading}
          />
          <MetricCard
            label="E-E-A-T Coverage"
            value={metrics.eeatCoverage}
            unit="%"
            icon={CheckCircle}
            accentColor="#10B981"
            tooltip="Experience, Expertise, Authoritativeness, and Trust signals in your content"
            trend={metrics.trends?.eeatTrend}
            isLoading={dashboardLoading}
          />
          <MetricCard
            label="Content at Risk"
            value={metrics.contentAtRisk}
            icon={AlertTriangle}
            accentColor="#EF4444"
            tooltip="Content pieces showing decay signals or quality issues"
            trend={metrics.trends?.riskTrend}
            isWarning={true}
            isLoading={dashboardLoading}
          />
          <MetricCard
            label="Thin Content"
            value={metrics.thinContent ?? null}
            icon={FileText}
            accentColor="#F97316"
            tooltip="Pages with insufficient word count that may need expansion"
            isWarning={true}
            isLoading={dashboardLoading}
          />
          <MetricCard
            label="Stale Content"
            value={metrics.staleContent ?? null}
            icon={Clock}
            accentColor="#8B5CF6"
            tooltip="Content that hasn't been updated recently"
            isWarning={true}
            isLoading={dashboardLoading}
          />
          <MetricCard
            label="Missing Author"
            value={metrics.missingAuthor ?? null}
            icon={User}
            accentColor="#EC4899"
            tooltip="Pages missing author attribution (affects E-E-A-T)"
            isWarning={true}
            isLoading={dashboardLoading}
          />
          <MetricCard
            label="Total Blogs"
            value={metrics.totalBlogs}
            icon={FileText}
            accentColor="#10B981"
            tooltip="Total blog posts indexed on your site"
            isLoading={dashboardLoading}
          />
          <MetricCard
            label="Total Pages"
            value={metrics.totalPages}
            icon={File}
            accentColor="#10B981"
            tooltip="Total pages indexed on your site"
            isLoading={dashboardLoading}
          />
        </div>
      )}
    </div>
  );

  return (
    <CrewDashboardShell
      crew={crew}
      agentScore={metrics.contentQualityScore}
      agentScoreTooltip="Content quality score based on readability, E-E-A-T, and optimization"
      missionStatus={missionStatus}
      missions={missions}
      recentlyCompleted={recentlyCompleted}
      kpis={kpis}
      customMetrics={customMetrics}
      inspectorTabs={inspectorTabs}
      missionPrompt={missionPrompt}
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
    />
  );
}
