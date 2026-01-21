import { useEffect, type ReactNode } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useSiteContext } from "@/hooks/useSiteContext";
import { 
  LayoutDashboard, 
  Users, 
  Ticket, 
  FileText, 
  Play, 
  Settings, 
  Plug, 
  LogOut,
  ChevronDown,
  Building2,
  Loader2,
  Target,
  Award,
  HelpCircle
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
  { path: "/app/agents", label: "Agents", icon: Users },
  { path: "/app/tickets", label: "Tickets", icon: Ticket },
  { path: "/app/changes", label: "Changes", icon: FileText },
  { path: "/app/runs", label: "Runs", icon: Play },
  { path: "/app/benchmarks", label: "Benchmarks", icon: Target },
  { path: "/app/achievements", label: "Achievements", icon: Award },
  { path: "/app/integrations", label: "Integrations", icon: Plug },
  { path: "/app/settings", label: "Settings", icon: Settings },
  { path: "/app/help", label: "Help", icon: HelpCircle },
];

interface AppShellProps {
  children: ReactNode;
  lightMode?: boolean;
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
        lightMode ? "bg-gray-50" : "bg-gray-900"
      )}>
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className={lightMode ? "text-gray-600" : "text-gray-400"}>Loading...</p>
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
      lightMode ? "bg-gray-50" : "bg-gray-900"
    )}>
      <aside className={cn(
        "w-64 border-r flex flex-col",
        lightMode 
          ? "bg-white border-gray-200" 
          : "bg-gray-800 border-gray-700"
      )}>
        <div className={cn(
          "h-16 flex items-center px-4 border-b",
          lightMode ? "border-gray-200" : "border-gray-700"
        )}>
          <Link href="/app/dashboard" className="flex items-center">
            <img src={arcloLogo} alt="Arclo" className="h-10 w-auto" />
          </Link>
        </div>

        {sites && sites.length > 0 && (
          <div className={cn(
            "p-3 border-b",
            lightMode ? "border-gray-200" : "border-gray-700"
          )}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className={cn(
                    "w-full justify-between",
                    lightMode 
                      ? "bg-gray-100 border-gray-300 text-gray-900 hover:bg-gray-200" 
                      : "bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  )}
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
                  ? "bg-white border-gray-200" 
                  : "bg-gray-800 border-gray-700"
              )}>
                {sites.map((site) => (
                  <DropdownMenuItem
                    key={site.siteId}
                    onClick={() => selectWebsite(site.siteId)}
                    className={cn(
                      "cursor-pointer",
                      lightMode 
                        ? cn(
                            "text-gray-700 focus:bg-gray-100 focus:text-gray-900",
                            site.siteId === activeWebsiteId && "bg-gray-100 text-amber-600"
                          )
                        : cn(
                            "text-gray-300 focus:bg-gray-700 focus:text-white",
                            site.siteId === activeWebsiteId && "bg-gray-700 text-amber-500"
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
                      ? "bg-amber-600/20 text-amber-500" 
                      : lightMode 
                        ? "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        : "text-gray-400 hover:bg-gray-700 hover:text-white"
                  )}
                  data-testid={`nav-link-${item.label.toLowerCase().replace(" ", "-")}`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className={cn(
          "p-3 border-t",
          lightMode ? "border-gray-200" : "border-gray-700"
        )}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className={cn(
                  "w-full justify-start",
                  lightMode 
                    ? "text-gray-600 hover:text-gray-900 hover:bg-gray-100" 
                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                )}
                data-testid="button-user-menu"
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center mr-3",
                  lightMode ? "bg-gray-200" : "bg-gray-600"
                )}>
                  <span className={cn(
                    "text-sm font-medium",
                    lightMode ? "text-gray-700" : "text-white"
                  )}>
                    {user?.email?.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
                <span className="truncate">{user?.email || "User"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className={cn(
              "w-56",
              lightMode 
                ? "bg-white border-gray-200" 
                : "bg-gray-800 border-gray-700"
            )}>
              <div className="px-2 py-1.5">
                <p className={cn(
                  "text-sm",
                  lightMode ? "text-gray-900" : "text-white"
                )}>{user?.display_name || user?.email}</p>
                <p className={cn(
                  "text-xs capitalize",
                  lightMode ? "text-gray-500" : "text-gray-400"
                )}>{user?.plan || "Free"} Plan</p>
              </div>
              <DropdownMenuSeparator className={lightMode ? "bg-gray-200" : "bg-gray-700"} />
              <DropdownMenuItem 
                onClick={logout}
                className={cn(
                  "cursor-pointer text-red-500",
                  lightMode 
                    ? "focus:bg-gray-100 focus:text-red-600" 
                    : "focus:bg-gray-700 focus:text-red-300"
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
