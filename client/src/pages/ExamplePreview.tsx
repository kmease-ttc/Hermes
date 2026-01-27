import { useRoute, useLocation, Link } from "wouter";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { BrandButton } from "@/components/marketing/BrandButton";
import { SEOHead } from "@/components/marketing/SEOHead";
import { ROUTES } from "@shared/routes";
import { ArrowLeft, Phone, MapPin, Clock, Star, Sparkles, ChevronRight, Mail, Shield, CheckCircle2 } from "lucide-react";

import plumbingImage from "@assets/generated_images/plumbing_hero_diverse_female.png";
import hvacImage from "@assets/generated_images/hvac_hero_diverse_asian_woman.png";
import dentalImage from "@assets/generated_images/dental_hero_diverse_team.png";
import landscapingImage from "@assets/generated_images/landscaping_hero_diverse_latino.png";
import electricalImage from "@assets/generated_images/electrician_hero_diverse_black_woman.png";
import autoImage from "@assets/generated_images/auto_mechanic_hero_diverse_middle_eastern.png";
import roofingImage from "@assets/generated_images/roofing_hero_diverse_asian_male.png";
import contractorImage from "@assets/generated_images/contractor_hero_diverse_hispanic_woman.png";

const EXAMPLES: Record<string, {
  id: string;
  business: string;
  industry: string;
  city: string;
  image: string;
  tagline: string;
  phone: string;
  email: string;
  hours: string;
  services: { name: string; description: string }[];
  whyUs: string[];
  rating: number;
  reviewCount: number;
}> = {
  plumbing: {
    id: "plumbing",
    business: "Austin Pro Plumbers",
    industry: "Plumbing",
    city: "Austin, TX",
    image: plumbingImage,
    tagline: "Fast, reliable plumbing for your home and business",
    phone: "(512) 555-0147",
    email: "info@austinproplumbers.com",
    hours: "Mon–Sat: 7AM–7PM · Emergency: 24/7",
    services: [
      { name: "Emergency Repairs", description: "Burst pipes, leaks, and backups handled fast — day or night." },
      { name: "Water Heater Installation", description: "Tankless and traditional water heater install and replacement." },
      { name: "Drain Cleaning", description: "Professional hydro-jetting and drain clearing for stubborn clogs." },
      { name: "Pipe Replacement", description: "Full re-piping services for aging or corroded plumbing systems." },
      { name: "Fixture Installation", description: "Faucets, toilets, sinks, and showers installed to code." },
      { name: "Sewer Line Repair", description: "Trenchless sewer repair and replacement with minimal disruption." },
    ],
    whyUs: ["Licensed & insured", "Same-day service available", "Upfront pricing — no surprises", "5-star rated on Google"],
    rating: 4.9,
    reviewCount: 312,
  },
  hvac: {
    id: "hvac",
    business: "Denver Climate Control",
    industry: "HVAC",
    city: "Denver, CO",
    image: hvacImage,
    tagline: "Keep your home comfortable year-round",
    phone: "(720) 555-0283",
    email: "hello@denverclimatecontrol.com",
    hours: "Mon–Fri: 8AM–6PM · Sat: 9AM–3PM",
    services: [
      { name: "AC Repair", description: "Fast diagnosis and repair to restore cooling when you need it most." },
      { name: "Furnace Installation", description: "High-efficiency furnace install with warranty protection." },
      { name: "Duct Cleaning", description: "Complete ductwork cleaning to improve air quality and efficiency." },
      { name: "Heat Pump Service", description: "Installation, repair, and maintenance for all heat pump systems." },
      { name: "Thermostat Upgrade", description: "Smart thermostat installation for better comfort and savings." },
      { name: "Preventive Maintenance", description: "Seasonal tune-ups to extend system life and avoid breakdowns." },
    ],
    whyUs: ["NATE-certified technicians", "Free in-home estimates", "Financing available", "100% satisfaction guarantee"],
    rating: 4.8,
    reviewCount: 247,
  },
  dental: {
    id: "dental",
    business: "Evergreen Family Dental",
    industry: "Dental Clinic",
    city: "Seattle, WA",
    image: dentalImage,
    tagline: "Gentle, comprehensive dental care for the whole family",
    phone: "(206) 555-0419",
    email: "appointments@evergreenfamilydental.com",
    hours: "Mon–Thu: 8AM–5PM · Fri: 8AM–2PM",
    services: [
      { name: "General Dentistry", description: "Cleanings, exams, fillings, and preventive care for all ages." },
      { name: "Cosmetic Procedures", description: "Whitening, veneers, and smile makeovers to boost your confidence." },
      { name: "Emergency Care", description: "Same-day appointments for toothaches, chips, and dental emergencies." },
      { name: "Orthodontics", description: "Clear aligners and traditional braces for straighter smiles." },
      { name: "Dental Implants", description: "Permanent tooth replacement with natural-looking implants." },
      { name: "Pediatric Dentistry", description: "Kid-friendly care in a warm, welcoming environment." },
    ],
    whyUs: ["Accepting new patients", "Most insurance accepted", "Sedation options available", "Modern, state-of-the-art facility"],
    rating: 4.9,
    reviewCount: 189,
  },
  landscaping: {
    id: "landscaping",
    business: "Desert Bloom Landscaping",
    industry: "Landscaping",
    city: "Phoenix, AZ",
    image: landscapingImage,
    tagline: "Beautiful, water-smart landscapes for the desert Southwest",
    phone: "(480) 555-0362",
    email: "design@desertbloomlandscaping.com",
    hours: "Mon–Sat: 6AM–4PM",
    services: [
      { name: "Lawn Care", description: "Mowing, edging, fertilization, and year-round lawn maintenance." },
      { name: "Irrigation Systems", description: "Drip and sprinkler systems designed for water efficiency." },
      { name: "Landscape Design", description: "Custom designs using native, drought-tolerant plants." },
      { name: "Hardscaping", description: "Patios, walkways, retaining walls, and outdoor living spaces." },
      { name: "Tree Service", description: "Trimming, removal, and planting for healthy, beautiful trees." },
      { name: "Seasonal Cleanup", description: "Fall and spring cleanup to keep your property looking its best." },
    ],
    whyUs: ["Xeriscaping specialists", "Free design consultation", "Licensed and bonded", "Serving the Valley since 2010"],
    rating: 4.7,
    reviewCount: 156,
  },
  electrical: {
    id: "electrical",
    business: "Bright Spark Electric",
    industry: "Electrical",
    city: "Portland, OR",
    image: electricalImage,
    tagline: "Safe, code-compliant electrical work you can trust",
    phone: "(503) 555-0591",
    email: "service@brightsparkelectric.com",
    hours: "Mon–Fri: 7AM–6PM · Emergency: 24/7",
    services: [
      { name: "Panel Upgrades", description: "Modernize your electrical panel for safety and capacity." },
      { name: "Lighting Installation", description: "Indoor, outdoor, and landscape lighting design and install." },
      { name: "EV Charger Installation", description: "Level 2 home charging stations for electric vehicles." },
      { name: "Wiring & Rewiring", description: "New construction wiring and whole-home rewiring services." },
      { name: "Generator Installation", description: "Backup generators to keep your home powered during outages." },
      { name: "Safety Inspections", description: "Comprehensive electrical inspections for homes and businesses." },
    ],
    whyUs: ["Master electricians on staff", "Free safety estimates", "Clean worksite guarantee", "Oregon CCB licensed"],
    rating: 4.9,
    reviewCount: 203,
  },
  auto: {
    id: "auto",
    business: "Summit Auto Repair",
    industry: "Auto Repair",
    city: "Salt Lake City, UT",
    image: autoImage,
    tagline: "Honest auto repair with transparent pricing",
    phone: "(801) 555-0728",
    email: "appointments@summitautorepair.com",
    hours: "Mon–Fri: 7:30AM–5:30PM · Sat: 8AM–1PM",
    services: [
      { name: "Brake Service", description: "Pads, rotors, and complete brake system repair and replacement." },
      { name: "Oil Changes", description: "Conventional and synthetic oil changes with multi-point inspection." },
      { name: "Engine Repair", description: "Diagnostics and repair for all makes and models." },
      { name: "Transmission Service", description: "Fluid flushes, repairs, and rebuilds for smooth shifting." },
      { name: "Tire Service", description: "New tires, rotations, balancing, and alignment." },
      { name: "AC & Heating", description: "Climate system repair to keep you comfortable on the road." },
    ],
    whyUs: ["ASE-certified mechanics", "12-month / 12,000-mile warranty", "Shuttle service available", "Digital inspection reports"],
    rating: 4.8,
    reviewCount: 278,
  },
  roofing: {
    id: "roofing",
    business: "Skyline Roofing Co",
    industry: "Roofing",
    city: "Dallas, TX",
    image: roofingImage,
    tagline: "Protecting your home from the top down",
    phone: "(214) 555-0834",
    email: "estimates@skylineroofingco.com",
    hours: "Mon–Sat: 7AM–6PM",
    services: [
      { name: "Roof Replacement", description: "Full tear-off and replacement with premium materials." },
      { name: "Storm Damage Repair", description: "Hail, wind, and storm damage restoration — insurance claims welcome." },
      { name: "Inspections", description: "Thorough roof inspections with detailed photo reports." },
      { name: "Leak Repair", description: "Fast, permanent fixes for active and hidden roof leaks." },
      { name: "Gutter Installation", description: "Seamless gutters and guards to protect your foundation." },
      { name: "Commercial Roofing", description: "Flat roof, TPO, and metal roofing for businesses." },
    ],
    whyUs: ["Free storm damage assessments", "GAF Master Elite certified", "Workmanship warranty included", "Insurance claim assistance"],
    rating: 4.8,
    reviewCount: 341,
  },
  contractor: {
    id: "contractor",
    business: "Premier Home Builders",
    industry: "General Contractor",
    city: "San Diego, CA",
    image: contractorImage,
    tagline: "Quality craftsmanship for your dream home",
    phone: "(619) 555-0946",
    email: "projects@premierhomebuilders.com",
    hours: "Mon–Fri: 7AM–5PM · Sat by appointment",
    services: [
      { name: "Kitchen Remodels", description: "Custom kitchen renovations from layout to finishing touches." },
      { name: "Bathroom Renovations", description: "Complete bathroom remodels with modern fixtures and tile." },
      { name: "Room Additions", description: "Expand your living space with expertly built additions." },
      { name: "Whole-Home Remodels", description: "Comprehensive renovations that transform your entire home." },
      { name: "ADU Construction", description: "Accessory dwelling units — design, permits, and build." },
      { name: "Outdoor Living", description: "Decks, pergolas, and outdoor kitchens for year-round enjoyment." },
    ],
    whyUs: ["CSLB licensed (#1042567)", "3D renderings before we build", "On-time, on-budget guarantee", "Serving San Diego since 2008"],
    rating: 4.9,
    reviewCount: 167,
  },
};

export default function ExamplePreview() {
  const [, navigate] = useLocation();
  const [matched, params] = useRoute("/examples/:exampleId");
  const exampleId = params?.exampleId || "";
  const example = EXAMPLES[exampleId];

  if (!matched || !example) {
    return (
      <MarketingLayout>
        <div className="container mx-auto px-4 md:px-6 py-16 md:py-24 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">Example not found</h2>
          <p className="text-muted-foreground mb-6">The example you're looking for doesn't exist.</p>
          <Link href={ROUTES.EXAMPLES}>
            <BrandButton variant="primary">
              <ArrowLeft className="h-4 w-4" />
              Back to Examples
            </BrandButton>
          </Link>
        </div>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      <SEOHead
        path={`/examples/${exampleId}`}
        title={`${example.business} – Example Website | Arclo`}
        description={`See an example ${example.industry} website built by Arclo for ${example.business} in ${example.city}.`}
      />

      {/* Top bar with back + CTA */}
      <div className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border py-3 px-4 md:px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <Link href={ROUTES.EXAMPLES}>
            <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
              <ArrowLeft className="h-4 w-4" />
              All Examples
            </span>
          </Link>
          <Link href={ROUTES.WEBSITE_GENERATOR}>
            <BrandButton variant="primary" size="sm">
              <Sparkles className="h-3.5 w-3.5" />
              Generate a site like this
            </BrandButton>
          </Link>
        </div>
      </div>

      {/* Mock website preview */}
      <div className="bg-white">
        {/* ===== HERO SECTION ===== */}
        <section className="relative">
          <div className="relative h-[420px] md:h-[520px] overflow-hidden">
            <img
              src={example.image}
              alt={`${example.business} hero`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent" />
            <div className="absolute inset-0 flex items-center">
              <div className="max-w-6xl mx-auto px-6 md:px-10 w-full">
                <div className="max-w-xl">
                  <p className="text-white/80 text-sm font-medium uppercase tracking-wider mb-3">
                    {example.industry} · {example.city}
                  </p>
                  <h1 className="text-3xl md:text-5xl font-bold text-white mb-4 leading-tight">
                    {example.business}
                  </h1>
                  <p className="text-lg md:text-xl text-white/90 mb-8">
                    {example.tagline}
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <span className="inline-flex items-center gap-2 bg-white text-gray-900 font-semibold px-6 py-3 rounded-lg text-sm shadow-lg cursor-default">
                      <Phone className="h-4 w-4" />
                      Call {example.phone}
                    </span>
                    <span className="inline-flex items-center gap-2 bg-white/15 backdrop-blur text-white font-semibold px-6 py-3 rounded-lg text-sm border border-white/20 cursor-default">
                      Get a Free Quote
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== TRUST BAR ===== */}
        <section className="bg-gray-50 border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-6 md:px-10 py-5">
            <div className="flex flex-wrap items-center justify-center md:justify-between gap-4 md:gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <span className="font-medium text-gray-900">{example.rating}</span>
                <span>({example.reviewCount} reviews)</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span>{example.city}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span>{example.hours}</span>
              </div>
            </div>
          </div>
        </section>

        {/* ===== SERVICES SECTION ===== */}
        <section className="py-16 md:py-20">
          <div className="max-w-6xl mx-auto px-6 md:px-10">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                Our Services
              </h2>
              <p className="text-gray-500 max-w-xl mx-auto">
                Professional {example.industry.toLowerCase()} services tailored to your needs.
              </p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {example.services.map((service) => (
                <div
                  key={service.name}
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
                >
                  <h3 className="font-semibold text-gray-900 mb-2">{service.name}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{service.description}</p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 mt-4 cursor-default">
                    Learn more <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== WHY CHOOSE US ===== */}
        <section className="py-16 md:py-20 bg-gray-50">
          <div className="max-w-6xl mx-auto px-6 md:px-10">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6">
                  Why Choose {example.business}?
                </h2>
                <div className="space-y-4">
                  {example.whyUs.map((reason) => (
                    <div key={reason} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{reason}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
                <h3 className="text-xl font-bold text-gray-900 mb-2">Request a Free Quote</h3>
                <p className="text-sm text-gray-500 mb-6">Get a no-obligation estimate for your project.</p>
                <div className="space-y-3">
                  <div className="h-10 bg-gray-100 rounded-lg border border-gray-200" />
                  <div className="h-10 bg-gray-100 rounded-lg border border-gray-200" />
                  <div className="h-10 bg-gray-100 rounded-lg border border-gray-200" />
                  <div className="h-24 bg-gray-100 rounded-lg border border-gray-200" />
                  <div className="h-11 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-medium text-sm">Send Request</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== CONTACT / FOOTER ===== */}
        <section className="py-12 bg-gray-900 text-white">
          <div className="max-w-6xl mx-auto px-6 md:px-10">
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8">
              <div>
                <h3 className="font-bold text-lg mb-3">{example.business}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Proudly serving {example.city} and surrounding areas with quality {example.industry.toLowerCase()} services.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-sm uppercase tracking-wider text-gray-400 mb-3">Contact</h4>
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-500" />
                    {example.phone}
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-gray-500" />
                    {example.email}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    {example.city}
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-sm uppercase tracking-wider text-gray-400 mb-3">Hours</h4>
                <p className="text-sm text-gray-300">{example.hours}</p>
                <div className="flex items-center gap-2 mt-3 text-sm text-gray-400">
                  <Shield className="h-4 w-4" />
                  Licensed & Insured
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ===== ARCLO CTA ===== */}
      <section className="py-12 px-5 md:px-6 bg-muted border-t border-border">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Want a site like this for your business?
          </h2>
          <p className="text-muted-foreground mb-6">
            Arclo builds SEO-optimized websites for local service businesses. Generate yours in minutes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href={ROUTES.WEBSITE_GENERATOR}>
              <BrandButton variant="primary" size="lg">
                <Sparkles className="h-4 w-4" />
                Generate My Site
              </BrandButton>
            </Link>
          </div>
          <p className="text-sm text-muted-foreground mt-4">Free preview. No credit card required.</p>
        </div>
      </section>
    </MarketingLayout>
  );
}
