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
          navigate(buildRoute.freeReport(data.reportId));
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
      <div className="min-h-screen bg-gradient-to-b from-muted via-background to-muted/50">
        <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">
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
              <div style={{ textAlign: "center", paddingTop: "3rem" }}>
                {/* Animated spinner */}
                <div style={{
                  width: 80, height: 80, borderRadius: "50%",
                  background: "linear-gradient(135deg, #8B5CF6, #EC4899)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 2rem",
                  boxShadow: "0 0 40px rgba(139,92,246,0.3)",
                }}>
                  <div style={{
                    width: 40, height: 40, border: "4px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff", borderRadius: "50%",
                    animation: "arclo-spin 1s linear infinite",
                  }} />
                </div>
                <style>{`@keyframes arclo-spin { to { transform: rotate(360deg) } }
@keyframes arclo-fade { 0%,100% { opacity: 0; transform: translateY(8px); } 15%,85% { opacity: 1; transform: translateY(0); } }`}</style>

                {/* Title */}
                <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0F172A", marginBottom: "0.5rem" }}>
                  {isReady ? "Generating Your Report" : "Analyzing Your Site"}
                </h1>
                <p style={{ color: "#64748B", marginBottom: "2rem", fontSize: "1rem" }}>
                  This usually takes 15–30 seconds
                </p>

                {/* Progress bar */}
                <div style={{ maxWidth: 400, margin: "0 auto 2.5rem" }}>
                  <div style={{
                    height: 8, borderRadius: 4, background: "#E2E8F0", overflow: "hidden",
                  }}>
                    <div style={{
                      height: "100%", borderRadius: 4,
                      background: "linear-gradient(90deg, #8B5CF6, #EC4899, #F59E0B)",
                      width: `${progress}%`,
                      transition: "width 0.8s ease",
                    }} />
                  </div>
                  <p style={{ color: "#94A3B8", fontSize: "0.875rem", marginTop: "0.5rem" }}>
                    {progress}% complete
                  </p>
                </div>

                {/* Rotating value prop card */}
                <div style={{
                  maxWidth: 480, margin: "0 auto",
                  background: "#F8FAFC", border: "1px solid #E2E8F0",
                  borderRadius: 12, padding: "1.5rem 2rem",
                  minHeight: 100,
                }}>
                  <p key={vpIndex} style={{
                    fontSize: "1.125rem", fontWeight: 600, color: "#0F172A",
                    marginBottom: "0.5rem",
                    animation: "arclo-fade 4s ease-in-out",
                  }}>
                    {VALUE_PROPS[vpIndex].headline}
                  </p>
                  <p key={`d-${vpIndex}`} style={{
                    fontSize: "0.9375rem", color: "#475569", lineHeight: 1.5,
                    animation: "arclo-fade 4s ease-in-out",
                  }}>
                    {VALUE_PROPS[vpIndex].detail}
                  </p>
                </div>

                {/* Step dots */}
                <div style={{ display: "flex", justifyContent: "center", gap: 6, marginTop: "1.25rem" }}>
                  {VALUE_PROPS.map((_, i) => (
                    <div key={i} style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: i === vpIndex ? "#8B5CF6" : "#CBD5E1",
                      transition: "background 0.3s",
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
