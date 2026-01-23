import { Building2, XCircle, Eye, Sparkles, Smartphone } from "lucide-react";

const TRUST_ITEMS = [
  { icon: Building2, text: "Built for local service businesses" },
  { icon: XCircle, text: "Cancel anytime" },
  { icon: Eye, text: "Your changes logged and visible" },
  { icon: Sparkles, text: "SEO best practices, automated" },
  { icon: Smartphone, text: "Fast, mobile-friendly websites" },
];

export function TrustRow() {
  return (
    <section className="px-5 md:px-6 py-6 border-y border-border bg-muted">
      <div className="max-w-5xl mx-auto flex flex-wrap justify-center gap-4 md:gap-8">
        {TRUST_ITEMS.map((item) => (
          <div key={item.text} className="flex items-center gap-2 text-sm text-muted-foreground" data-testid={`trust-item-${item.text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`}>
            <item.icon className="h-4 w-4 text-brand" />
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
