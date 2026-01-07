import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { AlertCircle, Loader2, LogIn } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import arcloLogo from "@assets/A_small_logo_1765393189114.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showResendLink, setShowResendLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, authenticated } = useAuth();
  const [, navigate] = useLocation();

  // Redirect if already authenticated
  if (authenticated) {
    navigate("/app/dashboard");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setShowResendLink(false);
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      navigate("/app/dashboard");
    } else {
      setError(result.error || "Login failed");
      if (result.error?.includes("verify your email")) {
        setShowResendLink(true);
      }
      setLoading(false);
    }
  };

  return (
    <MarketingLayout>
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="max-w-md mx-auto">
          <Card className="bg-card border-border">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-4">
                <img src={arcloLogo} alt="Arclo" className="h-16 w-auto" />
              </div>
              <CardTitle className="text-2xl font-bold">Welcome to Arclo</CardTitle>
              <CardDescription>
                Sign in to access your SEO dashboard
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {error}
                      {showResendLink && (
                        <>
                          {" "}
                          <a href="/resend-verification" className="underline hover:opacity-80">
                            Resend verification email
                          </a>
                        </>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    data-testid="input-email"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    data-testid="input-password"
                  />
                </div>
              </CardContent>
              
              <CardFooter className="flex flex-col space-y-4">
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={loading}
                  data-testid="button-login"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-4 w-4" />
                      Sign in
                    </>
                  )}
                </Button>
                
                <div className="space-y-2 text-center">
                  <p className="text-sm text-muted-foreground">
                    Need an account?{" "}
                    <a href="/signup" className="text-primary hover:underline">
                      Create one
                    </a>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <a href="/forgot-password" className="hover:underline">
                      Forgot your password?
                    </a>
                  </p>
                </div>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </MarketingLayout>
  );
}
