import { Link } from "wouter";
import { ROUTES } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Sparkles, Search } from "lucide-react";
import arcloLogo from "@assets/A_small_logo_1765393189114.png";

interface MarketingLayoutProps {
  children: React.ReactNode;
}

export function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="marketing-theme min-h-screen flex flex-col text-slate-700 marketing-hero-wash">
      <header className="sticky top-0 z-50 w-full border-b border-[#CBD5E1] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href={ROUTES.LANDING}>
            <div className="flex items-center cursor-pointer" data-testid="link-home">
              <img src={arcloLogo} alt="Arclo" className="h-10 w-auto" />
            </div>
          </Link>
          
          <nav className="flex items-center gap-4 md:gap-6">
            <Link href={ROUTES.EXAMPLES} className="hidden md:block">
              <span className="text-sm text-slate-700 hover:text-slate-950 transition-colors cursor-pointer font-medium" data-testid="link-examples">
                Examples
              </span>
            </Link>
            <Link href={ROUTES.HOW_IT_WORKS} className="hidden md:block">
              <span className="text-sm text-slate-700 hover:text-slate-950 transition-colors cursor-pointer font-medium" data-testid="link-how-it-works">
                How It Works
              </span>
            </Link>
            <Link href={ROUTES.PRICING} className="hidden md:block">
              <span className="text-sm text-slate-700 hover:text-slate-950 transition-colors cursor-pointer font-medium" data-testid="link-pricing">
                Pricing
              </span>
            </Link>
            <Link href="/login" className="hidden md:block">
              <span className="text-sm text-slate-700 hover:text-slate-950 transition-colors cursor-pointer font-medium" data-testid="link-login">
                Log In
              </span>
            </Link>
            <Link href={ROUTES.WEBSITE_GENERATOR} className="hidden md:block">
              <Button 
                variant="outline"
                size="sm" 
                className="gap-2 font-medium border-violet-200 text-violet-700 hover:bg-violet-50"
                data-testid="button-generate-site"
              >
                <Sparkles className="h-4 w-4" />
                Generate My Site
              </Button>
            </Link>
            <Link href={ROUTES.SCAN}>
              <Button 
                size="sm" 
                className="gap-2 text-white font-medium"
                style={{
                  background: "linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B)"
                }}
                data-testid="button-analyze-site"
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Analyze My Website</span>
                <span className="sm:hidden">Analyze</span>
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="bg-[#020617] relative">
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, #8B5CF6, #EC4899, #F59E0B)" }} />
        <div className="container mx-auto px-4 md:px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2 md:col-span-1 space-y-4">
              <div className="flex items-center">
                <img src={arcloLogo} alt="Arclo" className="h-8 w-auto" />
              </div>
              <p className="text-sm text-[#CBD5E1]">
                Fully automated SEO from audit to execution.
              </p>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-white">Product</h4>
              <div className="flex flex-col gap-2">
                <Link href={ROUTES.EXAMPLES}>
                  <span className="text-sm text-[#CBD5E1] hover:text-white cursor-pointer">Examples</span>
                </Link>
                <Link href={ROUTES.HOW_IT_WORKS}>
                  <span className="text-sm text-[#CBD5E1] hover:text-white cursor-pointer">How It Works</span>
                </Link>
                <Link href={ROUTES.PRICING}>
                  <span className="text-sm text-[#CBD5E1] hover:text-white cursor-pointer">Pricing</span>
                </Link>
                <Link href={ROUTES.WEBSITE_GENERATOR}>
                  <span className="text-sm text-[#CBD5E1] hover:text-white cursor-pointer">Generate a Site</span>
                </Link>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-white">Industries</h4>
              <div className="flex flex-col gap-2">
                <Link href={`${ROUTES.EXAMPLES}?industry=plumbing`}>
                  <span className="text-sm text-[#CBD5E1] hover:text-white cursor-pointer">Plumbing</span>
                </Link>
                <Link href={`${ROUTES.EXAMPLES}?industry=hvac`}>
                  <span className="text-sm text-[#CBD5E1] hover:text-white cursor-pointer">HVAC</span>
                </Link>
                <Link href={`${ROUTES.EXAMPLES}?industry=electrical`}>
                  <span className="text-sm text-[#CBD5E1] hover:text-white cursor-pointer">Electrical</span>
                </Link>
                <Link href={`${ROUTES.EXAMPLES}?industry=landscaping`}>
                  <span className="text-sm text-[#CBD5E1] hover:text-white cursor-pointer">Landscaping</span>
                </Link>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-white">Company</h4>
              <div className="flex flex-col gap-2">
                <a href="mailto:hello@arclo.io" className="text-sm text-[#CBD5E1] hover:text-white">
                  Contact
                </a>
                <Link href={ROUTES.PRIVACY}>
                  <span className="text-sm text-[#CBD5E1] hover:text-white cursor-pointer">Privacy</span>
                </Link>
                <Link href={ROUTES.TERMS}>
                  <span className="text-sm text-[#CBD5E1] hover:text-white cursor-pointer">Terms</span>
                </Link>
              </div>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-[#1E293B] flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-[#CBD5E1]">
              © {new Date().getFullYear()} Arclo. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
