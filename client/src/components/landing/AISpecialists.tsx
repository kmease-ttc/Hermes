import { Link } from "wouter";
import { Wrench, Users, Gauge, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BrandButton } from "@/components/marketing/BrandButton";

const SPECIALISTS = [
  {
    icon: Wrench,
    title: "Technical SEO",
    description: "Finds and explains structural issues",
  },
  {
    icon: Users,
    title: "Competitive Intelligence",
    description: "Shows why competitors outrank you",
  },
  {
    icon: Gauge,
    title: "Performance Monitor",
    description: "Flags speed and UX problems",
  },
  {
    icon: TrendingDown,
    title: "Content Decay Monitor",
    description: "Detects pages losing traffic",
  },
];

export function AISpecialists() {
  return (
    <section className="px-5 md:px-6 py-12 md:py-16 bg-muted">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-3 tracking-tight">
          Turn insights into action with <span className="marketing-gradient-text">AI specialists.</span>
        </h2>
        <p className="text-center text-muted-foreground mb-10 max-w-xl mx-auto">
          Enable only the capabilities you need — from technical SEO to competitive intelligence to automated execution.
        </p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {SPECIALISTS.map((specialist) => (
            <Card key={specialist.title} className="bg-card border border-border shadow-[0_20px_40px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-1">
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 rounded-lg bg-brand-soft border border-border flex items-center justify-center mx-auto mb-3">
                  <specialist.icon className="h-5 w-5 text-brand" />
                </div>
                <h3 className="font-medium text-foreground text-sm mb-1">{specialist.title}</h3>
                <p className="text-xs text-muted-foreground">{specialist.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="text-center mt-8">
          <Link href="/app/crew">
            <BrandButton variant="primary" size="md" data-testid="button-staff-crew">
              Staff your AI crew
            </BrandButton>
          </Link>
        </div>
      </div>
    </section>
  );
}
