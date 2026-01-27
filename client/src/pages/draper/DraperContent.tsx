import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { getCrewMember } from "@/config/agents";
import { useSiteContext } from "@/hooks/useSiteContext";
import { useCrewStatus } from "@/hooks/useCrewStatus";
import { toast } from "sonner";
import {
  CrewDashboardShell,
  type CrewIdentity,
  type InspectorTab,
  type HeaderAction,
} from "@/components/crew-dashboard";
import { KeyMetricsGrid } from "@/components/key-metrics";
import { CrewPageLayout } from "@/components/crew/CrewPageLayout";
import { NoDeadEndsState, TableEmptyState, ChartEmptyState } from "@/components/empty-states";
import type { MetaStatus, RemediationAction } from "@shared/noDeadEnds";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  DollarSign,
  Target,
  TrendingUp,
  Calculator,
  Megaphone,
  Play,
  Loader2,
  Settings,
  ListChecks,
  Clock,
  Search,
  FileText,
  Zap,
  Ban,
  Info,
  Plug,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DRAPER_ACCENT_COLOR = "#FB7185";

interface DraperSnapshot {
  spend7d: number;
  conversions7d: number;
  cpa7d: number;
  roas7d: number;
  lastUpdatedAt: string | null;
  isConfigured: boolean;
}

interface DraperFinding {
  id: string;
  issueType: string;
  scope: string;
  scopeType: "campaign" | "ad_group" | "keyword" | "ad";
  impact: "Low" | "Med" | "High";
  recommendedAction: string;
  fixAction?: string;
}

interface DraperNextStep {
  id: string;
  title: string;
  description: string;
  effort: "S" | "M" | "L";
  impact: "Low" | "Med" | "High";
  fixAction?: string;
}

interface DraperSettings {
  targetCpa: number | null;
  targetRoas: number | null;
  dailySpendCap: number | null;
  autoApplyNegatives: boolean;
  pauseLowPerformers: boolean;
}

interface DraperAction {
  id: number;
  actionType: string;
  status: "queued" | "running" | "done" | "failed" | "cancelled";
  note: string;
  createdAt: string;
  payload?: Record<string, unknown>;
}

interface DraperApiResult {
  data: DraperSnapshot | null;
  findings: DraperFinding[];
  actions: DraperAction[];
  isPreviewMode: boolean;
  errorStatus: number | null;
}

const MOCK_SNAPSHOT: DraperSnapshot = {
  spend7d: 12450,
  conversions7d: 847,
  cpa7d: 14.7,
  roas7d: 3.2,
  lastUpdatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  isConfigured: true,
};

const MOCK_FINDINGS: DraperFinding[] = [
  {
    id: "1",
    issueType: "Low Quality Score",
    scope: "Brand Campaign",
    scopeType: "campaign",
    impact: "High",
    recommendedAction: "Improve ad relevance and landing page experience",
    fixAction: "improve_quality_score",
  },
  {
    id: "2",
    issueType: "Wasted Spend",
    scope: "Non-Converting Keywords",
    scopeType: "keyword",
    impact: "High",
    recommendedAction: "Add negative keywords for irrelevant search terms",
    fixAction: "add_negatives",
  },
  {
    id: "3",
    issueType: "Missing Extensions",
    scope: "Services Ad Group",
    scopeType: "ad_group",
    impact: "Med",
    recommendedAction: "Add sitelink and callout extensions",
    fixAction: "add_extensions",
  },
  {
    id: "4",
    issueType: "Budget Exhaustion",
    scope: "High-Intent Campaign",
    scopeType: "campaign",
    impact: "Med",
    recommendedAction: "Increase daily budget to capture more conversions",
    fixAction: "adjust_budget",
  },
  {
    id: "5",
    issueType: "Weak CTR",
    scope: "Generic Keywords",
    scopeType: "keyword",
    impact: "Low",
    recommendedAction: "Test new ad copy variations",
    fixAction: "test_ad_copy",
  },
];

const MOCK_NEXT_STEPS: DraperNextStep[] = [
  {
    id: "1",
    title: "Add Negative Keywords",
    description: "Block 23 irrelevant search terms wasting $340/week",
    effort: "S",
    impact: "High",
    fixAction: "bulk_add_negatives",
  },
  {
    id: "2",
    title: "Pause Underperforming Ads",
    description: "5 ads have <0.5% CTR and should be paused",
    effort: "S",
    impact: "Med",
    fixAction: "pause_low_ctr_ads",
  },
  {
    id: "3",
    title: "Reallocate Budget",
    description: "Shift $500/day from low-ROAS to high-ROAS campaigns",
    effort: "M",
    impact: "High",
    fixAction: "reallocate_budget",
  },
  {
    id: "4",
    title: "Update Landing Pages",
    description: "3 campaigns have landing page mismatch issues",
    effort: "L",
    impact: "High",
    fixAction: "fix_landing_pages",
  },
  {
    id: "5",
    title: "Expand Match Types",
    description: "Add phrase match variants for top performers",
    effort: "M",
    impact: "Med",
    fixAction: "expand_match_types",
  },
];

const MOCK_SETTINGS: DraperSettings = {
  targetCpa: 15,
  targetRoas: 3.5,
  dailySpendCap: 2000,
  autoApplyNegatives: false,
  pauseLowPerformers: false,
};

const MOCK_ACTIONS: DraperAction[] = [
  {
    id: 1,
    actionType: "add_negatives",
    status: "done",
    note: "Added 12 negative keywords",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 2,
    actionType: "pause_low_ctr_ads",
    status: "running",
    note: "Pausing 5 low-performing ads",
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 3,
    actionType: "campaign_review",
    status: "queued",
    note: "Full campaign audit requested",
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
];

function getDraperMeta(result: DraperApiResult): MetaStatus {
  if (result.errorStatus === 401 || result.errorStatus === 403) {
    return {
      status: "needs_setup",
      reasonCode: "DRAPER_WORKER_NOT_CONNECTED",
      userMessage: "Connect Draper worker to see Google Ads insights",
      developerMessage: "API key required for /api/draper endpoints",
      actions: [
        { id: "configure", label: "Configure Draper", kind: "route", route: "/settings/integrations", priority: 1 },
        { id: "docs", label: "View Setup Guide", kind: "href", href: "#draper-setup", priority: 2 },
      ],
    };
  }
  if (result.errorStatus) {
    return {
      status: "error",
      reasonCode: "DRAPER_API_ERROR",
      userMessage: "Failed to load Google Ads data. Please try again.",
      developerMessage: `API returned status ${result.errorStatus}`,
      actions: [
        { id: "retry", label: "Retry", kind: "retry", priority: 1 },
        { id: "view_logs", label: "View Logs", kind: "view_logs", priority: 2 },
      ],
    };
  }
  if (!result.data || (result.data as any).status === "stub") {
    return {
      status: "empty",
      reasonCode: "NO_DRAPER_DATA",
      userMessage: "No Google Ads data yet. Connect your Google Ads account to get started.",
      actions: [
        { id: "connect", label: "Connect Google Ads", kind: "route", route: "/settings/integrations", priority: 1 },
      ],
    };
  }
  return { status: "ok", reasonCode: "SUCCESS", userMessage: "Data loaded", actions: [] };
}

function getEmptyFindingsMeta(): MetaStatus {
  return {
    status: "empty",
    reasonCode: "NO_FINDINGS",
    userMessage: "No issues found. Your campaigns are performing well!",
    actions: [
      { id: "run_scan", label: "Run New Scan", kind: "run_scan", priority: 1 },
    ],
  };
}

function getEmptyActionsMeta(): MetaStatus {
  return {
    status: "empty",
    reasonCode: "NO_ACTIONS_QUEUED",
    userMessage: "No actions in queue. Review findings to queue optimization actions.",
    actions: [
      { id: "view_findings", label: "View Findings", kind: "route", route: "#findings", priority: 1 },
    ],
  };
}

function getImpactBadgeColor(impact: "Low" | "Med" | "High") {
  switch (impact) {
    case "High":
      return "bg-semantic-danger-soft text-semantic-danger border-semantic-danger-border";
    case "Med":
      return "bg-semantic-warning-soft text-semantic-warning border-semantic-warning-border";
    case "Low":
      return "bg-semantic-info-soft text-semantic-info border-semantic-info-border";
  }
}

function getEffortBadgeColor(effort: "S" | "M" | "L") {
  switch (effort) {
    case "S":
      return "bg-semantic-success-soft text-semantic-success border-semantic-success-border";
    case "M":
      return "bg-semantic-warning-soft text-semantic-warning border-semantic-warning-border";
    case "L":
      return "bg-semantic-danger-soft text-semantic-danger border-semantic-danger-border";
  }
}

function getStatusBadge(status: DraperAction["status"]) {
  switch (status) {
    case "queued":
      return <Badge variant="outline" className="bg-muted text-muted-foreground border-border"><Clock className="w-3 h-3 mr-1" />Queued</Badge>;
    case "running":
      return <Badge variant="outline" className="bg-semantic-info-soft text-semantic-info border-semantic-info-border"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Running</Badge>;
    case "done":
      return <Badge variant="outline" className="bg-semantic-success-soft text-semantic-success border-semantic-success-border"><CheckCircle2 className="w-3 h-3 mr-1" />Done</Badge>;
    case "failed":
      return <Badge variant="outline" className="bg-semantic-danger-soft text-semantic-danger border-semantic-danger-border"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
    case "cancelled":
      return <Badge variant="outline" className="bg-muted text-muted-foreground border-border"><Ban className="w-3 h-3 mr-1" />Cancelled</Badge>;
  }
}

export default function DraperContent() {
  const { currentSite } = useSiteContext();
  const siteId = currentSite?.id || 1;
  const { score: unifiedScore, isRefreshing: crewIsRefreshing, dataUpdatedAt: crewDataUpdatedAt } = useCrewStatus({ siteId: String(siteId), crewId: 'draper' });
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const agent = getCrewMember("google_ads_connector");

  const [settingsForm, setSettingsForm] = useState<DraperSettings>(MOCK_SETTINGS);

  const { data: apiResult, isLoading: snapshotLoading, refetch: refetchSnapshot } = useQuery({
    queryKey: ["draper", "snapshot", siteId],
    queryFn: async (): Promise<DraperApiResult> => {
      try {
        const res = await fetch(`/api/draper/snapshot?site_id=${siteId}`);
        if (res.status === 401 || res.status === 403) {
          return { data: MOCK_SNAPSHOT, findings: MOCK_FINDINGS, actions: MOCK_ACTIONS, isPreviewMode: true, errorStatus: res.status };
        }
        if (!res.ok) {
          return { data: MOCK_SNAPSHOT, findings: MOCK_FINDINGS, actions: MOCK_ACTIONS, isPreviewMode: true, errorStatus: res.status };
        }
        const data = await res.json();
        return { 
          data: data.metrics || data, 
          findings: data.findings || [], 
          actions: data.actions || [], 
          isPreviewMode: false, 
          errorStatus: null 
        };
      } catch {
        return { data: MOCK_SNAPSHOT, findings: MOCK_FINDINGS, actions: MOCK_ACTIONS, isPreviewMode: true, errorStatus: 500 };
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  const snapshot = apiResult?.data || MOCK_SNAPSHOT;
  const isPreviewMode = apiResult?.isPreviewMode ?? true;
  const errorStatus = apiResult?.errorStatus;
  const draperMeta = useMemo(() => getDraperMeta(apiResult || { data: null, findings: [], actions: [], isPreviewMode: true, errorStatus: 401 }), [apiResult]);

  const { data: findings = isPreviewMode ? MOCK_FINDINGS : [], isLoading: findingsLoading, refetch: refetchFindings } = useQuery({
    queryKey: ["draper", "findings", siteId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/draper/findings?site_id=${siteId}`);
        if (!res.ok) return MOCK_FINDINGS;
        return await res.json();
      } catch {
        return MOCK_FINDINGS;
      }
    },
    staleTime: 1000 * 60 * 5,
    enabled: !isPreviewMode,
  });

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["draper", "settings", siteId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/draper/settings?site_id=${siteId}`);
        if (!res.ok) return MOCK_SETTINGS;
        const data = await res.json();
        const settingsData = data.settings || data;
        setSettingsForm(settingsData);
        return settingsData;
      } catch {
        return MOCK_SETTINGS;
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: actions = isPreviewMode ? MOCK_ACTIONS : [], isLoading: actionsLoading, refetch: refetchActions } = useQuery({
    queryKey: ["draper", "actions", siteId],
    queryFn: async () => {
      try {
        const res = await fetch(`/api/draper/actions?site_id=${siteId}`);
        if (!res.ok) return MOCK_ACTIONS;
        return await res.json();
      } catch {
        return MOCK_ACTIONS;
      }
    },
    staleTime: 1000 * 30,
    enabled: !isPreviewMode,
  });

  const handleRemediationAction = (action: RemediationAction) => {
    switch (action.kind) {
      case "route":
        if (action.route) {
          if (action.route.startsWith("#")) {
            const tabId = action.route.slice(1);
            document.querySelector(`[data-testid="tab-${tabId}"]`)?.scrollIntoView({ behavior: "smooth" });
          } else {
            navigate(action.route);
          }
        }
        break;
      case "href":
        if (action.href) {
          window.open(action.href, "_blank");
        }
        break;
      case "retry":
        refetchSnapshot();
        refetchFindings();
        refetchActions();
        break;
      case "run_scan":
        enqueueAction.mutate({ action_type: "full_scan", note: "Full campaign scan" });
        break;
      case "view_logs":
        navigate("/settings/logs");
        break;
      default:
        break;
    }
  };

  const enqueueAction = useMutation({
    mutationFn: async (data: { action_type: string; payload?: Record<string, unknown>; note: string }) => {
      const res = await fetch("/api/draper/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId, ...data }),
      });
      if (!res.ok) throw new Error("Failed to enqueue action");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Action queued");
      queryClient.invalidateQueries({ queryKey: ["draper", "actions", siteId] });
    },
    onError: () => {
      toast.error("Failed to queue action");
    },
  });

  const saveSettings = useMutation({
    mutationFn: async (data: DraperSettings) => {
      const res = await fetch("/api/draper/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_id: siteId, ...data }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Settings saved");
      queryClient.invalidateQueries({ queryKey: ["draper", "settings", siteId] });
    },
    onError: () => {
      toast.error("Failed to save settings");
    },
  });

  const cancelAction = useMutation({
    mutationFn: async (actionId: number) => {
      const res = await fetch(`/api/draper/actions/${actionId}/cancel`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to cancel action");
      return res.json();
    },
    onSuccess: () => {
      toast.success("Action cancelled");
      queryClient.invalidateQueries({ queryKey: ["draper", "actions", siteId] });
    },
    onError: () => {
      toast.error("Failed to cancel action");
    },
  });

  const crew: CrewIdentity = {
    crewId: "google_ads_connector",
    crewName: "Draper",
    subtitle: "Paid Ads",
    description: "Designs campaigns, messaging, and experiments that drive acquisition and conversion.",
    avatar: <Megaphone className="w-6 h-6" style={{ color: DRAPER_ACCENT_COLOR }} />,
    accentColor: DRAPER_ACCENT_COLOR,
    capabilities: ["Campaign Review", "Spend Analysis", "Ad Copy Optimization", "Landing Page Alignment"],
    monitors: ["Ad Spend", "Conversions", "ROAS"],
  };

  const displayFindings = isPreviewMode ? MOCK_FINDINGS : findings;
  const displayActions = isPreviewMode ? MOCK_ACTIONS : actions;

  const highPriorityCount = displayFindings.filter((f: DraperFinding) => f.impact === "High").length;
  const completedCount = displayActions.filter((a: DraperAction) => a.status === "done").length;

  const kpis = [
    {
      id: "spend",
      label: "Spend (7d)",
      value: snapshot?.spend7d ?? 0,
      format: "currency" as const,
      status: "neutral" as const,
      icon: <DollarSign className="w-4 h-4" />,
    },
    {
      id: "conversions",
      label: "Conversions (7d)",
      value: snapshot?.conversions7d ?? 0,
      format: "integer" as const,
      status: "neutral" as const,
      icon: <Target className="w-4 h-4" />,
    },
    {
      id: "cpa",
      label: "CPA (7d)",
      value: snapshot?.cpa7d ?? 0,
      format: "currency" as const,
      status: "neutral" as const,
      icon: <Calculator className="w-4 h-4" />,
    },
    {
      id: "roas",
      label: "ROAS (7d)",
      value: snapshot?.roas7d ?? 0,
      format: "decimal" as const,
      suffix: "x",
      status: "neutral" as const,
      icon: <TrendingUp className="w-4 h-4" />,
    },
  ];

  const inspectorTabs: InspectorTab[] = [
    {
      id: "findings",
      label: "Findings",
      icon: <Search className="w-4 h-4" />,
      badge: displayFindings.length,
      state: findingsLoading ? "loading" : "ready",
      content: (
        <div className="space-y-4" data-testid="tab-findings">
          {isPreviewMode && (
            <NoDeadEndsState
              meta={draperMeta}
              title="Worker Not Connected"
              onAction={handleRemediationAction}
              compact
            />
          )}
          {displayFindings.length === 0 ? (
            <TableEmptyState
              meta={getEmptyFindingsMeta()}
              title="No Findings"
              onAction={handleRemediationAction}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Issue Type</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Impact</TableHead>
                  <TableHead>Recommended Action</TableHead>
                  <TableHead className="w-[100px]">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayFindings.map((finding: DraperFinding) => (
                  <TableRow key={finding.id}>
                    <TableCell className="font-medium">{finding.issueType}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs capitalize">
                          {finding.scopeType.replace("_", " ")}
                        </Badge>
                        <span className="text-muted-foreground">{finding.scope}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn("text-xs", getImpactBadgeColor(finding.impact))}>
                        {finding.impact}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] truncate">{finding.recommendedAction}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => enqueueAction.mutate({
                          action_type: finding.fixAction || "fix_finding",
                          payload: { finding_id: finding.id },
                          note: `Fix: ${finding.issueType}`,
                        })}
                        disabled={enqueueAction.isPending}
                        data-testid={`button-fix-finding-${finding.id}`}
                      >
                        <Zap className="w-3 h-3 mr-1" />
                        Fix
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      ),
    },
    {
      id: "next-steps",
      label: "Next Steps",
      icon: <ListChecks className="w-4 h-4" />,
      badge: MOCK_NEXT_STEPS.length,
      state: "ready",
      content: (
        <div className="space-y-3">
          {MOCK_NEXT_STEPS.map((step) => (
            <div
              key={step.id}
              className="flex items-center justify-between p-4 rounded-lg bg-card/40 border border-border"
            >
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{step.title}</span>
                  <Badge variant="outline" className={cn("text-xs", getEffortBadgeColor(step.effort))}>
                    {step.effort === "S" ? "Small" : step.effort === "M" ? "Medium" : "Large"}
                  </Badge>
                  <Badge variant="outline" className={cn("text-xs", getImpactBadgeColor(step.impact))}>
                    {step.impact} Impact
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground truncate">{step.description}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => enqueueAction.mutate({
                  action_type: step.fixAction || "execute_step",
                  payload: { step_id: step.id },
                  note: step.title,
                })}
                disabled={enqueueAction.isPending}
                data-testid={`button-fix-step-${step.id}`}
              >
                <Zap className="w-3 h-3 mr-1" />
                Fix
              </Button>
            </div>
          ))}
        </div>
      ),
    },
    {
      id: "controls",
      label: "Controls",
      icon: <Settings className="w-4 h-4" />,
      state: settingsLoading ? "loading" : "ready",
      content: (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target-cpa">Target CPA ($)</Label>
              <Input
                id="target-cpa"
                type="number"
                min="0"
                step="0.01"
                value={settingsForm.targetCpa ?? ""}
                onChange={(e) => setSettingsForm({ ...settingsForm, targetCpa: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder="e.g., 15.00"
                data-testid="input-target-cpa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target-roas">Target ROAS</Label>
              <Input
                id="target-roas"
                type="number"
                min="0"
                step="0.1"
                value={settingsForm.targetRoas ?? ""}
                onChange={(e) => setSettingsForm({ ...settingsForm, targetRoas: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder="e.g., 3.5"
                data-testid="input-target-roas"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="daily-spend-cap">Daily Spend Cap ($)</Label>
              <Input
                id="daily-spend-cap"
                type="number"
                min="0"
                step="1"
                value={settingsForm.dailySpendCap ?? ""}
                onChange={(e) => setSettingsForm({ ...settingsForm, dailySpendCap: e.target.value ? parseFloat(e.target.value) : null })}
                placeholder="e.g., 2000"
                data-testid="input-daily-spend-cap"
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-apply negatives</Label>
                <p className="text-sm text-muted-foreground">Automatically add recommended negative keywords</p>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Switch disabled checked={settingsForm.autoApplyNegatives} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Coming soon</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Pause low performers</Label>
                <p className="text-sm text-muted-foreground">Automatically pause ads below threshold</p>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Switch disabled checked={settingsForm.pauseLowPerformers} />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Coming soon</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className="pt-4">
            <Button
              onClick={() => saveSettings.mutate(settingsForm)}
              disabled={saveSettings.isPending}
              style={{ backgroundColor: DRAPER_ACCENT_COLOR }}
              data-testid="button-save-settings"
            >
              {saveSettings.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Settings
            </Button>
          </div>
        </div>
      ),
    },
    {
      id: "action-queue",
      label: "Action Queue",
      icon: <Clock className="w-4 h-4" />,
      badge: displayActions.filter((a: DraperAction) => a.status === "queued" || a.status === "running").length,
      state: actionsLoading ? "loading" : "ready",
      content: (
        <div className="space-y-3" data-testid="tab-action-queue">
          {isPreviewMode && (
            <NoDeadEndsState
              meta={draperMeta}
              title="Worker Not Connected"
              onAction={handleRemediationAction}
              compact
            />
          )}
          {displayActions.length === 0 ? (
            <TableEmptyState
              meta={getEmptyActionsMeta()}
              title="No Actions Queued"
              onAction={handleRemediationAction}
            />
          ) : (
            displayActions.map((action: DraperAction) => (
              <div
                key={action.id}
                className="flex items-center justify-between p-4 rounded-lg bg-card/40 border border-border"
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">{action.actionType.replace(/_/g, " ")}</span>
                    {getStatusBadge(action.status)}
                  </div>
                  <p className="text-sm text-muted-foreground">{action.note}</p>
                  <p className="text-xs text-muted-foreground/70">
                    {new Date(action.createdAt).toLocaleString()}
                  </p>
                </div>
                {action.status === "queued" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => cancelAction.mutate(action.id)}
                    disabled={cancelAction.isPending}
                    data-testid={`button-cancel-action-${action.id}`}
                  >
                    <Ban className="w-3 h-3 mr-1" />
                    Cancel
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      ),
    },
  ];

  const headerActions: HeaderAction[] = [
    {
      id: "refresh",
      icon: <RefreshCw className="w-4 h-4" />,
      tooltip: "Refresh data",
      onClick: () => refetchSnapshot(),
      loading: snapshotLoading,
    },
  ];

  return (
    <CrewPageLayout crewId="draper">
      <div className="space-y-4">
        {draperMeta.status !== "ok" && (
          <NoDeadEndsState
            meta={draperMeta}
            title="Worker Not Connected"
            onAction={handleRemediationAction}
            isLoading={snapshotLoading}
          />
        )}

        <CrewDashboardShell
          crew={crew}
          kpis={kpis}
          inspectorTabs={inspectorTabs}
          headerActions={headerActions}
          onRefresh={() => refetchSnapshot()}
          isRefreshing={snapshotLoading || crewIsRefreshing}
          dataUpdatedAt={crewDataUpdatedAt}
        />
      </div>
    </CrewPageLayout>
  );
}
