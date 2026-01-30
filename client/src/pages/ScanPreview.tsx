import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { ROUTES, buildRoute } from "@shared/routes";

interface ScanStatus {
  scanId: string;
  status: "queued" | "running" | "preview_ready" | "completed" | "failed";
  progress?: number;
  message?: string;
}

const STAGE_MESSAGES = [
  "Crawling your site structure...",
  "Checking page speed and Core Web Vitals...",
  "Analyzing keyword rankings...",
  "Scanning competitor landscape...",
  "Evaluating backlink profile...",
  "Compiling your results...",
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

  // Rotate through stage messages while scanning
  const progress = statusQuery.data?.progress || (scanId ? 30 : 10);
  const stageIndex = Math.min(
    Math.floor((progress / 100) * STAGE_MESSAGES.length),
    STAGE_MESSAGES.length - 1,
  );

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
              <div className="text-center space-y-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-soft to-purple-soft flex items-center justify-center mx-auto shadow-lg shadow-purple-glow">
                  <Loader2 className="w-10 h-10 text-primary animate-spin" />
                </div>
                <div className="space-y-4">
                  <h1 className="text-3xl md:text-4xl font-bold text-foreground">
                    {isReady ? "Generating Your Report" : "Analyzing Your Site"}
                  </h1>
                  <p className="text-xl text-muted-foreground">
                    {isReady
                      ? "Preparing your SEO analysis..."
                      : !scanId
                        ? "Starting your scan..."
                        : statusQuery.data?.message || STAGE_MESSAGES[stageIndex]}
                  </p>
                </div>
                <div className="max-w-md mx-auto">
                  <Progress value={isReady ? 95 : progress} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-2">
                    {isReady ? 95 : progress}% complete
                  </p>
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
