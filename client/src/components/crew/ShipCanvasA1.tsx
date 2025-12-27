import React from "react";
import { ShipHullSvg } from "./ShipHullSvg";
import { getCrewMember } from "@/config/agents";
import { Info, Eye, Target, BarChart3, Wrench, Zap, Search, PenTool, Link2, Megaphone, Compass, BrainCircuit, BookOpen } from "lucide-react";

type RoleSlot = {
  roleId: string;
  roleName: string;
  roleIcon: React.ElementType;
  crewId: string | null;
  xPct: number;
  yPct: number;
};

// ═══════════════════════════════════════════════════════════════════════════
// FINAL CREW MANIFEST - LOCKED (12 slots)
// Do not add or remove slots without redesigning the ship image
// ═══════════════════════════════════════════════════════════════════════════
const ROLE_SLOTS: RoleSlot[] = [
  // ROW 1 - COMMAND (10%) - 1 slot
  { roleId: "mission_control", roleName: "Mission Control", roleIcon: Compass, crewId: "orchestrator", xPct: 50, yPct: 10 },

  // ROW 2 - INTELLIGENCE & VISIBILITY (30%) - 3 slots
  { roleId: "competitive_intel", roleName: "Competitive Intel", roleIcon: Eye, crewId: "competitive_snapshot", xPct: 25, yPct: 30 },
  { roleId: "serp_tracking", roleName: "SERP Tracking", roleIcon: Target, crewId: "serp_intel", xPct: 50, yPct: 30 },
  { roleId: "analytics_signals", roleName: "Analytics & Signals", roleIcon: BarChart3, crewId: "google_data_connector", xPct: 75, yPct: 30 },

  // ROW 3 - ENGINEERING & PERFORMANCE (48%) - 2 slots
  { roleId: "technical_seo", roleName: "Technical SEO", roleIcon: Wrench, crewId: "crawl_render", xPct: 35, yPct: 48 },
  { roleId: "performance_monitoring", roleName: "Performance Monitoring", roleIcon: Zap, crewId: "core_web_vitals", xPct: 65, yPct: 48 },

  // ROW 4 - CONTENT SYSTEMS (66%) - 2 slots
  { roleId: "content_decay", roleName: "Content Decay", roleIcon: Search, crewId: "content_decay", xPct: 35, yPct: 66 },
  { roleId: "content_strategy", roleName: "Content Strategy", roleIcon: PenTool, crewId: "content_generator", xPct: 65, yPct: 66 },

  // ROW 5 - AUTHORITY, AI, GROWTH, KNOWLEDGE (84%) - 4 slots
  { roleId: "domain_authority", roleName: "Domain Authority", roleIcon: Link2, crewId: "backlink_authority", xPct: 20, yPct: 84 },
  { roleId: "ai_optimization", roleName: "AI Optimization", roleIcon: BrainCircuit, crewId: "ai_optimization", xPct: 40, yPct: 84 },
  { roleId: "paid_ads", roleName: "Paid Ads", roleIcon: Megaphone, crewId: "google_ads_connector", xPct: 60, yPct: 84 },
  { roleId: "knowledge_base", roleName: "Knowledge Base", roleIcon: BookOpen, crewId: "seo_kbase", xPct: 80, yPct: 84 },
];

export function ShipCanvasA1(props: {
  enabledAgents: string[];
  selectedAgents: string[];
  onSlotClick: (id: string) => void;
  tileSize?: number;
}) {
  const { enabledAgents, selectedAgents, onSlotClick, tileSize = 100 } = props;

  return (
    <div className="relative w-full h-full rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent overflow-hidden">
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 80% 50% at 50% 30%, rgba(245,158,11,0.06) 0%, transparent 60%)",
        }}
      />
      
      <div className="relative w-full h-full flex items-center justify-center p-4 md:p-8">
        <div className="relative w-full max-w-[900px] h-full max-h-[800px]">
          <ShipHullSvg className="absolute inset-0 w-full h-full" />

          <div className="pointer-events-none absolute inset-0">
            <svg viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid meet" className="h-full w-full">
              <defs>
                <mask id="outsideMask">
                  <rect x="0" y="0" width="1000" height="560" fill="white" />
                  <path
                    d="M110,80 C180,30 300,10 500,10 C700,10 820,30 890,80
                       C945,120 980,175 980,280
                       C980,385 945,440 890,480
                       C820,530 700,550 500,550
                       C300,550 180,530 110,480
                       C55,440 20,385 20,280
                       C20,175 55,120 110,80 Z"
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                x="0"
                y="0"
                width="1000"
                height="560"
                fill="rgba(0,0,0,0.50)"
                mask="url(#outsideMask)"
              />
            </svg>
          </div>

          {/* BACKGROUND LAYER: Role labels (not clickable) */}
          <div className="absolute inset-0 pointer-events-none">
            {ROLE_SLOTS.map((slot) => {
              const currentTileSize = slot.roleId === "mission_control" ? tileSize * 1.1 : tileSize;
              const labelOffset = currentTileSize / 2 + 14;
              
              return (
                <div
                  key={`label-${slot.roleId}`}
                  className="absolute text-center"
                  style={{
                    left: `${slot.xPct}%`,
                    top: `calc(${slot.yPct}% - ${labelOffset}px)`,
                    transform: "translateX(-50%)",
                  }}
                >
                  <span className="text-[10px] font-medium text-white/40 whitespace-nowrap">
                    {slot.roleName}
                  </span>
                </div>
              );
            })}
          </div>

          {/* INTERACTIVE LAYER: Crew tiles and empty bays */}
          <div className="absolute inset-0">
            {ROLE_SLOTS.map((slot) => {
              const crew = slot.crewId ? getCrewMember(slot.crewId) : null;
              const isMissionControl = slot.roleId === "mission_control";
              const isEnabled = slot.crewId && (enabledAgents.includes(slot.crewId) || isMissionControl);
              const isSelected = slot.crewId && selectedAgents.includes(slot.crewId);
              const isEmpty = !isEnabled && !isSelected;
              const RoleIcon = slot.roleIcon;

              const badge = isMissionControl ? "Included" : isEnabled ? "Active" : isSelected ? "Selected" : null;

              const currentTileSize = isMissionControl ? tileSize * 1.1 : tileSize;
              const left = `calc(${slot.xPct}% - ${currentTileSize / 2}px)`;
              const top = `calc(${slot.yPct}% - ${currentTileSize / 2}px)`;

              if (isEmpty) {
                return (
                  <button
                    key={slot.roleId}
                    className="absolute transition-all hover:scale-105 group"
                    style={{ left, top, width: currentTileSize, height: currentTileSize }}
                    onClick={() => slot.crewId && onSlotClick(slot.crewId)}
                    data-testid={`ship-slot-${slot.roleId}`}
                    title="Assign a crew member to this role"
                  >
                    <div className="relative h-full w-full rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.02] transition-all duration-200 group-hover:border-white/30 group-hover:bg-white/[0.04]">
                      <div className="absolute left-1.5 top-1.5 opacity-40 group-hover:opacity-70 transition-opacity">
                        <Info className="w-3.5 h-3.5 text-white/60" />
                      </div>
                      <div className="flex h-full items-center justify-center">
                        <RoleIcon className="w-10 h-10 text-white/20 group-hover:text-white/40 transition-colors" />
                      </div>
                    </div>
                  </button>
                );
              }

              const ringClass = isEnabled
                ? "ring-2 shadow-[0_0_0_2px_var(--color-progress-soft),0_18px_40px_rgba(0,0,0,0.45)]"
                : isSelected
                  ? "ring-2 shadow-[0_0_0_2px_var(--color-primary-soft),0_18px_40px_rgba(0,0,0,0.35)]"
                  : "ring-1 ring-white/10";

              const ringColor = isEnabled 
                ? "var(--color-progress)" 
                : isSelected 
                  ? "var(--color-primary)" 
                  : undefined;

              const badgeClass = isMissionControl || isEnabled
                ? "bg-progress-soft text-white/90"
                : isSelected
                  ? "bg-[rgba(124,58,237,0.18)] text-white/90"
                  : "";

              return (
                <button
                  key={slot.roleId}
                  className="absolute transition-transform hover:scale-105 group"
                  style={{ left, top, width: currentTileSize, height: currentTileSize }}
                  onClick={() => slot.crewId && onSlotClick(slot.crewId)}
                  data-testid={`ship-slot-${slot.roleId}`}
                  title={`View ${crew?.nickname || slot.roleName} details`}
                >
                  <div
                    className={[
                      "relative h-full w-full rounded-2xl bg-white/[0.06] backdrop-blur-sm",
                      "transition-all duration-200 hover:bg-white/[0.08]",
                      ringClass,
                      "border border-white/15",
                    ].join(" ")}
                    style={{ "--tw-ring-color": ringColor } as React.CSSProperties}
                  >
                    {badge && (
                      <div className={`absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badgeClass}`}>
                        {badge}
                      </div>
                    )}

                    <div className="flex h-full items-center justify-center">
                      {crew?.avatar && typeof crew.avatar === 'string' && crew.avatar.includes('/') ? (
                        <img 
                          src={crew.avatar} 
                          alt={crew.nickname || slot.roleName}
                          className="h-16 w-16 object-contain drop-shadow-lg"
                        />
                      ) : (
                        <span className="text-4xl drop-shadow-lg">
                          {crew?.avatar || "👤"}
                        </span>
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
  );
}
