import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Search, TrendingUp, TrendingDown, Minus, RefreshCw, Sparkles, ArrowUp, ArrowDown, Target, AlertTriangle, Crown, Trophy } from "lucide-react";
import { Progress } from "@/components/ui/progress";

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
  const [isSeeding, setIsSeeding] = useState(false);

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

  const seedKeywords = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/serp/seed', { 
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to seed keywords');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Keywords Seeded",
        description: `Added ${data.saved} keywords for tracking.`,
      });
      queryClient.invalidateQueries({ queryKey: ['serp-overview'] });
      queryClient.invalidateQueries({ queryKey: ['serp-rankings-full'] });
      setIsSeeding(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Seed Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsSeeding(false);
    },
  });

  const handleCheck = (limit: number) => {
    setIsChecking(true);
    runCheck.mutate(limit);
  };

  const handleSeed = () => {
    setIsSeeding(true);
    seedKeywords.mutate();
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
  const totalTracked = stats.ranking + stats.notRanking;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">SERP Tracking</h2>
          <p className="text-muted-foreground text-sm">
            Monitor keyword rankings and position changes
          </p>
        </div>
        <div className="flex gap-2">
          {overview?.totalKeywords === 0 && (
            <Button 
              onClick={handleSeed} 
              disabled={isSeeding}
              variant="outline"
              size="sm"
              data-testid="button-seed-keywords"
            >
              {isSeeding ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Seed Keywords
            </Button>
          )}
          <Button 
            onClick={() => handleCheck(10)} 
            disabled={isChecking || !overview?.configured || overview?.totalKeywords === 0}
            variant="outline"
            size="sm"
            data-testid="button-quick-check"
          >
            {isChecking ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            Quick Check
          </Button>
          <Button 
            onClick={() => handleCheck(50)} 
            disabled={isChecking || !overview?.configured || overview?.totalKeywords === 0}
            size="sm"
            data-testid="button-full-check"
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

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        <Card data-testid="card-total-keywords">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold">{overview?.totalKeywords || 0}</div>
            <p className="text-xs text-muted-foreground">Total Keywords</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/30" data-testid="card-number-one">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-yellow-500 flex items-center gap-1">
              <Crown className="h-5 w-5" />
              {stats.numberOne}
            </div>
            <p className="text-xs text-muted-foreground">#1 Rankings</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/30" data-testid="card-top-3">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-amber-500 flex items-center gap-1">
              <Trophy className="h-4 w-4" />
              {stats.inTop3}
            </div>
            <p className="text-xs text-muted-foreground">Top 3</p>
          </CardContent>
        </Card>

        <Card data-testid="card-top-10">
          <CardContent className="pt-4">
            <div className="text-2xl font-bold text-semantic-success">{stats.inTop10}</div>
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

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="card-top-rankings">
          <CardHeader>
            <CardTitle>Top Ranking Keywords</CardTitle>
            <CardDescription>
              Best performing keywords by position
            </CardDescription>
          </CardHeader>
          <CardContent>
            {overview?.topKeywords && overview.topKeywords.length > 0 ? (
              <div className="space-y-3">
                {overview.topKeywords.map((r, idx) => (
                  <div key={r.id || idx} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex-1">
                      <p className="font-medium text-sm" data-testid={`text-keyword-${r.keywordId}`}>
                        {r.keyword || `Keyword #${r.keywordId}`}
                      </p>
                      {r.url && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {r.url}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold ${getPositionColor(r.position)}`}>
                        #{r.position}
                      </span>
                      <div className="flex items-center gap-1">
                        {getChangeIcon(r.change)}
                        {r.change !== null && r.change !== 0 && (
                          <span className={r.change > 0 ? 'text-semantic-success text-sm' : 'text-semantic-danger text-sm'}>
                            {r.change > 0 ? '+' : ''}{r.change}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No ranking data yet. Run a SERP check to start tracking.
              </p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-recent-changes">
          <CardHeader>
            <CardTitle>Position Progress</CardTitle>
            <CardDescription>
              7-day and 30-day position changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rankingsData?.keywords && rankingsData.keywords.length > 0 ? (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {rankingsData.keywords
                  .filter(kw => kw.currentPosition !== null && (kw.avg7Day || kw.avg30Day))
                  .slice(0, 15)
                  .map((kw, idx) => {
                    const change7d = kw.avg7Day && kw.currentPosition ? Math.round((kw.avg7Day - kw.currentPosition) * 10) / 10 : null;
                    const change30d = kw.avg30Day && kw.currentPosition ? Math.round((kw.avg30Day - kw.currentPosition) * 10) / 10 : null;
                    return (
                      <div key={kw.id || idx} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{kw.keyword}</p>
                          <p className="text-xs text-muted-foreground">
                            Current: #{kw.currentPosition}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <div className="text-center px-2">
                            <p className="text-xs text-muted-foreground">7d</p>
                            {change7d !== null ? (
                              <span className={`text-sm font-medium ${change7d > 0 ? 'text-semantic-success' : change7d < 0 ? 'text-semantic-danger' : 'text-muted-foreground'}`}>
                                {change7d > 0 ? '+' : ''}{change7d}
                              </span>
                            ) : <span className="text-sm text-muted-foreground">—</span>}
                          </div>
                          <div className="text-center px-2">
                            <p className="text-xs text-muted-foreground">30d</p>
                            {change30d !== null ? (
                              <span className={`text-sm font-medium ${change30d > 0 ? 'text-semantic-success' : change30d < 0 ? 'text-semantic-danger' : 'text-muted-foreground'}`}>
                                {change30d > 0 ? '+' : ''}{change30d}
                              </span>
                            ) : <span className="text-sm text-muted-foreground">—</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No position data yet. Run multiple checks to track progress.
              </p>
            )}
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
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
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
