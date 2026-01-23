import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  FileText, 
  Zap, 
  Search,
  TrendingUp,
  Eye,
  RefreshCw,
  CheckCircle2,
  Clock,
  ArrowUpRight
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface ActivityItem {
  id: string;
  type: "content" | "technical" | "seo";
  action: string;
  description: string;
  timestamp: Date;
  link?: string;
}

const TYPE_CONFIG = {
  content: {
    icon: FileText,
    label: "Content",
    bgColor: "bg-purple-soft",
    textColor: "text-purple",
    borderColor: "border-purple-border",
  },
  technical: {
    icon: Zap,
    label: "Technical",
    bgColor: "bg-gold-soft",
    textColor: "text-gold",
    borderColor: "border-gold-border",
  },
  seo: {
    icon: Search,
    label: "SEO",
    bgColor: "bg-pink-100",
    textColor: "text-pink-600",
    borderColor: "border-pink-200",
  },
};

const SAMPLE_ACTIVITIES: ActivityItem[] = [
  {
    id: "1",
    type: "content",
    action: "Published new service page",
    description: "Water Heater Repair",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
  },
  {
    id: "2",
    type: "technical",
    action: "Improved page speed",
    description: "Mobile load time reduced by 1.2s on /services",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 8),
  },
  {
    id: "3",
    type: "seo",
    action: "Updated page titles",
    description: "Emergency Plumber in Austin - optimized for local search",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
  },
  {
    id: "4",
    type: "content",
    action: "Published new article",
    description: "How to prevent pipe leaks in winter",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48),
  },
  {
    id: "5",
    type: "technical",
    action: "Fixed broken links",
    description: "Resolved 3 broken internal links on blog pages",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72),
  },
];

interface KPITileProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: React.ElementType;
}

function KPITile({ label, value, change, changeType = "neutral", icon: Icon }: KPITileProps) {
  const changeColors = {
    positive: "text-success",
    negative: "text-danger",
    neutral: "text-muted-foreground",
  };

  return (
    <div className="flex items-center gap-3 p-4 bg-muted rounded-lg border border-border">
      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-soft via-pink-100 to-gold-soft flex items-center justify-center">
        <Icon className="w-5 h-5 text-purple" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground truncate">{label}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-semibold text-foreground">{value}</span>
          {change && (
            <span className={`text-sm font-medium ${changeColors[changeType]}`}>
              {change}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

interface ActivityLogProps {
  activities?: ActivityItem[];
  showKPIs?: boolean;
}

export function ActivityLog({ activities = SAMPLE_ACTIVITIES, showKPIs = true }: ActivityLogProps) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-purple" />
            Activity Log
          </CardTitle>
          <span className="text-xs text-muted-foreground/60">What Arclo has done</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {showKPIs && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <KPITile
              label="Google Visibility"
              value="2,450"
              change="+12%"
              changeType="positive"
              icon={TrendingUp}
            />
            <KPITile
              label="Website Traffic"
              value="842"
              change="+8%"
              changeType="positive"
              icon={Eye}
            />
            <KPITile
              label="Leads / Calls"
              value="24"
              change="+3"
              changeType="positive"
              icon={CheckCircle2}
            />
          </div>
        )}

        <div className="space-y-3">
          {activities.map((activity) => {
            const config = TYPE_CONFIG[activity.type];
            const Icon = config.icon;
            
            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors"
                data-testid={`activity-item-${activity.id}`}
              >
                <div className={`w-8 h-8 rounded-lg ${config.bgColor} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-4 h-4 ${config.textColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.bgColor} ${config.textColor}`}>
                      {config.label}
                    </span>
                    <span className="text-xs text-muted-foreground/60 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDistanceToNow(activity.timestamp, { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{activity.action}</p>
                  <p className="text-sm text-muted-foreground truncate">{activity.description}</p>
                </div>
                {activity.link && (
                  <button className="text-primary hover:text-purple p-1" data-testid={`activity-link-${activity.id}`}>
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-center pt-2">
          <button 
            className="text-sm text-primary hover:text-purple font-medium"
            data-testid="button-view-all-activity"
          >
            View all activity →
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
