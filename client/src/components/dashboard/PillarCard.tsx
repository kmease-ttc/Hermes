import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, CheckCircle, AlertTriangle, XCircle, HelpCircle } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export type PillarStatus = 'good' | 'attention' | 'critical' | 'inconclusive';

interface PillarCardProps {
  title: string;
  icon: ReactNode;
  status: PillarStatus;
  statusMessage: string;
  kpis: { label: string; value: string | number; trend?: 'up' | 'down' | 'neutral' }[];
  detailsLink?: string;
}

const statusConfig = {
  good: {
    label: 'Good',
    icon: CheckCircle,
    className: 'bg-green-500/10 text-green-600 border-green-500/20',
  },
  attention: {
    label: 'Needs Attention',
    icon: AlertTriangle,
    className: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  },
  critical: {
    label: 'Critical',
    icon: XCircle,
    className: 'bg-red-500/10 text-red-600 border-red-500/20',
  },
  inconclusive: {
    label: 'Inconclusive',
    icon: HelpCircle,
    className: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  },
};

export function PillarCard({ title, icon, status, statusMessage, kpis, detailsLink }: PillarCardProps) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <Card className="relative overflow-hidden">
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1",
        status === 'good' && "bg-green-500",
        status === 'attention' && "bg-yellow-500",
        status === 'critical' && "bg-red-500",
        status === 'inconclusive' && "bg-gray-400",
      )} />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-muted">
              {icon}
            </div>
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <Badge className={cn("gap-1", config.className)}>
            <StatusIcon className="w-3 h-3" />
            {config.label}
          </Badge>
        </div>
        <CardDescription className="mt-2">{statusMessage}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {kpis.map((kpi, i) => (
            <div key={i} className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
              <p className={cn(
                "text-xl font-bold",
                kpi.trend === 'up' && "text-green-600",
                kpi.trend === 'down' && "text-red-600",
              )}>
                {kpi.value}
                {kpi.trend === 'up' && <span className="text-sm ml-1">↑</span>}
                {kpi.trend === 'down' && <span className="text-sm ml-1">↓</span>}
              </p>
            </div>
          ))}
        </div>
        {detailsLink && (
          <Link href={detailsLink}>
            <Button variant="ghost" size="sm" className="w-full justify-between" data-testid={`button-view-${title.toLowerCase().replace(/\s/g, '-')}`}>
              View Details
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
