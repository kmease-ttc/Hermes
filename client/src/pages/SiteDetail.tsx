import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Save, Globe, Loader2 } from "lucide-react";
import { Link } from "wouter";

interface Site {
  id: number;
  siteId: string;
  displayName: string;
  baseUrl: string;
  category: string | null;
  techStack: string | null;
  repoProvider: string | null;
  repoIdentifier: string | null;
  deployMethod: string | null;
  crawlSettings: any;
  sitemaps: string[] | null;
  keyPages: string[] | null;
  integrations: any;
  guardrails: any;
  cadence: any;
  ownerName: string | null;
  ownerContact: string | null;
  healthScore: number | null;
  status: string;
  active: boolean;
  createdAt: string;
}

export default function SiteDetail() {
  const { siteId } = useParams<{ siteId?: string }>();
  const isNew = !siteId || siteId === 'new';
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    displayName: '',
    baseUrl: '',
    category: '',
    techStack: '',
    repoProvider: '',
    repoIdentifier: '',
    deployMethod: '',
    ownerName: '',
    ownerContact: '',
    status: 'onboarding',
    sitemaps: '',
    keyPages: '',
    ga4PropertyId: '',
    gscProperty: '',
    adsCustomerId: '',
  });

  const { data: site, isLoading } = useQuery<Site>({
    queryKey: ['site', siteId],
    queryFn: async () => {
      const res = await fetch(`/api/sites/${siteId}`);
      if (!res.ok) throw new Error('Failed to fetch site');
      return res.json();
    },
    enabled: !isNew && !!siteId,
  });

  useEffect(() => {
    if (site) {
      const integrations = site.integrations as any || {};
      setFormData({
        displayName: site.displayName || '',
        baseUrl: site.baseUrl || '',
        category: site.category || '',
        techStack: site.techStack || '',
        repoProvider: site.repoProvider || '',
        repoIdentifier: site.repoIdentifier || '',
        deployMethod: site.deployMethod || '',
        ownerName: site.ownerName || '',
        ownerContact: site.ownerContact || '',
        status: site.status || 'onboarding',
        sitemaps: (site.sitemaps || []).join('\n'),
        keyPages: (site.keyPages || []).join('\n'),
        ga4PropertyId: integrations.ga4?.property_id || '',
        gscProperty: integrations.gsc?.property || '',
        adsCustomerId: integrations.google_ads?.customer_id || '',
      });
    }
  }, [site]);

  const saveSite = useMutation({
    mutationFn: async (data: typeof formData) => {
      const body = {
        displayName: data.displayName,
        baseUrl: data.baseUrl,
        category: data.category || null,
        techStack: data.techStack || null,
        repoProvider: data.repoProvider || null,
        repoIdentifier: data.repoIdentifier || null,
        deployMethod: data.deployMethod || null,
        ownerName: data.ownerName || null,
        ownerContact: data.ownerContact || null,
        status: data.status,
        sitemaps: data.sitemaps ? data.sitemaps.split('\n').map(s => s.trim()).filter(Boolean) : null,
        keyPages: data.keyPages ? data.keyPages.split('\n').map(s => s.trim()).filter(Boolean) : null,
        integrations: {
          ga4: data.ga4PropertyId ? { property_id: data.ga4PropertyId } : null,
          gsc: data.gscProperty ? { property: data.gscProperty } : null,
          google_ads: data.adsCustomerId ? { customer_id: data.adsCustomerId } : null,
        },
      };

      const url = isNew ? '/api/sites' : `/api/sites/${siteId}`;
      const method = isNew ? 'POST' : 'PATCH';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save site');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: isNew ? "Site created" : "Site updated", description: `${data.displayName} has been saved.` });
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      if (isNew) {
        setLocation(`/sites/${data.siteId}`);
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.displayName || !formData.baseUrl) {
      toast({ title: "Validation Error", description: "Display name and base URL are required", variant: "destructive" });
      return;
    }
    saveSite.mutate(formData);
  };

  if (!isNew && isLoading) {
    return (
      <DashboardLayout className="dashboard-light">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout className="dashboard-light">
      <div className="space-y-6 max-w-3xl">
        <div className="flex items-center gap-4">
          <Link href="/sites">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="page-title">
              {isNew ? 'Add New Site' : `Edit ${site?.displayName || 'Site'}`}
            </h1>
            <p className="text-muted-foreground">
              {isNew ? 'Configure a new site for monitoring' : 'Update site configuration'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Basic Information
              </CardTitle>
              <CardDescription>Core site details and identification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name *</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData(f => ({ ...f, displayName: e.target.value }))}
                    placeholder="My Website"
                    data-testid="input-display-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="baseUrl">Base URL *</Label>
                  <Input
                    id="baseUrl"
                    value={formData.baseUrl}
                    onChange={(e) => setFormData(f => ({ ...f, baseUrl: e.target.value }))}
                    placeholder="https://example.com"
                    data-testid="input-base-url"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData(f => ({ ...f, category: v }))}>
                    <SelectTrigger data-testid="select-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="clinic">Clinic</SelectItem>
                      <SelectItem value="ecommerce">E-commerce</SelectItem>
                      <SelectItem value="saas">SaaS</SelectItem>
                      <SelectItem value="blog">Blog</SelectItem>
                      <SelectItem value="agency">Agency</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="techStack">Tech Stack</Label>
                  <Select value={formData.techStack} onValueChange={(v) => setFormData(f => ({ ...f, techStack: v }))}>
                    <SelectTrigger data-testid="select-tech-stack">
                      <SelectValue placeholder="Select stack" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nextjs">Next.js</SelectItem>
                      <SelectItem value="react">React</SelectItem>
                      <SelectItem value="remix">Remix</SelectItem>
                      <SelectItem value="wordpress">WordPress</SelectItem>
                      <SelectItem value="webflow">Webflow</SelectItem>
                      <SelectItem value="shopify">Shopify</SelectItem>
                      <SelectItem value="unknown">Unknown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(v) => setFormData(f => ({ ...f, status: v }))}>
                    <SelectTrigger data-testid="select-status">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="onboarding">Onboarding</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Repository & Deployment</CardTitle>
              <CardDescription>Code repository and deployment settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="repoProvider">Repository Provider</Label>
                  <Select value={formData.repoProvider} onValueChange={(v) => setFormData(f => ({ ...f, repoProvider: v }))}>
                    <SelectTrigger data-testid="select-repo-provider">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="github">GitHub</SelectItem>
                      <SelectItem value="replit">Replit</SelectItem>
                      <SelectItem value="gitlab">GitLab</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="repoIdentifier">Repository Identifier</Label>
                  <Input
                    id="repoIdentifier"
                    value={formData.repoIdentifier}
                    onChange={(e) => setFormData(f => ({ ...f, repoIdentifier: e.target.value }))}
                    placeholder="org/repo or project-id"
                    data-testid="input-repo-identifier"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deployMethod">Deploy Method</Label>
                <Select value={formData.deployMethod} onValueChange={(v) => setFormData(f => ({ ...f, deployMethod: v }))}>
                  <SelectTrigger data-testid="select-deploy-method">
                    <SelectValue placeholder="Select deploy method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="replit_deploy">Replit Deployments</SelectItem>
                    <SelectItem value="vercel">Vercel</SelectItem>
                    <SelectItem value="netlify">Netlify</SelectItem>
                    <SelectItem value="cloudflare_pages">Cloudflare Pages</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Google Integrations</CardTitle>
              <CardDescription>Connect Google Analytics, Search Console, and Ads</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="ga4PropertyId">GA4 Property ID</Label>
                  <Input
                    id="ga4PropertyId"
                    value={formData.ga4PropertyId}
                    onChange={(e) => setFormData(f => ({ ...f, ga4PropertyId: e.target.value }))}
                    placeholder="123456789"
                    data-testid="input-ga4-property-id"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gscProperty">Search Console Property</Label>
                  <Input
                    id="gscProperty"
                    value={formData.gscProperty}
                    onChange={(e) => setFormData(f => ({ ...f, gscProperty: e.target.value }))}
                    placeholder="sc-domain:example.com"
                    data-testid="input-gsc-property"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="adsCustomerId">Google Ads Customer ID</Label>
                  <Input
                    id="adsCustomerId"
                    value={formData.adsCustomerId}
                    onChange={(e) => setFormData(f => ({ ...f, adsCustomerId: e.target.value }))}
                    placeholder="123-456-7890"
                    data-testid="input-ads-customer-id"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sitemaps & Key Pages</CardTitle>
              <CardDescription>Important URLs to monitor</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sitemaps">Sitemaps (one per line)</Label>
                <Textarea
                  id="sitemaps"
                  value={formData.sitemaps}
                  onChange={(e) => setFormData(f => ({ ...f, sitemaps: e.target.value }))}
                  placeholder="https://example.com/sitemap.xml"
                  rows={3}
                  data-testid="input-sitemaps"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="keyPages">Key Pages (one per line)</Label>
                <Textarea
                  id="keyPages"
                  value={formData.keyPages}
                  onChange={(e) => setFormData(f => ({ ...f, keyPages: e.target.value }))}
                  placeholder="/login&#10;/pricing&#10;/contact"
                  rows={3}
                  data-testid="input-key-pages"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Owner Information</CardTitle>
              <CardDescription>Contact details for notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ownerName">Owner Name</Label>
                  <Input
                    id="ownerName"
                    value={formData.ownerName}
                    onChange={(e) => setFormData(f => ({ ...f, ownerName: e.target.value }))}
                    placeholder="John Doe"
                    data-testid="input-owner-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ownerContact">Contact (Email or Slack)</Label>
                  <Input
                    id="ownerContact"
                    value={formData.ownerContact}
                    onChange={(e) => setFormData(f => ({ ...f, ownerContact: e.target.value }))}
                    placeholder="john@example.com"
                    data-testid="input-owner-contact"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Link href="/sites">
              <Button variant="outline" type="button" data-testid="button-cancel">Cancel</Button>
            </Link>
            <Button type="submit" disabled={saveSite.isPending} data-testid="button-save">
              {saveSite.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              {isNew ? 'Create Site' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
