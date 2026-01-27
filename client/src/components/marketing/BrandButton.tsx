import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface BrandButtonProps {
  variant?: "primary" | "secondary" | "accent" | "link";
  size?: "sm" | "md" | "lg";
  icon?: LucideIcon;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  "data-testid"?: string;
}

export function BrandButton({
  variant = "primary",
  size = "md",
  icon: Icon,
  children,
  onClick,
  className = "",
  type = "button",
  disabled = false,
  "data-testid": testId,
}: BrandButtonProps) {
  const sizeClasses = {
    sm: "h-10 px-5 text-sm",
    md: "h-12 px-8 text-base",
    lg: "h-14 px-12 text-lg",
  };

  const baseClasses = "inline-flex items-center justify-center font-semibold transition-all duration-200 gap-2 disabled:opacity-50 disabled:pointer-events-none";

  const variantClasses = {
    primary: `
      rounded-xl text-white
      bg-gradient-to-r from-primary via-pink-500 to-gold
      shadow-[0_14px_30px_rgba(139,92,246,0.20)]
      hover:shadow-[0_18px_40px_rgba(236,72,153,0.22)]
      hover:-translate-y-0.5
      focus:outline-none focus:ring-4 focus:ring-primary/20
    `,
    secondary: `
      rounded-xl font-semibold
      bg-gradient-to-r from-primary via-pink-500 to-gold
      bg-clip-text text-transparent
      border border-primary/30
      hover:border-pink-500/40 hover:shadow-[0_8px_20px_rgba(139,92,246,0.12)]
      hover:-translate-y-0.5
      shadow-sm
    `,
    accent: `
      rounded-xl text-white
      bg-gradient-to-r from-success to-info
      shadow-[0_14px_30px_rgba(16,185,129,0.20)]
      hover:shadow-[0_18px_40px_rgba(6,182,212,0.22)]
      hover:-translate-y-0.5
      focus:outline-none focus:ring-4 focus:ring-success/20
    `,
    link: `
      text-brand hover:text-pink-500
      font-medium
    `,
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      style={variant === "primary" || variant === "accent" ? { textShadow: "0 1px 2px rgba(0,0,0,0.15)" } : undefined}
      data-testid={testId}
    >
      {Icon && <Icon className={size === "lg" ? "w-5 h-5" : "w-4 h-4"} />}
      {children}
    </button>
  );
}
