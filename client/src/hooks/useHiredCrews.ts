import { useQuery } from "@tanstack/react-query";
import { useSiteContext } from "./useSiteContext";

interface CrewStateResponse {
  siteId: string;
  enabledAgents: string[];
  agentStatus: Record<string, { health: string; needsConfig: boolean; lastRun: string | null }>;
  totalEnabled: number;
}

interface UseHiredCrewsReturn {
  hiredCrewIds: string[];
  agentStatus: Record<string, { health: string; needsConfig: boolean; lastRun: string | null }>;
  totalEnabled: number;
  isLoading: boolean;
  error: Error | null;
  isHired: (crewId: string) => boolean;
  getCrewStatus: (crewId: string) => { health: string; needsConfig: boolean; lastRun: string | null } | null;
}

export function useHiredCrews(): UseHiredCrewsReturn {
  const { selectedSiteId } = useSiteContext();

  const { data, isLoading, error } = useQuery<CrewStateResponse>({
    queryKey: ["crew-state", selectedSiteId],
    queryFn: async () => {
      if (!selectedSiteId) {
        return { siteId: "", enabledAgents: [], agentStatus: {}, totalEnabled: 0 };
      }
      const res = await fetch(`/api/crew/state?siteId=${encodeURIComponent(selectedSiteId)}`);
      if (!res.ok) {
        throw new Error("Failed to fetch crew state");
      }
      return res.json();
    },
    enabled: !!selectedSiteId,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });

  const hiredCrewIds = data?.enabledAgents ?? [];
  const agentStatus = data?.agentStatus ?? {};
  const totalEnabled = data?.totalEnabled ?? 0;

  const isHired = (crewId: string): boolean => {
    return hiredCrewIds.includes(crewId);
  };

  const getCrewStatus = (crewId: string) => {
    return agentStatus[crewId] ?? null;
  };

  return {
    hiredCrewIds,
    agentStatus,
    totalEnabled,
    isLoading,
    error: error as Error | null,
    isHired,
    getCrewStatus,
  };
}
