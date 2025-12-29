import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  TrendingDown, 
  TrendingUp,
  Clock, 
  Activity,
  RefreshCw,
  Info,
  ExternalLink,
  Zap,
  Eye,
  MousePointer
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSiteContext } from "@/hooks/useSiteContext";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface VitalMetric {
  key: string;
  name: string;
  value: number | null;
  unit: string;
  status: 'good' | 'needs-improvement' | 'poor' | 'unknown';
  thresholds: { good: number; needsImprovement: number };
  trend?: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

function getVitalStatus(value: number | null, thresholds: { good: number; needsImprovement: number }, lowerIsBetter: boolean = true): 'good' | 'needs-improvement' | 'poor' | 'unknown' {
  if (value === null || value === undefined) return 'unknown';
  if (lowerIsBetter) {
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.needsImprovement) return 'needs-improvement';
    return 'poor';
  } else {
    if (value >= thresholds.good) return 'good';
    if (value >= thresholds.needsImprovement) return 'needs-improvement';
    return 'poor';
  }
}

function VitalCard({ vital }: { vital: VitalMetric }) {
  const Icon = vital.icon;
  
  const statusConfig = {
    'good': { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-600', label: 'Good' },
    'needs-improvement': { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-600', label: 'Needs Work' },
    'poor': { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600', label: 'Poor' },
    'unknown': { bg: 'bg-muted', border: 'border-border', text: 'text-muted-foreground', label: 'No Data' },
  };
  
  const config = statusConfig[vital.status];
  
  const formatValue = () => {
    if (vital.value === null || vital.value === undefined) return '—';
    if (vital.unit === 's') return `${vital.value.toFixed(2)}s`;
    if (vital.unit === 'ms') return `${Math.round(vital.value)}ms`;
    return vital.value.toFixed(3);
  };
  
  const getThresholdPosition = (value: number, good: number, poor: number) => {
    if (value <= good) return (value / good) * 33;
    if (value <= poor) return 33 + ((value - good) / (poor - good)) * 34;
    return Math.min(100, 67 + ((value - poor) / poor) * 33);
  };
  
  return (
    <Card className={cn("transition-all", config.bg, config.border)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("p-2 rounded-lg", config.bg)}>
              <Icon className={cn("w-5 h-5", config.text)} />
            </div>
            <div>
              <CardTitle className="text-base">{vital.name}</CardTitle>
              <CardDescription className="text-xs">{vital.key}</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={cn("text-xs", config.text, config.border)}>
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-bold", config.text)}>
              {formatValue()}
            </span>
            {vital.trend !== undefined && vital.trend !== 0 && (
              <span className={cn("text-sm flex items-center gap-1", vital.trend < 0 ? "text-green-600" : "text-red-600")}>
                {vital.trend < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                {Math.abs(vital.trend).toFixed(1)}%
              </span>
            )}
          </div>
          
          {vital.value !== null && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Good</span>
                <span>Needs Work</span>
                <span>Poor</span>
              </div>
              <div className="h-2 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 relative">
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-foreground shadow-md"
                  style={{ left: `${getThresholdPosition(vital.value, vital.thresholds.good, vital.thresholds.needsImprovement)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>≤{vital.thresholds.good}{vital.unit}</span>
                <span>≤{vital.thresholds.needsImprovement}{vital.unit}</span>
                <span>&gt;{vital.thresholds.needsImprovement}{vital.unit}</span>
              </div>
            </div>
          )}
          
          <p className="text-sm text-muted-foreground">{vital.description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MissingDataCard({ vital, reason }: { vital: string; reason: string }) {
  return (
    <Card className="border-dashed border-muted-foreground/30">
      <CardContent className="py-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <AlertTriangle className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">{vital} Not Available</h4>
            <p className="text-sm text-muted-foreground">{reason}</p>
            <div className="text-sm space-y-1">
              <p className="font-medium">How to fix:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Ensure the Core Web Vitals worker is running</li>
                <li>Check that the worker returns {vital.toLowerCase()} in its response</li>
                <li>Verify the metric is being stored with canonical key</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SpeedsterContent() {
  const { activeSite } = useSiteContext();
  const siteId = activeSite?.id || 'site_empathy_health_clinic';
  
  const { data: speedsterData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['speedster-summary', siteId],
    queryFn: async () => {
      const res = await fetch(`/api/crew/speedster/summary?siteId=${siteId}`);
      if (!res.ok) throw new Error('Failed to fetch speedster data');
      return res.json();
    },
    staleTime: 60000,
  });
  
  const metrics = speedsterData?.metrics || {};
  
  // Use canonical metric keys from registry
  const vitals: VitalMetric[] = [
    {
      key: 'vitals.lcp',
      name: 'Largest Contentful Paint',
      value: metrics['vitals.lcp'] ?? null,
      unit: 's',
      status: getVitalStatus(metrics['vitals.lcp'], { good: 2.5, needsImprovement: 4.0 }),
      thresholds: { good: 2.5, needsImprovement: 4.0 },
      trend: metrics['vitals.lcp.trend'],
      description: 'Measures loading performance. LCP should occur within 2.5 seconds of when the page first starts loading.',
      icon: Eye,
    },
    {
      key: 'vitals.cls',
      name: 'Cumulative Layout Shift',
      value: metrics['vitals.cls'] ?? null,
      unit: '',
      status: getVitalStatus(metrics['vitals.cls'], { good: 0.1, needsImprovement: 0.25 }),
      thresholds: { good: 0.1, needsImprovement: 0.25 },
      trend: metrics['vitals.cls.trend'],
      description: 'Measures visual stability. Pages should maintain a CLS of 0.1 or less.',
      icon: Activity,
    },
    {
      key: 'vitals.inp',
      name: 'Interaction to Next Paint',
      value: metrics['vitals.inp'] ?? null,
      unit: 'ms',
      status: getVitalStatus(metrics['vitals.inp'], { good: 200, needsImprovement: 500 }),
      thresholds: { good: 200, needsImprovement: 500 },
      trend: metrics['vitals.inp.trend'],
      description: 'Measures responsiveness. INP should be 200 milliseconds or less.',
      icon: MousePointer,
    },
  ];
  
  const overallStatus = vitals.every(v => v.status === 'good') ? 'good' 
    : vitals.some(v => v.status === 'poor') ? 'poor' 
    : vitals.some(v => v.status === 'unknown') ? 'unknown'
    : 'needs-improvement';
  
  const statusColors = {
    'good': 'text-green-600',
    'needs-improvement': 'text-yellow-600',
    'poor': 'text-red-600',
    'unknown': 'text-muted-foreground',
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Zap className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <CardTitle>Core Web Vitals Overview</CardTitle>
                <CardDescription>
                  Performance metrics that measure real-world user experience
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className={cn("text-sm", statusColors[overallStatus])}>
                {overallStatus === 'good' && <CheckCircle className="w-4 h-4 mr-1" />}
                {overallStatus === 'needs-improvement' && <AlertTriangle className="w-4 h-4 mr-1" />}
                {overallStatus === 'poor' && <XCircle className="w-4 h-4 mr-1" />}
                {overallStatus === 'unknown' && <Info className="w-4 h-4 mr-1" />}
                {overallStatus === 'good' ? 'All Passing' : overallStatus === 'unknown' ? 'No Data' : 'Needs Attention'}
              </Badge>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => refetch()}
                disabled={isRefetching}
                data-testid="button-refresh-vitals"
              >
                <RefreshCw className={cn("w-4 h-4 mr-2", isRefetching && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Last updated: {speedsterData?.capturedAt ? new Date(speedsterData.capturedAt).toLocaleString() : 'Never'}</span>
            </div>
            {speedsterData?.source && (
              <div className="flex items-center gap-1">
                <Info className="w-4 h-4" />
                <span>Source: {speedsterData.source}</span>
              </div>
            )}
            {speedsterData?.sampleCount && (
              <div className="flex items-center gap-1">
                <Activity className="w-4 h-4" />
                <span>{speedsterData.sampleCount} URLs tested</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      <div className="grid gap-4 md:grid-cols-3">
        {vitals.map((vital) => (
          vital.value !== null ? (
            <VitalCard key={vital.key} vital={vital} />
          ) : (
            <MissingDataCard 
              key={vital.key} 
              vital={vital.name} 
              reason={`${vital.name} data is not available from the Core Web Vitals worker.`}
            />
          )
        ))}
      </div>
      
      {speedsterData?.topUrls && speedsterData.topUrls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Affected Pages</CardTitle>
            <CardDescription>Pages with the slowest performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {speedsterData.topUrls.map((url: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm text-muted-foreground w-6">{i + 1}.</span>
                    <span className="text-sm truncate">{url.path || url.url}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">LCP: {url.lcp?.toFixed(2) || '—'}s</span>
                    <span className="text-muted-foreground">CLS: {url.cls?.toFixed(3) || '—'}</span>
                    <span className="text-muted-foreground">INP: {url.inp || '—'}ms</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
          <CardDescription>What you can do to improve performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <Button variant="outline" className="justify-start" data-testid="button-run-vitals-scan">
              <RefreshCw className="w-4 h-4 mr-2" />
              Run Vitals Scan
            </Button>
            <Button variant="outline" className="justify-start" data-testid="button-export-fix-pack">
              <ExternalLink className="w-4 h-4 mr-2" />
              Export Fix Pack
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
