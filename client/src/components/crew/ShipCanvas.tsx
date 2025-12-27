import { cn } from "@/lib/utils";
import { getCrewMember, USER_FACING_AGENTS, type CrewMember } from "@/config/agents";
import { Badge } from "@/components/ui/badge";

interface ShipCanvasProps {
  enabledAgents: string[];
  selectedAgents: string[];
  onSlotClick: (roleId: string) => void;
}

type CompartmentPosition = {
  x: number;
  y: number;
  width: number;
  height: number;
  clipPath?: string;
};

const COMPARTMENT_LAYOUT: Record<string, CompartmentPosition> = {
  content_decay: { x: 50, y: 8, width: 18, height: 16 },
  competitive_snapshot: { x: 28, y: 22, width: 20, height: 18 },
  serp_intel: { x: 72, y: 22, width: 20, height: 18 },
  backlink_authority: { x: 50, y: 38, width: 22, height: 18 },
  seo_kbase: { x: 18, y: 46, width: 18, height: 16 },
  google_data_connector: { x: 82, y: 46, width: 18, height: 16 },
  crawl_render: { x: 32, y: 60, width: 18, height: 16 },
  core_web_vitals: { x: 68, y: 60, width: 18, height: 16 },
  content_generator: { x: 38, y: 78, width: 18, height: 16 },
  google_ads_connector: { x: 62, y: 78, width: 18, height: 16 },
};

function Compartment({
  crew,
  isEnabled,
  isSelected,
  position,
  onClick,
}: {
  crew: CrewMember;
  isEnabled: boolean;
  isSelected: boolean;
  position: CompartmentPosition;
  onClick: () => void;
}) {
  const state = isEnabled ? "enabled" : isSelected ? "selected" : "empty";

  return (
    <button
      onClick={onClick}
      data-testid={`ship-compartment-${crew.service_id}`}
      className={cn(
        "absolute flex flex-col items-center justify-center gap-1 p-2 rounded-xl border-2 transition-all duration-300",
        "bg-gradient-to-b hover:scale-105 cursor-pointer",
        state === "enabled" && [
          "from-slate-700/90 to-slate-800/95 border-amber-500/70",
          "shadow-[0_0_20px_rgba(251,191,36,0.3)] ring-2 ring-amber-500/30",
        ],
        state === "selected" && [
          "from-slate-700/80 to-slate-800/90 border-sky-400/60",
          "shadow-[0_0_15px_rgba(56,189,248,0.25)]",
        ],
        state === "empty" && [
          "from-slate-800/60 to-slate-900/70 border-slate-600/40 border-dashed",
          "hover:border-slate-500/60 hover:from-slate-700/70",
        ]
      )}
      style={{
        left: `${position.x - position.width / 2}%`,
        top: `${position.y - position.height / 2}%`,
        width: `${position.width}%`,
        height: `${position.height}%`,
      }}
    >
      <div className="relative w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center">
        {crew.avatar ? (
          <img
            src={crew.avatar}
            alt={crew.nickname}
            className={cn(
              "w-full h-full object-contain transition-opacity duration-300",
              state === "enabled" && "opacity-100",
              state === "selected" && "opacity-70",
              state === "empty" && "opacity-30 grayscale"
            )}
          />
        ) : (
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
              state === "enabled" ? "bg-amber-500/30 text-amber-300" :
              state === "selected" ? "bg-sky-500/30 text-sky-300" :
              "bg-slate-700/50 text-slate-500"
            )}
          >
            {crew.nickname.charAt(0)}
          </div>
        )}
      </div>

      <div className="text-center flex flex-col gap-0.5">
        <span
          className={cn(
            "text-[10px] sm:text-xs font-semibold leading-tight",
            state === "enabled" ? "text-amber-200" :
            state === "selected" ? "text-sky-200" :
            "text-slate-400"
          )}
        >
          {crew.nickname}
        </span>
        <span className="text-[8px] sm:text-[10px] text-slate-500 leading-tight">
          {crew.role}
        </span>
      </div>

      {state === "enabled" && (
        <Badge className="absolute -top-1 -right-1 bg-amber-500 text-amber-950 text-[8px] px-1.5 py-0 border-0">
          Active
        </Badge>
      )}
      {state === "selected" && (
        <Badge className="absolute -top-1 -right-1 bg-sky-500 text-sky-950 text-[8px] px-1.5 py-0 border-0">
          Selected
        </Badge>
      )}
      {state === "empty" && (
        <span className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-slate-900/60 rounded-xl text-xs text-slate-300">
          + Add
        </span>
      )}
    </button>
  );
}

export function ShipCanvas({ enabledAgents, selectedAgents, onSlotClick }: ShipCanvasProps) {
  return (
    <div className="relative w-full h-full min-h-[400px] sm:min-h-[500px]">
      <div
        className={cn(
          "absolute inset-0 rounded-3xl overflow-hidden",
          "bg-gradient-to-b from-slate-700/50 via-slate-800/60 to-slate-900/70",
          "border-2 border-slate-600/50",
          "shadow-[0_0_60px_rgba(0,0,0,0.5)]"
        )}
        style={{
          clipPath: `polygon(
            30% 0%, 70% 0%,
            85% 5%, 95% 15%,
            100% 35%, 100% 70%,
            95% 85%, 85% 95%,
            70% 100%, 30% 100%,
            15% 95%, 5% 85%,
            0% 70%, 0% 35%,
            5% 15%, 15% 5%
          )`,
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(148,163,184,0.15),transparent_60%)]" />
        
        <div
          className="absolute top-[3%] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-amber-500 shadow-[0_0_15px_rgba(251,191,36,0.8)]"
        />
        
        <div className="absolute inset-[8%] border border-slate-600/30 rounded-2xl" />
        <div className="absolute inset-[12%] border border-slate-600/20 rounded-xl" />

        <div className="absolute left-[8%] top-[30%] bottom-[30%] w-px bg-gradient-to-b from-transparent via-slate-500/30 to-transparent" />
        <div className="absolute right-[8%] top-[30%] bottom-[30%] w-px bg-gradient-to-b from-transparent via-slate-500/30 to-transparent" />
        <div className="absolute left-[25%] right-[25%] top-[8%] h-px bg-gradient-to-r from-transparent via-slate-500/30 to-transparent" />
        <div className="absolute left-[20%] right-[20%] bottom-[8%] h-px bg-gradient-to-r from-transparent via-slate-500/30 to-transparent" />

        {USER_FACING_AGENTS.map((agentId) => {
          const position = COMPARTMENT_LAYOUT[agentId];
          if (!position) return null;

          const crew = getCrewMember(agentId);
          const isEnabled = enabledAgents.includes(agentId);
          const isSelected = selectedAgents.includes(agentId);

          return (
            <Compartment
              key={agentId}
              crew={crew}
              isEnabled={isEnabled}
              isSelected={isSelected}
              position={position}
              onClick={() => onSlotClick(agentId)}
            />
          );
        })}
      </div>

      <div className="absolute bottom-[-5%] left-1/2 -translate-x-1/2 w-[30%] h-[8%]">
        <div className="w-full h-full bg-gradient-to-b from-slate-600/50 to-slate-700/30 rounded-b-full border-x-2 border-b-2 border-slate-600/40" />
        <div className="absolute top-1/2 left-1/4 w-2 h-2 rounded-full bg-cyan-400/60 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
        <div className="absolute top-1/2 right-1/4 w-2 h-2 rounded-full bg-cyan-400/60 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
      </div>
    </div>
  );
}
