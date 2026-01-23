import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, RefreshCw, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CREW, SERVICES, METRIC_KEYS, SERVICE_TO_CREW } from "../../../shared/registry";

type MetricsResponse = {
  siteId: string;
  collectedAt: string;
  metrics: Record<string, number | null>;
  coverage: {
    total: number;
    present: number;
    missing: string[];
    stale: string[];
  };
  sources: Record<string, string>;
};

export default function DevLineage() {
  const { data, isLoading, error, refetch } = useQuery<MetricsResponse>({
    queryKey: ["/api/metrics/latest"],
    refetchOnWindowFocus: false,
  });

  const crewMembers = Object.entries(CREW);
  const services = Object.entries(SERVICES);

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Crew → Services → Metrics Lineage</h1>
          </div>
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="bg-destructive/20 border border-destructive rounded-lg p-4 mb-8">
            <p className="text-destructive">Error loading metrics: {String(error)}</p>
          </div>
        )}

        {data && (
          <div className="mb-8 grid grid-cols-4 gap-4">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-semantic-success">{data.coverage.present}</div>
                <div className="text-sm text-muted-foreground">Metrics Present</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-gold">{data.coverage.missing.length}</div>
                <div className="text-sm text-muted-foreground">Metrics Missing</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-gold">{data.coverage.stale.length}</div>
                <div className="text-sm text-muted-foreground">Stale (&gt;24h)</div>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-info">{data.coverage.total}</div>
                <div className="text-sm text-muted-foreground">Total Canonical</div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="space-y-8">
          {crewMembers.map(([crewId, crew]) => (
            <Card key={crewId} className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                    style={{ backgroundColor: crew.color + '30', border: `2px solid ${crew.color}` }}
                  >
                    {crew.avatar}
                  </div>
                  <div>
                    <span className="text-xl">{crew.name}</span>
                    <span className="text-sm text-muted-foreground ml-2">({crewId})</span>
                  </div>
                  <Badge 
                    variant="outline" 
                    style={{ borderColor: crew.color, color: crew.color }}
                  >
                    {crew.role}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {crew.services.map((serviceId) => {
                    const service = SERVICES[serviceId];
                    if (!service) return null;
                    
                    const sourceTimestamp = data?.sources[serviceId];
                    const isStale = sourceTimestamp && 
                      (Date.now() - new Date(sourceTimestamp).getTime()) > 24 * 60 * 60 * 1000;
                    
                    return (
                      <div key={serviceId} className="border border-border rounded-lg p-4 ml-12">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{service.name}</span>
                            <span className="text-xs text-muted-foreground">{serviceId}</span>
                          </div>
                          {sourceTimestamp ? (
                            <Badge 
                              variant="outline" 
                              className={isStale ? 'border-gold text-gold' : 'border-semantic-success text-semantic-success'}
                            >
                              {isStale ? <Clock className="w-3 h-3 mr-1" /> : <CheckCircle className="w-3 h-3 mr-1" />}
                              {new Date(sourceTimestamp).toLocaleString()}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-muted-foreground text-muted-foreground">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              No data
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {service.metricsProduced.map((metricKey) => {
                            const value = data?.metrics[metricKey];
                            const hasValue = value !== undefined && value !== null;
                            const isThisStale = data?.coverage.stale.includes(metricKey);
                            const isMissing = data?.coverage.missing.includes(metricKey);
                            
                            return (
                              <div 
                                key={metricKey}
                                className={`p-2 rounded text-sm ${
                                  hasValue 
                                    ? isThisStale 
                                      ? 'bg-gold/20 border border-gold/50' 
                                      : 'bg-semantic-success/20 border border-semantic-success/50'
                                    : 'bg-secondary/50 border border-border'
                                }`}
                              >
                                <div className="flex items-center gap-1">
                                  {hasValue ? (
                                    <CheckCircle className="w-3 h-3 text-semantic-success" />
                                  ) : (
                                    <AlertCircle className="w-3 h-3 text-muted-foreground" />
                                  )}
                                  <code className="text-xs text-muted-foreground">{metricKey}</code>
                                </div>
                                <div className={`text-right font-mono ${hasValue ? 'text-foreground' : 'text-muted-foreground'}`}>
                                  {hasValue ? (
                                    typeof value === 'number' 
                                      ? value.toLocaleString(undefined, { maximumFractionDigits: 3 })
                                      : String(value)
                                  ) : '—'}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-xs text-muted-foreground">
          <p>Registry source: shared/registry.ts</p>
          <p>Metrics API: /api/metrics/latest</p>
          {data && <p>Site ID: {data.siteId} | Collected: {data.collectedAt}</p>}
        </div>
      </div>
    </div>
  );
}
