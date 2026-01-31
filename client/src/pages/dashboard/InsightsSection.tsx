import { useInsights, type DashboardTip, type TipCategory, type TipSentiment } from "@/hooks/useOpsDashboard";
import { GlassCard, GlassCardContent } from "@/components/ui/GlassCard";
import {
  TrendingUp,
  TrendingDown,
  Lightbulb,
  FileText,
  Settings,
  Trophy,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useLocation } from "wouter";

// ── Category badge styles ────────────────────────────────────

const CATEGORY_STYLES: Record<TipCategory, { label: string; color: string; bg: string }> = {
  rankings:  { label: "Rankings",  color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
  traffic:   { label: "Traffic",   color: "#ec4899", bg: "rgba(236,72,153,0.08)" },
  content:   { label: "Content",   color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
  technical: { label: "Technical", color: "#ef4444", bg: "rgba(239,68,68,0.08)" },
  system:    { label: "Setup",     color: "#3b82f6", bg: "rgba(59,130,246,0.08)" },
  win:       { label: "Win",       color: "#22c55e", bg: "rgba(34,197,94,0.08)" },
};

// ── Sentiment → icon mapping ─────────────────────────────────

const SENTIMENT_ICONS: Record<TipSentiment, LucideIcon> = {
  positive: Trophy,
  neutral: Lightbulb,
  action: AlertTriangle,
};

const SENTIMENT_COLORS: Record<TipSentiment, string> = {
  positive: "#22c55e",
  neutral: "#3b82f6",
  action: "#f59e0b",
};

// ── Individual tip card ──────────────────────────────────────

function InsightCard({ tip }: { tip: DashboardTip }) {
  const [, navigate] = useLocation();
  const badge = CATEGORY_STYLES[tip.category];
  const Icon = SENTIMENT_ICONS[tip.sentiment];
  const iconColor = SENTIMENT_COLORS[tip.sentiment];

  return (
    <GlassCard variant="marketing" hover>
      <GlassCardContent className="p-5">
        {/* Badge + icon row */}
        <div className="flex items-start justify-between mb-3">
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: badge.color, background: badge.bg }}
          >
            {badge.label}
          </span>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: `${iconColor}14`, border: `1px solid ${iconColor}20` }}
          >
            <Icon className="w-4 h-4" style={{ color: iconColor }} />
          </div>
        </div>

        {/* Title + body */}
        <h4
          className="text-sm font-semibold mb-1"
          style={{ color: "#0F172A", letterSpacing: "-0.01em" }}
        >
          {tip.title}
        </h4>
        <p className="text-[13px] leading-relaxed" style={{ color: "#64748B" }}>
          {tip.body}
        </p>

        {/* Optional action */}
        {tip.actionLabel && tip.actionRoute && (
          <button
            onClick={() => navigate(tip.actionRoute!)}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors hover:bg-purple-50"
            style={{ color: "#7c3aed", border: "1px solid rgba(124, 58, 237, 0.2)" }}
          >
            {tip.actionLabel}
            <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </GlassCardContent>
    </GlassCard>
  );
}

// ── Section ──────────────────────────────────────────────────

interface InsightsSectionProps {
  siteId: string;
}

export function InsightsSection({ siteId }: InsightsSectionProps) {
  const { data, isLoading } = useInsights(siteId);

  if (isLoading || !data || data.tips.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: "#94A3B8" }}
      >
        Insights
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {data.tips.map((tip) => (
          <InsightCard key={tip.id} tip={tip} />
        ))}
      </div>
    </div>
  );
}
