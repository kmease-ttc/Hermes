import { Map, Binoculars, Wrench, Radio, Activity, Key, GitBranch, Radar, Bot, BookOpen, BarChart3, Search, FileText, Zap, Bell, Database, Globe, Shield, TrendingUp, Link2, Eye, PenTool, Megaphone, BrainCircuit } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import socratesAvatar from "@assets/generated_images/socrates_toga_transparent.png";
import pulseAvatar from "@assets/generated_images/pulse_friendly_robot_transparent.png";
import scottyAvatar from "@assets/generated_images/scotty_friendly_robot_transparent.png";
import lookoutAvatar from "@assets/generated_images/lookout_friendly_robot_transparent.png";
import beaconAvatar from "@assets/generated_images/beacon_friendly_robot_transparent.png";
import natashaAvatar from "@assets/generated_images/natasha_friendly_robot_transparent.png";
import hemingwayAvatar from "@assets/generated_images/hemingway_friendly_robot_transparent.png";
import blogwriterAvatar from "@assets/generated_images/blogwriter_friendly_robot_transparent.png";
import draperAvatar from "@assets/generated_images/socrates_friendly_robot_transparent.png";
import speedsterAvatar from "@assets/generated_images/speedster_friendly_robot_transparent.png";
import sentinelAvatar from "@assets/generated_images/sentinel_friendly_robot_transparent.png";
import majorTomAvatar from "@assets/generated_images/major_tom_commander_transparent.png";
import atlasAvatar from "@assets/generated_images/draper_friendly_robot_transparent.png";

export type CrewMember = {
  service_id: string;
  nickname: string;
  role: string;
  color: string;
  icon: LucideIcon;
  avatar?: string;
  blurb?: string;
  shortDescription?: string;
  pricePerMonth?: number;
  tooltipInfo?: {
    whatItDoes: string;
    outputs: string[];
  };
  capabilities?: string[];
  dependencies?: string[];
  endpoints?: { method: string; path: string; auth: "none" | "api_key" }[];
  userFacing?: boolean;
  watchDescription?: string;
  category?: "core" | "additional";
};

// ═══════════════════════════════════════════════════════════════════════════
// FINAL CREW MANIFEST - LOCKED (12 slots)
// These are the agents that appear on the ship as fillable role slots.
// Do not add or remove agents without redesigning the ship image.
// ═══════════════════════════════════════════════════════════════════════════
export const USER_FACING_AGENTS = [
  // COMMAND (1) - Always included
  // "orchestrator" is not in this list because it's always enabled (Major Tom)
  
  // INTELLIGENCE & VISIBILITY (3)
  "competitive_snapshot",  // Natasha - Competitive Intelligence
  "serp_intel",            // Lookout - SERP Tracking  
  "google_data_connector", // Popular - Analytics & Signals
  
  // ENGINEERING & PERFORMANCE (1) - Merged agent
  "technical_seo",         // Technical SEO - Unified technical health agent
  
  // CONTENT SYSTEMS (1)
  "content_generator",     // Hemingway - Content Strategy
  
  // AUTHORITY & TRUST (1)
  "backlink_authority",    // Beacon - Domain Authority
  
  // AI SYSTEMS (1)
  "ai_optimization",       // Atlas - AI Optimization
  
  // GROWTH (1)
  "google_ads_connector",  // Draper - Paid Ads
  
  // KNOWLEDGE & MEMORY (1)
  "seo_kbase",             // Socrates - Knowledge Base
];

export function isUserFacingAgent(serviceId: string): boolean {
  return USER_FACING_AGENTS.includes(serviceId);
}

export const AGENTS: Record<string, CrewMember> = {
  orchestrator: {
    service_id: "orchestrator",
    nickname: "Major Tom",
    role: "Mission Control",
    color: "#4F46E5",
    icon: Radar,
    avatar: majorTomAvatar,
    blurb: "Coordinates all services and manages the diagnostic pipeline.",
    capabilities: ["Job Scheduling", "Service Coordination", "Health Monitoring"],
    dependencies: [],
  },
  seo_kbase: {
    service_id: "seo_kbase",
    nickname: "Socrates",
    role: "Knowledge Base",
    color: "#84CC16",
    icon: Map,
    avatar: socratesAvatar,
    blurb: "Turns findings into durable knowledge and makes them searchable.",
    shortDescription: "Collects and summarizes learnings from all agents.",
    pricePerMonth: 29,
    tooltipInfo: {
      whatItDoes: "Aggregates insights from every agent into a searchable knowledge base. Helps you understand patterns and make data-driven decisions.",
      outputs: ["Consolidated insights", "Searchable learnings", "Cross-agent patterns"],
    },
    watchDescription: "SEO learnings and insights from all agents",
    capabilities: ["Read Articles", "Write Articles", "Search"],
    dependencies: ["orchestrator"],
    endpoints: [
      { method: "GET", path: "/api/health", auth: "none" },
      { method: "GET", path: "/api/smoke-test", auth: "api_key" },
      { method: "POST", path: "/api/run", auth: "api_key" },
      { method: "POST", path: "/api/learnings/upsert", auth: "api_key" },
    ],
    category: "additional",
  },
  competitive_snapshot: {
    service_id: "competitive_snapshot",
    nickname: "Natasha",
    role: "Competitive Intelligence",
    color: "#A855F7",
    icon: Eye,
    avatar: natashaAvatar,
    blurb: "Gathers competitive intelligence, SERP movements, and strategic gaps.",
    shortDescription: "Tracks competitors, content gaps, and market shifts.",
    pricePerMonth: 79,
    tooltipInfo: {
      whatItDoes: "Monitors your competitors' rankings, content strategies, and market positioning. Identifies opportunities where you can outperform them.",
      outputs: ["Competitor rankings", "Content gap analysis", "Market shift alerts"],
    },
    watchDescription: "Competitor rankings, content gaps, and market movements",
    capabilities: ["Competitor Analysis", "SERP Recon", "Gap Detection"],
    dependencies: ["orchestrator"],
    endpoints: [
      { method: "GET", path: "/api/health", auth: "none" },
      { method: "GET", path: "/api/capabilities", auth: "api_key" },
      { method: "GET", path: "/api/auth/check", auth: "api_key" },
      { method: "POST", path: "/api/run", auth: "api_key" },
      { method: "GET", path: "/api/report/:report_id", auth: "api_key" },
    ],
    category: "additional",
  },
  crawl_render: {
    service_id: "crawl_render",
    nickname: "Scotty",
    role: "Technical SEO",
    color: "#F97316",
    icon: Wrench,
    avatar: scottyAvatar,
    blurb: "Performs technical SEO audits and crawl diagnostics.",
    shortDescription: "Checks crawlability, rendering, and technical health.",
    pricePerMonth: 49,
    tooltipInfo: {
      whatItDoes: "Crawls your site like Google does, checking for indexing blockers, render issues, and technical SEO problems that hurt rankings.",
      outputs: ["Crawl errors", "Render issues", "Index blockers"],
    },
    watchDescription: "Crawlability, rendering, and index health",
    capabilities: ["Site Crawl", "Render Check", "Technical Audit"],
    dependencies: ["orchestrator"],
  },
  backlink_authority: {
    service_id: "backlink_authority",
    nickname: "Beacon",
    role: "Domain Authority",
    color: "#F59E0B",
    icon: Radio,
    avatar: beaconAvatar,
    blurb: "Tracks backlinks, domain authority, and link velocity.",
    shortDescription: "Monitors authority, backlinks, and link quality.",
    pricePerMonth: 59,
    tooltipInfo: {
      whatItDoes: "Tracks your domain authority score, new and lost backlinks, and link quality changes. Helps you build a stronger link profile.",
      outputs: ["Authority score", "New backlinks", "Link quality alerts"],
    },
    watchDescription: "Domain authority and link growth",
    capabilities: ["Link Tracking", "Authority Metrics", "Competitor Comparison"],
    dependencies: ["orchestrator"],
    category: "additional",
  },
  google_data_connector: {
    service_id: "google_data_connector",
    nickname: "Popular",
    role: "Analytics & Signals",
    color: "#14B8A6",
    icon: Activity,
    avatar: pulseAvatar,
    blurb: "Fetches analytics and search console data from Google APIs.",
    shortDescription: "Monitors traffic, conversions, and landing pages.",
    pricePerMonth: 39,
    tooltipInfo: {
      whatItDoes: "Connects to Google Analytics and Search Console to track sessions, conversions, bounce rates, and landing page performance in real-time.",
      outputs: ["Traffic trends", "Conversion rates", "Top landing pages"],
    },
    watchDescription: "Website traffic, conversions, and user behavior",
    capabilities: ["GA4 Data", "GSC Data", "Traffic Metrics"],
    dependencies: ["orchestrator"],
    category: "core",
  },
  vault: {
    service_id: "vault",
    nickname: "Vault",
    role: "Secrets Keeper",
    color: "#8B5CF6",
    icon: Key,
    blurb: "Manages API keys and credentials via Bitwarden.",
    capabilities: ["Secret Storage", "Key Rotation", "Access Control"],
    dependencies: [],
  },
  serp_intel: {
    service_id: "serp_intel",
    nickname: "Lookout",
    role: "SERP & Keyword Intelligence",
    color: "#EC4899",
    icon: Search,
    avatar: lookoutAvatar,
    blurb: "Maintains a prioritized view of which queries matter, how the site ranks for them, and how that's changing over time.",
    shortDescription: "Defines, tracks, and updates search visibility across the keywords that matter most — surfacing gains, losses, and stagnation so effort stays pointed at the right battles.",
    pricePerMonth: 49,
    tooltipInfo: {
      whatItDoes: "Establishes the priority keyword set, tracks ranking position and movement over time, detects gains and losses, identifies competitor displacement, and flags keywords where small improvements could unlock outsized gains. Operates at both keyword and page level to surface cannibalization, intent mismatch, and ranking-to-conversion gaps.",
      outputs: ["Priority keyword tracking (25–100)", "Position movement & volatility trends (7/30/90d)", "Competitor displacement alerts", "Page-keyword ownership map", "Striking-distance opportunities"],
    },
    watchDescription: "Priority keyword rankings, SERP position changes, and search visibility trends",
    capabilities: ["Priority Keyword Management", "Rank Tracking & Trends", "Competitor Displacement Detection", "Page-Keyword Mapping", "Cannibalization Detection", "Striking-Distance Identification"],
    dependencies: ["orchestrator"],
    category: "core",
  },
  core_web_vitals: {
    service_id: "core_web_vitals",
    nickname: "Speedster",
    role: "Performance Monitoring",
    color: "#10B981",
    icon: Zap,
    avatar: speedsterAvatar,
    blurb: "Monitors Core Web Vitals and page speed metrics.",
    shortDescription: "Monitors page speed and Core Web Vitals.",
    pricePerMonth: 29,
    tooltipInfo: {
      whatItDoes: "Tracks LCP, CLS, and INP scores to ensure your site loads fast and provides a smooth user experience that Google rewards.",
      outputs: ["Core Web Vitals scores", "Speed insights", "Performance trends"],
    },
    watchDescription: "Page load speed and Core Web Vitals scores",
    capabilities: ["LCP Tracking", "CLS Tracking", "INP Tracking"],
    dependencies: ["orchestrator"],
  },
  content_decay: {
    service_id: "content_decay",
    nickname: "Sentinel",
    role: "Content Decay Monitor",
    color: "#6366F1",
    icon: FileText,
    avatar: sentinelAvatar,
    blurb: "Identifies content losing traffic and prioritizes refreshes.",
    shortDescription: "Detects content losing traffic over time.",
    pricePerMonth: 39,
    tooltipInfo: {
      whatItDoes: "Analyzes content performance trends to identify pages losing traffic. Prioritizes which content needs refreshing to recover rankings.",
      outputs: ["Decay alerts", "Refresh priorities", "Traffic trends"],
    },
    watchDescription: "Content performance and traffic trends over time",
    capabilities: ["Decay Detection", "Refresh Prioritization", "Trend Analysis"],
    dependencies: ["orchestrator", "google_data_connector"],
  },
  content_generator: {
    service_id: "content_generator",
    nickname: "Hemingway",
    role: "Content Strategy",
    color: "#0EA5E9",
    icon: PenTool,
    avatar: hemingwayAvatar,
    blurb: "Writes and validates content optimized for humans and search engines.",
    shortDescription: "Recommends content topics and updates.",
    pricePerMonth: 99,
    tooltipInfo: {
      whatItDoes: "Identifies content opportunities based on rankings and gaps. Recommends topics to write and existing content to update for better performance.",
      outputs: ["Topic recommendations", "Content briefs", "Update priorities"],
    },
    watchDescription: "Blog cadence, quality, and topical coverage",
    capabilities: ["Long-form Writing", "Rewrites", "Quality Scoring", "E-E-A-T Checks"],
    dependencies: ["orchestrator", "seo_kbase"],
    category: "additional",
  },
  google_ads_connector: {
    service_id: "google_ads_connector",
    nickname: "Draper",
    role: "Paid Search Signal Monitor",
    color: "#FB7185",
    icon: Megaphone,
    avatar: draperAvatar,
    blurb: "Ingests and normalizes Google Ads data so Arclo can understand paid search activity alongside organic performance—without managing campaigns.",
    shortDescription: "Surfaces paid search signals to inform organic strategy.",
    pricePerMonth: 69,
    tooltipInfo: {
      whatItDoes: "Connects to Google Ads to ingest campaign, keyword, and spend data. Provides visibility into which keywords are being paid for, detects overlap with organic strategy, and helps interpret organic performance changes in light of paid activity.",
      outputs: ["Paid keyword overlap detection", "Spend & CPC trends", "High-intent keyword signals", "Paid vs. organic conflict alerts"],
    },
    watchDescription: "Paid search spend, keyword overlap, and demand signals",
    capabilities: ["Campaign Ingestion", "Keyword Overlap Detection", "Spend Tracking", "Demand Signal Extraction"],
    dependencies: ["orchestrator"],
    category: "additional",
  },
  notifications: {
    service_id: "notifications",
    nickname: "Herald",
    role: "Notifications",
    color: "#A855F7",
    icon: Bell,
    blurb: "Sends alerts via email and SMS.",
    capabilities: ["Email Alerts", "SMS Alerts"],
    dependencies: ["orchestrator"],
  },
  audit_log: {
    service_id: "audit_log",
    nickname: "Chronicle",
    role: "Audit Log",
    color: "#78716C",
    icon: Database,
    blurb: "Stores run history, health metrics, and change logs.",
    capabilities: ["Run Logging", "Health Tracking", "Change Audit"],
    dependencies: [],
  },
  site_executor: {
    service_id: "site_executor",
    nickname: "Deployer",
    role: "Change Agent",
    color: "#0EA5E9",
    icon: GitBranch,
    blurb: "Applies approved SEO changes via GitHub PRs.",
    capabilities: ["PR Creation", "Change Application", "Rollback"],
    dependencies: ["orchestrator"],
  },
  content_gap: {
    service_id: "content_gap",
    nickname: "Mapper",
    role: "Gap Analyst",
    color: "#D946EF",
    icon: TrendingUp,
    blurb: "Identifies content gaps compared to competitors.",
    watchDescription: "Content coverage vs. competitors",
    capabilities: ["Gap Analysis", "Coverage Mapping", "Priority Scoring"],
    dependencies: ["orchestrator", "competitive_snapshot"],
  },
  ai_optimization: {
    service_id: "ai_optimization",
    nickname: "Atlas",
    role: "AI Optimization",
    color: "#D946EF",
    icon: BrainCircuit,
    avatar: atlasAvatar,
    blurb: "Optimizes your site for AI assistants and LLM discovery.",
    shortDescription: "Improves AI discoverability and LLM-readiness.",
    pricePerMonth: 89,
    tooltipInfo: {
      whatItDoes: "Ensures AI assistants can understand, trust, and recommend your content. Generates llms.txt, structured data, and AI-friendly summaries.",
      outputs: ["AI discoverability score", "LLM-ready content", "Structured data"],
    },
    watchDescription: "AI assistant visibility and LLM discoverability",
    capabilities: ["llms.txt Generation", "Structured Data", "AI Summaries", "Entity Optimization"],
    dependencies: ["orchestrator", "seo_kbase", "crawl_render"],
    endpoints: [
      { method: "GET", path: "/api/atlas/health", auth: "none" },
      { method: "POST", path: "/api/atlas/run", auth: "api_key" },
      { method: "GET", path: "/api/atlas/outputs/latest", auth: "api_key" },
    ],
    category: "additional",
  },
  technical_seo: {
    service_id: "technical_seo",
    nickname: "Technical SEO",
    role: "Crawl & Indexing Monitor",
    color: "#F97316",
    icon: Wrench,
    avatar: scottyAvatar,
    blurb: "Ensures the site is crawlable, indexable, and structurally clear to search engines so ranking potential is never limited by hidden technical friction.",
    shortDescription: "Monitors crawlability, indexing, and technical structure.",
    pricePerMonth: 79,
    tooltipInfo: {
      whatItDoes: "Analyzes how search engines technically interact with the site. Detects crawl errors, indexability issues, canonical conflicts, sitemap gaps, and internal linking problems that suppress rankings or waste crawl equity.",
      outputs: ["Crawl error reports", "Indexability findings", "Canonical/duplicate conflicts", "Sitemap & robots.txt validation", "Internal link analysis"],
    },
    watchDescription: "Crawlability, indexing status, and technical structure",
    capabilities: ["Crawl Diagnostics", "Index Coverage", "Canonical Validation", "Sitemap Audit", "Robots.txt Check", "Internal Link Analysis"],
    dependencies: ["orchestrator", "google_data_connector"],
    category: "core",
  },
};

export function getCrewMember(serviceId: string): CrewMember {
  if (AGENTS[serviceId]) {
    return AGENTS[serviceId];
  }
  const titleCase = serviceId
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return {
    service_id: serviceId,
    nickname: titleCase,
    role: "Specialist",
    color: "#9CA3AF",
    icon: Bot,
    blurb: `Service: ${serviceId}`,
  };
}

export function getCrewColor(serviceId: string): string {
  return getCrewMember(serviceId).color;
}

export function getCrewNickname(serviceId: string): string {
  return getCrewMember(serviceId).nickname;
}
