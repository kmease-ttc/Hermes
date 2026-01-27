import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Award, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  ExternalLink, 
  RefreshCw,
  Target,
  BarChart3,
  Globe,
  FileText,
  Zap,
  Info,
  Users,
  ArrowUpDown,
  Crown,
  Radio
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useSiteContext } from "@/hooks/useSiteContext";
import { useCrewStatus } from "@/hooks/useCrewStatus";
import { toast } from "sonner";
import { getCrewMember } from "@/config/agents";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CrewDashboardShell,
  type CrewIdentity,
  type KpiDescriptor,
  type InspectorTab,
  type MissionPromptConfig,
  type HeaderAction,
} from "@/components/crew-dashboard";
import { KeyMetricsGrid } from "@/components/key-metrics";
import { CrewPageLayout } from "@/components/crew/CrewPageLayout";
import { Link2, Activity } from "lucide-react";

interface IndustryBenchmark {
  metric: string;
  label: string;
  description: string;
  yourValue: number;
  industryAvg: number;
  industryTop10: number;
  unit: string;
  higherIsBetter: boolean;
  category: 'authority' | 'performance' | 'content' | 'technical';
}

interface CompetitorMetrics {
  domain: string;
  isPrimary: boolean;
  webAuthorityScore: number;
  domainAuthority: number;
  totalBacklinks: number;
  referringDomains: number;
  organicKeywords: number;
  monthlyOrganicTraffic: number;
  averagePosition: number;
}

function generateMockCompetitorMetrics(domain: string, isPrimary: boolean, baseSeed: number): CompetitorMetrics {
  const seedMultiplier = isPrimary ? 1 : (0.6 + (baseSeed % 100) / 100 * 0.8);
  const baseAuthority = isPrimary ? 42 : 25 + (baseSeed % 40);
  
  return {
    domain,
    isPrimary,
    webAuthorityScore: Math.round(baseAuthority * seedMultiplier),
    domainAuthority: Math.round((isPrimary ? 42 : 20 + (baseSeed % 50)) * seedMultiplier),
    totalBacklinks: Math.round((isPrimary ? 2847 : 500 + (baseSeed * 47) % 5000) * seedMultiplier),
    referringDomains: Math.round((isPrimary ? 156 : 30 + (baseSeed * 13) % 300) * seedMultiplier),
    organicKeywords: Math.round((isPrimary ? 1250 : 200 + (baseSeed * 29) % 2500) * seedMultiplier),
    monthlyOrganicTraffic: Math.round((isPrimary ? 8500 : 1000 + (baseSeed * 83) % 15000) * seedMultiplier),
    averagePosition: parseFloat((isPrimary ? 12.4 : 8 + (baseSeed % 30)).toFixed(1)),
  };
}

const MOCK_COMPETITORS = [
  'clevelandclinic.org',
  'mayoclinic.org',
  'webmd.com',
  'healthline.com',
  'medlineplus.gov',
  'nih.gov',
  'hopkinsmedicine.org',
  'medicalnewstoday.com',
  'verywellhealth.com',
  'health.com',
];

const INDUSTRY_CATEGORIES = [
  { value: 'healthcare', label: 'Healthcare & Medical' },
  { value: 'ecommerce', label: 'E-commerce & Retail' },
  { value: 'saas', label: 'SaaS & Technology' },
  { value: 'finance', label: 'Finance & Banking' },
  { value: 'education', label: 'Education' },
  { value: 'realestate', label: 'Real Estate' },
  { value: 'legal', label: 'Legal Services' },
  { value: 'travel', label: 'Travel & Hospitality' },
];

const MOCK_BENCHMARKS: IndustryBenchmark[] = [
  {
    metric: 'domain_authority',
    label: 'Domain Authority',
    description: 'Overall authority score of your domain (0-100)',
    yourValue: 42,
    industryAvg: 35,
    industryTop10: 65,
    unit: '',
    higherIsBetter: true,
    category: 'authority',
  },
  {
    metric: 'backlinks',
    label: 'Total Backlinks',
    description: 'Number of external links pointing to your site',
    yourValue: 2847,
    industryAvg: 1500,
    industryTop10: 15000,
    unit: '',
    higherIsBetter: true,
    category: 'authority',
  },
  {
    metric: 'referring_domains',
    label: 'Referring Domains',
    description: 'Unique domains linking to your site',
    yourValue: 156,
    industryAvg: 120,
    industryTop10: 850,
    unit: '',
    higherIsBetter: true,
    category: 'authority',
  },
  {
    metric: 'organic_keywords',
    label: 'Organic Keywords',
    description: 'Keywords your site ranks for in search',
    yourValue: 1250,
    industryAvg: 800,
    industryTop10: 5000,
    unit: '',
    higherIsBetter: true,
    category: 'performance',
  },
  {
    metric: 'organic_traffic',
    label: 'Monthly Organic Traffic',
    description: 'Estimated monthly visitors from search',
    yourValue: 8500,
    industryAvg: 5000,
    industryTop10: 50000,
    unit: '',
    higherIsBetter: true,
    category: 'performance',
  },
  {
    metric: 'avg_position',
    label: 'Average Position',
    description: 'Average ranking position across all keywords',
    yourValue: 18.5,
    industryAvg: 25,
    industryTop10: 8,
    unit: '',
    higherIsBetter: false,
    category: 'performance',
  },
  {
    metric: 'page_speed',
    label: 'Page Speed Score',
    description: 'Core Web Vitals performance score',
    yourValue: 72,
    industryAvg: 55,
    industryTop10: 90,
    unit: '',
    higherIsBetter: true,
    category: 'technical',
  },
  {
    metric: 'mobile_score',
    label: 'Mobile Usability',
    description: 'Mobile-friendliness score',
    yourValue: 85,
    industryAvg: 70,
    industryTop10: 95,
    unit: '%',
    higherIsBetter: true,
    category: 'technical',
  },
  {
    metric: 'indexed_pages',
    label: 'Indexed Pages',
    description: 'Pages indexed by search engines',
    yourValue: 245,
    industryAvg: 150,
    industryTop10: 1000,
    unit: '',
    higherIsBetter: true,
    category: 'content',
  },
  {
    metric: 'content_freshness',
    label: 'Content Freshness',
    description: 'Percentage of content updated in last 90 days',
    yourValue: 35,
    industryAvg: 25,
    industryTop10: 60,
    unit: '%',
    higherIsBetter: true,
    category: 'content',
  },
];

function formatNumber(num: number): string {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toFixed(num % 1 === 0 ? 0 : 1);
}

function getComparisonStatus(benchmark: IndustryBenchmark): 'above' | 'below' | 'average' {
  const { yourValue, industryAvg, higherIsBetter } = benchmark;
  const diff = ((yourValue - industryAvg) / industryAvg) * 100;
  
  if (higherIsBetter) {
    if (diff > 10) return 'above';
    if (diff < -10) return 'below';
    return 'average';
  } else {
    if (diff < -10) return 'above';
    if (diff > 10) return 'below';
    return 'average';
  }
}

function getPercentileVsTop10(benchmark: IndustryBenchmark): number {
  const { yourValue, industryAvg, industryTop10, higherIsBetter } = benchmark;
  
  if (higherIsBetter) {
    if (yourValue >= industryTop10) return 100;
    if (yourValue <= industryAvg) return Math.max(0, (yourValue / industryAvg) * 50);
    return 50 + ((yourValue - industryAvg) / (industryTop10 - industryAvg)) * 50;
  } else {
    if (yourValue <= industryTop10) return 100;
    if (yourValue >= industryAvg) return Math.max(0, (industryAvg / yourValue) * 50);
    return 50 + ((industryAvg - yourValue) / (industryAvg - industryTop10)) * 50;
  }
}

function CompetitorsTable({ 
  competitors, 
  isLoading, 
  error 
}: { 
  competitors: CompetitorMetrics[] | undefined; 
  isLoading: boolean;
  error: Error | null;
}) {
  const [sortColumn, setSortColumn] = useState<keyof CompetitorMetrics>('webAuthorityScore');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (column: keyof CompetitorMetrics) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const sortedCompetitors = competitors ? [...competitors].sort((a, b) => {
    if (a.isPrimary) return -1;
    if (b.isPrimary) return 1;
    
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return 0;
  }) : [];

  if (error) {
    return (
      <Card className="border-semantic-danger-border bg-semantic-danger-soft">
        <CardContent className="p-6 text-center">
          <p className="text-semantic-danger">Failed to load competitor data. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const SortHeader = ({ column, label }: { column: keyof CompetitorMetrics; label: string }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => handleSort(column)}
      data-testid={`sort-${column}`}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={cn(
          "w-3 h-3",
          sortColumn === column ? "text-primary" : "text-muted-foreground"
        )} />
      </div>
    </TableHead>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="w-5 h-5" />
          Competitor Comparison
        </CardTitle>
        <CardDescription>
          See how your site stacks up against top competitors in search results
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[180px]">Domain</TableHead>
                <SortHeader column="webAuthorityScore" label="Authority" />
                <SortHeader column="domainAuthority" label="DA" />
                <SortHeader column="totalBacklinks" label="Backlinks" />
                <SortHeader column="referringDomains" label="Ref. Domains" />
                <SortHeader column="organicKeywords" label="Keywords" />
                <SortHeader column="monthlyOrganicTraffic" label="Traffic" />
                <SortHeader column="averagePosition" label="Avg Pos" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCompetitors.map((competitor, idx) => (
                <TableRow 
                  key={competitor.domain}
                  className={cn(
                    competitor.isPrimary && "bg-primary/5 border-l-2 border-l-primary"
                  )}
                  data-testid={`row-competitor-${idx}`}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {competitor.isPrimary && (
                        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                          <Crown className="w-3 h-3 mr-1" />
                          You
                        </Badge>
                      )}
                      <span className={cn(competitor.isPrimary && "font-semibold")}>
                        {competitor.domain}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-semibold",
                        competitor.isPrimary && "text-primary"
                      )}>
                        {competitor.webAuthorityScore}
                      </span>
                      <Progress 
                        value={competitor.webAuthorityScore} 
                        className="w-12 h-1.5"
                      />
                    </div>
                  </TableCell>
                  <TableCell>{competitor.domainAuthority}</TableCell>
                  <TableCell>{formatNumber(competitor.totalBacklinks)}</TableCell>
                  <TableCell>{formatNumber(competitor.referringDomains)}</TableCell>
                  <TableCell>{formatNumber(competitor.organicKeywords)}</TableCell>
                  <TableCell>{formatNumber(competitor.monthlyOrganicTraffic)}</TableCell>
                  <TableCell>
                    <span className={cn(
                      competitor.averagePosition <= 10 && "text-semantic-success",
                      competitor.averagePosition > 20 && "text-semantic-danger"
                    )}>
                      {competitor.averagePosition}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {sortedCompetitors.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            No competitor data available. Try refreshing or check your configuration.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function BenchmarkCard({ benchmark }: { benchmark: IndustryBenchmark }) {
  const status = getComparisonStatus(benchmark);
  const percentile = getPercentileVsTop10(benchmark);
  const diff = ((benchmark.yourValue - benchmark.industryAvg) / benchmark.industryAvg) * 100;
  const adjustedDiff = benchmark.higherIsBetter ? diff : -diff;

  return (
    <Card className="hover:shadow-md transition-shadow" data-testid={`card-benchmark-${benchmark.metric}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{benchmark.label}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3 h-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs">{benchmark.description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              status === 'above' && "bg-semantic-success-soft text-semantic-success border-semantic-success-border",
              status === 'below' && "bg-semantic-danger-soft text-semantic-danger border-semantic-danger-border",
              status === 'average' && "bg-semantic-warning-soft text-semantic-warning border-semantic-warning-border"
            )}
          >
            {status === 'above' && <TrendingUp className="w-3 h-3 mr-1" />}
            {status === 'below' && <TrendingDown className="w-3 h-3 mr-1" />}
            {status === 'average' && <Minus className="w-3 h-3 mr-1" />}
            {adjustedDiff > 0 ? '+' : ''}{adjustedDiff.toFixed(0)}%
          </Badge>
        </div>

        <div className="space-y-3">
          <div className="flex items-end gap-2">
            <span className="text-2xl font-bold">
              {formatNumber(benchmark.yourValue)}{benchmark.unit}
            </span>
            <span className="text-xs text-muted-foreground mb-1">Your Score</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>vs Industry</span>
              <span>Top 10%: {formatNumber(benchmark.industryTop10)}{benchmark.unit}</span>
            </div>
            <div className="relative">
              <Progress value={percentile} className="h-2" />
              <div 
                className="absolute top-0 h-2 w-0.5 bg-muted-foreground/50"
                style={{ left: '50%' }}
                title="Industry Average"
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Avg: {formatNumber(benchmark.industryAvg)}{benchmark.unit}</span>
              <span className="font-medium">{percentile.toFixed(0)}th percentile</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OverallScoreCard({ benchmarks }: { benchmarks: IndustryBenchmark[] }) {
  const aboveCount = benchmarks.filter(b => getComparisonStatus(b) === 'above').length;
  const belowCount = benchmarks.filter(b => getComparisonStatus(b) === 'below').length;
  const avgPercentile = benchmarks.reduce((acc, b) => acc + getPercentileVsTop10(b), 0) / benchmarks.length;

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          Overall Authority Score
        </CardTitle>
        <CardDescription>
          How your site compares to industry benchmarks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary">{avgPercentile.toFixed(0)}</div>
            <div className="text-xs text-muted-foreground">Percentile</div>
          </div>
          <div className="flex-1 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-xl font-semibold text-semantic-success">{aboveCount}</div>
              <div className="text-xs text-muted-foreground">Above Avg</div>
            </div>
            <div>
              <div className="text-xl font-semibold text-semantic-warning">{benchmarks.length - aboveCount - belowCount}</div>
              <div className="text-xs text-muted-foreground">On Par</div>
            </div>
            <div>
              <div className="text-xl font-semibold text-semantic-danger">{belowCount}</div>
              <div className="text-xs text-muted-foreground">Below Avg</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AuthorityContent() {
  const { currentSite } = useSiteContext();
  const siteId = currentSite?.siteId || "default";
  const { score: unifiedScore, isRefreshing: crewIsRefreshing, dataUpdatedAt: crewDataUpdatedAt } = useCrewStatus({ siteId, crewId: 'beacon' });
  const [selectedIndustry, setSelectedIndustry] = useState('healthcare');
  const [isAskingAuthority, setIsAskingAuthority] = useState(false);

  const handleAskAuthority = async (question: string) => {
    setIsAskingAuthority(true);
    try {
      const res = await fetch('/api/crew/authority/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: currentSite?.siteId || 'default', question }),
      });
      const data = await res.json();
      if (data.ok && data.answer) {
        toast.success(data.answer, { duration: 10000 });
      } else {
        toast.error(data.error || 'Failed to get answer from Authority');
      }
    } catch {
      toast.error('Failed to ask Authority');
    } finally {
      setIsAskingAuthority(false);
    }
  };

  const { data: benchmarks, isLoading, refetch } = useQuery({
    queryKey: ['authority-benchmarks', currentSite?.siteId, selectedIndustry],
    queryFn: async () => {
      return MOCK_BENCHMARKS.map(b => ({
        ...b,
        industryAvg: b.industryAvg * (0.9 + Math.random() * 0.2),
        industryTop10: b.industryTop10 * (0.9 + Math.random() * 0.2),
      }));
    },
  });

  const primaryDomain = currentSite?.domain || 'empathyhealthclinic.com';

  const { 
    data: competitorData, 
    isLoading: competitorsLoading, 
    error: competitorsError,
  } = useQuery({
    queryKey: ['competitor-metrics', primaryDomain],
    queryFn: async (): Promise<CompetitorMetrics[]> => {
      const primary = generateMockCompetitorMetrics(primaryDomain, true, 42);
      const competitors = MOCK_COMPETITORS.slice(0, 10).map((domain, idx) => 
        generateMockCompetitorMetrics(domain, false, idx * 17 + 7)
      );
      return [primary, ...competitors].sort((a, b) => 
        a.isPrimary ? -1 : b.isPrimary ? 1 : b.webAuthorityScore - a.webAuthorityScore
      );
    },
  });

  const filteredBenchmarks = benchmarks || [];

  const crewMember = getCrewMember("backlink_authority");

  const crew: CrewIdentity = {
    crewId: "backlink_authority",
    crewName: crewMember.nickname,
    subtitle: crewMember.role,
    description: crewMember.blurb || "Tracks backlinks, domain authority, and link velocity.",
    avatar: crewMember.avatar ? (
      <img src={crewMember.avatar} alt={crewMember.nickname} className="w-7 h-7 object-contain" />
    ) : (
      <Radio className="w-7 h-7 text-semantic-warning" />
    ),
    accentColor: crewMember.color,
    capabilities: crewMember.capabilities || ["Link Tracking", "Authority Metrics", "Competitor Comparison"],
    monitors: ["Domain Authority", "Backlinks", "Referring Domains"],
  };

  const avgPercentile = benchmarks ? benchmarks.reduce((acc, b) => acc + getPercentileVsTop10(b), 0) / benchmarks.length : null;

  const kpis: KpiDescriptor[] = useMemo(() => [
    {
      id: "authority",
      label: "Authority",
      value: benchmarks?.find(b => b.metric === 'domain_authority')?.yourValue.toString() || "—",
      tooltip: "Your domain authority score",
    },
    {
      id: "backlinks",
      label: "Backlinks",
      value: benchmarks?.find(b => b.metric === 'backlinks')?.yourValue.toLocaleString() || "—",
      tooltip: "Total backlinks pointing to your site",
    },
    {
      id: "ref-domains",
      label: "Ref. Domains",
      value: benchmarks?.find(b => b.metric === 'referring_domains')?.yourValue.toLocaleString() || "—",
      tooltip: "Unique domains linking to you",
    },
    {
      id: "percentile",
      label: "Percentile",
      value: avgPercentile ? `${avgPercentile.toFixed(0)}th` : "—",
      tooltip: "Your overall industry percentile",
    },
  ], [benchmarks, avgPercentile]);

  const keyMetrics = useMemo(() => {
    const domainAuth = benchmarks?.find(b => b.metric === 'domain_authority')?.yourValue ?? 0;
    const referringDomains = benchmarks?.find(b => b.metric === 'referring_domains')?.yourValue ?? 0;
    const totalBacklinks = benchmarks?.find(b => b.metric === 'backlinks')?.yourValue ?? 0;
    const organicTraffic = benchmarks?.find(b => b.metric === 'organic_traffic')?.yourValue ?? 0;
    const avgPosition = benchmarks?.find(b => b.metric === 'avg_position')?.yourValue ?? 0;

    const getAuthorityStatus = (val: number): "good" | "warning" | "neutral" => {
      if (val >= 50) return "good";
      if (val >= 30) return "neutral";
      return "warning";
    };

    const getDomainsStatus = (val: number): "good" | "warning" | "neutral" => {
      if (val >= 200) return "good";
      if (val >= 100) return "neutral";
      return "warning";
    };

    const getBacklinksStatus = (val: number): "good" | "warning" | "neutral" => {
      if (val >= 5000) return "good";
      if (val >= 1000) return "neutral";
      return "warning";
    };

    const getTrafficStatus = (val: number): "good" | "warning" | "neutral" => {
      if (val >= 10000) return "good";
      if (val >= 5000) return "neutral";
      return "warning";
    };

    const getPositionStatus = (val: number): "good" | "warning" | "neutral" => {
      if (val > 0 && val <= 10) return "good";
      if (val <= 20) return "neutral";
      return "warning";
    };

    return [
      {
        id: "web-authority",
        label: "Web Authority Score",
        value: domainAuth || "—",
        icon: Award,
        status: domainAuth ? getAuthorityStatus(domainAuth) : ("neutral" as const),
      },
      {
        id: "referring-domains",
        label: "Referring Domains",
        value: referringDomains ? referringDomains.toLocaleString() : "—",
        icon: Link2,
        status: referringDomains ? getDomainsStatus(referringDomains) : ("neutral" as const),
      },
      {
        id: "total-backlinks",
        label: "Total Backlinks",
        value: totalBacklinks ? totalBacklinks.toLocaleString() : "—",
        icon: Globe,
        status: totalBacklinks ? getBacklinksStatus(totalBacklinks) : ("neutral" as const),
      },
      {
        id: "organic-traffic",
        label: "Organic Traffic",
        value: organicTraffic ? organicTraffic.toLocaleString() : "—",
        icon: Activity,
        status: organicTraffic ? getTrafficStatus(organicTraffic) : ("neutral" as const),
      },
      {
        id: "avg-position",
        label: "Avg Position",
        value: avgPosition ? avgPosition.toFixed(1) : "—",
        icon: Target,
        status: avgPosition ? getPositionStatus(avgPosition) : ("neutral" as const),
      },
    ];
  }, [benchmarks]);

  const inspectorTabs: InspectorTab[] = useMemo(() => [
    {
      id: "overview",
      label: "Overview",
      icon: <Award className="w-4 h-4" />,
      content: (
        <div className="space-y-4">
          {benchmarks ? (
            <OverallScoreCard benchmarks={benchmarks} />
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  Data not connected yet — configure integration to activate this crew.
                </p>
              </CardContent>
            </Card>
          )}
          <div className="flex items-center gap-2 mb-4">
            <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
              <SelectTrigger className="w-[200px]" data-testid="select-industry">
                <Globe className="w-4 h-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Select Industry" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRY_CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBenchmarks.map((benchmark) => (
              <BenchmarkCard key={benchmark.metric} benchmark={benchmark} />
            ))}
          </div>
        </div>
      ),
    },
    {
      id: "authority",
      label: "Authority",
      icon: <Award className="w-4 h-4" />,
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {benchmarks?.filter(b => b.category === 'authority').map((benchmark) => (
            <BenchmarkCard key={benchmark.metric} benchmark={benchmark} />
          ))}
        </div>
      ),
    },
    {
      id: "competitors",
      label: "Competitors",
      icon: <Users className="w-4 h-4" />,
      content: (
        <CompetitorsTable 
          competitors={competitorData} 
          isLoading={competitorsLoading} 
          error={competitorsError as Error | null}
        />
      ),
    },
    {
      id: "opportunities",
      label: "Opportunities",
      icon: <Target className="w-4 h-4" />,
      content: (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="w-5 h-5" />
              Improvement Opportunities
            </CardTitle>
            <CardDescription>
              Focus on these metrics to close the gap with top performers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {benchmarks
                ?.filter(b => getComparisonStatus(b) === 'below')
                .slice(0, 5)
                .map(benchmark => {
                  const gap = benchmark.higherIsBetter 
                    ? benchmark.industryTop10 - benchmark.yourValue
                    : benchmark.yourValue - benchmark.industryTop10;
                  
                  return (
                    <div 
                      key={benchmark.metric}
                      className="flex items-center justify-between p-3 bg-semantic-danger-soft rounded-lg border border-semantic-danger-border"
                    >
                      <div>
                        <p className="font-medium text-sm">{benchmark.label}</p>
                        <p className="text-xs text-muted-foreground">
                          Gap to top 10%: {formatNumber(Math.abs(gap))}{benchmark.unit}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="text-xs">
                        View Tips
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  );
                })}
              {(!benchmarks || benchmarks.filter(b => getComparisonStatus(b) === 'below').length === 0) && (
                <p className="text-center text-muted-foreground py-4">
                  Great job! You're performing above or at industry average across all metrics.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ),
    },
  ], [filteredBenchmarks, benchmarks, selectedIndustry, competitorData, competitorsLoading, competitorsError]);

  const missionPrompt: MissionPromptConfig = {
    label: "Ask Beacon",
    placeholder: "e.g., What are my weakest backlink areas? How do I compare to competitors?",
    onSubmit: handleAskAuthority,
    isLoading: isAskingAuthority,
  };

  const headerActions: HeaderAction[] = [
    {
      id: "refresh-benchmarks",
      icon: <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />,
      tooltip: "Refresh Benchmarks",
      onClick: () => refetch(),
      disabled: isLoading,
      loading: isLoading,
    },
  ];

  return (
    <CrewPageLayout crewId="beacon">
      <CrewDashboardShell
        crew={crew}
        agentScore={avgPercentile ? Math.round(avgPercentile) : null}
        agentScoreTooltip="Overall authority percentile vs industry"
        kpis={kpis}
        customMetrics={<KeyMetricsGrid metrics={keyMetrics} accentColor={crew.accentColor} />}
        inspectorTabs={inspectorTabs}
        missionPrompt={missionPrompt}
        headerActions={headerActions}
        onRefresh={() => refetch()}
        onSettings={() => toast.info("Settings coming soon")}
        isRefreshing={isLoading || crewIsRefreshing}
        dataUpdatedAt={crewDataUpdatedAt}
      />
    </CrewPageLayout>
  );
}
