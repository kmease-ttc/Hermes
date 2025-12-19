import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, ExternalLink } from "lucide-react";

export default function Settings() {
  const { data: authStatus } = useQuery({
    queryKey: ['authStatus'],
    queryFn: async () => {
      const res = await fetch('/api/auth/status');
      return res.json();
    },
  });

  const { data: status } = useQuery({
    queryKey: ['status'],
    queryFn: async () => {
      const res = await fetch('/api/status');
      return res.json();
    },
  });

  const handleConnect = async () => {
    const res = await fetch('/api/auth/url');
    const { url } = await res.json();
    window.location.href = url;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Settings</h1>
          <p className="text-muted-foreground">Configure data sources and connections</p>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Google Authentication</h2>
            <div className="flex items-center gap-4">
              {authStatus?.authenticated ? (
                <>
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="w-3 h-3 mr-1" /> Connected
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Token expires: {status?.tokenExpiry ? new Date(status.tokenExpiry).toLocaleString() : 'Unknown'}
                  </span>
                </>
              ) : (
                <>
                  <Badge variant="destructive">
                    <XCircle className="w-3 h-3 mr-1" /> Not Connected
                  </Badge>
                  <Button onClick={handleConnect} size="sm" data-testid="button-connect">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Connect Google Account
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="border-t pt-6">
            <h2 className="text-lg font-semibold mb-4">Data Sources</h2>
            <div className="grid gap-4">
              {status?.sources && Object.entries(status.sources).map(([key, value]: [string, any]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                  <div>
                    <span className="font-medium capitalize">{key.replace('_', ' ')}</span>
                    <p className="text-xs text-muted-foreground">
                      Records: {value.recordCount || 0}
                    </p>
                  </div>
                  {value.lastError ? (
                    <Badge variant="destructive">Error</Badge>
                  ) : value.recordCount > 0 ? (
                    <Badge variant="default" className="bg-green-500">Active</Badge>
                  ) : (
                    <Badge variant="secondary">No Data</Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
