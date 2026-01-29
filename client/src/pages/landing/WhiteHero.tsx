import React, { useState } from "react";
import { useLocation } from "wouter";
import { Building2, CalendarX, ClipboardList, Loader2, Sparkles } from "lucide-react";

/**
 * White Hero (high-contrast) — matches the approved "clean white" mock.
 * - Clean white surface
 * - Subtle cosmic glow in the background
 * - Reduced copy (no redundant paragraph)
 * - Clear primary vs secondary CTAs
 */

const TRUST_PILLS = [
  { icon: Building2, text: "Built for your business" },
  { icon: CalendarX, text: "Cancel anytime" },
  { icon: ClipboardList, text: "Changes tracked" },
  { icon: Sparkles, text: "Best practices, automated" },
];

export default function WhiteHero() {
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
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="arclo-hero-wrap">
      <div className="arclo-hero-glow" />

      <div className="arclo-hero-container">
        <header className="arclo-nav">
          <div className="arclo-nav-left">
            <a className="arclo-logo" href="/">
              {/* Swap this SVG for your real logo component if you already have one */}
              <svg width="28" height="28" viewBox="0 0 48 48" aria-hidden="true">
                <defs>
                  <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
                    <stop offset="0" stopColor="#7c3aed" />
                    <stop offset="0.55" stopColor="#ec4899" />
                    <stop offset="1" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>
                <path d="M24 4l19 36h-8l-3.2-6.2H16.2L13 40H5L24 4zm-4.8 23h9.6L24 17.7 19.2 27z" fill="url(#g)" />
              </svg>
              <span>Arclo</span>
            </a>
          </div>

          <nav className="arclo-nav-center" aria-label="Primary navigation">
            <a href="/examples">Examples</a>
            <a href="/how-it-works">How It Works</a>
            <a href="/pricing">Pricing</a>
            <a href="/login">Log In</a>
          </nav>

          <div className="arclo-nav-right">
            <a className="arclo-btn arclo-btn-secondary" href="/generate">
              Generate My Site
            </a>
            <a className="arclo-btn arclo-btn-primary" href="#analyze">
              Analyze My Website
            </a>
          </div>
        </header>

        <main className="arclo-hero">
          <h1 className="arclo-h1">
            Autonomous SEO that <br />
            grows <span className="emph">traffic</span> — without guesswork.
          </h1>

          <div className="arclo-sub">Weekly fixes you can approve, apply, and track.</div>

          <div className="arclo-steps" aria-label="How it works steps">
            <div className="step">
              <span className="bullet green" />
              <span>Scan your site</span>
            </div>
            <span className="arrow">→</span>
            <div className="step">
              <span className="bullet purple" />
              <span>Identify what’s holding rankings back</span>
            </div>
            <span className="arrow">→</span>
            <div className="step">
              <span className="bullet orange" />
              <span>Apply fixes week-by-week</span>
            </div>
          </div>

          <form id="analyze" className="arclo-cta" onSubmit={handleSubmit}>
            <input
              className="arclo-input"
              placeholder="Enter your website (example.com)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              aria-label="Website URL"
            />
            <button
              className="arclo-btn arclo-btn-primary arclo-primary-cta"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="arclo-spinner" size={16} />
                  Analyzing…
                </>
              ) : (
                "Analyze My Website"
              )}
            </button>
          </form>

          {error && <div className="arclo-error">{error}</div>}

          <div className="arclo-micro">Free scan • No credit card • Takes ~60 seconds</div>

          <button className="arclo-btn arclo-secondary-cta">Generate a Free Website</button>

          <div className="arclo-pill-row" aria-label="Trust factors">
            {TRUST_PILLS.map((pill) => (
              <div key={pill.text} className="arclo-trust-pill">
                <span className="arclo-trust-icon">
                  <pill.icon size={14} strokeWidth={2.5} />
                </span>
                <span>{pill.text}</span>
              </div>
            ))}
          </div>

          <div className="arclo-hairline" />
        </main>
      </div>
    </div>
  );
}
