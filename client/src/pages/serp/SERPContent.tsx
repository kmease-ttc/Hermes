import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { Search, TrendingUp, TrendingDown, Minus, RefreshCw, Sparkles, ArrowUp, ArrowDown, Target, AlertTriangle, Crown, Trophy, Zap, Plus, ChevronUp, ChevronDown, Star, Brain, DollarSign, Info, ShoppingCart, HelpCircle, Eye } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { getCrewMember } from "@/config/agents";
import {
  CrewDashboardShell,
  type CrewIdentity,
  type MissionStatusState,
  type MissionItem,
  type KpiDescriptor,
  type InspectorTab,
} from "@/components/crew-dashboard";

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
  const [setupDomain, setSetupDomain] = useState('empathyhealthclinic.com');
  const [setupBusinessType, setSetupBusinessType] = useState('psychiatry clinic');
  const [setupLocation, setSetupLocation] = useState('Orlando, Florida');

  const { data: overview, isLoading } = useQuery<SerpOverview>({
    queryKey: ['serp-overview'],
    queryFn: async () => {
      const res = await fetch('/api/serp/overview');
      if (!res.ok) throw new Error('Failed to fetch SERP overview');
      return res.json();
    },
    refetchInterval: 60000,
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
    }>;
  }>({
    queryKey: ['serp-rankings-full'],
    queryFn: async () => {
      const res = await fetch('/api/serp/rankings/full');
      if (!res.ok) throw new Error('Failed to fetch rankings');
      return res.json();
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
    const color = priority >= 5 ? 'bg-red-500' : priority >= 4 ? 'bg-orange-500' : priority >= 3 ? 'bg-yellow-500' : priority >= 2 ? 'bg-blue-500' : 'bg-gray-500';
    
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
    if (pos === 1) return 'text-yellow-500 font-bold'; // Gold for #1
    if (pos <= 3) return 'text-slate-400 font-bold'; // Silver for top 3
    if (pos <= 10) return 'text-amber-600 font-semibold'; // Bronze for top 10
    if (pos <= 20) return 'text-semantic-warning';
    if (pos <= 50) return 'text-muted-foreground';
    return 'text-semantic-danger';
  };

  const getChangeIcon = (change: number | null) => {
    if (!change) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (change > 0) return <TrendingUp className="h-4 w-4 text-semantic-success" />;
    return <TrendingDown className="h-4 w-4 text-semantic-danger" />;
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

  const missionStatus: MissionStatusState = useMemo(() => {
    const totalKeywords = overview?.totalKeywords || 0;
    const inTop10 = stats.inTop10 || 0;
    const notRanking = stats.notRanking || 0;
    const coveragePercent = totalKeywords > 0 ? (inTop10 / totalKeywords) * 100 : 0;

    let tier: "looking_good" | "doing_okay" | "needs_attention" = "looking_good";
    if (coveragePercent < 30 || notRanking > totalKeywords * 0.3) {
      tier = "needs_attention";
    } else if (coveragePercent < 60) {
      tier = "doing_okay";
    }

    return {
      tier,
      blockers: notRanking,
      priorities: totalKeywords - inTop10 - notRanking,
      autoFixable: 0,
    };
  }, [overview, stats]);

  const kpis: KpiDescriptor[] = useMemo(() => [
    {
      label: "Top 1",
      value: `${stats.numberOne}`,
      tooltip: "Keywords ranking #1",
    },
    {
      label: "Top 3",
      value: `${stats.inTop3}`,
      tooltip: "Keywords ranking in top 3 positions",
    },
    {
      label: "Top 10",
      value: `${stats.inTop10}`,
      tooltip: "Keywords ranking in top 10 positions",
    },
    {
      label: "Avg Pos",
      value: stats.avgPosition != null ? `#${stats.avgPosition}` : "—",
      tooltip: "Average ranking position across all keywords",
    },
  ], [stats]);

  const missions: MissionItem[] = useMemo(() => {
    const items: MissionItem[] = [];
    if (stats.notRanking > 0) {
      items.push({
        id: "recover-not-ranking",
        title: `Recover ${stats.notRanking} non-ranking keywords`,
        reason: "Keywords not appearing in top 100 results",
        status: "pending",
        impact: "high",
      });
    }
    if (stats.losers > 0) {
      items.push({
        id: "address-position-drops",
        title: `Address ${stats.losers} position drops`,
        reason: "Keywords that recently lost rankings",
        status: "pending",
        impact: "high",
      });
    }
    if (stats.inTop10 < (overview?.totalKeywords || 0) * 0.5) {
      items.push({
        id: "expand-top10-coverage",
        title: "Expand Top 10 coverage",
        reason: `Only ${stats.inTop10} of ${overview?.totalKeywords || 0} keywords in top 10`,
        status: "pending",
        impact: "medium",
      });
    }
    return items;
  }, [stats, overview]);

  const inspectorTabs: InspectorTab[] = useMemo(() => [
    {
      id: "top-keywords",
      label: "Top Keywords",
      icon: <Crown className="w-4 h-4" />,
      content: (
        <div className="space-y-2">
          {overview?.topKeywords?.slice(0, 10).map((kw, i) => (
            <div key={i} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
              <span className="font-medium text-sm">{kw.keyword}</span>
              <Badge className={kw.position === 1 ? "bg-yellow-500" : kw.position && kw.position <= 3 ? "bg-slate-400" : "bg-amber-600"}>
                #{kw.position}
              </Badge>
            </div>
          )) || <p className="text-muted-foreground text-sm">No keywords tracked yet</p>}
        </div>
      ),
    },
  ], [overview]);

  const getIntentBadge = (intent: string | null, priority: number | null, volume: number | null) => {
    if (!intent) {
      if (priority && priority >= 4) {
        return (
          <Tooltip>
            <TooltipTrigger>
              <Badge className="bg-green-600 text-white text-xs gap-1">
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
            <Badge className="bg-green-600 text-white text-xs gap-1">
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
            <Badge className="bg-blue-500 text-white text-xs gap-1">
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
    const emptyMissionStatus: MissionStatusState = {
      tier: "needs_attention",
      blockers: 0,
      priorities: 1,
      autoFixable: 0,
    };

    const setupMissions: MissionItem[] = [{
      id: "generate-keywords",
      title: "Generate target keywords",
      reason: "Set up keyword tracking to start monitoring rankings",
      status: "pending",
      impact: "high",
    }];

    return (
      <CrewDashboardShell
        crew={crew}
        agentScore={null}
        agentScoreTooltip="Generate keywords to start tracking"
        missionStatus={emptyMissionStatus}
        missions={setupMissions}
        kpis={[
          { label: "Keywords", value: "0", tooltip: "No keywords tracked yet" },
          { label: "Top 10", value: "—", tooltip: "No rankings yet" },
        ]}
        inspectorTabs={[]}
        onRefresh={() => {}}
        onSettings={() => {}}
        isRefreshing={generateKeywords.isPending}
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

  return (
    <CrewDashboardShell
      crew={crew}
      agentScore={agentScore}
      agentScoreTooltip="Percentage of keywords ranking in top 10"
      missionStatus={missionStatus}
      missions={missions}
      kpis={kpis}
      inspectorTabs={inspectorTabs}
      onRefresh={() => runCheck.mutate(50)}
      onSettings={() => {}}
      isRefreshing={runCheck.isPending}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">SERP Tracking</h2>
          <p className="text-muted-foreground text-sm">
            {overview?.totalKeywords || 0} target keywords • Last check: {overview?.lastCheck || 'Never'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => handleCheck('quick')} 
            disabled={runCheck.isPending || !overview?.configured}
            variant="outline"
            size="sm"
            data-testid="button-quick-check"
            title="Check keywords missing recent data (respects 7-day rule)"
          >
            {runCheck.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            Quick Check
          </Button>
          <Button 
            onClick={() => handleCheck('full')} 
            disabled={runCheck.isPending || !overview?.configured}
            size="sm"
            data-testid="button-full-check"
            title="Refresh rankings for all keywords (respects 7-day rule)"
          >
            {runCheck.isPending ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Target className="h-4 w-4 mr-2" />}
            Full Check
          </Button>
        </div>
      </div>

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

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        <Card data-testid="card-total-keywords">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{overview?.totalKeywords || 0}</div>
            <p className="text-xs text-muted-foreground">Total Keywords</p>
          </CardContent>
        </Card>

        <Card data-testid="card-ranking">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-semantic-info">{stats.ranking}</div>
            <p className="text-xs text-muted-foreground">Total Ranking</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/30" data-testid="card-top-1">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-500 flex items-center gap-1">
              <Crown className="h-5 w-5" />
              {stats.numberOne}
            </div>
            <p className="text-xs text-muted-foreground">Top 1</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-slate-400/10 to-slate-500/5 border-slate-400/30" data-testid="card-top-3">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-slate-400 flex items-center gap-1">
              <Trophy className="h-4 w-4" />
              {stats.inTop3}
            </div>
            <p className="text-xs text-muted-foreground">Top 3</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-600/10 to-amber-700/5 border-amber-600/30" data-testid="card-top-10">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-600 flex items-center gap-1">
              <Trophy className="h-4 w-4" />
              {stats.inTop10}
            </div>
            <p className="text-xs text-muted-foreground">Top 10</p>
          </CardContent>
        </Card>
      </div>

      {/* Add Keywords Panel */}
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

      <Card data-testid="card-all-rankings">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Keywords ({rankingsData?.keywords?.length || 0})</CardTitle>
              <CardDescription>
                Complete keyword ranking data • Last check: {overview?.lastCheck || 'Never'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
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
          </div>
        </CardHeader>
        <CardContent>
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
                              {kw.currentPosition === 1 && <Crown className="h-4 w-4 text-yellow-500" />}
                              {kw.currentPosition >= 2 && kw.currentPosition <= 3 && <Trophy className="h-4 w-4 text-slate-400" />}
                              {kw.currentPosition >= 4 && kw.currentPosition <= 10 && <Trophy className="h-4 w-4 text-amber-600" />}
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
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No keywords tracked. Seed keywords and run a SERP check to start tracking.
              </p>
            )}
          </TooltipProvider>
        </CardContent>
      </Card>
    </CrewDashboardShell>
  );
}
