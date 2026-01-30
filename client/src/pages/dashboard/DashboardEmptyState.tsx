import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSiteContext } from "@/hooks/useSiteContext";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Globe, ArrowRight, Loader2 } from "lucide-react";

const DASHBOARD_BG = {
  background: `radial-gradient(1200px circle at 10% 0%, rgba(139, 92, 246, 0.06), transparent 40%),
               radial-gradient(1200px circle at 90% 10%, rgba(236, 72, 153, 0.04), transparent 40%),
               radial-gradient(800px circle at 50% 80%, rgba(245, 158, 11, 0.03), transparent 40%),
               #FFFFFF`,
};

export function DashboardEmptyState() {
  const { setSelectedSiteId } = useSiteContext();
  const { authenticated } = useAuth();
  const [, navigate] = useLocation();
  const [siteName, setSiteName] = useState("");
  const [siteDomain, setSiteDomain] = useState("");
  const queryClient = useQueryClient();

  const addSite = useMutation({
    mutationFn: async ({ name, domain }: { name: string; domain: string }) => {
      const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
      const baseUrl = `https://${cleanDomain}`;
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name, baseUrl, status: "onboarding" }),
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        let errBody: any = null;
        try { errBody = JSON.parse(text); } catch {}

        // 409 = site already exists — return the conflict data so onSuccess can route
        if (res.status === 409 && errBody?.siteId) {
          return {
            siteId: errBody.siteId,
            hasExistingReport: errBody.hasExistingReport || false,
            latestReportId: errBody.latestReportId || null,
            domain: cleanDomain,
            _wasConflict: true,
          };
        }

        let message = `Failed to add site (${res.status})`;
        if (errBody) {
          if (errBody.details && Array.isArray(errBody.details)) {
            message = errBody.details.join(", ");
          } else if (typeof errBody.error === "string") {
            message = errBody.error;
          } else if (errBody.error?.message) {
            message = errBody.error.message;
          } else if (errBody.message) {
            message = errBody.message;
          }
        } else if (text && text.length < 200) {
          message = text;
        }
        throw new Error(message);
      }
      return res.json();
    },
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["sites"] });
      setSelectedSiteId(data.siteId);

      // Case 2: Site already has a report — go directly to dashboard
      if (data.hasExistingReport) {
        navigate("/app/dashboard");
        return;
      }

      // Case 1: No prior scan — kick off a scan and route to loading page
      const domain = data.domain || siteDomain.replace(/^https?:\/\//, "").replace(/\/+$/, "");
      const scanUrl = `https://${domain}`;
      sessionStorage.setItem(
        "arclo_scan_payload",
        JSON.stringify({ url: scanUrl })
      );
      // Mark source so ScanPreview routes back to dashboard, not /report/free/*
      sessionStorage.setItem("arclo_scan_source", "add_website");
      navigate("/scan/preview/pending");
    },
  });

  const handleAddSite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authenticated) {
      navigate("/login");
      return;
    }
    if (siteName.trim() && siteDomain.trim()) {
      addSite.mutate({ name: siteName.trim(), domain: siteDomain.trim() });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={DASHBOARD_BG}>
      <div
        className="max-w-lg w-full rounded-2xl p-10"
        style={{
          background: "linear-gradient(180deg, #FFFFFF, #F8FAFC)",
          border: "1px solid rgba(15, 23, 42, 0.06)",
          boxShadow: "0 20px 40px rgba(15, 23, 42, 0.08)",
        }}
      >
        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{
              background: "linear-gradient(135deg, rgba(124,58,237,0.12), rgba(236,72,153,0.08), rgba(245,158,11,0.08))",
              border: "1px solid rgba(124, 58, 237, 0.12)",
            }}
          >
            <Globe className="w-7 h-7" style={{ color: "#7c3aed" }} />
          </div>
          <h2 className="text-2xl font-bold mb-3" style={{ color: "#0F172A", letterSpacing: "-0.02em" }}>
            Add Your Website
          </h2>
          <p style={{ color: "#475569" }}>Start tracking your SEO performance, keyword rankings, and more.</p>
        </div>
        <form onSubmit={handleAddSite} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "#0F172A" }}>Website Name</label>
            <input
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="Empathy Health Clinic"
              className="w-full px-4 py-3 rounded-xl text-base outline-none"
              style={{
                border: "1px solid rgba(15, 23, 42, 0.18)",
                background: "#FFFFFF",
                color: "#0F172A",
              }}
              disabled={addSite.isPending}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: "#0F172A" }}>Domain</label>
            <input
              type="text"
              value={siteDomain}
              onChange={(e) => setSiteDomain(e.target.value)}
              placeholder="www.yoursite.com"
              className="w-full px-4 py-3 rounded-xl text-base outline-none"
              style={{
                border: "1px solid rgba(15, 23, 42, 0.18)",
                background: "#FFFFFF",
                color: "#0F172A",
              }}
              disabled={addSite.isPending}
            />
            <p className="mt-1.5 text-sm" style={{ color: "#64748B" }}>Enter the domain without http:// or https://</p>
          </div>
          <button
            type="submit"
            disabled={!siteName.trim() || !siteDomain.trim() || addSite.isPending}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:-translate-y-0.5"
            style={{
              background: "linear-gradient(90deg, #6D28D9 0%, #D946EF 40%, #F59E0B 100%)",
              boxShadow: "0 14px 26px rgba(124,58,237,.18), 0 10px 18px rgba(245,158,11,.12)",
              textShadow: "0 1px 2px rgba(0,0,0,0.15)",
              color: "#FFFFFF",
            }}
          >
            {addSite.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowRight className="w-5 h-5" />
            )}
            Add Website
          </button>
        </form>
        {addSite.isError && (
          <p className="mt-4 text-red-600 text-sm text-center">{addSite.error.message}</p>
        )}
      </div>
    </div>
  );
}
