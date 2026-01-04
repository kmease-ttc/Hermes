import { Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "./tooltip";

interface MissionBadgeProps {
  open: number;
  total?: number;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
  accentColor?: string;
}

export function MissionBadge({
  open,
  total,
  size = "md",
  showTooltip = true,
  className,
  accentColor,
}: MissionBadgeProps) {
  const sizeClasses = {
    sm: "text-xs gap-1",
    md: "text-sm gap-1.5",
    lg: "text-base gap-2",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5",
  };

  const isActive = open > 0;
  const displayText = total !== undefined ? `${open}/${total}` : `${open}`;

  const badge = (
    <div
      className={cn(
        "inline-flex items-center font-medium",
        sizeClasses[size],
        isActive ? "text-gold" : "text-muted-foreground/60",
        className
      )}
      style={accentColor ? { color: isActive ? accentColor : undefined } : undefined}
      data-testid="mission-badge"
    >
      <Target
        className={cn(
          iconSizes[size],
          isActive ? "text-gold" : "text-muted-foreground/40"
        )}
        style={accentColor && isActive ? { color: accentColor } : undefined}
      />
      <span>{displayText}</span>
    </div>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {open === 0
              ? "No open missions"
              : `${open} open mission${open !== 1 ? "s" : ""} to complete`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface ScorePillProps {
  value: number | null;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  className?: string;
}

export function ScorePill({
  value,
  size = "md",
  showTooltip = true,
  className,
}: ScorePillProps) {
  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
    lg: "text-base px-3 py-1.5",
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "bg-muted text-muted-foreground";
    if (score >= 80) return "bg-semantic-success-soft text-semantic-success";
    if (score >= 50) return "bg-semantic-info-soft text-semantic-info";
    return "bg-semantic-warning-soft text-semantic-warning";
  };

  const displayValue = value !== null ? value : "—";

  const pill = (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-semibold rounded-full",
        sizeClasses[size],
        getScoreColor(value),
        className
      )}
      data-testid="score-pill"
    >
      Score {displayValue}
    </span>
  );

  if (!showTooltip) {
    return pill;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{pill}</TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            {value !== null
              ? "Score measures how healthy this area is (0-100)"
              : "Not enough data yet to calculate score"}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
