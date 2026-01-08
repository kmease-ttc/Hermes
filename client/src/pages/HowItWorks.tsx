import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { IconBadge } from "@/components/marketing/IconBadge";
import { Link } from "wouter";
import { ROUTES } from "@shared/routes";
import { Search, Sparkles, TrendingUp, CheckCircle2, FileX } from "lucide-react";

export default function HowItWorks() {
  return (
    <MarketingLayout>
      <div 
        className="min-h-screen"
        style={{
          background: `
            radial-gradient(1200px circle at 10% 0%, rgba(139, 92, 246, 0.06), transparent 40%),
            radial-gradient(1200px circle at 90% 10%, rgba(236, 72, 153, 0.04), transparent 40%),
            radial-gradient(800px circle at 50% 80%, rgba(245, 158, 11, 0.03), transparent 40%),
            #FFFFFF
          `
        }}
      >
        <div className="container mx-auto px-4 md:px-6 py-16 md:py-24">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h1 className="text-4xl md:text-6xl font-bold text-[#020617] mb-6 tracking-tight">
                SEO that runs on{" "}
                <span 
                  className="bg-clip-text text-transparent"
                  style={{
                    backgroundImage: "linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B)"
                  }}
                >
                  autopilot
                </span>
              </h1>
              <p className="text-xl text-[#334155] max-w-2xl mx-auto">
                Arclo finds issues, fixes them automatically, and keeps your site optimized — without you reviewing reports or making decisions.
              </p>
            </div>

            <div className="bg-violet-50/60 border border-violet-200 rounded-2xl p-8 mb-20">
              <div className="flex items-center gap-5">
                <div 
                  className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-violet-500 via-pink-500 to-amber-400"
                >
                  <CheckCircle2 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-[#0F172A] text-xl mb-1">No work required</h3>
                  <p className="text-[#334155] text-lg">
                    Arclo runs automatically in the background. You'll only hear from us when something improves — or if action is needed.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-20">
              <div 
                className="rounded-2xl p-8 text-center transition-all duration-200 hover:-translate-y-1"
                style={{
                  background: "linear-gradient(180deg, #FFFFFF, #F8FAFC)",
                  border: "1px solid rgba(15, 23, 42, 0.06)",
                  boxShadow: "0 20px 40px rgba(15, 23, 42, 0.08)"
                }}
              >
                <div className="flex justify-center mb-5">
                  <IconBadge icon={Search} size="sm" />
                </div>
                <h2 className="text-xl font-bold text-[#020617] mb-3">
                  We find what's broken
                </h2>
                <p className="text-[#64748B]">
                  Continuous scans catch technical issues, content gaps, and missed opportunities.
                </p>
              </div>

              <div 
                className="rounded-2xl p-8 text-center transition-all duration-200 hover:-translate-y-1"
                style={{
                  background: "linear-gradient(180deg, #FFFFFF, #F8FAFC)",
                  border: "1px solid rgba(15, 23, 42, 0.06)",
                  boxShadow: "0 20px 40px rgba(15, 23, 42, 0.08)"
                }}
              >
                <div className="flex justify-center mb-5">
                  <IconBadge icon={Sparkles} size="sm" />
                </div>
                <h2 className="text-xl font-bold text-[#020617] mb-3">
                  We fix it automatically
                </h2>
                <p className="text-[#64748B]">
                  Arclo applies proven fixes in the background — no approvals, no reviews required.
                </p>
              </div>

              <div 
                className="rounded-2xl p-8 text-center transition-all duration-200 hover:-translate-y-1"
                style={{
                  background: "linear-gradient(180deg, #FFFFFF, #F8FAFC)",
                  border: "1px solid rgba(15, 23, 42, 0.06)",
                  boxShadow: "0 20px 40px rgba(15, 23, 42, 0.08)"
                }}
              >
                <div className="flex justify-center mb-5">
                  <IconBadge icon={TrendingUp} size="sm" />
                </div>
                <h2 className="text-xl font-bold text-[#020617] mb-3">
                  Your traffic improves
                </h2>
                <p className="text-[#64748B]">
                  Rankings and performance improve over time while you focus on your business.
                </p>
              </div>
            </div>

            <div 
              className="rounded-2xl p-8 mb-20"
              style={{
                background: "linear-gradient(180deg, #FFFFFF, #FAFAFA)",
                border: "1px solid rgba(15, 23, 42, 0.08)",
                boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)"
              }}
            >
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-violet-100 via-pink-100 to-amber-50 border border-slate-200">
                  <FileX className="w-7 h-7 text-violet-600" />
                </div>
                <div>
                  <h3 className="font-bold text-[#0F172A] text-xl mb-1">You don't need to review SEO reports</h3>
                  <p className="text-[#334155] text-lg">
                    Arclo generates reports for transparency — not for decision-making. You can ignore them completely and let everything run automatically.
                  </p>
                </div>
              </div>
            </div>

            <div 
              className="text-center rounded-2xl p-12"
              style={{
                background: "linear-gradient(180deg, #FFFFFF, #F8FAFC)",
                border: "1px solid rgba(15, 23, 42, 0.06)",
                boxShadow: "0 24px 48px rgba(15, 23, 42, 0.1)"
              }}
            >
              <h2 className="text-3xl font-bold text-[#020617] mb-8 tracking-tight">
                Want to be completely hands-off?
              </h2>
              <Link href={ROUTES.LANDING}>
                <button 
                  className="inline-flex items-center justify-center h-14 px-12 text-lg font-semibold rounded-xl text-white bg-gradient-to-r from-violet-500 via-pink-500 to-amber-400 shadow-[0_14px_30px_rgba(139,92,246,0.20)] hover:shadow-[0_18px_40px_rgba(236,72,153,0.22)] hover:-translate-y-0.5 transition-all duration-200 gap-3 mx-auto focus:outline-none focus:ring-4 focus:ring-violet-200"
                  data-testid="button-fix-my-seo"
                >
                  <Sparkles className="w-5 h-5" />
                  Fix my SEO automatically
                </button>
              </Link>
              <Link href={ROUTES.FREE_REPORT}>
                <button 
                  className="mt-5 text-violet-600 hover:text-pink-600 font-medium transition-colors"
                  data-testid="link-see-what-changes"
                >
                  See what will change →
                </button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
