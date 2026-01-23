import { useState, useEffect, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { MarketingCard } from "@/components/marketing/MarketingCard";
import { BrandButton } from "@/components/marketing/BrandButton";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  RefreshCw,
  ExternalLink,
  Share2,
  Copy,
  Check,
  FileSearch,
  Sparkles
} from "lucide-react";

type GenerationStep = "creating_pages" | "writing_seo" | "generating_assets" | "publishing";
type SiteStatus = "generating" | "ready" | "failed";

interface SiteStatusResponse {
  status: SiteStatus;
  step?: GenerationStep;
  previewUrl?: string;
  error?: string;
  businessName?: string;
}

const GENERATION_STEPS: { key: GenerationStep; label: string }[] = [
  { key: "creating_pages", label: "Creating your pages" },
  { key: "writing_seo", label: "Writing SEO-optimized copy" },
  { key: "generating_assets", label: "Generating visual assets" },
  { key: "publishing", label: "Publishing your site" },
];

function GenerationStepItem({ 
  step, 
  current, 
  label 
}: { 
  step: GenerationStep; 
  current: GenerationStep; 
  label: string;
}) {
  const stepOrder = GENERATION_STEPS.map(s => s.key);
  const currentIndex = stepOrder.indexOf(current);
  const stepIndex = stepOrder.indexOf(step);
  
  const isCompleted = stepIndex < currentIndex;
  const isCurrent = step === current;
  
  return (
    <div className="flex items-center gap-3">
      {isCompleted ? (
        <CheckCircle2 className="h-5 w-5 text-semantic-success flex-shrink-0" />
      ) : isCurrent ? (
        <Loader2 className="h-5 w-5 text-primary animate-spin flex-shrink-0" />
      ) : (
        <div className="h-5 w-5 rounded-full border-2 border-border flex-shrink-0" />
      )}
      <span className={`text-sm ${isCurrent ? "text-foreground font-medium" : isCompleted ? "text-semantic-success" : "text-muted-foreground"}`}>
        {label}
      </span>
    </div>
  );
}

export default function SitePreview() {
  const [, navigate] = useLocation();
  const [matched, params] = useRoute("/preview/:siteId");
  const siteId = params?.siteId || "";
  
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<SiteStatus>("generating");
  const [currentStep, setCurrentStep] = useState<GenerationStep>("creating_pages");
  const [previewUrl, setPreviewUrl] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    setToken(urlParams.get("token") || "");
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!siteId) return;
    
    try {
      const url = token 
        ? `/api/sites/${siteId}/status?token=${token}` 
        : `/api/sites/${siteId}/status`;
      
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error("Failed to fetch status");
      }
      
      const data: SiteStatusResponse = await res.json();
      
      setStatus(data.status);
      if (data.step) setCurrentStep(data.step);
      if (data.previewUrl) setPreviewUrl(data.previewUrl);
      if (data.businessName) setBusinessName(data.businessName);
      if (data.error) setError(data.error);
      
    } catch (err) {
      console.error("Error fetching site status:", err);
    }
  }, [siteId, token]);

  useEffect(() => {
    if (!siteId) return;
    
    fetchStatus();
    
    if (status === "generating") {
      const interval = setInterval(fetchStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [siteId, status, fetchStatus]);

  const handleRetry = async () => {
    setStatus("generating");
    setCurrentStep("creating_pages");
    setError("");
    
    try {
      const res = await fetch(`/api/sites/${siteId}/retry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to retry");
      }
      
      fetchStatus();
    } catch (err) {
      setError("Failed to retry. Please try again.");
      setStatus("failed");
    }
  };

  const handleCopyLink = async () => {
    if (!previewUrl) return;
    
    try {
      await navigator.clipboard.writeText(previewUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleShare = async () => {
    if (!previewUrl) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: businessName || "My New Website",
          text: "Check out my new website!",
          url: previewUrl,
        });
      } catch (err) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  if (!matched || !siteId) {
    return (
      <MarketingLayout>
        <div className="container mx-auto px-4 md:px-6 py-16 md:py-24">
          <div className="max-w-lg mx-auto text-center">
            <MarketingCard hover={false}>
              <XCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-foreground mb-2">Site Not Found</h2>
              <p className="text-muted-foreground mb-6">
                The site you're looking for doesn't exist or the link is invalid.
              </p>
              <BrandButton 
                variant="primary" 
                onClick={() => navigate("/tools/website-generator")}
                data-testid="button-create-new"
              >
                Create a New Site
              </BrandButton>
            </MarketingCard>
          </div>
        </div>
      </MarketingLayout>
    );
  }

  if (status === "generating") {
    return (
      <MarketingLayout>
        <div className="container mx-auto px-4 md:px-6 py-16 md:py-24">
          <div className="max-w-lg mx-auto">
            <MarketingCard className="text-center py-12" hover={false}>
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary via-pink-500 to-gold flex items-center justify-center mx-auto mb-6 animate-pulse">
                <Loader2 className="h-10 w-10 text-white animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2" data-testid="text-generating-title">
                {businessName ? `Building ${businessName}...` : "Generating your website..."}
              </h2>
              <p className="text-muted-foreground mb-8">This usually takes about a minute.</p>

              <div className="space-y-4 text-left max-w-xs mx-auto">
                {GENERATION_STEPS.map((step) => (
                  <GenerationStepItem 
                    key={step.key}
                    step={step.key} 
                    current={currentStep} 
                    label={step.label} 
                  />
                ))}
              </div>
            </MarketingCard>
          </div>
        </div>
      </MarketingLayout>
    );
  }

  if (status === "failed") {
    return (
      <MarketingLayout>
        <div className="container mx-auto px-4 md:px-6 py-16 md:py-24">
          <div className="max-w-lg mx-auto">
            <MarketingCard className="text-center py-12" hover={false}>
              <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                <XCircle className="h-10 w-10 text-destructive" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2" data-testid="text-failed-title">
                Something went wrong
              </h2>
              <p className="text-muted-foreground mb-6">
                {error || "We couldn't generate your website. Please try again."}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <BrandButton 
                  variant="primary" 
                  icon={RefreshCw}
                  onClick={handleRetry}
                  data-testid="button-retry"
                >
                  Try Again
                </BrandButton>
                <BrandButton 
                  variant="secondary" 
                  onClick={() => navigate("/tools/website-generator")}
                  data-testid="button-start-over"
                >
                  Start Over
                </BrandButton>
              </div>
            </MarketingCard>
          </div>
        </div>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      <div className="flex flex-col min-h-[calc(100vh-64px)]">
        <div className="bg-card border-b border-border py-4 px-4 md:px-6">
          <div className="container mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="h-5 w-5 text-semantic-success" />
                <span className="text-sm font-medium text-semantic-success" data-testid="text-ready-badge">Your site is ready!</span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground" data-testid="text-site-title">
                {businessName || "Your New Website"}
              </h1>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="gap-2"
                data-testid="button-copy-link"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy Link"}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="gap-2"
                data-testid="button-share"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(previewUrl, "_blank")}
                className="gap-2"
                data-testid="button-open-new-tab"
              >
                <ExternalLink className="h-4 w-4" />
                Open in New Tab
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-muted">
          {previewUrl ? (
            <iframe
              src={previewUrl}
              className="w-full h-full min-h-[600px] border-0"
              title="Site Preview"
              data-testid="iframe-preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full min-h-[600px]">
              <div className="text-center">
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mx-auto mb-3" />
                <p className="text-muted-foreground">Loading preview...</p>
              </div>
            </div>
          )}
        </div>

        <div className="bg-card border-t border-border py-6 px-4 md:px-6">
          <div className="container mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Love your new site?
                </h3>
                <p className="text-muted-foreground text-sm">
                  Claim it now to get your own domain and start ranking on Google.
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <BrandButton 
                  variant="secondary"
                  icon={FileSearch}
                  onClick={() => navigate(`/scan?url=${encodeURIComponent(previewUrl)}`)}
                  data-testid="button-seo-action-plan"
                >
                  Get SEO Action Plan
                </BrandButton>
                
                <BrandButton 
                  variant="primary"
                  icon={Sparkles}
                  onClick={() => navigate(`/claim/${siteId}?token=${token}`)}
                  data-testid="button-claim-site"
                >
                  Claim Your Site
                </BrandButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
