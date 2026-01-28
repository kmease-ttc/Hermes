import { useQuery } from "@tanstack/react-query";
import { useSiteContext } from "@/hooks/useSiteContext";
import {
  GlassCard,
  GlassCardHeader,
  GlassCardTitle,
  GlassCardContent,
} from "@/components/ui/GlassCard";
import { ArrowUp, ArrowDown, TrendingUp, AlertTriangle, Trophy, Target, Plus, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

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

export default function Dashboard() {
  const { selectedSite } = useSiteContext();
  const siteId = selectedSite?.siteId;

  const { data: dashboardData, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard", siteId],
    enabled: !!siteId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!siteId || !dashboardData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 flex items-center justify-center">
        <GlassCard className="max-w-md p-8 text-center">
          <Globe className="w-12 h-12 text-purple-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Site Selected</h2>
          <p className="text-gray-600 mb-6">Add a website to start tracking your SEO performance and rankings.</p>
          <Link href="/app/sites/new">
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors">
              <Plus className="w-5 h-5" />
              Add Website
            </button>
          </Link>
        </GlassCard>
      </div>
    );
  }

  const { summary, costMetrics, improvingKeywords, decliningKeywords, pagesToOptimize, topPerformers, competitors } = dashboardData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Dashboard
          </h1>
          <p className="text-gray-600">
            {dashboardData.domain} • Last updated: {new Date(dashboardData.lastUpdated).toLocaleString()}
          </p>
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <GlassCard variant="purple" hover>
            <GlassCardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Total Keywords</p>
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{summary.totalKeywords.toLocaleString()}</p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard variant="white" hover>
            <GlassCardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Top 3 Rankings</p>
                <Trophy className="w-5 h-5 text-amber-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{summary.inTop3.toLocaleString()}</p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard variant="white" hover>
            <GlassCardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Top 10 Rankings</p>
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{summary.inTop10.toLocaleString()}</p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard variant="white" hover>
            <GlassCardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Improved</p>
                <ArrowUp className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-green-600">+{summary.improved}</p>
            </GlassCardContent>
          </GlassCard>

          <GlassCard variant="white" hover>
            <GlassCardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-600">Declined</p>
                <ArrowDown className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-3xl font-bold text-red-600">-{summary.declined}</p>
            </GlassCardContent>
          </GlassCard>
        </div>

        {/* Cost Metrics */}
        <GlassCard variant="purple">
          <GlassCardHeader>
            <GlassCardTitle className="text-purple-900">At-Risk Metrics</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Traffic at Risk</p>
                <p className="text-2xl font-bold text-gray-900">{costMetrics.trafficAtRisk.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Clicks Lost</p>
                <p className="text-2xl font-bold text-gray-900">{costMetrics.clicksLost.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Leads Lost</p>
                <p className="text-2xl font-bold text-gray-900">{costMetrics.leadsLost}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Revenue at Risk</p>
                <p className="text-2xl font-bold text-gray-900">{costMetrics.revenueAtRisk}</p>
              </div>
            </div>
          </GlassCardContent>
        </GlassCard>

        {/* Keyword Rankings - Two Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Improving Keywords */}
          <GlassCard variant="white">
            <GlassCardHeader>
              <div className="flex items-center justify-between">
                <GlassCardTitle className="flex items-center gap-2">
                  <ArrowUp className="w-5 h-5 text-green-600" />
                  Improving Keywords
                </GlassCardTitle>
                <span className="text-sm text-gray-600">{improvingKeywords.length} keywords</span>
              </div>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="space-y-3">
                {improvingKeywords.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-green-50/50 rounded-lg border border-green-200/30">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.keyword}</p>
                      <p className="text-xs text-gray-600 truncate">{item.url}</p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">#{item.currentPosition}</span>
                        <ArrowUp className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-semibold text-green-600">+{item.change}</span>
                      </div>
                      <p className="text-xs text-gray-500">{item.searchVolume.toLocaleString()} vol</p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCardContent>
          </GlassCard>

          {/* Declining Keywords */}
          <GlassCard variant="white">
            <GlassCardHeader>
              <div className="flex items-center justify-between">
                <GlassCardTitle className="flex items-center gap-2">
                  <ArrowDown className="w-5 h-5 text-red-600" />
                  Declining Keywords
                </GlassCardTitle>
                <span className="text-sm text-gray-600">{decliningKeywords.length} keywords</span>
              </div>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="space-y-3">
                {decliningKeywords.slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-red-50/50 rounded-lg border border-red-200/30">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.keyword}</p>
                      <p className="text-xs text-gray-600 truncate">{item.url}</p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">#{item.currentPosition}</span>
                        <ArrowDown className="w-4 h-4 text-red-600" />
                        <span className="text-sm font-semibold text-red-600">{item.change}</span>
                      </div>
                      <p className="text-xs text-gray-500">{item.searchVolume.toLocaleString()} vol</p>
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
          <GlassCard variant="white">
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                Pages to Optimize
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="space-y-3">
                {pagesToOptimize.slice(0, 4).map((page, idx) => (
                  <div key={idx} className="p-3 bg-purple-50/50 rounded-lg border border-purple-200/30">
                    <p className="font-medium text-gray-900 text-sm mb-1 truncate">{page.title}</p>
                    <p className="text-xs text-gray-600 mb-2 truncate">{page.url}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{page.keywords} keywords</span>
                      <span className="text-gray-600">Avg: #{page.avgPosition}</span>
                      <span className="font-semibold text-purple-600">{page.potential}</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCardContent>
          </GlassCard>

          {/* Top Performers */}
          <GlassCard variant="white">
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-600" />
                Top Performers
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="space-y-3">
                {topPerformers.slice(0, 4).map((performer, idx) => (
                  <div key={idx} className="p-3 bg-amber-50/50 rounded-lg border border-amber-200/30">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium text-gray-900 text-sm">{performer.keyword}</p>
                      <span className="text-lg font-bold text-amber-600">#{performer.position}</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-1 truncate">{performer.url}</p>
                    <p className="text-xs text-gray-500">{performer.searchVolume.toLocaleString()} searches/mo</p>
                  </div>
                ))}
              </div>
            </GlassCardContent>
          </GlassCard>

          {/* Competitors */}
          <GlassCard variant="purple">
            <GlassCardHeader>
              <GlassCardTitle className="text-purple-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Competitors
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="space-y-3">
                {competitors.slice(0, 4).map((competitor, idx) => (
                  <div key={idx} className="p-3 bg-white/40 rounded-lg border border-purple-200/30">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900 text-sm truncate">{competitor.domain}</p>
                      <span className="text-sm font-semibold text-purple-700">
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
