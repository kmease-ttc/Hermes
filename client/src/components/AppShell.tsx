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
  { path: "/app/dashboard", label: "Mission Control", icon: LayoutDashboard },
  { path: "/app/crew", label: "Crew", icon: Users },
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
}

export default function AppShell({ children }: AppShellProps) {
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
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return null;
  }

  const currentSite = sites?.find(s => s.siteId === activeWebsiteId);

  return (
    <div className="min-h-screen flex bg-gray-900">
      <aside className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="h-16 flex items-center px-4 border-b border-gray-700">
          <Link href="/app/dashboard" className="flex items-center">
            <img src={arcloLogo} alt="Arclo" className="h-10 w-auto" />
          </Link>
        </div>

        {sites && sites.length > 0 && (
          <div className="p-3 border-b border-gray-700">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-between bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
                  data-testid="button-site-selector"
                >
                  <span className="flex items-center space-x-2 truncate">
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span className="truncate">{currentSite?.displayName || "Select site"}</span>
                  </span>
                  <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-gray-800 border-gray-700">
                {sites.map((site) => (
                  <DropdownMenuItem
                    key={site.siteId}
                    onClick={() => selectWebsite(site.siteId)}
                    className={cn(
                      "cursor-pointer text-gray-300 focus:bg-gray-700 focus:text-white",
                      site.siteId === activeWebsiteId && "bg-gray-700 text-amber-500"
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

        <div className="p-3 border-t border-gray-700">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-gray-400 hover:text-white hover:bg-gray-700"
                data-testid="button-user-menu"
              >
                <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center mr-3">
                  <span className="text-sm font-medium text-white">
                    {user?.email?.charAt(0).toUpperCase() || "U"}
                  </span>
                </div>
                <span className="truncate">{user?.email || "User"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-gray-800 border-gray-700">
              <div className="px-2 py-1.5">
                <p className="text-sm text-white">{user?.display_name || user?.email}</p>
                <p className="text-xs text-gray-400 capitalize">{user?.plan || "Free"} Plan</p>
              </div>
              <DropdownMenuSeparator className="bg-gray-700" />
              <DropdownMenuItem 
                onClick={logout}
                className="cursor-pointer text-red-400 focus:bg-gray-700 focus:text-red-300"
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
