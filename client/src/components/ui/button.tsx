import React from "react";

type ButtonVariant = "primary" | "primaryGradient" | "secondary" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
};

function cx(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(" ");
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-sm rounded-lg",
  md: "px-4 py-2 text-sm rounded-xl",
  lg: "px-5 py-2.5 text-base rounded-2xl",
};

export function Button({
  variant = "secondary",
  size = "md",
  fullWidth,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2";

  const styles: Record<ButtonVariant, string> = {
    primary:
      "bg-primary text-primary-foreground shadow-card hover:opacity-95 focus:ring-primary/60 focus:ring-offset-background",
    primaryGradient:
      "bg-gradient-to-r from-[#15803D] to-[#0EA5E9] text-white shadow-card hover:opacity-90 focus:ring-[#15803D]/50 focus:ring-offset-background",
    secondary:
      "bg-secondary text-foreground shadow-card ring-1 ring-border hover:bg-accent focus:ring-primary/50 focus:ring-offset-background",
    ghost:
      "text-foreground hover:bg-accent focus:ring-primary/50 focus:ring-offset-background",
    danger:
      "bg-red-600 text-white hover:bg-red-700 focus:ring-red-400/60 focus:ring-offset-background",
    outline:
      "bg-transparent text-foreground ring-1 ring-border hover:bg-accent focus:ring-primary/50 focus:ring-offset-background",
  };

  return (
    <button
      {...props}
      disabled={disabled}
      className={cx(
        base,
        sizeClasses[size],
        styles[variant],
        fullWidth && "w-full",
        disabled && "opacity-60 cursor-not-allowed",
        className
      )}
    />
  );
}
