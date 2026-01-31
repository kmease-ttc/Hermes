import { useState } from "react";
import { Download, Share2, Check, Copy, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import type { FreeReportData } from "./types";

interface ReportHeaderProps {
  report: FreeReportData;
  shareToken?: string;
  onShare: () => void;
  isSharing: boolean;
  shareUrl: string | null;
  shareCopied: boolean;
}

export function ReportHeader({ report, shareToken, onShare, isSharing, shareUrl, shareCopied }: ReportHeaderProps) {
  return (
    <>
      <div
        className="mb-6 rounded-2xl overflow-hidden"
        style={{ background: "linear-gradient(135deg, #7C3AED 0%, #EC4899 50%, #F59E0B 100%)" }}
      >
        <div className="px-6 py-6 md:py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            {/* Left: Logo + Report Title */}
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center shrink-0">
                <svg width="28" height="28" viewBox="0 0 48 48" aria-hidden="true">
                  <path d="M24 4l19 36h-8l-3.2-6.2H16.2L13 40H5L24 4zm-4.8 23h9.6L24 17.7 19.2 27z" fill="white" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl md:text-2xl font-bold tracking-tight" style={{ color: "#FFFFFF" }} data-testid="report-title">
                    Arclo Pro — Ranking Snapshot
                  </h1>
                  {report.scan_mode === "light" && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-white/20" style={{ color: "#FFFFFF" }}>
                      Light Scan
                    </span>
                  )}
                </div>
                <p className="text-sm mt-1 truncate max-w-md" style={{ color: "rgba(255,255,255,0.8)" }} data-testid="report-url">
                  {report.inputs?.target_url}
                </p>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                className="bg-white/15 backdrop-blur-sm border border-white/20 hover:bg-white/25 font-medium shadow-sm"
                style={{ color: "#FFFFFF" }}
                onClick={() => window.print()}
                data-testid="btn-download-pdf"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Download
              </Button>
              {!shareToken && (
                <Button
                  size="sm"
                  className="bg-white hover:bg-white/90 border-0 font-medium shadow-sm text-violet-700"
                  onClick={onShare}
                  disabled={isSharing}
                  data-testid="btn-share"
                >
                  {isSharing ? (
                    <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                  ) : shareCopied ? (
                    <Check className="w-4 h-4 mr-1.5" />
                  ) : (
                    <Share2 className="w-4 h-4 mr-1.5" />
                  )}
                  {shareCopied ? "Copied!" : "Share"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Share URL notification */}
      {shareUrl && (
        <Card className="mb-6 bg-primary/5 border-primary/20" data-testid="share-url-card">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <Info className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground mb-1">Shareable link created:</p>
              <p className="text-sm text-muted-foreground truncate">{shareUrl}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(shareUrl);
                toast.success("Copied!");
              }}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
