import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface UseCrewMissionsOptions {
  siteId: string;
  crewId: string;
}

export interface MissionAction {
  missionId: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'S' | 'M' | 'L';
  autoFixable: boolean;
}

export interface MissionState {
  nextActions: MissionAction[];
  lastCompleted: {
    completedAt: string;
    missionId: string;
    runId: string;
    summary: string;
  } | null;
  status: {
    tier: 'looking_good' | 'doing_okay' | 'needs_attention';
    nextStep: string;
    priorityCount: number;
    autoFixableCount: number;
  };
  completedMissionIds: string[];
  cooldownHours: number;
}

interface ExecuteMissionParams {
  missionId: string;
  force?: boolean;
}

export function useCrewMissions(options: UseCrewMissionsOptions) {
  const { siteId, crewId } = options;
  const queryClient = useQueryClient();

  const queryKey = ['missions', 'state', siteId, crewId];

  const {
    data: missionState,
    isLoading,
    isError,
    refetch,
  } = useQuery<MissionState>({
    queryKey,
    queryFn: async () => {
      const res = await apiRequest(
        'GET',
        `/api/missions/state?siteId=${encodeURIComponent(siteId)}&crewId=${encodeURIComponent(crewId)}`
      );
      return res.json();
    },
    enabled: Boolean(siteId && crewId),
  });

  const executeMutation = useMutation({
    mutationFn: async ({ missionId, force }: ExecuteMissionParams) => {
      const res = await apiRequest('POST', '/api/missions/execute', {
        siteId,
        crewId,
        missionId,
        force: force ?? false,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const executeMission = async (missionId: string, force?: boolean): Promise<void> => {
    await executeMutation.mutateAsync({ missionId, force });
  };

  return {
    missionState,
    isLoading,
    isError,
    executeMission,
    refetch,
  };
}
