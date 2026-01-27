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
  Wrench,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileSearch,
  Globe,
  Zap,
  Shield,
  Server,
  Clock,
  ExternalLink,
  Play,
  Settings2,
  TrendingUp,
  TrendingDown,
  Eye,
  FileText,
  Link2,
  AlertCircle,
  Info,
  Search,
  Activity,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CrawlHealthData {
  crawledUrls: number;
  healthyUrls: number;
  crawlHealthPercent: number;
  indexedUrls: number;
  eligibleUrls: number;
  indexCoveragePercent: number;
  cwvPassingUrls: number;
  cwvTotalUrls: number;
  cwvPassPercent: number;
  criticalIssues: number;
  lastCrawlAt: string | null;
  isConfigured: boolean;
}

interface TechnicalFinding {
  id: string;
  url: string;
  issueType: string;
  severity: "critical" | "warning" | "info";
  category: string;
  description: string;
  fixable: boolean;
  fixAction?: string;
  whyItMatters: string;
}

interface ScottyData {
  health: CrawlHealthData;
  findings: TechnicalFinding[];
  trends: {
    date: string;
    crawlHealth: number;
    indexedUrls: number;
    cwvPass: number;
    criticalIssues: number;
  }[];
}

const MOCK_SCOTTY_DATA: ScottyData = {
  health: {
    crawledUrls: 156,
    healthyUrls: 142,
    crawlHealthPercent: 91,
    indexedUrls: 128,
    eligibleUrls: 145,
    indexCoveragePercent: 88,
    cwvPassingUrls: 112,
    cwvTotalUrls: 156,
    cwvPassPercent: 72,
    criticalIssues: 2,
    lastCrawlAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    isConfigured: true,
  },
  findings: [
    {
      id: "1",
      url: "/old-service-page",
      issueType: "5xx Error",
      severity: "critical",
      category: "Server Errors",
      description: "Page returns 500 Internal Server Error",
      fixable: false,
      whyItMatters: "Search engines cannot crawl or index pages that return server errors, leading to lost rankings.",
    },
    {
      id: "2",
      url: "/blog/draft-post",
      issueType: "Noindex on Indexable",
      severity: "critical",
      category: "Index Blockers",
      description: "Important page has noindex meta tag",
      fixable: true,
      fixAction: "remove_noindex",
      whyItMatters: "This page should be indexed but the noindex tag prevents it from appearing in search results.",
    },
    {
      id: "3",
      url: "/services/therapy",
      issueType: "Redirect Chain",
      severity: "warning",
      category: "Redirects",
      description: "3-hop redirect chain detected",
      fixable: true,
      fixAction: "fix_redirect",
      whyItMatters: "Redirect chains slow crawling and dilute link equity. Direct redirects are preferred.",
    },
    {
      id: "4",
      url: "/about-us",
      issueType: "Duplicate Canonical",
      severity: "warning",
      category: "Canonicalization",
      description: "Multiple pages point to same canonical",
      fixable: true,
      fixAction: "fix_canonical",
      whyItMatters: "Duplicate canonicals can confuse search engines about which page to rank.",
    },
    {
      id: "5",
      url: "/team",
      issueType: "Soft 404",
      severity: "warning",
      category: "Status Codes",
      description: "Page returns 200 but appears to be an error page",
      fixable: false,
      whyItMatters: "Soft 404s waste crawl budget and can hurt user experience.",
    },
    {
      id: "6",
      url: "/contact",
      issueType: "Large DOM Size",
      severity: "info",
      category: "Performance",
      description: "DOM has 1,847 elements (recommended < 1,500)",
      fixable: false,
      whyItMatters: "Large DOMs increase memory usage and slow down style calculations.",
    },
    {
      id: "7",
      url: "/services",
      issueType: "Slow TTFB",
      severity: "info",
      category: "Performance",
      description: "Time to First Byte is 2.3s (recommended < 0.8s)",
      fixable: false,
      whyItMatters: "Slow TTFB delays page rendering and negatively impacts Core Web Vitals.",
    },
    {
      id: "8",
      url: "/blog",
      issueType: "Unused JavaScript",
      severity: "info",
      category: "Performance",
      description: "45KB of JavaScript is not used on initial load",
      fixable: false,
      whyItMatters: "Unused code increases load time and can block rendering.",
    },
  ],
  trends: [
    { date: "2025-12-26", crawlHealth: 85, indexedUrls: 120, cwvPass: 68, criticalIssues: 5 },
    { date: "2025-12-27", crawlHealth: 87, indexedUrls: 122, cwvPass: 70, criticalIssues: 4 },
    { date: "2025-12-28", crawlHealth: 88, indexedUrls: 124, cwvPass: 71, criticalIssues: 3 },
    { date: "2025-12-29", crawlHealth: 89, indexedUrls: 125, cwvPass: 70, criticalIssues: 3 },
    { date: "2025-12-30", crawlHealth: 90, indexedUrls: 126, cwvPass: 71, criticalIssues: 2 },
    { date: "2025-12-31", crawlHealth: 91, indexedUrls: 128, cwvPass: 72, criticalIssues: 2 },
    { date: "2026-01-01", crawlHealth: 91, indexedUrls: 128, cwvPass: 72, criticalIssues: 2 },
  ],
};

function getSeverityColor(severity: string): string {
  switch (severity) {
    case "critical":
      return "text-semantic-danger bg-semantic-danger-soft border-semantic-danger-border";
    case "warning":
      return "text-semantic-warning bg-semantic-warning-soft border-semantic-warning-border";
    case "info":
      return "text-semantic-info bg-semantic-info-soft border-semantic-info-border";
    default:
      return "text-muted-foreground bg-muted/50";
  }
}

function getSeverityIcon(severity: string) {
  switch (severity) {
    case "critical":
      return <XCircle className="w-4 h-4 text-semantic-danger" />;
    case "warning":
      return <AlertTriangle className="w-4 h-4 text-semantic-warning" />;
    case "info":
      return <Info className="w-4 h-4 text-semantic-info" />;
    default:
      return <CheckCircle2 className="w-4 h-4 text-muted-foreground" />;
  }
}

function FindingsTable({ findings, onFix }: { findings: TechnicalFinding[]; onFix: (finding: TechnicalFinding) => void }) {
  const groupedFindings = useMemo(() => {
    const critical = findings.filter(f => f.severity === "critical");
    const warning = findings.filter(f => f.severity === "warning");
    const info = findings.filter(f => f.severity === "info");
    return { critical, warning, info };
  }, [findings]);

  const renderGroup = (title: string, icon: React.ReactNode, items: TechnicalFinding[], description: string) => {
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
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{finding.issueType}</span>
                    <Badge variant="outline" className="text-xs">{finding.category}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{finding.url}</p>
                  <p className="text-xs text-muted-foreground mt-1">{finding.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Info className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="max-w-xs">
                    <p className="text-sm">{finding.whyItMatters}</p>
                  </TooltipContent>
                </Tooltip>
                {finding.fixable ? (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onFix(finding)}
                    data-testid={`button-fix-${finding.id}`}
                  >
                    <Zap className="w-3 h-3 mr-1" />
                    Fix
                  </Button>
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

  return (
    <div className="space-y-6">
      {renderGroup(
        "Critical Issues",
        <XCircle className="w-4 h-4 text-semantic-danger" />,
        groupedFindings.critical,
        "Blocking SEO - fix immediately"
      )}
      {renderGroup(
        "Warnings",
        <AlertTriangle className="w-4 h-4 text-semantic-warning" />,
        groupedFindings.warning,
        "May impact rankings"
      )}
      {renderGroup(
        "Informational",
        <Info className="w-4 h-4 text-semantic-info" />,
        groupedFindings.info,
        "Optimization opportunities"
      )}
      {findings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CheckCircle2 className="w-12 h-12 text-semantic-success mb-3" />
          <p className="font-medium">No technical issues found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Your site is technically healthy. Run a crawl to check for new issues.
          </p>
        </div>
      )}
    </div>
  );
}

function TrendChart({ data, dataKey, label, color }: { data: any[]; dataKey: string; label: string; color: string }) {
  const isPercentMetric = dataKey.includes("Percent") || dataKey === "crawlHealth" || dataKey === "cwvPass";
  
  if (!data || data.length === 0) {
    return (
      <div className="p-4 rounded-lg border bg-card/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">{label}</span>
        </div>
        <div className="text-2xl font-bold mb-3 text-muted-foreground">0{isPercentMetric ? "%" : ""}</div>
        <div className="flex items-center justify-center h-12 text-xs text-muted-foreground">
          No data yet - run a crawl to populate
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
                <TrendingUp className="w-3 h-3 text-semantic-success" />
              ) : (
                <TrendingDown className="w-3 h-3 text-semantic-danger" />
              )}
              <span className={cn(
                "text-xs font-medium",
                trend > 0 ? "text-semantic-success" : "text-semantic-danger"
              )}>
                {trend > 0 ? "+" : ""}{trend}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="text-2xl font-bold mb-3">{latest}{isPercentMetric ? "%" : ""}</div>
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

export default function ScottyContent() {
  const crew = getCrewMember("crawl_render");
  const { activeSite } = useSiteContext();
  const siteId = activeSite?.id || "default";
  const { score: unifiedScore, isRefreshing: crewIsRefreshing, dataUpdatedAt: crewDataUpdatedAt } = useCrewStatus({ siteId, crewId: 'scotty' });
  const queryClient = useQueryClient();
  const [fixingIssue, setFixingIssue] = useState<string | null>(null);

  const { data: scottyData, isLoading, refetch, isRefetching } = useQuery<ScottyData & { isRealData?: boolean; provenance?: string }>({
    queryKey: ["scotty-dashboard", siteId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/crew/scotty/dashboard?siteId=${siteId}`);
        if (!res.ok) {
          return { ...MOCK_SCOTTY_DATA, isRealData: false, provenance: "sample" };
        }
        const data = await res.json();
        if (!data.ok) {
          return { ...MOCK_SCOTTY_DATA, isRealData: false, provenance: "sample" };
        }
        return {
          health: data.health,
          findings: data.findings || [],
          trends: data.trends || MOCK_SCOTTY_DATA.trends,
          isRealData: data.isRealData,
          provenance: data.provenance,
        };
      } catch {
        return { ...MOCK_SCOTTY_DATA, isRealData: false, provenance: "sample" };
      }
    },
    refetchInterval: 60000,
  });

  const runCrawlMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/scotty/crawl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId }),
      });
      if (!res.ok) throw new Error("Failed to start crawl");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Site crawl started");
      queryClient.invalidateQueries({ queryKey: ["scotty-data"] });
    },
    onError: () => {
      toast.error("Failed to start crawl");
    },
  });

  const checkIndexingMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/scotty/check-indexing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId }),
      });
      if (!res.ok) throw new Error("Failed to check indexing");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Indexing check complete");
      queryClient.invalidateQueries({ queryKey: ["scotty-data"] });
    },
    onError: () => {
      toast.error("Failed to check indexing");
    },
  });

  const auditCwvMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/scotty/audit-cwv`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId }),
      });
      if (!res.ok) throw new Error("Failed to audit CWV");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Core Web Vitals audit complete");
      queryClient.invalidateQueries({ queryKey: ["scotty-data"] });
    },
    onError: () => {
      toast.error("Failed to audit Core Web Vitals");
    },
  });

  const fixIssueMutation = useMutation({
    mutationFn: async (finding: TechnicalFinding) => {
      setFixingIssue(finding.id);
      const res = await fetch(`/api/scotty/fix-issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          site_id: siteId, 
          finding_id: finding.id,
          fix_action: finding.fixAction,
          url: finding.url,
        }),
      });
      if (!res.ok) throw new Error("Failed to fix issue");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Issue fixed successfully");
      queryClient.invalidateQueries({ queryKey: ["scotty-data"] });
    },
    onError: () => {
      toast.error("Failed to fix issue");
    },
    onSettled: () => {
      setFixingIssue(null);
    },
  });

  const data = scottyData || MOCK_SCOTTY_DATA;
  const health = data.health;

  const Icon = crew.icon;

  const crewIdentity: CrewIdentity = {
    crewId: "crawl_render",
    crewName: crew.nickname,
    subtitle: crew.role,
    description: "Ensures your site is crawlable, indexable, fast, and technically sound so other agents can succeed.",
    avatar: <Icon className="w-6 h-6" style={{ color: crew.color }} />,
    accentColor: crew.color,
    capabilities: crew.capabilities || [],
    monitors: ["Crawlability", "Indexability", "Core Web Vitals", "Technical Health"],
  };

  const getCrawlHealthStatus = (percent: number): "good" | "warning" | "neutral" => {
    if (percent >= 90) return "good";
    if (percent >= 70) return "warning";
    return "neutral";
  };

  const getIndexCoverageStatus = (percent: number): "good" | "warning" | "neutral" => {
    if (percent >= 90) return "good";
    if (percent >= 70) return "warning";
    return "neutral";
  };

  const getCwvStatus = (percent: number): "good" | "warning" | "neutral" => {
    if (percent >= 75) return "good";
    if (percent >= 50) return "warning";
    return "neutral";
  };

  const getCriticalIssuesStatus = (count: number): "good" | "warning" | "neutral" => {
    if (count === 0) return "good";
    if (count <= 3) return "warning";
    return "neutral";
  };

  const keyMetrics = useMemo(() => [
    {
      id: "crawl-health",
      label: "Crawl Health",
      value: `${health.crawlHealthPercent}%`,
      icon: Globe,
      status: getCrawlHealthStatus(health.crawlHealthPercent),
    },
    {
      id: "index-coverage",
      label: "Index Coverage",
      value: `${health.indexCoveragePercent}%`,
      icon: FileSearch,
      status: getIndexCoverageStatus(health.indexCoveragePercent),
    },
    {
      id: "cwv-pass",
      label: "Core Web Vitals",
      value: `${health.cwvPassPercent}%`,
      icon: Zap,
      status: getCwvStatus(health.cwvPassPercent),
    },
    {
      id: "critical-issues",
      label: "Critical Issues",
      value: health.criticalIssues,
      icon: AlertTriangle,
      status: getCriticalIssuesStatus(health.criticalIssues),
    },
  ], [health]);

  const kpis: KpiDescriptor[] = useMemo(() => [
    {
      id: "crawled",
      label: "URLs Crawled",
      value: health.crawledUrls,
      status: isLoading ? "loading" : "ready",
    },
    {
      id: "indexed",
      label: "URLs Indexed",
      value: health.indexedUrls,
      status: isLoading ? "loading" : "ready",
    },
    {
      id: "cwv-passing",
      label: "CWV Passing",
      value: health.cwvPassingUrls,
      status: isLoading ? "loading" : "ready",
    },
  ], [health, isLoading]);

  const criticalCount = data.findings.filter(f => f.severity === "critical").length;
  const warningCount = data.findings.filter(f => f.severity === "warning").length;
  const fixableCount = data.findings.filter(f => f.fixable).length;


  const findingsTab: InspectorTab = {
    id: "findings",
    label: "Findings",
    icon: <Search className="w-4 h-4" />,
    badge: data.findings.length || undefined,
    state: isLoading ? "loading" : data.findings.length > 0 ? "ready" : "empty",
    content: (
      <div className="p-4">
        <FindingsTable 
          findings={data.findings} 
          onFix={(finding) => fixIssueMutation.mutate(finding)} 
        />
      </div>
    ),
  };

  const trendsTab: InspectorTab = {
    id: "trends",
    label: "Trends",
    icon: <BarChart3 className="w-4 h-4" />,
    state: data.trends.length > 0 ? "ready" : "empty",
    content: (
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TrendChart
            data={data.trends}
            dataKey="crawlHealth"
            label="Crawl Health %"
            color="#22c55e"
          />
          <TrendChart
            data={data.trends}
            dataKey="indexedUrls"
            label="Indexed URLs"
            color="#3b82f6"
          />
          <TrendChart
            data={data.trends}
            dataKey="cwvPass"
            label="CWV Pass Rate %"
            color="#a855f7"
          />
          <TrendChart
            data={data.trends}
            dataKey="criticalIssues"
            label="Critical Issues"
            color="#ef4444"
          />
        </div>
      </div>
    ),
  };

  const controlsTab: InspectorTab = {
    id: "controls",
    label: "Controls",
    icon: <Settings2 className="w-4 h-4" />,
    state: "ready",
    content: (
      <div className="p-4 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            onClick={() => runCrawlMutation.mutate()}
            disabled={runCrawlMutation.isPending}
            data-testid="button-run-crawl"
          >
            {runCrawlMutation.isPending ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Run Site Crawl
          </Button>
          <Button
            variant="outline"
            onClick={() => checkIndexingMutation.mutate()}
            disabled={checkIndexingMutation.isPending}
            data-testid="button-check-indexing"
          >
            {checkIndexingMutation.isPending ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileSearch className="w-4 h-4 mr-2" />
            )}
            Check Indexing
          </Button>
          <Button
            variant="outline"
            onClick={() => auditCwvMutation.mutate()}
            disabled={auditCwvMutation.isPending}
            data-testid="button-audit-cwv"
          >
            {auditCwvMutation.isPending ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            Audit Core Web Vitals
          </Button>
          <Button
            variant="outline"
            onClick={() => refetch()}
            disabled={isRefetching}
            data-testid="button-refresh-data"
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isRefetching && "animate-spin")} />
            Refresh Data
          </Button>
        </div>

        {health.lastCrawlAt && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-2">Last Crawl</h4>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{new Date(health.lastCrawlAt).toLocaleString()}</span>
            </div>
          </div>
        )}

        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-3">Crawl Summary</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">URLs Crawled</span>
              <span className="font-medium">{health.crawledUrls}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Healthy (200 OK)</span>
              <span className="font-medium text-semantic-success">{health.healthyUrls}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Indexed</span>
              <span className="font-medium">{health.indexedUrls} / {health.eligibleUrls}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">CWV Passing</span>
              <span className="font-medium">{health.cwvPassingUrls} / {health.cwvTotalUrls}</span>
            </div>
          </div>
        </div>
      </div>
    ),
  };

  const inspectorTabs: InspectorTab[] = [findingsTab, trendsTab, controlsTab];

  const missionPrompt: MissionPromptConfig = {
    label: "Ask Scotty",
    placeholder: "e.g., Why aren't some pages indexing? What's causing slow TTFB?",
    onSubmit: (question) => {
      console.log("Question for Scotty:", question);
      toast.info("Analyzing your technical question...");
    },
  };

  const headerActions: HeaderAction[] = [
    {
      id: "refresh",
      icon: <RefreshCw className={cn("w-4 h-4", isRefetching && "animate-spin")} />,
      tooltip: "Refresh data",
      onClick: () => refetch(),
      loading: isRefetching,
    },
    {
      id: "run-crawl",
      icon: <Play className="w-4 h-4" />,
      tooltip: "Start site crawl",
      onClick: () => runCrawlMutation.mutate(),
      disabled: runCrawlMutation.isPending,
      loading: runCrawlMutation.isPending,
      variant: "primary" as const,
    },
  ];

  if (!health.isConfigured) {
    return (
      <CrewPageLayout crewId="scotty">
        <CrewDashboardShell
          crew={crewIdentity}
          agentScore={null}
          agentScoreTooltip="Technical health score"
          kpis={[]}
          inspectorTabs={[]}
          headerActions={[]}
          isRefreshing={crewIsRefreshing}
          dataUpdatedAt={crewDataUpdatedAt}
        >
          <Card className="border-semantic-warning/30 bg-semantic-warning-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-semantic-warning">
                <AlertTriangle className="w-5 h-5" />
                Scotty Not Configured
              </CardTitle>
              <CardDescription>
                Configure the crawl-render worker to enable technical SEO monitoring.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => runCrawlMutation.mutate()} data-testid="button-configure-scotty">
                <Settings2 className="w-4 h-4 mr-2" />
                Run Crawl to Populate
              </Button>
            </CardContent>
          </Card>
        </CrewDashboardShell>
      </CrewPageLayout>
    );
  }

  return (
    <CrewPageLayout crewId="scotty">
      <CrewDashboardShell
        crew={crewIdentity}
        agentScore={health.crawlHealthPercent}
        agentScoreTooltip="Crawl health percentage - % of URLs returning valid 200 responses"
        kpis={kpis}
        customMetrics={<KeyMetricsGrid metrics={keyMetrics} accentColor={crewIdentity.accentColor} />}
        inspectorTabs={inspectorTabs}
        missionPrompt={missionPrompt}
        headerActions={headerActions}
        onRefresh={() => refetch()}
        onSettings={() => toast.info("Settings coming soon")}
        isRefreshing={isRefetching || crewIsRefreshing}
        dataUpdatedAt={crewDataUpdatedAt}
      />
    </CrewPageLayout>
  );
}
