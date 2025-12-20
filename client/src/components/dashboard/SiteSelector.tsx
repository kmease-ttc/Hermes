import { useSiteContext } from "@/hooks/useSiteContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Globe, Loader2 } from "lucide-react";

export function SiteSelector() {
  const { sites, selectedSite, selectedSiteId, setSelectedSiteId, isLoading } = useSiteContext();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading sites...</span>
      </div>
    );
  }

  if (sites.length === 0) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Globe className="w-4 h-4" />
        <span className="text-sm">No sites configured</span>
      </div>
    );
  }

  return (
    <Select value={selectedSiteId || ''} onValueChange={setSelectedSiteId}>
      <SelectTrigger className="w-[280px]" data-testid="select-site">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <SelectValue placeholder="Select a site" />
        </div>
      </SelectTrigger>
      <SelectContent>
        {sites.map((site) => (
          <SelectItem key={site.siteId} value={site.siteId} data-testid={`site-option-${site.siteId}`}>
            <div className="flex flex-col">
              <span className="font-medium">{site.displayName}</span>
              <span className="text-xs text-muted-foreground">{site.baseUrl.replace(/^https?:\/\//, '')}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
