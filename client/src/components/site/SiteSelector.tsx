import { useSiteContext } from "@/hooks/useSiteContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Globe, Check, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import { buildRoute } from "@shared/routes";

interface SiteSelectorProps {
  variant?: "default" | "compact" | "header";
  showManageLink?: boolean;
  className?: string;
}

export function SiteSelector({ variant = "default", showManageLink = true, className }: SiteSelectorProps) {
  const { sites, selectedSite, setSelectedSiteId, isLoading } = useSiteContext();
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <Button variant="outline" disabled className={cn("min-w-[180px]", className)}>
        <Globe className="w-4 h-4 mr-2 animate-pulse" />
        Loading sites...
      </Button>
    );
  }

  if (sites.length === 0) {
    return (
      <Button 
        variant="outline" 
        onClick={() => navigate(buildRoute.settingsTab("sites"))}
        className={cn("min-w-[180px]", className)}
        data-testid="button-add-first-site"
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Your First Site
      </Button>
    );
  }

  const displayText = variant === "compact" 
    ? selectedSite?.displayName?.slice(0, 12) + (selectedSite?.displayName && selectedSite.displayName.length > 12 ? "..." : "") 
    : selectedSite?.displayName || "Select Site";

  const displayDomain = selectedSite?.baseUrl?.replace(/^https?:\/\//, "").replace(/\/$/, "") || "";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant === "header" ? "ghost" : "outline"} 
          className={cn(
            "gap-2 justify-between",
            variant === "header" && "h-auto py-1 px-3 hover:bg-muted/50",
            variant === "compact" ? "min-w-[140px]" : "min-w-[200px]",
            className
          )}
          data-testid="button-site-selector"
        >
          <div className="flex items-center gap-2 text-left">
            <Globe className="w-4 h-4 text-primary flex-shrink-0" />
            <div className={cn("flex flex-col", variant !== "header" && "hidden sm:flex")}>
              <span className="font-medium text-sm truncate max-w-[140px]">{displayText}</span>
              {variant === "header" && displayDomain && (
                <span className="text-xs text-muted-foreground truncate max-w-[140px]">{displayDomain}</span>
              )}
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[240px]">
        {sites.map((site) => (
          <DropdownMenuItem
            key={site.siteId}
            onClick={() => setSelectedSiteId(site.siteId)}
            className="flex items-center justify-between cursor-pointer"
            data-testid={`menu-item-site-${site.siteId}`}
          >
            <div className="flex flex-col">
              <span className="font-medium">{site.displayName}</span>
              <span className="text-xs text-muted-foreground">
                {site.baseUrl?.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </span>
            </div>
            {selectedSite?.siteId === site.siteId && (
              <Check className="w-4 h-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
        
        {showManageLink && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => navigate(buildRoute.settingsTab("sites"))}
              className="cursor-pointer"
              data-testid="menu-item-manage-sites"
            >
              <Settings className="w-4 h-4 mr-2" />
              Manage Sites
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
