import { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ROUTES, buildRoute } from "@shared/routes";

interface ScanStatus {
  scanId: string;
  status: "queued" | "running" | "preview_ready" | "completed" | "failed";
  progress?: number;
  message?: string;
}

interface FreeReportResponse {
  ok: boolean;
  reportId?: string;
  message?: string;
}

export default function ScanPreview() {
  const params = useParams<{ scanId: string }>();
  const scanId = params.scanId;
  const [, navigate] = useLocation();

  const statusQuery = useQuery<ScanStatus>({
    queryKey: ["scan-status", scanId],
    queryFn: async () => {
      const res = await fetch(`/api/scan/${scanId}/status`);
      if (!res.ok) throw new Error("Failed to fetch scan status");
      return res.json();
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 2000;
      if (data.status === "queued" || data.status === "running") return 2000;
      return false;
    },
    enabled: !!scanId,
  });

  const generateReportMutation = useMutation<FreeReportResponse, Error>({
    mutationFn: async () => {
      const res = await fetch("/api/report/free", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scanId }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.ok && data.reportId) {
        navigate(buildRoute.freeReport(data.reportId));
      }
    },
  });

  const isScanning = statusQuery.data?.status === "queued" || statusQuery.data?.status === "running";
  const isReady = statusQuery.data?.status === "preview_ready" || statusQuery.data?.status === "completed";
  const isFailed = statusQuery.data?.status === "failed";

  useEffect(() => {
    if (isReady && !generateReportMutation.isPending && !generateReportMutation.isSuccess) {
      generateReportMutation.mutate();
    }
  }, [isReady, generateReportMutation.isPending, generateReportMutation.isSuccess]);

  return (
    <MarketingLayout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50/50">
        <div className="container mx-auto px-4 md:px-6 py-8 md:py-12">
          <div className="max-w-3xl mx-auto">
            
            {/* Scanning State */}
            {isScanning && (
              <div className="text-center space-y-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center mx-auto shadow-lg shadow-violet-500/10">
                  <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
                </div>
                <div className="space-y-4">
                  <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                    Analyzing Your Site
                  </h1>
                  <p className="text-xl text-slate-600">
                    {statusQuery.data?.message || "Checking structure, content, and performance..."}
                  </p>
                </div>
                <div className="max-w-md mx-auto">
                  <Progress value={statusQuery.data?.progress || 30} className="h-2" />
                  <p className="text-sm text-slate-500 mt-2">
                    {statusQuery.data?.progress || 30}% complete
                  </p>
                </div>
              </div>
            )}

            {/* Generating Report State */}
            {isReady && (generateReportMutation.isPending || !generateReportMutation.isSuccess) && (
              <div className="text-center space-y-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                  <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
                </div>
                <div className="space-y-4">
                  <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                    Generating Your Report
                  </h1>
                  <p className="text-xl text-slate-600">
                    Preparing your SEO analysis...
                  </p>
                </div>
              </div>
            )}

            {/* Failed State */}
            {isFailed && (
              <div className="text-center space-y-8">
                <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-10 h-10 text-red-600" />
                </div>
                <div className="space-y-4">
                  <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                    Scan Failed
                  </h1>
                  <p className="text-xl text-slate-600">
                    {statusQuery.data?.message || "We couldn't complete the scan. Please try again."}
                  </p>
                </div>
                <Button variant="primaryGradient" onClick={() => navigate(ROUTES.LANDING)} size="lg" data-testid="button-retry">
                  Try Again
                </Button>
              </div>
            )}

            {/* Report Generation Failed */}
            {generateReportMutation.isError && (
              <div className="text-center space-y-8">
                <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
                  <AlertTriangle className="w-10 h-10 text-amber-600" />
                </div>
                <div className="space-y-4">
                  <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                    Report Generation Failed
                  </h1>
                  <p className="text-xl text-slate-600">
                    We couldn't generate your report. Please try again.
                  </p>
                </div>
                <Button 
                  variant="primaryGradient" 
                  onClick={() => generateReportMutation.mutate()} 
                  size="lg" 
                  data-testid="button-retry-report"
                >
                  Try Again
                </Button>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
