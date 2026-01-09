import { Link } from "wouter";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Card, CardContent } from "@/components/ui/card";
import { ROUTES } from "@shared/routes";
import { BrandButton } from "@/components/marketing/BrandButton";
import { ExternalLink, Sparkles } from "lucide-react";

import plumbingImage from "@assets/stock_images/plumber_working_resi_75235cbd.jpg";
import hvacImage from "@assets/stock_images/hvac_technician_resi_dbd46315.jpg";
import dentalImage from "@assets/stock_images/modern_dental_clinic_ea5e4f2e.jpg";
import landscapingImage from "@assets/stock_images/landscaping_crew_res_b8e6beb2.jpg";
import electricalImage from "@assets/stock_images/electrician_working__7518a220.jpg";
import autoImage from "@assets/stock_images/auto_mechanic_car_re_47b1ee60.jpg";
import roofingImage from "@assets/stock_images/roofing_contractor_r_61a938b1.jpg";
import contractorImage from "@assets/stock_images/home_renovation_cont_f8087fe2.jpg";

const EXAMPLES = [
  {
    id: "plumbing",
    business: "Austin Pro Plumbers",
    industry: "Plumbing",
    city: "Austin, TX",
    image: plumbingImage,
    altText: "Plumbing service example website",
    services: ["Emergency repairs", "Water heater installation", "Drain cleaning"],
  },
  {
    id: "hvac",
    business: "Denver Climate Control",
    industry: "HVAC",
    city: "Denver, CO",
    image: hvacImage,
    altText: "HVAC company website example",
    services: ["AC repair", "Furnace installation", "Duct cleaning"],
  },
  {
    id: "dental",
    business: "Evergreen Family Dental",
    industry: "Dental Clinic",
    city: "Seattle, WA",
    image: dentalImage,
    altText: "Dental clinic website example",
    services: ["General dentistry", "Cosmetic procedures", "Emergency care"],
  },
  {
    id: "landscaping",
    business: "Desert Bloom Landscaping",
    industry: "Landscaping",
    city: "Phoenix, AZ",
    image: landscapingImage,
    altText: "Landscaping business website example",
    services: ["Lawn care", "Irrigation", "Landscape design"],
  },
  {
    id: "electrical",
    business: "Bright Spark Electric",
    industry: "Electrical",
    city: "Portland, OR",
    image: electricalImage,
    altText: "Electrical service website example",
    services: ["Panel upgrades", "Lighting installation", "EV chargers"],
  },
  {
    id: "auto",
    business: "Summit Auto Repair",
    industry: "Auto Repair",
    city: "Salt Lake City, UT",
    image: autoImage,
    altText: "Auto repair shop website example",
    services: ["Brake service", "Oil changes", "Engine repair"],
  },
  {
    id: "roofing",
    business: "Skyline Roofing Co",
    industry: "Roofing",
    city: "Dallas, TX",
    image: roofingImage,
    altText: "Roofing company website example",
    services: ["Roof replacement", "Storm damage", "Inspections"],
  },
  {
    id: "contractor",
    business: "Premier Home Builders",
    industry: "General Contractor",
    city: "San Diego, CA",
    image: contractorImage,
    altText: "General contractor website example",
    services: ["Kitchen remodels", "Bathroom renovations", "Additions"],
  },
];

export default function Examples() {
  return (
    <MarketingLayout>
      <section className="px-5 md:px-6 py-12 md:py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-5xl font-bold text-slate-950 mb-4 tracking-tight">
              Real Examples of Arclo-Built Sites
            </h1>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              See what Arclo creates for local service businesses. Each site is fully optimized for search engines and designed to convert visitors into customers.
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {EXAMPLES.map((example) => (
              <Card 
                key={example.id}
                className="bg-white border border-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg overflow-hidden group"
                data-testid={`card-example-${example.id}`}
              >
                <div className="relative h-44 overflow-hidden">
                  <img 
                    src={example.image}
                    alt={example.altText}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                </div>
                <CardContent className="p-5">
                  <h3 className="font-semibold text-slate-900 mb-1">{example.business}</h3>
                  <p className="text-sm text-slate-500 mb-3">{example.industry} • {example.city}</p>
                  
                  <div className="flex flex-wrap gap-1 mb-4">
                    {example.services.map((service) => (
                      <span 
                        key={service}
                        className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded-full"
                      >
                        {service}
                      </span>
                    ))}
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <span 
                      className="flex items-center justify-center gap-1 text-sm font-medium text-violet-600 hover:text-violet-700 py-2 border border-violet-200 rounded-lg hover:bg-violet-50 transition-colors cursor-pointer"
                      data-testid={`button-demo-${example.id}`}
                    >
                      View demo <ExternalLink className="h-3 w-3" />
                    </span>
                    <Link href={ROUTES.WEBSITE_GENERATOR}>
                      <span 
                        className="w-full flex items-center justify-center gap-1 text-sm font-medium text-white py-2 rounded-lg transition-colors cursor-pointer"
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
          
          <div className="text-center mt-16 py-12 px-6 bg-slate-50 rounded-2xl">
            <h2 className="text-2xl md:text-3xl font-bold text-slate-950 mb-4">
              Ready to create your own?
            </h2>
            <p className="text-slate-600 mb-6 max-w-lg mx-auto">
              Get a professional, SEO-optimized website for your business in under 60 seconds.
            </p>
            <Link href={ROUTES.WEBSITE_GENERATOR}>
              <BrandButton 
                variant="primary"
                size="lg"
                className="gap-2"
                data-testid="button-examples-cta"
              >
                <Sparkles className="h-4 w-4" />
                Generate My Site
              </BrandButton>
            </Link>
            <p className="text-sm text-slate-400 mt-4">
              Free preview. No credit card required.
            </p>
          </div>
        </div>
      </section>
    </MarketingLayout>
  );
}
