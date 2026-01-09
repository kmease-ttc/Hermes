import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { BrandButton } from "@/components/marketing/BrandButton";
import { ROUTES } from "@shared/routes";

const STEPS = [
  {
    number: "1",
    title: "Answer 6 quick questions",
    description: "Tell us about your business, services, and location.",
  },
  {
    number: "2",
    title: "Arclo generates your site",
    description: "Get a professional, SEO-ready website in under 60 seconds.",
  },
  {
    number: "3",
    title: "Arclo improves it every week",
    description: "We continuously optimize your content and SEO.",
  },
];

export function HowItWorks() {
  return (
    <section className="px-5 md:px-6 py-12 md:py-16 bg-slate-50/50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-slate-950 mb-10 tracking-tight">
          How It Works
        </h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          {STEPS.map((step) => (
            <Card key={step.number} className="bg-gradient-to-b from-white to-slate-50 border border-slate-100 text-center shadow-[0_20px_40px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-1" data-testid={`step-card-${step.number}`}>
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 via-pink-500 to-amber-400 flex items-center justify-center mx-auto mb-4">
                  <span className="text-xl font-bold text-white">{step.number}</span>
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-500">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <p className="text-center text-sm text-slate-500 mt-8 mb-6">
          You can review major changes before they go live (optional).
        </p>
        
        <div className="text-center">
          <Link href={ROUTES.WEBSITE_GENERATOR}>
            <BrandButton 
              variant="primary"
              size="lg"
              data-testid="button-generate-site-cta"
            >
              Generate My Site
            </BrandButton>
          </Link>
        </div>
      </div>
    </section>
  );
}
