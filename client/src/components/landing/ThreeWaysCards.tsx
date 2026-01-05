import { Link } from "wouter";
import { FileText, Zap, HeadphonesIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const WAYS = [
  {
    icon: FileText,
    title: "DIY",
    badge: "Free",
    description: "Get the report + a plan for your dev",
    cta: "See what's included",
    href: "#benefits",
  },
  {
    icon: Zap,
    title: "Autopilot",
    badge: "Recommended",
    description: "Arclo monitors and deploys fixes safely",
    cta: "How Autopilot works",
    href: "/how-it-works",
    highlighted: true,
  },
  {
    icon: HeadphonesIcon,
    title: "Done-for-you",
    badge: null,
    description: "We can build/host/manage your site if needed",
    cta: "Talk to us",
    href: "mailto:hello@arclo.io",
  },
];

export function ThreeWaysCards() {
  return (
    <section className="px-5 md:px-6 py-12 md:py-16">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-8">
          Three ways to use Arclo
        </h2>
        
        <div className="grid md:grid-cols-3 gap-4 md:gap-6">
          {WAYS.map((way) => (
            <Card 
              key={way.title} 
              className={`bg-card/50 border-border/50 ${way.highlighted ? 'ring-2 ring-primary' : ''}`}
            >
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-center gap-2 mb-4">
                  <way.icon className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">{way.title}</h3>
                  {way.badge && (
                    <Badge variant={way.highlighted ? "default" : "secondary"} className="ml-auto text-xs">
                      {way.badge}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-6 flex-1">{way.description}</p>
                <Link href={way.href}>
                  <Button 
                    variant={way.highlighted ? "default" : "outline"} 
                    size="sm" 
                    className="w-full"
                    data-testid={`button-${way.title.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {way.cta}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
