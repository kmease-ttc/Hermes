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
  Settings2,
  ListChecks,
  FileWarning
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSiteContext } from "@/hooks/useSiteContext";
import { useCrewStatus } from "@/hooks/useCrewStatus";
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
import { BenchmarkPositionBar } from "@/components/BenchmarkPositionBar";
import {
  CrewDashboardShell,
  type HeaderAction,
  type CrewIdentity,
  type InspectorTab,
  type MissionPromptConfig,
  type KpiDescriptor,
} from "@/components/crew-dashboard";
import { CrewPageLayout } from "@/components/crew/CrewPageLayout";

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
    'good': { bg: 'bg-semantic-success-soft', border: 'border-semantic-success-border', text: 'text-semantic-success', label: 'Good' },
    'needs-improvement': { bg: 'bg-semantic-warning-soft', border: 'border-semantic-warning-border', text: 'text-semantic-warning', label: 'Needs Work' },
    'poor': { bg: 'bg-semantic-danger-soft', border: 'border-semantic-danger-border', text: 'text-semantic-danger', label: 'Poor' },
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
              <span className={cn("text-sm flex items-center gap-1", vital.trend < 0 ? "text-semantic-success" : "text-semantic-danger")}>
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
              <div className="h-2 rounded-full bg-gradient-to-r from-semantic-success via-semantic-warning to-semantic-danger relative">
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
  
  const { score: unifiedScore, isRefreshing: crewIsRefreshing, dataUpdatedAt: crewDataUpdatedAt } = useCrewStatus({
    siteId,
    crewId: 'speedster',
  });
  
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
  const [isAskingSpeedster, setIsAskingSpeedster] = useState(false);
  
  // Handle "Ask Speedster" prompt submission
  const handleAskSpeedster = async (question: string) => {
    setIsAskingSpeedster(true);
    try {
      const res = await fetch('/api/crew/speedster/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, question, metrics }),
      });
      const data = await res.json();
      if (data.ok && data.answer) {
        toast.success(data.answer, { duration: 10000 });
      } else {
        toast.error(data.error || 'Failed to get answer from Speedster');
      }
    } catch (error) {
      toast.error('Failed to ask Speedster');
    } finally {
      setIsAskingSpeedster(false);
    }
  };
  
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
  
  const { data: dashboardStats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) return null;
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });
  
  const runScanMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/crew/speedster/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Scan failed');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Vitals scan completed');
      refetch();
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Scan failed');
    },
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
      key: 'vitals.tbt',
      name: 'Total Blocking Time',
      value: metrics['vitals.tbt'] ?? null,
      unit: 'ms',
      status: getVitalStatus(metrics['vitals.tbt'], { good: 200, needsImprovement: 600 }),
      thresholds: { good: 200, needsImprovement: 600 },
      description: 'Total time the main thread was blocked. Should be under 200ms.',
      icon: Clock,
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
  
  // Check which additional metrics are missing from API
  const missingAdditionalMetrics = additionalMetrics
    .filter(m => m.value === null)
    .map(m => m.key);
  const hasAnyAdditionalMetrics = additionalMetrics.some(m => m.value !== null);
  const allAdditionalMetricsMissing = additionalMetrics.every(m => m.value === null);
  
  const performanceScore = metrics['vitals.performance_score'];
  
  // Combine for overall status calculation
  const vitals = coreVitals;
  
  const overallStatus = vitals.every(v => v.status === 'good') ? 'good' 
    : vitals.some(v => v.status === 'poor') ? 'poor' 
    : vitals.some(v => v.status === 'unknown') ? 'unknown'
    : 'needs-improvement';
  
  const statusColors = {
    'good': 'text-semantic-success',
    'needs-improvement': 'text-semantic-warning',
    'poor': 'text-semantic-danger',
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
      <Zap className="w-7 h-7 text-semantic-success" />
    ),
    accentColor: crewMember.color,
    capabilities: crewMember.capabilities || ["LCP Tracking", "CLS Tracking", "INP Tracking"],
    monitors: ["Core Web Vitals", "Page Speed", "Performance Score"],
  };

  const mapVitalStatusToMetricStatus = (status: 'good' | 'needs-improvement' | 'poor' | 'unknown'): 'good' | 'warning' | 'neutral' => {
    switch (status) {
      case 'good': return 'good';
      case 'needs-improvement': return 'warning';
      case 'poor': return 'warning';
      case 'unknown': return 'neutral';
      default: return 'neutral';
    }
  };

  const formatVitalValue = (value: number | null, unit: string): string => {
    if (value === null || value === undefined) return '—';
    if (unit === 's') return `${value.toFixed(2)}s`;
    if (unit === 'ms') return `${Math.round(value)}ms`;
    return value.toFixed(3);
  };

  const performanceTrend = dashboardStats?.performance?.trend?.slice(-7)?.map((p: { value: number }) => p.value) ?? [];
  const lcpTrend = dashboardStats?.performance?.lcpTrend?.slice(-7)?.map((p: { value: number }) => p.value) ?? [];
  const clsTrend = dashboardStats?.performance?.clsTrend?.slice(-7)?.map((p: { value: number }) => p.value) ?? [];
  const inpTrend = dashboardStats?.performance?.inpTrend?.slice(-7)?.map((p: { value: number }) => p.value) ?? [];
  
  const passRate = performanceScore != null ? Math.round(performanceScore) : null;
  const passRateChange = dashboardStats?.performance?.change7d ?? null;

  const kpis: KpiDescriptor[] = useMemo(() => [
    {
      id: "passRate",
      label: "CWV Pass Rate",
      value: passRate != null ? `${passRate}%` : "—",
      delta: passRateChange,
      deltaLabel: "vs last week",
      deltaIsGood: passRateChange != null && passRateChange > 0,
      sparklineData: performanceTrend.length > 1 ? performanceTrend : undefined,
      trendIsGood: "up" as const,
      tooltip: "Core Web Vitals pass rate percentage",
      icon: <Zap className="w-4 h-4" />,
    },
    {
      id: "lcp",
      label: "LCP",
      value: formatVitalValue(coreVitals[0]?.value, coreVitals[0]?.unit),
      delta: coreVitals[0]?.trend,
      deltaIsGood: coreVitals[0]?.trend != null && coreVitals[0]?.trend < 0,
      sparklineData: lcpTrend.length > 1 ? lcpTrend : undefined,
      trendIsGood: "down" as const,
      tooltip: "Largest Contentful Paint - loading performance",
      icon: <Eye className="w-4 h-4" />,
    },
    {
      id: "inp",
      label: "INP",
      value: formatVitalValue(coreVitals[2]?.value, coreVitals[2]?.unit),
      delta: coreVitals[2]?.trend,
      deltaIsGood: coreVitals[2]?.trend != null && coreVitals[2]?.trend < 0,
      sparklineData: inpTrend.length > 1 ? inpTrend : undefined,
      trendIsGood: "down" as const,
      tooltip: "Interaction to Next Paint - responsiveness",
      icon: <MousePointer className="w-4 h-4" />,
    },
    {
      id: "cls",
      label: "CLS",
      value: formatVitalValue(coreVitals[1]?.value, coreVitals[1]?.unit),
      delta: coreVitals[1]?.trend,
      deltaIsGood: coreVitals[1]?.trend != null && coreVitals[1]?.trend < 0,
      sparklineData: clsTrend.length > 1 ? clsTrend : undefined,
      trendIsGood: "down" as const,
      tooltip: "Cumulative Layout Shift - visual stability",
      icon: <Activity className="w-4 h-4" />,
    },
  ], [coreVitals, passRate, passRateChange, performanceTrend, lcpTrend, inpTrend, clsTrend]);

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
      badge: allAdditionalMetricsMissing ? "Missing" : undefined,
      content: allAdditionalMetricsMissing ? (
        <div className="p-6 border border-dashed border-muted-foreground/30 rounded-lg bg-muted/20">
          <div className="flex flex-col items-center text-center gap-3">
            <AlertTriangle className="w-8 h-8 text-semantic-warning" />
            <div>
              <h4 className="font-medium text-foreground">Additional Metrics Unavailable</h4>
              <p className="text-sm text-muted-foreground mt-1">
                These metrics are not being returned by the Core Web Vitals worker.
              </p>
            </div>
            <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md font-mono">
              Missing fields: {missingAdditionalMetrics.join(', ')}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="mt-2"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", isRefetching && "animate-spin")} />
              Run Vitals Scan
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {additionalMetrics.map((vital) => (
              <VitalCard key={vital.key} vital={vital} />
            ))}
          </div>
          {missingAdditionalMetrics.length > 0 && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" />
              Some metrics unavailable: {missingAdditionalMetrics.join(', ')}
            </p>
          )}
        </div>
      ),
    },
    {
      id: "issues",
      label: "Issues",
      icon: <ListChecks className="w-4 h-4" />,
      badge: speedsterData?.issueTypes?.length > 0 ? String(speedsterData.issueTypes.length) : undefined,
      content: (() => {
        const issueTypes = speedsterData?.issueTypes || [];
        const issuesSummary = speedsterData?.issuesSummary;
        const topUrls = speedsterData?.topUrls || [];
        const hasNormalizedIssueData = issueTypes.length > 0 || issuesSummary;
        
        if (!hasNormalizedIssueData) {
          return (
            <div className="p-6 border border-dashed border-muted-foreground/30 rounded-lg bg-muted/20">
              <div className="flex flex-col items-center text-center gap-3">
                <FileWarning className="w-8 h-8 text-semantic-warning" />
                <div>
                  <h4 className="font-medium text-foreground">Issue Breakdown Unavailable</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Per-page issue data is not being returned by the Core Web Vitals worker.
                  </p>
                </div>
                <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-2 rounded-md font-mono text-left max-w-md">
                  <div className="font-semibold mb-1">Needed fields:</div>
                  <div>issuesSummary: {`{ totalPagesScanned, totalIssues, impactedPages }`}</div>
                  <div className="mt-1">issueTypes: Array&lt;{`{ issueType, pagesAffected, severity, metric?, exampleUrl? }`}&gt;</div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isRefetching}
                  className="mt-2"
                >
                  <RefreshCw className={cn("w-4 h-4 mr-2", isRefetching && "animate-spin")} />
                  Run Vitals Scan
                </Button>
              </div>
            </div>
          );
        }
        
        const getSeverityBadge = (severity: string | number) => {
          if (typeof severity === 'number') {
            if (severity >= 3 || severity >= 1000) return { label: 'High', variant: 'destructive' as const };
            if (severity >= 2 || severity >= 500) return { label: 'Medium', variant: 'secondary' as const };
            return { label: 'Low', variant: 'outline' as const };
          }
          const s = String(severity).toLowerCase();
          if (s === 'high' || s === 'critical') return { label: 'High', variant: 'destructive' as const };
          if (s === 'medium' || s === 'moderate') return { label: 'Medium', variant: 'secondary' as const };
          return { label: 'Low', variant: 'outline' as const };
        };
        
        const totalPagesScanned = issuesSummary?.totalPagesScanned || topUrls.length || 0;
        const totalIssues = issuesSummary?.totalIssues || issueTypes.length || 0;
        const impactedPages = issuesSummary?.impactedPages || 0;
        
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-muted/50 border text-center">
                <div className="text-2xl font-bold text-foreground">{totalPagesScanned}</div>
                <div className="text-xs text-muted-foreground">Pages Scanned</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 border text-center">
                <div className="text-2xl font-bold text-foreground">{totalIssues}</div>
                <div className="text-xs text-muted-foreground">Issues Found</div>
              </div>
              <div className="p-3 rounded-lg bg-semantic-danger-soft border border-semantic-danger-border text-center">
                <div className="text-2xl font-bold text-semantic-danger">{impactedPages}</div>
                <div className="text-xs text-muted-foreground">Pages Impacted</div>
              </div>
            </div>
            
            {issueTypes.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-3 font-medium">Issue Type</th>
                      <th className="text-center p-3 font-medium w-24">Pages</th>
                      <th className="text-center p-3 font-medium w-20">Severity</th>
                      <th className="text-center p-3 font-medium w-20">Metric</th>
                      <th className="text-left p-3 font-medium">Example URL</th>
                      <th className="text-right p-3 font-medium w-20">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issueTypes.map((issue: any, i: number) => {
                      const severity = getSeverityBadge(issue.severity);
                      return (
                        <tr key={i} className="border-t">
                          <td className="p-3">
                            <div className="font-medium">{issue.issueType}</div>
                          </td>
                          <td className="p-3 text-center font-medium">
                            {issue.pagesAffected ?? '—'}
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant={severity.variant}>{severity.label}</Badge>
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="outline">{issue.metric || 'Other'}</Badge>
                          </td>
                          <td className="p-3 text-muted-foreground truncate max-w-[200px]">
                            {issue.exampleUrl ? (
                              <a 
                                href={issue.exampleUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:text-foreground hover:underline"
                              >
                                {issue.exampleUrl.replace(/^https?:\/\/[^/]+/, '')}
                              </a>
                            ) : '—'}
                          </td>
                          <td className="p-3 text-right">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-7 text-xs"
                              onClick={() => toast.info(`Viewing ${issue.pagesAffected || 'affected'} pages with "${issue.issueType}" issue`)}
                            >
                              View
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            
            {topUrls.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <FileWarning className="w-4 h-4 text-semantic-warning" />
                  Top Affected URLs
                </h4>
                <div className="space-y-1 text-sm">
                  {topUrls.slice(0, 5).map((url: any, i: number) => (
                    <div key={i} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/50">
                      <span className="truncate flex-1 text-muted-foreground">{url.path || url.url}</span>
                      <span className="text-semantic-danger text-xs ml-2">LCP: {url.lcp?.toFixed(2) || '—'}s</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })(),
    },
  ], [coreVitals, additionalMetrics, allAdditionalMetricsMissing, missingAdditionalMetrics, isRefetching, refetch, speedsterData]);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  const missionPrompt: MissionPromptConfig = {
    label: "Ask Speedster",
    placeholder: "e.g., Why is LCP slow? What should I fix first?",
    onSubmit: handleAskSpeedster,
    isLoading: isAskingSpeedster,
  };

  const isScanning = runScanMutation.isPending || isRefetching;
  
  const headerActions: HeaderAction[] = [
    {
      id: "run-vitals-scan",
      icon: <RefreshCw className={cn("w-4 h-4", isScanning && "animate-spin")} />,
      tooltip: "Run Vitals Scan",
      onClick: () => runScanMutation.mutate(),
      disabled: isScanning,
      loading: isScanning,
    },
    {
      id: "export-fix-pack",
      icon: <ExternalLink className="w-4 h-4" />,
      tooltip: "Export Fix Pack",
      onClick: () => toast.info("Export coming soon"),
    },
  ];

  return (
    <CrewPageLayout crewId="speedster">
      <CrewDashboardShell
        crew={crew}
        agentScore={performanceScore}
        agentScoreTooltip="Performance score from Core Web Vitals analysis"
        kpis={kpis}
        inspectorTabs={inspectorTabs}
        missionPrompt={missionPrompt}
        headerActions={headerActions}
        onRefresh={() => refetch()}
        onSettings={() => toast.info("Settings coming soon")}
        isRefreshing={isRefetching || crewIsRefreshing}
        dataUpdatedAt={crewDataUpdatedAt}
      >
      {speedsterData?.benchmarks && Object.keys(speedsterData.benchmarks).length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-semantic-info" />
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
                  better: 'text-semantic-success bg-semantic-success-soft',
                  average: 'text-semantic-warning bg-semantic-warning-soft',
                  worse: 'text-semantic-danger bg-semantic-danger-soft',
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
                
                const isHigherBetter = key === 'vitals.performance_score';
                
                return (
                  <div key={key} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-sm">{metricLabels[key] || key}</span>
                        <div className={cn(
                          "px-2 py-0.5 rounded text-xs font-bold",
                          comparisonColors[bench.comparison] || 'bg-muted'
                        )}>
                          Your: {formatValue(bench.currentValue, bench.unit)}
                        </div>
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
                    
                    <BenchmarkPositionBar
                      value={bench.currentValue}
                      p25={bench.p25}
                      p50={bench.p50}
                      p75={bench.p75}
                      p90={bench.p90}
                      direction={isHigherBetter ? "higher-is-better" : "lower-is-better"}
                    />
                    
                    <div className="grid grid-cols-4 gap-2 text-xs text-muted-foreground mt-1">
                      {isHigherBetter ? (
                        <>
                          <div className="text-center">
                            <div>{formatValue(bench.p90, bench.unit)}</div>
                          </div>
                          <div className="text-center">
                            <div>{formatValue(bench.p75, bench.unit)}</div>
                          </div>
                          <div className="text-center">
                            <div>{formatValue(bench.p50, bench.unit)}</div>
                          </div>
                          <div className="text-center">
                            <div>{formatValue(bench.p25, bench.unit)}</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-center">
                            <div>{formatValue(bench.p25, bench.unit)}</div>
                          </div>
                          <div className="text-center">
                            <div>{formatValue(bench.p50, bench.unit)}</div>
                          </div>
                          <div className="text-center">
                            <div>{formatValue(bench.p75, bench.unit)}</div>
                          </div>
                          <div className="text-center">
                            <div>{formatValue(bench.p90, bench.unit)}</div>
                          </div>
                        </>
                      )}
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
              <Lightbulb className="w-5 h-5 text-semantic-success" />
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
                    <Badge variant="secondary" className="text-semantic-success">
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
              <AlertTriangle className="w-5 h-5 text-semantic-warning" />
              Cooldown Active
            </DialogTitle>
            <DialogDescription>
              {fixPlan?.cooldown.reason || "A cooldown period is active to reduce ranking volatility."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-semantic-warning-soft border border-semantic-warning-border">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-semantic-warning" />
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
              className="bg-semantic-warning hover:bg-semantic-warning/90"
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
              <Zap className="w-5 h-5 text-semantic-success" />
              Execute Fix Plan
            </DialogTitle>
            <DialogDescription>
              Create a GitHub pull request with the recommended fixes from your plan.
            </DialogDescription>
          </DialogHeader>
          
          {executePlanMutation.isPending || fixMutation.isPending ? (
            <div className="py-8 space-y-4">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-semantic-success" />
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
              <div className="flex items-center gap-3 p-4 rounded-lg bg-semantic-success-soft border border-semantic-success-border">
                <CheckCircle className="w-6 h-6 text-semantic-success" />
                <div>
                  <p className="font-medium text-semantic-success">Pull Request Created</p>
                  <p className="text-sm text-muted-foreground">
                    {fixResult.filesChanged} files changed
                  </p>
                </div>
              </div>
              
              {fixResult.consultedSocrates && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-semantic-success-soft border border-semantic-success-border">
                  <Badge className="bg-semantic-success-soft text-semantic-success border-semantic-success-border">
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
              <div className="flex items-start gap-3 p-4 rounded-lg bg-semantic-warning-soft border border-semantic-warning-border">
                <AlertTriangle className="w-6 h-6 text-semantic-warning mt-0.5" />
                <div>
                  <p className="font-medium text-semantic-warning">Integration Required</p>
                  <p className="text-sm text-muted-foreground">{fixResult.error}</p>
                </div>
              </div>
              
              {fixResult.blockedBy && fixResult.blockedBy.length > 0 && (
                <div className="p-3 rounded-lg border space-y-2">
                  <p className="text-sm font-medium">Missing Integrations:</p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {fixResult.blockedBy.map((blocker, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-semantic-warning" />
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
              <div className="flex items-center gap-3 p-4 rounded-lg bg-semantic-danger-soft border border-semantic-danger-border">
                <XCircle className="w-6 h-6 text-semantic-danger" />
                <div>
                  <p className="font-medium text-semantic-danger">Failed to Create PR</p>
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
                        <span className="w-2 h-2 rounded-full bg-semantic-danger" />
                        LCP: {metrics['vitals.lcp'].toFixed(2)}s (target: ≤2.5s)
                      </li>
                    )}
                    {metrics['vitals.cls'] && metrics['vitals.cls'] > 0.1 && (
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-semantic-warning" />
                        CLS: {metrics['vitals.cls'].toFixed(3)} (target: ≤0.1)
                      </li>
                    )}
                    {metrics['vitals.inp'] && metrics['vitals.inp'] > 200 && (
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-semantic-warning" />
                        INP: {Math.round(metrics['vitals.inp'])}ms (target: ≤200ms)
                      </li>
                    )}
                    {performanceScore !== null && performanceScore < 90 && (
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-semantic-warning" />
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
                  className="bg-semantic-success hover:bg-semantic-success/90"
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
    </CrewPageLayout>
  );
}
