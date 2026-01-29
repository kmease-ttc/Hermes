import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Globe, Plus, CheckCircle, Clock, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { buildRoute } from "@shared/routes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ManagedWebsite {
  id: string;
  name: string;
  domain: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function WebsiteRegistry() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDomain, setNewDomain] = useState("");

  const { data, isLoading } = useQuery<{ ok: boolean; websites: ManagedWebsite[] }>({
    queryKey: ["/api/websites"],
    queryFn: async () => {
      const res = await fetch("/api/websites");
      if (!res.ok) throw new Error("Failed to fetch websites");
      return res.json();
    },
  });

  const createWebsite = useMutation({
    mutationFn: async ({ name, domain }: { name: string; domain: string }) => {
      const res = await fetch("/api/websites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, domain }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create website");
      return json;
    },
    onSuccess: () => {
      toast({ title: "Website added", description: "The website has been registered successfully." });
      queryClient.invalidateQueries({ queryKey: ["/api/websites"] });
      setShowAddDialog(false);
      setNewName("");
      setNewDomain("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const websites = data?.websites || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Active
          </Badge>
        );
      case "paused":
        return (
          <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Paused
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleCreate = () => {
    if (!newName.trim() || !newDomain.trim()) return;
    createWebsite.mutate({ name: newName.trim(), domain: newDomain.trim() });
  };

  return (
    <DashboardLayout
      title="Website Registry"
      subtitle="Manage target websites that Hermes orchestrates"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Managed Websites ({websites.length})
          </h2>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Website
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add a Managed Website</DialogTitle>
                <DialogDescription>
                  Register a new website for Hermes to manage. This does not modify
                  the target site - it registers it for job orchestration.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Website Name</Label>
                  <Input
                    id="name"
                    placeholder="Empathy Health Clinic"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Domain</Label>
                  <Input
                    id="domain"
                    placeholder="empathyhealthclinic.com"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={createWebsite.isPending || !newName.trim() || !newDomain.trim()}
                >
                  {createWebsite.isPending ? "Adding..." : "Add Website"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="text-muted-foreground text-sm">Loading websites...</div>
        ) : websites.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Globe className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground mb-4">
                No managed websites yet. Add your first website to start orchestrating jobs.
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Website
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {websites.map((website) => (
              <Link key={website.id} href={buildRoute.websiteDetail(website.id)}>
                <Card className="hover:border-primary/40 transition-colors cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Globe className="w-4 h-4 text-primary" />
                        {website.name}
                      </CardTitle>
                      {getStatusBadge(website.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        {website.domain}
                      </span>
                      <span>
                        Added {new Date(website.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
