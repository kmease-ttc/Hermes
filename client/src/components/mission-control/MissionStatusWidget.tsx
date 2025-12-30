import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Loader2,
  ArrowRight,
  ExternalLink,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";

interface MissionStatusWidgetProps {
  priorities: Array<{
    id?: string;
    title: string;
    impact?: string;
    effort?: string;
    agents?: any[];
    status?: string;
  }>;
  blockers: Array<{
    id: string;
    title: string;
    fix: string;
  }>;
  missingIntegrations?: number;
  siteId: string;
}

type StatusTier = "looking_good" | "doing_okay" | "needs_attention";

interface FixCategory {
  name: string;
  count: number;
}

export function MissionStatusWidget({
  priorities,
  blockers,
  missingIntegrations = 0,
  siteId,
}: MissionStatusWidgetProps) {
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [lastPrResult, setLastPrResult] = useState<{ url?: string } | null>(null);

  const statusTier: StatusTier =
    blockers.length > 0
      ? "needs_attention"
      : priorities.length > 0
      ? "doing_okay"
      : "looking_good";

  const statusConfig = {
    looking_good: {
      label: "Looking good",
      icon: CheckCircle2,
      badgeClass: "bg-semantic-success-soft text-semantic-success border-semantic-success-border",
    },
    doing_okay: {
      label: "Doing okay",
      icon: CheckCircle2,
      badgeClass: "bg-semantic-info-soft text-semantic-info border-semantic-info-border",
    },
    needs_attention: {
      label: "Needs attention",
      icon: AlertTriangle,
      badgeClass: "bg-semantic-warning-soft text-semantic-warning border-semantic-warning-border",
    },
  };

  const config = statusConfig[statusTier];
  const StatusIcon = config.icon;

  const summaryParts: string[] = [];
  if (priorities.length > 0) {
    summaryParts.push(`${priorities.length} priority action${priorities.length !== 1 ? "s" : ""}`);
  }
  if (blockers.length > 0) {
    summaryParts.push(`${blockers.length} blocker${blockers.length !== 1 ? "s" : ""}`);
  }
  if (missingIntegrations > 0) {
    summaryParts.push(`${missingIntegrations} integration${missingIntegrations !== 1 ? "s" : ""} missing`);
  }
  const summaryLine = summaryParts.length > 0 ? summaryParts.join(" • ") : "All systems operational";

  const getNextStep = (): string => {
    if (blockers.length > 0) {
      return `Resolve blocker: ${blockers[0].title}`;
    }
    if (priorities.length > 0) {
      return `Complete: ${priorities[0].title}`;
    }
    return "Run diagnostics to discover new opportunities";
  };

  const getAutoFixableItems = () => {
    const autoFixable = priorities.filter(p => 
      p.impact !== "High" || p.effort === "S"
    );
    return autoFixable;
  };

  const autoFixableItems = getAutoFixableItems();

  const getFixCategories = (): FixCategory[] => {
    const categories: Record<string, number> = {};
    autoFixableItems.forEach(p => {
      const category = p.title.toLowerCase().includes("meta") ? "Metadata" :
                       p.title.toLowerCase().includes("link") ? "Internal links" :
                       p.title.toLowerCase().includes("sitemap") ? "Sitemap" :
                       p.title.toLowerCase().includes("performance") || p.title.toLowerCase().includes("speed") ? "Performance" :
                       p.title.toLowerCase().includes("image") ? "Images" :
                       "Other fixes";
      categories[category] = (categories[category] || 0) + 1;
    });
    return Object.entries(categories).map(([name, count]) => ({ name, count }));
  };

  const nonAutoFixableCount = priorities.length - autoFixableItems.length;

  const fixEverything = useMutation({
    mutationFn: async () => {
      if (autoFixableItems.length === 0) {
        throw new Error("No auto-fixable items available");
      }
      const res = await fetch("/api/fix/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          fixes: autoFixableItems.map((p, idx) => ({
            id: p.id || `fix-${idx}`,
            title: p.title,
            type: "auto",
          })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || data.message || "Failed to start fixes");
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success("Fix set created");
      setLastPrResult(data);
      setConfirmModalOpen(false);
    },
    onError: (error: Error) => {
      toast.error(`Couldn't start fixes: ${error.message}`);
    },
  });

  const fixCategories = getFixCategories();

  return (
    <>
      <Card
        className="bg-card/60 backdrop-blur-md border-border rounded-2xl overflow-hidden"
        style={{
          boxShadow: "inset 0 1px 0 0 rgba(255,255,255,0.05), 0 4px 24px -8px rgba(0,0,0,0.3)",
        }}
        data-testid="mission-status-widget"
      >
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-lg font-semibold text-foreground">Mission Status</h2>
                <Badge
                  variant="outline"
                  className={cn("text-xs px-2.5 py-0.5 border", config.badgeClass)}
                >
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {config.label}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground mb-1">{summaryLine}</p>

              <div className="flex items-center gap-1.5 text-sm">
                <ArrowRight className="w-3.5 h-3.5 text-primary" />
                <span className="text-foreground font-medium">Next:</span>
                <span className="text-muted-foreground truncate">{getNextStep()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {lastPrResult?.url ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border text-foreground hover:bg-muted rounded-xl"
                  onClick={() => window.open(lastPrResult.url, "_blank")}
                  data-testid="button-view-pr"
                >
                  <ExternalLink className="w-4 h-4 mr-1.5" />
                  View PR
                </Button>
              ) : (
                <Button
                  variant="gold"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => setConfirmModalOpen(true)}
                  disabled={fixEverything.isPending || autoFixableItems.length === 0}
                  data-testid="button-fix-everything"
                >
                  {fixEverything.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : (
                    <Wrench className="w-4 h-4 mr-1.5" />
                  )}
                  Fix Everything
                </Button>
              )}

            </div>
          </div>

          {nonAutoFixableCount > 0 && (
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Some items require setup ({nonAutoFixableCount})
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmModalOpen} onOpenChange={setConfirmModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-gold" />
              Confirm Fix Everything
            </DialogTitle>
            <DialogDescription>
              This will create a GitHub PR with the following changes:
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            {fixCategories.map((cat) => (
              <div
                key={cat.name}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-foreground">{cat.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {cat.count}
                </Badge>
              </div>
            ))}

            {fixCategories.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">
                No auto-fixable items found
              </p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmModalOpen(false)}
              className="rounded-xl"
              data-testid="button-cancel-fix"
            >
              Cancel
            </Button>
            <Button
              variant="gold"
              onClick={() => fixEverything.mutate()}
              disabled={fixEverything.isPending || fixCategories.length === 0}
              className="rounded-xl"
              data-testid="button-confirm-fix"
            >
              {fixEverything.isPending ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
