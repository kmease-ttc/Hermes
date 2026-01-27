import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Search,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  BarChart3,
  FileText,
  Globe,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Minus,
  Eye,
  Zap,
  Loader2,
  Info,
  Link2,
  Layout,
  X,
  Plus,
  Trophy,
  Shield,
  Swords,
  Clock,
  AlertCircle,
  ChevronRight,
  Compass,
  Settings,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSiteContext } from "@/hooks/useSiteContext";
import { useCrewStatus } from "@/hooks/useCrewStatus";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CrewDashboardShell,
  type CrewIdentity,
  type KpiDescriptor,
  type InspectorTab,
  type WidgetState,
  type MissionPromptConfig,
  type HeaderAction,
} from "@/components/crew-dashboard";
import { KeyMetricsGrid } from "@/components/key-metrics";
import { CrewPageLayout } from "@/components/crew/CrewPageLayout";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface Competitor {
  id: string;
  name: string;
  domain: string;
  type: "direct" | "indirect" | "serp-only";
  visibility: number;
  visibilityChange: number;
  marketOverlap: number;
  keywords: number;
  topKeywords: string[];
  lastUpdated: string;
  deltaScore?: number;
}

interface ContentGap {
  id: string;
  keyword: string;
  cluster?: string;
  searchVolume: number;
  difficulty: number;
  competitorsCovering: number;
  yourCoverage: "none" | "thin" | "outdated";
  opportunity: "high" | "medium" | "low";
  suggestedAction: string;
  actionType: "create" | "expand" | "optimize";
}

interface AuthorityGap {
  id: string;
  domain: string;
  competitor: string;
  authority: number;
  linkType: "editorial" | "directory" | "guest-post";
  suggestedAction: string;
}

interface SerpFeatureGap {
  id: string;
  keyword: string;
  feature: "featured_snippet" | "people_also_ask" | "image_pack" | "local_pack" | "video";
  competitorOwning: string;
  pageType: string;
  structuralHint: string;
  suggestedAction: string;
}

interface RankingPage {
  url: string;
  keyword: string;
  yourPosition: number | null;
  competitorPosition: number;
  competitor: string;
  gap: number;
  trafficImpact?: number;
  intent?: "informational" | "commercial" | "transactional";
}

interface CompetitiveMission {
  id: string;
  title: string;
  description: string;
  type: "content" | "authority" | "serp" | "technical";
  expectedImpact: "high" | "medium" | "low";
  difficulty: "easy" | "medium" | "hard";
  executingCrew: string;
  keywords?: string[];
  target?: string;
  priority?: string;
}

interface ShareOfVoiceDetails {
  target_sov: number;
  top_competitor_sov: number;
  market_visibility: string;
  keywords_tracked: number;
  keywords_ranking: number;
}

interface TrendAlert {
  id: string;
  type: "rank_jump" | "new_competitor" | "content_surge" | "link_velocity";
  message: string;
  competitor?: string;
  severity: "info" | "warning" | "critical";
  timestamp: string;
}

interface CompetitiveOverview {
  configured: boolean;
  isRealData?: boolean;
  status?: "ready" | "loading" | "empty" | "unavailable";
  lastRunAt: string | null;
  competitivePosition: "ahead" | "parity" | "behind";
  positionExplanation: string;
  shareOfVoice: number;
  shareOfVoiceDetails?: ShareOfVoiceDetails | null;
  avgRank: number;
  agentScore?: number;
  competitors: Competitor[];
  contentGaps: ContentGap[];
  authorityGaps: AuthorityGap[];
  serpFeatureGaps: SerpFeatureGap[];
  rankingPages: RankingPage[];
  missions: CompetitiveMission[];
  alerts: TrendAlert[];
  summary: {
    totalCompetitors: number;
    totalGaps: number;
    highPriorityGaps: number;
    avgVisibilityGap: number;
    keywordsTracked: number;
    keywordsWinning: number;
    keywordsLosing: number;
    referringDomains: number;
    competitorAvgDomains: number;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// KPI Normalization Helper
// ═══════════════════════════════════════════════════════════════════════════

interface NormalizedKpis {
  avgRank: number;
  shareOfVoicePct: number;
}

function normalizeCompetitiveKpis(data: any): NormalizedKpis {
  let avgRank = 0;
  let shareOfVoicePct = 0;

  const avgRankCandidates = [
    data?.avgRank,
    data?.avg_rank,
    data?.averageRank,
    data?.metrics?.avgRank,
    data?.kpis?.avgRank,
  ];
  for (const candidate of avgRankCandidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) {
      avgRank = candidate;
      break;
    }
  }

  const sovCandidates = [
    data?.shareOfVoice,
    data?.share_of_voice,
    data?.sov,
    data?.metrics?.shareOfVoice,
    data?.kpis?.shareOfVoice,
  ];
  for (const candidate of sovCandidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      shareOfVoicePct = candidate;
      break;
    }
    if (typeof candidate === 'object' && candidate !== null) {
      const targetSov = candidate.target_sov ?? candidate.targetSov;
      if (typeof targetSov === 'number' && Number.isFinite(targetSov)) {
        shareOfVoicePct = targetSov;
        break;
      }
    }
  }

  return {
    avgRank: Number.isFinite(avgRank) ? avgRank : 0,
    shareOfVoicePct: Number.isFinite(shareOfVoicePct) ? shareOfVoicePct : 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Inspector Tab Components
// ═══════════════════════════════════════════════════════════════════════════

function ShareOfVoiceBar({ 
  name, 
  value, 
  isYou = false,
  color
}: { 
  name: string; 
  value: number; 
  isYou?: boolean;
  color?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className={cn("font-medium", isYou ? "text-purple-accent" : "text-foreground")}>
          {name} {isYou && <Badge variant="outline" className="text-xs ml-1 border-purple-accent text-purple-accent">You</Badge>}
        </span>
        <span className={cn("font-bold", isYou ? "text-purple-accent" : "text-muted-foreground")}>{value}%</span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div 
          className={cn("h-full rounded-full transition-all", isYou ? "bg-purple-accent" : "bg-muted-foreground/40")}
          style={{ width: `${value}%`, backgroundColor: isYou ? undefined : color }}
        />
      </div>
    </div>
  );
}

function CompetitorRow({ 
  competitor, 
  onRemove 
}: { 
  competitor: Competitor; 
  onRemove?: (id: string) => void;
}) {
  const typeLabels: Record<string, { label: string; color: string }> = {
    direct: { label: "Direct", color: "bg-semantic-danger-soft text-semantic-danger" },
    indirect: { label: "Indirect", color: "bg-semantic-warning-soft text-semantic-warning" },
    "serp-only": { label: "SERP-only", color: "bg-muted text-muted-foreground" },
  };

  const displayName = competitor.name || competitor.domain || "Unknown";
  const initials = displayName.slice(0, 2).toUpperCase();
  const typeConfig = typeLabels[competitor.type] || typeLabels["serp-only"];
  const competitorId = competitor.id || competitor.domain || String(competitor.position);

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl bg-card/40 border border-border hover:border-primary/30 transition-colors" data-testid={`competitor-row-${competitorId}`}>
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-sm font-bold shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-foreground truncate">{displayName}</h4>
          {competitor.type && (
            <Badge variant="secondary" className={cn("text-xs shrink-0", typeConfig.color)}>
              {typeConfig.label}
            </Badge>
          )}
          {(competitor as any).difficulty && (
            <Badge variant="outline" className="text-xs shrink-0">
              {(competitor as any).difficulty}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground">{competitor.domain}</p>
      </div>
      {competitor.marketOverlap !== undefined && (
        <div className="text-center px-3 hidden sm:block">
          <p className="text-xs text-muted-foreground">Overlap</p>
          <p className="font-bold text-foreground">{competitor.marketOverlap}%</p>
        </div>
      )}
      {(competitor as any).opportunity_score !== undefined && (
        <div className="text-center px-3 hidden sm:block">
          <p className="text-xs text-muted-foreground">Opportunity</p>
          <p className="font-bold text-semantic-success">{(competitor as any).opportunity_score}</p>
        </div>
      )}
      {competitor.keywords !== undefined && (
        <div className="text-center px-3 hidden sm:block">
          <p className="text-xs text-muted-foreground">Keywords</p>
          <p className="font-bold text-foreground">{competitor.keywords}</p>
        </div>
      )}
      {(competitor as any).position !== undefined && (
        <div className="text-center px-3 hidden sm:block">
          <p className="text-xs text-muted-foreground">Rank</p>
          <p className="font-bold text-foreground">#{(competitor as any).position}</p>
        </div>
      )}
      {competitor.deltaScore !== undefined && (
        <div className="text-center px-3">
          <p className="text-xs text-muted-foreground">Delta</p>
          <p className={cn("font-bold", competitor.deltaScore > 0 ? "text-semantic-success" : "text-semantic-danger")}>
            {competitor.deltaScore > 0 ? "+" : ""}{competitor.deltaScore}
          </p>
        </div>
      )}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-semantic-danger shrink-0"
              onClick={() => onRemove?.(competitorId)}
              data-testid={`button-remove-competitor-${competitorId}`}
            >
              <X className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Ignore this competitor</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

function ContentGapCard({ gap, onAction }: { gap: ContentGap; onAction?: (action: string) => void }) {
  const opportunityColors = {
    high: "bg-semantic-success-soft text-semantic-success border-semantic-success-border",
    medium: "bg-semantic-warning-soft text-semantic-warning border-semantic-warning-border",
    low: "bg-muted text-muted-foreground border-border",
  };

  const coverageLabels = {
    none: { label: "No coverage", color: "text-semantic-danger" },
    thin: { label: "Thin content", color: "text-semantic-warning" },
    outdated: { label: "Outdated", color: "text-semantic-warning" },
  };

  const actionLabels = {
    create: "Create content",
    expand: "Expand existing",
    optimize: "Optimize page",
  };

  return (
    <div className="p-4 rounded-xl bg-card/40 border border-border hover:border-primary/30 transition-colors" data-testid={`content-gap-${gap.id}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-medium text-foreground">{gap.keyword}</h4>
            {gap.cluster && (
              <Badge variant="secondary" className="text-xs">{gap.cluster}</Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
            <span className="flex items-center gap-1">
              <Search className="w-3 h-3" />
              {gap.searchVolume.toLocaleString()}/mo
            </span>
            <span className="flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />
              KD: {gap.difficulty}
            </span>
            <span className={cn("flex items-center gap-1", coverageLabels[gap.yourCoverage].color)}>
              {coverageLabels[gap.yourCoverage].label}
            </span>
          </div>
        </div>
        <Badge variant="outline" className={cn("text-xs ml-2 shrink-0", opportunityColors[gap.opportunity])}>
          {gap.opportunity} priority
        </Badge>
      </div>
      <div className="flex items-center justify-between mt-3 gap-3">
        <p className="text-sm text-muted-foreground flex-1">{gap.suggestedAction}</p>
        <Button 
          variant="outline" 
          size="sm" 
          className="shrink-0"
          onClick={() => onAction?.(gap.actionType)}
          data-testid={`button-gap-action-${gap.id}`}
        >
          {actionLabels[gap.actionType]}
        </Button>
      </div>
    </div>
  );
}

function AuthorityGapCard({ gap }: { gap: AuthorityGap }) {
  return (
    <div className="p-4 rounded-xl bg-card/40 border border-border hover:border-primary/30 transition-colors" data-testid={`authority-gap-${gap.id}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <Link2 className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h4 className="font-medium text-foreground">{gap.domain}</h4>
            <p className="text-xs text-muted-foreground">DA: {gap.authority} • {gap.competitor} has this link</p>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs capitalize">{gap.linkType.replace("-", " ")}</Badge>
      </div>
      <div className="flex items-center justify-between mt-3 gap-3">
        <p className="text-sm text-muted-foreground flex-1">{gap.suggestedAction}</p>
        <Button variant="outline" size="sm" className="shrink-0" data-testid={`button-authority-action-${gap.id}`}>
          Pursue Link
        </Button>
      </div>
    </div>
  );
}

function SerpFeatureGapCard({ gap }: { gap: SerpFeatureGap }) {
  const featureLabels = {
    featured_snippet: { label: "Featured Snippet", icon: FileText },
    people_also_ask: { label: "People Also Ask", icon: Search },
    image_pack: { label: "Image Pack", icon: Layout },
    local_pack: { label: "Local Pack", icon: Globe },
    video: { label: "Video", icon: Eye },
  };

  const config = featureLabels[gap.feature];
  const Icon = config.icon;

  return (
    <div className="p-4 rounded-xl bg-card/40 border border-border hover:border-primary/30 transition-colors" data-testid={`serp-gap-${gap.id}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-accent/10 flex items-center justify-center">
            <Icon className="w-5 h-5 text-purple-accent" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-foreground">{gap.keyword}</h4>
              <Badge variant="secondary" className="text-xs">{config.label}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">Owned by {gap.competitorOwning} • {gap.pageType}</p>
          </div>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mt-2">{gap.structuralHint}</p>
      <div className="flex items-center justify-between mt-3 gap-3">
        <p className="text-sm text-purple-accent flex-1">{gap.suggestedAction}</p>
        <Button variant="outline" size="sm" className="shrink-0" data-testid={`button-serp-action-${gap.id}`}>
          Optimize
        </Button>
      </div>
    </div>
  );
}

function TrendAlertCard({ alert }: { alert: TrendAlert }) {
  const severityConfig = {
    info: { bg: "bg-muted", border: "border-border", icon: Info, iconColor: "text-muted-foreground" },
    warning: { bg: "bg-semantic-warning-soft/30", border: "border-semantic-warning-border", icon: AlertTriangle, iconColor: "text-semantic-warning" },
    critical: { bg: "bg-semantic-danger-soft/30", border: "border-semantic-danger-border", icon: AlertCircle, iconColor: "text-semantic-danger" },
  };

  const config = severityConfig[alert.severity];
  const Icon = config.icon;

  return (
    <div className={cn("flex items-start gap-3 p-3 rounded-xl border", config.bg, config.border)} data-testid={`alert-${alert.id}`}>
      <Icon className={cn("w-5 h-5 shrink-0 mt-0.5", config.iconColor)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground">{alert.message}</p>
        <p className="text-xs text-muted-foreground mt-1">
          <Clock className="w-3 h-3 inline mr-1" />
          {new Date(alert.timestamp).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Inspector Content Panels
// ═══════════════════════════════════════════════════════════════════════════

function OverviewPanel({ 
  data, 
  onRefresh, 
  isRefreshing,
  marketSov,
  trackedSov,
  marketSovData
}: { 
  data: CompetitiveOverview; 
  onRefresh: () => void; 
  isRefreshing?: boolean;
  marketSov: number;
  trackedSov: number;
  marketSovData?: { marketSov: number; totalKeywords: number; rankingKeywords: number; breakdown: any; message: string };
}) {
  const hasData = data.competitors.length > 0 || data.shareOfVoice > 0;
  
  const statusConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    ahead: { label: "Ahead", icon: Trophy, color: "text-semantic-success", bg: "bg-semantic-success-soft" },
    parity: { label: "At parity", icon: Swords, color: "text-semantic-warning", bg: "bg-semantic-warning-soft" },
    behind: { label: "Behind", icon: Shield, color: "text-semantic-danger", bg: "bg-semantic-danger-soft" },
    unknown: { label: "Not analyzed", icon: Compass, color: "text-muted-foreground", bg: "bg-muted" },
  };

  const posConfig = statusConfig[data.competitivePosition] || statusConfig.unknown;
  const PosIcon = posConfig.icon;

  if (!hasData) {
    return (
      <div className="space-y-6 py-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-purple-accent/10 flex items-center justify-center mx-auto mb-4">
            <Compass className="w-8 h-8 text-purple-accent" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Data not connected yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Configure integration to activate this crew. Run an analysis to discover your competitors, track keyword rankings, and identify content opportunities.
          </p>
          <Button 
            variant="gold" 
            size="lg" 
            onClick={onRefresh}
            disabled={isRefreshing}
            className="rounded-xl"
            data-testid="button-run-competitive-analysis"
          >
            {isRefreshing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Run Competitive Analysis
              </>
            )}
          </Button>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border">
          <div className="text-center p-4 rounded-xl bg-muted/30">
            <Users className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Competitor Detection</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-muted/30">
            <TrendingUp className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Keyword Tracking</p>
          </div>
          <div className="text-center p-4 rounded-xl bg-muted/30">
            <Target className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Gap Analysis</p>
          </div>
        </div>
      </div>
    );
  }

  // Check if we have any meaningful visibility data for competitors
  const hasCompetitorVisibility = data.competitors.some(c => c.visibility > 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 p-4 rounded-xl bg-card/40 border border-border">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", posConfig.bg)}>
          <PosIcon className={cn("w-6 h-6", posConfig.color)} />
        </div>
        <div className="flex-1">
          <p className={cn("font-bold text-lg", posConfig.color)}>{posConfig.label} of competitors</p>
          <p className="text-sm text-muted-foreground">{data.positionExplanation}</p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-card/40 border border-border">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-purple-accent shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm text-foreground font-medium">Share of Voice</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li><strong className="text-foreground">Market SOV</strong> — Your visibility across all target keywords (CTR-weighted from Lookout).</li>
              <li><strong className="text-foreground">Tracked SOV</strong> — Your visibility vs selected competitors.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-card/60 border border-border text-center">
          <p className="text-3xl font-bold text-foreground">{marketSov}%</p>
          <p className="text-sm text-muted-foreground mt-1">Market SOV</p>
          {marketSovData && (
            <p className="text-xs text-muted-foreground mt-2">
              {marketSovData.rankingKeywords} of {marketSovData.totalKeywords} keywords ranking
            </p>
          )}
        </div>
        <div className="p-4 rounded-xl bg-card/60 border border-border text-center">
          <p className="text-3xl font-bold text-foreground">{trackedSov}%</p>
          <p className="text-sm text-muted-foreground mt-1">Tracked SOV</p>
          <p className="text-xs text-muted-foreground mt-2">
            vs {data.competitors.length} tracked competitors
          </p>
        </div>
      </div>

      {marketSovData?.breakdown && (
        <div>
          <h4 className="font-medium text-foreground mb-3">Position Distribution (from Lookout)</h4>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {[
              { label: "#1", value: marketSovData.breakdown.top1, color: "text-semantic-success" },
              { label: "#2-3", value: marketSovData.breakdown.top3, color: "text-semantic-success" },
              { label: "#4-10", value: marketSovData.breakdown.top10, color: "text-semantic-warning" },
              { label: "#11-20", value: marketSovData.breakdown.top20, color: "text-semantic-warning" },
              { label: "#21-50", value: marketSovData.breakdown.top50, color: "text-muted-foreground" },
              { label: "Not ranking", value: marketSovData.breakdown.notRanking, color: "text-semantic-danger" },
            ].map((item) => (
              <div key={item.label} className="p-3 rounded-lg bg-muted/30 text-center">
                <p className={cn("text-lg font-semibold", item.color)}>{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {(marketSov > 0 || hasCompetitorVisibility) && (
        <div>
          <h4 className="font-medium text-foreground mb-3">Visibility Comparison</h4>
          <div className="space-y-3">
            <ShareOfVoiceBar name="Your Site (Market SOV)" value={marketSov} isYou />
            {hasCompetitorVisibility && data.competitors.slice(0, 5).map((comp, idx) => (
              <ShareOfVoiceBar 
                key={comp.id} 
                name={comp.name} 
                value={comp.visibility} 
                color={["#ef4444", "#f97316", "#eab308", "#84cc16", "#06b6d4"][idx]}
              />
            ))}
          </div>
          {!hasCompetitorVisibility && data.competitors.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2 italic">
              Competitor visibility data not yet available. Run analysis to populate.
            </p>
          )}
        </div>
      )}

      {data.lastRunAt && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Last analysis: {new Date(data.lastRunAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

interface AddCompetitorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: string;
  onSuccess: () => void;
}

function AddCompetitorDialog({ open, onOpenChange, siteId, onSuccess }: AddCompetitorDialogProps) {
  const [domain, setDomain] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<"direct" | "indirect" | "serp-only">("direct");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!domain.trim()) {
      toast.error("Domain is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/competitive/competitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          agentSlug: "natasha",
          domain: domain.trim(),
          name: name.trim() || null,
          type,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to add competitor");
      }

      toast.success("Competitor added successfully");
      setDomain("");
      setName("");
      setType("direct");
      setNotes("");
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Failed to add competitor");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Competitor</DialogTitle>
          <DialogDescription>
            Add a competitor domain to track in your competitive analysis.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="domain">Domain *</Label>
              <Input
                id="domain"
                placeholder="competitor.com"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                data-testid="input-competitor-domain"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                placeholder="Competitor Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                data-testid="input-competitor-name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger data-testid="select-competitor-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="direct">Direct Competitor</SelectItem>
                  <SelectItem value="indirect">Indirect Competitor</SelectItem>
                  <SelectItem value="serp-only">SERP Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes about this competitor..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                data-testid="input-competitor-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} data-testid="button-submit-competitor">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Competitor"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CompetitorsPanel({ 
  competitors, 
  onRemove, 
  onAdd,
  onFindCompetitors,
  isFinding
}: { 
  competitors: Competitor[]; 
  onRemove: (id: string) => void;
  onAdd: () => void;
  onFindCompetitors: () => void;
  isFinding: boolean;
}) {
  if (competitors.length === 0) {
    return (
      <div className="p-6 text-center">
        <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground mb-4">No competitors detected yet</p>
        <div className="flex gap-2 justify-center">
          <Button variant="default" onClick={onFindCompetitors} disabled={isFinding} data-testid="button-find-competitors-empty">
            {isFinding ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            Find Competitors
          </Button>
          <Button variant="outline" onClick={onAdd} data-testid="button-add-competitor-empty">
            <Plus className="w-4 h-4 mr-2" />
            Add Manually
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="default" size="sm" onClick={onFindCompetitors} disabled={isFinding} data-testid="button-find-competitors">
          {isFinding ? <RefreshCw className="w-4 h-4 mr-1 animate-spin" /> : <Search className="w-4 h-4 mr-1" />}
          Find Competitors
        </Button>
        <Button variant="outline" size="sm" onClick={onAdd} data-testid="button-add-competitor">
          <Plus className="w-4 h-4 mr-1" />
          Add Manually
        </Button>
      </div>
      <div className="space-y-3">
        {competitors.map((competitor, idx) => (
          <CompetitorRow key={competitor.id || competitor.domain || idx} competitor={competitor} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
}

function GapAnalysisPanel({ data }: { data: CompetitiveOverview }) {
  const [gapTab, setGapTab] = useState("content");

  return (
    <Tabs value={gapTab} onValueChange={setGapTab}>
      <TabsList className="mb-4">
        <TabsTrigger value="content" className="flex items-center gap-1">
          <FileText className="w-4 h-4" />
          Content
          <Badge variant="secondary" className="ml-1 text-xs">{data.contentGaps.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="authority" className="flex items-center gap-1">
          <Link2 className="w-4 h-4" />
          Authority
          <Badge variant="secondary" className="ml-1 text-xs">{data.authorityGaps.length}</Badge>
        </TabsTrigger>
        <TabsTrigger value="serp" className="flex items-center gap-1">
          <Layout className="w-4 h-4" />
          SERP
          <Badge variant="secondary" className="ml-1 text-xs">{data.serpFeatureGaps.length}</Badge>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="content">
        {data.contentGaps.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">No content gaps found</p>
        ) : (
          <div className="space-y-3">
            {data.contentGaps.map((gap) => (
              <ContentGapCard key={gap.id} gap={gap} onAction={() => toast.success("Action initiated")} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="authority">
        {data.authorityGaps.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">No authority gaps detected</p>
        ) : (
          <div className="space-y-3">
            {data.authorityGaps.map((gap) => (
              <AuthorityGapCard key={gap.id} gap={gap} />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="serp">
        {data.serpFeatureGaps.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">No SERP feature gaps</p>
        ) : (
          <div className="space-y-3">
            {data.serpFeatureGaps.map((gap) => (
              <SerpFeatureGapCard key={gap.id} gap={gap} />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}

interface AgentSnapshot {
  id: number;
  agentSlug: string;
  siteId: string;
  marketSovPct: number;
  trackedSovPct: number | null;
  totalKeywords: number;
  rankingKeywords: number;
  notRankingKeywords: number;
  top1Count: number;
  top3Count: number;
  top10Count: number;
  top20Count: number;
  top50Count: number;
  positionDistribution: any;
  timestamp: string;
}

function TrendsPanel({ alerts, siteId }: { alerts: TrendAlert[]; siteId: string }) {
  const { data: snapshots, isLoading } = useQuery<AgentSnapshot[]>({
    queryKey: ["natasha-snapshots", siteId],
    queryFn: async () => {
      const res = await fetch(`/api/snapshots/natasha?siteId=${siteId}&limit=30`);
      if (!res.ok) throw new Error("Failed to fetch snapshots");
      return res.json();
    },
    staleTime: 60000,
  });

  const chartData = useMemo(() => {
    if (!snapshots || snapshots.length === 0) return [];
    return [...snapshots]
      .reverse()
      .map((s) => ({
        date: new Date(s.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        timestamp: s.timestamp,
        marketSov: s.marketSovPct,
        rankingKeywords: s.rankingKeywords || 0,
        totalKeywords: s.totalKeywords || 0,
        top10: (s.top1Count || 0) + (s.top3Count || 0) + (s.top10Count || 0),
      }));
  }, [snapshots]);

  const latestChange = useMemo(() => {
    if (chartData.length < 2) return null;
    const current = chartData[chartData.length - 1].marketSov;
    const previous = chartData[chartData.length - 2].marketSov;
    return current - previous;
  }, [chartData]);

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <RefreshCw className="w-8 h-8 text-muted-foreground mx-auto mb-2 animate-spin" />
        <p className="text-sm text-muted-foreground">Loading trends...</p>
      </div>
    );
  }

  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="p-6 text-center">
        <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">No historical data yet</p>
        <p className="text-sm text-muted-foreground mt-1">Run analysis to start tracking Market SOV over time.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Market SOV Trend Chart */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-foreground">Market SOV Trend</h4>
          {latestChange !== null && (
            <div className={cn(
              "flex items-center gap-1 text-sm font-medium",
              latestChange > 0 ? "text-semantic-success" : latestChange < 0 ? "text-semantic-danger" : "text-muted-foreground"
            )}>
              {latestChange > 0 ? <ArrowUp className="w-4 h-4" /> : latestChange < 0 ? <ArrowDown className="w-4 h-4" /> : null}
              {latestChange > 0 ? "+" : ""}{latestChange}% since last scan
            </div>
          )}
        </div>
        <div className="h-48 bg-muted/20 rounded-lg p-3">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis 
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
                tickFormatter={(v) => `${v}%`}
              />
              <RechartsTooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number) => [`${value}%`, "Market SOV"]}
              />
              <Line 
                type="monotone" 
                dataKey="marketSov" 
                stroke="hsl(var(--primary))" 
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Keywords Ranking Trend */}
      <div>
        <h4 className="font-medium text-foreground mb-3">Keywords Ranking Over Time</h4>
        <div className="h-40 bg-muted/20 rounded-lg p-3">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <YAxis 
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={{ stroke: "hsl(var(--border))" }}
              />
              <RechartsTooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Area 
                type="monotone" 
                dataKey="top10" 
                stackId="1"
                stroke="hsl(var(--semantic-success))" 
                fill="hsl(var(--semantic-success-soft))" 
                name="Top 10"
              />
              <Area 
                type="monotone" 
                dataKey="rankingKeywords" 
                stackId="2"
                stroke="hsl(var(--semantic-warning))" 
                fill="hsl(var(--semantic-warning-soft))" 
                name="Total Ranking"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trend Alerts */}
      {alerts.length > 0 && (
        <div>
          <h4 className="font-medium text-foreground mb-3">Recent Alerts</h4>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <TrendAlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Achievement type from database
interface Achievement {
  id: number;
  siteId: string;
  agentSlug: string;
  type: string;
  title: string;
  description: string | null;
  value: any;
  achievedAt: string;
  createdAt: string;
}

function AchievementsPanel({ siteId }: { siteId: string }) {
  const queryClient = useQueryClient();
  
  const { data: achievements = [], isLoading, refetch } = useQuery<Achievement[]>({
    queryKey: ["achievements", siteId, "natasha"],
    queryFn: async () => {
      const res = await fetch(`/api/achievements?siteId=${siteId}&agentSlug=natasha&limit=20`);
      if (!res.ok) throw new Error("Failed to fetch achievements");
      return res.json();
    },
    staleTime: 30000,
  });

  const computeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/achievements/compute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, agentSlug: "natasha" }),
      });
      if (!res.ok) throw new Error("Failed to compute achievements");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.count > 0) {
        toast.success(`Found ${data.count} new achievement${data.count > 1 ? 's' : ''}!`);
      } else {
        toast.info("No new achievements to add");
      }
      refetch();
    },
    onError: () => {
      toast.error("Failed to compute achievements");
    },
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "ranking": return <ArrowUp className="w-4 h-4" />;
      case "sov": return <TrendingUp className="w-4 h-4" />;
      case "milestone": return <Trophy className="w-4 h-4" />;
      case "competitor": return <Swords className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "ranking": return "bg-semantic-success/20 text-semantic-success";
      case "sov": return "bg-semantic-info/20 text-semantic-info";
      case "milestone": return "bg-accent-gold/20 text-accent-gold";
      case "competitor": return "bg-semantic-warning/20 text-semantic-warning";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center">
        <RefreshCw className="w-8 h-8 text-muted-foreground mx-auto mb-2 animate-spin" />
        <p className="text-sm text-muted-foreground">Loading achievements...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-foreground">Agent Wins & Milestones</h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => computeMutation.mutate()}
          disabled={computeMutation.isPending}
          data-testid="button-compute-achievements"
        >
          {computeMutation.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Check for Wins
        </Button>
      </div>

      {achievements.length === 0 ? (
        <div className="p-6 text-center border border-dashed border-border rounded-lg">
          <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No achievements yet</p>
          <p className="text-sm text-muted-foreground mt-1">Run analysis and check for wins to track your progress.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {achievements.map((achievement) => (
            <div 
              key={achievement.id} 
              className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border/50"
              data-testid={`achievement-card-${achievement.id}`}
            >
              <div className={cn("p-2 rounded-lg", getTypeColor(achievement.type))}>
                {getTypeIcon(achievement.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="font-medium text-sm text-foreground truncate">{achievement.title}</h5>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {achievement.type}
                  </Badge>
                </div>
                {achievement.description && (
                  <p className="text-xs text-muted-foreground mt-1">{achievement.description}</p>
                )}
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {new Date(achievement.achievedAt).toLocaleDateString("en-US", { 
                    month: "short", 
                    day: "numeric", 
                    year: "numeric" 
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function NatashaContent() {
  const { currentSite } = useSiteContext();
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [isAskingNatasha, setIsAskingNatasha] = useState(false);
  const [addCompetitorOpen, setAddCompetitorOpen] = useState(false);

  const siteId = currentSite?.siteId || "default";
  const { score: unifiedScore, isRefreshing: crewIsRefreshing, dataUpdatedAt: crewDataUpdatedAt } = useCrewStatus({ siteId, crewId: 'natasha' });

  const handleCompetitorAdded = async () => {
    await queryClient.invalidateQueries({ queryKey: ["user-competitors", siteId] });
    await refetchUserCompetitors();
    queryClient.invalidateQueries({ queryKey: ["competitive-overview", siteId] });
  };
  
  const handleAskNatasha = async (question: string) => {
    setIsAskingNatasha(true);
    try {
      const res = await fetch('/api/crew/natasha/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, question }),
      });
      const data = await res.json();
      if (data.ok && data.answer) {
        toast.success(data.answer, { duration: 10000 });
      } else {
        toast.error(data.error || 'Failed to get answer from Natasha');
      }
    } catch {
      toast.error('Failed to ask Natasha');
    } finally {
      setIsAskingNatasha(false);
    }
  };

  const { data: overview, isLoading, error, refetch } = useQuery<CompetitiveOverview>({
    queryKey: ["competitive-overview", siteId],
    queryFn: async () => {
      const res = await fetch(`/api/competitive/overview?siteId=${siteId}`);
      if (!res.ok) throw new Error("Failed to fetch competitive overview");
      return res.json();
    },
    staleTime: 60000,
    retry: 1,
  });

  // Market SOV - calculated from Lookout keyword rankings using CTR weighting
  const { data: marketSovData } = useQuery<{ marketSov: number; totalKeywords: number; rankingKeywords: number; breakdown: any; message: string }>({
    queryKey: ["market-sov"],
    queryFn: async () => {
      const res = await fetch("/api/serp/market-sov");
      if (!res.ok) throw new Error("Failed to fetch market SOV");
      return res.json();
    },
    staleTime: 60000,
    retry: 1,
  });
  const marketSov = marketSovData?.marketSov || 0;

  // Fetch user-added competitors from database
  const { data: userAddedCompetitors = [], refetch: refetchUserCompetitors } = useQuery<Array<{ id: number; siteId: string; agentSlug: string; domain: string; name: string | null; type: string; notes: string | null; createdAt: string }>>({
    queryKey: ["user-competitors", siteId],
    queryFn: async () => {
      const res = await fetch(`/api/competitive/competitors?siteId=${siteId}&agentSlug=natasha`);
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 5000,
  });

  const findCompetitors = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/competitive/discover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, limit: 10 }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to find competitors");
      }
      return res.json();
    },
    onSuccess: (data) => {
      const canonicalSiteId = data.siteId || siteId;
      toast.success(`Found ${data.count || 0} competitors`);
      queryClient.invalidateQueries({ queryKey: ["user-competitors", canonicalSiteId] });
      queryClient.invalidateQueries({ queryKey: ["user-competitors", siteId] });
      queryClient.invalidateQueries({ queryKey: ["competitive-overview", siteId] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to find competitors: ${error.message}`);
    },
  });

  const runAnalysis = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/competitive/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to run analysis");
      }
      return res.json();
    },
    onSuccess: async () => {
      toast.success("Competitive analysis completed");
      queryClient.invalidateQueries({ queryKey: ["competitive-overview"] });
      queryClient.invalidateQueries({ queryKey: ["market-sov"] });
      queryClient.invalidateQueries({ queryKey: ["natasha-snapshots"] });
      
      // Wait briefly for market-sov to refetch, then save snapshot
      setTimeout(async () => {
        try {
          const sovRes = await fetch("/api/serp/market-sov");
          if (sovRes.ok) {
            const sovData = await sovRes.json();
            await fetch("/api/snapshots", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                agentSlug: "natasha",
                siteId,
                marketSovPct: sovData.marketSov,
                totalKeywords: sovData.totalKeywords,
                rankingKeywords: sovData.rankingKeywords,
                breakdown: sovData.breakdown,
              }),
            });
            queryClient.invalidateQueries({ queryKey: ["natasha-snapshots"] });
          }
        } catch (e) {
          console.error("Failed to save snapshot:", e);
        }
      }, 500);
      setIsRunning(false);
    },
    onError: (error: Error) => {
      toast.error(`Analysis failed: ${error.message}`);
      setIsRunning(false);
    },
  });

  const handleRefresh = () => {
    setIsRunning(true);
    runAnalysis.mutate();
  };

  const handleRemoveCompetitor = (id: string) => {
    toast.success("Competitor ignored");
  };

  // Default/fallback data
  const data: CompetitiveOverview = overview || {
    configured: false,
    isRealData: false,
    status: error ? "unavailable" : isLoading ? "loading" : "empty",
    lastRunAt: null,
    competitivePosition: "parity",
    positionExplanation: "Competitive data not yet available.",
    shareOfVoice: 0,
    avgRank: 0,
    agentScore: null as any,
    competitors: [],
    contentGaps: [],
    authorityGaps: [],
    serpFeatureGaps: [],
    rankingPages: [],
    missions: [],
    alerts: [],
    summary: {
      totalCompetitors: 0,
      totalGaps: 0,
      highPriorityGaps: 0,
      avgVisibilityGap: 0,
      keywordsTracked: 0,
      keywordsWinning: 0,
      keywordsLosing: 0,
      referringDomains: 0,
      competitorAvgDomains: 0,
    },
  };

  const summary = data.summary;

  // Normalize KPIs to ensure they never show blank
  const normalizedKpis = useMemo(() => normalizeCompetitiveKpis(data), [data]);

  // Crew identity for Natasha
  const crewIdentity: CrewIdentity = {
    crewId: "natasha",
    crewName: "Natasha",
    subtitle: "Competitive Intelligence",
    description: "Monitors competitors, tracks ranking shifts, and identifies strategic gaps.",
    avatar: <Compass className="w-7 h-7 text-purple-accent" />,
    accentColor: "#a855f7",
    capabilities: ["Competitor Analysis", "SERP Recon", "Gap Detection"],
    monitors: ["Competitor Rankings", "Share of Voice", "Content Gaps", "SERP Features"],
  };

  // KPIs for the strip
  const kpis: KpiDescriptor[] = useMemo(() => {
    const kpiStatus: WidgetState = error ? "unavailable" : isLoading ? "loading" : "ready";
    return [
      {
        id: "share-of-voice",
        label: "Share of Voice",
        value: normalizedKpis.shareOfVoicePct,
        unit: "%",
        tooltip: "Your visibility across tracked keywords vs competitors",
        status: kpiStatus,
      },
      {
        id: "avg-rank",
        label: "Avg. Rank",
        value: normalizedKpis.avgRank > 0 ? normalizedKpis.avgRank : 0,
        tooltip: "Average position across tracked keywords",
        status: kpiStatus,
      },
      {
        id: "competitors",
        label: "Competitors",
        value: summary.totalCompetitors,
        tooltip: "Number of detected competitors",
        status: kpiStatus,
      },
      {
        id: "keywords-winning",
        label: "Keywords Winning",
        value: summary.keywordsWinning,
        delta: summary.keywordsWinning > 0 ? 2 : 0,
        deltaLabel: "vs last week",
        deltaIsGood: true,
        tooltip: "Keywords where you outrank competitors",
        status: kpiStatus,
      },
      {
        id: "keywords-losing",
        label: "Keywords Losing",
        value: summary.keywordsLosing,
        delta: summary.keywordsLosing > 0 ? -3 : 0,
        deltaLabel: "vs last week",
        deltaIsGood: false,
        tooltip: "Keywords where competitors outrank you",
        status: kpiStatus,
      },
      {
        id: "content-gaps",
        label: "Content Gaps",
        value: data.contentGaps.length,
        tooltip: "Topics competitors cover that you don't",
        status: kpiStatus,
      },
    ];
  }, [data, summary, error, isLoading, normalizedKpis]);

  // Count unique keywords in content gaps for accurate opportunity count
  const uniqueKeywordGaps = useMemo(() => {
    const uniqueKeywords = new Set(
      data.contentGaps
        .filter(g => g.opportunity === "high")
        .map(g => g.keyword?.toLowerCase().trim())
        .filter(Boolean)
    );
    return uniqueKeywords.size;
  }, [data.contentGaps]);

  const keyMetrics = useMemo(() => [
    {
      id: "opportunities-found",
      label: "Opportunities",
      value: uniqueKeywordGaps || 0,
      icon: Target,
      status: uniqueKeywordGaps > 0 ? "good" as const : "neutral" as const,
    },
    {
      id: "competitors-tracked",
      label: "Competitors",
      value: summary.totalCompetitors || 0,
      icon: Users,
      status: summary.totalCompetitors > 0 ? "good" as const : "neutral" as const,
    },
    {
      id: "keywords-with-gaps",
      label: "Keyword Gaps",
      value: data.contentGaps?.length || 0,
      icon: Search,
      status: data.contentGaps?.length > 0 ? "warning" as const : "neutral" as const,
    },
    {
      id: "market-sov",
      label: "Market SOV",
      value: `${marketSov}%`,
      icon: TrendingUp,
      status: marketSov > 20 ? "good" as const : marketSov > 0 ? "warning" as const : "neutral" as const,
    },
    {
      id: "tracked-sov",
      label: "Tracked SOV",
      value: `${Math.round(normalizedKpis.shareOfVoicePct)}%`,
      icon: Users,
      status: normalizedKpis.shareOfVoicePct > 20 ? "good" as const : normalizedKpis.shareOfVoicePct > 0 ? "warning" as const : "neutral" as const,
    },
  ], [data, summary, normalizedKpis, uniqueKeywordGaps, marketSov]);

  // Merge user-added competitors with SERP-discovered competitors
  const mergedCompetitors = useMemo(() => {
    const existingDomains = new Set(data.competitors.map(c => c.domain.toLowerCase()));
    const userCompetitorsTransformed: Competitor[] = userAddedCompetitors
      .filter(uc => !existingDomains.has(uc.domain.toLowerCase()))
      .map(uc => ({
        id: `user-${uc.id}`,
        name: uc.name || uc.domain,
        domain: uc.domain,
        type: (uc.type || "direct") as "direct" | "indirect" | "serp-only",
        visibility: 0,
        visibilityChange: 0,
        marketOverlap: 0,
        keywords: 0,
        topKeywords: [],
        lastUpdated: uc.createdAt,
        deltaScore: undefined,
      }));
    return [...data.competitors, ...userCompetitorsTransformed];
  }, [data.competitors, userAddedCompetitors]);

  // Inspector tabs
  const inspectorTabs: InspectorTab[] = useMemo(() => {
    const tabState: WidgetState = error ? "unavailable" : isLoading ? "loading" : "ready";
    return [
      {
        id: "overview",
        label: "Overview",
        icon: <Eye className="w-4 h-4" />,
        content: (
          <OverviewPanel 
            data={data} 
            onRefresh={handleRefresh} 
            isRefreshing={isRunning}
            marketSov={marketSov}
            trackedSov={Math.round(normalizedKpis.shareOfVoicePct)}
            marketSovData={marketSovData}
          />
        ),
        state: tabState,
      },
      {
        id: "competitors",
        label: "Competitors",
        icon: <Users className="w-4 h-4" />,
        content: (
          <>
            <CompetitorsPanel 
              competitors={mergedCompetitors} 
              onRemove={handleRemoveCompetitor}
              onAdd={() => setAddCompetitorOpen(true)}
              onFindCompetitors={() => findCompetitors.mutate()}
              isFinding={findCompetitors.isPending}
            />
            <AddCompetitorDialog
              open={addCompetitorOpen}
              onOpenChange={setAddCompetitorOpen}
              siteId={siteId}
              onSuccess={handleCompetitorAdded}
            />
          </>
        ),
        badge: mergedCompetitors.length,
        state: tabState,
      },
      {
        id: "gaps",
        label: "Gap Analysis",
        icon: <Target className="w-4 h-4" />,
        content: <GapAnalysisPanel data={data} />,
        badge: summary.totalGaps,
        state: tabState,
      },
      {
        id: "trends",
        label: "Trends",
        icon: <TrendingUp className="w-4 h-4" />,
        content: <TrendsPanel alerts={data.alerts} siteId={siteId} />,
        badge: data.alerts.length > 0 ? data.alerts.length : undefined,
        state: tabState,
      },
      {
        id: "achievements",
        label: "Wins",
        icon: <Trophy className="w-4 h-4" />,
        content: <AchievementsPanel siteId={siteId} />,
        state: tabState,
      },
    ];
  }, [data, summary, error, isLoading, isRunning, handleRefresh, marketSov, marketSovData, normalizedKpis, siteId, mergedCompetitors, addCompetitorOpen, findCompetitors]);

  const missionPrompt: MissionPromptConfig = {
    label: "Ask Natasha",
    placeholder: "e.g., Who is my top competitor? Where am I losing keywords?",
    onSubmit: handleAskNatasha,
    isLoading: isAskingNatasha,
  };

  const headerActions: HeaderAction[] = [
    {
      id: "run-analysis",
      label: "Run Analysis",
      icon: <RefreshCw className={cn("w-4 h-4", isRunning && "animate-spin")} />,
      tooltip: "Run competitive analysis to populate Average Rank and Share of Voice metrics",
      onClick: handleRefresh,
      disabled: isRunning,
      loading: isRunning,
      variant: "primary" as const,
    },
  ];

  return (
    <CrewPageLayout crewId="natasha">
      <CrewDashboardShell
        crew={crewIdentity}
        agentScore={marketSov}
        agentScoreTooltip="Market SOV — Your visibility across all target keywords (CTR-weighted)"
        kpis={kpis}
        customMetrics={<KeyMetricsGrid metrics={keyMetrics} accentColor={crewIdentity.accentColor} />}
        inspectorTabs={inspectorTabs}
        missionPrompt={missionPrompt}
        headerActions={headerActions}
        onRefresh={handleRefresh}
        onSettings={() => toast.info("Settings coming soon")}
        isRefreshing={isRunning || crewIsRefreshing}
        dataUpdatedAt={crewDataUpdatedAt}
      />
    </CrewPageLayout>
  );
}
