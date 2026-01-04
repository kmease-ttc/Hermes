import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getCrewMember } from "@/config/agents";
import { useQuery } from "@tanstack/react-query";
import { PlayCircle, AlertCircle, CheckCircle2, Clock, Wrench, Download, Settings2, RefreshCw, Search, Lightbulb } from "lucide-react";
import { useSiteContext } from "@/hooks/useSiteContext";
import { CrewDashboardShell } from "@/components/crew-dashboard/CrewDashboardShell";
import { useCrewMissions } from "@/hooks/useCrewMissions";
import { useCrewStatus } from "@/hooks/useCrewStatus";
import { SERVICE_TO_CREW } from "@shared/registry";
import type { 
  CrewIdentity, 
  MissionStatusState, 
  MissionItem, 
  InspectorTab, 
  KpiDescriptor,
  MissionPromptConfig 
} from "@/components/crew-dashboard/types";
import { useState, useMemo } from "react";
import { KeyMetricsGrid } from "@/components/key-metrics";

interface AgentData {
  ok: boolean;
  agentId: string;
  score: number;
  findings: { label: string; value: string; severity: string; category: string }[] | null;
  nextSteps: { step: number; action: string }[] | null;
  lastRun: {
    runId: string;
    status: string;
    durationMs: number;
    summary: string;
    createdAt: string;
  } | null;
  suggestionsCount: number;
  findingsCount: number;
  isRealData: boolean;
}

interface GenericAgentContentProps {
  agentId: string;
}

export default function GenericAgentContent({ agentId }: GenericAgentContentProps) {
  const crew = getCrewMember(agentId);
  const { activeSite } = useSiteContext();
  const siteId = activeSite?.id || "default";
  const [isRefreshing, setIsRefreshing] = useState(false);

  const crewId = SERVICE_TO_CREW[agentId] || agentId;

  const { missionState, executeMission, isLoading: missionsLoading } = useCrewMissions({
    siteId,
    crewId,
  });

  const { score: crewScore, missions: crewMissions, isLoading: scoreLoading } = useCrewStatus({
    siteId,
    crewId,
  });

  const { data, isLoading, refetch } = useQuery<AgentData>({
    queryKey: ['agent-data', agentId, siteId],
    queryFn: async () => {
      const res = await fetch(`/api/agents/${agentId}/data?site_id=${siteId}`);
      if (!res.ok) throw new Error('Failed to fetch agent data');
      return res.json();
    },
    refetchInterval: 60000,
  });

  const findings = data?.findings || [];
  const nextSteps = data?.nextSteps || [];
  const hasRealData = data?.isRealData ?? false;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const Icon = crew.icon;

  const crewIdentity: CrewIdentity = {
    crewId: agentId,
    crewName: crew.nickname,
    subtitle: crew.role,
    description: crew.blurb || `${crew.nickname} helps monitor and optimize your site.`,
    avatar: <Icon className="w-6 h-6" style={{ color: crew.color }} />,
    accentColor: crew.color,
    capabilities: crew.capabilities || [],
    monitors: crew.watchDescription ? [crew.watchDescription] : [],
  };

  const missionStatus: MissionStatusState = missionState?.status ? {
    tier: missionState.status.tier,
    summaryLine: missionState.status.nextStep,
    nextStep: missionState.status.nextStep,
    priorityCount: missionState.status.priorityCount,
    blockerCount: 0,
    autoFixableCount: missionState.status.autoFixableCount,
    status: missionsLoading ? "loading" : "ready",
    score: crewScore !== null ? { value: crewScore, status: 'ok' as const } : { value: null, status: 'unknown' as const },
    missions: crewMissions ? { 
      open: crewMissions.pending, 
      total: crewMissions.total, 
      completedThisWeek: 0 
    } : { open: (missionState?.nextActions || []).length, total: 0, completedThisWeek: 0 },
  } : {
    tier: "doing_okay",
    summaryLine: "Loading missions...",
    nextStep: "Loading...",
    priorityCount: 0,
    blockerCount: 0,
    autoFixableCount: 0,
    status: missionsLoading ? "loading" : "ready",
    score: { value: null, status: 'unknown' as const },
    missions: { open: 0, total: 0, completedThisWeek: 0 },
  };

  const missions: MissionItem[] = (missionState?.nextActions || []).map((action) => ({
    id: action.missionId,
    title: action.title,
    reason: action.description,
    status: "pending" as const,
    impact: action.impact as 'high' | 'medium' | 'low',
    effort: action.effort,
    action: {
      label: "Fix it",
      onClick: () => executeMission(action.missionId),
      disabled: false,
    },
  }));

  const recentlyCompleted = missionState?.lastCompleted ? {
    id: missionState.lastCompleted.runId || missionState.lastCompleted.missionId,
    title: missionState.lastCompleted.summary || 'Mission completed',
    completedAt: missionState.lastCompleted.completedAt,
  } : null;

  const kpis: KpiDescriptor[] = [
    {
      id: "findings",
      label: "Findings",
      value: hasRealData ? findings.length : null,
      status: isLoading ? "loading" : "ready",
    },
    {
      id: "suggestions",
      label: "Suggestions",
      value: hasRealData ? (data?.suggestionsCount ?? 0) : null,
      status: isLoading ? "loading" : "ready",
    },
  ];

  const keyMetrics = useMemo(() => [
    {
      id: "score",
      label: "Agent Score",
      value: hasRealData && crewScore !== null ? crewScore : 0,
      icon: CheckCircle2,
      status: (crewScore ?? 0) >= 80 ? "good" : (crewScore ?? 0) >= 50 ? "warning" : "neutral" as const,
    },
    {
      id: "findings",
      label: "Findings",
      value: hasRealData ? findings.length : 0,
      icon: Search,
      status: findings.length > 0 ? "warning" : "good" as const,
    },
    {
      id: "suggestions",
      label: "Suggestions",
      value: hasRealData ? (data?.suggestionsCount ?? 0) : 0,
      icon: Lightbulb,
      status: (data?.suggestionsCount ?? 0) > 0 ? "warning" : "good" as const,
    },
  ], [hasRealData, crewScore, data, findings.length]);

  const missionPrompt: MissionPromptConfig = {
    label: `Ask ${crew.nickname}`,
    placeholder: `What would you like ${crew.nickname} to help with?`,
    onSubmit: (question) => {
      console.log("Question for", crew.nickname, ":", question);
    },
  };

  const findingsTab: InspectorTab = {
    id: "findings",
    label: "Findings",
    icon: <CheckCircle2 className="w-4 h-4" />,
    badge: findings.length || undefined,
    state: isLoading ? "loading" : findings.length > 0 ? "ready" : "empty",
    content: (
      <div className="space-y-3 p-4">
        {findings.length > 0 ? (
          findings.map((finding, i) => (
            <div 
              key={i} 
              className="flex justify-between items-center p-3 bg-muted/50 rounded-lg"
            >
              <span className="text-sm text-muted-foreground">{finding.label}</span>
              <Badge 
                variant="secondary"
                className={
                  finding.severity === 'critical' ? 'bg-red-500/20 text-red-600' :
                  finding.severity === 'high' ? 'bg-amber-500/20 text-amber-600' :
                  'bg-blue-500/20 text-blue-600'
                }
              >
                {finding.value}
              </Badge>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No findings yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Run this agent to start collecting data
            </p>
          </div>
        )}
      </div>
    ),
  };

  const nextStepsTab: InspectorTab = {
    id: "next-steps",
    label: "Next Steps",
    icon: <Clock className="w-4 h-4" />,
    badge: nextSteps.length || undefined,
    state: isLoading ? "loading" : nextSteps.length > 0 ? "ready" : "empty",
    content: (
      <div className="p-4">
        {nextSteps.length > 0 ? (
          <ol className="space-y-3">
            {nextSteps.map((step) => (
              <li 
                key={step.step}
                className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
              >
                <span 
                  className="flex-shrink-0 w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center"
                  style={{ backgroundColor: `${crew.color}15`, color: crew.color }}
                >
                  {step.step}
                </span>
                <span className="text-sm">{step.action}</span>
              </li>
            ))}
          </ol>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Wrench className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No recommendations yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Configure and run this agent first
            </p>
          </div>
        )}
      </div>
    ),
  };

  const controlsTab: InspectorTab = {
    id: "controls",
    label: "Controls",
    icon: <Settings2 className="w-4 h-4" />,
    state: "ready",
    content: (
      <div className="p-4 space-y-6">
        <div className="flex flex-wrap gap-3">
          <Button data-testid="button-run-agent">
            <PlayCircle className="w-4 h-4 mr-2" />
            Run Now
          </Button>
          <Button variant="outline" data-testid="button-view-history">
            View History
          </Button>
          <Button variant="outline" data-testid="button-configure-agent">
            Configure
          </Button>
        </div>
        
        {data?.lastRun && (
          <div className="pt-6 border-t">
            <h4 className="text-sm font-medium mb-3">Last Run</h4>
            <div className="flex items-center gap-4 text-sm">
              <Badge variant={data.lastRun.status === 'success' ? 'default' : 'destructive'}>
                {data.lastRun.status}
              </Badge>
              <span className="text-muted-foreground">
                {new Date(data.lastRun.createdAt).toLocaleString()}
              </span>
              <span className="text-muted-foreground">
                {data.lastRun.durationMs}ms
              </span>
            </div>
            {data.lastRun.summary && (
              <p className="text-sm text-muted-foreground mt-2">{data.lastRun.summary}</p>
            )}
          </div>
        )}
        
        <div className="pt-6 border-t">
          <h4 className="text-sm font-medium mb-3">Service Endpoints</h4>
          {crew.endpoints && crew.endpoints.length > 0 ? (
            <div className="space-y-2">
              {crew.endpoints.map((endpoint, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <Badge 
                    variant="outline" 
                    className={endpoint.method === 'GET' ? 'bg-semantic-success-soft text-semantic-success' : 'bg-semantic-info-soft text-semantic-info'}
                  >
                    {endpoint.method}
                  </Badge>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{endpoint.path}</code>
                  <Badge variant="secondary" className="text-xs">
                    {endpoint.auth === 'none' ? 'Public' : 'API Key'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No endpoints configured</p>
          )}
        </div>
      </div>
    ),
  };

  const inspectorTabs: InspectorTab[] = [findingsTab, nextStepsTab, controlsTab];

  const headerActions = [
    {
      id: "refresh",
      icon: <RefreshCw className="w-4 h-4" />,
      tooltip: "Refresh data",
      onClick: handleRefresh,
      loading: isRefreshing,
    },
    {
      id: "export",
      icon: <Download className="w-4 h-4" />,
      tooltip: "Export report",
      onClick: () => console.log("Export"),
      disabled: !hasRealData,
    },
  ];

  return (
    <CrewDashboardShell
      crew={crewIdentity}
      agentScore={crewScore}
      agentScoreTooltip={`${crew.nickname}'s current performance score based on site health`}
      missionStatus={missionStatus}
      missions={missions}
      recentlyCompleted={recentlyCompleted}
      kpis={kpis}
      customMetrics={<KeyMetricsGrid metrics={keyMetrics} accentColor={crewIdentity.accentColor} />}
      inspectorTabs={inspectorTabs}
      missionPrompt={missionPrompt}
      headerActions={headerActions}
      onSettings={() => console.log("Settings for:", agentId)}
    />
  );
}
