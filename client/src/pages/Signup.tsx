import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, AlertCircle, Loader2, UserPlus, CheckCircle, Mail } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PasswordRequirements, isPasswordValid } from "@/components/ui/PasswordRequirements";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { buildRoute, ROUTES } from "@shared/routes";
import arcloLogo from "@assets/A_small_logo_1765393189114.png";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const scanId = params.get("scanId");

  const signupMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; displayName?: string; scanId?: string; websiteUrl?: string }) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Signup failed");
      }
      return result;
    },
    onSuccess: (data) => {
      if (data.existingAccount) {
        // Redirect to login with a message
        navigate(`/login?message=${encodeURIComponent("You already have an account. Please sign in.")}&email=${encodeURIComponent(email)}`);
      } else {
        setSuccess(true);
      }
    },
    onError: (error: Error) => {
      setError(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!isPasswordValid(password)) {
      setError("Password does not meet all requirements");
      return;
    }

    signupMutation.mutate({ 
      email, 
      password, 
      displayName: displayName.trim() || undefined,
      scanId: scanId || undefined,
    });
  };

  if (success) {
    return (
      <MarketingLayout>
        <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
          <div className="max-w-md mx-auto">
            <Card className="bg-white border border-[#CBD5E1] shadow-[0_8px_24px_rgba(15,23,42,0.08)] rounded-2xl">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <img src={arcloLogo} alt="Arclo" className="h-16 w-auto" />
                </div>
                <CardTitle className="text-2xl text-[#020617]">Check your email</CardTitle>
                <CardDescription className="text-[#64748B]">
                  We sent a verification link to <span className="text-[#15803D] font-medium">{email}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-center">
                <p className="text-[#64748B] text-sm">
                  Click the link in the email to verify your account. The link expires in 24 hours.
                </p>
                <p className="text-[#64748B] text-xs">
                  Didn't receive the email? Check your spam folder or{" "}
                  <a href="/resend-verification" className="text-[#15803D] hover:text-[#166534] hover:underline font-medium">
                    request a new link
                  </a>
                </p>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate("/login")}
                  data-testid="button-back-to-login"
                >
                  Back to Sign In
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="max-w-md mx-auto">
          <Card className="bg-white border border-[#CBD5E1] shadow-[0_8px_24px_rgba(15,23,42,0.08)] rounded-2xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <img src={arcloLogo} alt="Arclo" className="h-16 w-auto" />
              </div>
              <CardTitle className="text-2xl text-[#020617]">Create Your Free Account</CardTitle>
              <CardDescription className="text-[#64748B]">
                {scanId 
                  ? "Unlock your full SEO report and start deploying fixes"
                  : "Get started with automated SEO"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-[#334155]">Name (optional)</Label>
                  <Input
                    id="displayName"
                    type="text"
                    placeholder="Your name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={signupMutation.isPending}
                    data-testid="input-signup-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-[#334155]">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={signupMutation.isPending}
                    data-testid="input-signup-email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[#334155]">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={signupMutation.isPending}
                    data-testid="input-signup-password"
                  />
                  <PasswordRequirements password={password} className="mt-2" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-[#334155]">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={signupMutation.isPending}
                    data-testid="input-signup-confirm-password"
                  />
                </div>

                <Button 
                  type="submit" 
                  variant="primaryGradient"
                  className="w-full h-12" 
                  disabled={signupMutation.isPending}
                  data-testid="button-signup-submit"
                >
                  {signupMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create Free Account
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2 text-sm text-[#64748B]">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                  <span>Free forever for basic features</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#64748B]">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[#64748B]">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                  <span>Cancel anytime</span>
                </div>
              </div>

              <p className="text-center text-sm text-[#64748B] mt-6">
                Already have an account?{" "}
                <a href="/login" className="text-[#15803D] hover:text-[#166534] hover:underline font-medium">
                  Sign in
                </a>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </MarketingLayout>
  );
}
