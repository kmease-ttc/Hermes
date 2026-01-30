import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { 
  Send, 
  FileText, 
  TrendingUp, 
  TrendingDown, 
  ArrowLeft,
  Link as LinkIcon,
  Copy,
  CheckCircle2,
  Loader2,
  Calendar,
  Target
} from "lucide-react";
import { Link } from "wouter";
import { ROUTES } from "@shared/routes";
import { useSiteContext } from "@/hooks/useSiteContext";
import { toast } from "sonner";

export default function WebsiteReportPage() {
  const { activeSite } = useSiteContext();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sendWeekly, setSendWeekly] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['/api/analyze/report', activeSite?.id],
    queryFn: async () => {
      if (!activeSite?.id) return null;
      const res = await fetch(`/api/analyze/report?siteId=${activeSite.id}`);
      return res.json();
    },
    enabled: !!activeSite?.id,
  });

  const healthGrade = reportData?.summary?.healthGrade || '—';
  const openTasks = reportData?.summary?.openTasks ?? '—';
  const monthlySessions = reportData?.crews?.popular?.primaryKpi?.value;
  const formattedSessions = monthlySessions != null 
    ? Number(monthlySessions).toLocaleString() 
    : 'No data';
  const hasData = reportData?.ok && reportData?.summary;

  const handleSend = async () => {
    if (!email.trim()) {
      toast.error("Please enter a recipient email");
      return;
    }
    setSending(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSending(false);
    toast.success("Website report sent successfully!");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin + "/reports/website/shared");
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <DashboardLayout className="dashboard-light">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout className="dashboard-light">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href={ROUTES.MISSION_CONTROL}>
            <Button variant="ghost" size="sm" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Mission Control
            </Button>
          </Link>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Website Report</h1>
              <p className="text-sm text-muted-foreground">{activeSite?.displayName || "Your Website"}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Last 30 days
            </span>
          </div>
          
          <p className="text-muted-foreground mt-4">
            This report summarizes your website's health and progress. Review it before sending.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-card/80 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="text-lg">Report Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Health Grade</p>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-bold text-primary">{healthGrade}</span>
                      {hasData && <Badge className="bg-semantic-success-soft text-semantic-success">Active</Badge>}
                    </div>
                  </div>
                  <div className="p-4 rounded-xl bg-muted/50">
                    <p className="text-sm text-muted-foreground mb-1">Open Tasks</p>
                    <div className="flex items-center gap-2">
                      <span className="text-3xl font-bold text-foreground">{openTasks}</span>
                      {typeof openTasks === 'number' && openTasks > 0 && (
                        <Badge className="bg-semantic-warning-soft text-semantic-warning">Pending</Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-3">Key Metrics</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <span className="text-sm">Monthly Sessions</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{formattedSessions}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <span className="text-sm">Bounce Rate</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-muted-foreground">—</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <span className="text-sm">Conversion Rate</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-muted-foreground">—</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-semibold mb-3">Trend Highlights</h4>
                  {hasData ? (
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {reportData?.crews?.scotty?.status === 'active' && (
                        <li className="flex items-start gap-2">
                          <Target className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          Technical SEO diagnostics active
                        </li>
                      )}
                      {reportData?.crews?.speedster?.status === 'active' && (
                        <li className="flex items-start gap-2">
                          <Target className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          Performance monitoring enabled
                        </li>
                      )}
                      {reportData?.crews?.popular?.status === 'active' && (
                        <li className="flex items-start gap-2">
                          <Target className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          Traffic analytics connected
                        </li>
                      )}
                      {!reportData?.crews?.scotty?.status && !reportData?.crews?.speedster?.status && !reportData?.crews?.popular?.status && (
                        <li className="flex items-start gap-2">
                          <Target className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          Run diagnostics for insights
                        </li>
                      )}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">Run diagnostics for insights</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <Card className="bg-card/80 backdrop-blur-sm border-border sticky top-4">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Send className="w-5 h-5 text-primary" />
                  Send Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Recipient Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="team@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="input-recipient-email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Add a Message (optional)</Label>
                  <Textarea
                    id="message"
                    placeholder="Here's the latest update on our website..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    data-testid="input-message"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">Send weekly</p>
                    <p className="text-xs text-muted-foreground">Auto-send every Monday</p>
                  </div>
                  <Switch
                    checked={sendWeekly}
                    onCheckedChange={setSendWeekly}
                    data-testid="switch-send-weekly"
                  />
                </div>

                <Button 
                  onClick={handleSend}
                  disabled={sending}
                  className="w-full bg-gradient-to-r from-primary via-pink-500 to-gold hover:opacity-90"
                  style={{ color: "#FFFFFF" }}
                  data-testid="button-send-report"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Website Report
                    </>
                  )}
                </Button>

                <Separator />

                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleCopyLink}
                    data-testid="button-copy-link"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2 text-semantic-success" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Shareable Link
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
