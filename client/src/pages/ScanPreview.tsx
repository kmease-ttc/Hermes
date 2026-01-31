import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ROUTES, buildRoute } from "@shared/routes";

interface ScanStatus {
  scanId: string;
  status: "queued" | "running" | "preview_ready" | "completed" | "failed";
  progress?: number;
  message?: string;
}

const VALUE_PROPS = [
  { headline: "Crawling your site structure", detail: "Arclo maps every page so nothing gets missed." },
  { headline: "Checking page speed & Core Web Vitals", detail: "Slow pages lose rankings. We measure what Google measures." },
  { headline: "Analyzing keyword rankings", detail: "See exactly where you rank — and where competitors outrank you." },
  { headline: "Scanning competitor landscape", detail: "Know who you're up against and how to overtake them." },
  { headline: "Evaluating backlink profile", detail: "Links are still the #1 ranking factor. We audit yours automatically." },
  { headline: "Auditing on-page SEO", detail: "Title tags, meta descriptions, headings — every detail matters." },
  { headline: "Reviewing mobile experience", detail: "Over 60% of searches happen on phones. Your site must be ready." },
  { headline: "Compiling your personalized report", detail: "Actionable fixes, prioritized by impact. No fluff." },
];

export default function ScanPreview() {
  const params = useParams<{ scanId: string }>();
  const paramScanId = params.scanId;
  const [, navigate] = useLocation();
  const reportTriggered = useRef(false);
  const [reportError, setReportError] = useState("");
  const reportRetries = useRef(0);

  // If scanId is "pending", fire the scan API and resolve to a real scanId
  const [resolvedScanId, setResolvedScanId] = useState<string | null>(
    paramScanId && paramScanId !== "pending" ? paramScanId : null
  );
  const [pendingError, setPendingError] = useState("");
  const scanFired = useRef(false);

  useEffect(() => {
    if (paramScanId !== "pending" || scanFired.current) return;
    scanFired.current = true;

    const payloadStr = sessionStorage.getItem("arclo_scan_payload");
    if (!payloadStr) {
      setPendingError("No scan data found. Please start a new analysis.");
      return;
    }
    sessionStorage.removeItem("arclo_scan_payload");

    (async () => {
      try {
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payloadStr,
        });

        if (!res.ok) {
          let errMsg = `Server returned ${res.status}`;
          try {
            const errData = await res.json();
            errMsg = errData?.message || errData?.error || errMsg;
          } catch {}
          throw new Error(errMsg);
        }

        const data = await res.json();
        const id = data.scanId || data.id;
        if (!id) throw new Error("Server did not return a scan ID");

        setResolvedScanId(id);
        window.history.replaceState(null, "", `/scan/preview/${id}`);
      } catch (err: any) {
        console.error("[ScanPreview] Scan API failed:", err);
        setPendingError(err?.message || "Failed to start scan. Please try again.");
      }
    })();
  }, [paramScanId]);

  const scanId = resolvedScanId;

  const statusQuery = useQuery<ScanStatus>({
    queryKey: ["scan-status", scanId],
    queryFn: async () => {
      const res = await fetch(`/api/scan/${scanId}/status`);
      if (res.status === 404) {
        throw new Error("Scan not found. It may have expired — please start a new scan.");
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || data?.error || `Server error (${res.status})`);
      }
      return res.json();
    },
    refetchInterval: (query) => {
      if (query.state.error) return false;
      const data = query.state.data;
      if (!data) return 2000;
      if (data.status === "queued" || data.status === "running") return 2000;
      return false;
    },
    retry: 3,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 8000),
    enabled: !!scanId,
  });

  // Show scanning state while waiting for API call to return OR while scan is running
  const isScanning =
    !scanId ||
    statusQuery.data?.status === "queued" ||
    statusQuery.data?.status === "running";
  const isReady =
    statusQuery.data?.status === "preview_ready" ||
    statusQuery.data?.status === "completed";
  const isFailed = statusQuery.data?.status === "failed";
  const isNetworkError = !pendingError && statusQuery.isError && !statusQuery.data;

  // Auto-generate report and navigate to results when scan completes
  useEffect(() => {
    if (!isReady || !scanId || reportTriggered.current) return;
    reportTriggered.current = true;
    setReportError("");

    const scanSource = sessionStorage.getItem("arclo_scan_source");
    const isAddWebsiteFlow = scanSource === "add_website";
    if (scanSource) sessionStorage.removeItem("arclo_scan_source");

    (async () => {
      try {
        const res = await fetch("/api/report/free", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ scanId }),
        });

        let data: any;
        try {
          data = await res.json();
        } catch {
          throw new Error("Invalid response from report service.");
        }

        if (data.ok && data.reportId) {
          if (isAddWebsiteFlow) {
            navigate(ROUTES.OVERVIEW);
          } else {
            navigate(buildRoute.freeReport(data.reportId));
          }
        } else {
          throw new Error(data?.message || "Report generation failed.");
        }
      } catch (err: any) {
        reportRetries.current += 1;
        reportTriggered.current = false;

        if (reportRetries.current >= 3) {
          setReportError(
            err?.message || "Could not generate your report after multiple attempts."
          );
        }
      }
    })();
  }, [isReady, scanId, navigate]);

  // Rotate through value prop messages on a timer
  const [vpIndex, setVpIndex] = useState(0);
  useEffect(() => {
    if (!isScanning && !isReady) return;
    const id = setInterval(() => {
      setVpIndex((i) => (i + 1) % VALUE_PROPS.length);
    }, 4000);
    return () => clearInterval(id);
  }, [isScanning, isReady]);

  // Simulated progress that advances smoothly
  const [simProgress, setSimProgress] = useState(5);
  useEffect(() => {
    if (!isScanning && !isReady) return;
    const id = setInterval(() => {
      setSimProgress((p) => {
        if (isReady) return Math.min(p + 3, 95);
        return Math.min(p + 1, 85);
      });
    }, 800);
    return () => clearInterval(id);
  }, [isScanning, isReady]);

  const progress = statusQuery.data?.progress || simProgress;

  // No scanId in URL at all
  if (!paramScanId) {
    return (
      <MarketingLayout>
        <div className="min-h-screen bg-gradient-to-b from-muted via-background to-muted/50">
          <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">
            <div className="max-w-3xl mx-auto text-center space-y-8">
              <div className="w-20 h-20 rounded-full bg-semantic-danger-soft flex items-center justify-center mx-auto">
                <AlertTriangle className="w-10 h-10 text-semantic-danger" />
              </div>
              <div className="space-y-4">
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                  Missing Scan ID
                </h1>
                <p className="text-xl text-muted-foreground">
                  No scan was specified. Please start a new analysis from the home page.
                </p>
              </div>
              <Button
                variant="primaryGradient"
                onClick={() => navigate(ROUTES.LANDING)}
                size="lg"
              >
                Go to Home
              </Button>
            </div>
          </div>
        </div>
      </MarketingLayout>
    );
  }

  return (
    <MarketingLayout>
      {/* Cosmic lavender background with decorative bubbles */}
      <div style={{
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        background: "#ffffff",
      }}>
        {/* Decorative bubble elements */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
          {/* Large top-right bubble */}
          <div style={{
            position: "absolute", top: "-5%", right: "-8%",
            width: 500, height: 500, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(196,181,253,0.25) 0%, rgba(196,181,253,0.08) 50%, transparent 70%)",
            border: "1px solid rgba(196,181,253,0.15)",
          }} />
          {/* Medium left bubble */}
          <div style={{
            position: "absolute", top: "20%", left: "-6%",
            width: 350, height: 350, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(216,180,254,0.2) 0%, rgba(216,180,254,0.06) 50%, transparent 70%)",
            border: "1px solid rgba(216,180,254,0.12)",
          }} />
          {/* Bottom-right bubble */}
          <div style={{
            position: "absolute", bottom: "5%", right: "5%",
            width: 280, height: 280, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(196,181,253,0.18) 0%, rgba(196,181,253,0.05) 50%, transparent 70%)",
            border: "1px solid rgba(196,181,253,0.1)",
          }} />
          {/* Small top-left bubble */}
          <div style={{
            position: "absolute", top: "8%", left: "15%",
            width: 120, height: 120, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(233,213,255,0.3) 0%, transparent 70%)",
            border: "1px solid rgba(233,213,255,0.15)",
          }} />
          {/* Small bottom-left bubble */}
          <div style={{
            position: "absolute", bottom: "15%", left: "8%",
            width: 160, height: 160, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(233,213,255,0.22) 0%, transparent 70%)",
            border: "1px solid rgba(233,213,255,0.12)",
          }} />
          {/* Tiny scattered dots */}
          <div style={{ position: "absolute", top: "30%", right: "20%", width: 8, height: 8, borderRadius: "50%", background: "rgba(196,181,253,0.4)" }} />
          <div style={{ position: "absolute", top: "55%", left: "25%", width: 6, height: 6, borderRadius: "50%", background: "rgba(216,180,254,0.35)" }} />
          <div style={{ position: "absolute", top: "15%", right: "35%", width: 5, height: 5, borderRadius: "50%", background: "rgba(196,181,253,0.3)" }} />
          <div style={{ position: "absolute", bottom: "30%", right: "30%", width: 7, height: 7, borderRadius: "50%", background: "rgba(233,213,255,0.4)" }} />
        </div>

        <div style={{ position: "relative", zIndex: 1 }} className="container mx-auto px-4 md:px-6 py-4 md:py-6">
          <div className="max-w-3xl mx-auto">

            {/* Pending error — scan API call failed */}
            {pendingError && (
              <div className="text-center space-y-8">
                <div className="w-20 h-20 rounded-full bg-semantic-danger-soft flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-10 h-10 text-semantic-danger" />
                </div>
                <div className="space-y-4">
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                    Scan Failed
                  </h1>
                  <p className="text-xl text-muted-foreground">
                    {pendingError}
                  </p>
                </div>
                <Button
                  variant="primaryGradient"
                  onClick={() => navigate(ROUTES.LANDING)}
                  size="lg"
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Scanning / Generating State */}
            {!pendingError && (isScanning || (isReady && !reportError)) && (
              <div style={{ textAlign: "center", paddingTop: "1.5rem" }}>
                <style>{`
@keyframes arclo-spin { to { transform: rotate(360deg) } }
@keyframes arclo-fade { 0%,100% { opacity: 0; transform: translateY(8px); } 15%,85% { opacity: 1; transform: translateY(0); } }
@keyframes arclo-glow-pulse { 0%,100% { box-shadow: 0 0 40px rgba(168,85,247,0.35), 0 0 80px rgba(236,72,153,0.15); } 50% { box-shadow: 0 0 60px rgba(168,85,247,0.45), 0 0 100px rgba(236,72,153,0.2); } }
                `}</style>

                {/* Animated gradient spinner orb */}
                <div style={{
                  width: 120, height: 120, borderRadius: "50%",
                  background: "conic-gradient(from 0deg, #8B5CF6, #A78BFA, #D946EF, #EC4899, #F472B6, #C084FC, #8B5CF6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 2.5rem",
                  animation: "arclo-glow-pulse 3s ease-in-out infinite",
                }}>
                  <div style={{
                    width: 88, height: 88, borderRadius: "50%",
                    background: "linear-gradient(180deg, #EDE9FE 0%, #F5F3FF 100%)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <div style={{
                      width: 40, height: 40, border: "4px solid rgba(139,92,246,0.2)",
                      borderTopColor: "#fff", borderRadius: "50%",
                      animation: "arclo-spin 1s linear infinite",
                    }} />
                  </div>
                </div>

                {/* Title */}
                <h1 style={{ fontSize: "2rem", fontWeight: 700, color: "#0F172A", marginBottom: "0.5rem", letterSpacing: "-0.01em" }}>
                  {isReady ? "Generating Your Report" : "Analyzing Your Site"}
                </h1>
                <p style={{ color: "#64748B", marginBottom: "2.5rem", fontSize: "1.05rem" }}>
                  This usually takes 15–30 seconds
                </p>

                {/* Progress bar */}
                <div style={{ maxWidth: 440, margin: "0 auto 2.5rem" }}>
                  <div style={{
                    height: 10, borderRadius: 5, background: "rgba(203,213,225,0.5)", overflow: "hidden",
                    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)",
                  }}>
                    <div style={{
                      height: "100%", borderRadius: 5,
                      background: "linear-gradient(90deg, #6D28D9, #8B5CF6, #EC4899, #F59E0B)",
                      width: `${progress}%`,
                      transition: "width 0.8s ease",
                      boxShadow: "0 0 12px rgba(139,92,246,0.3)",
                    }} />
                  </div>
                  <p style={{ color: "#94A3B8", fontSize: "0.875rem", marginTop: "0.75rem" }}>
                    {progress}% complete
                  </p>
                </div>

                {/* Rotating value prop card */}
                <div style={{
                  maxWidth: 520, margin: "0 auto",
                  background: "rgba(255,255,255,0.85)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: "1px solid rgba(226,232,240,0.8)",
                  borderRadius: 16, padding: "1.75rem 2.25rem",
                  minHeight: 100,
                  boxShadow: "0 8px 32px rgba(139,92,246,0.08), 0 2px 8px rgba(0,0,0,0.04)",
                }}>
                  <p key={vpIndex} style={{
                    fontSize: "1.2rem", fontWeight: 700, color: "#0F172A",
                    marginBottom: "0.5rem",
                    animation: "arclo-fade 4s ease-in-out",
                  }}>
                    {VALUE_PROPS[vpIndex].headline}
                  </p>
                  <p key={`d-${vpIndex}`} style={{
                    fontSize: "1rem", color: "#475569", lineHeight: 1.6,
                    animation: "arclo-fade 4s ease-in-out",
                  }}>
                    {VALUE_PROPS[vpIndex].detail}
                  </p>
                </div>

                {/* Step dots */}
                <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: "1.5rem" }}>
                  {VALUE_PROPS.map((_, i) => (
                    <div key={i} style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: i === vpIndex ? "#7C3AED" : "rgba(203,213,225,0.6)",
                      transition: "background 0.3s, transform 0.3s",
                      transform: i === vpIndex ? "scale(1.2)" : "scale(1)",
                      boxShadow: i === vpIndex ? "0 0 8px rgba(124,58,237,0.3)" : "none",
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* Failed State — scan itself failed */}
            {!pendingError && isFailed && (
              <div className="text-center space-y-8">
                <div className="w-20 h-20 rounded-full bg-semantic-danger-soft flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-10 h-10 text-semantic-danger" />
                </div>
                <div className="space-y-4">
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                    Scan Failed
                  </h1>
                  <p className="text-xl text-muted-foreground">
                    {statusQuery.data?.message ||
                      "We couldn't complete the scan. Please try again."}
                  </p>
                </div>
                <Button
                  variant="primaryGradient"
                  onClick={() => navigate(ROUTES.LANDING)}
                  size="lg"
                  data-testid="button-retry"
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Network / polling error — couldn't reach server */}
            {isNetworkError && (
              <div className="text-center space-y-8">
                <div className="w-20 h-20 rounded-full bg-semantic-danger-soft flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-10 h-10 text-semantic-danger" />
                </div>
                <div className="space-y-4">
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                    Connection Problem
                  </h1>
                  <p className="text-xl text-muted-foreground">
                    {statusQuery.error?.message ||
                      "Could not check scan progress. Please verify your connection."}
                  </p>
                </div>
                <div className="flex gap-4 justify-center">
                  <Button
                    variant="primaryGradient"
                    onClick={() => statusQuery.refetch()}
                    size="lg"
                  >
                    Retry
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate(ROUTES.LANDING)}
                    size="lg"
                  >
                    Start Over
                  </Button>
                </div>
              </div>
            )}

            {/* Report generation failed after retries */}
            {reportError && (
              <div className="text-center space-y-8">
                <div className="w-20 h-20 rounded-full bg-semantic-danger-soft flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-10 h-10 text-semantic-danger" />
                </div>
                <div className="space-y-4">
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                    Report Generation Failed
                  </h1>
                  <p className="text-xl text-muted-foreground">
                    {reportError}
                  </p>
                </div>
                <div className="flex gap-4 justify-center">
                  <Button
                    variant="primaryGradient"
                    onClick={() => {
                      reportRetries.current = 0;
                      setReportError("");
                      reportTriggered.current = false;
                    }}
                    size="lg"
                  >
                    Retry Report
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate(ROUTES.LANDING)}
                    size="lg"
                  >
                    Start Over
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
