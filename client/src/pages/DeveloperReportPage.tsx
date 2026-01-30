import { useState } from "react";
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
  Code, 
  ArrowLeft,
  Copy,
  CheckCircle2,
  Loader2,
  Calendar,
  AlertTriangle,
  Zap,
  Clock
} from "lucide-react";
import { Link } from "wouter";
import { ROUTES } from "@shared/routes";
import { useSiteContext } from "@/hooks/useSiteContext";
import { toast } from "sonner";

function ImpactBadge({ impact }: { impact: "High" | "Medium" | "Low" }) {
  const colors = {
    High: "bg-semantic-danger-soft text-semantic-danger",
    Medium: "bg-semantic-warning-soft text-semantic-warning",
    Low: "bg-semantic-success-soft text-semantic-success",
  };
  return <Badge className={`text-xs ${colors[impact]}`}>{impact}</Badge>;
}

function EffortBadge({ effort }: { effort: "S" | "M" | "L" }) {
  const labels = { S: "Quick", M: "Medium", L: "Long" };
  const colors = {
    S: "bg-semantic-info-soft text-semantic-info",
    M: "bg-muted text-muted-foreground",
    L: "bg-primary-soft text-primary",
  };
  return <Badge className={`text-xs ${colors[effort]}`}>{labels[effort]}</Badge>;
}

export default function DeveloperReportPage() {
  const { activeSite } = useSiteContext();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [includeCode, setIncludeCode] = useState(true);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const technicalIssues = [
    { 
      id: 1, 
      title: "Missing meta descriptions on 12 pages", 
      category: "SEO",
      impact: "High" as const, 
      effort: "S" as const,
      recommendation: "Add unique meta descriptions to improve click-through rates"
    },
    { 
      id: 2, 
      title: "Largest Contentful Paint exceeds 2.5s on mobile", 
      category: "Performance",
      impact: "High" as const, 
      effort: "M" as const,
      recommendation: "Optimize hero image and defer non-critical JavaScript"
    },
    { 
      id: 3, 
      title: "3 broken internal links detected", 
      category: "Technical",
      impact: "Medium" as const, 
      effort: "S" as const,
      recommendation: "Update or remove broken href attributes"
    },
    { 
      id: 4, 
      title: "Images missing alt attributes", 
      category: "Accessibility",
      impact: "Medium" as const, 
      effort: "S" as const,
      recommendation: "Add descriptive alt text to 8 images"
    },
    { 
      id: 5, 
      title: "Render-blocking resources detected", 
      category: "Performance",
      impact: "Low" as const, 
      effort: "M" as const,
      recommendation: "Defer or async load non-critical CSS and JS"
    },
  ];

  const handleSend = async () => {
    if (!email.trim()) {
      toast.error("Please enter a recipient email");
      return;
    }
    setSending(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setSending(false);
    toast.success("Developer report sent successfully!");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin + "/reports/developer/shared");
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

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
              <Code className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Developer Report</h1>
              <p className="text-sm text-muted-foreground">{activeSite?.displayName || "Your Website"}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-3">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Generated today
            </span>
          </div>
          
          <p className="text-muted-foreground mt-4">
            Prioritized technical issues and recommended fixes for your developer or agency.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-card/80 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="text-lg">Technical Findings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-semantic-danger" />
                    <span className="text-sm font-medium">2 High</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-semantic-warning" />
                    <span className="text-sm font-medium">2 Medium</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-semantic-success" />
                    <span className="text-sm font-medium">1 Low</span>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  {technicalIssues.map((issue) => (
                    <div 
                      key={issue.id} 
                      className="p-4 rounded-lg border border-border bg-card/50"
                      data-testid={`issue-${issue.id}`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <h4 className="font-medium text-foreground">{issue.title}</h4>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <ImpactBadge impact={issue.impact} />
                          <EffortBadge effort={issue.effort} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">{issue.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{issue.recommendation}</p>
                    </div>
                  ))}
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
                  <Label htmlFor="dev-email">Developer Email</Label>
                  <Input
                    id="dev-email"
                    type="email"
                    placeholder="developer@agency.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="input-developer-email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dev-message">Add Context (optional)</Label>
                  <Textarea
                    id="dev-message"
                    placeholder="Priority notes or timeline requirements..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    data-testid="input-dev-message"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="text-sm font-medium">Include code snippets</p>
                    <p className="text-xs text-muted-foreground">Add example fixes</p>
                  </div>
                  <Switch
                    checked={includeCode}
                    onCheckedChange={setIncludeCode}
                    data-testid="switch-include-code"
                  />
                </div>

                <Button 
                  onClick={handleSend}
                  disabled={sending}
                  className="w-full bg-gradient-to-r from-primary via-pink-500 to-gold hover:opacity-90"
                  style={{ color: "#FFFFFF" }}
                  data-testid="button-send-dev-report"
                >
                  {sending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Developer Report
                    </>
                  )}
                </Button>

                <Separator />

                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={handleCopyLink}
                    data-testid="button-copy-dev-link"
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
