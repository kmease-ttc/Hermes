import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Search, TrendingUp, TrendingDown, Minus, RefreshCw, Sparkles, ArrowUp, ArrowDown, Target, AlertTriangle, Crown, Trophy, Send, MessageSquare } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

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
    inTop5: number;
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
  const [keywordPrompt, setKeywordPrompt] = useState('');
  const [promptResponse, setPromptResponse] = useState<string | null>(null);
  const [isPrompting, setIsPrompting] = useState(false);

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

  const handleKeywordPrompt = async () => {
    if (!keywordPrompt.trim()) return;
    
    setIsPrompting(true);
    setPromptResponse(null);
    
    try {
      const res = await fetch('/api/keywords/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ prompt: keywordPrompt }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to process prompt');
      }
      
      const data = await res.json();
      setPromptResponse(data.response);
      
      if (data.keywordsAdded > 0 || data.keywordsRemoved > 0) {
        queryClient.invalidateQueries({ queryKey: ['serp-overview'] });
        toast({
          title: "Keywords Updated",
          description: data.message,
        });
      }
      
      setKeywordPrompt('');
    } catch (error: any) {
      toast({
        title: "Prompt Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsPrompting(false);
    }
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

  const stats = overview?.stats || { ranking: 0, notRanking: 0, numberOne: 0, inTop3: 0, inTop5: 0, inTop10: 0, inTop20: 0, avgPosition: null, winners: 0, losers: 0 };
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

        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
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

          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/30" data-testid="card-top-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top 1</CardTitle>
              <Crown className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{stats.numberOne}</div>
              <p className="text-xs text-muted-foreground">
                #1 position keywords
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-400/10 to-slate-500/5 border-slate-400/30" data-testid="card-top-2-5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top 2-5</CardTitle>
              <Trophy className="h-4 w-4 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-400">{Math.max(0, stats.inTop5 - stats.numberOne)}</div>
              <p className="text-xs text-muted-foreground">
                Positions 2-5
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-top-10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top 10</CardTitle>
              <TrendingUp className="h-4 w-4 text-semantic-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-semantic-success">{stats.inTop10}</div>
              <Progress value={totalTracked > 0 ? (stats.inTop10 / totalTracked) * 100 : 0} className="mt-2" />
            </CardContent>
          </Card>

        </div>

        {/* Keyword Prompt Interface */}
        <Card data-testid="card-keyword-prompt">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-5 w-5" />
              Keyword Assistant
            </CardTitle>
            <CardDescription>
              Ask questions about your keywords or request changes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <Textarea
                data-testid="textarea-keyword-prompt"
                placeholder="Try: 'Add keywords for telehealth services' or 'What keywords should I focus on for better rankings?'"
                value={keywordPrompt}
                onChange={(e) => setKeywordPrompt(e.target.value)}
                rows={2}
                className="resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleKeywordPrompt();
                  }
                }}
              />
              <Button
                onClick={handleKeywordPrompt}
                disabled={isPrompting || !keywordPrompt.trim()}
                className="shrink-0"
                data-testid="button-send-prompt"
              >
                {isPrompting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            {promptResponse && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm" data-testid="prompt-response">
                {promptResponse}
              </div>
            )}
          </CardContent>
        </Card>

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
