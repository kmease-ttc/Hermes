import { ArrowRight, AlertTriangle, TrendingUp, TrendingDown, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NextSteps, CTA } from "./types";

interface NextStepsSectionProps {
  nextSteps: NextSteps;
  onCtaClick: (cta: CTA) => void;
  scanId?: string;
}

export function NextStepsSection({ nextSteps, onCtaClick, scanId }: NextStepsSectionProps) {
  return (
    <section data-testid="section-next-steps" className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <ArrowRight className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">What This Means + Next Steps</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Do Nothing */}
        <Card className="bg-semantic-danger-soft border-semantic-danger-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-semantic-danger">
              <TrendingDown className="w-4 h-4" />
              If You Do Nothing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {nextSteps.if_do_nothing.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2" data-testid={`do-nothing-${idx}`}>
                  <AlertTriangle className="w-4 h-4 text-semantic-danger mt-0.5 shrink-0" />
                  <span className="text-sm text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Fix This */}
        <Card className="bg-semantic-success-soft border-semantic-success-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-semantic-success">
              <TrendingUp className="w-4 h-4" />
              If You Fix This
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {nextSteps.if_you_fix_this.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2" data-testid={`fix-this-${idx}`}>
                  <CheckCircle2 className="w-4 h-4 text-semantic-success mt-0.5 shrink-0" />
                  <span className="text-sm text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
        <Button
          size="lg"
          className="bg-gradient-to-r from-primary to-purple hover:from-primary/90 hover:to-purple/90 shadow-lg"
          style={{ color: "#FFFFFF" }}
          onClick={() => {
            const signupUrl = scanId ? `/signup?scanId=${scanId}` : "/signup";
            window.location.href = signupUrl;
          }}
          data-testid="cta-signup-primary"
        >
          Unlock Full Automation
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        {nextSteps.ctas
          .filter(cta => cta.id !== "deploy_fixes")
          .map((cta) => (
            <Button
              key={cta.id}
              variant="outline"
              size="lg"
              onClick={() => onCtaClick(cta)}
              data-testid={`cta-${cta.id}`}
            >
              {cta.label}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ))
        }
      </div>
    </section>
  );
}
