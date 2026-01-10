import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { SEOHead } from "@/components/marketing/SEOHead";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ROUTES } from "@shared/routes";
import { Check, Zap, Building2, Rocket, Sparkles, HelpCircle, ChevronDown, Search } from "lucide-react";
import { useState } from "react";
import { BrandButton } from "@/components/marketing/BrandButton";

const plans = [
  {
    name: "Starter",
    price: "$99",
    period: "/month",
    description: "Perfect for small businesses getting started with SEO",
    icon: Zap,
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    accentColor: "text-amber-600",
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
    name: "Autopilot",
    price: "$299",
    period: "/month",
    description: "Everything runs automatically. Just answer a few questions and we handle the rest.",
    icon: Rocket,
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
    iconBg: "gradient",
    iconColor: "text-white",
    accentColor: "text-violet-600",
    features: [
      "Professional website in 60 seconds",
      "Daily automated SEO improvements",
      "Weekly content updates",
      "Activity log shows every change",
      "Cancel anytime",
      "Priority support",
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
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    iconBg: "bg-green-100",
    iconColor: "text-green-600",
    accentColor: "text-green-600",
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

const faqs = [
  {
    question: "Can I cancel anytime?",
    answer: "Yes, no contracts. Cancel from your dashboard."
  },
  {
    question: "Do I need my own domain?",
    answer: "We provide a free subdomain. You can connect your own domain anytime."
  },
  {
    question: "Is there a free trial?",
    answer: "You can preview your site for free before paying."
  },
  {
    question: "What if I need help?",
    answer: "We offer email support and live chat during business hours."
  },
  {
    question: "Can I edit my own content?",
    answer: "Yes, you have full control to edit anything."
  },
  {
    question: "How long until I see results?",
    answer: "SEO compounds over time. Most see meaningful improvements in 60-90 days."
  }
];

export default function Pricing() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  return (
    <MarketingLayout>
      <SEOHead 
        path="/pricing" 
        title="Pricing – Arclo Automated SEO Plans"
        description="Simple, transparent pricing for automated SEO. Choose from Starter, Autopilot, or Enterprise plans. No contracts, cancel anytime."
      />
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

            <div className="grid md:grid-cols-3 gap-4 mb-20">
              {plans.map((plan) => (
                <div 
                  key={plan.name}
                  className={`rounded-lg p-6 ${plan.bgColor} border ${plan.borderColor} relative`}
                  data-testid={`pricing-card-${plan.name.toLowerCase()}`}
                >
                  {plan.popular && (
                    <div 
                      className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-white text-xs font-medium"
                      style={{
                        background: "linear-gradient(135deg, #8B5CF6, #EC4899)"
                      }}
                    >
                      Most Popular
                    </div>
                  )}
                  
                  <div className="flex items-center gap-4 mb-4">
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        plan.iconBg === "gradient" 
                          ? "bg-gradient-to-br from-violet-500 via-pink-500 to-amber-400" 
                          : plan.iconBg
                      }`}
                    >
                      <plan.icon className={`w-5 h-5 ${plan.iconColor}`} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        {plan.name}
                      </h2>
                      <p className={`text-sm font-medium ${plan.accentColor}`}>
                        {plan.price}{plan.period}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-slate-600 text-sm mb-4">
                    {plan.description}
                  </p>
                  
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <Check className={`w-4 h-4 ${plan.accentColor} shrink-0 mt-0.5`} />
                        <span className="text-slate-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Link href={plan.name === "Enterprise" ? "/contact" : plan.popular ? ROUTES.SCAN : ROUTES.SIGNUP}>
                    {plan.popular ? (
                      <BrandButton 
                        variant="primary"
                        size="sm"
                        className="w-full"
                        icon={Search}
                        data-testid={`button-${plan.name.toLowerCase()}-cta`}
                      >
                        Analyze My Website
                      </BrandButton>
                    ) : (
                      <Button 
                        variant="outline"
                        className={`w-full ${plan.borderColor} bg-white/50 hover:bg-white text-slate-700`}
                        data-testid={`button-${plan.name.toLowerCase()}-cta`}
                      >
                        {plan.cta}
                      </Button>
                    )}
                  </Link>
                </div>
              ))}
            </div>

            <div 
              className="rounded-lg p-8 md:p-12 bg-violet-50 border border-violet-200"
            >
              <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8">
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-violet-500 via-pink-500 to-amber-400"
                >
                  <Sparkles className="w-7 h-7 text-white" />
                </div>
                <div className="text-center md:text-left flex-1">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">
                    Need a custom solution?
                  </h3>
                  <p className="text-slate-600">
                    We work with agencies and enterprises to create tailored SEO automation solutions.
                  </p>
                </div>
                <Link href="/contact">
                  <Button 
                    variant="outline" 
                    className="border-violet-300 text-violet-700 hover:bg-violet-100 bg-white"
                    data-testid="button-contact-sales"
                  >
                    Talk to Sales
                  </Button>
                </Link>
              </div>
            </div>

            <div className="mt-20">
              <div className="text-center mb-12">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-slate-600" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-slate-900">
                    Frequently Asked Questions
                  </h2>
                </div>
                <p className="text-slate-600 max-w-xl mx-auto">
                  Everything you need to know about getting started
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                {faqs.map((faq, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-slate-200 bg-white overflow-hidden"
                    data-testid={`faq-item-${index}`}
                  >
                    <button
                      onClick={() => setOpenFaq(openFaq === index ? null : index)}
                      className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
                      data-testid={`faq-button-${index}`}
                    >
                      <span className="font-medium text-slate-900">{faq.question}</span>
                      <ChevronDown 
                        className={`w-5 h-5 text-slate-400 transition-transform ${
                          openFaq === index ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    {openFaq === index && (
                      <div className="px-5 pb-4 text-slate-600 text-sm">
                        {faq.answer}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
