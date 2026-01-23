import { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Info, 
  Clock,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface TopAction {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "default" | "outline" | "ghost";
}

export interface CrewTopActionsBarProps {
  status: "good" | "needs-improvement" | "poor" | "unknown";
  statusLabel?: string;
  lastUpdated?: string | Date | null;
  source?: string | null;
  sampleCount?: number | null;
  primaryActions?: TopAction[];
  secondaryActions?: TopAction[];
  className?: string;
}

const statusConfig = {
  good: {
    label: "All Passing",
    icon: CheckCircle,
    className: "text-semantic-success border-semantic-success-border bg-semantic-success-soft",
  },
  "needs-improvement": {
    label: "Needs Attention",
    icon: AlertTriangle,
    className: "text-semantic-warning border-semantic-warning-border bg-semantic-warning-soft",
  },
  poor: {
    label: "Needs Attention",
    icon: XCircle,
    className: "text-semantic-danger border-semantic-danger-border bg-semantic-danger-soft",
  },
  unknown: {
    label: "No Data",
    icon: Info,
    className: "text-muted-foreground border-border bg-muted",
  },
};

export function CrewTopActionsBar({
  status,
  statusLabel,
  lastUpdated,
  source,
  sampleCount,
  primaryActions = [],
  secondaryActions = [],
  className,
}: CrewTopActionsBarProps) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "Never";
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleString();
  };

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl border bg-card/60 backdrop-blur-sm",
        className
      )}
      data-testid="crew-top-actions-bar"
    >
      <div className="flex flex-wrap items-center gap-3">
        <Badge
          variant="outline"
          className={cn("text-xs px-2.5 py-1", config.className)}
        >
          <StatusIcon className="w-3.5 h-3.5 mr-1" />
          {statusLabel || config.label}
        </Badge>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {lastUpdated && (
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDate(lastUpdated)}</span>
            </div>
          )}
          {source && (
            <div className="flex items-center gap-1">
              <Info className="w-3.5 h-3.5" />
              <span>{source}</span>
            </div>
          )}
          {sampleCount && (
            <span className="text-muted-foreground/70">
              {sampleCount} URLs
            </span>
          )}
        </div>
      </div>

      {(primaryActions.length > 0 || secondaryActions.length > 0) && (
        <div className="flex items-center gap-2">
          {secondaryActions.map((action) => (
            <Button
              key={action.id}
              type="button"
              variant={action.variant || "ghost"}
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                action.onClick();
              }}
              disabled={action.disabled || action.loading}
              className="h-8 text-xs"
              data-testid={`button-${action.id}`}
            >
              {action.loading ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : action.icon ? (
                <span className="mr-1.5">{action.icon}</span>
              ) : null}
              {action.label}
            </Button>
          ))}
          {primaryActions.map((action) => (
            <Button
              key={action.id}
              type="button"
              variant={action.variant || "outline"}
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                action.onClick();
              }}
              disabled={action.disabled || action.loading}
              className="h-8 text-xs"
              data-testid={`button-${action.id}`}
            >
              {action.loading ? (
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : action.icon ? (
                <span className="mr-1.5">{action.icon}</span>
              ) : null}
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
