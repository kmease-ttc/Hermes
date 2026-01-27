import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  BookOpen, 
  Lightbulb, 
  TrendingUp,
  RefreshCw,
  Clock,
  Loader2,
  Brain,
  Users,
  Map,
  Search,
  Plus,
  Copy,
  Check,
  FileText,
  AlertTriangle,
  Settings,
  ExternalLink
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSiteContext } from "@/hooks/useSiteContext";
import { useCrewStatus } from "@/hooks/useCrewStatus";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { getCrewMember } from "@/config/agents";
import { Link } from "wouter";
import { buildRoute } from "@shared/routes";
import {
  CrewDashboardShell,
  type CrewIdentity,
  type InspectorTab,
  type MissionPromptConfig,
  type HeaderAction,
} from "@/components/crew-dashboard";
import { KeyMetricsGrid } from "@/components/key-metrics";
import { CrewPageLayout } from "@/components/crew/CrewPageLayout";

interface Learning {
  id: string;
  title: string;
  description?: string;
  category: string;
  severity: string;
  sourceAgent?: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

interface AgentActivity {
  agentId: string;
  findingsCount: number;
  latestFinding: string | null;
}

interface KBOverviewData {
  configured: boolean;
  configError?: string | null;
  isRealData: boolean;
  dataSource: string;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  totalLearnings: number;
  insightsCount: number;
  recommendationsCount: number;
  patternsCount: number;
  activeAgents: number;
  agentActivity: AgentActivity[];
  recentLearnings: Learning[];
  insights: Learning[];
  recommendations: Learning[];
  patterns: Learning[];
}

interface Insight {
  id: string;
  title: string;
  summary: string;
  signals: string[];
  impact: 'low' | 'medium' | 'high';
  confidence?: 'low' | 'medium' | 'high';
  createdAt: string;
}

const exampleInsights: Insight[] = [
  {
    id: "insight-1",
    title: "Performance issues are concentrated on content-heavy pages",
    summary: "Pages with long-form content and large hero images consistently show poor LCP scores. These pages also correlate with higher bounce rates, suggesting performance issues are affecting user engagement on key content.",
    signals: ["Speedster", "Hemingway"],
    impact: "high",
    confidence: "high",
    createdAt: new Date().toISOString(),
  },
  {
    id: "insight-2",
    title: "EEAT gaps are clustered around older blog content",
    summary: "Older blog posts are more likely to lack author bios, citations, and first-hand experience indicators. These same posts show early signs of traffic decay.",
    signals: ["Hemingway", "Sentinel"],
    impact: "medium",
    confidence: "medium",
    createdAt: new Date().toISOString(),
  },
  {
    id: "insight-3",
    title: "Technical issues delay the impact of content improvements",
    summary: "Several recently updated articles have unresolved crawl or rendering issues, preventing changes from being fully indexed. Content quality improvements are not reaching search results promptly.",
    signals: ["Scotty", "Hemingway"],
    impact: "high",
    confidence: "high",
    createdAt: new Date().toISOString(),
  },
  {
    id: "insight-4",
    title: "Monitoring coverage is uneven across the site",
    summary: "Only a subset of pages are actively monitored for performance and decay. Issues on unmonitored pages may go undetected until traffic loss occurs.",
    signals: ["Speedster", "Sentinel"],
    impact: "medium",
    confidence: "medium",
    createdAt: new Date().toISOString(),
  },
  {
    id: "insight-5",
    title: "Repeated issues point to missing automation",
    summary: "Similar fixes (image optimization, metadata updates, EEAT additions) recur across multiple missions, suggesting these changes could be automated or templated.",
    signals: ["Speedster", "Scotty", "Hemingway"],
    impact: "medium",
    confidence: "low",
    createdAt: new Date().toISOString(),
  },
];

const categoryColors: Record<string, string> = {
  insight: "bg-semantic-info-soft text-semantic-info",
  learning: "bg-semantic-info-soft text-semantic-info",
  recommendation: "bg-semantic-warning-soft text-semantic-warning",
  action: "bg-semantic-warning-soft text-semantic-warning",
  pattern: "bg-primary-soft text-primary",
  trend: "bg-primary-soft text-primary",
};

const severityColors: Record<string, string> = {
  critical: "bg-semantic-danger-soft text-semantic-danger",
  high: "bg-semantic-warning-soft text-semantic-warning",
  medium: "bg-semantic-info-soft text-semantic-info",
  low: "bg-muted text-muted-foreground",
  info: "bg-muted text-muted-foreground",
};

function LearningCard({ 
  learning, 
  onExport 
}: { 
  learning: Learning;
  onExport?: (learning: Learning) => void;
}) {
  const sourceAgent = learning.sourceAgent ? getCrewMember(learning.sourceAgent) : null;
  const timeAgo = learning.createdAt 
    ? formatDistanceToNow(new Date(learning.createdAt), { addSuffix: true })
    : null;
  const [copied, setCopied] = useState(false);

  const handleCopyAsPrompt = () => {
    const prompt = `Context from SEO Knowledge Base:

Title: ${learning.title}
${learning.description ? `Description: ${learning.description}` : ''}
Category: ${learning.category}
${learning.severity !== 'info' ? `Priority: ${learning.severity}` : ''}
${sourceAgent ? `Source: ${sourceAgent.nickname} (${sourceAgent.role})` : ''}

Use this context when generating recommendations or analyzing similar issues.`;
    
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    toast.success("Copied as AI prompt");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="p-4 rounded-xl bg-card/60 border border-border hover:bg-card/80 transition-colors group"
      data-testid={`learning-${learning.id}`}
    >
      <div className="flex items-start gap-3">
        {sourceAgent?.avatar ? (
          <img 
            src={sourceAgent.avatar} 
            alt={sourceAgent.nickname} 
            className="w-8 h-8 object-contain flex-shrink-0" 
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Brain className="w-4 h-4 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-medium text-sm text-foreground">{learning.title}</h4>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleCopyAsPrompt}
              data-testid={`btn-copy-${learning.id}`}
            >
              {copied ? (
                <Check className="w-3 h-3 text-semantic-success" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </Button>
          </div>
          {learning.description && (
            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
              {learning.description}
            </p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={cn("text-xs", categoryColors[learning.category] || "bg-muted text-muted-foreground")}>
              {learning.category}
            </Badge>
            {learning.severity && learning.severity !== 'info' && (
              <Badge className={cn("text-xs", severityColors[learning.severity])}>
                {learning.severity}
              </Badge>
            )}
            {sourceAgent && (
              <Badge 
                variant="outline" 
                className="text-xs"
                style={{ borderColor: sourceAgent.color, color: sourceAgent.color }}
              >
                {sourceAgent.nickname}
              </Badge>
            )}
            {timeAgo && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {timeAgo}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentActivityCard({ activity }: { activity: AgentActivity }) {
  const agent = getCrewMember(activity.agentId);
  const timeAgo = activity.latestFinding 
    ? formatDistanceToNow(new Date(activity.latestFinding), { addSuffix: true })
    : null;

  return (
    <Link href={buildRoute.agent(activity.agentId)} data-testid={`link-agent-${activity.agentId}`}>
      <div 
        className="flex items-center gap-3 p-3 rounded-lg bg-card/40 border border-border/50 hover:bg-card/60 transition-colors cursor-pointer"
        data-testid={`agent-activity-${activity.agentId}`}
      >
        {agent.avatar ? (
          <img src={agent.avatar} alt={agent.nickname} className="w-8 h-8 object-contain" />
        ) : (
          <div 
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
            style={{ backgroundColor: agent.color }}
          >
            {agent.nickname.slice(0, 2)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{agent.nickname}</p>
          <p className="text-xs text-muted-foreground">{agent.role}</p>
        </div>
        <div className="text-right">
          <Badge variant="secondary" className="text-xs">{activity.findingsCount} findings</Badge>
          {timeAgo && (
            <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const impactColors: Record<string, string> = {
    high: "bg-semantic-danger-soft text-semantic-danger",
    medium: "bg-semantic-warning-soft text-semantic-warning",
    low: "bg-muted text-muted-foreground",
  };

  return (
    <div className="p-4 rounded-xl bg-card/60 border border-border" data-testid={`insight-${insight.id}`}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-semantic-info-soft flex items-center justify-center flex-shrink-0">
          <Lightbulb className="w-4 h-4 text-semantic-info" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-medium text-sm text-foreground">{insight.title}</h4>
            <Badge className={cn("text-xs capitalize", impactColors[insight.impact])}>
              {insight.impact}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{insight.summary}</p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {insight.signals.map((signal, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {signal}
              </Badge>
            ))}
            {insight.confidence && (
              <span className="text-xs text-muted-foreground ml-auto">
                Confidence: {insight.confidence}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function WriteLearningDialog({ 
  siteId, 
  onSuccess 
}: { 
  siteId: string;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("learning");

  const writeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/kb/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          entry: {
            title,
            description,
            category,
            source: "manual",
          },
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to write learning");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success("Learning saved to Knowledge Base");
      setOpen(false);
      setTitle("");
      setDescription("");
      setCategory("learning");
      onSuccess();
    },
    onError: (error: Error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2" data-testid="btn-add-learning">
          <Plus className="w-4 h-4" />
          Add Learning
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Learning</DialogTitle>
          <DialogDescription>
            Record a new insight or learning to the Knowledge Base for future reference.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g., CLS issues from lazy-loaded images"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="input-learning-title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe what you learned and how it can help in the future..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              data-testid="input-learning-description"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger data-testid="select-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="learning">Learning</SelectItem>
                <SelectItem value="insight">Insight</SelectItem>
                <SelectItem value="recommendation">Recommendation</SelectItem>
                <SelectItem value="pattern">Pattern</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} data-testid="btn-cancel-learning">Cancel</Button>
          <Button 
            onClick={() => writeMutation.mutate()}
            disabled={!title.trim() || writeMutation.isPending}
            data-testid="btn-save-learning"
          >
            {writeMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileText className="w-4 h-4 mr-2" />
            )}
            Save Learning
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConfigurationWarning({ error }: { error?: string | null }) {
  return (
    <Card className="bg-semantic-warning-soft/30 border-semantic-warning-border rounded-2xl">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-semantic-warning flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-medium text-foreground">Knowledge Base Worker Not Configured</h4>
            <p className="text-sm text-muted-foreground mt-1">
              {error || "The SEO_KBASE secret is not configured. Add the secret to Bitwarden (or set SEO_KBASE_API_KEY and SEO_KBASE_BASE_URL env vars) to enable full Knowledge Base functionality."}
            </p>
            <div className="flex gap-2 mt-3">
              <Link href="/admin/integrations" data-testid="link-integrations">
                <Button variant="outline" size="sm" className="gap-2" data-testid="btn-go-to-integrations">
                  <Settings className="w-4 h-4" />
                  Integrations
                </Button>
              </Link>
              <a href="https://vault.bitwarden.com" target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" className="gap-2" data-testid="btn-open-bitwarden">
                  <ExternalLink className="w-4 h-4" />
                  Bitwarden
                </Button>
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface LastExecution {
  id: string;
  crewId: string;
  actionId: string;
  status: string;
  completedAt: string;
  summary: string;
  metadata?: Record<string, any>;
}

interface LastExecutionResponse {
  ok: boolean;
  found: boolean;
  lastExecution?: LastExecution;
}

export function SocratesContent() {
  const { currentSite } = useSiteContext();
  const queryClient = useQueryClient();
  const siteId = currentSite?.siteId || "default";
  const { score: unifiedScore, isRefreshing: crewIsRefreshing, dataUpdatedAt: crewDataUpdatedAt } = useCrewStatus({ siteId, crewId: 'socrates' });
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isAskingSocrates, setIsAskingSocrates] = useState(false);

  const handleAskSocrates = async (question: string) => {
    setIsAskingSocrates(true);
    try {
      const res = await fetch('/api/crew/socrates/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId, question }),
      });
      const data = await res.json();
      if (data.ok && data.answer) {
        toast.success(data.answer, { duration: 10000 });
      } else {
        toast.error(data.error || 'Failed to get answer from Socrates');
      }
    } catch {
      toast.error('Failed to ask Socrates');
    } finally {
      setIsAskingSocrates(false);
    }
  };

  const { data, isLoading, error } = useQuery<KBOverviewData>({
    queryKey: ["kbase-overview", siteId],
    queryFn: async () => {
      const res = await fetch(`/api/kb/overview?siteId=${siteId}`);
      if (!res.ok) throw new Error("Failed to fetch Knowledge Base data");
      return res.json();
    },
    staleTime: 60000,
  });

  const { data: lastExecutionData } = useQuery<LastExecutionResponse>({
    queryKey: ["crew-last-execution", "seo_kbase", siteId],
    queryFn: async () => {
      const res = await fetch(`/api/crews/seo_kbase/last-execution?siteId=${siteId}`);
      if (!res.ok) return { ok: false, found: false };
      return res.json();
    },
    staleTime: 30000,
  });

  const runMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/kbase/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteId, mode: "quick" }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to run Knowledge Base");
      }
      return res.json();
    },
    onSuccess: (result) => {
      if (result.writtenCount === 0) {
        toast.info("No new learnings to add", {
          description: "Knowledge Base is already up to date",
        });
      } else if (result.writeVerified === true) {
        toast.success(result.summary || "Knowledge Base updated", {
          description: result.writtenCount ? `${result.writtenCount} new learnings added` : undefined,
        });
      } else if (result.writeVerified === false) {
        toast.error("Failed to verify Knowledge Base update", {
          description: "Changes may not have been saved correctly",
        });
      } else {
        toast.success(result.summary || "Knowledge Base updated");
      }
      queryClient.invalidateQueries({ queryKey: ["kbase-overview"] });
      queryClient.invalidateQueries({ queryKey: ["crew-last-execution", "seo_kbase", siteId] });
      queryClient.invalidateQueries({ queryKey: ["mission-state", "seo_kbase", siteId] });
    },
    onError: (error: Error) => {
      if (error.message.includes('Already completed recently')) {
        toast.info(error.message);
      } else {
        toast.error(`Analysis failed: ${error.message}`);
      }
    },
  });

  const filteredLearnings = useMemo(() => {
    if (!data?.recentLearnings) return [];
    
    return data.recentLearnings.filter(learning => {
      const matchesSearch = !searchQuery || 
        learning.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        learning.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = categoryFilter === "all" || learning.category === categoryFilter;
      
      return matchesSearch && matchesCategory;
    });
  }, [data?.recentLearnings, searchQuery, categoryFilter]);

  const crewMember = getCrewMember("seo_kbase");

  const crew: CrewIdentity = {
    crewId: "seo_kbase",
    crewName: crewMember.nickname,
    subtitle: crewMember.role,
    description: crewMember.blurb || "Aggregates insights from all agents into searchable knowledge.",
    avatar: crewMember.avatar ? (
      <img src={crewMember.avatar} alt={crewMember.nickname} className="w-full h-full object-contain" />
    ) : (
      <Map className="w-6 h-6" style={{ color: crewMember.color }} />
    ),
    accentColor: crewMember.color,
    capabilities: ["Read", "Write", "Search", "Synthesize"],
    monitors: data?.configured ? ["Worker Connected"] : ["Local Storage"],
  };

  const keyMetrics = [
    {
      id: "total-learnings",
      label: "Total Learnings",
      value: data?.totalLearnings || 0,
      icon: BookOpen,
      status: (data?.totalLearnings || 0) > 0 ? "good" : "neutral" as const,
    },
    {
      id: "active-agents",
      label: "Active Agents",
      value: data?.activeAgents || 0,
      icon: Users,
      status: (data?.activeAgents || 0) > 0 ? "good" : "neutral" as const,
    },
    {
      id: "insights",
      label: "Insights",
      value: exampleInsights.length,
      icon: Lightbulb,
      status: exampleInsights.length > 0 ? "good" : "neutral" as const,
    },
  ];

  const inspectorTabs: InspectorTab[] = [
    {
      id: "learnings",
      label: "Learnings",
      icon: <BookOpen className="w-4 h-4" />,
      badge: data?.totalLearnings || 0,
      state: data?.recentLearnings?.length ? "ready" : "empty",
      content: (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search learnings..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-learnings"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[150px]" data-testid="select-filter-category">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="learning">Learning</SelectItem>
                <SelectItem value="insight">Insight</SelectItem>
                <SelectItem value="recommendation">Recommendation</SelectItem>
                <SelectItem value="pattern">Pattern</SelectItem>
              </SelectContent>
            </Select>
            <WriteLearningDialog 
              siteId={siteId} 
              onSuccess={() => queryClient.invalidateQueries({ queryKey: ["kbase-overview"] })}
            />
          </div>
          
          {!data?.recentLearnings?.length ? (
            <div className="text-center py-8">
              <Brain className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">No learnings collected yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Run diagnostics to generate insights from your agents, or add one manually.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => runMutation.mutate()}
                disabled={runMutation.isPending}
                className="mt-4"
                data-testid="btn-collect-learnings"
              >
                {runMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Collect Learnings
              </Button>
            </div>
          ) : filteredLearnings.length === 0 ? (
            <div className="text-center py-8">
              <Search className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">No learnings match your search</p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => { setSearchQuery(""); setCategoryFilter("all"); }}
                className="mt-2"
                data-testid="btn-clear-filters"
              >
                Clear filters
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLearnings.map((learning) => (
                <LearningCard key={learning.id} learning={learning} />
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "insights",
      label: "Insights",
      icon: <Lightbulb className="w-4 h-4" />,
      badge: exampleInsights.length,
      state: exampleInsights.length > 0 ? "ready" : "empty",
      content: (
        <div className="space-y-3">
          {exampleInsights.map(insight => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      ),
    },
    {
      id: "agents",
      label: "Agent Activity",
      icon: <Users className="w-4 h-4" />,
      badge: data?.activeAgents || 0,
      state: data?.agentActivity?.length ? "ready" : "empty",
      content: (
        <div className="space-y-3">
          {!data?.agentActivity?.length ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">No agent activity recorded</p>
              <p className="text-xs text-muted-foreground mt-1">
                Run diagnostics to see which agents are contributing findings
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {data.agentActivity.map((activity) => (
                <AgentActivityCard key={activity.agentId} activity={activity} />
              ))}
            </div>
          )}
        </div>
      ),
    },
  ];

  const missionPrompt: MissionPromptConfig = {
    label: "Ask Socrates",
    placeholder: "e.g., What patterns have you noticed? What should I prioritize?",
    onSubmit: handleAskSocrates,
    isLoading: isAskingSocrates,
  };

  const headerActions: HeaderAction[] = [
    {
      id: "refresh-kb",
      icon: <RefreshCw className={cn("w-4 h-4", runMutation.isPending && "animate-spin")} />,
      tooltip: "Refresh Knowledge Base",
      onClick: () => runMutation.mutate(),
      disabled: runMutation.isPending,
      loading: runMutation.isPending,
    },
  ];

  return (
    <CrewPageLayout crewId="socrates">
      <CrewDashboardShell
        crew={crew}
        agentScore={data?.totalLearnings ? Math.min(100, data.totalLearnings * 5) : null}
        agentScoreTooltip="Based on learnings collected from all agents"
        customMetrics={<KeyMetricsGrid metrics={keyMetrics} accentColor={crew.accentColor} />}
        inspectorTabs={inspectorTabs}
        missionPrompt={missionPrompt}
        headerActions={headerActions}
        onRefresh={() => runMutation.mutate()}
        isRefreshing={runMutation.isPending || crewIsRefreshing}
        dataUpdatedAt={crewDataUpdatedAt}
      >
      
      {!data?.configured && <ConfigurationWarning error={data?.configError} />}
      
      {data?.patterns && data.patterns.length > 0 && (
        <Card className="bg-card/80 backdrop-blur-sm border-border rounded-2xl">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Detected Patterns
              </CardTitle>
              <Badge className="bg-primary-soft text-primary">{data.patternsCount}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.patterns.map((pattern) => (
                <LearningCard key={pattern.id} learning={pattern} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </CrewDashboardShell>
    </CrewPageLayout>
  );
}

export default SocratesContent;
