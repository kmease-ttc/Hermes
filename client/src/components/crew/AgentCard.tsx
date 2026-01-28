import { getCrewMember } from "@/config/agents";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { prefetchCrewStatus } from "@/lib/queryClient";
import { useSiteContext } from "@/hooks/useSiteContext";
import type { AgentFinding, AgentNextStep } from "@shared/agentInsight";
import { SERVICE_TO_CREW } from "@shared/registry";
import { UnlockOverlay } from "@/components/overlays";

interface AgentCardProps {
  serviceId: string;
  score?: number;
  lastCheckIn?: string | null;
  findings?: AgentFinding[];
  nextSteps?: AgentNextStep[];
  className?: string;
  onClick?: () => void;
  isSubscribed?: boolean;
  onToggleSubscribe?: () => void;
}

const DEFAULT_NEXT_STEPS: AgentNextStep[] = [
  { step: 1, action: "Connect required credentials" },
  { step: 2, action: "Run first scan" },
  { step: 3, action: "Review results after completion" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5" style={{ opacity: 1 }}>
      {children}
    </p>
  );
}


export function AgentCard({ 
  serviceId, 
  score = 0,
  lastCheckIn, 
  findings = [],
  nextSteps,
  className, 
  onClick,
  isSubscribed,
  onToggleSubscribe
}: AgentCardProps) {
  const { currentSite } = useSiteContext();
  const crew = getCrewMember(serviceId);
  const Icon = crew.icon;

  const displayFindings = findings.slice(0, 3);
  const displaySteps = nextSteps && nextSteps.length > 0 ? nextSteps : DEFAULT_NEXT_STEPS;

  const handleMouseEnter = () => {
    if (currentSite?.siteId) {
      const crewId = SERVICE_TO_CREW[serviceId as keyof typeof SERVICE_TO_CREW] || serviceId;
      prefetchCrewStatus(currentSite.siteId, crewId);
    }
  };

  const showSubscribeButton = onToggleSubscribe !== undefined;
  const isActive = isSubscribed !== false;

  const showUnlockOverlay = showSubscribeButton && !isSubscribed;

  return (
    <Card 
      className={cn(
        "agent-card relative overflow-hidden transition-all rounded-2xl border bg-card shadow-card text-foreground",
        !isActive && "opacity-60 border-dashed",
        onClick && !showUnlockOverlay && "cursor-pointer hover:shadow-cardHover",
        className
      )}
      style={{ borderColor: crew.color, opacity: isActive ? 1 : undefined }}
      onClick={showUnlockOverlay ? undefined : onClick}
      onMouseEnter={handleMouseEnter}
      data-testid={`agent-card-${serviceId}`}
    >
      <CardHeader className={cn("pb-3 pt-4 px-5", showUnlockOverlay && "blur-sm")}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {crew.avatar ? (
              <img 
                src={crew.avatar} 
                alt={crew.nickname}
                className="w-12 h-12 object-contain flex-shrink-0"
              />
            ) : (
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${crew.color}15` }}
              >
                <Icon className="w-6 h-6" style={{ color: crew.color }} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="font-medium text-base leading-tight text-foreground">
                  {crew.nickname}
                </h3>
                {crew.tooltipInfo && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`button-tooltip-${serviceId}`}
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-xs p-3">
                        <div className="space-y-2">
                          <div>
                            <p className="font-semibold" style={{ color: crew.color }}>{crew.nickname}</p>
                            <p className="text-xs text-muted-foreground">{crew.role}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium mb-1">What it does</p>
                            <p className="text-xs text-muted-foreground">{crew.tooltipInfo.whatItDoes}</p>
                          </div>
                          <div>
                            <p className="text-xs font-medium mb-1">What it outputs</p>
                            <ul className="text-xs text-muted-foreground space-y-0.5">
                              {crew.tooltipInfo.outputs.map((output, i) => (
                                <li key={i} className="flex items-center gap-1">
                                  <span className="w-1 h-1 rounded-full bg-current" />
                                  {output}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <p className="text-xs text-foreground" style={{ opacity: 1 }}>{crew.role}</p>
              {crew.shortDescription && (
                <p className="text-xs text-muted-foreground truncate mt-0.5" style={{ opacity: 1 }}>{crew.shortDescription}</p>
              )}
              {!isActive && (
                <p className="text-xs text-muted-foreground mt-1" style={{ opacity: 1 }}>Not active</p>
              )}
            </div>
          </div>
          {showSubscribeButton && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleSubscribe();
              }}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex-shrink-0",
                isSubscribed
                  ? "border border-border text-foreground hover:bg-muted"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
              data-testid={`button-subscribe-${serviceId}`}
            >
              {isSubscribed ? "Unsubscribe" : "Subscribe"}
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className={cn("px-5 pb-5 pt-0", showUnlockOverlay && "blur-sm")}>
        {crew.watchDescription && (
          <div className="mb-4">
            <SectionLabel>What I watch</SectionLabel>
            <p className="text-sm text-foreground" style={{ opacity: 1 }}>{crew.watchDescription}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <SectionLabel>What I found</SectionLabel>
            {displayFindings.length > 0 ? (
              <div className="space-y-1.5">
                {displayFindings.map((finding, i) => (
                  <div key={i} className="flex justify-between items-baseline gap-2">
                    <span className="text-sm text-muted-foreground" style={{ opacity: 1 }}>{finding.label}</span>
                    <span className="text-sm font-medium text-foreground tabular-nums" style={{ opacity: 1 }}>{finding.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic" style={{ opacity: 1 }}>No data yet</p>
            )}
          </div>

          <div>
            <SectionLabel>Last checked</SectionLabel>
            <p className="text-sm text-foreground mb-4" style={{ opacity: 1 }}>{lastCheckIn || "Never"}</p>

            <SectionLabel>Next steps</SectionLabel>
            <ol className="space-y-1.5">
              {displaySteps.slice(0, 3).map((step) => (
                <li key={step.step} className="flex items-start gap-2">
                  <span 
                    className="flex-shrink-0 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center mt-0.5"
                    style={{ backgroundColor: `${crew.color}20`, color: crew.color }}
                  >
                    {step.step}
                  </span>
                  <span className="text-sm text-foreground leading-snug" style={{ opacity: 1 }}>{step.action}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </CardContent>

      {showUnlockOverlay && (
        <UnlockOverlay
          feature={crew.role}
          description={crew.shortDescription}
          onUnlock={() => {
            console.log(`Unlock requested for: ${crew.nickname} (${serviceId})`);
            onToggleSubscribe?.();
          }}
        />
      )}
    </Card>
  );
}
