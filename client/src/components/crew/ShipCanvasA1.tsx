import React from "react";
import { ShipHullSvg } from "./ShipHullSvg";
import { getCrewMember } from "@/config/agents";
import { getRoleTooltip } from "@/config/roleTooltips";
import { getCrewTooltip } from "@/config/crewTooltips";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Eye, Target, BarChart3, Wrench, Zap, Search, PenTool, Link2, Megaphone, Compass, BrainCircuit, BookOpen, Plus } from "lucide-react";
import shipInteriorBg from "@assets/generated_images/tall_vertical_ship_interior.png";

type GridSlot = {
  roleId: string;
  roleName: string;
  roleIcon: React.ElementType;
  crewId: string | null;
  row: number;
  col: number;
  valueProp?: string;
};

const GRID_SLOTS: GridSlot[] = [
  // Row 1: Mission Control (centered)
  { roleId: "mission_control", roleName: "Mission Control", roleIcon: Compass, crewId: "orchestrator", row: 1, col: 2 },
  // Row 2: Intelligence
  { roleId: "competitive_intel", roleName: "Competitive Intel", roleIcon: Eye, crewId: "competitive_snapshot", row: 2, col: 1, valueProp: "Monitor competitor movements." },
  { roleId: "serp_tracking", roleName: "SERP Tracking", roleIcon: Target, crewId: "serp_intel", row: 2, col: 2, valueProp: "Track rankings and explain movement." },
  { roleId: "analytics_signals", roleName: "Analytics & Signals", roleIcon: BarChart3, crewId: "google_data_connector", row: 2, col: 3, valueProp: "Tie SEO work to traffic outcomes." },
  // Row 3: Engineering & Performance
  { roleId: "technical_seo", roleName: "Technical SEO", roleIcon: Wrench, crewId: "crawl_render", row: 3, col: 1, valueProp: "Find crawl/render issues blocking rank." },
  { roleId: "performance_monitoring", roleName: "Performance", roleIcon: Zap, crewId: "core_web_vitals", row: 3, col: 2, valueProp: "Fix speed issues hurting conversion." },
  { roleId: "content_decay", roleName: "Content Decay", roleIcon: Search, crewId: "content_decay", row: 3, col: 3, valueProp: "Detect declining content before it tanks." },
  // Row 4: Content & Authority
  { roleId: "content_strategy", roleName: "Content Strategy", roleIcon: PenTool, crewId: "content_generator", row: 4, col: 1, valueProp: "Generate optimized content at scale." },
  { roleId: "domain_authority", roleName: "Domain Authority", roleIcon: Link2, crewId: "backlink_authority", row: 4, col: 2, valueProp: "Build and monitor link equity." },
  { roleId: "ai_optimization", roleName: "AI Optimization", roleIcon: BrainCircuit, crewId: "ai_optimization", row: 4, col: 3, valueProp: "Make your site discoverable to AI." },
  // Row 5: Growth & Knowledge
  { roleId: "paid_ads", roleName: "Paid Ads", roleIcon: Megaphone, crewId: "google_ads_connector", row: 5, col: 1, valueProp: "Turn learnings into faster growth." },
  { roleId: "knowledge_base", roleName: "Knowledge Base", roleIcon: BookOpen, crewId: "seo_kbase", row: 5, col: 3, valueProp: "Store insights and learn over time." },
];

const ALL_BAY_POSITIONS = [
  { row: 1, col: 1 }, { row: 1, col: 2 }, { row: 1, col: 3 },
  { row: 2, col: 1 }, { row: 2, col: 2 }, { row: 2, col: 3 },
  { row: 3, col: 1 }, { row: 3, col: 2 }, { row: 3, col: 3 },
  { row: 4, col: 1 }, { row: 4, col: 2 }, { row: 4, col: 3 },
  { row: 5, col: 1 }, { row: 5, col: 2 }, { row: 5, col: 3 },
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

function BayPlate() {
  return (
    <div 
      className="absolute inset-1 rounded-xl pointer-events-none"
      style={{
        background: "linear-gradient(180deg, rgba(30,40,55,0.5) 0%, rgba(20,28,40,0.6) 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "inset 0 2px 4px rgba(0,0,0,0.3), inset 0 -1px 2px rgba(255,255,255,0.03), 0 1px 3px rgba(0,0,0,0.2)",
      }}
    />
  );
}

function CrewCard({ 
  slot, 
  crew, 
  isEmpty, 
  isMissionControl, 
  isEnabled, 
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
      className="w-full h-full transition-all duration-200 hover:scale-[1.02] group relative"
      onClick={() => slot.crewId && onSlotClick(slot.crewId)}
      data-testid={`ship-slot-${slot.roleId}`}
    >
      <div
        className={[
          "relative h-full w-full rounded-xl",
          isEmpty 
            ? "border-2 border-dashed border-white/15 bg-white/[0.02] group-hover:border-white/30 group-hover:bg-white/[0.04]" 
            : "bg-gradient-to-b from-white/[0.08] to-white/[0.04] backdrop-blur-sm border border-white/15 group-hover:from-white/[0.10] group-hover:to-white/[0.06]",
          ringClass,
        ].join(" ")}
        style={{ 
          "--tw-ring-color": ringColor,
          boxShadow: isEmpty 
            ? "inset 0 1px 2px rgba(255,255,255,0.05)" 
            : "inset 0 1px 2px rgba(255,255,255,0.08), 0 4px 12px rgba(0,0,0,0.3)",
        } as React.CSSProperties}
      >
        <div 
          className="absolute inset-x-0 -bottom-1 h-2 rounded-full blur-md pointer-events-none"
          style={{ background: isEnabled ? "rgba(34,197,94,0.15)" : isEmpty ? "transparent" : "rgba(56,189,248,0.08)" }}
        />

        <div className="absolute left-1.5 top-1.5 z-20">
          <RoleInfoTooltip roleId={slot.roleId} />
        </div>

        {badge && (
          <div className={`absolute right-1.5 top-1.5 z-20 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${badgeClass}`}>
            {badge}
          </div>
        )}

        <div className="absolute inset-0 flex flex-col items-center justify-center px-2 pt-2 pb-2">
          {isEmpty ? (
            <div className="flex flex-col items-center gap-1.5 text-center">
              <RoleIcon className="w-9 h-9 text-white/25 group-hover:text-white/40 transition-colors" />
              <div className="text-sm font-medium text-white/40">{slot.roleName}</div>
              <div className="flex items-center gap-1 text-white/35 group-hover:text-white/55 transition-colors">
                <Plus className="w-3 h-3" />
                <span className="text-xs font-medium">Add crew</span>
              </div>
              {slot.valueProp && (
                <div className="text-[10px] text-white/25 leading-tight mt-1 max-w-[140px] truncate">
                  {slot.valueProp}
                </div>
              )}
            </div>
          ) : slot.crewId && (
            <>
              <div className="flex-1 flex items-center justify-center">
                <CrewAvatarTooltip crewId={slot.crewId}>
                  {crew?.avatar && typeof crew.avatar === 'string' && crew.avatar.includes('/') ? (
                    <div className="w-[85%] h-[85%] max-w-[130px] max-h-[130px] overflow-hidden flex items-center justify-center">
                      <img 
                        src={crew.avatar} 
                        alt={crew.nickname || slot.roleName}
                        className="w-full h-full object-contain drop-shadow-lg"
                        style={{ transform: "scale(1.4) translateY(2px)" }}
                      />
                    </div>
                  ) : (
                    <span className="text-5xl drop-shadow-lg">{crew?.avatar || "👤"}</span>
                  )}
                </CrewAvatarTooltip>
              </div>
              <div className="w-full h-14 flex flex-col items-center justify-center px-1 rounded-b-xl" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 70%, transparent 100%)" }}>
                <div className="text-sm font-semibold text-white/80 text-center truncate w-full">
                  {crew?.nickname || "Unknown"}
                </div>
                <div className="text-[10px] text-white/50 text-center truncate w-full">
                  {crew?.role || slot.roleName}
                </div>
              </div>
            </>
          )}
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
      <div 
        className="relative w-full min-h-[1200px] rounded-3xl border border-white/10 overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #0a0f1a 0%, #0f172a 20%, #1a2540 50%, #0f172a 80%, #0a0f1a 100%)",
        }}
      >
        <div 
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: `url(${shipInteriorBg})`,
            backgroundSize: "auto 100%",
            backgroundPosition: "center top",
            backgroundRepeat: "no-repeat",
            opacity: 0.35,
          }}
        />
        
        <div 
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background: "linear-gradient(180deg, rgba(10,15,26,0.9) 0%, rgba(10,15,26,0.3) 15%, transparent 30%, transparent 70%, rgba(10,15,26,0.3) 85%, rgba(10,15,26,0.9) 100%)",
          }}
        />
        
        <div 
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background: "radial-gradient(ellipse 60% 100% at 50% 50%, transparent 30%, rgba(0,0,0,0.7) 100%)",
          }}
        />

        <div 
          className="absolute left-1/2 top-0 bottom-0 w-px pointer-events-none z-0 opacity-20"
          style={{
            background: "linear-gradient(180deg, transparent 5%, rgba(56,189,248,0.3) 20%, rgba(56,189,248,0.5) 50%, rgba(56,189,248,0.3) 80%, transparent 95%)",
          }}
        />

        <div className="relative z-10 w-full py-16 px-6 lg:px-10">
          <div 
            className="relative grid gap-x-7 gap-y-10 mx-auto"
            style={{
              gridTemplateColumns: "repeat(3, minmax(150px, 220px))",
              gridTemplateRows: "repeat(5, 200px)",
              justifyContent: "center",
            }}
          >
            <div 
              className="absolute -inset-4 grid gap-x-7 gap-y-10 pointer-events-none"
              style={{
                gridTemplateColumns: "repeat(3, minmax(150px, 220px))",
                gridTemplateRows: "repeat(5, 200px)",
                justifyContent: "center",
                padding: "16px",
              }}
            >
              {ALL_BAY_POSITIONS.map((pos) => (
                <div 
                  key={`bay-${pos.row}-${pos.col}`}
                  className="relative"
                  style={{ gridRow: pos.row, gridColumn: pos.col }}
                >
                  <BayPlate />
                </div>
              ))}
            </div>

            <div style={{ gridRow: 1, gridColumn: 1 }} />
            
            {GRID_SLOTS.map((slot) => {
              const crew = slot.crewId ? getCrewMember(slot.crewId) : null;
              const isMissionControl = slot.roleId === "mission_control";
              const isEnabled = slot.crewId && (enabledAgents.includes(slot.crewId) || isMissionControl);
              const isSelected = slot.crewId && selectedAgents.includes(slot.crewId);
              const isEmpty = !isEnabled && !isSelected;

              const badge = isMissionControl ? "Included" : isEnabled ? "Active" : isSelected ? "Selected" : null;

              const ringClass = isEnabled
                ? "ring-2 shadow-[0_0_0_2px_var(--color-progress-soft),0_4px_16px_rgba(0,0,0,0.4)]"
                : isSelected
                  ? "ring-2 shadow-[0_0_0_2px_var(--color-primary-soft),0_4px_16px_rgba(0,0,0,0.3)]"
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
            
            <div style={{ gridRow: 1, gridColumn: 3 }} />
            <div style={{ gridRow: 5, gridColumn: 3 }} />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
