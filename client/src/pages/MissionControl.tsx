import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Compass, 
  Play, 
  Download, 
  AlertCircle, 
  ArrowRight, 
  TrendingUp, 
  TrendingDown,
  Minus,
  CheckCircle2,
  Clock,
  Loader2,
  ExternalLink,
  AlertTriangle,
  ChevronRight
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSiteContext } from "@/hooks/useSiteContext";
import { USER_FACING_AGENTS, getCrewMember } from "@/config/agents";
import { getMockAgentData } from "@/config/mockAgentInsights";
import { getMockCaptainRecommendations } from "@/config/mockCaptainRecommendations";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { toast } from "sonner";
import { BenchmarkComparison } from "@/components/dashboard/BenchmarkComparison";
import { KnowledgeBaseCard } from "@/components/dashboard/KnowledgeBaseCard";
import { TicketList } from "@/components/dashboard/TicketList";

interface OutcomeTile {
  id: string;
  label: string;
  value: string | number;
  delta?: string;
  deltaPct?: number;
  verdict: 'good' | 'watch' | 'bad' | 'neutral';
  reason: string;
  nextAction: { text: string; link?: string };
  agentId?: string;
}

const verdictColors = {
  good: { bg: "bg-green-50", border: "border-green-200", text: "text-green-700", badge: "bg-green-100 text-green-700" },
  watch: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", badge: "bg-amber-100 text-amber-700" },
  bad: { bg: "bg-red-50", border: "border-red-200", text: "text-red-700", badge: "bg-red-100 text-red-700" },
  neutral: { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-600", badge: "bg-slate-100 text-slate-600" },
};

function VerdictBadge({ verdict }: { verdict: 'good' | 'watch' | 'bad' | 'neutral' }) {
  const labels = { good: "Good", watch: "Watch", bad: "Bad", neutral: "No Data" };
  return (
    <Badge className={cn("text-xs", verdictColors[verdict].badge)}>
      {labels[verdict]}
    </Badge>
  );
}

function ImpactBadge({ impact }: { impact: "High" | "Medium" | "Low" }) {
  const colors = {
    High: "bg-red-100 text-red-700",
    Medium: "bg-amber-100 text-amber-700",
    Low: "bg-green-100 text-green-700",
  };
  return <Badge className={cn("text-xs", colors[impact])}>{impact}</Badge>;
}

function EffortBadge({ effort }: { effort: "S" | "M" | "L" }) {
  const labels = { S: "Quick", M: "Medium", L: "Long" };
  return (
    <Badge variant="outline" className="text-xs">
      {labels[effort]}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    new: "bg-blue-100 text-blue-700",
    reviewed: "bg-purple-100 text-purple-700",
    approved: "bg-green-100 text-green-700",
    done: "bg-slate-100 text-slate-600",
  };
  return <Badge className={cn("text-xs capitalize", colors[status] || colors.new)}>{status}</Badge>;
}

function OutcomeTileCard({ tile }: { tile: OutcomeTile }) {
  const colors = verdictColors[tile.verdict];
  const TrendIcon = tile.deltaPct && tile.deltaPct > 0 ? TrendingUp : tile.deltaPct && tile.deltaPct < 0 ? TrendingDown : Minus;
  
  return (
    <Card className={cn("transition-all hover:shadow-md", colors.bg, colors.border)} data-testid={`outcome-tile-${tile.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">{tile.label}</span>
          <VerdictBadge verdict={tile.verdict} />
        </div>
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-2xl font-bold">{tile.value}</span>
          {tile.delta && (
            <span className={cn("text-sm flex items-center gap-1", colors.text)}>
              <TrendIcon className="w-3 h-3" />
              {tile.delta}
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-3">{tile.reason}</p>
        <Link href={tile.nextAction.link || "#"}>
          <Button variant="ghost" size="sm" className="text-xs h-7 p-0 hover:bg-transparent">
            {tile.nextAction.text}
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function AgentHighlightStrip({ agents }: { agents: Array<{ serviceId: string; score: number; status: 'good' | 'watch' | 'bad' }> }) {
  return (
    <Card data-testid="agent-highlights">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Agent Highlights</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {agents.map((agent) => {
            const crew = getCrewMember(agent.serviceId);
            const statusColors = {
              good: "border-green-300 bg-green-50",
              watch: "border-amber-300 bg-amber-50",
              bad: "border-red-300 bg-red-50",
            };
            
            return (
              <Link key={agent.serviceId} href={`/agents/${agent.serviceId}`}>
                <div 
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all hover:shadow-md cursor-pointer",
                    statusColors[agent.status]
                  )}
                  data-testid={`agent-highlight-${agent.serviceId}`}
                >
                  {crew.avatar ? (
                    <img 
                      src={crew.avatar} 
                      alt={crew.nickname} 
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: crew.color }}
                    >
                      {crew.nickname.slice(0, 2)}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-medium">{crew.nickname}</div>
                    <div className="text-xs text-muted-foreground">{agent.score}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function ActionQueueCard({ actions }: { actions: Array<{ id: number; title: string; sourceAgents: string[]; impact: string; effort: string; status: string }> }) {
  return (
    <Card data-testid="action-queue">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Action Queue</CardTitle>
          <Badge variant="outline">{actions.length} pending</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No pending actions. Run diagnostics to generate recommendations.</p>
          </div>
        ) : (
          actions.map((action, idx) => (
            <div 
              key={action.id} 
              className="flex items-start gap-4 p-4 rounded-lg bg-muted/50 border"
              data-testid={`action-item-${action.id}`}
            >
              <div className={cn(
                "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                idx === 0 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"
              )}>
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">{action.title}</h4>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground">Sources:</span>
                  {action.sourceAgents?.map((agentId) => {
                    const crew = getCrewMember(agentId);
                    return (
                      <Badge 
                        key={agentId} 
                        variant="outline" 
                        className="text-xs"
                        style={{ borderColor: crew.color, color: crew.color }}
                      >
                        {crew.nickname}
                      </Badge>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <ImpactBadge impact={action.impact as any || "Medium"} />
                  <EffortBadge effort={action.effort as any || "M"} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs">
                  Review
                </Button>
                <Button variant="outline" size="sm" className="text-xs">
                  Approve
                </Button>
                <Button variant="ghost" size="sm" className="text-xs">
                  Export Prompt
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function CaptainsRecommendationsSection({ priorities, blockers, confidence, coverage, updatedAt }: {
  priorities: any[];
  blockers: any[];
  confidence: string;
  coverage: { active: number; total: number };
  updatedAt?: string;
}) {
  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent" data-testid="captains-recommendations">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Compass className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Recommendations</CardTitle>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <span>Sourced from {coverage.active} agents</span>
                {updatedAt && (
                  <>
                    <span>•</span>
                    <Clock className="w-3 h-3" />
                    <span>Updated {updatedAt}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn(
              "text-xs",
              confidence === "High" ? "bg-green-100 text-green-700" :
              confidence === "Medium" ? "bg-amber-100 text-amber-700" :
              "bg-red-100 text-red-700"
            )}>
              {confidence} Confidence
            </Badge>
            <Badge variant="outline" className="text-xs">
              {coverage.active}/{coverage.total} agents
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <h4 className="text-sm font-medium text-muted-foreground mb-3">PRIORITY ACTIONS</h4>
        <div className="grid gap-3 lg:grid-cols-2">
          {priorities.slice(0, 3).map((priority, idx) => (
            <div 
              key={idx} 
              className="flex gap-4 p-4 rounded-lg bg-muted/50 border"
              data-testid={`priority-${idx + 1}`}
            >
              <div className={cn(
                "flex-shrink-0 w-8 h-8 rounded-full font-bold flex items-center justify-center text-sm",
                idx === 0 ? "bg-red-100 text-red-700" : 
                idx === 1 ? "bg-amber-100 text-amber-700" : 
                "bg-slate-100 text-slate-600"
              )}>
                {idx + 1}
              </div>
              <div className="flex-1 space-y-2">
                <h4 className="font-medium text-sm">{priority.title}</h4>
                <p className="text-xs text-muted-foreground">{priority.why}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {priority.agents?.map((agent: any) => {
                    const crew = getCrewMember(agent.id);
                    return (
                      <Badge 
                        key={agent.id} 
                        variant="outline" 
                        className="text-xs"
                        style={{ borderColor: crew.color, color: crew.color }}
                      >
                        {agent.name}
                      </Badge>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <ImpactBadge impact={priority.impact || "Medium"} />
                    <EffortBadge effort={priority.effort || "M"} />
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs h-7">
                    Review <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {blockers.length > 0 && (
          <>
            <Separator className="my-4" />
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h4 className="text-sm font-medium text-amber-800 flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4" />
                BLOCKERS
              </h4>
              <div className="space-y-2">
                {blockers.map((blocker, idx) => {
                  const crew = getCrewMember(blocker.id);
                  return (
                    <div key={idx} className="flex items-start gap-3 text-sm">
                      <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-medium" style={{ color: crew.color }}>{blocker.title}</span>
                        <span className="text-muted-foreground"> — {blocker.fix}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function MissionControl() {
  const { currentSite } = useSiteContext();
  const queryClient = useQueryClient();

  const { data: dashboardStats } = useQuery({
    queryKey: ["dashboard-stats", currentSite?.siteId],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/stats?siteId=${currentSite?.siteId || ""}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: !!currentSite,
  });

  const runDiagnostics = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/run", { method: "POST" });
      if (!res.ok) throw new Error("Failed to run diagnostics");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Diagnostics started");
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: () => {
      toast.error("Failed to start diagnostics");
    },
  });

  const userAgents = USER_FACING_AGENTS.map((serviceId) => {
    const mockData = getMockAgentData(serviceId);
    const score = mockData?.score || 0;
    return {
      serviceId,
      score,
      status: score >= 70 ? 'good' as const : score >= 40 ? 'watch' as const : 'bad' as const,
    };
  });

  const captainData = getMockCaptainRecommendations();

  const outcomeTiles: OutcomeTile[] = [
    {
      id: "traffic",
      label: "Website Traffic",
      value: dashboardStats?.organicTraffic?.recent7d?.toLocaleString() || "—",
      delta: dashboardStats?.organicTraffic?.changePercent ? `${dashboardStats.organicTraffic.changePercent > 0 ? '+' : ''}${dashboardStats.organicTraffic.changePercent.toFixed(0)}%` : undefined,
      deltaPct: dashboardStats?.organicTraffic?.changePercent,
      verdict: !dashboardStats?.organicTraffic ? 'neutral' : 
        dashboardStats.organicTraffic.changePercent > 5 ? 'good' : 
        dashboardStats.organicTraffic.changePercent < -10 ? 'bad' : 'watch',
      reason: !dashboardStats?.organicTraffic ? "Run diagnostics to fetch GA4 data" :
        dashboardStats.organicTraffic.changePercent > 5 ? "Traffic growing steadily" :
        dashboardStats.organicTraffic.changePercent < -10 ? "Traffic declining, investigate ranking drops" :
        "Traffic stable, monitor for changes",
      nextAction: { text: "Review Popular", link: "/agents/google_data_connector" },
      agentId: "google_data_connector",
    },
    {
      id: "technical",
      label: "Technical SEO",
      value: dashboardStats?.webChecks ? `${Math.round((dashboardStats.webChecks.passed / dashboardStats.webChecks.total) * 100)}%` : "—",
      verdict: !dashboardStats?.webChecks ? 'neutral' :
        dashboardStats.webChecks.passed / dashboardStats.webChecks.total >= 0.9 ? 'good' :
        dashboardStats.webChecks.passed / dashboardStats.webChecks.total >= 0.75 ? 'watch' : 'bad',
      reason: !dashboardStats?.webChecks ? "Run diagnostics to check site health" :
        dashboardStats.webChecks.passed === dashboardStats.webChecks.total ? "All checks passing" :
        `${dashboardStats.webChecks.total - dashboardStats.webChecks.passed} issues found`,
      nextAction: { text: "Review Scotty", link: "/agents/crawl_render" },
      agentId: "crawl_render",
    },
    {
      id: "keywords",
      label: "Keyword Rankings",
      value: dashboardStats?.keywords?.top10Count || "—",
      delta: dashboardStats?.keywords?.positionChange ? `${dashboardStats.keywords.positionChange > 0 ? '+' : ''}${dashboardStats.keywords.positionChange.toFixed(1)}` : undefined,
      deltaPct: dashboardStats?.keywords?.positionChange,
      verdict: !dashboardStats?.keywords ? 'neutral' :
        dashboardStats.keywords.top10Count >= 15 ? 'good' :
        dashboardStats.keywords.top10Count >= 5 ? 'watch' : 'bad',
      reason: !dashboardStats?.keywords ? "Run SERP tracking to monitor rankings" :
        `${dashboardStats.keywords.top10Count} keywords in top 10`,
      nextAction: { text: "Review Lookout", link: "/keywords" },
      agentId: "serp_intel",
    },
    {
      id: "authority",
      label: "Domain Authority",
      value: dashboardStats?.authority?.score || "—",
      delta: dashboardStats?.authority?.change ? `+${dashboardStats.authority.change}` : undefined,
      verdict: !dashboardStats?.authority ? 'neutral' :
        dashboardStats.authority.score >= 30 ? 'good' :
        dashboardStats.authority.score >= 15 ? 'watch' : 'bad',
      reason: !dashboardStats?.authority ? "Connect Beacon to track authority" :
        `${dashboardStats.authority.newBacklinks || 0} new backlinks this week`,
      nextAction: { text: "Review Beacon", link: "/agents/backlink_authority" },
      agentId: "backlink_authority",
    },
  ];

  const mockActions = captainData.priorities.map((p, idx) => ({
    id: idx + 1,
    title: p.title,
    sourceAgents: p.agents.map((a: any) => a.id),
    impact: p.impact,
    effort: p.effort,
    status: "new",
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="mission-control-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Compass className="w-7 h-7 text-primary" />
              Mission Control
            </h1>
            <p className="text-muted-foreground text-sm">
              Daily diagnostic report for <span className="font-medium">{currentSite?.displayName || "your site"}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button 
              size="sm" 
              onClick={() => runDiagnostics.mutate()}
              disabled={runDiagnostics.isPending}
            >
              {runDiagnostics.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Run Diagnostics
            </Button>
          </div>
        </div>

        <CaptainsRecommendationsSection 
          priorities={captainData.priorities}
          blockers={captainData.blockers}
          confidence={captainData.confidence}
          coverage={captainData.coverage}
          updatedAt={captainData.generated_at ? new Date(captainData.generated_at).toLocaleDateString() : undefined}
        />

        <div>
          <h2 className="text-lg font-semibold mb-4">Key Outcomes</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {outcomeTiles.map((tile) => (
              <OutcomeTileCard key={tile.id} tile={tile} />
            ))}
          </div>
        </div>

        <AgentHighlightStrip agents={userAgents} />

        <ActionQueueCard actions={mockActions} />

        <div className="grid gap-6 lg:grid-cols-2">
          <BenchmarkComparison />
          <KnowledgeBaseCard />
        </div>

        <Card data-testid="diagnostic-tickets">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Diagnostic Tickets</CardTitle>
              <Link href="/tickets">
                <Button variant="ghost" size="sm" className="text-xs">
                  View all <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <TicketList limit={5} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
