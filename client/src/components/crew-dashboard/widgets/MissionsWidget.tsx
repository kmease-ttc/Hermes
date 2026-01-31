import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  Eye,
  Loader2,
  Target,
  AlertCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MissionItem, WidgetState } from "../types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
          <div className="flex items-end gap-0.5 h-4">
            {[1, 2, 3].map((bar) => (
              <div
                key={bar}
                className={cn(
                  "w-1 rounded-sm transition-colors",
                  bar <= config.bars ? config.color : "bg-muted/40"
                )}
                style={{ height: `${bar * 4 + 4}px` }}
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
    'XS': { label: 'Quick fix', icon: <Zap className="w-3 h-3 text-semantic-success" /> },
    'S': { label: 'Quick fix', icon: <Zap className="w-3 h-3 text-semantic-success" /> },
    'M': { label: 'Medium effort', icon: <Clock className="w-3 h-3 text-semantic-warning" /> },
    'L': { label: 'Long effort', icon: <Clock className="w-3 h-3 text-semantic-danger" /> },
    'XL': { label: 'Long effort', icon: <Clock className="w-3 h-3 text-semantic-danger" /> },
    'easy': { label: 'Quick fix', icon: <Zap className="w-3 h-3 text-semantic-success" /> },
    'medium': { label: 'Medium effort', icon: <Clock className="w-3 h-3 text-semantic-warning" /> },
    'hard': { label: 'Long effort', icon: <Clock className="w-3 h-3 text-semantic-danger" /> },
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

interface MissionsWidgetProps {
  missions: MissionItem[];
  recentlyCompleted?: {
    id: string;
    title: string;
    completedAt: string;
  } | null;
  state?: WidgetState;
  onMissionAction?: (missionId: string, actionId: string) => void;
  onRetry?: () => void;
  maxVisible?: number;
  className?: string;
}

function CompletedMissionRow({ 
  title, 
  completedAt 
}: { 
  title: string; 
  completedAt: string; 
}) {
  return (
    <div
      className="flex items-start gap-4 p-4 rounded-xl bg-card/40 border border-border opacity-80"
      data-testid="completed-mission-row"
    >
      <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-semantic-success-soft">
        <CheckCircle2 className="w-5 h-5 text-semantic-success" />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-foreground">{title}</h4>
        <p className="text-sm text-muted-foreground mt-1">
          {completedAt}
        </p>
      </div>

      <div className="flex items-center shrink-0">
        <Badge variant="secondary" className="bg-semantic-success-soft text-semantic-success border-semantic-success/20">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Completed
        </Badge>
      </div>
    </div>
  );
}

function MissionRow({
  mission,
  onAction,
}: {
  mission: MissionItem;
  onAction?: (actionId: string) => void;
}) {
  const statusConfig = {
    pending: {
      icon: Clock,
      color: "text-muted-foreground",
      bg: "bg-muted",
      label: "Pending",
    },
    in_progress: {
      icon: Loader2,
      color: "text-semantic-info",
      bg: "bg-semantic-info-soft",
      label: "In progress",
      animate: true,
    },
    done: {
      icon: CheckCircle2,
      color: "text-semantic-success",
      bg: "bg-semantic-success-soft",
      label: "Done",
    },
    complete: {
      icon: CheckCircle2,
      color: "text-semantic-success",
      bg: "bg-semantic-success-soft",
      label: "Done",
    },
    blocked: {
      icon: AlertTriangle,
      color: "text-semantic-warning",
      bg: "bg-semantic-warning-soft",
      label: "Blocked",
    },
  };

  const config = statusConfig[mission.status];
  const StatusIcon = config.icon;

  return (
    <div
      className="flex items-start gap-4 p-4 rounded-xl bg-card/40 border border-border hover:border-primary/30 transition-colors"
      data-testid={`mission-row-${mission.id}`}
    >
      <div
        className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
          config.bg
        )}
      >
        <StatusIcon
          className={cn("w-5 h-5", config.color, config.animate && "animate-spin")}
        />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-foreground">{mission.title}</h4>

        {(mission.reason || mission.expectedOutcome) && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
            {mission.reason || mission.expectedOutcome}
          </p>
        )}

        <div className="flex items-center gap-3 mt-2">
          {mission.impact && <ImpactIndicator impact={mission.impact} />}
          {mission.effort && <EffortIndicator effort={mission.effort} />}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Primary action shorthand */}
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
            className="bg-semantic-success hover:bg-semantic-success/90"
            data-testid={`button-mission-${mission.id}-action`}
          >
            {mission.action.label}
          </Button>
        )}

        {/* Multiple actions */}
        {!mission.action && mission.actions?.map((action) => (
          <Button
            key={action.id}
            type="button"
            variant={action.variant || "outline"}
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              action.onClick?.();
              onAction?.(action.id);
            }}
            data-testid={`button-mission-${mission.id}-${action.id}`}
          >
            {action.label}
          </Button>
        ))}

        {/* Default Fix it button for pending missions without any action */}
        {!mission.action && !mission.actions?.length && mission.status === "pending" && (
          <Button
            type="button"
            variant="default"
            size="sm"
            className="bg-semantic-success hover:bg-semantic-success/90 shadow-sm"
            style={{ color: "#FFFFFF" }}
            onClick={(e) => {
              e.preventDefault();
              onAction?.("approve");
            }}
            data-testid={`button-mission-${mission.id}-approve`}
          >
            <Zap className="w-4 h-4 mr-1" />
            Fix it
          </Button>
        )}

        {/* View button for non-pending missions without any action */}
        {!mission.action && !mission.actions?.length && mission.status !== "pending" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              onAction?.("view");
            }}
            data-testid={`button-mission-${mission.id}-view`}
          >
            <Eye className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

function MissionsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-4 p-4 rounded-xl bg-card/40 border border-border"
        >
          <Skeleton className="w-10 h-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}

function MissionsEmpty({ description }: { description?: string }) {
  return (
    <div className="p-6 rounded-xl bg-muted/20 border border-dashed border-border text-center">
      <Target className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">
        {description || "No tasks in queue"}
      </p>
    </div>
  );
}

function MissionsUnavailable({ onRetry }: { onRetry?: () => void }) {
  return (
    <div className="p-6 rounded-xl bg-muted/30 border border-border text-center">
      <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
      <p className="text-sm text-muted-foreground mb-3">
        Task data temporarily unavailable
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}

export function MissionsWidget({
  missions,
  recentlyCompleted,
  state = "ready",
  onMissionAction,
  onRetry,
  maxVisible = 5,
  className,
}: MissionsWidgetProps) {
  const visibleMissions = missions.slice(0, maxVisible);
  const hasMore = missions.length > maxVisible;

  return (
    <Card className={cn("bg-card/60 backdrop-blur-sm border-border", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-gold" />
              Missions
            </CardTitle>
            <CardDescription>Prioritized actions for this crew</CardDescription>
          </div>
          {state === "ready" && missions.length > 0 && (
            <Badge variant="secondary">{missions.length} total</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {state === "loading" && <MissionsSkeleton />}

        {state === "unavailable" && <MissionsUnavailable onRetry={onRetry} />}

        {state === "empty" && <MissionsEmpty />}

        {state === "ready" && missions.length === 0 && <MissionsEmpty />}

        {state === "ready" && missions.length > 0 && (
          <>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Next Actions
            </h3>

            <div className="space-y-3 mb-6">
              {visibleMissions.map((mission) => (
                <MissionRow
                  key={mission.id}
                  mission={mission}
                  onAction={(actionId) => onMissionAction?.(mission.id, actionId)}
                />
              ))}

              {hasMore && (
                <Button variant="ghost" className="w-full text-muted-foreground">
                  View {missions.length - maxVisible} more missions
                </Button>
              )}
            </div>

            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 mt-6 pt-4 border-t border-border">
              Recently Completed
            </h3>

            {recentlyCompleted ? (
              <CompletedMissionRow 
                title={recentlyCompleted.title} 
                completedAt={recentlyCompleted.completedAt} 
              />
            ) : (
              <p className="text-sm text-muted-foreground/60 italic">
                No completed actions yet
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
