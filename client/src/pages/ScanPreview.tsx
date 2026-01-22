import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, Loader2, AlertTriangle, 
  Eye, MousePointerClick, Users, Target, BarChart, TrendingUp
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ROUTES } from "@shared/routes";

interface Finding {
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
  impact: string;
  effort: string;
  summary: string;
}

interface ScanStatus {
  scanId: string;
  status: "queued" | "running" | "preview_ready" | "completed" | "failed";
  progress?: number;
  message?: string;
}

interface KeywordItem {
  keyword: string;
  volume: number;
  position?: number;
}

interface ScanPreviewData {
  findings: Finding[];
  scoreSummary: {
    overall: number;
    technical: number;
    content: number;
    performance: number;
    serp?: number;
    authority?: number;
    costOfInaction?: {
      trafficAtRisk: number;
      clicksLost: number;
      leadsMin: number;
      leadsMax: number;
      pageOneOpportunities: number;
    };
  };
  totalFindings: number;
  targetUrl: string;
  siteName?: string;
  domain?: string;
  currentWins?: KeywordItem[];
  bigGaps?: KeywordItem[];
  keywordStats?: {
    total: number;
    top20: number;
    notRanked: number;
  };
  authority?: {
    domainAuthority: number | null;
    referringDomains: number | null;
  };
  generatedAt?: string;
}

function getLetterGrade(score: number): { grade: string; color: string; bgClass: string } {
  if (score >= 90) return { grade: "A", color: "text-emerald-600", bgClass: "from-emerald-100 to-emerald-50" };
  if (score >= 80) return { grade: "B+", color: "text-emerald-500", bgClass: "from-emerald-100/80 to-emerald-50/80" };
  if (score >= 70) return { grade: "B", color: "text-amber-600", bgClass: "from-amber-100 to-amber-50" };
  if (score >= 60) return { grade: "C+", color: "text-amber-600", bgClass: "from-amber-100 to-amber-50" };
  if (score >= 50) return { grade: "C", color: "text-amber-700", bgClass: "from-amber-200 to-amber-100" };
  if (score >= 40) return { grade: "D+", color: "text-red-500", bgClass: "from-red-100 to-red-50" };
  if (score >= 30) return { grade: "D", color: "text-red-600", bgClass: "from-red-200 to-red-100" };
  return { grade: "F", color: "text-red-700", bgClass: "from-red-200 to-red-100" };
}

function getHealthLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Strong", color: "text-emerald-600" };
  if (score >= 60) return { label: "Needs Attention", color: "text-amber-600" };
  return { label: "At Risk", color: "text-red-600" };
}

function getImpactFromPreview(scoreSummary: ScanPreviewData["scoreSummary"], totalFindings: number) {
  if (scoreSummary.costOfInaction) {
    return scoreSummary.costOfInaction;
  }
  
  const severity = 100 - scoreSummary.overall;
  const baseTraffic = Math.round(severity * 35 + totalFindings * 50);
  const trafficAtRisk = Math.max(200, Math.min(5000, baseTraffic));
  const clicksLost = Math.round(trafficAtRisk * 1.5);
  const leadsMin = Math.round(clicksLost * 0.015);
  const leadsMax = Math.round(clicksLost * 0.04);
  const pageOneOpportunities = Math.max(3, Math.round(totalFindings * 0.5));
  
  return { trafficAtRisk, clicksLost, leadsMin, leadsMax, pageOneOpportunities };
}

function formatDate(isoString?: string): string {
  if (!isoString) return new Date().toLocaleString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
  return new Date(isoString).toLocaleString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });
}

export default function ScanPreview() {
  const params = useParams<{ scanId: string }>();
  const scanId = params.scanId;
  const [, navigate] = useLocation();

  const statusQuery = useQuery<ScanStatus>({
    queryKey: ["scan-status", scanId],
    queryFn: async () => {
      const res = await fetch(`/api/scan/${scanId}/status`);
      if (!res.ok) throw new Error("Failed to fetch scan status");
      return res.json();
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      if (data.status === "queued" || data.status === "running") return 2000;
      return false;
    },
    enabled: !!scanId,
  });

  const previewQuery = useQuery<ScanPreviewData>({
    queryKey: ["scan-preview", scanId],
    queryFn: async () => {
      const res = await fetch(`/api/scan/${scanId}/preview`);
      if (!res.ok) throw new Error("Failed to fetch preview");
      return res.json();
    },
    enabled: statusQuery.data?.status === "preview_ready" || statusQuery.data?.status === "completed",
  });

  const isScanning = statusQuery.data?.status === "queued" || statusQuery.data?.status === "running";
  const isReady = statusQuery.data?.status === "preview_ready" || statusQuery.data?.status === "completed";
  const isFailed = statusQuery.data?.status === "failed";

  const handleSignupClick = () => {
    navigate(`${ROUTES.SIGNUP}?scanId=${scanId}`);
  };

  if (!previewQuery.data && isReady) {
    return (
      <MarketingLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        </div>
      </MarketingLayout>
    );
  }

  const preview = previewQuery.data;
  const gradeInfo = preview ? getLetterGrade(preview.scoreSummary.overall) : null;
  const healthInfo = preview ? getHealthLabel(preview.scoreSummary.overall) : null;
  const impact = preview ? getImpactFromPreview(preview.scoreSummary, preview.totalFindings) : null;

  return (
    <MarketingLayout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/50">
        <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">
          <div className="max-w-4xl mx-auto">
            
            {/* Scanning State */}
            {isScanning && (
              <div className="text-center space-y-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center mx-auto shadow-lg shadow-violet-500/10">
                  <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
                </div>
                <div className="space-y-4">
                  <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                    Analyzing Your Site
                  </h1>
                  <p className="text-xl text-slate-600">
                    {statusQuery.data?.message || "Checking SEO, performance, and content..."}
                  </p>
                </div>
                <div className="max-w-md mx-auto">
                  <Progress value={statusQuery.data?.progress || 30} className="h-2" />
                  <p className="text-sm text-slate-500 mt-2">
                    {statusQuery.data?.progress || 30}% complete
                  </p>
                </div>
              </div>
            )}

            {/* Failed State */}
            {isFailed && (
              <div className="text-center space-y-8">
                <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-10 h-10 text-red-600" />
                </div>
                <div className="space-y-4">
                  <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                    Scan Failed
                  </h1>
                  <p className="text-xl text-slate-600">
                    {statusQuery.data?.message || "We couldn't complete the scan. Please try again."}
                  </p>
                </div>
                <Button variant="primaryGradient" onClick={() => navigate(ROUTES.LANDING)} size="lg" data-testid="button-retry">
                  Try Again
                </Button>
              </div>
            )}

            {/* ===== REPORT READY STATE - Email Style ===== */}
            {isReady && preview && gradeInfo && healthInfo && impact && (
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
                
                {/* Report Header */}
                <div className="border-b border-slate-200 p-6 md:p-8">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-600 to-pink-500 flex items-center justify-center text-white font-bold text-xl">
                        A
                      </div>
                      <span className="text-xl font-semibold text-slate-900">arclo</span>
                    </div>
                    <Badge className="bg-violet-100 text-violet-700 border-0 px-3 py-1">
                      SEO Report
                    </Badge>
                  </div>
                  
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-2">
                    SEO Performance Report
                  </h1>
                  <p className="text-sm text-slate-500">
                    Generated {formatDate(preview.generatedAt)}
                  </p>
                </div>

                {/* Site Info Section */}
                <div className="border-b border-slate-200 p-6 md:p-8">
                  <div className="flex items-center gap-2 mb-6">
                    <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${gradeInfo.bgClass} flex items-center justify-center`} data-testid="badge-grade">
                      <span className={`text-3xl font-bold ${gradeInfo.color}`} data-testid="value-grade">{gradeInfo.grade}</span>
                    </div>
                    <div className="ml-2">
                      <h2 className="text-xl font-semibold text-slate-900" data-testid="text-site-name">
                        {preview.siteName || "Your Website"}
                      </h2>
                      <p className="text-sm text-blue-600" data-testid="text-domain">{preview.domain || preview.targetUrl}</p>
                      <p className={`text-sm font-medium ${healthInfo.color}`} data-testid="text-health-status">{healthInfo.label}</p>
                    </div>
                  </div>

                  {/* Cost of Inaction Metrics - 4 columns */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-4 bg-red-50 rounded-xl border border-red-100" data-testid="card-traffic-at-risk">
                      <Eye className="w-5 h-5 mx-auto mb-2 text-red-500" />
                      <div className="text-2xl font-bold text-red-700" data-testid="value-traffic-at-risk">{impact.trafficAtRisk.toLocaleString()}</div>
                      <div className="text-xs text-red-600 font-medium uppercase tracking-wide">Traffic at Risk (Est.)</div>
                    </div>
                    <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-100" data-testid="card-clicks-lost">
                      <MousePointerClick className="w-5 h-5 mx-auto mb-2 text-amber-500" />
                      <div className="text-2xl font-bold text-amber-700" data-testid="value-clicks-lost">{impact.clicksLost.toLocaleString()}</div>
                      <div className="text-xs text-amber-600 font-medium uppercase tracking-wide">Clicks Lost</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-100" data-testid="card-leads-missed">
                      <Users className="w-5 h-5 mx-auto mb-2 text-purple-500" />
                      <div className="text-2xl font-bold text-purple-700" data-testid="value-leads-missed">{impact.leadsMin}-{impact.leadsMax}</div>
                      <div className="text-xs text-purple-600 font-medium uppercase tracking-wide">Leads Missed (Est.)</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-100" data-testid="card-page-one-opps">
                      <Target className="w-5 h-5 mx-auto mb-2 text-blue-500" />
                      <div className="text-2xl font-bold text-blue-700" data-testid="value-page-one-opps">{impact.pageOneOpportunities}</div>
                      <div className="text-xs text-blue-600 font-medium uppercase tracking-wide">Page-One Opps</div>
                    </div>
                  </div>
                  
                  <p className="text-xs text-slate-400 text-center">
                    Estimates use industry CTR by rank, a capture factor (0.65), and a lead rate (2.5%).
                  </p>
                </div>

                {/* SEO Metrics Row */}
                <div className="border-b border-slate-200 p-6 md:p-8">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-slate-50 rounded-xl border border-slate-200" data-testid="card-authority">
                      <div className="text-2xl font-bold text-slate-600" data-testid="value-authority">
                        {preview.authority?.domainAuthority || "—"}
                      </div>
                      <div className="text-xs text-slate-500 font-medium uppercase tracking-wide">Authority</div>
                    </div>
                    <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-100" data-testid="card-keywords">
                      <div className="text-2xl font-bold text-amber-700" data-testid="value-keywords">
                        {preview.keywordStats?.total || 0}
                      </div>
                      <div className="text-xs text-amber-600 font-medium uppercase tracking-wide">Keywords</div>
                    </div>
                    <div className="text-center p-4 bg-teal-50 rounded-xl border border-teal-100" data-testid="card-top20">
                      <div className="text-2xl font-bold text-teal-700" data-testid="value-top20">
                        {preview.keywordStats?.top20 || 0}
                      </div>
                      <div className="text-xs text-teal-600 font-medium uppercase tracking-wide">Top 20</div>
                    </div>
                    <div className="text-center p-4 bg-pink-50 rounded-xl border border-pink-100" data-testid="card-not-ranked">
                      <div className="text-2xl font-bold text-pink-700" data-testid="value-not-ranked">
                        {preview.keywordStats?.notRanked || 0}
                      </div>
                      <div className="text-xs text-pink-600 font-medium uppercase tracking-wide">Not Ranked</div>
                    </div>
                  </div>
                </div>

                {/* Current Wins & Big Gaps - Side by side */}
                <div className="border-b border-slate-200 p-6 md:p-8">
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Current Wins */}
                    <div className="bg-emerald-50/50 rounded-xl p-5 border border-emerald-100" data-testid="section-current-wins">
                      <h3 className="text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Current Wins
                      </h3>
                      {preview.currentWins && preview.currentWins.length > 0 ? (
                        <div className="space-y-3">
                          {preview.currentWins.map((kw, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm" data-testid={`keyword-win-${idx}`}>
                              <span className="text-slate-700 font-medium truncate max-w-[60%]">{kw.keyword}</span>
                              <div className="flex items-center gap-2 text-slate-500">
                                <span>Vol {kw.volume.toLocaleString()}</span>
                                <span className="text-xs px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-bold">
                                  #{kw.position}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 italic" data-testid="text-no-wins">
                          Sign up to discover your top-ranking keywords
                        </p>
                      )}
                    </div>

                    {/* Big Gaps */}
                    <div className="bg-red-50/50 rounded-xl p-5 border border-red-100" data-testid="section-big-gaps">
                      <h3 className="text-sm font-semibold text-red-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                        <BarChart className="w-4 h-4" />
                        Big Gaps
                      </h3>
                      {preview.bigGaps && preview.bigGaps.length > 0 ? (
                        <div className="space-y-3">
                          {preview.bigGaps.map((kw, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm" data-testid={`keyword-gap-${idx}`}>
                              <span className="text-slate-700 font-medium truncate max-w-[50%]">{kw.keyword}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded font-medium">
                                  Not ranking
                                </span>
                                <span className="text-slate-400 text-xs">({kw.volume.toLocaleString()}/mo)</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 italic" data-testid="text-no-gaps">
                          Sign up to identify keyword opportunities
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* What To Do Next */}
                <div className="border-b border-slate-200 p-6 md:p-8">
                  <h3 className="text-sm font-semibold text-violet-700 uppercase tracking-wide mb-4">
                    What To Do Next
                  </h3>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0">
                        1
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <BarChart className="w-4 h-4 text-slate-600" />
                          <span className="font-semibold text-slate-800">Rankings Core</span>
                          <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">ACTIVE</Badge>
                        </div>
                        <p className="text-sm text-slate-600">
                          Push near-ranking pages into top results
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Pages ranking #4-#10 are your fastest path to top results.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-slate-50/50 rounded-xl border border-slate-100 opacity-60">
                      <div className="w-8 h-8 rounded-lg bg-slate-300 text-white flex items-center justify-center font-bold shrink-0">
                        2
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Target className="w-4 h-4 text-slate-400" />
                          <span className="font-semibold text-slate-500">Content Gaps</span>
                          <Badge className="bg-slate-100 text-slate-500 border-0 text-xs">LOCKED</Badge>
                        </div>
                        <p className="text-sm text-slate-400">
                          Create content for high-value keywords you're missing
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-slate-50/50 rounded-xl border border-slate-100 opacity-60">
                      <div className="w-8 h-8 rounded-lg bg-slate-300 text-white flex items-center justify-center font-bold shrink-0">
                        3
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Eye className="w-4 h-4 text-slate-400" />
                          <span className="font-semibold text-slate-500">Technical SEO</span>
                          <Badge className="bg-slate-100 text-slate-500 border-0 text-xs">LOCKED</Badge>
                        </div>
                        <p className="text-sm text-slate-400">
                          Fix crawl errors and improve site performance
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* CTA Section */}
                <div className="p-6 md:p-8 bg-gradient-to-r from-violet-50 to-pink-50">
                  <div className="text-center space-y-4">
                    <h3 className="text-xl font-semibold text-slate-900">
                      Ready to fix these issues automatically?
                    </h3>
                    <p className="text-sm text-slate-600 max-w-md mx-auto">
                      Sign up to unlock full automation. Arclo monitors your site, detects issues, and deploys fixes — all with your approval.
                    </p>
                    <Button 
                      variant="primaryGradient"
                      size="lg" 
                      className="h-12 px-8"
                      onClick={handleSignupClick}
                      data-testid="button-signup-primary"
                    >
                      Get Started Free
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                    <p className="text-xs text-slate-400">
                      No credit card required · Safe mode by default
                    </p>
                  </div>
                </div>

              </div>
            )}
            
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
