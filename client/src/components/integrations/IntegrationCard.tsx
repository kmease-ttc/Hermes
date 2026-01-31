import { CheckCircle2, Settings, XCircle, Loader2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface IntegrationCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  isConnected: boolean;
  isLoading?: boolean;
  connectedDetail?: string;
  onConfigure: () => void;
  onDisconnect?: () => void;
}

export function IntegrationCard({
  title,
  description,
  icon: Icon,
  isConnected,
  isLoading,
  connectedDetail,
  onConfigure,
  onDisconnect,
}: IntegrationCardProps) {
  if (isLoading) {
    return (
      <Card className="border border-border">
        <CardContent className="py-6 flex items-center justify-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Checking connection...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border transition-colors ${isConnected ? "border-semantic-success/30 bg-semantic-success/[0.02]" : "border-border hover:border-primary/30"}`}>
      <CardContent className="py-5">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${isConnected ? "bg-semantic-success/10" : "bg-muted"}`}>
            <Icon className={`w-5 h-5 ${isConnected ? "text-semantic-success" : "text-muted-foreground"}`} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground">{title}</h3>
              {isConnected ? (
                <Badge variant="outline" className="bg-semantic-success-soft text-semantic-success border-semantic-success-border text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Connected
                </Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground border-border text-xs">
                  <XCircle className="w-3 h-3 mr-1" />
                  Not connected
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground mb-3">{description}</p>

            {isConnected && connectedDetail && (
              <p className="text-xs text-muted-foreground mb-3 font-mono bg-muted/50 rounded px-2 py-1 inline-block">
                {connectedDetail}
              </p>
            )}

            <div className="flex gap-2">
              {isConnected ? (
                <>
                  <Button variant="outline" size="sm" onClick={onConfigure}>
                    <Settings className="w-3.5 h-3.5 mr-1.5" />
                    Manage
                  </Button>
                  {onDisconnect && (
                    <Button variant="ghost" size="sm" onClick={onDisconnect} className="text-muted-foreground hover:text-semantic-danger">
                      Disconnect
                    </Button>
                  )}
                </>
              ) : (
                <Button variant="primary" size="sm" onClick={onConfigure}>
                  Connect
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
