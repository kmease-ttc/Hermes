import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { ArrowLeft, Save, Globe, Loader2, MapPin, Pencil, AlertTriangle, HelpCircle, Building2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "wouter";
import { GeoScopeSelector, type GeoScopeValue } from "@/components/site/GeoScopeSelector";

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
  geoScope: 'local' | 'national' | null;
  geoLocation: { city?: string; state?: string; country?: string } | null;
  businessDetails: {
    phone?: string;
    email?: string;
    address?: string;
    hours?: string;
    description?: string;
    services?: string[];
  } | null;
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
    businessPhone: '',
    businessEmail: '',
    businessAddress: '',
    businessHours: '',
    businessDescription: '',
    businessServices: '',
  });

  const [geoScope, setGeoScope] = useState<GeoScopeValue>({
    scope: 'national',
    city: '',
    state: '',
    country: 'United States',
  });
  const [geoScopeModalOpen, setGeoScopeModalOpen] = useState(false);
  const [pendingGeoScope, setPendingGeoScope] = useState<GeoScopeValue>(geoScope);

  const isGeoScopeValid = (value: GeoScopeValue) => {
    if (value.scope === 'local') {
      return Boolean(value.city?.trim() && value.state?.trim());
    }
    return true;
  };
  const geoScopeError = pendingGeoScope.scope === 'local' && !isGeoScopeValid(pendingGeoScope) 
    ? "City and State required for local scope" 
    : null;

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
        businessPhone: site.businessDetails?.phone || '',
        businessEmail: site.businessDetails?.email || '',
        businessAddress: site.businessDetails?.address || '',
        businessHours: site.businessDetails?.hours || '',
        businessDescription: site.businessDetails?.description || '',
        businessServices: (site.businessDetails?.services || []).join('\n'),
      });
      
      const loadedGeoScope: GeoScopeValue = {
        scope: site.geoScope || 'national',
        city: site.geoLocation?.city || '',
        state: site.geoLocation?.state || '',
        country: site.geoLocation?.country || 'United States',
      };
      setGeoScope(loadedGeoScope);
      setPendingGeoScope(loadedGeoScope);
    }
  }, [site]);

  // Auto-generate default sitemap URL when baseUrl is set and sitemaps field is empty
  useEffect(() => {
    if (formData.baseUrl && !formData.sitemaps.trim()) {
      try {
        const url = new URL(formData.baseUrl.startsWith('http') ? formData.baseUrl : `https://${formData.baseUrl}`);
        const base = `${url.protocol}//${url.hostname}`;
        setFormData(f => ({ ...f, sitemaps: `${base}/sitemap.xml` }));
      } catch {
        // Invalid URL, skip auto-generation
      }
    }
  }, [formData.baseUrl]);

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
        geoScope: geoScope.scope,
        geoLocation: geoScope.scope === 'local' ? {
          city: geoScope.city || undefined,
          state: geoScope.state || undefined,
          country: geoScope.country || 'United States',
        } : null,
        businessDetails: (data.businessPhone || data.businessEmail || data.businessAddress || data.businessHours || data.businessDescription || data.businessServices) ? {
          phone: data.businessPhone || undefined,
          email: data.businessEmail || undefined,
          address: data.businessAddress || undefined,
          hours: data.businessHours || undefined,
          description: data.businessDescription || undefined,
          services: data.businessServices ? data.businessServices.split('\n').map(s => s.trim()).filter(Boolean) : undefined,
        } : null,
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
        let message = 'Failed to save site';
        try {
          const error = await res.json();
          message = error.error || message;
        } catch {
          // Response wasn't JSON (e.g. HTML error page)
          message = `Server error (${res.status})`;
        }
        throw new Error(message);
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

          <Card data-testid="card-business-details">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Business Details
              </CardTitle>
              <CardDescription>Contact info, hours, and services displayed on your site</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="businessPhone">Phone Number</Label>
                  <Input
                    id="businessPhone"
                    value={formData.businessPhone}
                    onChange={(e) => setFormData(f => ({ ...f, businessPhone: e.target.value }))}
                    placeholder="(555) 123-4567"
                    data-testid="input-business-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessEmail">Business Email</Label>
                  <Input
                    id="businessEmail"
                    type="email"
                    value={formData.businessEmail}
                    onChange={(e) => setFormData(f => ({ ...f, businessEmail: e.target.value }))}
                    placeholder="info@yourbusiness.com"
                    data-testid="input-business-email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessAddress">Address</Label>
                <Input
                  id="businessAddress"
                  value={formData.businessAddress}
                  onChange={(e) => setFormData(f => ({ ...f, businessAddress: e.target.value }))}
                  placeholder="123 Main St, Suite 100, Austin, TX 78701"
                  data-testid="input-business-address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessHours">Hours of Operation</Label>
                <Input
                  id="businessHours"
                  value={formData.businessHours}
                  onChange={(e) => setFormData(f => ({ ...f, businessHours: e.target.value }))}
                  placeholder="Mon–Fri: 8AM–6PM · Sat: 9AM–3PM"
                  data-testid="input-business-hours"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessDescription">Business Description</Label>
                <Textarea
                  id="businessDescription"
                  value={formData.businessDescription}
                  onChange={(e) => setFormData(f => ({ ...f, businessDescription: e.target.value }))}
                  placeholder="A short tagline or description of your business"
                  rows={2}
                  data-testid="input-business-description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessServices">Services (one per line)</Label>
                <Textarea
                  id="businessServices"
                  value={formData.businessServices}
                  onChange={(e) => setFormData(f => ({ ...f, businessServices: e.target.value }))}
                  placeholder={"AC Repair\nFurnace Installation\nDuct Cleaning"}
                  rows={4}
                  data-testid="input-business-services"
                />
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-geo-scope">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Geographic Scope
                  </CardTitle>
                  <CardDescription>How your search rankings are evaluated</CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setPendingGeoScope(geoScope);
                    setGeoScopeModalOpen(true);
                  }}
                  data-testid="button-edit-geo-scope"
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!geoScope.scope || geoScope.scope === 'national' ? (
                geoScope.scope === 'national' ? (
                  <div className="flex items-center gap-3 p-4 bg-muted rounded-lg border border-border">
                    <Globe className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">National</p>
                      <p className="text-sm text-muted-foreground">Keyword rankings evaluated nationally</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-gold-soft rounded-lg border border-warning">
                    <AlertTriangle className="w-5 h-5 text-gold" />
                    <div>
                      <p className="font-medium text-foreground">Not configured</p>
                      <p className="text-sm text-gold">Configure geographic scope to enable SERP analysis</p>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-3 p-4 bg-brand-soft rounded-lg border border-primary">
                  <MapPin className="w-5 h-5 text-brand" />
                  <div>
                    <p className="font-medium text-foreground">Local</p>
                    <p className="text-sm text-brand">
                      {[geoScope.city, geoScope.state, geoScope.country].filter(Boolean).join(', ')}
                    </p>
                  </div>
                </div>
              )}
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
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="ga4PropertyId">GA4 Property ID</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href="https://analytics.google.com/analytics/web/#/a/property/settings"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <HelpCircle className="h-3.5 w-3.5" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p>Find this in Google Analytics → Admin → Property Settings. It's the numeric ID shown at the top (e.g. 123456789).</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="ga4PropertyId"
                    value={formData.ga4PropertyId}
                    onChange={(e) => setFormData(f => ({ ...f, ga4PropertyId: e.target.value }))}
                    placeholder="123456789"
                    data-testid="input-ga4-property-id"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="gscProperty">Search Console Property</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href="https://search.google.com/search-console"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <HelpCircle className="h-3.5 w-3.5" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p>Your verified property URL from Google Search Console. Use "sc-domain:example.com" for domain properties or "https://example.com/" for URL-prefix properties.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="gscProperty"
                    value={formData.gscProperty}
                    onChange={(e) => setFormData(f => ({ ...f, gscProperty: e.target.value }))}
                    placeholder="sc-domain:example.com"
                    data-testid="input-gsc-property"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Label htmlFor="adsCustomerId">Google Ads Customer ID</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <a
                            href="https://ads.google.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <HelpCircle className="h-3.5 w-3.5" />
                          </a>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p>Found at the top of your Google Ads account, formatted as XXX-XXX-XXXX.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
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

      <Dialog open={geoScopeModalOpen} onOpenChange={setGeoScopeModalOpen}>
        <DialogContent className="sm:max-w-lg" data-testid="modal-geo-scope">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Edit Geographic Scope
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <GeoScopeSelector
              value={pendingGeoScope}
              onChange={setPendingGeoScope}
            />
            {geoScopeError && (
              <div className="flex items-center gap-2 p-3 bg-danger-soft rounded-lg border border-danger text-danger" data-testid="geo-scope-error">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <p className="text-sm">{geoScopeError}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setGeoScopeModalOpen(false)}
              data-testid="button-cancel-geo-scope"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={!!geoScopeError}
              onClick={() => {
                if (geoScopeError) {
                  toast({ title: "Validation Error", description: geoScopeError, variant: "destructive" });
                  return;
                }
                setGeoScope(pendingGeoScope);
                setGeoScopeModalOpen(false);
                toast({ title: "Geographic scope updated", description: "Don't forget to save the site to persist changes." });
              }}
              data-testid="button-save-geo-scope"
            >
              <Save className="w-4 h-4 mr-2" />
              Apply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
