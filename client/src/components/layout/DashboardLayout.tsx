import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Settings, 
  FileText, 
  LogOut,
  Menu,
  X,
  Globe,
  ChevronDown,
  Plus,
  Check,
  Link2,
  Lightbulb,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSiteContext } from "@/hooks/useSiteContext";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import logoImage from "@assets/generated_images/minimalist_cross_symbol_with_data_graph_lines.png";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [addSiteOpen, setAddSiteOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState("");
  const [newSiteUrl, setNewSiteUrl] = useState("");
  
  const { sites, selectedSite, setSelectedSiteId, currentSite } = useSiteContext();
  const queryClient = useQueryClient();

  const addSiteMutation = useMutation({
    mutationFn: async (data: { displayName: string; baseUrl: string }) => {
      const res = await fetch('/api/sites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to add site');
      return res.json();
    },
    onSuccess: (newSite) => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      setSelectedSiteId(newSite.siteId);
      setAddSiteOpen(false);
      setNewSiteName("");
      setNewSiteUrl("");
      toast.success(`${newSite.displayName} added successfully`);
    },
    onError: () => {
      toast.error("Failed to add site");
    },
  });

  const handleAddSite = () => {
    if (!newSiteName.trim() || !newSiteUrl.trim()) {
      toast.error("Please enter both name and URL");
      return;
    }
    let url = newSiteUrl.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    addSiteMutation.mutate({ displayName: newSiteName.trim(), baseUrl: url });
  };

  const navItems = [
    { href: "/dashboard", label: "Mission Control", icon: LayoutDashboard },
    { href: "/crew", label: "Agents", icon: Users },
    { href: "/integrations", label: "Integrations", icon: Link2 },
    { href: "/sites", label: "Sites", icon: Globe },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const activeSite = currentSite || selectedSite;
  const siteInitials = activeSite?.displayName?.slice(0, 2).toUpperCase() || "??";

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-card border-r border-border flex flex-col transition-transform duration-200 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-6 flex items-center gap-3 border-b border-border/50">
          <img src={logoImage} alt="Logo" className="w-8 h-8 rounded-md" />
          <div>
            <h1 className="font-bold text-sm tracking-tight text-foreground">Hermes</h1>
            <p className="text-xs text-muted-foreground font-medium">SEO Orchestrator</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="ml-auto lg:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Site Selector */}
        <div className="px-4 py-3 border-b border-border/50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full justify-between gap-2 h-auto py-2"
                data-testid="button-site-selector"
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                    {siteInitials}
                  </div>
                  <span className="text-sm font-medium truncate">
                    {activeSite?.displayName || "Select Site"}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {sites.map((site) => (
                <DropdownMenuItem
                  key={site.siteId}
                  onClick={() => setSelectedSiteId(site.siteId)}
                  className="flex items-center gap-2"
                  data-testid={`menu-item-site-${site.siteId}`}
                >
                  <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
                    {site.displayName.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="flex-1 truncate">{site.displayName}</span>
                  {activeSite?.siteId === site.siteId && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => setAddSiteOpen(true)}
                className="flex items-center gap-2 text-primary"
                data-testid="menu-item-add-site"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Site</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href || (item.href !== "/dashboard" && location.startsWith(item.href));
            
            return (
              <Link key={item.href} href={item.href}>
                <div className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}>
                  <Icon className="w-4 h-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border/50">
          <Button variant="outline" className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:border-destructive/30">
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden h-16 border-b border-border flex items-center px-4 bg-card">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <span className="ml-3 font-semibold text-foreground">{activeSite?.displayName || "Dashboard"}</span>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-y-auto">
          {children}
        </div>
      </main>

      {/* Add Site Dialog */}
      <Dialog open={addSiteOpen} onOpenChange={setAddSiteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Website</DialogTitle>
            <DialogDescription>
              Enter the website details to start monitoring its SEO performance.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="siteName">Website Name</Label>
              <Input
                id="siteName"
                placeholder="My Business Website"
                value={newSiteName}
                onChange={(e) => setNewSiteName(e.target.value)}
                data-testid="input-site-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="siteUrl">Website URL</Label>
              <Input
                id="siteUrl"
                placeholder="https://example.com"
                value={newSiteUrl}
                onChange={(e) => setNewSiteUrl(e.target.value)}
                data-testid="input-site-url"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddSiteOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddSite} 
              disabled={addSiteMutation.isPending}
              data-testid="button-submit-add-site"
            >
              {addSiteMutation.isPending ? "Adding..." : "Add Site"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
