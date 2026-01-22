import { useLocation, useSearch } from "wouter";
import { useEffect, useState, useRef } from "react";
import { buildRoute } from "@shared/routes";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { AgentCard } from "@/components/crew/AgentCard";
import { CaptainsRecommendations } from "@/components/crew/CaptainsRecommendations";
import { USER_FACING_AGENTS, getCrewMember } from "@/config/agents";
import { getMockAgentData } from "@/config/mockAgentInsights";
import { getMockCaptainRecommendations } from "@/config/mockCaptainRecommendations";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "Yesterday";
  return `${diffDays} days ago`;
}

export default function CrewPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const [focusedAgentId, setFocusedAgentId] = useState<string | null>(null);
  const agentRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const params = new URLSearchParams(search);
    const focusParam = params.get("focus");
    
    if (focusParam && USER_FACING_AGENTS.includes(focusParam)) {
      setFocusedAgentId(focusParam);
      
      setTimeout(() => {
        const element = agentRefs.current[focusParam];
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);

      setTimeout(() => {
        setFocusedAgentId(null);
        window.history.replaceState({}, "", window.location.pathname);
      }, 2000);
    }
  }, [search]);
  
  const userFacingAgents = USER_FACING_AGENTS
    .map((serviceId) => {
      const crew = getCrewMember(serviceId);
      const mockData = getMockAgentData(serviceId);
      return {
        serviceId,
        crew,
        score: mockData?.score || 0,
        lastCheckIn: mockData ? "1 hour ago" : null,
        findings: mockData?.findings || [],
        nextSteps: mockData?.nextSteps || [],
      };
    });

  const avgScore = userFacingAgents.length > 0 
    ? Math.round(userFacingAgents.reduce((sum, a) => sum + a.score, 0) / userFacingAgents.length)
    : 0;
  const needsAttention = userFacingAgents.filter((a) => a.score < 50).length;

  const captainData = getMockCaptainRecommendations();

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="agents-page">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bot className="w-8 h-8 text-primary" />
            Agents
          </h1>
          <p className="text-muted-foreground mt-1">
            Your hired specialists analyzing and improving your site
          </p>
        </div>

        <CaptainsRecommendations data={captainData} />

        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Active Agents:</span>
            <Badge variant="secondary">{userFacingAgents.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Avg Score:</span>
            <Badge className={avgScore >= 70 ? "bg-semantic-success-soft text-semantic-success" : avgScore >= 40 ? "bg-semantic-warning-soft text-semantic-warning" : "bg-semantic-danger-soft text-semantic-danger"}>
              {avgScore}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Needs Attention:</span>
            <Badge className="bg-gold-soft text-gold">{needsAttention}</Badge>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {userFacingAgents.map((agent) => (
            <div 
              key={agent.serviceId} 
              id={agent.serviceId}
              ref={(el) => { agentRefs.current[agent.serviceId] = el; }}
              className={cn(
                "transition-all duration-500",
                focusedAgentId === agent.serviceId && "ring-2 ring-primary ring-offset-2 ring-offset-background rounded-lg animate-pulse"
              )}
            >
              <AgentCard
                serviceId={agent.serviceId}
                score={agent.score}
                lastCheckIn={agent.lastCheckIn}
                findings={agent.findings}
                nextSteps={agent.nextSteps}
                onClick={() => navigate(buildRoute.agent(agent.serviceId))}
              />
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
