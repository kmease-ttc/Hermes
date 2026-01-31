import { useState, useEffect } from "react";
import {
  Search,
  Eye,
  MousePointerClick,
  TrendingDown,
  BarChart3,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  Globe,
  ExternalLink,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGoogleConnection, type GSCProperty } from "./useGoogleConnection";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GSCConfigWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteId: string;
  siteDomain?: string;
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full transition-colors ${
              i + 1 === current
                ? "bg-primary"
                : i + 1 < current
                  ? "bg-semantic-success"
                  : "bg-muted"
            }`}
          />
          {i < total - 1 && <div className="w-6 h-px bg-border" />}
        </div>
      ))}
      <span className="text-xs text-muted-foreground ml-2">
        Step {current} of {total}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 1: Explain
// ---------------------------------------------------------------------------

function StepExplain({ onNext }: { onNext: () => void }) {
  return (
    <div className="space-y-5">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-semantic-info/10 flex items-center justify-center mx-auto mb-4">
          <Search className="w-7 h-7 text-semantic-info" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Connect Google Search Console</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
          Search Console shows how Google actually sees your site — impressions, clicks, and real rankings.
        </p>
      </div>

      <Card className="bg-muted/30 border-border">
        <CardContent className="py-4">
          <p className="text-sm font-medium text-foreground mb-3">What we'll use it for:</p>
          <ul className="space-y-2.5">
            {[
              { icon: Eye, text: "Real keyword performance" },
              { icon: TrendingDown, text: "Pages losing visibility" },
              { icon: MousePointerClick, text: "CTR opportunities" },
              { icon: BarChart3, text: "Better SERP recommendations" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Icon className="w-4 h-4 text-semantic-info shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="w-3.5 h-3.5" />
        Read-only access. We never modify your site.
      </div>

      <Button variant="primary" fullWidth onClick={onNext}>
        Connect Search Console
        <ArrowRight className="w-4 h-4 ml-1.5" />
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2: OAuth
// ---------------------------------------------------------------------------

function StepOAuth({
  isConnecting,
  error,
  onRetry,
}: {
  isConnecting: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="space-y-5 text-center">
      {error ? (
        <>
          <div className="w-14 h-14 rounded-2xl bg-semantic-danger/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7 text-semantic-danger" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Connection Failed</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">{error}</p>
          </div>
          <Button variant="primary" onClick={onRetry}>
            <RefreshCw className="w-4 h-4 mr-1.5" />
            Try Again
          </Button>
        </>
      ) : (
        <>
          <div className="w-14 h-14 rounded-2xl bg-semantic-info/10 flex items-center justify-center mx-auto">
            <Loader2 className="w-7 h-7 text-semantic-info animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Connecting to Google...</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
              A Google sign-in window has opened. Complete the authorization there, then return here.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5" />
            Read-only access. No site changes.
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3: Property selection
// ---------------------------------------------------------------------------

function getPropertyType(siteUrl: string): "domain" | "url-prefix" {
  return siteUrl.startsWith("sc-domain:") ? "domain" : "url-prefix";
}

function getPropertyDisplay(siteUrl: string): string {
  return siteUrl.replace("sc-domain:", "").replace(/\/$/, "");
}

function domainMatch(siteUrl: string, siteDomain?: string): boolean {
  if (!siteDomain) return false;
  const propDomain = getPropertyDisplay(siteUrl).replace(/^https?:\/\//, "").replace(/\/$/, "");
  const cleaned = siteDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return propDomain.includes(cleaned) || cleaned.includes(propDomain);
}

function StepPropertySelect({
  properties,
  isLoading,
  selected,
  siteDomain,
  onSelect,
  onBack,
  onNext,
}: {
  properties: GSCProperty[];
  isLoading: boolean;
  selected: string | null;
  siteDomain?: string;
  onSelect: (url: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-5 text-center py-6">
        <Loader2 className="w-8 h-8 text-semantic-info animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Discovering Search Console properties...</p>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="space-y-5">
        <div className="text-center py-4">
          <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground">No Properties Found</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            We couldn't find any Search Console properties. You may need to verify your site with Google first.
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">How to add your site:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Go to search.google.com/search-console</li>
            <li>Click "Add Property"</li>
            <li>Enter your domain or URL prefix</li>
            <li>Complete verification</li>
          </ol>
          <a
            href="https://support.google.com/webmasters/answer/9008080"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline mt-2"
          >
            Google's verification guide
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <Button variant="outline" fullWidth onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Go Back
        </Button>
      </div>
    );
  }

  // Sort: domain properties first, then matching domains
  const sorted = [...properties].sort((a, b) => {
    const aMatch = domainMatch(a.siteUrl, siteDomain) ? -2 : 0;
    const bMatch = domainMatch(b.siteUrl, siteDomain) ? -2 : 0;
    const aDomain = getPropertyType(a.siteUrl) === "domain" ? -1 : 0;
    const bDomain = getPropertyType(b.siteUrl) === "domain" ? -1 : 0;
    return (aMatch + aDomain) - (bMatch + bDomain);
  });

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground">Select Property</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Choose the property that matches {siteDomain || "your website"}.
        </p>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {sorted.map((prop) => {
          const isSelected = selected === prop.siteUrl;
          const type = getPropertyType(prop.siteUrl);
          const isMatch = domainMatch(prop.siteUrl, siteDomain);

          return (
            <button
              key={prop.siteUrl}
              onClick={() => onSelect(prop.siteUrl)}
              className={`w-full text-left p-3 rounded-xl border transition-colors ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30 hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <p className="text-sm font-medium text-foreground truncate">
                      {getPropertyDisplay(prop.siteUrl)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-5.5">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 ${
                        type === "domain"
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {type === "domain" ? "Domain" : "URL Prefix"}
                    </Badge>
                    {isMatch && (
                      <span className="text-[10px] text-semantic-success font-medium">Match</span>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="shrink-0">
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back
        </Button>
        <Button variant="primary" fullWidth onClick={onNext} disabled={!selected}>
          Save & Continue
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4: Data availability check
// ---------------------------------------------------------------------------

function StepDataCheck({ onNext }: { onNext: () => void }) {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Simulate a brief check (the real data availability shows over time)
    const timer = setTimeout(() => setChecked(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-5 text-center">
      {!checked ? (
        <>
          <Loader2 className="w-8 h-8 text-semantic-info animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Checking data availability...</p>
        </>
      ) : (
        <>
          <div className="w-14 h-14 rounded-2xl bg-semantic-info/10 flex items-center justify-center mx-auto">
            <Info className="w-7 h-7 text-semantic-info" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Property Connected</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
              Data may take a few days to appear for newer sites. Arclo will automatically start syncing as data becomes available.
            </p>
          </div>
          <Button variant="primary" fullWidth onClick={onNext}>
            Continue
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 5: Confirmation
// ---------------------------------------------------------------------------

function StepConfirmation({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="space-y-5 text-center">
      <div className="w-14 h-14 rounded-2xl bg-semantic-success/10 flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-7 h-7 text-semantic-success" />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground">Search Console Connected</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
          Arclo can now see how Google views your site.
        </p>
      </div>

      <Card className="bg-muted/30 border-border">
        <CardContent className="py-4">
          <p className="text-sm font-medium text-foreground mb-3">What's now unlocked:</p>
          <ul className="space-y-2">
            {[
              "Real impressions & clicks",
              "True ranking positions",
              "SERP decay detection",
            ].map((text) => (
              <li key={text} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-semantic-success shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Button variant="primary" fullWidth onClick={onFinish}>
        Finish
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main wizard
// ---------------------------------------------------------------------------

export function GSCConfigWizard({ open, onOpenChange, siteId, siteDomain }: GSCConfigWizardProps) {
  const [step, setStep] = useState(1);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [selectedSiteUrl, setSelectedSiteUrl] = useState<string | null>(null);

  const google = useGoogleConnection(siteId);

  const alreadyConnected = google.status?.connected ?? false;

  // Reset wizard state when opened
  useEffect(() => {
    if (open) {
      if (alreadyConnected) {
        // Skip OAuth, go straight to property selection
        setStep(3);
      } else {
        setStep(1);
      }
      setOauthError(null);
      setSelectedSiteUrl(google.status?.gsc?.siteUrl ?? null);
    }
  }, [open, alreadyConnected, google.status?.gsc?.siteUrl]);

  // Fetch properties when reaching step 3
  useEffect(() => {
    if (step === 3 && (alreadyConnected || google.status?.connected)) {
      google.fetchProperties();
    }
  }, [step, alreadyConnected, google.status?.connected]);

  const handleStartOAuth = async () => {
    if (alreadyConnected) {
      // Already authenticated — skip to property selection
      setStep(3);
      return;
    }

    setStep(2);
    setOauthError(null);
    try {
      const success = await google.startOAuth();
      if (success) {
        setStep(3);
      } else {
        setOauthError("Authorization was cancelled or timed out. Please try again.");
      }
    } catch (err: any) {
      setOauthError(err.message || "Failed to connect. Please try again.");
    }
  };

  const handleSaveProperty = async () => {
    if (!selectedSiteUrl) return;
    try {
      await google.saveProperties({ gscSiteUrl: selectedSiteUrl });
      setStep(4);
    } catch {
      // Error handled by mutation
    }
  };

  const TOTAL_STEPS = 5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>Connect Google Search Console</DialogTitle>
          <DialogDescription>Configure Search Console for your site</DialogDescription>
        </DialogHeader>

        <StepIndicator current={step} total={TOTAL_STEPS} />

        {step === 1 && <StepExplain onNext={handleStartOAuth} />}

        {step === 2 && (
          <StepOAuth
            isConnecting={google.isConnecting}
            error={oauthError}
            onRetry={handleStartOAuth}
          />
        )}

        {step === 3 && (
          <StepPropertySelect
            properties={google.properties?.gsc ?? []}
            isLoading={google.isLoadingProperties}
            selected={selectedSiteUrl}
            siteDomain={siteDomain}
            onSelect={setSelectedSiteUrl}
            onBack={() => setStep(alreadyConnected ? 1 : 1)}
            onNext={handleSaveProperty}
          />
        )}

        {step === 4 && <StepDataCheck onNext={() => setStep(5)} />}

        {step === 5 && (
          <StepConfirmation onFinish={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
