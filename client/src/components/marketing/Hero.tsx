import React from "react";
import { Button } from "@/components/ui/button";

/**
 * Marketing Hero — high contrast, matches arclo.pro.
 * This avoids washed-out text by using solid text tokens and controlled opacity ONLY on decorative halos.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden bg-surface-primary">
      {/* Decorative halos (safe opacity) */}
      <div aria-hidden className="pointer-events-none absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand-gradient opacity-15 blur-3xl" />
      <div aria-hidden className="pointer-events-none absolute -right-40 -bottom-40 h-[520px] w-[520px] rounded-full bg-brand-gradient opacity-15 blur-3xl" />

      <div className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto max-w-3xl text-center">
          {/* Eyebrow */}
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-surface-soft px-4 py-2 text-sm font-medium text-text-primary ring-1 ring-surface-border">
            <span className="h-2 w-2 rounded-full bg-brand-gradient" />
            Autonomous SEO, done safely
          </div>

          {/* Title */}
          <h1 className="text-5xl font-semibold tracking-tight text-text-primary">
            Autonomous SEO for{" "}
            <span className="bg-brand-gradient bg-clip-text text-transparent">
              local businesses.
            </span>
          </h1>

          {/* Subtitle — MUST remain readable */}
          <p className="mt-6 text-lg leading-7 text-text-secondary">
            Recover lost traffic. Turn audits into fixes. Stop guessing what’s broken — Arclo diagnoses your site and deploys real improvements automatically.
          </p>

          {/* Steps */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-text-secondary">
            <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-brand-green" /> Scan your site</span>
            <span className="text-text-secondary">→</span>
            <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-brand-purple" /> Identify what’s holding it back</span>
            <span className="text-text-secondary">→</span>
            <span className="inline-flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-brand-orange" /> Fix issues automatically</span>
          </div>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <div className="flex w-full max-w-xl items-center gap-3">
              <input
                className="h-12 w-full rounded-2xl border border-surface-border bg-surface-primary px-4 text-sm text-text-primary shadow-sm placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand-pink/40"
                placeholder="Enter your website (example.com)"
              />
              <Button
                variant="primary"
                size="lg"
                className="h-12 whitespace-nowrap"
                style={{
                  background: "linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B)",
                  color: "#FFFFFF"
                }}
              >
                Analyze My Website
              </Button>
            </div>
          </div>

          <p className="mt-3 text-sm text-text-secondary">No credit card required.</p>

          {/* Secondary CTA (fix invisibility) */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button variant="secondary" size="lg">
              No site? Generate a free one →
            </Button>
            <a className="text-sm font-medium text-text-primary hover:text-text-secondary" href="/examples">
              See examples
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
