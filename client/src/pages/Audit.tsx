import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, RefreshCw, Loader2, Download, Filter } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";
import { toast } from "sonner";

interface AuditLogEntry {
  id: number;
  timestamp: string;
  action: string;
  actor: string;
  resourceType: string;
  resourceId: string;
  details: string | null;
  status: string;
}

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, string> = {
    create: "bg-semantic-success-soft text-semantic-success",
    update: "bg-semantic-info-soft text-semantic-info",
    delete: "bg-semantic-danger-soft text-semantic-danger",
    run: "bg-purple-soft text-purple-accent",
    error: "bg-semantic-danger-soft text-semantic-danger",
  };
  const actionType = action.toLowerCase().includes("create")
    ? "create"
    : action.toLowerCase().includes("update")
    ? "update"
    : action.toLowerCase().includes("delete")
    ? "delete"
    : action.toLowerCase().includes("run")
    ? "run"
    : "update";
  return <Badge className={cn("text-xs", colors[actionType])}>{action}</Badge>;
}

export default function Audit() {
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading } = useQuery<AuditLogEntry[]>({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const res = await fetch("/api/audit-logs");
      if (!res.ok) return [];
      return res.json();
    },
  });

  const handleExport = () => {
    const csv = [
      ["Timestamp", "Action", "Actor", "Resource Type", "Resource ID", "Details", "Status"].join(","),
      ...logs.map((log) =>
        [
          log.timestamp,
          log.action,
          log.actor,
          log.resourceType,
          log.resourceId,
          log.details || "",
          log.status,
        ]
          .map((v) => `"${v}"`)
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Audit log exported");
  };

  return (
    <DashboardLayout className="dashboard-light">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Audit Log</h1>
            <p className="text-muted-foreground">Track all system actions and changes</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["audit-logs"] })}
              data-testid="btn-refresh-audit"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} data-testid="btn-export-audit">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <Empty>
                <EmptyMedia variant="icon">
                  <FileText className="w-6 h-6" />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>No audit entries yet</EmptyTitle>
                  <EmptyDescription>
                    System actions and changes will appear here as they occur.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    data-testid={`audit-entry-${log.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <ActionBadge action={log.action} />
                      <div>
                        <p className="text-sm font-medium">
                          {log.resourceType} {log.resourceId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {log.actor} • {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {log.details && (
                      <p className="text-xs text-muted-foreground max-w-xs truncate">{log.details}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
