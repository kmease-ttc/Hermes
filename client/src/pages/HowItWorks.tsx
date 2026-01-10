import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { SEOHead } from "@/components/marketing/SEOHead";
import { IconBadge } from "@/components/marketing/IconBadge";
import { Link } from "wouter";
import { ROUTES } from "@shared/routes";
import { 
  Search, 
  Sparkles, 
  TrendingUp, 
  CheckCircle2, 
  FileX,
  Zap,
  Edit3,
  Pause,
  MessageSquare,
  PlusCircle,
  Clock,
  Eye,
  ShieldCheck
} from "lucide-react";

export default function HowItWorks() {
  return (
    <MarketingLayout>
      <SEOHead 
        path="/how-it-works" 
        title="How It Works – Arclo Autonomous SEO"
        description="Learn how Arclo finds, fixes, and optimizes your website automatically. No reports to review, no decisions to make — just results."
      />
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

            <div className="mb-20">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-violet-500 to-pink-500">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-[#020617]">What Arclo does automatically</h2>
              </div>
              <div 
                className="rounded-2xl p-8"
                style={{
                  background: "linear-gradient(180deg, #FFFFFF, #F8FAFC)",
                  border: "1px solid rgba(15, 23, 42, 0.06)",
                  boxShadow: "0 16px 32px rgba(15, 23, 42, 0.06)"
                }}
              >
                <ul className="space-y-4">
                  {[
                    "Monitors your website for technical issues daily",
                    "Fixes broken links and redirect chains",
                    "Optimizes page titles and meta descriptions",
                    "Improves page speed and Core Web Vitals",
                    "Creates and updates service pages for your area",
                    "Writes and publishes blog content weekly",
                    "Tracks your rankings and adjusts strategy",
                    "Submits your sitemap to search engines"
                  ].map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-violet-500 mt-0.5 shrink-0" />
                      <span className="text-[#334155] text-lg">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="mb-20">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-pink-500 to-amber-500">
                  <ShieldCheck className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-[#020617]">What you control</h2>
              </div>
              <div 
                className="rounded-2xl p-8"
                style={{
                  background: "linear-gradient(180deg, #FFFFFF, #F8FAFC)",
                  border: "1px solid rgba(15, 23, 42, 0.06)",
                  boxShadow: "0 16px 32px rgba(15, 23, 42, 0.06)"
                }}
              >
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <Edit3 className="w-5 h-5 text-pink-500 mt-0.5 shrink-0" />
                    <span className="text-[#334155]">Edit any page content anytime</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Eye className="w-5 h-5 text-pink-500 mt-0.5 shrink-0" />
                    <span className="text-[#334155]">Approve major changes before they go live <span className="text-slate-400">(optional)</span></span>
                  </div>
                  <div className="flex items-start gap-3">
                    <Pause className="w-5 h-5 text-pink-500 mt-0.5 shrink-0" />
                    <span className="text-[#334155]">Pause automation at any time</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <MessageSquare className="w-5 h-5 text-pink-500 mt-0.5 shrink-0" />
                    <span className="text-[#334155]">Request specific content topics</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <PlusCircle className="w-5 h-5 text-pink-500 mt-0.5 shrink-0" />
                    <span className="text-[#334155]">Add your own pages or blog posts</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-20">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-500">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl md:text-3xl font-bold text-[#020617]">What results to expect</h2>
              </div>
              <div 
                className="rounded-2xl p-8"
                style={{
                  background: "linear-gradient(180deg, #FFFFFF, #F8FAFC)",
                  border: "1px solid rgba(15, 23, 42, 0.06)",
                  boxShadow: "0 16px 32px rgba(15, 23, 42, 0.06)"
                }}
              >
                <div className="mb-6">
                  <h3 
                    className="text-xl font-bold mb-2 bg-clip-text text-transparent"
                    style={{
                      backgroundImage: "linear-gradient(135deg, #8B5CF6, #EC4899, #F59E0B)"
                    }}
                  >
                    SEO is compounding, not instant
                  </h3>
                  <p className="text-[#64748B]">
                    Improvements happen over weeks, not hours. Real SEO takes time — but once momentum builds, results accelerate.
                  </p>
                </div>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-violet-50/50 border border-violet-100">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-violet-100 shrink-0">
                      <span className="text-sm font-bold text-violet-600">30</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#0F172A] mb-1">First 30 days</h4>
                      <p className="text-[#64748B] text-sm">Technical fixes and foundation — crawl errors fixed, page speed optimized, sitemap submitted.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-pink-50/50 border border-pink-100">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-pink-100 shrink-0">
                      <span className="text-sm font-bold text-pink-600">90</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#0F172A] mb-1">60-90 days</h4>
                      <p className="text-[#64748B] text-sm">Content building and early ranking signals — service pages live, blog posts indexed, keywords starting to climb.</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-amber-50/50 border border-amber-100">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-100 shrink-0">
                      <span className="text-sm font-bold text-amber-600">6m</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-[#0F172A] mb-1">3-6 months</h4>
                      <p className="text-[#64748B] text-sm">Meaningful traffic and lead growth — sustainable organic traffic, higher rankings, and real business results.</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="flex items-start gap-3">
                    <Eye className="w-5 h-5 text-slate-500 mt-0.5 shrink-0" />
                    <p className="text-[#64748B] text-sm">
                      <span className="font-medium text-[#334155]">Full transparency:</span> Your activity log shows every action Arclo takes, so you always know what's happening.
                    </p>
                  </div>
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
                  className="inline-flex items-center justify-center h-14 px-12 text-lg font-semibold rounded-xl text-white bg-gradient-to-r from-violet-500 via-pink-500 to-amber-500 shadow-[0_14px_30px_rgba(139,92,246,0.20)] hover:shadow-[0_18px_40px_rgba(236,72,153,0.22)] hover:-translate-y-0.5 transition-all duration-200 gap-3 mx-auto focus:outline-none focus:ring-4 focus:ring-violet-200"
                  style={{ textShadow: "0 1px 2px rgba(0,0,0,0.15)" }}
                  data-testid="button-fix-my-seo"
                >
                  <Sparkles className="w-5 h-5" />
                  Fix my SEO automatically
                </button>
              </Link>
              <p className="mt-4 text-xs text-slate-400">
                No credit card • Runs in the background • Cancel anytime
              </p>
              <Link href={ROUTES.FREE_REPORT}>
                <button 
                  className="mt-6 text-sm text-slate-500 hover:text-slate-700 transition-colors"
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
