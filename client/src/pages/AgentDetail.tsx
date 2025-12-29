import { useRoute, useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Settings, RefreshCw } from "lucide-react";
import { getCrewMember, isUserFacingAgent } from "@/config/agents";
import { getMockAgentData } from "@/config/mockAgentInsights";
import { cn } from "@/lib/utils";

import AuthorityContent from "./authority/AuthorityContent";
import SERPContent from "./serp/SERPContent";
import PulseContent from "./pulse/PulseContent";
import SpeedsterContent from "./speedster/SpeedsterContent";
import NatashaContent from "./natasha/NatashaContent";
import GenericAgentContent from "./agents/GenericAgentContent";

function getScoreColor(score: number): string {
  if (score >= 70) return "#22C55E";
  if (score >= 40) return "#F59E0B";
  return "#EF4444";
}

export default function AgentDetail() {
  const [match, params] = useRoute("/agents/:agentId");
  const [, navigate] = useLocation();
  
  const agentId = params?.agentId || "";
  const crew = getCrewMember(agentId);
  const mockData = getMockAgentData(agentId);
  const Icon = crew.icon;
  const score = mockData?.score || 0;

  if (!match || !isUserFacingAgent(agentId)) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <h1 className="text-2xl font-bold">Agent Not Found</h1>
          <p className="text-muted-foreground">The agent you're looking for doesn't exist.</p>
          <Button onClick={() => navigate("/crew")} data-testid="button-back-to-agents">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Agents
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Agents that use CrewDashboardShell and handle their own header
  const agentsWithOwnHeader = ["competitive_snapshot", "backlink_authority", "serp_intel", "google_data_connector", "core_web_vitals"];
  const usesOwnHeader = agentsWithOwnHeader.includes(agentId);

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
      default:
        return <GenericAgentContent agentId={agentId} />;
    }
  };

  // For agents with their own CrewDashboardShell, render minimal wrapper with just back button
  if (usesOwnHeader) {
    return (
      <DashboardLayout>
        <div className="space-y-4" data-testid={`agent-detail-${agentId}`}>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate("/crew")}
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

  // For agents without their own header, render full wrapper
  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid={`agent-detail-${agentId}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/crew")}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${crew.color}15` }}
            >
              <Icon className="w-6 h-6" style={{ color: crew.color }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-3" style={{ color: crew.color }}>
                {crew.nickname}
              </h1>
              <p className="text-muted-foreground">{crew.role}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-muted bg-background">
                <span className="text-xs text-muted-foreground">Agent Score</span>
                <span className="text-sm font-bold" style={{ color: getScoreColor(score) }}>{score}</span>
              </div>
              <div className="w-24 h-1 rounded-full bg-muted overflow-hidden">
                <div 
                  className="h-full rounded-full transition-all"
                  style={{ width: `${score}%`, backgroundColor: getScoreColor(score) }}
                />
              </div>
            </div>
            <Button variant="outline" size="sm" data-testid="button-refresh-agent">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" data-testid="button-agent-settings">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {crew.blurb && (
          <Card className="border-l-4" style={{ borderLeftColor: crew.color }}>
            <CardContent className="py-4">
              <p className="text-sm text-muted-foreground">{crew.blurb}</p>
              {crew.capabilities && crew.capabilities.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {crew.capabilities.map((cap) => (
                    <Badge 
                      key={cap} 
                      variant="secondary" 
                      className="text-xs"
                      style={{ backgroundColor: `${crew.color}10`, color: crew.color }}
                    >
                      {cap}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {renderAgentContent()}
      </div>
    </DashboardLayout>
  );
}
