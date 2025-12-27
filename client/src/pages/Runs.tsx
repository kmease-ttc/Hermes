import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Clock, CheckCircle2, AlertCircle, Loader2, ArrowRight, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";

interface Run {
  id: number;
  runId: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  anomaliesDetected: number;
  ticketCount: number;
  summary: string | null;
}

function RunStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: "bg-green-100 text-green-700",
    running: "bg-blue-100 text-blue-700",
    failed: "bg-red-100 text-red-700",
    pending: "bg-amber-100 text-amber-700",
  };
  return (
    <Badge className={cn("text-xs", styles[status] || styles.pending)}>
      {status === "running" && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
      {status === "completed" && <CheckCircle2 className="w-3 h-3 mr-1" />}
      {status === "failed" && <AlertCircle className="w-3 h-3 mr-1" />}
      {status}
    </Badge>
  );
}

export default function Runs() {
  const queryClient = useQueryClient();

  const { data: runs = [], isLoading, isError, refetch } = useQuery<Run[]>({
    queryKey: ["runs"],
    queryFn: async () => {
      const res = await fetch("/api/runs");
      if (!res.ok) throw new Error("Failed to fetch runs");
      return res.json();
    },
  });

  const triggerRunMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/run", { method: "POST" });
      if (!res.ok) throw new Error("Failed to trigger run");
      return res.json();
    },
    onSuccess: (data) => {
      toast.success(`Run ${data.runId} started`);
      queryClient.invalidateQueries({ queryKey: ["runs"] });
    },
    onError: () => {
      toast.error("Failed to start diagnostic run");
    },
  });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Diagnostic Runs</h1>
            <p className="text-muted-foreground">History of automated SEO diagnostic runs</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ["runs"] })}
              data-testid="btn-refresh-runs"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={() => triggerRunMutation.mutate()}
              disabled={triggerRunMutation.isPending}
              data-testid="btn-trigger-run"
            >
              {triggerRunMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              Run Diagnostics
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <Card>
            <CardContent className="py-12">
              <Empty>
                <EmptyMedia variant="icon">
                  <AlertCircle className="w-6 h-6" />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>Failed to load runs</EmptyTitle>
                  <EmptyDescription>
                    There was a problem loading the diagnostic runs. Please try again.
                  </EmptyDescription>
                </EmptyHeader>
                <Button onClick={() => refetch()} data-testid="btn-retry-runs">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </Empty>
            </CardContent>
          </Card>
        ) : runs.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <Empty>
                <EmptyMedia variant="icon">
                  <Clock className="w-6 h-6" />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>No runs yet</EmptyTitle>
                  <EmptyDescription>
                    Run your first diagnostic to analyze your site's SEO health.
                  </EmptyDescription>
                </EmptyHeader>
                <Button onClick={() => triggerRunMutation.mutate()} data-testid="btn-first-run">
                  <Play className="w-4 h-4 mr-2" />
                  Run First Diagnostic
                </Button>
              </Empty>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Run History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {runs.map((run) => (
                  <div
                    key={run.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    data-testid={`card-run-${run.runId}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{run.runId}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(run.startedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{run.anomaliesDetected} anomalies</p>
                        <p className="text-xs text-muted-foreground">{run.ticketCount} tickets</p>
                      </div>
                      <RunStatusBadge status={run.status} />
                      <Link href={`/runs/${run.runId}`}>
                        <Button variant="ghost" size="sm" data-testid={`btn-view-run-${run.runId}`}>
                          View <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
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
