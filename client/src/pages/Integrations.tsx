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
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Link } from "wouter";
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

interface Integration {
  id: number;
  integrationId: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
  healthStatus: string;
  lastSuccessAt: string | null;
  lastErrorAt: string | null;
  lastError: string | null;
  expectedSignals: string[];
  receivedSignals: Record<string, { received: boolean; stale: boolean; lastValue?: any }> | null;
  recentChecks?: IntegrationCheck[];
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

function getStatusIcon(status: string) {
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

function getStatusBadge(status: string) {
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
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

  const { data: integrations, isLoading } = useQuery<Integration[]>({
    queryKey: ["platformIntegrations"],
    queryFn: async () => {
      const res = await fetch("/api/integrations");
      if (!res.ok) return [];
      return res.json();
    },
  });

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

  const fetchIntegrationDetails = async (integrationId: string) => {
    const res = await fetch(`/api/integrations/${integrationId}`);
    const data = await res.json();
    setSelectedIntegration(data);
  };

  const groupedIntegrations = integrations?.reduce((acc, integration) => {
    const category = integration.category || "other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(integration);
    return acc;
  }, {} as Record<string, Integration[]>) || {};

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
          <div className="space-y-8">
            {Object.entries(groupedIntegrations).map(([category, categoryIntegrations]) => {
              const CategoryIcon = CATEGORY_ICONS[category] || Globe;
              return (
                <div key={category} className="space-y-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    <CategoryIcon className="w-4 h-4" />
                    {CATEGORY_LABELS[category] || category}
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {categoryIntegrations.map((integration) => (
                      <Card 
                        key={integration.integrationId}
                        className={cn(
                          "transition-all hover:shadow-md cursor-pointer",
                          integration.healthStatus === "healthy" && "border-l-4 border-l-green-500",
                          integration.healthStatus === "degraded" && "border-l-4 border-l-yellow-500",
                          integration.healthStatus === "error" && "border-l-4 border-l-red-500",
                          integration.healthStatus === "disconnected" && "border-l-4 border-l-gray-300",
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
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
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
    </DashboardLayout>
  );
}
