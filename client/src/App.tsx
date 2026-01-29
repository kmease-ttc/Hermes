import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteProvider } from "@/hooks/useSiteContext";
import { AuthProvider } from "@/hooks/useAuth";
import AppShell from "@/components/AppShell";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Tickets from "@/pages/Tickets";
import Settings from "@/pages/Settings";
import Sites from "@/pages/Sites";
import SiteDetail from "@/pages/SiteDetail";
import Integrations from "@/pages/Integrations";
import SuggestedChanges from "@/pages/SuggestedChanges";
import Authority from "@/pages/Authority";
import Crew from "@/pages/Crew";
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
import Login from "@/pages/Login";
import VerifyEmail from "@/pages/VerifyEmail";
import ResendVerification from "@/pages/ResendVerification";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import HowItWorks from "@/pages/HowItWorks";
import UseCases from "@/pages/UseCases";
import Pricing from "@/pages/Pricing";
import CreateSite from "@/pages/CreateSite";
import WebsiteGenerator from "@/pages/WebsiteGenerator";
import SitePreview from "@/pages/SitePreview";
import Report from "@/pages/Report";
import FreeReport from "@/pages/FreeReport";
import ManagedSite from "@/pages/ManagedSite";
import SelectSite from "@/pages/SelectSite";
import Examples from "@/pages/Examples";
import ExamplePreview from "@/pages/ExamplePreview";
import SharedReport from "@/pages/SharedReport";
import WebsiteRegistry from "@/pages/WebsiteRegistry";
import WebsiteRegistryDetail from "@/pages/WebsiteRegistryDetail";
import WebsiteReportPage from "@/pages/WebsiteReportPage";
import DeveloperReportPage from "@/pages/DeveloperReportPage";
import SettingsIntegrations from "@/pages/SettingsIntegrations";
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

function ProtectedRoute({ component: Component, lightMode = false }: { component: React.ComponentType; lightMode?: boolean }) {
  return (
    <AppShell lightMode={lightMode}>
      <Component />
    </AppShell>
  );
}

function Router() {
  return (
    <Switch>
      {/* ============================================ */}
      {/* MARKETING ROUTES - Public funnel pages */}
      {/* ============================================ */}
      <Route path={ROUTES.LANDING} component={Landing} />
      <Route path={ROUTES.LOGIN} component={Login} />
      <Route path={ROUTES.SIGNUP} component={Signup} />
      <Route path={ROUTES.VERIFY_EMAIL} component={VerifyEmail} />
      <Route path={ROUTES.RESEND_VERIFICATION} component={ResendVerification} />
      <Route path={ROUTES.FORGOT_PASSWORD} component={ForgotPassword} />
      <Route path={ROUTES.RESET_PASSWORD} component={ResetPassword} />
      <Route path={ROUTES.SCAN}>
        <Redirect to={ROUTES.LANDING + "#analyze"} />
      </Route>
      <Route path={ROUTES.SCAN_PREVIEW} component={ScanPreview} />
      <Route path={ROUTES.HOW_IT_WORKS} component={HowItWorks} />
      <Route path={ROUTES.USE_CASES} component={UseCases} />
      <Route path={ROUTES.PRICING} component={Pricing} />
      <Route path={ROUTES.EXAMPLE_PREVIEW} component={ExamplePreview} />
      <Route path={ROUTES.EXAMPLES} component={Examples} />
      <Route path={ROUTES.CREATE_SITE} component={CreateSite} />
      <Route path={ROUTES.WEBSITE_GENERATOR} component={WebsiteGenerator} />
      <Route path={ROUTES.SITE_PREVIEW} component={SitePreview} />
      <Route path={ROUTES.TERMS} component={Terms} />
      <Route path={ROUTES.PRIVACY} component={Privacy} />
      <Route path={ROUTES.REPORT} component={Report} />
      <Route path={ROUTES.FREE_REPORT_SHARE} component={FreeReport} />
      <Route path={ROUTES.FREE_REPORT} component={FreeReport} />
      <Route path={ROUTES.SHARED_REPORT} component={SharedReport} />
      <Route path={ROUTES.MANAGED_SITE} component={ManagedSite} />
      
      {/* ============================================ */}
      {/* APP ROUTES - Authenticated application pages */}
      {/* ============================================ */}
      <Route path={ROUTES.DASHBOARD}><ProtectedRoute component={Dashboard} lightMode /></Route>
      <Route path={ROUTES.MISSION_CONTROL}><ProtectedRoute component={Dashboard} lightMode /></Route>
      <Route path={ROUTES.SELECT_SITE} component={SelectSite} />
      <Route path={ROUTES.CREW}>
        <Redirect to={ROUTES.AGENTS} />
      </Route>
      <Route path={ROUTES.AGENTS}><ProtectedRoute component={Crew} /></Route>
      <Route path={ROUTES.AGENT_DETAIL}><ProtectedRoute component={AgentDetail} /></Route>
      <Route path={ROUTES.KEYWORDS}><ProtectedRoute component={KeywordRankings} /></Route>
      <Route path={ROUTES.AUTHORITY}><ProtectedRoute component={Authority} /></Route>
      <Route path={ROUTES.SPEEDSTER}><ProtectedRoute component={Speedster} /></Route>
      <Route path={ROUTES.SOCRATES}><ProtectedRoute component={Socrates} /></Route>
      <Route path={ROUTES.TICKETS}><ProtectedRoute component={Tickets} /></Route>
      <Route path={ROUTES.CHANGES}><ProtectedRoute component={SuggestedChanges} /></Route>
      <Route path={ROUTES.RUNS}><ProtectedRoute component={Runs} /></Route>
      <Route path={ROUTES.RUN_DETAIL}><ProtectedRoute component={RunDetail} /></Route>
      <Route path={ROUTES.AUDIT}><ProtectedRoute component={Audit} /></Route>
      <Route path={ROUTES.BENCHMARKS}><ProtectedRoute component={Benchmarks} /></Route>
      <Route path={ROUTES.ACHIEVEMENTS}><ProtectedRoute component={Achievements} /></Route>
      <Route path={ROUTES.INTEGRATIONS}><ProtectedRoute component={Integrations} /></Route>
      <Route path="/app/settings/integrations"><ProtectedRoute component={SettingsIntegrations} lightMode /></Route>
      <Route path={ROUTES.SETTINGS}><ProtectedRoute component={Settings} /></Route>
      <Route path={ROUTES.SETTINGS_WEBSITES}><ProtectedRoute component={WebsitesSettings} /></Route>
      <Route path={ROUTES.SETTINGS_WEBSITE_DETAIL}><ProtectedRoute component={WebsiteDetail} /></Route>
      <Route path={ROUTES.SITES}>
        <Redirect to={buildRoute.settingsTab("sites")} />
      </Route>
      <Route path={ROUTES.SITE_NEW}><ProtectedRoute component={SiteDetail} /></Route>
      <Route path={ROUTES.SITE_DETAIL}><ProtectedRoute component={SiteDetail} /></Route>
      <Route path={ROUTES.WEBSITE_REGISTRY_DETAIL}><ProtectedRoute component={WebsiteRegistryDetail} /></Route>
      <Route path={ROUTES.WEBSITES}><ProtectedRoute component={WebsiteRegistry} /></Route>
      <Route path={ROUTES.HELP}><ProtectedRoute component={Help} /></Route>
      <Route path={ROUTES.DEV_PALETTE}><ProtectedRoute component={CrewPalette} /></Route>
      <Route path={ROUTES.DEV_LINEAGE}><ProtectedRoute component={DevLineage} /></Route>
      
      {/* Report review pages */}
      <Route path={ROUTES.WEBSITE_REPORT}><ProtectedRoute component={WebsiteReportPage} /></Route>
      <Route path={ROUTES.DEVELOPER_REPORT}><ProtectedRoute component={DeveloperReportPage} /></Route>
      
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
        <LegacyRedirect to={ROUTES.AGENTS} />
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
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <SonnerToaster position="top-right" richColors />
              <Router />
            </TooltipProvider>
          </AuthProvider>
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
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <SonnerToaster position="top-right" richColors />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </SiteProvider>
    </PersistQueryClientProvider>
  );
}

export default App;
