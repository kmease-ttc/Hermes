import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSiteContext } from "@/hooks/useSiteContext";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from "@/components/ui/GlassCard";
import { ArrowUp, ArrowDown, TrendingUp, AlertTriangle, Trophy, Target, Globe, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

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

export default function Dashboard() {
  const { selectedSite, setSelectedSiteId } = useSiteContext();
  const siteId = selectedSite?.siteId;
  const [siteName, setSiteName] = useState("");
  const [siteDomain, setSiteDomain] = useState("");
  const queryClient = useQueryClient();

  const createSite = useMutation({
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
        const errBody = await res.json().catch(() => null);
        const message = errBody?.details?.join(", ") || errBody?.error || "Failed to create site";
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
    if (siteName.trim() && siteDomain.trim()) {
      createSite.mutate({ name: siteName.trim(), domain: siteDomain.trim() });
    }
  };

  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard", siteId],
    enabled: !!siteId,
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

  if (!siteId || !dashboardData) {
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
                disabled={createSite.isPending}
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
                disabled={createSite.isPending}
              />
              <p className="mt-1.5 text-sm" style={{ color: "#64748B" }}>Enter the domain without http:// or https://</p>
            </div>
            <button
              type="submit"
              disabled={!siteName.trim() || !siteDomain.trim() || createSite.isPending}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 text-white font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(90deg, #6D28D9 0%, #D946EF 40%, #F59E0B 100%)",
                boxShadow: "0 14px 26px rgba(124,58,237,.18), 0 10px 18px rgba(245,158,11,.12)",
                textShadow: "0 1px 2px rgba(0,0,0,0.15)",
              }}
            >
              {createSite.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ArrowRight className="w-5 h-5" />
              )}
              Add Website
            </button>
          </form>
          {createSite.isError && (
            <p className="mt-4 text-red-600 text-sm text-center">{createSite.error.message}</p>
          )}
        </div>
      </div>
    );
  }

  const { summary, costMetrics, improvingKeywords, decliningKeywords, pagesToOptimize, topPerformers, competitors } = dashboardData;

  return (
    <div className="min-h-screen p-6" style={DASHBOARD_BG}>
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
            {dashboardData.domain} &middot; Last updated: {new Date(dashboardData.lastUpdated).toLocaleString()}
          </p>
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <GlassCard variant="marketing" hover>
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

          <GlassCard variant="marketing" hover>
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

          <GlassCard variant="marketing" hover>
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

          <GlassCard variant="marketing" hover>
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

          <GlassCard variant="marketing" hover>
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
        <GlassCard variant="marketing-accent">
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
          <GlassCard variant="marketing">
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
              </div>
            </GlassCardContent>
          </GlassCard>

          {/* Declining Keywords */}
          <GlassCard variant="marketing">
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
              </div>
            </GlassCardContent>
          </GlassCard>
        </div>

        {/* Bottom Section - Three Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pages to Optimize */}
          <GlassCard variant="marketing">
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
              </div>
            </GlassCardContent>
          </GlassCard>

          {/* Top Performers */}
          <GlassCard variant="marketing">
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
              </div>
            </GlassCardContent>
          </GlassCard>

          {/* Competitors */}
          <GlassCard variant="marketing-accent">
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
              </div>
            </GlassCardContent>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
