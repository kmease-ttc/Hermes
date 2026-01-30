import * as React from "react";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface UnlockOverlayProps {
  feature: string;
  onUnlock: () => void;
  description?: string;
  className?: string;
}

const FEATURE_DESCRIPTIONS: Record<string, string> = {
  "Competitive Intelligence": "Track competitor rankings, content gaps, and market positioning.",
  "AI Optimization": "Optimize your site for AI assistants and LLM discovery.",
  "Paid Ads": "Monitor ad spend, conversions, and campaign performance.",
  "Content Strategy": "Get AI-powered content recommendations and topic analysis.",
  "Domain Authority": "Track backlinks, domain authority, and link velocity.",
  "Knowledge Base": "Consolidate insights from all agents into searchable learnings.",
};

export function UnlockOverlay({
  feature,
  onUnlock,
  description,
  className,
}: UnlockOverlayProps) {
  const featureDescription = description || FEATURE_DESCRIPTIONS[feature] || 
    `Unlock ${feature} to access this capability.`;

  return (
    <div
      className={cn(
        "absolute inset-0 z-10 flex items-center justify-center",
        "bg-gradient-to-br from-violet-950/95 via-background/95 to-purple-950/95",
        "backdrop-blur-sm rounded-xl border border-purple-border",
        className
      )}
      data-testid={`unlock-overlay-${feature.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="text-center px-6 py-4 max-w-xs">
        <div className="w-12 h-12 rounded-full bg-purple-soft flex items-center justify-center mx-auto mb-4 ring-2 ring-purple-border">
          <Lock className="w-5 h-5 text-purple" />
        </div>
        <h3 className="text-lg font-semibold mb-2 flex items-center justify-center gap-2" style={{ color: "#FFFFFF" }}>
          <Sparkles className="w-4 h-4 text-purple" />
          Unlock {feature}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {featureDescription}
        </p>
        <Button
          onClick={onUnlock}
          variant="purple"
          size="sm"
          className="shadow-lg shadow-purple-glow"
          data-testid={`unlock-button-${feature.toLowerCase().replace(/\s+/g, '-')}`}
        >
          Unlock
        </Button>
      </div>
    </div>
  );
}
