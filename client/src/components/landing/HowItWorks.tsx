import { Card, CardContent } from "@/components/ui/card";

const STEPS = [
  {
    number: "1",
    title: "Scan",
    description: "Enter your website. Arclo analyzes everything it can without setup.",
  },
  {
    number: "2",
    title: "Understand",
    description: "Review a clear report that explains what's holding you back.",
  },
  {
    number: "3",
    title: "Execute",
    description: "Copy recommendations, or automate changes with integrations.",
  },
];

export function HowItWorks() {
  return (
    <section className="px-5 md:px-6 py-12 md:py-16">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-10">
          How It Works
        </h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map((step) => (
            <Card key={step.number} className="bg-card/50 border-border/50 text-center">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-primary">{step.number}</span>
                </div>
                <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
