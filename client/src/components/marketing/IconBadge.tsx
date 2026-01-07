import { LucideIcon } from "lucide-react";

interface IconBadgeProps {
  icon: LucideIcon;
  size?: "sm" | "md" | "lg";
}

export function IconBadge({ icon: Icon, size = "lg" }: IconBadgeProps) {
  const sizeClasses = {
    sm: "w-12 h-12 p-2.5",
    md: "w-16 h-16 p-3.5",
    lg: "w-24 h-24 p-5",
  };

  const iconSizes = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  };

  return (
    <div
      className={`${sizeClasses[size]} bg-[#ECFDF5] border border-[#BBF7D0] rounded-2xl shadow-sm flex items-center justify-center`}
    >
      <Icon className={`${iconSizes[size]} text-[#15803D]`} strokeWidth={2} />
    </div>
  );
}
