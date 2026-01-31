// ============================================================
// Dashboard Insights Transformer
// Derives actionable tips from cached worker / dashboard data.
// Pure functions — no DB access, no side effects.
// ============================================================

// ── Types ────────────────────────────────────────────────────

export type TipCategory =
  | "rankings"
  | "traffic"
  | "content"
  | "technical"
  | "system"
  | "win";

export type TipSentiment = "positive" | "neutral" | "action";

export interface DashboardTip {
  id: string;
  title: string;
  body: string;
  category: TipCategory;
  priority: number; // 0-100
  sentiment: TipSentiment;
  actionLabel?: string;
  actionRoute?: string;
}

export interface MetricSlice {
  value: number | null;
  change7d: number | null;
}

export interface InsightsInput {
  metrics: {
    ga4Connected: boolean;
    gscConnected: boolean;
    bounceRate: MetricSlice;
    conversionRate: MetricSlice;
    organicCtr: MetricSlice;
    avgSessionDuration: MetricSlice;
  };
  serp: {
    totalTracked: number;
    hasBaseline: boolean;
    rankingCounts: {
      position1: number;
      top3: number;
      top10: number;
      top100: number;
    };
    weekOverWeek: {
      netChange: number;
      gained: number;
      lost: number;
      improved: number;
      declined: number;
    };
  };
  content: {
    upcomingCount: number;
    recentlyPublishedCount: number;
    staleDraftCount: number;
  };
  changes: {
    recentCount: number;
    hasSuccessfulActions: boolean;
  };
  suggestions: {
    highSeverityCount: number;
    categories: string[];
  };
}

// ── Tip generators ───────────────────────────────────────────

type TipGenerator = (input: InsightsInput) => DashboardTip | null;

function noTracking(input: InsightsInput): DashboardTip | null {
  if (input.serp.totalTracked > 0) return null;
  return {
    id: "no-tracking",
    title: "No keywords tracked yet",
    body: "Add keywords so Arclo can monitor your rankings, spot opportunities, and measure progress.",
    category: "system",
    priority: 95,
    sentiment: "action",
    actionLabel: "Add keywords",
    actionRoute: "/app/keywords",
  };
}

function connectGa4(input: InsightsInput): DashboardTip | null {
  if (input.metrics.ga4Connected) return null;
  return {
    id: "connect-ga4",
    title: "Connect Analytics for deeper insights",
    body: "Google Analytics helps Arclo understand which pages drive real visitors and conversions, not just rankings.",
    category: "system",
    priority: 92,
    sentiment: "action",
    actionLabel: "Connect",
    actionRoute: "/app/settings/integrations",
  };
}

function connectGsc(input: InsightsInput): DashboardTip | null {
  if (input.metrics.gscConnected) return null;
  return {
    id: "connect-gsc",
    title: "Connect Search Console",
    body: "See how Google crawls and indexes your site, plus real impression and click data.",
    category: "system",
    priority: 91,
    sentiment: "action",
    actionLabel: "Connect",
    actionRoute: "/app/settings/integrations",
  };
}

function rankingsDeclining(input: InsightsInput): DashboardTip | null {
  const { weekOverWeek } = input.serp;
  if (weekOverWeek.netChange >= -3 || weekOverWeek.declined <= weekOverWeek.improved) return null;
  return {
    id: "rankings-declining",
    title: "Some rankings slipped this week",
    body: `${weekOverWeek.declined} keywords declined with a net loss of ${Math.abs(weekOverWeek.netChange)} positions. Review your keyword list for anything that needs attention.`,
    category: "rankings",
    priority: 90,
    sentiment: "action",
    actionLabel: "View keywords",
    actionRoute: "/app/keywords",
  };
}

function highSevSuggestions(input: InsightsInput): DashboardTip | null {
  if (input.suggestions.highSeverityCount < 2) return null;
  return {
    id: "high-sev-suggestions",
    title: "Urgent SEO findings to review",
    body: `There are ${input.suggestions.highSeverityCount} high-priority issues that could be affecting your visibility. Addressing them can improve rankings.`,
    category: "technical",
    priority: 88,
    sentiment: "action",
    actionLabel: "Review findings",
    actionRoute: "/app/audit",
  };
}

function rankingsImproving(input: InsightsInput): DashboardTip | null {
  const { weekOverWeek } = input.serp;
  if (weekOverWeek.netChange <= 0 || weekOverWeek.improved < 3) return null;
  return {
    id: "rankings-improving",
    title: "Your rankings are climbing",
    body: `${weekOverWeek.improved} keywords improved this week with a net gain of ${weekOverWeek.netChange} positions. Keep the momentum going.`,
    category: "rankings",
    priority: 85,
    sentiment: "positive",
  };
}

function conversionUp(input: InsightsInput): DashboardTip | null {
  const { conversionRate } = input.metrics;
  if (conversionRate.change7d == null || conversionRate.change7d <= 10) return null;
  return {
    id: "conversion-up",
    title: "Conversions are trending up",
    body: `Your conversion rate increased ${conversionRate.change7d.toFixed(0)}% over the last week. Something is working well.`,
    category: "traffic",
    priority: 80,
    sentiment: "positive",
  };
}

function nearPageOne(input: InsightsInput): DashboardTip | null {
  const { top10, top100 } = input.serp.rankingCounts;
  const nearMiss = top100 - top10;
  if (nearMiss < 5) return null;
  return {
    id: "near-page-one",
    title: "Keywords knocking on page 1",
    body: `${nearMiss} keywords are ranking on pages 2-10. A small push on content or links could bring them to page 1.`,
    category: "rankings",
    priority: 75,
    sentiment: "action",
    actionLabel: "View opportunities",
    actionRoute: "/app/keywords",
  };
}

function bounceRateHigh(input: InsightsInput): DashboardTip | null {
  const { bounceRate } = input.metrics;
  if (bounceRate.value == null || bounceRate.value <= 65) return null;
  return {
    id: "bounce-rate-high",
    title: "Visitors are leaving quickly",
    body: `Your bounce rate is ${bounceRate.value.toFixed(0)}%. Improving page speed or content relevance can help keep visitors engaged.`,
    category: "traffic",
    priority: 70,
    sentiment: "action",
  };
}

function ctrLow(input: InsightsInput): DashboardTip | null {
  const { organicCtr } = input.metrics;
  if (organicCtr.value == null || organicCtr.value >= 0.02) return null;
  return {
    id: "ctr-low",
    title: "Click-through rate has room to grow",
    body: "Your organic CTR is below 2%. Better title tags and meta descriptions can help more searchers click through to your site.",
    category: "traffic",
    priority: 65,
    sentiment: "action",
  };
}

function bounceRateImproving(input: InsightsInput): DashboardTip | null {
  const { bounceRate } = input.metrics;
  if (bounceRate.change7d == null || bounceRate.change7d >= -5) return null;
  return {
    id: "bounce-rate-improving",
    title: "Bounce rate is dropping",
    body: `Bounce rate decreased ${Math.abs(bounceRate.change7d).toFixed(0)}% this week. Visitors are sticking around longer.`,
    category: "traffic",
    priority: 60,
    sentiment: "positive",
  };
}

function contentStale(input: InsightsInput): DashboardTip | null {
  if (input.content.staleDraftCount < 2) return null;
  return {
    id: "content-stale",
    title: "Some drafts need attention",
    body: `${input.content.staleDraftCount} content drafts have been sitting for a while. Publishing or updating them keeps your site fresh for search engines.`,
    category: "content",
    priority: 60,
    sentiment: "action",
    actionLabel: "View drafts",
    actionRoute: "/app/agents",
  };
}

function contentPublished(input: InsightsInput): DashboardTip | null {
  if (input.content.recentlyPublishedCount < 1) return null;
  return {
    id: "content-published",
    title: "Fresh content is live",
    body: `${input.content.recentlyPublishedCount} piece${input.content.recentlyPublishedCount > 1 ? "s" : ""} of content published recently. New content helps search engines see your site as active and relevant.`,
    category: "content",
    priority: 55,
    sentiment: "positive",
  };
}

function arcloWorking(input: InsightsInput): DashboardTip | null {
  if (input.changes.recentCount < 1 || !input.changes.hasSuccessfulActions) return null;
  return {
    id: "arclo-working",
    title: "Arclo made changes for you this week",
    body: `${input.changes.recentCount} action${input.changes.recentCount > 1 ? "s" : ""} executed successfully in the last 7 days. Check the changes log for details.`,
    category: "system",
    priority: 50,
    sentiment: "positive",
    actionLabel: "View changes",
    actionRoute: "/app/changes",
  };
}

function top3Wins(input: InsightsInput): DashboardTip | null {
  if (input.serp.rankingCounts.top3 < 3) return null;
  return {
    id: "top-3-wins",
    title: "You own top-3 for multiple keywords",
    body: `${input.serp.rankingCounts.top3} keywords are in positions 1-3. These are your strongest performers.`,
    category: "win",
    priority: 45,
    sentiment: "positive",
  };
}

// ── Generator registry ───────────────────────────────────────

const TIP_GENERATORS: TipGenerator[] = [
  noTracking,
  connectGa4,
  connectGsc,
  rankingsDeclining,
  highSevSuggestions,
  rankingsImproving,
  conversionUp,
  nearPageOne,
  bounceRateHigh,
  ctrLow,
  bounceRateImproving,
  contentStale,
  contentPublished,
  arcloWorking,
  top3Wins,
];

// ── Main export ──────────────────────────────────────────────

export function generateInsights(input: InsightsInput): DashboardTip[] {
  const tips: DashboardTip[] = [];

  for (const generator of TIP_GENERATORS) {
    const tip = generator(input);
    if (tip) tips.push(tip);
  }

  tips.sort((a, b) => b.priority - a.priority);
  return tips.slice(0, 5);
}
