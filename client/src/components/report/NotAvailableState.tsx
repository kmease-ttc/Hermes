import { AlertCircle } from "lucide-react";

export function NotAvailableState({ reason }: { reason?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="not-available-state">
      <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
      <p className="text-lg font-medium text-foreground mb-2">Not Available</p>
      <p className="text-sm text-muted-foreground max-w-md">
        {reason || "This data is currently unavailable. Please try again later."}
      </p>
    </div>
  );
}
