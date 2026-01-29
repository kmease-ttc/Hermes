import { Link } from "wouter";
import { ROUTES } from "@shared/routes";
import { Button } from "@/components/ui/button";
import { Sparkles, Search, Menu, X } from "lucide-react";
import arcloLogo from "@assets/A_small_logo_1765393189114.png";
import { useState, useEffect, useCallback, useRef } from "react";

interface MarketingLayoutProps {
  children: React.ReactNode;
}

export function MarketingLayout({ children }: MarketingLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const closeMobileMenu = useCallback(() => {
    setMobileMenuOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && mobileMenuOpen) {
        closeMobileMenu();
      }
    };

    if (mobileMenuOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen, closeMobileMenu]);

  useEffect(() => {
    if (mobileMenuOpen && menuRef.current) {
      const focusableElements = menuRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== "Tab") return;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      };

      document.addEventListener("keydown", handleTabKey);
      firstElement?.focus();

      return () => {
        document.removeEventListener("keydown", handleTabKey);
      };
    }
  }, [mobileMenuOpen]);

  return (
    <div className="marketing-theme marketing-shell min-h-screen flex flex-col text-muted-foreground marketing-hero-wash">
      <header className="sticky top-0 z-50 w-full border-b border-[#CBD5E1] bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href={ROUTES.LANDING}>
            <div className="flex items-center cursor-pointer" data-testid="link-home">
              <img src={arcloLogo} alt="Arclo" className="h-10 w-auto" fetchPriority="high" />
            </div>
          </Link>
          
          <nav className="flex items-center gap-4 md:gap-6">
            <Link href={ROUTES.EXAMPLES} className="hidden md:block">
              <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium" data-testid="link-examples">
                Examples
              </span>
            </Link>
            <Link href={ROUTES.HOW_IT_WORKS} className="hidden md:block">
              <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium" data-testid="link-how-it-works">
                How It Works
              </span>
            </Link>
            <Link href={ROUTES.PRICING} className="hidden md:block">
              <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium" data-testid="link-pricing">
                Pricing
              </span>
            </Link>
            <Link href="/login" className="hidden md:block">
              <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium" data-testid="link-login">
                Log In
              </span>
            </Link>
            <Link href={ROUTES.WEBSITE_GENERATOR} className="hidden md:block">
              <Button
                size="sm"
                className="gap-2 font-medium text-white hover:opacity-90"
                style={{ background: "#7C3AED" }}
                data-testid="button-generate-site"
              >
                <Sparkles className="h-4 w-4" />
                Generate My Site
              </Button>
            </Link>
            <Link href={ROUTES.SCAN} className="hidden md:block">
              <Button 
                size="sm" 
                className="gap-2 text-white font-medium"
                style={{
                  background: "linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B)"
                }}
                data-testid="button-analyze-site"
              >
                <Search className="h-4 w-4" />
                Analyze My Website
              </Button>
            </Link>
            <button
              ref={menuButtonRef}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </nav>
        </div>
      </header>

      {mobileMenuOpen && (
        <div
          ref={menuRef}
          className="fixed inset-0 top-16 z-40 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90 md:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation menu"
          data-testid="mobile-menu-overlay"
        >
          <nav className="container mx-auto px-4 py-6 flex flex-col gap-4">
            <Link href={ROUTES.EXAMPLES} onClick={closeMobileMenu}>
              <span className="block py-3 text-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium border-b border-border" data-testid="mobile-link-examples">
                Examples
              </span>
            </Link>
            <Link href={ROUTES.HOW_IT_WORKS} onClick={closeMobileMenu}>
              <span className="block py-3 text-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium border-b border-border" data-testid="mobile-link-how-it-works">
                How It Works
              </span>
            </Link>
            <Link href={ROUTES.PRICING} onClick={closeMobileMenu}>
              <span className="block py-3 text-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium border-b border-border" data-testid="mobile-link-pricing">
                Pricing
              </span>
            </Link>
            <Link href="/login" onClick={closeMobileMenu}>
              <span className="block py-3 text-lg text-muted-foreground hover:text-foreground transition-colors cursor-pointer font-medium border-b border-border" data-testid="mobile-link-login">
                Log In
              </span>
            </Link>
            <div className="flex flex-col gap-3 pt-4">
              <Link href={ROUTES.WEBSITE_GENERATOR} onClick={closeMobileMenu}>
                <Button
                  size="lg"
                  className="w-full gap-2 font-medium text-white hover:opacity-90"
                  style={{ background: "#7C3AED" }}
                  data-testid="mobile-button-generate-site"
                >
                  <Sparkles className="h-4 w-4" />
                  Generate My Site
                </Button>
              </Link>
              <Link href={ROUTES.SCAN} onClick={closeMobileMenu}>
                <Button 
                  size="lg" 
                  className="w-full gap-2 text-white font-medium"
                  style={{
                    background: "linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B)"
                  }}
                  data-testid="mobile-button-analyze-site"
                >
                  <Search className="h-4 w-4" />
                  Analyze My Website
                </Button>
              </Link>
            </div>
          </nav>
        </div>
      )}

      <main className="flex-1">
        {children}
      </main>

      <footer className="bg-[#020617] relative">
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, #8B5CF6, #EC4899, #F59E0B)" }} />
        <div className="container mx-auto px-4 md:px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2 md:col-span-1 space-y-4">
              <div className="flex items-center">
                <img src={arcloLogo} alt="Arclo" className="h-8 w-auto" loading="lazy" />
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
