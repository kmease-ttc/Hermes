import React from "react";
import { Card } from "@/components/ui/Card";

type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ReactNode;
  tone?: "default" | "brand";
  accent?: "purple" | "pink" | "orange" | "green" | "blue";
};

const accentRing: Record<NonNullable<StatCardProps["accent"]>, string> = {
  purple: "ring-brand-purple/25",
  pink: "ring-brand-pink/25",
  orange: "ring-brand-orange/25",
  green: "ring-brand-green/25",
  blue: "ring-brand-blue/25",
};

const accentBg: Record<NonNullable<StatCardProps["accent"]>, string> = {
  purple: "bg-brand-purple/10",
  pink: "bg-brand-pink/10",
  orange: "bg-brand-orange/10",
  green: "bg-brand-green/10",
  blue: "bg-brand-blue/10",
};

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "default",
  accent = "purple",
}: StatCardProps) {
  return (
    <Card tone={tone === "brand" ? "brand" : "default"}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            {label}
          </div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-text-primary">
            {value}
          </div>
          {hint ? <div className="mt-1 text-xs text-text-secondary">{hint}</div> : null}
        </div>

        {icon ? (
          <div className={`rounded-xl p-2 shadow-sm ring-1 ${accentRing[accent]} ${accentBg[accent]}`}>
            {icon}
          </div>
        ) : null}
      </div>
    </Card>
  );
}
