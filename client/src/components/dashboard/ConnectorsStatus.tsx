import { CheckCircle2, AlertTriangle, XCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

const connectors = [
  {
    name: "Google Analytics 4",
    status: "healthy",
    lastSync: "15m ago",
    details: "Property: 345678901"
  },
  {
    name: "Google Search Console",
    status: "healthy",
    lastSync: "1h ago",
    details: "sc-domain: empathyhealthclinic.com"
  },
  {
    name: "Google Ads",
    status: "warning",
    lastSync: "2h ago",
    details: "Account: 123-456-7890"
  },
  {
    name: "Website Checks",
    status: "healthy",
    lastSync: "5m ago",
    details: "24 pages scanned"
  }
];

export function ConnectorsStatus() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {connectors.map((connector) => (
        <div 
          key={connector.name}
          className="flex flex-col p-4 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-start justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">{connector.name}</span>
            {connector.status === 'healthy' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
            {connector.status === 'warning' && <AlertTriangle className="w-4 h-4 text-orange-500" />}
            {connector.status === 'error' && <XCircle className="w-4 h-4 text-destructive" />}
          </div>
          <div className="mt-auto">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <RefreshCw className="w-3 h-3" />
              Synced {connector.lastSync}
            </div>
            <p className="text-xs truncate font-mono opacity-70">{connector.details}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
