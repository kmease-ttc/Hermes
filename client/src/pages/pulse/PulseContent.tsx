import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  TrendingDown, 
  Activity, 
  RefreshCw,
  Lightbulb,
  ArrowRight,
  Sparkles,
  Wrench,
  Search,
  Loader2,
  Heart,
  TrendingUp,
} from "lucide-react";
import { KeyMetricsGrid } from "@/components/key-metrics";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useSiteContext } from "@/hooks/useSiteContext";
import { useCrewStatus } from "@/hooks/useCrewStatus";
import { getCrewMember } from "@/config/agents";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  CrewDashboardShell,
  type CrewIdentity,
  type KpiDescriptor,
  type InspectorTab,
  type MissionPromptConfig,
  type HeaderAction,
} from "@/components/crew-dashboard";

interface HealthCheck {
  name: string;
  status: 'healthy' | 'warning' | 'error';
}

interface Drop {
  date: string;
  source: string;
  metric: string;
  dropPercent: string;
  value: number;
  avg7d: number;
  zScore: number;
}

interface RootCause {
  title: string;
  confidence: 'high' | 'medium' | 'low';
  description?: string;
}

function parseReport(markdown: string) {
  const healthChecks: HealthCheck[] = [];
  const drops: Drop[] = [];
  const rootCauses: RootCause[] = [];
  let period = '';
  let domain = '';
  let totalDrops = 0;

  const lines = markdown.split('\n');
  let inHealthTable = false;
  let inDropsTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('**Period:**')) {
      period = line.replace('**Period:**', '').trim();
    }
    if (line.startsWith('**Domain:**')) {
      domain = line.replace('**Domain:**', '').trim();
    }

    if (line.includes('| Check | Status |')) {
      inHealthTable = true;
      continue;
    }
    if (inHealthTable && line.startsWith('|') && !line.includes('---')) {
      const parts = line.split('|').map(p => p.trim()).filter(Boolean);
      if (parts.length >= 2 && parts[0] !== 'Check') {
        const name = parts[0];
        const statusText = parts[1];
        let status: 'healthy' | 'warning' | 'error' = 'healthy';
        if (statusText.includes('✅') || statusText.toLowerCase().includes('healthy') || statusText.toLowerCase().includes('none')) {
          status = 'healthy';
        } else if (statusText.includes('⚠') || statusText.toLowerCase().includes('warning')) {
          status = 'warning';
        } else if (statusText.includes('❌') || statusText.toLowerCase().includes('error')) {
          status = 'error';
        }
        if (!name.includes('Total Drops')) {
          healthChecks.push({ name, status });
        }
      }
    }
    if (inHealthTable && !line.startsWith('|')) {
      inHealthTable = false;
    }

    if (line.includes('Total Drops Detected')) {
      const match = line.match(/(\d+)/);
      if (match) totalDrops = parseInt(match[1]);
    }

    if (line.includes('| Date | Source | Metric |')) {
      inDropsTable = true;
      continue;
    }
    if (inDropsTable && line.startsWith('|') && !line.includes('---')) {
      const parts = line.split('|').map(p => p.trim()).filter(Boolean);
      if (parts.length >= 6 && parts[0] !== 'Date') {
        drops.push({
          date: parts[0],
          source: parts[1],
          metric: parts[2],
          dropPercent: parts[3],
          value: parseInt(parts[4]) || 0,
          avg7d: parseInt(parts[5]) || 0,
          zScore: parseFloat(parts[6]) || 0,
        });
      }
    }
    if (inDropsTable && !line.startsWith('|')) {
      inDropsTable = false;
    }

    if (line.startsWith('### 🟡') || line.startsWith('### 🟠') || line.startsWith('### 🔴') || line.startsWith('### 🟢')) {
      const titleMatch = line.match(/###\s*[🟡🟠🔴🟢]\s*\d+\.\s*(.+)/);
      if (titleMatch) {
        let confidence: 'high' | 'medium' | 'low' = 'medium';
        if (line.includes('🔴')) confidence = 'high';
        else if (line.includes('🟠')) confidence = 'medium';
        else if (line.includes('🟡')) confidence = 'low';
        rootCauses.push({ title: titleMatch[1], confidence });
      }
    }
  }

  return { healthChecks, drops, rootCauses, period, domain, totalDrops };
}

function StatusIcon({ status }: { status: 'healthy' | 'warning' | 'error' }) {
  if (status === 'healthy') return <CheckCircle className="w-5 h-5 text-semantic-success" />;
  if (status === 'warning') return <AlertTriangle className="w-5 h-5 text-semantic-warning" />;
  return <XCircle className="w-5 h-5 text-semantic-danger" />;
}

function getSeverity(zScore: number): 'severe' | 'moderate' | 'mild' {
  const absZ = Math.abs(zScore);
  if (absZ >= 3) return 'severe';
  if (absZ >= 2) return 'moderate';
  return 'mild';
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getAIInterpretation(drop: Drop): string {
  const metric = drop.metric.toLowerCase();
  const percentDrop = parseFloat(drop.dropPercent.replace('%', '').replace('-', ''));
  
  if (metric.includes('click') && percentDrop > 50) {
    return "Search clicks dropped sharply while impressions may have remained stable, suggesting a ranking or CTR issue rather than a demand drop. This often happens after SERP layout changes or title/meta mismatches.";
  }
  if (metric.includes('click') && percentDrop <= 50) {
    return "Moderate decline in search clicks. This could indicate seasonal fluctuations, algorithm updates, or competitor activity. Review your top performing pages for any changes.";
  }
  if (metric.includes('session') || metric.includes('user')) {
    return "Traffic decline detected. Check for technical issues like slow page load, broken tracking, or crawl errors. Also verify no significant content was removed or modified.";
  }
  if (metric.includes('impression')) {
    return "Visibility in search results has decreased. This may indicate indexing issues, ranking drops, or reduced search demand for your target keywords.";
  }
  return "Anomaly detected in this metric. Review recent changes to your site, check Google Search Console for any notifications, and compare with industry trends.";
}

function getSuggestedActions(drop: Drop): { primary: string; secondary: string[] } {
  const metric = drop.metric.toLowerCase();
  
  if (metric.includes('click')) {
    return {
      primary: "Review recent ranking changes for top 5 affected queries",
      secondary: [
        "Check title/meta changes in the last 7 days",
        "Verify no indexing or crawl errors for ranking pages"
      ]
    };
  }
  if (metric.includes('session') || metric.includes('user')) {
    return {
      primary: "Check GA4 realtime to verify tracking is working",
      secondary: [
        "Review page speed metrics for any degradation",
        "Check for any 4xx/5xx errors on key landing pages"
      ]
    };
  }
  if (metric.includes('impression')) {
    return {
      primary: "Review Search Console for manual actions or penalties",
      secondary: [
        "Check URL Inspection for indexing issues",
        "Analyze keyword rankings for your target terms"
      ]
    };
  }
  return {
    primary: "Investigate the root cause of this anomaly",
    secondary: [
      "Check for any recent site changes",
      "Compare with industry trends and seasonality"
    ]
  };
}

function dropToAnomalyId(drop: Drop): string {
  return `${drop.date}_${drop.source}_${drop.metric}`.replace(/\s+/g, '_').toLowerCase();
}

interface ActionOutput {
  findings: Array<{ type: string; data: any; summary: string }>;
  changes: Array<{ type: string; url: string; before: any; after: any }>;
  nextSteps: string[];
  summary: string;
}

interface ActionRun {
  runId: string;
  status: string;
  outputJson: ActionOutput | null;
  createdAt: string;
}

function DropActionResults({ actionRun }: { actionRun: ActionRun }) {
  const output = actionRun.outputJson;
  if (!output) return null;

  return (
    <div className="mt-4 p-4 bg-semantic-success-soft border border-semantic-success-border rounded-lg space-y-3">
      <div className="flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-semantic-success" />
        <span className="font-medium text-sm text-semantic-success">Analysis Complete</span>
        <Badge variant="outline" className="text-xs">{actionRun.status}</Badge>
      </div>
      
      {output.summary && (
        <p className="text-sm text-foreground">{output.summary}</p>
      )}

      {output.findings && output.findings.length > 0 && (
        <Collapsible>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm text-primary hover:underline">
            <Search className="w-3 h-3" />
            View {output.findings.length} finding(s)
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {output.findings.map((finding, i) => (
              <div key={i} className="p-3 bg-card rounded border text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-xs">{finding.type}</Badge>
                </div>
                <p className="text-muted-foreground">{finding.summary}</p>
                {finding.type === 'page_meta' && finding.data && Array.isArray(finding.data) && (
                  <div className="mt-2 space-y-1">
                    {finding.data.slice(0, 3).map((page: any, j: number) => (
                      <div key={j} className="text-xs p-2 bg-muted rounded">
                        <p className="font-medium truncate">{page.url}</p>
                        <p className="text-muted-foreground truncate">Title: {page.title || '(missing)'}</p>
                        <p className="text-muted-foreground truncate">Desc: {page.description || '(missing)'}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}

      {output.nextSteps && output.nextSteps.length > 0 && (
        <div className="pt-2 border-t border-semantic-success-border">
          <p className="text-xs font-medium text-muted-foreground mb-1">Recommended Next Steps:</p>
          <ul className="space-y-1">
            {output.nextSteps.map((step, i) => (
              <li key={i} className="text-sm flex items-start gap-2">
                <ArrowRight className="w-3 h-3 mt-1 text-primary shrink-0" />
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DropsSection({ 
  drops, 
  actionResults, 
  runningActions, 
  onRunFixAction 
}: { 
  drops: Drop[]; 
  actionResults: Record<string, ActionRun>;
  runningActions: Record<string, boolean>;
  onRunFixAction: (drop: Drop) => void;
}) {
  return (
    <div className="space-y-4" id="detected-drops">
      {drops.map((drop, i) => {
        const severity = getSeverity(drop.zScore);
        const interpretation = getAIInterpretation(drop);
        const actions = getSuggestedActions(drop);
        const anomalyId = dropToAnomalyId(drop);
        
        return (
          <Card key={i} className={cn(
            "border-l-4",
            severity === 'severe' && "border-l-semantic-danger",
            severity === 'moderate' && "border-l-semantic-warning",
            severity === 'mild' && "border-l-semantic-info",
          )}>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="font-medium">{drop.source}</Badge>
                  <span className="font-semibold text-lg">{drop.metric}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={cn(
                    severity === 'severe' && "bg-semantic-danger-soft text-semantic-danger",
                    severity === 'moderate' && "bg-semantic-warning-soft text-semantic-warning",
                    severity === 'mild' && "bg-semantic-info-soft text-semantic-info",
                  )}>
                    {severity === 'severe' ? 'Severe' : severity === 'moderate' ? 'Moderate' : 'Mild'}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{formatDate(drop.date)}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <TrendingDown className="w-6 h-6 text-semantic-danger" />
                <span className={cn(
                  "text-3xl font-bold",
                  severity === 'severe' ? "text-semantic-danger" : severity === 'moderate' ? "text-semantic-warning" : "text-semantic-info"
                )}>
                  {drop.dropPercent}
                </span>
                <span className="text-muted-foreground">vs 7-day average</span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 p-3 bg-muted/50 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Current Value</p>
                  <p className="font-semibold">{drop.value.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">7-Day Average</p>
                  <p className="font-semibold">{drop.avg7d.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Anomaly Score</p>
                  <p className="font-semibold">{drop.zScore.toFixed(2)}</p>
                </div>
              </div>
              
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span className="font-medium text-sm text-primary">AI Interpretation</span>
                </div>
                <p className="text-sm text-foreground">{interpretation}</p>
              </div>
              
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-gold" />
                  <span className="font-medium text-sm">Suggested Action</span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <ArrowRight className="w-4 h-4 text-primary" />
                  <span className="font-medium">{actions.primary}</span>
                </div>
                <div className="ml-6 space-y-1">
                  <p className="text-xs text-muted-foreground mb-1">Also check:</p>
                  {actions.secondary.map((action, j) => (
                    <p key={j} className="text-sm text-muted-foreground">• {action}</p>
                  ))}
                </div>
                
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    onClick={() => onRunFixAction(drop)}
                    disabled={runningActions[anomalyId]}
                    size="sm"
                    data-testid={`button-fix-drop-${i}`}
                  >
                    {runningActions[anomalyId] ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Wrench className="w-4 h-4 mr-2" />
                        Fix it
                      </>
                    )}
                  </Button>
                </div>
              </div>
              
              {actionResults[anomalyId] && (
                <DropActionResults actionRun={actionResults[anomalyId]} />
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export default function PulseContent() {
  const queryClient = useQueryClient();
  const { currentSite } = useSiteContext();
  const [actionResults, setActionResults] = useState<Record<string, ActionRun>>({});
  const [runningActions, setRunningActions] = useState<Record<string, boolean>>({});
  const [isAskingPulse, setIsAskingPulse] = useState(false);
  
  const { score: unifiedScore } = useCrewStatus({
    siteId: currentSite?.siteId || 'default',
    crewId: 'popular',
  });

  const handleAskPulse = async (question: string) => {
    setIsAskingPulse(true);
    try {
      const res = await fetch('/api/crew/pulse/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: currentSite?.siteId || 'default', question }),
      });
      const data = await res.json();
      if (data.ok && data.answer) {
        toast.success(data.answer, { duration: 10000 });
      } else {
        toast.error(data.error || 'Failed to get answer from Pulse');
      }
    } catch {
      toast.error('Failed to ask Pulse');
    } finally {
      setIsAskingPulse(false);
    }
  };
  
  const { data: report, isLoading } = useQuery({
    queryKey: ['report'],
    queryFn: async () => {
      const res = await fetch('/api/report/latest');
      if (!res.ok) return null;
      return res.json();
    },
  });

  const rerunMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/run', { method: 'POST' });
      if (!res.ok) throw new Error('Failed to run analysis');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report'] });
      toast.success("Analysis complete! Report updated.");
    },
    onError: () => {
      toast.error("Failed to run analysis");
    },
  });

  const runFixAction = async (drop: Drop) => {
    if (!currentSite) {
      toast.error("Please select a site first");
      return;
    }
    
    const anomalyId = dropToAnomalyId(drop);
    setRunningActions(prev => ({ ...prev, [anomalyId]: true }));
    
    try {
      const res = await fetch('/api/actions/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId: currentSite.siteId,
          drop,
          enrichOnly: true,
        }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to run action');
      }
      
      const result = await res.json();
      setActionResults(prev => ({
        ...prev,
        [anomalyId]: {
          runId: result.runId,
          status: result.status,
          outputJson: result.output,
          createdAt: new Date().toISOString(),
        },
      }));
      toast.success("Analysis complete! See results below.");
    } catch (error: any) {
      toast.error(error.message || "Failed to run action");
    } finally {
      setRunningActions(prev => ({ ...prev, [anomalyId]: false }));
    }
  };

  const parsed = report?.markdownReport ? parseReport(report.markdownReport) : null;

  const crewMember = getCrewMember("google_data_connector");

  const crew: CrewIdentity = {
    crewId: "google_data_connector",
    crewName: crewMember.nickname,
    subtitle: crewMember.role,
    description: crewMember.blurb || "Fetches analytics and search console data from Google APIs.",
    avatar: crewMember.avatar ? (
      <img src={crewMember.avatar} alt={crewMember.nickname} className="w-7 h-7 object-contain" />
    ) : (
      <Activity className="w-7 h-7 text-teal-500" />
    ),
    accentColor: crewMember.color,
    capabilities: crewMember.capabilities || ["GA4 Data", "GSC Data", "Traffic Metrics"],
    monitors: ["Website Traffic", "Conversions", "User Behavior"],
  };

  const kpis: KpiDescriptor[] = useMemo(() => [
    {
      id: "drops",
      label: "Drops",
      value: parsed?.totalDrops || 0,
      tooltip: "Total traffic anomalies detected",
    },
    {
      id: "health-checks",
      label: "Health Checks",
      value: `${parsed?.healthChecks?.filter(h => h.status === 'healthy').length || 0}/${parsed?.healthChecks?.length || 0}`,
      tooltip: "Healthy checks out of total",
    },
    {
      id: "root-causes",
      label: "Root Causes",
      value: parsed?.rootCauses?.length || 0,
      tooltip: "Identified root cause hypotheses",
    },
  ], [parsed]);

  const keyMetrics = useMemo(() => {
    const healthyCount = parsed?.healthChecks?.filter(h => h.status === 'healthy').length || 0;
    const totalChecks = parsed?.healthChecks?.length || 0;
    const dropsCount = parsed?.totalDrops || 0;
    const rootCausesCount = parsed?.rootCauses?.length || 0;
    
    return [
      {
        id: "health-score",
        label: "Health Score",
        value: totalChecks > 0 ? `${Math.round((healthyCount / totalChecks) * 100)}%` : "—",
        icon: Heart,
        status: (totalChecks > 0 && healthyCount === totalChecks) ? "good" as const : healthyCount > 0 ? "warning" as const : "neutral" as const,
      },
      {
        id: "drops-detected",
        label: "Drops Detected",
        value: dropsCount,
        icon: TrendingDown,
        status: dropsCount === 0 ? "good" as const : dropsCount <= 2 ? "warning" as const : "warning" as const,
      },
      {
        id: "healthy-checks",
        label: "Healthy Checks",
        value: `${healthyCount}/${totalChecks}`,
        icon: CheckCircle,
        status: healthyCount === totalChecks ? "good" as const : "warning" as const,
      },
      {
        id: "root-causes-found",
        label: "Root Causes",
        value: rootCausesCount,
        icon: Lightbulb,
        status: rootCausesCount === 0 ? "good" as const : "warning" as const,
      },
    ];
  }, [parsed]);

  const inspectorTabs: InspectorTab[] = useMemo(() => [
    {
      id: "health",
      label: "Health Checks",
      icon: <CheckCircle className="w-4 h-4" />,
      content: parsed?.healthChecks && parsed.healthChecks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {parsed.healthChecks.map((check, i) => (
            <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="font-medium">{check.name}</span>
              <div className="flex items-center gap-2">
                <StatusIcon status={check.status} />
                <span className={cn(
                  "text-sm font-medium",
                  check.status === 'healthy' && "text-semantic-success",
                  check.status === 'warning' && "text-semantic-warning",
                  check.status === 'error' && "text-semantic-danger",
                )}>
                  {check.status === 'healthy' ? 'Healthy' : check.status === 'warning' ? 'Warning' : 'Error'}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No health checks available — run analysis to populate</p>
      ),
    },
    {
      id: "drops",
      label: "Detected Drops",
      icon: <TrendingDown className="w-4 h-4" />,
      badge: parsed?.totalDrops && parsed.totalDrops > 0 ? parsed.totalDrops : undefined,
      content: parsed?.drops && parsed.drops.length > 0 ? (
        <DropsSection drops={parsed.drops} actionResults={actionResults} runningActions={runningActions} onRunFixAction={runFixAction} />
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle className="w-8 h-8 text-semantic-success mb-3" />
          <p className="font-medium text-semantic-success">No significant drops detected</p>
          <p className="text-sm text-muted-foreground mt-1">Your metrics are within normal ranges</p>
        </div>
      ),
    },
    {
      id: "root-causes",
      label: "Root Causes",
      icon: <Lightbulb className="w-4 h-4" />,
      badge: parsed?.rootCauses?.length || undefined,
      content: parsed?.rootCauses && parsed.rootCauses.length > 0 ? (
        <div className="space-y-3">
          {parsed.rootCauses.map((cause, i) => (
            <div key={i} className="flex items-start gap-3 p-4 bg-muted/50 rounded-lg">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0",
                cause.confidence === 'high' && "bg-semantic-danger",
                cause.confidence === 'medium' && "bg-semantic-warning",
                cause.confidence === 'low' && "bg-muted-foreground",
              )}>
                {i + 1}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{cause.title}</span>
                  <Badge className={cn(
                    "text-xs",
                    cause.confidence === 'high' && "bg-semantic-danger-soft text-semantic-danger",
                    cause.confidence === 'medium' && "bg-semantic-warning-soft text-semantic-warning",
                    cause.confidence === 'low' && "bg-muted text-muted-foreground",
                  )}>
                    {cause.confidence} confidence
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No root causes identified yet</p>
      ),
    },
  ], [parsed, actionResults, runningActions, runFixAction]);

  const missionPrompt: MissionPromptConfig = {
    label: "Ask Pulse",
    placeholder: "e.g., Why did my traffic drop? Are my tracking tags working?",
    onSubmit: handleAskPulse,
    isLoading: isAskingPulse,
  };

  const headerActions: HeaderAction[] = [
    {
      id: "rerun-analysis",
      icon: <RefreshCw className={cn("w-4 h-4", rerunMutation.isPending && "animate-spin")} />,
      tooltip: "Re-run Diagnostic Analysis",
      onClick: () => rerunMutation.mutate(),
      disabled: rerunMutation.isPending,
      loading: rerunMutation.isPending,
    },
  ];

  return (
    <CrewDashboardShell
      crew={crew}
      agentScore={parsed?.healthChecks ? Math.round((parsed.healthChecks.filter(h => h.status === 'healthy').length / parsed.healthChecks.length) * 100) : null}
      agentScoreTooltip="Health score based on system checks"
      kpis={kpis}
      customMetrics={<KeyMetricsGrid metrics={keyMetrics} accentColor={crew.accentColor} />}
      inspectorTabs={inspectorTabs}
      missionPrompt={missionPrompt}
      headerActions={headerActions}
      onRefresh={() => rerunMutation.mutate()}
      onSettings={() => toast.info("Settings coming soon")}
      isRefreshing={rerunMutation.isPending}
    />
  );
}
