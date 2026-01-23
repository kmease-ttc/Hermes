import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  AlertCircle, ChevronDown, ExternalLink, Settings, RefreshCw, 
  Play, FileText, Plus, Plug, HelpCircle, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MetaStatus, RemediationAction, ActionKind } from "@shared/noDeadEnds";

interface NoDeadEndsStateProps {
  meta: MetaStatus;
  title?: string;
  onAction?: (action: RemediationAction) => void;
  isLoading?: boolean;
  className?: string;
  compact?: boolean;
}

const iconMap: Record<ActionKind, React.ReactNode> = {
  route: <Settings className="w-4 h-4" />,
  href: <ExternalLink className="w-4 h-4" />,
  modal: <Settings className="w-4 h-4" />,
  retry: <RefreshCw className="w-4 h-4" />,
  test_connection: <Plug className="w-4 h-4" />,
  run_scan: <Play className="w-4 h-4" />,
  view_logs: <FileText className="w-4 h-4" />,
  create_task: <Plus className="w-4 h-4" />,
};

const statusColors: Record<string, string> = {
  needs_setup: "border-gold-border bg-gold-soft",
  needs_config: "border-gold-border bg-gold-soft",
  needs_permissions: "border-gold-border bg-gold-soft",
  integration_down: "border-semantic-danger-border bg-semantic-danger-soft",
  not_implemented: "border-semantic-info-border bg-semantic-info-soft",
  error: "border-semantic-danger-border bg-semantic-danger-soft",
  empty: "border-muted bg-muted/5",
};

const statusIcons: Record<string, React.ReactNode> = {
  needs_setup: <Plug className="w-8 h-8 text-gold" />,
  needs_config: <Settings className="w-8 h-8 text-gold" />,
  needs_permissions: <AlertCircle className="w-8 h-8 text-gold" />,
  integration_down: <AlertCircle className="w-8 h-8 text-semantic-danger" />,
  not_implemented: <HelpCircle className="w-8 h-8 text-semantic-info" />,
  error: <AlertCircle className="w-8 h-8 text-semantic-danger" />,
  empty: <FileText className="w-8 h-8 text-muted-foreground" />,
};

export function NoDeadEndsState({ 
  meta, 
  title,
  onAction, 
  isLoading = false,
  className,
  compact = false,
}: NoDeadEndsStateProps) {
  const [showDetails, setShowDetails] = useState(false);
  
  const primaryAction = meta.actions.find(a => a.priority === 1) || meta.actions[0];
  const secondaryActions = meta.actions.filter(a => a !== primaryAction);

  const handleAction = (action: RemediationAction) => {
    if (onAction) {
      onAction(action);
    } else if (action.kind === "href" && action.href) {
      window.open(action.href, "_blank");
    } else if (action.kind === "route" && action.route) {
      window.location.href = action.route;
    }
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3 p-3 rounded-lg border", statusColors[meta.status], className)}>
        {statusIcons[meta.status]}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{meta.userMessage}</p>
        </div>
        {primaryAction && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAction(primaryAction)}
            disabled={isLoading}
            data-testid={`button-${primaryAction.id}`}
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : iconMap[primaryAction.kind]}
            <span className="ml-1.5">{primaryAction.label}</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className={cn("border-2", statusColors[meta.status], className)} data-testid="no-dead-ends-state">
      <CardContent className="p-6">
        <div className="flex flex-col items-center text-center gap-4">
          {statusIcons[meta.status]}
          
          {title && (
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          )}
          
          <p className="text-sm text-muted-foreground max-w-md">
            {meta.userMessage}
          </p>

          {meta.missingFields && meta.missingFields.length > 0 && (
            <div className="text-xs text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md">
              Missing: {meta.missingFields.join(", ")}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
            {primaryAction && (
              <Button
                onClick={() => handleAction(primaryAction)}
                disabled={isLoading}
                data-testid={`button-${primaryAction.id}`}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <span className="mr-2">{iconMap[primaryAction.kind]}</span>
                )}
                {primaryAction.label}
              </Button>
            )}
            
            {secondaryActions.map(action => (
              <Button
                key={action.id}
                variant="outline"
                size="sm"
                onClick={() => handleAction(action)}
                disabled={isLoading}
                data-testid={`button-${action.id}`}
              >
                {iconMap[action.kind]}
                <span className="ml-1.5">{action.label}</span>
              </Button>
            ))}
          </div>

          {meta.developerMessage && (
            <Collapsible open={showDetails} onOpenChange={setShowDetails} className="w-full mt-4">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                  <ChevronDown className={cn("w-3 h-3 mr-1 transition-transform", showDetails && "rotate-180")} />
                  Why am I seeing this?
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2">
                <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-3 text-left">
                  <p className="font-mono">{meta.reasonCode}</p>
                  <p className="mt-1">{meta.developerMessage}</p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
