import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { 
  Loader2, CheckCircle2, AlertTriangle, AlertCircle, ArrowRight, Rocket, Shield, Zap, TrendingUp,
  DollarSign, Users, MousePointer, Eye, Target, Link2, BarChart2, Gauge, Search, Check,
  Share2, Clock, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { DeployOptionsModal } from "@/components/marketing/DeployOptionsModal";
import { ShareReportModal } from "@/components/reports/ShareReportModal";
import { ROUTES } from "@shared/routes";

interface Finding {
  id: string;
  title: string;
  severity: "high" | "medium" | "low";
  impact: string;
  effort: string;
  summary: string;
  recommendation?: string;
  affectedPages?: number;
  implementationSteps?: string[];
  riskLevel?: string;
  acceptanceCriteria?: string;
}

interface ScoreSummary {
  overall: number;
  technical: number;
  content: number;
  performance: number;
  serp?: number;
  authority?: number;
}

interface FullReport {
  technical?: {
    metaCoverage?: number;
    indexability?: number;
    issues?: number;
  };
  performance?: {
    lcp?: number;
    cls?: number;
    inp?: number;
    score?: number;
  };
  serp?: any;
  competitive?: any;
  backlinks?: any;
  keywords?: {
    quickWins?: Array<{ keyword: string; position: number; volume?: number }>;
    declining?: Array<{ keyword: string; oldPosition: number; newPosition: number }>;
  };
  competitors?: Array<{ domain: string; shareOfVoice?: number; overlap?: number }>;
  contentGaps?: Array<{ topic: string; priority: string }>;
  authority?: {
    domainAuthority?: number;
    referringDomains?: number;
    totalBacklinks?: number;
  };
}

interface EstimatedImpact {
  monthlyTrafficOpportunity: number;
  estimatedLeadsRange: { min: number; max: number };
  estimatedRevenueRange: { min: number; max: number };
}

interface ReportData {
  findings: Finding[];
  scoreSummary: ScoreSummary;
  totalFindings: number;
  targetUrl: string;
  unlocked: boolean;
  estimatedImpact?: EstimatedImpact;
  fullReport?: FullReport;
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
    },
    "needs-attention": {
      emoji: "⚠️",
      label: "Needs Attention",
      color: "text-amber-600",
      bgColor: "bg-amber-100",
      borderColor: "border-amber-300",
    },
    "healthy": {
      emoji: "✅",
      label: "Healthy",
      color: "text-green-600",
      bgColor: "bg-green-100",
      borderColor: "border-green-300",
    },
  };
  return configs[status];
}

function getCardStatus(score: number | undefined): { label: string; color: string; bgColor: string } {
  if (score === undefined || score < 60) {
    return { label: "Critical", color: "text-red-700", bgColor: "bg-red-100" };
  }
  if (score < 80) {
    return { label: "Needs Attention", color: "text-amber-700", bgColor: "bg-amber-100" };
  }
  return { label: "Good", color: "text-green-700", bgColor: "bg-green-100" };
}

function ScoreRing({ score, label, size = "lg" }: { score: number; label: string; size?: "sm" | "lg" }) {
  const sizeClasses = size === "lg" ? "w-24 h-24" : "w-16 h-16";
  const textClasses = size === "lg" ? "text-2xl" : "text-lg";
  
  let color = "text-red-500";
  if (score >= 80) color = "text-green-500";
  else if (score >= 60) color = "text-amber-500";
  else if (score >= 40) color = "text-orange-500";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`${sizeClasses} relative flex items-center justify-center`}>
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-slate-200"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            strokeDasharray={`${(score / 100) * 251.2} 251.2`}
            className={color}
            strokeLinecap="round"
          />
        </svg>
        <span className={`${textClasses} font-bold ${color}`}>{score}</span>
      </div>
      <span className="text-sm text-slate-500">{label}</span>
    </div>
  );
}

function DiagnosisCard({ 
  title, 
  icon: Icon, 
  status, 
  impactSentence, 
  metrics,
  onFixClick 
}: { 
  title: string;
  icon: React.ElementType;
  status: { label: string; color: string; bgColor: string };
  impactSentence: string;
  metrics?: React.ReactNode;
  onFixClick: () => void;
}) {
  return (
    <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow" data-testid={`diagnosis-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Icon className="w-5 h-5 text-slate-700" />
            </div>
            <CardTitle className="text-lg text-slate-900">{title}</CardTitle>
          </div>
          <Badge className={`${status.bgColor} ${status.color} border-0`}>
            {status.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-slate-600">{impactSentence}</p>
        {metrics && <div className="text-sm">{metrics}</div>}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full border-slate-300 text-slate-700 hover:bg-slate-50"
          onClick={onFixClick}
          data-testid={`btn-fix-${title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          Fix This
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}

interface FixableIssue {
  id: string;
  name: string;
  explanation: string;
  benefit: string;
  checked: boolean;
}

export default function Report() {
  const { scanId } = useParams();
  const [, navigate] = useLocation();
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [fixableIssues, setFixableIssues] = useState<FixableIssue[]>([
    { id: "meta", name: "Optimize meta titles & descriptions", explanation: "Improve click-through rates from search results", benefit: "+15-25% CTR improvement", checked: true },
    { id: "headings", name: "Fix heading structure", explanation: "Better content hierarchy for search engines", benefit: "+10% content relevance", checked: true },
    { id: "speed", name: "Improve page speed", explanation: "Faster pages rank higher and convert better", benefit: "+20% faster load time", checked: true },
    { id: "keywords", name: "Create keyword-optimized pages", explanation: "Target high-value search terms you're missing", benefit: "+30% keyword coverage", checked: true },
    { id: "technical", name: "Deploy technical fixes", explanation: "Fix crawlability and indexing issues", benefit: "+40% indexation rate", checked: true },
  ]);

  const { data: report, isLoading, error } = useQuery<ReportData>({
    queryKey: ["report", scanId],
    queryFn: async () => {
      const res = await fetch(`/api/scan/${scanId}/report`);
      if (!res.ok) throw new Error("Failed to load report");
      return res.json();
    },
    enabled: !!scanId,
  });

  useEffect(() => {
    const handleScroll = () => {
      setShowStickyBar(window.scrollY > 600);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isLoading && report && !report.unlocked) {
    navigate(`/signup?scanId=${scanId}`, { replace: true });
    return null;
  }

  const handleDeployClick = () => {
    setDeployModalOpen(true);
  };

  const handleSelectDiy = () => {
    setDeployModalOpen(false);
  };

  const handleSelectAutopilot = async () => {
    setDeployModalOpen(false);
    try {
      const res = await fetch('/api/billing/checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scanId, plan: 'core' })
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        navigate('/app');
      }
    } catch (err) {
      navigate('/app');
    }
  };

  const handleSelectManaged = () => {
    setDeployModalOpen(false);
    navigate(ROUTES.MANAGED_SITE);
  };

  const toggleIssue = (id: string) => {
    setFixableIssues(prev => prev.map(issue => 
      issue.id === id ? { ...issue, checked: !issue.checked } : issue
    ));
  };

  if (isLoading) {
    return (
      <MarketingLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
        </div>
      </MarketingLayout>
    );
  }

  if (error || !report) {
    return (
      <MarketingLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <AlertTriangle className="w-12 h-12 text-red-500" />
          <h1 className="text-2xl font-bold text-slate-900">Report Not Found</h1>
          <p className="text-slate-500">This scan may have expired or doesn't exist.</p>
          <Button onClick={() => navigate("/")} data-testid="btn-back-home">
            Start New Scan
          </Button>
        </div>
      </MarketingLayout>
    );
  }

  const { scoreSummary, targetUrl, estimatedImpact, fullReport } = report;

  const healthStatus = getHealthStatus(scoreSummary.overall);
  const healthConfig = getHealthConfig(healthStatus);

  const trafficAtRisk = estimatedImpact?.monthlyTrafficOpportunity || Math.round((100 - scoreSummary.overall) * 50);
  const clicksLost = Math.round(trafficAtRisk * 0.3);
  const leadsMissed = estimatedImpact?.estimatedLeadsRange || { 
    min: Math.round(trafficAtRisk * 0.02), 
    max: Math.round(trafficAtRisk * 0.05) 
  };

  const technicalStatus = getCardStatus(scoreSummary.technical);
  const performanceStatus = getCardStatus(scoreSummary.performance);
  const competitiveStatus = getCardStatus(fullReport?.competitors?.length ? 65 : 50);
  const keywordStatus = getCardStatus(fullReport?.keywords?.quickWins?.length ? 70 : 55);
  const authorityStatus = getCardStatus(fullReport?.authority?.domainAuthority);

  const selectedFixCount = fixableIssues.filter(i => i.checked).length;

  return (
    <MarketingLayout>
      <div className="min-h-screen">
        {/* SECTION 1: Hero Diagnosis */}
        <section className="bg-gradient-to-b from-slate-50 to-white py-12 md:py-16 px-4" data-testid="section-hero">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShareModalOpen(true)}
                className="border-slate-300 text-slate-600 hover:bg-slate-50"
                data-testid="btn-share-report"
              >
                <Share2 className="w-4 h-4 mr-1" />
                Share Report
              </Button>
            </div>
            
            <div className={`inline-flex items-center gap-2 px-6 py-3 rounded-full text-xl font-semibold mb-6 ${healthConfig.bgColor} ${healthConfig.borderColor} border-2`}>
              <span>{healthConfig.emoji}</span>
              <span className={healthConfig.color}>SEO Health: {healthConfig.label}</span>
            </div>
            
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-slate-900 mb-4 leading-tight" data-testid="diagnosis-headline">
              Your website is losing an estimated <span className="text-red-600">{trafficAtRisk.toLocaleString()} visitors</span> and <span className="text-red-600">{leadsMissed.min}-{leadsMissed.max} leads</span> per month due to preventable SEO issues we can fix automatically.
            </h1>
            
            <p className="text-slate-500 mb-8" data-testid="report-url">
              Analysis for: {targetUrl}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
              <Card className="bg-white border-slate-200 shadow-sm" data-testid="metric-traffic">
                <CardContent className="pt-6 text-center">
                  <Eye className="w-8 h-8 mx-auto mb-2 text-red-500" />
                  <div className="text-3xl font-bold text-slate-900">{trafficAtRisk.toLocaleString()}</div>
                  <div className="text-sm text-slate-500">Traffic at risk / month</div>
                </CardContent>
              </Card>
              
              <Card className="bg-white border-slate-200 shadow-sm" data-testid="metric-clicks">
                <CardContent className="pt-6 text-center">
                  <MousePointer className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                  <div className="text-3xl font-bold text-slate-900">{clicksLost.toLocaleString()}</div>
                  <div className="text-sm text-slate-500">Clicks lost / month</div>
                </CardContent>
              </Card>
              
              <Card className="bg-white border-slate-200 shadow-sm" data-testid="metric-leads">
                <CardContent className="pt-6 text-center">
                  <Users className="w-8 h-8 mx-auto mb-2 text-violet-500" />
                  <div className="text-3xl font-bold text-slate-900">{leadsMissed.min}-{leadsMissed.max}</div>
                  <div className="text-sm text-slate-500">Leads missed / month</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* SECTION 2: Diagnosis Signal Cards */}
        <section className="py-12 px-4 bg-white" data-testid="section-diagnosis-cards">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">What's Affecting Your Rankings</h2>
            <p className="text-slate-500 text-center mb-8">Click "Fix This" on any card to address that specific issue</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <DiagnosisCard
                title="Technical SEO Health"
                icon={Gauge}
                status={technicalStatus}
                impactSentence={`${fullReport?.technical?.issues || "Several"} technical issues are preventing search engines from properly indexing your pages.`}
                metrics={
                  <div className="flex gap-4 text-slate-500">
                    <span>Meta Coverage: {fullReport?.technical?.metaCoverage || scoreSummary.technical}%</span>
                  </div>
                }
                onFixClick={handleDeployClick}
              />
              
              <DiagnosisCard
                title="Core Web Vitals (Speed)"
                icon={Zap}
                status={performanceStatus}
                impactSentence="Slow page speed is hurting your search rankings and causing visitors to leave before converting."
                metrics={
                  <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                    {fullReport?.performance?.lcp && <span>LCP: {fullReport.performance.lcp}s</span>}
                    {fullReport?.performance?.cls !== undefined && <span>CLS: {fullReport.performance.cls}</span>}
                    {fullReport?.performance?.inp && <span>INP: {fullReport.performance.inp}ms</span>}
                    {!fullReport?.performance && <span>Score: {scoreSummary.performance}/100</span>}
                  </div>
                }
                onFixClick={handleDeployClick}
              />
              
              <DiagnosisCard
                title="Competitive Landscape"
                icon={BarChart2}
                status={competitiveStatus}
                impactSentence="Your competitors are outranking you for valuable keywords in your market."
                metrics={
                  fullReport?.competitors?.length ? (
                    <div className="space-y-1">
                      {fullReport.competitors.slice(0, 3).map((comp, idx) => (
                        <div key={idx} className="text-xs text-slate-500 flex justify-between">
                          <span>{comp.domain}</span>
                          {comp.shareOfVoice && <span>{comp.shareOfVoice}% share</span>}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">Competitor data unavailable</span>
                  )
                }
                onFixClick={handleDeployClick}
              />
              
              <DiagnosisCard
                title="Keyword Opportunities"
                icon={Search}
                status={keywordStatus}
                impactSentence="You're missing out on quick-win keywords where you could rank on page 1 with minimal effort."
                metrics={
                  fullReport?.keywords?.quickWins?.length ? (
                    <div className="space-y-1">
                      {fullReport.keywords.quickWins.slice(0, 3).map((kw, idx) => (
                        <div key={idx} className="text-xs text-slate-500 flex justify-between">
                          <span className="truncate flex-1">{kw.keyword}</span>
                          <span className="ml-2">#{kw.position}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-500">No quick wins identified yet</span>
                  )
                }
                onFixClick={handleDeployClick}
              />
              
              <DiagnosisCard
                title="Domain Authority"
                icon={Link2}
                status={authorityStatus}
                impactSentence="Your domain authority affects how well you rank against competitors for the same keywords."
                metrics={
                  <div className="flex gap-4 text-slate-500">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-slate-900">
                        {fullReport?.authority?.domainAuthority || "N/A"}
                      </div>
                      <div className="text-xs">DA Score</div>
                    </div>
                    {fullReport?.authority?.referringDomains && (
                      <div className="text-center">
                        <div className="text-2xl font-bold text-slate-900">
                          {fullReport.authority.referringDomains}
                        </div>
                        <div className="text-xs">Ref. Domains</div>
                      </div>
                    )}
                  </div>
                }
                onFixClick={handleDeployClick}
              />
            </div>
          </div>
        </section>

        {/* SECTION 3: What This Is Costing You */}
        <section className="py-16 px-4 bg-slate-900 relative overflow-hidden" data-testid="section-cost">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 via-pink-600/10 to-amber-600/10" />
          <div className="max-w-4xl mx-auto relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3 text-center">What This Is Costing You</h2>
            <p className="text-slate-400 text-center mb-10">Every day without these fixes means lost opportunities</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center backdrop-blur-sm" data-testid="cost-visibility">
                <Eye className="w-10 h-10 mx-auto mb-3 text-red-400" />
                <div className="text-3xl font-bold text-white mb-1">{Math.round(trafficAtRisk * 12).toLocaleString()}</div>
                <div className="text-lg text-slate-300 mb-2">Lost Visibility / Year</div>
                <p className="text-sm text-slate-400">Potential customers who never see your business in search results</p>
              </div>
              
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center backdrop-blur-sm" data-testid="cost-clicks">
                <MousePointer className="w-10 h-10 mx-auto mb-3 text-amber-400" />
                <div className="text-3xl font-bold text-white mb-1">{Math.round(clicksLost * 12).toLocaleString()}</div>
                <div className="text-lg text-slate-300 mb-2">Lost Clicks / Year</div>
                <p className="text-sm text-slate-400">People who would have visited your site but went to competitors instead</p>
              </div>
              
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center backdrop-blur-sm" data-testid="cost-leads">
                <DollarSign className="w-10 h-10 mx-auto mb-3 text-green-400" />
                <div className="text-3xl font-bold text-white mb-1">{leadsMissed.min * 12}-{leadsMissed.max * 12}</div>
                <div className="text-lg text-slate-300 mb-2">Missed Leads / Year</div>
                <p className="text-sm text-slate-400">Customers ready to buy who never found you online</p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: One-Click Fix Engine */}
        <section className="py-12 px-4 bg-white" data-testid="section-fix-engine">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-2 text-center">One-Click Fix Engine</h2>
            <p className="text-slate-500 text-center mb-8">Select the issues you want us to fix automatically</p>
            
            <div className="space-y-3 mb-8">
              {fixableIssues.map((issue) => (
                <div 
                  key={issue.id}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    issue.checked 
                      ? "border-violet-300 bg-violet-50" 
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                  onClick={() => toggleIssue(issue.id)}
                  data-testid={`fix-item-${issue.id}`}
                >
                  <div className="flex items-start gap-4">
                    <Checkbox 
                      checked={issue.checked} 
                      onCheckedChange={() => toggleIssue(issue.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-900">{issue.name}</span>
                        <Badge className="bg-green-100 text-green-700 border-0 text-xs">
                          {issue.benefit}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500">{issue.explanation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              size="lg"
              className="w-full text-lg font-semibold text-white shadow-lg hover:shadow-xl transition-all"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #EC4899)" }}
              onClick={handleDeployClick}
              disabled={selectedFixCount === 0}
              data-testid="btn-fix-selected"
            >
              <Rocket className="w-5 h-5 mr-2" />
              Fix {selectedFixCount} Selected Issue{selectedFixCount !== 1 ? "s" : ""} Now
            </Button>
          </div>
        </section>

        {/* SECTION 6: Trust & Safety */}
        <section className="py-12 px-4 bg-slate-50" data-testid="section-trust">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">Safe & Secure</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3" data-testid="trust-reversible">
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <div className="font-medium text-slate-900">Changes logged and reversible</div>
                  <p className="text-sm text-slate-500">Every change is tracked and can be undone instantly</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3" data-testid="trust-no-access">
                <div className="p-2 bg-blue-100 rounded-full">
                  <Shield className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <div className="font-medium text-slate-900">No account access required</div>
                  <p className="text-sm text-slate-500">We don't need your CMS or hosting passwords</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3" data-testid="trust-safe-mode">
                <div className="p-2 bg-violet-100 rounded-full">
                  <TrendingUp className="w-5 h-5 text-violet-600" />
                </div>
                <div>
                  <div className="font-medium text-slate-900">Safe mode enabled by default</div>
                  <p className="text-sm text-slate-500">Conservative changes that won't break your site</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Score Summary (optional additional context) */}
        <section className="py-12 px-4 bg-white border-t border-slate-200" data-testid="section-scores">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-6 text-center">Health Score Breakdown</h2>
            <div className="flex flex-wrap justify-center gap-8">
              <ScoreRing score={scoreSummary.overall} label="Overall" size="lg" />
              <ScoreRing score={scoreSummary.technical} label="Technical" size="sm" />
              <ScoreRing score={scoreSummary.content} label="Content" size="sm" />
              <ScoreRing score={scoreSummary.performance} label="Performance" size="sm" />
              {scoreSummary.serp !== undefined && (
                <ScoreRing score={scoreSummary.serp} label="SERP" size="sm" />
              )}
              {scoreSummary.authority !== undefined && (
                <ScoreRing score={scoreSummary.authority} label="Authority" size="sm" />
              )}
            </div>
          </div>
        </section>
      </div>

      {/* SECTION 5: Sticky CTA */}
      {showStickyBar && (
        <div 
          className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg py-3 px-4"
          data-testid="sticky-cta"
        >
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="hidden sm:block">
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Clock className="w-4 h-4" />
                <span>Takes ~3-7 minutes. Safe mode enabled.</span>
              </div>
            </div>
            <Button
              size="lg"
              className="flex-1 sm:flex-none text-white font-semibold shadow-lg"
              style={{ background: "linear-gradient(135deg, #8B5CF6, #EC4899)" }}
              onClick={handleDeployClick}
              data-testid="btn-sticky-fix"
            >
              <Zap className="w-4 h-4 mr-2" />
              Fix Everything Automatically
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      <DeployOptionsModal
        open={deployModalOpen}
        onOpenChange={setDeployModalOpen}
        onSelectDiy={handleSelectDiy}
        onSelectAutopilot={handleSelectAutopilot}
        onSelectManaged={handleSelectManaged}
      />

      {scanId && (
        <ShareReportModal
          open={shareModalOpen}
          onOpenChange={setShareModalOpen}
          scanId={scanId}
        />
      )}
    </MarketingLayout>
  );
}
