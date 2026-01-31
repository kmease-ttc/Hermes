import { useState } from "react";
import { useMetricCards, useSystemState } from "@/hooks/useOpsDashboard";
import { GlassCard, GlassCardContent } from "@/components/ui/GlassCard";
import {
  BarChart3,
  Search,
  Sparkles,
  Cpu,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLocation } from "wouter";
import { useSiteContext } from "@/hooks/useSiteContext";
import { GAConfigWizard } from "@/components/integrations/GAConfigWizard";
import { GSCConfigWizard } from "@/components/integrations/GSCConfigWizard";

// ── Card type definitions ──────────────────────────────────────

type CardType = "integration" | "agent" | "upgrade";

interface SetupCardDef {
  id: string;
  type: CardType;
  icon: LucideIcon;
  color: string;
  title: string;
  body: string;
  buttonLabel: string;
  helperText: string;
  route: string;
  wizardAction?: "ga4" | "gsc";
}

// ── Static card catalogue ──────────────────────────────────────

const GA4_CARD: SetupCardDef = {
  id: "ga4",
  type: "integration",
  icon: BarChart3,
  color: "#7c3aed",
  title: "Connect Google Analytics",
  body: "Understand which pages drive real visitors and conversions—not just rankings.",
  buttonLabel: "Connect",
  helperText: "Takes about 2 minutes",
  route: "/app/settings/integrations",
  wizardAction: "ga4",
};

const GSC_CARD: SetupCardDef = {
  id: "gsc",
  type: "integration",
  icon: Search,
  color: "#ec4899",
  title: "Connect Search Console",
  body: "See exactly how Google crawls and indexes your site, plus real impression data.",
  buttonLabel: "Connect",
  helperText: "No site changes required",
  route: "/app/settings/integrations",
  wizardAction: "gsc",
};

const AI_VISIBILITY_CARD: SetupCardDef = {
  id: "ai-visibility",
  type: "upgrade",
  icon: Sparkles,
  color: "#f59e0b",
  title: "Optimize for AI Search",
  body: "Help AI assistants like ChatGPT and Gemini understand and recommend your business.",
  buttonLabel: "Enable AI Optimization",
  helperText: "Requires upgrade",
  route: "/app/settings",
};

const FULL_CRAWL_CARD: SetupCardDef = {
  id: "full-crawl",
  type: "upgrade",
  icon: Cpu,
  color: "#3b82f6",
  title: "Full Technical Crawl",
  body: "Deep-scan every page for broken links, missing tags, and speed issues that hurt rankings.",
  buttonLabel: "Upgrade",
  helperText: "Requires Pro plan",
  route: "/app/settings",
};

// ── Hook: derive visible cards from live data ──────────────────

function useSetupCards(siteId: string) {
  const metrics = useMetricCards(siteId);
  const system = useSystemState(siteId);

  const cards: SetupCardDef[] = [];

  // Integration cards — show when not connected
  if (metrics.data && !metrics.data.ga4Connected) {
    cards.push(GA4_CARD);
  }
  if (metrics.data && !metrics.data.gscConnected) {
    cards.push(GSC_CARD);
  }

  // Upgrade cards — show when feature is locked
  if (system.data) {
    const lockedIds = new Set(system.data.capabilities.locked.map((c) => c.category));
    if (lockedIds.has("ai_visibility") || lockedIds.has("ai-visibility")) {
      cards.push(AI_VISIBILITY_CARD);
    }
    if (lockedIds.has("full_crawl") || lockedIds.has("full-crawl")) {
      cards.push(FULL_CRAWL_CARD);
    }
  }

  // If system data hasn't loaded yet but we know the plan is free, show upgrade cards
  if (system.data && system.data.plan === "free") {
    if (!cards.find((c) => c.id === "ai-visibility")) {
      cards.push(AI_VISIBILITY_CARD);
    }
    if (!cards.find((c) => c.id === "full-crawl")) {
      cards.push(FULL_CRAWL_CARD);
    }
  }

  const isLoading = metrics.isLoading || system.isLoading;

  return { cards, isLoading };
}

// ── Individual setup card ──────────────────────────────────────

function SetupCard({ card, onWizardAction }: { card: SetupCardDef; onWizardAction?: (action: "ga4" | "gsc") => void }) {
  const [, navigate] = useLocation();

  const typeBadge: Record<CardType, { label: string; color: string; bg: string }> = {
    integration: { label: "Integration", color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
    agent: { label: "Agent", color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
    upgrade: { label: "Upgrade", color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
  };

  const badge = typeBadge[card.type];
  const Icon = card.icon;

  return (
    <GlassCard variant="marketing" hover>
      <GlassCardContent className="p-5">
        {/* Badge + Icon row */}
        <div className="flex items-start justify-between mb-3">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: badge.color, background: badge.bg }}
          >
            {badge.label}
          </span>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: `${card.color}14`,
              border: `1px solid ${card.color}20`,
            }}
          >
            <Icon className="w-4 h-4" style={{ color: card.color }} />
          </div>
        </div>

        {/* Title + body */}
        <h4
          className="text-sm font-semibold mb-1"
          style={{ color: "#0F172A", letterSpacing: "-0.01em" }}
        >
          {card.title}
        </h4>
        <p className="text-[13px] leading-relaxed mb-4" style={{ color: "#64748B" }}>
          {card.body}
        </p>

        {/* Action row */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              if (card.wizardAction && onWizardAction) {
                onWizardAction(card.wizardAction);
              } else {
                navigate(card.route);
              }
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5"
            style={{
              color: "#FFFFFF",
              background: card.color,
              boxShadow: `0 4px 12px ${card.color}30`,
            }}
          >
            {card.buttonLabel}
            <ArrowRight className="w-3 h-3" />
          </button>
          <span className="text-[11px]" style={{ color: "#94A3B8" }}>
            {card.helperText}
          </span>
        </div>
      </GlassCardContent>
    </GlassCard>
  );
}

// ── Section ────────────────────────────────────────────────────

interface SetupCardsSectionProps {
  siteId: string;
}

export function SetupCardsSection({ siteId }: SetupCardsSectionProps) {
  const { cards, isLoading } = useSetupCards(siteId);
  const { siteDomain } = useSiteContext();
  const [gaWizardOpen, setGaWizardOpen] = useState(false);
  const [gscWizardOpen, setGscWizardOpen] = useState(false);

  const handleWizardAction = (action: "ga4" | "gsc") => {
    if (action === "ga4") setGaWizardOpen(true);
    if (action === "gsc") setGscWizardOpen(true);
  };

  // Nothing to show — all configured
  if (!isLoading && cards.length === 0) {
    return null;
  }

  // Still loading — don't flash empty then full
  if (isLoading) {
    return null;
  }

  return (
    <>
      <div className="space-y-3">
        <p
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "#94A3B8" }}
        >
          Recommended setup
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((card) => (
            <SetupCard key={card.id} card={card} onWizardAction={handleWizardAction} />
          ))}
        </div>
      </div>

      {/* Wizard dialogs */}
      <GAConfigWizard
        open={gaWizardOpen}
        onOpenChange={setGaWizardOpen}
        siteId={siteId}
        siteDomain={siteDomain || undefined}
      />
      <GSCConfigWizard
        open={gscWizardOpen}
        onOpenChange={setGscWizardOpen}
        siteId={siteId}
        siteDomain={siteDomain || undefined}
      />
    </>
  );
}
