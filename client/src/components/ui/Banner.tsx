import React from "react";
import { Button } from "@/components/ui/Button";

type BannerProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "warning" | "info";
};

export function Banner({ title, description, actionLabel, onAction, tone = "info" }: BannerProps) {
  const shell =
    tone === "warning"
      ? "border-brand-orange/30 bg-brand-orange/10"
      : "border-brand-purple/25 bg-brand-purple/10";

  return (
    <div className={`flex items-center justify-between gap-4 rounded-2xl border px-6 py-5 shadow-card ${shell}`}>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-text-primary">{title}</div>
        {description ? <div className="mt-1 text-sm text-text-secondary">{description}</div> : null}
      </div>
      {actionLabel && onAction ? (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
