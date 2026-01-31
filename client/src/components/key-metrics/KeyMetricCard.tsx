import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { ReactNode } from "react";
import { useOptionalCrewTheme } from "@/components/crew/CrewPageLayout";
import { GlassSparkline } from "@/components/analytics";

interface KeyMetricCardProps {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  iconNode?: ReactNode;
  status?: "primary" | "good" | "warning" | "neutral" | "inactive" | string;
  accentColor?: string;
  className?: string;
  delta?: number | null;
  deltaLabel?: string;
  trendIsGood?: "up" | "down";
  sparklineData?: number[];
}

const statusStyles = {
  primary: {
    border: "border-[var(--color-purple)]/30",
    glow: "shadow-[0_0_20px_-5px_rgba(147,51,234,0.3)]",
    accent: "bg-purple-accent",
    text: "text-purple-accent",
    iconBg: "bg-[var(--color-purple)]/10",
  },
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
  iconNode,
  status = "primary",
  accentColor,
  className,
  delta,
  deltaLabel,
  trendIsGood = "up",
  sparklineData,
}: KeyMetricCardProps) {
  const crewTheme = useOptionalCrewTheme();
  const isZero = value === 0 || value === "0";
  const effectiveStatus = isZero ? "inactive" : status;
  const effectiveStyles = statusStyles[effectiveStatus];

  const dynamicStyles = (crewTheme || accentColor) && !isZero ? {
    border: { borderColor: crewTheme ? "var(--crew-ring)" : `${accentColor}30` },
    glow: { boxShadow: crewTheme ? "0 0 20px -5px var(--crew-ring)" : `0 0 20px -5px ${accentColor}30` },
    accent: { backgroundColor: crewTheme ? "var(--crew-primary)" : accentColor },
    iconBg: { backgroundColor: crewTheme ? "var(--crew-bg)" : `${accentColor}15` },
    iconColor: { color: crewTheme ? "var(--crew-text)" : accentColor },
  } : null;

  const hasDelta = delta !== undefined && delta !== null;
  const isPositiveDelta = hasDelta && delta > 0;
  const isNegativeDelta = hasDelta && delta < 0;
  const isGoodTrend = (trendIsGood === "up" && isPositiveDelta) || (trendIsGood === "down" && isNegativeDelta);
  const isBadTrend = (trendIsGood === "up" && isNegativeDelta) || (trendIsGood === "down" && isPositiveDelta);

  const TrendIcon = isPositiveDelta ? TrendingUp : isNegativeDelta ? TrendingDown : Minus;
  const trendColor = isGoodTrend ? "text-semantic-success" : isBadTrend ? "text-semantic-danger" : "text-muted-foreground";
  const sparklineColor = isGoodTrend ? "success" : isBadTrend ? "danger" : "primary";

  return (
    <div
      className={cn(
        "relative rounded-2xl bg-card/80 backdrop-blur-sm p-5",
        "border",
        !dynamicStyles && effectiveStyles.border,
        !dynamicStyles && effectiveStyles.glow,
        "transition-all duration-300 hover:scale-[1.02]",
        className
      )}
      style={dynamicStyles ? { ...dynamicStyles.border, ...dynamicStyles.glow } : undefined}
      data-testid={`metric-${label.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div 
        className={cn(
          "absolute top-0 left-4 right-4 h-0.5 rounded-full",
          !dynamicStyles && effectiveStyles.accent
        )}
        style={dynamicStyles?.accent}
      />
      
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
          {hasDelta && (
            <div className={cn("flex items-center gap-1 mt-2", trendColor)}>
              <TrendIcon className="w-3 h-3" />
              <span className="text-xs font-medium tabular-nums">
                {isPositiveDelta ? "+" : ""}{delta.toFixed(1)}%
              </span>
              {deltaLabel && (
                <span className="text-xs text-muted-foreground ml-1">{deltaLabel}</span>
              )}
            </div>
          )}
        </div>
        
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {sparklineData && sparklineData.length > 1 && (
            <div className="w-16 h-8">
              <GlassSparkline
                data={sparklineData}
                color={sparklineColor}
                showFill
                height={32}
              />
            </div>
          )}
          
          {(Icon || iconNode) && !sparklineData && (
            <div 
              className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                !dynamicStyles && effectiveStyles.iconBg
              )}
              style={dynamicStyles?.iconBg}
            >
              {iconNode ? (
                iconNode
              ) : Icon ? (
                <Icon 
                  className={cn("w-5 h-5", !dynamicStyles && effectiveStyles.text)} 
                  style={dynamicStyles?.iconColor}
                />
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
