import { CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";

const PREVIEW_ITEMS = [
  "SEO Health Score",
  "Top 3 Issues",
  "Keyword opportunities",
  "Technical + speed flags",
];

export function ReportPreview() {
  return (
    <section className="px-5 md:px-6 py-12 md:py-16 bg-muted/20">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-foreground mb-8">
          See what's in your report
        </h2>
        
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <Card className="aspect-video bg-gradient-to-br from-primary/5 to-primary/10 border-border/50 flex items-center justify-center">
            <div className="text-center p-8">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">87</span>
              </div>
              <p className="text-sm text-muted-foreground">Sample SEO Score</p>
            </div>
          </Card>
          
          <div className="space-y-4">
            {PREVIEW_ITEMS.map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                <span className="text-foreground">{item}</span>
              </div>
            ))}
            <p className="text-sm text-muted-foreground italic mt-6">
              This is a sample preview — your report will be specific to your site.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
