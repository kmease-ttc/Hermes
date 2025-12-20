import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SiteSelector } from "@/components/dashboard/SiteSelector";
import { PillarCard, PillarStatus } from "@/components/dashboard/PillarCard";
import { TicketList } from "@/components/dashboard/TicketList";
import { AskAI } from "@/components/dashboard/AskAI";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Download, AlertCircle, Activity, Shield, Search, TrendingUp, TrendingDown, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState } from "react";
import { useSiteContext } from "@/hooks/useSiteContext";
import { Link } from "wouter";

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);
  const { selectedSite, selectedSiteId, sites, isLoading: sitesLoading } = useSiteContext();

  const { data: authStatus } = useQuery({
    queryKey: ['auth-status'],
    queryFn: async () => {
      const res = await fetch('/api/auth/status');
      if (!res.ok) throw new Error('Failed to check auth status');
      return res.json();
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats', selectedSiteId],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard/stats${selectedSiteId ? `?siteId=${selectedSiteId}` : ''}`);
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    refetchInterval: 30000,
    enabled: !!selectedSiteId || sites.length === 0,
  });

  const { data: serpOverview } = useQuery({
    queryKey: ['serp-overview', selectedSiteId],
    queryFn: async () => {
      const res = await fetch(`/api/serp/overview${selectedSiteId ? `?siteId=${selectedSiteId}` : ''}`);
      if (!res.ok) throw new Error('Failed to fetch SERP overview');
      return res.json();
    },
    enabled: !!selectedSiteId || sites.length === 0,
  });

  const runDiagnostics = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/run${selectedSiteId ? `?siteId=${selectedSiteId}` : ''}`, { 
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to run diagnostics');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Diagnostics Completed",
        description: `${data.classification || 'Analysis'}: ${data.summary}`,
      });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['serp-overview'] });
      setIsRunning(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Diagnostics Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsRunning(false);
    },
  });

  const handleRunDiagnostics = () => {
    setIsRunning(true);
    runDiagnostics.mutate();
  };

  const handleGetAuthUrl = async () => {
    try {
      const res = await fetch('/api/auth/url');
      const data = await res.json();
      if (data.url) {
        window.open(data.url, '_blank');
        toast({
          title: "Authentication Required",
          description: "Complete the OAuth flow in the new window.",
        });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getTrafficStatus = (): { status: PillarStatus; message: string } => {
    if (!stats?.organicTraffic) {
      return { status: 'inconclusive', message: 'GA4 data not yet collected. Run diagnostics to fetch data.' };
    }
    const trend = stats.organicTraffic.trend || [];
    if (trend.length < 7) {
      return { status: 'inconclusive', message: 'Insufficient data for trend analysis.' };
    }
    const recent = trend.slice(-7).reduce((sum: number, d: any) => sum + d.value, 0);
    const previous = trend.slice(-14, -7).reduce((sum: number, d: any) => sum + d.value, 0);
    if (previous === 0) {
      return { status: 'good', message: 'Traffic data available but no comparison period.' };
    }
    const change = ((recent - previous) / previous) * 100;
    if (change < -25) {
      return { status: 'critical', message: `Organic traffic down ${Math.abs(change).toFixed(0)}% week-over-week.` };
    }
    if (change < -10) {
      return { status: 'attention', message: `Organic traffic down ${Math.abs(change).toFixed(0)}% week-over-week.` };
    }
    if (change > 10) {
      return { status: 'good', message: `Organic traffic up ${change.toFixed(0)}% week-over-week!` };
    }
    return { status: 'good', message: 'Traffic is stable compared to last week.' };
  };

  const getTechnicalStatus = (): { status: PillarStatus; message: string } => {
    if (!stats?.webChecks) {
      return { status: 'inconclusive', message: 'Website health checks not yet run.' };
    }
    const { total, passed } = stats.webChecks;
    if (total === 0) {
      return { status: 'inconclusive', message: 'No pages checked yet.' };
    }
    const passRate = (passed / total) * 100;
    if (passRate < 75) {
      return { status: 'critical', message: `Only ${passRate.toFixed(0)}% of health checks passing.` };
    }
    if (passRate < 90) {
      return { status: 'attention', message: `${total - passed} pages have issues that need attention.` };
    }
    return { status: 'good', message: `All ${total} pages passing health checks.` };
  };

  const getKeywordStatus = (): { status: PillarStatus; message: string } => {
    if (!serpOverview?.totalKeywords) {
      return { status: 'inconclusive', message: 'No keywords tracked. Seed keywords to start.' };
    }
    if (!serpOverview.lastCheck) {
      return { status: 'inconclusive', message: 'Keywords seeded but not yet checked. Run a SERP check.' };
    }
    const { stats: serpStats } = serpOverview;
    if (serpStats.losers > serpStats.winners) {
      return { status: 'attention', message: `More keywords declining (${serpStats.losers}) than improving (${serpStats.winners}).` };
    }
    if (serpStats.inTop10 > 0) {
      return { status: 'good', message: `${serpStats.inTop10} keywords in top 10 positions.` };
    }
    return { status: 'attention', message: 'No keywords ranking in top 10 yet.' };
  };

  const trafficStatus = getTrafficStatus();
  const technicalStatus = getTechnicalStatus();
  const keywordStatus = getKeywordStatus();

  const domain = selectedSite?.baseUrl?.replace(/^https?:\/\//, '') || 'your site';

  if (sitesLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (sites.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Sites Configured</h2>
          <p className="text-muted-foreground mb-4">Add your first website to start monitoring.</p>
          <Link href="/sites/new">
            <Button data-testid="button-add-first-site">Add Your First Site</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <SiteSelector />
              {selectedSite && (
                <a 
                  href={selectedSite.baseUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
            <p className="text-muted-foreground">
              Daily diagnostic report for <span className="font-medium text-foreground">{domain}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" data-testid="button-export">
              <Download className="w-4 h-4" />
              Export Report
            </Button>
            <Button 
              onClick={handleRunDiagnostics} 
              disabled={isRunning}
              className="gap-2 shadow-lg shadow-primary/20"
              data-testid="button-run-diagnostics"
            >
              <Play className="w-4 h-4" />
              {isRunning ? 'Running...' : 'Run Diagnostics'}
            </Button>
          </div>
        </div>

        {!authStatus?.authenticated && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Required</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Connect to Google Analytics, Search Console, and Ads APIs to enable data collection.</span>
              <Button onClick={handleGetAuthUrl} variant="outline" size="sm" className="ml-4" data-testid="button-authenticate">
                Authenticate
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <section>
          <h3 className="text-lg font-semibold mb-4">Site Health</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <PillarCard
              title="Website Traffic"
              icon={<Activity className="w-5 h-5 text-blue-600" />}
              status={trafficStatus.status}
              statusMessage={trafficStatus.message}
              kpis={[
                { label: 'Organic Sessions (7d)', value: stats?.organicTraffic?.total?.toLocaleString() || '—' },
                { label: 'Total Sessions', value: stats?.organicTraffic?.trend?.length > 0 ? stats.organicTraffic.trend.reduce((s: number, d: any) => s + d.value, 0).toLocaleString() : '—' },
              ]}
              detailsLink="/analysis"
            />
            <PillarCard
              title="Technical SEO"
              icon={<Shield className="w-5 h-5 text-green-600" />}
              status={technicalStatus.status}
              statusMessage={technicalStatus.message}
              kpis={[
                { label: 'Pages Checked', value: stats?.webChecks?.total || '—' },
                { label: 'Issues Found', value: stats?.webChecks ? stats.webChecks.total - stats.webChecks.passed : '—' },
              ]}
              detailsLink="/analysis"
            />
            <PillarCard
              title="Keyword Ranking"
              icon={<Search className="w-5 h-5 text-purple-600" />}
              status={keywordStatus.status}
              statusMessage={keywordStatus.message}
              kpis={[
                { label: 'Tracked Keywords', value: serpOverview?.totalKeywords || 0 },
                { label: 'In Top 10', value: serpOverview?.stats?.inTop10 || 0 },
              ]}
              detailsLink="/serp"
            />
          </div>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recommended Actions</CardTitle>
              <CardDescription>Priority tasks based on your site's current status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {trafficStatus.status === 'inconclusive' && (
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Activity className="w-5 h-5 text-blue-600" />
                    <div className="flex-1">
                      <p className="font-medium">Connect Google Analytics</p>
                      <p className="text-sm text-muted-foreground">Enable traffic monitoring for this site</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleGetAuthUrl}>Connect</Button>
                  </div>
                )}
                {keywordStatus.status === 'inconclusive' && !serpOverview?.totalKeywords && (
                  <Link href="/serp">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                      <Search className="w-5 h-5 text-purple-600" />
                      <div className="flex-1">
                        <p className="font-medium">Set Up Keyword Tracking</p>
                        <p className="text-sm text-muted-foreground">Add keywords to monitor your search rankings</p>
                      </div>
                      <Button variant="outline" size="sm">Set Up</Button>
                    </div>
                  </Link>
                )}
                {trafficStatus.status !== 'inconclusive' && keywordStatus.status !== 'inconclusive' && technicalStatus.status !== 'inconclusive' && (
                  <p className="text-muted-foreground text-center py-4">All systems operational. No immediate actions required.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <TicketList />
        </section>

        <section>
          <AskAI />
        </section>

      </div>
    </DashboardLayout>
  );
}
