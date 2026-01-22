import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Clock, CheckCircle2, AlertCircle, Loader2, FileText, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "wouter";
import { cn } from "@/lib/utils";
import { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyMedia } from "@/components/ui/empty";

interface RunDetail {
  id: number;
  runId: string;
  startedAt: string;
  finishedAt: string | null;
  status: string;
  anomaliesDetected: number;
  ticketCount: number;
  summary: string | null;
  report?: {
    id: number;
    createdAt: string;
    anomalies: Array<{
      metric: string;
      dropPercent: number;
      severity: string;
    }>;
  };
  tickets?: Array<{
    id: number;
    title: string;
    priority: string;
    assignedTo: string;
    status: string;
  }>;
}

function RunStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: "bg-semantic-success-soft text-semantic-success",
    running: "bg-semantic-info-soft text-semantic-info",
    failed: "bg-semantic-danger-soft text-semantic-danger",
    pending: "bg-semantic-warning-soft text-semantic-warning",
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

export default function RunDetail() {
  const params = useParams<{ runId: string }>();

  const { data: run, isLoading } = useQuery<RunDetail>({
    queryKey: ["run", params.runId],
    queryFn: async () => {
      const res = await fetch(`/api/runs/${params.runId}`);
      if (!res.ok) throw new Error("Run not found");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout className="dashboard-light">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!run) {
    return (
      <DashboardLayout className="dashboard-light">
        <div className="p-6">
          <Card>
            <CardContent className="py-12">
              <Empty>
                <EmptyMedia variant="icon">
                  <AlertTriangle className="w-6 h-6" />
                </EmptyMedia>
                <EmptyHeader>
                  <EmptyTitle>Run not found</EmptyTitle>
                  <EmptyDescription>
                    The diagnostic run you're looking for doesn't exist.
                  </EmptyDescription>
                </EmptyHeader>
                <Link href="/runs">
                  <Button data-testid="btn-back-runs">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Runs
                  </Button>
                </Link>
              </Empty>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout className="dashboard-light">
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/runs">
            <Button variant="ghost" size="sm" data-testid="btn-back-runs">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{run.runId}</h1>
              <RunStatusBadge status={run.status} />
            </div>
            <p className="text-muted-foreground text-sm">
              Started {new Date(run.startedAt).toLocaleString()}
              {run.finishedAt && ` • Finished ${new Date(run.finishedAt).toLocaleString()}`}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-semantic-warning-soft flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-semantic-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{run.anomaliesDetected}</p>
                  <p className="text-xs text-muted-foreground">Anomalies Detected</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-semantic-info-soft flex items-center justify-center">
                  <FileText className="w-5 h-5 text-semantic-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{run.ticketCount}</p>
                  <p className="text-xs text-muted-foreground">Tickets Created</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-semantic-success-soft flex items-center justify-center">
                  <Clock className="w-5 h-5 text-semantic-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {run.finishedAt
                      ? `${Math.round((new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s`
                      : "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">Duration</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {run.summary && (
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{run.summary}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
