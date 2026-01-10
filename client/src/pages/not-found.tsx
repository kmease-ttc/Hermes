import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Home, Search, Eye } from "lucide-react";
import { ROUTES, resolveDeprecatedRoute } from "@shared/routes";
import { MarketingLayout } from "@/components/layout/MarketingLayout";

export default function NotFound() {
  const [location, navigate] = useLocation();

  useEffect(() => {
    console.warn(`[Routes] 404 - Page not found: ${location}`);
    
    const redirectTarget = resolveDeprecatedRoute(location);
    if (redirectTarget) {
      console.info(`[Routes] Redirecting deprecated route ${location} -> ${redirectTarget}`);
      navigate(redirectTarget, { replace: true });
    }
  }, [location, navigate]);

  return (
    <MarketingLayout>
      <div className="flex-1 flex items-center justify-center py-20 px-4">
        <div className="text-center max-w-lg">
          <div className="mb-8">
            <span 
              className="text-[150px] md:text-[200px] font-bold leading-none"
              style={{
                background: "linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              404
            </span>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
            Page not found
          </h1>
          
          <p className="text-lg text-slate-600 mb-10">
            The page you're looking for doesn't exist or may have moved.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={ROUTES.LANDING}>
              <Button 
                size="lg"
                className="w-full sm:w-auto gap-2 text-white font-medium"
                style={{
                  background: "linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B)"
                }}
                data-testid="button-go-homepage"
              >
                <Home className="w-4 h-4" />
                Go to Homepage
              </Button>
            </Link>
            
            <Link href={ROUTES.SCAN}>
              <Button 
                variant="outline"
                size="lg"
                className="w-full sm:w-auto gap-2 font-medium border-slate-300 text-slate-700 hover:bg-slate-50"
                data-testid="button-analyze-website"
              >
                <Search className="w-4 h-4" />
                Analyze My Website
              </Button>
            </Link>
            
            <Link href={ROUTES.EXAMPLES}>
              <Button 
                variant="ghost"
                size="lg"
                className="w-full sm:w-auto gap-2 font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100"
                data-testid="button-see-examples"
              >
                <Eye className="w-4 h-4" />
                See Examples
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
