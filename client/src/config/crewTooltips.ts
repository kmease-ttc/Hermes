export type CrewTooltip = {
  name: string;
  role: string;
  shortDescription: string;
  handledSignals?: string[];
};

export const CREW_TOOLTIPS: Record<string, CrewTooltip> = {
  orchestrator: {
    name: "Major Tom",
    role: "Mission Control",
    shortDescription: "Coordinates all services and manages the diagnostic pipeline. Always on duty.",
    handledSignals: ["Job scheduling", "Service health", "Run coordination"],
  },
  competitive_snapshot: {
    name: "Natasha",
    role: "Competitive Intelligence",
    shortDescription: "Monitors competitors, identifies content gaps, and flags emerging threats.",
    handledSignals: ["Competitor rankings", "Content gaps", "Market shifts"],
  },
  serp_intel: {
    name: "Lookout",
    role: "SERP Tracking",
    shortDescription: "Tracks keyword positions daily and detects ranking changes before they become problems.",
    handledSignals: ["Position changes", "SERP features", "Ranking trends"],
  },
  google_data_connector: {
    name: "Popular",
    role: "Analytics & Signals",
    shortDescription: "Fetches real-time data from Google Analytics and Search Console.",
    handledSignals: ["Sessions", "Conversions", "Bounce rate", "CTR"],
  },
  crawl_render: {
    name: "Scotty",
    role: "Technical SEO",
    shortDescription: "Crawls your site like Google does, checking for indexing blockers and render issues.",
    handledSignals: ["Crawl errors", "Redirect chains", "robots.txt"],
  },
  core_web_vitals: {
    name: "Speedster",
    role: "Performance Monitoring",
    shortDescription: "Monitors page speed and Core Web Vitals to keep your site fast.",
    handledSignals: ["LCP", "CLS", "INP", "TTFB"],
  },
  content_decay: {
    name: "Sentinel",
    role: "Content Decay",
    shortDescription: "Watches for content losing traffic and recommends refresh priorities.",
    handledSignals: ["Traffic trends", "Decay alerts", "Refresh queue"],
  },
  content_generator: {
    name: "Hemingway",
    role: "Content Strategy",
    shortDescription: "Creates content briefs and identifies topics that will drive organic traffic.",
    handledSignals: ["Topic gaps", "Keyword opportunities", "Content quality"],
  },
  backlink_authority: {
    name: "Beacon",
    role: "Domain Authority",
    shortDescription: "Tracks your backlink profile and monitors authority growth.",
    handledSignals: ["New backlinks", "Lost links", "Authority score"],
  },
  ai_optimization: {
    name: "Atlas",
    role: "AI Optimization",
    shortDescription: "Optimizes your site for AI assistants and LLM discovery.",
    handledSignals: ["AI readiness", "Structured data", "llms.txt"],
  },
  google_ads_connector: {
    name: "Draper",
    role: "Paid Ads",
    shortDescription: "Monitors ad campaigns, spend efficiency, and conversion tracking.",
    handledSignals: ["Ad spend", "CPC", "Conversions", "ROAS"],
  },
  seo_kbase: {
    name: "Socrates",
    role: "Knowledge Base",
    shortDescription: "Stores insights from all agents and makes them searchable.",
    handledSignals: ["Learnings", "Patterns", "Historical data"],
  },
};

export function getCrewTooltip(crewId: string): CrewTooltip | null {
  return CREW_TOOLTIPS[crewId] || null;
}
