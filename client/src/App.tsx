import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteProvider } from "@/hooks/useSiteContext";
import NotFound from "@/pages/not-found";
import MissionControl from "@/pages/MissionControl";
import Tickets from "@/pages/Tickets";
import Settings from "@/pages/Settings";
import Sites from "@/pages/Sites";
import SiteDetail from "@/pages/SiteDetail";
import Integrations from "@/pages/Integrations";
import SuggestedChanges from "@/pages/SuggestedChanges";
import Authority from "@/pages/Authority";
import Crew from "@/pages/Crew";
import MyCrew from "@/pages/MyCrew";
import AgentDetail from "@/pages/AgentDetail";
import KeywordRankings from "@/pages/KeywordRankings";
import Runs from "@/pages/Runs";
import RunDetail from "@/pages/RunDetail";
import Audit from "@/pages/Audit";
import Help from "@/pages/Help";
import Benchmarks from "@/pages/Benchmarks";
import CrewPalette from "@/pages/CrewPalette";
import DevLineage from "@/pages/DevLineage";
import Speedster from "@/pages/Speedster";
import Socrates from "@/pages/Socrates";
import Achievements from "@/pages/Achievements";
import { ROUTES, buildRoute, resolveAgentSlug } from "@shared/routes";
import { useRoute } from "wouter";
import { useEffect } from "react";
import { useLocation } from "wouter";

function CrewRedirect() {
  const [, params] = useRoute("/crew/:agentId");
  const [, navigate] = useLocation();
  
  useEffect(() => {
    if (params?.agentId) {
      const slug = params.agentId;
      // Resolve slug to service ID and redirect to canonical agent route
      const serviceId = resolveAgentSlug(slug);
      navigate(buildRoute.agent(serviceId), { replace: true });
    }
  }, [params, navigate]);
  
  return null;
}

function Router() {
  return (
    <Switch>
      {/* ============================================ */}
      {/* CANONICAL ROUTES - Primary pages */}
      {/* ============================================ */}
      <Route path={ROUTES.DASHBOARD} component={MissionControl} />
      <Route path={ROUTES.MISSION_CONTROL} component={MissionControl} />
      <Route path={ROUTES.CREW} component={MyCrew} />
      <Route path={ROUTES.AGENTS} component={Crew} />
      <Route path={ROUTES.AGENT_DETAIL} component={AgentDetail} />
      <Route path={ROUTES.KEYWORDS} component={KeywordRankings} />
      <Route path={ROUTES.AUTHORITY} component={Authority} />
      <Route path={ROUTES.SPEEDSTER} component={Speedster} />
      <Route path={ROUTES.SOCRATES} component={Socrates} />
      <Route path={ROUTES.TICKETS} component={Tickets} />
      <Route path={ROUTES.CHANGES} component={SuggestedChanges} />
      <Route path={ROUTES.RUNS} component={Runs} />
      <Route path={ROUTES.RUN_DETAIL} component={RunDetail} />
      <Route path={ROUTES.AUDIT} component={Audit} />
      <Route path={ROUTES.BENCHMARKS} component={Benchmarks} />
      <Route path={ROUTES.ACHIEVEMENTS} component={Achievements} />
      <Route path={ROUTES.INTEGRATIONS} component={Integrations} />
      <Route path={ROUTES.SETTINGS} component={Settings} />
      <Route path={ROUTES.SITES}>
        <Redirect to={buildRoute.settingsTab("sites")} />
      </Route>
      <Route path={ROUTES.SITE_NEW} component={SiteDetail} />
      <Route path={ROUTES.SITE_DETAIL} component={SiteDetail} />
      <Route path={ROUTES.HELP} component={Help} />
      <Route path={ROUTES.DEV_PALETTE} component={CrewPalette} />
      <Route path={ROUTES.DEV_LINEAGE} component={DevLineage} />
      
      {/* ============================================ */}
      {/* LEGACY REDIRECTS - Old /crew/* routes to canonical /agents/* */}
      {/* Uses CrewRedirect to resolve slugs to service IDs */}
      {/* ============================================ */}
      <Route path="/crew/:agentId" component={CrewRedirect} />
      
      {/* Home redirect */}
      <Route path={ROUTES.HOME}>
        <Redirect to={ROUTES.DASHBOARD} />
      </Route>
      
      {/* 404 catch-all */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SiteProvider>
        <TooltipProvider>
          <Toaster />
          <SonnerToaster position="top-right" richColors />
          <Router />
        </TooltipProvider>
      </SiteProvider>
    </QueryClientProvider>
  );
}

export default App;
