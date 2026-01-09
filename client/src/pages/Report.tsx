import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { 
  Loader2, CheckCircle2, AlertTriangle, Info, ArrowRight, Rocket, Download, Shield, Zap, TrendingUp,
  DollarSign, Users, MousePointer, Copy, FileText, Printer, ChevronDown, ChevronUp,
  Target, Link2, BarChart2, ExternalLink, Trophy, ArrowDown, ArrowUp
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { DeployOptionsModal } from "@/components/marketing/DeployOptionsModal";
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
  technical?: any;
  performance?: any;
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

function ScoreRing({ score, label, size = "lg" }: { score: number; label: string; size?: "sm" | "lg" }) {
  const sizeClasses = size === "lg" ? "w-24 h-24" : "w-16 h-16";
  const textClasses = size === "lg" ? "text-2xl" : "text-lg";
  
  let color = "text-red-500";
  if (score >= 80) color = "text-green-500";
  else if (score >= 60) color = "text-yellow-500";
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
      <span className="text-sm text-[var(--marketing-text-muted)]">{label}</span>
    </div>
  );
}

function SeverityIcon({ severity }: { severity: "high" | "medium" | "low" }) {
  if (severity === "high") return <AlertTriangle className="w-5 h-5 text-red-500" />;
  if (severity === "medium") return <Info className="w-5 h-5 text-yellow-500" />;
  return <CheckCircle2 className="w-5 h-5 text-blue-500" />;
}

function FindingCard({ finding, index }: { finding: Finding; index: number }) {
  const severityColors = {
    high: "border-red-500/30 bg-red-500/5",
    medium: "border-yellow-500/30 bg-yellow-500/5",
    low: "border-blue-500/30 bg-blue-500/5",
  };

  return (
    <Card className={`border ${severityColors[finding.severity]}`} data-testid={`finding-card-${index}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <SeverityIcon severity={finding.severity} />
          <div className="flex-1">
            <CardTitle className="text-lg">{finding.title}</CardTitle>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                Impact: {finding.impact}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Effort: {finding.effort}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-[var(--marketing-text-muted)] text-sm">{finding.summary}</p>
        {finding.recommendation && (
          <div className="mt-3 p-3 bg-[var(--marketing-bg-soft)] rounded-lg border border-[var(--marketing-border)]">
            <p className="text-sm text-[var(--marketing-text-body)]">
              <strong>Recommendation:</strong> {finding.recommendation}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EstimatedImpactPanel({ impact }: { impact: EstimatedImpact }) {
  return (
    <Card className="mb-8 bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/30" data-testid="impact-panel">
      <CardHeader>
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-red-500" />
          <CardTitle className="text-xl text-red-600">Cost of Inaction</CardTitle>
        </div>
        <CardDescription className="text-[var(--marketing-text-muted)]">Estimated monthly opportunity you're missing</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <MousePointer className="w-8 h-8 mx-auto mb-2 text-orange-500" />
            <div className="text-2xl font-bold text-[var(--marketing-text-heading)]" data-testid="impact-traffic">
              {impact.monthlyTrafficOpportunity.toLocaleString()}
            </div>
            <div className="text-sm text-[var(--marketing-text-muted)]">Monthly Traffic Opportunity</div>
          </div>
          <div className="text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-orange-500" />
            <div className="text-2xl font-bold text-[var(--marketing-text-heading)]" data-testid="impact-leads">
              {impact.estimatedLeadsRange.min} - {impact.estimatedLeadsRange.max}
            </div>
            <div className="text-sm text-[var(--marketing-text-muted)]">Estimated Lost Leads</div>
          </div>
          <div className="text-center">
            <DollarSign className="w-8 h-8 mx-auto mb-2 text-orange-500" />
            <div className="text-2xl font-bold text-[var(--marketing-text-heading)]" data-testid="impact-revenue">
              ${impact.estimatedRevenueRange.min.toLocaleString()} - ${impact.estimatedRevenueRange.max.toLocaleString()}
            </div>
            <div className="text-sm text-[var(--marketing-text-muted)]">Estimated Revenue Range</div>
          </div>
        </div>
        <p className="text-xs text-[var(--marketing-text-subtle)] mt-4 text-center">
          * Estimates based on industry averages and detected issues. Actual results may vary.
        </p>
      </CardContent>
    </Card>
  );
}

function ManualInstructionsSection({ findings }: { findings: Finding[] }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const generateInstructions = () => {
    return findings.map((finding, index) => {
      const steps = finding.implementationSteps || [
        `Identify all ${finding.affectedPages || 'affected'} pages with this issue`,
        `Apply the recommended fix: ${finding.recommendation || finding.summary}`,
        `Test changes in staging environment`,
        `Deploy to production and verify`
      ];
      
      return `
## ${index + 1}. ${finding.title}

**Priority:** ${finding.severity.toUpperCase()}
**Impact:** ${finding.impact}
**Effort:** ${finding.effort}
${finding.riskLevel ? `**Risk Level:** ${finding.riskLevel}` : ''}

### Summary
${finding.summary}

### Implementation Steps
${steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

### Acceptance Criteria
${finding.acceptanceCriteria || `- Issue no longer detected in subsequent scans\n- No negative impact on page performance`}

---
`;
    }).join('\n');
  };

  const copyToClipboard = async () => {
    const instructions = generateInstructions();
    await navigator.clipboard.writeText(instructions);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const printInstructions = () => {
    const content = contentRef.current;
    if (!content) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    printWindow.document.write(`
      <html>
        <head>
          <title>SEO Implementation Plan</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 2rem; line-height: 1.6; }
            h1 { color: #1a1a1a; border-bottom: 2px solid #D4AF37; padding-bottom: 0.5rem; }
            h2 { color: #333; margin-top: 2rem; }
            h3 { color: #555; }
            .priority-high { color: #dc2626; }
            .priority-medium { color: #ca8a04; }
            .priority-low { color: #2563eb; }
            ol { padding-left: 1.5rem; }
            hr { margin: 2rem 0; border: none; border-top: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <h1>SEO Implementation Plan</h1>
          <pre style="white-space: pre-wrap; font-family: inherit;">${generateInstructions()}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <Card className="mb-8 bg-white border-[var(--marketing-border)] shadow-[var(--marketing-shadow-md)]" data-testid="manual-instructions" id="manual-instructions">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#D4AF37]" />
            <CardTitle className="text-xl text-[var(--marketing-text-heading)]">Implementation Plan (DIY)</CardTitle>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={copyToClipboard}
              data-testid="btn-copy-instructions"
            >
              {copied ? <CheckCircle2 className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
              {copied ? 'Copied!' : 'Copy All'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={printInstructions}
              data-testid="btn-print-instructions"
            >
              <Printer className="w-4 h-4 mr-1" />
              Print/PDF
            </Button>
          </div>
        </div>
        <CardDescription className="text-[var(--marketing-text-muted)]">Step-by-step instructions for your development team</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          variant="ghost"
          className="w-full justify-between mb-4 text-[var(--marketing-text-body)]"
          onClick={() => setExpanded(!expanded)}
          data-testid="btn-toggle-instructions"
        >
          <span>{expanded ? 'Hide' : 'Show'} detailed instructions for {findings.length} issues</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
        
        {expanded && (
          <div ref={contentRef} className="space-y-6" data-testid="instructions-content">
            {findings.map((finding, index) => (
              <div key={finding.id} className="border border-[var(--marketing-border)] rounded-lg p-4 bg-[var(--marketing-bg-soft)]">
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-lg font-bold text-[var(--marketing-text-muted)]">{index + 1}.</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-[var(--marketing-text-heading)]">{finding.title}</h4>
                    <div className="flex gap-2 mt-1">
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          finding.severity === 'high' ? 'border-red-500/50 text-red-600' :
                          finding.severity === 'medium' ? 'border-yellow-500/50 text-yellow-600' :
                          'border-blue-500/50 text-blue-600'
                        }`}
                      >
                        Priority: {finding.severity.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="text-xs border-[var(--marketing-border)] text-[var(--marketing-text-muted)]">
                        Impact: {finding.impact}
                      </Badge>
                      <Badge variant="outline" className="text-xs border-[var(--marketing-border)] text-[var(--marketing-text-muted)]">
                        Effort: {finding.effort}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="ml-7 space-y-3">
                  <div>
                    <h5 className="text-sm font-medium text-[var(--marketing-text-body)] mb-1">Summary</h5>
                    <p className="text-sm text-[var(--marketing-text-muted)]">{finding.summary}</p>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-medium text-[var(--marketing-text-body)] mb-1">Implementation Steps</h5>
                    <ol className="text-sm text-[var(--marketing-text-muted)] list-decimal ml-4 space-y-1">
                      {(finding.implementationSteps || [
                        `Identify all ${finding.affectedPages || 'affected'} pages with this issue`,
                        `Apply the recommended fix: ${finding.recommendation || finding.summary}`,
                        `Test changes in staging environment`,
                        `Deploy to production and verify`
                      ]).map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                  
                  <div>
                    <h5 className="text-sm font-medium text-[var(--marketing-text-body)] mb-1">Acceptance Criteria</h5>
                    <p className="text-sm text-[var(--marketing-text-muted)]">
                      {finding.acceptanceCriteria || 'Issue no longer detected in subsequent scans. No negative impact on page performance.'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function KeywordOpportunitiesSection({ fullReport }: { fullReport: FullReport }) {
  const quickWins = fullReport.keywords?.quickWins || [];
  const declining = fullReport.keywords?.declining || [];

  if (quickWins.length === 0 && declining.length === 0) return null;

  return (
    <Card className="mb-8 bg-white border-[var(--marketing-border)] shadow-[var(--marketing-shadow-sm)]" data-testid="keyword-opportunities">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-green-600" />
          <CardTitle className="text-xl text-[var(--marketing-text-heading)]">Keyword Opportunities</CardTitle>
        </div>
        <CardDescription className="text-[var(--marketing-text-muted)]">Keywords with high potential for quick wins and those needing attention</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {quickWins.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-4 h-4 text-yellow-500" />
                <h4 className="font-semibold text-[var(--marketing-text-heading)]">Quick Win Keywords</h4>
                <Badge className="bg-green-100 text-green-700 border-green-300 text-xs">Positions 11-20</Badge>
              </div>
              <div className="space-y-2">
                {quickWins.slice(0, 5).map((kw, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-3 bg-[var(--marketing-bg-soft)] rounded-lg border border-[var(--marketing-border)]"
                    data-testid={`quick-win-keyword-${idx}`}
                  >
                    <span className="font-medium text-[var(--marketing-text-body)]">{kw.keyword}</span>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        Position: #{kw.position}
                      </Badge>
                      {kw.volume && (
                        <span className="text-xs text-[var(--marketing-text-muted)]">
                          {kw.volume.toLocaleString()} /mo
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {declining.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ArrowDown className="w-4 h-4 text-red-500" />
                <h4 className="font-semibold text-[var(--marketing-text-heading)]">Declining Keywords</h4>
                <Badge className="bg-red-100 text-red-700 border-red-300 text-xs">Needs Attention</Badge>
              </div>
              <div className="space-y-2">
                {declining.slice(0, 5).map((kw, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200"
                    data-testid={`declining-keyword-${idx}`}
                  >
                    <span className="font-medium text-[var(--marketing-text-body)]">{kw.keyword}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-green-600">#{kw.oldPosition}</span>
                      <ArrowDown className="w-3 h-3 text-red-500" />
                      <span className="text-xs text-red-600 font-medium">#{kw.newPosition}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CompetitorAnalysisSection({ fullReport }: { fullReport: FullReport }) {
  const competitors = fullReport.competitors || [];
  const contentGaps = fullReport.contentGaps || [];

  if (competitors.length === 0 && contentGaps.length === 0) return null;

  const maxShareOfVoice = Math.max(...competitors.map(c => c.shareOfVoice || 0), 1);

  return (
    <Card className="mb-8 bg-white border-[var(--marketing-border)] shadow-[var(--marketing-shadow-sm)]" data-testid="competitor-analysis">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-purple-600" />
          <CardTitle className="text-xl text-[var(--marketing-text-heading)]">Competitor Analysis</CardTitle>
        </div>
        <CardDescription className="text-[var(--marketing-text-muted)]">How you compare to your top competitors</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {competitors.length > 0 && (
            <div>
              <h4 className="font-semibold text-[var(--marketing-text-heading)] mb-3 flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-500" />
                Top Competitors
              </h4>
              <div className="space-y-3">
                {competitors.slice(0, 5).map((comp, idx) => (
                  <div 
                    key={idx} 
                    className="p-3 bg-[var(--marketing-bg-soft)] rounded-lg border border-[var(--marketing-border)]"
                    data-testid={`competitor-${idx}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-[var(--marketing-text-body)]">{comp.domain}</span>
                      {comp.shareOfVoice !== undefined && (
                        <span className="text-sm text-[var(--marketing-text-muted)]">
                          {comp.shareOfVoice}% share
                        </span>
                      )}
                    </div>
                    {comp.shareOfVoice !== undefined && (
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                          style={{ width: `${(comp.shareOfVoice / maxShareOfVoice) * 100}%` }}
                        />
                      </div>
                    )}
                    {comp.overlap !== undefined && (
                      <div className="mt-2 text-xs text-[var(--marketing-text-muted)]">
                        Keyword overlap: {comp.overlap}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {contentGaps.length > 0 && (
            <div>
              <h4 className="font-semibold text-[var(--marketing-text-heading)] mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-orange-500" />
                Content Gaps
              </h4>
              <div className="space-y-2">
                {contentGaps.slice(0, 5).map((gap, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-3 bg-[var(--marketing-bg-soft)] rounded-lg border border-[var(--marketing-border)]"
                    data-testid={`content-gap-${idx}`}
                  >
                    <span className="text-[var(--marketing-text-body)]">{gap.topic}</span>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${
                        gap.priority === 'high' ? 'border-red-500/50 text-red-600' :
                        gap.priority === 'medium' ? 'border-yellow-500/50 text-yellow-600' :
                        'border-blue-500/50 text-blue-600'
                      }`}
                    >
                      {gap.priority} priority
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function BacklinkProfileSection({ fullReport }: { fullReport: FullReport }) {
  const authority = fullReport.authority;

  if (!authority) return null;

  const { domainAuthority, referringDomains, totalBacklinks } = authority;

  if (domainAuthority === undefined && referringDomains === undefined && totalBacklinks === undefined) return null;

  let daColor = "text-red-500";
  if (domainAuthority !== undefined) {
    if (domainAuthority >= 60) daColor = "text-green-500";
    else if (domainAuthority >= 40) daColor = "text-yellow-500";
    else if (domainAuthority >= 20) daColor = "text-orange-500";
  }

  return (
    <Card className="mb-8 bg-white border-[var(--marketing-border)] shadow-[var(--marketing-shadow-sm)]" data-testid="backlink-profile">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Link2 className="w-5 h-5 text-blue-600" />
          <CardTitle className="text-xl text-[var(--marketing-text-heading)]">Backlink Profile</CardTitle>
        </div>
        <CardDescription className="text-[var(--marketing-text-muted)]">Your site's authority and link portfolio</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-3 gap-6">
          {domainAuthority !== undefined && (
            <div className="text-center p-6 bg-[var(--marketing-bg-soft)] rounded-lg border border-[var(--marketing-border)]" data-testid="domain-authority">
              <div className="w-20 h-20 mx-auto relative flex items-center justify-center mb-3">
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
                    strokeDasharray={`${(domainAuthority / 100) * 251.2} 251.2`}
                    className={daColor}
                    strokeLinecap="round"
                  />
                </svg>
                <span className={`text-2xl font-bold ${daColor}`}>{domainAuthority}</span>
              </div>
              <div className="text-sm font-medium text-[var(--marketing-text-heading)]">Domain Authority</div>
              <div className="text-xs text-[var(--marketing-text-muted)] mt-1">Industry average: 30-50</div>
            </div>
          )}

          {referringDomains !== undefined && (
            <div className="text-center p-6 bg-[var(--marketing-bg-soft)] rounded-lg border border-[var(--marketing-border)]" data-testid="referring-domains">
              <ExternalLink className="w-10 h-10 mx-auto mb-3 text-blue-500" />
              <div className="text-3xl font-bold text-[var(--marketing-text-heading)]">
                {referringDomains.toLocaleString()}
              </div>
              <div className="text-sm font-medium text-[var(--marketing-text-heading)]">Referring Domains</div>
              <div className="text-xs text-[var(--marketing-text-muted)] mt-1">Unique sites linking to you</div>
            </div>
          )}

          {totalBacklinks !== undefined && (
            <div className="text-center p-6 bg-[var(--marketing-bg-soft)] rounded-lg border border-[var(--marketing-border)]" data-testid="total-backlinks">
              <Link2 className="w-10 h-10 mx-auto mb-3 text-green-500" />
              <div className="text-3xl font-bold text-[var(--marketing-text-heading)]">
                {totalBacklinks.toLocaleString()}
              </div>
              <div className="text-sm font-medium text-[var(--marketing-text-heading)]">Total Backlinks</div>
              <div className="text-xs text-[var(--marketing-text-muted)] mt-1">All incoming links</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function Report() {
  const { scanId } = useParams();
  const [, navigate] = useLocation();
  const [deployModalOpen, setDeployModalOpen] = useState(false);
  const [showManualInstructions, setShowManualInstructions] = useState(false);

  const { data: report, isLoading, error } = useQuery<ReportData>({
    queryKey: ["report", scanId],
    queryFn: async () => {
      const res = await fetch(`/api/scan/${scanId}/report`);
      if (!res.ok) throw new Error("Failed to load report");
      return res.json();
    },
    enabled: !!scanId,
  });

  if (!isLoading && report && !report.unlocked) {
    navigate(`/signup?scanId=${scanId}`, { replace: true });
    return null;
  }

  const handleDeployClick = () => {
    setDeployModalOpen(true);
  };

  const handleSelectDiy = () => {
    setDeployModalOpen(false);
    setShowManualInstructions(true);
    setTimeout(() => {
      document.getElementById('manual-instructions')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
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

  if (isLoading) {
    return (
      <MarketingLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
        </div>
      </MarketingLayout>
    );
  }

  if (error || !report) {
    return (
      <MarketingLayout>
        <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
          <AlertTriangle className="w-12 h-12 text-red-500" />
          <h1 className="text-2xl font-bold text-[var(--marketing-text-heading)]">Report Not Found</h1>
          <p className="text-[var(--marketing-text-muted)]">This scan may have expired or doesn't exist.</p>
          <Button onClick={() => navigate("/")} data-testid="btn-back-home">
            Start New Scan
          </Button>
        </div>
      </MarketingLayout>
    );
  }

  const { findings, scoreSummary, targetUrl, estimatedImpact, fullReport } = report;

  const defaultImpact: EstimatedImpact = estimatedImpact || {
    monthlyTrafficOpportunity: Math.round((100 - scoreSummary.overall) * 50),
    estimatedLeadsRange: { 
      min: Math.round((100 - scoreSummary.overall) * 0.5), 
      max: Math.round((100 - scoreSummary.overall) * 2) 
    },
    estimatedRevenueRange: { 
      min: Math.round((100 - scoreSummary.overall) * 100), 
      max: Math.round((100 - scoreSummary.overall) * 500) 
    }
  };

  return (
    <MarketingLayout>
      <div className="py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <Badge className="bg-green-500/20 text-green-600 border-green-500/30 mb-4">
              Full Report Unlocked
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 text-[var(--marketing-text-heading)]" data-testid="report-title">
              SEO Analysis Report
            </h1>
            <p className="text-[var(--marketing-text-muted)] text-lg" data-testid="report-url">
              {targetUrl}
            </p>
          </div>

          <Card className="mb-8 bg-white border-[var(--marketing-border)] shadow-[var(--marketing-shadow-md)]">
            <CardHeader>
              <CardTitle className="text-xl text-[var(--marketing-text-heading)]">Health Scores</CardTitle>
              <CardDescription className="text-[var(--marketing-text-muted)]">How your site performs across key SEO dimensions</CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          <EstimatedImpactPanel impact={defaultImpact} />

          {fullReport && <KeywordOpportunitiesSection fullReport={fullReport} />}
          {fullReport && <CompetitorAnalysisSection fullReport={fullReport} />}
          {fullReport && <BacklinkProfileSection fullReport={fullReport} />}

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-[var(--marketing-text-heading)]">Issues Found ({findings.length})</h2>
              <div className="flex gap-2">
                <Badge variant="outline" className="border-red-500/50 text-red-600">
                  {findings.filter(f => f.severity === "high").length} High
                </Badge>
                <Badge variant="outline" className="border-yellow-500/50 text-yellow-600">
                  {findings.filter(f => f.severity === "medium").length} Medium
                </Badge>
                <Badge variant="outline" className="border-blue-500/50 text-blue-600">
                  {findings.filter(f => f.severity === "low").length} Low
                </Badge>
              </div>
            </div>

            <div className="space-y-4">
              {findings.map((finding, index) => (
                <FindingCard key={finding.id} finding={finding} index={index} />
              ))}
            </div>
          </div>

          {showManualInstructions && <ManualInstructionsSection findings={findings} />}

          <Card className="bg-gradient-to-r from-[#D4AF37]/10 to-[#D4AF37]/5 border-[#D4AF37]/30 shadow-[var(--marketing-shadow-md)]">
            <CardContent className="py-8">
              <div className="text-center">
                <Rocket className="w-12 h-12 mx-auto mb-4 text-[#D4AF37]" />
                <h3 className="text-2xl font-bold mb-2 text-[var(--marketing-text-heading)]">Ready to Fix These Issues?</h3>
                <p className="text-[var(--marketing-text-muted)] mb-6 max-w-2xl mx-auto">
                  Choose how you'd like to proceed: implement fixes yourself, let Arclo handle it automatically, 
                  or have us build and manage your entire site.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    className="bg-[#D4AF37] hover:bg-[#B8972F] text-black font-semibold"
                    onClick={handleDeployClick}
                    data-testid="btn-deploy-fixes"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Deploy Fixes
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/app")}
                    data-testid="btn-go-to-dashboard"
                  >
                    Go to Dashboard
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8 grid md:grid-cols-3 gap-4">
            <Card className="bg-white border-[var(--marketing-border)] shadow-[var(--marketing-shadow-sm)]">
              <CardContent className="pt-6 text-center">
                <Shield className="w-8 h-8 mx-auto mb-3 text-[#D4AF37]" />
                <h4 className="font-semibold mb-1 text-[var(--marketing-text-heading)]">Safe Deployment</h4>
                <p className="text-sm text-[var(--marketing-text-muted)]">All changes are reviewed and reversible</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-[var(--marketing-border)] shadow-[var(--marketing-shadow-sm)]">
              <CardContent className="pt-6 text-center">
                <TrendingUp className="w-8 h-8 mx-auto mb-3 text-[#D4AF37]" />
                <h4 className="font-semibold mb-1 text-[var(--marketing-text-heading)]">Track Progress</h4>
                <p className="text-sm text-[var(--marketing-text-muted)]">Monitor improvements over time</p>
              </CardContent>
            </Card>
            <Card className="bg-white border-[var(--marketing-border)] shadow-[var(--marketing-shadow-sm)]">
              <CardContent className="pt-6 text-center">
                <Download className="w-8 h-8 mx-auto mb-3 text-[#D4AF37]" />
                <h4 className="font-semibold mb-1 text-[var(--marketing-text-heading)]">Export Reports</h4>
                <p className="text-sm text-[var(--marketing-text-muted)]">Share with stakeholders</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <DeployOptionsModal
        open={deployModalOpen}
        onOpenChange={setDeployModalOpen}
        onSelectDiy={handleSelectDiy}
        onSelectAutopilot={handleSelectAutopilot}
        onSelectManaged={handleSelectManaged}
      />
    </MarketingLayout>
  );
}
