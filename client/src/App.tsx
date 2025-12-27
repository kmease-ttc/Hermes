import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteProvider } from "@/hooks/useSiteContext";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Tickets from "@/pages/Tickets";
import Settings from "@/pages/Settings";
import SERP from "@/pages/SERP";
import Sites from "@/pages/Sites";
import SiteDetail from "@/pages/SiteDetail";
import Integrations from "@/pages/Integrations";
import SuggestedChanges from "@/pages/SuggestedChanges";
import Authority from "@/pages/Authority";
import Crew from "@/pages/Crew";
import AgentDetail from "@/pages/AgentDetail";
import KeywordRankings from "@/pages/KeywordRankings";

function Router() {
  return (
    <Switch>
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/sites" component={Sites} />
      <Route path="/sites/new" component={SiteDetail} />
      <Route path="/sites/:siteId" component={SiteDetail} />
      <Route path="/tickets" component={Tickets} />
      <Route path="/serp" component={SERP} />
      <Route path="/keywords" component={KeywordRankings} />
      <Route path="/authority" component={Authority} />
      <Route path="/integrations" component={Integrations} />
      <Route path="/crew" component={Crew} />
      <Route path="/agents/:agentId" component={AgentDetail} />
      <Route path="/changes" component={SuggestedChanges} />
      <Route path="/settings" component={Settings} />
      <Route path="/">
        <Redirect to="/dashboard" />
      </Route>
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
