import { LucideIcon } from "lucide-react";

interface IconBadgeProps {
  icon: LucideIcon;
  size?: "sm" | "md" | "lg";
}

export function IconBadge({ icon: Icon, size = "lg" }: IconBadgeProps) {
  const sizeClasses = {
    sm: "w-14 h-14 p-3",
    md: "w-18 h-18 p-4",
    lg: "w-24 h-24 p-5",
  };

  const iconSizes = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-12 h-12",
  };

  return (
    <div
      className={`${sizeClasses[size]} rounded-2xl shadow-[0_8px_24px_rgba(139,92,246,0.12)] flex items-center justify-center bg-gradient-to-br from-primary/20 via-pink-100 to-gold/20 border border-border`}
    >
      <Icon className={`${iconSizes[size]} text-brand`} strokeWidth={2} />
    </div>
  );
}
