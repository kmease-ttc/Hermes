import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export type CrewTier = "looking_good" | "doing_okay" | "needs_attention";
export type CrewStatusValue = "looking_good" | "doing_okay" | "needs_attention";

export interface MissionsData {
  total: number;
  completed: number;
  pending: number;
  highPriority: number;
  autoFixable: number;
}

export interface PrimaryMetricData {
  label: string;
  value: number | null;
  unit: string;
  deltaPercent: number | null;
  deltaLabel: string;
}

export interface ReadinessData {
  isReady: boolean;
  missingDependencies: string[];
  setupHint: string | null;
}

export interface CrewStatus {
  crewId: string;
  siteId: string;
  score: number;
  status: CrewStatusValue;
  tier: CrewTier;
  missions: MissionsData;
  primaryMetric: PrimaryMetricData;
  readiness: ReadinessData;
  updatedAt: string;
  isDegraded?: boolean;
  degradedSince?: string | null;
  consecutiveFailures?: number;
  lastErrorMessage?: string | null;
}

export interface UseCrewStatusOptions {
  siteId: string;
  crewId: string;
  timeWindowDays?: number;
  enabled?: boolean;
}

export function useCrewStatus(options: UseCrewStatusOptions) {
  const { siteId, crewId, timeWindowDays = 7, enabled = true } = options;

  const queryKey = ["/api/sites", siteId, "crew-status", crewId, { timeWindowDays }];

  const {
    data: crewStatus,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
    dataUpdatedAt,
  } = useQuery<CrewStatus>({
    queryKey,
    queryFn: async () => {
      const url = `/api/sites/${encodeURIComponent(siteId)}/crew-status/${encodeURIComponent(crewId)}?timeWindowDays=${timeWindowDays}`;
      const res = await apiRequest("GET", url);
      const json = await res.json();
      if (!json.ok) {
        throw new Error(json.error || "Failed to fetch crew status");
      }
      return json as CrewStatus;
    },
    enabled: enabled && !!siteId && !!crewId,
    staleTime: 2 * 60 * 1000,
  });

  const isRefreshing = isFetching && !isLoading;
  const hasData = !!crewStatus;

  const rawScore = crewStatus?.score;
  const extractedScore = typeof rawScore === 'object' && rawScore !== null ? (rawScore as any).value : rawScore;

  return {
    crewStatus,
    isLoading: isLoading && !hasData,
    isFetching,
    isRefreshing,
    isError,
    error,
    refetch,
    dataUpdatedAt,
    hasData,
    score: extractedScore ?? null,
    status: crewStatus?.status ?? null,
    tier: crewStatus?.tier ?? null,
    missions: crewStatus?.missions ?? null,
    primaryMetric: crewStatus?.primaryMetric ?? null,
    readiness: crewStatus?.readiness ?? null,
    isDegraded: crewStatus?.isDegraded ?? false,
    degradedSince: crewStatus?.degradedSince ?? null,
    consecutiveFailures: crewStatus?.consecutiveFailures ?? 0,
    lastErrorMessage: crewStatus?.lastErrorMessage ?? null,
  };
}
