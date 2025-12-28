import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  XCircle, 
  ExternalLink, 
  Shield, 
  RefreshCw, 
  AlertTriangle,
  Key,
  Database,
  Globe,
  Search,
  BarChart3,
  Copy,
  Clock
} from "lucide-react";
import { useSiteContext } from "@/hooks/useSiteContext";
import { toast } from "sonner";

interface SystemHealth {
  serverTime: string;
  database: {
    connected: boolean;
    error: string | null;
  };
  bitwarden: {
    configured: boolean;
    connected: boolean;
    secretsFound: number;
    lastCheckedAt: string;
    error: {
      code: string;
      message: string;
      hint: string;
      keys: string[];
    } | null;
    details: {
      tokenPresent: boolean;
      projectIdPresent: boolean;
      orgIdPresent: boolean;
    };
  };
  google: {
    oauthConfigured: boolean;
    authenticated: boolean;
    tokenExpiry: string | null;
    missingKeys: string[];
  };
  envVars: {
    allPresent: boolean;
    missing: string[];
    checked: Record<string, boolean>;
  };
  dataSources: {
    ga4: { hasData: boolean; recordCount: number; lastDataAt: string | null; lastError: string | null };
    gsc: { hasData: boolean; recordCount: number; lastDataAt: string | null; lastError: string | null };
    ads: { hasData: boolean; recordCount: number; lastDataAt: string | null; lastError: string | null };
    websiteChecks: { hasData: boolean; recordCount: number; passed: number; lastDataAt: string | null };
  };
  lastDiagnosticRun: {
    runId: string;
    status: string;
    startedAt: string;
    finishedAt: string;
  } | null;
}

const INTEGRATION_TYPES = [
  { key: "ga4", label: "Google Analytics 4", icon: BarChart3, description: "Website traffic and engagement data" },
  { key: "gsc", label: "Search Console", icon: Search, description: "Search performance and indexing status" },
  { key: "google_ads", label: "Google Ads", icon: Globe, description: "Paid advertising campaigns" },
  { key: "serp", label: "SERP Tracking", icon: Search, description: "Keyword ranking monitoring" },
  { key: "clarity", label: "Microsoft Clarity", icon: BarChart3, description: "User behavior and heatmaps" },
];

function formatTimeAgo(dateString: string | null): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

export default function Settings() {
  const queryClient = useQueryClient();
  const { currentSite } = useSiteContext();

  const { data: systemHealth, isLoading: healthLoading, refetch: refetchHealth } = useQuery<SystemHealth>({
    queryKey: ['systemHealth'],
    queryFn: async () => {
      const res = await fetch('/api/system/health');
      if (!res.ok) throw new Error('Failed to fetch system health');
      return res.json();
    },
    refetchInterval: 60000,
  });

  const { data: integrations, isLoading: integrationsLoading } = useQuery({
    queryKey: ['siteIntegrations', currentSite?.siteId],
    queryFn: async () => {
      if (!currentSite?.siteId) return [];
      const res = await fetch(`/api/sites/${currentSite.siteId}/integrations`);
      return res.json();
    },
    enabled: !!currentSite?.siteId,
  });

  const testVaultMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/vault/test', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Connection test failed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['systemHealth'] });
      if (data.success) {
        toast.success("Vault connection successful", { description: `Found ${data.health?.bitwarden?.secretsFound || 0} secrets` });
      } else {
        toast.error("Vault connection failed", { description: data.health?.bitwarden?.error || "Unknown error" });
      }
    },
    onError: (error: Error) => {
      toast.error("Vault test failed", { description: error.message });
    },
  });

  const testIntegrationMutation = useMutation({
    mutationFn: async (type: string) => {
      const res = await fetch(`/api/sites/${currentSite?.siteId}/integrations/${type}/test`, { 
        method: 'POST' 
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.message || 'Test failed');
      }
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['siteIntegrations'] });
      queryClient.invalidateQueries({ queryKey: ['systemHealth'] });
      toast.success(data.message || "Test successful");
    },
    onError: (error: Error) => {
      toast.error("Integration test failed", { description: error.message });
    },
  });

  const handleConnect = async () => {
    const res = await fetch('/api/auth/url');
    const { url } = await res.json();
    window.location.href = url;
  };

  const copyMissingKeys = (keys: string[]) => {
    navigator.clipboard.writeText(keys.join('\n'));
    toast.success("Copied to clipboard", { description: `${keys.length} key(s) copied` });
  };

  const getIntegrationStatus = (type: string) => {
    const integration = integrations?.find((i: any) => i.integrationType === type);
    return integration?.status || 'not_configured';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <Badge variant="default" className="bg-semantic-success"><CheckCircle className="w-3 h-3 mr-1" /> Connected</Badge>;
      case 'error':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Error</Badge>;
      case 'pending':
        return <Badge variant="secondary"><AlertTriangle className="w-3 h-3 mr-1" /> Pending</Badge>;
      default:
        return <Badge variant="outline">Not Configured</Badge>;
    }
  };

  const getDataSourceBadge = (source: { hasData: boolean; recordCount: number; lastError: string | null }) => {
    if (source.lastError) {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Error</Badge>;
    }
    if (source.hasData && source.recordCount > 0) {
      return <Badge variant="default" className="bg-semantic-success"><CheckCircle className="w-3 h-3 mr-1" /> Active</Badge>;
    }
    return <Badge variant="secondary">No Data</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Settings</h1>
            <p className="text-muted-foreground">Configure data sources, vault, and integrations</p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => refetchHealth()}
            disabled={healthLoading}
            data-testid="button-refresh-health"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${healthLoading ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
        </div>

        {/* Vault Configuration Section */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Vault & Credentials</h2>
                <p className="text-sm text-muted-foreground">Secure credential management via Bitwarden</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => testVaultMutation.mutate()}
              disabled={testVaultMutation.isPending}
              data-testid="button-test-vault"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${testVaultMutation.isPending ? 'animate-spin' : ''}`} />
              Test Connection
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Bitwarden Vault</span>
              </div>
              {healthLoading ? (
                <Badge variant="secondary">Checking...</Badge>
              ) : systemHealth?.bitwarden?.connected ? (
                <Badge variant="default" className="bg-semantic-success">
                  <CheckCircle className="w-3 h-3 mr-1" /> Connected ({systemHealth.bitwarden.secretsFound} secrets)
                </Badge>
              ) : systemHealth?.bitwarden?.configured ? (
                <Badge variant="destructive">
                  <XCircle className="w-3 h-3 mr-1" /> Connection Failed
                </Badge>
              ) : (
                <Badge variant="outline">
                  <AlertTriangle className="w-3 h-3 mr-1" /> Not Configured
                </Badge>
              )}
              
              {/* Actionable error display */}
              {systemHealth?.bitwarden?.error && (
                <div className="mt-3 p-3 bg-semantic-danger-soft border border-semantic-danger-border rounded-md">
                  <p className="text-sm font-medium text-semantic-danger">{systemHealth.bitwarden.error.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">{systemHealth.bitwarden.error.hint}</p>
                  {systemHealth.bitwarden.error.keys.length > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <code className="text-xs bg-muted px-2 py-1 rounded">{systemHealth.bitwarden.error.keys.join(', ')}</code>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 px-2"
                        onClick={() => copyMissingKeys(systemHealth.bitwarden.error!.keys)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
              
              {systemHealth?.bitwarden?.connected && (
                <p className="text-xs text-muted-foreground mt-2">
                  Vault is connected and healthy
                </p>
              )}
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Database</span>
              </div>
              {healthLoading ? (
                <Badge variant="secondary">Checking...</Badge>
              ) : systemHealth?.database?.connected ? (
                <Badge variant="default" className="bg-semantic-success">
                  <CheckCircle className="w-3 h-3 mr-1" /> Connected
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <XCircle className="w-3 h-3 mr-1" /> Error
                </Badge>
              )}
              {systemHealth?.database?.error && (
                <p className="text-xs text-semantic-danger mt-2">{systemHealth.database.error}</p>
              )}
              {systemHealth?.database?.connected && (
                <p className="text-xs text-muted-foreground mt-2">PostgreSQL database active</p>
              )}
            </div>
          </div>

          {/* Environment Variables Status */}
          {systemHealth?.envVars && !systemHealth.envVars.allPresent && (
            <div className="p-4 bg-semantic-warning-soft border border-semantic-warning-border rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-semantic-warning">Missing Environment Variables</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    The following keys need to be set in Replit Secrets:
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {systemHealth.envVars.missing.map(key => (
                      <code key={key} className="text-xs bg-muted px-2 py-1 rounded">{key}</code>
                    ))}
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => copyMissingKeys(systemHealth.envVars.missing)}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Keys
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Google Authentication Section */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-4">Google Authentication</h2>
            <div className="flex items-center gap-4">
              {systemHealth?.google?.authenticated ? (
                <>
                  <Badge variant="default" className="bg-semantic-success">
                    <CheckCircle className="w-3 h-3 mr-1" /> Connected
                  </Badge>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Expires: {systemHealth.google.tokenExpiry ? formatTimeAgo(systemHealth.google.tokenExpiry) : 'Unknown'}
                  </span>
                </>
              ) : systemHealth?.google?.oauthConfigured ? (
                <>
                  <Badge variant="secondary">
                    <AlertTriangle className="w-3 h-3 mr-1" /> Not Authenticated
                  </Badge>
                  <Button onClick={handleConnect} size="sm" data-testid="button-connect">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Connect Google Account
                  </Button>
                </>
              ) : (
                <>
                  <Badge variant="destructive">
                    <XCircle className="w-3 h-3 mr-1" /> Not Configured
                  </Badge>
                  {systemHealth?.google?.missingKeys && systemHealth.google.missingKeys.length > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Missing:</span>
                      {systemHealth.google.missingKeys.map(key => (
                        <code key={key} className="text-xs bg-muted px-2 py-1 rounded">{key}</code>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Site Integrations Section */}
        {currentSite && (
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Site Integrations</h2>
              <p className="text-sm text-muted-foreground">
                Configure data sources for {currentSite.displayName}
              </p>
            </div>

            <div className="grid gap-3">
              {INTEGRATION_TYPES.map((integration) => {
                const status = getIntegrationStatus(integration.key);
                const Icon = integration.icon;
                
                return (
                  <div 
                    key={integration.key}
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                    data-testid={`integration-${integration.key}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-background rounded-lg">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <span className="font-medium">{integration.label}</span>
                        <p className="text-xs text-muted-foreground">{integration.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(status)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => testIntegrationMutation.mutate(integration.key)}
                        disabled={testIntegrationMutation.isPending}
                        data-testid={`button-test-${integration.key}`}
                      >
                        <RefreshCw className={`w-4 h-4 ${testIntegrationMutation.isPending ? 'animate-spin' : ''}`} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Data Sources Status */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Data Sources</h2>
            {systemHealth?.lastDiagnosticRun && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                Last run: {formatTimeAgo(systemHealth.lastDiagnosticRun.finishedAt)}
              </span>
            )}
          </div>
          
          {healthLoading ? (
            <div className="flex items-center justify-center h-20">
              <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : systemHealth?.dataSources ? (
            <div className="grid gap-4">
              {Object.entries(systemHealth.dataSources).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                  <div>
                    <span className="font-medium capitalize">{key.replace('_', ' ').replace('gsc', 'Search Console').replace('ga4', 'Analytics')}</span>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-muted-foreground">
                        {value.recordCount} records
                      </p>
                      {value.lastDataAt && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTimeAgo(value.lastDataAt)}
                        </p>
                      )}
                    </div>
                    {value.lastError && (
                      <p className="text-xs text-semantic-danger mt-1">{value.lastError}</p>
                    )}
                  </div>
                  {getDataSourceBadge(value)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-4">No data source information available</p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
