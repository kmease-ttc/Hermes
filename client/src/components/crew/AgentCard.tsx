import { getCrewMember } from "@/config/crewManifest";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";
import type { AgentFinding, AgentNextStep } from "@shared/agentInsight";

interface AgentCardProps {
  serviceId: string;
  status?: "healthy" | "degraded" | "down" | "disabled" | "unknown";
  lastCheckIn?: string | null;
  findings?: AgentFinding[];
  nextSteps?: AgentNextStep[];
  className?: string;
  onClick?: () => void;
}

const STATUS_CONFIG = {
  healthy: { label: "Healthy", color: "bg-green-100 text-green-700", icon: CheckCircle },
  degraded: { label: "Needs Attention", color: "bg-yellow-100 text-yellow-700", icon: AlertTriangle },
  down: { label: "Down", color: "bg-red-100 text-red-700", icon: XCircle },
  disabled: { label: "Disabled", color: "bg-gray-100 text-gray-500", icon: Clock },
  unknown: { label: "Unknown", color: "bg-gray-100 text-gray-500", icon: Clock },
};

const DEFAULT_NEXT_STEPS: AgentNextStep[] = [
  { step: 1, action: "Connect required credentials" },
  { step: 2, action: "Run first scan" },
  { step: 3, action: "Review results after completion" },
];

export function AgentCard({ 
  serviceId, 
  status = "unknown", 
  lastCheckIn, 
  findings = [],
  nextSteps,
  className, 
  onClick 
}: AgentCardProps) {
  const crew = getCrewMember(serviceId);
  const Icon = crew.icon;
  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;

  const displayFindings = findings.slice(0, 3);
  const displaySteps = nextSteps && nextSteps.length > 0 ? nextSteps : DEFAULT_NEXT_STEPS;

  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all hover:shadow-md",
        onClick && "cursor-pointer",
        className
      )}
      style={{ borderLeftColor: crew.color, borderLeftWidth: 4 }}
      onClick={onClick}
      data-testid={`agent-card-${serviceId}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${crew.color}20` }}
            >
              <Icon className="w-5 h-5" style={{ color: crew.color }} />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: crew.color }}>
                {crew.nickname}
              </h3>
              <p className="text-xs text-muted-foreground">{crew.role}</p>
            </div>
          </div>
          <Badge className={cn("flex items-center gap-1 text-xs", statusConfig.color)}>
            <StatusIcon className="w-3 h-3" />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        {crew.watchDescription && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">What I watch</p>
            <p className="text-sm">{crew.watchDescription}</p>
          </div>
        )}

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">What I found</p>
          {displayFindings.length > 0 ? (
            <ul className="text-sm space-y-1">
              {displayFindings.map((finding, i) => (
                <li key={i} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{finding.label}</span>
                  <span className="font-medium">{finding.value}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground italic">No data collected yet</p>
          )}
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Last checked</p>
          <p className="text-sm">{lastCheckIn || "Never"}</p>
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Next steps</p>
          <ol className="text-sm space-y-1.5">
            {displaySteps.slice(0, 3).map((step) => (
              <li key={step.step} className="flex items-start gap-2">
                <span 
                  className="flex-shrink-0 w-5 h-5 rounded-full text-xs font-medium flex items-center justify-center"
                  style={{ backgroundColor: `${crew.color}20`, color: crew.color }}
                >
                  {step.step}
                </span>
                <span>{step.action}</span>
              </li>
            ))}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
