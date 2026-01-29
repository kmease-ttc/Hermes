import { Link } from "wouter";
import { ROUTES } from "@shared/routes";
import { BrandButton } from "@/components/marketing/BrandButton";
import { Sparkles } from "lucide-react";

export function BottomCTA() {
  return (
    <section className="px-4 sm:px-5 md:px-6 py-12 sm:py-16 md:py-24">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-foreground mb-4 tracking-tight">
          Ready to never think about SEO again?
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 max-w-lg mx-auto">
          Get a professional website in 60 seconds. Let Arclo handle the rest.
        </p>
        
        <Link href={ROUTES.WEBSITE_GENERATOR}>
          <BrandButton
            variant="primary"
            size="lg"
            className="gap-2"
            data-testid="button-bottom-cta"
          >
            <Sparkles className="h-4 w-4" />
            Generate My Site
          </BrandButton>
        </Link>
        
        <p className="text-sm text-muted-foreground mt-4">
          Free preview. No credit card.
        </p>
      </div>
    </section>
  );
}
