import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft,
  Globe,
  Github,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Link as LinkIcon,
  Database,
  BarChart3,
  Search,
  Eye,
  Play,
  Settings,
  ExternalLink,
  Plug,
  Users,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { ROUTES, buildRoute } from "@shared/routes";

interface WebsiteData {
  siteId: string;
  displayName: string;
  baseUrl: string;
  status: string;
  deployMethod: string | null;
  deployConfig: Record<string, string> | null;
}

interface Integration {
  type: string;
  label: string;
  description: string;
  status: "connected" | "disconnected" | "error";
  lastTestedAt: string | null;
  configFields: { key: string; label: string; type: string; required: boolean; value?: string }[];
  error?: string;
}

interface CrewReadiness {
  slug: string;
  name: string;
  description: string;
  status: "ready" | "blocked";
  blockedBy: string[];
  requiresAny: boolean;
}

const DEPLOY_METHODS = [
  { id: "github", label: "GitHub", icon: Github, description: "Deploy via GitHub Actions" },
  { id: "wordpress", label: "WordPress", icon: Globe, description: "Deploy to WordPress site" },
  { id: "replit", label: "Replit", icon: Globe, description: "Deploy on Replit" },
];

const INTEGRATION_TYPES = [
  { key: "ga4", label: "Google Analytics 4", icon: BarChart3, description: "Website traffic and engagement data" },
  { key: "gsc", label: "Search Console", icon: Search, description: "Search performance and indexing status" },
  { key: "google_ads", label: "Google Ads", icon: Globe, description: "Paid advertising campaigns" },
  { key: "clarity", label: "Microsoft Clarity", icon: Eye, description: "User behavior and heatmaps" },
  { key: "serp", label: "SERP Tracking", icon: Search, description: "Keyword ranking monitoring" },
];

function IntegrationCard({ 
  integration, 
  siteId,
  onConnect,
  onTest,
  isConnecting,
  isTesting
}: { 
  integration: Integration;
  siteId: string;
  onConnect: (type: string, config: Record<string, string>) => void;
  onTest: (type: string) => void;
  isConnecting: boolean;
  isTesting: boolean;
}) {
  const [configValues, setConfigValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    integration.configFields.forEach(field => {
      initial[field.key] = field.value || "";
    });
    return initial;
  });

  const integrationMeta = INTEGRATION_TYPES.find(t => t.key === integration.type);
  const Icon = integrationMeta?.icon || Database;

  const handleConnect = () => {
    onConnect(integration.type, configValues);
  };

  return (
    <Card 
      className={integration.status === "connected" ? "border-semantic-success/30" : integration.status === "error" ? "border-semantic-danger/30" : ""}
      data-testid={`card-integration-${integration.type}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              integration.status === "connected" ? "bg-semantic-success/10" :
              integration.status === "error" ? "bg-semantic-danger/10" : 
              "bg-muted"
            }`}>
              <Icon className={`w-5 h-5 ${
                integration.status === "connected" ? "text-semantic-success" :
                integration.status === "error" ? "text-semantic-danger" :
                "text-muted-foreground"
              }`} />
            </div>
            <div>
              <CardTitle className="text-base" data-testid={`text-integration-name-${integration.type}`}>
                {integration.label}
              </CardTitle>
              <CardDescription className="text-xs">
                {integration.description}
              </CardDescription>
            </div>
          </div>
          <Badge 
            variant={integration.status === "connected" ? "default" : integration.status === "error" ? "destructive" : "outline"}
            className={integration.status === "connected" ? "bg-semantic-success" : ""}
            data-testid={`badge-status-${integration.type}`}
          >
            {integration.status === "connected" && <CheckCircle className="w-3 h-3 mr-1" />}
            {integration.status === "error" && <XCircle className="w-3 h-3 mr-1" />}
            {integration.status === "disconnected" && <AlertTriangle className="w-3 h-3 mr-1" />}
            {integration.status === "connected" ? "Connected" : integration.status === "error" ? "Error" : "Not Connected"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {integration.error && (
          <div className="p-3 bg-semantic-danger/10 border border-semantic-danger/30 rounded-lg text-sm text-semantic-danger" data-testid={`text-error-${integration.type}`}>
            {integration.error}
          </div>
        )}
        
        {integration.status !== "connected" && integration.configFields.length > 0 && (
          <div className="space-y-3">
            {integration.configFields.map(field => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={`${integration.type}-${field.key}`} className="text-sm">
                  {field.label} {field.required && <span className="text-semantic-danger">*</span>}
                </Label>
                <Input
                  id={`${integration.type}-${field.key}`}
                  type={field.type}
                  value={configValues[field.key] || ""}
                  onChange={(e) => setConfigValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={`Enter ${field.label.toLowerCase()}`}
                  data-testid={`input-${integration.type}-${field.key}`}
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          {integration.status === "connected" ? (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => onTest(integration.type)}
                disabled={isTesting}
                data-testid={`button-test-${integration.type}`}
              >
                {isTesting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                Test Connection
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                data-testid={`button-settings-${integration.type}`}
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </>
          ) : (
            <Button 
              size="sm" 
              onClick={handleConnect}
              disabled={isConnecting}
              data-testid={`button-connect-${integration.type}`}
            >
              {isConnecting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plug className="w-4 h-4 mr-2" />}
              Connect
            </Button>
          )}
          {integration.lastTestedAt && (
            <span className="text-xs text-muted-foreground ml-auto">
              Last tested: {new Date(integration.lastTestedAt).toLocaleDateString()}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DeploymentTabs({ 
  currentMethod, 
  currentConfig,
  siteId,
  onConnect 
}: { 
  currentMethod: string | null;
  currentConfig: Record<string, string> | null;
  siteId: string;
  onConnect: (method: string, config: Record<string, string>) => void;
}) {
  const [githubConfig, setGithubConfig] = useState({
    repoUrl: currentConfig?.repoUrl || "",
    branch: currentConfig?.branch || "main",
    deployPath: currentConfig?.deployPath || "/",
  });

  const [wordpressConfig, setWordpressConfig] = useState({
    siteUrl: currentConfig?.siteUrl || "",
    username: currentConfig?.username || "",
    appPassword: currentConfig?.appPassword || "",
  });

  const [replitConfig, setReplitConfig] = useState({
    replUrl: currentConfig?.replUrl || "",
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <LinkIcon className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>Deployment Connection</CardTitle>
            <CardDescription>Connect your deployment method to enable automated updates</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={currentMethod || "github"}>
          <TabsList className="grid w-full grid-cols-3" data-testid="tabs-deploy-method">
            {DEPLOY_METHODS.map(method => (
              <TabsTrigger 
                key={method.id} 
                value={method.id}
                data-testid={`tab-deploy-${method.id}`}
              >
                <method.icon className="w-4 h-4 mr-2" />
                {method.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="github" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="github-repo">Repository URL</Label>
                <Input
                  id="github-repo"
                  value={githubConfig.repoUrl}
                  onChange={(e) => setGithubConfig(prev => ({ ...prev, repoUrl: e.target.value }))}
                  placeholder="https://github.com/username/repo"
                  data-testid="input-github-repo"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="github-branch">Branch</Label>
                  <Input
                    id="github-branch"
                    value={githubConfig.branch}
                    onChange={(e) => setGithubConfig(prev => ({ ...prev, branch: e.target.value }))}
                    placeholder="main"
                    data-testid="input-github-branch"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="github-path">Deploy Path</Label>
                  <Input
                    id="github-path"
                    value={githubConfig.deployPath}
                    onChange={(e) => setGithubConfig(prev => ({ ...prev, deployPath: e.target.value }))}
                    placeholder="/"
                    data-testid="input-github-path"
                  />
                </div>
              </div>
            </div>
            <Button 
              onClick={() => onConnect("github", githubConfig)}
              data-testid="button-connect-github"
            >
              <Github className="w-4 h-4 mr-2" />
              Connect GitHub
            </Button>
          </TabsContent>

          <TabsContent value="wordpress" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="wp-url">WordPress Site URL</Label>
                <Input
                  id="wp-url"
                  value={wordpressConfig.siteUrl}
                  onChange={(e) => setWordpressConfig(prev => ({ ...prev, siteUrl: e.target.value }))}
                  placeholder="https://yoursite.com"
                  data-testid="input-wordpress-url"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wp-username">Username</Label>
                <Input
                  id="wp-username"
                  value={wordpressConfig.username}
                  onChange={(e) => setWordpressConfig(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="admin"
                  data-testid="input-wordpress-username"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="wp-password">Application Password</Label>
                <Input
                  id="wp-password"
                  type="password"
                  value={wordpressConfig.appPassword}
                  onChange={(e) => setWordpressConfig(prev => ({ ...prev, appPassword: e.target.value }))}
                  placeholder="xxxx xxxx xxxx xxxx"
                  data-testid="input-wordpress-password"
                />
                <p className="text-xs text-muted-foreground">
                  Generate an application password in WordPress &gt; Users &gt; Profile
                </p>
              </div>
            </div>
            <Button 
              onClick={() => onConnect("wordpress", wordpressConfig)}
              data-testid="button-connect-wordpress"
            >
              <Globe className="w-4 h-4 mr-2" />
              Connect WordPress
            </Button>
          </TabsContent>

          <TabsContent value="replit" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="replit-url">Replit URL</Label>
                <Input
                  id="replit-url"
                  value={replitConfig.replUrl}
                  onChange={(e) => setReplitConfig(prev => ({ ...prev, replUrl: e.target.value }))}
                  placeholder="https://replit.com/@username/project"
                  data-testid="input-replit-url"
                />
              </div>
            </div>
            <Button 
              onClick={() => onConnect("replit", replitConfig)}
              data-testid="button-connect-replit"
            >
              <Globe className="w-4 h-4 mr-2" />
              Connect Replit
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function CrewReadinessPanel({ crews, siteId }: { crews: CrewReadiness[]; siteId: string }) {
  const [, navigate] = useLocation();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>Crew Readiness</CardTitle>
            <CardDescription>See which crews are ready to work on this site</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {crews.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No crew assignments yet</p>
            </div>
          ) : (
            crews.map(crew => (
              <div 
                key={crew.slug}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  crew.status === "ready" ? "bg-semantic-success/5 border-semantic-success/20" :
                  "bg-semantic-danger/5 border-semantic-danger/20"
                }`}
                data-testid={`card-crew-${crew.slug}`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    crew.status === "ready" ? "bg-semantic-success" : "bg-semantic-danger"
                  }`} />
                  <div>
                    <p className="font-medium" data-testid={`text-crew-name-${crew.slug}`}>{crew.name}</p>
                    <p className="text-xs text-muted-foreground">{crew.description}</p>
                    {crew.blockedBy.length > 0 && (
                      <p className="text-xs text-semantic-danger mt-1">
                        Missing: {crew.blockedBy.join(", ")}{crew.requiresAny ? " (need any one)" : ""}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={crew.status === "ready" ? "default" : "destructive"}
                    className={crew.status === "ready" ? "bg-semantic-success" : ""}
                    data-testid={`badge-crew-status-${crew.slug}`}
                  >
                    {crew.status === "ready" && <CheckCircle className="w-3 h-3 mr-1" />}
                    {crew.status === "blocked" && <XCircle className="w-3 h-3 mr-1" />}
                    {crew.status.charAt(0).toUpperCase() + crew.status.slice(1)}
                  </Badge>
                  {crew.status === "blocked" && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        const section = document.getElementById('integrations-section');
                        section?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      data-testid={`button-fix-crew-${crew.slug}`}
                    >
                      Fix
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function WebsiteDetail() {
  const [, params] = useRoute("/settings/websites/:siteId");
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const siteId = params?.siteId || "";

  const [connectingType, setConnectingType] = useState<string | null>(null);
  const [testingType, setTestingType] = useState<string | null>(null);

  const { data: website, isLoading: websiteLoading } = useQuery<WebsiteData>({
    queryKey: ['settings-website', siteId],
    queryFn: async () => {
      const res = await fetch(`/api/settings/websites/${siteId}`);
      if (!res.ok) throw new Error('Failed to fetch website');
      const json = await res.json();
      return json.data;
    },
    enabled: !!siteId,
  });

  const { data: integrations, isLoading: integrationsLoading } = useQuery<Integration[]>({
    queryKey: ['settings-website-integrations', siteId],
    queryFn: async () => {
      const res = await fetch(`/api/settings/websites/${siteId}/integrations`);
      if (!res.ok) throw new Error('Failed to fetch integrations');
      const json = await res.json();
      const rawData = json.data || [];
      
      // Define config fields for each integration type
      const configFieldsMap: Record<string, { key: string; label: string; type: string; required: boolean }[]> = {
        ga4: [{ key: "propertyId", label: "GA4 Property ID", type: "text", required: true }],
        gsc: [{ key: "siteUrl", label: "Site URL", type: "text", required: true }],
        google_ads: [{ key: "customerId", label: "Customer ID", type: "text", required: true }],
        clarity: [{ key: "projectId", label: "Clarity Project ID", type: "text", required: true }],
        core_web_vitals: [{ key: "measurementUrl", label: "Measurement URL", type: "text", required: false }],
        crawler: [{ key: "maxDepth", label: "Max Crawl Depth", type: "number", required: false }],
        empathy: [{ key: "baseUrl", label: "Empathy Base URL", type: "text", required: true }],
      };
      
      // Transform API data to expected frontend format
      return rawData.map((item: any) => {
        const meta = INTEGRATION_TYPES.find(t => t.key === item.integrationType);
        const configFields = (configFieldsMap[item.integrationType] || []).map(field => ({
          ...field,
          value: item.configJson?.[field.key] || "",
        }));
        
        return {
          type: item.integrationType,
          label: meta?.label || item.integrationType,
          description: meta?.description || "",
          status: item.status === "connected" ? "connected" : item.status === "error" ? "error" : "disconnected",
          lastTestedAt: item.lastOkAt,
          configFields,
          error: item.lastError?.message,
        };
      });
    },
    enabled: !!siteId,
  });

  const { data: crewReadiness, isLoading: crewLoading } = useQuery<CrewReadiness[]>({
    queryKey: ['settings-website-crew-readiness', siteId],
    queryFn: async () => {
      const res = await fetch(`/api/settings/websites/${siteId}/crew-readiness`);
      if (!res.ok) throw new Error('Failed to fetch crew readiness');
      const json = await res.json();
      return json.data || [];
    },
    enabled: !!siteId,
  });

  const connectIntegrationMutation = useMutation({
    mutationFn: async ({ type, config }: { type: string; config: Record<string, string> }) => {
      const res = await fetch(`/api/settings/websites/${siteId}/integrations/${type}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to connect integration');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Integration connected successfully");
      queryClient.invalidateQueries({ queryKey: ['settings-website-integrations', siteId] });
      queryClient.invalidateQueries({ queryKey: ['settings-website-crew-readiness', siteId] });
      setConnectingType(null);
    },
    onError: (error: Error) => {
      toast.error("Failed to connect integration", { description: error.message });
      setConnectingType(null);
    },
  });

  const testIntegrationMutation = useMutation({
    mutationFn: async (type: string) => {
      const res = await fetch(`/api/settings/websites/${siteId}/integrations/${type}/test`, {
        method: 'POST',
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Test failed');
      }
      return res.json();
    },
    onSuccess: (_, type) => {
      toast.success("Connection test passed");
      queryClient.invalidateQueries({ queryKey: ['settings-website-integrations', siteId] });
      setTestingType(null);
    },
    onError: (error: Error) => {
      toast.error("Connection test failed", { description: error.message });
      setTestingType(null);
    },
  });

  const connectDeployMutation = useMutation({
    mutationFn: async ({ method, config }: { method: string; config: Record<string, string> }) => {
      // Use the standard integration connect route with deploy_ prefix
      const integrationType = `deploy_${method}`;
      const res = await fetch(`/api/settings/websites/${siteId}/integrations/${integrationType}/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to connect deployment method');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Deployment method connected");
      queryClient.invalidateQueries({ queryKey: ['settings-website', siteId] });
      queryClient.invalidateQueries({ queryKey: ['settings-website-integrations', siteId] });
    },
    onError: (error: Error) => {
      toast.error("Failed to connect deployment", { description: error.message });
    },
  });

  const handleConnectIntegration = (type: string, config: Record<string, string>) => {
    setConnectingType(type);
    connectIntegrationMutation.mutate({ type, config });
  };

  const handleTestIntegration = (type: string) => {
    setTestingType(type);
    testIntegrationMutation.mutate(type);
  };

  const handleConnectDeploy = (method: string, config: Record<string, string>) => {
    connectDeployMutation.mutate({ method, config });
  };

  const isLoading = websiteLoading || integrationsLoading || crewLoading;

  if (!siteId) {
    return (
      <DashboardLayout className="dashboard-light">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Invalid site ID</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout className="dashboard-light">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(ROUTES.SETTINGS_WEBSITES)}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            {websiteLoading ? (
              <div className="space-y-2">
                <div className="h-7 w-48 bg-muted rounded animate-pulse" />
                <div className="h-4 w-32 bg-muted rounded animate-pulse" />
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold tracking-tight" data-testid="text-site-name">
                  {website?.displayName || "Website"}
                </h1>
                <p className="text-muted-foreground flex items-center gap-2" data-testid="text-site-url">
                  <Globe className="w-4 h-4" />
                  {website?.baseUrl || ""}
                </p>
              </>
            )}
          </div>
          {website && (
            <Badge 
              variant={website.status === "active" ? "default" : "outline"}
              className={website.status === "active" ? "bg-semantic-success" : ""}
              data-testid="badge-site-status"
            >
              {website.status === "active" ? (
                <CheckCircle className="w-3 h-3 mr-1" />
              ) : (
                <AlertTriangle className="w-3 h-3 mr-1" />
              )}
              {website.status.charAt(0).toUpperCase() + website.status.slice(1)}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <Card className="animate-pulse">
              <CardHeader className="h-24 bg-muted/50" />
              <CardContent className="h-40 bg-muted/30" />
            </Card>
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map(i => (
                <Card key={i} className="animate-pulse">
                  <CardHeader className="h-20 bg-muted/50" />
                  <CardContent className="h-24 bg-muted/30" />
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <>
            <DeploymentTabs 
              currentMethod={website?.deployMethod || null}
              currentConfig={website?.deployConfig || null}
              siteId={siteId}
              onConnect={handleConnectDeploy}
            />

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Data Integrations</h2>
                  <p className="text-sm text-muted-foreground">Connect data sources to power your crews</p>
                </div>
                <Button variant="outline" size="sm" data-testid="button-refresh-integrations">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh All
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {(integrations || []).map(integration => (
                  <IntegrationCard
                    key={integration.type}
                    integration={integration}
                    siteId={siteId}
                    onConnect={handleConnectIntegration}
                    onTest={handleTestIntegration}
                    isConnecting={connectingType === integration.type}
                    isTesting={testingType === integration.type}
                  />
                ))}

                {(!integrations || integrations.length === 0) && (
                  INTEGRATION_TYPES.map(intType => (
                    <IntegrationCard
                      key={intType.key}
                      integration={{
                        type: intType.key,
                        label: intType.label,
                        description: intType.description,
                        status: "disconnected",
                        lastTestedAt: null,
                        configFields: [
                          { key: "propertyId", label: "Property ID", type: "text", required: true },
                        ],
                      }}
                      siteId={siteId}
                      onConnect={handleConnectIntegration}
                      onTest={handleTestIntegration}
                      isConnecting={connectingType === intType.key}
                      isTesting={testingType === intType.key}
                    />
                  ))
                )}
              </div>
            </div>

            <CrewReadinessPanel 
              crews={crewReadiness || []}
              siteId={siteId}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
