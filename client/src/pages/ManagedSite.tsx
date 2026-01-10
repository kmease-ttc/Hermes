import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation } from "@tanstack/react-query";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { SEOHead } from "@/components/marketing/SEOHead";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Loader2, Globe, Building2, Mail, Phone, MapPin, FileText } from "lucide-react";

interface ManagedSiteFormData {
  websiteUrl: string;
  businessName: string;
  industry: string;
  location: string;
  email: string;
  phone: string;
  serviceType: string;
  notes: string;
}

export default function ManagedSite() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ManagedSiteFormData>({
    defaultValues: {
      websiteUrl: "",
      businessName: "",
      industry: "",
      location: "",
      email: "",
      phone: "",
      serviceType: "",
      notes: "",
    },
  });

  const serviceType = watch("serviceType");

  const submitMutation = useMutation({
    mutationFn: async (data: ManagedSiteFormData) => {
      const res = await fetch("/api/leads/managed-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to submit");
      }
      return res.json();
    },
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const onSubmit = (data: ManagedSiteFormData) => {
    submitMutation.mutate(data);
  };

  if (submitted) {
    return (
      <MarketingLayout>
        <div className="py-20 px-4">
          <div className="max-w-lg mx-auto text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-3xl font-bold mb-4" data-testid="text-thank-you-title">
              Thank You!
            </h1>
            <p className="text-lg text-muted-foreground" data-testid="text-thank-you-message">
              We'll reach out within 1 business day
            </p>
          </div>
        </div>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      <SEOHead 
        path="/managed-site" 
        title="Managed Website Service – Let Arclo Build and Run Your Site"
        description="Focus on your business while Arclo builds, manages, and optimizes your website. Professional web presence without the hassle."
      />
      <div className="py-16 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4" data-testid="text-hero-title">
              Let Us Build & Manage Your Site
            </h1>
            <p className="text-lg text-muted-foreground" data-testid="text-hero-subtitle">
              Focus on your business while we handle your web presence
            </p>
          </div>

          <Card className="bg-card border-border">
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="websiteUrl" className="flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    Website URL
                  </Label>
                  <Input
                    id="websiteUrl"
                    type="text"
                    placeholder="https://example.com"
                    data-testid="input-website-url"
                    {...register("websiteUrl", {
                      required: "Website URL is required",
                    })}
                  />
                  {errors.websiteUrl && (
                    <p className="text-sm text-destructive" data-testid="error-website-url">
                      {errors.websiteUrl.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="businessName" className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Business Name
                  </Label>
                  <Input
                    id="businessName"
                    type="text"
                    placeholder="Your Business Name"
                    data-testid="input-business-name"
                    {...register("businessName")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Input
                    id="industry"
                    type="text"
                    placeholder="e.g., Healthcare, Retail, Technology"
                    data-testid="input-industry"
                    {...register("industry")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location (City/State)
                  </Label>
                  <Input
                    id="location"
                    type="text"
                    placeholder="e.g., Austin, TX"
                    data-testid="input-location"
                    {...register("location")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    data-testid="input-email"
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: "Invalid email address",
                      },
                    })}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive" data-testid="error-email">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    Phone (optional)
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    data-testid="input-phone"
                    {...register("phone")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serviceType">What do you want?</Label>
                  <Select
                    value={serviceType}
                    onValueChange={(value) => setValue("serviceType", value)}
                  >
                    <SelectTrigger data-testid="select-service-type">
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new_site" data-testid="option-new-site">
                        New site
                      </SelectItem>
                      <SelectItem value="rebuild" data-testid="option-rebuild">
                        Rebuild
                      </SelectItem>
                      <SelectItem value="hosting_management" data-testid="option-hosting-management">
                        Hosting + ongoing management
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Notes (optional)
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Tell us more about your project..."
                    rows={4}
                    data-testid="textarea-notes"
                    {...register("notes")}
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={submitMutation.isPending}
                  data-testid="button-submit"
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Get Started"
                  )}
                </Button>

                {submitMutation.isError && (
                  <p className="text-sm text-destructive text-center" data-testid="error-submit">
                    {submitMutation.error.message}
                  </p>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </MarketingLayout>
  );
}
