import { useLocation, useSearch } from "wouter";
import { useEffect, useState, useRef } from "react";
import { buildRoute } from "@shared/routes";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { AgentCard } from "@/components/crew/AgentCard";
import { AgentCoveragePanel } from "@/components/crew/AgentCoveragePanel";
import { USER_FACING_AGENTS, getCrewMember } from "@/config/agents";
import { getMockAgentData } from "@/config/mockAgentInsights";
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
  
  const [subscriptions, setSubscriptions] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    USER_FACING_AGENTS.forEach((serviceId) => {
      initial[serviceId] = true;
    });
    return initial;
  });

  const handleToggleSubscription = (serviceId: string) => {
    setSubscriptions((prev) => {
      const newValue = !prev[serviceId];
      if (newValue) {
        console.log(`Subscribed to agent: ${serviceId}`);
      } else {
        console.log(`Unsubscribed from agent: ${serviceId}`);
      }
      return { ...prev, [serviceId]: newValue };
    });
  };

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

  const coreAgents = userFacingAgents.filter((a) => a.crew.category === "core");
  const additionalAgents = userFacingAgents.filter((a) => a.crew.category === "additional");

  const avgScore = userFacingAgents.length > 0 
    ? Math.round(userFacingAgents.reduce((sum, a) => sum + a.score, 0) / userFacingAgents.length)
    : 0;
  const needsAttention = userFacingAgents.filter((a) => a.score < 50).length;

  return (
    <DashboardLayout className="dashboard-light">
      <div className="space-y-6" data-testid="agents-page">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 flex items-center gap-3">
            <Bot className="w-8 h-8 text-violet-600" />
            Agents
          </h1>
          <p className="text-slate-600 mt-1">
            Your hired specialists analyzing and improving your site
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-600">Active Agents:</span>
            <Badge variant="secondary" className="bg-slate-100 text-slate-700">{userFacingAgents.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-600">Avg Score:</span>
            <Badge className={avgScore >= 70 ? "bg-emerald-100 text-emerald-700" : avgScore >= 40 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}>
              {avgScore}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-600">Needs Attention:</span>
            <Badge className="bg-amber-100 text-amber-700">{needsAttention}</Badge>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-1">Core Agents</h2>
            <p className="text-sm text-slate-500 mb-4">These agents are included and active by default.</p>
            <div className="flex flex-col gap-6">
              {coreAgents.map((agent) => (
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

          <div>
            <h2 className="text-xl font-semibold text-slate-900 mb-1">Additional Agents</h2>
            <p className="text-sm text-slate-500 mb-4">Optional agents you can add or remove at any time.</p>
            <div className="flex flex-col gap-6">
              {additionalAgents.map((agent) => (
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
                    isSubscribed={subscriptions[agent.serviceId]}
                    onToggleSubscribe={() => handleToggleSubscription(agent.serviceId)}
                    onClick={() => navigate(buildRoute.agent(agent.serviceId))}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4">
            <AgentCoveragePanel subscriptions={subscriptions} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
