import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SummaryStats } from "@/components/dashboard/SummaryStats";
import { TicketList } from "@/components/dashboard/TicketList";
import { ConnectorsStatus } from "@/components/dashboard/ConnectorsStatus";
import { Button } from "@/components/ui/button";
import { Play, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { toast } = useToast();

  const handleRunDiagnostics = () => {
    toast({
      title: "Diagnostics Started",
      description: "Analyzing traffic and spend data. This may take a few minutes.",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header Section */}
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
            <Button onClick={handleRunDiagnostics} className="gap-2 shadow-lg shadow-primary/20">
              <Play className="w-4 h-4" />
              Run Diagnostics
            </Button>
          </div>
        </div>

        {/* Connectors Status */}
        <section>
          <ConnectorsStatus />
        </section>

        {/* Stats Cards */}
        <section>
          <SummaryStats />
        </section>

        {/* Tickets & Actions */}
        <section>
          <TicketList />
        </section>

      </div>
    </DashboardLayout>
  );
}
