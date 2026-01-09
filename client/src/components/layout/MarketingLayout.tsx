import { Link } from "wouter";
import { ROUTES } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
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
            <Link href={ROUTES.HOW_IT_WORKS} className="hidden md:block">
              <span className="text-sm text-slate-700 hover:text-slate-950 transition-colors cursor-pointer font-medium" data-testid="link-how-it-works">
                How It Works
              </span>
            </Link>
            <Link href={ROUTES.USE_CASES} className="hidden md:block">
              <span className="text-sm text-slate-700 hover:text-slate-950 transition-colors cursor-pointer font-medium" data-testid="link-use-cases">
                Use Cases
              </span>
            </Link>
            <Link href={ROUTES.PRICING} className="hidden md:block">
              <span className="text-sm text-slate-700 hover:text-slate-950 transition-colors cursor-pointer font-medium" data-testid="link-pricing">
                Pricing
              </span>
            </Link>
            <Link href="/login">
              <Button 
                variant="ghost" 
                size="sm" 
                className="gap-2 text-slate-700 hover:text-slate-950 hover:bg-slate-100 font-medium" 
                data-testid="button-login"
              >
                <LogIn className="h-4 w-4" />
                <span>Log In</span>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
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
                <Link href={ROUTES.HOW_IT_WORKS}>
                  <span className="text-sm text-[#CBD5E1] hover:text-white cursor-pointer">How It Works</span>
                </Link>
                <Link href={ROUTES.USE_CASES}>
                  <span className="text-sm text-[#CBD5E1] hover:text-white cursor-pointer">Use Cases</span>
                </Link>
                <Link href={ROUTES.PRICING}>
                  <span className="text-sm text-[#CBD5E1] hover:text-white cursor-pointer">Pricing</span>
                </Link>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-white">Legal</h4>
              <div className="flex flex-col gap-2">
                <Link href={ROUTES.PRIVACY}>
                  <span className="text-sm text-[#CBD5E1] hover:text-white cursor-pointer">Privacy Policy</span>
                </Link>
                <Link href={ROUTES.TERMS}>
                  <span className="text-sm text-[#CBD5E1] hover:text-white cursor-pointer">Terms of Service</span>
                </Link>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-medium text-white">Contact</h4>
              <div className="flex flex-col gap-2">
                <a href="mailto:hello@arclo.io" className="text-sm text-[#CBD5E1] hover:text-white">
                  hello@arclo.io
                </a>
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
