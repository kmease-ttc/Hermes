import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  Settings, 
  Database, 
  Search, 
  Globe, 
  Shield,
  Clock,
  ChevronRight,
  Loader2,
  Zap,
  Activity,
  Link2,
  ExternalLink,
  Table,
  LayoutGrid,
  Play,
  Key,
  Server,
  HelpCircle,
  Edit,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AskAI } from "@/components/dashboard/AskAI";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Integration {
  id: number;
  integrationId: string;
  name: string;
  description: string | null;
  category: string;
  enabled: boolean | null;
  healthStatus: string | null;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  expectedSignals: string[] | null;
  receivedSignals: Record<string, { received: boolean; stale: boolean; lastValue?: any }> | null;
  recentChecks?: IntegrationCheck[];
  replitProjectUrl: string | null;
  baseUrl: string | null;
  healthEndpoint: string | null;
  metaEndpoint: string | null;
  deploymentStatus: string | null;
  hasRequiredEndpoints: boolean | null;
  authRequired: boolean | null;
  secretKeyName: string | null;
  secretExists: boolean | null;
  lastHealthCheckAt: string | null;
  healthCheckStatus: string | null;
  healthCheckResponse: any | null;
  lastAuthTestAt: string | null;
  authTestStatus: string | null;
  authTestDetails: any | null;
  calledSuccessfully: boolean | null;
  notes: string | null;
  buildState: string | null;
  configState: string | null;
  runState: string | null;
  lastRunAt: string | null;
  lastRunSummary: string | null;
  lastRunMetrics: any | null;
}

interface CatalogService {
  slug: string;
  displayName: string;
  category: string;
  description: string;
  purpose: string;
  inputs: string[];
  outputs: string[];
  keyMetrics: string[];
  commonFailures: string[];
  runTriggers: string[];
  testMode: string;
  secretKeyName?: string;
  buildState: string;
  configState: string;
  runState: string;
  lastRun: {
    runId: string;
    status: string;
    summary: string | null;
    startedAt: string;
    finishedAt: string | null;
    durationMs: number | null;
    trigger: string;
    metrics: Record<string, any> | null;
    actualOutputs: string[];
    missingOutputs: string[];
    errorCode: string | null;
    errorDetail: string | null;
  } | null;
}

interface ServiceCatalogResponse {
  services: CatalogService[];
  slugLabels: Record<string, string>;
}

interface IntegrationCheck {
  id: number;
  integrationId: string;
  checkType: string;
  status: string;
  details: any;
  durationMs: number;
  checkedAt: string;
}

interface ServiceRun {
  id: number;
  runId: string;
  siteId: string | null;
  siteName?: string;
  integrationId: string;
  trigger: string;
  status: string;
  summary: string | null;
  inputs: any;
  outputs: any;
  metricsCollected: any;
  durationMs: number | null;
  startedAt: string;
  finishedAt: string | null;
  errorMessage: string | null;
}

interface IntegrationWithRun extends Integration {
  lastRun?: ServiceRun | null;
}

interface SiteSummaryService {
  slug: string;
  displayName: string;
  category: string;
  description: string;
  purpose: string;
  inputs: string[];
  outputs: string[];
  keyMetrics: string[];
  commonFailures: string[];
  buildState: 'built' | 'planned';
  configState: 'ready' | 'blocked' | 'needs_config';
  runState: 'never_ran' | 'success' | 'failed' | 'partial' | 'stale';
  blockingReason: string | null;
  missingOutputs: string[];
  lastRun: {
    id: string;
    status: string;
    finishedAt: string;
    durationMs: number | null;
    summary: string | null;
    metrics: Record<string, any> | null;
    missingOutputsCount: number;
  } | null;
}

interface SiteSummaryRollups {
  totalServices: number;
  built: number;
  planned: number;
  ready: number;
  blocked: number;
  needsConfig: number;
  ran24h: number;
  neverRan: number;
  failed: number;
  stale: number;
}

interface SiteSummaryNextAction {
  priority: number;
  serviceSlug: string;
  reason: string;
  cta: string;
}

interface SiteSummaryResponse {
  site: { id: string; domain: string };
  platform: {
    bitwarden: { connected: boolean; secretsFound: number };
    database: { connected: boolean };
  };
  rollups: SiteSummaryRollups;
  nextActions: SiteSummaryNextAction[];
  services: SiteSummaryService[];
  slugLabels: Record<string, string>;
}

const CATEGORY_ICONS: Record<string, typeof Database> = {
  data: Database,
  analysis: Search,
  execution: Zap,
  infrastructure: Shield,
};

const CATEGORY_LABELS: Record<string, string> = {
  data: "Data Source",
  analysis: "Analysis",
  execution: "Execution",
  infrastructure: "Infrastructure",
};

const DEPLOYMENT_STATUS_COLORS: Record<string, string> = {
  not_built: "bg-gray-100 text-gray-700",
  building: "bg-blue-100 text-blue-700",
  built: "bg-yellow-100 text-yellow-700",
  deploying: "bg-blue-100 text-blue-700",
  deployed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
};

const BUILD_STATE_COLORS: Record<string, string> = {
  built: "bg-green-100 text-green-700",
  planned: "bg-gray-100 text-gray-600",
  deprecated: "bg-red-100 text-red-700",
};

const CONFIG_STATE_COLORS: Record<string, string> = {
  ready: "bg-green-100 text-green-700",
  missing_config: "bg-yellow-100 text-yellow-700",
  blocked: "bg-orange-100 text-orange-700",
};

const RUN_STATE_COLORS: Record<string, string> = {
  never_ran: "bg-gray-100 text-gray-600",
  last_run_success: "bg-green-100 text-green-700",
  last_run_failed: "bg-red-100 text-red-700",
  stale: "bg-yellow-100 text-yellow-700",
};

function getRunStateIcon(runState: string | null) {
  switch (runState) {
    case "last_run_success":
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case "last_run_failed":
      return <XCircle className="w-5 h-5 text-red-500" />;
    case "stale":
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    default:
      return <Clock className="w-5 h-5 text-gray-400" />;
  }
}

function getConfigStateBadge(configState: string | null) {
  if (!configState) return null;
  const labels: Record<string, string> = {
    ready: "Ready",
    missing_config: "Needs Config",
    blocked: "Blocked",
  };
  return (
    <Badge className={cn("text-xs", CONFIG_STATE_COLORS[configState] || "bg-gray-100")}>
      {labels[configState] || configState}
    </Badge>
  );
}

function getBuildStateBadge(buildState: string | null) {
  if (!buildState) return null;
  const labels: Record<string, string> = {
    built: "Built",
    planned: "Planned",
    deprecated: "Deprecated",
  };
  return (
    <Badge variant="outline" className={cn("text-xs", BUILD_STATE_COLORS[buildState] || "bg-gray-100")}>
      {labels[buildState] || buildState}
    </Badge>
  );
}

function getStatusIcon(status: string | null | undefined) {
  switch (status) {
    case "healthy":
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case "degraded":
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    case "error":
      return <XCircle className="w-5 h-5 text-red-500" />;
    default:
      return <Clock className="w-5 h-5 text-gray-400" />;
  }
}

function getStatusBadge(status: string | null | undefined) {
  switch (status) {
    case "healthy":
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Healthy</Badge>;
    case "degraded":
      return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">Degraded</Badge>;
    case "error":
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Error</Badge>;
    default:
      return <Badge variant="secondary">Disconnected</Badge>;
  }
}

function StatusCell({ status, label }: { status: string | null | undefined; label?: string }) {
  if (status === "pass" || status === true) {
    return (
      <div className="flex items-center gap-1">
        <CheckCircle className="w-4 h-4 text-green-500" />
        {label && <span className="text-xs text-green-600">{label}</span>}
      </div>
    );
  }
  if (status === "fail" || status === false) {
    return (
      <div className="flex items-center gap-1">
        <XCircle className="w-4 h-4 text-red-500" />
        {label && <span className="text-xs text-red-600">{label}</span>}
      </div>
    );
  }
  if (status === "warning") {
    return (
      <div className="flex items-center gap-1">
        <AlertTriangle className="w-4 h-4 text-yellow-500" />
        {label && <span className="text-xs text-yellow-600">{label}</span>}
      </div>
    );
  }
  if (status === "not_configured" || status === "unknown") {
    return (
      <div className="flex items-center gap-1">
        <HelpCircle className="w-4 h-4 text-gray-400" />
        {label && <span className="text-xs text-gray-500">{label}</span>}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <span className="w-4 h-4 rounded-full bg-gray-200" />
      <span className="text-xs text-gray-400">—</span>
    </div>
  );
}

function formatTimeAgo(date: string | null): string {
  if (!date) return "Never";
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

interface PlatformDependencies {
  bitwarden: {
    connected: boolean;
    reason: string | null;
    secretsFound: number;
    lastCheckedAt: string;
    httpStatus: number | null;
    lastError: string | null;
  };
  postgres: {
    connected: boolean;
    reason: string | null;
    lastCheckedAt: string;
  };
}

interface Site {
  siteId: string;
  displayName: string;
  baseUrl: string;
  status: string;
}

export default function Integrations() {
  const queryClient = useQueryClient();
  const [testingId, setTestingId] = useState<string | null>(null);
  const [healthCheckingId, setHealthCheckingId] = useState<string | null>(null);
  const [authTestingId, setAuthTestingId] = useState<string | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [selectedCatalogService, setSelectedCatalogService] = useState<CatalogService | null>(null);
  const [selectedRun, setSelectedRun] = useState<ServiceRun | null>(null);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [viewMode, setViewMode] = useState<'operational' | 'diagnostics'>('operational');
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [runningDiagnosis, setRunningDiagnosis] = useState(false);
  const [editForm, setEditForm] = useState<{
    baseUrl: string;
    healthEndpoint: string;
    metaEndpoint: string;
    secretKeyName: string;
    notes: string;
    authRequired: boolean;
  }>({
    baseUrl: "",
    healthEndpoint: "/health",
    metaEndpoint: "/meta",
    secretKeyName: "",
    notes: "",
    authRequired: true,
  });
  const [testingAll, setTestingAll] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [runningQa, setRunningQa] = useState(false);
  const [qaResults, setQaResults] = useState<{
    runId: string;
    status: string;
    summary: string;
    totalTests: number;
    passed: number;
    failed: number;
    skipped: number;
    items: Array<{
      serviceSlug: string;
      testType: string;
      status: string;
      details: string;
      durationMs: number;
      httpStatus?: number;
      latencyMs?: number;
    }>;
  } | null>(null);
  const [showQaResults, setShowQaResults] = useState(false);
  const [qaMode, setQaMode] = useState<"connection" | "smoke" | "full">("connection");
  const [lastRefreshInfo, setLastRefreshInfo] = useState<{
    refreshedAt: string | null;
    vaultConnected: boolean;
    vaultReason: string | null;
    vaultError: string | null;
    secretsCount: number;
    summary: { total: number; healthy: number; failed: number; secretsFound: number } | null;
  }>({ refreshedAt: null, vaultConnected: false, vaultReason: null, vaultError: null, secretsCount: 0, summary: null });

  const { data: integrations, isLoading } = useQuery<Integration[]>({
    queryKey: ["platformIntegrations"],
    queryFn: async () => {
      const res = await fetch("/api/integrations");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch service runs to show last run info per service
  const { data: serviceRuns } = useQuery<ServiceRun[]>({
    queryKey: ["serviceRuns"],
    queryFn: async () => {
      const res = await fetch("/api/runs?limit=100");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch platform dependencies (Bitwarden + Postgres real status)
  const { data: platformDeps, refetch: refetchPlatformDeps } = useQuery<PlatformDependencies>({
    queryKey: ["platformDependencies"],
    queryFn: async () => {
      const res = await fetch("/api/platform/dependencies");
      if (!res.ok) return null;
      return res.json();
    },
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch sites for site selection
  const { data: sites } = useQuery<Site[]>({
    queryKey: ["sites"],
    queryFn: async () => {
      const res = await fetch("/api/sites");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch service catalog with combined run data
  const { data: catalogData } = useQuery<ServiceCatalogResponse>({
    queryKey: ["serviceCatalog"],
    queryFn: async () => {
      const res = await fetch("/api/services/catalog");
      if (!res.ok) return { services: [], slugLabels: {} };
      return res.json();
    },
  });

  const catalogServices = catalogData?.services || [];
  const slugLabels = catalogData?.slugLabels || {};
  
  const getSlugLabel = (slug: string): string => {
    return slugLabels[slug] || slug.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Auto-select first site if none selected
  useEffect(() => {
    if (sites && sites.length > 0 && !selectedSiteId) {
      setSelectedSiteId(sites[0].siteId);
    }
  }, [sites, selectedSiteId]);

  // Fetch site integrations summary (operational cockpit)
  const { data: siteSummary, isLoading: siteSummaryLoading, refetch: refetchSiteSummary } = useQuery<SiteSummaryResponse>({
    queryKey: ["siteSummary", selectedSiteId],
    queryFn: async () => {
      if (!selectedSiteId) return null;
      const res = await fetch(`/api/sites/${selectedSiteId}/integrations/summary`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!selectedSiteId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Run Daily Diagnosis mutation
  const runDiagnosisMutation = useMutation({
    mutationFn: async (siteId: string) => {
      setRunningDiagnosis(true);
      const res = await fetch("/api/diagnostics/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errorData.error || `Run failed: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["platformIntegrations"] });
      queryClient.invalidateQueries({ queryKey: ["serviceRuns"] });
      toast.success(`Diagnosis complete: ${data.summary}`);
      setRunningDiagnosis(false);
    },
    onError: (error: Error) => {
      toast.error(`Diagnosis failed: ${error.message}`);
      setRunningDiagnosis(false);
    },
  });

  // Run QA mutation
  const runQaMutation = useMutation({
    mutationFn: async (mode: "connection" | "smoke" | "full") => {
      setRunningQa(true);
      const res = await fetch("/api/qa/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId: selectedSiteId, mode, trigger: "manual" }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errorData.error || `QA run failed: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["platformIntegrations"] });
      queryClient.invalidateQueries({ queryKey: ["serviceCatalog"] });
      queryClient.invalidateQueries({ queryKey: ["siteSummary"] });
      queryClient.invalidateQueries({ queryKey: ["serviceRuns"] });
      setQaResults(data);
      setShowQaResults(true);
      setRunningQa(false);
      
      const statusIcon = data.status === "pass" ? "✓" : data.status === "partial" ? "⚠" : "✗";
      if (data.status === "pass") {
        toast.success(`QA Complete: ${statusIcon} ${data.summary}`);
      } else if (data.status === "partial") {
        toast.warning(`QA Complete: ${statusIcon} ${data.summary}`);
      } else {
        toast.error(`QA Failed: ${statusIcon} ${data.summary}`);
      }
    },
    onError: (error: Error) => {
      toast.error(`QA failed: ${error.message}`);
      setRunningQa(false);
    },
  });

  // Build a map of integrationId -> last run
  const lastRunByService: Record<string, ServiceRun> = {};
  if (serviceRuns) {
    for (const run of serviceRuns) {
      if (!lastRunByService[run.integrationId]) {
        lastRunByService[run.integrationId] = run;
      }
    }
  }

  // Calculate runs-based stats
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const runsLast24h = serviceRuns?.filter(r => new Date(r.startedAt) > oneDayAgo) || [];
  const uniqueServicesRan24h = new Set(runsLast24h.map(r => r.integrationId)).size;
  const failedRuns24h = runsLast24h.filter(r => r.status === 'failed').length;

  const seedMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/integrations/seed", { method: "POST" });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["platformIntegrations"] });
      toast.success(data.message);
    },
    onError: () => {
      toast.error("Failed to seed integrations");
    },
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      setIsRefreshing(true);
      const res = await fetch("/api/integrations/refresh", { method: "POST" });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(errorData.error || `Refresh failed: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["platformIntegrations"] });
      setLastRefreshInfo({
        refreshedAt: data.refreshedAt,
        vaultConnected: data.vaultStatus?.connected || false,
        vaultReason: data.vaultStatus?.reason || null,
        vaultError: data.vaultStatus?.error || null,
        secretsCount: data.vaultStatus?.secretsCount || 0,
        summary: data.summary,
      });
      
      const summary = data.summary;
      if (data.vaultStatus?.connected) {
        toast.success(
          `Refresh complete: ${summary.healthy}/${summary.total} healthy, ${summary.secretsFound} secrets found`,
          { description: `Bitwarden connected with ${data.vaultStatus.secretsCount} secrets` }
        );
      } else {
        // Show specific error message based on reason
        const reason = data.vaultStatus?.reason;
        let description = data.vaultStatus?.error || "Bitwarden not connected";
        if (reason === "MISSING_TOKEN") {
          description = "BWS_ACCESS_TOKEN not set in environment";
        } else if (reason === "MISSING_PROJECT_ID") {
          description = "BWS_PROJECT_ID not set. Add it to Replit Secrets.";
        } else if (reason === "UNAUTHORIZED") {
          description = "Token invalid or expired. Rotate BWS_ACCESS_TOKEN.";
        } else if (reason === "FORBIDDEN") {
          description = "Machine account doesn't have access to this project.";
        } else if (reason === "PROJECT_NOT_FOUND") {
          description = "Project ID is wrong or project doesn't exist.";
        } else if (reason === "ZERO_SECRETS") {
          description = "Connected, but no secrets found in this project.";
        }
        toast.warning(
          `Refresh complete: ${summary.healthy}/${summary.total} healthy`,
          { description }
        );
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to refresh integrations", { description: error.message });
    },
    onSettled: () => {
      setIsRefreshing(false);
    },
  });

  const testMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      setTestingId(integrationId);
      const res = await fetch(`/api/integrations/${integrationId}/test`, { method: "POST" });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["platformIntegrations"] });
      queryClient.invalidateQueries({ queryKey: ["serviceCatalog"] });
      queryClient.invalidateQueries({ queryKey: ["siteSummary"] });
      queryClient.invalidateQueries({ queryKey: ["serviceRuns"] });
      setTestingId(null);
      
      if (data.status === "pass") {
        toast.success(`${data.integrationId} connection test passed`, {
          description: data.summary,
        });
      } else if (data.status === "warning") {
        toast.warning(`${data.integrationId} has partial connectivity`, {
          description: data.summary,
        });
      } else {
        toast.error(`${data.integrationId} connection test failed`, {
          description: data.summary,
        });
      }
      
      // Close the modal so user sees the refreshed data in the table
      setSelectedCatalogService(null);
    },
    onError: (error: any) => {
      setTestingId(null);
      toast.error(error.message || "Test failed");
    },
  });

  const healthCheckMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      setHealthCheckingId(integrationId);
      const res = await fetch(`/api/integrations/${integrationId}/health-check`, { method: "POST" });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["platformIntegrations"] });
      setHealthCheckingId(null);
      
      if (data.health?.status === "pass") {
        toast.success(`${data.integrationId} health check passed`);
      } else if (data.health?.status === "not_configured") {
        toast.warning(`${data.integrationId} has no base URL configured`);
      } else {
        toast.error(`${data.integrationId} health check failed`);
      }
    },
    onError: (error: any) => {
      setHealthCheckingId(null);
      toast.error(error.message || "Health check failed");
    },
  });

  const authTestMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      setAuthTestingId(integrationId);
      const res = await fetch(`/api/integrations/${integrationId}/auth-test`, { method: "POST" });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["platformIntegrations"] });
      setAuthTestingId(null);
      
      if (data.authStatus === "pass") {
        toast.success(`${data.integrationId} auth test passed`);
      } else if (data.authStatus === "unknown") {
        toast.warning(`${data.integrationId} auth not configured`);
      } else {
        toast.error(`${data.integrationId} auth test failed`);
      }
    },
    onError: (error: any) => {
      setAuthTestingId(null);
      toast.error(error.message || "Auth test failed");
    },
  });

  const testAllMutation = useMutation({
    mutationFn: async () => {
      setTestingAll(true);
      const res = await fetch("/api/integrations/test-all", { method: "POST" });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["platformIntegrations"] });
      setTestingAll(false);
      const passed = data.results?.filter((r: any) => r.healthResult?.status === "pass").length || 0;
      toast.success(`Tested ${data.tested} services: ${passed} passed`);
    },
    onError: (error: any) => {
      setTestingAll(false);
      toast.error(error.message || "Test all failed");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ integrationId, updates }: { integrationId: string; updates: any }) => {
      const res = await fetch(`/api/integrations/${integrationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Failed to update integration (${res.status})`);
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platformIntegrations"] });
      setEditingIntegration(null);
      toast.success("Integration updated");
    },
    onError: (error: any) => {
      toast.error(error.message || "Update failed");
    },
  });

  const fetchIntegrationDetails = async (integrationId: string) => {
    const res = await fetch(`/api/integrations/${integrationId}`);
    const data = await res.json();
    setSelectedIntegration(data);
  };

  const openEditDialog = (integration: Integration) => {
    setEditForm({
      baseUrl: integration.baseUrl || "",
      healthEndpoint: integration.healthEndpoint || "/health",
      metaEndpoint: integration.metaEndpoint || "/meta",
      secretKeyName: integration.secretKeyName || "",
      notes: integration.notes || "",
      authRequired: integration.authRequired ?? true,
    });
    setEditingIntegration(integration);
  };

  const groupedIntegrations = integrations?.reduce((acc, integration) => {
    const category = integration.category || "other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(integration);
    return acc;
  }, {} as Record<string, Integration[]>) || {};

  // Separate platform dependencies from worker services
  const platformDependencies = integrations?.filter(i => i.category === 'platform_dependency') || [];
  const workerServices = integrations?.filter(i => i.category !== 'platform_dependency') || [];
  
  // Calculate summary stats for worker services only
  const summaryStats = {
    total: workerServices.length,
    enabled: workerServices.filter(i => i.enabled).length,
    configured: workerServices.filter(i => i.baseUrl).length,
    secretsSet: workerServices.filter(i => i.secretExists).length,
    secretsMissing: workerServices.filter(i => i.secretKeyName && !i.secretExists).length,
    healthy: workerServices.filter(i => i.healthCheckStatus === "pass").length,
    failing: workerServices.filter(i => i.healthCheckStatus === "fail").length,
    notConfigured: workerServices.filter(i => !i.baseUrl).length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
              Integrations
            </h1>
            <p className="text-muted-foreground">
              Platform services, data sources, and their operational health
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-md">
              <select
                value={qaMode}
                onChange={(e) => setQaMode(e.target.value as "connection" | "smoke" | "full")}
                disabled={runningQa}
                className="h-9 px-2 text-sm bg-transparent border-r focus:outline-none"
                data-testid="select-qa-mode"
              >
                <option value="connection">Connection Only</option>
                <option value="smoke">Smoke Test</option>
                <option value="full">Full QA</option>
              </select>
              <Button
                variant="default"
                onClick={() => runQaMutation.mutate(qaMode)}
                disabled={runningQa}
                className="rounded-l-none"
                data-testid="button-run-qa"
              >
                {runningQa ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                {runningQa ? "Running..." : "Run QA"}
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={() => refreshMutation.mutate()}
              disabled={isLoading || isRefreshing}
              data-testid="button-refresh-integrations"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isRefreshing && "animate-spin")} />
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </Button>
            {(!integrations || integrations.length === 0) && (
              <Button
                variant="outline"
                onClick={() => seedMutation.mutate()}
                disabled={seedMutation.isPending}
                data-testid="button-seed-integrations"
              >
                {seedMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Settings className="w-4 h-4 mr-2" />
                )}
                Initialize Integrations
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : !integrations || integrations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Link2 className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-center mb-4">
                No integrations configured. Click the button above to initialize platform integrations.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Site Selection and Run Diagnosis */}
            <Card className="mb-4">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Site:</span>
                      <select
                        className="border rounded px-3 py-1.5 text-sm bg-background"
                        value={selectedSiteId || ""}
                        onChange={(e) => setSelectedSiteId(e.target.value)}
                        data-testid="select-site"
                      >
                        {sites?.map((site) => (
                          <option key={site.siteId} value={site.siteId}>
                            {site.displayName}
                          </option>
                        ))}
                      </select>
                    </div>
                    {selectedSiteId && sites?.find(s => s.siteId === selectedSiteId) && (
                      <span className="text-xs text-muted-foreground">
                        {sites.find(s => s.siteId === selectedSiteId)?.baseUrl}
                      </span>
                    )}
                  </div>
                  <Button
                    onClick={() => selectedSiteId && runDiagnosisMutation.mutate(selectedSiteId)}
                    disabled={!selectedSiteId || runningDiagnosis}
                    data-testid="button-run-diagnosis"
                  >
                    {runningDiagnosis ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Run Daily Diagnosis
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Tabs defaultValue="inventory" className="space-y-4">
              <TabsList>
                <TabsTrigger value="inventory" className="gap-2">
                  <Table className="w-4 h-4" />
                  Service Inventory
                </TabsTrigger>
                <TabsTrigger value="cards" className="gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  Cards View
                </TabsTrigger>
              </TabsList>

            <TabsContent value="inventory" className="space-y-4">
              {/* Platform Dependencies Panel */}
              <Card className="bg-slate-50 dark:bg-slate-900/50">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Platform Dependencies
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-auto"
                      onClick={() => refetchPlatformDeps()}
                    >
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Bitwarden Status */}
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        platformDeps?.bitwarden?.connected 
                          ? "bg-green-100 text-green-600" 
                          : "bg-yellow-100 text-yellow-600"
                      )}>
                        <Key className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Bitwarden</p>
                        <p className="text-xs text-muted-foreground">
                          {platformDeps?.bitwarden?.connected 
                            ? (platformDeps.bitwarden.reason === "ZERO_SECRETS" 
                                ? "Connected · 0 secrets" 
                                : `Connected · ${platformDeps.bitwarden.secretsFound} secrets`)
                            : platformDeps?.bitwarden?.reason === "MISSING_TOKEN"
                              ? "Missing token"
                              : platformDeps?.bitwarden?.reason === "MISSING_PROJECT_ID"
                                ? "Missing project ID"
                                : platformDeps?.bitwarden?.reason === "UNAUTHORIZED"
                                  ? "Unauthorized (401)"
                                  : platformDeps?.bitwarden?.reason === "FORBIDDEN"
                                    ? "Forbidden (403)"
                                    : "Not connected"}
                        </p>
                      </div>
                      {platformDeps?.bitwarden?.connected ? (
                        <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-500 ml-auto" />
                      )}
                    </div>
                    {/* Database Status */}
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        platformDeps?.postgres?.connected 
                          ? "bg-green-100 text-green-600" 
                          : "bg-red-100 text-red-600"
                      )}>
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">PostgreSQL</p>
                        <p className="text-xs text-muted-foreground">
                          {platformDeps?.postgres?.connected ? "Connected" : "Disconnected"}
                        </p>
                      </div>
                      {platformDeps?.postgres?.connected ? (
                        <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500 ml-auto" />
                      )}
                    </div>
                  </div>
                  {platformDeps?.bitwarden && !platformDeps.bitwarden.connected && platformDeps.bitwarden.lastError && (
                    <div className="mt-3 text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                      {platformDeps.bitwarden.lastError}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Summary Stats Bar - Computed from Summary Endpoint */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <Card className="p-3" data-testid="stat-services">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="text-lg font-bold">{siteSummary?.rollups?.totalServices ?? summaryStats.total}</p>
                      <p className="text-xs text-muted-foreground">Services</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-3" data-testid="stat-built">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <div>
                      <p className="text-lg font-bold">{siteSummary?.rollups?.built ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Built</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-3" data-testid="stat-ready">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="text-lg font-bold">{siteSummary?.rollups?.ready ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Ready</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-3" data-testid="stat-ran24h">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-500" />
                    <div>
                      <p className="text-lg font-bold">{siteSummary?.rollups?.ran24h ?? uniqueServicesRan24h}</p>
                      <p className="text-xs text-muted-foreground">Ran 24h</p>
                    </div>
                  </div>
                </Card>
                <Card className={cn("p-3", (siteSummary?.rollups?.failed ?? 0) > 0 && "border-red-200 bg-red-50 dark:bg-red-900/20")} data-testid="stat-failed">
                  <div className="flex items-center gap-2">
                    <XCircle className={cn("w-4 h-4", (siteSummary?.rollups?.failed ?? 0) > 0 ? "text-red-500" : "text-gray-400")} />
                    <div>
                      <p className={cn("text-lg font-bold", (siteSummary?.rollups?.failed ?? 0) > 0 && "text-red-600")}>{siteSummary?.rollups?.failed ?? 0}</p>
                      <p className={cn("text-xs", (siteSummary?.rollups?.failed ?? 0) > 0 ? "text-red-600" : "text-muted-foreground")}>Failed</p>
                    </div>
                  </div>
                </Card>
                {(siteSummary?.rollups?.blocked ?? 0) > 0 && (
                  <Card className="p-3 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20" data-testid="stat-blocked">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      <div>
                        <p className="text-lg font-bold text-yellow-600">{siteSummary?.rollups?.blocked ?? 0}</p>
                        <p className="text-xs text-yellow-600">Blocked</p>
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              {/* Next Actions Panel */}
              {siteSummary?.nextActions && siteSummary.nextActions.length > 0 && (
                <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/20" data-testid="next-actions-panel">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500" />
                      Next Actions ({siteSummary.nextActions.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {siteSummary.nextActions.slice(0, 5).map((action, idx) => {
                        const service = siteSummary.services.find(s => s.slug === action.serviceSlug);
                        return (
                          <div 
                            key={`${action.serviceSlug}-${idx}`} 
                            className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded border"
                            data-testid={`next-action-${action.serviceSlug}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">
                                P{action.priority}
                              </span>
                              <span className="font-medium text-sm">{service?.displayName || action.serviceSlug}</span>
                              <span className="text-xs text-muted-foreground">{action.reason}</span>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-6 text-xs"
                              onClick={() => {
                                const svc = siteSummary.services.find(s => s.slug === action.serviceSlug);
                                if (svc) {
                                  setSelectedCatalogService(svc as unknown as CatalogService);
                                }
                              }}
                            >
                              {action.cta}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Ask Hermes */}
              <AskAI mode="operational" siteId={selectedSiteId || undefined} />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    {viewMode === 'operational' 
                      ? 'What ran, when, and what it returned'
                      : 'Technical: endpoints, auth, secrets, connectivity'}
                  </p>
                  <div className="flex items-center gap-1 bg-muted rounded-md p-1">
                    <Button
                      variant={viewMode === 'operational' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setViewMode('operational')}
                    >
                      Operational
                    </Button>
                    <Button
                      variant={viewMode === 'diagnostics' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setViewMode('diagnostics')}
                    >
                      Diagnostics
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={() => testAllMutation.mutate()}
                  disabled={testingAll}
                  data-testid="button-test-all"
                >
                  {testingAll ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-2" />
                  )}
                  Test All Services
                </Button>
              </div>

              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      {viewMode === 'operational' ? (
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium">Service</th>
                          <th className="text-center p-3 font-medium">Status</th>
                          <th className="text-left p-3 font-medium">Last Run</th>
                          <th className="text-left p-3 font-medium">Summary</th>
                          <th className="text-left p-3 font-medium">Metrics</th>
                          <th className="text-left p-3 font-medium">Missing</th>
                          <th className="text-center p-3 font-medium">Actions</th>
                        </tr>
                      ) : (
                        <tr className="border-b bg-muted/50">
                          <th className="text-left p-3 font-medium">Service</th>
                          <th className="text-left p-3 font-medium">Base URL</th>
                          <th className="text-center p-3 font-medium">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>Configured</TooltipTrigger>
                                <TooltipContent>Base URL configured?</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </th>
                          <th className="text-center p-3 font-medium">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>Reachable</TooltipTrigger>
                                <TooltipContent>Can Hermes reach this service?</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </th>
                          <th className="text-center p-3 font-medium">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>/health</TooltipTrigger>
                                <TooltipContent>Health endpoint check</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </th>
                          <th className="text-center p-3 font-medium">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>Auth</TooltipTrigger>
                                <TooltipContent>Auth enforced? (401 without key)</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </th>
                          <th className="text-center p-3 font-medium">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>Secret</TooltipTrigger>
                                <TooltipContent>API key/secret exists?</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </th>
                          <th className="text-center p-3 font-medium">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>E2E</TooltipTrigger>
                                <TooltipContent>Called successfully end-to-end?</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </th>
                          <th className="text-left p-3 font-medium">Notes</th>
                          <th className="text-center p-3 font-medium">Actions</th>
                        </tr>
                      )}
                    </thead>
                    <tbody>
                      {viewMode === 'operational' ? (
                        // Operational View - Use siteSummary.services for per-site computed states
                        (siteSummary?.services || []).map((service) => {
                          const RUN_STATE_COLORS: Record<string, string> = {
                            success: 'bg-green-100 text-green-700',
                            failed: 'bg-red-100 text-red-700',
                            partial: 'bg-yellow-100 text-yellow-700',
                            stale: 'bg-orange-100 text-orange-700',
                            never_ran: 'bg-gray-100 text-gray-600',
                          };
                          const CONFIG_STATE_BADGES: Record<string, { label: string; color: string }> = {
                            ready: { label: 'Ready', color: 'bg-green-100 text-green-700' },
                            blocked: { label: 'Blocked', color: 'bg-orange-100 text-orange-700' },
                            needs_config: { label: 'Needs Config', color: 'bg-gray-100 text-gray-600' },
                          };
                          return (
                            <tr 
                              key={service.slug} 
                              className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                              onClick={() => setSelectedCatalogService(service as unknown as CatalogService)}
                              data-testid={`row-service-${service.slug}`}
                            >
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  {service.runState === 'success' ? <CheckCircle className="w-4 h-4 text-green-500" /> :
                                   service.runState === 'failed' ? <XCircle className="w-4 h-4 text-red-500" /> :
                                   service.runState === 'partial' ? <AlertTriangle className="w-4 h-4 text-yellow-500" /> :
                                   service.runState === 'stale' ? <AlertTriangle className="w-4 h-4 text-orange-500" /> :
                                   <Clock className="w-4 h-4 text-gray-400" />}
                                  <div>
                                    <div className="font-medium">{service.displayName}</div>
                                    <div className="text-xs text-muted-foreground">{service.category}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <Badge className={cn("text-[10px] px-1.5 py-0", RUN_STATE_COLORS[service.runState] || 'bg-gray-100')}>
                                    {service.runState.replace('_', ' ')}
                                  </Badge>
                                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", CONFIG_STATE_BADGES[service.configState]?.color || 'bg-gray-100')}>
                                    {CONFIG_STATE_BADGES[service.configState]?.label || service.configState}
                                  </Badge>
                                </div>
                              </td>
                              <td className="p-3">
                                {service.lastRun ? (
                                  <div className="text-xs">
                                    <div className="font-medium">{formatTimeAgo(service.lastRun.finishedAt)}</div>
                                    {service.lastRun.durationMs && (
                                      <div className="text-muted-foreground">{(service.lastRun.durationMs / 1000).toFixed(1)}s</div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Never ran</span>
                                )}
                              </td>
                              <td className="p-3">
                                <span className="text-xs text-muted-foreground line-clamp-2" title={service.lastRun?.summary || service.blockingReason || undefined}>
                                  {service.lastRun?.summary || service.blockingReason || "—"}
                                </span>
                              </td>
                              <td className="p-3">
                                {service.lastRun?.metrics && Object.keys(service.lastRun.metrics).length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {Object.entries(service.lastRun.metrics).slice(0, 2).map(([k, v]) => (
                                      <Badge key={k} variant="outline" className="text-[10px] px-1 py-0">
                                        {k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                                      </Badge>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="p-3">
                                {service.missingOutputs.length > 0 ? (
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-red-300 text-red-600 cursor-help">
                                          {service.missingOutputs.length} missing
                                        </Badge>
                                      </TooltipTrigger>
                                      <TooltipContent className="max-w-xs">
                                        <div className="text-xs">
                                          {service.missingOutputs.map(slug => (
                                            <div key={slug}>{siteSummary?.slugLabels?.[slug] || slug}</div>
                                          ))}
                                        </div>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ) : service.lastRun ? (
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-green-300 text-green-600">
                                    All outputs
                                  </Badge>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="p-3">
                                <div className="flex items-center justify-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          onClick={() => setSelectedCatalogService(service as unknown as CatalogService)}
                                        >
                                          <ChevronRight className="w-3 h-3" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>View details</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        // Diagnostics View - Use workerServices with integration health checks
                        workerServices.map((integration) => (
                          <tr 
                            key={integration.integrationId} 
                            className="border-b hover:bg-muted/30 transition-colors"
                            data-testid={`row-integration-${integration.integrationId}`}
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(integration.healthStatus)}
                                <div>
                                  <div className="font-medium">{integration.name}</div>
                                  <div className="text-xs text-muted-foreground">{integration.category}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              {integration.baseUrl ? (
                                <a 
                                  href={integration.baseUrl} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline flex items-center gap-1"
                                >
                                  {integration.baseUrl.replace(/^https?:\/\//, '').slice(0, 30)}
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <span className="text-xs text-muted-foreground">Not configured</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <StatusCell status={integration.baseUrl ? "pass" : "not_configured"} />
                            </td>
                            <td className="p-3 text-center">
                              <StatusCell status={integration.healthCheckStatus === "pass" ? "pass" : integration.baseUrl ? "fail" : "not_configured"} />
                            </td>
                            <td className="p-3 text-center">
                              <StatusCell status={integration.healthCheckStatus} />
                            </td>
                            <td className="p-3 text-center">
                              <StatusCell status={integration.authTestStatus} />
                            </td>
                            <td className="p-3 text-center">
                              <StatusCell status={integration.secretExists} />
                            </td>
                            <td className="p-3 text-center">
                              <StatusCell status={integration.calledSuccessfully} />
                            </td>
                            <td className="p-3">
                              <span className="text-xs text-muted-foreground line-clamp-1">
                                {integration.notes || "—"}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center justify-center gap-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => healthCheckMutation.mutate(integration.integrationId)}
                                        disabled={healthCheckingId === integration.integrationId}
                                        data-testid={`button-health-${integration.integrationId}`}
                                      >
                                        {healthCheckingId === integration.integrationId ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Server className="w-3 h-3" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Test health endpoint</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => authTestMutation.mutate(integration.integrationId)}
                                        disabled={authTestingId === integration.integrationId}
                                        data-testid={`button-auth-${integration.integrationId}`}
                                      >
                                        {authTestingId === integration.integrationId ? (
                                          <Loader2 className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <Key className="w-3 h-3" />
                                        )}
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Test auth wiring</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => openEditDialog(integration)}
                                      data-testid={`button-edit-${integration.integrationId}`}
                                    >
                                      <Edit className="w-3 h-3" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Edit service details</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </td>
                        </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

            </TabsContent>

            <TabsContent value="cards" className="space-y-8">
              {Object.entries(groupedIntegrations)
                .filter(([category]) => category !== 'platform_dependency')
                .map(([category, categoryIntegrations]) => {
                const CategoryIcon = CATEGORY_ICONS[category] || Globe;
                return (
                  <div key={category} className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      <CategoryIcon className="w-4 h-4" />
                      {CATEGORY_LABELS[category] || category}
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {categoryIntegrations.map((integration) => {
                        const runState = integration.runState || "never_ran";
                        const configState = integration.configState || "missing_config";
                        const buildState = integration.buildState || "planned";
                        return (
                        <Card 
                          key={integration.integrationId}
                          className={cn(
                            "transition-all hover:shadow-md cursor-pointer",
                            runState === "last_run_success" && "border-l-4 border-l-green-500",
                            runState === "last_run_failed" && "border-l-4 border-l-red-500",
                            runState === "stale" && "border-l-4 border-l-yellow-500",
                            runState === "never_ran" && configState === "blocked" && "border-l-4 border-l-orange-400",
                            runState === "never_ran" && configState !== "blocked" && "border-l-4 border-l-gray-300",
                          )}
                          onClick={() => {
                            const catalogService = catalogServices.find(s => s.slug === integration.integrationId);
                            if (catalogService) {
                              setSelectedCatalogService(catalogService);
                            } else {
                              fetchIntegrationDetails(integration.integrationId);
                            }
                          }}
                          data-testid={`card-integration-${integration.integrationId}`}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                {getRunStateIcon(runState)}
                                <CardTitle className="text-base">{integration.name}</CardTitle>
                              </div>
                              <div className="flex gap-1">
                                {getBuildStateBadge(buildState)}
                                {getConfigStateBadge(configState)}
                              </div>
                            </div>
                            <CardDescription className="text-sm">
                              {integration.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Last Run</span>
                                <span className="font-medium">{formatTimeAgo(integration.lastRunAt)}</span>
                              </div>
                              
                              {integration.lastRunSummary && (
                                <div className="text-sm text-muted-foreground truncate">
                                  {integration.lastRunSummary}
                                </div>
                              )}
                              
                              {integration.lastRunMetrics && Object.keys(integration.lastRunMetrics).length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {Object.entries(integration.lastRunMetrics).slice(0, 3).map(([key, value]) => (
                                    <Badge key={key} variant="outline" className="text-xs">
                                      {key}: {String(value)}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between pt-2 border-t">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    testMutation.mutate(integration.integrationId);
                                  }}
                                  disabled={testingId === integration.integrationId || configState === "blocked"}
                                  data-testid={`button-test-${integration.integrationId}`}
                                >
                                  {testingId === integration.integrationId ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    <Activity className="w-4 h-4 mr-1" />
                                  )}
                                  {configState === "blocked" ? "Blocked" : "Test"}
                                </Button>
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                      })}
                    </div>
                  </div>
                );
              })}
            </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      <Dialog open={!!selectedIntegration} onOpenChange={() => setSelectedIntegration(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedIntegration && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  {getStatusIcon(selectedIntegration.healthStatus)}
                  <div className="flex-1">
                    <DialogTitle>{selectedIntegration.name}</DialogTitle>
                    <DialogDescription className="text-xs">{selectedIntegration.category}</DialogDescription>
                  </div>
                  {getStatusBadge(selectedIntegration.healthStatus)}
                </div>
              </DialogHeader>
              
              <div className="space-y-6 mt-4">
                {selectedIntegration.descriptionMd && (
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      What this service is
                    </p>
                    <div className="text-sm prose prose-sm dark:prose-invert max-w-none whitespace-pre-line">
                      {selectedIntegration.descriptionMd}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Last Success</p>
                    <p className="font-medium">{formatTimeAgo(selectedIntegration.lastSuccessAt)}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Last Run</p>
                    <p className="font-medium">
                      {selectedIntegration.recentRuns?.length > 0 
                        ? formatTimeAgo(selectedIntegration.recentRuns[0].finishedAt || selectedIntegration.recentRuns[0].startedAt)
                        : "Never"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Health Check</p>
                    <StatusCell status={selectedIntegration.healthCheckStatus} label={selectedIntegration.healthCheckStatus || "—"} />
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Auth Test</p>
                    <StatusCell status={selectedIntegration.authTestStatus} label={selectedIntegration.authTestStatus || "—"} />
                  </div>
                  <div className="p-3 border rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">Secret Exists</p>
                    <StatusCell status={selectedIntegration.secretExists} label={selectedIntegration.secretExists ? "Yes" : "No"} />
                  </div>
                </div>
                
                {selectedIntegration.expectedSignals && selectedIntegration.expectedSignals.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Expected Signals (Contract)</p>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedIntegration.expectedSignals.map((signal) => {
                        const signalData = selectedIntegration.receivedSignals?.[signal];
                        const isReceived = signalData?.received;
                        const isStale = signalData?.stale;
                        
                        return (
                          <div 
                            key={signal}
                            className={cn(
                              "flex items-center gap-2 p-2 rounded border text-sm",
                              isReceived && !isStale && "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800",
                              isReceived && isStale && "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800",
                              !isReceived && "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800",
                            )}
                          >
                            {isReceived && !isStale && <CheckCircle className="w-4 h-4 text-green-600" />}
                            {isReceived && isStale && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
                            {!isReceived && <XCircle className="w-4 h-4 text-red-600" />}
                            <span>{signal}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedIntegration.lastError && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">Last Error</p>
                    <p className="text-sm text-red-600 dark:text-red-300">
                      {selectedIntegration.lastError}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatTimeAgo(selectedIntegration.lastErrorAt)}
                    </p>
                  </div>
                )}

                {selectedIntegration.recentChecks && selectedIntegration.recentChecks.length > 0 && (
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                      <Clock className="w-4 h-4" />
                      View Recent Checks ({selectedIntegration.recentChecks.length})
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2">
                      {selectedIntegration.recentChecks.map((check) => (
                        <div 
                          key={check.id} 
                          className="flex items-center justify-between p-3 bg-muted rounded-lg text-sm"
                        >
                          <div className="flex items-center gap-2">
                            {check.status === "pass" && <CheckCircle className="w-4 h-4 text-green-500" />}
                            {check.status === "warning" && <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                            {check.status === "fail" && <XCircle className="w-4 h-4 text-red-500" />}
                            <span className="capitalize">{check.checkType}</span>
                          </div>
                          <div className="flex items-center gap-4 text-muted-foreground">
                            <span>{check.durationMs}ms</span>
                            <span>{formatTimeAgo(check.checkedAt)}</span>
                          </div>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedIntegration(null)}
                  >
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      testMutation.mutate(selectedIntegration.integrationId);
                    }}
                    disabled={testingId === selectedIntegration.integrationId}
                    data-testid="button-test-integration-detail"
                  >
                    {testingId === selectedIntegration.integrationId ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Activity className="w-4 h-4 mr-2" />
                    )}
                    Test Connection
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingIntegration} onOpenChange={() => setEditingIntegration(null)}>
        <DialogContent className="max-w-lg">
          {editingIntegration && (
            <>
              <DialogHeader>
                <DialogTitle>Edit {editingIntegration.name}</DialogTitle>
                <DialogDescription>Configure service inventory details</DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="baseUrl">Base URL</Label>
                  <Input
                    id="baseUrl"
                    placeholder="https://service.replit.app"
                    value={editForm.baseUrl}
                    onChange={(e) => setEditForm({ ...editForm, baseUrl: e.target.value })}
                    data-testid="input-base-url"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="healthEndpoint">Health Endpoint</Label>
                    <Input
                      id="healthEndpoint"
                      placeholder="/health"
                      value={editForm.healthEndpoint}
                      onChange={(e) => setEditForm({ ...editForm, healthEndpoint: e.target.value })}
                      data-testid="input-health-endpoint"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="metaEndpoint">Meta Endpoint</Label>
                    <Input
                      id="metaEndpoint"
                      placeholder="/meta"
                      value={editForm.metaEndpoint}
                      onChange={(e) => setEditForm({ ...editForm, metaEndpoint: e.target.value })}
                      data-testid="input-meta-endpoint"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secretKeyName">Secret Key Name (env var)</Label>
                  <Input
                    id="secretKeyName"
                    placeholder="SERVICE_API_KEY"
                    value={editForm.secretKeyName}
                    onChange={(e) => setEditForm({ ...editForm, secretKeyName: e.target.value })}
                    data-testid="input-secret-key"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="authRequired"
                    checked={editForm.authRequired}
                    onChange={(e) => setEditForm({ ...editForm, authRequired: e.target.checked })}
                    className="rounded"
                    data-testid="checkbox-auth-required"
                  />
                  <Label htmlFor="authRequired">Auth Required</Label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Input
                    id="notes"
                    placeholder="Next action or notes..."
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    data-testid="input-notes"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setEditingIntegration(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      updateMutation.mutate({
                        integrationId: editingIntegration.integrationId,
                        updates: editForm,
                      });
                    }}
                    disabled={updateMutation.isPending}
                    data-testid="button-save-integration"
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Save Changes
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Run Detail Dialog */}
      <Dialog open={!!selectedRun} onOpenChange={() => setSelectedRun(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" data-testid="dialog-run-detail">
          {selectedRun && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Run Details
                </DialogTitle>
                <DialogDescription>
                  {selectedRun.runId}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Run Overview */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Status</p>
                    <Badge 
                      variant="outline"
                      className={cn(
                        selectedRun.status === 'success' ? 'bg-green-100 text-green-700' :
                        selectedRun.status === 'running' ? 'bg-blue-100 text-blue-700' :
                        selectedRun.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      )}
                    >
                      {selectedRun.status}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Trigger</p>
                    <p className="text-sm font-medium">{selectedRun.trigger || 'Unknown'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Service</p>
                    <p className="text-sm font-medium">{selectedRun.integrationId}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Site</p>
                    <p className="text-sm font-medium">{selectedRun.siteId || '—'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Started</p>
                    <p className="text-sm">{new Date(selectedRun.startedAt).toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="text-sm">{selectedRun.durationMs ? `${(selectedRun.durationMs / 1000).toFixed(2)}s` : 'Running...'}</p>
                  </div>
                </div>

                {/* Summary */}
                {selectedRun.summary && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Summary</p>
                    <p className="text-sm bg-muted p-2 rounded">{selectedRun.summary}</p>
                  </div>
                )}

                {/* Error Message */}
                {selectedRun.errorMessage && (
                  <div className="space-y-1">
                    <p className="text-xs text-red-500 font-medium">Error</p>
                    <pre className="text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded text-red-700 dark:text-red-300 overflow-x-auto whitespace-pre-wrap">
                      {selectedRun.errorMessage}
                    </pre>
                  </div>
                )}

                {/* Inputs */}
                {selectedRun.inputs && Object.keys(selectedRun.inputs).length > 0 && (
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary">
                      <ChevronRight className="w-4 h-4 transition-transform group-data-[state=open]:rotate-90" />
                      Inputs
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(selectedRun.inputs, null, 2)}
                      </pre>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Outputs */}
                {selectedRun.outputs && Object.keys(selectedRun.outputs).length > 0 && (
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary">
                      <ChevronRight className="w-4 h-4 transition-transform group-data-[state=open]:rotate-90" />
                      Outputs (Actual Results)
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-h-48">
                        {JSON.stringify(selectedRun.outputs, null, 2)}
                      </pre>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Metrics Collected */}
                {selectedRun.metricsCollected && Object.keys(selectedRun.metricsCollected).length > 0 && (
                  <Collapsible defaultOpen>
                    <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:text-primary">
                      <ChevronRight className="w-4 h-4 transition-transform group-data-[state=open]:rotate-90" />
                      Metrics Collected
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {Object.entries(selectedRun.metricsCollected).map(([key, value]) => (
                          <div key={key} className="bg-muted p-2 rounded text-xs">
                            <p className="text-muted-foreground">{key}</p>
                            <p className="font-medium">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</p>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Expected vs Actual Comparison */}
                {(() => {
                  const integration = integrations?.find(i => i.integrationId === selectedRun.integrationId);
                  if (!integration?.expectedSignals?.length) return null;
                  
                  const actualSignals = selectedRun.metricsCollected ? Object.keys(selectedRun.metricsCollected) : [];
                  const matched = integration.expectedSignals.filter(s => actualSignals.includes(s));
                  const missing = integration.expectedSignals.filter(s => !actualSignals.includes(s));
                  const extra = actualSignals.filter(s => !integration.expectedSignals?.includes(s));
                  
                  return (
                    <div className="space-y-2 border-t pt-4">
                      <p className="text-sm font-medium">Expected vs Actual Signals</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="space-y-1">
                          <p className="text-green-600 font-medium">Matched ({matched.length})</p>
                          {matched.map(s => (
                            <div key={s} className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-green-500" />
                              <span>{s}</span>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-1">
                          <p className="text-red-600 font-medium">Missing ({missing.length})</p>
                          {missing.map(s => (
                            <div key={s} className="flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-red-500" />
                              <span>{s}</span>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-1">
                          <p className="text-blue-600 font-medium">Extra ({extra.length})</p>
                          {extra.map(s => (
                            <div key={s} className="flex items-center gap-1">
                              <Activity className="w-3 h-3 text-blue-500" />
                              <span>{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex justify-end pt-4 border-t">
                  <Button variant="outline" onClick={() => setSelectedRun(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Self-Describing Service Detail Dialog */}
      <Dialog open={!!selectedCatalogService} onOpenChange={() => setSelectedCatalogService(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto" data-testid="dialog-catalog-service">
          {selectedCatalogService && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  {getRunStateIcon(selectedCatalogService.runState)}
                  <div className="flex-1">
                    <DialogTitle>{selectedCatalogService.displayName}</DialogTitle>
                    <DialogDescription className="text-sm mt-1">
                      {selectedCatalogService.purpose}
                    </DialogDescription>
                  </div>
                  <div className="flex gap-2">
                    {getBuildStateBadge(selectedCatalogService.buildState)}
                    {getConfigStateBadge(selectedCatalogService.configState)}
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-6 mt-4">
                {/* A) What this service does */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    What this service does
                  </p>
                  <p className="text-sm">{selectedCatalogService.description}</p>
                </div>

                {/* B) What it expects to do */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Expected Inputs</p>
                    <div className="space-y-1">
                      {selectedCatalogService.inputs.map(slug => (
                        <div key={slug} className="text-sm flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                          {getSlugLabel(slug)}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Expected Outputs</p>
                    <div className="space-y-1">
                      {selectedCatalogService.outputs.map(slug => (
                        <div key={slug} className="text-sm flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                          {getSlugLabel(slug)}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Key Metrics</p>
                    <div className="space-y-1">
                      {selectedCatalogService.keyMetrics.map(slug => (
                        <div key={slug} className="text-sm flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                          {getSlugLabel(slug)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* C) What it last did */}
                {selectedCatalogService.lastRun ? (
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      What it last did
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Status</p>
                        <Badge 
                          variant="outline"
                          className={cn(
                            "mt-1",
                            selectedCatalogService.lastRun.status === 'success' ? 'bg-green-100 text-green-700' :
                            selectedCatalogService.lastRun.status === 'running' ? 'bg-blue-100 text-blue-700' :
                            selectedCatalogService.lastRun.status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          )}
                        >
                          {selectedCatalogService.lastRun.status}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Trigger</p>
                        <p className="text-sm font-medium mt-1">{selectedCatalogService.lastRun.trigger}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">When</p>
                        <p className="text-sm mt-1">{formatTimeAgo(selectedCatalogService.lastRun.startedAt)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Duration</p>
                        <p className="text-sm mt-1">
                          {selectedCatalogService.lastRun.durationMs 
                            ? `${(selectedCatalogService.lastRun.durationMs / 1000).toFixed(2)}s` 
                            : 'Running...'}
                        </p>
                      </div>
                    </div>
                    {selectedCatalogService.lastRun.summary && (
                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground">Summary</p>
                        <p className="text-sm mt-1">{selectedCatalogService.lastRun.summary}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900/50">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      This service has never run
                    </p>
                  </div>
                )}

                {/* D) What it returned (expectations vs actuals) */}
                {selectedCatalogService.lastRun && (
                  <div className="p-4 border rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
                      What it returned (Expected vs Actual)
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-green-600">Received</p>
                        {(selectedCatalogService.lastRun.actualOutputs?.length ?? 0) > 0 ? (
                          <div className="space-y-1">
                            {selectedCatalogService.lastRun.actualOutputs?.map(slug => (
                              <div key={slug} className="text-sm flex items-center gap-1 text-green-700">
                                <CheckCircle className="w-3 h-3" />
                                {getSlugLabel(slug)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No outputs recorded</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-red-600">Missing</p>
                        {(selectedCatalogService.lastRun.missingOutputs?.length ?? 0) > 0 ? (
                          <div className="space-y-1">
                            {selectedCatalogService.lastRun.missingOutputs?.map(slug => (
                              <div key={slug} className="text-sm flex items-center gap-1 text-red-700">
                                <XCircle className="w-3 h-3" />
                                {getSlugLabel(slug)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-green-600">All expected outputs received</p>
                        )}
                      </div>
                    </div>
                    
                    {/* Metrics */}
                    {selectedCatalogService.lastRun.metrics && Object.keys(selectedCatalogService.lastRun.metrics).length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-xs text-muted-foreground mb-2">Metrics</p>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(selectedCatalogService.lastRun.metrics).map(([key, value]) => (
                            <Badge key={key} variant="outline" className="text-xs">
                              {getSlugLabel(key)}: {String(value)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* E) What went wrong */}
                {selectedCatalogService.lastRun?.errorCode && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-xs text-red-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      What went wrong
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-red-100 text-red-700">
                          {getSlugLabel(selectedCatalogService.lastRun.errorCode)}
                        </Badge>
                      </div>
                      {selectedCatalogService.lastRun.errorDetail && (
                        <p className="text-sm text-red-700 dark:text-red-300">
                          {selectedCatalogService.lastRun.errorDetail}
                        </p>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                      <p className="text-xs text-muted-foreground mb-1">Common failures for this service:</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedCatalogService.commonFailures.map(slug => (
                          <Badge 
                            key={slug} 
                            variant="outline" 
                            className={cn(
                              "text-xs",
                              slug === selectedCatalogService.lastRun?.errorCode 
                                ? "bg-red-100 text-red-700" 
                                : "bg-gray-100 text-gray-600"
                            )}
                          >
                            {getSlugLabel(slug)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={() => setSelectedCatalogService(null)}>
                    Close
                  </Button>
                  <Button
                    type="button"
                    onClick={() => testMutation.mutate(selectedCatalogService.slug)}
                    disabled={testingId === selectedCatalogService.slug || selectedCatalogService.configState === 'blocked'}
                    data-testid="button-test-catalog-service"
                  >
                    {testingId === selectedCatalogService.slug ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Activity className="w-4 h-4 mr-2" />
                    )}
                    {selectedCatalogService.configState === 'blocked' ? 'Blocked' : 'Test Connection'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* QA Results Modal */}
      <Dialog open={showQaResults} onOpenChange={() => setShowQaResults(false)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              QA Run Results
              {qaResults && (
                <Badge 
                  variant={qaResults.status === "pass" ? "default" : qaResults.status === "partial" ? "secondary" : "destructive"}
                  className="ml-2"
                >
                  {qaResults.status.toUpperCase()}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {qaResults?.summary || "Testing all services..."}
            </DialogDescription>
          </DialogHeader>

          {qaResults && (
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold">{qaResults.totalTests}</p>
                  <p className="text-xs text-muted-foreground">Total Tests</p>
                </div>
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-600">{qaResults.passed}</p>
                  <p className="text-xs text-muted-foreground">Passed</p>
                </div>
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                  <p className="text-2xl font-bold text-red-600">{qaResults.failed}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900/20 rounded-lg text-center">
                  <p className="text-2xl font-bold text-gray-600">{qaResults.skipped}</p>
                  <p className="text-xs text-muted-foreground">Skipped</p>
                </div>
              </div>

              <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                {qaResults.items.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {item.status === "pass" ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : item.status === "fail" ? (
                        <XCircle className="w-5 h-5 text-red-500" />
                      ) : (
                        <Clock className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {item.serviceSlug.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {item.testType}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {item.details}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs text-muted-foreground">
                        {item.durationMs}ms
                      </p>
                      {item.latencyMs && (
                        <p className="text-xs text-muted-foreground">
                          Latency: {item.latencyMs}ms
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowQaResults(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
