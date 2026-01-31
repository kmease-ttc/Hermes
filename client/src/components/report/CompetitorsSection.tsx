import { Users, Globe } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { CompetitorData } from "./types";

interface CompetitorsSectionProps {
  competitors?: CompetitorData;
  scanId?: string;
}

export function CompetitorsSection({ competitors, scanId }: CompetitorsSectionProps) {
  if (!competitors?.items?.length) return null;

  const topDomains = competitors.items.slice(0, 5);
  if (topDomains.length === 0) return null;

  const signupUrl = scanId ? `/signup?scanId=${scanId}` : "/signup";

  return (
    <Card className="border-border" data-testid="top-competitors-block">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Top Competitors</h3>
        </div>

        <p className="text-sm text-muted-foreground">
          These sites are currently competing with you for visibility in search results.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {topDomains.map((comp, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border hover:bg-muted/60 transition-colors"
              data-testid={`top-competitor-${idx}`}
            >
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <span className="text-sm font-medium text-foreground block truncate">
                  {comp.domain}
                </span>
                {comp.keyword_overlap_count > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {comp.keyword_overlap_count} shared keywords
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground pt-2">
          <a
            href={signupUrl}
            className="underline underline-offset-2 hover:text-foreground transition-colors"
            data-testid="top-competitors-upgrade-link"
          >
            Unlock competitor keyword overlap and ranking comparisons
          </a>
        </p>
      </CardContent>
    </Card>
  );
}
