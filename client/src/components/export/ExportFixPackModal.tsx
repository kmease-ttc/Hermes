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
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

  const generateExport = useMutation({
    mutationFn: async () => {
      const params = new URLSearchParams({
        site_id: currentSite?.siteId || "default",
        scope,
        maxBlogs: maxBlogs.toString(),
        maxTech: maxTech.toString(),
        noUi: noUiChanges.toString(),
      });
      
      const response = await fetch(`/api/export/fix-pack?${params}`);
      if (!response.ok) {
        throw new Error("Failed to generate export");
      }
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedContent(data.content_md);
      toast.success("Fix Pack generated successfully");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to generate export");
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
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { onOpenChange(val); if (!val) resetState(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="export-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Export Fix Pack
          </DialogTitle>
          <DialogDescription>
            Generate a structured implementation document with priorities, evidence, and guardrails.
          </DialogDescription>
        </DialogHeader>

        {!generatedContent ? (
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="text-sm font-medium">Export Type</Label>
              <RadioGroup value={exportType} onValueChange={(v) => setExportType(v as any)} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fix-pack" id="fix-pack" data-testid="radio-fix-pack" />
                  <Label htmlFor="fix-pack" className="flex items-center gap-2 cursor-pointer">
                    <Sparkles className="w-4 h-4 text-amber-500" />
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

            <div className="bg-muted/50 rounded-lg p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Shield className="w-4 h-4 text-green-600" />
                Safety Settings
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Max blog posts to publish</Label>
                  <Badge variant="outline">{maxBlogs}</Badge>
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
                  <Label className="text-sm">Max technical changes</Label>
                  <Badge variant="outline">{maxTech}</Badge>
                </div>
                <Slider
                  value={[maxTech]}
                  onValueChange={(v) => setMaxTech(v[0])}
                  min={1}
                  max={5}
                  step={1}
                  className="w-full"
                  data-testid="slider-max-tech"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="text-sm">Do not change design/UI</Label>
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
              className="w-full"
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
              <Badge className="bg-green-100 text-green-700">Generated Successfully</Badge>
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
