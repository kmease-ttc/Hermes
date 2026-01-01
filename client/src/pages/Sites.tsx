import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Globe, Plus, Settings, Trash2, ExternalLink, Activity, RefreshCw, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { Link } from "wouter";
import { ROUTES } from "@shared/routes";

interface Site {
  id: number;
  siteId: string;
  displayName: string;
  baseUrl: string;
  category: string | null;
  techStack: string | null;
  status: string;
  healthScore: number | null;
  lastDiagnosisAt: string | null;
  createdAt: string;
  active: boolean;
}

export default function Sites() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: sites, isLoading } = useQuery<Site[]>({
    queryKey: ['sites'],
    queryFn: async () => {
      const res = await fetch('/api/sites');
      if (!res.ok) throw new Error('Failed to fetch sites');
      return res.json();
    },
  });

  const deleteSite = useMutation({
    mutationFn: async (siteId: string) => {
      const res = await fetch(`/api/sites/${siteId}`, { 
        method: 'DELETE',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to delete site');
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Site archived", description: "The site has been archived successfully." });
      queryClient.invalidateQueries({ queryKey: ['sites'] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-semantic-success-soft text-semantic-success border-semantic-success-border"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
      case 'paused':
        return <Badge className="bg-semantic-warning-soft text-semantic-warning border-semantic-warning-border"><Clock className="w-3 h-3 mr-1" />Paused</Badge>;
      case 'onboarding':
        return <Badge className="bg-semantic-info-soft text-semantic-info border-semantic-info-border"><Activity className="w-3 h-3 mr-1" />Onboarding</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getHealthColor = (score: number | null) => {
    if (score === null) return "bg-muted-foreground";
    if (score >= 80) return "bg-semantic-success";
    if (score >= 60) return "bg-semantic-warning";
    if (score >= 40) return "bg-gold";
    return "bg-semantic-danger";
  };

  const formatDate = (date: string | null) => {
    if (!date) return "Never";
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="page-title">Sites Registry</h1>
            <p className="text-muted-foreground">Manage your monitored websites and their configurations</p>
          </div>
          <Link href={ROUTES.SITE_NEW}>
            <Button data-testid="button-add-site">
              <Plus className="w-4 h-4 mr-2" />
              Add Site
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Globe className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-total-sites">{sites?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Sites</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-semantic-success-soft flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-semantic-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-active-sites">{sites?.filter(s => s.status === 'active').length || 0}</p>
                  <p className="text-sm text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-gold-soft flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-gold" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="text-needs-attention">{sites?.filter(s => s.healthScore !== null && s.healthScore < 60).length || 0}</p>
                  <p className="text-sm text-muted-foreground">Needs Attention</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Sites</CardTitle>
            <CardDescription>Click on a site to view details and run diagnostics</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : sites && sites.length > 0 ? (
              <div className="space-y-3">
                {sites.map((site) => (
                  <div 
                    key={site.siteId} 
                    className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    data-testid={`card-site-${site.siteId}`}
                  >
                    <div className={`w-3 h-3 rounded-full ${getHealthColor(site.healthScore)}`} title={`Health: ${site.healthScore ?? 'N/A'}`} />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate" data-testid={`text-site-name-${site.siteId}`}>{site.displayName}</h3>
                        {getStatusBadge(site.status)}
                        {site.category && <Badge variant="outline" className="text-xs">{site.category}</Badge>}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                        <a 
                          href={site.baseUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="flex items-center gap-1 hover:text-foreground"
                          data-testid={`link-site-url-${site.siteId}`}
                        >
                          {site.baseUrl.replace(/^https?:\/\//, '')}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        {site.techStack && <span className="text-xs">• {site.techStack}</span>}
                      </div>
                    </div>

                    <div className="text-right text-sm hidden md:block">
                      <p className="text-muted-foreground">Last diagnosis</p>
                      <p className="font-medium">{formatDate(site.lastDiagnosisAt)}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href={`/sites/${site.siteId}`}>
                        <Button variant="outline" size="sm" data-testid={`button-view-site-${site.siteId}`}>
                          <Settings className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm('Are you sure you want to archive this site?')) {
                            deleteSite.mutate(site.siteId);
                          }
                        }}
                        data-testid={`button-delete-site-${site.siteId}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No sites configured yet</h3>
                <p className="text-muted-foreground mb-4">Add your first site to start monitoring</p>
                <Link href={ROUTES.SITE_NEW}>
                  <Button data-testid="button-add-first-site">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Site
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
