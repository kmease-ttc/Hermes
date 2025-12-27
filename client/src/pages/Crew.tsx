import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { AgentCard } from "@/components/crew/AgentCard";
import { CaptainsRecommendations } from "@/components/crew/CaptainsRecommendations";
import { CREW_MANIFEST, getCrewMember, isUserFacingAgent } from "@/config/crewManifest";
import { getMockAgentData } from "@/config/mockAgentInsights";
import { getMockCaptainRecommendations } from "@/config/mockCaptainRecommendations";
import { useQuery } from "@tanstack/react-query";
import { Bot } from "lucide-react";

interface SiteSummaryService {
  slug: string;
  displayName: string;
  category: string;
  runState: string;
  configState: string;
  buildState: string;
  lastRun: {
    finishedAt: string;
  } | null;
}

function mapRunStateToStatus(runState: string): "healthy" | "degraded" | "down" | "disabled" | "unknown" {
  switch (runState) {
    case "success":
      return "healthy";
    case "partial":
      return "degraded";
    case "failed":
      return "down";
    case "never_ran":
      return "unknown";
    default:
      return "unknown";
  }
}

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
  const { data: summaryData } = useQuery<{ services: SiteSummaryService[] }>({
    queryKey: ["/api/sites/site_empathy_health_clinic/integrations/summary"],
  });

  const services = summaryData?.services || [];
  
  const allServiceIds = new Set([
    ...Object.keys(CREW_MANIFEST),
    ...services.map((s) => s.slug),
  ]);

  const userFacingAgents = Array.from(allServiceIds)
    .filter(isUserFacingAgent)
    .map((serviceId) => {
      const service = services.find((s) => s.slug === serviceId);
      const crew = getCrewMember(serviceId);
      const mockData = getMockAgentData(serviceId);
      return {
        serviceId,
        crew,
        status: service ? mapRunStateToStatus(service.runState) : "unknown",
        lastCheckIn: service?.lastRun?.finishedAt
          ? formatRelativeTime(service.lastRun.finishedAt)
          : null,
        findings: mockData?.findings || [],
        nextSteps: mockData?.nextSteps || [],
      };
    });

  const healthyCount = userFacingAgents.filter((a) => a.status === "healthy").length;
  const degradedCount = userFacingAgents.filter((a) => a.status === "degraded").length;
  const downCount = userFacingAgents.filter((a) => a.status === "down").length;

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

        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Active:</span>
            <Badge variant="secondary">{userFacingAgents.length}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Healthy:</span>
            <Badge className="bg-green-100 text-green-700">{healthyCount}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Needs Attention:</span>
            <Badge className="bg-yellow-100 text-yellow-700">{degradedCount}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Down:</span>
            <Badge className="bg-red-100 text-red-700">{downCount}</Badge>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {userFacingAgents.map((agent) => (
            <div key={agent.serviceId} id={agent.serviceId}>
              <AgentCard
                serviceId={agent.serviceId}
                status={agent.status}
                lastCheckIn={agent.lastCheckIn}
                findings={agent.findings}
                nextSteps={agent.nextSteps}
              />
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
