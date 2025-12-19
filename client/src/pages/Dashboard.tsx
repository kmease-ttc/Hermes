import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SummaryStats } from "@/components/dashboard/SummaryStats";
import { TicketList } from "@/components/dashboard/TicketList";
import { ConnectorsStatus } from "@/components/dashboard/ConnectorsStatus";
import { AskAI } from "@/components/dashboard/AskAI";
import { Button } from "@/components/ui/button";
import { Play, Download, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useState } from "react";

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRunning, setIsRunning] = useState(false);

  const { data: authStatus } = useQuery({
    queryKey: ['auth-status'],
    queryFn: async () => {
      const res = await fetch('/api/auth/status');
      if (!res.ok) throw new Error('Failed to check auth status');
      return res.json();
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/stats');
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const runDiagnostics = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/run', { method: 'POST' });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to run diagnostics');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Diagnostics Completed",
        description: data.summary,
      });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['latest-report'] });
      setIsRunning(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Diagnostics Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsRunning(false);
    },
  });

  const handleRunDiagnostics = () => {
    setIsRunning(true);
    runDiagnostics.mutate();
  };

  const handleGetAuthUrl = async () => {
    try {
      const res = await fetch('/api/auth/url');
      const data = await res.json();
      
      if (data.url) {
        window.open(data.url, '_blank');
        toast({
          title: "Authentication Required",
          description: "Complete the OAuth flow in the new window, then paste the authorization code.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {!authStatus?.authenticated && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Required</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>Connect to Google Analytics, Search Console, and Ads APIs to enable data collection.</span>
              <Button onClick={handleGetAuthUrl} variant="outline" size="sm" className="ml-4">
                Authenticate
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Overview</h2>
            <p className="text-muted-foreground mt-1">
              Daily diagnostic report for <span className="font-medium text-foreground">empathyhealthclinic.com</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export Report
            </Button>
            <Button 
              onClick={handleRunDiagnostics} 
              disabled={isRunning}
              className="gap-2 shadow-lg shadow-primary/20"
            >
              <Play className="w-4 h-4" />
              {isRunning ? 'Running...' : 'Run Diagnostics'}
            </Button>
          </div>
        </div>

        <section>
          <ConnectorsStatus authenticated={authStatus?.authenticated} />
        </section>

        <section>
          <SummaryStats stats={stats} />
        </section>

        <section>
          <TicketList />
        </section>

        <section>
          <AskAI />
        </section>

      </div>
    </DashboardLayout>
  );
}
