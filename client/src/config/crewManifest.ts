import { Map, Binoculars, Wrench, Radio, Activity, Key, GitBranch, Radar, Bot, BookOpen, BarChart3, Search, FileText, Zap, Bell, Database, Globe, Shield, TrendingUp, Link2, Eye, PenTool, Megaphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type CrewMember = {
  service_id: string;
  nickname: string;
  role: string;
  color: string;
  icon: LucideIcon;
  blurb?: string;
  capabilities?: string[];
  dependencies?: string[];
  endpoints?: { method: string; path: string; auth: "none" | "api_key" }[];
};

export const CREW_MANIFEST: Record<string, CrewMember> = {
  orchestrator: {
    service_id: "orchestrator",
    nickname: "Herbert von Karajan",
    role: "Mission Control",
    color: "#4F46E5",
    icon: Radar,
    blurb: "Coordinates all services and manages the diagnostic pipeline.",
    capabilities: ["Job Scheduling", "Service Coordination", "Health Monitoring"],
    dependencies: [],
  },
  seo_kbase: {
    service_id: "seo_kbase",
    nickname: "Socrates",
    role: "Knowledge Base",
    color: "#22C55E",
    icon: Map,
    blurb: "Turns findings into durable knowledge and makes them searchable.",
    capabilities: ["Read Articles", "Write Articles", "Search"],
    dependencies: ["orchestrator"],
    endpoints: [
      { method: "GET", path: "/api/health", auth: "none" },
      { method: "GET", path: "/api/smoke-test", auth: "api_key" },
      { method: "POST", path: "/api/run", auth: "api_key" },
      { method: "POST", path: "/api/learnings/upsert", auth: "api_key" },
    ],
  },
  competitive_snapshot: {
    service_id: "competitive_snapshot",
    nickname: "Natasha",
    role: "Intelligence Operative",
    color: "#7F1D1D",
    icon: Eye,
    blurb: "Gathers competitive intelligence, SERP movements, and strategic gaps.",
    capabilities: ["Competitor Analysis", "SERP Recon", "Gap Detection"],
    dependencies: ["orchestrator"],
    endpoints: [
      { method: "GET", path: "/api/health", auth: "none" },
      { method: "GET", path: "/api/capabilities", auth: "api_key" },
      { method: "GET", path: "/api/auth/check", auth: "api_key" },
      { method: "POST", path: "/api/run", auth: "api_key" },
      { method: "GET", path: "/api/report/:report_id", auth: "api_key" },
    ],
  },
  crawl_render: {
    service_id: "crawl_render",
    nickname: "Scotty",
    role: "Systems Engineer",
    color: "#64748B",
    icon: Wrench,
    blurb: "Performs technical SEO audits and crawl diagnostics.",
    capabilities: ["Site Crawl", "Render Check", "Technical Audit"],
    dependencies: ["orchestrator"],
  },
  backlink_authority: {
    service_id: "backlink_authority",
    nickname: "Beacon",
    role: "Domain Authority",
    color: "#F59E0B",
    icon: Radio,
    blurb: "Tracks backlinks, domain authority, and link velocity.",
    capabilities: ["Link Tracking", "Authority Metrics", "Competitor Comparison"],
    dependencies: ["orchestrator"],
  },
  google_data_connector: {
    service_id: "google_data_connector",
    nickname: "Pulse",
    role: "Telemetry Officer",
    color: "#06B6D4",
    icon: Activity,
    blurb: "Fetches analytics and search console data from Google APIs.",
    capabilities: ["GA4 Data", "GSC Data", "Traffic Metrics"],
    dependencies: ["orchestrator"],
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
    role: "SERP Analyst",
    color: "#EC4899",
    icon: Search,
    blurb: "Tracks keyword rankings and SERP features over time.",
    capabilities: ["Rank Tracking", "SERP Snapshots", "Position Monitoring"],
    dependencies: ["orchestrator"],
  },
  core_web_vitals: {
    service_id: "core_web_vitals",
    nickname: "Speedster",
    role: "Performance Monitor",
    color: "#10B981",
    icon: Zap,
    blurb: "Monitors Core Web Vitals and page speed metrics.",
    capabilities: ["LCP Tracking", "CLS Tracking", "INP Tracking"],
    dependencies: ["orchestrator"],
  },
  content_decay: {
    service_id: "content_decay",
    nickname: "Sentinel",
    role: "Content Decay Monitor",
    color: "#6366F1",
    icon: FileText,
    blurb: "Identifies content losing traffic and prioritizes refreshes.",
    capabilities: ["Decay Detection", "Refresh Prioritization", "Trend Analysis"],
    dependencies: ["orchestrator", "google_data_connector"],
  },
  content_generator: {
    service_id: "content_generator",
    nickname: "Hemingway",
    role: "BlogWriter",
    color: "#1E3A8A",
    icon: PenTool,
    blurb: "Writes and validates content optimized for humans and search engines.",
    capabilities: ["Long-form Writing", "Rewrites", "Quality Scoring", "E-E-A-T Checks"],
    dependencies: ["orchestrator", "seo_kbase"],
  },
  google_ads_connector: {
    service_id: "google_ads_connector",
    nickname: "Draper",
    role: "Google Ads",
    color: "#EC4899",
    icon: Megaphone,
    blurb: "Designs campaigns, messaging, and experiments that drive acquisition and conversion.",
    capabilities: ["Ad Strategy", "Copy Testing", "Conversion Optimization"],
    dependencies: ["orchestrator"],
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
    role: "Historian",
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
    capabilities: ["Gap Analysis", "Coverage Mapping", "Priority Scoring"],
    dependencies: ["orchestrator", "competitive_snapshot"],
  },
};

export function getCrewMember(serviceId: string): CrewMember {
  if (CREW_MANIFEST[serviceId]) {
    return CREW_MANIFEST[serviceId];
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
