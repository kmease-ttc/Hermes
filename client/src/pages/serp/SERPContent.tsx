import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Search, TrendingUp, TrendingDown, Minus, RefreshCw, Sparkles, ArrowUp, ArrowDown, Target, AlertTriangle, Crown, Trophy, Zap, Settings2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [isChecking, setIsChecking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
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
    }>;
  }>({
    queryKey: ['serp-rankings-full'],
    queryFn: async () => {
      const res = await fetch('/api/serp/rankings/full');
      if (!res.ok) throw new Error('Failed to fetch rankings');
      return res.json();
    },
  });

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
      setIsChecking(false);
    },
    onError: (error: Error) => {
      toast({
        title: "SERP Check Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsChecking(false);
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
        description: data.message || `Created ${data.added || data.saved} target keywords for tracking.`,
      });
      queryClient.invalidateQueries({ queryKey: ['serp-overview'] });
      queryClient.invalidateQueries({ queryKey: ['serp-rankings-full'] });
      setIsGenerating(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsGenerating(false);
    },
  });

  const handleCheck = (mode: 'quick' | 'full') => {
    setIsChecking(true);
    // Quick check = 10 keywords, Full check = 100 keywords
    runCheck.mutate(mode === 'quick' ? 10 : 100);
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    generateKeywords.mutate({
      domain: setupDomain,
      businessType: setupBusinessType,
      location: setupLocation,
    });
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const stats = overview?.stats || { ranking: 0, notRanking: 0, numberOne: 0, inTop3: 0, inTop10: 0, inTop20: 0, avgPosition: null, winners: 0, losers: 0 };
  const hasKeywords = (overview?.totalKeywords || 0) > 0;

  // Show setup state if no keywords exist
  if (!hasKeywords && !isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold">SERP Tracking</h2>
            <p className="text-muted-foreground text-sm">
              Track keyword rankings and position changes
            </p>
          </div>
        </div>

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
              disabled={isGenerating || !setupDomain}
              className="w-full mt-4"
              size="lg"
              data-testid="button-generate-keywords"
            >
              {isGenerating ? (
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
            disabled={isChecking || !overview?.configured}
            variant="outline"
            size="sm"
            data-testid="button-quick-check"
            title="Check keywords missing recent data (respects 7-day rule)"
          >
            {isChecking ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
            Quick Check
          </Button>
          <Button 
            onClick={() => handleCheck('full')} 
            disabled={isChecking || !overview?.configured}
            size="sm"
            data-testid="button-full-check"
            title="Refresh rankings for all keywords (respects 7-day rule)"
          >
            {isChecking ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Target className="h-4 w-4 mr-2" />}
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

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-7">
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

        <Card data-testid="card-avg-position">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">
              {stats.avgPosition ? `#${stats.avgPosition}` : '—'}
            </div>
            <p className="text-xs text-muted-foreground">Avg Position</p>
          </CardContent>
        </Card>

        <Card data-testid="card-changes">
          <CardContent className="pt-4">
            <div className="flex gap-3">
              <div>
                <span className="text-lg font-bold text-semantic-success flex items-center gap-1">
                  <ArrowUp className="h-3 w-3" />
                  {stats.winners}
                </span>
              </div>
              <div>
                <span className="text-lg font-bold text-semantic-danger flex items-center gap-1">
                  <ArrowDown className="h-3 w-3" />
                  {stats.losers}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Movement</p>
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-all-rankings">
        <CardHeader>
          <CardTitle>All Keywords ({rankingsData?.keywords?.length || 0})</CardTitle>
          <CardDescription>
            Complete keyword ranking data • Last check: {overview?.lastCheck || 'Never'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rankingsData?.keywords && rankingsData.keywords.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background">
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Keyword</th>
                    <th className="text-center py-2 font-medium">Position</th>
                    <th className="text-center py-2 font-medium">Trend</th>
                    <th className="text-center py-2 font-medium">7d Avg</th>
                    <th className="text-center py-2 font-medium">30d Avg</th>
                    <th className="text-left py-2 font-medium">Ranking URL</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingsData.keywords.map((kw, idx) => (
                    <tr key={kw.id || idx} className="border-b hover:bg-muted/50" data-testid={`row-keyword-${kw.id}`}>
                      <td className="py-2 font-medium">
                        {kw.keyword}
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
                      <td className="py-2 text-center text-muted-foreground">
                        {kw.avg30Day ? `#${kw.avg30Day.toFixed(1)}` : '—'}
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
        </CardContent>
      </Card>
    </div>
  );
}
