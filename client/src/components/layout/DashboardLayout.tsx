import React from "react";
import { Footer } from "./Footer";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardLayout({ children, className }: DashboardLayoutProps) {
  return (
    <div className={cn("flex-1 flex flex-col min-w-0", className)}>
      <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
        {children}
      </div>
      <Footer />
    </div>
  );
}
