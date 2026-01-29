import React, { useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { Building2, CalendarX, ClipboardList, Sparkles, Menu, X, Loader2 } from "lucide-react";
import { ROUTES } from "@shared/routes";
import { BrandButton } from "@/components/marketing/BrandButton";

/**
 * White Hero (high-contrast) — matches the approved "clean white" mock.
 * - Clean white surface
 * - Subtle cosmic glow in the background
 * - Reduced copy (no redundant paragraph)
 * - Clear primary vs secondary CTAs
 * - Mobile hamburger menu for small screens
 */

const TRUST_PILLS = [
  { icon: Building2, text: "Built for your business" },
  { icon: CalendarX, text: "Cancel anytime" },
  { icon: ClipboardList, text: "Changes tracked" },
  { icon: Sparkles, text: "Best practices, automated" },
];

export default function WhiteHero() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const toggleMenu = useCallback(() => setMobileMenuOpen((prev) => !prev), []);
  const [url, setUrl] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
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

    const trimmedCity = city.trim();
    const trimmedState = state.trim();
    if (!trimmedCity || !trimmedState) {
      setError("Please enter your target city and state.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: normalizedUrl,
          geoLocation: { city: trimmedCity, state: trimmedState },
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => null);
        throw new Error(errBody?.message || "Failed to start scan. Please try again.");
      }

      const data = await res.json();
      navigate(`/scan/preview/${data.scanId || data.id}`);
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="arclo-hero-wrap">
      <div className="arclo-hero-glow" />

      <div className="arclo-hero-container">
        <header className="arclo-nav">
          <div className="arclo-nav-left">
            <Link href="/" className="arclo-logo">
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
            </Link>
          </div>

          <nav className="arclo-nav-center" aria-label="Primary navigation">
            <Link href="/examples">Examples</Link>
            <Link href="/how-it-works">How It Works</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/login">Log In</Link>
          </nav>

          <div className="arclo-nav-right">
            <Link href={ROUTES.WEBSITE_GENERATOR} className="arclo-hide-mobile">
              <BrandButton variant="blue" size="sm">Generate My Site</BrandButton>
            </Link>
            <Link href={ROUTES.SCAN} className="arclo-btn arclo-btn-primary">
              Analyze My Website
            </Link>
            <button
              className="arclo-hamburger"
              onClick={toggleMenu}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Mobile slide-down menu */}
          {mobileMenuOpen && (
            <div className="arclo-mobile-menu" role="navigation" aria-label="Mobile navigation">
              <Link href="/examples" onClick={toggleMenu}>Examples</Link>
              <Link href="/how-it-works" onClick={toggleMenu}>How It Works</Link>
              <Link href="/pricing" onClick={toggleMenu}>Pricing</Link>
              <Link href="/login" onClick={toggleMenu}>Log In</Link>
              <div className="arclo-mobile-menu-cta">
                <Link href={ROUTES.WEBSITE_GENERATOR}>
                  <BrandButton variant="blue" className="w-full">Generate My Site</BrandButton>
                </Link>
                <Link href={ROUTES.SCAN} className="arclo-btn arclo-btn-primary">Analyze My Website</Link>
              </div>
            </div>
          )}
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

          <form className="arclo-cta" onSubmit={handleSubmit}>
            <input
              className="arclo-input"
              placeholder="Enter your website (example.com)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <div className="arclo-location-row">
              <input
                className="arclo-input arclo-input-half"
                placeholder="City (e.g. Austin)"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
              <input
                className="arclo-input arclo-input-half"
                placeholder="State (e.g. TX)"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="arclo-btn arclo-btn-primary arclo-primary-cta"
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

          <Link href={ROUTES.WEBSITE_GENERATOR} className="arclo-secondary-cta">
            <BrandButton variant="blue">
              <Sparkles className="w-4 h-4" />
              Generate My Site
            </BrandButton>
          </Link>

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
