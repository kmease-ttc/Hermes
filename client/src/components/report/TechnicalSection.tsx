import { Wrench, Search, Link2, FileText, FileWarning } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SeverityBadge, StatusBadge } from "./badges/ReportBadges";
import { NotAvailableState } from "./NotAvailableState";
import type { TechnicalData } from "./types";

interface TechnicalSectionProps {
  technical?: TechnicalData;
  missingReason?: string;
  scanMode?: "light" | "full";
}

const bucketIcons: Record<string, typeof Wrench> = {
  "Indexing & Crawlability": Search,
  "Site Structure & Internal Links": Link2,
  "On-page Basics": FileText,
  "Errors & Warnings": FileWarning,
};

export function TechnicalSection({ technical, missingReason, scanMode }: TechnicalSectionProps) {
  if (!technical || !technical.buckets?.length) {
    return (
      <section data-testid="section-technical" className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Wrench className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Technical SEO Health</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <NotAvailableState reason={missingReason} />
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section data-testid="section-technical" className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Wrench className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Technical SEO Health</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {technical.buckets.map((bucket, idx) => {
          const Icon = bucketIcons[bucket.name] || Wrench;
          const findingCount = bucket.findings?.length || 0;
          return (
            <Card key={idx} data-testid={`technical-bucket-${idx}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    {bucket.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {findingCount > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {findingCount} {findingCount === 1 ? "issue" : "issues"}
                      </Badge>
                    )}
                    <StatusBadge status={bucket.status} />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {findingCount > 0 ? (
                  <Accordion type="single" collapsible className="w-full">
                    {bucket.findings.map((finding, fIdx) => (
                      <AccordionItem key={fIdx} value={`finding-${fIdx}`} className="border-b-0">
                        <AccordionTrigger className="py-2 text-sm hover:no-underline">
                          <div className="flex items-center gap-2 text-left">
                            <SeverityBadge severity={finding.severity} />
                            <span>{finding.title}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground pb-3">
                          <p className="mb-2">{finding.detail}</p>
                          {finding.example_urls?.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-foreground mb-1">Affected URLs:</p>
                              {finding.example_urls.slice(0, 3).map((url, i) => (
                                <a
                                  key={i}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline block truncate"
                                >
                                  {url}
                                </a>
                              ))}
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <p className="text-sm text-muted-foreground">No issues found</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {scanMode === "light" && (
        <p className="text-xs text-muted-foreground italic pl-1">
          Light scan — homepage only. Create an account for a full site-wide audit.
        </p>
      )}
    </section>
  );
}
