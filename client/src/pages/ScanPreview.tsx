import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowRight, Loader2, AlertTriangle, AlertCircle, CheckCircle, 
  Eye, MousePointerClick, Users, Zap, Shield, Gauge, Search, 
  Link2, BarChart2, Target, Check, TrendingDown, DollarSign
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

interface ScanPreviewData {
  findings: Finding[];
  scoreSummary: {
    overall: number;
    technical: number;
    content: number;
    performance: number;
  };
  totalFindings: number;
  targetUrl: string;
}

type HealthStatus = "at-risk" | "needs-attention" | "healthy";

function getHealthStatus(score: number): HealthStatus {
  if (score >= 80) return "healthy";
  if (score >= 60) return "needs-attention";
  return "at-risk";
}

function getHealthConfig(status: HealthStatus) {
  const configs = {
    "at-risk": {
      emoji: "🚨",
      label: "At Risk",
      color: "text-red-600",
      bgColor: "bg-red-100",
      borderColor: "border-red-300",
      Icon: AlertTriangle,
    },
    "needs-attention": {
      emoji: "⚠️",
      label: "Needs Attention", 
      color: "text-amber-600",
      bgColor: "bg-amber-100",
      borderColor: "border-amber-300",
      Icon: AlertCircle,
    },
    "healthy": {
      emoji: "✅",
      label: "Healthy",
      color: "text-green-600",
      bgColor: "bg-green-100",
      borderColor: "border-green-300",
      Icon: CheckCircle,
    },
  };
  return configs[status];
}

function estimateImpact(score: number, findings: number) {
  const severity = 100 - score;
  const baseTraffic = Math.round(severity * 35 + findings * 50);
  const trafficAtRisk = Math.max(200, Math.min(5000, baseTraffic));
  const clicksLost = Math.round(trafficAtRisk * 0.4);
  const leadsMin = Math.round(trafficAtRisk * 0.015);
  const leadsMax = Math.round(trafficAtRisk * 0.04);
  
  return {
    trafficAtRisk,
    clicksLost,
    leadsMin,
    leadsMax,
  };
}

function getCardStatus(score: number): { label: string; color: string; bgColor: string } {
  if (score < 60) return { label: "Critical", color: "text-red-700", bgColor: "bg-red-100" };
  if (score < 80) return { label: "Needs Attention", color: "text-amber-700", bgColor: "bg-amber-100" };
  return { label: "Good", color: "text-green-700", bgColor: "bg-green-100" };
}

interface DiagnosisCardProps {
  title: string;
  icon: React.ReactNode;
  status: { label: string; color: string; bgColor: string };
  impactText: string;
  details?: string;
  onFix: () => void;
}

function DiagnosisCard({ title, icon, status, impactText, details, onFix }: DiagnosisCardProps) {
  return (
    <Card className="bg-white border-slate-200 hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
              {icon}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">{title}</h3>
              <Badge className={`${status.bgColor} ${status.color} text-xs mt-1`}>
                {status.label}
              </Badge>
            </div>
          </div>
        </div>
        <p className="text-sm text-slate-600 mb-3">{impactText}</p>
        {details && (
          <p className="text-xs text-slate-500 mb-3">{details}</p>
        )}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full border-violet-200 text-violet-700 hover:bg-violet-50"
          onClick={onFix}
        >
          Fix This
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

const fixableIssues = [
  { id: "meta", name: "Optimize meta titles & descriptions", benefit: "+15% CTR", explanation: "Compelling, keyword-rich meta tags" },
  { id: "headings", name: "Fix heading structure", benefit: "+10% clarity", explanation: "Proper H1-H6 hierarchy" },
  { id: "speed", name: "Improve page speed", benefit: "+20% engagement", explanation: "Faster load times" },
  { id: "keywords", name: "Target missed keywords", benefit: "+25% reach", explanation: "Content for high-intent terms" },
  { id: "technical", name: "Deploy technical fixes", benefit: "+5% crawlability", explanation: "Indexing improvements" },
];

export default function ScanPreview() {
  const params = useParams<{ scanId: string }>();
  const scanId = params.scanId;
  const [, navigate] = useLocation();
  const [showStickyCTA, setShowStickyCTA] = useState(false);
  const [selectedFixes, setSelectedFixes] = useState<Set<string>>(new Set(fixableIssues.map(f => f.id)));

  useEffect(() => {
    const handleScroll = () => {
      setShowStickyCTA(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  const handleFixClick = () => {
    navigate(`${ROUTES.SIGNUP}?scanId=${scanId}`);
  };

  const toggleFix = (id: string) => {
    const newSelected = new Set(selectedFixes);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedFixes(newSelected);
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
  const healthStatus = preview ? getHealthStatus(preview.scoreSummary.overall) : null;
  const healthConfig = healthStatus ? getHealthConfig(healthStatus) : null;
  const impact = preview ? estimateImpact(preview.scoreSummary.overall, preview.totalFindings) : null;

  return (
    <MarketingLayout>
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          
          {/* Scanning State */}
          {isScanning && (
            <div className="text-center space-y-8">
              <div className="w-20 h-20 rounded-full bg-violet-100 flex items-center justify-center mx-auto">
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
              <Button onClick={() => navigate(ROUTES.LANDING)} size="lg">
                Try Again
              </Button>
            </div>
          )}

          {/* DIAGNOSIS READY STATE */}
          {isReady && preview && healthConfig && impact && (
            <div className="space-y-10">
              
              {/* ===== SECTION 1: HERO DIAGNOSIS ===== */}
              <div className="text-center space-y-6">
                <div className={`w-20 h-20 rounded-full ${healthConfig.bgColor} flex items-center justify-center mx-auto`}>
                  <healthConfig.Icon className={`w-10 h-10 ${healthConfig.color}`} />
                </div>
                
                <div className="space-y-3">
                  <Badge className={`${healthConfig.bgColor} ${healthConfig.color} px-4 py-1.5 text-sm font-medium`}>
                    {healthConfig.emoji} SEO Health: {healthConfig.label}
                  </Badge>
                  
                  <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                    Your website is losing <span className="text-red-600">~{impact.trafficAtRisk.toLocaleString()} visitors</span> monthly
                  </h1>
                  
                  <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                    We found {preview.totalFindings} preventable SEO issues on <span className="font-medium">{preview.targetUrl}</span> that we can fix automatically.
                  </p>
                </div>

                {/* 3 Quick Metrics */}
                <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto pt-4">
                  <div className="text-center p-4 bg-red-50 rounded-xl border border-red-100">
                    <Eye className="w-6 h-6 mx-auto mb-2 text-red-500" />
                    <div className="text-2xl font-bold text-red-700">{impact.trafficAtRisk.toLocaleString()}</div>
                    <div className="text-xs text-red-600">Traffic at risk/mo</div>
                  </div>
                  <div className="text-center p-4 bg-amber-50 rounded-xl border border-amber-100">
                    <MousePointerClick className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                    <div className="text-2xl font-bold text-amber-700">{impact.clicksLost.toLocaleString()}</div>
                    <div className="text-xs text-amber-600">Clicks lost/mo</div>
                  </div>
                  <div className="text-center p-4 bg-orange-50 rounded-xl border border-orange-100">
                    <Users className="w-6 h-6 mx-auto mb-2 text-orange-500" />
                    <div className="text-2xl font-bold text-orange-700">{impact.leadsMin}-{impact.leadsMax}</div>
                    <div className="text-xs text-orange-600">Leads missed/mo</div>
                  </div>
                </div>

                {/* Primary CTA */}
                <Button 
                  size="lg" 
                  className="h-14 px-10 text-lg bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 shadow-lg shadow-violet-500/25"
                  onClick={handleFixClick}
                  data-testid="button-fix-everything"
                >
                  Fix Everything Automatically
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <p className="text-sm text-slate-500">Takes ~3-7 minutes. Safe mode enabled.</p>
              </div>

              {/* ===== SECTION 2: DIAGNOSIS SIGNAL CARDS ===== */}
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-900 text-center">What We Found</h2>
                
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <DiagnosisCard
                    title="Technical SEO"
                    icon={<Gauge className="w-5 h-5 text-slate-600" />}
                    status={getCardStatus(preview.scoreSummary.technical)}
                    impactText="Technical gaps reduce click-through rates even when rankings are strong."
                    details={`Score: ${preview.scoreSummary.technical}/100`}
                    onFix={handleFixClick}
                  />
                  
                  <DiagnosisCard
                    title="Core Web Vitals"
                    icon={<Zap className="w-5 h-5 text-slate-600" />}
                    status={getCardStatus(preview.scoreSummary.performance)}
                    impactText="Slow pages lose users before they convert. Google deprioritizes slow sites."
                    details={`Score: ${preview.scoreSummary.performance}/100`}
                    onFix={handleFixClick}
                  />
                  
                  <DiagnosisCard
                    title="Content Quality"
                    icon={<Search className="w-5 h-5 text-slate-600" />}
                    status={getCardStatus(preview.scoreSummary.content)}
                    impactText="Missing or thin content fails to capture search intent and rankings."
                    details={`Score: ${preview.scoreSummary.content}/100`}
                    onFix={handleFixClick}
                  />
                  
                  <DiagnosisCard
                    title="Keyword Opportunities"
                    icon={<Target className="w-5 h-5 text-slate-600" />}
                    status={getCardStatus(Math.round((preview.scoreSummary.overall + preview.scoreSummary.content) / 2))}
                    impactText="High-intent keywords represent near-term traffic wins with minimal changes."
                    details={`${preview.totalFindings} opportunities found`}
                    onFix={handleFixClick}
                  />
                  
                  <DiagnosisCard
                    title="Competitive Position"
                    icon={<BarChart2 className="w-5 h-5 text-slate-600" />}
                    status={getCardStatus(preview.scoreSummary.overall)}
                    impactText="Competitors are ranking for keywords you're not targeting yet."
                    onFix={handleFixClick}
                  />
                  
                  <DiagnosisCard
                    title="Authority & Trust"
                    icon={<Link2 className="w-5 h-5 text-slate-600" />}
                    status={getCardStatus(Math.round(preview.scoreSummary.overall * 0.9))}
                    impactText="Authority gaps make it harder to sustain rankings long-term."
                    onFix={handleFixClick}
                  />
                </div>
              </div>

              {/* ===== SECTION 3: WHAT THIS IS COSTING YOU ===== */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-8 text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 via-pink-600/10 to-amber-600/10" />
                <div className="relative">
                  <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-amber-400" />
                    What This Is Costing You
                  </h2>
                  <p className="text-slate-300 mb-6 text-sm">
                    These issues don't just affect rankings — they directly reduce inbound calls, form fills, and appointments.
                  </p>
                  
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center p-6 bg-white/5 rounded-xl border border-white/10">
                      <Eye className="w-8 h-8 mx-auto mb-3 text-red-400" />
                      <div className="text-3xl font-bold text-white">{(impact.trafficAtRisk * 12).toLocaleString()}</div>
                      <div className="text-sm text-slate-300 mt-1">Lost Visibility / Year</div>
                    </div>
                    
                    <div className="text-center p-6 bg-white/5 rounded-xl border border-white/10">
                      <MousePointerClick className="w-8 h-8 mx-auto mb-3 text-amber-400" />
                      <div className="text-3xl font-bold text-white">{(impact.clicksLost * 12).toLocaleString()}</div>
                      <div className="text-sm text-slate-300 mt-1">Lost Clicks / Year</div>
                    </div>
                    
                    <div className="text-center p-6 bg-white/5 rounded-xl border border-white/10">
                      <TrendingDown className="w-8 h-8 mx-auto mb-3 text-pink-400" />
                      <div className="text-3xl font-bold text-white">{impact.leadsMin * 12}-{impact.leadsMax * 12}</div>
                      <div className="text-sm text-slate-300 mt-1">Missed Leads / Year</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ===== SECTION 4: ONE-CLICK FIX ENGINE ===== */}
              <div className="bg-white border-2 border-violet-200 rounded-2xl p-8">
                <h2 className="text-xl font-semibold text-slate-900 mb-2">One-Click Fix Engine</h2>
                <p className="text-slate-600 mb-6">Select fixes to apply — no setup required, fully reversible.</p>
                
                <div className="space-y-3 mb-6">
                  {fixableIssues.map((fix) => (
                    <label 
                      key={fix.id}
                      className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedFixes.has(fix.id) 
                          ? "bg-violet-50 border-violet-300" 
                          : "bg-slate-50 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <Checkbox 
                        checked={selectedFixes.has(fix.id)}
                        onCheckedChange={() => toggleFix(fix.id)}
                        className="border-violet-400 data-[state=checked]:bg-violet-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{fix.name}</span>
                          <Badge className="bg-green-100 text-green-700 text-xs">{fix.benefit}</Badge>
                        </div>
                        <p className="text-sm text-slate-500">{fix.explanation}</p>
                      </div>
                      <Check className={`w-5 h-5 ${selectedFixes.has(fix.id) ? "text-violet-600" : "text-transparent"}`} />
                    </label>
                  ))}
                </div>

                <Button 
                  size="lg" 
                  className="w-full h-14 text-lg bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700"
                  onClick={handleFixClick}
                  data-testid="button-fix-selected"
                >
                  Fix {selectedFixes.size} Selected Issues Now
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>

              {/* ===== SECTION 5: TRUST & SAFETY ===== */}
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-slate-900">Safe & Reversible</h3>
                </div>
                <div className="grid md:grid-cols-3 gap-4 text-sm text-slate-600">
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <span>All changes logged and reversible</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <span>No access to private accounts required</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    <span>Safe mode enabled by default</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== STICKY CTA ===== */}
      {showStickyCTA && isReady && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 p-4 shadow-lg z-50">
          <div className="container mx-auto flex items-center justify-between max-w-4xl">
            <div className="hidden md:block">
              <p className="font-semibold text-slate-900">Ready to fix {preview?.totalFindings} issues?</p>
              <p className="text-sm text-slate-500">Takes ~3-7 minutes. Safe mode enabled.</p>
            </div>
            <Button 
              size="lg" 
              className="h-12 px-8 bg-gradient-to-r from-violet-600 to-pink-600 hover:from-violet-700 hover:to-pink-700 shadow-lg"
              onClick={handleFixClick}
              data-testid="button-sticky-fix"
            >
              Fix Everything Automatically
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </MarketingLayout>
  );
}
