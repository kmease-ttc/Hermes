import React from "react";

type ContentShellProps = {
  children: React.ReactNode;
};

export function ContentShell({ children }: ContentShellProps) {
  return (
    <div className="min-h-screen bg-surface-wash text-text-primary">
      {/* soft background wash similar to marketing hero */}
      <div aria-hidden className="pointer-events-none fixed -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-brand-gradient opacity-10 blur-3xl" />
      <div aria-hidden className="pointer-events-none fixed -right-40 -bottom-40 h-[520px] w-[520px] rounded-full bg-brand-gradient opacity-10 blur-3xl" />

      <div className="relative">{children}</div>
    </div>
  );
}
