import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface AccountCTASectionProps {
  scanId?: string;
}

export function AccountCTASection({ scanId }: AccountCTASectionProps) {
  const signupUrl = scanId ? `/signup?scanId=${scanId}` : "/signup";

  return (
    <section data-testid="section-account-cta" className="print:hidden">
      <Card className="bg-gradient-to-r from-violet-600 via-pink-500 to-amber-500 border-0 overflow-hidden">
        <CardContent className="py-10 text-center space-y-4 relative">
          <svg width="40" height="40" viewBox="0 0 48 48" aria-hidden="true" className="mx-auto">
            <path
              d="M24 4l19 36h-8l-3.2-6.2H16.2L13 40H5L24 4zm-4.8 23h9.6L24 17.7 19.2 27z"
              fill="white"
            />
          </svg>
          <h2
            className="text-2xl md:text-3xl font-bold"
            style={{ color: "#FFFFFF" }}
          >
            Ready to Improve These Rankings?
          </h2>
          <p
            className="max-w-xl mx-auto"
            style={{ color: "rgba(255,255,255,0.85)" }}
          >
            Create your free Arclo Pro account and let us start applying fixes,
            building authority, and pushing your rankings upward — automatically.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button
              size="lg"
              className="bg-white text-violet-700 hover:bg-white/90 shadow-lg font-semibold text-base"
              onClick={() => {
                window.location.href = signupUrl;
              }}
              data-testid="cta-create-account"
            >
              Create Free Account
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
