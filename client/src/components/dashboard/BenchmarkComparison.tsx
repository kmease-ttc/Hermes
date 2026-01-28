import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, BarChart3, Info, Lightbulb } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

interface BenchmarkMetric {
  metric: string;
  unit: string | null;
  actualValue: number | null;
  industryBaseline: number | null;
  delta: number | null;
  deltaPct: number | null;
  percentile: string;
  status: string;
  benchmarks: {
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  source: string | null;
  sourceYear: number | null;
}

interface ComparisonData {
  industry: string;
  siteId: string;
  dateRange: { start: string; end: string };
  comparison: BenchmarkMetric[];
  summary: {
    totalSessions: number;
    totalClicks: number;
    totalImpressions: number;
    avgCtr: string;
    avgPosition: string;
    conversionRate: string;
  };
}

const industryLabels: Record<string, string> = {
  psychiatry: "Psychiatry / Mental Health",
  healthcare: "Healthcare",
  general_seo: "General SEO (All Industries)",
  ecommerce: "E-commerce",
  saas: "SaaS",
  finance: "Finance",
  education: "Education",
  travel: "Travel & Hospitality",
  real_estate: "Real Estate",
  legal: "Legal",
};

const metricLabels: Record<string, string> = {
  sessions: "Sessions",
  clicks: "Clicks",
  impressions: "Impressions",
  organic_ctr: "Organic CTR",
  avg_position: "Avg. Position",
  bounce_rate: "Bounce Rate",
  session_duration: "Session Duration",
  pages_per_session: "Pages/Session",
  conversion_rate: "Conversion Rate",
  local_visibility: "Local Visibility",
  review_rating: "Review Rating",
  mobile_traffic: "Mobile Traffic",
  lcp: "LCP (Loading)",
  cls: "CLS (Stability)",
  inp: "INP (Interactivity)",
  ctr_position_1: "CTR Position #1",
  ctr_position_2: "CTR Position #2",
  ctr_position_3: "CTR Position #3",
  indexed_pages_ratio: "Indexed Pages",
};

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  good: { bg: "bg-semantic-success-soft", text: "text-semantic-success", label: "Good" },
  watch: { bg: "bg-semantic-warning-soft", text: "text-semantic-warning", label: "Watch" },
  needs_improvement: { bg: "bg-semantic-danger-soft", text: "text-semantic-danger", label: "Needs Improvement" },
  unknown: { bg: "bg-muted", text: "text-muted-foreground", label: "No Data" },
};

const percentileColors: Record<string, { bg: string; text: string; label: string }> = {
  excellent: { bg: "bg-semantic-success-soft", text: "text-semantic-success", label: "Excellent (Top 10%)" },
  above_average: { bg: "bg-semantic-success-soft", text: "text-semantic-success", label: "Above Average" },
  average: { bg: "bg-semantic-warning-soft", text: "text-semantic-warning", label: "Average" },
  below_average: { bg: "bg-gold-soft", text: "text-gold", label: "Below Average" },
  poor: { bg: "bg-semantic-danger-soft", text: "text-semantic-danger", label: "Needs Improvement" },
  unknown: { bg: "bg-muted", text: "text-muted-foreground", label: "No Data" },
};

function formatMetricValue(value: number | null, metric: string, unit: string | null): string {
  if (value === null) return "—";
  
  switch (unit) {
    case "percent":
      return `${value.toFixed(1)}%`;
    case "seconds":
      if (value >= 60) {
        const mins = Math.floor(value / 60);
        const secs = Math.round(value % 60);
        return `${mins}m ${secs}s`;
      }
      return `${Math.round(value)}s`;
    case "position":
      return `#${value.toFixed(1)}`;
    case "count":
      return value.toFixed(1);
    case "count_monthly":
      return value.toLocaleString();
    default:
      return typeof value === 'number' ? value.toLocaleString() : String(value);
  }
}

function formatDelta(delta: number | null, deltaPct: number | null, unit: string | null): string {
  if (delta === null || deltaPct === null) return "";
  const sign = delta >= 0 ? "+" : "";
  if (unit === "count_monthly") {
    return `${sign}${delta.toLocaleString()} (${sign}${deltaPct}%)`;
  }
  if (unit === "percent") {
    return `${sign}${delta.toFixed(1)}pp (${sign}${deltaPct}%)`;
  }
  if (unit === "position") {
    return `${sign}${delta.toFixed(1)} (${sign}${deltaPct}%)`;
  }
  return `${sign}${delta.toFixed(1)} (${sign}${deltaPct}%)`;
}

function formatDateRange(dateStr: string): string {
  if (!dateStr || dateStr.length < 8) return dateStr;
  const year = dateStr.slice(0, 4);
  const month = dateStr.slice(4, 6);
  const day = dateStr.slice(6, 8);
  return `${year}-${month}-${day}`;
}

function getImprovementSuggestion(metric: string, status: string, actualValue: number | null, benchmarks: BenchmarkMetric['benchmarks']): string | null {
  if (status === 'good' || status === 'unknown' || actualValue === null) return null;
  
  const suggestions: Record<string, { watch: string; needs_improvement: string }> = {
    sessions: {
      watch: "Boost content marketing and optimize for long-tail keywords to increase organic visibility",
      needs_improvement: "Focus on content gaps, fix technical SEO issues, and build quality backlinks"
    },
    clicks: {
      watch: "Improve meta titles and descriptions for better CTR in search results",
      needs_improvement: "Rewrite meta tags with action words, add schema markup for rich snippets"
    },
    impressions: {
      watch: "Expand keyword targeting and create more topic cluster content",
      needs_improvement: "Audit keyword strategy, target low-competition queries, fix indexing issues"
    },
    organic_ctr: {
      watch: "Test different meta descriptions with clear value propositions",
      needs_improvement: "Add FAQ schema, power words in titles, and ensure titles match search intent"
    },
    avg_position: {
      watch: "Strengthen internal linking and update content with fresh information",
      needs_improvement: "Improve E-E-A-T signals, build topical authority, and earn quality backlinks"
    },
    bounce_rate: {
      watch: "Improve page load speed and ensure content matches search intent",
      needs_improvement: "Redesign above-the-fold content, add clear CTAs, improve mobile experience"
    },
    session_duration: {
      watch: "Add engaging multimedia content and improve internal linking",
      needs_improvement: "Create deeper content, add videos/infographics, improve navigation"
    },
    pages_per_session: {
      watch: "Add related content widgets and improve navigation structure",
      needs_improvement: "Implement better internal linking, add \"related articles\" sections"
    },
    conversion_rate: {
      watch: "A/B test CTAs and simplify conversion paths",
      needs_improvement: "Redesign landing pages, reduce form friction, add trust signals"
    },
    lcp: {
      watch: "Optimize hero images and preload critical resources",
      needs_improvement: "Compress images, enable CDN caching, defer non-critical JavaScript"
    },
    cls: {
      watch: "Set explicit dimensions for images and ads",
      needs_improvement: "Reserve space for dynamic content, avoid inserting elements above existing content"
    },
    inp: {
      watch: "Split long tasks and optimize JavaScript execution",
      needs_improvement: "Reduce third-party scripts, use web workers, optimize event handlers"
    },
    local_visibility: {
      watch: "Optimize Google Business Profile and encourage customer reviews",
      needs_improvement: "Build local citations, create location-specific pages, earn local backlinks"
    },
    review_rating: {
      watch: "Follow up with satisfied customers for reviews",
      needs_improvement: "Implement review management system, respond to all reviews professionally"
    },
    mobile_traffic: {
      watch: "Ensure mobile-first design and fast mobile load times",
      needs_improvement: "Audit mobile UX, fix mobile usability issues in Search Console"
    },
  };
  
  const metricSuggestions = suggestions[metric];
  if (!metricSuggestions) return null;
  
  if (status === 'needs_improvement') {
    return metricSuggestions.needs_improvement;
  }
  if (status === 'watch') {
    return metricSuggestions.watch;
  }
  
  return null;
}

function getNextLevelTarget(metric: string, actualValue: number | null, benchmarks: BenchmarkMetric['benchmarks'], status: string): string | null {
  if (actualValue === null || status === 'good') return null;
  
  const isLowerBetter = ['avg_position', 'bounce_rate', 'lcp', 'cls', 'inp'].includes(metric);
  
  if (isLowerBetter) {
    if (actualValue > benchmarks.p50) {
      return `Target: ${benchmarks.p50.toFixed(1)} (industry median)`;
    } else if (actualValue > benchmarks.p75) {
      return `Target: ${benchmarks.p75.toFixed(1)} (top 25%)`;
    }
  } else {
    if (actualValue < benchmarks.p50) {
      return `Target: ${benchmarks.p50.toFixed(1)} (industry median)`;
    } else if (actualValue < benchmarks.p75) {
      return `Target: ${benchmarks.p75.toFixed(1)} (top 25%)`;
    }
  }
  
  return null;
}

function PercentileBar({ value, benchmarks, metric, unit }: { 
  value: number | null; 
  benchmarks: BenchmarkMetric['benchmarks'];
  metric: string;
  unit: string | null;
}) {
  if (value === null) return null;
  
  const isLowerBetter = ['avg_position', 'bounce_rate', 'lcp', 'cls', 'inp'].includes(metric);
  const min = isLowerBetter ? benchmarks.p90 * 0.5 : 0;
  const max = isLowerBetter ? benchmarks.p25 * 1.5 : benchmarks.p90 * 1.2;
  const range = max - min;
  
  const getPosition = (val: number) => {
    const pos = ((val - min) / range) * 100;
    const clampedPos = Math.max(0, Math.min(100, pos));
    const dotRadiusPercent = 5;
    return Math.max(dotRadiusPercent, Math.min(100 - dotRadiusPercent, clampedPos));
  };
  
  return (
    <div className="relative mt-2 mb-1">
      <div className="relative h-2 rounded-full overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-semantic-danger-soft via-semantic-warning-soft to-semantic-success-soft" 
             style={{ transform: isLowerBetter ? 'scaleX(-1)' : 'none' }} />
      </div>
      <div 
        className="absolute top-1/2 w-3 h-3 bg-semantic-info border-2 border-white rounded-full shadow-md"
        style={{ 
          left: `${getPosition(value)}%`,
          transform: 'translate(-50%, -50%)',
          marginTop: '-3px'
        }}
      />
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>P25: {formatMetricValue(benchmarks.p25, metric, unit)}</span>
        <span>P50: {formatMetricValue(benchmarks.p50, metric, unit)}</span>
        <span>P90: {formatMetricValue(benchmarks.p90, metric, unit)}</span>
      </div>
    </div>
  );
}

function MetricCard({ data }: { data: BenchmarkMetric }) {
  const statusStyle = statusColors[data.status] || statusColors.unknown;
  const isLowerBetter = ['avg_position', 'bounce_rate'].includes(data.metric);
  
  const suggestion = getImprovementSuggestion(data.metric, data.status, data.actualValue, data.benchmarks);
  const nextTarget = getNextLevelTarget(data.metric, data.actualValue, data.benchmarks, data.status);
  
  const getIcon = () => {
    if (data.actualValue === null) return <Minus className="w-4 h-4" />;
    
    if (data.status === 'good') {
      return <TrendingUp className="w-4 h-4 text-semantic-success" />;
    }
    if (data.status === 'needs_improvement') {
      return <TrendingDown className="w-4 h-4 text-semantic-danger" />;
    }
    return <Minus className="w-4 h-4 text-semantic-warning" />;
  };
  
  const getDeltaColor = () => {
    if (data.delta === null) return "text-muted-foreground";
    const isPositive = data.delta >= 0;
    if (isLowerBetter) {
      return isPositive ? "text-semantic-danger" : "text-semantic-success";
    }
    return isPositive ? "text-semantic-success" : "text-semantic-danger";
  };
  
  return (
    <div className="w-full p-4 bg-white rounded-xl border border-border shadow-[0_1px_3px_rgba(0,0,0,0.04),0_6px_24px_-4px_rgba(0,0,0,0.08)] transition-all hover:-translate-y-0.5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-foreground">
          {metricLabels[data.metric] || data.metric}
        </span>
        <Badge className={`${statusStyle.bg} ${statusStyle.text} border-0 text-xs`}>
          {statusStyle.label}
        </Badge>
      </div>
      
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-2xl font-bold text-foreground">
            {formatMetricValue(data.actualValue, data.metric, data.unit)}
          </p>
          <p className="text-xs text-muted-foreground">Your site</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">
            Industry: {formatMetricValue(data.industryBaseline, data.metric, data.unit)}
          </p>
          {data.delta !== null && (
            <p className={`text-sm font-medium ${getDeltaColor()}`}>
              {formatDelta(data.delta, data.deltaPct, data.unit)}
            </p>
          )}
        </div>
      </div>
      
      <PercentileBar 
        value={data.actualValue} 
        benchmarks={data.benchmarks} 
        metric={data.metric}
        unit={data.unit}
      />
      
      {suggestion && (
        <div className="mt-3 p-2.5 bg-semantic-info-soft/50 rounded-md border border-semantic-info-border/30">
          <div className="flex items-start gap-2">
            <Lightbulb className="w-4 h-4 text-semantic-info mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground leading-relaxed">{suggestion}</p>
              {nextTarget && (
                <p className="text-xs text-semantic-info font-medium mt-1">{nextTarget}</p>
              )}
            </div>
          </div>
        </div>
      )}
      
      {data.source && (
        <p className="text-xs text-muted-foreground mt-2 italic">
          {data.source} ({data.sourceYear}) — estimated
        </p>
      )}
    </div>
  );
}

export function BenchmarkComparison() {
  const [selectedIndustry, setSelectedIndustry] = useState<string>("psychiatry");
  
  const { data: industriesData, isLoading: industriesLoading } = useQuery({
    queryKey: ['benchmark-industries'],
    queryFn: async () => {
      const res = await fetch('/api/benchmarks/industries');
      if (!res.ok) throw new Error('Failed to fetch industries');
      return res.json();
    },
  });
  
  const { data: comparisonData, isLoading: comparisonLoading, error } = useQuery<ComparisonData>({
    queryKey: ['benchmark-comparison', selectedIndustry],
    queryFn: async () => {
      const res = await fetch(`/api/benchmarks/compare?industry=${selectedIndustry}`);
      if (!res.ok) {
        if (res.status === 404) {
          const { seedBenchmarks } = await fetch('/api/benchmarks/seed', { method: 'POST' })
            .then(r => r.json());
          const retry = await fetch(`/api/benchmarks/compare?industry=${selectedIndustry}`);
          if (!retry.ok) throw new Error('Failed to fetch comparison');
          return retry.json();
        }
        throw new Error('Failed to fetch comparison');
      }
      return res.json();
    },
    enabled: !!selectedIndustry,
  });
  
  const industries = industriesData?.industries || Object.keys(industryLabels);
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Industry Benchmarks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Unable to load benchmark comparison. Run diagnostics to collect data first.</p>
        </CardContent>
      </Card>
    );
  }
  
  const relevantMetrics = comparisonData?.comparison.filter(c => c.actualValue !== null) || [];
  const hasData = relevantMetrics.length > 0;
  
  return (
    <Card data-testid="card-benchmark-comparison">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-semantic-info" />
              Compare to Industry Benchmarks
            </CardTitle>
            <CardDescription>
              See how your site performs compared to industry averages
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
              <SelectTrigger className="w-[180px]" data-testid="select-industry">
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {industries.map((industry: string) => (
                  <SelectItem key={industry} value={industry}>
                    {industryLabels[industry] || industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-4 h-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Benchmarks are based on industry research data. Your actual metrics are compared against 25th, 50th, 75th, and 90th percentile values.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {comparisonLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : !hasData ? (
          <div className="text-center py-8">
            <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">
              No performance data available yet. Run diagnostics to collect metrics.
            </p>
          </div>
        ) : (
          <>
            {comparisonData?.dateRange && (
              <p className="text-xs text-muted-foreground mb-4 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-muted rounded text-xs">
                  {formatDateRange(comparisonData.dateRange.start)} — {formatDateRange(comparisonData.dateRange.end)}
                </span>
                <span>Industry baseline: {industryLabels[selectedIndustry] || selectedIndustry} (estimated)</span>
              </p>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {comparisonData?.comparison.map((metric) => (
                <MetricCard key={metric.metric} data={metric} />
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
