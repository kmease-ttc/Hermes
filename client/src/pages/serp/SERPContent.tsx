import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useCrewStatus } from "@/hooks/useCrewStatus";
import { useSiteContext } from "@/hooks/useSiteContext";
import { useState, useMemo, useEffect } from "react";
import { Search, TrendingUp, TrendingDown, Minus, RefreshCw, Sparkles, ArrowUp, ArrowDown, Target, AlertTriangle, Crown, Trophy, Zap, Plus, ChevronUp, ChevronDown, Star, Brain, DollarSign, Info, ShoppingCart, HelpCircle, Eye, Wrench } from "lucide-react";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { getCrewMember } from "@/config/agents";
import {
  CrewDashboardShell,
  type CrewIdentity,
  type KpiDescriptor,
  type InspectorTab,
  type MissionPromptConfig,
  type HeaderAction,
} from "@/components/crew-dashboard";
import { KeyMetricsGrid, TieredCrown } from "@/components/key-metrics";
import { CrewPageLayout } from "@/components/crew/CrewPageLayout";

interface RankingData {
  id: number;
  keywordId: number;
  keyword?: string;
  date: string;
  position: number | null;
  url: string | null;
  change: number | null;
  serpFeatures: any;
}

interface SerpOverview {
  configured: boolean;
  totalKeywords: number;
  lastCheck: string | null;
  stats: {
    ranking: number;
    notRanking: number;
    numberOne: number;
    inTop3: number;
    inTop10: number;
    inTop20: number;
    avgPosition: number | null;
    winners: number;
    losers: number;
  };
  topKeywords: RankingData[];
  recentChanges: RankingData[];
}

export default function SERPContent() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { selectedSiteId } = useSiteContext();
  const { score: unifiedScore, status: crewStatusValue, isLoading: statusLoading, isRefreshing: crewIsRefreshing, dataUpdatedAt: crewDataUpdatedAt } = useCrewStatus({ 
    siteId: selectedSiteId || 'site_empathy_health_clinic', 
    crewId: 'lookout' 
  });
  const [setupDomain, setSetupDomain] = useState('empathyhealthclinic.com');
  const [setupBusinessType, setSetupBusinessType] = useState('psychiatry clinic');
  const [setupLocation, setSetupLocation] = useState('Orlando, Florida');
  const [isAskingSerp, setIsAskingSerp] = useState(false);

  const handleAskSerp = async (question: string) => {
    setIsAskingSerp(true);
    try {
      const res = await fetch('/api/crew/serp/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if (data.ok && data.answer) {
        toast({ title: "SERP says", description: data.answer, duration: 10000 });
      } else {
        toast({ title: "Error", description: data.error || 'Failed to get answer from SERP', variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: 'Failed to ask SERP', variant: "destructive" });
    } finally {
      setIsAskingSerp(false);
    }
  };

  const { data: overview, isLoading } = useQuery<SerpOverview>({
    queryKey: ['serp-overview'],
    queryFn: async () => {
      const res = await fetch('/api/serp/overview');
      if (!res.ok) throw new Error('Failed to fetch SERP overview');
      return res.json();
    },
    refetchInterval: 60000,
  });

  const { data: dashboardStats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: rankingsData } = useQuery<{
    keywords: Array<{
      id: number;
      keyword: string;
      currentPosition: number | null;
      trend: string;
      avg7Day: number | null;
      avg30Day: number | null;
      targetUrl: string | null;
      currentUrl: string | null;
      volume: number | null;
      difficulty: number | null;
      priority: number | null;
      priorityReason: string | null;
      intent: string | null;
      hasPending: boolean;
    }>;
  }>({
    queryKey: ['serp-rankings-full'],
    queryFn: async () => {
      const res = await fetch('/api/serp/rankings/full');
      if (!res.ok) throw new Error('Failed to fetch rankings');
      return res.json();
    },
  });

  const { data: missionsData, isLoading: missionsLoading } = useQuery<{
    missions: Array<{
      id: number;
      actionType: string;
      title: string;
      description: string | null;
      targetKeywords: string[];
      targetUrl: string | null;
      impactScore: number;
      effortScore: number;
      reason: string | null;
      status: string;
    }>;
    totalPending: number;
  }>({
    queryKey: ['serp-missions'],
    queryFn: async () => {
      const res = await fetch('/api/serp/missions');
      if (!res.ok) throw new Error('Failed to fetch missions');
      return res.json();
    },
    enabled: (overview?.totalKeywords || 0) > 0,
  });

  const { data: fixStatus } = useQuery<{
    queued: number;
    inProgress: number;
    completed: number;
    failed: number;
    total: number;
  }>({
    queryKey: ['serp-fix-status'],
    queryFn: async () => {
      const res = await fetch('/api/serp/missions/status');
      if (!res.ok) throw new Error('Failed to fetch status');
      return res.json();
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      return (data?.queued || 0) > 0 || (data?.inProgress || 0) > 0 ? 2000 : false;
    },
  });
  
  // Sorting state
  const [sortField, setSortField] = useState<'priority' | 'volume' | 'difficulty' | 'position'>('priority');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Add keywords state
  const [newKeywords, setNewKeywords] = useState('');
  const [showBulkAdd, setShowBulkAdd] = useState(false);

  const runCheck = useMutation({
    mutationFn: async (limit: number) => {
      const res = await fetch(`/api/serp/run?limit=${limit}`, { 
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to run SERP check');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "SERP Check Completed",
        description: `Checked ${data.checked} keywords. ${data.stats.ranking} ranking, ${data.stats.inTop10} in top 10.`,
      });
      queryClient.invalidateQueries({ queryKey: ['serp-overview'] });
      queryClient.invalidateQueries({ queryKey: ['serp-rankings-full'] });
    },
    onError: (error: Error) => {
      toast({
        title: "SERP Check Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateKeywords = useMutation({
    mutationFn: async (params: { domain: string; businessType: string; location: string }) => {
      const res = await fetch('/api/keywords/generate', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate keywords');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Keywords Generated",
        description: data.message || `Created ${data.added || 0} target keywords for tracking.`,
      });
      queryClient.invalidateQueries({ queryKey: ['serp-overview'] });
      queryClient.invalidateQueries({ queryKey: ['serp-rankings-full'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCheck = (mode: 'quick' | 'full') => {
    runCheck.mutate(mode === 'quick' ? 10 : 100);
  };

  const fixEverything = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/serp/missions/fix-everything', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to start Fix Everything');
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Fix Everything Started",
        description: `Queued ${data.queued} improvement actions for execution...`,
      });
      queryClient.invalidateQueries({ queryKey: ['serp-missions'] });
      queryClient.invalidateQueries({ queryKey: ['serp-fix-status'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Fix Everything Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const executeNextAction = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/serp/missions/execute-next', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to execute action');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['serp-fix-status'] });
    },
  });

  useEffect(() => {
    const hasWork = (fixStatus?.queued || 0) > 0 || (fixStatus?.inProgress || 0) > 0;
    const isExecuting = executeNextAction.isPending;
    
    if (hasWork && !isExecuting) {
      executeNextAction.mutate();
    }
    
    if (!hasWork && fixStatus?.completed && fixStatus.completed > 0 && !isExecuting) {
      const total = fixStatus.completed + (fixStatus.failed || 0);
      if (total > 0) {
        queryClient.invalidateQueries({ queryKey: ['serp-missions'] });
      }
    }
  }, [fixStatus, executeNextAction.isPending]);

  const isFixingEverything = fixEverything.isPending || (fixStatus?.queued || 0) > 0 || (fixStatus?.inProgress || 0) > 0;

  const optimizeKeyword = useMutation({
    mutationFn: async (keywordId: number) => {
      const res = await fetch(`/api/serp/keyword/${keywordId}/optimize`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to optimize keyword');
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: data.action ? "Action Queued" : "No Action",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['serp-missions'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to optimize keyword",
        variant: "destructive",
      });
    },
  });
  
  // Add keywords mutation
  const addKeywords = useMutation({
    mutationFn: async (keywords: string[]) => {
      const res = await fetch('/api/keywords', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ keywords }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to add keywords');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Keywords Added",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['serp-overview'] });
      queryClient.invalidateQueries({ queryKey: ['serp-rankings-full'] });
      setNewKeywords('');
      setShowBulkAdd(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Add Keywords",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Score priority mutation
  const scorePriority = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/keywords/score-priority', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ 
          domain: setupDomain,
          businessType: setupBusinessType,
          location: setupLocation,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to score priorities');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Priorities Updated",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['serp-rankings-full'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Score Priorities",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleAddKeywords = () => {
    const keywords = newKeywords
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);
    
    if (keywords.length === 0) {
      toast({
        title: "No Keywords",
        description: "Please enter at least one keyword.",
        variant: "destructive",
      });
      return;
    }
    
    addKeywords.mutate(keywords);
  };
  
  // Sorted keywords
  const sortedKeywords = useMemo(() => {
    if (!rankingsData?.keywords) return [];
    
    return [...rankingsData.keywords].sort((a, b) => {
      let aVal: number | null = null;
      let bVal: number | null = null;
      
      switch (sortField) {
        case 'priority':
          aVal = a.priority;
          bVal = b.priority;
          break;
        case 'volume':
          aVal = a.volume;
          bVal = b.volume;
          break;
        case 'difficulty':
          aVal = a.difficulty;
          bVal = b.difficulty;
          break;
        case 'position':
          aVal = a.currentPosition;
          bVal = b.currentPosition;
          break;
      }
      
      // Handle nulls (put them at the end)
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      
      return sortDirection === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }, [rankingsData?.keywords, sortField, sortDirection]);
  
  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
  const SortHeader = ({ field, children }: { field: typeof sortField; children: React.ReactNode }) => (
    <th 
      className="text-center py-2 font-medium cursor-pointer hover:bg-muted/50"
      onClick={() => toggleSort(field)}
    >
      <div className="flex items-center justify-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === 'desc' ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />
        )}
      </div>
    </th>
  );
  
  const getPriorityBadge = (priority: number | null, reason?: string | null) => {
    if (!priority) return <span className="text-muted-foreground">—</span>;
    
    const label = priority >= 5 ? 'Critical' : priority >= 4 ? 'High' : priority >= 3 ? 'Medium' : priority >= 2 ? 'Low' : 'Very Low';
    const color = priority >= 5 ? 'bg-semantic-danger' : priority >= 4 ? 'bg-semantic-warning' : priority >= 3 ? 'bg-semantic-gold' : priority >= 2 ? 'bg-semantic-info' : 'bg-muted';
    
    const badge = (
      <Badge className={`${color} text-white text-xs`}>
        {label}
      </Badge>
    );
    
    if (reason) {
      return (
        <Tooltip>
          <TooltipTrigger>{badge}</TooltipTrigger>
          <TooltipContent><p className="max-w-xs">{reason}</p></TooltipContent>
        </Tooltip>
      );
    }
    
    return badge;
  };
  
  const getDifficultyLabel = (difficulty: number | null) => {
    if (difficulty === null) return <span className="text-muted-foreground">—</span>;
    const label = difficulty <= 30 ? 'Easy' : difficulty <= 60 ? 'Medium' : 'Hard';
    const color = difficulty <= 30 ? 'text-semantic-success' : difficulty <= 60 ? 'text-semantic-warning' : 'text-semantic-danger';
    return <span className={color}>{difficulty} <span className="text-xs opacity-70">({label})</span></span>;
  };
  
  const formatVolume = (volume: number | null) => {
    if (volume === null) return <span className="text-muted-foreground">—</span>;
    return volume.toLocaleString();
  };

  const handleGenerate = () => {
    const domain = setupDomain.trim();
    const businessType = setupBusinessType.trim();
    const location = setupLocation.trim();
    
    if (!domain) {
      toast({
        title: "Missing Information",
        description: "Please enter your domain.",
        variant: "destructive",
      });
      return;
    }
    if (!businessType) {
      toast({
        title: "Missing Information",
        description: "Please enter your business type.",
        variant: "destructive",
      });
      return;
    }
    if (!location) {
      toast({
        title: "Missing Information",
        description: "Please enter your location.",
        variant: "destructive",
      });
      return;
    }
    
    generateKeywords.mutate({ domain, businessType, location });
  };

  const getPositionColor = (pos: number | null) => {
    if (!pos) return 'text-muted-foreground';
    if (pos === 1) return 'text-semantic-gold font-bold';
    if (pos <= 3) return 'text-muted-foreground font-bold';
    if (pos <= 10) return 'text-semantic-warning font-semibold';
    if (pos <= 20) return 'text-semantic-warning';
    if (pos <= 50) return 'text-muted-foreground';
    return 'text-semantic-danger';
  };

  const getChangeIcon = (change: number | null) => {
    if (!change) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (change > 0) return <TrendingUp className="h-4 w-4 text-semantic-success" />;
    return <TrendingDown className="h-4 w-4 text-semantic-danger" />;
  };

  const getIntentBadge = (intent: string | null, priority: number | null, volume: number | null) => {
    if (!intent) {
      if (priority && priority >= 4) {
        return (
          <Tooltip>
            <TooltipTrigger>
              <Badge className="bg-semantic-success text-white text-xs gap-1">
                <DollarSign className="h-3 w-3" />
                High Value
              </Badge>
            </TooltipTrigger>
            <TooltipContent><p>High priority keyword based on business value</p></TooltipContent>
          </Tooltip>
        );
      }
      return null;
    }

    const intentLower = intent.toLowerCase();
    if (intentLower === 'commercial' || intentLower === 'transactional') {
      return (
        <Tooltip>
          <TooltipTrigger>
            <Badge className="bg-semantic-success text-white text-xs gap-1">
              <ShoppingCart className="h-3 w-3" />
              Commercial
            </Badge>
          </TooltipTrigger>
          <TooltipContent><p>High-intent keyword likely to convert</p></TooltipContent>
        </Tooltip>
      );
    }
    if (intentLower === 'navigational') {
      return (
        <Tooltip>
          <TooltipTrigger>
            <Badge className="bg-semantic-info text-white text-xs gap-1">
              <Target className="h-3 w-3" />
              Navigate
            </Badge>
          </TooltipTrigger>
          <TooltipContent><p>User looking for a specific site/brand</p></TooltipContent>
        </Tooltip>
      );
    }
    if (intentLower === 'informational') {
      return (
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className="text-xs gap-1">
              <HelpCircle className="h-3 w-3" />
              Info
            </Badge>
          </TooltipTrigger>
          <TooltipContent><p>Research/informational keyword</p></TooltipContent>
        </Tooltip>
      );
    }
    return (
      <Badge variant="outline" className="text-xs">{intent}</Badge>
    );
  };

  const stats = overview?.stats || { ranking: 0, notRanking: 0, numberOne: 0, inTop3: 0, inTop5: 0, inTop10: 0, inTop20: 0, avgPosition: null, winners: 0, losers: 0 };
  const hasKeywords = (overview?.totalKeywords || 0) > 0;

  const crewMember = getCrewMember("serp_intel");

  const crew: CrewIdentity = useMemo(() => ({
    crewId: "serp_intel",
    crewName: crewMember.nickname,
    subtitle: crewMember.role,
    description: crewMember.blurb || "Tracks keyword rankings and SERP features over time.",
    avatar: crewMember.avatar ? (
      <img src={crewMember.avatar} alt={crewMember.nickname} className="w-7 h-7 object-contain" />
    ) : (
      <Search className="w-7 h-7 text-pink-500" />
    ),
    accentColor: crewMember.color,
    capabilities: crewMember.capabilities || ["Rank Tracking", "SERP Snapshots", "Position Monitoring"],
    monitors: ["Keyword Rankings", "Position Changes", "SERP Features"],
  }), [crewMember]);

  const kpis: KpiDescriptor[] = useMemo(() => {
    const totalKeywords = overview?.totalKeywords || 0;
    const rankingKeywords = stats.ranking || 0;
    const rankingCoverage = totalKeywords > 0 ? Math.round((rankingKeywords / totalKeywords) * 100) : 0;
    const rankingTrend = dashboardStats?.ranking?.trend;

    return [
      {
        id: "rankingCoverage",
        label: "Ranking Coverage",
        value: `${rankingCoverage}%`,
        tooltip: "Percentage of tracked keywords that have rankings",
        trendIsGood: "up" as const,
        sparklineData: rankingTrend?.coverage || undefined,
      },
      {
        id: "avgPosition",
        label: "Avg Position",
        value: stats.avgPosition != null ? `#${stats.avgPosition.toFixed(1)}` : "—",
        tooltip: "Average SERP position across all ranking keywords (lower is better)",
        trendIsGood: "down" as const,
        sparklineData: rankingTrend?.avgPosition || undefined,
      },
      {
        id: "top10Keywords",
        label: "Top 10",
        value: stats.inTop10,
        tooltip: "Keywords ranking in positions 1-10",
        trendIsGood: "up" as const,
        sparklineData: rankingTrend?.top10 || undefined,
      },
      {
        id: "top3Keywords",
        label: "Top 3",
        value: stats.inTop3,
        tooltip: "Keywords ranking in positions 1-3",
        trendIsGood: "up" as const,
        sparklineData: rankingTrend?.top3 || undefined,
      },
    ];
  }, [stats, overview, dashboardStats]);

  const keyMetrics = useMemo(() => {
    const totalKeywords = overview?.totalKeywords || 0;
    const rankedKeywords = stats.ranking || 0;
    const notRankedKeywords = Math.max(0, totalKeywords - rankedKeywords);
    
    return [
      {
        id: "ranking",
        label: "Keywords Ranking",
        value: rankedKeywords,
        icon: TrendingUp,
        status: rankedKeywords > 0 ? "good" as const : "neutral" as const,
      },
      {
        id: "not-ranking",
        label: "Not Ranking",
        value: notRankedKeywords,
        icon: AlertTriangle,
        status: notRankedKeywords > 0 ? "warning" as const : "neutral" as const,
      },
      {
        id: "top-1",
        label: "Top 1",
        value: stats.numberOne,
        iconNode: <TieredCrown tier="top1" />,
        status: "good" as const,
      },
      {
        id: "top-3",
        label: "Top 3",
        value: stats.inTop3,
        iconNode: <TieredCrown tier="top3" />,
        status: "good" as const,
      },
      {
        id: "top-10",
        label: "Top 10",
        value: stats.inTop10,
        iconNode: <TieredCrown tier="top10" />,
        status: "good" as const,
      },
    ];
  }, [stats, overview]);

  // Fetch near wins data
  const { data: nearWinsData } = useQuery<{
    count: number;
    nearWins: Array<{
      id: number;
      keyword: string;
      position: number;
      url: string | null;
      volume: number | null;
      difficulty: number | null;
      spotsToNumber1: number;
      intent: string | null;
      priority: number | null;
    }>;
    message: string;
  }>({
    queryKey: ['serp-near-wins'],
    queryFn: async () => {
      const res = await fetch('/api/serp/near-wins');
      if (!res.ok) throw new Error('Failed to fetch near wins');
      return res.json();
    },
  });

  // Track which keywords have competitor data fetched
  const [competitorData, setCompetitorData] = useState<Record<number, {
    numberOneCompetitor: { domain: string; position: number; title: string } | null;
    topCompetitors: Array<{ domain: string; position: number; title: string }>;
    loading?: boolean;
    error?: string;
  }>>({});

  const fetchCompetitor = async (keywordId: number) => {
    setCompetitorData(prev => ({
      ...prev,
      [keywordId]: { ...prev[keywordId], loading: true, error: undefined, numberOneCompetitor: null, topCompetitors: [] },
    }));
    try {
      const res = await fetch(`/api/serp/keyword/${keywordId}/competitor`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch competitor');
      setCompetitorData(prev => ({
        ...prev,
        [keywordId]: {
          numberOneCompetitor: data.numberOneCompetitor,
          topCompetitors: data.topCompetitors || [],
          loading: false,
        },
      }));
    } catch (err: any) {
      setCompetitorData(prev => ({
        ...prev,
        [keywordId]: { ...prev[keywordId], loading: false, error: err.message },
      }));
    }
  };

  const inspectorTabs: InspectorTab[] = useMemo(() => [
    {
      id: "near-wins",
      label: "Near Wins",
      icon: <Trophy className="w-4 h-4 text-semantic-warning" />,
      content: (
        <TooltipProvider>
          {nearWinsData?.nearWins && nearWinsData.nearWins.length > 0 ? (
            <div className="space-y-4">
              <div className="bg-semantic-warning-soft border border-semantic-warning-border rounded-lg p-3 mb-4">
                <p className="text-sm text-semantic-warning flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  <span><strong>{nearWinsData.count}</strong> keywords are 1-2 spots away from #1!</span>
                </p>
              </div>
              <div className="space-y-3">
                {nearWinsData.nearWins.map((nw) => {
                  const comp = competitorData[nw.id];
                  return (
                    <div 
                      key={nw.id} 
                      className="p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
                      data-testid={`near-win-${nw.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-semantic-warning-soft text-semantic-warning border-semantic-warning-border">
                              #{nw.position}
                            </Badge>
                            <span className="font-medium">{nw.keyword}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {nw.volume && <span>{nw.volume.toLocaleString()} searches/mo</span>}
                            <span className="text-semantic-warning">
                              {nw.spotsToNumber1} spot{nw.spotsToNumber1 > 1 ? 's' : ''} to #1
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => fetchCompetitor(nw.id)}
                                disabled={comp?.loading}
                                data-testid={`button-check-competitor-${nw.id}`}
                              >
                                {comp?.loading ? (
                                  <RefreshCw className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <Eye className="h-3 w-3 mr-1" />
                                    Who's #1?
                                  </>
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Check who's ranking at #1 for this keyword</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                      
                      {comp && !comp.loading && (
                        <div className="mt-3 pt-3 border-t border-border/50">
                          {comp.error ? (
                            <p className="text-xs text-destructive">{comp.error}</p>
                          ) : comp.numberOneCompetitor ? (
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <Crown className="h-4 w-4 text-semantic-gold" />
                                <span className="text-sm font-medium text-semantic-gold">
                                  #{comp.numberOneCompetitor.position}: {comp.numberOneCompetitor.domain}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {comp.numberOneCompetitor.title}
                              </p>
                              {comp.topCompetitors.length > 1 && (
                                <div className="mt-2 text-xs text-muted-foreground">
                                  <p className="font-medium mb-1">Top 5 in SERP:</p>
                                  {comp.topCompetitors.slice(0, 5).map((c, idx) => (
                                    <div key={idx} className="flex items-center gap-2 py-0.5">
                                      <span className="w-5 text-right">#{c.position}</span>
                                      <span className="truncate">{c.domain}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No competitor data available</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Trophy className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No keywords in position 2-3</p>
              <p className="text-sm text-muted-foreground mt-1">
                {nearWinsData?.message || "Run a scan to find keywords close to #1"}
              </p>
            </div>
          )}
        </TooltipProvider>
      ),
      badge: nearWinsData?.count || undefined,
    },
    {
      id: "rankings",
      label: "All Keywords",
      icon: <Target className="w-4 h-4" />,
      content: (
        <TooltipProvider>
          {sortedKeywords && sortedKeywords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b">
                    <th className="text-center py-2 font-medium w-12">#</th>
                    <th className="text-left py-2 font-medium">Keyword</th>
                    <SortHeader field="priority">Priority</SortHeader>
                    <SortHeader field="volume">Volume</SortHeader>
                    <SortHeader field="difficulty">Difficulty</SortHeader>
                    <SortHeader field="position">Position</SortHeader>
                    <th className="text-center py-2 font-medium">Trend</th>
                    <th className="text-center py-2 font-medium">7d Avg</th>
                    <th className="text-left py-2 font-medium">Ranking URL</th>
                    <th className="text-center py-2 font-medium w-16">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedKeywords.map((kw, idx) => (
                    <tr key={kw.id || idx} className="border-b hover:bg-muted/50" data-testid={`row-keyword-${kw.id}`}>
                      <td className="py-2 text-center text-muted-foreground">
                        {idx + 1}
                      </td>
                      <td className="py-2 font-medium">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{kw.keyword}</span>
                          {getIntentBadge(kw.intent, kw.priority, kw.volume)}
                        </div>
                      </td>
                      <td className="py-2 text-center">
                        {getPriorityBadge(kw.priority, kw.priorityReason)}
                      </td>
                      <td className="py-2 text-center">
                        {formatVolume(kw.volume)}
                      </td>
                      <td className="py-2 text-center">
                        {getDifficultyLabel(kw.difficulty)}
                      </td>
                      <td className={`py-2 text-center ${getPositionColor(kw.currentPosition)}`}>
                        {kw.currentPosition ? (
                          <span className="flex items-center justify-center gap-1">
                            {kw.currentPosition === 1 && <Crown className="h-4 w-4 text-semantic-gold" />}
                            {kw.currentPosition >= 2 && kw.currentPosition <= 3 && <Trophy className="h-4 w-4 text-muted-foreground" />}
                            {kw.currentPosition >= 4 && kw.currentPosition <= 10 && <Trophy className="h-4 w-4 text-semantic-warning" />}
                            #{kw.currentPosition}
                          </span>
                        ) : '—'}
                      </td>
                      <td className="py-2 text-center">
                        {kw.trend === 'up' && <TrendingUp className="h-4 w-4 text-semantic-success mx-auto" />}
                        {kw.trend === 'down' && <TrendingDown className="h-4 w-4 text-semantic-danger mx-auto" />}
                        {kw.trend === 'stable' && <Minus className="h-4 w-4 text-muted-foreground mx-auto" />}
                        {kw.trend === 'new' && <Badge variant="outline" className="text-xs">New</Badge>}
                      </td>
                      <td className="py-2 text-center text-muted-foreground">
                        {kw.avg7Day ? `#${kw.avg7Day.toFixed(1)}` : '—'}
                      </td>
                      <td className="py-2 text-muted-foreground truncate max-w-[250px]">
                        {kw.currentUrl || kw.targetUrl || '—'}
                      </td>
                      <td className="py-2 text-center">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => optimizeKeyword.mutate(kw.id)}
                              disabled={optimizeKeyword.isPending || !kw.hasPending}
                              data-testid={`button-optimize-${kw.id}`}
                            >
                              <Wrench 
                                className="h-4 w-4" 
                                style={{ color: kw.hasPending ? '#F2C94C' : '#9CA3AF' }}
                              />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{kw.hasPending ? 'Optimization available' : 'No pending optimization'}</p>
                          </TooltipContent>
                        </Tooltip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">No keywords configured</p>
              <p className="text-sm text-muted-foreground mt-1">Add keywords to start tracking rankings</p>
            </div>
          )}
        </TooltipProvider>
      ),
      badge: sortedKeywords?.length || undefined,
    },
  ], [sortedKeywords, optimizeKeyword, nearWinsData, competitorData]);

  // Loading state - after all hooks
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show setup state if no keywords exist
  if (!hasKeywords && !isLoading) {
    const setupMissionPrompt: MissionPromptConfig = {
      label: "Ask Lookout",
      placeholder: "e.g., What keywords should I track for my business?",
      onSubmit: handleAskSerp,
      isLoading: isAskingSerp,
    };

    const setupHeaderActions: HeaderAction[] = [
      {
        id: "generate-keywords",
        icon: <Sparkles className={cn("w-4 h-4", generateKeywords.isPending && "animate-pulse")} />,
        tooltip: "Generate Keywords",
        onClick: handleGenerate,
        disabled: generateKeywords.isPending || !setupDomain.trim(),
        loading: generateKeywords.isPending,
      },
    ];

    return (
      <CrewDashboardShell
        crew={crew}
        agentScore={null}
        agentScoreTooltip="Generate keywords to start tracking"
        kpis={[
          { id: "keywords", label: "Keywords", value: "0", tooltip: "No keywords tracked yet" },
          { id: "top-10", label: "Top 10", value: "—", tooltip: "No rankings yet" },
        ]}
        inspectorTabs={[]}
        missionPrompt={setupMissionPrompt}
        headerActions={setupHeaderActions}
        onRefresh={() => {}}
        onSettings={() => {}}
        isRefreshing={generateKeywords.isPending || crewIsRefreshing}
        dataUpdatedAt={crewDataUpdatedAt}
      >
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Generate Target Keywords</CardTitle>
            <CardDescription className="text-base">
              Let AI create a list of ~100 target keywords tailored to your business. 
              You can review and edit them before tracking.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-w-md mx-auto">
            <div className="space-y-2">
              <Label htmlFor="domain">Domain</Label>
              <Input 
                id="domain"
                value={setupDomain}
                onChange={(e) => setSetupDomain(e.target.value)}
                placeholder="yourdomain.com"
                data-testid="input-setup-domain"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessType">Business Type</Label>
              <Input 
                id="businessType"
                value={setupBusinessType}
                onChange={(e) => setSetupBusinessType(e.target.value)}
                placeholder="e.g., psychiatry clinic, dental practice"
                data-testid="input-setup-business-type"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input 
                id="location"
                value={setupLocation}
                onChange={(e) => setSetupLocation(e.target.value)}
                placeholder="e.g., Orlando, Florida"
                data-testid="input-setup-location"
              />
            </div>
            <Button 
              onClick={handleGenerate}
              disabled={generateKeywords.isPending || !setupDomain.trim()}
              className="w-full mt-4"
              size="lg"
              data-testid="button-generate-keywords"
            >
              {generateKeywords.isPending ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Generating Keywords...
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 mr-2" />
                  Generate My Target Keywords
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </CrewDashboardShell>
    );
  }

  const agentScore = overview?.totalKeywords && overview.totalKeywords > 0
    ? Math.round((stats.inTop10 / overview.totalKeywords) * 100)
    : null;

  const missionPrompt: MissionPromptConfig = {
    label: "Ask SERP",
    placeholder: "e.g., What keywords are improving? Which need attention?",
    onSubmit: handleAskSerp,
    isLoading: isAskingSerp,
  };

  const headerActions: HeaderAction[] = [
    {
      id: "check-rankings",
      icon: <RefreshCw className={cn("w-4 h-4", runCheck.isPending && "animate-spin")} />,
      tooltip: "Check Rankings",
      onClick: () => runCheck.mutate(50),
      disabled: runCheck.isPending || isFixingEverything,
      loading: runCheck.isPending,
    },
    {
      id: "fix-everything",
      icon: <Zap className={cn("w-4 h-4", isFixingEverything && "animate-pulse")} />,
      tooltip: "Fix All Issues",
      onClick: () => fixEverything.mutate(),
      disabled: runCheck.isPending || isFixingEverything,
      loading: isFixingEverything,
      variant: "primary" as const,
    },
  ];

  return (
    <CrewPageLayout crewId="lookout">
      <CrewDashboardShell
        crew={crew}
        agentScore={agentScore}
        agentScoreTooltip="Percentage of keywords ranking in top 10"
        kpis={kpis}
        customMetrics={<KeyMetricsGrid metrics={keyMetrics} accentColor={crewMember.color} />}
        inspectorTabs={inspectorTabs}
        missionPrompt={missionPrompt}
        headerActions={headerActions}
        onRefresh={() => {
          runCheck.mutate(50);
        }}
        onSettings={() => {}}
        isRefreshing={runCheck.isPending || isFixingEverything || crewIsRefreshing}
        dataUpdatedAt={crewDataUpdatedAt}
      >
      {!overview?.configured && (
        <Card className="border-semantic-warning-border bg-semantic-warning-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-semantic-warning">
              <AlertTriangle className="h-5 w-5" />
              SERP API Not Configured
            </CardTitle>
            <CardDescription>
              Set SERP_API_KEY in your environment to enable keyword tracking.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {showBulkAdd && (
        <Card data-testid="card-add-keywords">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Add Keywords
            </CardTitle>
            <CardDescription>
              Add keywords manually (one per line)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              data-testid="textarea-add-keywords"
              placeholder="Enter keywords (one per line)&#10;psychiatrist orlando&#10;adhd specialist florida&#10;telehealth mental health"
              value={newKeywords}
              onChange={(e) => setNewKeywords(e.target.value)}
              rows={6}
            />
            <div className="flex gap-2">
              <Button
                data-testid="button-add-keywords"
                onClick={handleAddKeywords}
                disabled={addKeywords.isPending}
              >
                {addKeywords.isPending ? 'Adding...' : 'Add Keywords'}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowBulkAdd(false)}
                data-testid="button-cancel-add"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-end gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowBulkAdd(true)}
          data-testid="button-show-add-keywords"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Keywords
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => scorePriority.mutate()}
          disabled={scorePriority.isPending}
          data-testid="button-score-priority"
        >
          <Brain className="h-4 w-4 mr-1" />
          {scorePriority.isPending ? 'Scoring...' : 'Score Priority'}
        </Button>
      </div>
    </CrewDashboardShell>
    </CrewPageLayout>
  );
}
