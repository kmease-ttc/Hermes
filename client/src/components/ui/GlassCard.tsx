import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "purple" | "white";
  hover?: boolean;
}

export function GlassCard({
  children,
  className,
  variant = "default",
  hover = false
}: GlassCardProps) {
  const variants = {
    default: "bg-white/60 border-white/20",
    purple: "bg-purple-500/10 border-purple-300/20",
    white: "bg-white/80 border-white/30",
  };

  return (
    <div
      className={cn(
        "backdrop-blur-md rounded-2xl border shadow-lg",
        "transition-all duration-300",
        variants[variant],
        hover && "hover:shadow-xl hover:scale-[1.02] cursor-pointer",
        className
      )}
    >
      {children}
    </div>
  );
}

interface GlassCardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function GlassCardHeader({ children, className }: GlassCardHeaderProps) {
  return (
    <div className={cn("p-6 pb-3", className)}>
      {children}
    </div>
  );
}

interface GlassCardTitleProps {
  children: ReactNode;
  className?: string;
}

export function GlassCardTitle({ children, className }: GlassCardTitleProps) {
  return (
    <h3 className={cn("text-lg font-semibold text-gray-900", className)}>
      {children}
    </h3>
  );
}

interface GlassCardContentProps {
  children: ReactNode;
  className?: string;
}

export function GlassCardContent({ children, className }: GlassCardContentProps) {
  return (
    <div className={cn("p-6 pt-0", className)}>
      {children}
    </div>
  );
}
