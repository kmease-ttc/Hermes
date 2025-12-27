import React from "react";
import { ShipHullSvg } from "./ShipHullSvg";
import { getCrewMember } from "@/config/agents";
import { getRoleTooltip } from "@/config/roleTooltips";
import { getCrewTooltip } from "@/config/crewTooltips";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Eye, Target, BarChart3, Wrench, Zap, Search, PenTool, Link2, Megaphone, Compass, BrainCircuit, BookOpen } from "lucide-react";

type RoleSlot = {
  roleId: string;
  roleName: string;
  roleIcon: React.ElementType;
  crewId: string | null;
  xPct: number;
  yPct: number;
};

const ROLE_SLOTS: RoleSlot[] = [
  { roleId: "mission_control", roleName: "Mission Control", roleIcon: Compass, crewId: "orchestrator", xPct: 50, yPct: 8 },
  { roleId: "competitive_intel", roleName: "Competitive Intel", roleIcon: Eye, crewId: "competitive_snapshot", xPct: 17, yPct: 28 },
  { roleId: "serp_tracking", roleName: "SERP Tracking", roleIcon: Target, crewId: "serp_intel", xPct: 50, yPct: 28 },
  { roleId: "analytics_signals", roleName: "Analytics", roleIcon: BarChart3, crewId: "google_data_connector", xPct: 83, yPct: 28 },
  { roleId: "technical_seo", roleName: "Technical SEO", roleIcon: Wrench, crewId: "crawl_render", xPct: 28, yPct: 48 },
  { roleId: "performance_monitoring", roleName: "Performance", roleIcon: Zap, crewId: "core_web_vitals", xPct: 72, yPct: 48 },
  { roleId: "content_decay", roleName: "Content Decay", roleIcon: Search, crewId: "content_decay", xPct: 28, yPct: 68 },
  { roleId: "content_strategy", roleName: "Content", roleIcon: PenTool, crewId: "content_generator", xPct: 72, yPct: 68 },
  { roleId: "domain_authority", roleName: "Authority", roleIcon: Link2, crewId: "backlink_authority", xPct: 14, yPct: 88 },
  { roleId: "ai_optimization", roleName: "AI", roleIcon: BrainCircuit, crewId: "ai_optimization", xPct: 38, yPct: 88 },
  { roleId: "paid_ads", roleName: "Ads", roleIcon: Megaphone, crewId: "google_ads_connector", xPct: 62, yPct: 88 },
  { roleId: "knowledge_base", roleName: "Knowledge", roleIcon: BookOpen, crewId: "seo_kbase", xPct: 86, yPct: 88 },
];

function RoleInfoTooltip({ roleId }: { roleId: string }) {
  const roleTooltip = getRoleTooltip(roleId);
  if (!roleTooltip) return null;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <div
          className="rounded-full p-0.5 cursor-help transition-all opacity-50 hover:opacity-90 hover:bg-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="w-3 h-3 text-white/70" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] bg-[#1a1a2e] border border-white/10 rounded-lg p-2.5 shadow-xl z-50">
        <div className="space-y-1">
          <div className="text-[10px] font-semibold text-white/90">{roleTooltip.title}</div>
          <div className="text-[9px] text-white/60 leading-relaxed">{roleTooltip.description}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function CrewAvatarTooltip({ crewId, children }: { crewId: string; children: React.ReactNode }) {
  const crewTooltip = getCrewTooltip(crewId);
  if (!crewTooltip) return <>{children}</>;

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>
        <div className="cursor-pointer flex items-center justify-center">{children}</div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] bg-[#1a1a2e] border border-white/10 rounded-lg p-2.5 shadow-xl z-50">
        <div className="space-y-1">
          <div className="text-[10px] font-semibold text-white/90">
            {crewTooltip.name} <span className="font-normal text-white/50">— {crewTooltip.role}</span>
          </div>
          <div className="text-[9px] text-white/60 leading-relaxed">{crewTooltip.shortDescription}</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function ShipCanvasA1(props: {
  enabledAgents: string[];
  selectedAgents: string[];
  onSlotClick: (id: string) => void;
}) {
  const { enabledAgents, selectedAgents, onSlotClick } = props;

  return (
    <TooltipProvider>
      <div className="relative w-full h-full rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent overflow-hidden">
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse 80% 50% at 50% 30%, rgba(245,158,11,0.06) 0%, transparent 60%)" }}
        />
        
        <div className="relative w-full h-full flex items-center justify-center p-4 md:p-6">
          <div className="relative w-full max-w-[1100px] h-full min-h-[980px]">
            <ShipHullSvg className="absolute inset-0 w-full h-full" />

            <div className="pointer-events-none absolute inset-0">
              <svg viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid meet" className="h-full w-full">
                <defs>
                  <mask id="outsideMask">
                    <rect x="0" y="0" width="1000" height="560" fill="white" />
                    <path d="M110,80 C180,30 300,10 500,10 C700,10 820,30 890,80 C945,120 980,175 980,280 C980,385 945,440 890,480 C820,530 700,550 500,550 C300,550 180,530 110,480 C55,440 20,385 20,280 C20,175 55,120 110,80 Z" fill="black" />
                  </mask>
                </defs>
                <rect x="0" y="0" width="1000" height="560" fill="rgba(0,0,0,0.50)" mask="url(#outsideMask)" />
              </svg>
            </div>

            <div className="absolute inset-0">
              {ROLE_SLOTS.map((slot) => {
                const crew = slot.crewId ? getCrewMember(slot.crewId) : null;
                const isMissionControl = slot.roleId === "mission_control";
                const isEnabled = slot.crewId && (enabledAgents.includes(slot.crewId) || isMissionControl);
                const isSelected = slot.crewId && selectedAgents.includes(slot.crewId);
                const isEmpty = !isEnabled && !isSelected;
                const RoleIcon = slot.roleIcon;

                const badge = isMissionControl ? "Included" : isEnabled ? "Active" : isSelected ? "Selected" : null;
                const scale = isMissionControl ? 1.12 : 1;

                const ringClass = isEnabled
                  ? "ring-2 shadow-[0_0_0_2px_var(--color-progress-soft),0_12px_32px_rgba(0,0,0,0.4)]"
                  : isSelected
                    ? "ring-2 shadow-[0_0_0_2px_var(--color-primary-soft),0_12px_32px_rgba(0,0,0,0.3)]"
                    : "";

                const ringColor = isEnabled ? "var(--color-progress)" : isSelected ? "var(--color-primary)" : undefined;
                const badgeClass = isMissionControl || isEnabled ? "bg-progress-soft text-white/90" : isSelected ? "bg-[rgba(124,58,237,0.18)] text-white/90" : "";

                return (
                  <button
                    key={slot.roleId}
                    className="absolute transition-all duration-200 hover:scale-105 group"
                    style={{
                      left: `${slot.xPct}%`,
                      top: `${slot.yPct}%`,
                      transform: `translate(-50%, -50%) scale(${scale})`,
                      width: "clamp(180px, 18vw, 240px)",
                      height: "clamp(180px, 18vw, 240px)",
                    }}
                    onClick={() => slot.crewId && onSlotClick(slot.crewId)}
                    data-testid={`ship-slot-${slot.roleId}`}
                  >
                    <div
                      className={[
                        "relative h-full w-full rounded-xl",
                        isEmpty 
                          ? "border-2 border-dashed border-white/20 bg-white/[0.02] group-hover:border-white/35 group-hover:bg-white/[0.04]" 
                          : "bg-white/[0.06] backdrop-blur-sm border border-white/20 group-hover:bg-white/[0.08]",
                        ringClass,
                      ].join(" ")}
                      style={{ "--tw-ring-color": ringColor } as React.CSSProperties}
                    >
                      <div className="absolute left-2 top-2 z-10">
                        <RoleInfoTooltip roleId={slot.roleId} />
                      </div>

                      {badge && (
                        <div className={`absolute right-2 top-2 z-10 rounded-full px-1.5 py-0.5 text-[8px] font-medium whitespace-nowrap ${badgeClass}`}>
                          {badge}
                        </div>
                      )}

                      <div className="absolute inset-0 flex flex-col items-center justify-center px-2 pt-6 pb-2">
                        <div className="flex-1 flex items-center justify-center">
                          {isEmpty ? (
                            <RoleIcon className="w-[55%] h-[55%] max-w-[80px] max-h-[80px] text-white/20 group-hover:text-white/35 transition-colors" />
                          ) : slot.crewId && (
                            <CrewAvatarTooltip crewId={slot.crewId}>
                              {crew?.avatar && typeof crew.avatar === 'string' && crew.avatar.includes('/') ? (
                                <img 
                                  src={crew.avatar} 
                                  alt={crew.nickname || slot.roleName}
                                  className="w-[85%] h-[85%] max-w-[150px] max-h-[150px] object-contain drop-shadow-lg"
                                />
                              ) : (
                                <span className="text-6xl drop-shadow-lg">{crew?.avatar || "👤"}</span>
                              )}
                            </CrewAvatarTooltip>
                          )}
                        </div>

                        <div className={`mt-1 text-lg font-semibold leading-tight text-center truncate w-full ${isEmpty ? "text-white/30" : "text-white/90"}`}>
                          {isEmpty ? slot.roleName : (crew?.nickname || "Unknown")}
                        </div>
                        {isEmpty && (
                          <div className="text-[9px] text-white/20 mt-0.5">Empty slot</div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
