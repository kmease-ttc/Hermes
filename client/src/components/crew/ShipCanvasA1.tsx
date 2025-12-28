import React from "react";
import { ShipHullSvg } from "./ShipHullSvg";
import { getCrewMember } from "@/config/agents";
import { getRoleTooltip } from "@/config/roleTooltips";
import { getCrewTooltip } from "@/config/crewTooltips";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Eye, Target, BarChart3, Wrench, Zap, Search, PenTool, Link2, Megaphone, Compass, BrainCircuit, BookOpen, Plus } from "lucide-react";

type GridSlot = {
  roleId: string;
  roleName: string;
  roleIcon: React.ElementType;
  crewId: string | null;
  row: number;
  col: number;
};

const GRID_SLOTS: GridSlot[] = [
  { roleId: "mission_control", roleName: "Mission Control", roleIcon: Compass, crewId: "orchestrator", row: 1, col: 2 },
  { roleId: "competitive_intel", roleName: "Competitive Intel", roleIcon: Eye, crewId: "competitive_snapshot", row: 2, col: 1 },
  { roleId: "serp_tracking", roleName: "SERP Tracking", roleIcon: Target, crewId: "serp_intel", row: 2, col: 2 },
  { roleId: "analytics_signals", roleName: "Analytics & Signals", roleIcon: BarChart3, crewId: "google_data_connector", row: 2, col: 3 },
  { roleId: "technical_seo", roleName: "Technical SEO", roleIcon: Wrench, crewId: "crawl_render", row: 3, col: 1 },
  { roleId: "performance_monitoring", roleName: "Performance", roleIcon: Zap, crewId: "core_web_vitals", row: 3, col: 2 },
  { roleId: "content_decay", roleName: "Content Decay", roleIcon: Search, crewId: "content_decay", row: 3, col: 3 },
  { roleId: "content_strategy", roleName: "Content Strategy", roleIcon: PenTool, crewId: "content_generator", row: 3, col: 4 },
  { roleId: "domain_authority", roleName: "Domain Authority", roleIcon: Link2, crewId: "backlink_authority", row: 4, col: 1 },
  { roleId: "ai_optimization", roleName: "AI Optimization", roleIcon: BrainCircuit, crewId: "ai_optimization", row: 4, col: 2 },
  { roleId: "paid_ads", roleName: "Paid Ads", roleIcon: Megaphone, crewId: "google_ads_connector", row: 4, col: 3 },
  { roleId: "knowledge_base", roleName: "Knowledge Base", roleIcon: BookOpen, crewId: "seo_kbase", row: 4, col: 4 },
];

function RoleInfoTooltip({ roleId }: { roleId: string }) {
  const roleTooltip = getRoleTooltip(roleId);
  if (!roleTooltip) return null;

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        <div
          className="w-[18px] h-[18px] rounded-full flex items-center justify-center cursor-help transition-all opacity-70 hover:opacity-100 hover:bg-white/20"
          onClick={(e) => e.stopPropagation()}
        >
          <Info className="w-3 h-3 text-white/90" />
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

function CrewCard({ 
  slot, 
  crew, 
  isEmpty, 
  isMissionControl, 
  isEnabled, 
  isSelected, 
  badge, 
  badgeClass, 
  ringClass, 
  ringColor,
  onSlotClick 
}: {
  slot: GridSlot;
  crew: ReturnType<typeof getCrewMember> | null;
  isEmpty: boolean;
  isMissionControl: boolean;
  isEnabled: boolean;
  isSelected: boolean;
  badge: string | null;
  badgeClass: string;
  ringClass: string;
  ringColor: string | undefined;
  onSlotClick: (id: string) => void;
}) {
  const RoleIcon = slot.roleIcon;

  return (
    <button
      className="w-full h-full transition-all duration-200 hover:scale-[1.03] group"
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
        <div className="absolute left-1.5 top-1.5 z-20">
          <RoleInfoTooltip roleId={slot.roleId} />
        </div>

        {badge && (
          <div className={`absolute right-1.5 top-1.5 z-20 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${badgeClass}`}>
            {badge}
          </div>
        )}

        <div className="absolute inset-0 flex items-center justify-center pb-10">
          {isEmpty ? (
            <div className="flex flex-col items-center gap-2">
              <RoleIcon className="w-12 h-12 text-white/20 group-hover:text-white/35 transition-colors" />
              <div className="flex items-center gap-1 text-white/30 group-hover:text-white/50 transition-colors">
                <Plus className="w-3 h-3" />
                <span className="text-xs font-medium">Add crew</span>
              </div>
            </div>
          ) : slot.crewId && (
            <CrewAvatarTooltip crewId={slot.crewId}>
              {crew?.avatar && typeof crew.avatar === 'string' && crew.avatar.includes('/') ? (
                <div className="w-[85%] h-[85%] max-w-[160px] max-h-[160px] overflow-hidden flex items-center justify-center">
                  <img 
                    src={crew.avatar} 
                    alt={crew.nickname || slot.roleName}
                    className="w-full h-full object-contain drop-shadow-lg"
                    style={{ transform: "scale(1.45) translateY(4px)" }}
                  />
                </div>
              ) : (
                <span className="text-6xl drop-shadow-lg">{crew?.avatar || "👤"}</span>
              )}
            </CrewAvatarTooltip>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 z-10 h-11 flex flex-col items-center justify-center px-2" style={{ background: isEmpty ? "transparent" : "linear-gradient(to top, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)" }}>
          <div className={`text-base font-semibold leading-tight text-center truncate w-full ${isEmpty ? "text-white/40" : "text-white"}`}>
            {isEmpty ? slot.roleName : (crew?.nickname || "Unknown")}
          </div>
        </div>
      </div>
    </button>
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
      <div className="relative w-full rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent overflow-hidden">
        <div 
          className="absolute inset-0 pointer-events-none z-0"
          style={{ background: "radial-gradient(ellipse 80% 50% at 50% 30%, rgba(245,158,11,0.06) 0%, transparent 60%)" }}
        />
        
        <ShipHullSvg className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-30" />

        <div className="relative z-10 w-full p-6 md:p-10">
          <div 
            className="grid gap-7 mx-auto max-w-[1000px]"
            style={{
              gridTemplateColumns: "repeat(4, 1fr)",
              gridTemplateRows: "repeat(4, 200px)",
            }}
          >
            {GRID_SLOTS.map((slot) => {
              const crew = slot.crewId ? getCrewMember(slot.crewId) : null;
              const isMissionControl = slot.roleId === "mission_control";
              const isEnabled = slot.crewId && (enabledAgents.includes(slot.crewId) || isMissionControl);
              const isSelected = slot.crewId && selectedAgents.includes(slot.crewId);
              const isEmpty = !isEnabled && !isSelected;

              const badge = isMissionControl ? "Included" : isEnabled ? "Active" : isSelected ? "Selected" : null;

              const ringClass = isEnabled
                ? "ring-2 shadow-[0_0_0_2px_var(--color-progress-soft),0_12px_32px_rgba(0,0,0,0.4)]"
                : isSelected
                  ? "ring-2 shadow-[0_0_0_2px_var(--color-primary-soft),0_12px_32px_rgba(0,0,0,0.3)]"
                  : "";

              const ringColor = isEnabled ? "var(--color-progress)" : isSelected ? "var(--color-primary)" : undefined;
              const badgeClass = isMissionControl || isEnabled ? "bg-progress-soft text-white/90" : isSelected ? "bg-[rgba(124,58,237,0.18)] text-white/90" : "";

              return (
                <div 
                  key={slot.roleId}
                  style={{
                    gridRow: slot.row,
                    gridColumn: slot.col,
                  }}
                >
                  <CrewCard
                    slot={slot}
                    crew={crew}
                    isEmpty={isEmpty}
                    isMissionControl={isMissionControl}
                    isEnabled={!!isEnabled}
                    isSelected={!!isSelected}
                    badge={badge}
                    badgeClass={badgeClass}
                    ringClass={ringClass}
                    ringColor={ringColor}
                    onSlotClick={onSlotClick}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
