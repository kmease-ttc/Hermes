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

function StatCard({ label, value, subtext }: { label: string; value: string | number; subtext?: string }) {
  return (
    <div className="glass-strong glow-border rounded-xl p-5">
      <p className="text-sm text-[#334155] mb-1">{label}</p>
      <p className="text-3xl font-bold text-[#0B1220]">{value}</p>
      {subtext && <p className="text-xs text-[#334155] mt-1">{subtext}</p>}
    </div>
  );
}

function RankingMomentumSection({ improving, needsAttention }: { improving: RankingItem[]; needsAttention: RankingItem[] }) {
  return (
    <section className="space-y-4" data-testid="section-ranking-momentum">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Ranking Momentum</h2>
        <Badge variant="outline" className="text-xs">7-day change</Badge>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="glass-green glow-success rounded-xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-emerald-200/30">
            <CardTitle className="text-base flex items-center gap-2 text-[#0B1220]">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Improving
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            {improving.length === 0 ? (
              <p className="text-sm text-[#334155]">No significant improvements this week</p>
            ) : (
              improving.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-emerald-100/30 last:border-0">
                  <span className="text-sm font-semibold text-[#0B1220] truncate max-w-[200px]">{item.keyword}</span>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-emerald-100 text-emerald-800 font-semibold">
                      +{Math.abs(item.change)}
                    </Badge>
                    <span className="text-sm font-semibold text-[#334155] w-8 text-right">#{item.position}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="glass-amber glow-brand rounded-xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-amber-200/30">
            <CardTitle className="text-base flex items-center gap-2 text-[#0B1220]">
              <TrendingDown className="w-4 h-4 text-amber-600" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            {needsAttention.length === 0 ? (
              <p className="text-sm text-[#334155]">No significant declines this week</p>
            ) : (
              needsAttention.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-amber-100/30 last:border-0">
                  <span className="text-sm font-semibold text-[#0B1220] truncate max-w-[200px]">{item.keyword}</span>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-amber-100 text-amber-800 font-semibold">
                      {item.change}
                    </Badge>
                    <span className="text-sm font-semibold text-[#334155] w-8 text-right">#{item.position}</span>
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
            "transition-all rounded-xl",
            step.status === "active" ? "glass-purple glow-brand" : "glass glow-border"
          )}>
            <CardContent className="pt-5">
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                  step.status === "active" 
                    ? "bg-violet-600 text-white" 
                    : "bg-gray-200 text-gray-700"
                )}>
                  {step.number}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{step.title}</h3>
                    {step.status === "locked" && (
                      <Badge variant="outline" className="text-xs bg-gray-100 text-gray-600 border-gray-300">
                        <Lock className="w-3 h-3 mr-1" />
                        Locked
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{step.description}</p>
                  
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-700 mb-2">What this means:</p>
                    <ul className="space-y-1">
                      {step.actions.map((action, idx) => (
                        <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                          <span className="text-violet-600 mt-1">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {step.status === "active" ? (
                      <Badge className="bg-emerald-100 text-emerald-800 font-semibold">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    ) : (
                      <Button size="sm" className="gap-1 btn-gradient-primary">
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
          <Card className="glass rounded-xl">
            <CardContent className="py-8 text-center">
              <p className="text-gray-600">Connect your Search Console to see optimization opportunities</p>
            </CardContent>
          </Card>
        ) : (
          pages.map((page, idx) => (
            <Card key={idx} className="glass rounded-xl hover:shadow-lg transition-all">
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">{page.title}</p>
                    <p className="text-xs text-gray-500 truncate">{page.url}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-300">
                        {page.keyword}
                      </Badge>
                      <span className="text-xs font-semibold text-gray-700">
                        #{page.position} · {page.volume.toLocaleString()} mo/search
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-violet-700 font-semibold">{page.action}</p>
                    <Button variant="ghost" size="sm" className="mt-1 gap-1 text-xs text-gray-700 hover:text-gray-900">
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
      
      <Card className="glass-green glow-success rounded-xl overflow-hidden">
        <CardHeader className="pb-0 border-b border-emerald-200/30">
          <p className="text-sm font-semibold text-emerald-800 py-2">Pages ranking in top 3</p>
        </CardHeader>
        <CardContent className="pt-4">
          {performers.length === 0 ? (
            <p className="text-[#334155] text-center py-4">No top-ranking pages detected yet</p>
          ) : (
            <>
              <div className="space-y-3">
                {performers.map((page, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-emerald-100/30 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#0B1220] truncate">{page.title}</p>
                      <p className="text-xs text-[#334155]">{page.keyword}</p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-800 font-bold shrink-0">
                      #{page.position}
                    </Badge>
                  </div>
                ))}
              </div>
              <p className="text-sm text-[#334155] mt-4 italic">
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
      <p className="text-sm text-gray-600">Unlock capabilities to automate your SEO workflow</p>
      
      <div className="grid md:grid-cols-2 gap-4">
        {agents.map((agent) => (
          <Card 
            key={agent.id} 
            className={cn(
              "relative rounded-xl",
              agent.status === "locked" ? "glass glow-border" : "glass-purple glow-brand"
            )}
          >
            {agent.status === "locked" && (
              <Badge className="absolute top-3 right-3 bg-gray-900/80 text-white border-0 text-xs">
                <Lock className="w-3 h-3 mr-1" />
                Locked
              </Badge>
            )}
            
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-gray-900">
                <Bot className="w-4 h-4 text-violet-600" />
                {agent.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-gray-600">{agent.description}</p>
              
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1">Includes:</p>
                <ul className="space-y-1">
                  {agent.includes.map((item, idx) => (
                    <li key={idx} className="text-xs text-gray-600 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              
              <Button 
                size="sm" 
                className={cn(
                  "w-full mt-2",
                  agent.status === "active" 
                    ? "bg-gray-100 text-gray-700 border border-gray-300 hover:bg-gray-200" 
                    : "btn-gradient-primary"
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
        <header className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">SEO Performance Overview</h1>
                <Badge className="text-xs bg-violet-100 text-violet-800 border-violet-300">Weekly Report</Badge>
              </div>
              <p className="text-gray-600">Updated weekly · Focused on rankings that drive demand</p>
            </div>
            <SiteSelector />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard label="Keywords Tracked" value={42} />
            <StatCard label="Ranking in Top 20" value={18} subtext="43% of tracked" />
            <StatCard label="Improved This Week" value={7} subtext="+12 positions total" />
            <StatCard label="Declined This Week" value={3} subtext="-8 positions total" />
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
