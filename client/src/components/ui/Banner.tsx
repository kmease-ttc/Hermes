import React from "react";
import { Button } from "@/components/ui/Button";

type BannerProps = {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "info" | "warning";
};

export function Banner({ title, description, actionLabel, onAction, tone = "info" }: BannerProps) {
  const styles =
    tone === "warning"
      ? "bg-amber-50 border-amber-200"
      : "bg-violet-50 border-violet-200";

  return (
    <div className={`flex items-center justify-between gap-4 rounded-2xl border px-6 py-5 ${styles}`}>
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
