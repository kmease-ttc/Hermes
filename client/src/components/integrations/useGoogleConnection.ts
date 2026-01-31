import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GA4Property {
  propertyId: string;
  displayName: string;
}

export interface GSCProperty {
  siteUrl: string;
  permissionLevel: string;
}

export interface GoogleConnectionStatus {
  connected: boolean;
  googleEmail?: string;
  connectedAt?: string;
  ga4: { propertyId: string } | null;
  gsc: { siteUrl: string } | null;
  ads: { customerId: string; loginCustomerId?: string } | null;
}

export interface GoogleProperties {
  ga4: GA4Property[];
  gsc: GSCProperty[];
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGoogleConnection(siteId: string | null) {
  const queryClient = useQueryClient();
  const popupRef = useRef<Window | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // ── Status query ──────────────────────────────────────────────────────
  const {
    data: status,
    isLoading: isLoadingStatus,
    refetch: refetchStatus,
  } = useQuery<GoogleConnectionStatus>({
    queryKey: ["google-connection-status", siteId],
    queryFn: async () => {
      const res = await fetch(`/api/sites/${siteId}/google/status`);
      if (!res.ok) throw new Error("Failed to fetch Google status");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to fetch status");
      return data as GoogleConnectionStatus;
    },
    enabled: !!siteId,
    staleTime: 30_000,
  });

  // ── Properties query (manual trigger) ─────────────────────────────────
  const {
    data: properties,
    isLoading: isLoadingProperties,
    refetch: fetchProperties,
  } = useQuery<GoogleProperties>({
    queryKey: ["google-properties", siteId],
    queryFn: async () => {
      const res = await fetch(`/api/sites/${siteId}/google/properties`);
      if (!res.ok) throw new Error("Failed to fetch properties");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to fetch properties");
      return { ga4: data.ga4 || [], gsc: data.gsc || [] };
    },
    enabled: false, // Only fetch on demand
  });

  // ── Save properties mutation ──────────────────────────────────────────
  const savePropertiesMutation = useMutation({
    mutationFn: async (selection: { ga4PropertyId?: string; gscSiteUrl?: string }) => {
      const res = await fetch(`/api/sites/${siteId}/google/properties`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selection),
      });
      if (!res.ok) throw new Error("Failed to save properties");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to save");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-connection-status", siteId] });
    },
  });

  // ── Disconnect mutation ───────────────────────────────────────────────
  const disconnectMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/sites/${siteId}/google/disconnect`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to disconnect");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "Failed to disconnect");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-connection-status", siteId] });
      queryClient.invalidateQueries({ queryKey: ["google-properties", siteId] });
    },
  });

  // ── OAuth popup flow ──────────────────────────────────────────────────
  const startOAuth = useCallback(async (): Promise<boolean> => {
    if (!siteId) throw new Error("No site selected");

    setIsConnecting(true);

    try {
      // Get the auth URL from the backend
      const res = await fetch(`/api/sites/${siteId}/google/connect`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to start OAuth");
      const data = await res.json();
      if (!data.ok || !data.authUrl) throw new Error(data.error || "No auth URL returned");

      // Open popup
      const popup = window.open(
        data.authUrl,
        "google-oauth",
        "popup,width=600,height=700,left=200,top=100"
      );
      popupRef.current = popup;

      // Poll for connection status
      return new Promise<boolean>((resolve) => {
        let attempts = 0;
        const maxAttempts = 60; // 2 minutes at 2s intervals

        pollRef.current = setInterval(async () => {
          attempts++;

          // Check if popup was closed by user
          if (popup && popup.closed) {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            setIsConnecting(false);

            // One final check — maybe they completed auth before closing
            try {
              const statusRes = await fetch(`/api/sites/${siteId}/google/status`);
              const statusData = await statusRes.json();
              if (statusData.connected) {
                queryClient.invalidateQueries({ queryKey: ["google-connection-status", siteId] });
                resolve(true);
                return;
              }
            } catch { /* ignore */ }
            resolve(false);
            return;
          }

          // Timeout
          if (attempts >= maxAttempts) {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;
            if (popup && !popup.closed) popup.close();
            setIsConnecting(false);
            resolve(false);
            return;
          }

          // Poll status
          try {
            const statusRes = await fetch(`/api/sites/${siteId}/google/status`);
            const statusData = await statusRes.json();
            if (statusData.connected) {
              if (pollRef.current) clearInterval(pollRef.current);
              pollRef.current = null;
              if (popup && !popup.closed) popup.close();
              setIsConnecting(false);
              queryClient.invalidateQueries({ queryKey: ["google-connection-status", siteId] });
              resolve(true);
            }
          } catch {
            // Ignore polling errors, will retry
          }
        }, 2000);
      });
    } catch (error) {
      setIsConnecting(false);
      throw error;
    }
  }, [siteId, queryClient]);

  return {
    // Status
    status: status ?? null,
    isLoadingStatus,
    refetchStatus,

    // OAuth
    startOAuth,
    isConnecting,

    // Properties
    properties: properties ?? null,
    isLoadingProperties,
    fetchProperties,

    // Save
    saveProperties: savePropertiesMutation.mutateAsync,
    isSaving: savePropertiesMutation.isPending,

    // Disconnect
    disconnect: disconnectMutation.mutateAsync,
    isDisconnecting: disconnectMutation.isPending,
  };
}
