import { Provenance, shouldShowBadge, getProvenanceReason } from "@shared/types/provenance";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./tooltip";

interface ProvenanceBadgeProps {
  provenance: Provenance;
  provenanceReason?: string;
  crewName?: string;
  className?: string;
}

export function ProvenanceBadge({ 
  provenance, 
  provenanceReason, 
  crewName,
  className = "" 
}: ProvenanceBadgeProps) {
  if (!shouldShowBadge(provenance)) {
    return null;
  }

  const reason = provenanceReason || getProvenanceReason(provenance, crewName);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span 
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gold-soft text-gold border border-gold-border ${className}`}
            data-testid="provenance-badge"
          >
            Sample
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs">{reason}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ProvenanceBadgeInline({ 
  provenance, 
  provenanceReason, 
  crewName 
}: ProvenanceBadgeProps) {
  if (!shouldShowBadge(provenance)) {
    return null;
  }

  const reason = provenanceReason || getProvenanceReason(provenance, crewName);

  return (
    <span 
      className="ml-1.5 inline-flex items-center px-1 py-0.5 rounded text-[9px] font-medium bg-gold-soft text-gold"
      title={reason}
      data-testid="provenance-badge-inline"
    >
      Sample
    </span>
  );
}
