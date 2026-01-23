import { useEffect, useState, type ReactNode } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useSiteContext } from "@/hooks/useSiteContext";
import { 
  LayoutDashboard, 
  Bot, 
  Ticket, 
  FileText, 
  Play, 
  Settings, 
  Plug, 
  LogOut,
  ChevronDown,
  ChevronRight,
  Building2,
  Loader2,
  Target,
  Award,
  Globe,
  Bell,
  Key
} from "lucide-react";
import arcloLogo from "@assets/A_small_logo_1765393189114.png";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/app/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/app/agents", label: "Agents", icon: Bot },
  { path: "/app/benchmarks", label: "Benchmarks", icon: Target },
  { path: "/app/achievements", label: "Achievements", icon: Award },
];

const SETTINGS_ITEMS = [
  { path: "/app/settings", label: "General", icon: Settings },
  { path: "/app/integrations", label: "Integrations", icon: Plug },
  { path: "/app/domains", label: "Domains", icon: Globe },
  { path: "/app/tickets", label: "Tickets", icon: Ticket },
  { path: "/app/changes", label: "Changes", icon: FileText },
  { path: "/app/runs", label: "Runs", icon: Play },
  { path: "/app/api-keys", label: "API Keys", icon: Key },
  { path: "/app/notifications", label: "Notifications", icon: Bell },
];

interface AppShellProps {
  children: ReactNode;
  lightMode?: boolean;
}

function SettingsNav({ location, lightMode }: { location: string; lightMode: boolean }) {
  const [isOpen, setIsOpen] = useState(() => {
    return SETTINGS_ITEMS.some(item => location === item.path || location.startsWith(item.path + "/"));
  });
  
  const isSettingsActive = SETTINGS_ITEMS.some(item => 
    location === item.path || location.startsWith(item.path + "/")
  );

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
          isSettingsActive 
            ? "bg-sidebar-primary text-sidebar-primary-foreground" 
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        )}
        data-testid="nav-link-settings"
      >
        <span className="flex items-center space-x-3">
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>
      
      {isOpen && (
        <div className="ml-4 pl-3 border-l border-sidebar-border space-y-1">
          {SETTINGS_ITEMS.map((item) => {
            const isActive = location === item.path || location.startsWith(item.path + "/");
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path}>
                <span
                  className={cn(
                    "flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm transition-colors cursor-pointer",
                    isActive 
                      ? "text-sidebar-primary-foreground bg-sidebar-primary" 
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                  data-testid={`nav-link-settings-${item.label.toLowerCase().replace(" ", "-")}`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AppShell({ children, lightMode = false }: AppShellProps) {
  const { authenticated, user, loading, logout, activeWebsiteId, selectWebsite } = useAuth();
  const { sites } = useSiteContext();
  const [location, navigate] = useLocation();

  useEffect(() => {
    if (loading) return;
    
    if (!authenticated) {
      navigate("/login");
      return;
    }
    
    if (!activeWebsiteId && location !== "/app/select-site") {
      if (sites && sites.length === 0) {
        return;
      }
      if (sites && sites.length === 1) {
        selectWebsite(sites[0].siteId);
        return;
      }
      if (sites && sites.length > 1) {
        navigate("/app/select-site");
        return;
      }
    }
  }, [loading, authenticated, activeWebsiteId, location, navigate, sites, selectWebsite]);

  if (loading) {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center",
        lightMode ? "bg-muted" : "bg-background"
      )}>
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
          <p className={lightMode ? "text-muted-foreground" : "text-muted-foreground"}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  const currentSite = sites?.find(s => s.siteId === activeWebsiteId);

  return (
    <div className={cn(
      "min-h-screen flex",
      lightMode ? "bg-muted" : "bg-background"
    )}>
      <aside className={cn(
        "w-64 border-r flex flex-col",
        "bg-sidebar border-sidebar-border"
      )}>
        <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
          <Link href="/app/dashboard" className="flex items-center">
            <img src={arcloLogo} alt="Arclo" className="h-10 w-auto" />
          </Link>
        </div>

        {sites && sites.length > 0 && (
          <div className="p-3 border-b border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-between bg-sidebar-accent border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/80"
                  data-testid="button-site-selector"
                >
                  <span className="flex items-center space-x-2 truncate">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span className="truncate">{currentSite?.displayName || "Select site"}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className={cn(
                "w-56",
                lightMode 
                  ? "bg-card border-border" 
                  : "bg-card border-border"
              )}>
                {sites.map((site) => (
                  <DropdownMenuItem
                    key={site.siteId}
                    onClick={() => selectWebsite(site.siteId)}
                    className={cn(
                      "cursor-pointer",
                      lightMode 
                        ? cn(
                            "text-foreground focus:bg-secondary focus:text-foreground",
                            site.siteId === activeWebsiteId && "bg-secondary text-gold"
                          )
                        : cn(
                            "text-foreground/80 focus:bg-secondary focus:text-foreground",
                            site.siteId === activeWebsiteId && "bg-secondary text-gold"
                          )
                    )}
                    data-testid={`menu-item-site-${site.siteId}`}
                  >
                    {site.displayName}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.path || location.startsWith(item.path + "/");
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path}>
                <span
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                    isActive 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground" 
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                  )}
                  data-testid={`nav-link-${item.label.toLowerCase().replace(" ", "-")}`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </span>
              </Link>
            );
          })}
          
          <SettingsNav location={location} lightMode={lightMode} />
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                data-testid="button-user-menu"
              >
                <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3 bg-sidebar-accent">
                  <span className="text-sm font-medium text-white">
                    {user?.email?.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
                <span className="truncate">{user?.email || "User"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className={cn(
              "w-56",
              lightMode 
                ? "bg-card border-border" 
                : "bg-card border-border"
            )}>
              <div className="px-2 py-1.5">
                <p className={cn(
                  "text-sm",
                  lightMode ? "text-foreground" : "text-foreground"
                )}>{user?.display_name || user?.email}</p>
                <p className={cn(
                  "text-xs capitalize",
                  lightMode ? "text-muted-foreground" : "text-muted-foreground"
                )}>{user?.plan || "Free"} Plan</p>
              </div>
              <DropdownMenuSeparator className={lightMode ? "bg-border" : "bg-border"} />
              <DropdownMenuItem 
                onClick={logout}
                className={cn(
                  "cursor-pointer text-destructive",
                  lightMode 
                    ? "focus:bg-secondary focus:text-destructive" 
                    : "focus:bg-secondary focus:text-destructive"
                )}
                data-testid="menu-item-logout"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
