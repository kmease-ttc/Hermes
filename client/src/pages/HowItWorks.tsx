import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { IconBadge } from "@/components/marketing/IconBadge";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { ROUTES } from "@shared/routes";
import { SearchCheck, Target, Rocket, ArrowRight, CheckCircle2, Zap, Clock, Shield } from "lucide-react";

export default function HowItWorks() {
  return (
    <MarketingLayout>
      <div className="container mx-auto px-4 md:px-6 py-12 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-[#020617] mb-6">
              How Arclo Works
            </h1>
            <p className="text-xl text-[#334155] max-w-2xl mx-auto">
              From diagnosis to deployment in three simple steps. No agencies, no waiting, no complexity.
            </p>
          </div>

          <div className="space-y-16">
            {/* Step 1 */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#15803D] flex items-center justify-center text-white font-bold text-xl">
                    1
                  </div>
                  <h2 className="text-2xl font-bold text-[#0F172A]">Diagnose</h2>
                </div>
                <p className="text-lg text-[#334155] mb-6">
                  Arclo runs the same comprehensive checks that experienced SEO professionals use. We analyze your technical SEO, content quality, performance metrics, and competitive positioning.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
                    <span className="text-[#334155]">100+ technical SEO checks</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
                    <span className="text-[#334155]">Content quality analysis</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
                    <span className="text-[#334155]">Core Web Vitals monitoring</span>
                  </li>
                </ul>
              </div>
              <div className="flex items-center justify-center p-8">
                <IconBadge icon={SearchCheck} size="lg" />
              </div>
            </div>

            {/* Step 2 */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="flex items-center justify-center p-8 md:order-1">
                <IconBadge icon={Target} size="lg" />
              </div>
              <div className="md:order-2">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#15803D] flex items-center justify-center text-white font-bold text-xl">
                    2
                  </div>
                  <h2 className="text-2xl font-bold text-[#0F172A]">Decide</h2>
                </div>
                <p className="text-lg text-[#334155] mb-6">
                  Issues are automatically prioritized by impact and effort. You see what matters most, not a 200-page audit you'll never read. Each issue comes with a clear recommendation and expected outcome.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-[#F59E0B]" />
                    <span className="text-[#334155]">Impact-based prioritization</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-[#F59E0B]" />
                    <span className="text-[#334155]">Effort estimation</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-[#F59E0B]" />
                    <span className="text-[#334155]">Risk assessment</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Step 3 */}
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-[#15803D] flex items-center justify-center text-white font-bold text-xl">
                    3
                  </div>
                  <h2 className="text-2xl font-bold text-[#0F172A]">Deploy</h2>
                </div>
                <p className="text-lg text-[#334155] mb-6">
                  One click deploys fixes directly to your site. No developer tickets. No waiting weeks for changes. Just results. Arclo handles the implementation so you can focus on your business.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
                    <span className="text-[#334155]">One-click deployment</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
                    <span className="text-[#334155]">Safe rollback capability</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-[#16A34A]" />
                    <span className="text-[#334155]">Continuous monitoring</span>
                  </li>
                </ul>
              </div>
              <div className="flex items-center justify-center p-8">
                <IconBadge icon={Rocket} size="lg" />
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="text-center mt-20">
            <Link href={ROUTES.LANDING}>
              <Button size="lg" className="h-14 px-10 text-lg">
                Run Free SEO Scan
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
