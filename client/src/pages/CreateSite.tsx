import { useState } from "react";
import { useLocation } from "wouter";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { MarketingCard } from "@/components/marketing/MarketingCard";
import { BrandButton } from "@/components/marketing/BrandButton";
import { IconBadge } from "@/components/marketing/IconBadge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Building2, 
  MapPin, 
  Mail, 
  Phone, 
  Sparkles, 
  CheckCircle2, 
  Loader2,
  Globe,
  FileText,
  Palette,
  Zap
} from "lucide-react";

const BUSINESS_CATEGORIES = [
  "Restaurant / Food Service",
  "Healthcare / Medical",
  "Legal Services",
  "Home Services (Plumbing, HVAC, etc.)",
  "Real Estate",
  "Retail / E-commerce",
  "Professional Services",
  "Fitness / Wellness",
  "Beauty / Salon",
  "Automotive",
  "Education / Tutoring",
  "Technology / IT",
  "Construction / Contractors",
  "Financial Services",
  "Other",
];

const BRAND_PREFERENCES = [
  { value: "modern", label: "Modern", description: "Clean lines, bold typography" },
  { value: "warm", label: "Warm", description: "Friendly, approachable feel" },
  { value: "minimal", label: "Minimal", description: "Simple, elegant design" },
];

type GenerationStep = "creating_pages" | "writing_seo" | "publishing";

interface FormData {
  businessName: string;
  businessCategory: string;
  city: string;
  state: string;
  phone: string;
  email: string;
  description: string;
  services: string;
  brandPreference: string;
  domainPreference: "subdomain" | "custom";
}

export default function CreateSite() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"form" | "generating" | "success">("form");
  const [generationStep, setGenerationStep] = useState<GenerationStep>("creating_pages");
  const [siteId, setSiteId] = useState<string | null>(null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<FormData>({
    businessName: "",
    businessCategory: "",
    city: "",
    state: "",
    phone: "",
    email: "",
    description: "",
    services: "",
    brandPreference: "modern",
    domainPreference: "subdomain",
  });

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.businessName.trim()) {
      setError("Business name is required");
      return;
    }
    if (!formData.businessCategory) {
      setError("Please select a business category");
      return;
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      setError("Valid email is required");
      return;
    }

    setStep("generating");
    setGenerationStep("creating_pages");

    try {
      const res = await fetch("/api/generated-sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: formData.businessName,
          businessCategory: formData.businessCategory,
          city: formData.city,
          state: formData.state,
          phone: formData.phone,
          email: formData.email,
          description: formData.description,
          services: formData.services.split(",").map(s => s.trim()).filter(Boolean),
          brandPreference: formData.brandPreference,
          domainPreference: formData.domainPreference,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create site");
      }

      const data = await res.json();
      setSiteId(data.siteId);

      setTimeout(() => setGenerationStep("writing_seo"), 2000);
      setTimeout(() => setGenerationStep("publishing"), 4000);
      setTimeout(() => {
        setPublishedUrl(data.publishedUrl || `https://${formData.businessName.toLowerCase().replace(/\s+/g, "-")}.arclo.site`);
        setStep("success");
      }, 6000);

    } catch (err) {
      setError("Something went wrong. Please try again.");
      setStep("form");
    }
  };

  if (step === "generating") {
    return (
      <MarketingLayout>
        <div className="container mx-auto px-4 md:px-6 py-16 md:py-24">
          <div className="max-w-lg mx-auto">
            <MarketingCard className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 via-pink-500 to-amber-400 flex items-center justify-center mx-auto mb-6">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-slate-950 mb-2">
                Creating your website...
              </h2>
              <p className="text-slate-500 mb-8">This usually takes about a minute.</p>

              <div className="space-y-4 text-left max-w-xs mx-auto">
                <GenerationStepItem 
                  step="creating_pages" 
                  current={generationStep} 
                  label="Creating your pages" 
                />
                <GenerationStepItem 
                  step="writing_seo" 
                  current={generationStep} 
                  label="Writing SEO copy" 
                />
                <GenerationStepItem 
                  step="publishing" 
                  current={generationStep} 
                  label="Publishing your site" 
                />
              </div>
            </MarketingCard>
          </div>
        </div>
      </MarketingLayout>
    );
  }

  if (step === "success") {
    return (
      <MarketingLayout>
        <div className="container mx-auto px-4 md:px-6 py-16 md:py-24">
          <div className="max-w-lg mx-auto">
            <MarketingCard className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-950 mb-2">
                Your site is live!
              </h2>
              <p className="text-slate-500 mb-6">
                {formData.businessName} is now online and SEO-ready.
              </p>

              {publishedUrl && (
                <div className="bg-slate-50 rounded-lg p-4 mb-6 border border-slate-200">
                  <p className="text-sm text-slate-500 mb-1">Your site URL</p>
                  <a 
                    href={publishedUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-violet-600 hover:text-violet-700 font-medium break-all"
                  >
                    {publishedUrl}
                  </a>
                </div>
              )}

              <div className="space-y-3">
                <BrandButton 
                  variant="primary" 
                  size="lg" 
                  icon={Sparkles}
                  className="w-full"
                  onClick={() => navigate("/")}
                  data-testid="button-get-seo-plan"
                >
                  Get SEO Action Plan for my new site
                </BrandButton>
                
                <BrandButton 
                  variant="secondary" 
                  size="md"
                  icon={Globe}
                  className="w-full"
                  onClick={() => window.open(publishedUrl || "#", "_blank")}
                  data-testid="button-preview-site"
                >
                  Preview site
                </BrandButton>
              </div>

              <p className="text-xs text-slate-400 mt-6">
                You can edit your site details anytime from your dashboard.
              </p>
            </MarketingCard>
          </div>
        </div>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      <div className="container mx-auto px-4 md:px-6 py-16 md:py-24">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-950 mb-4 tracking-tight">
              Create a website in minutes — <span className="marketing-gradient-text">free.</span>
            </h1>
            <p className="text-lg text-slate-600 max-w-lg mx-auto">
              Answer a few questions and Arclo will generate a fast, SEO-ready site you can publish instantly.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 mb-10">
            <ReassuranceBadge icon={Zap} text="No design skills required" />
            <ReassuranceBadge icon={Globe} text="Free subdomain included" />
            <ReassuranceBadge icon={Sparkles} text="SEO-ready out of the box" />
          </div>

          <MarketingCard>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="businessName" className="text-slate-700 font-medium">
                    Business name *
                  </Label>
                  <div className="relative mt-1.5">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="businessName"
                      value={formData.businessName}
                      onChange={(e) => updateField("businessName", e.target.value)}
                      placeholder="Acme Plumbing"
                      className="pl-10"
                      data-testid="input-business-name"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="businessCategory" className="text-slate-700 font-medium">
                    Business type *
                  </Label>
                  <Select 
                    value={formData.businessCategory} 
                    onValueChange={(v) => updateField("businessCategory", v)}
                  >
                    <SelectTrigger className="mt-1.5" data-testid="select-category">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="city" className="text-slate-700 font-medium">
                    City
                  </Label>
                  <div className="relative mt-1.5">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      placeholder="Austin"
                      className="pl-10"
                      data-testid="input-city"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="state" className="text-slate-700 font-medium">
                    State
                  </Label>
                  <Input
                    id="state"
                    value={formData.state}
                    onChange={(e) => updateField("state", e.target.value)}
                    placeholder="TX"
                    className="mt-1.5"
                    data-testid="input-state"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-slate-700 font-medium">
                    Phone (optional)
                  </Label>
                  <div className="relative mt-1.5">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      placeholder="(512) 555-1234"
                      className="pl-10"
                      data-testid="input-phone"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="email" className="text-slate-700 font-medium">
                    Email *
                  </Label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="hello@acmeplumbing.com"
                      className="pl-10"
                      data-testid="input-email"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="description" className="text-slate-700 font-medium">
                    One-line description (optional)
                  </Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => updateField("description", e.target.value)}
                    placeholder="Fast, reliable plumbing for Austin homeowners"
                    className="mt-1.5"
                    data-testid="input-description"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="services" className="text-slate-700 font-medium">
                    Primary services (comma-separated)
                  </Label>
                  <Textarea
                    id="services"
                    value={formData.services}
                    onChange={(e) => updateField("services", e.target.value)}
                    placeholder="Drain cleaning, water heater repair, emergency plumbing"
                    className="mt-1.5 min-h-[80px]"
                    data-testid="input-services"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label className="text-slate-700 font-medium mb-3 block">
                    Brand preference
                  </Label>
                  <RadioGroup
                    value={formData.brandPreference}
                    onValueChange={(v) => updateField("brandPreference", v)}
                    className="grid grid-cols-3 gap-3"
                  >
                    {BRAND_PREFERENCES.map((pref) => (
                      <Label
                        key={pref.value}
                        htmlFor={pref.value}
                        className={`flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                          formData.brandPreference === pref.value
                            ? "border-violet-400 bg-violet-50"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <RadioGroupItem value={pref.value} id={pref.value} className="sr-only" />
                        <Palette className={`h-5 w-5 mb-2 ${
                          formData.brandPreference === pref.value ? "text-violet-600" : "text-slate-400"
                        }`} />
                        <span className="font-medium text-slate-900 text-sm">{pref.label}</span>
                        <span className="text-xs text-slate-500 text-center mt-1">{pref.description}</span>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600" data-testid="text-error">{error}</p>
              )}

              <div className="pt-4">
                <BrandButton 
                  type="submit" 
                  variant="primary" 
                  size="lg" 
                  icon={Sparkles}
                  className="w-full"
                  data-testid="button-generate"
                >
                  Generate my site
                </BrandButton>
                <p className="text-center text-xs text-slate-400 mt-3">
                  Free subdomain included • Publish in minutes • Edit anytime
                </p>
              </div>
            </form>
          </MarketingCard>
        </div>
      </div>
    </MarketingLayout>
  );
}

function GenerationStepItem({ 
  step, 
  current, 
  label 
}: { 
  step: GenerationStep; 
  current: GenerationStep; 
  label: string; 
}) {
  const steps: GenerationStep[] = ["creating_pages", "writing_seo", "publishing"];
  const stepIndex = steps.indexOf(step);
  const currentIndex = steps.indexOf(current);
  
  const isComplete = stepIndex < currentIndex;
  const isActive = stepIndex === currentIndex;

  return (
    <div className="flex items-center gap-3">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
        isComplete 
          ? "bg-green-100" 
          : isActive 
            ? "bg-gradient-to-br from-violet-500 via-pink-500 to-amber-400" 
            : "bg-slate-100"
      }`}>
        {isComplete ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : isActive ? (
          <Loader2 className="h-3 w-3 text-white animate-spin" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-slate-300" />
        )}
      </div>
      <span className={`text-sm ${
        isComplete ? "text-green-600" : isActive ? "text-slate-900 font-medium" : "text-slate-400"
      }`}>
        {label}
      </span>
    </div>
  );
}

function ReassuranceBadge({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
      <Icon className="h-4 w-4 text-violet-500" />
      <span className="text-sm text-slate-600">{text}</span>
    </div>
  );
}
