import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  TrendingDown, 
  TrendingUp,
  Clock, 
  Activity,
  RefreshCw,
  Info,
  ExternalLink,
  Zap,
  Eye,
  MousePointer,
  Server,
  Timer,
  Gauge,
  Lightbulb,
  BarChart3,
  Trophy,
  GitPullRequest,
  Loader2,
  Shield,
  FileCode,
  Sparkles,
  ChevronRight,
  BookOpen,
  Settings2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSiteContext } from "@/hooks/useSiteContext";
import { toast } from "sonner";
import { getCrewMember } from "@/config/agents";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  CrewDashboardShell,
  type CrewIdentity,
  type MissionStatusState,
  type MissionItem,
  type KpiDescriptor,
  type InspectorTab,
} from "@/components/crew-dashboard";

interface VitalMetric {
  key: string;
  name: string;
  value: number | null;
  unit: string;
  status: 'good' | 'needs-improvement' | 'poor' | 'unknown';
  thresholds: { good: number; needsImprovement: number };
  trend?: number;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

function getVitalStatus(value: number | null, thresholds: { good: number; needsImprovement: number }, lowerIsBetter: boolean = true): 'good' | 'needs-improvement' | 'poor' | 'unknown' {
  if (value === null || value === undefined) return 'unknown';
  if (lowerIsBetter) {
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.needsImprovement) return 'needs-improvement';
    return 'poor';
  } else {
    if (value >= thresholds.good) return 'good';
    if (value >= thresholds.needsImprovement) return 'needs-improvement';
    return 'poor';
  }
}

function VitalCard({ vital }: { vital: VitalMetric }) {
  const Icon = vital.icon;
  
  const statusConfig = {
    'good': { bg: 'bg-green-500/10', border: 'border-green-500/30', text: 'text-green-600', label: 'Good' },
    'needs-improvement': { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-600', label: 'Needs Work' },
    'poor': { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-600', label: 'Poor' },
    'unknown': { bg: 'bg-muted', border: 'border-border', text: 'text-muted-foreground', label: 'No Data' },
  };
  
  const config = statusConfig[vital.status];
  
  const formatValue = () => {
    if (vital.value === null || vital.value === undefined) return '—';
    if (vital.unit === 's') return `${vital.value.toFixed(2)}s`;
    if (vital.unit === 'ms') return `${Math.round(vital.value)}ms`;
    return vital.value.toFixed(3);
  };
  
  const getThresholdPosition = (value: number, good: number, poor: number) => {
    if (value <= good) return (value / good) * 33;
    if (value <= poor) return 33 + ((value - good) / (poor - good)) * 34;
    return Math.min(100, 67 + ((value - poor) / poor) * 33);
  };
  
  return (
    <Card className={cn("transition-all", config.bg, config.border)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("p-2 rounded-lg", config.bg)}>
              <Icon className={cn("w-5 h-5", config.text)} />
            </div>
            <div>
              <CardTitle className="text-base">{vital.name}</CardTitle>
              <CardDescription className="text-xs">{vital.key}</CardDescription>
            </div>
          </div>
          <Badge variant="outline" className={cn("text-xs", config.text, config.border)}>
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-baseline gap-2">
            <span className={cn("text-3xl font-bold", config.text)}>
              {formatValue()}
            </span>
            {vital.trend !== undefined && vital.trend !== 0 && (
              <span className={cn("text-sm flex items-center gap-1", vital.trend < 0 ? "text-green-600" : "text-red-600")}>
                {vital.trend < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
                {Math.abs(vital.trend).toFixed(1)}%
              </span>
            )}
          </div>
          
          {vital.value !== null && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Good</span>
                <span>Needs Work</span>
                <span>Poor</span>
              </div>
              <div className="h-2 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 relative">
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white border-2 border-foreground shadow-md"
                  style={{ left: `${getThresholdPosition(vital.value, vital.thresholds.good, vital.thresholds.needsImprovement)}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>≤{vital.thresholds.good}{vital.unit}</span>
                <span>≤{vital.thresholds.needsImprovement}{vital.unit}</span>
                <span>&gt;{vital.thresholds.needsImprovement}{vital.unit}</span>
              </div>
            </div>
          )}
          
          <p className="text-sm text-muted-foreground">{vital.description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MissingDataCard({ vital, reason }: { vital: string; reason: string }) {
  return (
    <Card className="border-dashed border-muted-foreground/30">
      <CardContent className="py-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-muted">
            <AlertTriangle className="w-5 h-5 text-muted-foreground" />
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">{vital} Not Available</h4>
            <p className="text-sm text-muted-foreground">{reason}</p>
            <div className="text-sm space-y-1">
              <p className="font-medium">How to fix:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Ensure the Core Web Vitals worker is running</li>
                <li>Check that the worker returns {vital.toLowerCase()} in its response</li>
                <li>Verify the metric is being stored with canonical key</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface FixPlanItem {
  id: string;
  title: string;
  why: string;
  proposedChanges: { type: string; fileHint?: string; description: string }[];
  expectedOutcome: string;
  risk: 'low' | 'medium' | 'high';
  confidence: 'low' | 'medium' | 'high';
  sources: string[];
}

interface FixPlanData {
  planId: string;
  generatedAt: string;
  expiresAt: string;
  cooldown: {
    allowed: boolean;
    nextAllowedAt: string | null;
    reason: string | null;
    lastPrAt: string | null;
  };
  maxChangesRecommended: number;
  items: FixPlanItem[];
  consultedSocrates: boolean;
  priorLearningsCount: number;
  metricsSnapshot: any;
}

export default function SpeedsterContent() {
  const { activeSite } = useSiteContext();
  const siteId = activeSite?.id || 'site_empathy_health_clinic';
  
  const [showFixModal, setShowFixModal] = useState(false);
  const [showCooldownOverride, setShowCooldownOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");
  const [maxChanges, setMaxChanges] = useState("10");
  const [fixResult, setFixResult] = useState<{
    prUrl?: string;
    branchName?: string;
    filesChanged?: number;
    summary?: string;
    status?: 'success' | 'error' | 'blocked';
    error?: string;
    blockedBy?: string[];
    hint?: string;
    consultedSocrates?: boolean;
    priorLearningsUsed?: number;
  } | null>(null);
  
  // Fix Plan query - fetches latest pending plan
  const { data: fixPlanResponse, isLoading: isPlanLoading, refetch: refetchPlan } = useQuery({
    queryKey: ['fix-plan-speedster', siteId],
    queryFn: async () => {
      const res = await fetch(`/api/fix-plan/speedster/latest?siteId=${siteId}`);
      if (!res.ok) throw new Error('Failed to fetch fix plan');
      return res.json();
    },
    staleTime: 30000,
  });
  
  const fixPlan: FixPlanData | null = fixPlanResponse?.data || null;
  
  // Generate fix plan mutation
  const generatePlanMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/fix-plan/speedster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId }),
      });
      if (!res.ok) throw new Error('Failed to generate fix plan');
      return res.json();
    },
    onSuccess: () => {
      refetchPlan();
    },
  });
  
  // Execute fix plan mutation
  const executePlanMutation = useMutation({
    mutationFn: async (data: { planId: string; maxChanges: number; overrideCooldown?: boolean; overrideReason?: string }) => {
      const res = await fetch('/api/fix-plan/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, ...data }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.cooldown) {
          return { ...json, status: 'cooldown_blocked' };
        }
        throw new Error(json.error || 'Failed to execute fix plan');
      }
      return json;
    },
    onSuccess: (data) => {
      if (data.status === 'cooldown_blocked') {
        setShowCooldownOverride(true);
      } else if (data.ok) {
        setFixResult({
          prUrl: data.data?.prUrl,
          branchName: data.data?.branchName,
          filesChanged: data.data?.filesChanged,
          summary: `Executed ${data.data?.itemsExecuted} fix items`,
          status: 'success',
          consultedSocrates: fixPlan?.consultedSocrates,
          priorLearningsUsed: fixPlan?.priorLearningsCount,
        });
        refetchPlan();
      }
    },
    onError: (error: Error) => {
      setFixResult({
        status: 'error',
        error: error.message,
      });
    },
  });
  
  const fixMutation = useMutation({
    mutationFn: async (data: { siteId: string; maxChanges: number; issues: any }) => {
      const res = await fetch('/api/fix/core-web-vitals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.blockedBy) {
          return json;
        }
        throw new Error(json.error || 'Failed to create fix PR');
      }
      return json;
    },
    onSuccess: (data) => {
      if (data.ok === false && data.blockedBy) {
        setFixResult({
          status: 'blocked',
          blockedBy: data.blockedBy,
          hint: data.hint,
          error: data.error,
        });
      } else {
        setFixResult({
          prUrl: data.prUrl,
          branchName: data.branchName,
          filesChanged: data.filesChanged,
          summary: data.summary,
          status: 'success',
          consultedSocrates: data.consultedSocrates,
          priorLearningsUsed: data.priorLearningsUsed,
        });
      }
    },
    onError: (error: Error) => {
      setFixResult({
        status: 'error',
        error: error.message,
      });
    },
  });
  
  const { data: speedsterData, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['speedster-summary', siteId],
    queryFn: async () => {
      const res = await fetch(`/api/crew/speedster/summary?siteId=${siteId}`);
      if (!res.ok) throw new Error('Failed to fetch speedster data');
      return res.json();
    },
    staleTime: 60000,
  });
  
  const metrics = speedsterData?.metrics || {};
  
  // Core Web Vitals (the 3 main metrics Google uses for ranking)
  const coreVitals: VitalMetric[] = [
    {
      key: 'vitals.lcp',
      name: 'Largest Contentful Paint',
      value: metrics['vitals.lcp'] ?? null,
      unit: 's',
      status: getVitalStatus(metrics['vitals.lcp'], { good: 2.5, needsImprovement: 4.0 }),
      thresholds: { good: 2.5, needsImprovement: 4.0 },
      trend: metrics['vitals.lcp.trend'],
      description: 'Measures loading performance. LCP should occur within 2.5 seconds of when the page first starts loading.',
      icon: Eye,
    },
    {
      key: 'vitals.cls',
      name: 'Cumulative Layout Shift',
      value: metrics['vitals.cls'] ?? null,
      unit: '',
      status: getVitalStatus(metrics['vitals.cls'], { good: 0.1, needsImprovement: 0.25 }),
      thresholds: { good: 0.1, needsImprovement: 0.25 },
      trend: metrics['vitals.cls.trend'],
      description: 'Measures visual stability. Pages should maintain a CLS of 0.1 or less.',
      icon: Activity,
    },
    {
      key: 'vitals.inp',
      name: 'Interaction to Next Paint',
      value: metrics['vitals.inp'] ?? null,
      unit: 'ms',
      status: getVitalStatus(metrics['vitals.inp'], { good: 200, needsImprovement: 500 }),
      thresholds: { good: 200, needsImprovement: 500 },
      trend: metrics['vitals.inp.trend'],
      description: 'Measures responsiveness. INP should be 200 milliseconds or less.',
      icon: MousePointer,
    },
  ];
  
  // Additional performance metrics
  const additionalMetrics: VitalMetric[] = [
    {
      key: 'vitals.fcp',
      name: 'First Contentful Paint',
      value: metrics['vitals.fcp'] ?? null,
      unit: 's',
      status: getVitalStatus(metrics['vitals.fcp'], { good: 1.8, needsImprovement: 3.0 }),
      thresholds: { good: 1.8, needsImprovement: 3.0 },
      description: 'Time until first text or image appears. Should be under 1.8 seconds.',
      icon: Timer,
    },
    {
      key: 'vitals.ttfb',
      name: 'Time to First Byte',
      value: metrics['vitals.ttfb'] ?? null,
      unit: 'ms',
      status: getVitalStatus(metrics['vitals.ttfb'], { good: 800, needsImprovement: 1800 }),
      thresholds: { good: 800, needsImprovement: 1800 },
      description: 'Server response time. Should be under 800ms for good user experience.',
      icon: Server,
    },
    {
      key: 'vitals.speed_index',
      name: 'Speed Index',
      value: metrics['vitals.speed_index'] ?? null,
      unit: 'ms',
      status: getVitalStatus(metrics['vitals.speed_index'], { good: 3400, needsImprovement: 5800 }),
      thresholds: { good: 3400, needsImprovement: 5800 },
      description: 'How quickly content is visually displayed. Lower is better.',
      icon: Gauge,
    },
  ];
  
  const performanceScore = metrics['vitals.performance_score'];
  
  // Combine for overall status calculation
  const vitals = coreVitals;
  
  const overallStatus = vitals.every(v => v.status === 'good') ? 'good' 
    : vitals.some(v => v.status === 'poor') ? 'poor' 
    : vitals.some(v => v.status === 'unknown') ? 'unknown'
    : 'needs-improvement';
  
  const statusColors = {
    'good': 'text-green-600',
    'needs-improvement': 'text-yellow-600',
    'poor': 'text-red-600',
    'unknown': 'text-muted-foreground',
  };

  const crewMember = getCrewMember("core_web_vitals");

  const crew: CrewIdentity = {
    crewId: "core_web_vitals",
    crewName: crewMember.nickname,
    subtitle: crewMember.role,
    description: crewMember.blurb || "Monitors Core Web Vitals and page speed metrics.",
    avatar: crewMember.avatar ? (
      <img src={crewMember.avatar} alt={crewMember.nickname} className="w-7 h-7 object-contain" />
    ) : (
      <Zap className="w-7 h-7 text-emerald-500" />
    ),
    accentColor: crewMember.color,
    capabilities: crewMember.capabilities || ["LCP Tracking", "CLS Tracking", "INP Tracking"],
    monitors: ["Core Web Vitals", "Page Speed", "Performance Score"],
  };

  const missionStatus: MissionStatusState = useMemo(() => {
    const poorCount = vitals.filter(v => v.status === 'poor').length;
    const needsWorkCount = vitals.filter(v => v.status === 'needs-improvement').length;
    const unknownCount = vitals.filter(v => v.status === 'unknown').length;
    const autoFixable = fixPlan?.items?.length || 0;

    let tier: "looking_good" | "doing_okay" | "needs_attention" = "looking_good";
    let summaryLine = "All Core Web Vitals passing";
    let nextStep = "Continue monitoring performance";

    if (unknownCount === vitals.length) {
      tier = "needs_attention";
      summaryLine = "No Core Web Vitals data available";
      nextStep = "Run the Core Web Vitals worker to collect metrics";
    } else if (poorCount > 0) {
      tier = "needs_attention";
      summaryLine = `${poorCount} vital${poorCount > 1 ? 's' : ''} in poor range`;
      nextStep = "Focus on fixing poor metrics first";
    } else if (needsWorkCount > 0) {
      tier = "doing_okay";
      summaryLine = `${needsWorkCount} vital${needsWorkCount > 1 ? 's' : ''} need improvement`;
      nextStep = "Work on improving these metrics";
    }

    return {
      tier,
      summaryLine,
      nextStep,
      blockerCount: poorCount,
      priorityCount: needsWorkCount,
      autoFixableCount: autoFixable,
      status: isLoading ? "loading" as const : "ready" as const,
    };
  }, [vitals, fixPlan, isLoading]);

  const kpis: KpiDescriptor[] = useMemo(() => [
    {
      id: "lcp",
      label: "LCP",
      value: metrics['vitals.lcp'] != null ? `${metrics['vitals.lcp'].toFixed(2)}s` : "—",
      tooltip: "Largest Contentful Paint - should be ≤2.5s",
    },
    {
      id: "cls",
      label: "CLS",
      value: metrics['vitals.cls'] != null ? metrics['vitals.cls'].toFixed(3) : "—",
      tooltip: "Cumulative Layout Shift - should be ≤0.1",
    },
    {
      id: "inp",
      label: "INP",
      value: metrics['vitals.inp'] != null ? `${Math.round(metrics['vitals.inp'])}ms` : "—",
      tooltip: "Interaction to Next Paint - should be ≤200ms",
    },
    {
      id: "score",
      label: "Score",
      value: performanceScore != null ? `${performanceScore}` : "—",
      tooltip: "Overall performance score out of 100",
    },
  ], [metrics, performanceScore]);

  const missions: MissionItem[] = useMemo(() => {
    const items: MissionItem[] = [];
    if (vitals.some(v => v.status === 'poor')) {
      items.push({
        id: "fix-poor-vitals",
        title: "Fix poor Core Web Vitals",
        reason: `${vitals.filter(v => v.status === 'poor').length} metric(s) are in the poor range`,
        status: "pending",
        impact: "high",
      });
    }
    if (vitals.some(v => v.status === 'needs-improvement')) {
      items.push({
        id: "improve-vitals",
        title: "Improve vitals needing work",
        reason: `${vitals.filter(v => v.status === 'needs-improvement').length} metric(s) need improvement`,
        status: "pending",
        impact: "medium",
      });
    }
    if (fixPlan?.items && fixPlan.items.length > 0) {
      items.push({
        id: "execute-fix-plan",
        title: `Execute ${fixPlan.items.length} fix items`,
        reason: "Proposed fixes based on current vitals analysis",
        status: "pending",
        impact: "high",
      });
    }
    return items;
  }, [vitals, fixPlan]);

  const inspectorTabs: InspectorTab[] = useMemo(() => [
    {
      id: "vitals",
      label: "Core Vitals",
      icon: <Activity className="w-4 h-4" />,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {coreVitals.map((vital) => (
            <VitalCard key={vital.key} vital={vital} />
          ))}
        </div>
      ),
    },
    {
      id: "additional",
      label: "Additional Metrics",
      icon: <BarChart3 className="w-4 h-4" />,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {additionalMetrics.map((vital) => (
            <VitalCard key={vital.key} vital={vital} />
          ))}
        </div>
      ),
    },
  ], [coreVitals, additionalMetrics]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <CrewDashboardShell
      crew={crew}
      agentScore={performanceScore}
      agentScoreTooltip="Performance score from Core Web Vitals analysis"
      missionStatus={missionStatus}
      missions={missions}
      kpis={kpis}
      inspectorTabs={inspectorTabs}
      onRefresh={() => refetch()}
      onSettings={() => toast.info("Settings coming soon")}
      isRefreshing={isRefetching}
    >
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Zap className="w-6 h-6 text-amber-500" />
              </div>
              <div>
                <CardTitle>Core Web Vitals Overview</CardTitle>
                <CardDescription>
                  Performance metrics that measure real-world user experience
                </CardDescription>
              </div>
            </div>
            <Badge variant="outline" className={cn("text-sm", statusColors[overallStatus])}>
              {overallStatus === 'good' && <CheckCircle className="w-4 h-4 mr-1" />}
              {overallStatus === 'needs-improvement' && <AlertTriangle className="w-4 h-4 mr-1" />}
              {overallStatus === 'poor' && <XCircle className="w-4 h-4 mr-1" />}
              {overallStatus === 'unknown' && <Info className="w-4 h-4 mr-1" />}
              {overallStatus === 'good' ? 'All Passing' : overallStatus === 'unknown' ? 'No Data' : 'Needs Attention'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4" />
              <span>Last updated: {speedsterData?.capturedAt ? new Date(speedsterData.capturedAt).toLocaleString() : 'Never'}</span>
            </div>
            {speedsterData?.source && (
              <div className="flex items-center gap-1">
                <Info className="w-4 h-4" />
                <span>Source: {speedsterData.source}</span>
              </div>
            )}
            {speedsterData?.sampleCount && (
              <div className="flex items-center gap-1">
                <Activity className="w-4 h-4" />
                <span>{speedsterData.sampleCount} URLs tested</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-3 pt-2 border-t">
            <Button 
              variant="outline" 
              onClick={() => refetch()}
              disabled={isRefetching}
              data-testid="button-run-vitals-scan"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isRefetching && "animate-spin")} />
              Run Vitals Scan
            </Button>
            <Button variant="outline" data-testid="button-export-fix-pack">
              <ExternalLink className="w-4 h-4 mr-2" />
              Export Fix Pack
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Fix Plan Section */}
      <Card className="border-l-4 border-l-amber-500">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Sparkles className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <CardTitle className="text-base">Fix Plan</CardTitle>
                <CardDescription>
                  Proposed changes based on current vitals + past learnings
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {fixPlan?.consultedSocrates && (
                <Badge variant="outline" className="text-lime-600 border-lime-500/30 bg-lime-500/10">
                  <BookOpen className="w-3 h-3 mr-1" />
                  Socrates
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => generatePlanMutation.mutate()}
                disabled={generatePlanMutation.isPending}
              >
                {generatePlanMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPlanLoading || generatePlanMutation.isPending ? (
            <div className="flex items-center justify-center py-6">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                <span className="text-sm text-muted-foreground">Generating plan...</span>
              </div>
            </div>
          ) : !fixPlan || fixPlan.items.length === 0 ? (
            <div className="py-6 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 rounded-full bg-muted">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">No recommended fixes right now</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your Core Web Vitals are within acceptable thresholds
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => generatePlanMutation.mutate()}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Check Again
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Plan Items */}
              <div className="space-y-3">
                {fixPlan.items.map((item, index) => (
                  <div 
                    key={item.id} 
                    className="p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-mono">#{index + 1}</span>
                          <h4 className="font-medium">{item.title}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground">{item.why}</p>
                        
                        {/* Proposed Changes */}
                        <div className="space-y-1 pt-2">
                          {item.proposedChanges.map((change, ci) => (
                            <div key={ci} className="flex items-center gap-2 text-sm">
                              <ChevronRight className="w-3 h-3 text-muted-foreground" />
                              <span className="text-muted-foreground">{change.description}</span>
                              {change.fileHint && (
                                <Badge variant="outline" className="text-xs">
                                  {change.fileHint}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex items-center gap-4 pt-2 text-xs">
                          <span className="text-green-600">{item.expectedOutcome}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <Badge 
                          variant="outline" 
                          className={cn(
                            "text-xs",
                            item.risk === 'low' && "text-green-600 border-green-500/30",
                            item.risk === 'medium' && "text-yellow-600 border-yellow-500/30",
                            item.risk === 'high' && "text-red-600 border-red-500/30"
                          )}
                        >
                          {item.risk} risk
                        </Badge>
                        <div className="flex gap-1">
                          {item.sources.map(src => (
                            <Badge key={src} variant="secondary" className="text-xs">
                              {src}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Safety Strip */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                <div className="flex items-center gap-4 text-sm">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-blue-500" />
                          <span>Max changes: <strong>{fixPlan.maxChangesRecommended}</strong></span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Recommended to limit changes per cycle to reduce ranking volatility</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <div className="w-px h-4 bg-border" />
                  
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>
                            {fixPlan.cooldown.lastPrAt 
                              ? `Last PR: ${Math.round((Date.now() - new Date(fixPlan.cooldown.lastPrAt).getTime()) / (24*60*60*1000))} days ago`
                              : 'No prior PRs'}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        {fixPlan.cooldown.allowed 
                          ? "Cooldown period has passed, you can create a new PR"
                          : fixPlan.cooldown.reason || "Wait before creating another PR"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  {!fixPlan.cooldown.allowed && (
                    <>
                      <div className="w-px h-4 bg-border" />
                      <Badge variant="outline" className="text-yellow-600 border-yellow-500/30">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Cooldown Active
                      </Badge>
                    </>
                  )}
                </div>
                
                <Button
                  onClick={() => {
                    setFixResult(null);
                    if (!fixPlan.cooldown.allowed) {
                      setShowCooldownOverride(true);
                    } else {
                      setShowFixModal(true);
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={!fixPlan.items.length || executePlanMutation.isPending}
                  data-testid="button-fix-it"
                >
                  {executePlanMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4 mr-2" />
                  )}
                  Fix It
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      
      {performanceScore !== null && performanceScore !== undefined && (
        <Card className={cn(
          "border-l-4",
          performanceScore >= 90 ? "border-l-green-500" : 
          performanceScore >= 50 ? "border-l-yellow-500" : "border-l-red-500"
        )}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold",
                  performanceScore >= 90 ? "bg-green-500/10 text-green-600" : 
                  performanceScore >= 50 ? "bg-yellow-500/10 text-yellow-600" : "bg-red-500/10 text-red-600"
                )}>
                  {Math.round(performanceScore)}
                </div>
                <div>
                  <h3 className="font-semibold">Lighthouse Performance Score</h3>
                  <p className="text-sm text-muted-foreground">
                    {performanceScore >= 90 ? "Excellent! Your site is fast." : 
                     performanceScore >= 50 ? "Room for improvement. Some optimizations needed." : 
                     "Poor performance. Major optimizations required."}
                  </p>
                </div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <div>0-49: Poor</div>
                <div>50-89: Needs Work</div>
                <div>90-100: Good</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="grid gap-4 md:grid-cols-3">
        {coreVitals.map((vital) => (
          vital.value !== null ? (
            <VitalCard key={vital.key} vital={vital} />
          ) : (
            <MissingDataCard 
              key={vital.key} 
              vital={vital.name} 
              reason={`${vital.name} data is not available from the Core Web Vitals worker.`}
            />
          )
        ))}
      </div>
      
      {additionalMetrics.some(m => m.value !== null) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Additional Performance Metrics</CardTitle>
            <CardDescription>More details about your page loading experience</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {additionalMetrics.map((metric) => {
                if (metric.value === null) return null;
                const Icon = metric.icon;
                const statusConfig = {
                  'good': { text: 'text-green-600', bg: 'bg-green-500/10' },
                  'needs-improvement': { text: 'text-yellow-600', bg: 'bg-yellow-500/10' },
                  'poor': { text: 'text-red-600', bg: 'bg-red-500/10' },
                  'unknown': { text: 'text-muted-foreground', bg: 'bg-muted' },
                };
                const config = statusConfig[metric.status];
                
                return (
                  <div key={metric.key} className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className={cn("p-2 rounded-lg", config.bg)}>
                      <Icon className={cn("w-5 h-5", config.text)} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{metric.name}</div>
                      <div className={cn("text-lg font-bold", config.text)}>
                        {metric.unit === 's' ? `${metric.value.toFixed(2)}s` : 
                         metric.unit === 'ms' ? `${Math.round(metric.value)}ms` : 
                         metric.value}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      
      {speedsterData?.benchmarks && Object.keys(speedsterData.benchmarks).length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              <div>
                <CardTitle className="text-base">Industry Benchmarks</CardTitle>
                <CardDescription>
                  Compare your metrics against {speedsterData.industry || 'healthcare'} industry standards
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(speedsterData.benchmarks).map(([key, bench]: [string, any]) => {
                if (!bench || bench.currentValue === null || bench.currentValue === undefined) return null;
                
                const metricLabels: Record<string, string> = {
                  'vitals.lcp': 'LCP (Loading)',
                  'vitals.cls': 'CLS (Stability)',
                  'vitals.inp': 'INP (Responsiveness)',
                  'vitals.fcp': 'FCP (First Paint)',
                  'vitals.ttfb': 'TTFB (Server)',
                  'vitals.performance_score': 'Performance Score',
                };
                
                const comparisonColors = {
                  better: 'text-green-600 bg-green-500/10',
                  average: 'text-yellow-600 bg-yellow-500/10',
                  worse: 'text-red-600 bg-red-500/10',
                };
                
                const percentileLabels: Record<string, string> = {
                  top25: 'Top 25%',
                  top50: 'Top 50%',
                  top75: 'Top 75%',
                  bottom25: 'Bottom 25%',
                };
                
                const formatValue = (val: number, unit: string) => {
                  if (unit === 'seconds') return `${val.toFixed(2)}s`;
                  if (unit === 'milliseconds') return `${Math.round(val)}ms`;
                  if (unit === 'score') return val.toFixed(3);
                  return val.toString();
                };
                
                return (
                  <div key={key} className="p-3 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium text-sm">{metricLabels[key] || key}</span>
                        {bench.source && (
                          <span className="text-xs text-muted-foreground ml-2">({bench.source})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {bench.percentile && (
                          <Badge 
                            variant="outline" 
                            className={cn("text-xs", comparisonColors[bench.comparison] || '')}
                          >
                            {bench.comparison === 'better' && <Trophy className="w-3 h-3 mr-1" />}
                            {percentileLabels[bench.percentile]}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className={cn(
                        "px-2 py-1 rounded font-bold",
                        comparisonColors[bench.comparison] || 'bg-muted'
                      )}>
                        Your: {formatValue(bench.currentValue, bench.unit)}
                      </div>
                      <div className="flex-1 grid grid-cols-4 gap-2 text-xs text-muted-foreground">
                        <div className="text-center">
                          <div className="font-medium text-green-600">p25</div>
                          <div>{formatValue(bench.p25, bench.unit)}</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-yellow-600">p50</div>
                          <div>{formatValue(bench.p50, bench.unit)}</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-orange-600">p75</div>
                          <div>{formatValue(bench.p75, bench.unit)}</div>
                        </div>
                        <div className="text-center">
                          <div className="font-medium text-red-600">p90</div>
                          <div>{formatValue(bench.p90, bench.unit)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              Percentiles show where your site ranks compared to other {speedsterData.industry || 'healthcare'} websites. 
              Lower values are better for LCP, CLS, INP, FCP, and TTFB. Higher is better for Performance Score.
            </p>
          </CardContent>
        </Card>
      )}
      
      {speedsterData?.opportunities && speedsterData.opportunities.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <CardTitle className="text-base">Optimization Opportunities</CardTitle>
            </div>
            <CardDescription>Suggestions to improve performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {speedsterData.opportunities.map((opp: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <div className="font-medium text-sm">{opp.title || opp.id}</div>
                    {opp.description && (
                      <div className="text-xs text-muted-foreground mt-1">{opp.description}</div>
                    )}
                  </div>
                  {opp.savings_ms && (
                    <Badge variant="secondary" className="text-green-600">
                      Save {(opp.savings_ms / 1000).toFixed(1)}s
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {speedsterData?.topUrls && speedsterData.topUrls.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Affected Pages</CardTitle>
            <CardDescription>Pages with the slowest performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {speedsterData.topUrls.map((url: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm text-muted-foreground w-6">{i + 1}.</span>
                    <span className="text-sm truncate">{url.path || url.url}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">LCP: {url.lcp?.toFixed(2) || '—'}s</span>
                    <span className="text-muted-foreground">CLS: {url.cls?.toFixed(3) || '—'}</span>
                    <span className="text-muted-foreground">INP: {url.inp || '—'}ms</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Cooldown Override Dialog */}
      <Dialog open={showCooldownOverride} onOpenChange={setShowCooldownOverride}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Cooldown Active
            </DialogTitle>
            <DialogDescription>
              {fixPlan?.cooldown.reason || "A cooldown period is active to reduce ranking volatility."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-yellow-600" />
                <span>
                  {fixPlan?.cooldown.nextAllowedAt 
                    ? `Next recommended: ${new Date(fixPlan.cooldown.nextAllowedAt).toLocaleDateString()}`
                    : 'Cooldown period not yet passed'}
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="override-reason">Reason for override (required)</Label>
              <textarea
                id="override-reason"
                className="w-full min-h-[80px] p-3 rounded-lg border bg-background text-sm resize-none"
                placeholder="Explain why this change is urgent and cannot wait..."
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowCooldownOverride(false);
              setOverrideReason("");
            }}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (fixPlan?.planId && overrideReason.trim()) {
                  executePlanMutation.mutate({
                    planId: fixPlan.planId,
                    maxChanges: parseInt(maxChanges),
                    overrideCooldown: true,
                    overrideReason: overrideReason.trim(),
                  });
                  setShowCooldownOverride(false);
                  setShowFixModal(true);
                }
              }}
              className="bg-yellow-600 hover:bg-yellow-700"
              disabled={!overrideReason.trim()}
            >
              Override & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Fix Execution Dialog */}
      <Dialog open={showFixModal} onOpenChange={setShowFixModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-600" />
              Execute Fix Plan
            </DialogTitle>
            <DialogDescription>
              Create a GitHub pull request with the recommended fixes from your plan.
            </DialogDescription>
          </DialogHeader>
          
          {executePlanMutation.isPending || fixMutation.isPending ? (
            <div className="py-8 space-y-4">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                <div className="text-center">
                  <p className="font-medium">Creating PR...</p>
                  <p className="text-sm text-muted-foreground">
                    This may take a moment
                  </p>
                </div>
              </div>
            </div>
          ) : fixResult?.status === 'success' ? (
            <div className="py-4 space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-medium text-green-600">Pull Request Created</p>
                  <p className="text-sm text-muted-foreground">
                    {fixResult.filesChanged} files changed
                  </p>
                </div>
              </div>
              
              {fixResult.consultedSocrates && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-lime-500/10 border border-lime-500/30">
                  <Badge className="bg-lime-500/20 text-lime-600 border-lime-500/30">
                    Consulted Socrates
                  </Badge>
                  {fixResult.priorLearningsUsed !== undefined && fixResult.priorLearningsUsed > 0 && (
                    <span className="text-sm text-muted-foreground">
                      ({fixResult.priorLearningsUsed} prior learnings used)
                    </span>
                  )}
                </div>
              )}
              
              {fixResult.summary && (
                <div className="p-3 rounded-lg bg-muted">
                  <p className="text-sm">{fixResult.summary}</p>
                </div>
              )}
              
              {fixResult.branchName && (
                <p className="text-sm text-muted-foreground">
                  Branch: <code className="px-1 py-0.5 bg-muted rounded">{fixResult.branchName}</code>
                </p>
              )}
              
              <Button 
                className="w-full"
                onClick={() => fixResult.prUrl && window.open(fixResult.prUrl, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open Pull Request
              </Button>
            </div>
          ) : fixResult?.status === 'blocked' ? (
            <div className="py-4 space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <AlertTriangle className="w-6 h-6 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-600">Integration Required</p>
                  <p className="text-sm text-muted-foreground">{fixResult.error}</p>
                </div>
              </div>
              
              {fixResult.blockedBy && fixResult.blockedBy.length > 0 && (
                <div className="p-3 rounded-lg border space-y-2">
                  <p className="text-sm font-medium">Missing Integrations:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {fixResult.blockedBy.map((blocker, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500" />
                        {blocker}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {fixResult.hint && (
                <p className="text-xs text-muted-foreground">{fixResult.hint}</p>
              )}
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setShowFixModal(false)}
              >
                Close
              </Button>
            </div>
          ) : fixResult?.status === 'error' ? (
            <div className="py-4 space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                <XCircle className="w-6 h-6 text-red-600" />
                <div>
                  <p className="font-medium text-red-600">Failed to Create PR</p>
                  <p className="text-sm text-muted-foreground">{fixResult.error}</p>
                </div>
              </div>
              
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => setFixResult(null)}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="max-changes">Maximum changes per cycle</Label>
                  <Select value={maxChanges} onValueChange={setMaxChanges}>
                    <SelectTrigger id="max-changes">
                      <SelectValue placeholder="Select max changes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 changes (Conservative)</SelectItem>
                      <SelectItem value="10">10 changes (Recommended)</SelectItem>
                      <SelectItem value="20">20 changes (Aggressive)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Smaller changes reduce ranking volatility and are easier to review.
                  </p>
                </div>
                
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted">
                  <Shield className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">Safety Mode</p>
                    <p>PR will be created for review only - no auto-merge.</p>
                  </div>
                </div>
                
                <div className="p-3 rounded-lg border space-y-2">
                  <p className="text-sm font-medium">Current Issues Detected:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {metrics['vitals.lcp'] && metrics['vitals.lcp'] > 2.5 && (
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        LCP: {metrics['vitals.lcp'].toFixed(2)}s (target: ≤2.5s)
                      </li>
                    )}
                    {metrics['vitals.cls'] && metrics['vitals.cls'] > 0.1 && (
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500" />
                        CLS: {metrics['vitals.cls'].toFixed(3)} (target: ≤0.1)
                      </li>
                    )}
                    {metrics['vitals.inp'] && metrics['vitals.inp'] > 200 && (
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500" />
                        INP: {Math.round(metrics['vitals.inp'])}ms (target: ≤200ms)
                      </li>
                    )}
                    {performanceScore !== null && performanceScore < 90 && (
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-yellow-500" />
                        Performance Score: {performanceScore} (target: ≥90)
                      </li>
                    )}
                  </ul>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowFixModal(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (fixPlan?.planId) {
                      executePlanMutation.mutate({
                        planId: fixPlan.planId,
                        maxChanges: parseInt(maxChanges),
                      });
                    } else {
                      // Fallback to old mutation if no plan exists
                      fixMutation.mutate({
                        siteId,
                        maxChanges: parseInt(maxChanges),
                        issues: {
                          lcp: metrics['vitals.lcp'],
                          cls: metrics['vitals.cls'],
                          inp: metrics['vitals.inp'],
                          performanceScore: performanceScore,
                          opportunities: speedsterData?.opportunities || [],
                        },
                      });
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700"
                  disabled={executePlanMutation.isPending}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Fix It
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </CrewDashboardShell>
  );
}
