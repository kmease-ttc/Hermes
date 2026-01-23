import { useState } from "react";
import { useLocation } from "wouter";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { SEOHead } from "@/components/marketing/SEOHead";
import { MarketingCard } from "@/components/marketing/MarketingCard";
import { BrandButton } from "@/components/marketing/BrandButton";
import { ObjectUploader } from "@/components/ObjectUploader";
import { useUpload } from "@/hooks/use-upload";
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
  ArrowLeft,
  ArrowRight,
  Upload,
  Image,
  Palette
} from "lucide-react";

const BUSINESS_CATEGORIES = [
  "Restaurant",
  "Healthcare",
  "Legal",
  "Home Services",
  "Real Estate",
  "Retail",
  "Professional Services",
  "Fitness / Wellness",
  "Beauty / Salon",
  "Automotive",
  "Education",
  "Technology",
  "Construction",
  "Financial Services",
  "Other",
];

const STYLE_PREFERENCES = [
  { value: "modern", label: "Modern", description: "Clean lines, bold typography, contemporary feel" },
  { value: "warm", label: "Warm", description: "Friendly colors, approachable, welcoming design" },
  { value: "minimal", label: "Minimal", description: "Simple, elegant, focus on content" },
];

const COLOR_THEMES = [
  { value: "violet", label: "Violet", colors: ["#8B5CF6", "#7C3AED", "#6D28D9"] },
  { value: "blue", label: "Blue", colors: ["#3B82F6", "#2563EB", "#1D4ED8"] },
  { value: "green", label: "Green", colors: ["#10B981", "#059669", "#047857"] },
  { value: "amber", label: "Amber", colors: ["#F59E0B", "#D97706", "#B45309"] },
];

type WizardStep = 1 | 2;
type GenerationStep = "creating_pages" | "writing_seo" | "generating_assets" | "publishing";

interface FormData {
  businessName: string;
  businessCategory: string;
  city: string;
  email: string;
  phone: string;
  existingWebsite: string;
  description: string;
  services: string;
  stylePreference: string;
  colorTheme: string;
  logoUrl: string;
  heroImageUrl: string;
}

export default function WebsiteGenerator() {
  const [, navigate] = useLocation();
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [pageState, setPageState] = useState<"form" | "generating" | "success">("form");
  const [generationStep, setGenerationStep] = useState<GenerationStep>("creating_pages");
  const [error, setError] = useState("");
  const { getUploadParameters } = useUpload();
  
  const [formData, setFormData] = useState<FormData>({
    businessName: "",
    businessCategory: "",
    city: "",
    email: "",
    phone: "",
    existingWebsite: "",
    description: "",
    services: "",
    stylePreference: "modern",
    colorTheme: "violet",
    logoUrl: "",
    heroImageUrl: "",
  });

  const updateField = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep1 = (): boolean => {
    if (!formData.businessName.trim()) {
      setError("Business name is required");
      return false;
    }
    if (!formData.businessCategory) {
      setError("Please select a business category");
      return false;
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      setError("Valid email is required");
      return false;
    }
    setError("");
    return true;
  };

  const handleNext = () => {
    if (validateStep1()) {
      setWizardStep(2);
    }
  };

  const handleBack = () => {
    setWizardStep(1);
    setError("");
  };

  const handleSubmit = async () => {
    setError("");
    setPageState("generating");
    setGenerationStep("creating_pages");

    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: formData.businessName,
          businessCategory: formData.businessCategory,
          city: formData.city,
          email: formData.email,
          phone: formData.phone,
          existingWebsite: formData.existingWebsite,
          description: formData.description,
          services: formData.services.split(",").map(s => s.trim()).filter(Boolean),
          stylePreference: formData.stylePreference,
          colorTheme: formData.colorTheme,
          logoUrl: formData.logoUrl,
          heroImageUrl: formData.heroImageUrl,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to create site");
      }

      const data = await res.json();
      
      setTimeout(() => setGenerationStep("writing_seo"), 2000);
      setTimeout(() => setGenerationStep("generating_assets"), 4000);
      setTimeout(() => setGenerationStep("publishing"), 6000);
      setTimeout(() => {
        navigate(`/preview/${data.siteId}?token=${data.token || ""}`);
      }, 8000);

    } catch (err) {
      setError("Something went wrong. Please try again.");
      setPageState("form");
    }
  };

  if (pageState === "generating") {
    return (
      <MarketingLayout>
        <div className="container mx-auto px-4 md:px-6 py-16 md:py-24">
          <div className="max-w-lg mx-auto">
            <MarketingCard className="text-center py-12">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary via-pink-500 to-gold flex items-center justify-center mx-auto mb-6 animate-pulse">
                <Loader2 className="h-10 w-10 text-white animate-spin" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Generating your website...
              </h2>
              <p className="text-muted-foreground mb-8">This usually takes about a minute.</p>

              <div className="space-y-4 text-left max-w-xs mx-auto">
                <GenerationStepItem 
                  step="creating_pages" 
                  current={generationStep} 
                  label="Creating your pages" 
                />
                <GenerationStepItem 
                  step="writing_seo" 
                  current={generationStep} 
                  label="Writing SEO-optimized copy" 
                />
                <GenerationStepItem 
                  step="generating_assets" 
                  current={generationStep} 
                  label="Generating visual assets" 
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

  return (
    <MarketingLayout>
      <SEOHead 
        path="/tools/website-generator" 
        title="Free Website Generator – Create Your SEO-Optimized Site in Minutes"
        description="Generate a fast, SEO-ready website for your local business in minutes. Answer a few questions and Arclo builds your site automatically."
      />
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 tracking-tight">
              Build your website in <span className="bg-gradient-to-r from-primary via-pink-500 to-gold bg-clip-text text-transparent">minutes</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-lg mx-auto">
              Answer a few questions and we'll generate a fast, SEO-ready site for your business.
            </p>
          </div>

          <ProgressIndicator currentStep={wizardStep} />

          <MarketingCard className="mt-8">
            {wizardStep === 1 && (
              <Step1BusinessInfo 
                formData={formData} 
                updateField={updateField} 
                error={error}
                onNext={handleNext}
              />
            )}
            
            {wizardStep === 2 && (
              <Step2Branding 
                formData={formData} 
                updateField={updateField}
                error={error}
                onBack={handleBack}
                onSubmit={handleSubmit}
                getUploadParameters={getUploadParameters}
              />
            )}
          </MarketingCard>
        </div>
      </div>
    </MarketingLayout>
  );
}

function ProgressIndicator({ currentStep }: { currentStep: WizardStep }) {
  return (
    <div className="flex items-center justify-center gap-3">
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
        currentStep === 1 
          ? "bg-gradient-to-r from-primary via-pink-500 to-gold text-white shadow-lg"
          : "bg-muted text-muted-foreground"
      }`}>
        <span className="text-sm font-semibold">1</span>
        <span className="text-sm font-medium">Business Info</span>
      </div>
      <div className="w-8 h-0.5 bg-border" />
      <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
        currentStep === 2 
          ? "bg-gradient-to-r from-primary via-pink-500 to-gold text-white shadow-lg"
          : "bg-muted text-muted-foreground"
      }`}>
        <span className="text-sm font-semibold">2</span>
        <span className="text-sm font-medium">Branding</span>
      </div>
    </div>
  );
}

interface Step1Props {
  formData: FormData;
  updateField: (field: keyof FormData, value: string) => void;
  error: string;
  onNext: () => void;
}

function Step1BusinessInfo({ formData, updateField, error, onNext }: Step1Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Tell us about your business</h2>
        <p className="text-sm text-muted-foreground">This information helps us create the perfect website for you.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor="businessName" className="text-foreground font-medium">
            Business name <span className="text-destructive">*</span>
          </Label>
          <div className="relative mt-1.5">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
          <Label htmlFor="businessCategory" className="text-foreground font-medium">
            Business type <span className="text-destructive">*</span>
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
          <Label htmlFor="city" className="text-foreground font-medium">
            City <span className="text-muted-foreground">(optional)</span>
          </Label>
          <div className="relative mt-1.5">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
          <Label htmlFor="email" className="text-foreground font-medium">
            Email <span className="text-destructive">*</span>
          </Label>
          <div className="relative mt-1.5">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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

        <div>
          <Label htmlFor="phone" className="text-foreground font-medium">
            Phone <span className="text-muted-foreground">(optional)</span>
          </Label>
          <div className="relative mt-1.5">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
          <Label htmlFor="existingWebsite" className="text-foreground font-medium">
            Existing website <span className="text-muted-foreground">(optional)</span>
          </Label>
          <div className="relative mt-1.5">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="existingWebsite"
              value={formData.existingWebsite}
              onChange={(e) => updateField("existingWebsite", e.target.value)}
              placeholder="https://oldsite.com"
              className="pl-10"
              data-testid="input-existing-website"
            />
          </div>
        </div>

        <div className="md:col-span-2">
          <Label htmlFor="description" className="text-foreground font-medium">
            One-line description <span className="text-muted-foreground">(optional)</span>
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
          <Label htmlFor="services" className="text-foreground font-medium">
            Primary services <span className="text-muted-foreground">(comma-separated, optional)</span>
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
      </div>

      {error && (
        <p className="text-sm text-destructive" data-testid="text-error">{error}</p>
      )}

      <div className="pt-2">
        <BrandButton 
          variant="primary" 
          size="lg" 
          icon={ArrowRight}
          className="w-full"
          onClick={onNext}
          data-testid="button-next"
        >
          Continue to Branding
        </BrandButton>
      </div>
    </div>
  );
}

interface Step2Props {
  formData: FormData;
  updateField: (field: keyof FormData, value: string) => void;
  error: string;
  onBack: () => void;
  onSubmit: () => void;
  getUploadParameters: (file: any) => Promise<{ method: "PUT"; url: string; headers?: Record<string, string> }>;
}

function Step2Branding({ formData, updateField, error, onBack, onSubmit, getUploadParameters }: Step2Props) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-1">Choose your style</h2>
        <p className="text-sm text-muted-foreground">Select your preferred look and feel for your website.</p>
      </div>

      <div>
        <Label className="text-foreground font-medium mb-3 block">
          Style preference
        </Label>
        <RadioGroup
          value={formData.stylePreference}
          onValueChange={(v) => updateField("stylePreference", v)}
          className="grid grid-cols-3 gap-3"
        >
          {STYLE_PREFERENCES.map((pref) => (
            <Label
              key={pref.value}
              htmlFor={`style-${pref.value}`}
              className={`flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                formData.stylePreference === pref.value
                  ? "border-primary bg-primary-soft shadow-md"
                  : "border-border hover:border-muted-foreground hover:bg-muted"
              }`}
              data-testid={`style-${pref.value}`}
            >
              <RadioGroupItem value={pref.value} id={`style-${pref.value}`} className="sr-only" />
              <Palette className={`h-6 w-6 mb-2 ${
                formData.stylePreference === pref.value ? "text-primary" : "text-muted-foreground"
              }`} />
              <span className="font-semibold text-foreground text-sm">{pref.label}</span>
              <span className="text-xs text-muted-foreground text-center mt-1 leading-tight">{pref.description}</span>
            </Label>
          ))}
        </RadioGroup>
      </div>

      <div>
        <Label className="text-foreground font-medium mb-3 block">
          Color theme
        </Label>
        <RadioGroup
          value={formData.colorTheme}
          onValueChange={(v) => updateField("colorTheme", v)}
          className="grid grid-cols-4 gap-3"
        >
          {COLOR_THEMES.map((theme) => (
            <Label
              key={theme.value}
              htmlFor={`color-${theme.value}`}
              className={`flex flex-col items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                formData.colorTheme === theme.value
                  ? "border-primary bg-primary-soft shadow-md"
                  : "border-border hover:border-muted-foreground hover:bg-muted"
              }`}
              data-testid={`color-${theme.value}`}
            >
              <RadioGroupItem value={theme.value} id={`color-${theme.value}`} className="sr-only" />
              <div className="flex gap-1 mb-2">
                {theme.colors.map((color, i) => (
                  <div 
                    key={i}
                    className="w-5 h-5 rounded-full shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <span className="font-semibold text-foreground text-sm">{theme.label}</span>
            </Label>
          ))}
        </RadioGroup>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <Label className="text-foreground font-medium mb-3 block">
            Logo <span className="text-muted-foreground">(optional)</span>
          </Label>
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
            {formData.logoUrl ? (
              <div className="space-y-2">
                <CheckCircle2 className="h-8 w-8 text-semantic-success mx-auto" />
                <p className="text-sm text-semantic-success font-medium">Logo uploaded</p>
                <button 
                  onClick={() => updateField("logoUrl", "")}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Remove
                </button>
              </div>
            ) : (
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={5242880}
                onGetUploadParameters={getUploadParameters}
                onComplete={(result) => {
                  const file = result.successful?.[0];
                  if (file?.uploadURL) {
                    updateField("logoUrl", file.uploadURL.split("?")[0]);
                  }
                }}
                buttonClassName="bg-muted hover:bg-secondary text-foreground border-0"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Logo
              </ObjectUploader>
            )}
          </div>
        </div>

        <div>
          <Label className="text-foreground font-medium mb-3 block">
            Hero image <span className="text-muted-foreground">(optional)</span>
          </Label>
          <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors">
            {formData.heroImageUrl ? (
              <div className="space-y-2">
                <CheckCircle2 className="h-8 w-8 text-semantic-success mx-auto" />
                <p className="text-sm text-semantic-success font-medium">Image uploaded</p>
                <button 
                  onClick={() => updateField("heroImageUrl", "")}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Remove
                </button>
              </div>
            ) : (
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={10485760}
                onGetUploadParameters={getUploadParameters}
                onComplete={(result) => {
                  const file = result.successful?.[0];
                  if (file?.uploadURL) {
                    updateField("heroImageUrl", file.uploadURL.split("?")[0]);
                  }
                }}
                buttonClassName="bg-muted hover:bg-secondary text-foreground border-0"
              >
                <Image className="h-4 w-4 mr-2" />
                Upload Hero Image
              </ObjectUploader>
            )}
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" data-testid="text-error">{error}</p>
      )}

      <div className="flex gap-3 pt-2">
        <BrandButton 
          variant="secondary" 
          size="lg" 
          icon={ArrowLeft}
          className="flex-1"
          onClick={onBack}
          data-testid="button-back"
        >
          Back
        </BrandButton>
        <BrandButton 
          variant="accent" 
          size="lg" 
          icon={Sparkles}
          className="flex-[2]"
          onClick={onSubmit}
          data-testid="button-generate"
        >
          Generate Website
        </BrandButton>
      </div>
    </div>
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
  const steps: GenerationStep[] = ["creating_pages", "writing_seo", "generating_assets", "publishing"];
  const stepIndex = steps.indexOf(step);
  const currentIndex = steps.indexOf(current);
  
  const isComplete = stepIndex < currentIndex;
  const isActive = stepIndex === currentIndex;

  return (
    <div className="flex items-center gap-3">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${
        isComplete 
          ? "bg-semantic-success/10" 
          : isActive 
            ? "bg-gradient-to-br from-primary via-pink-500 to-gold" 
            : "bg-muted"
      }`}>
        {isComplete ? (
          <CheckCircle2 className="h-4 w-4 text-semantic-success" />
        ) : isActive ? (
          <Loader2 className="h-3 w-3 text-white animate-spin" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
        )}
      </div>
      <span className={`text-sm ${
        isComplete ? "text-semantic-success" : isActive ? "text-foreground font-medium" : "text-muted-foreground"
      }`}>
        {label}
      </span>
    </div>
  );
}
