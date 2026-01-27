import { Link } from "wouter";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { SEOHead } from "@/components/marketing/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ROUTES, buildRoute } from "@shared/routes";
import { BrandButton } from "@/components/marketing/BrandButton";
import { Sparkles, Search, Eye } from "lucide-react";

import plumbingImage from "@assets/generated_images/plumbing_hero_diverse_female.png";
import hvacImage from "@assets/generated_images/hvac_hero_diverse_asian_woman.png";
import dentalImage from "@assets/generated_images/dental_hero_diverse_team.png";
import landscapingImage from "@assets/generated_images/landscaping_hero_diverse_latino.png";
import electricalImage from "@assets/generated_images/electrician_hero_diverse_black_woman.png";
import autoImage from "@assets/generated_images/auto_mechanic_hero_diverse_middle_eastern.png";
import roofingImage from "@assets/generated_images/roofing_hero_diverse_asian_male.png";
import contractorImage from "@assets/generated_images/contractor_hero_diverse_hispanic_woman.png";

const EXAMPLES = [
  {
    id: "plumbing",
    business: "Austin Pro Plumbers",
    industry: "Plumbing",
    city: "Austin, TX",
    image: plumbingImage,
    imageLabel: "Plumbing Website",
    altText: "Plumbing business website example",
    services: ["Emergency repairs", "Water heater installation", "Drain cleaning"],
  },
  {
    id: "hvac",
    business: "Denver Climate Control",
    industry: "HVAC",
    city: "Denver, CO",
    image: hvacImage,
    imageLabel: "HVAC Website",
    altText: "HVAC company website homepage example",
    services: ["AC repair", "Furnace installation", "Duct cleaning"],
  },
  {
    id: "dental",
    business: "Evergreen Family Dental",
    industry: "Dental Clinic",
    city: "Seattle, WA",
    image: dentalImage,
    imageLabel: "Dental Website",
    altText: "Dental clinic website homepage example",
    services: ["General dentistry", "Cosmetic procedures", "Emergency care"],
  },
  {
    id: "landscaping",
    business: "Desert Bloom Landscaping",
    industry: "Landscaping",
    city: "Phoenix, AZ",
    image: landscapingImage,
    imageLabel: "Landscaping Website",
    altText: "Landscaping business website example",
    services: ["Lawn care", "Irrigation", "Landscape design"],
  },
  {
    id: "electrical",
    business: "Bright Spark Electric",
    industry: "Electrical",
    city: "Portland, OR",
    image: electricalImage,
    imageLabel: "Electrical Website",
    altText: "Electrical service website example",
    services: ["Panel upgrades", "Lighting installation", "EV chargers"],
  },
  {
    id: "auto",
    business: "Summit Auto Repair",
    industry: "Auto Repair",
    city: "Salt Lake City, UT",
    image: autoImage,
    imageLabel: "Auto Repair Website",
    altText: "Auto repair shop website example",
    services: ["Brake service", "Oil changes", "Engine repair"],
  },
  {
    id: "roofing",
    business: "Skyline Roofing Co",
    industry: "Roofing",
    city: "Dallas, TX",
    image: roofingImage,
    imageLabel: "Roofing Website",
    altText: "Roofing company website example",
    services: ["Roof replacement", "Storm damage", "Inspections"],
  },
  {
    id: "contractor",
    business: "Premier Home Builders",
    industry: "General Contractor",
    city: "San Diego, CA",
    image: contractorImage,
    imageLabel: "Contractor Website",
    altText: "General contractor website example",
    services: ["Kitchen remodels", "Bathroom renovations", "Additions"],
  },
];

export default function Examples() {
  return (
    <MarketingLayout>
      <SEOHead 
        path="/examples" 
        title="Website Examples – Arclo-Built Sites for Local Businesses"
        description="See real examples of SEO-optimized websites built by Arclo for plumbing, HVAC, dental, landscaping, and other local service businesses."
      />
      <section className="px-5 md:px-6 py-12 md:py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
              Real Examples of Arclo-Built Sites
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See what Arclo creates for local service businesses. Each site is fully optimized for search engines and designed to convert visitors into customers.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
            {EXAMPLES.map((example) => (
              <Card
                key={example.id}
                className="bg-card border border-border shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg overflow-hidden group flex flex-col h-full"
                data-testid={`card-example-${example.id}`}
              >
                <Link href={buildRoute.examplePreview(example.id)} className="block">
                  <div className="relative h-44 overflow-hidden shrink-0">
                    <img
                      src={example.image}
                      alt={example.altText}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <span className="text-white text-sm font-medium drop-shadow-md">
                        {example.imageLabel} · {example.city}
                      </span>
                    </div>
                  </div>
                </Link>
                <CardContent className="p-5 flex flex-col flex-1">
                  <Link href={buildRoute.examplePreview(example.id)} className="block">
                    <h3 className="font-semibold text-foreground mb-1 min-h-[1.5rem] hover:text-primary transition-colors">{example.business}</h3>
                  </Link>
                  <p className="text-sm text-muted-foreground mb-3">{example.industry}</p>

                  <div className="flex flex-wrap gap-1 mb-4 max-h-14 overflow-hidden">
                    {example.services.map((service) => (
                      <span
                        key={service}
                        className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full"
                      >
                        {service}
                      </span>
                    ))}
                  </div>

                  <div className="mt-auto flex flex-col gap-2">
                    <Link href={buildRoute.examplePreview(example.id)}>
                      <span
                        className="w-full flex items-center justify-center gap-1 text-sm font-medium text-foreground h-10 rounded-lg transition-colors cursor-pointer border border-border hover:bg-muted"
                        data-testid={`button-preview-${example.id}`}
                      >
                        <Eye className="h-3 w-3" />
                        Preview site
                      </span>
                    </Link>
                    <Link href={ROUTES.WEBSITE_GENERATOR}>
                      <span
                        className="w-full flex items-center justify-center gap-1 text-sm font-medium text-white h-10 rounded-lg transition-colors cursor-pointer"
                        style={{ background: "linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B)" }}
                        data-testid={`button-generate-like-${example.id}`}
                      >
                        <Sparkles className="h-3 w-3" />
                        Generate like this
                      </span>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-16 py-12 px-6 bg-muted rounded-2xl">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
              Ready to see what's holding you back?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
              Start with a free website analysis. We'll show you exactly what to fix — or generate a better site for you.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href={ROUTES.SCAN}>
                <BrandButton 
                  variant="primary"
                  size="lg"
                  className="gap-2"
                  data-testid="button-examples-analyze"
                >
                  <Search className="h-4 w-4" />
                  Analyze My Website
                </BrandButton>
              </Link>
              <Link href={ROUTES.WEBSITE_GENERATOR}>
                <Button 
                  variant="outline"
                  size="lg"
                  className="gap-2 border-primary/30 text-primary hover:bg-primary-soft"
                  data-testid="button-examples-generate"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate My Site
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Free preview. No credit card required.
            </p>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
