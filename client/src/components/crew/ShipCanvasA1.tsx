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
  { id: "orchestrator", label: "Major Tom", subtitle: "Orchestrator", avatar: "🎖️", xPct: 50, yPct: 18 },

  { id: "content_decay", label: "Sentinel", subtitle: "Content Decay", avatar: "🔍", xPct: 50, yPct: 36 },
  { id: "competitive_snapshot", label: "Natasha", subtitle: "Competitive Intel", avatar: "🕵️", xPct: 33, yPct: 36 },
  { id: "serp_intel", label: "Lookout", subtitle: "SERP Tracking", avatar: "🔭", xPct: 72, yPct: 40 },

  { id: "seo_kbase", label: "Socrates", subtitle: "Knowledge Base", avatar: "🧠", xPct: 30, yPct: 55 },
  { id: "backlink_authority", label: "Beacon", subtitle: "Authority", avatar: "🏛️", xPct: 50, yPct: 56 },
  { id: "google_data_connector", label: "Popular", subtitle: "Signals", avatar: "📊", xPct: 72, yPct: 56 },

  { id: "crawl_render", label: "Scotty", subtitle: "Technical SEO", avatar: "🔧", xPct: 35, yPct: 72 },
  { id: "core_web_vitals", label: "Speedster", subtitle: "Performance", avatar: "⚡", xPct: 65, yPct: 72 },

  { id: "content_generator", label: "Hemingway", subtitle: "Content Strategy", avatar: "✍️", xPct: 42, yPct: 87 },
  { id: "google_ads_connector", label: "Draper", subtitle: "Ads Growth", avatar: "📈", xPct: 58, yPct: 87 },
];

export function ShipCanvasA1(props: {
  enabledAgents: string[];
  selectedAgents: string[];
  onSlotClick: (id: string) => void;
  tileSize?: number;
}) {
  const { enabledAgents, selectedAgents, onSlotClick, tileSize = 110 } = props;

  return (
    <div className="relative w-full h-full">
      <div className="relative h-full rounded-3xl border border-white/10 bg-white/5 p-4 md:p-6">
        <div className="relative mx-auto w-full h-full max-w-[1000px]">
          <ShipHullSvg className="w-full" />

          <div className="pointer-events-none absolute inset-0">
            <svg viewBox="0 0 1000 560" className="h-full w-full">
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
                fill="rgba(0,0,0,0.40)"
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

              const left = `calc(${slot.xPct}% - ${tileSize / 2}px)`;
              const top = `calc(${slot.yPct}% - ${tileSize / 2}px)`;

              return (
                <button
                  key={slot.id}
                  className="absolute transition-transform hover:scale-105"
                  style={{ left, top, width: tileSize, height: tileSize }}
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
                          className="h-12 w-12 object-contain transition-opacity"
                          style={{ opacity }}
                        />
                      ) : (
                        <span 
                          className="text-3xl transition-opacity"
                          style={{ opacity }}
                        >
                          {crew.avatar || slot.avatar}
                        </span>
                      )}
                      <div className="text-center">
                        <div className="text-[11px] font-semibold text-white/90 leading-tight">{crew.nickname || slot.label}</div>
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
