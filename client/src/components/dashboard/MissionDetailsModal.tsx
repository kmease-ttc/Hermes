import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { 
  Target, 
  AlertTriangle, 
  CheckCircle2, 
  Users, 
  BarChart3, 
  ArrowRight,
  ExternalLink,
  Package,
  Clock,
  Loader2,
  FileText,
  Lightbulb,
  Zap
} from "lucide-react";
import { AGENTS, getCrewMember } from "@/config/agents";
import { toast } from "sonner";

interface MissionDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mission: {
    id?: string | number;
    title: string;
    why?: string;
    description?: string;
    impact?: string;
    effort?: string;
    confidence?: string;
    agents?: Array<{ id: string; name?: string }>;
    sourceAgents?: string[];
    category?: string;
    status?: string;
    evidence?: {
      runId?: string;
      sourceConnector?: string;
      timestamp?: string;
      metrics?: Array<{ label: string; value: string; change?: string }>;
      urls?: string[];
      queries?: string[];
      sampleRows?: any[];
    };
    decisionRule?: string;
    recommendations?: Array<{
      step: string;
      rationale?: string;
      impact?: string;
      effort?: string;
      completed?: boolean;
    }>;
    createdAt?: string;
    updatedAt?: string;
  } | null;
  onExportFixPack?: () => void;
  onMarkDone?: (missionId: string | number) => void;
}

export function MissionDetailsModal({ 
  open, 
  onOpenChange, 
  mission,
  onExportFixPack,
  onMarkDone
}: MissionDetailsModalProps) {
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setCheckedSteps(new Set());
    }
  }, [open, mission?.id]);

  if (!mission) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl bg-card/95 backdrop-blur-xl border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Target className="w-5 h-5 text-gold" />
              Mission Details
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Lightbulb className="w-12 h-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Mission Data Available</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Run diagnostics to generate mission details. The crew will analyze your site and create actionable recommendations.
            </p>
            <Button 
              variant="gold" 
              className="mt-6 rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              Got It
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const agentSources = mission.sourceAgents?.length 
    ? mission.sourceAgents.map((id: string) => ({ id }))
    : mission.agents?.map((a: any) => ({ id: a.agentId || a.id || a })) || [];

  const toggleStep = (idx: number) => {
    const newChecked = new Set(checkedSteps);
    if (newChecked.has(idx)) {
      newChecked.delete(idx);
    } else {
      newChecked.add(idx);
    }
    setCheckedSteps(newChecked);
  };

  const handleMarkDone = () => {
    if (mission.id && onMarkDone) {
      setIsLoading(true);
      onMarkDone(mission.id);
      setTimeout(() => {
        setIsLoading(false);
        toast.success("Mission marked as done");
        onOpenChange(false);
      }, 500);
    }
  };

  const defaultRecommendations = [
    { step: "Review the evidence and metrics below", rationale: "Understand the scope of the issue" },
    { step: "Implement the suggested fix", rationale: "Address the root cause" },
    { step: "Verify changes with a follow-up diagnostic run", rationale: "Confirm the fix worked" },
  ];

  const recommendations = mission.recommendations?.length ? mission.recommendations : defaultRecommendations;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden bg-card/95 backdrop-blur-xl border-border" data-testid="mission-details-modal">
        <DialogHeader className="pb-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-foreground leading-tight">
                {mission.title}
              </DialogTitle>
              {mission.why && (
                <DialogDescription className="text-muted-foreground mt-1">
                  {mission.why}
                </DialogDescription>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <Badge className={cn(
                "text-xs",
                mission.impact === "High" ? "bg-semantic-danger-soft text-semantic-danger" :
                mission.impact === "Low" ? "bg-semantic-success-soft text-semantic-success" :
                "bg-semantic-warning-soft text-semantic-warning"
              )}>
                Impact: {mission.impact || "Medium"}
              </Badge>
              {mission.confidence && (
                <Badge variant="outline" className="text-xs">
                  {mission.confidence}% confidence
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-180px)] pr-4">
          <div className="space-y-6 py-4">
            {agentSources.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Crew Sources
                </h4>
                <div className="flex flex-wrap gap-2">
                  {agentSources.map((agent: { id: string }, idx: number) => {
                    const crew = getCrewMember(agent.id);
                    if (!crew || crew.nickname === "Unknown") {
                      return (
                        <Badge 
                          key={`agent-${idx}`}
                          className="text-xs font-medium border-0 px-3 py-1 bg-muted text-muted-foreground"
                        >
                          {agent.id}
                        </Badge>
                      );
                    }
                    return (
                      <Badge 
                        key={agent.id}
                        className="text-xs font-medium border-0 px-3 py-1"
                        style={{ 
                          backgroundColor: `${crew.color}20`,
                          color: crew.color 
                        }}
                      >
                        {crew.nickname}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            <Separator />

            {/* Provenance Section */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-accent" />
                Provenance
              </h4>
              <Card className="bg-card/60 backdrop-blur-sm border-border">
                <CardContent className="p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Status:</span>
                      <span className={cn(
                        "ml-2 font-medium",
                        mission.status === 'verified' ? "text-semantic-success" :
                        mission.status === 'unverified' ? "text-semantic-warning" :
                        "text-semantic-danger"
                      )}>
                        {mission.status === 'verified' ? 'Verified' :
                         mission.status === 'unverified' ? 'Unverified' : 'Placeholder'}
                      </span>
                    </div>
                    {mission.evidence?.runId && (
                      <div>
                        <span className="text-muted-foreground">Run ID:</span>
                        <span className="ml-2 font-mono text-foreground">{mission.evidence.runId}</span>
                      </div>
                    )}
                    {mission.evidence?.sourceConnector && (
                      <div>
                        <span className="text-muted-foreground">Source:</span>
                        <span className="ml-2 text-foreground">{mission.evidence.sourceConnector}</span>
                      </div>
                    )}
                    {mission.evidence?.timestamp && (
                      <div>
                        <span className="text-muted-foreground">Generated:</span>
                        <span className="ml-2 text-foreground">
                          {new Date(mission.evidence.timestamp).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                  {mission.decisionRule && (
                    <div className="pt-2 border-t border-border">
                      <span className="text-xs text-muted-foreground">Decision Rule:</span>
                      <p className="text-xs text-foreground mt-1">{mission.decisionRule}</p>
                    </div>
                  )}
                  {!mission.evidence?.runId && !mission.decisionRule && (
                    <p className="text-xs text-muted-foreground italic">
                      {mission.status === 'verified' 
                        ? "This recommendation is backed by real diagnostic data."
                        : "Run diagnostics to generate provenance data for this recommendation."}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-gold" />
                Evidence
              </h4>
              
              {mission.evidence?.metrics && mission.evidence.metrics.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {mission.evidence.metrics.map((metric, idx) => (
                    <Card key={idx} className="bg-card/60 backdrop-blur-sm border-border">
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">{metric.label}</p>
                        <p className="text-lg font-semibold text-foreground">{metric.value}</p>
                        {metric.change && (
                          <p className={cn(
                            "text-xs",
                            metric.change.startsWith("-") ? "text-semantic-danger" : "text-semantic-success"
                          )}>
                            {metric.change}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="bg-card/60 backdrop-blur-sm border-border">
                  <CardContent className="p-4 text-center text-muted-foreground text-sm">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    Evidence will be populated after diagnostic runs analyze your site data.
                  </CardContent>
                </Card>
              )}

              {mission.evidence?.urls && mission.evidence.urls.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Affected URLs:</p>
                  <div className="flex flex-wrap gap-2">
                    {mission.evidence.urls.slice(0, 5).map((url, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs font-mono">
                        {url.length > 40 ? url.slice(0, 40) + "..." : url}
                      </Badge>
                    ))}
                    {mission.evidence.urls.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{mission.evidence.urls.length - 5} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {mission.evidence?.queries && mission.evidence.queries.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Related Queries:</p>
                  <div className="flex flex-wrap gap-2">
                    {mission.evidence.queries.slice(0, 5).map((query, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        "{query}"
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-accent" />
                What To Do
              </h4>
              <div className="space-y-2">
                {recommendations.map((rec, idx) => (
                  <div 
                    key={idx} 
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl border transition-colors",
                      checkedSteps.has(idx) 
                        ? "bg-semantic-success-soft/30 border-semantic-success/30" 
                        : "bg-card/60 border-border hover:bg-card/80"
                    )}
                  >
                    <Checkbox 
                      checked={checkedSteps.has(idx)}
                      onCheckedChange={() => toggleStep(idx)}
                      className="mt-0.5"
                    />
                    <div className="flex-1">
                      <p className={cn(
                        "text-sm font-medium",
                        checkedSteps.has(idx) ? "text-muted-foreground line-through" : "text-foreground"
                      )}>
                        {rec.step}
                      </p>
                      {rec.rationale && (
                        <p className="text-xs text-muted-foreground mt-1">{rec.rationale}</p>
                      )}
                    </div>
                    {(rec as any).impact && (
                      <Badge variant="outline" className="text-xs flex-shrink-0">
                        {(rec as any).impact}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {mission.createdAt && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                Created {new Date(mission.createdAt).toLocaleDateString()}
                {mission.updatedAt && mission.updatedAt !== mission.createdAt && (
                  <span> · Updated {new Date(mission.updatedAt).toLocaleDateString()}</span>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <Button 
            variant="outline" 
            size="sm" 
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
          <div className="flex items-center gap-2">
            {onExportFixPack && (
              <Button 
                variant="outline" 
                size="sm" 
                className="rounded-xl"
                onClick={() => {
                  onOpenChange(false);
                  onExportFixPack();
                }}
              >
                <Package className="w-4 h-4 mr-1" />
                Export Fix Pack
              </Button>
            )}
            <Button 
              variant="gold" 
              size="sm" 
              className="rounded-xl"
              onClick={handleMarkDone}
              disabled={isLoading || !mission.id}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-1" />
              )}
              Mark as Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
