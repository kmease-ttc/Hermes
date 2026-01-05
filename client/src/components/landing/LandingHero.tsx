import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";

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
        <h1 className="text-4xl md:text-6xl font-bold text-foreground tracking-tight mb-4">
          SEO on Autopilot
        </h1>
        <p className="text-base md:text-lg text-muted-foreground mb-8 max-w-lg mx-auto">
          Run a free scan to see what's hurting your traffic — and what to fix first.
        </p>
        
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
          <Button 
            type="submit" 
            size="lg" 
            className="h-12 md:h-14 px-8 text-base font-semibold"
            disabled={loading}
            data-testid="button-scan"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Scanning…
              </>
            ) : (
              "Run Free Scan"
            )}
          </Button>
        </form>
        
        {error && (
          <p className="text-sm text-destructive mb-3" data-testid="text-error">{error}</p>
        )}
        
        <p className="text-sm text-muted-foreground">
          No signup required • Takes ~60 seconds
        </p>
      </div>
    </section>
  );
}
