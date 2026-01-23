import { AlertTriangle, Target, Users, Sparkles, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import { BrandButton } from "@/components/marketing/BrandButton";

export function ReportPreview() {
  return (
    <section className="px-5 md:px-6 py-12 md:py-16 bg-muted">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-3 tracking-tight">
          Your SEO, <span className="marketing-gradient-text">fixed automatically.</span>
        </h2>
        <p className="text-center text-muted-foreground mb-10 max-w-xl mx-auto">
          Arclo finds issues and fixes them for you. No reports to review. No agencies. No waiting.
        </p>
        
        <Card className="bg-card border border-border overflow-hidden shadow-[0_24px_48px_rgba(15,23,42,0.1)]">
          <div className="bg-muted px-6 py-4 border-b border-border">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">SEO Report</span>
              <span className="text-sm font-medium text-foreground">yoursite.com</span>
            </div>
          </div>
          <CardContent className="p-6">
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-4 p-4 rounded-lg bg-danger-soft border border-danger">
                <div className="w-10 h-10 rounded-full bg-danger-soft flex items-center justify-center shrink-0">
                  <AlertTriangle className="h-5 w-5 text-danger" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">12</p>
                  <p className="text-sm text-muted-foreground">Technical Issues found</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-lg bg-success-soft border border-success">
                <div className="w-10 h-10 rounded-full bg-success-soft flex items-center justify-center shrink-0">
                  <Target className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">24</p>
                  <p className="text-sm text-muted-foreground">Keyword Opportunities found</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-lg bg-gold-soft border border-gold">
                <div className="w-10 h-10 rounded-full bg-gold-soft flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-gold" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">8</p>
                  <p className="text-sm text-muted-foreground">Competitor Gaps found</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 rounded-lg bg-brand-soft border border-brand">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary via-pink-500 to-gold flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">Ready to fix</p>
                  <p className="text-sm text-brand font-medium">44 improvements queued</p>
                </div>
              </div>
            </div>
            
            <div className="pt-6 border-t border-border">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <BrandButton 
                  variant="primary"
                  size="md"
                  icon={Sparkles}
                  data-testid="button-fix-it"
                >
                  Fix it
                </BrandButton>
                <BrandButton 
                  variant="link"
                  icon={Eye}
                  data-testid="button-view-details"
                >
                  View details
                </BrandButton>
              </div>
              <p className="text-center text-xs text-muted-foreground mt-4">
                Review changes before they go live, or let Arclo handle everything automatically.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
