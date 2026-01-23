import { ReactNode } from "react";

interface MarketingCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
}

export function MarketingCard({ children, className = "", hover = true }: MarketingCardProps) {
  return (
    <div
      className={`
        rounded-2xl p-8
        ${hover ? "transition-all duration-200 hover:-translate-y-1" : ""}
        ${className}
      `}
      style={{
        background: "linear-gradient(180deg, #FFFFFF, #F8FAFC)",
        border: "1px solid rgba(15, 23, 42, 0.06)",
        boxShadow: "0 20px 40px rgba(15, 23, 42, 0.08)",
      }}
    >
      {children}
    </div>
  );
}

interface MarketingCalloutProps {
  children: ReactNode;
  variant?: "brand" | "muted";
  className?: string;
}

export function MarketingCallout({ children, variant = "brand", className = "" }: MarketingCalloutProps) {
  const variants = {
    brand: "bg-purple-soft border-purple",
    muted: "bg-muted border-border",
  };

  return (
    <div className={`rounded-2xl p-8 border ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
}
