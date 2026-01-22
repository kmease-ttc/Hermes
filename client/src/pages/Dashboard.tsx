import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown,
  Lock,
  CheckCircle2,
  ArrowRight,
  Target,
  Zap,
  FileText,
  Settings,
  BarChart3,
  Search,
  PenTool,
  Bot,
  ExternalLink
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSiteContext } from "@/hooks/useSiteContext";
import { SiteSelector } from "@/components/site/SiteSelector";
import { Link } from "wouter";
import { ROUTES } from "@shared/routes";
import { cn } from "@/lib/utils";

interface RankingItem {
  keyword: string;
  position: number;
  change: number;
  volume?: number;
}

interface PageToOptimize {
  url: string;
  title: string;
  keyword: string;
  position: number;
  volume: number;
  action: string;
}

interface TopPerformer {
  url: string;
  title: string;
  keyword: string;
  position: number;
}

interface Agent {
  id: string;
  name: string;
  description: string;
  includes: string[];
  status: "active" | "locked" | "setup_required";
  ctaLabel: string;
  ctaAction: string;
}

function OutcomeCard({ label, value, subtext, delta, deltaType }: { 
  label: string; 
  value: string | number; 
  subtext?: string;
  delta?: string;
  deltaType?: 'positive' | 'negative' | 'neutral';
}) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-4xl font-bold text-gray-900">{value}</p>
        {delta && (
          <span className={cn(
            "text-sm font-semibold",
            deltaType === 'positive' && "text-emerald-600",
            deltaType === 'negative' && "text-red-600",
            deltaType === 'neutral' && "text-gray-500"
          )}>
            {delta}
          </span>
        )}
      </div>
      {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
    </div>
  );
}

function HealthScoreCard({ label, score, owner, status }: { label: string; score: number; owner: string; status: 'good' | 'warning' | 'danger' }) {
  const accentColors = {
    good: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500'
  };
  const ringColors = {
    good: 'stroke-emerald-500',
    warning: 'stroke-amber-500',
    danger: 'stroke-red-500'
  };
  
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm flex items-center gap-4 relative overflow-hidden">
      <div className={cn("absolute left-0 top-0 bottom-0 w-1", accentColors[status])} />
      <div className="relative w-12 h-12 shrink-0 ml-2">
        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" fill="none" stroke="#f3f4f6" strokeWidth="3" />
          <circle 
            cx="20" cy="20" r="18" fill="none" 
            className={ringColors[status]}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-900">
          {score}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{label}</p>
        <p className="text-xs text-gray-500">{owner}</p>
      </div>
    </div>
  );
}

function ActivityCard({ label, value, period }: { label: string; value: number; period: string }) {
  return (
    <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm flex items-center justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <div className="text-right">
        <span className="text-xl font-bold text-gray-900">{value}</span>
        <span className="text-xs text-gray-400 ml-1">{period}</span>
      </div>
    </div>
  );
}

function RankingMomentumSection({ improving, needsAttention }: { improving: RankingItem[]; needsAttention: RankingItem[] }) {
  return (
    <section className="space-y-4" data-testid="section-ranking-momentum">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Ranking Momentum</h2>
        <span className="text-xs text-gray-500">7-day change</span>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
          <CardHeader className="pb-3 border-b border-gray-100 ml-1">
            <CardTitle className="text-base flex items-center gap-2 text-gray-900">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Improving
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-4 ml-1">
            {improving.length === 0 ? (
              <p className="text-sm text-gray-500">No significant improvements this week</p>
            ) : (
              improving.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{item.keyword}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-emerald-600">+{Math.abs(item.change)}</span>
                    <span className="text-sm text-gray-500 w-8 text-right">#{item.position}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />
          <CardHeader className="pb-3 border-b border-gray-100 ml-1">
            <CardTitle className="text-base flex items-center gap-2 text-gray-900">
              <TrendingDown className="w-4 h-4 text-red-600" />
              Declined
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-4 ml-1">
            {needsAttention.length === 0 ? (
              <p className="text-sm text-gray-500">No significant declines this week</p>
            ) : (
              needsAttention.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{item.keyword}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-red-600">{item.change}</span>
                    <span className="text-sm text-gray-500 w-8 text-right">#{item.position}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function WhatToDoNextSection() {
  const steps = [
    {
      number: 1,
      title: "Strengthen pages already close to page one",
      description: "Several important pages are ranking between positions #4–#10. These are the fastest opportunities to move into the top results.",
      actions: [
        "Improve titles and headings",
        "Add internal links from high-traffic pages",
        "Expand content to answer related questions"
      ],
      status: "active" as const,
      unlockLabel: null
    },
    {
      number: 2,
      title: "Build pages for high-volume gaps",
      description: "Some high-search keywords still don't have a strong page competing in the results.",
      actions: [
        "Create or expand hub pages for core services",
        "Cover broader search intent before going deeper",
        "Focus on one strong page per topic"
      ],
      status: "locked" as const,
      unlockLabel: "Unlock Content Optimization"
    },
    {
      number: 3,
      title: "Fix technical issues that limit rankings",
      description: "Technical issues can quietly prevent pages from ranking higher, even with good content.",
      actions: [
        "Ensure pages are crawlable and indexable",
        "Fix missing headings and thin content",
        "Improve page speed and mobile performance"
      ],
      status: "locked" as const,
      unlockLabel: "Unlock Technical SEO"
    },
    {
      number: 4,
      title: "Publish with momentum (weekly plan)",
      description: "Consistent publishing reinforces rankings and prevents backsliding.",
      actions: [
        "Week 1: Strengthen existing ranking pages",
        "Week 2: Publish supporting content",
        "Week 3+: Maintain weekly updates"
      ],
      status: "locked" as const,
      unlockLabel: "Unlock Content Automation"
    }
  ];

  return (
    <section className="space-y-4" data-testid="section-what-to-do-next">
      <h2 className="text-xl font-semibold text-gray-900">What To Do Next</h2>
      
      <div className="space-y-4">
        {steps.map((step) => (
          <Card key={step.number} className={cn(
            "bg-white rounded-xl border shadow-sm overflow-hidden relative",
            step.status === "active" ? "border-violet-200" : "border-gray-100"
          )}>
            {step.status === "active" && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500" />
            )}
            <CardContent className={cn("pt-5", step.status === "active" && "ml-1")}>
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                  step.status === "active" 
                    ? "bg-violet-600 text-white" 
                    : "bg-gray-100 text-gray-500"
                )}>
                  {step.number}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{step.title}</h3>
                    {step.status === "locked" && (
                      <Badge variant="outline" className="text-xs bg-gray-50 text-gray-500 border-gray-200">
                        <Lock className="w-3 h-3 mr-1" />
                        Locked
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-3">{step.description}</p>
                  
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-600 mb-2">What this means:</p>
                    <ul className="space-y-1">
                      {step.actions.map((action, idx) => (
                        <li key={idx} className="text-sm text-gray-500 flex items-start gap-2">
                          <span className="text-gray-400 mt-1">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {step.status === "active" ? (
                      <span className="text-sm font-medium text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Active
                      </span>
                    ) : (
                      <Button size="sm" variant="outline" className="text-violet-600 border-violet-200 hover:bg-violet-50">
                        {step.unlockLabel}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function PagesToOptimizeSection({ pages }: { pages: PageToOptimize[] }) {
  return (
    <section className="space-y-4" data-testid="section-pages-to-optimize">
      <h2 className="text-xl font-semibold text-gray-900">Pages to Optimize</h2>
      
      <div className="space-y-3">
        {pages.length === 0 ? (
          <Card className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <CardContent className="py-8 text-center">
              <p className="text-gray-500">Connect your Search Console to see optimization opportunities</p>
            </CardContent>
          </Card>
        ) : (
          pages.map((page, idx) => (
            <Card key={idx} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">{page.title}</p>
                    <p className="text-xs text-gray-400 truncate">{page.url}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
                        {page.keyword}
                      </span>
                      <span className="text-xs text-gray-500">
                        #{page.position} · {page.volume.toLocaleString()} mo/search
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-violet-600 font-medium">{page.action}</p>
                    <Button variant="ghost" size="sm" className="mt-1 gap-1 text-xs text-gray-500 hover:text-gray-900">
                      View <ArrowRight className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </section>
  );
}

function TopPerformersSection({ performers }: { performers: TopPerformer[] }) {
  return (
    <section className="space-y-4" data-testid="section-top-performers">
      <h2 className="text-xl font-semibold text-gray-900">Top Performers</h2>
      
      <Card className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden relative">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
        <CardHeader className="pb-0 border-b border-gray-100 ml-1">
          <p className="text-sm font-medium text-emerald-600 py-2">Pages ranking in top 3</p>
        </CardHeader>
        <CardContent className="pt-4 ml-1">
          {performers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No top-ranking pages detected yet</p>
          ) : (
            <>
              <div className="space-y-3">
                {performers.map((page, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{page.title}</p>
                      <p className="text-xs text-gray-500">{page.keyword}</p>
                    </div>
                    <span className="text-sm font-bold text-emerald-600 shrink-0">
                      #{page.position}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 mt-4">
                These pages protect your traffic. Changes here should be deliberate.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

function AgentsSection({ agents }: { agents: Agent[] }) {
  return (
    <section className="space-y-4" data-testid="section-agents">
      <h2 className="text-xl font-semibold text-gray-900">Agents</h2>
      <p className="text-sm text-gray-500">Unlock capabilities to automate your SEO workflow</p>
      
      <div className="grid md:grid-cols-2 gap-4">
        {agents.map((agent) => (
          <Card 
            key={agent.id} 
            className={cn(
              "bg-white rounded-xl border shadow-sm overflow-hidden relative",
              agent.status === "active" ? "border-violet-200" : "border-gray-100"
            )}
          >
            {agent.status === "active" && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500" />
            )}
            {agent.status === "locked" && (
              <Badge variant="outline" className="absolute top-3 right-3 bg-gray-50 text-gray-500 border-gray-200 text-xs">
                <Lock className="w-3 h-3 mr-1" />
                Locked
              </Badge>
            )}
            
            <CardHeader className={cn("pb-3", agent.status === "active" && "ml-1")}>
              <CardTitle className="text-base flex items-center gap-2 text-gray-900">
                <Bot className="w-4 h-4 text-violet-600" />
                {agent.name}
              </CardTitle>
            </CardHeader>
            <CardContent className={cn("space-y-3", agent.status === "active" && "ml-1")}>
              <p className="text-sm text-gray-500">{agent.description}</p>
              
              <div>
                <p className="text-xs font-medium text-gray-600 mb-1">Includes:</p>
                <ul className="space-y-1">
                  {agent.includes.map((item, idx) => (
                    <li key={idx} className="text-xs text-gray-500 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              
              <Button 
                size="sm" 
                variant="outline"
                className={cn(
                  "w-full mt-2",
                  agent.status === "active" 
                    ? "text-gray-600 border-gray-200" 
                    : "text-violet-600 border-violet-200 hover:bg-violet-50"
                )}
              >
                {agent.ctaLabel}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const steps = [
    { number: 1, text: "Rankings tracked weekly" },
    { number: 2, text: "Meaningful movement detected" },
    { number: 3, text: "Prescriptive actions generated" },
    { number: 4, text: "Automation unlocked where useful" }
  ];

  return (
    <section className="space-y-4 pt-8 border-t border-gray-200" data-testid="section-how-it-works">
      <h2 className="text-lg font-semibold text-gray-900 text-center">How This Works</h2>
      
      <div className="flex flex-wrap justify-center gap-4">
        {steps.map((step, idx) => (
          <div key={step.number} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold text-white">
              {step.number}
            </div>
            <span className="text-sm text-gray-700">{step.text}</span>
            {idx < steps.length - 1 && <ArrowRight className="w-4 h-4 text-gray-400 hidden sm:block" />}
          </div>
        ))}
      </div>
      
      <p className="text-center text-sm text-gray-600 italic max-w-lg mx-auto">
        Rankings are the signal. Everything here exists to improve them.
      </p>
    </section>
  );
}

export default function Dashboard() {
  const { siteId, siteDomain } = useSiteContext();
  
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["/api/dashboard", siteId],
    enabled: !!siteId,
  });

  const mockImprovingKeywords: RankingItem[] = [
    { keyword: "seo audit tool", position: 7, change: 4 },
    { keyword: "website performance checker", position: 12, change: 3 },
    { keyword: "technical seo analysis", position: 15, change: 5 },
  ];

  const mockNeedsAttention: RankingItem[] = [
    { keyword: "site speed test", position: 18, change: -3 },
    { keyword: "core web vitals", position: 25, change: -6 },
  ];

  const mockPagesToOptimize: PageToOptimize[] = [
    {
      url: "/services/seo-audit",
      title: "SEO Audit Services",
      keyword: "seo audit services",
      position: 8,
      volume: 2400,
      action: "Rewrite title tag"
    },
    {
      url: "/blog/technical-seo-guide",
      title: "Complete Technical SEO Guide",
      keyword: "technical seo guide",
      position: 11,
      volume: 1800,
      action: "Add internal links"
    }
  ];

  const mockTopPerformers: TopPerformer[] = [
    { url: "/tools/site-audit", title: "Free Site Audit Tool", keyword: "free site audit", position: 3 },
    { url: "/blog/seo-checklist", title: "2024 SEO Checklist", keyword: "seo checklist", position: 2 },
  ];

  const mockAgents: Agent[] = [
    {
      id: "technical_seo",
      name: "Technical SEO",
      description: "Automated crawling and technical issue detection",
      includes: ["Weekly site crawls", "Issue prioritization", "Fix recommendations"],
      status: "locked",
      ctaLabel: "Subscribe",
      ctaAction: "/pricing"
    },
    {
      id: "analytics_insights",
      name: "Analytics Insights",
      description: "Connect GA4 and Search Console for deeper analysis",
      includes: ["Traffic analysis", "Ranking tracking", "Performance trends"],
      status: "setup_required",
      ctaLabel: "Finish Setup",
      ctaAction: "/integrations"
    },
    {
      id: "content_optimization",
      name: "Content Optimization",
      description: "AI-powered content recommendations",
      includes: ["Title optimization", "Content gap analysis", "Competitor insights"],
      status: "locked",
      ctaLabel: "Upgrade Plan",
      ctaAction: "/pricing"
    },
    {
      id: "content_automation",
      name: "Content Automation",
      description: "Automated content publishing pipeline",
      includes: ["Weekly publishing schedule", "Content briefs", "Performance tracking"],
      status: "locked",
      ctaLabel: "Subscribe",
      ctaAction: "/pricing"
    }
  ];

  return (
    <DashboardLayout className="dashboard-light">
      <div className="space-y-8 max-w-5xl mx-auto">
        <header className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">SEO Performance Overview</h1>
                <span className="text-xs font-medium text-violet-600 bg-violet-50 px-2 py-1 rounded">Weekly Report</span>
              </div>
              <p className="text-gray-500">Updated weekly · Rankings are the north star</p>
            </div>
            <SiteSelector />
          </div>
          
          <div className="space-y-6">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Outcomes</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <OutcomeCard label="Keywords in Top 3" value={8} delta="+2" deltaType="positive" subtext="Core targets" />
                <OutcomeCard label="Keywords in Top 10" value={24} delta="+5" deltaType="positive" subtext="57% of tracked" />
                <OutcomeCard label="Organic Traffic" value="12.4K" delta="+8%" deltaType="positive" subtext="Last 30 days" />
                <OutcomeCard label="Conversions" value={147} delta="-3%" deltaType="negative" subtext="Last 30 days" />
              </div>
            </div>
            
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Health Scores</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <HealthScoreCard label="Domain Authority" score={42} owner="Backlinks Agent" status="warning" />
                <HealthScoreCard label="Technical SEO" score={78} owner="Technical Agent" status="good" />
                <HealthScoreCard label="Content Coverage" score={61} owner="Competitive Intel" status="warning" />
                <HealthScoreCard label="AI Readiness" score={85} owner="Atlas Agent" status="good" />
              </div>
            </div>
            
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Activity</p>
              <div className="grid grid-cols-3 gap-3">
                <ActivityCard label="Blogs Published" value={4} period="30d" />
                <ActivityCard label="Pages Optimized" value={12} period="30d" />
                <ActivityCard label="Fixes Applied" value={23} period="30d" />
              </div>
            </div>
          </div>
        </header>

        <RankingMomentumSection 
          improving={mockImprovingKeywords} 
          needsAttention={mockNeedsAttention} 
        />

        <WhatToDoNextSection />

        <PagesToOptimizeSection pages={mockPagesToOptimize} />

        <TopPerformersSection performers={mockTopPerformers} />

        <AgentsSection agents={mockAgents} />

        <HowItWorksSection />
      </div>
    </DashboardLayout>
  );
}
