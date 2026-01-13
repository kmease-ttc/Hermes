import { useState } from "react";
import { useLocation, Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { BrandButton } from "@/components/marketing/BrandButton";
import { ROUTES } from "@shared/routes";

export function LandingHero() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [, navigate] = useLocation();

  const normalizeUrl = (input: string): string => {
    let normalized = input.trim().toLowerCase();
    if (!normalized) return "";
    if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
      normalized = "https://" + normalized;
    }
    return normalized;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl || !normalizedUrl.includes(".")) {
      setError("Please enter a valid website.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to start scan");
      }
      
      const data = await res.json();
      navigate(`/scan/preview/${data.scanId || data.id}`);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <section className="px-5 md:px-6 pt-12 pb-8 md:pt-20 md:pb-16">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-slate-950 tracking-tight mb-4 leading-tight">
          Autonomous SEO for <span className="marketing-gradient-text">local businesses.</span>
        </h1>
        <p className="text-base md:text-lg text-slate-600 mb-6 max-w-lg mx-auto">
          Recover lost traffic. Turn audits into fixes. Stop guessing what's broken — Arclo diagnoses your site and deploys real improvements automatically.
        </p>
        
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500 mb-8">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Scan your site
          </span>
          <span className="text-slate-300">→</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
            Identify what's holding it back
          </span>
          <span className="text-slate-300">→</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Fix issues automatically
          </span>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3 max-w-xl mx-auto mb-3">
          <Input
            type="text"
            placeholder="Enter your website (example.com)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-12 md:h-14 text-base flex-1"
            aria-label="Website URL"
            data-testid="input-url"
          />
          <BrandButton 
            variant="primary"
            size="lg"
            type="submit"
            disabled={loading}
            data-testid="button-scan"
            className="whitespace-nowrap"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing…
              </>
            ) : (
              "Analyze My Website"
            )}
          </BrandButton>
        </form>
        
        {error && (
          <p className="text-sm text-red-600 mb-3" data-testid="text-error">{error}</p>
        )}
        
        <p className="text-sm text-slate-500 mb-2">
          No credit card required.
        </p>
        <p className="text-xs text-slate-400 mb-4">
          Powered by live crawl, performance, and ranking signals — not guesses.
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href={ROUTES.WEBSITE_GENERATOR}>
            <BrandButton 
              variant="accent"
              size="md"
              data-testid="link-generate-site"
            >
              No site? Generate a free one →
            </BrandButton>
          </Link>
          <Link 
            href={ROUTES.EXAMPLES}
            className="text-sm text-slate-600 hover:text-violet-600 underline-offset-2 hover:underline transition-colors"
            data-testid="link-see-examples"
          >
            See examples
          </Link>
        </div>
      </div>
    </section>
  );
}
