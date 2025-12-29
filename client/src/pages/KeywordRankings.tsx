import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Search, TrendingUp, TrendingDown, Minus, RefreshCw, Download, ArrowUp, ArrowDown, Target, Filter, Trophy, Crown } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface KeywordData {
  id: number;
  keyword: string;
  intent: string | null;
  priority: number | null;
  targetUrl: string | null;
  tags: string[] | null;
  currentPosition: number | null;
  currentUrl: string | null;
  lastChecked: string | null;
  avg7Day: number | null;
  avg30Day: number | null;
  avg90Day: number | null;
  trend: 'up' | 'down' | 'stable' | 'new';
  volume: number | null;
}

interface FullRankingsResponse {
  domain: string;
  totalKeywords: number;
  displayedKeywords: number;
  lastUpdated: string | null;
  summary: {
    ranking: number;
    notRanking: number;
    numberOne: number;
    inTop3: number;
    inTop10: number;
    inTop20: number;
    improving: number;
    declining: number;
    avgPosition: number | null;
  };
  keywords: KeywordData[];
}

function getTrendIcon(trend: string) {
  switch (trend) {
    case 'up':
      return <TrendingUp className="h-4 w-4 text-semantic-success" />;
    case 'down':
      return <TrendingDown className="h-4 w-4 text-semantic-danger" />;
    case 'stable':
      return <Minus className="h-4 w-4 text-muted-foreground" />;
    default:
      return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
}

function getPositionBadge(position: number | null) {
  if (position === null) {
    return <Badge variant="outline" className="text-muted-foreground">Not Ranking</Badge>;
  }
  if (position === 1) {
    return (
      <Badge className="bg-yellow-500 text-black flex items-center gap-1">
        <Crown className="h-3 w-3" />
        {position}
      </Badge>
    );
  }
  if (position <= 3) {
    return (
      <Badge className="bg-slate-400 text-black flex items-center gap-1">
        <Trophy className="h-3 w-3" />
        {position}
      </Badge>
    );
  }
  if (position <= 10) {
    return (
      <Badge className="bg-amber-600 text-white flex items-center gap-1">
        <Trophy className="h-3 w-3" />
        {position}
      </Badge>
    );
  }
  if (position <= 20) {
    return <Badge className="bg-semantic-warning text-black">{position}</Badge>;
  }
  return <Badge variant="outline">{position}</Badge>;
}

function formatAvg(avg: number | null): string {
  if (avg === null) return '-';
  return avg.toFixed(1);
}

export default function KeywordRankings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [trendFilter, setTrendFilter] = useState<string>('all');
  const [positionFilter, setPositionFilter] = useState<string>('all');

  const { data, isLoading, refetch } = useQuery<FullRankingsResponse>({
    queryKey: ['keyword-rankings-full'],
    queryFn: async () => {
      const res = await fetch('/api/serp/rankings/full');
      if (!res.ok) throw new Error('Failed to fetch keyword rankings');
      return res.json();
    },
    refetchInterval: 120000,
  });

  const syncFromService = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/serp/sync-from-service', { 
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to sync keywords');
      }
      return res.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Keywords Synced",
        description: result.message,
      });
      queryClient.invalidateQueries({ queryKey: ['keyword-rankings-full'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Sync Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredKeywords = data?.keywords.filter(kw => {
    if (searchTerm && !kw.keyword.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (trendFilter !== 'all' && kw.trend !== trendFilter) {
      return false;
    }
    if (positionFilter === 'top10' && (kw.currentPosition === null || kw.currentPosition > 10)) {
      return false;
    }
    if (positionFilter === 'top20' && (kw.currentPosition === null || kw.currentPosition > 20)) {
      return false;
    }
    if (positionFilter === 'notranking' && kw.currentPosition !== null) {
      return false;
    }
    return true;
  }) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold" data-testid="stat-total-keywords">
                {data?.totalKeywords ?? '-'}
              </div>
              <div className="text-sm text-muted-foreground">Total Keywords</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border-yellow-500/30">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-yellow-500 flex items-center gap-1" data-testid="stat-number-one">
                <Crown className="h-5 w-5" />
                {data?.summary.numberOne ?? '-'}
              </div>
              <div className="text-sm text-muted-foreground">#1 Rankings</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/30">
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-amber-500 flex items-center gap-1" data-testid="stat-in-top3">
                <Trophy className="h-4 w-4" />
                {data?.summary.inTop3 ?? '-'}
              </div>
              <div className="text-sm text-muted-foreground">Top 3</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-semantic-success" data-testid="stat-in-top10">
                {data?.summary.inTop10 ?? '-'}
              </div>
              <div className="text-sm text-muted-foreground">Top 10</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-semantic-info" data-testid="stat-in-top20">
                {data?.summary.inTop20 ?? '-'}
              </div>
              <div className="text-sm text-muted-foreground">Top 20</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold" data-testid="stat-avg-position">
                {data?.summary.avgPosition ?? '-'}
              </div>
              <div className="text-sm text-muted-foreground">Avg Position</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-semantic-success flex items-center gap-1" data-testid="stat-improving">
                <ArrowUp className="h-4 w-4" />
                {data?.summary.improving ?? '-'}
              </div>
              <div className="text-sm text-muted-foreground">Improving</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-semantic-danger flex items-center gap-1" data-testid="stat-declining">
                <ArrowDown className="h-4 w-4" />
                {data?.summary.declining ?? '-'}
              </div>
              <div className="text-sm text-muted-foreground">Declining</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Keyword Rankings
                </CardTitle>
                <CardDescription>
                  {data?.domain} - Last updated: {data?.lastUpdated || 'Never'}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => syncFromService.mutate()}
                  disabled={syncFromService.isPending}
                  data-testid="button-sync-keywords"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {syncFromService.isPending ? 'Syncing...' : 'Sync from Service'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => refetch()}
                  data-testid="button-refresh"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 mb-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search keywords..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    data-testid="input-search-keywords"
                  />
                </div>
              </div>
              <Select value={trendFilter} onValueChange={setTrendFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-trend-filter">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Trend" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Trends</SelectItem>
                  <SelectItem value="up">Improving</SelectItem>
                  <SelectItem value="down">Declining</SelectItem>
                  <SelectItem value="stable">Stable</SelectItem>
                  <SelectItem value="new">New</SelectItem>
                </SelectContent>
              </Select>
              <Select value={positionFilter} onValueChange={setPositionFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-position-filter">
                  <SelectValue placeholder="Position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Positions</SelectItem>
                  <SelectItem value="top10">Top 10</SelectItem>
                  <SelectItem value="top20">Top 20</SelectItem>
                  <SelectItem value="notranking">Not Ranking</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading keywords...</div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">#</TableHead>
                      <TableHead>Keyword</TableHead>
                      <TableHead className="text-center w-[100px]">Current</TableHead>
                      <TableHead className="text-center w-[80px]">7-Day Avg</TableHead>
                      <TableHead className="text-center w-[80px]">30-Day Avg</TableHead>
                      <TableHead className="text-center w-[80px]">90-Day Avg</TableHead>
                      <TableHead className="text-center w-[60px]">Trend</TableHead>
                      <TableHead className="text-center w-[80px]">Volume</TableHead>
                      <TableHead className="w-[80px]">Intent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredKeywords.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          {data?.keywords.length === 0 
                            ? 'No keywords tracked. Click "Sync from Service" to import keywords.'
                            : 'No keywords match your filters.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredKeywords.map((kw, idx) => (
                        <TableRow key={kw.id} data-testid={`row-keyword-${kw.id}`}>
                          <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell>
                            <div className="font-medium">{kw.keyword}</div>
                            {kw.currentUrl && (
                              <div className="text-xs text-muted-foreground truncate max-w-[300px]">
                                {kw.currentUrl}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {getPositionBadge(kw.currentPosition)}
                          </TableCell>
                          <TableCell className="text-center font-mono text-sm">
                            {formatAvg(kw.avg7Day)}
                          </TableCell>
                          <TableCell className="text-center font-mono text-sm">
                            {formatAvg(kw.avg30Day)}
                          </TableCell>
                          <TableCell className="text-center font-mono text-sm">
                            {formatAvg(kw.avg90Day)}
                          </TableCell>
                          <TableCell className="text-center">
                            {getTrendIcon(kw.trend)}
                          </TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {kw.volume?.toLocaleString() ?? '-'}
                          </TableCell>
                          <TableCell>
                            {kw.intent && (
                              <Badge variant="outline" className="text-xs">
                                {kw.intent}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredKeywords.length} of {data?.displayedKeywords ?? 0} keywords
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
