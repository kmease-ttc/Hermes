import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@shared/routes";
import { Wrench, Wind, Stethoscope, Trees, ExternalLink } from "lucide-react";

const EXAMPLES = [
  {
    id: "plumbing",
    industry: "Plumbing",
    city: "Austin, TX",
    icon: Wrench,
    color: "from-info to-info",
    bgColor: "bg-info-soft",
  },
  {
    id: "hvac",
    industry: "HVAC",
    city: "Denver, CO",
    icon: Wind,
    color: "from-gold to-gold",
    bgColor: "bg-gold-soft",
  },
  {
    id: "dental",
    industry: "Dental Clinic",
    city: "Seattle, WA",
    icon: Stethoscope,
    color: "from-success to-success",
    bgColor: "bg-success-soft",
  },
  {
    id: "landscaping",
    industry: "Landscaping",
    city: "Phoenix, AZ",
    icon: Trees,
    color: "from-success to-success",
    bgColor: "bg-success-soft",
  },
];

export function ExamplesPreview() {
  return (
    <section className="px-5 md:px-6 py-12 md:py-16">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-4 tracking-tight">
          See What Arclo Builds
        </h2>
        <p className="text-center text-muted-foreground mb-10 max-w-xl mx-auto">
          Real examples of websites generated for local businesses.
        </p>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {EXAMPLES.map((example) => (
            <Card 
              key={example.id}
              className="bg-card border border-border shadow-[0_20px_40px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-1 overflow-hidden"
              data-testid={`card-example-${example.id}`}
            >
              <div className={`h-32 ${example.bgColor} flex items-center justify-center`}>
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${example.color} flex items-center justify-center`}>
                  <example.icon className="h-8 w-8 text-white" />
                </div>
              </div>
              <CardContent className="p-4 text-center">
                <h3 className="font-semibold text-foreground mb-1">{example.industry}</h3>
                <p className="text-sm text-muted-foreground mb-3">{example.city}</p>
                <Link href={`${ROUTES.EXAMPLES}?demo=${example.id}`}>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:opacity-80 cursor-pointer">
                    View demo <ExternalLink className="h-3 w-3" />
                  </span>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="text-center mt-8">
          <Link href={ROUTES.EXAMPLES}>
            <span className="text-sm font-medium text-brand hover:opacity-80 underline-offset-2 hover:underline cursor-pointer" data-testid="link-see-all-examples">
              See all examples →
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
