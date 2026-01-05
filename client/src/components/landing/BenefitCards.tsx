import { Wrench, Target, Users, ListOrdered } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const BENEFITS = [
  {
    icon: Wrench,
    title: "Technical SEO Health",
    description: "Finds crawl issues, metadata gaps, and structural problems that block rankings.",
    example: '"12 pages missing meta descriptions."',
  },
  {
    icon: Target,
    title: "Keyword Opportunities",
    description: "Identifies the keywords your site should rank for based on your content and market.",
    example: '"You should be visible for \'Austin landscaping services\'."',
  },
  {
    icon: Users,
    title: "Competitor Gaps",
    description: "Automatically discovers competitors and shows where they outperform you.",
    example: '"Competitor X ranks for 18 keywords you don\'t."',
  },
  {
    icon: ListOrdered,
    title: "Priority Action Plan",
    description: "A ranked list of fixes and opportunities based on impact.",
    example: '"Fix page speed on /services for highest gain."',
  },
];

export function BenefitCards() {
  return (
    <section className="px-5 md:px-6 py-12 md:py-16">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-10">
          What the Free Scan Includes
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {BENEFITS.map((benefit) => (
            <Card key={benefit.title} className="bg-card/50 border-border/50">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <benefit.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground mb-2">{benefit.title}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{benefit.description}</p>
                    <p className="text-sm text-primary/80 italic">{benefit.example}</p>
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
