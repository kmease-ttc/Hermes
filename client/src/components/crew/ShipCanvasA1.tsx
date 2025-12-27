import React from "react";
import { ShipHullSvg } from "./ShipHullSvg";
import { getCrewMember } from "@/config/agents";
import { Info, Eye, Target, BarChart3, Wrench, Zap, Search, PenTool, Link2, Megaphone, Compass, BrainCircuit } from "lucide-react";

type RoleSlot = {
  roleId: string;
  roleName: string;
  roleIcon: React.ElementType;
  crewId: string | null;
  xPct: number;
  yPct: number;
};

const ROLE_SLOTS: RoleSlot[] = [
  // COMMAND - Top (10%)
  { roleId: "mission_control", roleName: "Mission Control", roleIcon: Compass, crewId: "orchestrator", xPct: 50, yPct: 10 },

  // INTELLIGENCE - Upper section (32%)
  { roleId: "competitive_intel", roleName: "Competitive Intel", roleIcon: Eye, crewId: "competitive_snapshot", xPct: 25, yPct: 32 },
  { roleId: "serp_tracking", roleName: "SERP Tracking", roleIcon: Target, crewId: "serp_intel", xPct: 50, yPct: 32 },
  { roleId: "analytics_signals", roleName: "Analytics & Signals", roleIcon: BarChart3, crewId: "google_data_connector", xPct: 75, yPct: 32 },

  // CONTENT SYSTEMS - Middle upper (52%)
  { roleId: "content_decay", roleName: "Content Decay", roleIcon: Search, crewId: "content_decay", xPct: 25, yPct: 52 },
  { roleId: "ai_optimization", roleName: "AI Optimization", roleIcon: BrainCircuit, crewId: "ai_optimization", xPct: 50, yPct: 52 },
  { roleId: "content_strategy", roleName: "Content Strategy", roleIcon: PenTool, crewId: "content_generator", xPct: 75, yPct: 52 },

  // ENGINEERING - Middle lower (72%)
  { roleId: "technical_seo", roleName: "Technical SEO", roleIcon: Wrench, crewId: "crawl_render", xPct: 32, yPct: 72 },
  { roleId: "performance", roleName: "Performance", roleIcon: Zap, crewId: "core_web_vitals", xPct: 68, yPct: 72 },

  // AUTHORITY & GROWTH - Bottom section (92%)
  { roleId: "domain_authority", roleName: "Domain Authority", roleIcon: Link2, crewId: "backlink_authority", xPct: 38, yPct: 92 },
  { roleId: "paid_ads", roleName: "Paid Ads", roleIcon: Megaphone, crewId: "google_ads_connector", xPct: 62, yPct: 92 },
];

export function ShipCanvasA1(props: {
  enabledAgents: string[];
  selectedAgents: string[];
  onSlotClick: (id: string) => void;
  tileSize?: number;
}) {
  const { enabledAgents, selectedAgents, onSlotClick, tileSize = 110 } = props;

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

          <div className="absolute inset-0">
            {ROLE_SLOTS.map((slot) => {
              const crew = slot.crewId ? getCrewMember(slot.crewId) : null;
              const isMissionControl = slot.roleId === "mission_control";
              const isEnabled = slot.crewId && (enabledAgents.includes(slot.crewId) || isMissionControl);
              const isSelected = slot.crewId && selectedAgents.includes(slot.crewId);
              const isEmpty = !isEnabled && !isSelected;
              const RoleIcon = slot.roleIcon;

              const badge = isMissionControl ? "Included" : isEnabled ? "Active" : isSelected ? "Selected" : null;

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

              const borderClass = isEmpty
                ? "border border-dashed border-white/20"
                : "border border-white/15";

              const badgeClass = isMissionControl || isEnabled
                ? "bg-progress-soft text-white/90"
                : isSelected
                  ? "bg-[rgba(124,58,237,0.18)] text-white/90"
                  : "";

              const currentTileSize = isMissionControl ? tileSize * 1.08 : tileSize;
              const left = `calc(${slot.xPct}% - ${currentTileSize / 2}px)`;
              const top = `calc(${slot.yPct}% - ${currentTileSize / 2}px)`;

              return (
                <button
                  key={slot.roleId}
                  className="absolute transition-transform hover:scale-105 group"
                  style={{ left, top, width: currentTileSize, height: currentTileSize }}
                  onClick={() => slot.crewId && onSlotClick(slot.crewId)}
                  data-testid={`ship-slot-${slot.roleId}`}
                  title={isEmpty ? "Assign a crew member to this role" : `View ${crew?.nickname || slot.roleName} details`}
                >
                  <div
                    className={[
                      "relative h-full w-full rounded-2xl bg-white/[0.06] backdrop-blur-sm",
                      "transition-all duration-200 hover:bg-white/[0.08]",
                      ringClass,
                      borderClass,
                    ].join(" ")}
                    style={{ "--tw-ring-color": ringColor } as React.CSSProperties}
                  >
                    {badge && (
                      <div className={`absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${badgeClass}`}>
                        {badge}
                      </div>
                    )}

                    {isEmpty && (
                      <div className="absolute left-1.5 top-1.5 opacity-40 group-hover:opacity-70 transition-opacity">
                        <Info className="w-3.5 h-3.5 text-white/60" />
                      </div>
                    )}

                    <div className="flex h-full flex-col items-center justify-center gap-1 px-2">
                      {isEmpty ? (
                        <>
                          <RoleIcon className="w-8 h-8 text-white/30 group-hover:text-white/50 transition-colors" />
                          <div className="text-center">
                            <div className="text-[11px] font-medium text-white/40 leading-tight">{slot.roleName}</div>
                            <div className="text-[10px] text-white/30 leading-tight">
                              {slot.roleId === "ai_optimization" ? "Optimize for AI discovery" : "Empty slot"}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          {crew?.avatar && typeof crew.avatar === 'string' && crew.avatar.includes('/') ? (
                            <img 
                              src={crew.avatar} 
                              alt={crew.nickname || slot.roleName}
                              className="h-12 w-12 object-contain"
                            />
                          ) : (
                            <span className="text-3xl">
                              {crew?.avatar || "👤"}
                            </span>
                          )}
                          <div className="text-center">
                            <div className="text-[11px] font-semibold text-white/90 leading-tight">{crew?.nickname || "Unknown"}</div>
                            <div className="text-[10px] text-white/50 leading-tight">{slot.roleName}</div>
                          </div>
                        </>
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
