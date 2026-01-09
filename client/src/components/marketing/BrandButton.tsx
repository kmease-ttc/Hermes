import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface BrandButtonProps {
  variant?: "primary" | "secondary" | "link";
  size?: "sm" | "md" | "lg";
  icon?: LucideIcon;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  "data-testid"?: string;
}

export function BrandButton({
  variant = "primary",
  size = "md",
  icon: Icon,
  children,
  onClick,
  className = "",
  "data-testid": testId,
}: BrandButtonProps) {
  const sizeClasses = {
    sm: "h-10 px-5 text-sm",
    md: "h-12 px-8 text-base",
    lg: "h-14 px-12 text-lg",
  };

  const baseClasses = "inline-flex items-center justify-center font-semibold transition-all duration-200 gap-2";

  const variantClasses = {
    primary: `
      rounded-xl text-white
      bg-gradient-to-r from-violet-500 via-pink-500 to-amber-500
      shadow-[0_14px_30px_rgba(139,92,246,0.20)]
      hover:shadow-[0_18px_40px_rgba(236,72,153,0.22)]
      hover:-translate-y-0.5
      focus:outline-none focus:ring-4 focus:ring-violet-200
    `,
    secondary: `
      rounded-xl text-slate-900 bg-white
      border border-slate-200
      hover:border-slate-300 hover:bg-slate-50
      shadow-sm
    `,
    link: `
      text-violet-600 hover:text-pink-600
      font-medium
    `,
  };

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      style={variant === "primary" ? { textShadow: "0 1px 2px rgba(0,0,0,0.15)" } : undefined}
      data-testid={testId}
    >
      {Icon && <Icon className={size === "lg" ? "w-5 h-5" : "w-4 h-4"} />}
      {children}
    </button>
  );
}
