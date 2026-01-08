import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { IconBadge } from "@/components/marketing/IconBadge";
import { Link } from "wouter";
import { ROUTES } from "@shared/routes";
import { Search, Sparkles, TrendingUp, CheckCircle2, FileX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function HowItWorks() {
  return (
    <MarketingLayout>
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-[#020617] mb-4">
              SEO that runs on autopilot
            </h1>
            <p className="text-xl text-[#334155]">
              Arclo finds issues, fixes them automatically, and keeps your site optimized — without you reviewing reports or making decisions.
            </p>
          </div>

          <div className="bg-[#ECFDF5] border-2 border-[#16A34A] rounded-xl p-6 mb-16">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#15803D] flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-[#0F172A] text-lg">No work required</h3>
                <p className="text-[#334155]">
                  Arclo runs automatically in the background. You'll only hear from us when something improves — or if action is needed.
                </p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-16">
            <Card className="bg-white border border-[#CBD5E1] shadow-[0_4px_12px_rgba(15,23,42,0.06)]">
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  <IconBadge icon={Search} size="sm" />
                </div>
                <h2 className="text-lg font-bold text-[#020617] mb-2">
                  We find what's broken
                </h2>
                <p className="text-sm text-[#64748B]">
                  Continuous scans catch technical issues, content gaps, and missed opportunities.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-[#CBD5E1] shadow-[0_4px_12px_rgba(15,23,42,0.06)]">
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  <IconBadge icon={Sparkles} size="sm" />
                </div>
                <h2 className="text-lg font-bold text-[#020617] mb-2">
                  We fix it automatically
                </h2>
                <p className="text-sm text-[#64748B]">
                  Arclo applies proven fixes in the background — no approvals, no reviews required.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-[#CBD5E1] shadow-[0_4px_12px_rgba(15,23,42,0.06)]">
              <CardContent className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  <IconBadge icon={TrendingUp} size="sm" />
                </div>
                <h2 className="text-lg font-bold text-[#020617] mb-2">
                  Your traffic improves
                </h2>
                <p className="text-sm text-[#64748B]">
                  Rankings and performance improve over time while you focus on your business.
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-8 mb-16">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-[#FEE2E2] flex items-center justify-center shrink-0">
                <FileX className="w-6 h-6 text-[#DC2626]" />
              </div>
              <div>
                <h3 className="font-bold text-[#0F172A] text-lg mb-1">You don't need to review SEO reports</h3>
                <p className="text-[#334155]">
                  Arclo generates reports for transparency — not for decision-making. You can ignore them entirely and let everything run automatically.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center bg-white border border-[#CBD5E1] rounded-xl p-10 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
            <h2 className="text-2xl font-bold text-[#020617] mb-6">
              Want to be completely hands-off?
            </h2>
            <Link href={ROUTES.LANDING}>
              <button 
                className="h-14 px-10 text-lg font-semibold rounded-lg bg-[linear-gradient(135deg,#22C55E_0%,#16A34A_100%)] text-white shadow-[0_10px_20px_rgba(22,163,74,0.25)] hover:shadow-[0_10px_20px_rgba(22,163,74,0.40)] hover:brightness-110 hover:scale-[1.02] transition-all duration-200 flex items-center gap-2 mx-auto"
                data-testid="button-fix-my-seo"
              >
                <Sparkles className="w-5 h-5" />
                Fix my SEO automatically
              </button>
            </Link>
            <Link href={ROUTES.FREE_REPORT}>
              <button 
                className="mt-4 text-[#2563EB] hover:text-[#1D4ED8] text-sm font-medium transition-colors underline underline-offset-2"
                data-testid="link-see-what-changes"
              >
                See what will change
              </button>
            </Link>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
