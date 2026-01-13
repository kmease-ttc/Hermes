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
  Users,
  FileText,
  Code,
  Send
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { DeveloperReportModal } from "@/components/export/DeveloperReportModal";
import { MissionDetailsModal } from "@/components/dashboard/MissionDetailsModal";
import { MissionOverviewWidget } from "@/components/crew-dashboard/widgets/MissionOverviewWidget";
import { useMissionsDashboard } from "@/hooks/useMissionsDashboard";
import type { MissionItem, MissionStatusState } from "@/components/crew-dashboard/types";
import { useHiredCrews } from "@/hooks/useHiredCrews";
import { GovernancePanels } from "@/components/governance/GovernancePanels";

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
  locked?: boolean;
  requiredCrew?: {
    serviceId: string;
    nickname: string;
    role: string;
  };
  sampleValue?: string;
  whyItMatters?: string;
  tasksUnlockedCount?: number;
  ctaLabel?: string;
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
  const isLocked = metric.locked && metric.requiredCrew;
  
  if (isLocked) {
    const crewMember = getCrewMember(metric.requiredCrew!.serviceId);
    const crewColor = crewMember?.color || '#6366F1';
    const rgb = hexToRgb(crewColor);
    const gradientBorderStyle = rgb ? {
      background: `linear-gradient(135deg, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.06) 0%, rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.02) 100%)`,
      border: `1px solid rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`,
      boxShadow: `0 0 24px -8px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.25)`,
    } : {};
    
    return (
      <Card 
        className="transition-all overflow-hidden rounded-2xl backdrop-blur-sm relative group hover:scale-[1.02]"
        style={gradientBorderStyle}
        data-testid={`metric-card-${metric.id}-locked`}
      >
        <div className="absolute top-3 right-3 z-10">
          <Badge 
            className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
            style={{ 
              backgroundColor: `rgba(${rgb?.r || 99}, ${rgb?.g || 102}, ${rgb?.b || 241}, 0.15)`,
              color: crewColor,
              borderColor: `rgba(${rgb?.r || 99}, ${rgb?.g || 102}, ${rgb?.b || 241}, 0.4)`,
            }}
          >
            Sample
          </Badge>
        </div>
        
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-1 pr-16">
            <span className="text-base font-semibold text-foreground">{metric.label}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{metric.timeRange}</p>
          
          <div className="flex flex-col items-start py-2">
            <div 
              className="text-3xl font-bold mb-2 select-none"
              style={{ color: crewColor, opacity: 0.6 }}
            >
              {metric.sampleValue || '—'}
            </div>
            
            {metric.whyItMatters && (
              <p className="text-sm text-muted-foreground mb-3">{metric.whyItMatters}</p>
            )}
            
            {metric.tasksUnlockedCount && metric.tasksUnlockedCount > 0 && (
              <Badge 
                variant="outline" 
                className="text-xs mb-4 border-primary/40 text-primary bg-primary/5"
              >
                <Target className="w-3 h-3 mr-1" />
                Unlocks {metric.tasksUnlockedCount} tasks
              </Badge>
            )}
            
            <Link href={buildRoute.agent(metric.requiredCrew!.serviceId)}>
              <Button 
                size="sm" 
                className="text-xs text-white hover:opacity-90"
                style={{ backgroundColor: crewColor }}
                data-testid={`button-${metric.id}-enable`}
              >
                <Zap className="w-3 h-3 mr-1.5" />
                {metric.ctaLabel || `Enable ${metric.requiredCrew!.nickname}`}
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }
  
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
  const { isHired } = useHiredCrews();
  
  // Check if required crews are hired for each metric type
  const analyticsHired = isHired('google_data_connector');
  const serpHired = isHired('serp_intel');
  
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
      locked: !analyticsHired,
      requiredCrew: { serviceId: 'google_data_connector', nickname: 'Popular', role: 'Analytics & Signals' },
      sampleValue: '~3.2%',
      whyItMatters: 'Track visitor-to-lead performance',
      tasksUnlockedCount: 4,
      ctaLabel: 'Enable Conversion Tracking',
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
      locked: !analyticsHired,
      requiredCrew: { serviceId: 'google_data_connector', nickname: 'Popular', role: 'Analytics & Signals' },
      sampleValue: '~42%',
      whyItMatters: 'Identify pages losing visitors',
      tasksUnlockedCount: 3,
      ctaLabel: 'Enable Engagement Analytics',
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
      locked: !analyticsHired,
      requiredCrew: { serviceId: 'google_data_connector', nickname: 'Popular', role: 'Analytics & Signals' },
      sampleValue: '~12,400',
      whyItMatters: 'Understand traffic trends and drops',
      tasksUnlockedCount: 4,
      ctaLabel: 'Enable Traffic Analytics',
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
      locked: !serpHired,
      requiredCrew: { serviceId: 'serp_intel', nickname: 'Lookout', role: 'SERP Tracking' },
      sampleValue: '~18%',
      whyItMatters: 'Track your search visibility vs competitors',
      tasksUnlockedCount: 6,
      ctaLabel: 'Enable Search Visibility',
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

function AccomplishmentsSection() {
  // Win-focused accomplishments with proof chips and value lines
  const accomplishments = [
    {
      id: 1,
      headline: "+2 leads captured",
      whyItMatters: "More patients found and contacted you this week.",
      proofChips: ["Tracked across 4 landing pages", "Conversion tracking verified"],
      time: "Today",
      iconType: "leads",
      iconColor: "emerald"
    },
    {
      id: 2,
      headline: "3 keywords moved up",
      whyItMatters: "Your clinic is showing up higher for high-intent searches.",
      proofChips: ["Best move: +4 positions", "Top keyword: 'psychiatrist orlando'"],
      time: "Yesterday",
      iconType: "rank",
      iconColor: "purple"
    },
    {
      id: 3,
      headline: "Traffic loss prevented",
      whyItMatters: "Performance issues caught before they hurt conversions.",
      proofChips: ["LCP flagged on 2 pages", "Core Web Vitals monitored"],
      time: "2 days ago",
      iconType: "shield",
      iconColor: "amber"
    }
  ];

  // This week's impact summary
  const impactSummary = [
    { label: "Leads", value: "+2", icon: <Users className="w-3.5 h-3.5" /> },
    { label: "Keywords up", value: "+3", icon: <TrendingUp className="w-3.5 h-3.5" /> },
    { label: "Issues prevented", value: "5", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  ];

  const getIcon = (type: string, color: string) => {
    const colorClasses = {
      emerald: "text-emerald-500",
      purple: "text-purple-500",
      amber: "text-amber-500",
    };
    const bgClasses = {
      emerald: "bg-emerald-500/15 shadow-[0_0_12px_-3px_rgba(16,185,129,0.4)]",
      purple: "bg-purple-500/15 shadow-[0_0_12px_-3px_rgba(139,92,246,0.4)]",
      amber: "bg-amber-500/15 shadow-[0_0_12px_-3px_rgba(245,158,11,0.4)]",
    };
    const iconClass = colorClasses[color as keyof typeof colorClasses] || colorClasses.emerald;
    const bgClass = bgClasses[color as keyof typeof bgClasses] || bgClasses.emerald;

    const icons: Record<string, JSX.Element> = {
      leads: <Users className={cn("w-5 h-5", iconClass)} />,
      rank: <TrendingUp className={cn("w-5 h-5", iconClass)} />,
      shield: <CheckCircle2 className={cn("w-5 h-5", iconClass)} />,
    };
    return { icon: icons[type] || icons.leads, bgClass };
  };

  if (accomplishments.length === 0) {
    return (
      <div className="mb-8" data-testid="accomplishments-section">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Your Wins</h2>
            <p className="text-sm text-muted-foreground">Business improvements delivered</p>
          </div>
        </div>
        <Card className="bg-card/60 backdrop-blur-sm border-border/50">
          <CardContent className="p-6 text-center">
            <TrendingUp className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              Your first wins will appear here as Arclo starts improving traffic, leads, and rankings.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-8" data-testid="accomplishments-section">
      {/* Header with celebratory badge */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Your Wins</h2>
          <p className="text-sm text-muted-foreground">Business improvements this week</p>
        </div>
        <Badge className="text-xs bg-semantic-success/10 text-semantic-success border-semantic-success/30 flex items-center gap-1.5">
          <Zap className="w-3 h-3" />
          Momentum: {accomplishments.length} wins this week
        </Badge>
      </div>

      <Card className="bg-card/60 backdrop-blur-sm border-border/50">
        <CardContent className="p-5">
          {/* This Week's Impact Summary */}
          <div className="mb-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">This Week's Impact</p>
            <div className="flex gap-3">
              {impactSummary.map((item, idx) => (
                <div 
                  key={idx}
                  className="flex-1 bg-muted/40 rounded-xl p-3 flex items-center gap-2"
                >
                  <div className="w-7 h-7 rounded-lg bg-semantic-success/10 flex items-center justify-center text-semantic-success">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground leading-none">{item.value}</p>
                    <p className="text-[10px] text-muted-foreground">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator className="mb-5" />

          {/* Win Cards */}
          <div className="space-y-4">
            {accomplishments.map((item) => {
              const { icon, bgClass } = getIcon(item.iconType, item.iconColor);
              return (
                <div 
                  key={item.id}
                  className="p-4 rounded-xl bg-muted/30 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", bgClass)}>
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="font-semibold text-foreground">{item.headline}</p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{item.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{item.whyItMatters}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {item.proofChips.map((chip, idx) => (
                          <Badge 
                            key={idx} 
                            variant="outline" 
                            className="text-[10px] px-2 py-0.5 bg-background/50 text-muted-foreground border-border/50 font-normal"
                          >
                            {chip}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Separator className="my-5" />

          {/* Next Win Teaser */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Target className="w-4 h-4 text-purple-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Next win:</span> Complete 'Unlock Analytics Insights' to track traffic and conversion trends.
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-purple-500/50" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AgentSummaryCard({ agent, enabled = true, needsConfig = false }: { agent: { serviceId: string; score: number | null; missionsOpen?: number; status: 'good' | 'watch' | 'bad' | 'neutral'; keyMetric: string; keyMetricValue: string; delta: string; whatChanged: string }; enabled?: boolean; needsConfig?: boolean }) {
  const crew = getCrewMember(agent.serviceId);
  
  const tintedGlassStyles = getTintedGlassStyles(crew.color);
  const crewBadgeStyles = getCrewBadgeStyles(crew.color);

  if (needsConfig) {
    return (
      <Card 
        className="transition-all backdrop-blur-sm rounded-xl overflow-hidden h-full flex flex-col relative"
        style={tintedGlassStyles}
        data-testid={`card-agent-${agent.serviceId}`}
      >
        <CardContent className="p-4 flex flex-col h-full">
          <div className="flex items-start gap-3 mb-4">
            {crew.avatar ? (
              <img 
                src={crew.avatar} 
                alt={crew.nickname}
                className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2"
                style={{ boxShadow: `0 0 8px ${crew.color}40`, borderColor: crew.color }}
              />
            ) : (
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={crewBadgeStyles}
              >
                {crew.nickname.slice(0, 2)}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-base" style={{ color: crew.color }}>{crew.nickname}</h4>
                <Badge variant="outline" className="text-xs border-semantic-warning text-semantic-warning">
                  <Settings className="w-3 h-3 mr-1" />
                  Setup Required
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{crew.role}</p>
            </div>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center text-center py-4">
            <Settings className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-1">Configuration needed</p>
            <p className="text-xs text-muted-foreground/70">Connect your accounts to enable {crew.nickname}</p>
          </div>
          
          <div className="mt-auto pt-3 border-t border-border">
            <Link href={ROUTES.INTEGRATIONS}>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs border-primary/50 text-primary hover:bg-primary/10"
                data-testid={`button-configure-${agent.serviceId}`}
              >
                <Settings className="w-3 h-3 mr-1.5" />
                Configure Integration
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

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
                  <Zap className="w-3 h-3 mr-1.5" />
                  Enable
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
                <p className="text-xs text-muted-foreground mb-1">Enable to unlock insights</p>
                
                <div className="flex-1" />
                
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                  <Badge variant="outline" className="text-xs px-2 py-0.5 rounded-full border border-muted-foreground/30 text-muted-foreground">
                    Not Enabled
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-sm">Enable this capability to unlock insights and fixes.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  const tasksCount = agent.missionsOpen ?? 0;
  
  return (
    <Card 
      className="transition-all backdrop-blur-sm rounded-xl overflow-hidden h-full flex flex-col"
      style={tintedGlassStyles}
      data-testid={`agent-summary-${agent.serviceId}`}
    >
      <CardContent className="p-4 flex flex-col flex-1">
        <div className="flex items-start gap-3 mb-4">
          {crew.avatar ? (
            <img 
              src={crew.avatar} 
              alt={crew.nickname}
              className="w-10 h-10 object-contain flex-shrink-0"
            />
          ) : (
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: crew.color }}
            >
              {crew.nickname.slice(0, 2)}
            </div>
          )}
          <div className="flex-1 min-w-0">
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
            <p className="text-xs text-muted-foreground truncate">{crew.role}</p>
          </div>
        </div>
        
        <div className="mb-3">
          <span 
            className="text-3xl font-bold"
            style={{ color: crew.color }}
          >
            {agent.keyMetricValue}
          </span>
          <p className="text-xs text-muted-foreground mt-1">{agent.keyMetric}</p>
        </div>
        
        <div className="flex-1" />
        
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <span className="text-sm text-muted-foreground">
            {tasksCount} {tasksCount === 1 ? 'task' : 'tasks'} to complete
          </span>
          <Link href={buildRoute.agent(agent.serviceId)}>
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2 hover:bg-transparent" style={{ color: crew.color }}>
              Review Tasks <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function TasksOverviewSection({ 
  priorities, 
  totalOpenTasks,
  onReview 
}: { 
  priorities: any[]; 
  totalOpenTasks: number;
  onReview?: (task: any) => void;
}) {
  const topTasks = priorities.slice(0, 3);
  
  if (topTasks.length === 0) {
    return null;
  }

  // Featured task is the first/highest priority task
  const featuredTask = topTasks[0];
  const secondaryTasks = topTasks.slice(1);
  const featuredCrewId = featuredTask?.agents?.[0]?.agentId || featuredTask?.crewId;
  const featuredCrew = featuredCrewId ? getCrewMember(featuredCrewId) : null;

  // Transform task titles to be outcome-oriented
  const getOutcomeTitle = (title: string) => {
    const transformations: Record<string, string> = {
      "Fetch Analytics": "Unlock Analytics Insights",
      "Check Indexing Status": "Protect Search Visibility",
      "Verify Tracking": "Enable Conversion Tracking",
      "Update Meta Tags": "Improve Search Rankings",
      "Fix Core Web Vitals": "Boost Page Performance",
      "Review Content": "Strengthen Content Quality",
    };
    for (const [key, value] of Object.entries(transformations)) {
      if (title.toLowerCase().includes(key.toLowerCase())) return value;
    }
    return title;
  };

  // Get business-focused description
  const getValueDescription = (task: any) => {
    if (task.why) return task.why;
    const impact = task.impact || "Medium";
    const defaults: Record<string, string> = {
      High: "This directly impacts your traffic, leads, or revenue.",
      Medium: "Completing this improves your site's health and visibility.",
      Low: "A quick win that keeps your site running smoothly.",
    };
    return defaults[impact] || defaults.Medium;
  };

  // Get what improves line
  const getImprovesLine = (task: any) => {
    const crewId = task.agents?.[0]?.agentId || task.crewId;
    const improvements: Record<string, string> = {
      "analytics": "Unlocks traffic trends, conversion rate, and lead tracking",
      "indexing": "Confirms indexing for key pages and detects hidden errors",
      "speedster": "Improves load times and Core Web Vitals scores",
      "authority": "Strengthens backlink profile and domain authority",
      "socrates": "Enriches content insights and keyword intelligence",
    };
    for (const [key, value] of Object.entries(improvements)) {
      if (crewId?.toLowerCase().includes(key) || task.title?.toLowerCase().includes(key)) {
        return value;
      }
    }
    return "Improves site health and search performance";
  };
  
  return (
    <div data-testid="tasks-overview-section" className="p-5 rounded-2xl border-2 border-amber-500/25 shadow-[0_0_24px_-6px_rgba(245,158,11,0.30)] bg-card/60 backdrop-blur-sm mb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Recommended Actions</h2>
          <p className="text-sm text-muted-foreground">
            Complete these to improve traffic, rankings, and conversions.
          </p>
        </div>
        <Badge className="text-xs bg-amber-500/15 text-amber-600 border border-amber-500/30 shadow-[0_0_8px_-2px_rgba(245,158,11,0.3)]">
          {totalOpenTasks} open
        </Badge>
      </div>

      {/* Featured Next Action Card */}
      {featuredTask && (
        <Card 
          className="mb-4 bg-gradient-to-br from-amber-500/8 via-transparent to-transparent border border-amber-500/20 cursor-pointer hover:border-amber-500/40 transition-all"
          onClick={() => onReview?.(featuredTask)}
          data-testid="featured-task-card"
        >
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              {/* Agent color badge - shows who owns this */}
              {featuredCrew && (
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-[0_0_12px_-3px_var(--crew-color)]"
                  style={{ 
                    backgroundColor: `${featuredCrew.color}20`,
                    border: `2px solid ${featuredCrew.color}50`,
                    '--crew-color': featuredCrew.color 
                  } as any}
                >
                  {featuredCrew.avatar ? (
                    <img src={featuredCrew.avatar} alt={featuredCrew.nickname} className="w-7 h-7 object-contain" />
                  ) : (
                    <span className="text-sm font-bold" style={{ color: featuredCrew.color }}>
                      {featuredCrew.nickname.slice(0, 2)}
                    </span>
                  )}
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {featuredCrew && (
                    <span className="text-xs font-medium" style={{ color: featuredCrew.color }}>
                      {featuredCrew.nickname}
                    </span>
                  )}
                  <Badge className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 border-0">
                    Next Action
                  </Badge>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {getOutcomeTitle(featuredTask.title)}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {getValueDescription(featuredTask)}
                </p>
                <p className="text-xs text-muted-foreground/70 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {getImprovesLine(featuredTask)}
                </p>
              </div>
              
              <Button 
                className="bg-semantic-success hover:bg-semantic-success/90 text-white rounded-xl shadow-md px-5 flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onReview?.(featuredTask);
                }}
                data-testid="button-fix-featured"
              >
                <Zap className="w-4 h-4 mr-2" />
                Fix This Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Secondary Task Cards */}
      {secondaryTasks.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {secondaryTasks.map((task, idx) => {
            const crewId = task.agents?.[0]?.agentId || task.crewId;
            const crew = crewId ? getCrewMember(crewId) : null;
            
            return (
              <Card 
                key={task.id || idx} 
                className="bg-card/80 backdrop-blur-sm border-border rounded-xl hover:border-amber-500/30 transition-all cursor-pointer group"
                onClick={() => onReview?.(task)}
                data-testid={`task-card-${task.id || idx}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Agent colored circular badge */}
                    <div 
                      className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ 
                        backgroundColor: crew ? `${crew.color}20` : 'var(--muted)',
                        border: crew ? `2px solid ${crew.color}50` : '2px solid var(--border)'
                      }}
                    >
                      {crew?.avatar ? (
                        <img src={crew.avatar} alt={crew.nickname} className="w-5 h-5 object-contain" />
                      ) : crew ? (
                        <span className="text-xs font-bold" style={{ color: crew.color }}>
                          {crew.nickname.slice(0, 2)}
                        </span>
                      ) : (
                        <Target className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      {crew && (
                        <span className="text-[10px] font-medium" style={{ color: crew.color }}>
                          {crew.nickname}
                        </span>
                      )}
                      <h4 className="text-sm font-semibold text-foreground mb-1 group-hover:text-amber-600 transition-colors">
                        {getOutcomeTitle(task.title)}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                        {getValueDescription(task)}
                      </p>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs h-6 px-0 text-amber-600 hover:text-amber-700 hover:bg-transparent p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onReview?.(task);
                        }}
                        data-testid={`button-fix-${task.id || idx}`}
                      >
                        Fix This <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AgentSummaryGrid({ agents, crewSummaries, kbStatus, agentStatus }: { 
  agents: Array<{ serviceId: string; score: number | null; missionsOpen?: number; status: 'good' | 'watch' | 'bad' }>; 
  crewSummaries?: Array<{ crewId: string; nickname: string; pendingCount: number; lastCompletedAt: string | null; status: 'looking_good' | 'doing_okay' | 'needs_attention'; primaryMetric?: string; primaryMetricValue?: number; deltaPercent?: number | null; deltaLabel?: string; hasNoData?: boolean; emptyStateReason?: string | null }>;
  kbStatus?: { totalLearnings?: number; configured?: boolean; status?: string };
  agentStatus?: Record<string, { health: string; needsConfig: boolean; lastRun: string | null }>;
}) {
  const enabledCount = agents.length;
  
  const enabledAgentData = agents.map(agent => {
    const crewId = SERVICE_TO_CREW[agent.serviceId] || agent.serviceId;
    const crewSummary = crewSummaries?.find((cs: any) => cs.crewId === crewId);
    const isSocrates = agent.serviceId === 'seo_kbase';
    const needsConfig = agentStatus?.[agent.serviceId]?.needsConfig ?? false;
    
    let keyMetric = crewSummary?.primaryMetric || "Pending tasks";
    let keyMetricValue = String(crewSummary?.primaryMetricValue ?? crewSummary?.missions?.open ?? 0);
    
    let whatChanged = crewSummary?.emptyStateReason 
      || (crewSummary?.lastCompletedAt 
        ? `Last completed: ${new Date(crewSummary.lastCompletedAt).toLocaleDateString()}`
        : "No tasks completed yet");
    
    if (isSocrates && kbStatus) {
      keyMetric = "Knowledge entries";
      keyMetricValue = String(kbStatus.totalLearnings || 0);
      whatChanged = kbStatus.configured ? "Knowledge base connected" : "Connect to SEO KBase worker";
    }
    
    let delta = "—";
    if (crewSummary?.deltaPercent !== null && crewSummary?.deltaPercent !== undefined) {
      const sign = crewSummary.deltaPercent > 0 ? "+" : "";
      delta = `${sign}${crewSummary.deltaPercent}%`;
    }
    
    const missionsOpen = crewSummary?.missions?.open ?? agent.missionsOpen ?? 0;
    
    return {
      ...agent,
      enabled: true,
      keyMetric,
      keyMetricValue,
      delta,
      whatChanged,
      missionsOpen,
      needsConfig,
    };
  });

  return (
    <div data-testid="agent-summary-grid">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">Coverage</h2>
          <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground">{enabledCount} of 11 active</Badge>
        </div>
        <Link href={ROUTES.CREW}>
          <Button variant="outline" size="sm" className="text-xs border-dashed border-primary/50 text-primary hover:bg-primary/5">
            <Users className="w-3 h-3 mr-1.5" />
            Manage Coverage
          </Button>
        </Link>
      </div>
      {enabledAgentData.length === 0 ? (
        <Card className="p-8 text-center bg-card/50 border-dashed">
          <Users className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No Capabilities Enabled</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Enable capabilities to start monitoring your site and receiving actionable insights.
          </p>
          <Link href={ROUTES.CREW}>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Users className="w-4 h-4 mr-2" />
              Enable Capabilities
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {enabledAgentData.map((agent) => (
            <AgentSummaryCard key={agent.serviceId} agent={agent} enabled={true} needsConfig={agent.needsConfig} />
          ))}
        </div>
      )}
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

function PrimaryActionCardRow({ 
  autoFixableCount, 
  onFixEverything, 
  onRunDiagnostics,
  isExecuting,
  isRunningDiagnostics
}: { 
  autoFixableCount: number;
  onFixEverything: () => void;
  onRunDiagnostics: () => void;
  isExecuting: boolean;
  isRunningDiagnostics?: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-3 mb-8" data-testid="primary-action-row">
      {/* Card 1: Fix Everything - DOMINANT with strong purple glow */}
      <Card className="md:col-span-1 relative overflow-hidden group transition-all hover:scale-[1.02] bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-amber-500/5 border-2 border-purple-500/30 shadow-[0_0_40px_-8px_rgba(139,92,246,0.45)]" data-testid="card-fix-everything">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />
        <CardContent className="p-6 relative">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Fix Everything For Me</h3>
              <p className="text-xs text-muted-foreground">Recommended</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Automatically fix the highest-impact issues across performance, SEO, and content. Safe mode enabled.
          </p>
          <Button 
            onClick={onFixEverything}
            disabled={isExecuting || autoFixableCount === 0}
            className="w-full text-white rounded-xl shadow-purple hover:-translate-y-0.5 active:translate-y-0 transition-all bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500 hover:opacity-90"
            data-testid="button-fix-everything-primary"
          >
            {isExecuting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            Fix Everything Automatically
            {autoFixableCount > 0 && ` (${autoFixableCount})`}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Safe mode • No destructive changes • Review before publish
          </p>
        </CardContent>
      </Card>

      {/* Card 2: Send Reports - CONSOLIDATED with purple glow */}
      <Card className="transition-all hover:scale-[1.01] bg-card/80 backdrop-blur-sm border-2 border-purple-500/25 shadow-[0_0_24px_-6px_rgba(139,92,246,0.30)]" data-testid="card-send-reports">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Send className="w-5 h-5 text-purple-500" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Send Reports</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-5">
            Review and send tailored reports depending on who you're sharing with.
          </p>
          <div className="flex flex-col gap-3">
            <Link href={ROUTES.WEBSITE_REPORT} className="block">
              <Button 
                variant="outline"
                className="w-full h-14 rounded-xl border-purple-500/30 text-purple-400 hover:bg-purple-500/5 hover:border-purple-500/50 px-5 transition-all"
                data-testid="button-business-report"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 flex-shrink-0" />
                    <div className="text-left flex flex-col leading-tight">
                      <span className="text-sm font-medium">Send Business Report</span>
                      <span className="text-[11px] text-muted-foreground font-normal">For owners, stakeholders, weekly summaries</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-purple-400/50 flex-shrink-0" />
                </div>
              </Button>
            </Link>
            <Link href={ROUTES.DEVELOPER_REPORT} className="block">
              <Button 
                variant="outline"
                className="w-full h-14 rounded-xl border-purple-500/30 text-purple-400 hover:bg-purple-500/5 hover:border-purple-500/50 px-5 transition-all"
                data-testid="button-technical-report"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <Code className="w-5 h-5 flex-shrink-0" />
                    <div className="text-left flex flex-col leading-tight">
                      <span className="text-sm font-medium">Send Technical Report</span>
                      <span className="text-[11px] text-muted-foreground font-normal">For developers and agencies</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-purple-400/50 flex-shrink-0" />
                </div>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Run Diagnostics - GREEN GLOW */}
      <Card className="transition-all hover:scale-[1.01] bg-card/80 backdrop-blur-sm border-2 border-emerald-500/25 shadow-[0_0_24px_-6px_rgba(16,185,129,0.30)]" data-testid="card-run-diagnostics">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Play className="w-5 h-5 text-emerald-500" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Run Diagnostics</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Re-scan your site to detect new issues and update metrics with the latest data.
          </p>
          <Button 
            onClick={onRunDiagnostics}
            disabled={isRunningDiagnostics}
            className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white"
            data-testid="button-run-diagnostics-card"
          >
            {isRunningDiagnostics ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            Run Diagnostics
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-3">
            Get fresh data • Update all metrics
          </p>
        </CardContent>
      </Card>
    </div>
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
  totalOpenMissions,
}: {
  priorities: any[];
  blockers: any[];
  confidence: string;
  isRealData?: boolean;
  placeholderReason?: string;
  onReview?: (mission: any) => void;
  onRunDiagnostics?: () => void;
  isRunning?: boolean;
  totalOpenMissions?: number;
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

  const openCount = totalOpenMissions ?? priorities.filter(p => !terminalStatuses.includes(p.status)).length;
  
  const status: MissionStatusState = {
    tier: statusTier,
    summaryLine: isRealData === false
      ? (placeholderReason || "Run diagnostics for real data")
      : `${completedCount} of ${totalMissions} tasks complete${blockers.length > 0 ? ` • ${blockers.length} blocker${blockers.length > 1 ? 's' : ''}` : ''}`,
    nextStep: getNextStep(),
    performanceScore: missionScore,
    autoFixableCount: autoFixableItems.length,
    priorityCount: priorities.length,
    missions: { open: openCount },
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

  // Use the shared hired crews hook for consistency across the app
  const { hiredCrewIds, agentStatus } = useHiredCrews();

  const handleReviewMission = (mission: any) => {
    setSelectedMission(mission);
    setMissionModalOpen(true);
  };

  const handleMarkMissionDone = (missionId: string | number) => {
    toast.success("Task marked as done");
    setMissionModalOpen(false);
  };

  const handleFixEverything = async () => {
    try {
      setIsExecutingAll(true);
      await executeAll();
      toast.success("All auto-fixable tasks executed!");
      refetch();
    } catch (error) {
      toast.error("Failed to execute tasks");
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

  // Filter to only show hired (enabled) crew members
  const enabledAgentIds = new Set(hiredCrewIds);
  
  const userAgents = USER_FACING_AGENTS
    .filter(serviceId => enabledAgentIds.has(serviceId))
    .map((serviceId, index) => {
      // Map service_id to crew_id for lookup in crewSummaries
      const crewId = SERVICE_TO_CREW[serviceId] || serviceId;
      const crewSummary = dashboard?.crewSummaries?.find((cs: any) => cs.crewId === crewId);
      
      // Use server-provided score for consistency with crew pages (single source of truth)
      // Score is now an object { value: number | null, status, updatedAt }
      const scoreValue = crewSummary?.score?.value ?? null;
      const missionsOpen = crewSummary?.missions?.open ?? 0;
      
      return {
        serviceId,
        score: scoreValue,
        missionsOpen,
        status: scoreValue !== null 
          ? (scoreValue >= 70 ? 'good' as const : scoreValue >= 40 ? 'watch' as const : 'bad' as const)
          : (missionsOpen === 0 ? 'good' as const : missionsOpen <= 2 ? 'watch' as const : 'bad' as const),
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
  
  const totalOpenMissions = dashboard?.crewSummaries?.reduce((sum: number, crew: any) => {
    return sum + (crew.missions?.open ?? 0);
  }, 0) ?? 0;
  
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
    placeholderReason: "No tasks available - run diagnostics to generate recommendations"
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
              size="sm" 
              onClick={() => runDiagnostics.mutate()}
              disabled={runDiagnostics.isPending}
              className="text-white rounded-xl shadow-purple hover:-translate-y-0.5 active:translate-y-0 transition-all bg-semantic-success hover:bg-semantic-success/90"
              data-testid="button-run-diagnostics"
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

        <PrimaryActionCardRow
          autoFixableCount={dashboard?.aggregatedStatus?.autoFixableCount || 0}
          onFixEverything={handleFixEverything}
          onRunDiagnostics={() => runDiagnostics.mutate()}
          isExecuting={isExecutingAll}
          isRunningDiagnostics={runDiagnostics.isPending}
        />

        <AccomplishmentsSection />


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

        <TasksOverviewSection 
          priorities={captainData.priorities || []}
          totalOpenTasks={totalOpenMissions}
          onReview={handleReviewMission}
        />

        <AgentSummaryGrid 
          agents={userAgents} 
          crewSummaries={dashboard?.crewSummaries}
          kbStatus={kbStatus}
          agentStatus={agentStatus}
        />

        <SocratesMemoryCard />

        <GovernancePanels />
      </div>

      <DeveloperReportModal 
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
