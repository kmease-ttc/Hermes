import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Minus, GitCompare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface CompareData {
  hasPreviousRun: boolean;
  current?: {
    runId: string;
    finishedAt: string;
    classification: string;
    confidence: string;
    anomaliesDetected: number;
  };
  previous?: {
    runId: string;
    finishedAt: string;
    classification: string;
    confidence: string;
    anomaliesDetected: number;
  };
  changes?: Array<{
    metric: string;
    current: number;
    previous: number;
    change: string;
  }>;
  classificationChanged?: boolean;
}

export function RunComparison() {
  const { data, isLoading } = useQuery<CompareData>({
    queryKey: ['run-compare'],
    queryFn: async () => {
      const res = await fetch('/api/run/compare');
      if (!res.ok) throw new Error('Failed to compare runs');
      return res.json();
    },
    retry: false,
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <GitCompare className="w-4 h-4" />
            Run Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-3 bg-muted rounded w-1/2"></div>
            <div className="h-3 bg-muted rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.hasPreviousRun) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
            <GitCompare className="w-4 h-4" />
            Run Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Need at least 2 completed runs to compare.</p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getChangeIcon = (change: string) => {
    switch (change) {
      case 'improved':
        return <ArrowUp className="w-3 h-3 text-green-500" />;
      case 'worsened':
        return <ArrowDown className="w-3 h-3 text-red-500" />;
      default:
        return <Minus className="w-3 h-3 text-muted-foreground" />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <GitCompare className="w-4 h-4" />
          What Changed Since Yesterday
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.classificationChanged && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950 rounded-md text-xs" data-testid="classification-change">
            <Badge variant="outline" className="text-xs">{data.previous?.classification}</Badge>
            <span className="text-muted-foreground">→</span>
            <Badge variant="outline" className="text-xs font-medium">{data.current?.classification}</Badge>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="text-muted-foreground">Previous run:</div>
          <div>{data.previous ? formatDate(data.previous.finishedAt) : 'N/A'}</div>
          <div className="text-muted-foreground">Current run:</div>
          <div>{data.current ? formatDate(data.current.finishedAt) : 'N/A'}</div>
        </div>

        {data.changes && data.changes.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Metric Changes:</p>
            {data.changes.map((change, i) => (
              <div key={i} className="flex items-center justify-between text-xs" data-testid={`metric-change-${i}`}>
                <span className="text-muted-foreground">{change.metric}</span>
                <div className="flex items-center gap-1">
                  {getChangeIcon(change.change)}
                  <span className={
                    change.change === 'improved' ? 'text-green-500' :
                    change.change === 'worsened' ? 'text-red-500' : 'text-muted-foreground'
                  }>
                    {change.current.toFixed(1)}%
                  </span>
                  <span className="text-muted-foreground">
                    (was {change.previous.toFixed(1)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
