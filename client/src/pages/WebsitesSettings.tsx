import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Globe, 
  CheckCircle, 
  AlertTriangle, 
  Plus,
  ArrowRight,
  Link as LinkIcon,
  Database
} from "lucide-react";
import { buildRoute } from "@shared/routes";

interface WebsiteSummary {
  siteId: string;
  displayName: string;
  baseUrl: string;
  status: string;
  deployConnected: boolean;
  deployMethod: string | null;
  dataIntegrationsCount: number;
  dataConnectedCount: number;
  needsSetup: boolean;
}

export default function WebsitesSettings() {
  const [, navigate] = useLocation();

  const { data: websites, isLoading } = useQuery<WebsiteSummary[]>({
    queryKey: ['settings-websites'],
    queryFn: async () => {
      const res = await fetch('/api/settings/websites');
      if (!res.ok) throw new Error('Failed to fetch websites');
      const json = await res.json();
      return json.data || [];
    },
  });

  return (
    <DashboardLayout className="dashboard-light">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">
              Website Setup
            </h1>
            <p className="text-muted-foreground">
              Configure your websites and connect data sources
            </p>
          </div>
          <Button onClick={() => navigate("/sites/new")} data-testid="button-add-website">
            <Plus className="w-4 h-4 mr-2" />
            Add Website
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="h-24 bg-muted/50" />
                <CardContent className="h-20 bg-muted/30" />
              </Card>
            ))}
          </div>
        ) : websites && websites.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {websites.map(site => (
              <Card 
                key={site.siteId} 
                className="hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => navigate(buildRoute.settingsWebsite(site.siteId))}
                data-testid={`card-website-${site.siteId}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-muted-foreground" />
                      <CardTitle className="text-lg" data-testid={`text-site-name-${site.siteId}`}>
                        {site.displayName}
                      </CardTitle>
                    </div>
                    {site.status === 'active' && !site.needsSetup ? (
                      <Badge variant="default" className="bg-semantic-success">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-semantic-warning text-semantic-warning">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Setup Required
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="truncate">{site.baseUrl}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <LinkIcon className="w-4 h-4 text-muted-foreground" />
                      {site.deployConnected ? (
                        <span className="text-semantic-success">
                          Deploy via {site.deployMethod}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No deploy method</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-muted-foreground" />
                      <span>
                        {site.dataConnectedCount}/{site.dataIntegrationsCount} data sources
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <Button 
                      variant={site.needsSetup ? "default" : "outline"} 
                      size="sm"
                      data-testid={`button-configure-${site.siteId}`}
                    >
                      {site.needsSetup ? "Finish Setup" : "View Settings"}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Globe className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No websites configured</h3>
              <p className="text-muted-foreground text-center mb-4">
                Add your first website to start monitoring its SEO performance
              </p>
              <Button onClick={() => navigate("/sites/new")} data-testid="button-add-first-website">
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Website
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
