import { Phone, Settings, Zap, Eye, Building2, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const BENEFITS = [
  {
    icon: Phone,
    title: "More calls from Google",
    description: "Show up when customers search for services in your area.",
  },
  {
    icon: Settings,
    title: "SEO and content handled for you",
    description: "No learning curve. We do the work automatically.",
  },
  {
    icon: Zap,
    title: "No tools, no reports, no guessing",
    description: "Just results. We handle the complexity.",
  },
  {
    icon: Eye,
    title: "See every update Arclo makes",
    description: "Full transparency with activity logs.",
  },
  {
    icon: Building2,
    title: "Designed for your industry",
    description: "Templates and content built for local service businesses.",
  },
  {
    icon: RefreshCw,
    title: "Ongoing improvements (not a one-time site)",
    description: "Your site gets better every week.",
  },
];

export function BenefitCards() {
  return (
    <section className="px-4 sm:px-5 md:px-6 py-12 md:py-16">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center text-foreground mb-8 sm:mb-10 tracking-tight">
          Why Local Businesses Choose Arclo
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {BENEFITS.map((benefit) => (
            <Card key={benefit.title} className="bg-gradient-to-b from-card to-muted border border-border shadow-[0_20px_40px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-1" data-testid={`benefit-card-${benefit.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-soft via-pink-100 to-gold-soft border border-border flex items-center justify-center shrink-0">
                    <benefit.icon className="h-5 w-5 text-brand" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-2">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
