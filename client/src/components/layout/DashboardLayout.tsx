import React from "react";
import { Footer } from "./Footer";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
        {children}
      </div>
      <Footer />
    </div>
  );
}
