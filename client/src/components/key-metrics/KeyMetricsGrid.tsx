import { cn } from "@/lib/utils";
import { KeyMetricCard } from "./KeyMetricCard";
import { LucideIcon } from "lucide-react";

interface MetricConfig {
  id: string;
  label: string;
  value: number | string;
  icon?: LucideIcon;
  status?: "good" | "warning" | "neutral" | "inactive";
}

interface KeyMetricsGridProps {
  metrics: MetricConfig[];
  accentColor?: string;
  className?: string;
}

export function KeyMetricsGrid({ metrics, accentColor, className }: KeyMetricsGridProps) {
  return (
    <div className={cn(
      "grid gap-4",
      "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
      className
    )}>
      {metrics.map((metric) => (
        <KeyMetricCard
          key={metric.id}
          label={metric.label}
          value={metric.value}
          icon={metric.icon}
          status={metric.status}
          accentColor={accentColor}
        />
      ))}
    </div>
  );
}
