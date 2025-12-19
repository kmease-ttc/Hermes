import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { TicketList } from "@/components/dashboard/TicketList";

export default function Tickets() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">All Tickets</h1>
          <p className="text-muted-foreground">View and manage diagnostic tickets</p>
        </div>
        <TicketList />
      </div>
    </DashboardLayout>
  );
}
