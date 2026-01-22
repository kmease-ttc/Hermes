import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ROUTES, buildRoute } from "@shared/routes";
import { GeoScopeSelector, type GeoScopeValue } from "@/components/site/GeoScopeSelector";

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

  const [geoScope, setGeoScope] = useState<GeoScopeValue>({
    scope: 'local',
    city: '',
    state: '',
    country: 'United States',
  });
  const [email, setEmail] = useState('');
  const [validationError, setValidationError] = useState('');

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
        body: JSON.stringify({ 
          scanId,
          geoScope: geoScope.scope,
          geoLocation: geoScope.scope === 'local' ? {
            city: geoScope.city,
            state: geoScope.state,
            country: geoScope.country || 'United States',
          } : null,
          email: email || undefined,
        }),
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

  const validateAndSubmit = () => {
    setValidationError('');
    
    if (geoScope.scope === 'local') {
      if (!geoScope.city?.trim()) {
        setValidationError('Please enter your city.');
        return;
      }
      if (!geoScope.state?.trim()) {
        setValidationError('Please enter your state.');
        return;
      }
    }
    
    generateReportMutation.mutate();
  };

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

            {/* Scan Complete - Show Geo Scope Selection */}
            {isReady && !generateReportMutation.isPending && !generateReportMutation.isSuccess && (
              <div className="space-y-8">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold text-slate-900">
                    Scan Complete
                  </h1>
                  <p className="text-lg text-slate-600">
                    One more step to generate your personalized SEO report.
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
                  <GeoScopeSelector 
                    value={geoScope} 
                    onChange={setGeoScope} 
                  />

                  <div className="space-y-2 pt-2">
                    <Label htmlFor="email" className="text-sm text-slate-600">
                      Email (optional — we'll send you a copy)
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="max-w-md"
                      data-testid="input-email"
                    />
                  </div>

                  {validationError && (
                    <p className="text-sm text-red-600" data-testid="text-validation-error">
                      {validationError}
                    </p>
                  )}

                  {generateReportMutation.isError && (
                    <p className="text-sm text-red-600" data-testid="text-error">
                      Failed to generate report. Please try again.
                    </p>
                  )}

                  <Button
                    variant="primaryGradient"
                    size="lg"
                    onClick={validateAndSubmit}
                    disabled={generateReportMutation.isPending}
                    className="w-full md:w-auto"
                    data-testid="button-generate-report"
                  >
                    Generate My Report
                  </Button>
                </div>
              </div>
            )}

            {/* Generating Report State */}
            {isReady && generateReportMutation.isPending && (
              <div className="text-center space-y-8">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center mx-auto shadow-lg shadow-violet-500/10">
                  <Loader2 className="w-10 h-10 text-violet-600 animate-spin" />
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
            
          </div>
        </div>
      </div>
    </MarketingLayout>
  );
}
