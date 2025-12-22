import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState } from "react";
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
  Edit
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

export default function Integrations() {
  const queryClient = useQueryClient();
  const [testingId, setTestingId] = useState<string | null>(null);
  const [healthCheckingId, setHealthCheckingId] = useState<string | null>(null);
  const [authTestingId, setAuthTestingId] = useState<string | null>(null);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [selectedRun, setSelectedRun] = useState<ServiceRun | null>(null);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
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

  // Build a map of integrationId -> last run
  const lastRunByService: Record<string, ServiceRun> = {};
  if (serviceRuns) {
    for (const run of serviceRuns) {
      if (!lastRunByService[run.integrationId]) {
        lastRunByService[run.integrationId] = run;
      }
    }
  }

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
      setTestingId(null);
      
      if (data.status === "pass") {
        toast.success(`${data.integrationId} connection test passed`);
      } else if (data.status === "warning") {
        toast.warning(`${data.integrationId} has partial connectivity`);
      } else {
        toast.error(`${data.integrationId} connection test failed`);
      }
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
                  </CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Bitwarden Status */}
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        lastRefreshInfo.vaultConnected 
                          ? "bg-green-100 text-green-600" 
                          : "bg-yellow-100 text-yellow-600"
                      )}>
                        <Key className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Bitwarden</p>
                        <p className="text-xs text-muted-foreground">
                          {lastRefreshInfo.vaultConnected 
                            ? `${lastRefreshInfo.secretsCount} secrets` 
                            : "Not connected"}
                        </p>
                      </div>
                      {lastRefreshInfo.vaultConnected ? (
                        <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-500 ml-auto" />
                      )}
                    </div>
                    {/* Database Status */}
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center">
                        <Database className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">PostgreSQL</p>
                        <p className="text-xs text-muted-foreground">Connected</p>
                      </div>
                      <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                    </div>
                  </div>
                  {!lastRefreshInfo.vaultConnected && lastRefreshInfo.vaultReason && (
                    <div className="mt-3 text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                      {lastRefreshInfo.vaultReason === "MISSING_TOKEN" && "BWS_ACCESS_TOKEN not set in environment"}
                      {lastRefreshInfo.vaultReason === "MISSING_PROJECT_ID" && "BWS_PROJECT_ID not set. Add it to Replit Secrets."}
                      {lastRefreshInfo.vaultReason === "UNAUTHORIZED" && "Token invalid or expired. Rotate BWS_ACCESS_TOKEN."}
                      {lastRefreshInfo.vaultReason === "FORBIDDEN" && "Machine account doesn't have access to this project."}
                      {lastRefreshInfo.vaultReason === "PROJECT_NOT_FOUND" && "Project ID is wrong or project doesn't exist."}
                      {lastRefreshInfo.vaultReason === "ZERO_SECRETS" && "Connected, but no secrets found in this project."}
                      {lastRefreshInfo.vaultReason === "API_ERROR" && (lastRefreshInfo.vaultError || "API error occurred")}
                      {lastRefreshInfo.vaultReason === "NETWORK_ERROR" && (lastRefreshInfo.vaultError || "Network error occurred")}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Summary Stats Bar */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="text-lg font-bold">{summaryStats.total}</p>
                      <p className="text-xs text-muted-foreground">Services</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-purple-500" />
                    <div>
                      <p className="text-lg font-bold">{summaryStats.configured}</p>
                      <p className="text-xs text-muted-foreground">Configured</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <div>
                      <p className="text-lg font-bold">{summaryStats.healthy}</p>
                      <p className="text-xs text-muted-foreground">Reachable</p>
                    </div>
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-blue-500" />
                    <div>
                      <p className="text-lg font-bold">{summaryStats.secretsSet}</p>
                      <p className="text-xs text-muted-foreground">Secrets Set</p>
                    </div>
                  </div>
                </Card>
                {summaryStats.secretsMissing > 0 && (
                  <Card className="p-3 border-red-200 bg-red-50 dark:bg-red-900/20">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                      <div>
                        <p className="text-lg font-bold text-red-600">{summaryStats.secretsMissing}</p>
                        <p className="text-xs text-red-600">Secrets Missing</p>
                      </div>
                    </div>
                  </Card>
                )}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Truth table: each service showing build status, endpoints, auth, secrets, and connectivity
                </p>
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
                        <th className="text-left p-3 font-medium">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger>Last Run</TooltipTrigger>
                              <TooltipContent>Most recent service execution</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </th>
                        <th className="text-left p-3 font-medium">Notes</th>
                        <th className="text-center p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {workerServices.map((integration) => (
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
                            {(() => {
                              const lastRun = lastRunByService[integration.integrationId];
                              if (!lastRun) {
                                return <span className="text-xs text-muted-foreground">No runs</span>;
                              }
                              const statusColor = lastRun.status === 'success' 
                                ? 'text-green-600' 
                                : lastRun.status === 'running' 
                                  ? 'text-blue-600' 
                                  : lastRun.status === 'partial' 
                                    ? 'text-yellow-600' 
                                    : 'text-red-600';
                              return (
                                <button
                                  onClick={() => setSelectedRun(lastRun)}
                                  className="text-xs space-y-0.5 text-left hover:bg-muted/50 rounded p-1 -m-1 transition-colors cursor-pointer"
                                  data-testid={`button-run-detail-${integration.integrationId}`}
                                >
                                  <div className="flex items-center gap-1">
                                    <Badge variant="outline" className={cn("text-[10px] px-1 py-0", statusColor)}>
                                      {lastRun.status}
                                    </Badge>
                                    <span className="text-muted-foreground">
                                      {formatTimeAgo(lastRun.finishedAt || lastRun.startedAt)}
                                    </span>
                                  </div>
                                  {lastRun.siteId && (
                                    <div className="text-muted-foreground truncate max-w-[150px]">
                                      {lastRun.siteId}
                                    </div>
                                  )}
                                  {lastRun.summary && (
                                    <div className="text-muted-foreground truncate max-w-[150px]" title={lastRun.summary}>
                                      {lastRun.summary}
                                    </div>
                                  )}
                                </button>
                              );
                            })()}
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
                      ))}
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
                        const status = integration.healthStatus || "disconnected";
                        return (
                        <Card 
                          key={integration.integrationId}
                          className={cn(
                            "transition-all hover:shadow-md cursor-pointer",
                            status === "healthy" && "border-l-4 border-l-green-500",
                            status === "degraded" && "border-l-4 border-l-yellow-500",
                            status === "error" && "border-l-4 border-l-red-500",
                            status === "disconnected" && "border-l-4 border-l-gray-300",
                          )}
                          onClick={() => fetchIntegrationDetails(integration.integrationId)}
                          data-testid={`card-integration-${integration.integrationId}`}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2">
                                {getStatusIcon(integration.healthStatus)}
                                <CardTitle className="text-base">{integration.name}</CardTitle>
                              </div>
                              {getStatusBadge(integration.healthStatus)}
                            </div>
                            <CardDescription className="text-sm">
                              {integration.description}
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Last Success</span>
                                <span className="font-medium">{formatTimeAgo(integration.lastSuccessAt)}</span>
                              </div>
                              
                              {integration.expectedSignals && integration.expectedSignals.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {integration.expectedSignals.slice(0, 4).map((signal) => (
                                    <Badge key={signal} variant="outline" className="text-xs">
                                      {signal}
                                    </Badge>
                                  ))}
                                  {integration.expectedSignals.length > 4 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{integration.expectedSignals.length - 4}
                                    </Badge>
                                  )}
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
                                  disabled={testingId === integration.integrationId}
                                  data-testid={`button-test-${integration.integrationId}`}
                                >
                                  {testingId === integration.integrationId ? (
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  ) : (
                                    <Activity className="w-4 h-4 mr-1" />
                                  )}
                                  Test
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
        )}
      </div>

      <Dialog open={!!selectedIntegration} onOpenChange={() => setSelectedIntegration(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedIntegration && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  {getStatusIcon(selectedIntegration.healthStatus)}
                  <div>
                    <DialogTitle>{selectedIntegration.name}</DialogTitle>
                    <DialogDescription>{selectedIntegration.description}</DialogDescription>
                  </div>
                </div>
              </DialogHeader>
              
              <div className="space-y-6 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Status</p>
                    {getStatusBadge(selectedIntegration.healthStatus)}
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Last Success</p>
                    <p className="font-medium">{formatTimeAgo(selectedIntegration.lastSuccessAt)}</p>
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
    </DashboardLayout>
  );
}
