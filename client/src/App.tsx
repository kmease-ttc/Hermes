import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
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
import WebsitesSettings from "@/pages/WebsitesSettings";
import WebsiteDetail from "@/pages/WebsiteDetail";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import Landing from "@/pages/Landing";
import ScanPreview from "@/pages/ScanPreview";
import Signup from "@/pages/Signup";
import HowItWorks from "@/pages/HowItWorks";
import UseCases from "@/pages/UseCases";
import Report from "@/pages/Report";
import ManagedSite from "@/pages/ManagedSite";
import { ROUTES, buildRoute, resolveAgentSlug } from "@shared/routes";
import { useRoute } from "wouter";
import { useEffect } from "react";
import { useLocation } from "wouter";

const persister = typeof window !== 'undefined' 
  ? createSyncStoragePersister({
      storage: window.localStorage,
      key: "arclo-query-cache",
      throttleTime: 1000,
    })
  : undefined;

function CrewRedirect() {
  const [, params] = useRoute("/crew/:agentId");
  const [, navigate] = useLocation();
  
  useEffect(() => {
    if (params?.agentId) {
      const slug = params.agentId;
      const serviceId = resolveAgentSlug(slug);
      navigate(buildRoute.agent(serviceId), { replace: true });
    }
  }, [params, navigate]);
  
  return null;
}

function LegacyRedirect({ to }: { to: string }) {
  const [, navigate] = useLocation();
  
  useEffect(() => {
    navigate(to, { replace: true });
  }, [to, navigate]);
  
  return null;
}

function Router() {
  return (
    <Switch>
      {/* ============================================ */}
      {/* MARKETING ROUTES - Public funnel pages */}
      {/* ============================================ */}
      <Route path={ROUTES.LANDING} component={Landing} />
      <Route path={ROUTES.SCAN_PREVIEW} component={ScanPreview} />
      <Route path={ROUTES.SIGNUP} component={Signup} />
      <Route path={ROUTES.HOW_IT_WORKS} component={HowItWorks} />
      <Route path={ROUTES.USE_CASES} component={UseCases} />
      <Route path={ROUTES.TERMS} component={Terms} />
      <Route path={ROUTES.PRIVACY} component={Privacy} />
      <Route path={ROUTES.REPORT} component={Report} />
      <Route path={ROUTES.MANAGED_SITE} component={ManagedSite} />
      
      {/* ============================================ */}
      {/* APP ROUTES - Authenticated application pages */}
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
      <Route path={ROUTES.SETTINGS_WEBSITES} component={WebsitesSettings} />
      <Route path={ROUTES.SETTINGS_WEBSITE_DETAIL} component={WebsiteDetail} />
      <Route path={ROUTES.SITES}>
        <Redirect to={buildRoute.settingsTab("sites")} />
      </Route>
      <Route path={ROUTES.SITE_NEW} component={SiteDetail} />
      <Route path={ROUTES.SITE_DETAIL} component={SiteDetail} />
      <Route path={ROUTES.HELP} component={Help} />
      <Route path={ROUTES.DEV_PALETTE} component={CrewPalette} />
      <Route path={ROUTES.DEV_LINEAGE} component={DevLineage} />
      
      {/* App home redirect */}
      <Route path={ROUTES.HOME}>
        <Redirect to={ROUTES.DASHBOARD} />
      </Route>
      
      {/* ============================================ */}
      {/* LEGACY REDIRECTS - Old routes to new /app/* */}
      {/* ============================================ */}
      <Route path="/dashboard">
        <LegacyRedirect to={ROUTES.DASHBOARD} />
      </Route>
      <Route path="/mission-control">
        <LegacyRedirect to={ROUTES.MISSION_CONTROL} />
      </Route>
      <Route path="/crew/:agentId" component={CrewRedirect} />
      <Route path="/crew">
        <LegacyRedirect to={ROUTES.CREW} />
      </Route>
      <Route path="/agents">
        <LegacyRedirect to={ROUTES.AGENTS} />
      </Route>
      <Route path="/keywords">
        <LegacyRedirect to={ROUTES.KEYWORDS} />
      </Route>
      <Route path="/authority">
        <LegacyRedirect to={ROUTES.AUTHORITY} />
      </Route>
      <Route path="/speedster">
        <LegacyRedirect to={ROUTES.SPEEDSTER} />
      </Route>
      <Route path="/socrates">
        <LegacyRedirect to={ROUTES.SOCRATES} />
      </Route>
      <Route path="/tickets">
        <LegacyRedirect to={ROUTES.TICKETS} />
      </Route>
      <Route path="/changes">
        <LegacyRedirect to={ROUTES.CHANGES} />
      </Route>
      <Route path="/runs">
        <LegacyRedirect to={ROUTES.RUNS} />
      </Route>
      <Route path="/audit">
        <LegacyRedirect to={ROUTES.AUDIT} />
      </Route>
      <Route path="/benchmarks">
        <LegacyRedirect to={ROUTES.BENCHMARKS} />
      </Route>
      <Route path="/achievements">
        <LegacyRedirect to={ROUTES.ACHIEVEMENTS} />
      </Route>
      <Route path="/integrations">
        <LegacyRedirect to={ROUTES.INTEGRATIONS} />
      </Route>
      <Route path="/settings">
        <LegacyRedirect to={ROUTES.SETTINGS} />
      </Route>
      <Route path="/sites">
        <LegacyRedirect to={ROUTES.SITES} />
      </Route>
      <Route path="/help">
        <LegacyRedirect to={ROUTES.HELP} />
      </Route>
      
      {/* 404 catch-all */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  if (!persister) {
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

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 24 * 60 * 60 * 1000,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            const key = query.queryKey[0];
            if (typeof key !== "string") return false;
            const safePrefixes = [
              "/api/missions",
              "/api/sites",
              "/api/dashboard",
              "/api/benchmarks",
              "/api/serp",
              "/api/kb",
            ];
            return safePrefixes.some((prefix) => key.startsWith(prefix));
          },
        },
      }}
    >
      <SiteProvider>
        <TooltipProvider>
          <Toaster />
          <SonnerToaster position="top-right" richColors />
          <Router />
        </TooltipProvider>
      </SiteProvider>
    </PersistQueryClientProvider>
  );
}

export default App;
