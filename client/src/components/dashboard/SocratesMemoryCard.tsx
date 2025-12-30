import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { 
  Brain, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  ArrowRight,
  Lightbulb,
  BookOpen,
  PenLine,
  Search
} from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { useSiteContext } from "@/hooks/useSiteContext";
import { cn } from "@/lib/utils";

interface KBStatus {
  configured: boolean;
  status: "healthy" | "unreachable" | "not_configured";
  workerVersion?: string;
  lastWriteAt?: string;
  lastQueryAt?: string;
  entriesCount?: number;
  recentLearnings?: Array<{
    id: string;
    type: string;
    topic: string;
    title: string;
    createdAt: string;
  }>;
  error?: string;
  message?: string;
}

const statusColors = {
  healthy: "bg-semantic-success-soft text-semantic-success",
  unreachable: "bg-semantic-warning-soft text-semantic-warning",
  not_configured: "bg-muted text-muted-foreground",
};

const typeIcons: Record<string, any> = {
  observation: Lightbulb,
  recommendation: BookOpen,
  fix_result: CheckCircle,
  experiment: RefreshCw,
  incident: AlertCircle,
};

export function SocratesMemoryCard() {
  const { selectedSiteId } = useSiteContext();
  
  const { data: kbStatus, isLoading, refetch, isFetching } = useQuery<{ data: KBStatus }>({
    queryKey: ["kb-status", selectedSiteId],
    queryFn: async () => {
      const res = await fetch(`/api/kb/status?siteId=${selectedSiteId}`);
      if (!res.ok) throw new Error("Failed to fetch KB status");
      return res.json();
    },
    refetchInterval: 60000,
  });

  const status = kbStatus?.data;
  const isRefreshing = isFetching;
  
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return null;
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return null;
    }
  };

  return (
    <Card data-testid="card-socrates-memory">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Brain className="w-5 h-5 text-lime-600" />
          Socrates
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge className={cn("text-xs", statusColors[status?.status || "not_configured"])}>
            {status?.status === "healthy" ? "Connected" : 
             status?.status === "unreachable" ? "Offline" : "Not Configured"}
          </Badge>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => refetch()} 
            disabled={isRefreshing}
            data-testid="button-refresh-kb-status"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <RefreshCw className="w-4 h-4 animate-spin mr-2" />
            Loading...
          </div>
        ) : !status?.configured ? (
          <div className="text-center py-6">
            <Brain className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm font-medium">
              Not Connected
            </p>
            <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto">
              {status?.message || "Set up SEO_KBASE secret to enable Socrates learning."}
            </p>
            <Link href="/integrations" data-testid="link-configure-kb">
              <Button variant="outline" size="sm" className="mt-4 rounded-xl">
                Configure Integrations
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <PenLine className="w-3 h-3" />
                  Last Write
                </div>
                <p className="text-sm font-medium">
                  {formatTime(status?.lastWriteAt) || "Never"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Search className="w-3 h-3" />
                  Last Query
                </div>
                <p className="text-sm font-medium">
                  {formatTime(status?.lastQueryAt) || "Never"}
                </p>
              </div>
            </div>

            {status?.entriesCount !== undefined && (
              <div className="flex items-center justify-between text-sm px-1">
                <span className="text-muted-foreground">Total learnings stored</span>
                <Badge variant="outline" className="font-mono">
                  {status.entriesCount}
                </Badge>
              </div>
            )}

            {status?.recentLearnings && status.recentLearnings.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Recent Learnings
                </p>
                {status.recentLearnings.slice(0, 3).map((learning) => {
                  const Icon = typeIcons[learning.type] || Lightbulb;
                  return (
                    <div
                      key={learning.id}
                      className="flex items-start gap-3 p-2 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                      data-testid={`learning-${learning.id}`}
                    >
                      <Icon className="w-4 h-4 text-lime-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{learning.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {learning.topic}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTime(learning.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {(!status?.recentLearnings || status.recentLearnings.length === 0) && (
              <div className="text-center py-4 text-muted-foreground">
                <Lightbulb className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No recent learnings</p>
                <p className="text-xs mt-1">
                  Learnings are recorded when fixes are created or diagnostics run.
                </p>
              </div>
            )}

            <div className="flex justify-between items-center pt-2 border-t">
              <Link href="/crew/socrates" data-testid="link-view-socrates">
                <Button variant="ghost" size="sm" className="gap-1">
                  View Socrates
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
              {status?.workerVersion && (
                <span className="text-xs text-muted-foreground">
                  v{status.workerVersion}
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
