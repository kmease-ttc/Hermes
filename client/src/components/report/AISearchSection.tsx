import { Brain, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AISearchData } from "./types";

interface AISearchSectionProps {
  aiSearch: AISearchData;
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 70 ? "bg-semantic-success" : score >= 40 ? "bg-semantic-warning" : "bg-semantic-danger";
  const textColor = score >= 70 ? "text-semantic-success" : score >= 40 ? "text-semantic-warning" : "text-semantic-danger";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className={`text-sm font-bold ${textColor}`}>{score}</span>
      </div>
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>
    </div>
  );
}

export function AISearchSection({ aiSearch }: AISearchSectionProps) {
  if (!aiSearch) return null;

  return (
    <section data-testid="section-ai-search" className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
          <Brain className="w-5 h-5 text-primary" />
        </div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold text-foreground">AI Search Readiness</h2>
          <Badge variant="outline" className="text-xs font-medium">Beta</Badge>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-6">
          {/* Score Bars */}
          <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
            <ScoreBar label="AI Visibility" score={aiSearch.ai_visibility_score} />
            <ScoreBar label="Structured Data" score={aiSearch.structured_data_coverage} />
            <ScoreBar label="Entity Coverage" score={aiSearch.entity_coverage} />
            <ScoreBar label="LLM Answerability" score={aiSearch.llm_answerability} />
          </div>

          {/* Checklist */}
          {aiSearch.checklist.length > 0 && (
            <div className="border-t pt-5">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Checklist</h3>
              <div className="space-y-2">
                {aiSearch.checklist.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    {item.status === "pass" ? (
                      <CheckCircle2 className="w-4 h-4 text-semantic-success mt-0.5 shrink-0" />
                    ) : item.status === "warning" ? (
                      <AlertTriangle className="w-4 h-4 text-semantic-warning mt-0.5 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-semantic-danger mt-0.5 shrink-0" />
                    )}
                    <div>
                      <span className="text-sm font-medium text-foreground">{item.title}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground italic">
        AI Search Optimization analysis is in beta. Scores reflect homepage-only analysis.
      </p>
    </section>
  );
}
