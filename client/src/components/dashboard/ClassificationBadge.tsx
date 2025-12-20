import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, TrendingDown, Eye, Layers, HelpCircle, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

const classificationConfig: Record<string, { 
  label: string; 
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}> = {
  VISIBILITY_LOSS: {
    label: 'Visibility Loss',
    description: 'Impressions are down - pages may not be appearing in search results',
    icon: Eye,
    color: 'bg-red-500',
  },
  CTR_LOSS: {
    label: 'CTR Loss',
    description: 'Impressions stable but clicks down - snippets may need optimization',
    icon: TrendingDown,
    color: 'bg-orange-500',
  },
  PAGE_CLUSTER_REGRESSION: {
    label: 'Cluster Regression',
    description: 'Traffic loss concentrated in a specific section of the site',
    icon: Layers,
    color: 'bg-yellow-500',
  },
  TRACKING_OR_ATTRIBUTION_GAP: {
    label: 'Tracking Gap',
    description: 'GA4 sessions down but search traffic stable - likely a tracking issue',
    icon: AlertTriangle,
    color: 'bg-purple-500',
  },
  INCONCLUSIVE: {
    label: 'Inconclusive',
    description: 'No significant issues detected or insufficient data',
    icon: HelpCircle,
    color: 'bg-slate-400',
  },
};

const confidenceColors: Record<string, string> = {
  high: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  low: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
};

export function ClassificationBadge() {
  const { data: latestRun, isLoading, isError } = useQuery({
    queryKey: ['latest-run'],
    queryFn: async () => {
      const res = await fetch('/api/run/latest');
      if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error('Failed to fetch latest run');
      }
      return res.json();
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center animate-pulse">
            <Activity className="w-5 h-5 text-slate-400" />
          </div>
          <div className="flex-1">
            <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-32 animate-pulse"></div>
            <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-48 mt-2 animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError || !latestRun) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Activity className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">No diagnostics run yet</p>
            <p className="text-xs text-muted-foreground">Run diagnostics to see classification</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const classification = latestRun.primaryClassification || 'INCONCLUSIVE';
  const confidence = latestRun.confidenceOverall || 'low';
  const config = classificationConfig[classification] || classificationConfig.INCONCLUSIVE;
  const Icon = config.icon;

  return (
    <Card data-testid="classification-card">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-full ${config.color} flex items-center justify-center flex-shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold" data-testid="classification-label">{config.label}</h3>
              <Badge 
                variant="secondary" 
                className={confidenceColors[confidence]}
                data-testid="confidence-badge"
              >
                {confidence} confidence
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1" data-testid="classification-description">
              {config.description}
            </p>
            {latestRun.summary && (
              <p className="text-sm mt-2 font-medium" data-testid="run-summary">
                {latestRun.summary}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Last run: {new Date(latestRun.finishedAt || latestRun.startedAt).toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
