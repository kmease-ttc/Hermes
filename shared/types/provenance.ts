import { z } from "zod";

export const ProvenanceValues = ["real", "sample", "placeholder", "estimated", "unknown"] as const;

export const ProvenanceSchema = z.enum(ProvenanceValues);

export type Provenance = z.infer<typeof ProvenanceSchema>;

export interface ProvenanceData {
  provenance: Provenance;
  provenanceReason?: string;
}

export interface KpiWithProvenance {
  crewId: string;
  kpiId: string;
  value: number | string;
  label: string;
  unit?: string;
  measuredAt?: string;
  provenance: Provenance;
  provenanceReason?: string;
}

export function determineProvenance(
  hasDbData: boolean,
  hasVerifiedIntegration: boolean,
  isEstimated: boolean = false
): Provenance {
  if (hasDbData || hasVerifiedIntegration) return "real";
  if (isEstimated) return "estimated";
  return "sample";
}

export function getProvenanceReason(provenance: Provenance, crewName?: string): string {
  switch (provenance) {
    case "sample":
      return crewName 
        ? `Preview value — enable ${crewName} to fetch real data`
        : "Preview value — run diagnostics to fetch real data";
    case "placeholder":
      return "Placeholder value — no data available yet";
    case "estimated":
      return "Estimated value based on available data";
    case "unknown":
      return "Data source unknown — treating as sample";
    case "real":
      return "Verified data from your site";
  }
}

export function shouldShowBadge(provenance: Provenance): boolean {
  return provenance !== "real";
}
