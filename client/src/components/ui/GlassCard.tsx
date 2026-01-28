import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "purple" | "white" | "marketing" | "marketing-accent";
  hover?: boolean;
}

export function GlassCard({
  children,
  className,
  variant = "default",
  hover = false
}: GlassCardProps) {
  const isMarketing = variant === "marketing" || variant === "marketing-accent";

  const variants = {
    default: "bg-white/60 border-white/20",
    purple: "bg-purple-500/10 border-purple-300/20",
    white: "bg-white/80 border-white/30",
    marketing: "",
    "marketing-accent": "",
  };

  if (isMarketing) {
    return (
      <div
        className={cn(
          "rounded-2xl border transition-all duration-200",
          hover && "hover:-translate-y-1 cursor-pointer",
          className
        )}
        style={{
          background: variant === "marketing-accent"
            ? "linear-gradient(180deg, #FAFAFE, #F5F3FF)"
            : "linear-gradient(180deg, #FFFFFF, #F8FAFC)",
          border: variant === "marketing-accent"
            ? "1px solid rgba(124, 58, 237, 0.12)"
            : "1px solid rgba(15, 23, 42, 0.06)",
          boxShadow: hover
            ? undefined
            : "0 20px 40px rgba(15, 23, 42, 0.08)",
        }}
      >
        {children}
      </div>
    );
  }

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
