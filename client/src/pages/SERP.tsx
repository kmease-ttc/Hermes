import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Search, TrendingUp, TrendingDown, Minus, RefreshCw, Sparkles, ArrowUp, ArrowDown, Target, AlertTriangle } from "lucide-react";
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
    inTop10: number;
    inTop20: number;
    avgPosition: number | null;
    winners: number;
    losers: number;
  };
  topKeywords: RankingData[];
  recentChanges: RankingData[];
}

export default function SERP() {
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

  const { data: rankingsData } = useQuery({
    queryKey: ['serp-rankings'],
    queryFn: async () => {
      const res = await fetch('/api/serp/rankings');
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
      queryClient.invalidateQueries({ queryKey: ['serp-rankings'] });
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
      queryClient.invalidateQueries({ queryKey: ['serp-keywords'] });
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
    if (pos <= 3) return 'text-semantic-success font-bold';
    if (pos <= 10) return 'text-semantic-success';
    if (pos <= 20) return 'text-semantic-warning';
    if (pos <= 50) return 'text-gold';
    return 'text-semantic-danger';
  };

  const getChangeIcon = (change: number | null) => {
    if (!change) return <Minus className="h-4 w-4 text-muted-foreground" />;
    if (change > 0) return <TrendingUp className="h-4 w-4 text-semantic-success" />;
    return <TrendingDown className="h-4 w-4 text-semantic-danger" />;
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const stats = overview?.stats || { ranking: 0, notRanking: 0, inTop10: 0, inTop20: 0, avgPosition: null, winners: 0, losers: 0 };
  const totalTracked = stats.ranking + stats.notRanking;
  const rankingPercent = totalTracked > 0 ? Math.round((stats.ranking / totalTracked) * 100) : 0;

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">SERP Tracking</h2>
            <p className="text-muted-foreground mt-1">
              Monitor keyword rankings for empathyhealthclinic.com
            </p>
          </div>
          <div className="flex gap-2">
            {overview?.totalKeywords === 0 && (
              <Button 
                onClick={handleSeed} 
                disabled={isSeeding}
                variant="outline"
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
              data-testid="button-quick-check"
            >
              {isChecking ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              Quick Check (10)
            </Button>
            <Button 
              onClick={() => handleCheck(50)} 
              disabled={isChecking || !overview?.configured || overview?.totalKeywords === 0}
              data-testid="button-full-check"
            >
              {isChecking ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Target className="h-4 w-4 mr-2" />}
              Full Check (50)
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

        <div className="grid gap-4 md:grid-cols-2">
          <Card data-testid="card-total-keywords">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Keywords</CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview?.totalKeywords || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats.ranking} ranking, {stats.notRanking} not found
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-top-10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top 10 Positions</CardTitle>
              <TrendingUp className="h-4 w-4 text-semantic-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-semantic-success">{stats.inTop10}</div>
              <Progress value={totalTracked > 0 ? (stats.inTop10 / totalTracked) * 100 : 0} className="mt-2" />
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
              <CardTitle>Recent Position Changes</CardTitle>
              <CardDescription>
                Keywords with the biggest position movements
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overview?.recentChanges && overview.recentChanges.length > 0 ? (
                <div className="space-y-3">
                  {overview.recentChanges.map((r, idx) => (
                    <div key={r.id || idx} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex-1">
                        <p className="font-medium text-sm">
                          {r.keyword || `Keyword #${r.keywordId}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Position: #{r.position || '—'}
                        </p>
                      </div>
                      <Badge 
                        variant={r.change && r.change > 0 ? "default" : "destructive"}
                        className={r.change && r.change > 0 ? "bg-semantic-success" : ""}
                      >
                        {r.change && r.change > 0 ? '+' : ''}{r.change} positions
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  No position changes detected yet. Run multiple checks to track changes.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card data-testid="card-all-rankings">
          <CardHeader>
            <CardTitle>All Keywords</CardTitle>
            <CardDescription>
              Complete keyword ranking data • Last check: {overview?.lastCheck || 'Never'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rankingsData?.rankings && rankingsData.rankings.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Keyword</th>
                      <th className="text-center py-2 font-medium">Position</th>
                      <th className="text-center py-2 font-medium">Change</th>
                      <th className="text-left py-2 font-medium">URL</th>
                      <th className="text-center py-2 font-medium">Features</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankingsData.rankings.slice(0, 50).map((r: RankingData, idx: number) => (
                      <tr key={r.id || idx} className="border-b hover:bg-muted/50" data-testid={`row-ranking-${r.keywordId}`}>
                        <td className="py-2 font-medium">
                          {r.keyword || `Keyword #${r.keywordId}`}
                        </td>
                        <td className={`py-2 text-center ${getPositionColor(r.position)}`}>
                          {r.position ? `#${r.position}` : '—'}
                        </td>
                        <td className="py-2 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {getChangeIcon(r.change)}
                            {r.change !== null && r.change !== 0 && (
                              <span className={r.change > 0 ? 'text-semantic-success' : 'text-semantic-danger'}>
                                {r.change > 0 ? '+' : ''}{r.change}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 text-muted-foreground truncate max-w-[200px]">
                          {r.url || '—'}
                        </td>
                        <td className="py-2 text-center">
                          <div className="flex justify-center gap-1">
                            {r.serpFeatures?.featuredSnippet && (
                              <Badge variant="secondary" className="text-xs">FS</Badge>
                            )}
                            {r.serpFeatures?.localPack && (
                              <Badge variant="secondary" className="text-xs">LP</Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                No rankings data. Seed keywords and run a SERP check to start tracking.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
