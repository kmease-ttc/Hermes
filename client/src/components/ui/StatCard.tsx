import React from "react";
import { Card } from "@/components/ui/Card";

type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  tone?: "default" | "soft" | "brand";
};

export function StatCard({ label, value, hint, icon, tone = "soft" }: StatCardProps) {
  return (
    <Card tone={tone}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-text-secondary">
            {label}
          </div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-text-primary">
            {value}
          </div>
          {hint ? <div className="mt-1 text-xs text-text-secondary">{hint}</div> : null}
        </div>
        {icon ? (
          <div className="rounded-xl bg-surface-primary p-2 shadow-sm ring-1 ring-surface-border">
            {icon}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
