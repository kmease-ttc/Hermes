import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export interface EmptyStateInlineProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  ctaText?: string;
  onCtaClick?: () => void;
  className?: string;
}

export function EmptyStateInline({
  icon,
  title,
  description,
  ctaText,
  onCtaClick,
  className,
}: EmptyStateInlineProps) {
  return (
    <div
      className={cn(
        "bg-card rounded-xl border border-border p-6 shadow-sm",
        className
      )}
      data-testid="empty-state-inline"
    >
      <div className="flex flex-col items-center text-center">
        {icon && (
          <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center mb-4">
            <span className="text-muted-foreground">{icon}</span>
          </div>
        )}
        <h3 className="text-base font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">{description}</p>
        {ctaText && onCtaClick && (
          <Button
            onClick={onCtaClick}
            variant="outline"
            size="sm"
            className="text-primary border-purple-border hover:bg-purple-soft"
            data-testid="empty-state-cta"
          >
            {ctaText}
          </Button>
        )}
      </div>
    </div>
  );
}
