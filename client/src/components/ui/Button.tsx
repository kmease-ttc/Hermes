import React from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  fullWidth?: boolean;
};

function cx(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function Button({
  variant = "secondary",
  fullWidth,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2";

  const styles: Record<ButtonVariant, string> = {
    primary:
      "bg-brand-gradient text-white shadow-sm hover:opacity-95 focus:ring-brand-pink/60 focus:ring-offset-surface-primary",
    secondary:
      "border border-surface-border bg-surface-primary text-text-primary hover:bg-surface-soft focus:ring-brand-orange/50 focus:ring-offset-surface-primary",
    ghost:
      "text-text-primary hover:bg-surface-soft focus:ring-brand-orange/50 focus:ring-offset-surface-primary",
    danger:
      "bg-destructive text-white hover:bg-destructive/90 focus:ring-destructive/60 focus:ring-offset-surface-primary",
  };

  return (
    <button
      {...props}
      disabled={disabled}
      className={cx(
        base,
        styles[variant],
        fullWidth && "w-full",
        disabled && "opacity-60 cursor-not-allowed",
        className
      )}
    />
  );
}
