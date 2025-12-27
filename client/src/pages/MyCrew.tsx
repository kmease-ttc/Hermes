import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { USER_FACING_AGENTS, getCrewMember, type CrewMember } from "@/config/agents";
import { Check, Zap, Lock, Sparkles, TrendingUp, Shield, Eye, FileText, Activity, Plus, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShipCanvasA1 } from "@/components/crew/ShipCanvasA1";

const CREW_ROLES = USER_FACING_AGENTS;

const SET_BONUSES = [
  {
    id: "revenue_attribution",
    title: "Revenue Attribution",
    valueProp: "Connect SEO work to traffic and conversions so you know what's actually paying off.",
    requirements: ["google_data_connector", "serp_intel", "competitive_snapshot"],
    icon: TrendingUp,
  },
  {
    id: "automated_execution",
    title: "Automated SEO Execution",
    valueProp: "Automatically generate tasks, PRs, and content updates without manual work.",
    requirements: ["crawl_render", "content_generator"],
    icon: Zap,
    comingSoon: true,
  },
];

const CAPABILITY_GROUPS = [
  {
    id: "visibility",
    title: "Visibility Intelligence",
    icon: Eye,
    requirements: ["serp_intel", "competitive_snapshot"],
    capabilities: ["Keyword tracking", "Rank change explanations", "Technical SEO scoring accuracy", "Conversion-weighted fixes"],
  },
  {
    id: "technical",
    title: "Technical Intelligence",
    icon: Shield,
    requirements: ["crawl_render", "core_web_vitals"],
    capabilities: ["Crawl diagnostics", "Core Web Vitals tracking", "Index health monitoring"],
  },
  {
    id: "content",
    title: "Content Health",
    icon: FileText,
    requirements: ["content_decay", "content_generator"],
    capabilities: ["Decay detection", "Refresh priorities", "Content strategy"],
  },
  {
    id: "analytics",
    title: "Analytics & Signals",
    icon: Activity,
    requirements: ["google_data_connector", "google_ads_connector"],
    capabilities: ["Traffic trends", "Conversion tracking", "Ad performance"],
  },
];

interface CrewStateResponse {
  siteId: string;
  enabledAgents: string[];
  agentStatus: Record<string, { health: string; needsConfig: boolean; lastRun: string | null }>;
  totalEnabled: number;
}

function ProgressRing({ percent, size = 80, strokeWidth = 8 }: { percent: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-slate-700"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="text-amber-400 transition-all duration-500"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-white">{percent}%</span>
      </div>
    </div>
  );
}

function MaturityBadge({ percent }: { percent: number }) {
  let tier = "Bronze";
  let color = "bg-amber-700 text-amber-100";
  
  if (percent >= 80) {
    tier = "Best-in-Class";
    color = "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900";
  } else if (percent >= 60) {
    tier = "Gold";
    color = "bg-amber-500 text-slate-900";
  } else if (percent >= 40) {
    tier = "Silver";
    color = "bg-slate-400 text-slate-900";
  }
  
  return (
    <Badge className={cn("text-xs px-3 py-1", color)}>
      {tier}
    </Badge>
  );
}


function getContextLine(percent: number): string {
  if (percent >= 80) return "Your crew is fully operational with best-in-class coverage.";
  if (percent >= 60) return "Strong foundation with most key insights unlocked.";
  if (percent >= 40) return "Growing visibility — key capabilities coming online.";
  if (percent >= 20) return "Basic monitoring active, but limited visibility into performance.";
  return "Foundation in place. Add crew to unlock deeper insights.";
}

function getNextBestUpgrade(enabledAgents: string[]): typeof SET_BONUSES[0] | null {
  for (const bonus of SET_BONUSES) {
    const missing = bonus.requirements.filter(r => !enabledAgents.includes(r));
    if (missing.length > 0 && missing.length <= bonus.requirements.length) {
      return bonus;
    }
  }
  return null;
}

function StatusCard({ 
  enabledCount, 
  totalRoles, 
  enabledAgents = [],
  onAddRequiredCrew
}: { 
  enabledCount: number;
  totalRoles: number;
  enabledAgents: string[];
  onAddRequiredCrew: (agentIds: string[]) => void;
}) {
  const percent = Math.round((enabledCount / totalRoles) * 100);
  const agents = enabledAgents || [];
  
  const nextUpgrade = getNextBestUpgrade(agents);
  const missingAgents = nextUpgrade 
    ? nextUpgrade.requirements.filter(r => !agents.includes(r))
    : [];
  
  return (
    <Card className="bg-slate-900/80 border-slate-700 text-white" data-testid="status-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-white flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          Mission Status
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-5">
        {/* Current State */}
        <div className="flex items-center gap-4">
          <ProgressRing percent={percent} />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <MaturityBadge percent={percent} />
            </div>
            <p className="text-lg font-semibold text-white">{percent}% Operational</p>
            <p className="text-sm text-slate-400">{enabledCount} / {totalRoles} roles staffed</p>
          </div>
        </div>
        
        {/* Context Line */}
        <p className="text-sm text-slate-400 border-l-2 border-slate-600 pl-3">
          {getContextLine(percent)}
        </p>
        
        {/* Next Best Upgrade */}
        {nextUpgrade && missingAgents.length > 0 && (
          <div className="pt-3 border-t border-slate-700/50">
            <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Next Best Upgrade</p>
            <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-700">
              <p className="text-sm font-medium text-amber-300 mb-1 flex items-center gap-1.5">
                <nextUpgrade.icon className="w-4 h-4" />
                {nextUpgrade.title}
              </p>
              <p className="text-xs text-slate-400 mb-3">
                {nextUpgrade.valueProp}
              </p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {missingAgents.map(id => {
                  const crew = getCrewMember(id);
                  return (
                    <span 
                      key={id}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-700/80 text-xs text-slate-300"
                    >
                      {crew.avatar && (
                        <img src={crew.avatar} alt="" className="w-4 h-4 object-contain opacity-60" />
                      )}
                      {crew.nickname}
                    </span>
                  );
                })}
              </div>
              <Button 
                size="sm"
                className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-medium"
                onClick={() => onAddRequiredCrew(missingAgents)}
                data-testid="btn-add-required-crew"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add required crew
              </Button>
            </div>
          </div>
        )}
        
        {/* All bonuses unlocked */}
        {!nextUpgrade && (
          <div className="pt-3 border-t border-slate-700/50">
            <div className="p-3 rounded-lg bg-green-900/30 border border-green-700/50 text-center">
              <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-1" />
              <p className="text-sm font-medium text-green-300">All set bonuses unlocked!</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getSetBonusContributions(agentId: string): string[] {
  return SET_BONUSES
    .filter(bonus => bonus.requirements.includes(agentId))
    .map(bonus => bonus.title);
}

function CrewModal({ 
  agentId, 
  open, 
  onOpenChange,
  isEnabled,
  isSelected,
  onSelect,
  onEnable,
  onDisable
}: { 
  agentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEnabled: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onEnable: () => void;
  onDisable: () => void;
}) {
  if (!agentId) return null;
  
  const crew = getCrewMember(agentId);
  const bonusContributions = getSetBonusContributions(agentId);
  const statusLabel = isEnabled ? "Active" : isSelected ? "Selected" : "Available";
  const statusColor = isEnabled ? "bg-green-600 text-white" : isSelected ? "bg-sky-600 text-white" : "bg-slate-600 text-slate-200";
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-[560px] max-h-[85vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b border-slate-700">
          <div className="flex items-center gap-4">
            {crew.avatar ? (
              <img src={crew.avatar} alt={crew.nickname} className="w-20 h-20 object-contain" />
            ) : (
              <div 
                className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold"
                style={{ backgroundColor: crew.color }}
              >
                {crew.nickname.slice(0, 2)}
              </div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <DialogTitle className="text-xl" style={{ color: crew.color }}>
                  {crew.nickname}
                </DialogTitle>
                <Badge className={cn("text-xs", statusColor)}>
                  {statusLabel}
                </Badge>
              </div>
              <DialogDescription className="text-slate-400 text-base">
                {crew.role}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <div className="py-4 space-y-5">
          {/* What this does */}
          {crew.tooltipInfo && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2 font-medium">What this does</p>
              <p className="text-sm text-slate-300 mb-3">{crew.tooltipInfo.whatItDoes}</p>
              <ul className="space-y-2">
                {crew.tooltipInfo.outputs.map((output, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                    <Check className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    {output}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Unlocks section */}
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wide mb-2 font-medium">Unlocks</p>
            
            {crew.capabilities && crew.capabilities.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-slate-500 mb-1.5">Capabilities:</p>
                <div className="flex flex-wrap gap-1.5">
                  {crew.capabilities.map((cap, i) => (
                    <Badge key={i} variant="outline" className="border-slate-600 text-slate-300 text-xs">
                      {cap}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {bonusContributions.length > 0 && (
              <div>
                <p className="text-xs text-slate-500 mb-1.5">Contributes to set bonuses:</p>
                <div className="flex flex-wrap gap-1.5">
                  {bonusContributions.map((bonus, i) => (
                    <Badge key={i} className="bg-amber-500/20 text-amber-300 border-0 text-xs">
                      <Zap className="w-3 h-3 mr-1" />
                      {bonus}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Requirements section */}
          {crew.dependencies && crew.dependencies.filter(d => d !== "orchestrator").length > 0 && (
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide mb-2 font-medium">Requirements</p>
              <div className="flex flex-wrap gap-1.5">
                {crew.dependencies.filter(d => d !== "orchestrator").map((dep, i) => {
                  const depCrew = getCrewMember(dep);
                  return (
                    <Badge key={i} variant="outline" className="border-slate-600 text-slate-300 text-xs">
                      {depCrew.nickname}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        
        <DialogFooter className="pt-4 border-t border-slate-700 flex-row gap-3 sm:justify-between">
          <Button 
            variant="outline" 
            className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          
          {isEnabled ? (
            <Button 
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold"
              onClick={onDisable}
              data-testid="button-disable"
            >
              Disable
            </Button>
          ) : (
            <div className="flex gap-2 flex-1">
              <Button 
                variant="outline" 
                className={cn(
                  "flex-1",
                  isSelected 
                    ? "border-slate-500 text-slate-400 hover:bg-slate-800" 
                    : "border-sky-500 text-sky-400 hover:bg-sky-950"
                )}
                onClick={onSelect}
                data-testid="button-select-preview"
              >
                {isSelected ? "Deselect" : "Select"}
              </Button>
              <Button 
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold"
                onClick={onEnable}
                data-testid="button-enable"
              >
                Enable
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CapabilityCard({ 
  group, 
  enabledAgents 
}: { 
  group: typeof CAPABILITY_GROUPS[0];
  enabledAgents: string[];
}) {
  const enabledCount = group.requirements.filter(r => enabledAgents.includes(r)).length;
  const status = enabledCount === group.requirements.length ? "active" : enabledCount > 0 ? "partial" : "locked";
  const Icon = group.icon;
  
  return (
    <div className={cn(
      "p-4 rounded-xl border transition-all",
      status === "active" ? "bg-slate-800/80 border-amber-500/50" :
      status === "partial" ? "bg-slate-800/50 border-slate-600" :
      "bg-slate-900/50 border-slate-700 opacity-60"
    )}>
      <div className="flex items-center gap-3 mb-3">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center",
          status === "active" ? "bg-amber-500/20 text-amber-400" :
          status === "partial" ? "bg-slate-700 text-slate-400" :
          "bg-slate-800 text-slate-500"
        )}>
          <Icon className="w-4 h-4" />
        </div>
        <div>
          <h4 className="font-semibold text-white text-sm">{group.title}</h4>
          <Badge variant="outline" className={cn(
            "text-[10px] mt-1",
            status === "active" ? "border-green-500 text-green-400" :
            status === "partial" ? "border-amber-500 text-amber-400" :
            "border-slate-600 text-slate-500"
          )}>
            {status === "active" ? "Active" : status === "partial" ? "Partial" : "Locked"}
          </Badge>
        </div>
      </div>
      <ul className="space-y-1.5">
        {group.capabilities.map((cap, i) => (
          <li key={i} className="flex items-center gap-2 text-xs text-slate-400">
            <Check className={cn(
              "w-3 h-3",
              status === "active" ? "text-green-400" :
              status === "partial" ? "text-amber-400" :
              "text-slate-600"
            )} />
            {cap}
          </li>
        ))}
      </ul>
    </div>
  );
}

function SetBonusCard({ 
  bonus, 
  enabledAgents,
  selectedAgents = [],
  onRequirementClick,
  onSelectAgent
}: { 
  bonus: typeof SET_BONUSES[0];
  enabledAgents: string[];
  selectedAgents?: string[];
  onRequirementClick: (agentId: string) => void;
  onSelectAgent: (agentId: string) => void;
}) {
  const enabledCount = bonus.requirements.filter(r => enabledAgents.includes(r)).length;
  const previewCount = bonus.requirements.filter(r => enabledAgents.includes(r) || selectedAgents.includes(r)).length;
  const isActive = enabledCount === bonus.requirements.length;
  const Icon = bonus.icon;
  
  const missingAgents = bonus.requirements.filter(r => !enabledAgents.includes(r) && !selectedAgents.includes(r));
  const nextToUnlock = missingAgents.length > 0 ? missingAgents[0] : null;
  const nextCrew = nextToUnlock ? getCrewMember(nextToUnlock) : null;
  
  const progressDisplay = previewCount > enabledCount 
    ? `${previewCount} / ${bonus.requirements.length}` 
    : `${enabledCount} / ${bonus.requirements.length}`;
  const isPreview = previewCount > enabledCount;
  
  return (
    <div className={cn(
      "p-4 rounded-xl border transition-all",
      bonus.comingSoon ? "bg-slate-900/30 border-slate-800 opacity-50" :
      isActive ? "bg-gradient-to-br from-amber-900/30 to-slate-900 border-amber-500/50" :
      "bg-slate-900/50 border-slate-700"
    )}>
      <div className="flex items-start gap-3 mb-3">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
          bonus.comingSoon ? "bg-slate-800 text-slate-600" :
          isActive ? "bg-amber-500/20 text-amber-400" :
          "bg-slate-800 text-slate-500"
        )}>
          {bonus.comingSoon ? <Lock className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-semibold text-white text-sm">{bonus.title}</h4>
            {isActive && (
              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
                <Check className="w-3 h-3 mr-1" /> Active
              </Badge>
            )}
            {bonus.comingSoon && (
              <Badge variant="outline" className="text-[10px] border-slate-700 text-slate-500">
                Coming Soon
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">{bonus.valueProp}</p>
        </div>
      </div>
      
      {!bonus.comingSoon && !isActive && (
        <>
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className={cn(
                "text-xs font-medium",
                isPreview ? "text-sky-400" : "text-slate-400"
              )}>
                Progress: {progressDisplay} systems online
              </span>
            </div>
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all",
                  isPreview ? "bg-sky-500" : "bg-amber-500"
                )}
                style={{ width: `${(previewCount / bonus.requirements.length) * 100}%` }}
              />
            </div>
          </div>
          
          {nextCrew && (
            <div className="bg-slate-800/50 rounded-lg p-3 mb-3">
              <p className="text-xs text-slate-400 mb-2">Next to unlock:</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{nextCrew.avatar}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{nextCrew.nickname}</p>
                    <p className="text-xs text-slate-500">{nextCrew.signalType}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-sky-500 text-sky-400 hover:bg-sky-950 text-xs h-7"
                  onClick={() => onSelectAgent(nextToUnlock!)}
                  data-testid={`select-next-${nextToUnlock}`}
                >
                  Select {nextCrew.nickname}
                </Button>
              </div>
            </div>
          )}
          
          {missingAgents.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {missingAgents.slice(1).map((agentId) => {
                const crew = getCrewMember(agentId);
                return (
                  <button
                    key={agentId}
                    onClick={() => onRequirementClick(agentId)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-700 text-xs transition-colors"
                    data-testid={`missing-chip-${agentId}`}
                  >
                    <span className="text-sm">{crew.avatar}</span>
                    {crew.nickname}
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
      
      {isActive && (
        <div className="flex items-center gap-2 text-xs text-amber-400">
          <Check className="w-4 h-4" />
          <span>All {bonus.requirements.length} crew members active</span>
        </div>
      )}
    </div>
  );
}

export default function MyCrew() {
  const queryClient = useQueryClient();
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [drawerAgentId, setDrawerAgentId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data: crewState } = useQuery<CrewStateResponse>({
    queryKey: ["/api/crew/state"],
    queryFn: async () => {
      const res = await fetch("/api/crew/state?siteId=default");
      if (!res.ok) throw new Error("Failed to fetch crew state");
      return res.json();
    },
  });

  const enableMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const res = await fetch("/api/crew/enable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, siteId: "default" }),
      });
      if (!res.ok) throw new Error("Failed to enable agent");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crew/state"] });
      setDrawerOpen(false);
    },
  });

  const disableMutation = useMutation({
    mutationFn: async (agentId: string) => {
      const res = await fetch("/api/crew/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, siteId: "default" }),
      });
      if (!res.ok) throw new Error("Failed to disable agent");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/crew/state"] });
      setDrawerOpen(false);
    },
  });

  const enabledAgents = crewState?.enabledAgents || [];
  const totalRoles = CREW_ROLES.length;

  const handleSlotClick = (agentId: string) => {
    setDrawerAgentId(agentId);
    setDrawerOpen(true);
  };

  const handleSelect = () => {
    if (!drawerAgentId) return;
    setSelectedAgents(prev => 
      prev.includes(drawerAgentId) 
        ? prev.filter(id => id !== drawerAgentId)
        : [...prev, drawerAgentId]
    );
  };

  const handleSelectAgent = (agentId: string) => {
    if (!enabledAgents.includes(agentId) && !selectedAgents.includes(agentId)) {
      setSelectedAgents(prev => [...prev, agentId]);
    }
  };

  const handleAddRequiredCrew = (agentIds: string[]) => {
    setSelectedAgents(prev => {
      const newSet = new Set([...prev, ...agentIds]);
      return Array.from(newSet);
    });
    if (agentIds.length > 0) {
      setDrawerAgentId(agentIds[0]);
      setDrawerOpen(true);
    }
  };

  return (
    <DashboardLayout>
      <div className="min-h-screen w-full bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 -m-6">
        <div className="mx-auto w-full max-w-[1400px] px-6 pt-6">
          <h1 className="text-2xl font-semibold text-white/90">My Crew</h1>
          <p className="mt-1 text-sm text-white/60">
            Staff AI specialists to unlock deeper insights.
          </p>
        </div>

        <section className="mx-auto w-full max-w-[1400px] px-6 pt-6">
          <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
            <div className="min-w-0">
              <StatusCard 
                enabledCount={enabledAgents.length}
                totalRoles={totalRoles}
                enabledAgents={enabledAgents}
                onAddRequiredCrew={handleAddRequiredCrew}
              />
            </div>

            <div className="min-w-0">
              <div className="relative w-full min-h-[720px] lg:h-[calc(100vh-180px)] max-h-[980px] overflow-hidden">
                <ShipCanvasA1 
                  enabledAgents={enabledAgents}
                  selectedAgents={selectedAgents}
                  onSlotClick={handleSlotClick}
                  tileSize={140}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-[1400px] px-6 pb-16 pt-10">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="bg-slate-900/60 border-slate-700">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-progress" />
                  <CardTitle className="text-white text-lg">Active Capabilities</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                {CAPABILITY_GROUPS.map(group => (
                  <CapabilityCard key={group.id} group={group} enabledAgents={enabledAgents} />
                ))}
              </CardContent>
            </Card>

            <Card className="bg-slate-900/60 border-slate-700">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-progress" />
                  <CardTitle className="text-white text-lg">Set Bonuses</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {SET_BONUSES.map(bonus => (
                  <SetBonusCard 
                    key={bonus.id} 
                    bonus={bonus} 
                    enabledAgents={enabledAgents}
                    selectedAgents={selectedAgents}
                    onRequirementClick={handleSlotClick}
                    onSelectAgent={handleSelectAgent}
                  />
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        <CrewModal
          agentId={drawerAgentId}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          isEnabled={drawerAgentId ? enabledAgents.includes(drawerAgentId) : false}
          isSelected={drawerAgentId ? selectedAgents.includes(drawerAgentId) : false}
          onSelect={handleSelect}
          onEnable={() => drawerAgentId && enableMutation.mutate(drawerAgentId)}
          onDisable={() => drawerAgentId && disableMutation.mutate(drawerAgentId)}
        />
      </div>
    </DashboardLayout>
  );
}
