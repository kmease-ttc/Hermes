import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
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
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  avgRank: number;
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
// Skeleton Components
// ═══════════════════════════════════════════════════════════════════════════

function SectionSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-card/40 border border-border">
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

function StatusStripSkeleton() {
  return (
    <Card className="bg-card/60 backdrop-blur-sm border-border">
      <CardContent className="py-4">
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-48" />
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Degraded State / Unavailable Card
// ═══════════════════════════════════════════════════════════════════════════

function UnavailableSection({ 
  title, 
  onRetry 
}: { 
  title: string; 
  onRetry?: () => void;
}) {
  return (
    <div className="p-6 rounded-xl bg-muted/30 border border-border text-center">
      <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
        <AlertCircle className="w-6 h-6 text-muted-foreground" />
      </div>
      <h4 className="font-medium text-foreground mb-1">{title} temporarily unavailable</h4>
      <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
        This can happen if the integration is still initializing, credentials are missing, or the scan hasn't completed yet.
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      )}
    </div>
  );
}

function EmptySection({ 
  title, 
  description,
  actionLabel,
  onAction 
}: { 
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="p-6 rounded-xl bg-muted/20 border border-dashed border-border text-center">
      <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
        <Search className="w-6 h-6 text-muted-foreground" />
      </div>
      <h4 className="font-medium text-foreground mb-1">{title}</h4>
      <p className="text-sm text-muted-foreground mb-4">{description}</p>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Educational Fallback Panel
// ═══════════════════════════════════════════════════════════════════════════

function WhatNatashaDoes({ onConfigure, onRunScan }: { onConfigure?: () => void; onRunScan?: () => void }) {
  return (
    <Card className="bg-gradient-to-br from-purple-accent/10 to-purple-accent/5 border-purple-accent/30" data-testid="what-natasha-does">
      <CardContent className="py-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-purple-accent/20 flex items-center justify-center shrink-0">
            <Compass className="w-7 h-7 text-purple-accent" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-foreground mb-2">What Natasha Does</h3>
            <p className="text-muted-foreground mb-4">
              Natasha monitors your competitors, tracks ranking shifts, and identifies strategic gaps you can exploit to improve your search visibility.
            </p>
            <div className="grid sm:grid-cols-2 gap-3 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-purple-accent shrink-0" />
                <span className="text-muted-foreground">Competitor ranking comparisons</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-purple-accent shrink-0" />
                <span className="text-muted-foreground">Keyword gap detection</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-purple-accent shrink-0" />
                <span className="text-muted-foreground">SERP feature opportunities</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-purple-accent shrink-0" />
                <span className="text-muted-foreground">Authority & backlink gaps</span>
              </div>
            </div>
            <div className="flex gap-2">
              {onRunScan && (
                <Button onClick={onRunScan} className="bg-purple-accent hover:bg-purple-accent/90 text-white">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Run Initial Scan
                </Button>
              )}
              {onConfigure && (
                <Button variant="outline" onClick={onConfigure}>
                  <Settings className="w-4 h-4 mr-2" />
                  Configure
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Competitive Status Strip
// ═══════════════════════════════════════════════════════════════════════════

function CompetitiveStatusStrip({ 
  position, 
  explanation, 
  onImprove,
  isLoading,
  isUnavailable
}: { 
  position: "ahead" | "parity" | "behind"; 
  explanation: string;
  onImprove: () => void;
  isLoading?: boolean;
  isUnavailable?: boolean;
}) {
  if (isLoading) {
    return <StatusStripSkeleton />;
  }

  if (isUnavailable) {
    return (
      <Card className="bg-muted/30 border-border" data-testid="competitive-status-strip">
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
              <Swords className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <span className="font-medium text-muted-foreground">Competitive position pending</span>
              <p className="text-sm text-muted-foreground">Score will update once competitive data is available.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = {
    ahead: {
      label: "Ahead of competitors",
      icon: Trophy,
      bg: "bg-semantic-success-soft/50",
      border: "border-semantic-success-border",
      text: "text-semantic-success",
      iconBg: "bg-semantic-success/20",
    },
    parity: {
      label: "At parity",
      icon: Swords,
      bg: "bg-semantic-warning-soft/50",
      border: "border-semantic-warning-border",
      text: "text-semantic-warning",
      iconBg: "bg-semantic-warning/20",
    },
    behind: {
      label: "Behind competitors",
      icon: Shield,
      bg: "bg-semantic-danger-soft/50",
      border: "border-semantic-danger-border",
      text: "text-semantic-danger",
      iconBg: "bg-semantic-danger/20",
    },
  };

  const config = statusConfig[position];
  const Icon = config.icon;

  return (
    <Card className={cn("backdrop-blur-sm border", config.bg, config.border)} data-testid="competitive-status-strip">
      <CardContent className="py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", config.iconBg)}>
              <Icon className={cn("w-6 h-6", config.text)} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={cn("font-bold text-lg", config.text)}>{config.label}</span>
              </div>
              <p className="text-sm text-muted-foreground">{explanation}</p>
            </div>
          </div>
          <Button 
            onClick={onImprove}
            className="bg-purple-accent hover:bg-purple-accent/90 text-white shrink-0"
            data-testid="button-improve-position"
          >
            Improve Competitive Position
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Share of Voice Comparison
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

// ═══════════════════════════════════════════════════════════════════════════
// Competitor Row
// ═══════════════════════════════════════════════════════════════════════════

function CompetitorRow({ 
  competitor, 
  onRemove 
}: { 
  competitor: Competitor; 
  onRemove?: (id: string) => void;
}) {
  const typeLabels = {
    direct: { label: "Direct", color: "bg-semantic-danger-soft text-semantic-danger" },
    indirect: { label: "Indirect", color: "bg-semantic-warning-soft text-semantic-warning" },
    "serp-only": { label: "SERP-only", color: "bg-muted text-muted-foreground" },
  };

  const typeConfig = typeLabels[competitor.type];

  return (
    <div className="flex items-center gap-4 p-3 rounded-xl bg-card/40 border border-border hover:border-primary/30 transition-colors" data-testid={`competitor-row-${competitor.id}`}>
      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-sm font-bold shrink-0">
        {competitor.name.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold text-foreground truncate">{competitor.name}</h4>
          <Badge variant="secondary" className={cn("text-xs shrink-0", typeConfig.color)}>
            {typeConfig.label}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{competitor.domain}</p>
      </div>
      <div className="text-center px-3 hidden sm:block">
        <p className="text-xs text-muted-foreground">Overlap</p>
        <p className="font-bold text-foreground">{competitor.marketOverlap}%</p>
      </div>
      <div className="text-center px-3 hidden sm:block">
        <p className="text-xs text-muted-foreground">Keywords</p>
        <p className="font-bold text-foreground">{competitor.keywords}</p>
      </div>
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
              onClick={() => onRemove?.(competitor.id)}
              data-testid={`button-remove-competitor-${competitor.id}`}
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

// ═══════════════════════════════════════════════════════════════════════════
// Keyword Position Table
// ═══════════════════════════════════════════════════════════════════════════

function KeywordPositionTable({ 
  rankings, 
  filter,
  sort
}: { 
  rankings: RankingPage[];
  filter: string;
  sort: string;
}) {
  const sortedRankings = [...rankings].sort((a, b) => {
    if (sort === "gap") {
      return a.gap - b.gap;
    }
    return (b.trafficImpact || 0) - (a.trafficImpact || 0);
  });

  const filteredRankings = sortedRankings.filter(r => {
    if (filter === "all") return true;
    if (filter === "winning") return r.yourPosition !== null && r.yourPosition < r.competitorPosition;
    if (filter === "losing") return r.yourPosition === null || r.yourPosition > r.competitorPosition;
    return true;
  });

  if (filteredRankings.length === 0) {
    return (
      <EmptySection 
        title="No keywords match this filter"
        description="Try adjusting your filter settings."
      />
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 px-3 text-muted-foreground font-medium">Keyword</th>
            <th className="text-center py-2 px-3 text-muted-foreground font-medium">Your Rank</th>
            <th className="text-center py-2 px-3 text-muted-foreground font-medium">Competitor</th>
            <th className="text-center py-2 px-3 text-muted-foreground font-medium">Delta</th>
            <th className="text-right py-2 px-3 text-muted-foreground font-medium hidden sm:table-cell">Traffic Impact</th>
          </tr>
        </thead>
        <tbody>
          {filteredRankings.map((ranking, idx) => {
            const isWinning = ranking.yourPosition !== null && ranking.yourPosition < ranking.competitorPosition;
            const delta = ranking.yourPosition ? ranking.yourPosition - ranking.competitorPosition : ranking.competitorPosition;
            
            return (
              <tr key={idx} className="border-b border-border/50 hover:bg-muted/30">
                <td className="py-3 px-3">
                  <div>
                    <p className="font-medium text-foreground">{ranking.keyword}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{ranking.url}</p>
                  </div>
                </td>
                <td className="text-center py-3 px-3">
                  <span className={cn("font-bold", ranking.yourPosition ? "text-foreground" : "text-muted-foreground")}>
                    {ranking.yourPosition || "—"}
                  </span>
                </td>
                <td className="text-center py-3 px-3">
                  <div>
                    <span className="font-bold text-foreground">{ranking.competitorPosition}</span>
                    <p className="text-xs text-muted-foreground">{ranking.competitor}</p>
                  </div>
                </td>
                <td className="text-center py-3 px-3">
                  <Badge variant="outline" className={cn(
                    "font-bold",
                    isWinning ? "border-semantic-success text-semantic-success" : "border-semantic-danger text-semantic-danger"
                  )}>
                    {delta > 0 ? `+${delta}` : delta}
                  </Badge>
                </td>
                <td className="text-right py-3 px-3 hidden sm:table-cell">
                  <span className="text-muted-foreground">{ranking.trafficImpact ? `${ranking.trafficImpact.toLocaleString()}/mo` : "—"}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Gap Cards
// ═══════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════
// Mission Card
// ═══════════════════════════════════════════════════════════════════════════

function MissionCard({ mission, index }: { mission: CompetitiveMission; index: number }) {
  const impactColors = {
    high: "bg-semantic-success-soft text-semantic-success",
    medium: "bg-semantic-warning-soft text-semantic-warning",
    low: "bg-muted text-muted-foreground",
  };

  const difficultyColors = {
    easy: "text-semantic-success",
    medium: "text-semantic-warning",
    hard: "text-semantic-danger",
  };

  return (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-card/40 border border-border hover:border-primary/30 transition-colors" data-testid={`mission-${mission.id}`}>
      <div className="w-8 h-8 rounded-full bg-gold/20 text-gold flex items-center justify-center text-sm font-bold shrink-0">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-foreground">{mission.title}</h4>
        <p className="text-sm text-muted-foreground mt-1">{mission.description}</p>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Badge className={cn("text-xs", impactColors[mission.expectedImpact])}>
            {mission.expectedImpact} impact
          </Badge>
          <span className={cn("text-xs", difficultyColors[mission.difficulty])}>
            {mission.difficulty} difficulty
          </span>
          <span className="text-xs text-muted-foreground">
            Executed by: {mission.executingCrew}
          </span>
        </div>
      </div>
      <Button variant="outline" size="sm" className="shrink-0" data-testid={`button-create-mission-${mission.id}`}>
        Create Mission
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Trend Alert
// ═══════════════════════════════════════════════════════════════════════════

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
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export default function NatashaContent() {
  const { currentSite } = useSiteContext();
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const [keywordFilter, setKeywordFilter] = useState("all");
  const [keywordSort, setKeywordSort] = useState("gap");
  const [gapTab, setGapTab] = useState("content");

  const siteId = currentSite?.siteId || "default";

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
    onSuccess: () => {
      toast.success("Competitive analysis completed");
      queryClient.invalidateQueries({ queryKey: ["competitive-overview"] });
      setIsRunning(false);
    },
    onError: (error: Error) => {
      toast.error(`Analysis failed: ${error.message}`);
      setIsRunning(false);
    },
  });

  const handleRunAnalysis = () => {
    setIsRunning(true);
    runAnalysis.mutate();
  };

  const handleRemoveCompetitor = (id: string) => {
    toast.success("Competitor ignored");
  };

  const handleRetry = () => {
    refetch();
  };

  const scrollToMissions = () => {
    document.getElementById("competitive-missions")?.scrollIntoView({ behavior: "smooth" });
  };

  // Determine data state
  const isUnavailable = !!error;
  const hasData = !!overview && !isLoading && !error;
  const isEmpty = hasData && overview.competitors.length === 0;
  const isUsingMockData = hasData && !(overview as any)?.isRealData;

  // Use data or provide empty defaults (never block page render)
  const data: CompetitiveOverview = overview || {
    configured: false,
    isRealData: false,
    status: isUnavailable ? "unavailable" : isLoading ? "loading" : "empty",
    lastRunAt: null,
    competitivePosition: "parity",
    positionExplanation: "Competitive data not yet available.",
    shareOfVoice: 0,
    avgRank: 0,
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

  return (
    <div className="space-y-6">
      {/* Header - Always renders */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Competitive Intelligence</h2>
          <p className="text-muted-foreground text-sm">
            Strategic insights on your competitive landscape
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleRunAnalysis}
            disabled={isRunning}
            variant="outline"
            data-testid="button-run-analysis"
          >
            {isRunning ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Run Analysis
          </Button>
        </div>
      </div>

      {/* Sample Data Warning */}
      {isUsingMockData && !isUnavailable && (
        <Card className="border-semantic-warning-border bg-semantic-warning-soft/30">
          <CardContent className="py-3">
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="w-4 h-4 text-semantic-warning" />
              <span className="text-semantic-warning font-medium">Sample Data</span>
              <span className="text-muted-foreground">— Configure the Competitive Intelligence worker to see real competitor data</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Educational Panel - Show when unavailable or empty */}
      {(isUnavailable || isEmpty) && (
        <WhatNatashaDoes 
          onRunScan={handleRunAnalysis}
          onConfigure={() => toast.info("Open Settings to configure competitive intelligence")}
        />
      )}

      {/* 1. Competitive Status Strip - Always renders with appropriate state */}
      <CompetitiveStatusStrip 
        position={data.competitivePosition}
        explanation={data.positionExplanation}
        onImprove={scrollToMissions}
        isLoading={isLoading}
        isUnavailable={isUnavailable}
      />

      {/* Last Run Info */}
      {data.lastRunAt && !isUnavailable && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Last analysis: {new Date(data.lastRunAt).toLocaleString()}
        </p>
      )}

      {/* 2. Share of Voice Comparison */}
      <Card className="bg-card/60 backdrop-blur-sm border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Share of Voice</CardTitle>
              <CardDescription>SERP visibility across tracked keywords</CardDescription>
            </div>
            {hasData && data.shareOfVoice > 0 && (
              <div className="text-right">
                <p className="text-2xl font-bold text-purple-accent">{data.shareOfVoice}%</p>
                <p className="text-xs text-muted-foreground">Avg. rank: {data.avgRank}</p>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-10" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>
          ) : isUnavailable ? (
            <UnavailableSection title="Share of voice data" onRetry={handleRetry} />
          ) : isEmpty || data.competitors.length === 0 ? (
            <EmptySection 
              title="No competitors detected yet"
              description="Run an analysis to discover competitors in your space."
              actionLabel="Run First Scan"
              onAction={handleRunAnalysis}
            />
          ) : (
            <div className="space-y-3">
              <ShareOfVoiceBar name="Your Site" value={data.shareOfVoice} isYou />
              {data.competitors.slice(0, 3).map((comp, idx) => (
                <ShareOfVoiceBar 
                  key={comp.id} 
                  name={comp.name} 
                  value={comp.visibility} 
                  color={["#ef4444", "#f97316", "#eab308"][idx]}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 3. Competitor Landscape */}
      <Card className="bg-card/60 backdrop-blur-sm border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Identified Competitors</CardTitle>
              <CardDescription>Competitors discovered via shared keywords and SERP overlap</CardDescription>
            </div>
            <Button variant="outline" size="sm" data-testid="button-add-competitor">
              <Plus className="w-4 h-4 mr-1" />
              Add Competitor
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SectionSkeleton rows={3} />
          ) : isUnavailable ? (
            <UnavailableSection title="Competitor data" onRetry={handleRetry} />
          ) : data.competitors.length === 0 ? (
            <EmptySection 
              title="No competitors detected"
              description="We haven't detected competitors for this domain yet."
              actionLabel="Add Competitor"
              onAction={() => toast.info("Add competitor functionality coming soon")}
            />
          ) : (
            <div className="space-y-3">
              {data.competitors.map((competitor) => (
                <CompetitorRow 
                  key={competitor.id} 
                  competitor={competitor} 
                  onRemove={handleRemoveCompetitor}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 4. Ranking & Visibility Comparison */}
      <Card className="bg-card/60 backdrop-blur-sm border-border">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-lg">Keyword Position Comparison</CardTitle>
              <CardDescription>Head-to-head ranking battles with competitors</CardDescription>
            </div>
            {hasData && summary.keywordsTracked > 0 && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Winning:</span>
                  <Badge className="bg-semantic-success-soft text-semantic-success">{summary.keywordsWinning}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Losing:</span>
                  <Badge className="bg-semantic-danger-soft text-semantic-danger">{summary.keywordsLosing}</Badge>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SectionSkeleton rows={4} />
          ) : isUnavailable ? (
            <UnavailableSection title="Keyword position data" onRetry={handleRetry} />
          ) : data.rankingPages.length === 0 ? (
            <EmptySection 
              title="No keyword data yet"
              description="Run an analysis to start tracking keyword positions."
              actionLabel="Run Analysis"
              onAction={handleRunAnalysis}
            />
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <Button 
                  variant={keywordFilter === "all" ? "secondary" : "ghost"} 
                  size="sm"
                  onClick={() => setKeywordFilter("all")}
                >
                  All
                </Button>
                <Button 
                  variant={keywordFilter === "losing" ? "secondary" : "ghost"} 
                  size="sm"
                  onClick={() => setKeywordFilter("losing")}
                >
                  Losing
                </Button>
                <Button 
                  variant={keywordFilter === "winning" ? "secondary" : "ghost"} 
                  size="sm"
                  onClick={() => setKeywordFilter("winning")}
                >
                  Winning
                </Button>
                <Separator orientation="vertical" className="h-6 hidden sm:block" />
                <span className="text-xs text-muted-foreground hidden sm:inline">Sort:</span>
                <Button 
                  variant={keywordSort === "gap" ? "secondary" : "ghost"} 
                  size="sm"
                  onClick={() => setKeywordSort("gap")}
                >
                  Largest Gap
                </Button>
                <Button 
                  variant={keywordSort === "traffic" ? "secondary" : "ghost"} 
                  size="sm"
                  onClick={() => setKeywordSort("traffic")}
                >
                  Traffic Impact
                </Button>
              </div>
              <KeywordPositionTable rankings={data.rankingPages} filter={keywordFilter} sort={keywordSort} />
            </>
          )}
        </CardContent>
      </Card>

      {/* 5. Competitive Gap Analysis */}
      <Card className="bg-card/60 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="text-lg">Competitive Gap Analysis</CardTitle>
          <CardDescription>Where competitors have advantages over you</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={gapTab} onValueChange={setGapTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="content" className="flex items-center gap-1">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Content Gaps</span>
                <Badge variant="secondary" className="ml-1 text-xs">{data.contentGaps.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="authority" className="flex items-center gap-1">
                <Link2 className="w-4 h-4" />
                <span className="hidden sm:inline">Authority</span>
                <Badge variant="secondary" className="ml-1 text-xs">{data.authorityGaps.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="serp" className="flex items-center gap-1">
                <Layout className="w-4 h-4" />
                <span className="hidden sm:inline">SERP Features</span>
                <Badge variant="secondary" className="ml-1 text-xs">{data.serpFeatureGaps.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="content">
              {isLoading ? (
                <SectionSkeleton rows={3} />
              ) : isUnavailable ? (
                <UnavailableSection title="Content gap data" onRetry={handleRetry} />
              ) : data.contentGaps.length === 0 ? (
                <EmptySection 
                  title="No content gaps found"
                  description="Great! You're covering the same topics as your competitors."
                />
              ) : (
                <div className="space-y-3">
                  {data.contentGaps.map((gap) => (
                    <ContentGapCard key={gap.id} gap={gap} onAction={() => toast.success("Action initiated")} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="authority">
              {isLoading ? (
                <SectionSkeleton rows={3} />
              ) : isUnavailable ? (
                <UnavailableSection title="Authority gap data" onRetry={handleRetry} />
              ) : data.authorityGaps.length === 0 ? (
                <EmptySection 
                  title="No authority gaps detected"
                  description="Your backlink profile is competitive."
                />
              ) : (
                <>
                  <div className="flex items-center gap-4 mb-4 p-3 rounded-lg bg-muted/50 flex-wrap">
                    <div>
                      <p className="text-sm font-medium">Your Referring Domains</p>
                      <p className="text-2xl font-bold text-foreground">{summary.referringDomains}</p>
                    </div>
                    <div className="text-muted-foreground">vs</div>
                    <div>
                      <p className="text-sm font-medium">Competitor Average</p>
                      <p className="text-2xl font-bold text-semantic-danger">{summary.competitorAvgDomains}</p>
                    </div>
                    {summary.competitorAvgDomains > summary.referringDomains && (
                      <div className="ml-auto">
                        <Badge className="bg-semantic-danger-soft text-semantic-danger">
                          {summary.competitorAvgDomains - summary.referringDomains} domain gap
                        </Badge>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3">
                    {data.authorityGaps.map((gap) => (
                      <AuthorityGapCard key={gap.id} gap={gap} />
                    ))}
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="serp">
              {isLoading ? (
                <SectionSkeleton rows={3} />
              ) : isUnavailable ? (
                <UnavailableSection title="SERP feature data" onRetry={handleRetry} />
              ) : data.serpFeatureGaps.length === 0 ? (
                <EmptySection 
                  title="No SERP feature gaps"
                  description="You're capturing available SERP features."
                />
              ) : (
                <div className="space-y-3">
                  {data.serpFeatureGaps.map((gap) => (
                    <SerpFeatureGapCard key={gap.id} gap={gap} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 6. Recommended Competitive Missions */}
      <Card id="competitive-missions" className="bg-card/60 backdrop-blur-sm border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5 text-gold" />
                Recommended Competitive Missions
              </CardTitle>
              <CardDescription>Prioritized actions to improve your competitive position</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SectionSkeleton rows={3} />
          ) : isUnavailable ? (
            <UnavailableSection title="Mission recommendations" onRetry={handleRetry} />
          ) : data.missions.length === 0 ? (
            <EmptySection 
              title="No missions yet"
              description="Run an analysis to generate competitive missions."
              actionLabel="Run Analysis"
              onAction={handleRunAnalysis}
            />
          ) : (
            <div className="space-y-3">
              {data.missions.map((mission, idx) => (
                <MissionCard key={mission.id} mission={mission} index={idx} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 7. Competitive Trends & Alerts */}
      <Card className="bg-card/60 backdrop-blur-sm border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Competitive Movement & Alerts
              </CardTitle>
              <CardDescription>Recent changes in the competitive landscape</CardDescription>
            </div>
            {data.alerts.length > 0 && (
              <Badge variant="outline">{data.alerts.length} alerts</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <SectionSkeleton rows={2} />
          ) : isUnavailable ? (
            <UnavailableSection title="Alert data" onRetry={handleRetry} />
          ) : data.alerts.length === 0 ? (
            <EmptySection 
              title="No recent alerts"
              description="We'll notify you when competitors make significant moves."
            />
          ) : (
            <div className="space-y-3">
              {data.alerts.map((alert) => (
                <TrendAlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
