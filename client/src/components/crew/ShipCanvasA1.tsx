import React from "react";
import { ShipHullSvg } from "./ShipHullSvg";
import { getCrewMember } from "@/config/agents";

type Slot = {
  id: string;
  label: string;
  subtitle: string;
  avatar: string;
  xPct: number;
  yPct: number;
};

const SLOTS: Slot[] = [
  { id: "orchestrator", label: "Major Tom", subtitle: "Orchestrator", avatar: "🎖️", xPct: 50, yPct: 8 },

  { id: "content_decay", label: "Sentinel", subtitle: "Content Decay", avatar: "🔍", xPct: 50, yPct: 25 },
  { id: "competitive_snapshot", label: "Natasha", subtitle: "Competitive Intel", avatar: "🕵️", xPct: 30, yPct: 28 },
  { id: "serp_intel", label: "Lookout", subtitle: "SERP Tracking", avatar: "🔭", xPct: 70, yPct: 28 },

  { id: "seo_kbase", label: "Socrates", subtitle: "Knowledge Base", avatar: "🧠", xPct: 25, yPct: 48 },
  { id: "backlink_authority", label: "Beacon", subtitle: "Authority", avatar: "🏛️", xPct: 50, yPct: 45 },
  { id: "google_data_connector", label: "Popular", subtitle: "Signals", avatar: "📊", xPct: 75, yPct: 48 },

  { id: "crawl_render", label: "Scotty", subtitle: "Technical SEO", avatar: "🔧", xPct: 32, yPct: 65 },
  { id: "core_web_vitals", label: "Speedster", subtitle: "Performance", avatar: "⚡", xPct: 68, yPct: 65 },

  { id: "content_generator", label: "Hemingway", subtitle: "Content Strategy", avatar: "✍️", xPct: 40, yPct: 82 },
  { id: "google_ads_connector", label: "Draper", subtitle: "Ads Growth", avatar: "📈", xPct: 60, yPct: 82 },
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
            {SLOTS.map((slot) => {
              const crew = getCrewMember(slot.id);
              const isOrchestrator = slot.id === "orchestrator";
              const isEnabled = enabledAgents.includes(slot.id) || isOrchestrator;
              const isSelected = selectedAgents.includes(slot.id);
              const isEmpty = !isEnabled && !isSelected;

              const opacity = isEnabled ? 1 : isSelected ? 0.7 : 0.25;
              const badge = isOrchestrator ? "Included" : isEnabled ? "Active" : isSelected ? "Selected" : "";

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

              const badgeClass = isOrchestrator || isEnabled
                ? "bg-progress-soft text-white/90"
                : isSelected
                  ? "bg-[rgba(124,58,237,0.18)] text-white/90"
                  : "";

              const currentTileSize = isOrchestrator ? tileSize * 1.15 : tileSize;
              const left = `calc(${slot.xPct}% - ${currentTileSize / 2}px)`;
              const top = `calc(${slot.yPct}% - ${currentTileSize / 2}px)`;

              return (
                <button
                  key={slot.id}
                  className="absolute transition-transform hover:scale-105"
                  style={{ left, top, width: currentTileSize, height: currentTileSize }}
                  onClick={() => onSlotClick(slot.id)}
                  data-testid={`ship-slot-${slot.id}`}
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

                    <div className="flex h-full flex-col items-center justify-center gap-1.5 px-2">
                      {crew.avatar && typeof crew.avatar === 'string' && crew.avatar.includes('/') ? (
                        <img 
                          src={crew.avatar} 
                          alt={crew.nickname || slot.label}
                          className="h-14 w-14 object-contain transition-opacity"
                          style={{ opacity }}
                        />
                      ) : (
                        <span 
                          className="text-4xl transition-opacity"
                          style={{ opacity }}
                        >
                          {crew.avatar || slot.avatar}
                        </span>
                      )}
                      <div className="text-center">
                        <div className="text-xs font-semibold text-white/90 leading-tight">{crew.nickname || slot.label}</div>
                        <div className="text-[10px] text-white/50 leading-tight">{crew.signalType || slot.subtitle}</div>
                      </div>
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
