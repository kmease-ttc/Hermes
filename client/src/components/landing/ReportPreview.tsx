import { AlertTriangle, Target, Users, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function ReportPreview() {
  return (
    <section className="px-5 md:px-6 py-12 md:py-16 bg-muted/20">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-3">
          A report you can actually use.
        </h2>
        <p className="text-center text-muted-foreground mb-10 max-w-xl mx-auto">
          Clear explanations, plain language, and a prioritized plan — not a wall of charts.
        </p>
        
        <Card className="bg-card border-border overflow-hidden">
          <div className="bg-muted/50 px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">SEO Report</span>
              <span className="text-sm font-medium text-foreground">yoursite.com</span>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-semantic-danger-soft/30 border border-semantic-danger/20">
                <div className="w-10 h-10 rounded-full bg-semantic-danger/20 flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-semantic-danger" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">12</p>
                  <p className="text-sm text-muted-foreground">Technical Issues found</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-lg bg-semantic-success-soft/30 border border-semantic-success/20">
                <div className="w-10 h-10 rounded-full bg-semantic-success/20 flex items-center justify-center shrink-0">
                  <Target className="h-5 w-5 text-semantic-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">24</p>
                  <p className="text-sm text-muted-foreground">Keyword Opportunities found</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-lg bg-semantic-warning-soft/30 border border-semantic-warning/20">
                <div className="w-10 h-10 rounded-full bg-semantic-warning/20 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-semantic-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">8</p>
                  <p className="text-sm text-muted-foreground">Competitor Gaps found</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/10 border border-primary/20">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                  <ArrowRight className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Priority Actions</p>
                  <p className="text-sm text-primary">View Plan →</p>
                </div>
              </div>
            </div>
            
            <div className="text-center pt-4 border-t border-border/50">
              <p className="text-sm text-muted-foreground italic">
                Sample report layout — your report will be specific to your site.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
