import { getCrewMember } from "@/config/crewManifest";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle, XCircle, AlertTriangle, Clock } from "lucide-react";

interface AgentCardProps {
  serviceId: string;
  status?: "healthy" | "degraded" | "down" | "disabled" | "unknown";
  lastCheckIn?: string | null;
  className?: string;
  onClick?: () => void;
}

const STATUS_CONFIG = {
  healthy: { label: "Healthy", color: "bg-green-100 text-green-700", icon: CheckCircle },
  degraded: { label: "Needs Attention", color: "bg-yellow-100 text-yellow-700", icon: AlertTriangle },
  down: { label: "Down", color: "bg-red-100 text-red-700", icon: XCircle },
  disabled: { label: "Disabled", color: "bg-gray-100 text-gray-500", icon: Clock },
  unknown: { label: "Unknown", color: "bg-gray-100 text-gray-500", icon: Clock },
};

export function AgentCard({ 
  serviceId, 
  status = "unknown", 
  lastCheckIn, 
  className, 
  onClick 
}: AgentCardProps) {
  const crew = getCrewMember(serviceId);
  const Icon = crew.icon;
  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;

  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all hover:shadow-md",
        onClick && "cursor-pointer",
        className
      )}
      style={{ borderLeftColor: crew.color, borderLeftWidth: 4 }}
      onClick={onClick}
      data-testid={`agent-card-${serviceId}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${crew.color}20` }}
            >
              <Icon className="w-5 h-5" style={{ color: crew.color }} />
            </div>
            <div>
              <h3 className="font-semibold" style={{ color: crew.color }}>
                {crew.nickname}
              </h3>
              <p className="text-sm text-muted-foreground">{crew.role}</p>
            </div>
          </div>
          <Badge className={cn("flex items-center gap-1 text-xs", statusConfig.color)}>
            <StatusIcon className="w-3 h-3" />
            {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Last seen</span>
          <span>{lastCheckIn || "Never"}</span>
        </div>
      </CardContent>
    </Card>
  );
}
