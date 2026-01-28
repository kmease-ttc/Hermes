import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Info, ArrowRight, BarChart3, Calendar, Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { BenchmarkComparison } from "@/components/dashboard/BenchmarkComparison";

const dateRange = {
  from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
  to: new Date().toLocaleDateString(),
};

interface BenchmarkMetric {
  id: string;
  label: string;
  yourValue: number;
  industryAvg: number;
  topPerformers: number;
  unit: string;
  higherIsBetter: boolean;
}

const benchmarkData: BenchmarkMetric[] = [
  {
    id: "conversion-rate",
    label: "Conversion Rate",
    yourValue: 3.2,
    industryAvg: 2.8,
    topPerformers: 5.2,
    unit: "%",
    higherIsBetter: true,
  },
  {
    id: "bounce-rate",
    label: "Bounce Rate",
    yourValue: 42,
    industryAvg: 45,
    topPerformers: 32,
    unit: "%",
    higherIsBetter: false,
  },
  {
    id: "avg-session-duration",
    label: "Avg Session Duration",
    yourValue: 2.5,
    industryAvg: 2.1,
    topPerformers: 3.8,
    unit: "min",
    higherIsBetter: true,
  },
  {
    id: "pages-per-session",
    label: "Pages Per Session",
    yourValue: 3.2,
    industryAvg: 2.8,
    topPerformers: 4.5,
    unit: "",
    higherIsBetter: true,
  },
  {
    id: "organic-ctr",
    label: "Organic CTR",
    yourValue: 4.8,
    industryAvg: 3.5,
    topPerformers: 7.2,
    unit: "%",
    higherIsBetter: true,
  },
  {
    id: "page-speed",
    label: "Page Load Time",
    yourValue: 2.8,
    industryAvg: 3.2,
    topPerformers: 1.5,
    unit: "s",
    higherIsBetter: false,
  },
];

function getPerformanceStatus(metric: BenchmarkMetric): "good" | "average" | "poor" {
  const { yourValue, industryAvg, topPerformers, higherIsBetter } = metric;
  if (higherIsBetter) {
    if (yourValue >= topPerformers * 0.8) return "good";
    if (yourValue >= industryAvg) return "average";
    return "poor";
  } else {
    if (yourValue <= topPerformers * 1.2) return "good";
    if (yourValue <= industryAvg) return "average";
    return "poor";
  }
}

function getPercentileLabel(metric: BenchmarkMetric): string {
  const { yourValue, industryAvg, topPerformers, higherIsBetter } = metric;
  if (higherIsBetter) {
    if (yourValue >= topPerformers * 0.9) return "P90+";
    if (yourValue >= industryAvg * 1.2) return "P75";
    if (yourValue >= industryAvg) return "P50";
    return "P25";
  } else {
    if (yourValue <= topPerformers * 1.1) return "P90+";
    if (yourValue <= industryAvg * 0.8) return "P75";
    if (yourValue <= industryAvg) return "P50";
    return "P25";
  }
}

function BenchmarkCard({ metric }: { metric: BenchmarkMetric }) {
  const status = getPerformanceStatus(metric);
  const percentile = getPercentileLabel(metric);
  
  const cardStyles = {
    good: { glow: 'shadow-[0_1px_3px_rgba(34,197,94,0.08),0_8px_28px_-4px_rgba(34,197,94,0.18),0_0_0_1px_rgba(34,197,94,0.06)]', border: 'border-semantic-success-border', badgeBg: 'bg-semantic-success-soft', badgeText: 'text-semantic-success', lineColor: '#22C55E' },
    average: { glow: 'shadow-[0_1px_3px_rgba(234,179,8,0.08),0_8px_28px_-4px_rgba(234,179,8,0.18),0_0_0_1px_rgba(234,179,8,0.06)]', border: 'border-semantic-warning-border', badgeBg: 'bg-semantic-warning-soft', badgeText: 'text-semantic-warning', lineColor: '#EAB308' },
    poor: { glow: 'shadow-[0_1px_3px_rgba(239,68,68,0.08),0_8px_28px_-4px_rgba(239,68,68,0.18),0_0_0_1px_rgba(239,68,68,0.06)]', border: 'border-semantic-danger-border', badgeBg: 'bg-semantic-danger-soft', badgeText: 'text-semantic-danger', lineColor: '#EF4444' },
  };
  const styles = cardStyles[status];

  const vsIndustry = metric.higherIsBetter
    ? ((metric.yourValue - metric.industryAvg) / metric.industryAvg) * 100
    : ((metric.industryAvg - metric.yourValue) / metric.industryAvg) * 100;

  const TrendIcon = vsIndustry > 5 ? TrendingUp : vsIndustry < -5 ? TrendingDown : Minus;
  const trendColor = vsIndustry > 0 ? 'text-semantic-success' : vsIndustry < 0 ? 'text-semantic-danger' : 'text-muted-foreground';

  const statusLabels = {
    good: "Good",
    average: "Watch", 
    poor: "Needs Improvement"
  };

  return (
    <Card
      className={cn("transition-all overflow-hidden rounded-2xl bg-white border hover:-translate-y-0.5", styles.border, styles.glow)}
      data-testid={`benchmark-${metric.id}`}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-1">
          <span className="text-base font-semibold text-foreground">{metric.label}</span>
          <Badge className={cn("text-xs font-medium px-3 py-1 rounded-full", styles.badgeBg, styles.badgeText)}>
            {statusLabels[status]}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{dateRange.from} – {dateRange.to}</p>
        
        <div className="flex items-baseline gap-3 mb-4">
          <span className="text-4xl font-bold text-foreground">{metric.yourValue}{metric.unit}</span>
          <span className={cn("text-base flex items-center gap-1 font-medium", trendColor)}>
            <TrendIcon className="w-4 h-4" />
            {Math.abs(vsIndustry).toFixed(0)}%
          </span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-muted/30">
            <span className="text-muted-foreground">Industry Avg (P50)</span>
            <span className="font-medium text-foreground">{metric.industryAvg}{metric.unit}</span>
          </div>
          <div className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-muted/30">
            <span className="text-muted-foreground">Top Performers (P90)</span>
            <span className="font-medium text-foreground">{metric.topPerformers}{metric.unit}</span>
          </div>
          <div className="flex items-center justify-between py-1.5 px-2 rounded-lg" style={{ backgroundColor: `${styles.lineColor}15` }}>
            <span className="text-muted-foreground">Your Percentile</span>
            <Badge className={cn("text-xs", styles.badgeBg, styles.badgeText)}>{percentile}</Badge>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground">
            {status === "good" ? "You're outperforming most competitors in this metric." : 
             status === "average" ? "You're on par with industry average. Room for improvement." :
             "This metric needs attention to stay competitive."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Benchmarks() {
  return (
    <DashboardLayout className="dashboard-light">
      <div className="space-y-6" data-testid="benchmarks-page">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-foreground">
              <BarChart3 className="w-7 h-7 text-primary" />
              Industry Benchmarks
            </h1>
            <p className="text-muted-foreground text-sm">Compare your performance against psychiatry clinic averages</p>
          </div>
          <Link href="/">
            <Button variant="outline" className="border-border text-foreground hover:bg-muted rounded-xl" data-testid="btn-back-dashboard">
              Back to Mission Control <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        <Card className="glass-panel border-purple shadow-purple">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-soft flex items-center justify-center">
                <Info className="w-5 h-5 text-purple-accent" />
              </div>
              <div>
                <CardTitle className="text-lg text-foreground">About These Benchmarks</CardTitle>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Calendar className="w-3 h-3" />
                  <span>Comparing {dateRange.from} – {dateRange.to}</span>
                  <span>•</span>
                  <Target className="w-3 h-3" />
                  <span>Psychiatry & Mental Health Clinics</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              These benchmarks are based on aggregated data from psychiatry and mental health clinic websites.
              <strong className="text-foreground"> P50</strong> = Industry Median, <strong className="text-foreground">P90</strong> = Top 10% of sites.
              Your percentile shows where you rank compared to peers.
            </p>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Key Metrics</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {benchmarkData.map((metric) => (
              <BenchmarkCard key={metric.id} metric={metric} />
            ))}
          </div>
        </div>

        <BenchmarkComparison />
      </div>
    </DashboardLayout>
  );
}
