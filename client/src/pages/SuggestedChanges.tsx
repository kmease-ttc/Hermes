import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { 
  Check, X, Clock, AlertTriangle, AlertCircle, Info, 
  ChevronRight, Filter, RefreshCw, Settings, Play,
  CheckCircle2, XCircle, Loader2, Eye, BookOpen, Lightbulb
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface ChangeProposal {
  proposalId: string;
  websiteId?: string;
  serviceKey?: string;
  type: string;
  riskLevel: string;
  status: string;
  title: string;
  description?: string;
  rationale?: any;
  evidence?: any;
  changePlan?: any;
  preview?: any;
  verificationPlan?: any;
  rollbackPlan?: any;
  blocking?: boolean;
  createdAt: string;
  updatedAt: string;
  applyLogs?: string;
  verificationResults?: any;
}

interface ProposalAction {
  actionId: string;
  proposalId: string;
  action: string;
  actor: string;
  reason?: string;
  metadata?: any;
  createdAt: string;
}

const riskColors: Record<string, string> = {
  low: "bg-green-100 text-green-800 border-green-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  critical: "bg-red-100 text-red-800 border-red-200",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-800",
  in_review: "bg-purple-100 text-purple-800",
  accepted: "bg-green-100 text-green-800",
  applying: "bg-yellow-100 text-yellow-800",
  applied: "bg-green-200 text-green-900",
  failed: "bg-red-100 text-red-800",
  rejected: "bg-gray-100 text-gray-800",
  snoozed: "bg-gray-100 text-gray-600",
  superseded: "bg-gray-100 text-gray-500",
};

const typeLabels: Record<string, string> = {
  website_setting_update: "Config Update",
  secret_format_fix: "Secret Fix",
  service_expected_output_fix: "Output Fix",
  service_registry_update: "Registry Update",
  run_smoke_tests: "Run Smoke Tests",
  run_daily_diagnosis: "Run Diagnosis",
  rerun_failed_service: "Rerun Service",
  code_patch: "Code Patch",
  implement_endpoint: "Add Endpoint",
  schema_conformance_fix: "Schema Fix",
};

const RiskIcon = ({ risk }: { risk: string }) => {
  switch (risk) {
    case 'critical':
      return <AlertCircle className="h-4 w-4 text-red-600" />;
    case 'high':
      return <AlertTriangle className="h-4 w-4 text-orange-600" />;
    case 'medium':
      return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    default:
      return <Info className="h-4 w-4 text-green-600" />;
  }
};

export default function SuggestedChanges() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [selectedProposal, setSelectedProposal] = useState<ChangeProposal | null>(null);
  const [proposalActions, setProposalActions] = useState<ProposalAction[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ proposalId: string; action: 'accept' | 'apply'; applyNow: boolean } | null>(null);
  const [confirmUnderstood, setConfirmUnderstood] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("proposals");

  const { data: kbaseData } = useQuery({
    queryKey: ["kbaseFindings", "open"],
    queryFn: async () => {
      const res = await fetch("/api/findings/kbase?status=open&limit=50");
      return res.json();
    },
  });

  const kbaseFindings = kbaseData?.findings || [];
  const kbaseCount = kbaseData?.count || 0;

  const updateFindingStatusMutation = useMutation({
    mutationFn: async ({ findingId, status }: { findingId: string; status: string }) => {
      const res = await fetch(`/api/findings/${findingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kbaseFindings"] });
      toast.success("Finding status updated");
    },
    onError: () => {
      toast.error("Failed to update finding");
    },
  });

  const { data: proposalsData, isLoading, refetch } = useQuery({
    queryKey: ["changeProposals", statusFilter, riskFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (riskFilter !== "all") params.set("risk", riskFilter);
      const res = await fetch(`/api/changes?${params.toString()}`);
      return res.json();
    },
  });

  const acceptMutation = useMutation({
    mutationFn: async ({ proposalId, applyNow, confirmationFlags }: { proposalId: string; applyNow?: boolean; confirmationFlags?: any }) => {
      const res = await fetch(`/api/changes/${proposalId}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applyNow, confirmationFlags }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["changeProposals"] });
      toast.success(data.message || "Proposal accepted");
      setShowConfirmDialog(false);
      setPendingAction(null);
      setConfirmUnderstood(false);
    },
    onError: (error: any) => {
      if (error.requiresConfirmation) {
        setShowConfirmDialog(true);
      } else {
        toast.error(error.message || "Failed to accept proposal");
      }
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ proposalId, reason }: { proposalId: string; reason?: string }) => {
      const res = await fetch(`/api/changes/${proposalId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["changeProposals"] });
      toast.success("Proposal rejected");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to reject proposal");
    },
  });

  const snoozeMutation = useMutation({
    mutationFn: async ({ proposalId, until }: { proposalId: string; until: string }) => {
      const res = await fetch(`/api/changes/${proposalId}/snooze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ until }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["changeProposals"] });
      toast.success("Proposal snoozed");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to snooze proposal");
    },
  });

  const applyMutation = useMutation({
    mutationFn: async ({ proposalId, confirmationFlags }: { proposalId: string; confirmationFlags?: any }) => {
      const res = await fetch(`/api/changes/${proposalId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationFlags }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["changeProposals"] });
      toast.success("Apply started");
      setShowConfirmDialog(false);
      setPendingAction(null);
      setConfirmUnderstood(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to apply proposal");
    },
  });

  const handleAccept = (proposal: ChangeProposal, applyNow: boolean = false) => {
    if (proposal.riskLevel === 'high' || proposal.riskLevel === 'critical') {
      setPendingAction({ proposalId: proposal.proposalId, action: 'accept', applyNow });
      setShowConfirmDialog(true);
    } else {
      acceptMutation.mutate({ proposalId: proposal.proposalId, applyNow });
    }
  };

  const handleApply = (proposal: ChangeProposal) => {
    if (proposal.riskLevel === 'high' || proposal.riskLevel === 'critical') {
      setPendingAction({ proposalId: proposal.proposalId, action: 'apply', applyNow: false });
      setShowConfirmDialog(true);
    } else {
      applyMutation.mutate({ proposalId: proposal.proposalId });
    }
  };

  const handleConfirm = () => {
    if (!pendingAction) return;
    
    if (pendingAction.action === 'accept') {
      acceptMutation.mutate({ 
        proposalId: pendingAction.proposalId, 
        applyNow: pendingAction.applyNow,
        confirmationFlags: { understood: true },
      });
    } else {
      applyMutation.mutate({ 
        proposalId: pendingAction.proposalId,
        confirmationFlags: { understood: true },
      });
    }
  };

  const handleSnooze = (proposal: ChangeProposal) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    snoozeMutation.mutate({ proposalId: proposal.proposalId, until: tomorrow.toISOString() });
  };

  const openProposalDetail = async (proposal: ChangeProposal) => {
    setSelectedProposal(proposal);
    try {
      const res = await fetch(`/api/changes/${proposal.proposalId}`);
      const data = await res.json();
      setProposalActions(data.actions || []);
    } catch {
      setProposalActions([]);
    }
  };

  const proposals = proposalsData?.proposals || [];
  const openCount = proposalsData?.openCount || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-page-title">Suggested Changes</h1>
            <p className="text-muted-foreground mt-1">
              Review and apply system recommendations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-lg px-3 py-1" data-testid="badge-open-count">
              {openCount} Open
            </Badge>
            <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-refresh">
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="proposals" className="gap-2" data-testid="tab-proposals">
              <Settings className="h-4 w-4" />
              System Proposals
              {openCount > 0 && (
                <Badge variant="secondary" className="ml-1">{openCount}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="kbase" className="gap-2" data-testid="tab-kbase">
              <BookOpen className="h-4 w-4" />
              Knowledge Base
              {kbaseCount > 0 && (
                <Badge variant="secondary" className="ml-1">{kbaseCount}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="proposals">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="applied">Applied</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="snoozed">Snoozed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Select value={riskFilter} onValueChange={setRiskFilter}>
                <SelectTrigger className="w-[130px]" data-testid="select-risk-filter">
                  <SelectValue placeholder="Risk" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Risks</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : proposals.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
              <h3 className="text-lg font-medium">No proposals to review</h3>
              <p className="text-muted-foreground mt-2">
                All caught up! Run diagnostics to generate new recommendations.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {proposals.map((proposal: ChangeProposal) => (
              <Card 
                key={proposal.proposalId} 
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openProposalDetail(proposal)}
                data-testid={`card-proposal-${proposal.proposalId}`}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <RiskIcon risk={proposal.riskLevel} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium truncate">{proposal.title}</h3>
                          {proposal.blocking && (
                            <Badge variant="destructive" className="text-xs">Blocking</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {typeLabels[proposal.type] || proposal.type}
                          </Badge>
                          <Badge className={`text-xs ${riskColors[proposal.riskLevel]}`}>
                            {proposal.riskLevel.toUpperCase()}
                          </Badge>
                          <Badge className={`text-xs ${statusColors[proposal.status]}`}>
                            {proposal.status}
                          </Badge>
                          {proposal.serviceKey && (
                            <span className="text-xs">Service: {proposal.serviceKey}</span>
                          )}
                        </div>
                        {proposal.description && (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                            {proposal.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      {proposal.status === 'open' && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleSnooze(proposal)}
                            disabled={snoozeMutation.isPending}
                            data-testid={`button-snooze-${proposal.proposalId}`}
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => rejectMutation.mutate({ proposalId: proposal.proposalId })}
                            disabled={rejectMutation.isPending}
                            data-testid={`button-reject-${proposal.proposalId}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button 
                            size="sm"
                            onClick={() => handleAccept(proposal, true)}
                            disabled={acceptMutation.isPending}
                            data-testid={`button-accept-${proposal.proposalId}`}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Accept & Apply
                          </Button>
                        </>
                      )}
                      {proposal.status === 'accepted' && (
                        <Button 
                          size="sm"
                          onClick={() => handleApply(proposal)}
                          disabled={applyMutation.isPending}
                          data-testid={`button-apply-${proposal.proposalId}`}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Apply
                        </Button>
                      )}
                      {proposal.status === 'applying' && (
                        <Badge className="bg-yellow-100 text-yellow-800">
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          Applying...
                        </Badge>
                      )}
                      {proposal.status === 'applied' && (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Applied
                        </Badge>
                      )}
                      {proposal.status === 'failed' && (
                        <Badge className="bg-red-100 text-red-800">
                          <XCircle className="h-3 w-3 mr-1" />
                          Failed
                        </Badge>
                      )}
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
          </TabsContent>

          <TabsContent value="kbase">
            {kbaseFindings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Lightbulb className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
                  <h3 className="text-lg font-medium">No Knowledge Base insights</h3>
                  <p className="text-muted-foreground mt-2">
                    Run the SEO KBase integration to get recommendations.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {kbaseFindings.map((finding: any) => (
                  <Card 
                    key={finding.findingId}
                    className="hover:shadow-md transition-shadow"
                    data-testid={`card-kbase-${finding.findingId}`}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1">
                          <BookOpen className="h-5 w-5 text-indigo-600 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium">{finding.title}</h3>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
                              <Badge className={
                                finding.severity === 'critical' ? "bg-red-100 text-red-800" :
                                finding.severity === 'high' ? "bg-orange-100 text-orange-800" :
                                finding.severity === 'medium' ? "bg-yellow-100 text-yellow-800" :
                                "bg-blue-100 text-blue-800"
                              }>
                                {finding.severity}
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                Source: SEO_KBASE
                              </Badge>
                              {finding.runId && (
                                <span className="text-xs">Run: {finding.runId}</span>
                              )}
                            </div>
                            {finding.description && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {finding.description}
                              </p>
                            )}
                            {finding.recommendedActions && finding.recommendedActions.length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Recommended Actions:</p>
                                <ul className="text-sm space-y-1">
                                  {finding.recommendedActions.slice(0, 2).map((action: string, i: number) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <span className="text-primary">•</span>
                                      <span>{action}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => updateFindingStatusMutation.mutate({ findingId: finding.findingId, status: "accepted" })}
                            disabled={updateFindingStatusMutation.isPending}
                            data-testid={`button-accept-kbase-${finding.findingId}`}
                          >
                            <Check className="h-4 w-4 text-green-600" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => updateFindingStatusMutation.mutate({ findingId: finding.findingId, status: "ignored" })}
                            disabled={updateFindingStatusMutation.isPending}
                            data-testid={`button-ignore-kbase-${finding.findingId}`}
                          >
                            <X className="h-4 w-4 text-gray-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Sheet open={!!selectedProposal} onOpenChange={() => setSelectedProposal(null)}>
        <SheetContent className="w-[500px] sm:max-w-[500px]">
          {selectedProposal && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <RiskIcon risk={selectedProposal.riskLevel} />
                  {selectedProposal.title}
                </SheetTitle>
                <SheetDescription>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">
                      {typeLabels[selectedProposal.type] || selectedProposal.type}
                    </Badge>
                    <Badge className={riskColors[selectedProposal.riskLevel]}>
                      {selectedProposal.riskLevel.toUpperCase()}
                    </Badge>
                    <Badge className={statusColors[selectedProposal.status]}>
                      {selectedProposal.status}
                    </Badge>
                  </div>
                </SheetDescription>
              </SheetHeader>

              <ScrollArea className="h-[calc(100vh-200px)] mt-6">
                <div className="space-y-6 pr-4">
                  {selectedProposal.description && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground">{selectedProposal.description}</p>
                    </div>
                  )}

                  {selectedProposal.rationale && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Why This Change</h4>
                      <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                        {JSON.stringify(selectedProposal.rationale, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedProposal.evidence && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Evidence</h4>
                      <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                        {JSON.stringify(selectedProposal.evidence, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedProposal.preview && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Preview</h4>
                      <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                        {JSON.stringify(selectedProposal.preview, null, 2)}
                      </pre>
                    </div>
                  )}

                  {selectedProposal.changePlan && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Change Plan</h4>
                      <div className="space-y-2">
                        {(selectedProposal.changePlan as any).steps?.map((step: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <span className="bg-muted rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">
                              {step.stepNumber || i + 1}
                            </span>
                            <span>{step.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedProposal.verificationPlan && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Verification Plan</h4>
                      <ul className="text-sm text-muted-foreground list-disc list-inside">
                        {(selectedProposal.verificationPlan as any).steps?.map((step: any, i: number) => (
                          <li key={i}>{step.type}: {step.target || 'all'}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedProposal.rollbackPlan && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Rollback Plan</h4>
                      <p className="text-sm text-muted-foreground">
                        Method: {(selectedProposal.rollbackPlan as any).method}
                      </p>
                      {(selectedProposal.rollbackPlan as any).steps && (
                        <ul className="text-sm text-muted-foreground list-disc list-inside mt-1">
                          {(selectedProposal.rollbackPlan as any).steps.map((step: string, i: number) => (
                            <li key={i}>{step}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {selectedProposal.applyLogs && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Apply Logs</h4>
                      <pre className="text-xs bg-muted p-3 rounded-md overflow-auto whitespace-pre-wrap">
                        {selectedProposal.applyLogs}
                      </pre>
                    </div>
                  )}

                  {selectedProposal.verificationResults && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Verification Results</h4>
                      <pre className="text-xs bg-muted p-3 rounded-md overflow-auto">
                        {JSON.stringify(selectedProposal.verificationResults, null, 2)}
                      </pre>
                    </div>
                  )}

                  {proposalActions.length > 0 && (
                    <div>
                      <Separator className="my-4" />
                      <h4 className="font-medium text-sm mb-2">Activity Log</h4>
                      <div className="space-y-2">
                        {proposalActions.map((action) => (
                          <div key={action.actionId} className="flex items-start gap-2 text-sm">
                            <Badge variant="outline" className="text-xs">
                              {action.action}
                            </Badge>
                            <span className="text-muted-foreground">
                              by {action.actor} at {new Date(action.createdAt).toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>

              {selectedProposal.status === 'open' && (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => handleSnooze(selectedProposal)}
                    disabled={snoozeMutation.isPending}
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    Snooze
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      rejectMutation.mutate({ proposalId: selectedProposal.proposalId });
                      setSelectedProposal(null);
                    }}
                    disabled={rejectMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button 
                    onClick={() => handleAccept(selectedProposal, true)}
                    disabled={acceptMutation.isPending}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Accept & Apply
                  </Button>
                </div>
              )}

              {selectedProposal.status === 'accepted' && (
                <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                  <Button 
                    onClick={() => handleApply(selectedProposal)}
                    disabled={applyMutation.isPending}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Apply Now
                  </Button>
                </div>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Confirm High-Risk Action
            </DialogTitle>
            <DialogDescription>
              This proposal has a high or critical risk level. Please confirm you understand the potential impact before proceeding.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-2 py-4">
            <Checkbox 
              id="confirm-understood"
              checked={confirmUnderstood}
              onCheckedChange={(checked) => setConfirmUnderstood(checked === true)}
            />
            <label htmlFor="confirm-understood" className="text-sm leading-5">
              I understand that this change may have significant impact and I have reviewed the change plan and rollback procedures.
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowConfirmDialog(false);
              setPendingAction(null);
              setConfirmUnderstood(false);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm}
              disabled={!confirmUnderstood || acceptMutation.isPending || applyMutation.isPending}
            >
              {(acceptMutation.isPending || applyMutation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
