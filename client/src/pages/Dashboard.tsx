import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataCard } from "@/components/ui/DataCard";
import { EmptyStateInline } from "@/components/ui/EmptyStateInline";
import { ConfigureOverlay } from "@/components/overlays";
import { PageHeader } from "@/components/ui/PageHeader";
import { Banner } from "@/components/ui/Banner";
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
  ExternalLink,
  Activity,
  Play,
  MousePointer,
  UserMinus,
  Eye,
  Sun,
  Users,
  LucideIcon,
  AlertTriangle,
  MapPin
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useSiteContext } from "@/hooks/useSiteContext";
import { SiteSelector } from "@/components/site/SiteSelector";
import { Link, useLocation } from "wouter";
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
  tint: 'amber' | 'purple' | 'blue' | 'green' | 'red';
}) {
  const tintStyles = {
    'amber': { bg: 'bg-gold-soft', text: 'text-gold', labelText: 'text-gold' },
    'purple': { bg: 'bg-brand-soft', text: 'text-brand', labelText: 'text-brand' },
    'blue': { bg: 'bg-info-soft', text: 'text-info', labelText: 'text-info' },
    'green': { bg: 'bg-success-soft', text: 'text-success', labelText: 'text-success' },
    'red': { bg: 'bg-danger-soft', text: 'text-danger', labelText: 'text-danger' }
  };
  
  const style = tintStyles[tint];
  
  return (
    <div className={cn(
      "rounded-xl p-5 border border-border shadow-sm relative overflow-hidden",
      style.bg
    )}>
      <div className="absolute inset-x-0 top-0 h-px bg-card/40" />
      <p className={cn("text-xs font-semibold uppercase tracking-wide mb-2", style.labelText)}>{label}</p>
      <div className="flex items-baseline gap-2">
        <p className={cn("text-4xl font-bold", style.text)}>{value}</p>
        {delta && (
          <span className={cn(
            "text-sm font-bold",
            deltaType === 'positive' && "text-success",
            deltaType === 'negative' && "text-danger",
            deltaType === 'neutral' && "text-muted-foreground"
          )}>
            {delta}
          </span>
        )}
      </div>
      {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
    </div>
  );
}

function CostMetricCard({ title, value, tint, isEstimate, icon: Icon }: { 
  title: string; 
  value: number | string; 
  tint: 'red' | 'orange' | 'amber' | 'violet';
  isEstimate?: boolean;
  icon: LucideIcon;
}) {
  const tintStyles = {
    'red': { bg: 'bg-danger-soft', text: 'text-danger', labelText: 'text-muted-foreground', border: 'border-danger', iconText: 'text-danger' },
    'orange': { bg: 'bg-warning-soft', text: 'text-warning', labelText: 'text-muted-foreground', border: 'border-warning', iconText: 'text-warning' },
    'amber': { bg: 'bg-gold-soft', text: 'text-gold', labelText: 'text-muted-foreground', border: 'border-gold', iconText: 'text-gold' },
    'violet': { bg: 'bg-brand-soft', text: 'text-brand', labelText: 'text-muted-foreground', border: 'border-purple', iconText: 'text-brand' }
  };
  
  const style = tintStyles[tint];
  const displayValue = typeof value === 'number' ? value.toLocaleString() : value;
  
  return (
    <div className={cn(
      "rounded-2xl p-5 border shadow-sm",
      style.bg,
      style.border
    )}>
      <Icon className={cn("w-5 h-5 opacity-70 mb-3", style.iconText)} />
      <p className={cn("text-3xl font-bold mb-1", style.text)}>
        {displayValue}
      </p>
      <p className={cn("text-sm", style.labelText)}>{title}</p>
    </div>
  );
}

function HealthScoreCard({ label, score, owner }: { 
  label: string; 
  score: number; 
  owner: string; 
}) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return { stroke: 'var(--color-semantic-success)', text: 'text-success' };
    if (s >= 70) return { stroke: 'var(--color-semantic-success)', text: 'text-success' };
    if (s >= 60) return { stroke: 'var(--color-semantic-warning)', text: 'text-warning' };
    if (s >= 50) return { stroke: 'var(--color-semantic-warning)', text: 'text-warning' };
    if (s >= 40) return { stroke: 'var(--color-progress)', text: 'text-progress' };
    if (s >= 30) return { stroke: 'var(--color-semantic-danger)', text: 'text-danger' };
    return { stroke: 'var(--color-semantic-danger)', text: 'text-danger' };
  };
  
  const colors = getScoreColor(score);
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  return (
    <div className="bg-card rounded-xl p-4 border border-border shadow-sm flex items-center gap-4 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-secondary" />
      <div className="relative w-12 h-12 shrink-0">
        <svg className="w-12 h-12 -rotate-90" viewBox="0 0 40 40">
          <circle cx="20" cy="20" r="18" fill="none" stroke="var(--color-border)" strokeWidth="3" />
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
        <p className="text-sm font-semibold text-foreground truncate">{label}</p>
        <p className="text-xs text-muted-foreground">{owner}</p>
      </div>
    </div>
  );
}

function ActivityCard({ label, value, period }: { label: string; value: number; period: string }) {
  return (
    <div className="bg-card rounded-lg p-3 border border-border shadow-sm flex items-center justify-between">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="text-right">
        <span className="text-xl font-bold text-foreground">{value}</span>
        <span className="text-xs text-muted-foreground ml-1">{period}</span>
      </div>
    </div>
  );
}

function ActivitySection({ 
  blogsPublished, 
  pagesOptimized, 
  fixesApplied,
  onRunReport
}: { 
  blogsPublished: number; 
  pagesOptimized: number; 
  fixesApplied: number;
  onRunReport: () => void;
}) {
  const hasActivity = blogsPublished > 0 || pagesOptimized > 0 || fixesApplied > 0;

  if (!hasActivity) {
    return (
      <div>
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Activity</p>
        <EmptyStateInline
          icon={<Activity className="w-5 h-5" />}
          title="No recent activity yet"
          description="Run your first report to start tracking your SEO progress"
          ctaText="Run your first report"
          onCtaClick={onRunReport}
        />
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Activity</p>
      <div className="grid grid-cols-3 gap-3">
        <ActivityCard label="Blogs Published" value={blogsPublished} period="30d" />
        <ActivityCard label="Pages Optimized" value={pagesOptimized} period="30d" />
        <ActivityCard label="Fixes Applied" value={fixesApplied} period="30d" />
      </div>
    </div>
  );
}

function RankingMomentumSection({ improving, needsAttention }: { improving: RankingItem[]; needsAttention: RankingItem[] }) {
  return (
    <section className="space-y-4" data-testid="section-ranking-momentum">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">Ranking Momentum</h2>
        <span className="text-xs text-muted-foreground">7-day change</span>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="bg-card rounded-xl border border-border shadow-sm overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-success" />
          <CardHeader className="pb-3 border-b border-border ml-1">
            <CardTitle className="text-base flex items-center gap-2 text-foreground">
              <TrendingUp className="w-4 h-4 text-success" />
              Improving
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-4 ml-1">
            {improving.length === 0 ? (
              <p className="text-sm text-muted-foreground">No significant improvements this week</p>
            ) : (
              improving.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <span className="text-sm font-medium text-foreground truncate max-w-[200px]">{item.keyword}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-success">+{Math.abs(item.change)}</span>
                    <span className="text-sm text-muted-foreground w-8 text-right">#{item.position}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="bg-card rounded-xl border border-border shadow-sm overflow-hidden relative">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-danger" />
          <CardHeader className="pb-3 border-b border-border ml-1">
            <CardTitle className="text-base flex items-center gap-2 text-foreground">
              <TrendingDown className="w-4 h-4 text-danger" />
              Declined
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-4 ml-1">
            {needsAttention.length === 0 ? (
              <p className="text-sm text-muted-foreground">No significant declines this week</p>
            ) : (
              needsAttention.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <span className="text-sm font-medium text-foreground truncate max-w-[200px]">{item.keyword}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-danger">{item.change}</span>
                    <span className="text-sm text-muted-foreground w-8 text-right">#{item.position}</span>
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
      <h2 className="text-xl font-semibold text-foreground">What To Do Next</h2>
      
      <div className="space-y-4">
        {steps.map((step) => (
          <Card key={step.number} className={cn(
            "rounded-xl border overflow-hidden relative transition-all",
            step.status === "active" 
              ? "bg-card border-purple shadow-sm" 
              : "bg-card border-border shadow-sm"
          )}>
            {step.status === "active" && (
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand" />
            )}
            <CardContent className={cn("pt-5", step.status === "active" && "ml-1")}>
              <div className="flex items-start gap-4">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                  step.status === "active" 
                    ? "bg-brand text-white" 
                    : "bg-secondary text-muted-foreground/60"
                )}>
                  {step.number}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={cn(
                      "font-semibold",
                      step.status === "active" ? "text-foreground" : "text-foreground"
                    )}>{step.title}</h3>
                    {step.status === "locked" && (
                      <Badge variant="outline" className="text-xs bg-secondary text-muted-foreground border-border">
                        <Lock className="w-3 h-3 mr-1" />
                        Locked
                      </Badge>
                    )}
                  </div>
                  <p className={cn(
                    "text-sm mb-3",
                    step.status === "active" ? "text-muted-foreground" : "text-muted-foreground"
                  )}>{step.description}</p>
                  
                  <div className="mb-4">
                    <p className={cn(
                      "text-xs font-medium mb-2",
                      step.status === "active" ? "text-muted-foreground" : "text-muted-foreground"
                    )}>What this means:</p>
                    <ul className="space-y-1">
                      {step.actions.map((action, idx) => (
                        <li key={idx} className={cn(
                          "text-sm flex items-start gap-2",
                          step.status === "active" ? "text-muted-foreground" : "text-muted-foreground"
                        )}>
                          <span className="text-muted-foreground/60 mt-1">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="flex flex-col gap-1">
                    {step.status === "active" ? (
                      <Button size="sm" className="w-fit bg-brand hover:bg-primary/90 text-white shadow-sm hover:shadow-md transition-all">
                        Get Started
                      </Button>
                    ) : (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          disabled
                          className="w-fit bg-secondary text-muted-foreground border-border cursor-not-allowed hover:bg-secondary"
                        >
                          {step.unlockLabel}
                        </Button>
                        <span className="text-xs text-muted-foreground">Complete previous step to unlock</span>
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

function PagesToOptimizeSection({ pages, hasGsc, onConfigure }: { pages: PageToOptimize[]; hasGsc: boolean; onConfigure: () => void }) {
  return (
    <section className="space-y-4 relative" data-testid="section-pages-to-optimize">
      <h2 className="text-xl font-semibold text-foreground">Pages to Optimize</h2>
      
      <div className={cn("space-y-3 relative", !hasGsc && "min-h-[200px]")}>
        {!hasGsc && (
          <ConfigureOverlay
            integration="Search Console"
            onConfigure={onConfigure}
            className="rounded-xl"
          />
        )}
        {pages.length === 0 ? (
          <Card className={cn("bg-card rounded-xl border border-border shadow-sm", !hasGsc && "blur-sm")}>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Connect your Search Console to see optimization opportunities</p>
            </CardContent>
          </Card>
        ) : (
          pages.map((page, idx) => (
            <Card key={idx} className={cn("bg-card rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow", !hasGsc && "blur-sm")}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-foreground truncate">{page.title}</p>
                    <p className="text-xs text-muted-foreground/60 truncate">{page.url}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {page.keyword}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        #{page.position} · {page.volume.toLocaleString()} mo/search
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm text-brand font-medium">{page.action}</p>
                    <Button variant="ghost" size="sm" className="mt-1 gap-1 text-xs text-muted-foreground hover:text-foreground">
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
      <h2 className="text-xl font-semibold text-foreground">Top Performers</h2>
      
      <Card className="bg-card rounded-xl border border-border shadow-sm overflow-hidden relative">
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-success" />
        <CardHeader className="pb-0 border-b border-border ml-1">
          <p className="text-sm font-medium text-success py-2">Pages ranking in top 3</p>
        </CardHeader>
        <CardContent className="pt-4 ml-1">
          {performers.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No top-ranking pages detected yet</p>
          ) : (
            <>
              <div className="space-y-3">
                {performers.map((page, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground truncate">{page.title}</p>
                      <p className="text-xs text-muted-foreground">{page.keyword}</p>
                    </div>
                    <span className="text-sm font-bold text-success shrink-0">
                      #{page.position}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground mt-4">
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
    if (status === "active") return "bg-success-soft text-success border-success";
    if (tier === "core") return "bg-brand-soft text-brand border-purple";
    if (tier === "free") return "bg-info-soft text-info border-info";
    return "bg-secondary text-muted-foreground border-border";
  };

  const renderModuleCard = (mod: Module, isCore: boolean = false) => (
    <Card 
      key={mod.id} 
      className={cn(
        "rounded-xl border overflow-hidden relative transition-all",
        mod.status === "active" 
          ? "bg-card border-purple shadow-sm" 
          : "bg-card border-border shadow-sm"
      )}
    >
      {mod.status === "active" && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand" />
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
          mod.status === "active" ? "text-foreground" : "text-foreground"
        )}>
          <Search className={cn(
            "w-4 h-4",
            mod.status === "active" ? "text-brand" : "text-muted-foreground"
          )} />
          {mod.name}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn("space-y-3", mod.status === "active" && "ml-1")}>
        <p className={cn(
          "text-sm",
          mod.status === "active" ? "text-muted-foreground" : "text-muted-foreground"
        )}>{mod.description}</p>
        
        <div>
          <p className={cn(
            "text-xs font-medium mb-1",
            mod.status === "active" ? "text-muted-foreground" : "text-muted-foreground"
          )}>Includes:</p>
          <ul className="space-y-1">
            {mod.includes.map((item, idx) => (
              <li key={idx} className={cn(
                "text-xs flex items-center gap-1",
                mod.status === "active" ? "text-muted-foreground" : "text-muted-foreground"
              )}>
                <CheckCircle2 className={cn(
                  "w-3 h-3",
                  mod.status === "active" ? "text-success" : "text-muted-foreground/60"
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
              className="w-full bg-brand hover:bg-primary/90 text-white shadow-sm hover:shadow-md transition-all"
            >
              {mod.ctaLabel}
            </Button>
          ) : mod.status === "setup_required" ? (
            <>
              <Button 
                size="sm" 
                variant="outline"
                className="w-full text-brand border-purple hover:bg-brand-soft"
              >
                {mod.ctaLabel}
              </Button>
              <span className="text-xs text-muted-foreground text-center">Requires Google API connection</span>
            </>
          ) : (
            <>
              <Button 
                size="sm" 
                variant="outline"
                disabled
                className="w-full bg-secondary text-muted-foreground border-border cursor-not-allowed hover:bg-secondary"
              >
                {mod.ctaLabel}
              </Button>
              <span className="text-xs text-muted-foreground text-center">Upgrade plan to unlock</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <section className="space-y-6" data-testid="section-modules">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Your SEO Modules</h2>
        <p className="text-sm text-muted-foreground">Start with rankings. Add capabilities as you grow.</p>
      </div>
      
      {coreModule && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Core Module</p>
          <div className="max-w-md">
            {renderModuleCard(coreModule, true)}
          </div>
        </div>
      )}

      {addonModules.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Paid Add-ons</p>
          <div className="grid md:grid-cols-3 gap-4">
            {addonModules.map((mod) => renderModuleCard(mod))}
          </div>
        </div>
      )}

      {freeModules.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Free · Optional</p>
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
    <section className="space-y-4 pt-8 border-t border-border" data-testid="section-how-it-works">
      <h2 className="text-lg font-semibold text-foreground text-center">How This Works</h2>
      
      <div className="flex flex-wrap justify-center gap-4">
        {steps.map((step, idx) => (
          <div key={step.number} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-brand flex items-center justify-center text-xs font-bold text-white">
              {step.number}
            </div>
            <span className="text-sm text-foreground">{step.text}</span>
            {idx < steps.length - 1 && <ArrowRight className="w-4 h-4 text-muted-foreground/60 hidden sm:block" />}
          </div>
        ))}
      </div>
      
      <p className="text-center text-sm text-muted-foreground italic max-w-lg mx-auto">
        Rankings are the signal. Everything here exists to improve them.
      </p>
    </section>
  );
}

export default function Dashboard() {
  const { siteId, siteDomain, selectedSite } = useSiteContext();
  const [, navigate] = useLocation();
  
  const { data: dashboardData, isLoading } = useQuery<{
    siteId: string;
    domain: string;
    lastUpdated: string;
    summary: {
      totalKeywords: number;
      inTop3: number;
      inTop10: number;
      improved: number;
      declined: number;
    };
    costMetrics: {
      trafficAtRisk: number;
      clicksLost: number;
      leadsLost: string;
      revenueAtRisk: string;
    };
    improvingKeywords: RankingItem[];
    decliningKeywords: RankingItem[];
    pagesToOptimize: PageToOptimize[];
    topPerformers: TopPerformer[];
    competitors: { domain: string; keywordsRanking: number }[];
    hasRealData: boolean;
  }>({
    queryKey: ["/api/dashboard", siteId],
    enabled: !!siteId,
  });

  const integrations = selectedSite?.integrations || {};
  const hasGa4 = !!integrations.ga4?.property_id;
  const hasGsc = !!integrations.gsc?.property;
  const hasCrawler = integrations.crawler?.enabled ?? false;

  // Use real data from API, with fallbacks for empty states
  const improvingKeywords: RankingItem[] = dashboardData?.improvingKeywords || [];
  const decliningKeywords: RankingItem[] = dashboardData?.decliningKeywords || [];
  const pagesToOptimize: PageToOptimize[] = dashboardData?.pagesToOptimize || [];
  const topPerformers: TopPerformer[] = dashboardData?.topPerformers || [];
  const costMetrics = dashboardData?.costMetrics || { trafficAtRisk: 0, clicksLost: 0, leadsLost: "0", revenueAtRisk: "$0" };
  const summary = dashboardData?.summary || { totalKeywords: 0, inTop3: 0, inTop10: 0, improved: 0, declined: 0 };
  const hasRealData = dashboardData?.hasRealData || false;

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
          <PageHeader
            title="SEO Performance Overview"
            highlight="SEO"
            badgeText="Weekly Report"
            subtitle="Updated weekly · Rankings are the north star"
            rightSlot={<SiteSelector />}
          />

          {/* Geographic Scope Warning */}
          {selectedSite && !selectedSite.geoScope && (
            <Banner
              tone="warning"
              title="Geographic Scope Required"
              description="Configure your target location to enable SERP analysis and rankings tracking."
              actionLabel="Configure"
              onAction={() => navigate(`/sites/${selectedSite.id}`)}
            />
          )}
          
          <div className="space-y-6">
            <div className="relative">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Cost of Inaction</p>
              <div className={cn(
                "grid grid-cols-2 md:grid-cols-4 gap-4 rounded-xl",
                !hasGa4 && "blur-sm pointer-events-none"
              )}>
                <CostMetricCard 
                  title="Traffic at risk/mo" 
                  value={costMetrics.trafficAtRisk} 
                  tint="red"
                  icon={Eye}
                  isEstimate
                />
                <CostMetricCard 
                  title="Clicks lost/mo" 
                  value={costMetrics.clicksLost} 
                  tint="amber"
                  icon={Sun}
                  isEstimate
                />
                <CostMetricCard 
                  title="Leads missed/mo" 
                  value={costMetrics.leadsLost} 
                  tint="orange"
                  icon={Users}
                  isEstimate
                />
                <CostMetricCard 
                  title="Page-one opportunities" 
                  value={summary.inTop10 || 0} 
                  tint="violet"
                  icon={Target}
                />
              </div>
              {!hasGa4 && (
                <ConfigureOverlay
                  integration="GA4"
                  onConfigure={() => navigate(ROUTES.INTEGRATIONS)}
                  className="rounded-xl"
                />
              )}
              <p className="text-xs text-muted-foreground/60 mt-2">Estimates use industry CTR by rank, a capture factor (0.65), and a lead rate (2.5%).</p>
            </div>
            
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Current Performance</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <DataCard 
                  title="Authority" 
                  value={42} 
                  status="locked"
                  statusLabel="Locked"
                  description="Domain strength" 
                  ctaText="Subscribe"
                  tint="amber"
                  onClick={() => navigate(ROUTES.AGENTS)}
                />
                <DataCard 
                  title="Keywords" 
                  value={hasRealData ? summary.totalKeywords : "—"} 
                  status={hasRealData ? "active" : "setup_required"}
                  statusLabel={hasRealData ? undefined : "No data"}
                  delta={hasRealData && summary.improved > 0 ? `+${summary.improved}` : undefined}
                  deltaType={hasRealData && summary.improved > 0 ? "positive" : undefined}
                  description={hasRealData ? "Total tracked" : "Waiting for SERP data"} 
                  ctaText={hasRealData ? undefined : "Run Scan"}
                  tint="purple"
                  onClick={() => navigate(ROUTES.RUNS)}
                />
                <DataCard 
                  title="Top 10" 
                  value={hasRealData ? summary.inTop10 : "—"} 
                  status={hasRealData ? "active" : "setup_required"}
                  statusLabel={hasRealData ? undefined : "No data"}
                  delta={hasRealData && summary.improved > 0 ? `+${summary.improved}` : undefined}
                  deltaType={hasRealData && summary.improved > 0 ? "positive" : undefined}
                  description={hasRealData ? "Ranking positions" : "Waiting for SERP data"} 
                  ctaText={hasRealData ? undefined : "Run Scan"}
                  tint="blue"
                  onClick={() => navigate(ROUTES.RUNS)}
                />
                <DataCard 
                  title="Top 3" 
                  value={hasRealData ? summary.inTop3 : "—"} 
                  status={hasRealData ? "active" : "setup_required"}
                  statusLabel={hasRealData ? undefined : "No data"}
                  description={hasRealData ? "Premium positions" : "Waiting for SERP data"} 
                  ctaText={hasRealData ? undefined : "Run Scan"}
                  tint="red"
                  onClick={() => navigate(ROUTES.RUNS)}
                />
              </div>
            </div>
            
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">Health Scores</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <HealthScoreCard label="Domain Authority" score={42} owner="Backlinks Agent" />
                <HealthScoreCard label="Technical SEO" score={78} owner="Technical Agent" />
                <HealthScoreCard label="Content Coverage" score={61} owner="Competitive Intel" />
                <HealthScoreCard label="AI Readiness" score={85} owner="Atlas Agent" />
              </div>
            </div>
            
            <ActivitySection
              blogsPublished={4}
              pagesOptimized={12}
              fixesApplied={23}
              onRunReport={() => navigate(ROUTES.RUNS)}
            />
          </div>
        </header>

        <RankingMomentumSection 
          improving={improvingKeywords} 
          needsAttention={decliningKeywords} 
        />

        <WhatToDoNextSection />

        <PagesToOptimizeSection pages={pagesToOptimize} hasGsc={hasGsc} onConfigure={() => navigate(ROUTES.INTEGRATIONS)} />

        <TopPerformersSection performers={topPerformers} />

        <ModulesSection modules={mockModules} />

        <HowItWorksSection />
      </div>
    </DashboardLayout>
  );
}
