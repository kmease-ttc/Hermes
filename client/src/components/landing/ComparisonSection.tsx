import { Check, X, Minus } from "lucide-react";

const COMPARISON_ROWS = [
  {
    label: "Skill required",
    diy: "High – you learn SEO",
    agency: "None – they do it",
    arclo: "None – we do it",
  },
  {
    label: "Time required",
    diy: "10+ hrs/week",
    agency: "Meetings & approvals",
    arclo: "Minutes to setup",
  },
  {
    label: "Transparency",
    diy: "You see everything",
    agency: "Monthly reports",
    arclo: "Real-time activity log",
  },
  {
    label: "Ongoing optimization",
    diy: "Only if you keep working",
    agency: "Depends on contract",
    arclo: "Automatic weekly",
  },
];

export function ComparisonSection() {
  return (
    <section className="px-4 sm:px-5 md:px-6 py-12 md:py-16 bg-muted/50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-foreground mb-4 tracking-tight">
          Why Arclo?
        </h2>
        <p className="text-center text-sm sm:text-base text-muted-foreground mb-8 sm:mb-10 max-w-xl mx-auto">
          Compare your options for getting found on Google.
        </p>

        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full border-collapse bg-card rounded-xl overflow-hidden shadow-[0_20px_40px_rgba(15,23,42,0.08)] min-w-[520px]">
            <thead>
              <tr className="border-b border-border">
                <th className="p-3 sm:p-4 text-left text-xs sm:text-sm font-medium text-muted-foreground"></th>
                <th className="p-3 sm:p-4 text-center text-xs sm:text-sm font-semibold text-foreground">DIY Tools</th>
                <th className="p-3 sm:p-4 text-center text-xs sm:text-sm font-semibold text-foreground">SEO Agencies</th>
                <th className="p-3 sm:p-4 text-center">
                  <span className="inline-block px-3 py-1 rounded-full text-xs sm:text-sm font-semibold" style={{ background: "linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B)", color: "#FFFFFF" }}>
                    Arclo
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, index) => (
                <tr
                  key={row.label}
                  className={index < COMPARISON_ROWS.length - 1 ? "border-b border-border" : ""}
                  data-testid={`row-comparison-${index}`}
                >
                  <td className="p-3 sm:p-4 text-xs sm:text-sm font-medium text-foreground">{row.label}</td>
                  <td className="p-3 sm:p-4 text-center text-xs sm:text-sm text-muted-foreground">{row.diy}</td>
                  <td className="p-3 sm:p-4 text-center text-xs sm:text-sm text-muted-foreground">{row.agency}</td>
                  <td className="p-3 sm:p-4 text-center text-xs sm:text-sm font-medium text-brand">{row.arclo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile card layout */}
        <div className="sm:hidden space-y-4">
          {COMPARISON_ROWS.map((row, index) => (
            <div
              key={row.label}
              className="bg-card rounded-xl p-4 shadow-sm border border-border"
              data-testid={`row-comparison-mobile-${index}`}
            >
              <h3 className="text-sm font-semibold text-foreground mb-3">{row.label}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-start">
                  <span className="text-muted-foreground">DIY Tools</span>
                  <span className="text-right text-muted-foreground max-w-[55%]">{row.diy}</span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-muted-foreground">SEO Agencies</span>
                  <span className="text-right text-muted-foreground max-w-[55%]">{row.agency}</span>
                </div>
                <div className="flex justify-between items-start pt-2 border-t border-border">
                  <span className="font-semibold text-white text-xs px-2 py-0.5 rounded-full" style={{ background: "linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B)" }}>Arclo</span>
                  <span className="text-right font-medium text-brand max-w-[55%]">{row.arclo}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
