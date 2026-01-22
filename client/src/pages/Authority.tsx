import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Link2,
  FileText,
  Zap,
  Info,
  Users,
  ArrowUpDown,
  Crown
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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

interface AuthorityScore {
  overall: number;
  domainAuthority: number;
  pageAuthority: number;
  trustFlow: number;
  citationFlow: number;
  backlinks: number;
  referringDomains: number;
  organicKeywords: number;
  organicTraffic: number;
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

export default function Authority() {
  const { currentSite } = useSiteContext();
  const [selectedIndustry, setSelectedIndustry] = useState('healthcare');
  const [activeTab, setActiveTab] = useState('all');

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
    refetch: refetchCompetitors 
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
    enabled: activeTab === 'competitors',
  });

  const filteredBenchmarks = benchmarks?.filter(b => 
    activeTab === 'all' || b.category === activeTab
  ) || [];

  const categoryIcons = {
    authority: <Award className="w-4 h-4" />,
    performance: <BarChart3 className="w-4 h-4" />,
    content: <FileText className="w-4 h-4" />,
    technical: <Zap className="w-4 h-4" />,
  };

  return (
    <DashboardLayout className="dashboard-light">
      <div className="p-6 space-y-6" data-testid="page-authority">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Web Authority Score</h1>
            <p className="text-muted-foreground">
              Track your site's authority and compare to industry benchmarks
            </p>
          </div>
          <div className="flex items-center gap-2">
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
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => refetch()}
              data-testid="button-refresh-benchmarks"
            >
              <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {benchmarks && <OverallScoreCard benchmarks={benchmarks} />}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all" data-testid="tab-all">
              All Metrics
            </TabsTrigger>
            <TabsTrigger value="authority" data-testid="tab-authority">
              {categoryIcons.authority}
              <span className="ml-1">Authority</span>
            </TabsTrigger>
            <TabsTrigger value="performance" data-testid="tab-performance">
              {categoryIcons.performance}
              <span className="ml-1">Performance</span>
            </TabsTrigger>
            <TabsTrigger value="content" data-testid="tab-content">
              {categoryIcons.content}
              <span className="ml-1">Content</span>
            </TabsTrigger>
            <TabsTrigger value="technical" data-testid="tab-technical">
              {categoryIcons.technical}
              <span className="ml-1">Technical</span>
            </TabsTrigger>
            <TabsTrigger value="competitors" data-testid="tab-competitors">
              <Users className="w-4 h-4" />
              <span className="ml-1">Competitors</span>
            </TabsTrigger>
          </TabsList>

          {activeTab === 'competitors' ? (
            <TabsContent value="competitors" className="mt-4">
              <CompetitorsTable 
                competitors={competitorData} 
                isLoading={competitorsLoading} 
                error={competitorsError as Error | null}
              />
            </TabsContent>
          ) : (
          <TabsContent value={activeTab} className="mt-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-32 bg-muted rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredBenchmarks.map(benchmark => (
                  <BenchmarkCard key={benchmark.metric} benchmark={benchmark} />
                ))}
              </div>
            )}
          </TabsContent>
          )}
        </Tabs>

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
                .slice(0, 3)
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
      </div>
    </DashboardLayout>
  );
}
