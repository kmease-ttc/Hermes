import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, FileText, Search, Layers } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LosingPage {
  page: string;
  clickLoss: number;
  cluster: string;
}

interface LosingQuery {
  query: string;
  clickLoss: number;
}

interface ClusterLoss {
  cluster: string;
  baselineClicks: number;
  currentClicks: number;
  clickLoss: number;
  lossShare: number;
}

interface AnalysisData {
  topLosingPages: LosingPage[];
  topLosingQueries: LosingQuery[];
  clusterLosses: ClusterLoss[];
  incidentDate: string | null;
}

export function TopLosers() {
  const { data, isLoading } = useQuery<AnalysisData>({
    queryKey: ['analysis-data'],
    queryFn: async () => {
      const res = await fetch('/api/run/analysis');
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch analysis data');
      }
      return res.json();
    },
    retry: false,
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5" />
            Analysis Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || (data.topLosingPages.length === 0 && data.topLosingQueries.length === 0 && data.clusterLosses.length === 0)) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <TrendingDown className="w-5 h-5" />
            Analysis Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No significant losses detected in the latest analysis.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500" />
            Top Losers
          </CardTitle>
          {data.incidentDate && (
            <Badge variant="outline" className="text-xs">
              Incident: {new Date(data.incidentDate).toLocaleDateString()}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pages" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="pages" className="gap-1" data-testid="tab-pages">
              <FileText className="w-3 h-3" />
              Pages ({data.topLosingPages.length})
            </TabsTrigger>
            <TabsTrigger value="queries" className="gap-1" data-testid="tab-queries">
              <Search className="w-3 h-3" />
              Queries ({data.topLosingQueries.length})
            </TabsTrigger>
            <TabsTrigger value="clusters" className="gap-1" data-testid="tab-clusters">
              <Layers className="w-3 h-3" />
              Clusters ({data.clusterLosses.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pages">
            {data.topLosingPages.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Page</TableHead>
                    <TableHead>Cluster</TableHead>
                    <TableHead className="text-right">Click Loss</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topLosingPages.slice(0, 5).map((page, i) => (
                    <TableRow key={i} data-testid={`loser-page-${i}`}>
                      <TableCell className="font-mono text-xs truncate max-w-[200px]" title={page.page}>
                        {page.page}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{page.cluster}</Badge>
                      </TableCell>
                      <TableCell className="text-right text-red-500 font-medium">
                        -{page.clickLoss}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No losing pages detected</p>
            )}
          </TabsContent>

          <TabsContent value="queries">
            {data.topLosingQueries.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Query</TableHead>
                    <TableHead className="text-right">Click Loss</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topLosingQueries.slice(0, 5).map((query, i) => (
                    <TableRow key={i} data-testid={`loser-query-${i}`}>
                      <TableCell className="font-mono text-xs truncate max-w-[300px]" title={query.query}>
                        {query.query}
                      </TableCell>
                      <TableCell className="text-right text-red-500 font-medium">
                        -{query.clickLoss}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No losing queries detected</p>
            )}
          </TabsContent>

          <TabsContent value="clusters">
            {data.clusterLosses.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cluster</TableHead>
                    <TableHead className="text-right">Baseline</TableHead>
                    <TableHead className="text-right">Current</TableHead>
                    <TableHead className="text-right">Loss Share</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.clusterLosses.map((cluster, i) => (
                    <TableRow key={i} data-testid={`loser-cluster-${i}`}>
                      <TableCell className="font-medium">{cluster.cluster}</TableCell>
                      <TableCell className="text-right">{cluster.baselineClicks}</TableCell>
                      <TableCell className="text-right">{cluster.currentClicks}</TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant={cluster.lossShare >= 0.6 ? "destructive" : "secondary"}
                          className="text-xs"
                        >
                          {(cluster.lossShare * 100).toFixed(0)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No cluster losses detected</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
