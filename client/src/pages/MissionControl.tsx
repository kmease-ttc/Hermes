import { useState, useRef, useEffect } from "react";
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
  Target,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Settings,
  Link as LinkIcon,
  Zap,
  Users
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { RefreshingBadge } from "@/components/ui/stale-indicator";
import { useSiteContext } from "@/hooks/useSiteContext";
import { SiteSelector } from "@/components/site/SiteSelector";
import { USER_FACING_AGENTS, getCrewMember } from "@/config/agents";
import { cn } from "@/lib/utils";
import { NoDeadEndsState } from "@/components/empty-states";
import { Link } from "wouter";
import { toast } from "sonner";
import { ROUTES, buildRoute } from "@shared/routes";
import { SERVICE_TO_CREW } from "@shared/registry";
import { SocratesMemoryCard } from "@/components/dashboard/SocratesMemoryCard";
import { ExportFixPackModal } from "@/components/export/ExportFixPackModal";
import { MissionDetailsModal } from "@/components/dashboard/MissionDetailsModal";
import { MissionOverviewWidget } from "@/components/crew-dashboard/widgets/MissionOverviewWidget";
import { useMissionsDashboard } from "@/hooks/useMissionsDashboard";
import type { MissionItem, MissionStatusState } from "@/components/crew-dashboard/types";

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

function getTintedGlassStyles(hexColor: string) {
  const rgb = hexToRgb(hexColor);
  if (!rgb) return {};
  const { r, g, b } = rgb;
  return {
    background: `rgba(${r}, ${g}, ${b}, 0.08)`,
    border: `1px solid rgba(${r}, ${g}, ${b}, 0.25)`,
    boxShadow: `inset 0 1px 0 0 rgba(${r}, ${g}, ${b}, 0.15), 0 0 20px -6px rgba(${r}, ${g}, ${b}, 0.22)`,
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

interface MetricMeta {
  status: 'ok' | 'needs_setup' | 'needs_integration' | 'empty';
  owner?: string | null;
  reason_code?: string | null;
  message?: string | null;
  actions?: Array<{ id: string; label: string; kind: 'route' | 'action'; route?: string }>;
}

interface MetricCardData {
  id: string;
  label: string;
  value: string;
  delta: string;
  deltaPct: number;
  meta?: MetricMeta;
  verdict: 'good' | 'watch' | 'bad' | 'neutral';
  sparkline: number[];
  nextAction: { text: string; link: string };
  benchmarkLink?: string;
  timeRange: string;
  emptyState?: {
    message: string;
    actionLabel: string;
    actionRoute: string;
  } | null;
}

function AreaSparkline({ data, color, fillColor }: { data: number[]; color: string; fillColor: string }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const W = 300;
  const H = 64;
  const yPad = 8;
  
  const rawMin = Math.min(...data);
  const rawMax = Math.max(...data);
  const range = rawMax - rawMin;
  const yRange = range === 0 ? 1 : range * 0.15;
  const yMin = rawMin - yRange;
  const yMax = rawMax + yRange;
  
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = yPad + ((yMax - val) / (yMax - yMin)) * (H - yPad * 2);
    return { x, y, val };
  });
  
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L ${W} ${H} L 0 ${H} Z`;
  
  const formatValue = (val: number) => {
    if (val >= 1000) return `${(val / 1000).toFixed(1)}k`;
    if (Number.isInteger(val)) return val.toString();
    return val.toFixed(1);
  };
  
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="64" preserveAspectRatio="xMidYMid meet" className="cursor-crosshair">
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
        <g key={i}>
          <circle
            cx={p.x}
            cy={p.y}
            r={hoveredIndex === i ? 6 : 4}
            fill={hoveredIndex === i ? color : "hsl(var(--card))"}
            stroke={color}
            strokeWidth="2"
            style={{ transition: 'r 0.15s ease, fill 0.15s ease' }}
          />
          <circle
            cx={p.x}
            cy={p.y}
            r="12"
            fill="transparent"
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{ cursor: 'pointer' }}
          />
          {hoveredIndex === i && (
            <>
              <rect
                x={p.x - 20}
                y={p.y - 26}
                width="40"
                height="18"
                rx="4"
                fill="hsl(var(--popover))"
                stroke="hsl(var(--border))"
                strokeWidth="1"
              />
              <text
                x={p.x}
                y={p.y - 13}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill="hsl(var(--foreground))"
              >
                {formatValue(p.val)}
              </text>
            </>
          )}
        </g>
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
  
  const hasNoData = metric.value === '—' && metric.emptyState;
  
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
        
        {hasNoData ? (
          <div className="flex flex-col items-center justify-center py-4">
            <div className="text-3xl font-bold text-muted-foreground mb-2">—</div>
            <p className="text-sm text-muted-foreground text-center mb-3">{metric.emptyState!.message}</p>
            <Link href={metric.emptyState!.actionRoute}>
              <Button 
                size="sm" 
                variant="outline" 
                className="text-xs"
                data-testid={`button-${metric.id}-empty-action`}
              >
                {metric.emptyState!.actionLabel}
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        ) : (
          <>
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
          </>
        )}
        
        <div className="space-y-2">
          <Link href={ROUTES.BENCHMARKS}>
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
  const { activeSite } = useSiteContext();
  const siteId = activeSite?.id || 'default';
  
  // Preserve last known values to prevent blanks
  const lastKnownMetricsRef = useRef<Record<string, any>>({});
  const lastSiteIdRef = useRef<string>(siteId);
  
  // Clear cache when site changes to prevent data leakage between sites
  useEffect(() => {
    if (lastSiteIdRef.current !== siteId) {
      lastKnownMetricsRef.current = {};
      lastSiteIdRef.current = siteId;
    }
  }, [siteId]);
  
  const { data: benchmarkData, isStale } = useQuery({
    queryKey: ['benchmark-comparison', 'psychiatry', siteId],
    queryFn: async () => {
      const res = await fetch(`/api/benchmarks/compare?industry=psychiatry&siteId=${siteId}`);
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60000, // Keep cached data for 1 minute
    gcTime: 300000, // Keep in cache for 5 minutes
  });
  
  // Fetch Market SOV from Lookout keyword rankings (CTR-weighted)
  const { data: marketSovData } = useQuery({
    queryKey: ['market-sov'],
    queryFn: async () => {
      const res = await fetch('/api/serp/market-sov');
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 60000,
    gcTime: 300000,
  });
  
  // Merge function that preserves previous non-null values
  const getMetricFromBenchmarks = (metric: string) => {
    const freshData = benchmarkData?.comparison?.find((c: any) => c.metric === metric);
    
    if (freshData && freshData.actualValue !== null) {
      // Got fresh data, update cache
      lastKnownMetricsRef.current[metric] = freshData;
      return freshData;
    }
    
    // Return cached value if available
    if (lastKnownMetricsRef.current[metric]) {
      return lastKnownMetricsRef.current[metric];
    }
    
    // Return fresh data even if null (first load)
    return freshData;
  };
  
  const bounceData = getMetricFromBenchmarks('bounce_rate');
  const conversionData = getMetricFromBenchmarks('conversion_rate');
  const sessionsData = getMetricFromBenchmarks('sessions');
  
  const formatValue = (value: number | null, unit: string) => {
    if (value === null) return '—';
    if (unit === 'percent') return `${value.toFixed(1)}%`;
    if (unit === 'count_monthly') return value.toLocaleString();
    return value.toString();
  };
  
  const getVerdict = (status: string): 'good' | 'watch' | 'bad' => {
    if (status === 'good') return 'good';
    if (status === 'watch') return 'watch';
    return 'bad';
  };
  
  const buildEmptyStateFromMeta = (metricId: string, meta: MetricMeta | undefined, value: number | null | undefined) => {
    const hasData = value !== null && value !== undefined;
    if (hasData) return null;
    
    if (meta && meta.status !== 'ok' && meta.message) {
      const action = meta.actions?.[0];
      return { 
        message: meta.message, 
        actionLabel: action?.label || 'Set Up',
        actionRoute: action?.route || ROUTES.CREW
      };
    }
    
    switch (metricId) {
      case 'market-sov':
        return { message: 'No SERP data available', actionLabel: 'Run Lookout', actionRoute: buildRoute.agent('serp_tracker') };
      default:
        return { message: 'No data available', actionLabel: 'View Setup', actionRoute: ROUTES.CREW };
    }
  };
  
  const metrics: MetricCardData[] = [
    {
      id: 'conversion-rate',
      label: 'Conversion Rate',
      value: conversionData ? formatValue(conversionData.actualValue, 'percent') : '—',
      delta: conversionData?.deltaPct ? `${conversionData.deltaPct > 0 ? '+' : ''}${conversionData.deltaPct.toFixed(1)}%` : '—',
      deltaPct: conversionData?.deltaPct || 0,
      meta: conversionData?.meta,
      verdict: conversionData ? getVerdict(conversionData.status) : 'neutral',
      sparkline: [3.8, 3.6, 3.4, 3.5, 3.3, 3.1, conversionData?.actualValue || 3.2],
      nextAction: { text: 'Review Pulse', link: buildRoute.agent('google_data_connector') },
      timeRange: 'Last 30 days',
      emptyState: buildEmptyStateFromMeta('conversion-rate', conversionData?.meta, conversionData?.actualValue),
    },
    {
      id: 'bounce-rate',
      label: 'Bounce Rate',
      value: bounceData ? formatValue(bounceData.actualValue, 'percent') : '—',
      delta: bounceData?.deltaPct ? `${bounceData.deltaPct > 0 ? '+' : ''}${bounceData.deltaPct.toFixed(1)}%` : '—',
      deltaPct: bounceData?.deltaPct || 0,
      meta: bounceData?.meta,
      verdict: bounceData ? getVerdict(bounceData.status) : 'neutral',
      sparkline: [38, 39, 40, 41, 43, 44, bounceData?.actualValue || 42],
      nextAction: { text: 'Review Popular', link: buildRoute.agent('google_data_connector') },
      timeRange: 'Last 30 days',
      emptyState: buildEmptyStateFromMeta('bounce-rate', bounceData?.meta, bounceData?.actualValue),
    },
    {
      id: 'sessions',
      label: 'Monthly Sessions',
      value: sessionsData ? formatValue(sessionsData.actualValue, 'count_monthly') : '—',
      delta: sessionsData?.deltaPct ? `${sessionsData.deltaPct > 0 ? '+' : ''}${sessionsData.deltaPct.toFixed(0)}%` : '—',
      deltaPct: sessionsData?.deltaPct || 0,
      meta: sessionsData?.meta,
      verdict: sessionsData ? getVerdict(sessionsData.status) : 'neutral',
      sparkline: [80000, 85000, 88000, 90000, 92000, 94000, sessionsData?.actualValue || 96000],
      nextAction: { text: 'Review Popular', link: buildRoute.agent('google_data_connector') },
      timeRange: 'Last 30 days',
      emptyState: buildEmptyStateFromMeta('sessions', sessionsData?.meta, sessionsData?.actualValue),
    },
    {
      id: 'market-sov',
      label: 'Market SOV',
      value: marketSovData?.marketSov != null ? `${marketSovData.marketSov}%` : '—',
      delta: marketSovData?.marketSov > 0 ? '+' : '',
      deltaPct: 0,
      verdict: marketSovData?.marketSov > 20 ? 'good' : marketSovData?.marketSov > 0 ? 'watch' : 'neutral',
      sparkline: [0, 5, 8, 12, 15, 18, marketSovData?.marketSov || 0],
      nextAction: { text: 'Review Lookout', link: buildRoute.agent('serp_tracker') },
      timeRange: 'CTR-weighted',
      emptyState: buildEmptyStateFromMeta('market-sov', undefined, marketSovData?.marketSov),
    },
  ];

  return (
    <div data-testid="metric-cards-row">
      <h2 className="text-lg font-semibold text-foreground mb-4">Key Metrics</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <MetricCard key={metric.id} metric={metric} highlighted={metric.id === 'market-sov'} />
        ))}
      </div>
    </div>
  );
}


function AgentSummaryCard({ agent, enabled = true }: { agent: { serviceId: string; score: number; status: 'good' | 'watch' | 'bad' | 'neutral'; keyMetric: string; keyMetricValue: string; delta: string; whatChanged: string }; enabled?: boolean }) {
  const crew = getCrewMember(agent.serviceId);
  
  const tintedGlassStyles = getTintedGlassStyles(crew.color);
  const crewBadgeStyles = getCrewBadgeStyles(crew.color);

  const handleHireCrew = () => {
    window.location.href = ROUTES.CREW;
  };
  
  if (!enabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card 
              className="transition-all backdrop-blur-sm rounded-xl overflow-hidden h-full flex flex-col relative cursor-pointer group"
              style={{ 
                ...tintedGlassStyles,
                opacity: 0.55,
                filter: 'grayscale(35%)',
              }}
              onClick={handleHireCrew}
              data-testid={`agent-summary-${agent.serviceId}-disabled`}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-transparent z-10" />
              
              <div className="absolute top-3 right-3 z-20">
                <Button 
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg text-xs h-7 px-3"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleHireCrew();
                  }}
                  data-testid={`button-hire-${agent.serviceId}`}
                >
                  <Users className="w-3 h-3 mr-1.5" />
                  Hire
                </Button>
              </div>
              
              <CardContent className="p-4 flex flex-col flex-1 pointer-events-none">
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
                    <h4 className="font-semibold text-base" style={{ color: crew.color }}>{crew.nickname}</h4>
                    <p className="text-xs text-muted-foreground truncate">{crew.role}</p>
                    {crew.shortDescription && (
                      <p className="text-xs text-muted-foreground/70 truncate">{crew.shortDescription}</p>
                    )}
                    <div className="w-full h-1.5 rounded-full bg-muted mt-1 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all bg-muted-foreground/30"
                        style={{ width: '0%' }}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xl font-bold text-muted-foreground">—</span>
                </div>
                <p className="text-xs text-muted-foreground mb-1">Unlock missions + KPIs</p>
                
                <div className="flex-1" />
                
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                  <Badge variant="outline" className="text-xs px-2 py-0.5 rounded-full border border-muted-foreground/30 text-muted-foreground">
                    Not Hired
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-sm">Activate this crew member to unlock insights and fixes.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return (
    <Card 
      className="transition-all backdrop-blur-sm rounded-xl overflow-hidden h-full flex flex-col"
      style={tintedGlassStyles}
      data-testid={`agent-summary-${agent.serviceId}`}
    >
      <CardContent className="p-4 flex flex-col flex-1">
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
                <Link href={buildRoute.agent(agent.serviceId)}>
                  <h4 className="font-semibold text-base cursor-pointer hover:underline" style={{ color: crew.color }}>{crew.nickname}</h4>
                </Link>
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
        
        <div className="flex-1" />
        
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <Badge 
            variant="outline" 
            className="text-xs px-2 py-0.5 rounded-full border"
            style={crewBadgeStyles}
          >
            {agent.status === 'good' ? 'Good' : agent.status === 'watch' ? 'Watch' : 'Alert'}
          </Badge>
          <Link href={buildRoute.agent(agent.serviceId)}>
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-foreground hover:text-foreground/80 whitespace-nowrap">
              Review {crew.nickname} <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
        
        <p className="text-xs text-muted-foreground mt-2 italic line-clamp-1">{agent.whatChanged}</p>
      </CardContent>
    </Card>
  );
}

function AgentSummaryGrid({ agents, totalAgents, crewSummaries, kbStatus }: { 
  agents: Array<{ serviceId: string; score: number; status: 'good' | 'watch' | 'bad' }>; 
  totalAgents: number;
  crewSummaries?: Array<{ crewId: string; nickname: string; pendingCount: number; lastCompletedAt: string | null; status: 'looking_good' | 'doing_okay' | 'needs_attention'; primaryMetric?: string; primaryMetricValue?: number; deltaPercent?: number | null; deltaLabel?: string; hasNoData?: boolean; emptyStateReason?: string | null }>;
  kbStatus?: { totalLearnings?: number; configured?: boolean; status?: string };
}) {
  const enabledIds = new Set(agents.map(a => a.serviceId));
  const enabledCount = agents.length;
  
  const enabledAgentData = agents.map(agent => {
    // Map service_id to crew_id for lookup in crewSummaries
    const crewId = SERVICE_TO_CREW[agent.serviceId] || agent.serviceId;
    const crewSummary = crewSummaries?.find(cs => cs.crewId === crewId);
    const isSocrates = agent.serviceId === 'seo_kbase';
    
    let keyMetric = crewSummary?.primaryMetric || "Pending missions";
    let keyMetricValue = String(crewSummary?.primaryMetricValue ?? crewSummary?.pendingCount ?? 0);
    
    // Use emptyStateReason for "No Dead Ends" UX when crew has no data
    let whatChanged = crewSummary?.emptyStateReason 
      || (crewSummary?.lastCompletedAt 
        ? `Last completed: ${new Date(crewSummary.lastCompletedAt).toLocaleDateString()}`
        : "No missions completed yet");
    
    if (isSocrates && kbStatus) {
      keyMetric = "Knowledge entries";
      keyMetricValue = String(kbStatus.totalLearnings || 0);
      whatChanged = kbStatus.configured ? "Knowledge base connected" : "Connect to SEO KBase worker";
    }
    
    // Use real delta from API instead of hardcoded values
    let delta = "—";
    if (crewSummary?.deltaPercent !== null && crewSummary?.deltaPercent !== undefined) {
      const sign = crewSummary.deltaPercent > 0 ? "+" : "";
      delta = `${sign}${crewSummary.deltaPercent}%`;
    }
    
    return {
      ...agent,
      enabled: true,
      keyMetric,
      keyMetricValue,
      delta,
      whatChanged,
    };
  });

  const disabledAgentData = USER_FACING_AGENTS
    .filter(id => !enabledIds.has(id))
    .map(serviceId => ({
      serviceId,
      score: 0,
      status: 'neutral' as const,
      enabled: false,
      keyMetric: "Not hired",
      keyMetricValue: "—",
      delta: "—",
      whatChanged: "Hire to enable missions and insights",
    }));

  const allAgentData = [...enabledAgentData, ...disabledAgentData];

  return (
    <div data-testid="agent-summary-grid">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">Crew Summary</h2>
          <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">{enabledCount} of {totalAgents} hired</Badge>
        </div>
        <Link href={ROUTES.CREW}>
          <Button variant="outline" size="sm" className="text-xs border-dashed border-primary/50 text-primary hover:bg-primary/5">
            <Users className="w-3 h-3 mr-1.5" />
            Manage Crew
          </Button>
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {allAgentData.map((agent) => (
          <AgentSummaryCard key={agent.serviceId} agent={agent} enabled={agent.enabled} />
        ))}
      </div>
    </div>
  );
}

function VerificationBadge({ status }: { status?: string }) {
  if (status === 'verified') {
    return (
      <Badge className="bg-semantic-success-soft text-semantic-success text-xs">
        <ShieldCheck className="w-3 h-3 mr-1" />
        Verified
      </Badge>
    );
  }
  if (status === 'unverified') {
    return (
      <Badge className="bg-semantic-warning-soft text-semantic-warning text-xs">
        <ShieldAlert className="w-3 h-3 mr-1" />
        Unverified
      </Badge>
    );
  }
  return (
    <Badge className="bg-muted text-muted-foreground text-xs">
      <ShieldX className="w-3 h-3 mr-1" />
      Needs Setup
    </Badge>
  );
}

function ConsolidatedMissionWidget({
  priorities,
  blockers,
  confidence,
  isRealData,
  placeholderReason,
  onReview,
  onRunDiagnostics,
  isRunning,
}: {
  priorities: any[];
  blockers: any[];
  confidence: string;
  isRealData?: boolean;
  placeholderReason?: string;
  onReview?: (mission: any) => void;
  onRunDiagnostics?: () => void;
  isRunning?: boolean;
}) {
  const terminalStatuses = ['completed', 'done', 'approved', 'verified', 'resolved'];
  const completedCount = priorities.filter(p => terminalStatuses.includes(p.status)).length;
  const totalMissions = priorities.length;
  const blockerPenalty = blockers.length * 10;
  const highImpactPenalty = priorities.filter(p => p.impact === 'High' && !terminalStatuses.includes(p.status)).length * 5;
  const missionScore = Math.max(0, Math.min(100, Math.round(
    (totalMissions > 0 ? (completedCount / totalMissions) * 100 : 100) - blockerPenalty - highImpactPenalty
  )));

  const statusTier: MissionStatusState["tier"] = blockers.length > 0
    ? "needs_attention"
    : priorities.length > 0
    ? "doing_okay"
    : "looking_good";

  const getNextStep = (): string => {
    if (blockers.length > 0) {
      return `Resolve blocker: ${blockers[0].title}`;
    }
    if (priorities.length > 0) {
      return `Complete: ${priorities[0].title}`;
    }
    return "Run diagnostics to discover new opportunities";
  };

  const autoFixableItems = priorities.filter(p => p.impact !== "High" || p.effort === "S");

  const status: MissionStatusState = {
    tier: statusTier,
    summaryLine: isRealData === false
      ? (placeholderReason || "Run diagnostics for real data")
      : `${completedCount} of ${totalMissions} missions complete${blockers.length > 0 ? ` • ${blockers.length} blocker${blockers.length > 1 ? 's' : ''}` : ''}`,
    nextStep: getNextStep(),
    performanceScore: missionScore,
    autoFixableCount: autoFixableItems.length,
    priorityCount: priorities.length,
  };

  const missions: MissionItem[] = priorities.map((p, idx) => ({
    id: p.id || `priority-${idx}`,
    title: p.title,
    reason: p.why,
    impact: p.impact || "Medium",
    effort: p.effort || "M",
    status: terminalStatuses.includes(p.status) ? "complete" : "pending",
    action: {
      label: "Fix it",
      onClick: () => onReview?.({
        ...p,
        id: p.id || `priority-${idx}`,
        status: p.status || 'open',
        sourceAgents: p.agents?.map((a: any) => a.agentId || a.id) || []
      }),
      disabled: false,
    },
  }));

  const blockerItems = blockers.map((b, idx) => ({
    id: b.id || `blocker-${idx}`,
    title: b.title,
    fix: b.fix,
  }));

  return (
    <MissionOverviewWidget
      status={status}
      missions={missions}
      blockers={blockerItems}
      onRunDiagnostics={onRunDiagnostics}
      isRunning={isRunning}
      onMissionAction={(missionId) => {
        const mission = priorities.find((p, idx) => (p.id || `priority-${idx}`) === missionId);
        if (mission) {
          onReview?.({
            ...mission,
            id: missionId,
            status: mission.status || 'open',
            sourceAgents: mission.agents?.map((a: any) => a.agentId || a.id) || []
          });
        }
      }}
      onBlockerFix={(blockerId) => {
        console.log("Fix blocker:", blockerId);
      }}
      maxActions={3}
    />
  );
}

export default function MissionControl() {
  const { currentSite } = useSiteContext();
  const queryClient = useQueryClient();
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [missionModalOpen, setMissionModalOpen] = useState(false);
  const [selectedMission, setSelectedMission] = useState<any>(null);
  const [isExecutingAll, setIsExecutingAll] = useState(false);

  const { dashboard, isLoading: dashboardLoading, isRefreshing: dashboardRefreshing, executeAll, refetch } = useMissionsDashboard({
    siteId: currentSite?.siteId,
  });

  const handleReviewMission = (mission: any) => {
    setSelectedMission(mission);
    setMissionModalOpen(true);
  };

  const handleMarkMissionDone = (missionId: string | number) => {
    toast.success("Mission marked as done");
    setMissionModalOpen(false);
  };

  const handleFixEverything = async () => {
    try {
      setIsExecutingAll(true);
      await executeAll();
      toast.success("All auto-fixable missions executed!");
      refetch();
    } catch (error) {
      toast.error("Failed to execute missions");
    } finally {
      setIsExecutingAll(false);
    }
  };

  const { data: dashboardStats, isFetching: statsFetching } = useQuery({
    queryKey: ["dashboard-stats", currentSite?.siteId],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/stats?siteId=${currentSite?.siteId || ""}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: !!currentSite,
    placeholderData: keepPreviousData,
  });

  const isRefreshing = dashboardRefreshing || (statsFetching && !!dashboardStats);

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

  const { data: kbStatus } = useQuery({
    queryKey: ["kb-status", currentSite?.siteId],
    queryFn: async () => {
      const res = await fetch(`/api/kb/status?siteId=${currentSite?.siteId || ""}`);
      if (!res.ok) return { configured: false, totalLearnings: 0 };
      const result = await res.json();
      return {
        configured: result.data?.configured || false,
        totalLearnings: result.data?.recentLearnings?.length || 0,
        status: result.data?.status || 'unknown',
        canRead: result.data?.canRead || false,
        canWrite: result.data?.canWrite || false,
      };
    },
    staleTime: 60000,
  });

  const userAgents = USER_FACING_AGENTS.map((serviceId, index) => {
    // Map service_id to crew_id for lookup in crewSummaries
    const crewId = SERVICE_TO_CREW[serviceId] || serviceId;
    const crewSummary = dashboard?.crewSummaries?.find((cs: any) => cs.crewId === crewId);
    
    // Use server-provided score for consistency with crew pages (single source of truth)
    const score = crewSummary?.score ?? 0;
    
    return {
      serviceId,
      score,
      status: score >= 70 ? 'good' as const : score >= 40 ? 'watch' as const : 'bad' as const,
    };
  });

  // Fetch real recommendations from API
  const { data: recommendationsData, isLoading: isLoadingRecommendations } = useQuery({
    queryKey: ["recommendations", currentSite?.siteId],
    queryFn: async () => {
      const params = new URLSearchParams({ site_id: currentSite?.siteId || "default" });
      const res = await fetch(`/api/missions/recommendations?${params}`);
      if (!res.ok) throw new Error("Failed to fetch recommendations");
      return res.json();
    },
    enabled: !!currentSite?.siteId,
  });

  // Validation state
  const [validationResults, setValidationResults] = useState<any>(null);
  const [showValidationPanel, setShowValidationPanel] = useState(false);

  const validateMissions = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams({ siteId: currentSite?.siteId || "default" });
      const res = await fetch(`/api/missions/validate?${params}`, { method: "POST" });
      if (!res.ok) throw new Error("Validation failed");
      return res.json();
    },
    onSuccess: (data) => {
      setValidationResults(data);
      setShowValidationPanel(true);
      toast.success(`Validated ${data.summary.total} recommendations`);
    },
    onError: (error: Error) => {
      toast.error(`Validation failed: ${error.message}`);
    },
  });

  // Convert dashboard data to the format expected by ConsolidatedMissionWidget
  const dashboardPriorities = dashboard?.nextActions?.map((action, idx) => ({
    id: action.missionId || `action-${idx}`,
    title: action.title,
    why: action.description,
    impact: action.impact === 'high' ? 'High' : action.impact === 'medium' ? 'Medium' : 'Low',
    effort: action.effort,
    status: 'open',
    autoFixable: action.autoFixable,
    agents: [{ agentId: action.crewId }],
  })) || [];

  const hasDashboardData = dashboard && dashboard.nextActions && dashboard.nextActions.length > 0;
  const hasRecommendationsData = recommendationsData?.isRealData && recommendationsData?.priorities?.length > 0;
  
  const captainData = hasDashboardData ? {
    priorities: dashboardPriorities,
    blockers: [],
    confidence: dashboard.aggregatedStatus?.tier === 'looking_good' ? 'High' : 
                dashboard.aggregatedStatus?.tier === 'doing_okay' ? 'Medium' : 'Low',
    isRealData: true,
    placeholderReason: undefined,
  } : hasRecommendationsData ? {
    priorities: recommendationsData.priorities,
    blockers: recommendationsData.blockers || [],
    confidence: recommendationsData.confidence || 'Low',
    isRealData: true,
    placeholderReason: undefined,
  } : {
    priorities: [],
    blockers: [],
    confidence: 'Low',
    isRealData: false,
    placeholderReason: "No missions available - run diagnostics to generate recommendations"
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="mission-control-page">
        <div className="relative flex items-center justify-between">
          <RefreshingBadge isRefreshing={isRefreshing} />
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
            <Link href={ROUTES.CREW}>
              <Button 
                variant="outline" 
                size="sm"
                className="border-dashed border-primary/50 text-primary hover:bg-primary/5 hover:border-primary rounded-xl"
                data-testid="button-add-crew"
              >
                <Users className="w-4 h-4 mr-2" />
                Manage Crew
              </Button>
            </Link>
            {dashboard?.aggregatedStatus?.autoFixableCount && dashboard.aggregatedStatus.autoFixableCount > 0 && (
              <Button 
                size="sm"
                onClick={handleFixEverything}
                disabled={isExecutingAll}
                className="bg-semantic-success text-white hover:bg-semantic-success/90 rounded-xl"
                data-testid="button-fix-everything"
              >
                {isExecutingAll ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                Fix Everything ({dashboard.aggregatedStatus.autoFixableCount})
              </Button>
            )}
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => validateMissions.mutate()}
              disabled={validateMissions.isPending}
              className="border-border text-foreground hover:bg-muted rounded-xl"
              data-testid="button-validate"
            >
              {validateMissions.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ShieldCheck className="w-4 h-4 mr-2" />
              )}
              Validate
            </Button>
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

        <ConsolidatedMissionWidget
          priorities={captainData.priorities || []}
          blockers={captainData.blockers || []}
          confidence={captainData.confidence || "Low"}
          isRealData={captainData.isRealData}
          placeholderReason={captainData.placeholderReason}
          onReview={handleReviewMission}
          onRunDiagnostics={() => runDiagnostics.mutate()}
          isRunning={runDiagnostics.isPending}
        />

        {showValidationPanel && validationResults && (
          <Card className="bg-card/80 backdrop-blur-sm border-border rounded-2xl" data-testid="validation-panel">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-foreground flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-purple-accent" />
                  Recommendation Validation Results
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowValidationPanel(false)}>
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-semantic-success-soft text-semantic-success">
                    <ShieldCheck className="w-3 h-3 mr-1" />
                    {validationResults.summary.verified} Verified
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-semantic-warning-soft text-semantic-warning">
                    <ShieldAlert className="w-3 h-3 mr-1" />
                    {validationResults.summary.unverified} Unverified
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-muted text-muted-foreground">
                    <ShieldX className="w-3 h-3 mr-1" />
                    {validationResults.summary.placeholder} Needs Setup
                  </Badge>
                </div>
              </div>

              {validationResults.missions.some((m: any) => m.requiredFixes?.length > 0) && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-foreground">Required Fixes</h4>
                  {validationResults.missions
                    .filter((m: any) => m.requiredFixes?.length > 0)
                    .slice(0, 5)
                    .map((m: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl bg-card/60 border border-border">
                        <div className="flex items-center gap-2 mb-2">
                          {m.status === 'placeholder' ? (
                            <ShieldX className="w-4 h-4 text-semantic-danger" />
                          ) : (
                            <ShieldAlert className="w-4 h-4 text-semantic-warning" />
                          )}
                          <span className="font-medium text-sm">{m.title}</span>
                        </div>
                        <div className="space-y-1 pl-6">
                          {m.requiredFixes.map((fix: any, fIdx: number) => (
                            <div key={fIdx} className="flex items-center gap-2 text-xs text-muted-foreground">
                              {fix.type === 'CONFIG' && <Settings className="w-3 h-3" />}
                              {fix.type === 'WORKER' && <LinkIcon className="w-3 h-3" />}
                              {fix.type === 'DATA' && <AlertCircle className="w-3 h-3" />}
                              {fix.type === 'ACTION' && <Play className="w-3 h-3" />}
                              <span>{fix.hint}</span>
                              {fix.where === 'Secrets' && (
                                <Link href={ROUTES.SETTINGS}>
                                  <Button variant="link" size="sm" className="text-xs h-auto p-0 text-primary">
                                    Open Settings
                                  </Button>
                                </Link>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {validationResults.lastRunAt && (
                <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Last diagnostic run: {new Date(validationResults.lastRunAt).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>
        )}


        <MetricCardsRow />

        <AgentSummaryGrid 
          agents={userAgents} 
          totalAgents={USER_FACING_AGENTS.length}
          crewSummaries={dashboard?.crewSummaries}
          kbStatus={kbStatus}
        />

        <SocratesMemoryCard />
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
