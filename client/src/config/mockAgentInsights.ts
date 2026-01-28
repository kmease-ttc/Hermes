import type { AgentFinding, AgentNextStep } from "@shared/agentInsight";

export interface MockAgentData {
  score: number;
  findings: AgentFinding[];
  nextSteps: AgentNextStep[];
}

export const MOCK_AGENT_INSIGHTS: Record<string, MockAgentData> = {
  seo_kbase: {
    score: 85,
    findings: [
      { label: "Total learnings stored", value: 47 },
      { label: "Unique topics covered", value: 12 },
      { label: "Last learning added", value: "2 days ago" },
    ],
    nextSteps: [
      { step: 1, action: "Review new competitor insights from Natasha" },
      { step: 2, action: "Update content guidelines based on recent findings" },
      { step: 3, action: "Export knowledge base for team review" },
    ],
  },
  competitive_snapshot: {
    score: 80,
    findings: [
      { label: "Competitors tracked", value: 5 },
      { label: "Ranking gaps identified", value: 23 },
      { label: "New competitor content", value: "8 posts this week" },
    ],
    nextSteps: [
      { step: 1, action: "Create content for top 3 gap keywords" },
      { step: 2, action: "Monitor competitor's new service pages" },
      { step: 3, action: "Update strategy based on SERP changes" },
    ],
  },
  crawl_render: {
    score: 15,
    findings: [
      { label: "URLs blocked by robots.txt", value: 14 },
      { label: "Pages failing JS render", value: 3 },
      { label: "Orphaned high-value pages", value: 2 },
    ],
    nextSteps: [
      { step: 1, action: "Unblock /psychiatrist-orlando and /telepsychiatry" },
      { step: 2, action: "Fix JS rendering on blog templates" },
      { step: 3, action: "Add internal links to orphaned pages" },
    ],
  },
  backlink_authority: {
    score: 86,
    findings: [
      { label: "Domain Authority", value: "28 (+2 this month)" },
      { label: "New backlinks (7 days)", value: 5 },
      { label: "Low-quality links detected", value: 2 },
    ],
    nextSteps: [
      { step: 1, action: "Disavow 2 low-quality referring domains" },
      { step: 2, action: "Acquire 2 local healthcare backlinks" },
      { step: 3, action: "Monitor competitor link growth weekly" },
    ],
  },
  google_data_connector: {
    score: 72,
    findings: [
      { label: "Sessions (7 days)", value: "2,847" },
      { label: "Conversions", value: 34 },
      { label: "Top landing page", value: "/services" },
    ],
    nextSteps: [
      { step: 1, action: "Investigate traffic drop on blog pages" },
      { step: 2, action: "Optimize high-bounce landing pages" },
      { step: 3, action: "Set up conversion tracking for new forms" },
    ],
  },
  serp_intel: {
    score: 68,
    findings: [
      { label: "Priority keywords tracked", value: 48 },
      { label: "Keywords in Top 10", value: 12 },
      { label: "Striking-distance (pos 11–20)", value: 9 },
    ],
    nextSteps: [
      { step: 1, action: "Push 9 striking-distance keywords to page 1" },
      { step: 2, action: "Investigate 3 core terms losing position to competitors" },
      { step: 3, action: "Resolve cannibalization on 2 keywords mapped to multiple pages" },
    ],
  },
  core_web_vitals: {
    score: 78,
    findings: [
      { label: "LCP", value: "2.4s (Good)" },
      { label: "CLS", value: "0.08 (Good)" },
      { label: "INP", value: "180ms (Needs Work)" },
    ],
    nextSteps: [
      { step: 1, action: "Optimize INP on interactive pages" },
      { step: 2, action: "Compress hero images on landing pages" },
      { step: 3, action: "Enable lazy loading for below-fold content" },
    ],
  },
  content_decay: {
    score: 42,
    findings: [
      { label: "Pages losing traffic", value: 8 },
      { label: "High-priority refreshes", value: 3 },
      { label: "Avg traffic decline", value: "-23%" },
    ],
    nextSteps: [
      { step: 1, action: "Refresh top 3 decaying blog posts" },
      { step: 2, action: "Update outdated statistics and sources" },
      { step: 3, action: "Add new sections to thin content pages" },
    ],
  },
  content_generator: {
    score: 55,
    findings: [
      { label: "Total blog posts", value: 18 },
      { label: "Ranking on page 1", value: 6 },
      { label: "Days since last post", value: 21 },
    ],
    nextSteps: [
      { step: 1, action: "Publish blog targeting 'Telepsychiatry Florida'" },
      { step: 2, action: "Refresh 2 posts ranking positions 6-10" },
      { step: 3, action: "Add internal links from service pages to blogs" },
    ],
  },
  google_ads_connector: {
    score: 74,
    findings: [
      { label: "Monthly spend", value: "$2,450" },
      { label: "Conversions", value: 67 },
      { label: "Cost per conversion", value: "$36.57" },
    ],
    nextSteps: [
      { step: 1, action: "Pause underperforming ad groups" },
      { step: 2, action: "Increase budget on high-converting campaigns" },
      { step: 3, action: "Test new ad copy variations" },
    ],
  },
};

export function getMockAgentData(serviceId: string): MockAgentData | null {
  return MOCK_AGENT_INSIGHTS[serviceId] || null;
}
