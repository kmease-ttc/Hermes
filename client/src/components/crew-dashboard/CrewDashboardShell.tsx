import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RefreshCw, Settings, HelpCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { CrewMissionStatusWidget } from "./widgets/CrewMissionStatusWidget";
import { MissionsWidget } from "./widgets/MissionsWidget";
import { KpiStripWidget } from "./widgets/KpiStripWidget";
import type { CrewDashboardShellProps, WidgetState } from "./types";

function AgentScoreDisplay({
  score,
  tooltip,
  isLoading,
}: {
  score: number | null | undefined;
  tooltip?: string;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return <Skeleton className="h-10 w-16 rounded-xl" />;
  }

  const displayScore = score ?? "—";
  const scoreColor =
    score === null || score === undefined
      ? "text-muted-foreground"
      : score >= 80
      ? "text-semantic-success"
      : score >= 60
      ? "text-semantic-warning"
      : "text-semantic-danger";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-card/60 border border-border"
            data-testid="agent-score"
          >
            <span className="text-xs text-muted-foreground">Score</span>
            <span className={cn("text-xl font-bold", scoreColor)}>{displayScore}</span>
            {tooltip && <HelpCircle className="w-3 h-3 text-muted-foreground" />}
          </div>
        </TooltipTrigger>
        {tooltip && (
          <TooltipContent>
            <p className="text-xs max-w-[200px]">{tooltip}</p>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  );
}

function InspectorTabContent({
  content,
  state,
  onRetry,
}: {
  content: ReactNode;
  state?: WidgetState;
  onRetry?: () => void;
}) {
  if (state === "loading") {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (state === "unavailable") {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground mb-4">This section is temporarily unavailable</p>
        {onRetry && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (state === "empty") {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">No data available yet</p>
      </div>
    );
  }

  return <>{content}</>;
}

export function CrewDashboardShell({
  crew,
  agentScore,
  agentScoreTooltip,
  missionStatus,
  missions,
  kpis,
  inspectorTabs,
  onRefresh,
  onSettings,
  onFixEverything,
  isRefreshing = false,
  children,
}: CrewDashboardShellProps) {
  const missionStatusState: WidgetState =
    missionStatus.status || (missionStatus.priorityCount >= 0 ? "ready" : "loading");

  const missionsState: WidgetState =
    missions.length > 0 ? "ready" : missionStatus.status === "loading" ? "loading" : "empty";

  const kpiState: WidgetState =
    kpis.length > 0 && kpis.some((k) => k.value !== null) ? "ready" : "empty";

  return (
    <div className="space-y-5">
      {/* Unified Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${crew.accentColor}20` }}
          >
            {crew.avatar}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-foreground">{crew.crewName}</h1>
              <span className="text-muted-foreground">·</span>
              <span className="text-muted-foreground">{crew.subtitle}</span>
              {crew.monitors.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {crew.monitors.map((monitor) => (
                    <Badge
                      key={monitor}
                      variant="secondary"
                      className="text-xs"
                      style={{
                        backgroundColor: `${crew.accentColor}15`,
                        color: crew.accentColor,
                        borderColor: `${crew.accentColor}30`,
                      }}
                    >
                      {monitor}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{crew.description}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <AgentScoreDisplay
            score={agentScore}
            tooltip={agentScoreTooltip}
            isLoading={missionStatusState === "loading"}
          />

          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            data-testid="button-refresh"
          >
            <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
          </Button>

          {onSettings && (
            <Button
              variant="outline"
              size="icon"
              onClick={onSettings}
              data-testid="button-settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Mission Status Widget */}
      <CrewMissionStatusWidget
        status={missionStatus}
        state={missionStatusState}
        onFixEverything={onFixEverything}
        onRetry={onRefresh}
      />

      {/* 3. Missions Widget */}
      <MissionsWidget
        missions={missions}
        state={missionsState}
        onRetry={onRefresh}
      />

      {/* 4. KPIs Strip */}
      <Card className="bg-card/60 backdrop-blur-sm border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Key Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <KpiStripWidget kpis={kpis} state={kpiState} onRetry={onRefresh} />
        </CardContent>
      </Card>

      {/* 5. Inspector / Details Area */}
      {inspectorTabs.length > 0 && (
        <Card className="bg-card/60 backdrop-blur-sm border-border">
          <CardContent className="pt-6">
            <Tabs defaultValue={inspectorTabs[0]?.id}>
              <TabsList className="mb-4">
                {inspectorTabs.map((tab) => (
                  <TabsTrigger key={tab.id} value={tab.id} className="flex items-center gap-1.5">
                    {tab.icon}
                    {tab.label}
                    {tab.badge !== undefined && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        {tab.badge}
                      </Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>

              {inspectorTabs.map((tab) => (
                <TabsContent key={tab.id} value={tab.id}>
                  <InspectorTabContent
                    content={tab.content}
                    state={tab.state}
                    onRetry={onRefresh}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Additional crew-specific content */}
      {children}
    </div>
  );
}
