import { useState } from "react";
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
  ChevronRight,
  Info,
  Package,
  Target
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSiteContext } from "@/hooks/useSiteContext";
import { SiteSelector } from "@/components/site/SiteSelector";
import { USER_FACING_AGENTS, getCrewMember } from "@/config/agents";
import { getMockAgentData } from "@/config/mockAgentInsights";
import { getMockCaptainRecommendations } from "@/config/mockCaptainRecommendations";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { toast } from "sonner";
import { BenchmarkComparison } from "@/components/dashboard/BenchmarkComparison";
import { KnowledgeBaseCard } from "@/components/dashboard/KnowledgeBaseCard";
import { ExportFixPackModal } from "@/components/export/ExportFixPackModal";
import { MissionDetailsModal } from "@/components/dashboard/MissionDetailsModal";

const verdictColors = {
  good: { bg: "bg-semantic-success-soft", border: "border-semantic-success-border", text: "text-semantic-success", badge: "bg-semantic-success-soft text-semantic-success" },
  watch: { bg: "bg-semantic-warning-soft", border: "border-semantic-warning-border", text: "text-semantic-warning", badge: "bg-semantic-warning-soft text-semantic-warning" },
  bad: { bg: "bg-semantic-danger-soft", border: "border-semantic-danger-border", text: "text-semantic-danger", badge: "bg-semantic-danger-soft text-semantic-danger" },
  neutral: { bg: "bg-muted", border: "border-border", text: "text-muted-foreground", badge: "bg-muted text-muted-foreground" },
};

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function getCrewAccentStyles(hexColor: string) {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return {};
  const { r, g, b } = rgb;
  return {
    borderTop: `2px solid rgba(${r}, ${g}, ${b}, 0.5)`,
    boxShadow: `inset 0 1px 0 0 rgba(${r}, ${g}, ${b}, 0.15), 0 0 16px -8px rgba(${r}, ${g}, ${b}, 0.3)`,
  };
}

function getCrewBadgeStyles(hexColor: string) {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return {};
  const { r, g, b } = rgb;
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, 0.15)`,
    color: hexColor,
    borderColor: `rgba(${r}, ${g}, ${b}, 0.4)`,
  };
}

function getHighlightedCardStyles(hexColor: string) {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return {};
  const { r, g, b } = rgb;
  return {
    background: `rgba(${r}, ${g}, ${b}, 0.10)`,
    border: `1px solid rgba(${r}, ${g}, ${b}, 0.30)`,
    boxShadow: `inset 0 1px 0 0 rgba(${r}, ${g}, ${b}, 0.18), 0 0 24px -6px rgba(${r}, ${g}, ${b}, 0.28)`,
  };
}

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
    High: "bg-semantic-danger-soft text-semantic-danger",
    Medium: "bg-semantic-warning-soft text-semantic-warning",
    Low: "bg-semantic-success-soft text-semantic-success",
  };
  return <Badge className={cn("text-xs", colors[impact])}>{impact}</Badge>;
}

function EffortBadge({ effort }: { effort: "S" | "M" | "L" }) {
  const labels = { S: "Quick", M: "Medium", L: "Long" };
  const colors = {
    S: "bg-semantic-info-soft text-semantic-info border-0",
    M: "bg-muted text-muted-foreground border-0",
    L: "bg-primary-soft text-primary border-0",
  };
  return (
    <Badge className={cn("text-xs", colors[effort])}>
      {labels[effort]}
    </Badge>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    new: "bg-semantic-info-soft text-semantic-info",
    reviewed: "bg-primary-soft text-primary",
    approved: "bg-semantic-success-soft text-semantic-success",
    done: "bg-muted text-muted-foreground",
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
  benchmarkLink?: string;
  timeRange: string;
}

function AreaSparkline({ data, color, fillColor }: { data: number[]; color: string; fillColor: string }) {
  const W = 300;
  const H = 64;
  const pad = 10;
  
  const rawMin = Math.min(...data);
  const rawMax = Math.max(...data);
  const range = rawMax - rawMin;
  const yPad = range === 0 ? 1 : range * 0.15;
  const yMin = rawMin - yPad;
  const yMax = rawMax + yPad;
  
  const points = data.map((val, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2);
    const y = H - pad - ((val - yMin) / (yMax - yMin)) * (H - pad * 2);
    return { x, y, val };
  });
  
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${H - pad} L ${points[0].x.toFixed(1)} ${H - pad} Z`;
  
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="64" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={fillColor} stopOpacity="0.4" />
          <stop offset="100%" stopColor={fillColor} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path
        d={areaPath}
        fill={`url(#gradient-${color.replace('#', '')})`}
      />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="4"
          fill="hsl(var(--card))"
          stroke={color}
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}

function MetricCard({ metric, highlighted = false }: { metric: MetricCardData; highlighted?: boolean }) {
  const cardStyles = {
    good: { glow: 'shadow-[inset_0_1px_0_0_rgba(34,197,94,0.15),0_0_20px_-5px_rgba(34,197,94,0.2)]', border: 'border-semantic-success-border', badgeBg: 'bg-semantic-success-soft', badgeText: 'text-semantic-success', lineColor: '#22C55E', fillColor: '#22C55E' },
    watch: { glow: 'shadow-[inset_0_1px_0_0_rgba(234,179,8,0.15),0_0_20px_-5px_rgba(234,179,8,0.2)]', border: 'border-semantic-warning-border', badgeBg: 'bg-semantic-warning-soft', badgeText: 'text-semantic-warning', lineColor: '#EAB308', fillColor: '#EAB308' },
    bad: { glow: 'shadow-[inset_0_1px_0_0_rgba(239,68,68,0.15),0_0_20px_-5px_rgba(239,68,68,0.2)]', border: 'border-semantic-danger-border', badgeBg: 'bg-semantic-danger-soft', badgeText: 'text-semantic-danger', lineColor: '#EF4444', fillColor: '#EF4444' },
    neutral: { glow: 'shadow-[inset_0_1px_0_0_rgba(100,116,139,0.1)]', border: 'border-border', badgeBg: 'bg-muted', badgeText: 'text-muted-foreground', lineColor: '#64748B', fillColor: '#64748B' },
  };
  const styles = cardStyles[metric.verdict];
  const TrendIcon = metric.deltaPct > 0 ? TrendingUp : metric.deltaPct < 0 ? TrendingDown : Minus;
  const trendColor = metric.deltaPct > 0 ? 'text-semantic-success' : metric.deltaPct < 0 ? 'text-semantic-danger' : 'text-muted-foreground';
  
  const highlightStyles = highlighted ? getHighlightedCardStyles(styles.lineColor) : {};
  
  return (
    <Card 
      className={cn("transition-all overflow-hidden rounded-2xl backdrop-blur-sm", !highlighted && "bg-card/80 border", !highlighted && styles.border, !highlighted && styles.glow)} 
      style={highlighted ? highlightStyles : {}}
      data-testid={`metric-card-${metric.id}`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-1">
          <span className="text-base font-semibold text-foreground">{metric.label}</span>
          <Badge className={cn("text-xs font-medium px-3 py-1 rounded-full", styles.badgeBg, styles.badgeText)}>
            {metric.verdict === 'good' ? 'Good' : metric.verdict === 'watch' ? 'Watch' : metric.verdict === 'bad' ? 'Alert' : 'No Data'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{metric.timeRange}</p>
        <div className="flex items-baseline gap-3 mb-4">
          <span className="text-4xl font-bold text-foreground">{metric.value}</span>
          <span className={cn("text-base flex items-center gap-1 font-medium", trendColor)}>
            <TrendIcon className="w-4 h-4" />
            {metric.delta}
          </span>
        </div>
        <div className="h-16 w-full overflow-hidden mb-4">
          <AreaSparkline data={metric.sparkline} color={styles.lineColor} fillColor={styles.fillColor} />
        </div>
        <div className="space-y-2">
          <Link href="/benchmarks">
            <span className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 cursor-pointer">
              Compare industry benchmark <ArrowRight className="w-3 h-3" />
            </span>
          </Link>
          <Link href={metric.nextAction.link}>
            <span className="text-sm font-semibold text-foreground hover:text-foreground/80 flex items-center gap-1 cursor-pointer">
              {metric.nextAction.text} <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </div>
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
      timeRange: 'Last 7 days',
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
      timeRange: 'Last 7 days',
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
      timeRange: 'Last 7 days',
    },
  ];

  return (
    <div data-testid="metric-cards-row">
      <h2 className="text-lg font-semibold text-foreground mb-4">Key Metrics</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} highlighted={metric.id === 'bounce-rate'} />
        ))}
      </div>
    </div>
  );
}


function AgentSummaryCard({ agent }: { agent: { serviceId: string; score: number; status: 'good' | 'watch' | 'bad'; keyMetric: string; keyMetricValue: string; delta: string; whatChanged: string } }) {
  const crew = getCrewMember(agent.serviceId);
  const mockData = getMockAgentData(agent.serviceId);
  
  const crewAccentStyles = getCrewAccentStyles(crew.color);
  const crewBadgeStyles = getCrewBadgeStyles(crew.color);
  
  return (
    <Card 
      className="transition-all bg-card/80 backdrop-blur-sm rounded-xl border-x border-b border-border"
      style={crewAccentStyles}
      data-testid={`agent-summary-${agent.serviceId}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3 mb-3">
          {crew.avatar ? (
            <img 
              src={crew.avatar} 
              alt={crew.nickname}
              className="w-12 h-12 object-contain flex-shrink-0"
            />
          ) : (
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: crew.color }}
            >
              {crew.nickname.slice(0, 2)}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <h4 className="font-semibold text-sm" style={{ color: crew.color }}>{crew.nickname}</h4>
                {crew.tooltipInfo && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5 text-muted-foreground hover:text-foreground"
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`button-tooltip-${agent.serviceId}`}
                        >
                          <Info className="w-3 h-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs p-3">
                        <div className="space-y-2">
                          <div>
                            <p className="font-semibold" style={{ color: crew.color }}>{crew.nickname}</p>
                            <p className="text-xs text-muted-foreground">{crew.role}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium mb-1">What it does</p>
                            <p className="text-xs text-muted-foreground">{crew.tooltipInfo.whatItDoes}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium mb-1">What it outputs</p>
                            <ul className="text-xs text-muted-foreground space-y-0.5">
                              {crew.tooltipInfo.outputs.map((output, i) => (
                                <li key={i} className="flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-current" />
                                  {output}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <span className="text-lg font-bold" style={{ color: crew.color }}>{agent.score}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate">{crew.role}</p>
            {crew.shortDescription && (
              <p className="text-xs text-muted-foreground/70 truncate">{crew.shortDescription}</p>
            )}
            <div className="w-full h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
              <div 
                className="h-full rounded-full transition-all"
                style={{ width: `${agent.score}%`, backgroundColor: crew.color }}
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-xl font-bold text-foreground">{agent.keyMetricValue}</span>
          <span className={cn("text-sm", agent.delta.startsWith('-') ? "text-semantic-danger" : "text-semantic-success")}>
            {agent.delta}
          </span>
        </div>
        <p className="text-xs text-muted-foreground mb-1">{agent.keyMetric}</p>
        
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <Badge 
            variant="outline" 
            className="text-xs px-2 py-0.5 rounded-full border"
            style={crewBadgeStyles}
          >
            {agent.status === 'good' ? 'Good' : agent.status === 'watch' ? 'Watch' : 'Alert'}
          </Badge>
          <Link href={`/agents/${agent.serviceId}`}>
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-foreground hover:text-foreground/80">
              Review {crew.nickname} <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
        
        <p className="text-xs text-muted-foreground mt-2 italic">{agent.whatChanged}</p>
      </CardContent>
    </Card>
  );
}

function AgentSummaryGrid({ agents, totalAgents }: { agents: Array<{ serviceId: string; score: number; status: 'good' | 'watch' | 'bad' }>; totalAgents: number }) {
  const enabledCount = agents.length;
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
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">Crew Summary</h2>
          <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">{enabledCount} of {totalAgents} enabled</Badge>
        </div>
        <Link href="/crew">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
            View all crew <ChevronRight className="w-3 h-3 ml-1" />
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
    <Card className="bg-card/80 backdrop-blur-sm border-border rounded-2xl" data-testid="action-queue">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg text-foreground">Action Queue</CardTitle>
          <Badge variant="outline" className="border-border text-muted-foreground">{actions.length} pending</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {actions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No pending actions. Run diagnostics to generate missions.</p>
          </div>
        ) : (
          actions.map((action, idx) => (
            <div 
              key={action.id} 
              className="flex items-start gap-4 p-4 rounded-xl bg-card/60 backdrop-blur-sm border border-border hover:bg-card/80 transition-colors"
              data-testid={`action-item-${action.id}`}
            >
              <div className={cn(
                "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                idx === 0 ? "bg-[var(--color-gold)] text-background" : "bg-muted text-muted-foreground"
              )}>
                {idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm text-foreground">{action.title}</h4>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  {action.sourceAgents?.map((agentId) => {
                    const crew = getCrewMember(agentId);
                    return (
                      <Badge 
                        key={agentId} 
                        className="text-xs font-medium border-0"
                        style={{ 
                          backgroundColor: `${crew.color}26`,
                          color: crew.color 
                        }}
                      >
                        {crew.nickname}
                      </Badge>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={cn(
                    "text-xs",
                    action.impact === "High" ? "bg-semantic-danger-soft text-semantic-danger" :
                    action.impact === "Low" ? "bg-semantic-success-soft text-semantic-success" :
                    "bg-semantic-warning-soft text-semantic-warning"
                  )}>
                    Impact: {action.impact || "Medium"}
                  </Badge>
                  <EffortBadge effort={action.effort as any || "M"} />
                  <StatusBadge status={action.status} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="text-xs border-border text-foreground hover:bg-muted rounded-xl">
                  Review
                </Button>
                <Button variant="purple" size="sm" className="text-xs rounded-xl">
                  Approve
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function CaptainsRecommendationsSection({ priorities, blockers, confidence, coverage, updatedAt, onReview }: {
  priorities: any[];
  blockers: any[];
  confidence: string;
  coverage: { active: number; total: number };
  updatedAt?: string;
  onReview?: (mission: any) => void;
}) {
  return (
    <Card className="glass-panel border-purple shadow-purple" data-testid="captains-recommendations">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-soft flex items-center justify-center">
              <Compass className="w-5 h-5 text-purple-accent" />
            </div>
            <div>
              <CardTitle className="text-lg text-foreground">Missions</CardTitle>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <span>Sourced from {coverage.active} crew members</span>
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
              confidence === "High" ? "bg-semantic-success-soft text-semantic-success" :
              confidence === "Medium" ? "bg-semantic-warning-soft text-semantic-warning" :
              "bg-semantic-danger-soft text-semantic-danger"
            )}>
              {confidence} Confidence
            </Badge>
            <Badge variant="outline" className="text-xs border-border text-muted-foreground">
              {coverage.active}/{coverage.total} crew
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <h4 className="text-sm font-semibold text-gold flex items-center gap-2 mb-3 tracking-wide">
            <Target className="w-4 h-4" />
            PRIORITY ACTIONS
          </h4>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {priorities.slice(0, 3).map((priority, idx) => (
              <Card 
                key={idx} 
                className="bg-card/80 backdrop-blur-sm border border-border rounded-xl overflow-hidden"
                data-testid={`priority-${idx + 1}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "flex-shrink-0 w-7 h-7 rounded-full font-bold flex items-center justify-center text-sm",
                      "bg-[var(--color-gold)] text-background"
                    )}>
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm text-foreground leading-tight">{priority.title}</h4>
                      <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{priority.why}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap mt-3">
                    {priority.agents?.map((agent: any) => {
                      const crew = getCrewMember(agent.id);
                      return (
                        <Badge 
                          key={agent.id} 
                          className="text-xs font-medium border-0"
                          style={{ 
                            backgroundColor: `${crew.color}26`,
                            color: crew.color 
                          }}
                        >
                          {agent.name}
                        </Badge>
                      );
                    })}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                    <Badge className={cn(
                      "text-xs",
                      priority.impact === "High" ? "bg-semantic-danger-soft text-semantic-danger" :
                      priority.impact === "Low" ? "bg-semantic-success-soft text-semantic-success" :
                      "bg-semantic-warning-soft text-semantic-warning"
                    )}>
                      Impact: {priority.impact || "Medium"}
                    </Badge>
                    <EffortBadge effort={priority.effort || "M"} />
                  </div>
                  
                  <Button 
                    variant="gold" 
                    size="sm" 
                    className="w-full mt-3 text-xs rounded-xl"
                    onClick={() => onReview?.({ 
                      ...priority,
                      id: priority.id || `priority-${idx}`,
                      status: priority.status || 'open',
                      sourceAgents: priority.agents?.map((a: any) => a.agentId || a.id) || []
                    })}
                    data-testid={`button-review-priority-${idx + 1}`}
                  >
                    Review <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {blockers.length > 0 && (
          <>
            <Separator className="my-4 bg-border" />
            <div className="rounded-xl border border-semantic-warning-border bg-semantic-warning-soft/30 p-4">
              <h4 className="text-sm font-semibold text-semantic-warning flex items-center gap-2 mb-3 tracking-wide">
                <AlertTriangle className="w-4 h-4" />
                BLOCKERS
              </h4>
              <div className="space-y-2">
                {blockers.map((blocker, idx) => {
                  const crew = getCrewMember(blocker.id);
                  return (
                    <div key={idx} className="flex items-start gap-3 text-sm">
                      <AlertCircle className="w-4 h-4 text-semantic-warning flex-shrink-0 mt-0.5" />
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
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [missionModalOpen, setMissionModalOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState<any>(null);

  const handleReviewMission = (mission: any) => {
    setSelectedMission(mission);
    setMissionModalOpen(true);
  };

  const handleMarkMissionDone = (missionId: string | number) => {
    toast.success("Mission marked as done");
    setMissionModalOpen(false);
  };

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
      if (!currentSite?.siteId) {
        throw new Error("No site selected. Please select a site first.");
      }
      const res = await fetch("/api/diagnostics/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: currentSite.siteId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to run diagnostics");
      }
      return data;
    },
    onSuccess: (data) => {
      toast.success("Diagnostics started. Results ready in ~2 minutes.");
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (error: Error) => {
      toast.error(`Diagnostics failed: ${error.message}`);
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
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
                <Compass className="w-7 h-7 text-primary" />
                Mission Control
              </h1>
              <SiteSelector variant="header" showManageLink={true} />
            </div>
            <p className="text-muted-foreground text-sm">
              Daily diagnostic report for your site
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setExportModalOpen(true)}
              className="border-border text-foreground hover:bg-muted rounded-xl"
              data-testid="button-export"
            >
              <Package className="w-4 h-4 mr-2" />
              Export Fix Pack
            </Button>
            <Button 
              size="sm" 
              onClick={() => runDiagnostics.mutate()}
              disabled={runDiagnostics.isPending}
              className="text-white rounded-xl shadow-purple hover:-translate-y-0.5 active:translate-y-0 transition-all bg-purple-accent hover:bg-purple-accent/90"
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
          onReview={handleReviewMission}
        />

        <MetricCardsRow />

        <AgentSummaryGrid agents={userAgents} totalAgents={USER_FACING_AGENTS.length} />

        <ActionQueueCard actions={mockActions} />

        <BenchmarkComparison />
        <KnowledgeBaseCard />
      </div>

      <ExportFixPackModal 
        open={exportModalOpen} 
        onOpenChange={setExportModalOpen} 
      />

      <MissionDetailsModal
        open={missionModalOpen}
        onOpenChange={setMissionModalOpen}
        mission={selectedMission}
        onExportFixPack={() => setExportModalOpen(true)}
        onMarkDone={handleMarkMissionDone}
      />
    </DashboardLayout>
  );
}
