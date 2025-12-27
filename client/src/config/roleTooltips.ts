export type RoleTooltip = {
  title: string;
  description: string;
  exampleOutcome?: string;
};

export const ROLE_TOOLTIPS: Record<string, RoleTooltip> = {
  mission_control: {
    title: "Mission Control",
    description: "Coordinates all crew members and orchestrates diagnostic runs across your site.",
    exampleOutcome: "Automated daily health checks and prioritized action items.",
  },
  competitive_intel: {
    title: "Competitive Intelligence",
    description: "Monitors competitors' rankings, content strategies, and market positioning.",
    exampleOutcome: "Early alerts when competitors outrank you on key terms.",
  },
  serp_tracking: {
    title: "SERP Tracking",
    description: "Tracks keyword rankings and explains why positions change over time.",
    exampleOutcome: "Weekly position reports with trend analysis.",
  },
  analytics_signals: {
    title: "Analytics & Signals",
    description: "Connects to GA4 and Search Console to monitor traffic, conversions, and user behavior.",
    exampleOutcome: "Real-time alerts when traffic drops unexpectedly.",
  },
  technical_seo: {
    title: "Technical SEO",
    description: "Audits crawlability, indexing, and technical health to ensure search engines can access your content.",
    exampleOutcome: "Automatic detection of broken links and redirect chains.",
  },
  performance_monitoring: {
    title: "Performance Monitoring",
    description: "Tracks Core Web Vitals (LCP, CLS, INP) to ensure fast, smooth user experiences.",
    exampleOutcome: "Page speed recommendations that improve rankings.",
  },
  content_decay: {
    title: "Content Decay",
    description: "Identifies pages losing traffic over time and prioritizes content refreshes.",
    exampleOutcome: "Monthly list of articles needing updates to recover rankings.",
  },
  content_strategy: {
    title: "Content Strategy",
    description: "Recommends topics to write and existing content to update based on search demand.",
    exampleOutcome: "Content briefs with keyword targets and competitor gaps.",
  },
  domain_authority: {
    title: "Domain Authority",
    description: "Tracks backlinks, domain authority score, and link profile quality.",
    exampleOutcome: "Alerts when you gain or lose high-value backlinks.",
  },
  ai_optimization: {
    title: "AI Optimization",
    description: "Ensures AI assistants can understand, trust, and recommend your content.",
    exampleOutcome: "AI discoverability score and llms.txt recommendations.",
  },
  paid_ads: {
    title: "Paid Ads",
    description: "Monitors Google Ads performance, spend efficiency, and conversion tracking.",
    exampleOutcome: "Campaign ROI reports with optimization suggestions.",
  },
  knowledge_base: {
    title: "Knowledge Base",
    description: "Aggregates insights from all crew members into searchable, actionable knowledge.",
    exampleOutcome: "Cross-agent pattern recognition and historical trend data.",
  },
};

export function getRoleTooltip(roleId: string): RoleTooltip | null {
  return ROLE_TOOLTIPS[roleId] || null;
}
