import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSiteContext } from "./useSiteContext";
import { toast } from "sonner";

export interface CrewDataResult<T> {
  data: T | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: Error | null;
  lastUpdatedAt: string | null;
  isRealData: boolean;
  status: "loading" | "ready" | "empty" | "unavailable";
  refresh: () => void;
}

interface CrewConfig<T> {
  crewKey: string;
  overviewEndpoint: string;
  runEndpoint: string;
  defaultData: T;
  queryKey: string;
}

export function useCrewDashboardData<T>(config: CrewConfig<T>): CrewDataResult<T> {
  const { currentSite } = useSiteContext();
  const queryClient = useQueryClient();
  const siteId = currentSite?.siteId || "default";

  const { data, isLoading, error, refetch } = useQuery<T & { lastRunAt?: string; isRealData?: boolean }>({
    queryKey: [config.queryKey, siteId],
    queryFn: async () => {
      const res = await fetch(`${config.overviewEndpoint}?siteId=${siteId}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch ${config.crewKey} data`);
      }
      return res.json();
    },
    staleTime: 60000,
    retry: 1,
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(config.runEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to run ${config.crewKey} analysis`);
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(`${config.crewKey} analysis completed`);
      queryClient.invalidateQueries({ queryKey: [config.queryKey] });
    },
    onError: (error: Error) => {
      toast.error(`Analysis failed: ${error.message}`);
    },
  });

  const refresh = () => {
    runMutation.mutate();
  };

  const status = error
    ? "unavailable"
    : isLoading
    ? "loading"
    : data
    ? "ready"
    : "empty";

  return {
    data: data || config.defaultData,
    isLoading,
    isRefreshing: runMutation.isPending,
    error: error as Error | null,
    lastUpdatedAt: (data as any)?.lastRunAt || null,
    isRealData: (data as any)?.isRealData ?? false,
    status,
    refresh,
  };
}

export const crewConfigs = {
  competitive_snapshot: {
    crewKey: "competitive_snapshot",
    overviewEndpoint: "/api/competitive/overview",
    runEndpoint: "/api/competitive/run",
    queryKey: "competitive-overview",
  },
  backlink_authority: {
    crewKey: "backlink_authority",
    overviewEndpoint: "/api/authority/overview",
    runEndpoint: "/api/authority/run",
    queryKey: "authority-overview",
  },
  serp_intel: {
    crewKey: "serp_intel",
    overviewEndpoint: "/api/serp/overview",
    runEndpoint: "/api/serp/run",
    queryKey: "serp-overview",
  },
  google_data_connector: {
    crewKey: "google_data_connector",
    overviewEndpoint: "/api/pulse/overview",
    runEndpoint: "/api/pulse/run",
    queryKey: "pulse-overview",
  },
  core_web_vitals: {
    crewKey: "core_web_vitals",
    overviewEndpoint: "/api/vitals/overview",
    runEndpoint: "/api/vitals/run",
    queryKey: "vitals-overview",
  },
  seo_kbase: {
    crewKey: "seo_kbase",
    overviewEndpoint: "/api/kb/overview",
    runEndpoint: "/api/kb/run",
    queryKey: "kbase-overview",
  },
  content_decay: {
    crewKey: "content_decay",
    overviewEndpoint: "/api/content/overview",
    runEndpoint: "/api/content/run",
    queryKey: "content-overview",
  },
  crawl_render: {
    crewKey: "crawl_render",
    overviewEndpoint: "/api/crawl/overview",
    runEndpoint: "/api/crawl/run",
    queryKey: "crawl-overview",
  },
} as const;

export type CrewKey = keyof typeof crewConfigs;
