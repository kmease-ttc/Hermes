import type { ReactNode } from "react";
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
import { RefreshCw, Settings, HelpCircle, AlertCircle, MessageSquare, Send, Loader2 } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
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

function MissionPrompt({
  config,
  accentColor,
}: {
  config: { label: string; placeholder: string; onSubmit: (q: string) => void; isLoading?: boolean };
  accentColor: string;
}) {
  const [question, setQuestion] = useState("");

  const handleSubmit = () => {
    if (question.trim() && !config.isLoading) {
      config.onSubmit(question.trim());
      setQuestion("");
    }
  };

  return (
    <Card className="bg-card/60 backdrop-blur-sm border-border mt-3">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-4 h-4" style={{ color: accentColor }} />
          <span className="text-sm font-medium">{config.label}</span>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder={config.placeholder}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            disabled={config.isLoading}
            className="flex-1"
            data-testid="input-mission-prompt"
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!question.trim() || config.isLoading}
            style={{ backgroundColor: question.trim() ? accentColor : undefined }}
            data-testid="button-submit-mission-prompt"
          >
            {config.isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function CrewDashboardShell({
  crew,
  agentScore,
  agentScoreTooltip,
  missionStatus,
  missions,
  kpis,
  inspectorTabs,
  missionPrompt,
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
      {/* Unified Header - Single consolidated block */}
      <div className="p-4 rounded-xl bg-card/40 border border-border">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          {/* Left cluster: Avatar + Title + Subtitle + Description */}
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${crew.accentColor}20` }}
            >
              {crew.avatar}
            </div>
            <div className="flex-1 min-w-0">
              {/* Title row */}
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">{crew.crewName}</h1>
                <Badge
                  variant="outline"
                  className="text-xs font-medium"
                  style={{
                    borderColor: `${crew.accentColor}40`,
                    color: crew.accentColor,
                  }}
                >
                  {crew.subtitle}
                </Badge>
              </div>
              
              {/* Description */}
              <p className="text-sm text-muted-foreground mt-1">{crew.description}</p>
              
              {/* Pills row - capabilities and monitors combined */}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {(crew.capabilities || []).map((cap) => (
                  <Badge
                    key={cap}
                    variant="secondary"
                    className="text-xs font-medium"
                    style={{
                      backgroundColor: `${crew.accentColor}15`,
                      color: crew.accentColor,
                      borderColor: `${crew.accentColor}30`,
                    }}
                  >
                    {cap}
                  </Badge>
                ))}
                {crew.monitors.length > 0 && (crew.capabilities?.length || 0) > 0 && (
                  <span className="text-muted-foreground/50 px-1">|</span>
                )}
                {crew.monitors.map((monitor) => (
                  <Badge
                    key={monitor}
                    variant="outline"
                    className="text-xs text-muted-foreground"
                  >
                    {monitor}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Right cluster: Agent Score + Refresh + Settings */}
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

      {/* 3.5 Mission Prompt - crew-specific question interface */}
      {missionPrompt && (
        <MissionPrompt config={missionPrompt} accentColor={crew.accentColor} />
      )}

      {/* 4. KPIs Strip - only show when there are KPIs */}
      {kpis.length > 0 && (
        <Card className="bg-card/60 backdrop-blur-sm border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Key Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <KpiStripWidget kpis={kpis} state={kpiState} onRetry={onRefresh} />
          </CardContent>
        </Card>
      )}

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
