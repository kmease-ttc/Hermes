import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { BarChart3, Search, Globe, Loader2 } from "lucide-react";
import { useSiteContext } from "@/hooks/useSiteContext";
import { IntegrationCard } from "@/components/integrations/IntegrationCard";
import { GAConfigWizard } from "@/components/integrations/GAConfigWizard";
import { GSCConfigWizard } from "@/components/integrations/GSCConfigWizard";
import { useGoogleConnection } from "@/components/integrations/useGoogleConnection";
import { toast } from "sonner";

export default function SettingsIntegrations() {
  const { siteId, siteDomain, selectedSite } = useSiteContext();
  const google = useGoogleConnection(siteId);

  const [gaWizardOpen, setGaWizardOpen] = useState(false);
  const [gscWizardOpen, setGscWizardOpen] = useState(false);

  // Crawler state (kept as-is since it's not part of Google OAuth)
  const integrations = selectedSite?.integrations || {};
  const [crawlerEnabled, setCrawlerEnabled] = useState(integrations.crawler?.enabled ?? false);
  const [crawlerUrl, setCrawlerUrl] = useState(siteDomain ? `https://${siteDomain}` : "");
  const [crawlerTesting, setCrawlerTesting] = useState(false);

  // Auto-scroll to hash anchor
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const element = document.getElementById(hash);
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    }
  }, []);

  // Handle OAuth callback redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("google") === "connected") {
      toast.success("Google account connected successfully");
      const url = new URL(window.location.href);
      url.searchParams.delete("google");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, []);

  const handleDisconnect = async () => {
    if (!confirm("Disconnect Google from this site? This will remove GA4 and Search Console connections.")) return;
    try {
      await google.disconnect();
      toast.success("Google disconnected");
    } catch {
      toast.error("Failed to disconnect Google");
    }
  };

  const handleTestCrawl = async () => {
    if (!crawlerUrl.trim()) {
      toast.error("Please enter a crawl URL");
      return;
    }
    setCrawlerTesting(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setCrawlerTesting(false);
    toast.success("Test crawl completed successfully");
  };

  return (
    <DashboardLayout className="dashboard-light">
      <div className="space-y-8 max-w-3xl mx-auto">
        <header>
          <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
          <p className="text-muted-foreground mt-1">
            Connect your data sources to unlock insights
          </p>
        </header>

        <div className="space-y-4">
          {/* Google Analytics */}
          <div id="ga4">
            <IntegrationCard
              title="Google Analytics (GA4)"
              description="See which pages bring real visitors and which ones convert"
              icon={BarChart3}
              isConnected={!!google.status?.ga4}
              isLoading={google.isLoadingStatus}
              connectedDetail={
                google.status?.ga4?.propertyId
                  ? `Property: ${google.status.ga4.propertyId}`
                  : undefined
              }
              onConfigure={() => setGaWizardOpen(true)}
              onDisconnect={google.status?.connected ? handleDisconnect : undefined}
            />
          </div>

          {/* Google Search Console */}
          <div id="gsc">
            <IntegrationCard
              title="Google Search Console"
              description="See impressions, clicks, CTR, and real Google positions"
              icon={Search}
              isConnected={!!google.status?.gsc}
              isLoading={google.isLoadingStatus}
              connectedDetail={google.status?.gsc?.siteUrl || undefined}
              onConfigure={() => setGscWizardOpen(true)}
              onDisconnect={google.status?.connected ? handleDisconnect : undefined}
            />
          </div>

          {/* Connected account info */}
          {google.status?.connected && google.status.googleEmail && (
            <p className="text-xs text-muted-foreground pl-1">
              Connected as {google.status.googleEmail}
              {google.status.connectedAt && (
                <> · {new Date(google.status.connectedAt).toLocaleDateString()}</>
              )}
            </p>
          )}
        </div>

        {/* Technical Crawler (unchanged) */}
        <div id="crawler">
          <Card className="bg-card rounded-xl border border-border shadow-sm scroll-mt-8">
            <CardHeader className="pb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <Globe className="w-5 h-5 text-semantic-success" />
                </div>
                <div>
                  <CardTitle className="text-lg text-foreground">Technical Crawler</CardTitle>
                  <CardDescription className="text-muted-foreground mt-1">
                    Enable automated technical SEO audits
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="crawler-toggle" className="text-sm font-medium text-foreground">
                    Allow crawl-based technical insights
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Enable automated crawling to detect technical SEO issues
                  </p>
                </div>
                <Switch
                  id="crawler-toggle"
                  checked={crawlerEnabled}
                  onCheckedChange={setCrawlerEnabled}
                  data-testid="switch-crawler"
                />
              </div>

              {crawlerEnabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="crawler-url" className="text-sm font-medium text-foreground">
                      Crawl Base URL
                    </Label>
                    <Input
                      id="crawler-url"
                      placeholder="https://example.com"
                      value={crawlerUrl}
                      onChange={(e) => setCrawlerUrl(e.target.value)}
                      className="max-w-sm"
                      data-testid="input-crawler-url"
                    />
                    <p className="text-xs text-muted-foreground">
                      The crawler will start from this URL and follow internal links
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleTestCrawl}
                    disabled={crawlerTesting}
                    data-testid="button-test-crawl"
                  >
                    {crawlerTesting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Test Crawl
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Wizard dialogs */}
      {siteId && (
        <>
          <GAConfigWizard
            open={gaWizardOpen}
            onOpenChange={setGaWizardOpen}
            siteId={siteId}
            siteDomain={siteDomain || undefined}
          />
          <GSCConfigWizard
            open={gscWizardOpen}
            onOpenChange={setGscWizardOpen}
            siteId={siteId}
            siteDomain={siteDomain || undefined}
          />
        </>
      )}
    </DashboardLayout>
  );
}
