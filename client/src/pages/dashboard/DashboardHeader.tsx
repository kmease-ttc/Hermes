import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface DashboardHeaderProps {
  domain: string;
  siteId: string;
}

export function DashboardHeader({ domain, siteId }: DashboardHeaderProps) {
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/ops-dashboard", siteId] });
  };

  return (
    <div className="mb-8 flex items-start justify-between">
      <div>
        <h1 className="text-4xl font-bold mb-2" style={{ color: "#0F172A", letterSpacing: "-0.03em" }}>
          Dash<span
            style={{
              backgroundImage: "linear-gradient(90deg, #7c3aed, #ec4899, #f59e0b)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >board</span>
        </h1>
        <p style={{ color: "#475569" }}>{domain}</p>
      </div>
      <button
        onClick={handleRefresh}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5"
        style={{
          background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(236,72,153,0.06))",
          border: "1px solid rgba(124, 58, 237, 0.15)",
          color: "#7c3aed",
        }}
      >
        <RefreshCw className="w-4 h-4" />
        Refresh
      </button>
    </div>
  );
}
