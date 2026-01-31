import { Search, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IntentBadge, BucketBadge } from "./badges/ReportBadges";
import { NotAvailableState } from "./NotAvailableState";
import type { KeywordData } from "./types";

interface KeywordSectionProps {
  keywords?: KeywordData;
  missingReason?: string;
}

export function KeywordSection({ keywords, missingReason }: KeywordSectionProps) {
  if (!keywords || !keywords.targets?.length) {
    return (
      <section data-testid="section-keywords" className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
            <Search className="w-5 h-5 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-foreground">Ranking Snapshot</h2>
        </div>
        <Card>
          <CardContent className="pt-6">
            <NotAvailableState reason={missingReason} />
          </CardContent>
        </Card>
      </section>
    );
  }

  const totalKeywords = keywords.targets.length;
  const buckets = keywords.bucket_counts;
  const topTenCount = (buckets.rank_1 || 0) + (buckets.top_3 || 0) + (buckets["4_10"] || 0);

  const bucketItems = [
    { key: "rank_1", label: "#1", count: buckets.rank_1 || 0, color: "bg-emerald-500", textColor: "text-emerald-700", bgColor: "bg-emerald-50" },
    { key: "top_3", label: "Top 3", count: buckets.top_3 || 0, color: "bg-green-500", textColor: "text-green-700", bgColor: "bg-green-50" },
    { key: "4_10", label: "Top 10", count: topTenCount, color: "bg-blue-500", textColor: "text-blue-700", bgColor: "bg-blue-50" },
    { key: "11_30", label: "11-30", count: buckets["11_30"] || 0, color: "bg-amber-500", textColor: "text-amber-700", bgColor: "bg-amber-50" },
    { key: "not_ranking", label: "Not Ranking", count: buckets.not_ranking || 0, color: "bg-red-500", textColor: "text-red-600", bgColor: "bg-red-50" },
  ];

  return (
    <section data-testid="section-keywords" className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Search className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Ranking Snapshot</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            <span className="font-semibold text-foreground">{totalKeywords}</span> target keywords identified
          </p>
        </div>
      </div>

      {/* Bucket Strip */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {bucketItems.map((item) => (
          <div
            key={item.key}
            className={`flex-1 min-w-[90px] ${item.bgColor} rounded-xl p-3 text-center`}
          >
            <p className={`text-2xl font-bold ${item.textColor} leading-none`} data-testid={`bucket-${item.key}`}>
              {item.count}
            </p>
            <p className={`text-xs ${item.textColor} mt-1.5 font-medium`}>{item.label}</p>
          </div>
        ))}
      </div>

      {/* Insight */}
      {keywords.insight && (
        <div className="flex items-start gap-3 p-4 bg-muted/50 rounded-xl border border-border" data-testid="keywords-insight">
          <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <p className="text-sm text-muted-foreground">{keywords.insight}</p>
        </div>
      )}

      {/* Keywords Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Keyword</TableHead>
                  <TableHead>Intent</TableHead>
                  <TableHead>Volume</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Ranking</TableHead>
                  <TableHead>Winner</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keywords.targets.map((kw, idx) => (
                  <TableRow
                    key={idx}
                    data-testid={`keyword-row-${idx}`}
                    className={kw.current_bucket === "not_ranking" ? "bg-red-50/50" : undefined}
                  >
                    <TableCell className="font-medium">{kw.keyword}</TableCell>
                    <TableCell>
                      <IntentBadge intent={kw.intent} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {kw.volume_range ? `${kw.volume_range.min.toLocaleString()}-${kw.volume_range.max.toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {kw.position !== null && kw.position !== undefined ? kw.position : "—"}
                    </TableCell>
                    <TableCell>
                      <BucketBadge bucket={kw.current_bucket} />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-[150px]">
                      {kw.winner_domain || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
