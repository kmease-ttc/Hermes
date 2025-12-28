import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useMutation } from "@tanstack/react-query";
import { useSiteContext } from "@/hooks/useSiteContext";
import { 
  Download, 
  Copy, 
  FileText, 
  Loader2, 
  Check, 
  Package,
  Shield,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  HelpCircle
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ExportFixPackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportFixPackModal({ open, onOpenChange }: ExportFixPackModalProps) {
  const { currentSite } = useSiteContext();
  const [exportType, setExportType] = useState<"fix-pack" | "report">("fix-pack");
  const [scope, setScope] = useState<"top3" | "full">("top3");
  const [maxBlogs, setMaxBlogs] = useState(1);
  const [maxTech, setMaxTech] = useState(3);
  const [noUiChanges, setNoUiChanges] = useState(true);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [exportError, setExportError] = useState<{
    code: string;
    message: string;
    hint: string;
    requestId: string;
    timestamp: string;
  } | null>(null);

  const generateExport = useMutation({
    mutationFn: async () => {
      setExportError(null);
      const requestId = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      
      // Warm-up request first (fire and forget, don't block)
      fetch("/api/export/health", { method: "GET" }).catch(() => {});
      
      const params = new URLSearchParams({
        site_id: currentSite?.siteId || "default",
        scope,
        maxBlogs: maxBlogs.toString(),
        maxTech: maxTech.toString(),
        noUi: noUiChanges.toString(),
      });
      
      const response = await fetch(`/api/export/fix-pack?${params}`);
      
      // Try to parse JSON, but handle non-JSON responses gracefully
      let data: any = null;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try {
          data = await response.json();
        } catch {
          data = null;
        }
      }
      
      if (!response.ok) {
        const errorInfo = {
          code: data?.code || `HTTP_${response.status}`,
          message: data?.error || data?.message || `Request failed with status ${response.status}`,
          hint: data?.hint || "Try again or check worker status in Integrations.",
          requestId,
          timestamp: new Date().toISOString(),
        };
        throw errorInfo;
      }
      
      if (!data) {
        throw {
          code: "INVALID_RESPONSE",
          message: "Server returned an empty or invalid response",
          hint: "Check if the export endpoint is configured correctly.",
          requestId,
          timestamp: new Date().toISOString(),
        };
      }
      
      return data;
    },
    onSuccess: (data) => {
      setGeneratedContent(data.content_md);
      toast.success("Fix Pack generated successfully");
    },
    onError: (error: any) => {
      if (error.code) {
        setExportError(error);
      } else {
        setExportError({
          code: "UNKNOWN_ERROR",
          message: error.message || "Failed to generate export",
          hint: "Try again or check worker status in Integrations.",
          requestId: `exp_${Date.now()}`,
          timestamp: new Date().toISOString(),
        });
      }
      toast.error("Export failed", { description: error.message });
    },
  });

  const handleCopy = async () => {
    if (generatedContent) {
      await navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadMd = () => {
    if (generatedContent) {
      const blob = new Blob([generatedContent], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fix-pack-${new Date().toISOString().split("T")[0]}.md`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Downloaded as Markdown");
    }
  };

  const handleDownloadTxt = () => {
    if (generatedContent) {
      const plainText = generatedContent
        .replace(/#{1,6}\s/g, "")
        .replace(/\*\*/g, "")
        .replace(/\*/g, "");
      const blob = new Blob([plainText], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fix-pack-${new Date().toISOString().split("T")[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Downloaded as Text");
    }
  };

  const resetState = () => {
    setGeneratedContent(null);
    setCopied(false);
    setExportError(null);
  };

  const handleRetry = () => {
    setExportError(null);
    generateExport.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) resetState(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card/95 backdrop-blur-xl border-border" data-testid="export-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Package className="w-5 h-5 text-purple-accent" />
            Export Fix Pack
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Generate a structured implementation document with priorities, evidence, and guardrails.
          </DialogDescription>
        </DialogHeader>

        {exportError ? (
          <div className="space-y-4 py-4">
            <div className="rounded-xl border border-semantic-danger-border bg-semantic-danger-soft/30 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-semantic-danger flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <h4 className="font-semibold text-semantic-danger">Export Failed</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">Error:</span>
                      <Badge variant="outline" className="font-mono text-xs">{exportError.code}</Badge>
                    </div>
                    <p className="text-foreground">{exportError.message}</p>
                    <p className="text-muted-foreground text-xs">{exportError.hint}</p>
                  </div>
                  <div className="pt-2 border-t border-border mt-3 space-y-1 text-xs text-muted-foreground">
                    <p>Request ID: <span className="font-mono">{exportError.requestId}</span></p>
                    <p>Timestamp: {new Date(exportError.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleRetry} variant="purple" className="flex-1 rounded-xl">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Export
              </Button>
              <Button onClick={resetState} variant="outline" className="rounded-xl">
                Back
              </Button>
            </div>
          </div>
        ) : !generatedContent ? (
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Export Type</Label>
              <RadioGroup value={exportType} onValueChange={(v) => setExportType(v as any)} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fix-pack" id="fix-pack" data-testid="radio-fix-pack" />
                  <Label htmlFor="fix-pack" className="flex items-center gap-2 cursor-pointer">
                    <Sparkles className="w-4 h-4 text-gold" />
                    Replit Fix Pack
                    <Badge className="bg-primary/10 text-primary text-xs">Recommended</Badge>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 opacity-50">
                  <RadioGroupItem value="report" id="report" disabled data-testid="radio-report" />
                  <Label htmlFor="report" className="cursor-not-allowed">
                    Executive Report (Coming Soon)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-3">
              <Label className="text-sm font-medium">Scope</Label>
              <RadioGroup value={scope} onValueChange={(v) => setScope(v as any)} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="top3" id="top3" data-testid="radio-top3" />
                  <Label htmlFor="top3" className="cursor-pointer">This week's priorities (Top 3)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="full" id="full" data-testid="radio-full" />
                  <Label htmlFor="full" className="cursor-pointer">Include all agent next steps</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Shield className="w-4 h-4 text-semantic-success" />
                Safety Settings
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm text-foreground">Max blog posts to publish</Label>
                  <Badge variant="outline" className="border-border">{maxBlogs}</Badge>
                </div>
                <Slider
                  value={[maxBlogs]}
                  onValueChange={(v) => setMaxBlogs(v[0])}
                  min={1}
                  max={3}
                  step={1}
                  className="w-full"
                  data-testid="slider-max-blogs"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Label className="text-sm text-foreground">Max technical changes</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground">
                            <HelpCircle className="w-3 h-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="max-w-xs">
                          <p className="text-sm">Recommended: limit changes per cycle to avoid large-scale ranking volatility. Typically 5–20 changes per cycle depending on site size.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Badge variant="outline" className="border-border">{maxTech}</Badge>
                </div>
                <Slider
                  value={[maxTech]}
                  onValueChange={(v) => setMaxTech(v[0])}
                  min={1}
                  max={20}
                  step={1}
                  className="w-full"
                  data-testid="slider-max-tech"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm text-foreground">Do not change design/UI</Label>
                <Switch
                  checked={noUiChanges}
                  onCheckedChange={setNoUiChanges}
                  data-testid="switch-no-ui"
                />
              </div>
            </div>

            <Button
              onClick={() => generateExport.mutate()}
              disabled={generateExport.isPending}
              variant="purple"
              className="w-full rounded-xl"
              data-testid="button-generate"
            >
              {generateExport.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Package className="w-4 h-4 mr-2" />
              )}
              Generate Export
            </Button>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between">
              <Badge className="bg-semantic-success-soft text-semantic-success">Generated Successfully</Badge>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy} data-testid="button-copy">
                  {copied ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                  {copied ? "Copied!" : "Copy"}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadMd} data-testid="button-download-md">
                  <Download className="w-4 h-4 mr-1" />
                  .md
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadTxt} data-testid="button-download-txt">
                  <FileText className="w-4 h-4 mr-1" />
                  .txt
                </Button>
              </div>
            </div>

            <Textarea
              value={generatedContent}
              readOnly
              className="min-h-[400px] font-mono text-xs"
              data-testid="textarea-output"
            />

            <Button variant="outline" onClick={resetState} className="w-full" data-testid="button-back">
              Generate Another
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
