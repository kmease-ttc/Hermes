import { Search, ListOrdered, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const BENEFITS = [
  {
    icon: Search,
    title: "Diagnosis",
    description: "Top issues holding back traffic",
  },
  {
    icon: ListOrdered,
    title: "Prioritized Fixes",
    description: "What to fix first, and why",
  },
  {
    icon: Users,
    title: "Competitive Snapshot",
    description: "Who's outranking you and where",
  },
];

export function BenefitCards() {
  return (
    <section className="px-5 md:px-6 py-12 md:py-16">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-8">
          What you get
        </h2>
        <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          {BENEFITS.map((benefit) => (
            <Card key={benefit.title} className="bg-card/50 border-border/50">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground">{benefit.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
