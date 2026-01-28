import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { ArcloCard } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, Mail, Clock, CheckCircle, ShieldAlert, MessageSquare, FileText } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSiteContext } from "@/hooks/useSiteContext";
import { toast } from "sonner";

interface DigestPrefs {
  enabled: boolean;
  frequency: string;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  includeOnlyIfChanges: boolean;
  lastSentAt: string | null;
  nextScheduledAt: string | null;
  deliveryCount: number;
}

interface DigestHistoryEntry {
  sentAt: string;
  opened: boolean;
  clicked: boolean;
  actionsCompleted: number;
}

interface NotificationPreferences {
  digest: DigestPrefs | null;
  alertPreferences: Record<string, boolean>;
  digestHistory: DigestHistoryEntry[];
  stats: { alertsSentThisMonth: number };
  deliveryEmail: string;
  websiteCadence: string;
}

const DAYS_OF_WEEK = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

const ALERT_CATEGORIES = [
  {
    key: "critical_issues",
    label: "Critical issues",
    description: "Performance regressions, crawl errors, and site-breaking problems",
    icon: ShieldAlert,
  },
  {
    key: "approval_needed",
    label: "Approval needed",
    description: "Changes that need your review before Arclo can proceed",
    icon: CheckCircle,
  },
  {
    key: "ranking_changes",
    label: "Ranking changes",
    description: "Significant keyword ranking drops or gains",
    icon: MessageSquare,
  },
  {
    key: "content_published",
    label: "Content published",
    description: "New pages, blog posts, or content updates deployed",
    icon: FileText,
  },
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export default function Notifications() {
  const { currentSite } = useSiteContext();
  const queryClient = useQueryClient();
  const siteId = currentSite?.siteId;

  const { data: prefs, isLoading } = useQuery<NotificationPreferences>({
    queryKey: ["notificationPreferences", siteId],
    queryFn: async () => {
      const res = await fetch(`/api/sites/${siteId}/notifications/preferences`);
      if (!res.ok) throw new Error("Failed to fetch notification preferences");
      return res.json();
    },
    enabled: !!siteId,
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const res = await fetch(`/api/sites/${siteId}/notifications/preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update preferences");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notificationPreferences", siteId] });
      toast.success("Preferences updated");
    },
    onError: (err: Error) => {
      toast.error("Failed to save", { description: err.message });
    },
  });

  const digest = prefs?.digest;
  const digestEnabled = digest?.enabled ?? true;
  const frequency = digest?.frequency ?? "weekly";
  const alertPreferences = prefs?.alertPreferences ?? {};

  if (!siteId) {
    return (
      <DashboardLayout className="dashboard-light">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Notifications</h1>
            <p className="text-muted-foreground">Control how and when Arclo keeps you informed</p>
          </div>
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">Select a site to manage notification preferences.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout className="dashboard-light">
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Notifications</h1>
          <p className="text-muted-foreground">Control how and when Arclo keeps you informed</p>
        </div>

        {/* Section 1: Status Summary */}
        {isLoading ? (
          <ArcloCard tone="soft">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          </ArcloCard>
        ) : prefs ? (
          <ArcloCard
            tone="soft"
            rightSlot={
              <Badge variant={digestEnabled ? "default" : "secondary"}>
                {digestEnabled ? "Active" : "Paused"}
              </Badge>
            }
          >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  Digest
                </div>
                <div className="mt-1 text-sm font-medium">
                  {digestEnabled
                    ? `${frequency.charAt(0).toUpperCase() + frequency.slice(1)}`
                    : "Paused"}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  Last sent
                </div>
                <div className="mt-1 text-sm font-medium">
                  {digest?.lastSentAt ? formatDate(digest.lastSentAt) : "Never"}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  Next digest
                </div>
                <div className="mt-1 text-sm font-medium">
                  {digest?.nextScheduledAt && digestEnabled
                    ? formatDay(digest.nextScheduledAt)
                    : "—"}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Bell className="h-3.5 w-3.5" />
                  Alerts (30d)
                </div>
                <div className="mt-1 text-sm font-medium">
                  {prefs.stats.alertsSentThisMonth}
                </div>
              </div>
            </div>
          </ArcloCard>
        ) : null}

        {/* Section 2: Digest Email Preferences */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Digest Emails</h2>
                <p className="text-sm text-muted-foreground">
                  Periodic summaries of what Arclo has done for your site
                </p>
              </div>
            </div>
            <Switch
              checked={digestEnabled}
              onCheckedChange={(checked) =>
                updateMutation.mutate({ digest: { enabled: checked } })
              }
              disabled={isLoading}
            />
          </div>

          {digestEnabled && (
            <div className="space-y-4 pl-14">
              {/* Frequency */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Frequency</label>
                <Select
                  value={frequency}
                  onValueChange={(value) =>
                    updateMutation.mutate({ digest: { frequency: value } })
                  }
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Delivery day */}
              {frequency === "weekly" && (
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Delivery day</label>
                  <Select
                    value={String(digest?.dayOfWeek ?? 1)}
                    onValueChange={(value) =>
                      updateMutation.mutate({ digest: { dayOfWeek: Number(value) } })
                    }
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {frequency === "monthly" && (
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Day of month</label>
                  <Select
                    value={String(digest?.dayOfMonth ?? 1)}
                    onValueChange={(value) =>
                      updateMutation.mutate({ digest: { dayOfMonth: Number(value) } })
                    }
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Smart sending */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">Smart sending</div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Skip the digest if Arclo had nothing new to report
                  </p>
                </div>
                <Switch
                  checked={digest?.includeOnlyIfChanges ?? true}
                  onCheckedChange={(checked) =>
                    updateMutation.mutate({ digest: { includeOnlyIfChanges: checked } })
                  }
                />
              </div>

              {prefs?.deliveryEmail && (
                <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                  Digests are sent to {prefs.deliveryEmail}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Section 3: Real-time Alerts */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Bell className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Real-time Alerts</h2>
              <p className="text-sm text-muted-foreground">
                Get notified immediately when something important happens
              </p>
            </div>
          </div>

          <div className="space-y-1">
            {ALERT_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const enabled = alertPreferences[cat.key] ?? false;
              return (
                <div
                  key={cat.key}
                  className="flex items-center justify-between py-3 pl-2 pr-1"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-medium">{cat.label}</div>
                      <p className="text-xs text-muted-foreground">{cat.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={enabled}
                    onCheckedChange={(checked) =>
                      updateMutation.mutate({
                        alertPreferences: { [cat.key]: checked },
                      })
                    }
                    disabled={isLoading}
                  />
                </div>
              );
            })}
          </div>

          {prefs?.deliveryEmail && (
            <p className="text-xs text-muted-foreground pt-2 border-t border-border">
              Alerts are sent via email to {prefs.deliveryEmail}
            </p>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
