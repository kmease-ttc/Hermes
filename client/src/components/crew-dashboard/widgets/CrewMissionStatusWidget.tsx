import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  ArrowRight,
  ExternalLink,
  Wrench,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MissionStatusState, WidgetState } from "../types";

interface CrewMissionStatusWidgetProps {
  status: MissionStatusState;
  state?: WidgetState;
  onFixEverything?: () => void;
  onRetry?: () => void;
  isFixing?: boolean;
  lastPrUrl?: string | null;
}

const statusConfig = {
  looking_good: {
    label: "Looking good",
    icon: CheckCircle2,
    badgeClass: "bg-semantic-success-soft text-semantic-success border-semantic-success-border",
  },
  doing_okay: {
    label: "Doing okay",
    icon: CheckCircle2,
    badgeClass: "bg-semantic-info-soft text-semantic-info border-semantic-info-border",
  },
  needs_attention: {
    label: "Needs attention",
    icon: AlertTriangle,
    badgeClass: "bg-semantic-warning-soft text-semantic-warning border-semantic-warning-border",
  },
};

function StatusSkeleton() {
  return (
    <Card className="bg-card/60 backdrop-blur-md border-border rounded-2xl overflow-hidden">
      <CardContent className="p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-24 rounded-full" />
            </div>
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-36" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusUnavailable({ onRetry }: { onRetry?: () => void }) {
  return (
    <Card className="bg-muted/30 border-border rounded-2xl overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">Status temporarily unavailable</p>
              <p className="text-sm text-muted-foreground">
                We couldn't load mission status. This may be a temporary issue.
              </p>
            </div>
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Retry
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function CrewMissionStatusWidget({
  status,
  state = "ready",
  onFixEverything,
  onRetry,
  isFixing = false,
  lastPrUrl,
}: CrewMissionStatusWidgetProps) {
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  if (state === "loading") {
    return <StatusSkeleton />;
  }

  if (state === "unavailable") {
    return <StatusUnavailable onRetry={onRetry} />;
  }

  const config = statusConfig[status.tier];
  const StatusIcon = config.icon;

  const hasPerformanceScore = status.performanceScore !== undefined;
  const scoreValue = status.performanceScore;
  const scoreColor = scoreValue === null 
    ? "text-muted-foreground" 
    : scoreValue >= 90 
      ? "text-semantic-success" 
      : scoreValue >= 50 
        ? "text-gold" 
        : "text-semantic-danger";

  return (
    <>
      <Card
        className="bg-card/60 backdrop-blur-md border-border rounded-2xl overflow-hidden"
        style={{
          boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.05), 0 4px 24px -8px rgba(0,0,0,0.3)",
        }}
        data-testid="crew-mission-status-widget"
      >
        <div className="flex items-stretch">
          {/* Left: Performance Score Block - anchored, full height */}
          {hasPerformanceScore && (
            <div 
              className="w-24 shrink-0 flex flex-col items-center justify-center bg-muted/40 rounded-l-2xl border-r border-border/50"
              style={{
                background: "linear-gradient(135deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.08) 100%)",
              }}
              data-testid={scoreValue === null ? "score-block-performance-empty" : "score-block-performance"}
            >
              <div className="flex flex-col items-center justify-center py-5">
                <div 
                  className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center",
                    "ring-2 ring-offset-2 ring-offset-transparent",
                    scoreValue === null 
                      ? "bg-muted/60 ring-muted-foreground/30"
                      : scoreValue >= 90 
                        ? "bg-semantic-success-soft ring-semantic-success-border" 
                        : scoreValue >= 50 
                          ? "bg-gold/15 ring-gold/40" 
                          : "bg-semantic-danger-soft ring-semantic-danger-border"
                  )}
                >
                  <span className={cn("text-2xl font-bold leading-none", scoreColor)}>
                    {scoreValue === null ? "—" : Math.round(scoreValue)}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-muted-foreground mt-2 tracking-wide">
                  Performance
                </span>
              </div>
            </div>
          )}

          {/* Middle + Right: Main content area */}
          <div className="flex-1 flex items-center justify-between gap-4 p-5">
            {/* Center: Status Content Block */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-base font-semibold text-foreground leading-tight">
                  Mission Status
                </h2>
                <Badge
                  variant="outline"
                  className={cn("text-xs px-2 py-0.5 border", config.badgeClass)}
                >
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {config.label}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground leading-snug">{status.summaryLine}</p>

              <div className="flex items-center gap-1.5 text-sm">
                <ArrowRight className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-foreground/80 font-medium">Next:</span>
                <span className="text-muted-foreground truncate">{status.nextStep}</span>
              </div>

              {status.priorityCount - status.autoFixableCount > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
                  <AlertCircle className="w-3 h-3" />
                  Some items require manual setup ({status.priorityCount - status.autoFixableCount})
                </p>
              )}
            </div>

            {/* Right: Action Button */}
            <div className="flex items-center shrink-0">
              {lastPrUrl ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border text-foreground hover:bg-muted rounded-xl"
                  onClick={() => window.open(lastPrUrl, "_blank")}
                  data-testid="button-view-pr"
                >
                  <ExternalLink className="w-4 h-4 mr-1.5" />
                  View PR
                </Button>
              ) : (
                <Button
                  variant="gold"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setConfirmModalOpen(true)}
                  disabled={isFixing || status.autoFixableCount === 0}
                  data-testid="button-fix-everything"
                >
                  {isFixing ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <Wrench className="w-4 h-4 mr-1.5" />
                  )}
                  Fix Everything
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-gold" />
              Confirm Fix Everything
            </DialogTitle>
            <DialogDescription>
              This will create a PR with {status.autoFixableCount} auto-fixable items.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              {status.autoFixableCount} items will be fixed automatically.
              {status.priorityCount - status.autoFixableCount > 0 && (
                <> {status.priorityCount - status.autoFixableCount} items require manual attention.</>
              )}
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmModalOpen(false)}
              className="rounded-xl"
              data-testid="button-cancel-fix"
            >
              Cancel
            </Button>
            <Button
              variant="gold"
              onClick={() => {
                onFixEverything?.();
                setConfirmModalOpen(false);
              }}
              disabled={isFixing || status.autoFixableCount === 0}
              className="rounded-xl"
              data-testid="button-confirm-fix"
            >
              {isFixing ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
