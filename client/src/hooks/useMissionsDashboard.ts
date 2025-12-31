import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface UseMissionsDashboardOptions {
  siteId?: string;
}

export interface DashboardMissionAction {
  crewId: string;
  missionId: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'S' | 'M' | 'L';
  autoFixable: boolean;
}

export interface DashboardRecentlyCompleted {
  crewId: string;
  missionId: string;
  title: string;
  completedAt: string;
  summary: string;
}

export interface CrewSummary {
  crewId: string;
  nickname: string;
  pendingCount: number;
  lastCompletedAt: string | null;
  status: 'looking_good' | 'doing_okay' | 'needs_attention';
}

export interface MissionsDashboard {
  aggregatedStatus: {
    tier: 'looking_good' | 'doing_okay' | 'needs_attention';
    totalMissions: number;
    completedCount: number;
    pendingCount: number;
    highPriorityCount: number;
    autoFixableCount: number;
    nextStep: string;
  };
  nextActions: DashboardMissionAction[];
  recentlyCompleted: DashboardRecentlyCompleted[];
  crewSummaries: CrewSummary[];
}

export function useMissionsDashboard(options?: UseMissionsDashboardOptions) {
  const queryClient = useQueryClient();
  const siteId = options?.siteId;

  const queryKey = siteId
    ? ["/api/missions/dashboard", { siteId }]
    : ["/api/missions/dashboard"];

  const {
    data: dashboard,
    isLoading,
    isError,
    refetch,
  } = useQuery<MissionsDashboard>({
    queryKey,
    queryFn: async () => {
      const url = siteId
        ? `/api/missions/dashboard?siteId=${encodeURIComponent(siteId)}`
        : "/api/missions/dashboard";
      const res = await apiRequest("GET", url);
      return res.json();
    },
  });

  const executeAll = async (): Promise<void> => {
    if (!dashboard?.nextActions) return;

    const autoFixableMissions = dashboard.nextActions.filter(
      (action) => action.autoFixable
    );

    const targetSiteId = siteId || 'site_empathy_health_clinic';

    for (const mission of autoFixableMissions) {
      try {
        await apiRequest("POST", "/api/missions/execute", {
          siteId: targetSiteId,
          crewId: mission.crewId,
          missionId: mission.missionId,
        });
      } catch (error) {
        console.error(`Failed to execute mission ${mission.missionId}:`, error);
      }
    }

    queryClient.invalidateQueries({ queryKey });
  };

  return {
    dashboard,
    isLoading,
    isError,
    executeAll,
    refetch,
  };
}
