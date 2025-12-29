import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
  Minus,
  Eye,
  Zap,
  Loader2,
  Info
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

interface Competitor {
  id: string;
  name: string;
  domain: string;
  visibility: number;
  visibilityChange: number;
  keywords: number;
  topKeywords: string[];
  lastUpdated: string;
}

interface ContentGap {
  id: string;
  keyword: string;
  searchVolume: number;
  difficulty: number;
  competitorsCovering: number;
  opportunity: "high" | "medium" | "low";
  suggestedAction: string;
}

interface RankingPage {
  url: string;
  keyword: string;
  yourPosition: number | null;
  competitorPosition: number;
  competitor: string;
  gap: number;
}

interface CompetitiveOverview {
  configured: boolean;
  lastRunAt: string | null;
  competitors: Competitor[];
  contentGaps: ContentGap[];
  rankingPages: RankingPage[];
  summary: {
    totalCompetitors: number;
    totalGaps: number;
    highPriorityGaps: number;
    avgVisibilityGap: number;
    keywordsTracked: number;
    keywordsWinning: number;
    keywordsLosing: number;
  };
}

function MetricCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  description,
  status = "neutral"
}: { 
  title: string; 
  value: string | number; 
  change?: number; 
  icon: React.ComponentType<{ className?: string }>; 
  description?: string;
  status?: "good" | "warning" | "danger" | "neutral";
}) {
  const statusColors = {
    good: "text-semantic-success",
    warning: "text-semantic-warning", 
    danger: "text-semantic-danger",
    neutral: "text-foreground",
  };

  return (
    <Card className="bg-card/60 backdrop-blur-sm border-border">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <span className={cn("text-2xl font-bold", statusColors[status])}>{value}</span>
              {change !== undefined && change !== 0 && (
                <span className={cn("text-sm flex items-center gap-0.5", change > 0 ? "text-semantic-success" : "text-semantic-danger")}>
                  {change > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                  {Math.abs(change)}%
                </span>
              )}
            </div>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CompetitorCard({ competitor }: { competitor: Competitor }) {
  const visibilityStatus = competitor.visibilityChange >= 0 ? "danger" : "good";
  
  return (
    <Card className="bg-card/60 backdrop-blur-sm border-border hover:border-primary/30 transition-colors">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-sm font-bold">
              {competitor.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h4 className="font-semibold text-foreground">{competitor.name}</h4>
              <p className="text-xs text-muted-foreground">{competitor.domain}</p>
            </div>
          </div>
          <Badge variant="outline" className={cn(
            "text-xs",
            visibilityStatus === "danger" ? "border-semantic-danger text-semantic-danger" : "border-semantic-success text-semantic-success"
          )}>
            {competitor.visibilityChange > 0 ? "+" : ""}{competitor.visibilityChange}%
          </Badge>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Visibility Score</span>
              <span className="font-medium">{competitor.visibility}</span>
            </div>
            <Progress value={competitor.visibility} className="h-1.5" />
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Keywords Ranking</span>
            <span className="font-medium">{competitor.keywords}</span>
          </div>

          <div className="pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1">Top Keywords:</p>
            <div className="flex flex-wrap gap-1">
              {competitor.topKeywords.slice(0, 3).map((kw, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {kw}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ContentGapCard({ gap }: { gap: ContentGap }) {
  const opportunityColors = {
    high: "bg-semantic-success-soft text-semantic-success border-semantic-success-border",
    medium: "bg-semantic-warning-soft text-semantic-warning border-semantic-warning-border",
    low: "bg-muted text-muted-foreground border-border",
  };

  return (
    <div className="p-4 rounded-xl bg-card/40 border border-border hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground truncate">{gap.keyword}</h4>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
            <span className="flex items-center gap-1">
              <Search className="w-3 h-3" />
              {gap.searchVolume.toLocaleString()}/mo
            </span>
            <span className="flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />
              KD: {gap.difficulty}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {gap.competitorsCovering} competitors
            </span>
          </div>
        </div>
        <Badge variant="outline" className={cn("text-xs ml-2", opportunityColors[gap.opportunity])}>
          {gap.opportunity} priority
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">{gap.suggestedAction}</p>
    </div>
  );
}

function RankingComparisonRow({ page }: { page: RankingPage }) {
  const gap = page.yourPosition ? page.competitorPosition - page.yourPosition : -page.competitorPosition;
  const isWinning = page.yourPosition !== null && page.yourPosition < page.competitorPosition;

  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{page.keyword}</p>
        <p className="text-xs text-muted-foreground truncate">{page.url}</p>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div className="text-center">
          <p className="text-xs text-muted-foreground">You</p>
          <p className={cn("font-medium", page.yourPosition ? "text-foreground" : "text-muted-foreground")}>
            {page.yourPosition || "—"}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-muted-foreground">{page.competitor}</p>
          <p className="font-medium text-foreground">{page.competitorPosition}</p>
        </div>
        <Badge variant="outline" className={cn(
          "text-xs w-16 justify-center",
          isWinning ? "border-semantic-success text-semantic-success" : "border-semantic-danger text-semantic-danger"
        )}>
          {isWinning ? "Winning" : `Gap: ${Math.abs(gap)}`}
        </Badge>
      </div>
    </div>
  );
}

export default function NatashaContent() {
  const { currentSite } = useSiteContext();
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);

  const siteId = currentSite?.siteId || "default";

  const { data: overview, isLoading, error } = useQuery<CompetitiveOverview>({
    queryKey: ["competitive-overview", siteId],
    queryFn: async () => {
      const res = await fetch(`/api/competitive/overview?siteId=${siteId}`);
      if (!res.ok) throw new Error("Failed to fetch competitive overview");
      return res.json();
    },
    staleTime: 60000,
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-semantic-danger-border bg-semantic-danger-soft/30">
        <CardContent className="py-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-semantic-danger" />
            <div>
              <h3 className="font-semibold text-foreground">Failed to load competitive data</h3>
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-4"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["competitive-overview"] })}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const data = overview || {
    configured: false,
    isRealData: false,
    lastRunAt: null,
    competitors: [
      { id: "1", name: "Competitor A", domain: "competitora.com", visibility: 78, visibilityChange: 5, keywords: 234, topKeywords: ["mental health", "therapy", "counseling"], lastUpdated: "2024-12-28" },
      { id: "2", name: "Competitor B", domain: "competitorb.com", visibility: 65, visibilityChange: -3, keywords: 189, topKeywords: ["psychiatry", "medication", "treatment"], lastUpdated: "2024-12-28" },
      { id: "3", name: "Competitor C", domain: "competitorc.com", visibility: 52, visibilityChange: 2, keywords: 145, topKeywords: ["telehealth", "virtual care", "online therapy"], lastUpdated: "2024-12-28" },
    ],
    contentGaps: [
      { id: "1", keyword: "online psychiatrist Florida", searchVolume: 2400, difficulty: 35, competitorsCovering: 3, opportunity: "high", suggestedAction: "Create dedicated landing page targeting this keyword" },
      { id: "2", keyword: "telehealth therapy near me", searchVolume: 1800, difficulty: 42, competitorsCovering: 2, opportunity: "high", suggestedAction: "Add location-specific content for telehealth services" },
      { id: "3", keyword: "anxiety treatment without medication", searchVolume: 1200, difficulty: 28, competitorsCovering: 2, opportunity: "medium", suggestedAction: "Write blog post about alternative anxiety treatments" },
      { id: "4", keyword: "virtual mental health counseling", searchVolume: 890, difficulty: 38, competitorsCovering: 3, opportunity: "medium", suggestedAction: "Optimize existing service pages for this term" },
    ],
    rankingPages: [
      { url: "/services/psychiatry", keyword: "psychiatrist Orlando", yourPosition: 8, competitorPosition: 3, competitor: "Competitor A", gap: -5 },
      { url: "/services/therapy", keyword: "therapy near me", yourPosition: 12, competitorPosition: 5, competitor: "Competitor B", gap: -7 },
      { url: "/blog/anxiety-tips", keyword: "anxiety treatment tips", yourPosition: 4, competitorPosition: 6, competitor: "Competitor A", gap: 2 },
      { url: "/services/telehealth", keyword: "telehealth psychiatry", yourPosition: null, competitorPosition: 2, competitor: "Competitor C", gap: 0 },
    ],
    summary: {
      totalCompetitors: 5,
      totalGaps: 23,
      highPriorityGaps: 8,
      avgVisibilityGap: 15,
      keywordsTracked: 48,
      keywordsWinning: 12,
      keywordsLosing: 18,
    },
  };

  const summary = data.summary;
  const isUsingMockData = !(overview as any)?.isRealData;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Competitive Intelligence</h2>
          <p className="text-muted-foreground text-sm">
            Track competitors, identify content gaps, and monitor ranking battles
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleRunAnalysis}
            disabled={isRunning}
            className="bg-purple-accent hover:bg-purple-accent/90 text-white"
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

      {isUsingMockData && (
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

      {data.lastRunAt && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Info className="w-3 h-3" />
          Last analysis: {new Date(data.lastRunAt).toLocaleString()}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Competitors Tracked"
          value={summary.totalCompetitors}
          icon={Users}
          description="Active competitor monitoring"
        />
        <MetricCard
          title="Content Gaps Found"
          value={summary.totalGaps}
          icon={Target}
          status={summary.highPriorityGaps > 5 ? "warning" : "neutral"}
          description={`${summary.highPriorityGaps} high priority`}
        />
        <MetricCard
          title="Keywords Winning"
          value={summary.keywordsWinning}
          change={8}
          icon={TrendingUp}
          status="good"
          description={`of ${summary.keywordsTracked} tracked`}
        />
        <MetricCard
          title="Keywords Losing"
          value={summary.keywordsLosing}
          change={-12}
          icon={TrendingDown}
          status="danger"
          description="Need attention"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-card/60 backdrop-blur-sm border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Competitor Overview</CardTitle>
                <CardDescription>Top competitors by visibility score</CardDescription>
              </div>
              <Badge variant="secondary">{data.competitors.length} tracked</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.competitors.map((competitor) => (
              <CompetitorCard key={competitor.id} competitor={competitor} />
            ))}
          </CardContent>
        </Card>

        <Card className="bg-card/60 backdrop-blur-sm border-border">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Content Gaps</CardTitle>
                <CardDescription>Keywords your competitors rank for that you don't</CardDescription>
              </div>
              <Badge variant="secondary" className="bg-semantic-warning-soft text-semantic-warning">
                {summary.highPriorityGaps} high priority
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.contentGaps.map((gap) => (
              <ContentGapCard key={gap.id} gap={gap} />
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/60 backdrop-blur-sm border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Ranking Battles</CardTitle>
              <CardDescription>Head-to-head keyword comparisons with competitors</CardDescription>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Info className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs max-w-xs">
                    Compare your ranking positions against competitors for shared keywords.
                    Focus on closing gaps for high-value terms.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {data.rankingPages.map((page, idx) => (
              <RankingComparisonRow key={idx} page={page} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/60 backdrop-blur-sm border-border">
        <CardHeader>
          <CardTitle className="text-lg">Recommended Actions</CardTitle>
          <CardDescription>Priority actions based on competitive analysis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.contentGaps
              .filter(g => g.opportunity === "high")
              .slice(0, 3)
              .map((gap, idx) => (
                <div 
                  key={gap.id} 
                  className="flex items-start gap-3 p-3 rounded-xl bg-muted/50 border border-border"
                >
                  <div className="w-6 h-6 rounded-full bg-gold/20 text-gold flex items-center justify-center text-sm font-bold">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{gap.suggestedAction}</p>
                    <p className="text-sm text-muted-foreground">
                      Target keyword: <span className="font-medium">{gap.keyword}</span> ({gap.searchVolume.toLocaleString()} monthly searches)
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0">
                    Start
                  </Button>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
