import { useState } from "react";
import { FileText, Copy, Check, Printer, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import type { ImplementationFix } from "./types";

interface ImplementationPlanSectionProps {
  plan?: ImplementationFix[];
  onCopy?: () => void;
}

export function ImplementationPlanSection({ plan, onCopy }: ImplementationPlanSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!plan?.length) return null;

  const generatePlanText = () => {
    return plan.map((fix, idx) => `
## ${idx + 1}. ${fix.title}
Priority: ${fix.priority}

### What to Change
${fix.what_to_change}

### Where to Change
${fix.where_to_change}

### Expected Impact
${fix.expected_impact}

### Acceptance Check
${fix.acceptance_check}

---`).join("\n");
  };

  const copyPlan = async () => {
    await navigator.clipboard.writeText(generatePlanText());
    setCopied(true);
    toast.success("Implementation plan copied to clipboard!");
    onCopy?.();
    setTimeout(() => setCopied(false), 2000);
  };

  const printPlan = () => {
    const printContent = `
      <html>
        <head>
          <title>Implementation Plan</title>
          <style>
            body { font-family: system-ui, sans-serif; padding: 2rem; line-height: 1.6; max-width: 800px; margin: 0 auto; }
            h1 { color: #1a1a1a; border-bottom: 2px solid #7C3AED; padding-bottom: 0.5rem; }
            h2 { color: #333; margin-top: 2rem; page-break-after: avoid; }
            h3 { color: #555; margin-top: 1rem; font-size: 1rem; }
            .priority { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.875rem; }
            .priority-1 { background: #fee2e2; color: #991b1b; }
            .priority-2 { background: #fef3c7; color: #92400e; }
            .priority-3 { background: #dbeafe; color: #1e40af; }
            p { margin: 0.5rem 0; }
            hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <h1>SEO Implementation Plan</h1>
          ${plan.map((fix, idx) => `
            <h2>${idx + 1}. ${fix.title}</h2>
            <span class="priority priority-${fix.priority <= 2 ? '1' : fix.priority <= 3 ? '2' : '3'}">Priority ${fix.priority}</span>
            <h3>What to Change</h3>
            <p>${fix.what_to_change}</p>
            <h3>Where to Change</h3>
            <p>${fix.where_to_change}</p>
            <h3>Expected Impact</h3>
            <p>${fix.expected_impact}</p>
            <h3>Acceptance Check</h3>
            <p>${fix.acceptance_check}</p>
            <hr />
          `).join("")}
        </body>
      </html>
    `;
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <section data-testid="section-implementation-plan" className="print:block">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Implementation Plan (DIY)
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{plan.length} fixes</Badge>
                  {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
              </div>
              <CardDescription>Step-by-step guide to fix the identified issues</CardDescription>
            </CardHeader>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <CardContent className="border-t border-border pt-4 space-y-4">
              <div className="flex gap-2 justify-end print:hidden">
                <Button variant="outline" size="sm" onClick={copyPlan} data-testid="btn-copy-plan">
                  {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copied ? "Copied!" : "Copy All"}
                </Button>
                <Button variant="outline" size="sm" onClick={printPlan} data-testid="btn-print-plan">
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
              </div>

              <div className="space-y-3">
                {plan.map((fix, idx) => (
                  <div
                    key={idx}
                    className="p-4 border border-border rounded-xl space-y-3"
                    data-testid={`implementation-fix-${idx}`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0">
                        {fix.priority}
                      </span>
                      <h4 className="font-semibold text-foreground pt-0.5">{fix.title}</h4>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 text-sm pl-10">
                      <div>
                        <p className="font-medium text-foreground mb-1">What to Change</p>
                        <p className="text-muted-foreground">{fix.what_to_change}</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground mb-1">Where to Change</p>
                        <p className="text-muted-foreground">{fix.where_to_change}</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground mb-1">Expected Impact</p>
                        <p className="text-muted-foreground">{fix.expected_impact}</p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground mb-1">Acceptance Check</p>
                        <p className="text-muted-foreground">{fix.acceptance_check}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </section>
  );
}
