import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SiteSelector } from "@/components/dashboard/SiteSelector";
import { PillarCard, PillarStatus, TrendDirection } from "@/components/dashboard/PillarCard";
import { TicketList } from "@/components/dashboard/TicketList";
import { AskAI } from "@/components/dashboard/AskAI";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Play, Download, AlertCircle, Activity, Shield, Search, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState } from "react";
import { useSiteContext } from "@/hooks/useSiteContext";
import { Link } from "wouter";

interface TrafficInsight {
  status: PillarStatus;
  direction: TrendDirection;
  headline: string;
  why: string;
  kpis: { label: string; value: string | number; delta?: string; interpretation?: 'good' | 'warning' | 'critical' | 'neutral' }[];
  actions: { text: string; link?: string }[];
}

interface TechnicalInsight {
  status: PillarStatus;
  direction: TrendDirection;
  headline: string;
  why: string;
  kpis: { label: string; value: string | number; delta?: string; interpretation?: 'good' | 'warning' | 'critical' | 'neutral' }[];
  actions: { text: string; link?: string }[];
}

interface KeywordInsight {
  status: PillarStatus;
  direction: TrendDirection;
  headline: string;
  why: string;
  kpis: { label: string; value: string | number; delta?: string; interpretation?: 'good' | 'warning' | 'critical' | 'neutral' }[];
  actions: { text: string; link?: string }[];
}

function generateTrafficInsight(stats: any): TrafficInsight {
  if (!stats?.organicTraffic?.trend || stats.organicTraffic.trend.length < 7) {
    return {
      status: 'inconclusive',
      direction: 'flat',
      headline: 'GA4 data not yet collected',
      why: 'Run diagnostics to fetch traffic data from Google Analytics. Without this data, we cannot assess your organic traffic health.',
      kpis: [
        { label: 'Organic Sessions', value: '—', interpretation: 'neutral' },
        { label: 'Total Sessions', value: '—', interpretation: 'neutral' },
      ],
      actions: [{ text: 'Run diagnostics to fetch GA4 data' }],
    };
  }

  const trend = stats.organicTraffic.trend;
  const recent7d = trend.slice(-7).reduce((sum: number, d: any) => sum + (d.value || 0), 0);
  const previous7d = trend.slice(-14, -7).reduce((sum: number, d: any) => sum + (d.value || 0), 0);
  const totalSessions = trend.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
  
  let changePercent = 0;
  if (previous7d > 0) {
    changePercent = ((recent7d - previous7d) / previous7d) * 100;
  }

  let status: PillarStatus = 'good';
  let direction: TrendDirection = 'flat';
  let headline = 'Traffic is stable compared to last week';
  let why = 'Organic traffic is maintaining steady levels. No immediate concerns detected.';
  let actions: { text: string; link?: string }[] = [];

  if (changePercent < -25) {
    status = 'critical';
    direction = 'down';
    headline = `Organic sessions down ${Math.abs(changePercent).toFixed(0)}% week-over-week`;
    why = 'Significant traffic decline detected. This could indicate ranking drops, indexation issues, or seasonal patterns. Immediate investigation recommended.';
    actions = [
      { text: 'Investigate ranking drops for top landing pages', link: '/analysis' },
      { text: 'Check for recent technical changes affecting indexation' },
    ];
  } else if (changePercent < -10) {
    status = 'attention';
    direction = 'down';
    headline = `Organic sessions down ${Math.abs(changePercent).toFixed(0)}% week-over-week`;
    why = 'Moderate traffic decline. Review keyword positions for pages that may have lost visibility.';
    actions = [
      { text: 'Review keyword positions 4–12 for quick recovery', link: '/serp' },
      { text: 'Check top losing pages for content freshness' },
    ];
  } else if (changePercent > 10) {
    status = 'good';
    direction = 'up';
    headline = `Organic sessions up ${changePercent.toFixed(0)}% week-over-week`;
    why = 'Traffic is growing. Continue current SEO efforts and monitor which pages are driving gains.';
    actions = [];
  }

  return {
    status,
    direction,
    headline,
    why,
    kpis: [
      { 
        label: 'Organic (7d)', 
        value: recent7d.toLocaleString(), 
        delta: changePercent !== 0 ? `${changePercent > 0 ? '+' : ''}${changePercent.toFixed(0)}%` : undefined,
        interpretation: changePercent < -10 ? 'critical' : changePercent > 10 ? 'good' : 'neutral'
      },
      { 
        label: 'Total (30d)', 
        value: totalSessions.toLocaleString(),
        interpretation: 'neutral'
      },
    ],
    actions,
  };
}

function generateTechnicalInsight(stats: any): TechnicalInsight {
  if (!stats?.webChecks) {
    return {
      status: 'inconclusive',
      direction: 'flat',
      headline: 'Website health checks not yet run',
      why: 'Run diagnostics to crawl your site and check for technical SEO issues like indexation blockers, missing meta tags, and server errors.',
      kpis: [
        { label: 'Pages Checked', value: '—', interpretation: 'neutral' },
        { label: 'Issues Found', value: '—', interpretation: 'neutral' },
      ],
      actions: [{ text: 'Run diagnostics to crawl the site' }],
    };
  }

  const { total, passed } = stats.webChecks;
  const issues = total - passed;
  const passRate = total > 0 ? (passed / total) * 100 : 0;

  let status: PillarStatus = 'good';
  let direction: TrendDirection = 'flat';
  let headline = `All ${total} pages passing health checks`;
  let why = 'No technical issues detected. Your site is well-optimized for crawling and indexation.';
  let actions: { text: string; link?: string }[] = [];

  if (passRate < 75) {
    status = 'critical';
    direction = 'down';
    headline = `Only ${passRate.toFixed(0)}% of health checks passing`;
    why = `${issues} pages have issues that may block indexation or hurt rankings. These likely include noindex tags, missing sitemaps, or server errors.`;
    actions = [
      { text: 'Fix indexation blockers first (noindex, robots.txt)', link: '/analysis' },
      { text: 'Check server response codes for 4xx/5xx errors' },
    ];
  } else if (passRate < 90) {
    status = 'attention';
    direction = 'flat';
    headline = `${issues} pages have issues that need attention`;
    why = 'Minor technical issues detected. These may include duplicate titles, missing meta descriptions, or slow page speeds.';
    actions = [
      { text: 'Fix duplicate titles on affected pages', link: '/analysis' },
      { text: 'Add missing meta descriptions' },
    ];
  }

  return {
    status,
    direction,
    headline,
    why,
    kpis: [
      { 
        label: 'Pages Checked', 
        value: total,
        interpretation: 'neutral'
      },
      { 
        label: 'Issues Found', 
        value: issues,
        interpretation: issues > 5 ? 'critical' : issues > 0 ? 'warning' : 'good'
      },
    ],
    actions,
  };
}

function generateKeywordInsight(serpOverview: any): KeywordInsight {
  if (!serpOverview?.totalKeywords) {
    return {
      status: 'inconclusive',
      direction: 'flat',
      headline: 'No keywords tracked yet',
      why: 'Add target keywords to monitor your search rankings. Without tracked keywords, we cannot assess your visibility in search results.',
      kpis: [
        { label: 'Tracked', value: 0, interpretation: 'neutral' },
        { label: 'In Top 10', value: 0, interpretation: 'neutral' },
      ],
      actions: [{ text: 'Add target keywords to start tracking', link: '/serp' }],
    };
  }

  if (!serpOverview.lastCheck) {
    return {
      status: 'inconclusive',
      direction: 'flat',
      headline: 'Keywords seeded but not yet checked',
      why: `${serpOverview.totalKeywords} keywords are ready to track. Run a SERP check to fetch current rankings.`,
      kpis: [
        { label: 'Tracked', value: serpOverview.totalKeywords, interpretation: 'neutral' },
        { label: 'In Top 10', value: '—', interpretation: 'neutral' },
      ],
      actions: [{ text: 'Run SERP check to fetch rankings', link: '/serp' }],
    };
  }

  const { stats } = serpOverview;
  const { inTop10, inTop20, losers, winners, avgPosition, notRanking } = stats;
  const total = serpOverview.totalKeywords;
  const opportunities = total - inTop10 - notRanking;

  let status: PillarStatus = 'good';
  let direction: TrendDirection = 'flat';
  let headline = `${inTop10} keywords in top 10 positions`;
  let why = 'Your tracked keywords are performing well. Continue monitoring for any position changes.';
  let actions: { text: string; link?: string }[] = [];

  if (losers > winners && losers > 0) {
    status = 'attention';
    direction = 'down';
    headline = `More keywords declining (${losers}) than improving (${winners})`;
    why = 'Rankings are trending downward. Focus on keywords in positions 4–12 for quick wins.';
    actions = [
      { text: 'Optimize titles/meta for opportunity keywords', link: '/serp' },
      { text: 'Add internal links to underperforming pages' },
    ];
  } else if (inTop10 === 0 && total > 0) {
    status = 'attention';
    direction = 'flat';
    headline = 'No keywords ranking in top 10 yet';
    why = `Most tracked keywords are ranking outside the top 10 or not ranking at all. This indicates an opportunity to improve content and on-page SEO.`;
    actions = [
      { text: 'Review top-ranking competitors for content gaps', link: '/serp' },
      { text: 'Expand content depth on key landing pages' },
    ];
  } else if (winners > losers && winners > 0) {
    status = 'good';
    direction = 'up';
    headline = `Keywords improving (${winners}) outpacing declines (${losers})`;
    why = 'Positive ranking momentum. Your SEO efforts are showing results.';
    actions = [];
  }

  return {
    status,
    direction,
    headline,
    why,
    kpis: [
      { label: 'Tracked', value: total, interpretation: 'neutral' },
      { label: 'In Top 10', value: inTop10, interpretation: inTop10 > 0 ? 'good' : 'warning' },
      { label: 'Opportunities', value: opportunities > 0 ? opportunities : 0, interpretation: opportunities > 5 ? 'warning' : 'neutral' },
      { label: 'Not Ranking', value: notRanking, interpretation: notRanking > total / 2 ? 'critical' : 'neutral' },
    ],
    actions,
  };
}

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

  const trafficInsight = generateTrafficInsight(stats);
  const technicalInsight = generateTechnicalInsight(stats);
  const keywordInsight = generateKeywordInsight(serpOverview);

  const domain = selectedSite?.baseUrl?.replace(/^https?:\/\//, '') || 'your site';

  const getOverallStatus = () => {
    const statuses = [trafficInsight.status, technicalInsight.status, keywordInsight.status];
    if (statuses.includes('critical')) return { text: 'Issues Detected', color: 'text-red-600', bg: 'bg-red-50' };
    if (statuses.includes('attention')) return { text: 'Needs Attention', color: 'text-yellow-600', bg: 'bg-yellow-50' };
    if (statuses.every(s => s === 'inconclusive')) return { text: 'Setup Required', color: 'text-gray-600', bg: 'bg-gray-50' };
    return { text: 'Healthy', color: 'text-green-600', bg: 'bg-green-50' };
  };

  const overallStatus = getOverallStatus();

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
        
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-3">
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
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold tracking-tight">Overview</h2>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${overallStatus.bg} ${overallStatus.color}`}>
                  {overallStatus.text}
                </span>
              </div>
              <p className="text-muted-foreground mt-1">
                Daily diagnostic report for <span className="font-medium text-foreground">{domain}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" data-testid="button-export">
              <Download className="w-4 h-4" />
              Export
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
              <span>Connect to Google Analytics and Search Console to enable data collection.</span>
              <Button onClick={handleGetAuthUrl} variant="outline" size="sm" className="ml-4" data-testid="button-authenticate">
                Authenticate
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <section>
          <div className="grid lg:grid-cols-3 gap-4">
            <PillarCard
              title="Website Traffic"
              icon={<Activity className="w-5 h-5 text-blue-600" />}
              status={trafficInsight.status}
              direction={trafficInsight.direction}
              statusHeadline={trafficInsight.headline}
              whyExplanation={trafficInsight.why}
              kpis={trafficInsight.kpis}
              nextActions={trafficInsight.actions}
              detailsLink="/analysis"
            />
            <PillarCard
              title="Technical SEO"
              icon={<Shield className="w-5 h-5 text-green-600" />}
              status={technicalInsight.status}
              direction={technicalInsight.direction}
              statusHeadline={technicalInsight.headline}
              whyExplanation={technicalInsight.why}
              kpis={technicalInsight.kpis}
              nextActions={technicalInsight.actions}
              detailsLink="/analysis"
            />
            <PillarCard
              title="Keyword Ranking"
              icon={<Search className="w-5 h-5 text-purple-600" />}
              status={keywordInsight.status}
              direction={keywordInsight.direction}
              statusHeadline={keywordInsight.headline}
              whyExplanation={keywordInsight.why}
              kpis={keywordInsight.kpis}
              nextActions={keywordInsight.actions}
              detailsLink="/serp"
            />
          </div>
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
