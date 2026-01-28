import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSiteContext } from "@/hooks/useSiteContext";
import { useAuth } from "@/hooks/useAuth";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from "@/components/ui/GlassCard";
import { ArrowUp, ArrowDown, TrendingUp, AlertTriangle, Trophy, Target, Globe, ArrowRight, Loader2, Settings, ChevronRight, BarChart3, Search, Link2, Zap, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useLocation } from "wouter";

interface RankingItem {
  keyword: string;
  currentPosition: number;
  previousPosition: number;
  change: number;
  searchVolume: number;
  url: string;
}

interface PageToOptimize {
  url: string;
  title: string;
  keywords: number;
  avgPosition: number;
  potential: string;
}

interface TopPerformer {
  keyword: string;
  position: number;
  searchVolume: number;
  url: string;
}

interface DashboardData {
  siteId: string;
  domain: string;
  lastUpdated: string;
  summary: {
    totalKeywords: number;
    inTop3: number;
    inTop10: number;
    improved: number;
    declined: number;
  };
  costMetrics: {
    trafficAtRisk: number;
    clicksLost: number;
    leadsLost: string;
    revenueAtRisk: string;
  };
  improvingKeywords: RankingItem[];
  decliningKeywords: RankingItem[];
  pagesToOptimize: PageToOptimize[];
  topPerformers: TopPerformer[];
  competitors: { domain: string; keywordsRanking: number }[];
  hasRealData: boolean;
}

const DASHBOARD_BG = {
  background: `radial-gradient(1200px circle at 10% 0%, rgba(139, 92, 246, 0.06), transparent 40%),
               radial-gradient(1200px circle at 90% 10%, rgba(236, 72, 153, 0.04), transparent 40%),
               radial-gradient(800px circle at 50% 80%, rgba(245, 158, 11, 0.03), transparent 40%),
               #FFFFFF`,
};

const WIZARD_STEPS = [
  {
    id: "analytics",
    title: "Connect Analytics",
    description: "Link Google Analytics 4 to track traffic, conversions, and user behavior.",
    icon: BarChart3,
    color: "#7c3aed",
  },
  {
    id: "search-console",
    title: "Connect Search Console",
    description: "Link Google Search Console to monitor keyword rankings and impressions.",
    icon: Search,
    color: "#ec4899",
  },
  {
    id: "integrations",
    title: "Add Integrations",
    description: "Connect additional tools like Google Ads, Clarity, or your CMS.",
    icon: Link2,
    color: "#f59e0b",
  },
  {
    id: "automation",
    title: "Set Up Automation",
    description: "Configure crawl schedules, alerts, and automated SEO recommendations.",
    icon: Zap,
    color: "#22c55e",
  },
];

function ConfigureOverlay({ domain, onClose }: { domain: string; onClose: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(15, 23, 42, 0.5)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="max-w-2xl w-full mx-4 rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #FFFFFF, #F8FAFC)",
          border: "1px solid rgba(15, 23, 42, 0.06)",
          boxShadow: "0 25px 50px rgba(15, 23, 42, 0.15)",
        }}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: "#0F172A", letterSpacing: "-0.02em" }}>
              Configure {domain}
            </h2>
            <p style={{ color: "#475569" }}>
              Complete these steps to unlock full SEO monitoring and insights.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-colors hover:bg-gray-100"
            style={{ color: "#64748B" }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-8 mb-6">
          <div className="flex gap-2">
            {WIZARD_STEPS.map((_, idx) => (
              <div
                key={idx}
                className="h-1.5 flex-1 rounded-full transition-all duration-300"
                style={{
                  background: idx <= currentStep
                    ? "linear-gradient(90deg, #7c3aed, #ec4899)"
                    : "rgba(15, 23, 42, 0.08)",
                }}
              />
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: "#94A3B8" }}>
            Step {currentStep + 1} of {WIZARD_STEPS.length}
          </p>
        </div>

        {/* Steps list */}
        <div className="px-8 pb-4 space-y-3">
          {WIZARD_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = idx === currentStep;
            const isCompleted = idx < currentStep;

            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(idx)}
                className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-200"
                style={{
                  background: isActive ? "#FFFFFF" : "transparent",
                  border: isActive
                    ? "1px solid rgba(124, 58, 237, 0.2)"
                    : "1px solid transparent",
                  boxShadow: isActive
                    ? "0 4px 12px rgba(124, 58, 237, 0.08)"
                    : "none",
                  opacity: isCompleted ? 0.6 : 1,
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isCompleted
                      ? "rgba(34, 197, 94, 0.1)"
                      : `rgba(${step.color === "#7c3aed" ? "124,58,237" : step.color === "#ec4899" ? "236,72,153" : step.color === "#f59e0b" ? "245,158,11" : "34,197,94"}, 0.1)`,
                    border: `1px solid ${isCompleted ? "rgba(34, 197, 94, 0.2)" : step.color}20`,
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: isCompleted ? "#22c55e" : step.color }} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color: "#0F172A" }}>{step.title}</p>
                  {isActive && (
                    <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>{step.description}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "#94A3B8" }} />
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-8 py-6 flex items-center justify-between" style={{ borderTop: "1px solid rgba(15, 23, 42, 0.06)" }}>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-gray-50"
            style={{ color: "#64748B" }}
          >
            Skip for now
          </button>
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep((s) => s - 1)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:bg-gray-50"
                style={{ color: "#0F172A", border: "1px solid rgba(15, 23, 42, 0.12)" }}
              >
                Back
              </button>
            )}
            <button
              onClick={() => {
                if (currentStep < WIZARD_STEPS.length - 1) {
                  setCurrentStep((s) => s + 1);
                } else {
                  onClose();
                }
              }}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(90deg, #6D28D9 0%, #D946EF 40%, #F59E0B 100%)",
                boxShadow: "0 8px 16px rgba(124,58,237,.15)",
                textShadow: "0 1px 2px rgba(0,0,0,0.15)",
              }}
            >
              {currentStep < WIZARD_STEPS.length - 1 ? "Continue" : "Finish Setup"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { selectedSite, setSelectedSiteId } = useSiteContext();
  const { authenticated } = useAuth();
  const [, navigate] = useLocation();
  const siteId = selectedSite?.siteId;
  const [siteName, setSiteName] = useState("");
  const [siteDomain, setSiteDomain] = useState("");
  const [showConfigOverlay, setShowConfigOverlay] = useState(false);
  const queryClient = useQueryClient();

  const addSite = useMutation({
    mutationFn: async ({ name, domain }: { name: string; domain: string }) => {
      const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
      const baseUrl = `https://${cleanDomain}`;
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name, baseUrl, status: "onboarding" }),
        credentials: "include",
      });
      if (!res.ok) {
        // Try to read the response body as text first, then parse as JSON
        const text = await res.text().catch(() => "");
        let message = `Failed to add site (${res.status})`;
        try {
          const errBody = JSON.parse(text);
          // Handle both { error: "string" } and { error: { message: "string" } } formats
          if (errBody?.details && Array.isArray(errBody.details)) {
            message = errBody.details.join(", ");
          } else if (typeof errBody?.error === "string") {
            message = errBody.error;
          } else if (errBody?.error?.message) {
            message = errBody.error.message;
          } else if (errBody?.message) {
            message = errBody.message;
          }
        } catch {
          // Response was not JSON — use the raw text if short enough
          if (text && text.length < 200) {
            message = text;
          }
        }
        console.error("[Dashboard] Add site failed:", res.status, text);
        throw new Error(message);
      }
      return res.json();
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["sites"] });
      setSelectedSiteId(data.siteId);
    },
  });

  const handleAddSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authenticated) {
      navigate("/login");
      return;
    }
    if (siteName.trim() && siteDomain.trim()) {
      addSite.mutate({ name: siteName.trim(), domain: siteDomain.trim() });
    }
  };

  const { data: dashboardData, isLoading, isError } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard", siteId],
    enabled: !!siteId,
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={DASHBOARD_BG}>
        <div className="text-center">
          <div
            className="h-12 w-12 rounded-full border-2 border-transparent mx-auto mb-4 animate-spin"
            style={{ borderTopColor: "#7c3aed", borderRightColor: "#ec4899" }}
          />
          <p style={{ color: "#475569" }}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // No site selected - show the "Add Your Website" form
  if (!siteId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={DASHBOARD_BG}>
        <div
          className="max-w-lg w-full rounded-2xl p-10"
          style={{
            background: "linear-gradient(180deg, #FFFFFF, #F8FAFC)",
            border: "1px solid rgba(15, 23, 42, 0.06)",
            boxShadow: "0 20px 40px rgba(15, 23, 42, 0.08)",
          }}
        >
          <div className="text-center mb-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(236,72,153,0.08), rgba(245,158,11,0.08))",
                border: "1px solid rgba(124, 58, 237, 0.12)",
              }}
            >
              <Globe className="w-7 h-7" style={{ color: "#7c3aed" }} />
            </div>
            <h2 className="text-2xl font-bold mb-3" style={{ color: "#0F172A", letterSpacing: "-0.02em" }}>
              Add Your Website
            </h2>
            <p style={{ color: "#475569" }}>Start tracking your SEO performance, keyword rankings, and more.</p>
          </div>
          <form onSubmit={handleAddSite} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "#0F172A" }}>Website Name</label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="Empathy Health Clinic"
                className="w-full px-4 py-3 rounded-xl text-base outline-none"
                style={{
                  border: "1px solid rgba(15, 23, 42, 0.18)",
                  background: "#FFFFFF",
                  color: "#0F172A",
                }}
                disabled={addSite.isPending}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "#0F172A" }}>Domain</label>
              <input
                type="text"
                value={siteDomain}
                onChange={(e) => setSiteDomain(e.target.value)}
                placeholder="www.yoursite.com"
                className="w-full px-4 py-3 rounded-xl text-base outline-none"
                style={{
                  border: "1px solid rgba(15, 23, 42, 0.18)",
                  background: "#FFFFFF",
                  color: "#0F172A",
                }}
                disabled={addSite.isPending}
              />
              <p className="mt-1.5 text-sm" style={{ color: "#64748B" }}>Enter the domain without http:// or https://</p>
            </div>
            <button
              type="submit"
              disabled={!siteName.trim() || !siteDomain.trim() || addSite.isPending}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(90deg, #6D28D9 0%, #D946EF 40%, #F59E0B 100%)",
                boxShadow: "0 14px 26px rgba(124,58,237,.18), 0 10px 18px rgba(245,158,11,.12)",
                textShadow: "0 1px 2px rgba(0,0,0,0.15)",
              }}
            >
              {addSite.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ArrowRight className="w-5 h-5" />
              )}
              Add Website
            </button>
          </form>
          {addSite.isError && (
            <p className="mt-4 text-red-600 text-sm text-center">{addSite.error.message}</p>
          )}
        </div>
      </div>
    );
  }

  // Site exists but no dashboard data yet (onboarding / no SERP data)
  const isOnboarding = !dashboardData || isError || (selectedSite?.status === "onboarding");
  const siteDomainDisplay = selectedSite?.baseUrl?.replace(/^https?:\/\//, "").replace(/\/$/, "") || "";

  if (isOnboarding && (!dashboardData || isError)) {
    return (
      <div className="min-h-screen p-6" style={DASHBOARD_BG}>
        {showConfigOverlay && (
          <ConfigureOverlay
            domain={siteDomainDisplay}
            onClose={() => setShowConfigOverlay(false)}
          />
        )}
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2" style={{ color: "#0F172A", letterSpacing: "-0.03em" }}>
              Dash<span
                style={{
                  backgroundImage: "linear-gradient(90deg, #7c3aed, #ec4899, #f59e0b)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >board</span>
            </h1>
            <p style={{ color: "#475569" }}>
              {siteDomainDisplay}
            </p>
          </div>

          {/* Configure banner */}
          <div
            className="rounded-2xl p-6"
            style={{
              background: "linear-gradient(135deg, rgba(124,58,237,0.06), rgba(236,72,153,0.04), rgba(245,158,11,0.04))",
              border: "1px solid rgba(124, 58, 237, 0.12)",
            }}
          >
            <div className="flex items-start gap-5">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(236,72,153,0.1))",
                  border: "1px solid rgba(124, 58, 237, 0.15)",
                }}
              >
                <Settings className="w-6 h-6" style={{ color: "#7c3aed" }} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-1" style={{ color: "#0F172A" }}>
                  Configure your site to unlock insights
                </h3>
                <p className="text-sm mb-4" style={{ color: "#475569" }}>
                  Connect Google Analytics, Search Console, and other integrations to start seeing real SEO data for {siteDomainDisplay}.
                </p>
                <button
                  onClick={() => setShowConfigOverlay(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-white font-semibold rounded-xl transition-all duration-200 hover:-translate-y-0.5"
                  style={{
                    background: "linear-gradient(90deg, #6D28D9 0%, #D946EF 40%, #F59E0B 100%)",
                    boxShadow: "0 8px 16px rgba(124,58,237,.15)",
                    textShadow: "0 1px 2px rgba(0,0,0,0.15)",
                  }}
                >
                  <Settings className="w-4 h-4" />
                  Configure
                </button>
              </div>
            </div>
          </div>

          {/* Empty KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { label: "Total Keywords", icon: Target, color: "#7c3aed", bgGrad: "rgba(124,58,237,0.12), rgba(245,158,11,0.08)", tint: "cyan" as const },
              { label: "Top 3 Rankings", icon: Trophy, color: "#f59e0b", bgGrad: "rgba(245,158,11,0.12), rgba(236,72,153,0.08)", tint: "purple" as const },
              { label: "Top 10 Rankings", icon: TrendingUp, color: "#ec4899", bgGrad: "rgba(124,58,237,0.08), rgba(236,72,153,0.12)", tint: "green" as const },
              { label: "Improved", icon: ArrowUp, color: "#22c55e", bgGrad: "rgba(34,197,94,0.08), rgba(34,197,94,0.04)", tint: "green" as const },
              { label: "Declined", icon: ArrowDown, color: "#ef4444", bgGrad: "rgba(239,68,68,0.08), rgba(239,68,68,0.04)", tint: "pink" as const },
            ].map(({ label, icon: Icon, color, bgGrad, tint }) => (
              <GlassCard key={label} variant="marketing" hover tint={tint}>
                <GlassCardContent className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium" style={{ color: "#475569" }}>{label}</p>
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${bgGrad})`,
                        border: `1px solid ${color}20`,
                      }}
                    >
                      <Icon className="w-4 h-4" style={{ color }} />
                    </div>
                  </div>
                  <p className="text-3xl font-bold" style={{ color: "#CBD5E1" }}>&mdash;</p>
                </GlassCardContent>
              </GlassCard>
            ))}
          </div>

          {/* Empty content cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <GlassCard variant="marketing" tint="green">
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2">
                  <ArrowUp className="w-5 h-5" style={{ color: "#22c55e" }} />
                  Improving Keywords
                </GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="py-8 text-center">
                  <p className="text-sm" style={{ color: "#94A3B8" }}>
                    Data will appear here once integrations are configured.
                  </p>
                </div>
              </GlassCardContent>
            </GlassCard>

            <GlassCard variant="marketing" tint="pink">
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2">
                  <ArrowDown className="w-5 h-5" style={{ color: "#ef4444" }} />
                  Declining Keywords
                </GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="py-8 text-center">
                  <p className="text-sm" style={{ color: "#94A3B8" }}>
                    Data will appear here once integrations are configured.
                  </p>
                </div>
              </GlassCardContent>
            </GlassCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <GlassCard variant="marketing" tint="purple">
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" style={{ color: "#7c3aed" }} />
                  Pages to Optimize
                </GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="py-8 text-center">
                  <p className="text-sm" style={{ color: "#94A3B8" }}>No data yet</p>
                </div>
              </GlassCardContent>
            </GlassCard>

            <GlassCard variant="marketing" tint="amber">
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" style={{ color: "#f59e0b" }} />
                  Top Performers
                </GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="py-8 text-center">
                  <p className="text-sm" style={{ color: "#94A3B8" }}>No data yet</p>
                </div>
              </GlassCardContent>
            </GlassCard>

            <GlassCard variant="marketing-accent" tint="purple">
              <GlassCardHeader>
                <GlassCardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" style={{ color: "#7c3aed" }} />
                  <span style={{ color: "#0F172A" }}>Competitors</span>
                </GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="py-8 text-center">
                  <p className="text-sm" style={{ color: "#94A3B8" }}>No data yet</p>
                </div>
              </GlassCardContent>
            </GlassCard>
          </div>
        </div>
      </div>
    );
  }

  const { summary, costMetrics, improvingKeywords, decliningKeywords, pagesToOptimize, topPerformers, competitors } = dashboardData!;

  return (
    <div className="min-h-screen p-6" style={DASHBOARD_BG}>
      {showConfigOverlay && (
        <ConfigureOverlay
          domain={siteDomainDisplay}
          onClose={() => setShowConfigOverlay(false)}
        />
      )}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2" style={{ color: "#0F172A", letterSpacing: "-0.03em" }}>
              Dash<span
                style={{
                  backgroundImage: "linear-gradient(90deg, #7c3aed, #ec4899, #f59e0b)",
                  WebkitBackgroundClip: "text",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >board</span>
            </h1>
            <p style={{ color: "#475569" }}>
              {dashboardData!.domain} &middot; Last updated: {new Date(dashboardData!.lastUpdated).toLocaleString()}
            </p>
          </div>
          {selectedSite?.status === "onboarding" && (
            <button
              onClick={() => setShowConfigOverlay(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(236,72,153,0.06))",
                border: "1px solid rgba(124, 58, 237, 0.15)",
                color: "#7c3aed",
              }}
            >
              <Settings className="w-4 h-4" />
              Configure
            </button>
          )}
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <GlassCard variant="marketing" hover tint="cyan">
            <GlassCardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium" style={{ color: "#475569" }}>Total Keywords</p>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(245,158,11,0.08))",
                    border: "1px solid rgba(124, 58, 237, 0.12)",
                  }}
                >
                  <Target className="w-4 h-4" style={{ color: "#7c3aed" }} />
                </div>
              </div>
              <p className="text-3xl font-bold" style={{ color: "#0F172A" }}>{summary.totalKeywords.toLocaleString()}</p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard variant="marketing" hover tint="purple">
            <GlassCardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium" style={{ color: "#475569" }}>Top 3 Rankings</p>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(236,72,153,0.08))",
                    border: "1px solid rgba(245, 158, 11, 0.12)",
                  }}
                >
                  <Trophy className="w-4 h-4" style={{ color: "#f59e0b" }} />
                </div>
              </div>
              <p className="text-3xl font-bold" style={{ color: "#0F172A" }}>{summary.inTop3.toLocaleString()}</p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard variant="marketing" hover tint="green">
            <GlassCardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium" style={{ color: "#475569" }}>Top 10 Rankings</p>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(236,72,153,0.12))",
                    border: "1px solid rgba(236, 72, 153, 0.12)",
                  }}
                >
                  <TrendingUp className="w-4 h-4" style={{ color: "#ec4899" }} />
                </div>
              </div>
              <p className="text-3xl font-bold" style={{ color: "#0F172A" }}>{summary.inTop10.toLocaleString()}</p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard variant="marketing" hover tint="green">
            <GlassCardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium" style={{ color: "#475569" }}>Improved</p>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: "rgba(34, 197, 94, 0.08)",
                    border: "1px solid rgba(34, 197, 94, 0.15)",
                  }}
                >
                  <ArrowUp className="w-4 h-4" style={{ color: "#22c55e" }} />
                </div>
              </div>
              <p className="text-3xl font-bold" style={{ color: "#22c55e" }}>+{summary.improved}</p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard variant="marketing" hover tint="pink">
            <GlassCardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium" style={{ color: "#475569" }}>Declined</p>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.15)",
                  }}
                >
                  <ArrowDown className="w-4 h-4" style={{ color: "#ef4444" }} />
                </div>
              </div>
              <p className="text-3xl font-bold" style={{ color: "#ef4444" }}>-{summary.declined}</p>
            </GlassCardContent>
          </GlassCard>
        </div>

        {/* Cost Metrics */}
        <GlassCard variant="marketing-accent" tint="purple">
          <GlassCardHeader>
            <GlassCardTitle>
              <span style={{ color: "#0F172A" }}>At-Risk Metrics</span>
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm mb-1" style={{ color: "#475569" }}>Traffic at Risk</p>
                <p className="text-2xl font-bold" style={{ color: "#0F172A" }}>{costMetrics.trafficAtRisk.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: "#475569" }}>Clicks Lost</p>
                <p className="text-2xl font-bold" style={{ color: "#0F172A" }}>{costMetrics.clicksLost.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: "#475569" }}>Leads Lost</p>
                <p className="text-2xl font-bold" style={{ color: "#0F172A" }}>{costMetrics.leadsLost}</p>
              </div>
              <div>
                <p className="text-sm mb-1" style={{ color: "#475569" }}>Revenue at Risk</p>
                <p className="text-2xl font-bold" style={{ color: "#0F172A" }}>{costMetrics.revenueAtRisk}</p>
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>

        {/* Keyword Rankings - Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Improving Keywords */}
          <GlassCard variant="marketing" tint="green">
            <GlassCardHeader>
              <div className="flex items-center justify-between">
                <GlassCardTitle className="flex items-center gap-2">
                  <ArrowUp className="w-5 h-5" style={{ color: "#22c55e" }} />
                  Improving Keywords
                </GlassCardTitle>
                <span className="text-sm" style={{ color: "#64748B" }}>{improvingKeywords.length} keywords</span>
              </div>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="space-y-3">
                {improvingKeywords.slice(0, 5).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid rgba(15, 23, 42, 0.06)",
                      borderLeft: "3px solid #22c55e",
                    }}
                  >
                    <div className="flex-1">
                      <p className="font-medium" style={{ color: "#0F172A" }}>{item.keyword}</p>
                      <p className="text-xs truncate" style={{ color: "#64748B" }}>{item.url}</p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm" style={{ color: "#64748B" }}>#{item.currentPosition}</span>
                        <ArrowUp className="w-4 h-4" style={{ color: "#22c55e" }} />
                        <span className="text-sm font-semibold" style={{ color: "#22c55e" }}>+{item.change}</span>
                      </div>
                      <p className="text-xs" style={{ color: "#94A3B8" }}>{item.searchVolume.toLocaleString()} vol</p>
                    </div>
                  </div>
                ))}
                {improvingKeywords.length === 0 && (
                  <div className="py-6 text-center">
                    <p className="text-sm" style={{ color: "#94A3B8" }}>No improving keywords yet</p>
                  </div>
                )}
              </div>
            </GlassCardContent>
          </GlassCard>

          {/* Declining Keywords */}
          <GlassCard variant="marketing" tint="pink">
            <GlassCardHeader>
              <div className="flex items-center justify-between">
                <GlassCardTitle className="flex items-center gap-2">
                  <ArrowDown className="w-5 h-5" style={{ color: "#ef4444" }} />
                  Declining Keywords
                </GlassCardTitle>
                <span className="text-sm" style={{ color: "#64748B" }}>{decliningKeywords.length} keywords</span>
              </div>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="space-y-3">
                {decliningKeywords.slice(0, 5).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid rgba(15, 23, 42, 0.06)",
                      borderLeft: "3px solid #ef4444",
                    }}
                  >
                    <div className="flex-1">
                      <p className="font-medium" style={{ color: "#0F172A" }}>{item.keyword}</p>
                      <p className="text-xs truncate" style={{ color: "#64748B" }}>{item.url}</p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm" style={{ color: "#64748B" }}>#{item.currentPosition}</span>
                        <ArrowDown className="w-4 h-4" style={{ color: "#ef4444" }} />
                        <span className="text-sm font-semibold" style={{ color: "#ef4444" }}>{item.change}</span>
                      </div>
                      <p className="text-xs" style={{ color: "#94A3B8" }}>{item.searchVolume.toLocaleString()} vol</p>
                    </div>
                  </div>
                ))}
                {decliningKeywords.length === 0 && (
                  <div className="py-6 text-center">
                    <p className="text-sm" style={{ color: "#94A3B8" }}>No declining keywords</p>
                  </div>
                )}
              </div>
            </GlassCardContent>
          </GlassCard>
        </div>

        {/* Bottom Section - Three Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pages to Optimize */}
          <GlassCard variant="marketing" tint="purple">
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" style={{ color: "#7c3aed" }} />
                Pages to Optimize
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="space-y-3">
                {pagesToOptimize.slice(0, 4).map((page, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl"
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid rgba(15, 23, 42, 0.06)",
                      borderLeft: "3px solid #7c3aed",
                    }}
                  >
                    <p className="font-medium text-sm mb-1 truncate" style={{ color: "#0F172A" }}>{page.title}</p>
                    <p className="text-xs mb-2 truncate" style={{ color: "#64748B" }}>{page.url}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: "#64748B" }}>{page.keywords} keywords</span>
                      <span style={{ color: "#64748B" }}>Avg: #{page.avgPosition}</span>
                      <span className="font-semibold" style={{ color: "#7c3aed" }}>{page.potential}</span>
                    </div>
                  </div>
                ))}
                {pagesToOptimize.length === 0 && (
                  <div className="py-6 text-center">
                    <p className="text-sm" style={{ color: "#94A3B8" }}>No pages identified yet</p>
                  </div>
                )}
              </div>
            </GlassCardContent>
          </GlassCard>

          {/* Top Performers */}
          <GlassCard variant="marketing" tint="amber">
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" style={{ color: "#f59e0b" }} />
                Top Performers
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="space-y-3">
                {topPerformers.slice(0, 4).map((performer, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl"
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid rgba(15, 23, 42, 0.06)",
                      borderLeft: "3px solid #f59e0b",
                    }}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-sm" style={{ color: "#0F172A" }}>{performer.keyword}</p>
                      <span className="text-lg font-bold" style={{ color: "#f59e0b" }}>#{performer.position}</span>
                    </div>
                    <p className="text-xs mb-1 truncate" style={{ color: "#64748B" }}>{performer.url}</p>
                    <p className="text-xs" style={{ color: "#94A3B8" }}>{performer.searchVolume.toLocaleString()} searches/mo</p>
                  </div>
                ))}
                {topPerformers.length === 0 && (
                  <div className="py-6 text-center">
                    <p className="text-sm" style={{ color: "#94A3B8" }}>No top performers yet</p>
                  </div>
                )}
              </div>
            </GlassCardContent>
          </GlassCard>

          {/* Competitors */}
          <GlassCard variant="marketing-accent" tint="blue">
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" style={{ color: "#7c3aed" }} />
                <span style={{ color: "#0F172A" }}>Competitors</span>
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="space-y-3">
                {competitors.slice(0, 4).map((competitor, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl"
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid rgba(15, 23, 42, 0.06)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate" style={{ color: "#0F172A" }}>{competitor.domain}</p>
                      <span className="text-sm font-semibold" style={{ color: "#7c3aed" }}>
                        {competitor.keywordsRanking} kw
                      </span>
                    </div>
                  </div>
                ))}
                {competitors.length === 0 && (
                  <div className="py-6 text-center">
                    <p className="text-sm" style={{ color: "#94A3B8" }}>No competitors tracked yet</p>
                  </div>
                )}
              </div>
            </GlassCardContent>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
