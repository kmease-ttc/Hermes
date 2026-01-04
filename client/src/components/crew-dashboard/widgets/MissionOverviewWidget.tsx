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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Wrench,
  RefreshCw,
  Clock,
  Zap,
  ChevronRight,
  ChevronDown,
  Target,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MissionStatusState, MissionItem, CompletedAction, WidgetState } from "../types";
import { formatDistanceToNow } from "date-fns";

interface MissionOverviewWidgetProps {
  status: MissionStatusState;
  missions: MissionItem[];
  recentlyCompleted?: CompletedAction | null;
  blockers?: Array<{ id: string; title: string; fix: string }>;
  state?: WidgetState;
  onFixEverything?: () => void;
  onRunDiagnostics?: () => void;
  onViewAllMissions?: () => void;
  onMissionAction?: (missionId: string, actionId: string) => void;
  onBlockerFix?: (blockerId: string) => void;
  onRetry?: () => void;
  isFixing?: boolean;
  isRunning?: boolean;
  maxActions?: number;
}

const statusConfig: Record<string, {
  label: string;
  icon: typeof CheckCircle2;
  badgeClass: string;
  cardClass: string;
}> = {
  looking_good: {
    label: "Good",
    icon: CheckCircle2,
    badgeClass: "bg-semantic-success-soft text-semantic-success border-semantic-success-border",
    cardClass: "",
  },
  doing_okay: {
    label: "OK",
    icon: CheckCircle2,
    badgeClass: "bg-semantic-info-soft text-semantic-info border-semantic-info-border",
    cardClass: "",
  },
  needs_attention: {
    label: "Needs attention",
    icon: AlertTriangle,
    badgeClass: "bg-gold-soft text-gold border-gold",
    cardClass: "bg-gold-soft/30 border-gold/30",
  },
};

const defaultStatusConfig = {
  label: "Unknown",
  icon: AlertTriangle,
  badgeClass: "bg-muted text-muted-foreground border-muted",
  cardClass: "",
};

function ImpactIndicator({ impact }: { impact: string }) {
  const config = {
    high: { color: 'bg-semantic-danger', bars: 3, label: 'High Impact' },
    medium: { color: 'bg-semantic-warning', bars: 2, label: 'Medium Impact' },
    low: { color: 'bg-semantic-success', bars: 1, label: 'Low Impact' },
  }[impact.toLowerCase()] || { color: 'bg-muted', bars: 1, label: 'Impact' };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-end gap-0.5 h-3">
            {[1, 2, 3].map((bar) => (
              <div
                key={bar}
                className={cn(
                  "w-0.5 rounded-sm transition-colors",
                  bar <= config.bars ? config.color : "bg-muted/40"
                )}
                style={{ height: `${bar * 3 + 3}px` }}
              />
            ))}
          </div>
        </TooltipTrigger>
        <TooltipContent><p>{config.label}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function EffortIndicator({ effort }: { effort: string }) {
  const effortMap: Record<string, { label: string; icon: React.ReactNode }> = {
    'S': { label: 'Quick fix', icon: <Zap className="w-3 h-3 text-semantic-success" /> },
    'M': { label: 'Medium effort', icon: <Clock className="w-3 h-3 text-semantic-warning" /> },
    'L': { label: 'Long effort', icon: <Clock className="w-3 h-3 text-semantic-danger" /> },
  };
  const config = effortMap[effort] || effortMap['M'];
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex items-center">{config.icon}</span>
        </TooltipTrigger>
        <TooltipContent><p>{config.label}</p></TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function CompactMissionRow({
  mission,
  onAction,
}: {
  mission: MissionItem;
  onAction?: (actionId: string) => void;
}) {
  return (
    <div
      className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-background/50 hover:bg-background/80 transition-colors border border-border/30"
      data-testid={`mission-row-${mission.id}`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm text-foreground truncate">{mission.title}</h4>
          {mission.impact && <ImpactIndicator impact={mission.impact} />}
          {mission.effort && <EffortIndicator effort={mission.effort} />}
        </div>
        {mission.reason && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
            {mission.reason}
          </p>
        )}
      </div>

      <div className="shrink-0">
        {mission.action && (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              mission.action?.onClick();
            }}
            disabled={mission.action.disabled}
            className="bg-primary hover:bg-primary/90 h-7 px-3 text-xs"
            data-testid={`button-mission-${mission.id}-action`}
          >
            {mission.action.label}
          </Button>
        )}

        {!mission.action && mission.status === "pending" && (
          <Button
            type="button"
            variant="default"
            size="sm"
            className="bg-primary hover:bg-primary/90 h-7 px-3 text-xs"
            onClick={(e) => {
              e.preventDefault();
              onAction?.("fix");
            }}
            data-testid={`button-mission-${mission.id}-fix`}
          >
            Fix it
          </Button>
        )}
      </div>
    </div>
  );
}

function BlockerRow({ 
  blocker, 
  onFix 
}: { 
  blocker: { id: string; title: string; fix: string };
  onFix?: () => void;
}) {
  return (
    <div className="flex items-start gap-3 py-2 text-sm">
      <AlertCircle className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <span className="font-medium text-foreground">{blocker.title}</span>
        <span className="text-muted-foreground"> — {blocker.fix}</span>
      </div>
      {onFix && (
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 px-2 text-xs text-gold hover:text-gold hover:bg-gold-soft"
          onClick={onFix}
        >
          Fix
        </Button>
      )}
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <Card className="rounded-xl border overflow-hidden">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
        <div className="flex items-center gap-4">
          <Skeleton className="w-12 h-12 rounded-full" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-2 pt-2">
          <Skeleton className="h-12 w-full rounded-lg" />
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewUnavailable({ onRetry }: { onRetry?: () => void }) {
  return (
    <Card className="bg-muted/30 border-border rounded-xl overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-medium text-foreground">Status temporarily unavailable</p>
              <p className="text-sm text-muted-foreground">
                We couldn't load mission data. This may be a temporary issue.
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

export function MissionOverviewWidget({
  status,
  missions,
  recentlyCompleted,
  blockers = [],
  state = "ready",
  onFixEverything,
  onRunDiagnostics,
  onViewAllMissions,
  onMissionAction,
  onBlockerFix,
  onRetry,
  isFixing = false,
  isRunning = false,
  maxActions = 3,
}: MissionOverviewWidgetProps) {
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [blockersOpen, setBlockersOpen] = useState(false);

  if (state === "loading") {
    return <OverviewSkeleton />;
  }

  if (state === "unavailable") {
    return <OverviewUnavailable onRetry={onRetry} />;
  }

  const config = statusConfig[status.tier] || defaultStatusConfig;
  const StatusIcon = config.icon;
  const needsAttention = status.tier === "needs_attention";

  const pendingMissions = missions.filter(m => m.status === "pending" || m.status === "in_progress");
  const visibleMissions = pendingMissions.slice(0, maxActions);
  const hasMoreMissions = pendingMissions.length > maxActions;

  const openCount = status.missions?.open ?? status.pendingCount ?? pendingMissions.length;
  const blockerCount = blockers.length;

  return (
    <>
      <Card
        className={cn(
          "rounded-xl border-2 overflow-hidden transition-colors",
          needsAttention ? config.cardClass : "border-border/50"
        )}
        data-testid="mission-overview-widget"
      >
        <CardContent className="p-0">
          <div className="p-5 pb-4">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-2.5">
                <h2 className="text-base font-semibold text-foreground">Missions</h2>
                <Badge
                  variant="outline"
                  className={cn("text-xs px-2 py-0.5 border", config.badgeClass)}
                >
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {config.label}
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                {onRunDiagnostics && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={onRunDiagnostics}
                    disabled={isRunning}
                    data-testid="button-run-diagnostics"
                  >
                    {isRunning ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Run Diagnostics
                  </Button>
                )}
                {status.autoFixableCount > 0 && onFixEverything && (
                  <Button
                    variant="gold"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={() => setConfirmModalOpen(true)}
                    disabled={isFixing}
                    data-testid="button-fix-everything"
                  >
                    {isFixing ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Wrench className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Fix Everything
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 py-3 px-4 rounded-lg bg-background/40 border border-border/30 mb-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      <div 
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center ring-2",
                          openCount === 0 
                            ? "bg-semantic-success-soft ring-semantic-success/40" 
                            : openCount <= 2 
                            ? "bg-semantic-info-soft ring-semantic-info/40"
                            : "bg-gold-soft ring-gold/40"
                        )}
                      >
                        <Target className={cn(
                          "w-4 h-4 mr-0.5",
                          openCount === 0 
                            ? "text-semantic-success" 
                            : openCount <= 2 
                            ? "text-semantic-info"
                            : "text-gold"
                        )} />
                        <span className={cn(
                          "text-lg font-bold leading-none",
                          openCount === 0 
                            ? "text-semantic-success" 
                            : openCount <= 2 
                            ? "text-semantic-info"
                            : "text-gold"
                        )}>
                          {openCount}
                        </span>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Open missions are tasks you need to complete</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-sm">
                  <ArrowRight className="w-3.5 h-3.5 text-gold shrink-0" />
                  <span className="text-foreground font-medium">Next:</span>
                  <span className="text-muted-foreground truncate">{status.nextStep}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                <span><strong className="text-foreground">{openCount}</strong> open</span>
                {blockerCount > 0 && (
                  <span className="text-gold"><strong>{blockerCount}</strong> blockers</span>
                )}
              </div>
            </div>

            {visibleMissions.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-3 h-3" />
                  Next Actions
                </h3>
                <div className="space-y-1.5">
                  {visibleMissions.map((mission) => (
                    <CompactMissionRow
                      key={mission.id}
                      mission={mission}
                      onAction={(actionId) => onMissionAction?.(mission.id, actionId)}
                    />
                  ))}
                </div>
              </div>
            )}

            {visibleMissions.length === 0 && (
              <div className="py-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-semantic-success mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">All clear. No open missions.</p>
              </div>
            )}

            {(hasMoreMissions || missions.length > 0) && onViewAllMissions && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full mt-3 text-muted-foreground hover:text-foreground h-8"
                onClick={onViewAllMissions}
                data-testid="button-view-all-missions"
              >
                View all
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>

          {blockers.length > 0 && (
            <Collapsible open={blockersOpen} onOpenChange={setBlockersOpen}>
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center justify-between px-5 py-3 border-t border-border/30 bg-gold-soft/20 hover:bg-gold-soft/30 transition-colors text-left">
                  <span className="text-xs font-semibold text-gold uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Blockers ({blockers.length})
                  </span>
                  <ChevronDown className={cn(
                    "w-4 h-4 text-gold transition-transform",
                    blockersOpen && "rotate-180"
                  )} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-5 py-3 border-t border-border/30 bg-gold-soft/10 space-y-1">
                  {blockers.map((blocker) => (
                    <BlockerRow
                      key={blocker.id}
                      blocker={blocker}
                      onFix={onBlockerFix ? () => onBlockerFix(blocker.id) : undefined}
                    />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {recentlyCompleted && (
            <div className="border-t border-border/30 px-5 py-3 bg-muted/20">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-semantic-success-soft flex items-center justify-center">
                  <CheckCircle2 className="w-3 h-3 text-semantic-success" />
                </div>
                <span className="text-xs text-muted-foreground uppercase tracking-wider">Completed</span>
                <span className="text-sm text-foreground flex-1 truncate">{recentlyCompleted.title}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(recentlyCompleted.completedAt), { addSuffix: true })}
                </span>
              </div>
            </div>
          )}
        </CardContent>
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
