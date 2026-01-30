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
import { ROUTES, buildRoute, resolveAgentSlug } from "@shared/routes";
import { useRoute } from "wouter";
import { lazy, Suspense, useEffect, Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { useLocation } from "wouter";

// Landing page loaded eagerly (critical for LCP)
import Landing from "@/pages/Landing";

// Lazy-load all other pages for code splitting
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Tickets = lazy(() => import("@/pages/Tickets"));
const Settings = lazy(() => import("@/pages/Settings"));
const SiteDetail = lazy(() => import("@/pages/SiteDetail"));
const Integrations = lazy(() => import("@/pages/Integrations"));
const SuggestedChanges = lazy(() => import("@/pages/SuggestedChanges"));
const Authority = lazy(() => import("@/pages/Authority"));
const Crew = lazy(() => import("@/pages/Crew"));
const AgentDetail = lazy(() => import("@/pages/AgentDetail"));
const KeywordRankings = lazy(() => import("@/pages/KeywordRankings"));
const Runs = lazy(() => import("@/pages/Runs"));
const RunDetail = lazy(() => import("@/pages/RunDetail"));
const Audit = lazy(() => import("@/pages/Audit"));
const Help = lazy(() => import("@/pages/Help"));
const Benchmarks = lazy(() => import("@/pages/Benchmarks"));
const CrewPalette = lazy(() => import("@/pages/CrewPalette"));
const DevLineage = lazy(() => import("@/pages/DevLineage"));
const Speedster = lazy(() => import("@/pages/Speedster"));
const Socrates = lazy(() => import("@/pages/Socrates"));
const Achievements = lazy(() => import("@/pages/Achievements"));
const WebsitesSettings = lazy(() => import("@/pages/WebsitesSettings"));
const WebsiteDetail = lazy(() => import("@/pages/WebsiteDetail"));
const Terms = lazy(() => import("@/pages/Terms"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const ScanPreview = lazy(() => import("@/pages/ScanPreview"));
const Signup = lazy(() => import("@/pages/Signup"));
const Login = lazy(() => import("@/pages/Login"));
const VerifyEmail = lazy(() => import("@/pages/VerifyEmail"));
const ResendVerification = lazy(() => import("@/pages/ResendVerification"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const HowItWorks = lazy(() => import("@/pages/HowItWorks"));
const UseCases = lazy(() => import("@/pages/UseCases"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const CreateSite = lazy(() => import("@/pages/CreateSite"));
const WebsiteGenerator = lazy(() => import("@/pages/WebsiteGenerator"));
const SitePreview = lazy(() => import("@/pages/SitePreview"));
const Report = lazy(() => import("@/pages/Report"));
const FreeReport = lazy(() => import("@/pages/FreeReport"));
const ManagedSite = lazy(() => import("@/pages/ManagedSite"));
const SelectSite = lazy(() => import("@/pages/SelectSite"));
const Examples = lazy(() => import("@/pages/Examples"));
const ExamplePreview = lazy(() => import("@/pages/ExamplePreview"));
const SharedReport = lazy(() => import("@/pages/SharedReport"));
const Contact = lazy(() => import("@/pages/Contact"));
const WebsiteRegistry = lazy(() => import("@/pages/WebsiteRegistry"));
const WebsiteRegistryDetail = lazy(() => import("@/pages/WebsiteRegistryDetail"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const WebsiteReportPage = lazy(() => import("@/pages/WebsiteReportPage"));
const DeveloperReportPage = lazy(() => import("@/pages/DeveloperReportPage"));
const SettingsIntegrations = lazy(() => import("@/pages/SettingsIntegrations"));

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

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", padding: "2rem" }}>
          <div style={{ maxWidth: 480, textAlign: "center" }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0F172A", marginBottom: "1rem" }}>Something went wrong</h1>
            <p style={{ color: "#475569", marginBottom: "1.5rem" }}>{this.state.error.message}</p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.href = "/"; }}
              style={{ padding: "0.75rem 1.5rem", background: "#2563EB", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: "1rem" }}
            >
              Go Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Router() {
  const [location] = useLocation();
  return (
    <ErrorBoundary>
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, border: "4px solid #2563EB", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", margin: "0 auto 1rem" }} />
          <p style={{ color: "#475569" }}>Loading...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </div>
    }>
    <Switch location={location}>
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
      <Route path={ROUTES.CONTACT} component={Contact} />
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
      <Route path={ROUTES.NOTIFICATIONS}><ProtectedRoute component={Notifications} /></Route>
      <Route path="/app/settings/integrations"><ProtectedRoute component={SettingsIntegrations} lightMode /></Route>
      <Route path={ROUTES.SETTINGS}><ProtectedRoute component={Settings} /></Route>
      <Route path={ROUTES.SETTINGS_WEBSITES}><ProtectedRoute component={WebsitesSettings} /></Route>
      <Route path={ROUTES.SETTINGS_WEBSITE_DETAIL}><ProtectedRoute component={WebsiteDetail} /></Route>
      <Route path={ROUTES.SITES}>
        <Redirect to={buildRoute.settingsTab("sites")} />
      </Route>
      <Route path={ROUTES.SITE_NEW}><ProtectedRoute component={SiteDetail} /></Route>
      <Route path={ROUTES.SITE_DETAIL}><ProtectedRoute component={SiteDetail} /></Route>
      <Route path={ROUTES.WEBSITE_REGISTRY_DETAIL}><ProtectedRoute component={WebsiteRegistryDetail} lightMode /></Route>
      <Route path={ROUTES.WEBSITES}><ProtectedRoute component={WebsiteRegistry} lightMode /></Route>
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
    </Suspense>
    </ErrorBoundary>
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
