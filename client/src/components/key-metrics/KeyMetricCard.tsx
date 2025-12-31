import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KeyMetricCardProps {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  status?: "good" | "warning" | "neutral" | "inactive";
  accentColor?: string;
  className?: string;
}

const statusStyles = {
  good: {
    border: "border-semantic-success/30",
    glow: "shadow-[0_0_20px_-5px_rgba(34,197,94,0.3)]",
    accent: "bg-semantic-success",
    text: "text-semantic-success",
    iconBg: "bg-semantic-success/10",
  },
  warning: {
    border: "border-semantic-warning/30",
    glow: "shadow-[0_0_20px_-5px_rgba(234,179,8,0.3)]",
    accent: "bg-semantic-warning",
    text: "text-semantic-warning",
    iconBg: "bg-semantic-warning/10",
  },
  neutral: {
    border: "border-border",
    glow: "",
    accent: "bg-muted-foreground",
    text: "text-muted-foreground",
    iconBg: "bg-muted/50",
  },
  inactive: {
    border: "border-border/50",
    glow: "",
    accent: "bg-muted-foreground/50",
    text: "text-muted-foreground/70",
    iconBg: "bg-muted/30",
  },
};

export function KeyMetricCard({ 
  label, 
  value, 
  icon: Icon, 
  status = "good",
  className 
}: KeyMetricCardProps) {
  const isZero = value === 0 || value === "0";
  const effectiveStatus = isZero ? "inactive" : status;
  const effectiveStyles = statusStyles[effectiveStatus];

  return (
    <div
      className={cn(
        "relative rounded-2xl bg-card/80 backdrop-blur-sm p-5",
        "border",
        effectiveStyles.border,
        effectiveStyles.glow,
        "transition-all duration-300 hover:scale-[1.02]",
        className
      )}
      data-testid={`metric-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className={cn(
        "absolute top-0 left-4 right-4 h-0.5 rounded-full",
        effectiveStyles.accent
      )} />
      
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-3xl font-bold tracking-tight",
            isZero ? "text-muted-foreground/60" : "text-foreground"
          )}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          <p className="text-sm text-muted-foreground mt-1 truncate">
            {label}
          </p>
        </div>
        
        {Icon && (
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
            effectiveStyles.iconBg
          )}>
            <Icon className={cn("w-5 h-5", effectiveStyles.text)} />
          </div>
        )}
      </div>
    </div>
  );
}
