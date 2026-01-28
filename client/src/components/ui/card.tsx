import React from "react";

function cx(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(" ");
}

// ============================================
// Standard shadcn/ui Card components
// ============================================

const CardRoot = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cx(
      "rounded-2xl border border-border bg-card shadow-card",
      className
    )}
    {...props}
  />
));
CardRoot.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cx("flex flex-col space-y-1.5 p-6", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cx("font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cx("text-sm text-muted-foreground", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cx("p-6 pt-0", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cx("flex items-center p-6 pt-0", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

// Export standard components
export { CardRoot as Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };

// ============================================
// Custom Arclo Card component (optional alternative API)
// ============================================

type ArcloCardProps = {
  title?: string;
  description?: string;
  rightSlot?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  tone?: "default" | "soft" | "brand";
};

const toneClasses: Record<NonNullable<ArcloCardProps["tone"]>, string> = {
  default: "bg-card",
  soft: "bg-card",
  brand: "bg-card",
};

export function ArcloCard({ title, description, rightSlot, children, footer, className, tone = "default" }: ArcloCardProps) {
  return (
    <div
      className={cx(
        "relative overflow-hidden rounded-2xl border border-border shadow-card",
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
            {title ? <div className="text-sm font-semibold text-foreground">{title}</div> : null}
            {description ? <div className="mt-1 text-xs text-muted-foreground">{description}</div> : null}
          </div>
          {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
        </div>
      ) : null}

      {children ? <div className="px-6 pb-6 pt-5">{children}</div> : null}

      {footer ? <div className="border-t border-border px-6 py-4">{footer}</div> : null}
    </div>
  );
}
