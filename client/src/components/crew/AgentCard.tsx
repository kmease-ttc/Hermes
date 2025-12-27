import { getCrewMember } from "@/config/agents";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AgentFinding, AgentNextStep } from "@shared/agentInsight";

interface AgentCardProps {
  serviceId: string;
  score?: number;
  lastCheckIn?: string | null;
  findings?: AgentFinding[];
  nextSteps?: AgentNextStep[];
  className?: string;
  onClick?: () => void;
}

const DEFAULT_NEXT_STEPS: AgentNextStep[] = [
  { step: 1, action: "Connect required credentials" },
  { step: 2, action: "Run first scan" },
  { step: 3, action: "Review results after completion" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider mb-1.5">
      {children}
    </p>
  );
}

function getScoreColor(score: number): string {
  if (score >= 70) return "#22C55E";
  if (score >= 40) return "#F59E0B";
  return "#EF4444";
}

function AgentScoreBadge({ score }: { score: number }) {
  const color = getScoreColor(score);
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-muted bg-background">
        <span className="text-xs text-muted-foreground">Agent Score</span>
        <span className="text-sm font-bold" style={{ color }}>{score}</span>
      </div>
      <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
        <div 
          className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

export function AgentCard({ 
  serviceId, 
  score = 0,
  lastCheckIn, 
  findings = [],
  nextSteps,
  className, 
  onClick 
}: AgentCardProps) {
  const crew = getCrewMember(serviceId);
  const Icon = crew.icon;

  const displayFindings = findings.slice(0, 3);
  const displaySteps = nextSteps && nextSteps.length > 0 ? nextSteps : DEFAULT_NEXT_STEPS;

  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all rounded-xl border-l-[3px]",
        onClick && "cursor-pointer",
        className
      )}
      style={{ borderLeftColor: crew.color }}
      onClick={onClick}
      data-testid={`agent-card-${serviceId}`}
    >
      <CardHeader className="pb-3 pt-4 px-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {crew.avatar ? (
              <img 
                src={crew.avatar} 
                alt={crew.nickname}
                className="w-12 h-12 rounded-lg object-cover"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${crew.color}15` }}
              >
                <Icon className="w-6 h-6" style={{ color: crew.color }} />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-base leading-tight" style={{ color: crew.color }}>
                {crew.nickname}
              </h3>
              <p className="text-xs text-muted-foreground">{crew.role}</p>
            </div>
          </div>
          <AgentScoreBadge score={score} />
        </div>
      </CardHeader>

      <CardContent className="px-5 pb-5 pt-0">
        {crew.watchDescription && (
          <div className="mb-4">
            <SectionLabel>What I watch</SectionLabel>
            <p className="text-sm text-foreground/80">{crew.watchDescription}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <SectionLabel>What I found</SectionLabel>
            {displayFindings.length > 0 ? (
              <div className="space-y-1.5">
                {displayFindings.map((finding, i) => (
                  <div key={i} className="flex justify-between items-baseline gap-2">
                    <span className="text-sm text-muted-foreground">{finding.label}</span>
                    <span className="text-sm font-medium text-foreground tabular-nums">{finding.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground/60 italic">No data yet</p>
            )}
          </div>

          <div>
            <SectionLabel>Last checked</SectionLabel>
            <p className="text-sm text-foreground/80 mb-4">{lastCheckIn || "Never"}</p>

            <SectionLabel>Next steps</SectionLabel>
            <ol className="space-y-1.5">
              {displaySteps.slice(0, 3).map((step) => (
                <li key={step.step} className="flex items-start gap-2">
                  <span 
                    className="flex-shrink-0 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center mt-0.5"
                    style={{ backgroundColor: `${crew.color}15`, color: crew.color }}
                  >
                    {step.step}
                  </span>
                  <span className="text-sm text-foreground/80 leading-snug">{step.action}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
