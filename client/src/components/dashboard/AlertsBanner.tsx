import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Bug, Target, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface AlertItem {
  type: string;
  severity: string;
  title: string;
  message: string;
}

interface AlertsResponse {
  alerts: AlertItem[];
  lastChecked: string;
}

const severityConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; className: string }> = {
  critical: {
    icon: AlertTriangle,
    className: "border-red-500 bg-red-50 dark:bg-red-950",
  },
  high: {
    icon: Bug,
    className: "border-orange-500 bg-orange-50 dark:bg-orange-950",
  },
  medium: {
    icon: Target,
    className: "border-yellow-500 bg-yellow-50 dark:bg-yellow-950",
  },
};

export function AlertsBanner() {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  
  const { data } = useQuery<AlertsResponse>({
    queryKey: ['alerts'],
    queryFn: async () => {
      const res = await fetch('/api/alerts');
      if (!res.ok) throw new Error('Failed to fetch alerts');
      return res.json();
    },
    refetchInterval: 30000,
  });

  const handleDismiss = (title: string) => {
    setDismissed(prev => new Set(prev).add(title));
  };

  const visibleAlerts = data?.alerts.filter(a => !dismissed.has(a.title)) || [];

  if (visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2" data-testid="alerts-banner">
      {visibleAlerts.map((alert, i) => {
        const config = severityConfig[alert.severity] || severityConfig.medium;
        const Icon = config.icon;
        
        return (
          <Alert key={i} className={`${config.className} relative`} data-testid={`alert-${i}`}>
            <Icon className="h-4 w-4" />
            <AlertTitle className="flex items-center justify-between pr-8">
              {alert.title}
            </AlertTitle>
            <AlertDescription className="text-sm">
              {alert.message}
            </AlertDescription>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6"
              onClick={() => handleDismiss(alert.title)}
              data-testid={`dismiss-alert-${i}`}
            >
              <X className="h-4 w-4" />
            </Button>
          </Alert>
        );
      })}
    </div>
  );
}
