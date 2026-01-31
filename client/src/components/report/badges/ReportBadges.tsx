import { Badge } from "@/components/ui/badge";

export function SeverityBadge({ severity }: { severity: "low" | "medium" | "high" }) {
  const styles = {
    high: "bg-semantic-danger-soft text-semantic-danger border-semantic-danger-border",
    medium: "bg-semantic-warning-soft text-semantic-warning border-semantic-warning-border",
    low: "bg-semantic-info-soft text-semantic-info border-semantic-info-border",
  };
  return (
    <Badge variant="outline" className={styles[severity]}>
      {severity}
    </Badge>
  );
}

export function StatusBadge({ status }: { status: "good" | "needs_attention" | "needs_work" | "critical" | "poor" | "not_available" }) {
  const styles: Record<string, string> = {
    good: "bg-semantic-success-soft text-semantic-success border-semantic-success-border",
    needs_attention: "bg-semantic-warning-soft text-semantic-warning border-semantic-warning-border",
    needs_work: "bg-semantic-warning-soft text-semantic-warning border-semantic-warning-border",
    critical: "bg-semantic-danger-soft text-semantic-danger border-semantic-danger-border",
    poor: "bg-semantic-danger-soft text-semantic-danger border-semantic-danger-border",
    not_available: "bg-muted text-muted-foreground border-border",
  };
  const labels: Record<string, string> = {
    good: "Good",
    needs_attention: "Needs Attention",
    needs_work: "Needs Work",
    critical: "Critical",
    poor: "Poor",
    not_available: "N/A",
  };
  return (
    <Badge variant="outline" className={styles[status] || styles.not_available}>
      {labels[status] || status}
    </Badge>
  );
}

export function IntentBadge({ intent }: { intent: "high_intent" | "informational" }) {
  const styles = {
    high_intent: "bg-purple-soft text-purple border-purple-border",
    informational: "bg-system-soft text-system border-semantic-info-border",
  };
  return (
    <Badge variant="outline" className={styles[intent]}>
      {intent === "high_intent" ? "High Intent" : "Informational"}
    </Badge>
  );
}

export function BucketBadge({ bucket }: { bucket: "rank_1" | "top_3" | "4_10" | "11_30" | "not_ranking" }) {
  const styles: Record<string, string> = {
    rank_1: "bg-emerald-100 text-emerald-800 border-emerald-300",
    top_3: "bg-semantic-success-soft text-semantic-success border-semantic-success-border",
    "4_10": "bg-semantic-info-soft text-semantic-info border-semantic-info-border",
    "11_30": "bg-semantic-warning-soft text-semantic-warning border-semantic-warning-border",
    not_ranking: "bg-muted text-muted-foreground border-border",
  };
  const labels: Record<string, string> = {
    rank_1: "#1",
    top_3: "Top 3",
    "4_10": "4-10",
    "11_30": "11-30",
    not_ranking: "Not Ranking",
  };
  return (
    <Badge variant="outline" className={styles[bucket]}>
      {labels[bucket]}
    </Badge>
  );
}

export function TrafficLight({ status }: { status: "good" | "needs_work" | "poor" | "not_available" }) {
  const colors: Record<string, string> = {
    good: "bg-semantic-success",
    needs_work: "bg-semantic-warning",
    poor: "bg-semantic-danger",
    not_available: "bg-muted-foreground",
  };
  return (
    <span
      className={`inline-block w-3 h-3 rounded-full ${colors[status] || colors.not_available}`}
      title={status.replace("_", " ")}
    />
  );
}
