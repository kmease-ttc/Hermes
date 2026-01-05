import { Shield, Clock, Lock } from "lucide-react";

const TRUST_ITEMS = [
  { icon: Shield, text: "No credit card" },
  { icon: Clock, text: "30–60 seconds" },
  { icon: Lock, text: "Private by default" },
];

export function TrustRow() {
  return (
    <section className="px-5 md:px-6 py-6 border-y border-border/40 bg-muted/30">
      <div className="max-w-4xl mx-auto flex flex-wrap justify-center gap-6 md:gap-12">
        {TRUST_ITEMS.map((item) => (
          <div key={item.text} className="flex items-center gap-2 text-sm text-muted-foreground">
            <item.icon className="h-4 w-4" />
            <span>{item.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
