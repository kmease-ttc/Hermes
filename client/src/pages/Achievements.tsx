import { useState, useMemo } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSiteContext } from "@/hooks/useSiteContext";
import { USER_FACING_AGENTS, getCrewMember } from "@/config/agents";
import { 
  Trophy, 
  Zap, 
  TrendingUp, 
  Shield, 
  Target, 
  Bot, 
  FileSearch, 
  Tags, 
  Search, 
  FileText, 
  Link, 
  Award, 
  Trash2, 
  Send, 
  AtSign, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Eye, 
  FileBarChart, 
  Star, 
  Swords, 
  Lightbulb, 
  Brain, 
  MessageSquare, 
  Map,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AchievementTrack {
  id: number;
  siteId: string;
  crewId: string;
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

const TIER_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  bronze: { 
    bg: "bg-gradient-to-br from-amber-700 to-amber-900", 
    text: "text-amber-200", 
    border: "border-amber-600",
    glow: "shadow-amber-500/20"
  },
  silver: { 
    bg: "bg-gradient-to-br from-slate-400 to-slate-600", 
    text: "text-slate-100", 
    border: "border-slate-400",
    glow: "shadow-slate-400/30"
  },
  gold: { 
    bg: "bg-gradient-to-br from-yellow-400 to-yellow-600", 
    text: "text-yellow-900", 
    border: "border-yellow-400",
    glow: "shadow-yellow-400/40"
  },
  platinum: { 
    bg: "bg-gradient-to-br from-cyan-300 to-cyan-500", 
    text: "text-cyan-900", 
    border: "border-cyan-300",
    glow: "shadow-cyan-400/50"
  },
  mythic: { 
    bg: "bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600", 
    text: "text-white", 
    border: "border-purple-400",
    glow: "shadow-purple-500/60"
  },
};

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Zap, TrendingUp, Shield, Target, Bot, FileSearch, Tags, Search, FileText, 
  Link, Award, Trash2, Send, AtSign, Activity, AlertTriangle, CheckCircle, 
  Eye, FileBarChart, Star, Swords, Lightbulb, Brain, MessageSquare, Map, Trophy,
};

function getIcon(iconName: string) {
  return ICON_MAP[iconName] || Trophy;
}

function ProgressRing({ percent, size = 64, strokeWidth = 6, tier }: { percent: number; size?: number; strokeWidth?: number; tier: string }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;
  const tierColor = TIER_COLORS[tier] || TIER_COLORS.bronze;
  
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
            tier === "gold" ? "text-yellow-500" :
            tier === "silver" ? "text-slate-400" :
            tier === "platinum" ? "text-cyan-400" :
            tier === "mythic" ? "text-purple-500" :
            "text-amber-600"
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
  const Icon = getIcon(track.icon);
  const tierColor = TIER_COLORS[track.currentTier] || TIER_COLORS.bronze;
  const progress = track.nextThreshold > 0 
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
      data-testid={`achievement-${track.crewId}-${track.key}`}
    >
      <div className="flex items-start gap-4">
        <div className="relative flex-shrink-0">
          <ProgressRing percent={progress} size={64} tier={track.currentTier} />
          <div className={cn(
            "absolute inset-0 flex items-center justify-center",
            "rounded-full",
            tierColor.bg,
            "m-1.5"
          )}>
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
          <Progress 
            value={progress} 
            className="h-1.5 mt-1.5" 
          />
        </div>
      </div>
    </div>
  );
}

function CrewAchievementsSection({ crewId, tracks }: { crewId: string; tracks: AchievementTrack[] }) {
  const crew = getCrewMember(crewId);
  if (!crew) return null;
  
  const totalLevels = tracks.reduce((sum, t) => sum + t.currentLevel, 0);
  const avgLevel = tracks.length > 0 ? Math.round(totalLevels / tracks.length) : 0;
  const highestTier = tracks.reduce((highest, t) => {
    const tierOrder = ["bronze", "silver", "gold", "platinum", "mythic"];
    const currentIdx = tierOrder.indexOf(t.currentTier);
    const highestIdx = tierOrder.indexOf(highest);
    return currentIdx > highestIdx ? t.currentTier : highest;
  }, "bronze");
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        {crew.avatar ? (
          <img src={crew.avatar} alt={crew.nickname} className="w-10 h-10 object-contain" />
        ) : (
          <div 
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white"
            style={{ backgroundColor: crew.color }}
          >
            {crew.nickname.slice(0, 1)}
          </div>
        )}
        <div>
          <h3 className="font-semibold">{crew.nickname}</h3>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{tracks.length} tracks</span>
            <span>•</span>
            <span>Avg. Level {avgLevel}</span>
            <span>•</span>
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

export default function Achievements() {
  const { selectedSite } = useSiteContext();
  const siteId = selectedSite?.siteId || "default";
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  
  const { data: achievementsData, isLoading, refetch } = useQuery({
    queryKey: ["achievements", siteId],
    queryFn: async () => {
      const res = await fetch(`/api/achievements?siteId=${siteId}`);
      if (!res.ok) throw new Error("Failed to fetch achievements");
      const json = await res.json();
      return json.data as AchievementTrack[];
    },
  });
  
  const initializeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/achievements/initialize-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
      });
      if (!res.ok) throw new Error("Failed to initialize achievements");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["achievements", siteId] });
      toast.success("Achievements initialized successfully");
    },
    onError: () => {
      toast.error("Failed to initialize achievements");
    },
  });
  
  const tracksByCrewId = useMemo(() => {
    if (!achievementsData) return {};
    return achievementsData.reduce((acc, track) => {
      if (!acc[track.crewId]) acc[track.crewId] = [];
      acc[track.crewId].push(track);
      return acc;
    }, {} as Record<string, AchievementTrack[]>);
  }, [achievementsData]);
  
  const totalAchievements = achievementsData?.length || 0;
  const totalLevels = achievementsData?.reduce((sum, t) => sum + t.currentLevel, 0) || 0;
  const tierCounts = useMemo(() => {
    if (!achievementsData) return { bronze: 0, silver: 0, gold: 0, platinum: 0, mythic: 0 };
    return achievementsData.reduce((acc, t) => {
      acc[t.currentTier as keyof typeof acc] = (acc[t.currentTier as keyof typeof acc] || 0) + 1;
      return acc;
    }, { bronze: 0, silver: 0, gold: 0, platinum: 0, mythic: 0 });
  }, [achievementsData]);
  
  const crewIds = USER_FACING_AGENTS;
  
  return (
    <DashboardLayout className="dashboard-light">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-achievements-title">Crew Achievements</h1>
            <p className="text-muted-foreground">
              Track your crew's progress and unlock new tiers
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              data-testid="button-refresh-achievements"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isLoading && "animate-spin")} />
              Refresh
            </Button>
            {totalAchievements === 0 && (
              <Button
                onClick={() => initializeMutation.mutate()}
                disabled={initializeMutation.isPending}
                data-testid="button-initialize-achievements"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {initializeMutation.isPending ? "Initializing..." : "Initialize Achievements"}
              </Button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(tierCounts).map(([tier, count]) => {
            const tierColor = TIER_COLORS[tier];
            return (
              <Card key={tier} className={cn("border", tierColor.border)}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    tierColor.bg
                  )}>
                    <Trophy className={cn("w-5 h-5", tierColor.text)} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-xs text-muted-foreground capitalize">{tier}</div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-gold" />
              Achievement Tracks
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
                  Initialize achievements to start tracking your crew's progress across different activities.
                </p>
                <Button
                  onClick={() => initializeMutation.mutate()}
                  disabled={initializeMutation.isPending}
                  data-testid="button-initialize-achievements-empty"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {initializeMutation.isPending ? "Initializing..." : "Initialize Achievements"}
                </Button>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="all" data-testid="tab-all-achievements">All Crews</TabsTrigger>
                  {crewIds.map((crewId) => {
                    const crew = getCrewMember(crewId);
                    if (!crew || !tracksByCrewId[crewId]) return null;
                    return (
                      <TabsTrigger 
                        key={crewId} 
                        value={crewId}
                        data-testid={`tab-${crewId}-achievements`}
                      >
                        {crew.nickname}
                      </TabsTrigger>
                    );
                  })}
                </TabsList>
                
                <TabsContent value="all" className="space-y-8">
                  {crewIds.map((crewId) => {
                    const tracks = tracksByCrewId[crewId];
                    if (!tracks?.length) return null;
                    return (
                      <CrewAchievementsSection 
                        key={crewId} 
                        crewId={crewId} 
                        tracks={tracks} 
                      />
                    );
                  })}
                </TabsContent>
                
                {crewIds.map((crewId) => {
                  const tracks = tracksByCrewId[crewId];
                  if (!tracks?.length) return null;
                  return (
                    <TabsContent key={crewId} value={crewId}>
                      <CrewAchievementsSection crewId={crewId} tracks={tracks} />
                    </TabsContent>
                  );
                })}
              </Tabs>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">How Achievements Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  Exponential Progression
                </h4>
                <p className="text-sm text-muted-foreground">
                  Early levels unlock quickly, but higher levels require more effort. Each level builds on the last.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-500" />
                  Tier Milestones
                </h4>
                <p className="text-sm text-muted-foreground">
                  Reach level milestones to unlock new tiers: Bronze → Silver → Gold → Platinum → Mythic.
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-500" />
                  Automatic Updates
                </h4>
                <p className="text-sm text-muted-foreground">
                  Achievements progress automatically as your crew completes tasks, scans, and missions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
