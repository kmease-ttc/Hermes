import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useLocation } from "wouter";
import { useSiteContext } from "@/hooks/useSiteContext";
import { SiteSelector } from "@/components/site/SiteSelector";
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
  Info,
  Copy,
  MinusCircle
} from "lucide-react";
import { CrewToggle, useCrewNamesToggle } from "@/components/crew/CrewToggle";
import { CrewBadge } from "@/components/crew/CrewBadge";
import { getCrewMember } from "@/config/agents";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ROUTES } from "@shared/routes";
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
    pendingOutputs?: string[];
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
    errorCode?: string | null;
    errorDetail?: string | null;
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
  not_built: "bg-muted text-muted-foreground",
  building: "bg-semantic-info-soft text-semantic-info",
  built: "bg-semantic-warning-soft text-semantic-warning",
  deploying: "bg-semantic-info-soft text-semantic-info",
  deployed: "bg-semantic-success-soft text-semantic-success",
  failed: "bg-semantic-danger-soft text-semantic-danger",
};

const BUILD_STATE_COLORS: Record<string, string> = {
  built: "bg-semantic-success-soft text-semantic-success",
  planned: "bg-muted text-muted-foreground",
  deprecated: "bg-semantic-danger-soft text-semantic-danger",
};

const CONFIG_STATE_COLORS: Record<string, string> = {
  ready: "bg-semantic-success-soft text-semantic-success",
  missing_config: "bg-semantic-warning-soft text-semantic-warning",
  blocked: "bg-semantic-danger-soft text-semantic-danger",
  needs_config: "bg-semantic-warning-soft text-semantic-warning",
};

const RUN_STATE_COLORS: Record<string, string> = {
  never_ran: "bg-muted text-muted-foreground",
  last_run_success: "bg-semantic-success-soft text-semantic-success",
  last_run_failed: "bg-semantic-danger-soft text-semantic-danger",
  stale: "bg-semantic-warning-soft text-semantic-warning",
  success: "bg-semantic-success-soft text-semantic-success",
  failed: "bg-semantic-danger-soft text-semantic-danger",
  partial: "bg-semantic-warning-soft text-semantic-warning",
};

function getRunStateIcon(runState: string | null) {
  switch (runState) {
    case "last_run_success":
    case "success":
      return <CheckCircle className="w-5 h-5 text-semantic-success" />;
    case "last_run_failed":
    case "failed":
      return <XCircle className="w-5 h-5 text-semantic-danger" />;
    case "stale":
    case "partial":
      return <AlertTriangle className="w-5 h-5 text-semantic-warning" />;
    default:
      return <Clock className="w-5 h-5 text-muted-foreground" />;
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
    <Badge className={cn("text-xs", CONFIG_STATE_COLORS[configState] || "bg-muted")}>
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
    <Badge variant="outline" className={cn("text-xs", BUILD_STATE_COLORS[buildState] || "bg-muted")}>
      {labels[buildState] || buildState}
    </Badge>
  );
}

function getStatusIcon(status: string | null | undefined) {
  switch (status) {
    case "healthy":
      return <CheckCircle className="w-5 h-5 text-semantic-success" />;
    case "degraded":
      return <AlertTriangle className="w-5 h-5 text-semantic-warning" />;
    case "error":
      return <XCircle className="w-5 h-5 text-semantic-danger" />;
    default:
      return <Clock className="w-5 h-5 text-muted-foreground" />;
  }
}

function getStatusBadge(status: string | null | undefined) {
  switch (status) {
    case "healthy":
      return <Badge className="bg-semantic-success-soft text-semantic-success border border-semantic-success-border">Healthy</Badge>;
    case "degraded":
      return <Badge className="bg-semantic-warning-soft text-semantic-warning border border-semantic-warning-border">Degraded</Badge>;
    case "error":
      return <Badge className="bg-semantic-danger-soft text-semantic-danger border border-semantic-danger-border">Error</Badge>;
    default:
      return <Badge variant="secondary" className="bg-muted text-muted-foreground border border-border">Disconnected</Badge>;
  }
}

function StatusCell({ status, label }: { status: string | null | undefined; label?: string }) {
  if (status === "pass" || status === true) {
    return (
      <div className="flex items-center gap-1">
        <CheckCircle className="w-4 h-4 text-semantic-success" />
        {label && <span className="text-xs text-semantic-success">{label}</span>}
      </div>
    );
  }
  if (status === "fail" || status === false) {
    return (
      <div className="flex items-center gap-1">
        <XCircle className="w-4 h-4 text-semantic-danger" />
        {label && <span className="text-xs text-semantic-danger">{label}</span>}
      </div>
    );
  }
  if (status === "warning") {
    return (
      <div className="flex items-center gap-1">
        <AlertTriangle className="w-4 h-4 text-semantic-warning" />
        {label && <span className="text-xs text-semantic-warning">{label}</span>}
      </div>
    );
  }
  if (status === "not_configured" || status === "unknown") {
    return (
      <div className="flex items-center gap-1">
        <HelpCircle className="w-4 h-4 text-muted-foreground" />
        {label && <span className="text-xs text-muted-foreground">{label}</span>}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <span className="w-4 h-4 rounded-full bg-muted" />
      <span className="text-xs text-muted-foreground">—</span>
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
  const [, navigate] = useLocation();
  const { showCrewNames, setShowCrewNames } = useCrewNamesToggle();
  const [testingId, setTestingId] = useState<string | null>(null);
  const [smokeTestingId, setSmokeTestingId] = useState<string | null>(null);
  const [healthCheckingId, setHealthCheckingId] = useState<string | null>(null);
  const [authTestingId, setAuthTestingId] = useState<string | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [selectedCatalogService, setSelectedCatalogService] = useState<CatalogService | null>(null);
  const [selectedRun, setSelectedRun] = useState<ServiceRun | null>(null);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [viewMode, setViewMode] = useState<'operational' | 'diagnostics'>('operational');
  const { selectedSiteId } = useSiteContext();
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
  const [testingConnections, setTestingConnections] = useState(false);
  const [runningSmokeTests, setRunningSmokeTests] = useState(false);
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

  // Quick cached summary for instant loading (SWR pattern)
  const { data: cachedSummary, isLoading: cachedSummaryLoading } = useQuery<{
    siteId: string;
    cachedAt: string;
    isStale: boolean;
    summary: { totalServices: number; healthy: number; degraded: number; error: number; configured: number; unconfigured: number };
    services: Array<{ slug: string; displayName: string; category: string; healthStatus: string; lastRunAt: string | null; lastRunStatus: string | null }>;
    nextActions: Array<{ priority: string; action: string; target: string }>;
    lastRefreshError: string | null;
  }>({
    queryKey: ["integrationsSummaryCache", selectedSiteId],
    queryFn: async () => {
      const siteId = selectedSiteId || 'default';
      const res = await fetch(`/api/integrations/summary?siteId=${siteId}`);
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 30 * 1000, // 30 seconds - will trigger background refresh if stale
    gcTime: 5 * 60 * 1000, // 5 minute cache retention
  });

  const { data: integrations, isLoading } = useQuery<Integration[]>({
    queryKey: ["platformIntegrations"],
    queryFn: async () => {
      const res = await fetch("/api/integrations");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - only refetch after test runs
    gcTime: 60 * 60 * 1000, // 1 hour cache retention
  });

  // Fetch service runs to show last run info per service
  const { data: serviceRuns } = useQuery<ServiceRun[]>({
    queryKey: ["serviceRuns"],
    queryFn: async () => {
      const res = await fetch("/api/runs?limit=100");
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - only refetch after test runs
    gcTime: 60 * 60 * 1000, // 1 hour cache retention
  });

  // Fetch diagnostics for selected catalog service
  const { data: serviceDiagnostics, refetch: refetchDiagnostics } = useQuery<{
    diagnostic: {
      runId: string;
      serviceId: string;
      serviceName: string;
      overallStatus: string;
      stagesJson: Array<{
        stage: string;
        status: 'pending' | 'pass' | 'fail' | 'skipped';
        message: string;
        durationMs?: number;
        details?: Record<string, unknown>;
      }>;
      configSnapshot?: Record<string, unknown>;
      startedAt: string;
      finishedAt?: string;
      durationMs?: number;
    } | null;
  }>({
    queryKey: ["serviceDiagnostics", selectedCatalogService?.slug, selectedSiteId],
    queryFn: async () => {
      if (!selectedCatalogService?.slug) return { diagnostic: null };
      const siteId = selectedSiteId || 'site_empathy_health_clinic';
      const res = await fetch(`/api/sites/${siteId}/services/${selectedCatalogService.slug}/diagnostics/latest`);
      if (!res.ok) return { diagnostic: null };
      return res.json();
    },
    enabled: !!selectedCatalogService?.slug,
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

  // Fetch service catalog with combined run data
  const { data: catalogData } = useQuery<ServiceCatalogResponse>({
    queryKey: ["serviceCatalog"],
    queryFn: async () => {
      const res = await fetch("/api/services/catalog");
      if (!res.ok) return { services: [], slugLabels: {} };
      return res.json();
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - only refetch after test runs
    gcTime: 60 * 60 * 1000, // 1 hour cache retention
  });

  const catalogServices = catalogData?.services || [];
  const slugLabels = catalogData?.slugLabels || {};
  
  const getSlugLabel = (slug: string): string => {
    return slugLabels[slug] || slug.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

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
      queryClient.invalidateQueries({ queryKey: ["serviceDiagnostics"] });
      setTestingId(null);
      
      if (data.status === "pass") {
        toast.success(`${data.integrationId} connection test passed`, {
          description: data.summary,
        });
      } else if (data.status === "warning" || data.status === "partial") {
        toast.warning(`${data.integrationId} connected`, {
          description: data.summary,
        });
      } else {
        toast.error(`${data.integrationId} connection test failed`, {
          description: data.summary,
        });
      }
    },
    onError: (error: any) => {
      setTestingId(null);
      toast.error(error.message || "Test failed");
    },
  });

  const smokeTestMutation = useMutation({
    mutationFn: async (integrationId: string) => {
      setSmokeTestingId(integrationId);
      const res = await fetch(`/api/integrations/${integrationId}/smoke`, { method: "POST" });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["platformIntegrations"] });
      queryClient.invalidateQueries({ queryKey: ["serviceCatalog"] });
      queryClient.invalidateQueries({ queryKey: ["siteSummary"] });
      queryClient.invalidateQueries({ queryKey: ["serviceRuns"] });
      setSmokeTestingId(null);
      
      if (data.status === "pass") {
        toast.success(`${data.integrationId} smoke test passed`, {
          description: `All ${data.actualOutputs?.length || 0} outputs validated`,
        });
      } else if (data.status === "partial") {
        toast.warning(`${data.integrationId} smoke test partial`, {
          description: `${data.actualOutputs?.length || 0}/${data.expectedOutputs?.length || 0} outputs found`,
        });
      } else {
        toast.error(`${data.integrationId} smoke test failed`, {
          description: data.error || `Missing ${data.missingOutputs?.length || 0} outputs`,
        });
      }
      
      setSelectedCatalogService(null);
      setSelectedIntegration(null);
    },
    onError: (error: any) => {
      setSmokeTestingId(null);
      toast.error(error.message || "Smoke test failed");
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
      queryClient.invalidateQueries({ queryKey: ["siteSummary"] });
      queryClient.invalidateQueries({ queryKey: ["serviceCatalog"] });
      setTestingAll(false);
      
      const results = data.results || [];
      const passed = results.filter((r: any) => r.status === "pass").length;
      const partial = results.filter((r: any) => r.status === "partial").length;
      const failed = results.filter((r: any) => r.status === "fail" || r.status === "failed").length;
      
      if (failed === 0 && passed > 0) {
        toast.success(`All ${data.tested} services tested`, {
          description: `${passed} passed${partial > 0 ? `, ${partial} partial` : ''}`,
        });
      } else if (failed > 0) {
        toast.warning(`Tested ${data.tested} services`, {
          description: `${passed} passed, ${partial} partial, ${failed} failed`,
        });
      } else {
        toast.info(`Tested ${data.tested} services`);
      }
    },
    onError: (error: any) => {
      setTestingAll(false);
      toast.error(error.message || "Test all failed");
    },
  });

  // State for async job tracking
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState<any>(null);

  // Poll job status
  const pollJobStatus = async (jobId: string): Promise<any> => {
    const maxAttempts = 120; // 10 minutes max
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      try {
        const res = await fetch(`/api/tests/${jobId}`);
        const data = await res.json();
        setJobProgress(data.progress);
        
        if (data.status === 'done' || data.status === 'failed') {
          return data;
        }
      } catch {
        // Continue polling on error
      }
    }
    throw new Error('Job timed out');
  };

  // Test connections only (async with polling)
  const testConnectionsMutation = useMutation({
    mutationFn: async () => {
      setTestingConnections(true);
      setJobProgress(null);
      
      // Start the job
      const startRes = await fetch("/api/tests/connections/start", { 
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const startData = await startRes.json();
      
      if (startData.error) {
        throw new Error(startData.error);
      }
      
      setActiveJobId(startData.jobId);
      toast.info("Connection test started", { description: "Checking all services..." });
      
      // Poll until done
      const result = await pollJobStatus(startData.jobId);
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["platformIntegrations"] });
      queryClient.invalidateQueries({ queryKey: ["serviceCatalog"] });
      queryClient.invalidateQueries({ queryKey: ["serviceRuns"] });
      setTestingConnections(false);
      setActiveJobId(null);
      setJobProgress(null);
      
      const progress = data.progress || {};
      const passed = progress.completed || 0;
      const failed = progress.failed || 0;
      const total = progress.total || 0;
      
      if (failed === 0 && passed > 0) {
        toast.success(`All ${passed} connections passed`);
      } else if (failed > 0) {
        toast.warning(`Connection tests: ${passed} passed, ${failed} failed`);
      } else if (total === 0) {
        toast.info("No services to test");
      } else {
        toast.info(`Connection tests: ${total} services checked`);
      }
    },
    onError: (error: any) => {
      setTestingConnections(false);
      setActiveJobId(null);
      setJobProgress(null);
      toast.error(error.message || "Connection test failed");
    },
  });

  // Run smoke tests (async with polling)
  const runSmokeTestsMutation = useMutation({
    mutationFn: async () => {
      setRunningSmokeTests(true);
      setJobProgress(null);
      
      // Start the job
      const startRes = await fetch("/api/tests/smoke/start", { 
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const startData = await startRes.json();
      
      if (startData.error) {
        throw new Error(startData.error);
      }
      
      setActiveJobId(startData.jobId);
      toast.info("Smoke test started", { description: "Testing all services..." });
      
      // Poll until done
      const result = await pollJobStatus(startData.jobId);
      return result;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["platformIntegrations"] });
      queryClient.invalidateQueries({ queryKey: ["serviceCatalog"] });
      queryClient.invalidateQueries({ queryKey: ["serviceRuns"] });
      setRunningSmokeTests(false);
      setActiveJobId(null);
      setJobProgress(null);
      
      const progress = data.progress || {};
      const perService = progress.perService || {};
      const passed = Object.values(perService).filter((p: any) => p.status === 'pass').length;
      const partial = Object.values(perService).filter((p: any) => p.status === 'partial').length;
      const failed = progress.failed || 0;
      const total = progress.total || 0;
      
      if (failed === 0 && passed > 0 && partial === 0) {
        toast.success(`All ${passed} smoke tests passed`, {
          description: "All expected outputs validated",
        });
      } else if (partial > 0 || failed > 0) {
        toast.warning(`Smoke tests: ${passed} pass, ${partial} partial, ${failed} fail`, {
          description: partial > 0 ? "Some services have missing outputs" : undefined,
        });
      } else if (total === 0) {
        toast.info("No services to test");
      } else {
        toast.info(`Smoke tests: ${total} services tested`);
      }
    },
    onError: (error: any) => {
      setRunningSmokeTests(false);
      setActiveJobId(null);
      setJobProgress(null);
      toast.error(error.message || "Smoke tests failed");
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
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-foreground" data-testid="text-page-title">
                Integrations
              </h1>
              {cachedSummary?.isStale && (
                <Badge variant="outline" className="text-xs border-yellow-500/50 text-yellow-600" data-testid="badge-stale-cache">
                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Updating...
                </Badge>
              )}
              {cachedSummary?.lastRefreshError && (
                <Badge variant="outline" className="text-xs border-orange-500/50 text-orange-600" data-testid="badge-cache-error">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Showing cached data
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">
              Platform services, data sources, and their operational health
              {cachedSummary?.cachedAt && (
                <span className="text-xs ml-2 text-muted-foreground/70">
                  (Last updated: {new Date(cachedSummary.cachedAt).toLocaleTimeString()})
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CrewToggle showCrewNames={showCrewNames} onToggle={setShowCrewNames} />
            <div className="w-px h-6 bg-border" />
            <div className="flex items-center border border-border rounded-xl bg-card/50 backdrop-blur-sm">
              <select
                value={qaMode}
                onChange={(e) => setQaMode(e.target.value as "connection" | "smoke" | "full")}
                disabled={runningQa}
                className="h-9 px-3 text-sm bg-transparent border-r border-border focus:outline-none text-foreground rounded-l-xl"
                data-testid="select-qa-mode"
              >
                <option value="connection" className="bg-card text-foreground">Connection Only</option>
                <option value="smoke" className="bg-card text-foreground">Smoke Test</option>
                <option value="full" className="bg-card text-foreground">Full QA</option>
              </select>
              <Button
                onClick={() => runQaMutation.mutate(qaMode)}
                disabled={runningQa}
                variant="purple"
                className="rounded-l-none rounded-r-xl"
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
              className="border-border text-foreground hover:bg-muted rounded-xl"
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
                className="border-border text-foreground hover:bg-muted rounded-xl"
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

        {isLoading && !cachedSummary ? (
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
            <Card className="mb-4 bg-card/80 backdrop-blur-sm border-border">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">Site:</span>
                      <SiteSelector variant="default" showManageLink={true} />
                    </div>
                  </div>
                  <Button
                    onClick={() => selectedSiteId && runDiagnosisMutation.mutate(selectedSiteId)}
                    disabled={!selectedSiteId || runningDiagnosis}
                    variant="purple"
                    className="rounded-xl"
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
              <Card className="bg-card/80 backdrop-blur-sm border-border">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-foreground">
                    <Shield className="w-4 h-4 text-primary" />
                    Platform Dependencies
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-auto text-muted-foreground hover:text-foreground"
                      onClick={() => refetchPlatformDeps()}
                    >
                      <RefreshCw className="w-3 h-3" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Bitwarden Status */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        platformDeps?.bitwarden?.connected 
                          ? "bg-semantic-success-soft text-semantic-success" 
                          : "bg-semantic-warning-soft text-semantic-warning"
                      )}>
                        <Key className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Bitwarden</p>
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
                        <CheckCircle className="w-4 h-4 text-semantic-success ml-auto" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-semantic-warning ml-auto" />
                      )}
                    </div>
                    {/* Database Status */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        platformDeps?.postgres?.connected 
                          ? "bg-semantic-success-soft text-semantic-success" 
                          : "bg-semantic-danger-soft text-semantic-danger"
                      )}>
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">PostgreSQL</p>
                        <p className="text-xs text-muted-foreground">
                          {platformDeps?.postgres?.connected ? "Connected" : "Disconnected"}
                        </p>
                      </div>
                      {platformDeps?.postgres?.connected ? (
                        <CheckCircle className="w-4 h-4 text-semantic-success ml-auto" />
                      ) : (
                        <XCircle className="w-4 h-4 text-semantic-danger ml-auto" />
                      )}
                    </div>
                  </div>
                  {platformDeps?.bitwarden && !platformDeps.bitwarden.connected && platformDeps.bitwarden.lastError && (
                    <div className="mt-3 text-xs text-semantic-warning bg-semantic-warning-soft p-2 rounded">
                      {platformDeps.bitwarden.lastError}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Summary Stats Bar - Computed from Summary Endpoint */}
              <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
                <Card className="p-3" data-testid="stat-services">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-semantic-info" />
                    <div>
                      <p className="text-lg font-bold">{siteSummary?.rollups?.totalServices ?? summaryStats.total}</p>
                      <p className="text-xs text-muted-foreground">Services</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-3" data-testid="stat-built">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-semantic-success" />
                    <div>
                      <p className="text-lg font-bold">{siteSummary?.rollups?.built ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Built</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-3" data-testid="stat-ready">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-semantic-info" />
                    <div>
                      <p className="text-lg font-bold">{siteSummary?.rollups?.ready ?? 0}</p>
                      <p className="text-xs text-muted-foreground">Ready</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-3" data-testid="stat-ran24h">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-accent" />
                    <div>
                      <p className="text-lg font-bold">{siteSummary?.rollups?.ran24h ?? uniqueServicesRan24h}</p>
                      <p className="text-xs text-muted-foreground">Ran 24h</p>
                    </div>
                  </div>
                </Card>
                <Card className={cn("p-3", (siteSummary?.rollups?.failed ?? 0) > 0 && "border-semantic-danger-border bg-semantic-danger-soft")} data-testid="stat-failed">
                  <div className="flex items-center gap-2">
                    <XCircle className={cn("w-4 h-4", (siteSummary?.rollups?.failed ?? 0) > 0 ? "text-semantic-danger" : "text-muted-foreground")} />
                    <div>
                      <p className={cn("text-lg font-bold", (siteSummary?.rollups?.failed ?? 0) > 0 && "text-semantic-danger")}>{siteSummary?.rollups?.failed ?? 0}</p>
                      <p className={cn("text-xs", (siteSummary?.rollups?.failed ?? 0) > 0 ? "text-semantic-danger" : "text-muted-foreground")}>Failed</p>
                    </div>
                  </div>
                </Card>
                {(siteSummary?.rollups?.blocked ?? 0) > 0 && (
                  <Card className="p-3 border-semantic-warning-border bg-semantic-warning-soft" data-testid="stat-blocked">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-semantic-warning" />
                      <div>
                        <p className="text-lg font-bold text-semantic-warning">{siteSummary?.rollups?.blocked ?? 0}</p>
                        <p className="text-xs text-semantic-warning">Blocked</p>
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              {/* Next Actions Panel */}
              {siteSummary?.nextActions && siteSummary.nextActions.length > 0 && (
                <Card className="border-gold bg-gold-soft" data-testid="next-actions-panel">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-gold" />
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
                            className="flex items-center justify-between p-2 bg-background rounded border border-border"
                            data-testid={`next-action-${action.serviceSlug}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-gold bg-gold-soft px-1.5 py-0.5 rounded">
                                P{action.priority}
                              </span>
                              <span className="font-medium text-sm">{service?.displayName || action.serviceSlug}</span>
                              <span className="text-xs text-muted-foreground">{action.reason}</span>
                            </div>
                            <Button 
                              variant="gold" 
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
                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => testConnectionsMutation.mutate()}
                    disabled={testingConnections || runningSmokeTests}
                    className="rounded-lg"
                    data-testid="button-test-connections"
                  >
                    {testingConnections ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4 mr-2" />
                    )}
                    Test Connections
                  </Button>
                  <Button
                    variant="purple"
                    onClick={() => runSmokeTestsMutation.mutate()}
                    disabled={testingConnections || runningSmokeTests}
                    className="rounded-lg"
                    data-testid="button-run-smoke-tests"
                  >
                    {runningSmokeTests ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    Run Smoke Tests
                  </Button>
                </div>
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
                            success: 'bg-semantic-success-soft text-semantic-success',
                            failed: 'bg-semantic-danger-soft text-semantic-danger',
                            partial: 'bg-semantic-warning-soft text-semantic-warning',
                            stale: 'bg-gold-soft text-gold',
                            never_ran: 'bg-muted text-muted-foreground',
                            testing: 'bg-semantic-info-soft text-semantic-info',
                          };
                          const isServiceTesting = testingAll || testingConnections || runningSmokeTests || testingId === service.slug;
                          const CONFIG_STATE_BADGES: Record<string, { label: string; color: string }> = {
                            ready: { label: 'Ready', color: 'bg-semantic-success-soft text-semantic-success' },
                            blocked: { label: 'Blocked', color: 'bg-gold-soft text-gold' },
                            needs_config: { label: 'Needs Config', color: 'bg-muted text-muted-foreground' },
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
                                  {showCrewNames ? (
                                    <CrewBadge serviceId={service.slug} size="sm" />
                                  ) : (
                                    isServiceTesting ? <Loader2 className="w-4 h-4 text-semantic-info animate-spin" /> :
                                    service.runState === 'success' ? <CheckCircle className="w-4 h-4 text-semantic-success" /> :
                                    service.runState === 'failed' ? <XCircle className="w-4 h-4 text-semantic-danger" /> :
                                    service.runState === 'partial' ? <AlertTriangle className="w-4 h-4 text-semantic-warning" /> :
                                    service.runState === 'stale' ? <AlertTriangle className="w-4 h-4 text-gold" /> :
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                  )}
                                  <div>
                                    {showCrewNames ? (
                                      <>
                                        <div className="font-medium" style={{ color: getCrewMember(service.slug).color }}>
                                          {getCrewMember(service.slug).nickname}
                                        </div>
                                        <div className="text-xs text-muted-foreground">{getCrewMember(service.slug).role}</div>
                                      </>
                                    ) : (
                                      <>
                                        <div className="font-medium">{service.displayName}</div>
                                        <div className="text-xs text-muted-foreground">{service.category}</div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex flex-col items-center gap-1">
                                  <Badge className={cn("text-[10px] px-1.5 py-0", isServiceTesting ? RUN_STATE_COLORS['testing'] : (RUN_STATE_COLORS[service.runState] || 'bg-muted'))}>
                                    {isServiceTesting ? 'testing...' : service.runState.replace('_', ' ')}
                                  </Badge>
                                  <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", CONFIG_STATE_BADGES[service.configState]?.color || 'bg-muted')}>
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
                                {service.lastRun?.errorDetail ? (
                                  <div className="flex items-start gap-1">
                                    <XCircle className="w-3 h-3 text-semantic-danger mt-0.5 flex-shrink-0" />
                                    <span className="text-xs text-semantic-danger line-clamp-2" title={service.lastRun.errorDetail}>
                                      {service.lastRun.errorDetail}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground line-clamp-2" title={service.lastRun?.summary || service.blockingReason || undefined}>
                                    {service.lastRun?.summary || service.blockingReason || "—"}
                                  </span>
                                )}
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
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-semantic-danger-border text-semantic-danger cursor-help">
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
                                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-semantic-success-border text-semantic-success">
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
                  <div className="p-4 bg-muted rounded-lg border">
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
                              isReceived && !isStale && "bg-semantic-success-soft border-semantic-success-border",
                              isReceived && isStale && "bg-semantic-warning-soft border-semantic-warning-border",
                              !isReceived && "bg-semantic-danger-soft border-semantic-danger-border",
                            )}
                          >
                            {isReceived && !isStale && <CheckCircle className="w-4 h-4 text-semantic-success" />}
                            {isReceived && isStale && <AlertTriangle className="w-4 h-4 text-semantic-warning" />}
                            {!isReceived && <XCircle className="w-4 h-4 text-semantic-danger" />}
                            <span>{signal}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {selectedIntegration.lastError && (
                  <div className="p-4 bg-semantic-danger-soft border border-semantic-danger-border rounded-lg">
                    <p className="text-sm font-medium text-semantic-danger mb-1">Last Error</p>
                    <p className="text-sm text-semantic-danger">
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
                            {check.status === "pass" && <CheckCircle className="w-4 h-4 text-semantic-success" />}
                            {check.status === "warning" && <AlertTriangle className="w-4 h-4 text-semantic-warning" />}
                            {check.status === "fail" && <XCircle className="w-4 h-4 text-semantic-danger" />}
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

                <div className="pt-4 border-t space-y-3">
                  <p className="text-xs text-muted-foreground">
                    <strong>Test Connection</strong> checks if credentials work. <strong>Run Smoke Test</strong> fetches real data to validate all outputs.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedIntegration(null)}
                    >
                      Close
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        testMutation.mutate(selectedIntegration.integrationId);
                      }}
                      disabled={testingId === selectedIntegration.integrationId || smokeTestingId === selectedIntegration.integrationId}
                      data-testid="button-test-integration-detail"
                    >
                      {testingId === selectedIntegration.integrationId ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Activity className="w-4 h-4 mr-2" />
                      )}
                      Test Connection
                    </Button>
                    <Button
                      onClick={() => {
                        smokeTestMutation.mutate(selectedIntegration.integrationId);
                      }}
                      disabled={smokeTestingId === selectedIntegration.integrationId || testingId === selectedIntegration.integrationId}
                      data-testid="button-smoke-test-integration"
                    >
                      {smokeTestingId === selectedIntegration.integrationId ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4 mr-2" />
                      )}
                      Run Smoke Test
                    </Button>
                  </div>
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
                        selectedRun.status === 'success' ? 'bg-semantic-success-soft text-semantic-success' :
                        selectedRun.status === 'running' ? 'bg-semantic-info-soft text-semantic-info' :
                        selectedRun.status === 'partial' ? 'bg-semantic-warning-soft text-semantic-warning' :
                        'bg-semantic-danger-soft text-semantic-danger'
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
                    <p className="text-xs text-semantic-danger font-medium">Error</p>
                    <pre className="text-xs bg-semantic-danger-soft p-2 rounded text-semantic-danger overflow-x-auto whitespace-pre-wrap">
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
                          <p className="text-semantic-success font-medium">Matched ({matched.length})</p>
                          {matched.map(s => (
                            <div key={s} className="flex items-center gap-1">
                              <CheckCircle className="w-3 h-3 text-semantic-success" />
                              <span>{s}</span>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-1">
                          <p className="text-semantic-danger font-medium">Missing ({missing.length})</p>
                          {missing.map(s => (
                            <div key={s} className="flex items-center gap-1">
                              <XCircle className="w-3 h-3 text-semantic-danger" />
                              <span>{s}</span>
                            </div>
                          ))}
                        </div>
                        <div className="space-y-1">
                          <p className="text-semantic-info font-medium">Extra ({extra.length})</p>
                          {extra.map(s => (
                            <div key={s} className="flex items-center gap-1">
                              <Activity className="w-3 h-3 text-semantic-info" />
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
                <div className="p-4 bg-muted rounded-lg border">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    What this service does
                  </p>
                  <p className="text-sm">{selectedCatalogService.description}</p>
                </div>

                {/* A.5) Why this is blocked - shown only for blocked services */}
                {selectedCatalogService.configState === 'blocked' && (
                  <div className="p-4 bg-gold-soft border border-gold rounded-lg" data-testid="blocked-reason-panel">
                    <p className="text-xs text-gold uppercase tracking-wide mb-3 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Why this is blocked
                    </p>
                    <div className="space-y-3">
                      {/* Show blocking reason from service data */}
                      {(selectedCatalogService as any).blockingReason && (
                        <p className="text-sm text-foreground">
                          {(selectedCatalogService as any).blockingReason}
                        </p>
                      )}
                      
                      {/* Requirements checklist */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">Requirements:</p>
                        <ul className="space-y-1.5 text-sm">
                          {selectedCatalogService.inputs.map(input => (
                            <li key={input} className="flex items-center gap-2">
                              <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center">
                                <HelpCircle className="w-3 h-3 text-muted-foreground" />
                              </span>
                              <span>{getSlugLabel(input)}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-gold/30">
                        <Button 
                          variant="gold" 
                          size="sm"
                          onClick={() => {
                            setSelectedCatalogService(null);
                            navigate(ROUTES.SETTINGS);
                          }}
                        >
                          <Settings className="w-3 h-3 mr-1" />
                          Open Settings
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            const inputs = selectedCatalogService.inputs.map(i => getSlugLabel(i)).join(', ');
                            navigator.clipboard.writeText(inputs);
                            toast.success('Required inputs copied to clipboard');
                          }}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Copy Required Keys
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* B) What it expects to do */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Expected Inputs</p>
                    <div className="space-y-1">
                      {selectedCatalogService.inputs.map(slug => (
                        <div key={slug} className="text-sm flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-semantic-info" />
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
                          <span className="w-1.5 h-1.5 rounded-full bg-semantic-success" />
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
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
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
                            selectedCatalogService.lastRun.status === 'success' ? 'bg-semantic-success-soft text-semantic-success' :
                            selectedCatalogService.lastRun.status === 'running' ? 'bg-semantic-info-soft text-semantic-info' :
                            selectedCatalogService.lastRun.status === 'partial' ? 'bg-semantic-warning-soft text-semantic-warning' :
                            'bg-semantic-danger-soft text-semantic-danger'
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
                    {selectedCatalogService.lastRun.errorDetail && (
                      <div className="mt-3 p-3 bg-semantic-danger-soft border border-semantic-danger-border rounded-lg">
                        <p className="text-xs text-semantic-danger font-medium flex items-center gap-1">
                          <XCircle className="w-3 h-3" />
                          Error
                        </p>
                        <p className="text-sm mt-1 text-semantic-danger">{selectedCatalogService.lastRun.errorDetail}</p>
                      </div>
                    )}
                    {selectedCatalogService.lastRun.summary && !selectedCatalogService.lastRun.errorDetail && (
                      <div className="mt-3">
                        <p className="text-xs text-muted-foreground">Summary</p>
                        <p className="text-sm mt-1">{selectedCatalogService.lastRun.summary}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 border rounded-lg bg-muted">
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
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-semantic-success">Received</p>
                        {(selectedCatalogService.lastRun.actualOutputs?.length ?? 0) > 0 ? (
                          <div className="space-y-1">
                            {selectedCatalogService.lastRun.actualOutputs?.map(slug => (
                              <div key={slug} className="text-sm flex items-center gap-1 text-semantic-success">
                                <CheckCircle className="w-3 h-3" />
                                {getSlugLabel(slug)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">No outputs verified yet</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-semantic-warning">Pending Validation</p>
                        {(selectedCatalogService.lastRun.pendingOutputs?.length ?? 0) > 0 ? (
                          <div className="space-y-1">
                            {selectedCatalogService.lastRun.pendingOutputs?.map(slug => (
                              <div key={slug} className="text-sm flex items-center gap-1 text-semantic-warning">
                                <Clock className="w-3 h-3" />
                                {getSlugLabel(slug)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground">None pending</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-semantic-danger">Missing</p>
                        {(() => {
                          // Check both lastRun.missingOutputs and top-level missingOutputs (from SiteSummaryService)
                          const missingFromLastRun = selectedCatalogService.lastRun?.missingOutputs || [];
                          const missingFromService = (selectedCatalogService as any).missingOutputs || [];
                          const allMissing = [...new Set([...missingFromLastRun, ...missingFromService])];
                          
                          if (allMissing.length > 0) {
                            return (
                              <div className="space-y-1">
                                {allMissing.map(slug => (
                                  <div key={slug} className="text-sm flex items-center gap-1 text-semantic-danger">
                                    <XCircle className="w-3 h-3" />
                                    {getSlugLabel(slug)}
                                  </div>
                                ))}
                              </div>
                            );
                          } else if (selectedCatalogService.lastRun?.pendingOutputs?.length === 0 && selectedCatalogService.lastRun?.actualOutputs?.length === 0) {
                            return <p className="text-xs text-muted-foreground">Run to validate outputs</p>;
                          } else {
                            return <p className="text-xs text-semantic-success">None missing</p>;
                          }
                        })()}
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
                  <div className="p-4 bg-semantic-danger-soft border border-semantic-danger-border rounded-lg">
                    <p className="text-xs text-semantic-danger uppercase tracking-wide mb-2 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      What went wrong
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-semantic-danger-soft text-semantic-danger">
                          {getSlugLabel(selectedCatalogService.lastRun.errorCode)}
                        </Badge>
                      </div>
                      {selectedCatalogService.lastRun.errorDetail && (
                        <p className="text-sm text-semantic-danger">
                          {selectedCatalogService.lastRun.errorDetail}
                        </p>
                      )}
                    </div>
                    <div className="mt-3 pt-3 border-t border-semantic-danger-border">
                      <p className="text-xs text-muted-foreground mb-1">Common failures for this service:</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedCatalogService.commonFailures.map(slug => (
                          <Badge 
                            key={slug} 
                            variant="outline" 
                            className={cn(
                              "text-xs",
                              slug === selectedCatalogService.lastRun?.errorCode 
                                ? "bg-semantic-danger-soft text-semantic-danger" 
                                : "bg-muted text-muted-foreground"
                            )}
                          >
                            {getSlugLabel(slug)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* F) Diagnostics Pipeline */}
                {serviceDiagnostics?.diagnostic && (
                  <div className="p-4 border rounded-lg bg-muted" data-testid="diagnostics-panel">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        Diagnostics Pipeline
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline"
                          className={cn(
                            "text-xs",
                            serviceDiagnostics.diagnostic.overallStatus === 'pass' ? 'bg-semantic-success-soft text-semantic-success' :
                            serviceDiagnostics.diagnostic.overallStatus === 'partial' ? 'bg-semantic-warning-soft text-semantic-warning' :
                            'bg-semantic-danger-soft text-semantic-danger'
                          )}
                        >
                          {serviceDiagnostics.diagnostic.overallStatus.toUpperCase()}
                        </Badge>
                        <Button 
                          variant="link"
                          size="sm"
                          onClick={() => {
                            const stages = serviceDiagnostics.diagnostic?.stagesJson || [];
                            const blob = JSON.stringify({
                              runId: serviceDiagnostics.diagnostic?.runId,
                              serviceId: serviceDiagnostics.diagnostic?.serviceId,
                              overallStatus: serviceDiagnostics.diagnostic?.overallStatus,
                              stages: stages.map(s => ({
                                stage: s.stage,
                                status: s.status,
                                message: s.message,
                                durationMs: s.durationMs,
                              })),
                            }, null, 2);
                            navigator.clipboard.writeText(blob);
                          }}
                          data-testid="button-copy-diagnostics"
                        >
                          <Copy className="w-3 h-3" />
                          Copy
                        </Button>
                      </div>
                    </div>
                    
                    <div className="relative">
                      {serviceDiagnostics.diagnostic.stagesJson.map((stage, index) => {
                        const stageLabels: Record<string, string> = {
                          'config_loaded': 'Config Loaded',
                          'auth_ready': 'Auth Ready',
                          'endpoint_built': 'Endpoint Built',
                          'request_sent': 'Request Sent',
                          'response_type_validated': 'Response Type Validated',
                          'schema_validated': 'Schema Validated',
                          'ui_mapping': 'UI Mapping',
                        };
                        const isLast = index === serviceDiagnostics.diagnostic!.stagesJson.length - 1;
                        
                        return (
                          <div key={stage.stage} className="relative flex items-start gap-3 pb-3" data-testid={`diagnostic-stage-${stage.stage}`}>
                            {!isLast && (
                              <div 
                                className={cn(
                                  "absolute left-[11px] top-[20px] w-0.5 h-[calc(100%-8px)]",
                                  stage.status === 'pass' ? 'bg-semantic-success' :
                                  stage.status === 'fail' ? 'bg-semantic-danger' :
                                  stage.status === 'skipped' ? 'bg-muted-foreground/30' :
                                  'bg-muted-foreground/20'
                                )}
                              />
                            )}
                            <div className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10",
                              stage.status === 'pass' ? 'bg-semantic-success-soft text-semantic-success' :
                              stage.status === 'fail' ? 'bg-semantic-danger-soft text-semantic-danger' :
                              stage.status === 'skipped' ? 'bg-muted text-muted-foreground' :
                              'bg-muted text-muted-foreground'
                            )}>
                              {stage.status === 'pass' && <CheckCircle className="w-4 h-4" />}
                              {stage.status === 'fail' && <XCircle className="w-4 h-4" />}
                              {stage.status === 'skipped' && <MinusCircle className="w-4 h-4" />}
                              {stage.status === 'pending' && <Clock className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium">{stageLabels[stage.stage] || stage.stage}</p>
                                {stage.durationMs !== undefined && (
                                  <span className="text-xs text-muted-foreground">{stage.durationMs}ms</span>
                                )}
                              </div>
                              <p className={cn(
                                "text-xs mt-0.5",
                                stage.status === 'fail' ? 'text-semantic-danger' :
                                stage.status === 'skipped' ? 'text-muted-foreground' :
                                'text-muted-foreground'
                              )}>
                                {stage.message}
                              </p>
                              
                              {/* Failure Classification */}
                              {stage.status === 'fail' && (stage as any).failureBucket && (
                                <div className="mt-2 p-2 bg-semantic-danger-soft border border-semantic-danger-border rounded-md">
                                  <div className="flex items-center gap-2 mb-1">
                                    <AlertTriangle className="w-3.5 h-3.5 text-semantic-danger" />
                                    <span className="text-xs font-medium text-semantic-danger">
                                      {(() => {
                                        const bucketLabels: Record<string, string> = {
                                          wrong_endpoint_404: '404 - Wrong Endpoint',
                                          auth_401_403: '401/403 - Auth Failed',
                                          html_200_app_shell: '200 HTML - SPA Shell',
                                          redirect_3xx: '3xx - Redirect',
                                          timeout: 'Timeout',
                                          dns: 'DNS/TLS Error',
                                          unknown: 'Unknown',
                                        };
                                        return bucketLabels[(stage as any).failureBucket] || (stage as any).failureBucket;
                                      })()}
                                    </span>
                                  </div>
                                  {(stage as any).suggestedFix && (
                                    <p className="text-xs text-semantic-danger ml-5">
                                      <strong>Fix:</strong> {(stage as any).suggestedFix}
                                    </p>
                                  )}
                                </div>
                              )}
                              
                              {stage.details && Object.keys(stage.details).length > 0 && (
                                <details className="mt-1">
                                  <summary className="text-xs text-semantic-info cursor-pointer hover:underline">
                                    Debug details
                                  </summary>
                                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto">
                                    {JSON.stringify(stage.details, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="mt-3 pt-3 border-t text-xs text-muted-foreground flex items-center justify-between">
                      <span>Run ID: {serviceDiagnostics.diagnostic.runId}</span>
                      {serviceDiagnostics.diagnostic.durationMs && (
                        <span>Total: {(serviceDiagnostics.diagnostic.durationMs / 1000).toFixed(2)}s</span>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t space-y-3">
                  <p className="text-xs text-muted-foreground">
                    <strong>Test Connection</strong> checks if credentials work. <strong>Run Smoke Test</strong> fetches real data to validate all outputs.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setSelectedCatalogService(null)}>
                      Close
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => testMutation.mutate(selectedCatalogService.slug)}
                      disabled={testingId === selectedCatalogService.slug || smokeTestingId === selectedCatalogService.slug || selectedCatalogService.configState === 'blocked'}
                      data-testid="button-test-catalog-service"
                    >
                      {testingId === selectedCatalogService.slug ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Activity className="w-4 h-4 mr-2" />
                      )}
                      {selectedCatalogService.configState === 'blocked' ? 'Blocked' : 'Test Connection'}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => smokeTestMutation.mutate(selectedCatalogService.slug)}
                      disabled={smokeTestingId === selectedCatalogService.slug || testingId === selectedCatalogService.slug || selectedCatalogService.configState === 'blocked'}
                      data-testid="button-smoke-test-catalog-service"
                    >
                      {smokeTestingId === selectedCatalogService.slug ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4 mr-2" />
                      )}
                      Run Smoke Test
                    </Button>
                  </div>
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
                <div className="p-3 bg-semantic-success-soft rounded-lg text-center">
                  <p className="text-2xl font-bold text-semantic-success">{qaResults.passed}</p>
                  <p className="text-xs text-muted-foreground">Passed</p>
                </div>
                <div className="p-3 bg-semantic-danger-soft rounded-lg text-center">
                  <p className="text-2xl font-bold text-semantic-danger">{qaResults.failed}</p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
                <div className="p-3 bg-muted rounded-lg text-center">
                  <p className="text-2xl font-bold text-muted-foreground">{qaResults.skipped}</p>
                  <p className="text-xs text-muted-foreground">Skipped</p>
                </div>
              </div>

              <div className="border rounded-lg divide-y max-h-[400px] overflow-y-auto">
                {qaResults.items.map((item, idx) => (
                  <div key={idx} className="p-3 flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {item.status === "pass" ? (
                        <CheckCircle className="w-5 h-5 text-semantic-success" />
                      ) : item.status === "fail" ? (
                        <XCircle className="w-5 h-5 text-semantic-danger" />
                      ) : (
                        <Clock className="w-5 h-5 text-muted-foreground" />
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
