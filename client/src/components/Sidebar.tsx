import React from "react";
import { NavLink, useLocation } from "react-router-dom";

type NavItem = {
  label: string;
  to: string;
  icon?: React.ReactNode;
};

const navItems: NavItem[] = [
  { label: "Overview", to: "/app/overview" },
  { label: "Rankings", to: "/app/rankings" },
  { label: "Technical SEO", to: "/app/technical-seo" },
  { label: "Automation", to: "/app/automation" },
  { label: "Settings", to: "/app/settings" },
];

function cx(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export function Sidebar() {
  const location = useLocation();

  return (
    <aside className="sticky top-0 flex h-screen w-72 flex-col border-r border-surface-border bg-surface-nav text-text-inverse">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-sm">
          <span className="text-base font-bold">A</span>
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">Arclo</div>
          <div className="truncate text-xs text-text-inverse/70">Autonomous SEO</div>
        </div>
      </div>

      <div className="px-5">
        <div className="h-px bg-text-inverse/10" />
      </div>

      <div className="px-5 py-4">
        <button
          type="button"
          className={cx(
            "w-full rounded-xl border border-text-inverse/15 bg-surface-navElevated px-4 py-3",
            "text-left text-sm text-text-inverse shadow-sm",
            "hover:border-text-inverse/25 hover:bg-surface-navElevatedHover",
            "focus:outline-none focus:ring-2 focus:ring-brand-pink/60 focus:ring-offset-2 focus:ring-offset-surface-nav"
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate font-medium">Empathy Health Clinic</div>
              <div className="truncate text-xs text-text-inverse/70">Local · Orlando, FL</div>
            </div>
            <span className="text-text-inverse/70">▾</span>
          </div>
        </button>
      </div>

      <nav className="flex-1 px-3 pb-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              location.pathname === item.to ||
              location.pathname.startsWith(item.to + "/");

            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={() =>
                    cx(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                      isActive
                        ? "bg-text-inverse/10 text-text-inverse"
                        : "text-text-inverse/80 hover:bg-text-inverse/10 hover:text-text-inverse",
                      "focus:outline-none focus:ring-2 focus:ring-brand-orange/60 focus:ring-offset-2 focus:ring-offset-surface-nav"
                    )
                  }
                >
                  <span className="h-2 w-2 rounded-full bg-brand-gradient opacity-90" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-5 py-4">
        <div className="rounded-xl border border-text-inverse/15 bg-surface-navElevated p-4">
          <div className="text-xs font-medium text-text-inverse">Need help?</div>
          <div className="mt-1 text-xs text-text-inverse/70">
            Check PRD_INDEX.md for the system map.
          </div>
          <button
            type="button"
            className={cx(
              "mt-3 w-full rounded-lg bg-brand-gradient px-3 py-2 text-sm font-medium text-white",
              "shadow-sm hover:opacity-95",
              "focus:outline-none focus:ring-2 focus:ring-white/70 focus:ring-offset-2 focus:ring-offset-surface-nav"
            )}
            onClick={() => window.open("/PRD_INDEX.md", "_blank")}
          >
            Start here
          </button>
        </div>
      </div>
    </aside>
  );
}
