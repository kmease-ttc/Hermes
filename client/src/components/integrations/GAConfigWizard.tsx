import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Target,
  Zap,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
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
import { useGoogleConnection, type GA4Property } from "./useGoogleConnection";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface GAConfigWizardProps {
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
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <BarChart3 className="w-7 h-7 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">Connect Google Analytics</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
          Google Analytics lets Arclo see which pages bring real visitors and which ones convert — not just rankings.
        </p>
      </div>

      <Card className="bg-muted/30 border-border">
        <CardContent className="py-4">
          <p className="text-sm font-medium text-foreground mb-3">What we'll use it for:</p>
          <ul className="space-y-2.5">
            {[
              { icon: TrendingUp, text: "Traffic trends" },
              { icon: Target, text: "Top landing pages" },
              { icon: Zap, text: "Conversion signals (if available)" },
              { icon: BarChart3, text: "Smarter prioritization" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Icon className="w-4 h-4 text-primary shrink-0" />
                {text}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="w-3.5 h-3.5" />
        Read-only access. We never modify your data.
      </div>

      <Button variant="primary" fullWidth onClick={onNext}>
        Connect Google Analytics
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
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Connecting to Google...</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
              A Google sign-in window has opened. Complete the authorization there, then return here.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5" />
            Read-only access. No data modification.
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3: Property selection
// ---------------------------------------------------------------------------

function StepPropertySelect({
  properties,
  isLoading,
  selected,
  siteDomain,
  onSelect,
  onBack,
  onNext,
}: {
  properties: GA4Property[];
  isLoading: boolean;
  selected: string | null;
  siteDomain?: string;
  onSelect: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  if (isLoading) {
    return (
      <div className="space-y-5 text-center py-6">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Discovering GA4 properties...</p>
      </div>
    );
  }

  if (properties.length === 0) {
    return (
      <div className="space-y-5">
        <div className="text-center py-4">
          <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-foreground">No GA4 Properties Found</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
            We couldn't find any Google Analytics 4 properties in your account.
            Make sure you have a GA4 property set up (not Universal Analytics).
          </p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground space-y-2">
          <p className="font-medium text-foreground">How to create a GA4 property:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Go to analytics.google.com</li>
            <li>Click Admin (gear icon)</li>
            <li>Click "Create Property"</li>
            <li>Follow the setup wizard</li>
          </ol>
        </div>
        <Button variant="outline" fullWidth onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Go Back
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground">Select GA4 Property</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Choose the property that tracks {siteDomain || "your website"}.
        </p>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto">
        {properties.map((prop) => {
          const isSelected = selected === prop.propertyId;
          return (
            <button
              key={prop.propertyId}
              onClick={() => onSelect(prop.propertyId)}
              className={`w-full text-left p-3 rounded-xl border transition-colors ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30 hover:bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">{prop.displayName}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    Property ID: {prop.propertyId}
                  </p>
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
// Step 4: Confirmation
// ---------------------------------------------------------------------------

function StepConfirmation({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="space-y-5 text-center">
      <div className="w-14 h-14 rounded-2xl bg-semantic-success/10 flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-7 h-7 text-semantic-success" />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground">Google Analytics Connected</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">
          Arclo can now access your analytics data to improve recommendations.
        </p>
      </div>

      <Card className="bg-muted/30 border-border">
        <CardContent className="py-4">
          <p className="text-sm font-medium text-foreground mb-3">What's now unlocked:</p>
          <ul className="space-y-2">
            {[
              "Traffic & conversion insights",
              "Better prioritization of fixes",
              "Weekly trend monitoring",
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

export function GAConfigWizard({ open, onOpenChange, siteId, siteDomain }: GAConfigWizardProps) {
  const [step, setStep] = useState(1);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);

  const google = useGoogleConnection(siteId);

  // Reset wizard state when opened
  useEffect(() => {
    if (open) {
      // If already connected, skip to property selection
      if (google.status?.connected) {
        setStep(3);
      } else {
        setStep(1);
      }
      setOauthError(null);
      setSelectedPropertyId(google.status?.ga4?.propertyId ?? null);
    }
  }, [open, google.status?.connected, google.status?.ga4?.propertyId]);

  // Fetch properties when reaching step 3
  useEffect(() => {
    if (step === 3 && google.status?.connected) {
      google.fetchProperties();
    }
  }, [step, google.status?.connected]);

  const handleStartOAuth = async () => {
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
    if (!selectedPropertyId) return;
    try {
      await google.saveProperties({ ga4PropertyId: selectedPropertyId });
      setStep(4);
    } catch {
      // Error handled by mutation
    }
  };

  const TOTAL_STEPS = 4;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>Connect Google Analytics</DialogTitle>
          <DialogDescription>Configure Google Analytics for your site</DialogDescription>
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
            properties={google.properties?.ga4 ?? []}
            isLoading={google.isLoadingProperties}
            selected={selectedPropertyId}
            siteDomain={siteDomain}
            onSelect={setSelectedPropertyId}
            onBack={() => setStep(1)}
            onNext={handleSaveProperty}
          />
        )}

        {step === 4 && (
          <StepConfirmation onFinish={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
