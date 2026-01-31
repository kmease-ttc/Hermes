import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Activity, DollarSign, Users } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface StatsProps {
  stats?: {
    organicTraffic: {
      total: number;
      trend: Array<{ date: string; value: number }>;
    };
    adsSpend: {
      total: number;
      trend: Array<{ date: string; value: number }>;
    };
    healthScore: number;
    webChecks: {
      total: number;
      passed: number;
    };
  };
}

export function SummaryStats({ stats }: StatsProps) {
  const organicData = stats?.organicTraffic?.trend || [];
  const adsData = stats?.adsSpend?.trend || [];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="hover-elevate transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Organic Traffic (7d)</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.organicTraffic?.total?.toLocaleString() || '0'}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Total sessions in last 7 days
          </p>
          {organicData.length > 0 && (
            <div className="h-[80px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={organicData.map(d => ({ value: d.value }))}>
                  <defs>
                    <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1} 
                    fill="url(#colorTraffic)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="hover-elevate transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Ads Spend (7d)</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">${stats?.adsSpend?.total?.toFixed(2) || '0.00'}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Total ad spend in last 7 days
          </p>
          {adsData.length > 0 && (
            <div className="h-[80px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={adsData.map(d => ({ value: d.value }))}>
                  <defs>
                    <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="hsl(var(--chart-2))" 
                    fillOpacity={1} 
                    fill="url(#colorSpend)" 
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="hover-elevate transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Health Score</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-chart-2">{stats?.healthScore || 0}/100</div>
          <p className="text-xs text-muted-foreground mt-1">
            {stats?.webChecks?.passed || 0} of {stats?.webChecks?.total || 0} pages passing
          </p>
          <div className="mt-4 space-y-2">
             <div className="flex items-center justify-between text-xs">
                <span>Site Checks</span>
                <span className={(stats?.healthScore ?? 0) >= 80 ? "text-semantic-success font-medium" : "text-semantic-warning font-medium"}>
                  {(stats?.healthScore ?? 0) >= 80 ? 'Pass' : 'Needs Attention'}
                </span>
             </div>
             <div className="w-full bg-muted rounded-full h-1.5">
                <div 
                  className={(stats?.healthScore ?? 0) >= 80 ? "bg-semantic-success h-1.5 rounded-full" : "bg-semantic-warning h-1.5 rounded-full"}
                  style={{ width: `${stats?.healthScore || 0}%` }}
                ></div>
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
