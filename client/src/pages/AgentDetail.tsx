import { useRoute, useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { isUserFacingAgent } from "@/config/agents";
import { ROUTES, resolveAgentSlug, buildRoute } from "@shared/routes";
import { useEffect } from "react";

import AuthorityContent from "./authority/AuthorityContent";
import SERPContent from "./serp/SERPContent";
import PulseContent from "./pulse/PulseContent";
import SpeedsterContent from "./speedster/SpeedsterContent";
import NatashaContent from "./natasha/NatashaContent";
import SocratesContent from "./socrates/SocratesContent";
import HemingwayContent from "./hemingway/HemingwayContent";
import ScottyContent from "./scotty/ScottyContent";
import SentinelContent from "./sentinel/SentinelContent";
import AtlasContent from "./atlas/AtlasContent";
import GenericAgentContent from "./agents/GenericAgentContent";

export default function AgentDetail() {
  const [match, params] = useRoute("/agents/:agentId");
  const [, navigate] = useLocation();
  
  const rawSlug = params?.agentId || "";
  const agentId = resolveAgentSlug(rawSlug);
  
  // If the URL slug differs from the resolved service ID, redirect to canonical URL
  useEffect(() => {
    if (match && rawSlug !== agentId && isUserFacingAgent(agentId)) {
      navigate(buildRoute.agent(agentId), { replace: true });
    }
  }, [match, rawSlug, agentId, navigate]);

  if (!match || !isUserFacingAgent(agentId)) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <h1 className="text-2xl font-bold">Agent Not Found</h1>
          <p className="text-muted-foreground">The agent you're looking for doesn't exist.</p>
          <Button onClick={() => navigate(ROUTES.CREW)} data-testid="button-back-to-agents">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Agents
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const renderAgentContent = () => {
    switch (agentId) {
      case "backlink_authority":
        return <AuthorityContent />;
      case "serp_intel":
        return <SERPContent />;
      case "google_data_connector":
        return <PulseContent />;
      case "core_web_vitals":
        return <SpeedsterContent />;
      case "competitive_snapshot":
        return <NatashaContent />;
      case "seo_kbase":
        return <SocratesContent />;
      case "content_generator":
        return <HemingwayContent />;
      case "crawl_render":
        return <ScottyContent />;
      case "content_decay":
        return <SentinelContent />;
      case "ai_optimization":
        return <AtlasContent />;
      default:
        return <GenericAgentContent agentId={agentId} />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4" data-testid={`agent-detail-${agentId}`}>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => navigate(ROUTES.CREW)}
          data-testid="button-back"
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Crew
        </Button>
        {renderAgentContent()}
      </div>
    </DashboardLayout>
  );
}
