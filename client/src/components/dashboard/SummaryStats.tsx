import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp, Activity, DollarSign, Users } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const data = [
  { day: "Mon", traffic: 4000, spend: 2400 },
  { day: "Tue", traffic: 3000, spend: 1398 },
  { day: "Wed", traffic: 2000, spend: 9800 },
  { day: "Thu", traffic: 2780, spend: 3908 },
  { day: "Fri", traffic: 1890, spend: 4800 },
  { day: "Sat", traffic: 2390, spend: 3800 },
  { day: "Sun", traffic: 3490, spend: 4300 },
];

export function SummaryStats() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="hover-elevate transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Organic Traffic (7d)</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">12,345</div>
          <p className="text-xs text-destructive flex items-center mt-1">
            <ArrowDown className="h-3 w-3 mr-1" />
            -4.5% from last week
          </p>
          <div className="h-[80px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorTraffic" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="traffic" 
                  stroke="hsl(var(--primary))" 
                  fillOpacity={1} 
                  fill="url(#colorTraffic)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="hover-elevate transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Ads Spend (7d)</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">$4,231</div>
          <p className="text-xs text-destructive flex items-center mt-1">
            <ArrowDown className="h-3 w-3 mr-1" />
            -12.3% Drop detected
          </p>
          <div className="h-[80px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <Area 
                  type="monotone" 
                  dataKey="spend" 
                  stroke="hsl(var(--destructive))" 
                  fillOpacity={1} 
                  fill="url(#colorSpend)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="hover-elevate transition-all duration-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Health Score</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-chart-3">82/100</div>
          <p className="text-xs text-muted-foreground mt-1">
            Needs Attention
          </p>
          <div className="mt-4 space-y-2">
             <div className="flex items-center justify-between text-xs">
                <span>Site Checks</span>
                <span className="text-green-600 font-medium">Pass</span>
             </div>
             <div className="w-full bg-muted rounded-full h-1.5">
                <div className="bg-green-500 h-1.5 rounded-full" style={{ width: '100%' }}></div>
             </div>
             
             <div className="flex items-center justify-between text-xs mt-2">
                <span>Core Web Vitals</span>
                <span className="text-orange-500 font-medium">Fair</span>
             </div>
             <div className="w-full bg-muted rounded-full h-1.5">
                <div className="bg-orange-400 h-1.5 rounded-full" style={{ width: '70%' }}></div>
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
