import { useState } from "react";
import { BarChart3, Search, Link2, Zap, ChevronRight, X } from "lucide-react";

const WIZARD_STEPS = [
  {
    id: "analytics",
    title: "Connect Analytics",
    description: "Link Google Analytics 4 to track traffic, conversions, and user behavior.",
    icon: BarChart3,
    color: "#7c3aed",
  },
  {
    id: "search-console",
    title: "Connect Search Console",
    description: "Link Google Search Console to monitor keyword rankings and impressions.",
    icon: Search,
    color: "#ec4899",
  },
  {
    id: "integrations",
    title: "Add Integrations",
    description: "Connect additional tools like Google Ads, Clarity, or your CMS.",
    icon: Link2,
    color: "#f59e0b",
  },
  {
    id: "automation",
    title: "Set Up Automation",
    description: "Configure crawl schedules, alerts, and automated SEO recommendations.",
    icon: Zap,
    color: "#22c55e",
  },
];

interface ConfigureOverlayProps {
  domain: string;
  onClose: () => void;
}

export function ConfigureOverlay({ domain, onClose }: ConfigureOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(15, 23, 42, 0.5)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="max-w-2xl w-full mx-4 rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(180deg, #FFFFFF, #F8FAFC)",
          border: "1px solid rgba(15, 23, 42, 0.06)",
          boxShadow: "0 25px 50px rgba(15, 23, 42, 0.15)",
        }}
      >
        <div className="px-8 pt-8 pb-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: "#0F172A", letterSpacing: "-0.02em" }}>
              Configure {domain}
            </h2>
            <p style={{ color: "#475569" }}>
              Complete these steps to unlock full SEO monitoring and insights.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl transition-colors hover:bg-gray-100"
            style={{ color: "#64748B" }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-8 mb-6">
          <div className="flex gap-2">
            {WIZARD_STEPS.map((_, idx) => (
              <div
                key={idx}
                className="h-1.5 flex-1 rounded-full transition-all duration-300"
                style={{
                  background: idx <= currentStep
                    ? "linear-gradient(90deg, #7c3aed, #ec4899)"
                    : "rgba(15, 23, 42, 0.08)",
                }}
              />
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: "#94A3B8" }}>
            Step {currentStep + 1} of {WIZARD_STEPS.length}
          </p>
        </div>

        <div className="px-8 pb-4 space-y-3">
          {WIZARD_STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = idx === currentStep;
            const isCompleted = idx < currentStep;

            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(idx)}
                className="w-full flex items-center gap-4 p-4 rounded-xl text-left transition-all duration-200"
                style={{
                  background: isActive ? "#FFFFFF" : "transparent",
                  border: isActive
                    ? "1px solid rgba(124, 58, 237, 0.2)"
                    : "1px solid transparent",
                  boxShadow: isActive
                    ? "0 4px 12px rgba(124, 58, 237, 0.08)"
                    : "none",
                  opacity: isCompleted ? 0.6 : 1,
                }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: isCompleted
                      ? "rgba(34, 197, 94, 0.1)"
                      : `rgba(${step.color === "#7c3aed" ? "124,58,237" : step.color === "#ec4899" ? "236,72,153" : step.color === "#f59e0b" ? "245,158,11" : "34,197,94"}, 0.1)`,
                    border: `1px solid ${isCompleted ? "rgba(34, 197, 94, 0.2)" : step.color}20`,
                  }}
                >
                  <Icon className="w-5 h-5" style={{ color: isCompleted ? "#22c55e" : step.color }} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm" style={{ color: "#0F172A" }}>{step.title}</p>
                  {isActive && (
                    <p className="text-sm mt-0.5" style={{ color: "#64748B" }}>{step.description}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "#94A3B8" }} />
              </button>
            );
          })}
        </div>

        <div className="px-8 py-6 flex items-center justify-between" style={{ borderTop: "1px solid rgba(15, 23, 42, 0.06)" }}>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-gray-50"
            style={{ color: "#64748B" }}
          >
            Skip for now
          </button>
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep((s) => s - 1)}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:bg-gray-50"
                style={{ color: "#0F172A", border: "1px solid rgba(15, 23, 42, 0.12)" }}
              >
                Back
              </button>
            )}
            <button
              onClick={() => {
                if (currentStep < WIZARD_STEPS.length - 1) {
                  setCurrentStep((s) => s + 1);
                } else {
                  onClose();
                }
              }}
              className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: "linear-gradient(90deg, #6D28D9 0%, #D946EF 40%, #F59E0B 100%)",
                boxShadow: "0 8px 16px rgba(124,58,237,.15)",
                textShadow: "0 1px 2px rgba(0,0,0,0.15)",
                color: "#FFFFFF",
              }}
            >
              {currentStep < WIZARD_STEPS.length - 1 ? "Continue" : "Finish Setup"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
