export type MetricUnit = 
  | "count" 
  | "percent" 
  | "ms" 
  | "seconds" 
  | "usd" 
  | "score" 
  | "position"
  | "rate";

export type MetricShape = 
  | "single" 
  | "timeseries" 
  | "categorical" 
  | "distribution" 
  | "funnel" 
  | "table";

export type PreferredViz = 
  | "number" 
  | "sparkline" 
  | "line" 
  | "area" 
  | "bar" 
  | "stackedBar" 
  | "donut" 
  | "gauge" 
  | "table";

export interface MetricThresholds {
  good: number;
  warn: number;
  bad: number;
}

export interface MetricDataSource {
  crewId: string;
  endpoint: string;
  params?: Record<string, string>;
}

export interface MetricSpec {
  id: string;
  label: string;
  unit: MetricUnit;
  shape: MetricShape;
  preferredViz: PreferredViz;
  dimensions?: string[];
  series?: string[];
  thresholds?: MetricThresholds;
  dataSource?: MetricDataSource;
  trendIsGood?: "up" | "down";
  formatValue?: (value: number) => string;
}

export interface TimeSeriesPoint {
  t: string;
  v: number;
  [key: string]: string | number;
}

export interface CategoricalBreakdown {
  key: string;
  label?: string;
  v: number;
  color?: "primary" | "success" | "warning" | "danger" | "info" | "purple";
}

export interface TableRow {
  id: string;
  [key: string]: string | number | boolean;
}

export interface MetricDataMeta {
  status: "ok" | "empty" | "error" | "loading";
  updatedAt?: string;
  message?: string;
  actions?: Array<{ id: string; label: string; kind: string }>;
}

export interface MetricData {
  meta: MetricDataMeta;
  currentValue?: number | null;
  delta?: number | null;
  deltaLabel?: string;
  points?: TimeSeriesPoint[];
  breakdown?: CategoricalBreakdown[];
  rows?: TableRow[];
  series?: Array<{ key: string; label: string }>;
}

export function formatMetricValue(value: number | null | undefined, unit: MetricUnit): string {
  if (value === null || value === undefined) return "—";
  
  switch (unit) {
    case "count":
      return value >= 1000000 
        ? `${(value / 1000000).toFixed(1)}M`
        : value >= 1000 
        ? `${(value / 1000).toFixed(1)}K`
        : value.toLocaleString();
    case "percent":
    case "rate":
      return `${value.toFixed(1)}%`;
    case "ms":
      return value >= 1000 
        ? `${(value / 1000).toFixed(2)}s`
        : `${value.toFixed(0)}ms`;
    case "seconds":
      return `${value.toFixed(1)}s`;
    case "usd":
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case "score":
      return value.toFixed(0);
    case "position":
      return value.toFixed(1);
    default:
      return value.toLocaleString();
  }
}

export function inferVisualization(spec: MetricSpec, data: MetricData): PreferredViz {
  if (spec.preferredViz !== "number") return spec.preferredViz;
  
  if (data.points && data.points.length > 1) {
    return "sparkline";
  }
  
  if (data.breakdown && data.breakdown.length > 1 && data.breakdown.length <= 6) {
    return "donut";
  }
  
  if (data.breakdown && data.breakdown.length > 6) {
    return "bar";
  }
  
  if (data.rows && data.rows.length > 0) {
    return "table";
  }
  
  return "number";
}

export function getTrendColor(delta: number | null | undefined, trendIsGood: "up" | "down" = "up"): "success" | "danger" | "primary" {
  if (delta === null || delta === undefined || delta === 0) return "primary";
  
  const isPositive = delta > 0;
  const isGoodTrend = (trendIsGood === "up" && isPositive) || (trendIsGood === "down" && !isPositive);
  
  return isGoodTrend ? "success" : "danger";
}
