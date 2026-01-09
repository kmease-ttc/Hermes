import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ROUTES } from "@shared/routes";
import { Check, Zap, Building2, Rocket } from "lucide-react";

const plans = [
  {
    name: "Starter",
    price: "$99",
    period: "/month",
    description: "Perfect for small businesses getting started with SEO",
    icon: Zap,
    features: [
      "1 website",
      "Weekly automated scans",
      "Basic issue detection",
      "Email reports",
      "Core Web Vitals monitoring",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Professional",
    price: "$299",
    period: "/month",
    description: "For growing businesses that need comprehensive SEO",
    icon: Rocket,
    features: [
      "Up to 5 websites",
      "Daily automated scans",
      "Advanced issue detection & auto-fix",
      "Priority support",
      "Competitor tracking",
      "Content optimization",
      "Backlink monitoring",
    ],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For agencies and large organizations",
    icon: Building2,
    features: [
      "Unlimited websites",
      "Real-time monitoring",
      "Full autonomous SEO",
      "Dedicated account manager",
      "Custom integrations",
      "White-label reports",
      "SLA guarantees",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function Pricing() {
  return (
    <MarketingLayout>
      <div 
        className="min-h-screen"
        style={{
          background: `
            radial-gradient(1200px circle at 10% 0%, rgba(139, 92, 246, 0.06), transparent 40%),
            radial-gradient(1200px circle at 90% 10%, rgba(236, 72, 153, 0.04), transparent 40%),
            radial-gradient(800px circle at 50% 80%, rgba(245, 158, 11, 0.03), transparent 40%),
            #FFFFFF
          `
        }}
      >
        <div className="container mx-auto px-4 md:px-6 py-16 md:py-24">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-6xl font-bold text-[#020617] mb-6 tracking-tight">
                Simple,{" "}
                <span 
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: "linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B)"
                  }}
                >
                  transparent
                </span>
                {" "}pricing
              </h1>
              <p className="text-xl text-[#334155] max-w-2xl mx-auto">
                Choose the plan that fits your needs. All plans include our core autonomous SEO features.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-20">
              {plans.map((plan) => (
                <div 
                  key={plan.name}
                  className={`rounded-2xl p-8 transition-all duration-200 hover:-translate-y-1 relative ${
                    plan.popular ? "ring-2 ring-violet-500" : ""
                  }`}
                  style={{
                    background: "linear-gradient(180deg, #FFFFFF, #F8FAFC)",
                    border: plan.popular ? "none" : "1px solid rgba(15, 23, 42, 0.06)",
                    boxShadow: plan.popular 
                      ? "0 25px 50px rgba(139, 92, 246, 0.15)"
                      : "0 20px 40px rgba(15, 23, 42, 0.08)"
                  }}
                  data-testid={`pricing-card-${plan.name.toLowerCase()}`}
                >
                  {plan.popular && (
                    <div 
                      className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-white text-sm font-medium"
                      style={{
                        background: "linear-gradient(135deg, #8B5CF6, #EC4899)"
                      }}
                    >
                      Most Popular
                    </div>
                  )}
                  
                  <div className="flex justify-center mb-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{
                        background: plan.popular 
                          ? "linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B)"
                          : "linear-gradient(135deg, #E2E8F0, #CBD5E1)"
                      }}
                    >
                      <plan.icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  
                  <h2 className="text-2xl font-bold text-[#020617] text-center mb-2">
                    {plan.name}
                  </h2>
                  
                  <div className="text-center mb-4">
                    <span className="text-4xl font-bold text-[#020617]">{plan.price}</span>
                    <span className="text-[#64748B]">{plan.period}</span>
                  </div>
                  
                  <p className="text-[#64748B] text-center mb-6 text-sm">
                    {plan.description}
                  </p>
                  
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                        <span className="text-[#334155] text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Link href={plan.name === "Enterprise" ? "/contact" : ROUTES.SIGNUP}>
                    <Button 
                      className={`w-full ${
                        plan.popular 
                          ? "text-white"
                          : "bg-slate-900 hover:bg-slate-800 text-white"
                      }`}
                      style={plan.popular ? {
                        background: "linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B)"
                      } : {}}
                      data-testid={`button-${plan.name.toLowerCase()}-cta`}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>

            <div 
              className="rounded-2xl p-8 md:p-12 text-center"
              style={{
                background: "linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(236, 72, 153, 0.06), rgba(245, 158, 11, 0.04))",
                border: "1px solid rgba(139, 92, 246, 0.2)"
              }}
            >
              <h3 className="text-2xl font-bold text-[#020617] mb-4">
                Need a custom solution?
              </h3>
              <p className="text-[#64748B] mb-6 max-w-xl mx-auto">
                We work with agencies and enterprises to create tailored SEO automation solutions. Let's discuss your needs.
              </p>
              <Link href="/contact">
                <Button 
                  variant="outline" 
                  className="border-violet-300 text-violet-700 hover:bg-violet-50"
                  data-testid="button-contact-sales"
                >
                  Talk to Sales
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
