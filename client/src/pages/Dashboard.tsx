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

interface Module {
  id: string;
  name: string;
  description: string;
  includes: string[];
  tier: "core" | "addon" | "free";
  status: "active" | "locked" | "setup_required";
  ctaLabel: string;
  badge?: string;
}

function OutcomeCard({ label, value, subtext, delta, deltaType, tint }: { 
  label: string; 
  value: string | number; 
  subtext?: string;
  delta?: string;
  deltaType?: 'positive' | 'negative' | 'neutral';
  tint: 'brand' | 'brand-light' | 'blue' | 'green';
}) {
  const tintClasses = {
    'brand': 'bg-violet-500/10',
    'brand-light': 'bg-violet-400/8',
    'blue': 'bg-blue-500/10',
    'green': 'bg-emerald-500/10'
  };
  
  return (
    <div className={cn(
      "rounded-xl p-5 border border-gray-200/40 shadow-sm relative overflow-hidden",
      tintClasses[tint]
    )}>
      <div className="absolute inset-x-0 top-0 h-px bg-white/20" />
      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">{label}</p>
      <div className="flex items-baseline gap-2">
        <p className="text-4xl font-bold text-gray-900">{value}</p>
        {delta && (
          <span className={cn(
            "text-sm font-bold",
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

function HealthScoreCard({ label, score, owner }: { 
  label: string; 
  score: number; 
  owner: string; 
}) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return { stroke: '#10b981', text: 'text-emerald-600' };
    if (s >= 70) return { stroke: '#22c55e', text: 'text-green-600' };
    if (s >= 60) return { stroke: '#84cc16', text: 'text-lime-600' };
    if (s >= 50) return { stroke: '#eab308', text: 'text-yellow-600' };
    if (s >= 40) return { stroke: '#f97316', text: 'text-orange-600' };
    if (s >= 30) return { stroke: '#ef4444', text: 'text-red-500' };
    return { stroke: '#dc2626', text: 'text-red-600' };
  };
  
  const colors = getScoreColor(score);
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200/40 shadow-sm flex items-center gap-4 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gray-100" />
      <div className="relative w-12 h-12 shrink-0">
        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" fill="none" stroke="#f3f4f6" strokeWidth="3" />
          <circle 
            cx="20" cy="20" r="18" fill="none" 
            stroke={colors.stroke}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>
        <span className={cn("absolute inset-0 flex items-center justify-center text-base font-bold", colors.text)}>
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
    <div className="bg-gray-50/80 rounded-lg p-3 border border-gray-200/40 shadow-sm flex items-center justify-between relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-white/40" />
      <span className="text-sm text-gray-600">{label}</span>
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
            "rounded-xl border overflow-hidden relative transition-all",
            step.status === "active" 
              ? "bg-white border-violet-200 shadow-sm" 
              : "bg-gray-50/60 border-gray-200/60 opacity-50"
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
                    : "bg-gray-200 text-gray-400"
                )}>
                  {step.number}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={cn(
                      "font-semibold",
                      step.status === "active" ? "text-gray-900" : "text-gray-500"
                    )}>{step.title}</h3>
                    {step.status === "locked" && (
                      <Badge variant="outline" className="text-xs bg-gray-100 text-gray-400 border-gray-200">
                        <Lock className="w-3 h-3 mr-1" />
                        Locked
                      </Badge>
                    )}
                  </div>
                  <p className={cn(
                    "text-sm mb-3",
                    step.status === "active" ? "text-gray-500" : "text-gray-400"
                  )}>{step.description}</p>
                  
                  <div className="mb-4">
                    <p className={cn(
                      "text-xs font-medium mb-2",
                      step.status === "active" ? "text-gray-600" : "text-gray-400"
                    )}>What this means:</p>
                    <ul className="space-y-1">
                      {step.actions.map((action, idx) => (
                        <li key={idx} className={cn(
                          "text-sm flex items-start gap-2",
                          step.status === "active" ? "text-gray-500" : "text-gray-400"
                        )}>
                          <span className="text-gray-300 mt-1">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    {step.status === "active" ? (
                      <Button size="sm" className="w-fit bg-violet-600 hover:bg-violet-700 text-white shadow-sm hover:shadow-md transition-all">
                        Get Started
                      </Button>
                    ) : (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          disabled
                          className="w-fit bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed hover:bg-gray-100"
                        >
                          {step.unlockLabel}
                        </Button>
                        <span className="text-xs text-gray-400">Complete previous step to unlock</span>
                      </>
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

function ModulesSection({ modules }: { modules: Module[] }) {
  const coreModule = modules.find(m => m.tier === "core");
  const addonModules = modules.filter(m => m.tier === "addon");
  const freeModules = modules.filter(m => m.tier === "free");

  const getBadgeStyle = (tier: Module["tier"], status: Module["status"]) => {
    if (status === "active") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (tier === "core") return "bg-violet-50 text-violet-700 border-violet-200";
    if (tier === "free") return "bg-blue-50 text-blue-700 border-blue-200";
    return "bg-gray-100 text-gray-500 border-gray-200";
  };

  const renderModuleCard = (mod: Module, isCore: boolean = false) => (
    <Card 
      key={mod.id} 
      className={cn(
        "rounded-xl border overflow-hidden relative transition-all",
        mod.status === "active" 
          ? "bg-white border-violet-200 shadow-sm" 
          : "bg-gray-50/60 border-gray-200/60 opacity-50"
      )}
    >
      {mod.status === "active" && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-500" />
      )}
      {mod.badge && (
        <Badge 
          variant="outline" 
          className={cn(
            "absolute top-3 right-3 text-xs",
            getBadgeStyle(mod.tier, mod.status)
          )}
        >
          {mod.status === "active" ? "Active" : mod.badge}
        </Badge>
      )}
      
      <CardHeader className={cn("pb-3", mod.status === "active" && "ml-1")}>
        <CardTitle className={cn(
          "text-base flex items-center gap-2",
          mod.status === "active" ? "text-gray-900" : "text-gray-500"
        )}>
          <Search className={cn(
            "w-4 h-4",
            mod.status === "active" ? "text-violet-600" : "text-gray-400"
          )} />
          {mod.name}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn("space-y-3", mod.status === "active" && "ml-1")}>
        <p className={cn(
          "text-sm",
          mod.status === "active" ? "text-gray-500" : "text-gray-400"
        )}>{mod.description}</p>
        
        <div>
          <p className={cn(
            "text-xs font-medium mb-1",
            mod.status === "active" ? "text-gray-600" : "text-gray-400"
          )}>Includes:</p>
          <ul className="space-y-1">
            {mod.includes.map((item, idx) => (
              <li key={idx} className={cn(
                "text-xs flex items-center gap-1",
                mod.status === "active" ? "text-gray-500" : "text-gray-400"
              )}>
                <CheckCircle2 className={cn(
                  "w-3 h-3",
                  mod.status === "active" ? "text-emerald-500" : "text-gray-300"
                )} />
                {item}
              </li>
            ))}
          </ul>
        </div>
        
        <div className="flex flex-col gap-1">
          {mod.status === "active" ? (
            <Button 
              size="sm" 
              className="w-full bg-violet-600 hover:bg-violet-700 text-white shadow-sm hover:shadow-md transition-all"
            >
              {mod.ctaLabel}
            </Button>
          ) : mod.status === "setup_required" ? (
            <>
              <Button 
                size="sm" 
                variant="outline"
                className="w-full text-violet-600 border-violet-200 hover:bg-violet-50"
              >
                {mod.ctaLabel}
              </Button>
              <span className="text-xs text-gray-400 text-center">Requires Google API connection</span>
            </>
          ) : (
            <>
              <Button 
                size="sm" 
                variant="outline"
                disabled
                className="w-full bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed hover:bg-gray-100"
              >
                {mod.ctaLabel}
              </Button>
              <span className="text-xs text-gray-400 text-center">Upgrade plan to unlock</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <section className="space-y-6" data-testid="section-modules">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Your SEO Modules</h2>
        <p className="text-sm text-gray-500">Start with rankings. Add capabilities as you grow.</p>
      </div>
      
      {coreModule && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Core Module</p>
          <div className="max-w-md">
            {renderModuleCard(coreModule, true)}
          </div>
        </div>
      )}

      {addonModules.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Paid Add-ons</p>
          <div className="grid md:grid-cols-3 gap-4">
            {addonModules.map((mod) => renderModuleCard(mod))}
          </div>
        </div>
      )}

      {freeModules.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Free · Optional</p>
          <div className="max-w-md">
            {freeModules.map((mod) => renderModuleCard(mod))}
          </div>
        </div>
      )}
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

  const mockModules: Module[] = [
    {
      id: "serp_intelligence",
      name: "SERP Intelligence",
      description: "Track rankings, keyword movement, and SERP volatility across your target keywords.",
      includes: ["Weekly ranking updates", "Top 3 / Top 10 tracking", "Ranking deltas & trends"],
      tier: "core",
      status: "active",
      ctaLabel: "View Rankings",
      badge: "Required"
    },
    {
      id: "authority_engine",
      name: "Authority Engine",
      description: "Monitor your Domain Authority, backlink growth, and link velocity over time.",
      includes: ["Domain Authority score", "Referring domains", "Authority trend"],
      tier: "addon",
      status: "locked",
      ctaLabel: "Add to Plan",
      badge: "Add-on"
    },
    {
      id: "ai_visibility",
      name: "AI Visibility Score",
      description: "Understand how AI models see your content and optimize for LLM-powered search.",
      includes: ["AI readiness score", "Structured content analysis", "LLM visibility signals"],
      tier: "addon",
      status: "locked",
      ctaLabel: "Add to Plan",
      badge: "Premium"
    },
    {
      id: "competitive_intel",
      name: "Competitive Intelligence",
      description: "Compare your rankings to competitors and discover content gaps.",
      includes: ["Competitor SERP comparison", "Keyword overlap", "Opportunity discovery"],
      tier: "addon",
      status: "locked",
      ctaLabel: "Add to Plan",
      badge: "Add-on"
    },
    {
      id: "traffic_monitor",
      name: "Traffic & Conversions",
      description: "Connect Google Analytics to see organic traffic and conversion trends.",
      includes: ["Organic traffic trends", "Conversion tracking", "Basic analytics"],
      tier: "free",
      status: "setup_required",
      ctaLabel: "Connect Google",
      badge: "Free"
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
                <OutcomeCard label="Keywords in Top 3" value={8} delta="+2" deltaType="positive" subtext="Core targets" tint="brand" />
                <OutcomeCard label="Keywords in Top 10" value={24} delta="+5" deltaType="positive" subtext="57% of tracked" tint="brand-light" />
                <OutcomeCard label="Organic Traffic" value="12.4K" delta="+8%" deltaType="positive" subtext="Last 30 days" tint="blue" />
                <OutcomeCard label="Conversions" value={147} delta="-3%" deltaType="negative" subtext="Last 30 days" tint="green" />
              </div>
            </div>
            
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Health Scores</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <HealthScoreCard label="Domain Authority" score={42} owner="Backlinks Agent" />
                <HealthScoreCard label="Technical SEO" score={78} owner="Technical Agent" />
                <HealthScoreCard label="Content Coverage" score={61} owner="Competitive Intel" />
                <HealthScoreCard label="AI Readiness" score={85} owner="Atlas Agent" />
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

        <ModulesSection modules={mockModules} />

        <HowItWorksSection />
      </div>
    </DashboardLayout>
  );
}
