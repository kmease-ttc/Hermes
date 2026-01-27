import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCrewMember } from "@/config/agents";
import { useSiteContext } from "@/hooks/useSiteContext";
import { useCrewStatus } from "@/hooks/useCrewStatus";
import { toast } from "sonner";
import {
  CrewDashboardShell,
  type CrewIdentity,
  type InspectorTab,
  type KpiDescriptor,
  type MissionPromptConfig,
  type HeaderAction,
} from "@/components/crew-dashboard";
import { KeyMetricsGrid } from "@/components/key-metrics";
import { CrewPageLayout } from "@/components/crew/CrewPageLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  Zap,
  Clock,
  ExternalLink,
  Play,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Info,
  Search,
  Activity,
  BarChart3,
  Eye,
  Target,
  ArrowDownRight,
  Shield,
  Flame,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DecayMetrics {
  decayingPages: number;
  keywordsAtRisk: number;
  trafficLossRisk: number;
  avgDecaySeverity: number;
  lastScanAt: string | null;
  isConfigured: boolean;
}

interface DecayingContent {
  id: string;
  url: string;
  title: string;
  primaryKeywords: string[];
  previousRank: number;
  currentRank: number;
  rankChange: number;
  estimatedTrafficLoss: number;
  decaySeverity: "critical" | "warning" | "mild";
  severityScore: number;
  recommendedAction: string;
  fixable: boolean;
  fixAction?: string;
  lastUpdated: string;
}

interface SentinelData {
  metrics: DecayMetrics;
  decayingContent: DecayingContent[];
  trends: {
    date: string;
    decayingPages: number;
    keywordsLost: number;
    keywordsRecovered: number;
    trafficAtRisk: number;
    pagesRefreshed: number;
    pagesRecovered: number;
  }[];
}

const MOCK_SENTINEL_DATA: SentinelData = {
  metrics: {
    decayingPages: 5,
    keywordsAtRisk: 12,
    trafficLossRisk: 2400,
    avgDecaySeverity: 62,
    lastScanAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    isConfigured: true,
  },
  decayingContent: [
    {
      id: "1",
      url: "/blog/anxiety-treatment-guide",
      title: "Complete Guide to Anxiety Treatment",
      primaryKeywords: ["anxiety treatment", "anxiety therapy"],
      previousRank: 4,
      currentRank: 11,
      rankChange: -7,
      estimatedTrafficLoss: 850,
      decaySeverity: "critical",
      severityScore: 85,
      recommendedAction: "Update content with recent statistics and add FAQ section",
      fixable: true,
      fixAction: "queue_refresh",
      lastUpdated: "2025-08-15",
    },
    {
      id: "2",
      url: "/services/couples-therapy",
      title: "Couples Therapy Services",
      primaryKeywords: ["couples therapy", "marriage counseling"],
      previousRank: 6,
      currentRank: 15,
      rankChange: -9,
      estimatedTrafficLoss: 620,
      decaySeverity: "critical",
      severityScore: 78,
      recommendedAction: "Refresh case studies and add testimonials section",
      fixable: true,
      fixAction: "queue_refresh",
      lastUpdated: "2025-06-20",
    },
    {
      id: "3",
      url: "/blog/depression-symptoms",
      title: "Recognizing Depression Symptoms",
      primaryKeywords: ["depression symptoms", "signs of depression"],
      previousRank: 8,
      currentRank: 14,
      rankChange: -6,
      estimatedTrafficLoss: 480,
      decaySeverity: "warning",
      severityScore: 58,
      recommendedAction: "Add expert quotes and update statistics",
      fixable: true,
      fixAction: "queue_refresh",
      lastUpdated: "2025-09-10",
    },
    {
      id: "4",
      url: "/resources/mental-health-tips",
      title: "Daily Mental Health Tips",
      primaryKeywords: ["mental health tips"],
      previousRank: 12,
      currentRank: 18,
      rankChange: -6,
      estimatedTrafficLoss: 280,
      decaySeverity: "warning",
      severityScore: 45,
      recommendedAction: "Expand content and add actionable steps",
      fixable: true,
      fixAction: "queue_refresh",
      lastUpdated: "2025-07-05",
    },
    {
      id: "5",
      url: "/blog/stress-management",
      title: "Stress Management Techniques",
      primaryKeywords: ["stress management", "stress relief"],
      previousRank: 15,
      currentRank: 19,
      rankChange: -4,
      estimatedTrafficLoss: 170,
      decaySeverity: "mild",
      severityScore: 28,
      recommendedAction: "Minor refresh with updated links",
      fixable: true,
      fixAction: "queue_refresh",
      lastUpdated: "2025-10-01",
    },
  ],
  trends: [
    { date: "2025-12-27", decayingPages: 3, keywordsLost: 8, keywordsRecovered: 2, trafficAtRisk: 1800, pagesRefreshed: 1, pagesRecovered: 0 },
    { date: "2025-12-28", decayingPages: 4, keywordsLost: 10, keywordsRecovered: 3, trafficAtRisk: 2100, pagesRefreshed: 0, pagesRecovered: 1 },
    { date: "2025-12-29", decayingPages: 4, keywordsLost: 11, keywordsRecovered: 2, trafficAtRisk: 2200, pagesRefreshed: 2, pagesRecovered: 1 },
    { date: "2025-12-30", decayingPages: 5, keywordsLost: 12, keywordsRecovered: 1, trafficAtRisk: 2400, pagesRefreshed: 1, pagesRecovered: 0 },
    { date: "2025-12-31", decayingPages: 5, keywordsLost: 12, keywordsRecovered: 2, trafficAtRisk: 2400, pagesRefreshed: 0, pagesRecovered: 2 },
    { date: "2026-01-01", decayingPages: 5, keywordsLost: 11, keywordsRecovered: 3, trafficAtRisk: 2300, pagesRefreshed: 1, pagesRecovered: 1 },
    { date: "2026-01-02", decayingPages: 5, keywordsLost: 12, keywordsRecovered: 2, trafficAtRisk: 2400, pagesRefreshed: 0, pagesRecovered: 0 },
  ],
};

function getSeverityColor(severity: "critical" | "warning" | "mild"): string {
  switch (severity) {
    case "critical":
      return "bg-semantic-danger-soft border-semantic-danger-border";
    case "warning":
      return "bg-semantic-warning-soft border-semantic-warning-border";
    case "mild":
      return "bg-semantic-info-soft border-semantic-info-border";
    default:
      return "bg-muted/50 border-muted";
  }
}

function getSeverityIcon(severity: "critical" | "warning" | "mild") {
  switch (severity) {
    case "critical":
      return <Flame className="w-4 h-4 text-semantic-danger" />;
    case "warning":
      return <AlertTriangle className="w-4 h-4 text-semantic-warning" />;
    case "mild":
      return <Info className="w-4 h-4 text-semantic-info" />;
    default:
      return <CheckCircle2 className="w-4 h-4 text-muted-foreground" />;
  }
}

function getSeverityBadge(severity: "critical" | "warning" | "mild") {
  const variants = {
    critical: "bg-semantic-danger-soft text-semantic-danger border-semantic-danger-border",
    warning: "bg-semantic-warning-soft text-semantic-warning border-semantic-warning-border",
    mild: "bg-semantic-info-soft text-semantic-info border-semantic-info-border",
  };
  return variants[severity] || "";
}

function DecayingContentTable({ content, onFix }: { content: DecayingContent[]; onFix: (item: DecayingContent) => void }) {
  const groupedContent = useMemo(() => {
    const critical = content.filter(c => c.decaySeverity === "critical");
    const warning = content.filter(c => c.decaySeverity === "warning");
    const mild = content.filter(c => c.decaySeverity === "mild");
    return { critical, warning, mild };
  }, [content]);

  const renderGroup = (title: string, icon: React.ReactNode, items: DecayingContent[], description: string, showEmpty: boolean = true) => {
    if (items.length === 0 && !showEmpty) return null;
    
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="font-semibold text-sm">{title}</h4>
          <Badge variant="secondary" className="text-xs">{items.length}</Badge>
          <span className="text-xs text-muted-foreground ml-auto">{description}</span>
        </div>
        {items.length === 0 ? (
          <div className="p-3 rounded-lg border bg-card/30 text-center">
            <p className="text-xs text-muted-foreground">No issues in this category</p>
          </div>
        ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg border",
                getSeverityColor(item.decaySeverity)
              )}
              data-testid={`decay-item-${item.id}`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {getSeverityIcon(item.decaySeverity)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm truncate">{item.title}</span>
                    <Badge variant="outline" className={cn("text-xs", getSeverityBadge(item.decaySeverity))}>
                      Score: {item.severityScore}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{item.url}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3" />
                      {item.primaryKeywords.slice(0, 2).join(", ")}
                    </span>
                    <span className="flex items-center gap-1 text-semantic-danger">
                      <ArrowDownRight className="w-3 h-3" />
                      #{item.previousRank} → #{item.currentRank} ({item.rankChange})
                    </span>
                    <span className="flex items-center gap-1">
                      <TrendingDown className="w-3 h-3 text-semantic-danger" />
                      -{item.estimatedTrafficLoss.toLocaleString()} visits/mo
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{item.recommendedAction}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
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
                {item.fixable ? (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onFix(item)}
                    data-testid={`button-refresh-${item.id}`}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" />
                    Refresh
                  </Button>
                ) : (
                  <Badge variant="secondary" className="text-xs">Advisory</Badge>
                )}
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderGroup(
        "Critical Decay",
        <Flame className="w-4 h-4 text-semantic-danger" />,
        groupedContent.critical,
        "High-traffic pages losing rankings - fix immediately"
      )}
      {renderGroup(
        "Warning",
        <AlertTriangle className="w-4 h-4 text-semantic-warning" />,
        groupedContent.warning,
        "Moderate decline detected"
      )}
      {renderGroup(
        "Mild Decay",
        <Info className="w-4 h-4 text-semantic-info" />,
        groupedContent.mild,
        "Early warning signals"
      )}
      {content.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-semantic-success mb-3" />
          <p className="font-medium">No content decay detected</p>
          <p className="text-sm text-muted-foreground mt-1">
            All monitored content is holding steady. Run a scan to check for new decay signals.
          </p>
        </div>
      )}
    </div>
  );
}

function TrendChart({ data, dataKey, label, color }: { data: any[]; dataKey: string; label: string; color: string }) {
  const isTrafficMetric = dataKey === "trafficAtRisk";
  
  if (!data || data.length === 0) {
    return (
      <div className="p-4 rounded-lg border bg-card/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <div className="text-2xl font-bold mb-3 text-muted-foreground">0{isTrafficMetric ? "" : ""}</div>
        <div className="flex items-center justify-center h-12 text-xs text-muted-foreground">
          No data yet - run Sentinel to begin tracking
        </div>
      </div>
    );
  }
  
  const values = data.map(d => d[dataKey] ?? 0);
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;
  const range = max - min || 1;
  const latest = values.length > 0 ? values[values.length - 1] : 0;
  const previous = values.length > 1 ? values[values.length - 2] : latest;
  const trend = latest - previous;

  return (
    <div className="p-4 rounded-lg border bg-card/50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex items-center gap-1">
          {values.length > 1 && trend !== 0 && (
            <>
              {trend > 0 ? (
                <TrendingUp className="w-3 h-3 text-semantic-danger" />
              ) : (
                <TrendingDown className="w-3 h-3 text-semantic-success" />
              )}
              <span className={cn(
                "text-xs font-medium",
                trend > 0 ? "text-semantic-danger" : "text-semantic-success"
              )}>
                {trend > 0 ? "+" : ""}{isTrafficMetric ? trend.toLocaleString() : trend}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="text-2xl font-bold mb-3">
        {isTrafficMetric ? latest.toLocaleString() : latest}
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

function DualLineChart({ data, dataKey1, dataKey2, label1, label2, color1, color2, title }: {
  data: any[];
  dataKey1: string;
  dataKey2: string;
  label1: string;
  label2: string;
  color1: string;
  color2: string;
  title: string;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="p-4 rounded-lg border bg-card/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{title}</span>
        </div>
        <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
          No data yet - run Sentinel to begin tracking
        </div>
      </div>
    );
  }
  
  const values1 = data.map(d => d[dataKey1] ?? 0);
  const values2 = data.map(d => d[dataKey2] ?? 0);
  const allValues = [...values1, ...values2];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const range = max - min || 1;
  
  const latest1 = values1[values1.length - 1] ?? 0;
  const latest2 = values2[values2.length - 1] ?? 0;

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
      <div className="relative h-20 mt-4">
        <svg className="w-full h-full" viewBox={`0 0 ${data.length * 20} 80`} preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke={color1}
            strokeWidth="2"
            points={values1.map((v, i) => `${i * 20 + 10},${80 - ((v - min) / range) * 70}`).join(" ")}
          />
          <polyline
            fill="none"
            stroke={color2}
            strokeWidth="2"
            points={values2.map((v, i) => `${i * 20 + 10},${80 - ((v - min) / range) * 70}`).join(" ")}
          />
          {values1.map((v, i) => (
            <circle key={`c1-${i}`} cx={i * 20 + 10} cy={80 - ((v - min) / range) * 70} r="3" fill={color1} />
          ))}
          {values2.map((v, i) => (
            <circle key={`c2-${i}`} cx={i * 20 + 10} cy={80 - ((v - min) / range) * 70} r="3" fill={color2} />
          ))}
        </svg>
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-xs text-muted-foreground">{data[0]?.date?.slice(5) || ""}</span>
        <span className="text-xs text-muted-foreground">{data[data.length - 1]?.date?.slice(5) || ""}</span>
      </div>
    </div>
  );
}

export default function SentinelContent() {
  const crew = getCrewMember("content_decay");
  const { activeSite } = useSiteContext();
  const siteId = activeSite?.siteId || "default";
  const { score: unifiedScore, isRefreshing: crewIsRefreshing, dataUpdatedAt: crewDataUpdatedAt } = useCrewStatus({ siteId, crewId: 'sentinel' });
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"findings" | "trends">("findings");

  const { data: sentinelData, isLoading } = useQuery<SentinelData>({
    queryKey: ["/api/sentinel/data", activeSite?.siteId],
    queryFn: async () => {
      const res = await fetch(`/api/sentinel/data?siteId=${activeSite?.siteId || ""}`);
      if (!res.ok) throw new Error("Failed to fetch Sentinel data");
      return res.json();
    },
    enabled: !!activeSite,
    placeholderData: MOCK_SENTINEL_DATA,
  });

  const detectDecayMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/sentinel/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: activeSite?.siteId }),
      });
      if (!res.ok) throw new Error("Failed to run decay detection");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Decay detection completed");
      queryClient.invalidateQueries({ queryKey: ["/api/sentinel/data"] });
    },
    onError: (error) => {
      toast.error(`Decay detection failed: ${error.message}`);
    },
  });

  const prioritizeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/sentinel/prioritize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: activeSite?.siteId }),
      });
      if (!res.ok) throw new Error("Failed to prioritize content");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Content prioritized by impact");
      queryClient.invalidateQueries({ queryKey: ["/api/sentinel/data"] });
    },
    onError: (error) => {
      toast.error(`Prioritization failed: ${error.message}`);
    },
  });

  const refreshContentMutation = useMutation({
    mutationFn: async (item: DecayingContent) => {
      const res = await fetch("/api/sentinel/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: activeSite?.siteId, contentId: item.id, url: item.url }),
      });
      if (!res.ok) throw new Error("Failed to queue refresh");
      return res.json();
    },
    onSuccess: (_, item) => {
      toast.success(`Queued refresh for: ${item.title}`);
      queryClient.invalidateQueries({ queryKey: ["/api/sentinel/data"] });
    },
    onError: (error) => {
      toast.error(`Refresh failed: ${error.message}`);
    },
  });

  const bulkRefreshMutation = useMutation({
    mutationFn: async () => {
      const critical = sentinelData?.decayingContent.filter(c => c.decaySeverity === "critical" && c.fixable) || [];
      const res = await fetch("/api/sentinel/bulk-refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          siteId: activeSite?.siteId, 
          contentIds: critical.map(c => c.id) 
        }),
      });
      if (!res.ok) throw new Error("Failed to queue bulk refresh");
      return res.json();
    },
    onSuccess: () => {
      toast.success("All critical pages queued for refresh");
      queryClient.invalidateQueries({ queryKey: ["/api/sentinel/data"] });
    },
    onError: (error) => {
      toast.error(`Bulk refresh failed: ${error.message}`);
    },
  });

  const metrics = sentinelData?.metrics || {
    decayingPages: 0,
    keywordsAtRisk: 0,
    trafficLossRisk: 0,
    avgDecaySeverity: 0,
    lastScanAt: null,
    isConfigured: false,
  };

  const decayingContent = sentinelData?.decayingContent || [];
  const trends = sentinelData?.trends || [];

  const getDecayingPagesStatus = (count: number): "good" | "warning" | "neutral" => {
    if (count <= 2) return "good";
    if (count <= 10) return "warning";
    return "warning";
  };

  const getSeverityStatus = (score: number): "good" | "warning" | "neutral" => {
    if (score < 30) return "good";
    if (score < 60) return "warning";
    return "warning";
  };

  const Icon = crew?.icon || FileText;

  const crewIdentity: CrewIdentity = {
    crewId: "content_decay",
    crewName: crew?.nickname || "Sentinel",
    subtitle: crew?.role || "Content Decay Monitor",
    description: "Detect, prioritize, and reverse content decay before rankings and traffic are lost.",
    avatar: <Icon className="w-6 h-6" style={{ color: crew?.color || "#6366F1" }} />,
    accentColor: crew?.color || "#6366F1",
    capabilities: ["Content Analysis", "Trend Detection", "Refresh Prioritization"],
    monitors: ["Keyword Positions", "Traffic Trends", "Content Freshness"],
  };

  const criticalCount = decayingContent.filter(c => c.decaySeverity === "critical").length;
  const warningCount = decayingContent.filter(c => c.decaySeverity === "warning").length;
  const mildCount = decayingContent.filter(c => c.decaySeverity === "mild").length;
  const fixableCount = decayingContent.filter(c => c.fixable).length;

  const missionPrompt: MissionPromptConfig = {
    label: "Ask Sentinel",
    placeholder: "e.g., Why is this page losing rankings? What content needs refreshing?",
    onSubmit: (question) => {
      console.log("Question for Sentinel:", question);
      toast.info("Analyzing your content decay question...");
    },
  };

  const headerActions: HeaderAction[] = [
    {
      id: "run-scan",
      icon: <Play className="w-4 h-4" />,
      tooltip: "Scan for content decay",
      onClick: () => detectDecayMutation.mutate(),
      disabled: detectDecayMutation.isPending,
      loading: detectDecayMutation.isPending,
      variant: "primary" as const,
    },
  ];

  const inspectorTabs: InspectorTab[] = [
    {
      id: "findings",
      label: "Decaying Content",
      badge: decayingContent.length > 0 ? decayingContent.length : undefined,
    },
    {
      id: "trends",
      label: "Trends",
    },
  ];

  const kpiDescriptors: KpiDescriptor[] = [
    {
      key: "decayingPages",
      label: "Decaying Pages",
      tooltip: "Number of URLs showing statistically significant ranking or traffic decline",
    },
    {
      key: "keywordsAtRisk",
      label: "Keywords at Risk",
      tooltip: "Count of keywords that dropped ≥5 positions or exited Top 20 in the last period",
    },
    {
      key: "trafficLossRisk",
      label: "Traffic Loss Risk",
      tooltip: "Estimated monthly traffic at risk from decaying pages",
    },
    {
      key: "avgDecaySeverity",
      label: "Avg Decay Severity",
      tooltip: "Average severity score across all decaying pages (0-100)",
    },
  ];

  const keyMetrics = useMemo(() => [
    {
      id: "decaying-pages",
      label: "Decaying Pages",
      value: metrics.decayingPages ?? 0,
      icon: FileText,
      status: getDecayingPagesStatus(metrics.decayingPages ?? 0),
    },
    {
      id: "keywords-at-risk",
      label: "Keywords at Risk",
      value: metrics.keywordsAtRisk ?? 0,
      icon: Target,
      status: (metrics.keywordsAtRisk ?? 0) > 5 ? "warning" : ("good" as const),
    },
    {
      id: "traffic-loss-risk",
      label: "Traffic at Risk",
      value: metrics.trafficLossRisk ?? 0,
      icon: TrendingDown,
      status: (metrics.trafficLossRisk ?? 0) > 1000 ? "warning" : ("good" as const),
    },
    {
      id: "avg-decay-severity",
      label: "Avg Severity",
      value: metrics.avgDecaySeverity ?? 0,
      icon: Flame,
      status: getSeverityStatus(metrics.avgDecaySeverity ?? 0),
    },
  ], [metrics]);

  return (
    <CrewPageLayout crewId="sentinel">
      <CrewDashboardShell
        crew={crewIdentity}
        agentScore={100 - (metrics.avgDecaySeverity ?? 0)}
        agentScoreTooltip="Content health score - inverse of average decay severity"
        missionPrompt={missionPrompt}
        inspectorTabs={[]}
        headerActions={headerActions}
        customMetrics={<KeyMetricsGrid metrics={keyMetrics} accentColor={crewIdentity.accentColor} />}
        onRefresh={() => detectDecayMutation.mutate()}
        isLoading={isLoading}
        isRefreshing={crewIsRefreshing}
        dataUpdatedAt={crewDataUpdatedAt}
      >
      <div className="space-y-6">

        <Card className="border-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-indigo-500" />
              Sentinel Missions
            </CardTitle>
            <CardDescription className="text-sm">
              Defensive actions to detect and reverse content decay
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {missions.map((mission) => (
              <div
                key={mission.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card/50 hover:bg-card/80 transition-colors"
                data-testid={`mission-${mission.id}`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                    {mission.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{mission.label}</span>
                      {mission.badge && (
                        <Badge variant="secondary" className="text-xs bg-semantic-warning-soft text-semantic-warning">
                          {mission.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{mission.description}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={mission.action}
                  disabled={mission.disabled || mission.isLoading}
                  data-testid={`button-${mission.id}`}
                >
                  {mission.isLoading ? (
                    <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <Play className="w-3 h-3 mr-1" />
                  )}
                  Run
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-muted/50">
          <CardHeader className="pb-2">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "findings" | "trends")}>
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="findings" className="text-sm" data-testid="tab-findings">
                    Decaying Content
                    {decayingContent.length > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs">{decayingContent.length}</Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="trends" className="text-sm" data-testid="tab-trends">
                    Trends
                  </TabsTrigger>
                </TabsList>
                {activeTab === "findings" && criticalCount > 0 && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => bulkRefreshMutation.mutate()}
                    disabled={bulkRefreshMutation.isPending}
                    data-testid="button-bulk-refresh"
                  >
                    {bulkRefreshMutation.isPending ? (
                      <RefreshCw className="w-3 h-3 animate-spin mr-1" />
                    ) : (
                      <Zap className="w-3 h-3 mr-1" />
                    )}
                    Refresh All Critical ({criticalCount})
                  </Button>
                )}
              </div>
            </Tabs>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab}>
              <TabsContent value="findings" className="mt-0">
                <DecayingContentTable
                  content={decayingContent}
                  onFix={(item) => refreshContentMutation.mutate(item)}
                />
              </TabsContent>
              <TabsContent value="trends" className="mt-0">
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Tracking content decay signals over time. Are we stabilizing or bleeding?
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <TrendChart
                      data={trends}
                      dataKey="decayingPages"
                      label="Decaying Pages"
                      color="#ef4444"
                    />
                    <TrendChart
                      data={trends}
                      dataKey="trafficAtRisk"
                      label="Traffic at Risk"
                      color="#f59e0b"
                    />
                    <DualLineChart
                      data={trends}
                      dataKey1="keywordsLost"
                      dataKey2="keywordsRecovered"
                      label1="Lost"
                      label2="Recovered"
                      color1="#ef4444"
                      color2="#22c55e"
                      title="Keywords Lost vs Recovered"
                    />
                    <DualLineChart
                      data={trends}
                      dataKey1="pagesRefreshed"
                      dataKey2="pagesRecovered"
                      label1="Refreshed"
                      label2="Recovered"
                      color1="#6366f1"
                      color2="#22c55e"
                      title="Fix Effectiveness"
                    />
                  </div>
                  {trends.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Activity className="w-10 h-10 text-muted-foreground mb-3" />
                      <p className="font-medium text-muted-foreground">No trend data yet</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Run Sentinel to begin tracking decay signals over time.
                      </p>
                      <Button
                        size="sm"
                        className="mt-4"
                        onClick={() => detectDecayMutation.mutate()}
                        data-testid="button-run-scan-trends"
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Run Scan
                      </Button>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {metrics.lastScanAt && (
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>
              Last scan: {new Date(metrics.lastScanAt).toLocaleString()}
            </span>
          </div>
        )}
      </div>
    </CrewDashboardShell>
    </CrewPageLayout>
  );
}
