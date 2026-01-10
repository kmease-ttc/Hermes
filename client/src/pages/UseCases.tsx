import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { SEOHead } from "@/components/marketing/SEOHead";
import { MarketingCard } from "@/components/marketing/MarketingCard";
import { BrandButton } from "@/components/marketing/BrandButton";
import { IconBadge } from "@/components/marketing/IconBadge";
import { Link } from "wouter";
import { ROUTES } from "@shared/routes";
import { Sparkles, Building2, ShoppingCart, Briefcase, Users, Heart, Wrench } from "lucide-react";

const useCases = [
  {
    icon: Building2,
    title: "Small Businesses",
    description: "Local businesses, professional services, and small companies that want professional SEO without agency fees.",
    benefits: [
      "No monthly retainer costs",
      "Immediate results, not quarterly reports",
      "Focus on running your business, not managing SEO",
    ],
  },
  {
    icon: ShoppingCart,
    title: "E-commerce Sites",
    description: "Online stores that need consistent SEO maintenance across hundreds or thousands of product pages.",
    benefits: [
      "Automated product page optimization",
      "Schema markup management",
      "Category page improvements",
    ],
  },
  {
    icon: Heart,
    title: "Healthcare & Clinics",
    description: "Medical practices, mental health clinics, and healthcare providers looking to reach more patients online.",
    benefits: [
      "HIPAA-conscious approach",
      "Local SEO optimization",
      "Patient-focused content recommendations",
    ],
  },
  {
    icon: Briefcase,
    title: "Marketing Teams",
    description: "In-house marketing teams that want to add SEO capability without hiring a dedicated specialist.",
    benefits: [
      "No SEO expertise required",
      "Integrates with existing workflows",
      "Clear ROI tracking",
    ],
  },
  {
    icon: Users,
    title: "Agencies",
    description: "Digital agencies managing SEO for multiple clients who want to scale their operations.",
    benefits: [
      "Manage multiple sites from one dashboard",
      "White-label reporting",
      "Automated maintenance frees up team time",
    ],
  },
  {
    icon: Wrench,
    title: "Developers & Startups",
    description: "Technical teams that want to ensure their sites are SEO-friendly without becoming SEO experts.",
    benefits: [
      "Technical SEO automation",
      "CI/CD integration options",
      "API access for custom workflows",
    ],
  },
];

export default function UseCases() {
  return (
    <MarketingLayout>
      <SEOHead 
        path="/use-cases" 
        title="Use Cases – Arclo for Every Team"
        description="Arclo helps small businesses, agencies, e-commerce, healthcare, and developers automate their SEO. See how different organizations use the platform."
      />
      <div className="container mx-auto px-4 md:px-6 py-16 md:py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold text-slate-950 mb-6 tracking-tight">
              Built for{" "}
              <span className="marketing-gradient-text">every team</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Arclo helps teams of all sizes automate their SEO. See how different organizations use the platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {useCases.map((useCase) => (
              <MarketingCard key={useCase.title}>
                <div className="flex justify-start mb-5">
                  <IconBadge icon={useCase.icon} size="sm" />
                </div>
                <h3 className="text-xl font-bold text-slate-950 mb-2">{useCase.title}</h3>
                <p className="text-slate-500 mb-4">{useCase.description}</p>
                <ul className="space-y-2">
                  {useCase.benefits.map((benefit, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="text-violet-500 mt-1">•</span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </MarketingCard>
            ))}
          </div>

          <div className="text-center mt-20">
            <MarketingCard hover={false} className="max-w-xl mx-auto">
              <h2 className="text-2xl font-bold text-slate-950 mb-6 tracking-tight">
                Ready to automate your SEO?
              </h2>
              <Link href={ROUTES.LANDING}>
                <BrandButton variant="primary" size="lg" icon={Sparkles} data-testid="button-run-scan">
                  Fix my SEO automatically
                </BrandButton>
              </Link>
              <p className="mt-4 text-xs text-slate-400">
                No credit card • Runs in the background • Cancel anytime
              </p>
            </MarketingCard>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
