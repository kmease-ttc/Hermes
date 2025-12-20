import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight, CheckCircle, AlertTriangle, XCircle, HelpCircle, ArrowUp, ArrowDown, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export type PillarStatus = 'good' | 'attention' | 'critical' | 'inconclusive';
export type TrendDirection = 'up' | 'down' | 'flat';

interface KPI {
  label: string;
  value: string | number;
  delta?: string;
  interpretation?: 'good' | 'warning' | 'critical' | 'neutral';
}

interface PillarCardProps {
  title: string;
  icon: ReactNode;
  status: PillarStatus;
  direction?: TrendDirection;
  statusHeadline: string;
  whyExplanation: string;
  kpis: KPI[];
  nextActions: { text: string; link?: string }[];
  detailsLink?: string;
}

const statusConfig = {
  good: {
    label: 'Good',
    icon: CheckCircle,
    className: 'bg-green-500/10 text-green-700 border-green-500/20',
    barColor: 'bg-green-500',
  },
  attention: {
    label: 'Needs Attention',
    icon: AlertTriangle,
    className: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
    barColor: 'bg-yellow-500',
  },
  critical: {
    label: 'Critical',
    icon: XCircle,
    className: 'bg-red-500/10 text-red-700 border-red-500/20',
    barColor: 'bg-red-500',
  },
  inconclusive: {
    label: 'Inconclusive',
    icon: HelpCircle,
    className: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
    barColor: 'bg-gray-400',
  },
};

const DirectionIcon = ({ direction }: { direction?: TrendDirection }) => {
  if (direction === 'up') return <ArrowUp className="w-4 h-4 text-green-600" />;
  if (direction === 'down') return <ArrowDown className="w-4 h-4 text-red-600" />;
  return <ArrowRight className="w-4 h-4 text-gray-500" />;
};

export function PillarCard({ 
  title, 
  icon, 
  status, 
  direction,
  statusHeadline, 
  whyExplanation, 
  kpis, 
  nextActions,
  detailsLink 
}: PillarCardProps) {
  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <Card className="relative overflow-hidden flex flex-col">
      <div className={cn("absolute top-0 left-0 right-0 h-1.5", config.barColor)} />
      
      <CardHeader className="pb-3 pt-5">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-muted">
              {icon}
            </div>
            <span className="font-semibold text-base">{title}</span>
          </div>
          <div className="flex items-center gap-2">
            {direction && <DirectionIcon direction={direction} />}
            <Badge className={cn("gap-1 text-xs", config.className)}>
              <StatusIcon className="w-3 h-3" />
              {config.label}
            </Badge>
          </div>
        </div>
        
        <p className="font-medium text-sm">{statusHeadline}</p>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4 pt-0">
        <div className="grid grid-cols-2 gap-3">
          {kpis.slice(0, 4).map((kpi, i) => (
            <div key={i} className="space-y-0.5">
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <div className="flex items-baseline gap-1.5">
                <span className={cn(
                  "text-lg font-bold",
                  kpi.interpretation === 'good' && "text-green-600",
                  kpi.interpretation === 'critical' && "text-red-600",
                  kpi.interpretation === 'warning' && "text-yellow-600",
                )}>
                  {kpi.value}
                </span>
                {kpi.delta && (
                  <span className={cn(
                    "text-xs",
                    kpi.delta.startsWith('-') ? "text-red-600" : kpi.delta.startsWith('+') ? "text-green-600" : "text-muted-foreground"
                  )}>
                    {kpi.delta}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">Why</p>
          <p className="text-sm">{whyExplanation}</p>
        </div>

        {nextActions.length > 0 && status !== 'good' && (
          <div className="border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">Next Action</p>
            <div className="space-y-1.5">
              {nextActions.slice(0, 2).map((action, i) => (
                action.link ? (
                  <Link key={i} href={action.link}>
                    <div className="flex items-center gap-2 text-sm text-primary hover:underline cursor-pointer">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-medium">{i + 1}</span>
                      {action.text}
                    </div>
                  </Link>
                ) : (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-5 h-5 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center font-medium">{i + 1}</span>
                    {action.text}
                  </div>
                )
              ))}
            </div>
          </div>
        )}

        {detailsLink && (
          <div className="mt-auto pt-2">
            <Link href={detailsLink}>
              <Button variant="ghost" size="sm" className="w-full justify-between h-8 text-xs" data-testid={`button-view-${title.toLowerCase().replace(/\s/g, '-')}`}>
                View Full Details
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
