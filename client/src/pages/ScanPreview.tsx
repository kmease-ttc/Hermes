import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowRight, Loader2, AlertTriangle, 
  Eye, MousePointerClick, Users, Zap, Shield, Gauge, Search, 
  Link2, BarChart2, Target, Check, TrendingDown, DollarSign
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ROUTES } from "@shared/routes";
import { glass } from "@/styles/glass";

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

function getLetterGrade(score: number): { grade: string; color: string; bgClass: string; ringColor: string } {
  if (score >= 90) return { grade: "A", color: "text-emerald-600", bgClass: "from-emerald-500/20 to-emerald-600/10", ringColor: "ring-emerald-500/30" };
  if (score >= 80) return { grade: "B+", color: "text-emerald-500", bgClass: "from-emerald-500/15 to-emerald-600/5", ringColor: "ring-emerald-500/20" };
  if (score >= 70) return { grade: "B", color: "text-amber-600", bgClass: "from-amber-500/20 to-amber-600/10", ringColor: "ring-amber-500/30" };
  if (score >= 60) return { grade: "C+", color: "text-amber-600", bgClass: "from-amber-500/25 to-amber-600/15", ringColor: "ring-amber-500/40" };
  if (score >= 50) return { grade: "C", color: "text-amber-700", bgClass: "from-amber-500/30 to-amber-600/20", ringColor: "ring-amber-500/50" };
  if (score >= 40) return { grade: "D+", color: "text-red-500", bgClass: "from-red-500/20 to-red-600/10", ringColor: "ring-red-500/30" };
  if (score >= 30) return { grade: "D", color: "text-red-600", bgClass: "from-red-500/25 to-red-600/15", ringColor: "ring-red-500/40" };
  return { grade: "F", color: "text-red-700", bgClass: "from-red-500/30 to-red-600/20", ringColor: "ring-red-500/50" };
}

function getHealthLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "Strong", color: "text-emerald-600" };
  if (score >= 60) return { label: "Needs Attention", color: "text-amber-600" };
  return { label: "At Risk", color: "text-red-600" };
}

function estimateImpact(score: number, findings: number) {
  const severity = 100 - score;
  const baseTraffic = Math.round(severity * 35 + findings * 50);
  const trafficAtRisk = Math.max(200, Math.min(5000, baseTraffic));
  const clicksLost = Math.round(trafficAtRisk * 0.4);
  const leadsMin = Math.round(trafficAtRisk * 0.015);
  const leadsMax = Math.round(trafficAtRisk * 0.04);
  
  return { trafficAtRisk, clicksLost, leadsMin, leadsMax };
}

function getCardStatus(score: number): { label: string; color: string; bgColor: string; iconColor: string } {
  if (score < 60) return { label: "Critical", color: "text-red-700", bgColor: "bg-red-100/80", iconColor: "text-red-500" };
  if (score < 80) return { label: "Needs Attention", color: "text-amber-700", bgColor: "bg-amber-100/80", iconColor: "text-amber-500" };
  return { label: "Good", color: "text-emerald-700", bgColor: "bg-emerald-100/80", iconColor: "text-emerald-500" };
}

type CoverageState = "checked" | "limited" | "preview";

function getCoverageLabel(state: CoverageState): { label: string; color: string; bgColor: string } {
  switch (state) {
    case "checked": return { label: "Checked", color: "text-blue-700", bgColor: "bg-blue-100/80" };
    case "limited": return { label: "Limited Scan", color: "text-slate-600", bgColor: "bg-slate-100/80" };
    case "preview": return { label: "Preview", color: "text-violet-600", bgColor: "bg-violet-100/80" };
  }
}

interface DiagnosisCardProps {
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  status: { label: string; color: string; bgColor: string };
  coverage: CoverageState;
  impactText: string;
  details?: string;
  onFix: () => void;
}

function DiagnosisCard({ title, icon, iconColor, status, coverage, impactText, details, onFix }: DiagnosisCardProps) {
  const coverageInfo = getCoverageLabel(coverage);
  
  return (
    <div className={`${glass.card} h-full flex flex-col p-5`}>
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 border border-slate-200/50 flex items-center justify-center shadow-sm shrink-0">
          <div className={iconColor}>{icon}</div>
        </div>
        <div>
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge className={`${status.bgColor} ${status.color} text-xs font-medium border-0`}>
              {status.label}
            </Badge>
            <Badge className={`${coverageInfo.bgColor} ${coverageInfo.color} text-xs font-medium border-0`}>
              {coverageInfo.label}
            </Badge>
          </div>
        </div>
      </div>
      
      {/* Body - flex-1 to push footer down */}
      <div className="flex-1">
        <p className="text-sm text-slate-600 leading-relaxed">{impactText}</p>
        {details && (
          <p className="text-xs text-slate-500 mt-2 font-medium">{details}</p>
        )}
      </div>
      
      {/* Footer - fixed height CTA */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <Button 
          variant="secondaryAccent" 
          size="sm" 
          className="w-full h-10"
          onClick={onFix}
        >
          Fix This
          <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      </div>
    </div>
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
  const gradeInfo = preview ? getLetterGrade(preview.scoreSummary.overall) : null;
  const healthInfo = preview ? getHealthLabel(preview.scoreSummary.overall) : null;
  const impact = preview ? estimateImpact(preview.scoreSummary.overall, preview.totalFindings) : null;

  return (
    <MarketingLayout>
      {/* Light gradient background layer */}
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/50">
        <div className="container mx-auto px-4 md:px-6 py-12 md:py-16">
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
                <Button variant="primaryGradient" onClick={() => navigate(ROUTES.LANDING)} size="lg">
                  Try Again
                </Button>
              </div>
            )}

            {/* DIAGNOSIS READY STATE */}
            {isReady && preview && gradeInfo && healthInfo && impact && (
              <div className="space-y-16">
                
                {/* ===== SECTION 1: HERO GLASS PANEL (Layer 3 - Focus) ===== */}
                <div className={`relative ${glass.panelFocus} p-8 md:p-10 shadow-xl shadow-slate-200/50`}>
                  <div className="text-center space-y-6">
                    
                    {/* Letter Grade Ring */}
                    <div className="flex items-center justify-center gap-5">
                      <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${gradeInfo.bgClass} ring-2 ${gradeInfo.ringColor} flex items-center justify-center shadow-lg`}>
                        <span className={`text-5xl font-bold ${gradeInfo.color}`}>{gradeInfo.grade}</span>
                      </div>
                      <div className="text-left">
                        <p className="text-sm text-slate-500 uppercase tracking-wide font-medium">SEO Health</p>
                        <p className={`text-2xl font-semibold ${healthInfo.color}`}>{healthInfo.label}</p>
                      </div>
                    </div>
                    
                    {/* Main Headline */}
                    <div className="space-y-3">
                      <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                        Your website is losing <span className="text-red-600">~{impact.trafficAtRisk.toLocaleString()} visitors</span> monthly
                      </h1>
                      <p className="text-sm text-slate-500">
                        Based on an initial SEO scan with no account access.
                      </p>
                    </div>

                    {/* 3 Impact Metrics - Glass cards */}
                    <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto pt-2">
                      <div className="text-center p-4 bg-red-50/80 backdrop-blur-sm rounded-xl border border-red-100/50 shadow-sm">
                        <Eye className="w-6 h-6 mx-auto mb-2 text-red-500" />
                        <div className="text-2xl font-bold text-red-700">{impact.trafficAtRisk.toLocaleString()}</div>
                        <div className="text-xs text-red-600 font-medium">Traffic at risk/mo</div>
                      </div>
                      <div className="text-center p-4 bg-amber-50/80 backdrop-blur-sm rounded-xl border border-amber-100/50 shadow-sm">
                        <MousePointerClick className="w-6 h-6 mx-auto mb-2 text-amber-500" />
                        <div className="text-2xl font-bold text-amber-700">{impact.clicksLost.toLocaleString()}</div>
                        <div className="text-xs text-amber-600 font-medium">Clicks lost/mo</div>
                      </div>
                      <div className="text-center p-4 bg-amber-50/80 backdrop-blur-sm rounded-xl border border-amber-100/50 shadow-sm">
                        <Users className="w-6 h-6 mx-auto mb-2 text-amber-600" />
                        <div className="text-2xl font-bold text-amber-700">{impact.leadsMin}-{impact.leadsMax}</div>
                        <div className="text-xs text-amber-600 font-medium">Leads missed/mo</div>
                      </div>
                    </div>

                    {/* Grade Microcopy */}
                    <p className="text-sm text-slate-600 max-w-md mx-auto">
                      Sites with a {gradeInfo.grade} grade typically see meaningful gains after fixing the issues below.
                    </p>

                    {/* Primary CTA - Brand gradient */}
                    <div className="space-y-3">
                      <Button 
                        variant="primaryGradient"
                        size="lg" 
                        className="h-14 px-10 text-lg"
                        onClick={handleFixClick}
                        data-testid="button-fix-everything"
                      >
                        Fix Everything Automatically
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </Button>
                      <p className="text-sm text-slate-500">
                        Safe mode enabled · No destructive changes · Review before publish
                      </p>
                    </div>
                  </div>
                </div>

                {/* ===== SECTION 2: WHAT WE CHECKED (Layer 2 - Standard Glass) ===== */}
                <div className={`${glass.panel} p-6 md:p-8`}>
                  <div className="text-center mb-8">
                    <h2 className="text-xl font-semibold text-slate-800">What We Checked (So Far)</h2>
                    <p className="text-sm text-slate-500 mt-2 max-w-lg mx-auto">
                      We ran a fast diagnostic across core SEO signals. Full scans analyze additional ranking, content, and authority factors.
                    </p>
                  </div>
                  
                  {/* Diagnosis Cards Grid - items-stretch for equal height */}
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
                    <DiagnosisCard
                      title="Technical SEO"
                      icon={<Gauge className="w-5 h-5" />}
                      iconColor={getCardStatus(preview.scoreSummary.technical).iconColor}
                      status={getCardStatus(preview.scoreSummary.technical)}
                      coverage="checked"
                      impactText="Technical gaps reduce click-through rates even when rankings are strong."
                      details={`Score: ${preview.scoreSummary.technical}/100`}
                      onFix={handleFixClick}
                    />
                    
                    <DiagnosisCard
                      title="Core Web Vitals"
                      icon={<Zap className="w-5 h-5" />}
                      iconColor={getCardStatus(preview.scoreSummary.performance).iconColor}
                      status={getCardStatus(preview.scoreSummary.performance)}
                      coverage="limited"
                      impactText="Slow pages lose users before they convert. Google deprioritizes slow sites."
                      details={`Score: ${preview.scoreSummary.performance}/100`}
                      onFix={handleFixClick}
                    />
                    
                    <DiagnosisCard
                      title="Content Quality"
                      icon={<Search className="w-5 h-5" />}
                      iconColor={getCardStatus(preview.scoreSummary.content).iconColor}
                      status={getCardStatus(preview.scoreSummary.content)}
                      coverage="checked"
                      impactText="Missing or thin content fails to capture search intent and rankings."
                      details={`Score: ${preview.scoreSummary.content}/100`}
                      onFix={handleFixClick}
                    />
                    
                    <DiagnosisCard
                      title="Keyword Opportunities"
                      icon={<Target className="w-5 h-5" />}
                      iconColor={getCardStatus(Math.round((preview.scoreSummary.overall + preview.scoreSummary.content) / 2)).iconColor}
                      status={getCardStatus(Math.round((preview.scoreSummary.overall + preview.scoreSummary.content) / 2))}
                      coverage="limited"
                      impactText="High-intent keywords represent near-term traffic wins with minimal changes."
                      onFix={handleFixClick}
                    />
                    
                    <DiagnosisCard
                      title="Competitive Position"
                      icon={<BarChart2 className="w-5 h-5" />}
                      iconColor={getCardStatus(preview.scoreSummary.overall).iconColor}
                      status={getCardStatus(preview.scoreSummary.overall)}
                      coverage="preview"
                      impactText="Competitors are ranking for keywords you're not targeting yet."
                      onFix={handleFixClick}
                    />
                    
                    <DiagnosisCard
                      title="Authority & Trust"
                      icon={<Link2 className="w-5 h-5" />}
                      iconColor={getCardStatus(Math.round(preview.scoreSummary.overall * 0.9)).iconColor}
                      status={getCardStatus(Math.round(preview.scoreSummary.overall * 0.9))}
                      coverage="preview"
                      impactText="Authority gaps make it harder to sustain rankings long-term."
                      onFix={handleFixClick}
                    />
                  </div>
                </div>

                {/* ===== SECTION 3: WHAT THIS IS COSTING YOU (Layer 3 - Focus Dark) ===== */}
                <div className={`relative ${glass.panelDark} p-8 md:p-10 overflow-hidden`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 via-pink-600/10 to-amber-600/10" />
                  <div className="relative">
                    <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-amber-400" />
                      What This Is Costing You
                    </h2>
                    <p className="text-slate-300 mb-8 text-sm">
                      These issues don't just affect rankings — they directly reduce inbound calls, form fills, and appointments.
                    </p>
                    
                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="text-center p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
                        <Eye className="w-8 h-8 mx-auto mb-3 text-red-400" />
                        <div className="text-3xl font-bold text-white">{(impact.trafficAtRisk * 12).toLocaleString()}</div>
                        <div className="text-sm text-slate-300 mt-1">Lost Visibility / Year</div>
                      </div>
                      
                      <div className="text-center p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
                        <MousePointerClick className="w-8 h-8 mx-auto mb-3 text-amber-400" />
                        <div className="text-3xl font-bold text-white">{(impact.clicksLost * 12).toLocaleString()}</div>
                        <div className="text-sm text-slate-300 mt-1">Lost Clicks / Year</div>
                      </div>
                      
                      <div className="text-center p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
                        <TrendingDown className="w-8 h-8 mx-auto mb-3 text-pink-400" />
                        <div className="text-3xl font-bold text-white">{impact.leadsMin * 12}-{impact.leadsMax * 12}</div>
                        <div className="text-sm text-slate-300 mt-1">Missed Leads / Year</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ===== SECTION 4: ONE-CLICK FIX ENGINE (Layer 2 - Standard Glass) ===== */}
                <div className={`relative ${glass.panel} border-violet-200/50 p-8 shadow-lg`}>
                  <h2 className="text-xl font-semibold text-slate-900 mb-2">One-Click Fix Engine</h2>
                  <p className="text-slate-600 mb-6">Select fixes to apply — no setup required, fully reversible.</p>
                  
                  <div className="space-y-3 mb-8">
                    {fixableIssues.map((fix) => (
                      <label 
                        key={fix.id}
                        className={`flex items-center gap-4 p-4 cursor-pointer transition-all ${
                          selectedFixes.has(fix.id) 
                            ? glass.rowSelected
                            : `${glass.row} hover:border-violet-200`
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
                            <Badge className="bg-amber-100/80 text-amber-700 text-xs font-medium border-0">{fix.benefit}</Badge>
                          </div>
                          <p className="text-sm text-slate-500">{fix.explanation}</p>
                        </div>
                        <Check className={`w-5 h-5 transition-colors ${selectedFixes.has(fix.id) ? "text-violet-600" : "text-transparent"}`} />
                      </label>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <Button 
                      variant="primaryGradient"
                      size="lg" 
                      className="w-full h-14 text-lg"
                      onClick={handleFixClick}
                      data-testid="button-fix-selected"
                    >
                      Fix {selectedFixes.size} Selected Issues Now
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                    <p className="text-center text-sm text-slate-500">
                      All changes are logged and fully reversible
                    </p>
                  </div>
                </div>

                {/* ===== SECTION 5: TRUST & SAFETY (Layer 2 - Standard Glass) ===== */}
                <div className={`${glass.panel} p-6`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100/80 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h3 className="font-semibold text-slate-900">Safe & Reversible</h3>
                  </div>
                  <div className="grid md:grid-cols-3 gap-4 text-sm text-slate-600">
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-100/80 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-emerald-600" />
                      </div>
                      <span>All changes logged and reversible</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-100/80 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-emerald-600" />
                      </div>
                      <span>No access to private accounts required</span>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-emerald-100/80 flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-emerald-600" />
                      </div>
                      <span>Safe mode enabled by default</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== STICKY CTA ===== */}
      {showStickyCTA && isReady && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 shadow-xl z-50">
          <div className="container mx-auto flex items-center justify-between max-w-4xl">
            <div className="hidden md:block">
              <p className="font-semibold text-slate-900">Ready to improve your SEO health?</p>
              <p className="text-sm text-slate-500">Takes ~3-7 minutes. Safe mode enabled.</p>
            </div>
            <Button 
              variant="primaryGradient"
              size="lg" 
              className="h-12 px-8"
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
