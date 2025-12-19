import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Ticket {
  id: number;
  ticketId: string;
  title: string;
  priority: "High" | "Medium" | "Low";
  status: string;
  owner: "SEO" | "Dev" | "Ads";
  expectedImpact: string;
  createdAt: string;
}

export function TicketList() {
  const { data: tickets = [] } = useQuery<Ticket[]>({
    queryKey: ['tickets'],
    queryFn: async () => {
      const res = await fetch('/api/tickets/latest?limit=10');
      if (!res.ok) throw new Error('Failed to fetch tickets');
      const data = await res.json();
      return data.tickets || data;
    },
    refetchInterval: 30000,
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight">Diagnostic Tickets</h3>
        <Button variant="outline" size="sm" className="gap-2">
          View All <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      {tickets.length === 0 ? (
        <div className="rounded-md border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No tickets yet. Run diagnostics to generate tickets.</p>
        </div>
      ) : (
        <div className="rounded-md border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Issue Summary</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Impact</TableHead>
                <TableHead className="text-right">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.map((ticket) => (
                <TableRow key={ticket.id} className="group cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-mono text-xs text-muted-foreground">{ticket.ticketId}</TableCell>
                  <TableCell className="font-medium">
                    {ticket.title}
                    <div className="flex items-center gap-2 mt-1 lg:hidden">
                      <Badge variant={ticket.priority === 'High' ? 'destructive' : 'secondary'} className="text-[10px] h-5">
                        {ticket.priority}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={ticket.priority === 'High' ? 'destructive' : 'outline'}
                      className={ticket.priority === 'Medium' ? 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100' : ''}
                    >
                      {ticket.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                        {ticket.owner[0]}
                      </div>
                      <span className="text-sm">{ticket.owner}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{ticket.expectedImpact}</TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {formatDate(ticket.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
