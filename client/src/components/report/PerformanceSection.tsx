import { Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrafficLight, StatusBadge } from "./badges/ReportBadges";
import { NotAvailableState } from "./NotAvailableState";
import type { PerformanceData } from "./types";

interface PerformanceSectionProps {
  performance?: PerformanceData;
  missingReason?: string;
  scanMode?: "light" | "full";
}

export function PerformanceSection({ performance, missingReason, scanMode }: PerformanceSectionProps) {
  if (!performance || !performance.urls?.length) {
    return (
      <section data-testid="section-performance" className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Performance & Speed</h2>
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
    <section data-testid="section-performance" className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Performance & Speed</h2>
      </div>

      {performance.global_insight && (
        <div className="p-4 bg-muted/50 rounded-xl border border-border" data-testid="performance-insight">
          <p className="text-sm text-muted-foreground">{performance.global_insight}</p>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>URL</TableHead>
                  <TableHead className="text-center">LCP</TableHead>
                  <TableHead className="text-center">CLS</TableHead>
                  <TableHead className="text-center">INP</TableHead>
                  <TableHead>Overall</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {performance.urls.map((item, idx) => (
                  <TableRow key={idx} data-testid={`performance-row-${idx}`}>
                    <TableCell className="font-medium truncate max-w-[200px]">
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                        {item.url}
                      </a>
                    </TableCell>
                    <TableCell className="text-center">
                      <TrafficLight status={item.lcp_status} />
                    </TableCell>
                    <TableCell className="text-center">
                      <TrafficLight status={item.cls_status} />
                    </TableCell>
                    <TableCell className="text-center">
                      <TrafficLight status={item.inp_status} />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.overall} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground justify-center">
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-semantic-success" /> Good
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-semantic-warning" /> Needs Work
        </span>
        <span className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-semantic-danger" /> Poor
        </span>
      </div>

      {scanMode === "light" && (
        <p className="text-xs text-muted-foreground italic pl-1">
          Light scan — homepage only. Upgrade for multi-page performance analysis.
        </p>
      )}
    </section>
  );
}
