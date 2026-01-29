import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Globe, Play, CheckCircle, Clock, Pause, ArrowLeft, Save } from "lucide-react";
import { Link } from "wouter";
import { ROUTES } from "@shared/routes";

interface ManagedWebsite {
  id: string;
  name: string;
  domain: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface WebsiteSettings {
  id: number;
  websiteId: string;
  competitors: string[];
  targetServicesEnabled: string[];
  notes: string | null;
  updatedAt: string;
}

interface WebsiteIntegration {
  id: number;
  websiteId: string;
  integrationType: string;
  config: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

interface WebsiteDetailResponse {
  ok: boolean;
  website: ManagedWebsite;
  settings: WebsiteSettings | null;
  integrations: WebsiteIntegration[];
}

export default function WebsiteRegistryDetail() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, params] = useRoute("/app/websites/:websiteId");
  const [, navigate] = useLocation();
  const websiteId = params?.websiteId;

  const [competitors, setCompetitors] = useState("");
  const [services, setServices] = useState("");
  const [notes, setNotes] = useState("");

  const { data, isLoading } = useQuery<WebsiteDetailResponse>({
    queryKey: [`/api/websites/${websiteId}`],
    queryFn: async () => {
      const res = await fetch(`/api/websites/${websiteId}`);
      if (!res.ok) throw new Error("Failed to fetch website");
      return res.json();
    },
    enabled: !!websiteId,
  });

  useEffect(() => {
    if (data?.settings) {
      setCompetitors((data.settings.competitors || []).join(", "));
      setServices((data.settings.targetServicesEnabled || []).join(", "));
      setNotes(data.settings.notes || "");
    }
  }, [data?.settings]);

  const updateWebsite = useMutation({
    mutationFn: async (body: Record<string, any>) => {
      const res = await fetch(`/api/websites/${websiteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update");
      return json;
    },
    onSuccess: () => {
      toast({ title: "Updated", description: "Website settings saved." });
      queryClient.invalidateQueries({ queryKey: [`/api/websites/${websiteId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/websites"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const publishJob = useMutation({
    mutationFn: async (jobType: string) => {
      const res = await fetch(`/api/websites/${websiteId}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ job_type: jobType }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to publish job");
      return json;
    },
    onSuccess: (data) => {
      toast({
        title: "Job Published",
        description: `Job ${data.job_id} queued for ${data.domain}`,
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSaveSettings = () => {
    updateWebsite.mutate({
      settings: {
        competitors: competitors
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        targetServicesEnabled: services
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        notes: notes || null,
      },
    });
  };

  const handleToggleStatus = () => {
    if (!data?.website) return;
    const newStatus = data.website.status === "active" ? "paused" : "active";
    updateWebsite.mutate({ status: newStatus });
  };

  if (!websiteId) {
    return (
      <DashboardLayout title="Website Not Found">
        <p className="text-muted-foreground">Invalid website ID.</p>
      </DashboardLayout>
    );
  }

  if (isLoading) {
    return (
      <DashboardLayout title="Loading...">
        <p className="text-muted-foreground">Loading website details...</p>
      </DashboardLayout>
    );
  }

  if (!data?.website) {
    return (
      <DashboardLayout title="Not Found">
        <p className="text-muted-foreground">Website not found.</p>
      </DashboardLayout>
    );
  }

  const { website, settings, integrations } = data;

  return (
    <DashboardLayout
      title={website.name}
      subtitle={website.domain}
    >
      <div className="space-y-6">
        {/* Back link + status */}
        <div className="flex items-center justify-between">
          <Link href={ROUTES.WEBSITES}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              All Websites
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            {website.status === "active" ? (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                <CheckCircle className="w-3 h-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30">
                <Clock className="w-3 h-3 mr-1" />
                Paused
              </Badge>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleStatus}
              disabled={updateWebsite.isPending}
            >
              {website.status === "active" ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Activate
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Run Health Check */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Job Actions</CardTitle>
            <CardDescription>
              Publish jobs to the worker queue for this website.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              onClick={() => publishJob.mutate("health_check")}
              disabled={publishJob.isPending || website.status !== "active"}
            >
              <Play className="w-4 h-4 mr-2" />
              {publishJob.isPending ? "Publishing..." : "Run Health Check"}
            </Button>
            <Button
              variant="outline"
              onClick={() => publishJob.mutate("crawl_technical_seo")}
              disabled={publishJob.isPending || website.status !== "active"}
            >
              <Globe className="w-4 h-4 mr-2" />
              Crawl Technical SEO
            </Button>
          </CardContent>
        </Card>

        {/* Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Settings</CardTitle>
            <CardDescription>
              Configure competitors, enabled services, and notes for this website.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="competitors">Competitors (comma-separated domains)</Label>
              <Input
                id="competitors"
                placeholder="competitor1.com, competitor2.com"
                value={competitors}
                onChange={(e) => setCompetitors(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="services">Enabled Services (comma-separated)</Label>
              <Input
                id="services"
                placeholder="health_check, crawl_technical_seo, rank_tracker"
                value={services}
                onChange={(e) => setServices(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Internal notes about this website..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
            <Button
              onClick={handleSaveSettings}
              disabled={updateWebsite.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {updateWebsite.isPending ? "Saving..." : "Save Settings"}
            </Button>
          </CardContent>
        </Card>

        {/* Integrations */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Integrations</CardTitle>
            <CardDescription>
              Connected integrations for this website. Secrets are stored as key references only.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {integrations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No integrations configured yet.
              </p>
            ) : (
              <div className="space-y-2">
                {integrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="flex items-center justify-between p-3 rounded-md border"
                  >
                    <div>
                      <p className="font-medium text-sm">{integration.integrationType}</p>
                      <p className="text-xs text-muted-foreground">
                        Config keys: {Object.keys(integration.config).join(", ") || "none"}
                      </p>
                    </div>
                    <Badge variant="outline">
                      Added {new Date(integration.createdAt).toLocaleDateString()}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Website ID</dt>
                <dd className="font-mono text-xs mt-1">{website.id}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Domain</dt>
                <dd className="mt-1">{website.domain}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Created</dt>
                <dd className="mt-1">{new Date(website.createdAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Last Updated</dt>
                <dd className="mt-1">{new Date(website.updatedAt).toLocaleString()}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
