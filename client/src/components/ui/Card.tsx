import React from "react";

type CardProps = {
  title?: string;
  description?: string;
  rightSlot?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  tone?: "default" | "soft" | "brand";
};

function cx(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const toneClasses: Record<NonNullable<CardProps["tone"]>, string> = {
  default: "bg-surface-primary",
  soft: "bg-surface-primary",
  brand: "bg-surface-primary",
};

export function Card({ title, description, rightSlot, children, footer, className, tone = "default" }: CardProps) {
  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-2xl border border-surface-border shadow-card",
        "transition-shadow hover:shadow-cardHover",
        toneClasses[tone],
        className
      )}
    >
      {tone === "brand" ? (
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-brand-gradient" />
      ) : null}

      {(title || description || rightSlot) ? (
        <div className="flex items-start justify-between gap-4 px-6 pt-6">
          <div className="min-w-0">
            {title ? <div className="text-sm font-semibold text-text-primary">{title}</div> : null}
            {description ? <div className="mt-1 text-xs text-text-secondary">{description}</div> : null}
          </div>
          {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
        </div>
      ) : null}

      {children ? <div className="px-6 pb-6 pt-5">{children}</div> : null}

      {footer ? <div className="border-t border-surface-border px-6 py-4">{footer}</div> : null}
    </div>
  );
}
