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
import { AlertCircle, ArrowRight, CheckCircle2, Clock } from "lucide-react";

interface Ticket {
  id: string;
  title: string;
  priority: "High" | "Medium" | "Low";
  status: "Open" | "In Progress" | "Resolved";
  owner: "SEO" | "Dev" | "Ads";
  impact: string;
  created: string;
}

const mockTickets: Ticket[] = [
  {
    id: "TICK-1024",
    title: "Investigate organic drop on /services/cardiology",
    priority: "High",
    status: "Open",
    owner: "SEO",
    impact: "-450 visits/day",
    created: "2h ago"
  },
  {
    id: "TICK-1023",
    title: "Google Ads Campaign 'Brand_Exact' stopped spending",
    priority: "High",
    status: "Open",
    owner: "Ads",
    impact: "$0 spend (Target: $200)",
    created: "5h ago"
  },
  {
    id: "TICK-1022",
    title: "Canonical tag mismatch on blog landing page",
    priority: "Medium",
    status: "In Progress",
    owner: "Dev",
    impact: "Indexing Risk",
    created: "1d ago"
  },
  {
    id: "TICK-1021",
    title: "Mobile usability issue on booking form",
    priority: "Low",
    status: "Resolved",
    owner: "Dev",
    impact: "Conversion Rate",
    created: "2d ago"
  },
];

export function TicketList() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold tracking-tight">Diagnostic Tickets</h3>
        <Button variant="outline" size="sm" className="gap-2">
          View All <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      <div className="rounded-md border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Issue Summary</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Impact</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockTickets.map((ticket) => (
              <TableRow key={ticket.id} className="group cursor-pointer hover:bg-muted/50">
                <TableCell className="font-mono text-xs text-muted-foreground">{ticket.id}</TableCell>
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
                <TableCell className="text-muted-foreground text-sm">{ticket.impact}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost">Details</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
