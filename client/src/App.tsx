import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteProvider } from "@/hooks/useSiteContext";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Tickets from "@/pages/Tickets";
import Analysis from "@/pages/Analysis";
import Settings from "@/pages/Settings";
import SERP from "@/pages/SERP";
import Sites from "@/pages/Sites";
import SiteDetail from "@/pages/SiteDetail";
import Integrations from "@/pages/Integrations";

function Router() {
  return (
    <Switch>
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/sites" component={Sites} />
      <Route path="/sites/new" component={SiteDetail} />
      <Route path="/sites/:siteId" component={SiteDetail} />
      <Route path="/tickets" component={Tickets} />
      <Route path="/analysis" component={Analysis} />
      <Route path="/serp" component={SERP} />
      <Route path="/integrations" component={Integrations} />
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
          <Router />
        </TooltipProvider>
      </SiteProvider>
    </QueryClientProvider>
  );
}

export default App;
