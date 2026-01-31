import { AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function LimitedVisibilityBanner({ reason, steps }: { reason?: string; steps?: string[] }) {
  return (
    <Card className="bg-gold-soft border-gold-border mb-6" data-testid="limited-visibility-banner">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-gold shrink-0 mt-0.5" />
          <div className="space-y-3">
            <div>
              <h3 className="font-semibold text-foreground">Limited Visibility Report</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {reason || "Technical crawling was blocked or failed. Some sections have limited data."}
              </p>
            </div>
            {steps && steps.length > 0 && (
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Recommended next steps:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {steps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-gold font-bold">{idx + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
