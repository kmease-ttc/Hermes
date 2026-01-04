import * as React from "react";
import { cn } from "@/lib/utils";
import { 
  GlassMetricCard, 
  GlassSparkline, 
  GlassLineChart, 
  GlassBarChart,
  GlassDonutChart 
} from "@/components/analytics";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import type { 
  MetricSpec, 
  MetricData, 
  PreferredViz 
} from "./MetricSpec";
import { formatMetricValue, inferVisualization, getTrendColor } from "./MetricSpec";

interface MetricWidgetProps {
  spec: MetricSpec;
  data: MetricData;
  className?: string;
  size?: "sm" | "md" | "lg";
  showSparkline?: boolean;
}

function MetricLoading({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const heightClass = size === "sm" ? "h-16" : size === "lg" ? "h-24" : "h-20";
  return (
    <div className={cn("rounded-xl border border-border/50 bg-card/60 p-4", heightClass)}>
      <Skeleton className="h-3 w-20 mb-2" />
      <Skeleton className="h-6 w-16" />
    </div>
  );
}

function MetricError({ message }: { message?: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-4 flex items-center gap-3">
      <AlertCircle className="w-5 h-5 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message || "Failed to load metric"}</p>
    </div>
  );
}

function MetricEmpty({ spec }: { spec: MetricSpec }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/60 p-4">
      <p className="text-xs text-muted-foreground mb-1">{spec.label}</p>
      <p className="text-2xl font-bold text-foreground">—</p>
      <p className="text-xs text-muted-foreground mt-1">No data available</p>
    </div>
  );
}

function NumberWidget({ 
  spec, 
  data, 
  size, 
  className,
  showSparkline = true 
}: MetricWidgetProps) {
  const formattedValue = spec.formatValue 
    ? spec.formatValue(data.currentValue ?? 0)
    : formatMetricValue(data.currentValue, spec.unit);
  
  const sparklineData = showSparkline && data.points 
    ? data.points.map(p => p.v) 
    : undefined;
  
  const trendColor = getTrendColor(data.delta, spec.trendIsGood);
  
  return (
    <GlassMetricCard
      label={spec.label}
      value={data.currentValue !== null && data.currentValue !== undefined ? formattedValue : "—"}
      delta={data.delta ?? undefined}
      deltaLabel={data.deltaLabel}
      trendIsGood={spec.trendIsGood !== "down"}
      sparklineData={sparklineData}
      sparklineColor={trendColor}
      size={size}
      className={className}
    />
  );
}

function SparklineWidget({ spec, data, className }: MetricWidgetProps) {
  if (!data.points || data.points.length === 0) {
    return <MetricEmpty spec={spec} />;
  }
  
  const formattedValue = spec.formatValue 
    ? spec.formatValue(data.currentValue ?? 0)
    : formatMetricValue(data.currentValue, spec.unit);
  
  const trendColor = getTrendColor(data.delta, spec.trendIsGood);
  
  return (
    <div className={cn(
      "rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm p-4",
      className
    )}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-1">{spec.label}</p>
          <p className="text-2xl font-bold text-foreground tabular-nums">
            {data.currentValue !== null && data.currentValue !== undefined ? formattedValue : "—"}
          </p>
          {data.delta !== undefined && data.delta !== null && (
            <p className={cn(
              "text-xs font-medium mt-1",
              trendColor === "success" ? "text-semantic-success" : 
              trendColor === "danger" ? "text-semantic-danger" : "text-muted-foreground"
            )}>
              {data.delta > 0 ? "+" : ""}{data.delta.toFixed(1)}%
              {data.deltaLabel && <span className="text-muted-foreground ml-1">{data.deltaLabel}</span>}
            </p>
          )}
        </div>
        <div className="w-24 h-10">
          <GlassSparkline
            data={data.points.map(p => p.v)}
            color={trendColor}
            showFill
            height={40}
          />
        </div>
      </div>
    </div>
  );
}

function LineChartWidget({ spec, data, className }: MetricWidgetProps) {
  if (!data.points || data.points.length === 0) {
    return <MetricEmpty spec={spec} />;
  }
  
  const chartData = data.points.map(p => ({
    date: p.t,
    value: p.v,
    ...p
  }));
  
  const seriesKeys = data.series?.map(s => s.key) || ["value"];
  const lines = seriesKeys.map((key, idx) => ({
    dataKey: key,
    label: data.series?.find(s => s.key === key)?.label || spec.label,
    color: (["primary", "purple", "info", "success"] as const)[idx % 4],
  }));
  
  return (
    <GlassLineChart
      data={chartData}
      lines={lines}
      xAxisKey="date"
      title={spec.label}
      height={180}
      showLegend={lines.length > 1}
      valueFormatter={(v) => formatMetricValue(v, spec.unit)}
      className={className}
    />
  );
}

function BarChartWidget({ spec, data, className }: MetricWidgetProps) {
  if (!data.breakdown || data.breakdown.length === 0) {
    return <MetricEmpty spec={spec} />;
  }
  
  const chartData = data.breakdown.map(b => ({
    name: b.label || b.key,
    value: b.v,
    color: b.color,
  }));
  
  return (
    <GlassBarChart
      data={chartData}
      title={spec.label}
      height={180}
      valueFormatter={(v) => formatMetricValue(v, spec.unit)}
      className={className}
    />
  );
}

function DonutChartWidget({ spec, data, className }: MetricWidgetProps) {
  if (!data.breakdown || data.breakdown.length === 0) {
    return <MetricEmpty spec={spec} />;
  }
  
  const chartData = data.breakdown.map(b => ({
    name: b.label || b.key,
    value: b.v,
    color: b.color,
  }));
  
  const total = data.breakdown.reduce((sum, b) => sum + b.v, 0);
  
  return (
    <GlassDonutChart
      data={chartData}
      title={spec.label}
      centerValue={formatMetricValue(total, spec.unit)}
      centerLabel="Total"
      height={160}
      valueFormatter={(v) => formatMetricValue(v, spec.unit)}
      className={className}
    />
  );
}

export function MetricWidget({ 
  spec, 
  data, 
  className, 
  size = "md",
  showSparkline = true 
}: MetricWidgetProps) {
  if (data.meta.status === "loading") {
    return <MetricLoading size={size} />;
  }
  
  if (data.meta.status === "error") {
    return <MetricError message={data.meta.message} />;
  }
  
  if (data.meta.status === "empty") {
    return <MetricEmpty spec={spec} />;
  }
  
  const viz = inferVisualization(spec, data);
  
  switch (viz) {
    case "sparkline":
      return <SparklineWidget spec={spec} data={data} className={className} size={size} showSparkline={showSparkline} />;
    case "line":
    case "area":
      return <LineChartWidget spec={spec} data={data} className={className} size={size} showSparkline={showSparkline} />;
    case "bar":
      return <BarChartWidget spec={spec} data={data} className={className} size={size} showSparkline={showSparkline} />;
    case "donut":
      return <DonutChartWidget spec={spec} data={data} className={className} size={size} showSparkline={showSparkline} />;
    case "number":
    default:
      return <NumberWidget spec={spec} data={data} className={className} size={size} showSparkline={showSparkline} />;
  }
}

export function MetricGrid({ 
  children, 
  columns = 4,
  className 
}: { 
  children: React.ReactNode; 
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  };
  
  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {children}
    </div>
  );
}
