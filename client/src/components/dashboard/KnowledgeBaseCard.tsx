import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Lightbulb, Clock, ArrowRight, RefreshCw, ExternalLink, AlertCircle, FileDown } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { getCrewMember } from "@/config/agents";

interface Finding {
  findingId: string;
  title: string;
  description?: string;
  severity: string;
  category: string;
  sourceIntegration?: string;
  runId?: string;
  createdAt: string;
}

interface FindingsSummary {
  total: number;
  kbaseCount: number;
  latestFindings: Finding[];
  lastKbaseRunAt?: string;
  lastKbaseRunId?: string;
}

const severityColors: Record<string, string> = {
  critical: "bg-semantic-danger-soft text-semantic-danger",
  high: "bg-semantic-warning-soft text-semantic-warning",
  medium: "bg-semantic-warning-soft text-semantic-warning",
  low: "bg-semantic-info-soft text-semantic-info",
  info: "bg-muted text-muted-foreground",
};

export function KnowledgeBaseCard() {
  const queryClient = useQueryClient();
  
  const { data: summary, isLoading, isError, error, refetch, isFetching } = useQuery<FindingsSummary>({
    queryKey: ["findingsSummary"],
    queryFn: async () => {
      const res = await fetch("/api/findings/summary");
      if (!res.ok) {
        throw new Error(`Failed to fetch findings summary: ${res.status}`);
      }
      return res.json();
    },
    refetchInterval: 60000,
  });

  // Mutation to trigger KBASE worker run
  const runKbaseMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/kbase/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "quick" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to run KBASE: ${res.status}`);
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success("Knowledge Base updated", {
        description: data.findingsCount ? `${data.findingsCount} insights generated` : "Insights refreshed",
      });
      // Refetch findings after run completes
      queryClient.invalidateQueries({ queryKey: ["findingsSummary"] });
    },
    onError: (error: any) => {
      toast.error("Failed to run Knowledge Base", {
        description: error.message,
      });
    },
  });

  const handleRefresh = () => {
    runKbaseMutation.mutate();
  };

  const isRefreshing = isFetching || runKbaseMutation.isPending;

  const kbaseFindings = summary?.latestFindings?.filter(f => f.sourceIntegration === 'seo_kbase') || [];
  const hasFindings = kbaseFindings.length > 0;
  const lastRunTime = summary?.lastKbaseRunAt ? formatDistanceToNow(new Date(summary.lastKbaseRunAt), { addSuffix: true }) : null;

  return (
    <Card data-testid="card-knowledge-base">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-600" />
          Knowledge Base Insights
        </CardTitle>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRefresh} 
          disabled={isRefreshing}
          data-testid="button-refresh-kbase"
          title="Run Knowledge Base to get fresh insights"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            Loading insights...
          </div>
        ) : isError ? (
          <div className="text-center py-6">
            <AlertCircle className="w-10 h-10 text-semantic-danger/40 mx-auto mb-3" />
            <p className="text-semantic-danger text-sm">
              Failed to load insights
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
              Try Again
            </Button>
          </div>
        ) : !hasFindings ? (
          <div className="text-center py-6">
            <Lightbulb className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm font-medium">
              No insights found for this cycle
            </p>
            <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto">
              The Knowledge Base runs after diagnostics complete. Click refresh to check for new learnings, or run diagnostics first.
            </p>
            {lastRunTime && (
              <p className="text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" />
                Last checked {lastRunTime}
              </p>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="mt-4 rounded-xl"
            >
              {isRefreshing ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <RefreshCw className="w-3 h-3 mr-1" />}
              Get Insights
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Lightbulb className="w-4 h-4" />
                <span>{summary?.kbaseCount || 0} insights available</span>
              </div>
              {lastRunTime && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Updated {lastRunTime}</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              {kbaseFindings.slice(0, 3).map((finding) => {
                const crew = getCrewMember('knowledge_base');
                const findingTime = formatDistanceToNow(new Date(finding.createdAt), { addSuffix: true });
                
                return (
                  <div
                    key={finding.findingId}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    data-testid={`finding-${finding.findingId}`}
                  >
                    {crew.avatar ? (
                      <img src={crew.avatar} alt="Socrates" className="w-8 h-8 object-contain flex-shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: crew.color }}>
                        So
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate flex-1">{finding.title}</p>
                        <span className="text-xs text-muted-foreground flex-shrink-0">{findingTime}</span>
                      </div>
                      {finding.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                          {finding.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge className={`${severityColors[finding.severity] || severityColors.info} text-xs`}>
                          {finding.severity}
                        </Badge>
                        <Button variant="ghost" size="sm" className="h-6 text-xs px-2">
                          <FileDown className="w-3 h-3 mr-1" />
                          Export Prompt
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {summary?.kbaseCount && summary.kbaseCount > 3 && (
              <div className="text-center text-xs text-muted-foreground">
                +{summary.kbaseCount - 3} more insights
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t">
              <Link href="/agents/google_data_connector" data-testid="link-view-all-insights">
                <Button variant="ghost" size="sm" className="gap-1">
                  View All Insights
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
              {summary?.lastKbaseRunId && (
                <Link href={`/diagnostics?runId=${summary.lastKbaseRunId}`}>
                  <Button variant="outline" size="sm" className="gap-1 text-xs">
                    <ExternalLink className="w-3 h-3" />
                    Run Details
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
