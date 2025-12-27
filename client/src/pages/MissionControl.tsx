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

interface MetricCardData {
  id: string;
  label: string;
  value: string;
  delta: string;
  deltaPct: number;
  verdict: 'good' | 'watch' | 'bad' | 'neutral';
  sparkline: number[];
  nextAction: { text: string; link: string };
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((val - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <svg viewBox="0 0 100 40" className="w-full h-10" preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function MetricCard({ metric }: { metric: MetricCardData }) {
  const colors = verdictColors[metric.verdict];
  const sparklineColor = metric.verdict === 'good' ? '#22C55E' : metric.verdict === 'watch' ? '#F59E0B' : '#EF4444';
  const TrendIcon = metric.deltaPct > 0 ? TrendingUp : metric.deltaPct < 0 ? TrendingDown : Minus;
  
  return (
    <Card className={cn("transition-all overflow-hidden", colors.bg, colors.border)} data-testid={`metric-card-${metric.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">{metric.label}</span>
          <Badge className={cn("text-xs flex-shrink-0 max-w-[80px] truncate", colors.badge)}>
            {metric.verdict === 'good' ? 'On Track' : metric.verdict === 'watch' ? 'Watch' : 'Needs Work'}
          </Badge>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-bold">{metric.value}</span>
          <span className={cn("text-sm flex items-center gap-1", colors.text)}>
            <TrendIcon className="w-3 h-3" />
            {metric.delta}
          </span>
        </div>
        <div className="h-10 mb-3 -mx-1">
          <MiniSparkline data={metric.sparkline} color={sparklineColor} />
        </div>
        <Link href={metric.nextAction.link}>
          <Button variant="ghost" size="sm" className="text-xs h-7 p-0 hover:bg-transparent">
            {metric.nextAction.text}
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function MetricCardsRow() {
  const metrics: MetricCardData[] = [
    {
      id: 'conversion-rate',
      label: 'Conversion Rate',
      value: '3.2%',
      delta: '-0.5%',
      deltaPct: -0.5,
      verdict: 'watch',
      sparkline: [3.8, 3.6, 3.4, 3.5, 3.3, 3.1, 3.2],
      nextAction: { text: 'Review Pulse', link: '/agents/ga4' },
    },
    {
      id: 'bounce-rate',
      label: 'Bounce Rate',
      value: '42%',
      delta: '+3%',
      deltaPct: 3,
      verdict: 'bad',
      sparkline: [38, 39, 40, 41, 43, 44, 42],
      nextAction: { text: 'Review Speedster', link: '/agents/performance' },
    },
    {
      id: 'leads',
      label: 'Leads / Form Submits',
      value: '127',
      delta: '+12%',
      deltaPct: 12,
      verdict: 'good',
      sparkline: [95, 102, 98, 110, 115, 120, 127],
      nextAction: { text: 'Review Draper', link: '/agents/ads' },
    },
  ];

  return (
    <div data-testid="metric-cards-row">
      <h2 className="text-lg font-semibold mb-4">Key Metrics</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} />
        ))}
      </div>
    </div>
  );
}


function AgentSummaryCard({ agent }: { agent: { serviceId: string; score: number; status: 'good' | 'watch' | 'bad'; keyMetric: string; keyMetricValue: string; delta: string; whatChanged: string } }) {
  const crew = getCrewMember(agent.serviceId);
  const mockData = getMockAgentData(agent.serviceId);
  const statusColors = verdictColors[agent.status];
  
  const scoreColor = agent.score >= 70 ? "#22C55E" : agent.score >= 40 ? "#F59E0B" : "#EF4444";
  
  return (
    <Card className={cn("transition-all border", statusColors.border)} data-testid={`agent-summary-${agent.serviceId}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          {crew.avatar ? (
            <img 
              src={crew.avatar} 
              alt={crew.nickname}
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: crew.color }}
            >
              {crew.nickname.slice(0, 2)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm" style={{ color: crew.color }}>{crew.nickname}</h4>
              <span className="text-lg font-bold" style={{ color: scoreColor }}>{agent.score}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">{crew.role}</p>
            <div className="w-full h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
              <div 
                className="h-full rounded-full transition-all"
                style={{ width: `${agent.score}%`, backgroundColor: scoreColor }}
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xl font-bold">{agent.keyMetricValue}</span>
          <span className={cn("text-sm", agent.delta.startsWith('-') ? "text-red-600" : "text-green-600")}>
            {agent.delta}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-1">{agent.keyMetric}</p>
        
        <div className="flex items-center justify-between mt-3 pt-3 border-t">
          <VerdictBadge verdict={agent.status} />
          <Link href={`/agents/${agent.serviceId}`}>
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2">
              Review {crew.nickname} <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
        
        <p className="text-xs text-muted-foreground mt-2 italic">{agent.whatChanged}</p>
      </CardContent>
    </Card>
  );
}

function AgentSummaryGrid({ agents }: { agents: Array<{ serviceId: string; score: number; status: 'good' | 'watch' | 'bad' }> }) {
  const agentData = agents.slice(0, 6).map(agent => {
    const mockData = getMockAgentData(agent.serviceId);
    const finding = mockData?.findings?.[0];
    return {
      ...agent,
      keyMetric: finding?.label || "Agent score",
      keyMetricValue: String(finding?.value || agent.score),
      delta: agent.score >= 70 ? "+5%" : agent.score >= 40 ? "-12%" : "-50%",
      whatChanged: mockData?.nextSteps?.[0]?.action || "Run diagnostics to see insights",
    };
  });

  return (
    <div data-testid="agent-summary-grid">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Agent Summary</h2>
        <Link href="/crew">
          <Button variant="ghost" size="sm" className="text-xs">
            View all agents <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agentData.map((agent) => (
          <AgentSummaryCard key={agent.serviceId} agent={agent} />
        ))}
      </div>
    </div>
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

        <MetricCardsRow />

        <AgentSummaryGrid agents={userAgents} />

        <ActionQueueCard actions={mockActions} />

        <div className="grid gap-6 lg:grid-cols-2">
          <BenchmarkComparison />
          <KnowledgeBaseCard />
        </div>
      </div>
    </DashboardLayout>
  );
}
