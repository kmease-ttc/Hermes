import { useEffect } from "react";
import { useLocation, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, ArrowLeft, Compass } from "lucide-react";
import { ROUTES, resolveDeprecatedRoute } from "@shared/routes";

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

  const handleGoBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate(ROUTES.DASHBOARD);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 space-y-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-full bg-semantic-danger/10">
              <AlertCircle className="h-6 w-6 text-semantic-danger" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Page Not Found</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                The page you're looking for doesn't exist or may have moved.
              </p>
            </div>
          </div>

          <div className="p-3 bg-muted/50 rounded-md">
            <p className="text-xs text-muted-foreground font-mono break-all">
              {location}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              onClick={handleGoBack}
              variant="outline"
              className="w-full justify-start gap-2"
              data-testid="button-go-back"
            >
              <ArrowLeft className="w-4 h-4" />
              Go Back
            </Button>
            
            <Link href={ROUTES.DASHBOARD}>
              <Button 
                className="w-full justify-start gap-2"
                data-testid="button-go-dashboard"
              >
                <Home className="w-4 h-4" />
                Go to Mission Control
              </Button>
            </Link>
            
            <Link href={ROUTES.CREW}>
              <Button 
                variant="ghost"
                className="w-full justify-start gap-2 text-muted-foreground"
                data-testid="button-go-crew"
              >
                <Compass className="w-4 h-4" />
                Browse Crew
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
