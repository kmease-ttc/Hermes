import { Globe, CreditCard, Plug, Building2 } from "lucide-react";

const TRUST_ITEMS = [
  { icon: Globe, text: "Works with any public website" },
  { icon: CreditCard, text: "No credit card required" },
  { icon: Plug, text: "No GA4 or Search Console needed" },
  { icon: Building2, text: "Built for small & medium businesses" },
];

export function TrustRow() {
  return (
    <section className="px-5 md:px-6 py-6 border-y border-border/40 bg-muted/30">
      <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-4 md:gap-8">
        {TRUST_ITEMS.map((item) => (
          <div key={item.text} className="flex items-center gap-2 text-sm text-muted-foreground">
            <item.icon className="h-4 w-4 text-semantic-success" />
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
