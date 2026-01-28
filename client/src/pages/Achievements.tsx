import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { useSiteContext } from "@/hooks/useSiteContext";
import {
  Trophy,
  TrendingUp,
  Target,
  FileText,
  RefreshCw,
  Shield,
  Zap,
  Users,
  ArrowDownRight,
  Timer,
  CheckCircle,
  Flame,
  FilePlus,
  Award,
  Tags,
  MousePointerClick,
  Bug,
  Search,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AchievementTrack {
  id: number;
  siteId: string;
  crewId: string; // holds category slug
  key: string;
  name: string;
  description: string;
  icon: string;
  currentLevel: number;
  currentTier: string;
  currentValue: number;
  nextThreshold: number;
  baseThreshold: number;
  growthFactor: number;
  lastUpdated: string;
  createdAt: string;
}

interface AchievementMilestone {
  id: number;
  siteId: string;
  trackId: number;
  categoryId: string;
  trackKey: string;
  level: number;
  tier: string;
  previousTier: string | null;
  headline: string;
  notifiedAt: string | null;
  achievedAt: string;
}

const CATEGORIES: Record<string, { label: string; icon: string; color: string; description: string }> = {
  website_traffic: {
    label: "Website Traffic",
    icon: "TrendingUp",
    color: "#10b981",
    description: "Sessions, users, and engagement trends",
  },
  leads: {
    label: "Leads",
    icon: "Target",
    color: "#8b5cf6",
    description: "Conversions, form submissions, and goal completions",
  },
  content_creation: {
    label: "Content Creation",
    icon: "FileText",
    color: "#f59e0b",
    description: "Blog posts published and new pages created",
  },
  content_updates: {
    label: "Content Updates",
    icon: "RefreshCw",
    color: "#3b82f6",
    description: "Pages refreshed, content decay reversed, metadata improved",
  },
  technical_improvements: {
    label: "Technical Improvements",
    icon: "Shield",
    color: "#ef4444",
    description: "Core Web Vitals, crawl errors, and security improvements",
  },
};

const CATEGORY_ORDER = [
  "website_traffic",
  "leads",
  "content_creation",
  "content_updates",
  "technical_improvements",
];

const TIER_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  bronze: {
    bg: "bg-gradient-to-br from-amber-700 to-amber-900",
    text: "text-amber-200",
    border: "border-amber-600",
    glow: "shadow-amber-500/20",
  },
  silver: {
    bg: "bg-gradient-to-br from-slate-400 to-slate-600",
    text: "text-slate-100",
    border: "border-slate-400",
    glow: "shadow-slate-400/30",
  },
  gold: {
    bg: "bg-gradient-to-br from-yellow-400 to-yellow-600",
    text: "text-yellow-900",
    border: "border-yellow-400",
    glow: "shadow-yellow-400/40",
  },
  platinum: {
    bg: "bg-gradient-to-br from-cyan-300 to-cyan-500",
    text: "text-cyan-900",
    border: "border-cyan-300",
    glow: "shadow-cyan-400/50",
  },
  mythic: {
    bg: "bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600",
    text: "text-white",
    border: "border-purple-400",
    glow: "shadow-purple-500/60",
  },
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  TrendingUp,
  Target,
  FileText,
  RefreshCw,
  Shield,
  Zap,
  Users,
  ArrowDownRight,
  Timer,
  CheckCircle,
  Flame,
  FilePlus,
  Award,
  Tags,
  MousePointerClick,
  Bug,
  Search,
  Trophy,
};

function getCategoryIcon(iconName: string) {
  return ICON_MAP[iconName] || Trophy;
}

function ProgressRing({
  percent,
  size = 64,
  strokeWidth = 6,
  tier,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  tier: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-muted/30"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={cn(
            "transition-all duration-500",
            tier === "gold"
              ? "text-gold"
              : tier === "silver"
                ? "text-muted-foreground/60"
                : tier === "platinum"
                  ? "text-info"
                  : tier === "mythic"
                    ? "text-brand"
                    : "text-gold"
          )}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
    </div>
  );
}

function AchievementBadge({ track }: { track: AchievementTrack }) {
  const Icon = getCategoryIcon(track.icon);
  const tierColor = TIER_COLORS[track.currentTier] || TIER_COLORS.bronze;
  const progress =
    track.nextThreshold > 0
      ? Math.min(100, (track.currentValue / track.nextThreshold) * 100)
      : 100;
  const remaining = Math.max(0, track.nextThreshold - track.currentValue);

  return (
    <div
      className={cn(
        "relative p-4 rounded-xl border transition-all hover:scale-[1.02] cursor-default",
        "bg-card/50 backdrop-blur-sm",
        tierColor.border,
        `shadow-lg ${tierColor.glow}`
      )}
    >
      <div className="flex items-start gap-4">
        <div className="relative flex-shrink-0">
          <ProgressRing percent={progress} size={64} tier={track.currentTier} />
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center",
              "rounded-full",
              tierColor.bg,
              "m-1.5"
            )}
          >
            <Icon className={cn("w-6 h-6", tierColor.text)} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-sm truncate">{track.name}</h4>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] px-1.5 py-0 capitalize",
                tierColor.border,
                tierColor.text,
                tierColor.bg
              )}
            >
              {track.currentTier}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
            {track.description}
          </p>
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium">Level {track.currentLevel}</span>
            <span className="text-muted-foreground">
              {remaining > 0 ? `${remaining} to next` : "Max level"}
            </span>
          </div>
          <Progress value={progress} className="h-1.5 mt-1.5" />
        </div>
      </div>
    </div>
  );
}

function CategorySection({
  categoryId,
  tracks,
}: {
  categoryId: string;
  tracks: AchievementTrack[];
}) {
  const category = CATEGORIES[categoryId];
  if (!category) return null;

  const CategoryIcon = getCategoryIcon(category.icon);
  const totalLevels = tracks.reduce((sum, t) => sum + t.currentLevel, 0);
  const highestTier = tracks.reduce((highest, t) => {
    const tierOrder = ["bronze", "silver", "gold", "platinum", "mythic"];
    const currentIdx = tierOrder.indexOf(t.currentTier);
    const highestIdx = tierOrder.indexOf(highest);
    return currentIdx > highestIdx ? t.currentTier : highest;
  }, "bronze");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: category.color + "20" }}
        >
          <CategoryIcon className="w-5 h-5" style={{ color: category.color }} />
        </div>
        <div>
          <h3 className="font-semibold">{category.label}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{tracks.length} tracks</span>
            <span>·</span>
            <span>{totalLevels} total levels</span>
            <span>·</span>
            <Badge variant="outline" className="text-xs capitalize">
              {highestTier}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {tracks.map((track) => (
          <AchievementBadge key={track.id} track={track} />
        ))}
      </div>
    </div>
  );
}

function CategorySummaryCard({
  categoryId,
  tracks,
}: {
  categoryId: string;
  tracks: AchievementTrack[];
}) {
  const category = CATEGORIES[categoryId];
  if (!category) return null;

  const CategoryIcon = getCategoryIcon(category.icon);
  const totalLevels = tracks.reduce((sum, t) => sum + t.currentLevel, 0);
  const highestTier = tracks.reduce((highest, t) => {
    const tierOrder = ["bronze", "silver", "gold", "platinum", "mythic"];
    const currentIdx = tierOrder.indexOf(t.currentTier);
    const highestIdx = tierOrder.indexOf(highest);
    return currentIdx > highestIdx ? t.currentTier : highest;
  }, "bronze");
  const tierColor = TIER_COLORS[highestTier] || TIER_COLORS.bronze;

  return (
    <Card className={cn("border", tierColor.border)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: category.color + "20" }}
          >
            <CategoryIcon className="w-4 h-4" style={{ color: category.color }} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{category.label}</div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold">{totalLevels}</span>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-1.5 py-0 capitalize",
              tierColor.border,
              tierColor.text,
              tierColor.bg
            )}
          >
            {highestTier}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground mt-1">total levels</div>
      </CardContent>
    </Card>
  );
}

function MilestoneTimeline({ milestones }: { milestones: AchievementMilestone[] }) {
  if (milestones.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="w-5 h-5 text-muted-foreground" />
          Recent Milestones
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {milestones.map((milestone) => {
            const category = CATEGORIES[milestone.categoryId];
            const tierColor = TIER_COLORS[milestone.tier] || TIER_COLORS.bronze;
            const timeAgo = getTimeAgo(new Date(milestone.achievedAt));

            return (
              <div
                key={milestone.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: category?.color || "#6b7280" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{milestone.headline}</p>
                  <p className="text-xs text-muted-foreground">
                    {category?.label || milestone.categoryId}
                    {milestone.previousTier && (
                      <span>
                        {" "}
                        · <span className="capitalize">{milestone.previousTier}</span> →{" "}
                        <span className={cn("capitalize font-medium")} style={{ color: TIER_COLORS[milestone.tier]?.border?.replace("border-", "") }}>
                          {milestone.tier}
                        </span>
                      </span>
                    )}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">{timeAgo}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "1d ago";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return `${Math.floor(diffDays / 30)}mo ago`;
}

export default function Achievements() {
  const { selectedSite } = useSiteContext();
  const siteId = selectedSite?.siteId || "default";
  const [activeTab, setActiveTab] = useState("all");

  const {
    data: achievementsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["achievements", siteId],
    queryFn: async () => {
      const res = await fetch(`/api/achievements?siteId=${siteId}`);
      if (!res.ok) throw new Error("Failed to fetch achievements");
      const json = await res.json();
      return json.data as AchievementTrack[];
    },
  });

  const { data: milestonesData } = useQuery({
    queryKey: ["achievements-milestones", siteId],
    queryFn: async () => {
      const res = await fetch(`/api/achievements/milestones?siteId=${siteId}&limit=10`);
      if (!res.ok) throw new Error("Failed to fetch milestones");
      const json = await res.json();
      return json.data as AchievementMilestone[];
    },
  });

  const tracksByCategoryId = useMemo(() => {
    if (!achievementsData) return {};
    return achievementsData.reduce(
      (acc, track) => {
        if (!acc[track.crewId]) acc[track.crewId] = [];
        acc[track.crewId].push(track);
        return acc;
      },
      {} as Record<string, AchievementTrack[]>
    );
  }, [achievementsData]);

  const totalAchievements = achievementsData?.length || 0;

  return (
    <DashboardLayout className="dashboard-light">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Achievements</h1>
            <p className="text-muted-foreground">What's working for your website</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>

        {/* Category summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {CATEGORY_ORDER.map((categoryId) => {
            const tracks = tracksByCategoryId[categoryId] || [];
            return (
              <CategorySummaryCard
                key={categoryId}
                categoryId={categoryId}
                tracks={tracks}
              />
            );
          })}
        </div>

        {/* Main achievement tracks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-gold" />
              Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : totalAchievements === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Trophy className="w-16 h-16 text-muted-foreground/30 mb-4" />
                <h3 className="font-semibold text-lg mb-2">No Achievements Yet</h3>
                <p className="text-muted-foreground mb-4 max-w-md">
                  Achievements are computed automatically from your site's real data.
                  Connect your integrations and Arclo will start tracking progress.
                </p>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  {CATEGORY_ORDER.map((categoryId) => {
                    const category = CATEGORIES[categoryId];
                    if (!tracksByCategoryId[categoryId]?.length) return null;
                    return (
                      <TabsTrigger key={categoryId} value={categoryId}>
                        {category.label}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                <TabsContent value="all" className="space-y-8">
                  {CATEGORY_ORDER.map((categoryId) => {
                    const tracks = tracksByCategoryId[categoryId];
                    if (!tracks?.length) return null;
                    return (
                      <CategorySection
                        key={categoryId}
                        categoryId={categoryId}
                        tracks={tracks}
                      />
                    );
                  })}
                </TabsContent>

                {CATEGORY_ORDER.map((categoryId) => {
                  const tracks = tracksByCategoryId[categoryId];
                  if (!tracks?.length) return null;
                  return (
                    <TabsContent key={categoryId} value={categoryId}>
                      <CategorySection categoryId={categoryId} tracks={tracks} />
                    </TabsContent>
                  );
                })}
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Recent milestones */}
        <MilestoneTimeline milestones={milestonesData || []} />

        {/* How it works */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Real Outcomes
                </h4>
                <p className="text-sm text-muted-foreground">
                  Achievements are earned from real data — traffic growth, content
                  published, issues fixed — not vanity metrics.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4 text-gold" />
                  Levels and Tiers
                </h4>
                <p className="text-sm text-muted-foreground">
                  Each track levels up as you make progress. Hit milestones to unlock
                  tiers: Bronze, Silver, Gold, Platinum, Mythic.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-semantic-success" />
                  Fully Automatic
                </h4>
                <p className="text-sm text-muted-foreground">
                  Arclo computes achievements daily from your connected integrations.
                  No action needed — just watch the progress.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
