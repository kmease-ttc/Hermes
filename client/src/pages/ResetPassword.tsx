import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { AlertCircle, Loader2, KeyRound, CheckCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PasswordRequirements, isPasswordValid } from "@/components/ui/PasswordRequirements";
import arcloLogo from "@assets/A_small_logo_1765393189114.png";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [, navigate] = useLocation();
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const token = params.get("token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Invalid reset link. Please request a new one.");
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

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to reset password");
        setLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <MarketingLayout>
        <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
          <div className="max-w-md mx-auto">
            <Card className="bg-white border border-[#CBD5E1] shadow-[0_8px_24px_rgba(15,23,42,0.08)] rounded-2xl">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <img src={arcloLogo} alt="Arclo" className="h-16 w-auto" />
                </div>
                <CardTitle className="text-2xl text-[#020617]">Invalid Reset Link</CardTitle>
                <CardDescription className="text-[#64748B]">
                  This password reset link is invalid or has expired.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-[#64748B] text-sm">
                  Please request a new password reset link.
                </p>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="primaryGradient"
                  className="w-full"
                  onClick={() => navigate("/forgot-password")}
                  data-testid="button-request-new-link"
                >
                  Request New Link
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </MarketingLayout>
    );
  }

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
                <CardTitle className="text-2xl text-[#020617]">Password Reset!</CardTitle>
                <CardDescription className="text-[#64748B]">
                  Your password has been reset successfully.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-[#64748B] text-sm">
                  You can now sign in with your new password.
                </p>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="primaryGradient"
                  className="w-full"
                  onClick={() => navigate("/login")}
                  data-testid="button-go-to-login"
                >
                  Sign In
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
              <CardTitle className="text-2xl text-[#020617]">Set New Password</CardTitle>
              <CardDescription className="text-[#64748B]">
                Enter your new password below
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
                  <Label htmlFor="password" className="text-[#334155]">New Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    data-testid="input-reset-password"
                  />
                  <PasswordRequirements password={password} className="mt-2" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-[#334155]">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={loading}
                    data-testid="input-reset-confirm-password"
                  />
                </div>

                <Button 
                  type="submit" 
                  variant="primaryGradient"
                  className="w-full" 
                  disabled={loading}
                  data-testid="button-reset-submit"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </MarketingLayout>
  );
}
