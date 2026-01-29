import { pgTable, text, serial, timestamp, jsonb, integer, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// OAuth Tokens Storage
export const oauthTokens = pgTable("oauth_tokens", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull(), // 'google_ads', 'ga4', 'gsc'
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: timestamp("expires_at").notNull(),
  scope: text("scope"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertOAuthTokenSchema = createInsertSchema(oauthTokens).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertOAuthToken = z.infer<typeof insertOAuthTokenSchema>;
export type OAuthToken = typeof oauthTokens.$inferSelect;

// Users for email/password authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name"),
  role: text("role").default("user").notNull(), // user, admin
  defaultWebsiteId: text("default_website_id"),
  plan: text("plan").default("free").notNull(), // free, core
  addons: jsonb("addons").$type<{
    content_growth?: boolean;
    competitive_intel?: boolean;
    authority_signals?: boolean;
  }>(),
  verifiedAt: timestamp("verified_at"), // null = unverified, timestamp = verified
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Verification and password reset tokens
export const verificationTokens = pgTable("verification_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(), // UUID token
  purpose: text("purpose").notNull(), // 'verify_email' | 'reset_password'
  expiresAt: timestamp("expires_at").notNull(),
  consumedAt: timestamp("consumed_at"), // null = unused, timestamp = used
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertVerificationTokenSchema = createInsertSchema(verificationTokens).omit({
  id: true,
  createdAt: true,
});
export type InsertVerificationToken = z.infer<typeof insertVerificationTokenSchema>;
export type VerificationToken = typeof verificationTokens.$inferSelect;

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Session object returned by /api/auth/session
export interface SessionUser {
  user_id: number;
  email: string;
  display_name: string | null;
  websites: string[];
  default_website_id: string | null;
  plan: string;
  addons: {
    content_growth: boolean;
    competitive_intel: boolean;
    authority_signals: boolean;
  };
}

// Scan Requests for marketing funnel
export const scanRequests = pgTable("scan_requests", {
  id: serial("id").primaryKey(),
  scanId: text("scan_id").notNull().unique(), // UUID for URL-safe identifier
  targetUrl: text("target_url").notNull(),
  normalizedUrl: text("normalized_url").notNull(), // https://domain.com format
  status: text("status").notNull().default("queued"), // queued, running, preview_ready, completed, failed
  email: text("email"), // Optional until signup
  previewFindings: jsonb("preview_findings"), // Limited findings shown before signup
  fullReport: jsonb("full_report"), // Complete report data
  scoreSummary: jsonb("score_summary"), // Overall scores
  geoScope: text("geo_scope"), // "local" | "national"
  geoLocation: jsonb("geo_location").$type<{ city?: string; state?: string; country?: string } | null>(), // Location for local scope
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertScanRequestSchema = createInsertSchema(scanRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertScanRequest = z.infer<typeof insertScanRequestSchema>;
export type ScanRequest = typeof scanRequests.$inferSelect;

// Report Shares for collaboration
export const reportShares = pgTable("report_shares", {
  id: serial("id").primaryKey(),
  scanId: text("scan_id").notNull(), // References scanRequests.scanId
  shareToken: text("share_token").notNull().unique(), // URL-safe unique token
  createdByEmail: text("created_by_email"), // Email of user who created the share
  title: text("title"), // Optional custom title for the share
  passwordHash: text("password_hash"), // Optional password protection (bcrypt hash)
  expiresAt: timestamp("expires_at"), // null = never expires
  allowedSections: jsonb("allowed_sections").$type<{
    technical?: boolean;
    content?: boolean;
    performance?: boolean;
    keywords?: boolean;
    competitors?: boolean;
    backlinks?: boolean;
  }>(), // Which sections to show
  viewCount: integer("view_count").default(0).notNull(),
  lastViewedAt: timestamp("last_viewed_at"),
  revokedAt: timestamp("revoked_at"), // null = active, timestamp = revoked
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReportShareSchema = createInsertSchema(reportShares).omit({
  id: true,
  viewCount: true,
  lastViewedAt: true,
  revokedAt: true,
  createdAt: true,
});
export type InsertReportShare = z.infer<typeof insertReportShareSchema>;
export type ReportShare = typeof reportShares.$inferSelect;

// GA4 Daily Snapshots
export const ga4Daily = pgTable("ga4_daily", {
  id: serial("id").primaryKey(),
  siteId: text("site_id").default("default"), // Multi-site support
  date: text("date").notNull(), // YYYY-MM-DD
  sessions: integer("sessions").notNull(),
  users: integer("users").notNull(),
  events: integer("events").notNull(),
  conversions: integer("conversions").notNull(),
  bounceRate: real("bounce_rate"), // percentage
  avgSessionDuration: real("avg_session_duration"), // seconds
  pagesPerSession: real("pages_per_session"),
  channel: text("channel"),
  landingPage: text("landing_page"),
  device: text("device"),
  geo: text("geo"),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGA4DailySchema = createInsertSchema(ga4Daily).omit({
  id: true,
  createdAt: true,
});
export type InsertGA4Daily = z.infer<typeof insertGA4DailySchema>;
export type GA4Daily = typeof ga4Daily.$inferSelect;

// Google Search Console Daily Snapshots
export const gscDaily = pgTable("gsc_daily", {
  id: serial("id").primaryKey(),
  siteId: text("site_id").default("default"), // Multi-site support
  date: text("date").notNull(), // YYYY-MM-DD
  clicks: integer("clicks").notNull(),
  impressions: integer("impressions").notNull(),
  ctr: real("ctr").notNull(),
  position: real("position").notNull(),
  query: text("query"),
  page: text("page"),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGSCDailySchema = createInsertSchema(gscDaily).omit({
  id: true,
  createdAt: true,
});
export type InsertGSCDaily = z.infer<typeof insertGSCDailySchema>;
export type GSCDaily = typeof gscDaily.$inferSelect;

// Google Ads Daily Snapshots
export const adsDaily = pgTable("ads_daily", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD
  spend: real("spend").notNull(),
  impressions: integer("impressions").notNull(),
  clicks: integer("clicks").notNull(),
  cpc: real("cpc").notNull(),
  campaignId: text("campaign_id"),
  campaignName: text("campaign_name"),
  campaignStatus: text("campaign_status"),
  disapprovals: integer("disapprovals").default(0),
  policyIssues: jsonb("policy_issues"),
  searchTerms: jsonb("search_terms"),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAdsDailySchema = createInsertSchema(adsDaily).omit({
  id: true,
  createdAt: true,
});
export type InsertAdsDaily = z.infer<typeof insertAdsDailySchema>;
export type AdsDaily = typeof adsDaily.$inferSelect;

// Website Health Checks Daily
export const webChecksDaily = pgTable("web_checks_daily", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD
  url: text("url").notNull(),
  statusCode: integer("status_code").notNull(),
  redirectUrl: text("redirect_url"),
  canonical: text("canonical"),
  metaRobots: text("meta_robots"),
  hasContent: boolean("has_content").notNull(),
  errorMessage: text("error_message"),
  rawData: jsonb("raw_data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWebChecksDailySchema = createInsertSchema(webChecksDaily).omit({
  id: true,
  createdAt: true,
});
export type InsertWebChecksDaily = z.infer<typeof insertWebChecksDailySchema>;
export type WebChecksDaily = typeof webChecksDaily.$inferSelect;

// Analysis Reports
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD
  reportType: text("report_type").notNull(), // 'daily', 'on_demand'
  summary: text("summary").notNull(),
  dropDates: jsonb("drop_dates"), // Array of detected drop dates
  rootCauses: jsonb("root_causes"), // Ranked list of hypotheses
  markdownReport: text("markdown_report").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
});
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

// Diagnostic Tickets
export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  ticketId: text("ticket_id").notNull().unique(), // e.g., "TICK-1024"
  runId: text("run_id"), // Link to run
  title: text("title").notNull(),
  owner: text("owner").notNull(), // 'SEO', 'DEV', 'ADS'
  priority: text("priority").notNull(), // 'P0', 'P1', 'P2', 'P3'
  status: text("status").notNull().default('open'), // 'open', 'dismissed', 'done'
  steps: jsonb("steps").notNull(), // Array of action steps
  expectedImpact: text("expected_impact").notNull(), // 'high', 'medium', 'low'
  impactEstimate: jsonb("impact_estimate"), // { affected_pages_count, recoverable_clicks_est }
  evidence: jsonb("evidence"), // Links and metrics
  hypothesisKey: text("hypothesis_key"), // Link to hypothesis
  reportId: integer("report_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertTicketSchema = createInsertSchema(tickets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type Ticket = typeof tickets.$inferSelect;

// Configuration
export const config = pgTable("config", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertConfigSchema = createInsertSchema(config).omit({
  id: true,
  updatedAt: true,
});
export type InsertConfig = z.infer<typeof insertConfigSchema>;
export type Config = typeof config.$inferSelect;

// Diagnostic Runs History
export const runs = pgTable("runs", {
  id: serial("id").primaryKey(),
  runId: text("run_id").notNull().unique(),
  runType: text("run_type").notNull(), // 'full', 'smoke', 'scheduled'
  status: text("status").notNull(), // 'running', 'completed', 'failed'
  startedAt: timestamp("started_at").notNull(),
  finishedAt: timestamp("finished_at"),
  summary: text("summary"),
  anomaliesDetected: integer("anomalies_detected").default(0),
  reportId: integer("report_id"),
  ticketCount: integer("ticket_count").default(0),
  errors: jsonb("errors"),
  sourceStatuses: jsonb("source_statuses"),
  primaryClassification: text("primary_classification"), // VISIBILITY_LOSS, CTR_LOSS, PAGE_CLUSTER_REGRESSION, TRACKING_OR_ATTRIBUTION_GAP, INCONCLUSIVE
  confidenceOverall: text("confidence_overall"), // high, medium, low
  deltas: jsonb("deltas"), // Computed deltas for this run
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRunSchema = createInsertSchema(runs).omit({
  id: true,
  createdAt: true,
});
export type InsertRun = z.infer<typeof insertRunSchema>;
export type Run = typeof runs.$inferSelect;

// GSC Page-level Daily Rollups
export const gscPageDaily = pgTable("gsc_page_daily", {
  id: serial("id").primaryKey(),
  runId: text("run_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  pagePath: text("page_path").notNull(),
  clicks: integer("clicks").notNull(),
  impressions: integer("impressions").notNull(),
  ctr: real("ctr").notNull(),
  position: real("position").notNull(),
  cluster: text("cluster"), // Computed page cluster
});

export const insertGscPageDailySchema = createInsertSchema(gscPageDaily).omit({
  id: true,
});
export type InsertGscPageDaily = z.infer<typeof insertGscPageDailySchema>;
export type GscPageDaily = typeof gscPageDaily.$inferSelect;

// GSC Query-level Daily Rollups
export const gscQueryDaily = pgTable("gsc_query_daily", {
  id: serial("id").primaryKey(),
  runId: text("run_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  query: text("query").notNull(),
  clicks: integer("clicks").notNull(),
  impressions: integer("impressions").notNull(),
  ctr: real("ctr").notNull(),
  position: real("position").notNull(),
});

export const insertGscQueryDailySchema = createInsertSchema(gscQueryDaily).omit({
  id: true,
});
export type InsertGscQueryDaily = z.infer<typeof insertGscQueryDailySchema>;
export type GscQueryDaily = typeof gscQueryDaily.$inferSelect;

// GA4 Landing Page Daily Rollups
export const ga4LandingDaily = pgTable("ga4_landing_daily", {
  id: serial("id").primaryKey(),
  runId: text("run_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  landingPath: text("landing_path").notNull(),
  sessions: integer("sessions").notNull(),
  users: integer("users").notNull(),
  engagedSessions: integer("engaged_sessions"),
  conversions: integer("conversions"),
  cluster: text("cluster"), // Computed page cluster
});

export const insertGa4LandingDailySchema = createInsertSchema(ga4LandingDaily).omit({
  id: true,
});
export type InsertGa4LandingDaily = z.infer<typeof insertGa4LandingDailySchema>;
export type Ga4LandingDaily = typeof ga4LandingDaily.$inferSelect;

// Anomalies detected per run
export const anomalies = pgTable("anomalies", {
  id: serial("id").primaryKey(),
  runId: text("run_id").notNull(),
  anomalyType: text("anomaly_type").notNull(), // traffic_drop, impressions_drop, ctr_drop, page_cluster_drop, tracking_gap
  startDate: text("start_date").notNull(),
  endDate: text("end_date"),
  metric: text("metric").notNull(),
  baselineValue: real("baseline_value").notNull(),
  observedValue: real("observed_value").notNull(),
  deltaPct: real("delta_pct").notNull(),
  zScore: real("z_score"),
  scope: jsonb("scope"), // e.g., { channel: "Organic Search", page_cluster: "/services/*" }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAnomalySchema = createInsertSchema(anomalies).omit({
  id: true,
  createdAt: true,
});
export type InsertAnomaly = z.infer<typeof insertAnomalySchema>;
export type Anomaly = typeof anomalies.$inferSelect;

// Hypotheses with evidence
export const hypotheses = pgTable("hypotheses", {
  id: serial("id").primaryKey(),
  runId: text("run_id").notNull(),
  rank: integer("rank").notNull(),
  hypothesisKey: text("hypothesis_key").notNull(), // ROBOTS_OR_NOINDEX, CANONICAL_MISMATCH, etc.
  confidence: text("confidence").notNull(), // high, medium, low
  summary: text("summary").notNull(),
  evidence: jsonb("evidence").notNull(), // Array of evidence blocks
  disconfirmedBy: jsonb("disconfirmed_by"), // Evidence that weakens it
  missingData: jsonb("missing_data"), // What would increase confidence
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertHypothesisSchema = createInsertSchema(hypotheses).omit({
  id: true,
  createdAt: true,
});
export type InsertHypothesis = z.infer<typeof insertHypothesisSchema>;
export type Hypothesis = typeof hypotheses.$inferSelect;

// SERP Keywords to Track
export const serpKeywords = pgTable("serp_keywords", {
  id: serial("id").primaryKey(),
  keyword: text("keyword").notNull().unique(),
  intent: text("intent"), // informational, transactional, local, urgent, insurance, medication
  priority: integer("priority").default(3), // 1-5 scale (5=highest lead value)
  priorityReason: text("priority_reason"), // AI-generated explanation for priority
  difficulty: integer("difficulty"), // 0-100 keyword difficulty score
  targetUrl: text("target_url"), // Expected landing page
  tags: text("tags").array(), // e.g., ["therapy", "local", "branded"]
  volume: integer("volume"), // Monthly search volume
  active: boolean("active").default(true),
  lastChecked: timestamp("last_checked"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSerpKeywordSchema = createInsertSchema(serpKeywords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastChecked: true,
});
export type InsertSerpKeyword = z.infer<typeof insertSerpKeywordSchema>;
export type SerpKeyword = typeof serpKeywords.$inferSelect;

// SERP Rankings History
export const serpRankings = pgTable("serp_rankings", {
  id: serial("id").primaryKey(),
  keywordId: integer("keyword_id").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  searchEngine: text("search_engine").default("google"),
  location: text("location").default("Orlando, Florida, United States"),
  device: text("device").default("desktop"),
  position: integer("position"), // null if not found in top 100
  url: text("url"), // Which URL is ranking
  change: integer("change"), // Change from previous check
  volume: integer("volume"), // Monthly search volume if available
  serpFeatures: jsonb("serp_features"), // e.g., { featured_snippet: false, local_pack: true }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSerpRankingSchema = createInsertSchema(serpRankings).omit({
  id: true,
  createdAt: true,
});
export type InsertSerpRanking = z.infer<typeof insertSerpRankingSchema>;
export type SerpRanking = typeof serpRankings.$inferSelect;

// Keyword Improvement Actions
export const keywordActions = pgTable("keyword_actions", {
  id: serial("id").primaryKey(),
  keywordId: integer("keyword_id"), // nullable for grouped actions
  actionType: text("action_type").notNull(), // create_page, improve_page, add_links, add_content, improve_intent, local_signals, optimize_speed, add_schema
  title: text("title").notNull(), // Human-readable action title
  description: text("description"), // Detailed description
  targetKeywords: text("target_keywords").array(), // Keywords affected by this action
  targetUrl: text("target_url"), // URL to improve or create
  impactScore: integer("impact_score").notNull().default(50), // 0-100
  effortScore: integer("effort_score").notNull().default(50), // 0-100 (lower = easier)
  status: text("status").notNull().default("pending"), // pending, queued, in_progress, completed, failed
  priority: integer("priority").default(50), // Calculated priority for display ordering
  reason: text("reason"), // Why this action is recommended
  metadata: jsonb("metadata"), // Additional action-specific data
  executedAt: timestamp("executed_at"),
  completedAt: timestamp("completed_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertKeywordActionSchema = createInsertSchema(keywordActions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  executedAt: true,
  completedAt: true,
});
export type InsertKeywordAction = z.infer<typeof insertKeywordActionSchema>;
export type KeywordAction = typeof keywordActions.$inferSelect;

// Sites Registry for Multi-Site Orchestration
export const sites = pgTable("sites", {
  id: serial("id").primaryKey(),
  siteId: text("site_id").notNull().unique(),
  displayName: text("display_name").notNull(),
  baseUrl: text("base_url").notNull(),
  category: text("category"), // clinic, seo_tool, property_mgmt, farm_shop, etc.
  techStack: text("tech_stack"), // nextjs, remix, react-static, wordpress, webflow, unknown
  repoProvider: text("repo_provider"), // github, replit, other
  repoIdentifier: text("repo_identifier"), // GitHub org/repo OR Replit project id
  deployMethod: text("deploy_method"), // replit_deploy, vercel, netlify, cloudflare_pages, manual
  crawlSettings: jsonb("crawl_settings"), // { crawl_depth_limit, max_pages, respect_robots, user_agent }
  sitemaps: text("sitemaps").array(), // Array of sitemap URLs
  keyPages: text("key_pages").array(), // login, pricing, contact, location pages
  integrations: jsonb("integrations"), // { ga4: { property_id }, gsc: { property }, google_ads: { customer_id }, clarity: { site_id } }
  guardrails: jsonb("guardrails"), // { allowed_edit_paths[], blocked_edit_paths[], max_files_changed_per_run, max_lines_changed_per_run, require_human_approval, auto_merge_categories[] }
  cadence: jsonb("cadence"), // { diagnose_frequency, auto_fix_frequency, content_frequency, quiet_hours }
  ownerName: text("owner_name"),
  ownerContact: text("owner_contact"), // Email or Slack
  healthScore: integer("health_score"), // 0-100
  lastDiagnosisAt: timestamp("last_diagnosis_at"),
  lastDeployAt: timestamp("last_deploy_at"),
  status: text("status").default("active"), // active, paused, onboarding
  active: boolean("active").default(true),
  geoScope: text("geo_scope"), // "local" | "national"
  geoLocation: jsonb("geo_location").$type<{ city?: string; state?: string; country?: string } | null>(), // Location for local scope
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSiteSchema = createInsertSchema(sites).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastDiagnosisAt: true,
  lastDeployAt: true,
});
export type InsertSite = z.infer<typeof insertSiteSchema>;
export type Site = typeof sites.$inferSelect;

// Site Crawl Runs
export const crawlRuns = pgTable("crawl_runs", {
  id: serial("id").primaryKey(),
  siteId: text("site_id").notNull(),
  runId: text("run_id").notNull().unique(),
  status: text("status").notNull(), // running, completed, failed
  pagesScanned: integer("pages_scanned").default(0),
  errorsFound: integer("errors_found").default(0),
  startedAt: timestamp("started_at").notNull(),
  finishedAt: timestamp("finished_at"),
  summary: jsonb("summary"), // Quick stats
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCrawlRunSchema = createInsertSchema(crawlRuns).omit({
  id: true,
  createdAt: true,
});
export type InsertCrawlRun = z.infer<typeof insertCrawlRunSchema>;
export type CrawlRun = typeof crawlRuns.$inferSelect;

// SEO Findings from Diagnostics
export const findings = pgTable("findings", {
  id: serial("id").primaryKey(),
  findingId: text("finding_id").notNull().unique(),
  siteId: text("site_id").notNull(),
  crawlRunId: text("crawl_run_id"),
  sourceIntegration: text("source_integration"), // seo_kbase, crawl_render, serp_intel, etc.
  runId: text("run_id"), // Links to serviceRuns.runId for traceability
  category: text("category").notNull(), // crawlability, indexation, content, performance, structured_data, internal_links, analytics, ads, security_headers, kbase
  severity: text("severity").notNull(), // critical, high, medium, low, info
  impactScore: integer("impact_score").default(50), // 0-100
  confidence: real("confidence").default(0.5), // 0-1
  title: text("title").notNull(),
  description: text("description"),
  evidence: jsonb("evidence"), // Array of { type, value }
  recommendedActions: text("recommended_actions").array(),
  status: text("status").default("open"), // open, accepted, fixed, ignored
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFindingSchema = createInsertSchema(findings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFinding = z.infer<typeof insertFindingSchema>;
export type Finding = typeof findings.$inferSelect;

// Knowledge Base Insights
export const kbInsights = pgTable("kb_insights", {
  id: serial("id").primaryKey(),
  insightId: text("insight_id").notNull().unique(),
  siteId: text("site_id").notNull(),
  title: text("title").notNull(),
  summary: text("summary"),
  tags: text("tags").array(),
  sources: jsonb("sources"), // [{ crewId: string, learningId: string }]
  synthesisRunId: text("synthesis_run_id"), // Links to the run that created this
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertKbInsightSchema = createInsertSchema(kbInsights).omit({
  id: true,
  createdAt: true,
});
export type InsertKbInsight = z.infer<typeof insertKbInsightSchema>;
export type KbInsight = typeof kbInsights.$inferSelect;

// Knowledge Base Recommendations
export const kbRecommendations = pgTable("kb_recommendations", {
  id: serial("id").primaryKey(),
  recommendationId: text("recommendation_id").notNull().unique(),
  siteId: text("site_id").notNull(),
  title: text("title").notNull(),
  rationale: text("rationale"),
  priority: text("priority").default("medium"), // high, medium, low
  effort: text("effort"), // small, medium, large
  actionType: text("action_type"), // content_update, tech_fix, ads_change
  sources: jsonb("sources"), // [{ crewId: string, learningId: string }]
  status: text("status").default("pending"), // pending, in_progress, done, dismissed
  synthesisRunId: text("synthesis_run_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertKbRecommendationSchema = createInsertSchema(kbRecommendations).omit({
  id: true,
  createdAt: true,
});
export type InsertKbRecommendation = z.infer<typeof insertKbRecommendationSchema>;
export type KbRecommendation = typeof kbRecommendations.$inferSelect;

// Fix Plans
export const plans = pgTable("plans", {
  id: serial("id").primaryKey(),
  planId: text("plan_id").notNull().unique(),
  siteId: text("site_id").notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  buckets: jsonb("buckets"), // { quick_wins: [], structural_fixes: [], content_opportunities: [], technical_debt: [] }
  status: text("status").default("draft"), // draft, approved, in_progress, completed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPlanSchema = createInsertSchema(plans).omit({
  id: true,
  createdAt: true,
});
export type InsertPlan = z.infer<typeof insertPlanSchema>;
export type Plan = typeof plans.$inferSelect;

// Generated Patches
export const patches = pgTable("patches", {
  id: serial("id").primaryKey(),
  patchId: text("patch_id").notNull().unique(),
  siteId: text("site_id").notNull(),
  planId: text("plan_id"),
  findingId: text("finding_id"),
  changes: jsonb("changes"), // Array of { file_path, diff_unified }
  rationale: text("rationale"),
  acceptanceCriteria: text("acceptance_criteria").array(),
  riskLevel: text("risk_level").default("low"), // low, medium, high
  status: text("status").default("queued"), // queued, applied, failed, deployed, rolled_back
  prUrl: text("pr_url"), // GitHub PR URL if using PR workflow
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPatchSchema = createInsertSchema(patches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertPatch = z.infer<typeof insertPatchSchema>;
export type Patch = typeof patches.$inferSelect;

// Deployments
export const deployments = pgTable("deployments", {
  id: serial("id").primaryKey(),
  deploymentId: text("deployment_id").notNull().unique(),
  siteId: text("site_id").notNull(),
  patchId: text("patch_id"),
  status: text("status").notNull(), // queued, deploying, success, failed, rolled_back
  deployedAt: timestamp("deployed_at"),
  rollbackAt: timestamp("rollback_at"),
  preDeployChecks: jsonb("pre_deploy_checks"), // { build_pass, lint_pass, seo_sanity }
  postDeployChecks: jsonb("post_deploy_checks"),
  logs: text("logs"),
  previousCommitSha: text("previous_commit_sha"),
  newCommitSha: text("new_commit_sha"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDeploymentSchema = createInsertSchema(deployments).omit({
  id: true,
  createdAt: true,
});
export type InsertDeployment = z.infer<typeof insertDeploymentSchema>;
export type Deployment = typeof deployments.$inferSelect;

// Audit Logs
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  siteId: text("site_id"),
  action: text("action").notNull(), // site_created, diagnosis_run, patch_applied, deploy_started, etc.
  actor: text("actor"), // system, user email, api
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// Site Integrations (Vault-backed credentials)
export const siteIntegrations = pgTable("site_integrations", {
  id: serial("id").primaryKey(),
  siteId: text("site_id").notNull(),
  integrationType: text("integration_type").notNull(), // ga4, gsc, google_ads, serp, clarity, crawler
  status: text("status").default("pending"), // connected, missing, error, pending
  vaultProvider: text("vault_provider"), // bitwarden, env, manual
  vaultItemId: text("vault_item_id"), // Bitwarden secret ID or item reference
  vaultCollectionId: text("vault_collection_id"),
  vaultOrgId: text("vault_org_id"),
  metaJson: jsonb("meta_json"), // Non-sensitive metadata (propertyId, customerId, etc.)
  lastCheckedAt: timestamp("last_checked_at"),
  lastError: text("last_error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSiteIntegrationSchema = createInsertSchema(siteIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSiteIntegration = z.infer<typeof insertSiteIntegrationSchema>;
export type SiteIntegration = typeof siteIntegrations.$inferSelect;

// Vault Configuration (Global)
export const vaultConfig = pgTable("vault_config", {
  id: serial("id").primaryKey(),
  provider: text("provider").notNull().default("bitwarden"), // bitwarden, hashicorp, aws_secrets
  orgId: text("org_id"),
  defaultCollectionId: text("default_collection_id"),
  status: text("status").default("disconnected"), // connected, disconnected, error
  lastHealthCheck: timestamp("last_health_check"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertVaultConfigSchema = createInsertSchema(vaultConfig).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertVaultConfig = z.infer<typeof insertVaultConfigSchema>;
export type VaultConfig = typeof vaultConfig.$inferSelect;

// Action Runs - Track fix executions for detected drops
export const actionRuns = pgTable("action_runs", {
  id: serial("id").primaryKey(),
  runId: text("run_id").notNull().unique(),
  siteId: text("site_id").notNull(),
  anomalyId: text("anomaly_id").notNull(), // Reference to the drop (date+source+metric)
  actionCode: text("action_code").notNull(), // e.g. CHECK_GSC_QUERY_LOSSES, UPDATE_META_TITLES
  status: text("status").notNull().default("queued"), // queued, running, completed, failed, needs_review
  planJson: jsonb("plan_json"), // { enrichmentSteps, implementationSteps, verificationSteps }
  outputJson: jsonb("output_json"), // { findings, changes, verification, nextSteps }
  errorText: text("error_text"),
  triggeredBy: text("triggered_by").default("user"), // user, scheduled, api
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertActionRunSchema = createInsertSchema(actionRuns).omit({
  id: true,
  createdAt: true,
});
export type InsertActionRun = z.infer<typeof insertActionRunSchema>;
export type ActionRun = typeof actionRuns.$inferSelect;

// Action Types enum for type safety
export const ActionCodes = {
  CHECK_GSC_QUERY_LOSSES: 'CHECK_GSC_QUERY_LOSSES',
  CHECK_INDEXATION_STATUS: 'CHECK_INDEXATION_STATUS',
  CHECK_RECENT_PAGE_CHANGES: 'CHECK_RECENT_PAGE_CHANGES',
  FETCH_PAGE_META: 'FETCH_PAGE_META',
  UPDATE_META_TITLES: 'UPDATE_META_TITLES',
  ADD_INTERNAL_LINKS: 'ADD_INTERNAL_LINKS',
  REQUEST_RECRAWL: 'REQUEST_RECRAWL',
  CHECK_SERP_RANKINGS: 'CHECK_SERP_RANKINGS',
} as const;

export type ActionCode = typeof ActionCodes[keyof typeof ActionCodes];

// Integration Categories
export const IntegrationCategories = {
  DATA: 'data',
  ANALYSIS: 'analysis',
  EXECUTION: 'execution',
  INFRASTRUCTURE: 'infrastructure',
} as const;

export type IntegrationCategory = typeof IntegrationCategories[keyof typeof IntegrationCategories];

// Integration Health Statuses
export const IntegrationStatuses = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
} as const;

export type IntegrationStatus = typeof IntegrationStatuses[keyof typeof IntegrationStatuses];

// Deployment Statuses for services
export const DeploymentStatuses = {
  NOT_BUILT: 'not_built',
  BUILDING: 'building',
  BUILT: 'built',
  DEPLOYING: 'deploying',
  DEPLOYED: 'deployed',
  FAILED: 'failed',
} as const;

export type DeploymentStatus = typeof DeploymentStatuses[keyof typeof DeploymentStatuses];

// Platform Integrations Registry - Global service definitions
export const integrations = pgTable("integrations", {
  id: serial("id").primaryKey(),
  integrationId: text("integration_id").notNull().unique(), // google_data_connector, crawl_render, serp_intel, etc.
  name: text("name").notNull(),
  description: text("description"),
  descriptionMd: text("description_md"), // Full markdown explainer text for service detail panel
  category: text("category").notNull(), // data, analysis, execution, infrastructure, platform_dependency
  enabled: boolean("enabled").default(true),
  healthStatus: text("health_status").default("disconnected"), // healthy, degraded, disconnected, error
  lastSuccessAt: timestamp("last_success_at"),
  lastErrorAt: timestamp("last_error_at"),
  lastError: text("last_error"),
  contractVersion: text("contract_version").default("1.0"),
  expectedSignals: jsonb("expected_signals"), // Array of signal names this integration should provide
  receivedSignals: jsonb("received_signals"), // Object mapping signal -> { received: boolean, stale: boolean, lastValue: any }
  configJson: jsonb("config_json"), // Non-sensitive configuration
  // Service Inventory Fields
  replitProjectUrl: text("replit_project_url"), // URL to Replit project
  baseUrl: text("base_url"), // Service base URL (e.g., https://service.replit.app)
  healthEndpoint: text("health_endpoint").default("/health"), // Health check endpoint
  metaEndpoint: text("meta_endpoint").default("/meta"), // Metadata endpoint
  deploymentStatus: text("deployment_status").default("not_built"), // not_built, building, built, deploying, deployed, failed
  hasRequiredEndpoints: boolean("has_required_endpoints").default(false),
  authRequired: boolean("auth_required").default(true),
  secretKeyName: text("secret_key_name"), // Bitwarden secret name for this service
  secretExists: boolean("secret_exists").default(false),
  lastHealthCheckAt: timestamp("last_health_check_at"),
  healthCheckStatus: text("health_check_status"), // pass, fail, unknown
  healthCheckResponse: jsonb("health_check_response"), // Response from health endpoint
  lastAuthTestAt: timestamp("last_auth_test_at"),
  authTestStatus: text("auth_test_status"), // pass, fail, unknown
  authTestDetails: jsonb("auth_test_details"), // { noKeyResult, withKeyResult }
  calledSuccessfully: boolean("called_successfully").default(false),
  notes: text("notes"),
  // State tracking fields (per the doc: build_state, config_state, run_state)
  buildState: text("build_state").default("planned"), // built, planned, deprecated
  configState: text("config_state").default("missing_config"), // ready, missing_config, blocked
  runState: text("run_state").default("never_ran"), // never_ran, last_run_success, last_run_failed, stale
  lastRunAt: timestamp("last_run_at"),
  lastRunSummary: text("last_run_summary"),
  lastRunMetrics: jsonb("last_run_metrics"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertIntegrationSchema = createInsertSchema(integrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;
export type Integration = typeof integrations.$inferSelect;

// Integration Health Checks - Per-site integration check history
export const integrationChecks = pgTable("integration_checks", {
  id: serial("id").primaryKey(),
  integrationId: text("integration_id").notNull(),
  siteId: text("site_id"), // null for global checks
  checkType: text("check_type").notNull(), // auth, data, freshness, completeness, contract
  status: text("status").notNull(), // pass, fail, warning
  details: jsonb("details"), // { message, data, duration_ms }
  durationMs: integer("duration_ms"),
  checkedAt: timestamp("checked_at").defaultNow().notNull(),
});

export const insertIntegrationCheckSchema = createInsertSchema(integrationChecks).omit({
  id: true,
});
export type InsertIntegrationCheck = z.infer<typeof insertIntegrationCheckSchema>;
export type IntegrationCheck = typeof integrationChecks.$inferSelect;

// Service Runs - Track each execution of a service with inputs, outputs, and metrics
export const serviceRuns = pgTable("service_runs", {
  id: serial("id").primaryKey(),
  runId: text("run_id").notNull().unique(),
  runType: text("run_type").notNull().default("smoke"), // connection, smoke, full
  siteId: text("site_id"),
  siteDomain: text("site_domain"),
  serviceId: text("service_id").notNull(),
  serviceName: text("service_name").notNull(),
  trigger: text("trigger").notNull().default("manual"), // scheduled, manual, webhook
  status: text("status").notNull().default("running"), // running, success, partial, failed, skipped
  startedAt: timestamp("started_at").notNull(),
  finishedAt: timestamp("finished_at"),
  durationMs: integer("duration_ms"),
  version: text("version"),
  summary: text("summary"),
  metricsJson: jsonb("metrics_json"), // { pages_crawled: 50, issues_found: 12, ... }
  inputsJson: jsonb("inputs_json"), // { urls: [...], date_range: {...}, ... }
  outputsJson: jsonb("outputs_json"), // { expectedOutputs: [...], actualOutputs: [...], missingOutputs: [...], metrics: {...}, debug: {...} }
  errorCode: text("error_code"),
  errorDetail: text("error_detail"),
  artifactLinks: jsonb("artifact_links"), // [{ type: "report", url: "...", label: "..." }, ...]
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertServiceRunSchema = createInsertSchema(serviceRuns).omit({
  id: true,
  createdAt: true,
});
export type InsertServiceRun = z.infer<typeof insertServiceRunSchema>;
export type ServiceRun = typeof serviceRuns.$inferSelect;

// Service Run Types
export const ServiceRunTypes = {
  CONNECTION: 'connection', // Health/auth check only
  SMOKE: 'smoke',           // Minimal real run to validate outputs
  FULL: 'full',             // Full production run
} as const;

export type ServiceRunType = typeof ServiceRunTypes[keyof typeof ServiceRunTypes];

// Service Run Statuses
export const ServiceRunStatuses = {
  RUNNING: 'running',
  SUCCESS: 'success',
  PARTIAL: 'partial',
  FAILED: 'failed',
  SKIPPED: 'skipped',
} as const;

export type ServiceRunStatus = typeof ServiceRunStatuses[keyof typeof ServiceRunStatuses];

// Service Run Triggers
export const ServiceRunTriggers = {
  SCHEDULED: 'scheduled',
  MANUAL: 'manual',
  WEBHOOK: 'webhook',
} as const;

export type ServiceRunTrigger = typeof ServiceRunTriggers[keyof typeof ServiceRunTriggers];

// Build States for services
export const BuildStates = {
  BUILT: 'built',
  PLANNED: 'planned',
  DEPRECATED: 'deprecated',
} as const;

export type BuildState = typeof BuildStates[keyof typeof BuildStates];

// Config States for services
export const ConfigStates = {
  READY: 'ready',
  MISSING_CONFIG: 'missing_config',
  BLOCKED: 'blocked',
} as const;

export type ConfigState = typeof ConfigStates[keyof typeof ConfigStates];

// Run States for services (computed from last run)
export const RunStates = {
  NEVER_RAN: 'never_ran',
  LAST_RUN_SUCCESS: 'last_run_success',
  LAST_RUN_FAILED: 'last_run_failed',
  STALE: 'stale',
} as const;

export type RunState = typeof RunStates[keyof typeof RunStates];

// Connector Diagnostic Stages
export const DiagnosticStages = {
  CONFIG_LOADED: 'config_loaded',
  AUTH_READY: 'auth_ready',
  ENDPOINT_BUILT: 'endpoint_built',
  REQUEST_SENT: 'request_sent',
  RESPONSE_TYPE_VALIDATED: 'response_type_validated',
  SCHEMA_VALIDATED: 'schema_validated',
  UI_MAPPING: 'ui_mapping',
} as const;

export type DiagnosticStage = typeof DiagnosticStages[keyof typeof DiagnosticStages];

export const DiagnosticStageOrder: DiagnosticStage[] = [
  'config_loaded',
  'auth_ready',
  'endpoint_built',
  'request_sent',
  'response_type_validated',
  'schema_validated',
  'ui_mapping',
];

export const DiagnosticStageLabels: Record<DiagnosticStage, string> = {
  config_loaded: 'Config Loaded',
  auth_ready: 'Auth Ready',
  endpoint_built: 'Endpoint Built',
  request_sent: 'Request Sent',
  response_type_validated: 'Response Type Validated',
  schema_validated: 'Schema Validated',
  ui_mapping: 'UI Mapping',
};

// Connector Diagnostics - Stage-by-stage results for smoke tests
export const connectorDiagnostics = pgTable("connector_diagnostics", {
  id: serial("id").primaryKey(),
  runId: text("run_id").notNull(), // Links to serviceRuns.runId
  siteId: text("site_id"),
  serviceId: text("service_id").notNull(),
  serviceName: text("service_name").notNull(),
  trigger: text("trigger").notNull().default("manual"), // manual, scheduled, webhook
  overallStatus: text("overall_status").notNull().default("pending"), // pending, pass, partial, fail
  stagesJson: jsonb("stages_json").notNull(), // Array of stage results
  configSnapshot: jsonb("config_snapshot"), // Redacted config keys captured
  authMode: text("auth_mode"), // oauth, api_key, none
  expectedResponseType: text("expected_response_type").default("json"), // json, html, text
  requiredOutputFields: text("required_output_fields").array(), // Expected fields
  startedAt: timestamp("started_at").notNull(),
  finishedAt: timestamp("finished_at"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertConnectorDiagnosticSchema = createInsertSchema(connectorDiagnostics).omit({
  id: true,
  createdAt: true,
});
export type InsertConnectorDiagnostic = z.infer<typeof insertConnectorDiagnosticSchema>;
export type ConnectorDiagnostic = typeof connectorDiagnostics.$inferSelect;

// Failure classification buckets
export type FailureBucket = 
  | 'wrong_endpoint_404'
  | 'auth_401_403'
  | 'auth_failed'
  | 'api_key_mismatch'
  | 'html_200_app_shell'
  | 'redirect_3xx'
  | 'timeout'
  | 'dns'
  | 'unknown';

export const FailureBucketLabels: Record<FailureBucket, string> = {
  wrong_endpoint_404: '404 - Wrong Endpoint',
  auth_401_403: '401/403 - Auth Failed',
  auth_failed: 'Auth Failed',
  api_key_mismatch: 'API Key Mismatch',
  html_200_app_shell: '200 HTML - SPA Shell',
  redirect_3xx: '3xx - Redirect',
  timeout: 'Timeout',
  dns: 'DNS/TLS Error',
  unknown: 'Unknown',
};

export const FailureBucketSuggestions: Record<FailureBucket, string> = {
  wrong_endpoint_404: 'Verify base_url and expected endpoint path (e.g. /api/health).',
  auth_401_403: 'Verify api_key secret and header format (Authorization Bearer vs x-api-key).',
  auth_failed: 'Worker rejected the key or expects a different header. Compare fingerprints.',
  api_key_mismatch: 'Bitwarden api_key does not match worker expected key. Update one side.',
  html_200_app_shell: "You're hitting a UI/SPA route; ensure the worker exposes a JSON /api/health and Hermes calls it.",
  redirect_3xx: 'Check URL construction and redirects; ensure Hermes calls the final JSON endpoint directly.',
  timeout: 'Worker unreachable or slow; check worker uptime and network.',
  dns: 'Check base_url domain and TLS; ensure published worker URL is correct.',
  unknown: 'Check worker logs and verify the service is running correctly.',
};

// Stage result shape (for stagesJson)
export interface DiagnosticStageResult {
  stage: DiagnosticStage;
  status: 'pending' | 'pass' | 'fail' | 'skipped';
  message: string;
  durationMs?: number;
  startedAt?: string;
  finishedAt?: string;
  details?: Record<string, unknown>; // Stage-specific debug info (redacted)
  failureBucket?: FailureBucket; // Classification of failure type
  suggestedFix?: string; // Actionable fix suggestion
}

// Diagnostic Runs - Parent run that groups service_runs per site per day
export const diagnosticRuns = pgTable("diagnostic_runs", {
  id: serial("id").primaryKey(),
  runId: text("run_id").notNull().unique(),
  siteId: text("site_id").notNull(),
  siteDomain: text("site_domain"),
  runType: text("run_type").notNull().default("daily"), // daily, on_demand, partial
  status: text("status").notNull().default("running"), // running, completed, partial, failed
  startedAt: timestamp("started_at").notNull(),
  finishedAt: timestamp("finished_at"),
  durationMs: integer("duration_ms"),
  summary: text("summary"),
  servicesRun: integer("services_run").default(0),
  servicesSuccess: integer("services_success").default(0),
  servicesFailed: integer("services_failed").default(0),
  servicesBlocked: integer("services_blocked").default(0),
  servicesSkipped: integer("services_skipped").default(0),
  metricsJson: jsonb("metrics_json"), // Aggregated metrics from all service runs
  outputsJson: jsonb("outputs_json"), // { expected: [...], actual: [...], missing: [...] }
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDiagnosticRunSchema = createInsertSchema(diagnosticRuns).omit({
  id: true,
  createdAt: true,
});
export type InsertDiagnosticRun = z.infer<typeof insertDiagnosticRunSchema>;
export type DiagnosticRun = typeof diagnosticRuns.$inferSelect;

// QA Runs - Automated testing runs for services
export const qaRuns = pgTable("qa_runs", {
  id: serial("id").primaryKey(),
  runId: text("run_id").notNull().unique(),
  siteId: text("site_id"), // nullable - can be global
  trigger: text("trigger").notNull().default("manual"), // manual, scheduled, deploy
  mode: text("mode").notNull().default("connection"), // connection, smoke, full
  status: text("status").notNull().default("running"), // running, pass, fail, partial
  startedAt: timestamp("started_at").notNull(),
  finishedAt: timestamp("finished_at"),
  durationMs: integer("duration_ms"),
  summary: text("summary"),
  totalTests: integer("total_tests").default(0),
  passed: integer("passed").default(0),
  failed: integer("failed").default(0),
  skipped: integer("skipped").default(0),
  resultsJson: jsonb("results_json"), // aggregate results
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertQaRunSchema = createInsertSchema(qaRuns).omit({
  id: true,
  createdAt: true,
});
export type InsertQaRun = z.infer<typeof insertQaRunSchema>;
export type QaRun = typeof qaRuns.$inferSelect;

// QA Run Items - Individual test results per service
export const qaRunItems = pgTable("qa_run_items", {
  id: serial("id").primaryKey(),
  qaRunId: text("qa_run_id").notNull(), // references qa_runs.run_id
  serviceSlug: text("service_slug").notNull(),
  testType: text("test_type").notNull(), // connection, smoke, contract
  status: text("status").notNull(), // pass, fail, skipped
  durationMs: integer("duration_ms"),
  details: text("details"),
  httpStatus: integer("http_status"),
  latencyMs: integer("latency_ms"),
  metricsJson: jsonb("metrics_json"),
  missingOutputs: text("missing_outputs").array(),
  serviceRunId: text("service_run_id"), // link to service_runs if created
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertQaRunItemSchema = createInsertSchema(qaRunItems).omit({
  id: true,
  createdAt: true,
});
export type InsertQaRunItem = z.infer<typeof insertQaRunItemSchema>;
export type QaRunItem = typeof qaRunItems.$inferSelect;

// Test Jobs - Async job tracking for connection/smoke tests
export const TestJobTypes = {
  CONNECTION_ALL: 'connection_all',
  SMOKE_ALL: 'smoke_all',
  SMOKE_ONE: 'smoke_one',
} as const;
export type TestJobType = typeof TestJobTypes[keyof typeof TestJobTypes];

export const TestJobStatuses = {
  QUEUED: 'queued',
  RUNNING: 'running',
  DONE: 'done',
  FAILED: 'failed',
} as const;
export type TestJobStatus = typeof TestJobStatuses[keyof typeof TestJobStatuses];

export const testJobs = pgTable("test_jobs", {
  id: serial("id").primaryKey(),
  jobId: text("job_id").notNull().unique(),
  siteId: text("site_id"), // nullable for global tests
  jobType: text("job_type").notNull(), // connection_all, smoke_all, smoke_one
  status: text("status").notNull().default("queued"), // queued, running, done, failed
  createdAt: timestamp("created_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  summary: text("summary"),
  progressJson: jsonb("progress_json"), // { total, started, completed, failed, perService: { [slug]: { status, durationMs, error? } } }
});

export const insertTestJobSchema = createInsertSchema(testJobs).omit({
  id: true,
  createdAt: true,
});
export type InsertTestJob = z.infer<typeof insertTestJobSchema>;
export type TestJob = typeof testJobs.$inferSelect;

// Progress JSON type for test jobs
export interface TestJobProgress {
  total: number;
  started: number;
  completed: number;
  failed: number;
  skipped: number;
  perService: Record<string, {
    status: 'queued' | 'running' | 'pass' | 'partial' | 'fail' | 'skipped';
    durationMs?: number;
    error?: string;
    workerJobId?: string; // For async workers that return 202
    expectedOutputs?: string[];
    actualOutputs?: string[];
    missingOutputs?: string[];
  }>;
}

// =============================================================================
// HUB-AND-SPOKE ARCHITECTURE: Artifact Store + Run Context
// =============================================================================

// Artifact Types - what services produce and consume
export const ArtifactTypes = {
  // Data snapshots
  COMP_SNAPSHOT: 'comp.snapshot',
  SERP_SNAPSHOT: 'serp.snapshot',
  CRAWL_SITEMAP: 'crawl.sitemap',
  CRAWL_AUDIT: 'crawl.audit',
  VITALS_REPORT: 'vitals.report',
  BACKLINKS_REPORT: 'backlinks.report',
  
  // Analysis outputs
  GAP_REPORT: 'gap.report',
  DECAY_REPORT: 'decay.report',
  
  // Content artifacts
  CONTENT_DRAFT: 'content.draft',
  CONTENT_REVISION: 'content.revision',
  QA_SCORECARD: 'qa.scorecard',
  QA_FIX_LIST: 'qa.fix_list',
  
  // Rules/config bundles
  RULES_QA: 'rules.qa',
  RULES_GENERATION: 'rules.generation',
  RULES_COMPETITORS: 'rules.competitors',
  RULES_GAP: 'rules.gap',
  RULES_SAFETY: 'rules.safety',
  
  // Events
  EVENT_ALERT: 'event.alert',
  EVENT_NOTIFICATION: 'event.notification',
} as const;

export type ArtifactType = typeof ArtifactTypes[keyof typeof ArtifactTypes];

// Artifact Store - shared output storage for all services
export const artifacts = pgTable("artifacts", {
  id: serial("id").primaryKey(),
  artifactId: text("artifact_id").notNull().unique(), // e.g., "art_1703123456_comp_snapshot"
  type: text("type").notNull(), // ArtifactTypes value
  websiteId: text("website_id"), // nullable for global artifacts
  runId: text("run_id"), // links to run_contexts.run_id
  runContextId: text("run_context_id"), // links to run_contexts.run_id
  producerService: text("producer_service").notNull(), // service slug that created this
  schemaVersion: text("schema_version").default("1.0.0"),
  storageRef: text("storage_ref"), // for large payloads stored externally
  payload: jsonb("payload"), // for small payloads stored inline
  summary: text("summary"), // human-readable summary
  metrics: jsonb("metrics"), // { pages_crawled: 50, score: 85, etc }
  expiresAt: timestamp("expires_at"), // optional TTL
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertArtifactSchema = createInsertSchema(artifacts).omit({
  id: true,
  createdAt: true,
});
export type InsertArtifact = z.infer<typeof insertArtifactSchema>;
export type Artifact = typeof artifacts.$inferSelect;

// Run Context States
export const RunContextStates = {
  PENDING: 'pending',
  RUNNING: 'running',
  WAITING_INPUT: 'waiting_input', // waiting for artifact dependency
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  NEEDS_HUMAN: 'needs_human', // escalated for human intervention
} as const;

export type RunContextState = typeof RunContextStates[keyof typeof RunContextStates];

// Run Context - tracks workflow execution state
export const runContexts = pgTable("run_contexts", {
  id: serial("id").primaryKey(),
  runId: text("run_id").notNull().unique(), // e.g., "ctx_1703123456_gap_analysis"
  websiteId: text("website_id"), // nullable for global runs
  workflowName: text("workflow_name").notNull(), // e.g., "gap_analysis", "content_generation"
  state: text("state").notNull().default("pending"), // RunContextStates
  trigger: text("trigger").notNull().default("manual"), // manual, scheduled, webhook, chained
  
  // DAG execution state
  stepStates: jsonb("step_states"), // { "step_1": "completed", "step_2": "running", ... }
  currentStep: text("current_step"),
  completedSteps: text("completed_steps").array().default([]),
  
  // Retry/limit controls
  maxRetries: integer("max_retries").default(3),
  currentRetries: integer("current_retries").default(0),
  
  // Rules context
  rulesetVersion: text("ruleset_version"), // version of rules used for this run
  rulesBundleIds: text("rules_bundle_ids").array(), // artifact IDs of rule bundles
  
  // Input/output artifact references
  inputArtifactIds: text("input_artifact_ids").array().default([]),
  outputArtifactIds: text("output_artifact_ids").array().default([]),
  
  // Error tracking
  errors: jsonb("errors"), // [{ step, code, message, timestamp }, ...]
  lastError: text("last_error"),
  
  // Timing
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  durationMs: integer("duration_ms"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRunContextSchema = createInsertSchema(runContexts).omit({
  id: true,
  createdAt: true,
});
export type InsertRunContext = z.infer<typeof insertRunContextSchema>;
export type RunContext = typeof runContexts.$inferSelect;

// Content Draft States (for QA/Generator loop control)
export const ContentDraftStates = {
  DRAFTED: 'drafted',
  QA_PENDING: 'qa_pending',
  QA_FAILED: 'qa_failed',
  REVISION_REQUESTED: 'revision_requested',
  QA_PASSED: 'qa_passed',
  APPROVAL_REQUIRED: 'approval_required',
  APPROVED: 'approved',
  PUBLISHED: 'published',
  PR_CREATED: 'pr_created',
  NEEDS_HUMAN: 'needs_human', // hit max retries
} as const;

export type ContentDraftState = typeof ContentDraftStates[keyof typeof ContentDraftStates];

// Content Drafts - state machine for content generation loop
export const contentDrafts = pgTable("content_drafts", {
  id: serial("id").primaryKey(),
  draftId: text("draft_id").notNull().unique(), // e.g., "draft_1703123456_blog_post"
  websiteId: text("website_id").notNull(),
  runContextId: text("run_context_id"), // links to run_contexts.run_id
  
  // Content metadata
  contentType: text("content_type").notNull(), // blog_post, landing_page, faq, etc.
  title: text("title"),
  targetUrl: text("target_url"),
  targetKeywords: text("target_keywords").array(),
  
  // State machine
  state: text("state").notNull().default("drafted"), // ContentDraftStates
  stateHistory: jsonb("state_history"), // [{ state, timestamp, reason }, ...]
  
  // Revision tracking
  revisionNumber: integer("revision_number").default(1),
  maxRevisions: integer("max_revisions").default(2),
  
  // Artifact references
  currentDraftArtifactId: text("current_draft_artifact_id"), // latest draft artifact
  allDraftArtifactIds: text("all_draft_artifact_ids").array().default([]),
  latestQaArtifactId: text("latest_qa_artifact_id"), // latest QA scorecard
  
  // QA tracking
  qaScore: integer("qa_score"), // 0-100
  qaViolations: jsonb("qa_violations"), // [{ rule, severity, message }, ...]
  qaFixList: jsonb("qa_fix_list"), // [{ issue, fix_instruction, priority }, ...]
  
  // Escalation
  needsHumanReason: text("needs_human_reason"),
  assignedTo: text("assigned_to"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertContentDraftSchema = createInsertSchema(contentDrafts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertContentDraft = z.infer<typeof insertContentDraftSchema>;
export type ContentDraft = typeof contentDrafts.$inferSelect;

// Service Events - for event-based notifications
export const EventSeverities = {
  INFO: 'info',
  WARN: 'warn',
  CRITICAL: 'critical',
} as const;

export type EventSeverity = typeof EventSeverities[keyof typeof EventSeverities];

export const EventAudiences = {
  OWNER: 'owner',
  OPS: 'ops',
  EXEC: 'exec',
  ALL: 'all',
} as const;

export type EventAudience = typeof EventAudiences[keyof typeof EventAudiences];

// Service Events - emitted by services, processed centrally by Hermes
export const serviceEvents = pgTable("service_events", {
  id: serial("id").primaryKey(),
  eventId: text("event_id").notNull().unique(), // e.g., "evt_1703123456_vitals_alert"
  websiteId: text("website_id"),
  runContextId: text("run_context_id"),
  producerService: text("producer_service").notNull(),
  
  // Event classification
  eventType: text("event_type").notNull(), // vitals_regression, qa_failure, crawl_error, etc.
  severity: text("severity").notNull().default("info"), // EventSeverities
  audience: text("audience").notNull().default("ops"), // EventAudiences
  
  // Notification control
  notify: boolean("notify").default(false),
  notified: boolean("notified").default(false),
  notifiedAt: timestamp("notified_at"),
  notificationChannel: text("notification_channel"), // email, slack, sms
  
  // Event details
  title: text("title").notNull(),
  message: text("message"),
  details: jsonb("details"), // arbitrary event-specific data
  artifactId: text("artifact_id"), // linked artifact if applicable
  
  // Deduplication
  dedupeKey: text("dedupe_key"), // for throttling similar events
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertServiceEventSchema = createInsertSchema(serviceEvents).omit({
  id: true,
  createdAt: true,
});
export type InsertServiceEvent = z.infer<typeof insertServiceEventSchema>;
export type ServiceEvent = typeof serviceEvents.$inferSelect;

// =============================================================================
// SUGGESTED CHANGES APPROVAL CENTER
// =============================================================================

// Proposal Types - categories of changes Hermes can propose
export const ProposalTypes = {
  // Config proposals (low risk)
  WEBSITE_SETTING_UPDATE: 'website_setting_update',
  SECRET_FORMAT_FIX: 'secret_format_fix',
  SERVICE_EXPECTED_OUTPUT_FIX: 'service_expected_output_fix',
  SERVICE_REGISTRY_UPDATE: 'service_registry_update',
  
  // Operational proposals (medium risk)
  RUN_SMOKE_TESTS: 'run_smoke_tests',
  RUN_DAILY_DIAGNOSIS: 'run_daily_diagnosis',
  RERUN_FAILED_SERVICE: 'rerun_failed_service',
  
  // Code proposals (higher risk)
  CODE_PATCH: 'code_patch',
  IMPLEMENT_ENDPOINT: 'implement_endpoint',
  SCHEMA_CONFORMANCE_FIX: 'schema_conformance_fix',
} as const;

export type ProposalType = typeof ProposalTypes[keyof typeof ProposalTypes];

// Risk levels for proposals
export const RiskLevels = {
  LOW: 'low',        // config-only, non-destructive, reversible
  MEDIUM: 'medium',  // operational actions, reruns, reversible settings
  HIGH: 'high',      // code changes, schema changes, deployment actions
  CRITICAL: 'critical', // production deployments, multi-service changes
} as const;

export type RiskLevel = typeof RiskLevels[keyof typeof RiskLevels];

// Proposal statuses (state machine)
export const ProposalStatuses = {
  OPEN: 'open',
  IN_REVIEW: 'in_review',
  ACCEPTED: 'accepted',
  APPLYING: 'applying',
  APPLIED: 'applied',
  FAILED: 'failed',
  REJECTED: 'rejected',
  SNOOZED: 'snoozed',
  SUPERSEDED: 'superseded',
} as const;

export type ProposalStatus = typeof ProposalStatuses[keyof typeof ProposalStatuses];

// Change Proposals - recommendations Hermes can apply
export const changeProposals = pgTable("change_proposals", {
  id: serial("id").primaryKey(),
  proposalId: text("proposal_id").notNull().unique(), // e.g., "prop_1703123456_secret_fix"
  websiteId: text("website_id"), // nullable for global proposals
  serviceKey: text("service_key"), // nullable, the service this affects
  
  // Classification
  type: text("type").notNull(), // ProposalTypes
  riskLevel: text("risk_level").notNull().default("low"), // RiskLevels
  status: text("status").notNull().default("open"), // ProposalStatuses
  
  // Content
  title: text("title").notNull(),
  description: text("description"),
  rationale: jsonb("rationale"), // why this change is needed
  evidence: jsonb("evidence"), // { run_ids, artifact_ids, error_codes, urls }
  
  // Change details
  changePlan: jsonb("change_plan"), // structured steps to apply
  preview: jsonb("preview"), // diff/settings/secret envelope preview
  verificationPlan: jsonb("verification_plan"), // checks to run after apply
  rollbackPlan: jsonb("rollback_plan"), // how to revert if verification fails
  
  // Policy gating
  policyGate: jsonb("policy_gate"), // { requires_confirmation, allowed_apply_modes }
  blocking: boolean("blocking").default(false), // if true, blocks other operations
  
  // Deduplication
  fingerprint: text("fingerprint"), // hash for deduping similar proposals
  
  // Tracking
  createdBy: text("created_by").default("system"), // system or user id
  supersededBy: text("superseded_by"), // proposal_id of newer proposal
  snoozedUntil: timestamp("snoozed_until"),
  tags: text("tags").array(),
  
  // Verification results (after apply)
  verificationResults: jsonb("verification_results"), // pass/fail per check + logs
  applyLogs: text("apply_logs"), // logs from applying
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertChangeProposalSchema = createInsertSchema(changeProposals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertChangeProposal = z.infer<typeof insertChangeProposalSchema>;
export type ChangeProposal = typeof changeProposals.$inferSelect;

// Proposal action types (for audit trail)
export const ProposalActionTypes = {
  OPENED: 'opened',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  SNOOZED: 'snoozed',
  APPLY_STARTED: 'apply_started',
  APPLY_SUCCEEDED: 'apply_succeeded',
  APPLY_FAILED: 'apply_failed',
  COMMENTED: 'commented',
  SUPERSEDED: 'superseded',
} as const;

export type ProposalActionType = typeof ProposalActionTypes[keyof typeof ProposalActionTypes];

// Change Proposal Actions - audit trail for each proposal
export const changeProposalActions = pgTable("change_proposal_actions", {
  id: serial("id").primaryKey(),
  actionId: text("action_id").notNull().unique(), // e.g., "act_1703123456_accepted"
  proposalId: text("proposal_id").notNull(), // links to change_proposals.proposal_id
  
  // Action details
  action: text("action").notNull(), // ProposalActionTypes
  actor: text("actor").notNull().default("system"), // user_id, email, or "system"
  reason: text("reason"), // optional reason for action
  metadata: jsonb("metadata"), // { applied_patch_ref, settings_changes, test_run_ids }
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertChangeProposalActionSchema = createInsertSchema(changeProposalActions).omit({
  id: true,
  createdAt: true,
});
export type InsertChangeProposalAction = z.infer<typeof insertChangeProposalActionSchema>;
export type ChangeProposalAction = typeof changeProposalActions.$inferSelect;

// Evidence structure for proposals
export interface ProposalEvidence {
  runIds?: string[];
  artifactIds?: string[];
  errorCodes?: string[];
  urls?: string[];
  errorMessages?: string[];
  serviceSlug?: string;
  testJobId?: string;
}

// Change plan structure
export interface ChangePlanStep {
  stepNumber: number;
  description: string;
  action: string; // e.g., "update_setting", "write_secret", "call_endpoint"
  target: string; // what to change
  value?: any; // new value
  preCondition?: string;
  postCheck?: string;
}

export interface ChangePlan {
  steps: ChangePlanStep[];
  estimatedDuration?: string; // e.g., "30 seconds"
  requiresConfirmation?: boolean;
}

// Verification plan structure
export interface VerificationStep {
  type: 'connection_test' | 'smoke_test' | 'endpoint_test' | 'artifact_check';
  target?: string; // service slug or artifact type
  expectedResult?: string;
}

export interface VerificationPlan {
  steps: VerificationStep[];
  timeout?: number; // seconds
}

// Rollback plan structure
export interface RollbackPlan {
  method: 'automatic' | 'manual' | 'snapshot';
  steps?: string[];
  snapshotRef?: string;
}

// Industry Benchmarks - reference data for comparing site performance
export const industryBenchmarks = pgTable("industry_benchmarks", {
  id: serial("id").primaryKey(),
  industry: text("industry").notNull(), // healthcare, ecommerce, saas, finance, travel, education, etc.
  metric: text("metric").notNull(), // organic_ctr, avg_position, bounce_rate, session_duration, pages_per_session, conversion_rate
  percentile25: real("percentile_25").notNull(), // 25th percentile (below average)
  percentile50: real("percentile_50").notNull(), // 50th percentile (average)
  percentile75: real("percentile_75").notNull(), // 75th percentile (above average)
  percentile90: real("percentile_90").notNull(), // 90th percentile (excellent)
  unit: text("unit"), // percent, seconds, count, position
  source: text("source"), // data source attribution
  sourceYear: integer("source_year"), // when benchmark data was collected
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertIndustryBenchmarkSchema = createInsertSchema(industryBenchmarks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertIndustryBenchmark = z.infer<typeof insertIndustryBenchmarkSchema>;
export type IndustryBenchmark = typeof industryBenchmarks.$inferSelect;

// SEO Worker Results - stores raw and normalized results from each worker per run
export const seoWorkerResults = pgTable("seo_worker_results", {
  id: serial("id").primaryKey(),
  runId: text("run_id").notNull(), // Links to runs.runId or diagnosticRuns.runId
  siteId: text("site_id").notNull(), // Links to sites.siteId
  workerKey: text("worker_key").notNull(), // e.g., "backlink_authority", "serp_intel", "crawl_render"
  status: text("status").notNull().default("pending"), // pending, success, failed, timeout
  
  // Raw response from worker
  payloadJson: jsonb("payload_json"), // Full worker response
  
  // Normalized metrics for fast dashboard reads
  metricsJson: jsonb("metrics_json"), // { keywordCount: 100, inTop10: 25, avgPosition: 12.5, etc. }
  
  // Summary for display
  summaryText: text("summary_text"), // Human-readable summary of results
  
  // Error tracking
  errorCode: text("error_code"),
  errorDetail: text("error_detail"),
  
  // Timing
  durationMs: integer("duration_ms"),
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSeoWorkerResultSchema = createInsertSchema(seoWorkerResults).omit({
  id: true,
  createdAt: true,
});
export type InsertSeoWorkerResult = z.infer<typeof insertSeoWorkerResultSchema>;
export type SeoWorkerResult = typeof seoWorkerResults.$inferSelect;

// Normalized Metric Events - canonical metric storage with consistent keys
export const seoMetricEvents = pgTable("seo_metric_events", {
  id: serial("id").primaryKey(),
  siteId: text("site_id").notNull(),
  serviceId: text("service_id").notNull(), // e.g., "core_web_vitals", "google_data_connector"
  crewId: text("crew_id").notNull(), // e.g., "speedster", "popular"
  runId: text("run_id"), // Links to runs.runId if applicable
  collectedAt: timestamp("collected_at").defaultNow().notNull(),
  metricsJson: jsonb("metrics_json").notNull(), // { "vitals.lcp": 6.706, "vitals.cls": 0.1 }
  rawJson: jsonb("raw_json"), // Original worker output for debugging
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSeoMetricEventSchema = createInsertSchema(seoMetricEvents).omit({
  id: true,
  createdAt: true,
});
export type InsertSeoMetricEvent = z.infer<typeof insertSeoMetricEventSchema>;
export type SeoMetricEvent = typeof seoMetricEvents.$inferSelect;

// =============================================================================
// ATLAS (AI Optimization) Tables
// =============================================================================

// AI Findings Table for Atlas
export const aiFindings = pgTable("ai_findings", {
  id: serial("id").primaryKey(),
  siteId: text("site_id").notNull(),
  findingId: text("finding_id").notNull().unique(),
  url: text("url").notNull(),
  findingType: text("finding_type").notNull(), // 'schema_error', 'missing_entity', 'thin_summary', etc.
  severity: text("severity").notNull(), // 'critical', 'warning', 'info'
  category: text("category").notNull(), // 'structured_data', 'entity', 'summary', 'llm_visibility'
  description: text("description").notNull(),
  impactEstimate: text("impact_estimate"),
  recommendedAction: text("recommended_action"),
  fixAction: text("fix_action"), // action to queue if fixable
  isAutoFixable: boolean("is_auto_fixable").default(false),
  metadata: jsonb("metadata"), // additional context
  detectedAt: timestamp("detected_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAiFindingSchema = createInsertSchema(aiFindings).omit({
  id: true,
  createdAt: true,
});
export type InsertAiFinding = z.infer<typeof insertAiFindingSchema>;
export type AiFinding = typeof aiFindings.$inferSelect;

// AI Snapshots Table for Atlas trends
export const aiSnapshots = pgTable("ai_snapshots", {
  id: serial("id").primaryKey(),
  siteId: text("site_id").notNull(),
  capturedAt: timestamp("captured_at").defaultNow().notNull(),
  aiVisibilityScore: integer("ai_visibility_score"), // 0-100
  structuredDataCoverage: integer("structured_data_coverage"), // 0-100 percent
  entityCoverage: integer("entity_coverage"), // 0-100 percent
  llmAnswerability: integer("llm_answerability"), // 0-100 percent
  structuredDataDetails: jsonb("structured_data_details"), // schema types, errors
  entityDetails: jsonb("entity_details"), // entities found/missing
  summaryDetails: jsonb("summary_details"), // summary status per page
  llmVisibilityDetails: jsonb("llm_visibility_details"), // question answering results
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAiSnapshotSchema = createInsertSchema(aiSnapshots).omit({
  id: true,
  createdAt: true,
});
export type InsertAiSnapshot = z.infer<typeof insertAiSnapshotSchema>;
export type AiSnapshot = typeof aiSnapshots.$inferSelect;

// Draper Settings Table - Paid Ads optimization settings
export const draperSettings = pgTable("draper_settings", {
  id: serial("id").primaryKey(),
  siteId: text("site_id").notNull().default("default"),
  customerId: text("customer_id"), // Google Ads customer ID (optional for now)
  targetCpa: real("target_cpa"), // Target cost per acquisition
  targetRoas: real("target_roas"), // Target ROAS e.g. 3.0 for 3x return
  dailySpendCap: real("daily_spend_cap"), // Max daily budget
  autoApplyNegatives: boolean("auto_apply_negatives").default(false),
  pauseLowPerformers: boolean("pause_low_performers").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDraperSettingsSchema = createInsertSchema(draperSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDraperSettings = z.infer<typeof insertDraperSettingsSchema>;
export type DraperSettings = typeof draperSettings.$inferSelect;

// Draper Action Queue Table - Queue for paid ads optimization actions
export const draperActionQueue = pgTable("draper_action_queue", {
  id: serial("id").primaryKey(),
  siteId: text("site_id").notNull().default("default"),
  status: text("status").notNull().default("queued"), // queued, running, done, failed, cancelled
  actionType: text("action_type").notNull(), // campaign_review, spend_analysis, ad_copy_optimization, landing_page_alignment, fix_finding
  payload: jsonb("payload"), // Action-specific data
  note: text("note"), // Human-readable description
  result: jsonb("result"), // Result when done
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDraperActionSchema = createInsertSchema(draperActionQueue).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDraperAction = z.infer<typeof insertDraperActionSchema>;
export type DraperAction = typeof draperActionQueue.$inferSelect;

// SEO Suggestions - generated recommendations from combined worker signals
export const seoSuggestions = pgTable("seo_suggestions", {
  id: serial("id").primaryKey(),
  suggestionId: text("suggestion_id").notNull().unique(), // e.g., "sug_1703123456_content_refresh"
  runId: text("run_id").notNull(), // Links to runs.runId
  siteId: text("site_id").notNull(), // Links to sites.siteId
  
  // Suggestion details
  suggestionType: text("suggestion_type").notNull(), // content_refresh, backlink_campaign, technical_fix, keyword_optimization, etc.
  title: text("title").notNull(),
  description: text("description"),
  severity: text("severity").notNull().default("medium"), // low, medium, high, critical
  category: text("category").notNull(), // authority, technical, serp, content, performance
  
  // Evidence and context
  evidenceJson: jsonb("evidence_json"), // { metrics: {}, urls: [], keywords: [], workerResults: [] }
  impactedUrls: text("impacted_urls").array(), // URLs affected by this suggestion
  impactedKeywords: text("impacted_keywords").array(), // Keywords related to this suggestion
  
  // Recommended actions
  actionsJson: jsonb("actions_json"), // [{ step: 1, action: "...", priority: "high" }]
  
  // Impact estimation
  estimatedImpact: text("estimated_impact"), // high, medium, low
  estimatedEffort: text("estimated_effort"), // quick_win, moderate, significant
  
  // Status tracking
  status: text("status").notNull().default("open"), // open, in_progress, completed, dismissed
  assignee: text("assignee"), // SEO, Dev, Content, Ads
  
  // Source tracking
  sourceWorkers: text("source_workers").array(), // Which workers contributed to this suggestion
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSeoSuggestionSchema = createInsertSchema(seoSuggestions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSeoSuggestion = z.infer<typeof insertSeoSuggestionSchema>;
export type SeoSuggestion = typeof seoSuggestions.$inferSelect;

// Knowledge Base Insights - cached KB insights generated per run
export const seoKbaseInsights = pgTable("seo_kbase_insights", {
  id: serial("id").primaryKey(),
  insightId: text("insight_id").notNull().unique(), // e.g., "ins_1703123456_weekly_summary"
  runId: text("run_id").notNull(),
  siteId: text("site_id").notNull(),
  
  // Insight content
  title: text("title").notNull(),
  summary: text("summary").notNull(), // Short description
  fullContent: text("full_content"), // Full article/insight text
  insightType: text("insight_type").notNull(), // weekly_summary, technical_issues, keyword_opportunities, content_decay, authority_notes
  
  // References
  articleRefsJson: jsonb("article_refs_json"), // Links to related KB articles
  suggestionIds: text("suggestion_ids").array(), // Related suggestions
  
  // Actions
  actionsJson: jsonb("actions_json"), // Quick actions derived from this insight
  
  // Metadata
  priority: integer("priority").default(50), // 1-100 for ordering
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSeoKbaseInsightSchema = createInsertSchema(seoKbaseInsights).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSeoKbaseInsight = z.infer<typeof insertSeoKbaseInsightSchema>;
export type SeoKbaseInsight = typeof seoKbaseInsights.$inferSelect;

// SEO Runs - track orchestration run status for polling
export const seoRuns = pgTable("seo_runs", {
  id: serial("id").primaryKey(),
  runId: text("run_id").notNull().unique(),
  siteId: text("site_id").notNull(),
  domain: text("domain").notNull(),
  
  status: text("status").notNull().default("queued"), // queued, running, complete, partial, failed
  
  workerStatusesJson: jsonb("worker_statuses_json"), // { workerKey: { status, startedAt, finishedAt } }
  
  totalWorkers: integer("total_workers").default(0),
  completedWorkers: integer("completed_workers").default(0),
  successWorkers: integer("success_workers").default(0),
  failedWorkers: integer("failed_workers").default(0),
  skippedWorkers: integer("skipped_workers").default(0),
  
  suggestionsGenerated: integer("suggestions_generated").default(0),
  insightsGenerated: integer("insights_generated").default(0),
  ticketsGenerated: integer("tickets_generated").default(0),
  
  startedAt: timestamp("started_at"),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSeoRunSchema = createInsertSchema(seoRuns).omit({
  id: true,
  createdAt: true,
});
export type InsertSeoRun = z.infer<typeof insertSeoRunSchema>;
export type SeoRun = typeof seoRuns.$inferSelect;

// Metric Snapshots - canonical source of truth for all metrics
export const metricSnapshots = pgTable("metric_snapshots", {
  id: serial("id").primaryKey(),
  siteId: text("site_id").notNull(),
  
  // Metric identification
  metricKey: text("metric_key").notNull(), // e.g. sessions_7d, top10_keywords, avg_position
  sourceAgent: text("source_agent").notNull(), // e.g. popular, lookout, scotty
  
  // Time window
  windowStart: timestamp("window_start"),
  windowEnd: timestamp("window_end"),
  
  // Values
  value: real("value").notNull(),
  comparisonValue: real("comparison_value"), // Previous period value
  deltaAbs: real("delta_abs"), // Absolute change
  deltaPct: real("delta_pct"), // Percentage change
  
  // Verdict
  verdict: text("verdict"), // good, watch, bad, neutral
  verdictReason: text("verdict_reason"), // One-line explanation
  
  // Metadata
  asOf: timestamp("as_of").defaultNow().notNull(), // When this snapshot was captured
  metadataJson: jsonb("metadata_json"), // Additional context
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertMetricSnapshotSchema = createInsertSchema(metricSnapshots).omit({
  id: true,
  createdAt: true,
});
export type InsertMetricSnapshot = z.infer<typeof insertMetricSnapshotSchema>;
export type MetricSnapshot = typeof metricSnapshots.$inferSelect;

// Action Queue - prioritized actions from Captain's Recommendations
export const actionQueue = pgTable("action_queue", {
  id: serial("id").primaryKey(),
  siteId: text("site_id").notNull(),
  
  // Action details
  title: text("title").notNull(),
  description: text("description"),
  
  // Categorization
  priority: integer("priority").notNull().default(50), // 1-100
  impactLevel: text("impact_level"), // high, medium, low
  effortLevel: text("effort_level"), // quick, medium, long
  
  // Source agents
  sourceAgents: text("source_agents").array(), // Which agents recommended this
  evidenceJson: jsonb("evidence_json"), // Supporting data from agents
  
  // Status tracking
  status: text("status").notNull().default("new"), // new, reviewed, approved, done, dismissed
  reviewedAt: timestamp("reviewed_at"),
  approvedAt: timestamp("approved_at"),
  completedAt: timestamp("completed_at"),
  
  // Export prompt
  promptMarkdown: text("prompt_markdown"), // Generated Replit instructions
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertActionQueueSchema = createInsertSchema(actionQueue).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertActionQueue = z.infer<typeof insertActionQueueSchema>;
export type ActionItem = typeof actionQueue.$inferSelect;

// Crew State - tracks enabled agents per site
export const crewState = pgTable("crew_state", {
  id: serial("id").primaryKey(),
  siteId: text("site_id").notNull(),
  agentId: text("agent_id").notNull(),
  enabled: boolean("enabled").notNull().default(false),
  needsConfig: boolean("needs_config").notNull().default(true),
  lastRunAt: timestamp("last_run_at"),
  health: text("health").default("unknown"), // healthy, degraded, error, unknown
  consecutiveFailures: integer("consecutive_failures").default(0).notNull(),
  degradedAt: timestamp("degraded_at"), // Set when consecutiveFailures >= 3, cleared on success
  lastErrorMessage: text("last_error_message"), // Most recent error message for debugging
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCrewStateSchema = createInsertSchema(crewState).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCrewState = z.infer<typeof insertCrewStateSchema>;
export type CrewState = typeof crewState.$inferSelect;

// Integration Status Cache - for instant UI loading with stale-while-revalidate
export const integrationStatusCache = pgTable("integration_status_cache", {
  id: serial("id").primaryKey(),
  siteId: text("site_id").notNull().unique(),
  
  // Cached summary data
  payloadJson: jsonb("payload_json").notNull(), // Full integrations summary
  servicesJson: jsonb("services_json"), // Service-level status array
  nextActionsJson: jsonb("next_actions_json"), // Recommended next actions
  
  // Cache metadata
  cachedAt: timestamp("cached_at").defaultNow().notNull(),
  computedFromRunId: text("computed_from_run_id"), // Which run produced this cache
  
  // Refresh tracking
  lastRefreshAttemptAt: timestamp("last_refresh_attempt_at"),
  lastRefreshStatus: text("last_refresh_status"), // success, failed, timeout
  lastRefreshError: text("last_refresh_error"),
  lastRefreshDurationMs: integer("last_refresh_duration_ms"),
  
  // TTL control
  ttlSeconds: integer("ttl_seconds").default(60), // How long before considered stale
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertIntegrationStatusCacheSchema = createInsertSchema(integrationStatusCache).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertIntegrationStatusCache = z.infer<typeof insertIntegrationStatusCacheSchema>;
export type IntegrationStatusCache = typeof integrationStatusCache.$inferSelect;

// Dashboard Metric Snapshots - persists last known good metric values
export const dashboardMetricSnapshots = pgTable("dashboard_metric_snapshots", {
  id: serial("id").primaryKey(),
  siteId: text("site_id").notNull().unique(),
  
  // Metrics JSON containing all dashboard metric values
  metricsJson: jsonb("metrics_json").notNull(),
  
  // Source tracking
  sourceRunIds: jsonb("source_run_ids"), // Array of run IDs that contributed to this snapshot
  dateRangeFrom: text("date_range_from"), // Start date of data range
  dateRangeTo: text("date_range_to"), // End date of data range
  
  // Cache metadata
  capturedAt: timestamp("captured_at").defaultNow().notNull(),
  
  // Refresh tracking
  lastRefreshAttemptAt: timestamp("last_refresh_attempt_at"),
  lastRefreshStatus: text("last_refresh_status"), // success, failed, partial
  lastRefreshError: text("last_refresh_error"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDashboardMetricSnapshotSchema = createInsertSchema(dashboardMetricSnapshots).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertDashboardMetricSnapshot = z.infer<typeof insertDashboardMetricSnapshotSchema>;
export type DashboardMetricSnapshot = typeof dashboardMetricSnapshots.$inferSelect;

// Fix Plans - stores generated fix plans before execution
export const fixPlans = pgTable("fix_plans", {
  id: serial("id").primaryKey(),
  planId: text("plan_id").notNull().unique(), // Unique plan identifier
  siteId: text("site_id").notNull(),
  crewId: text("crew_id").notNull(), // speedster, scout, etc.
  topic: text("topic").notNull(), // core_web_vitals, indexing, etc.
  
  // Plan status
  status: text("status").notNull().default("pending"), // pending, executed, expired, cancelled
  
  // Cooldown tracking
  cooldownAllowed: boolean("cooldown_allowed").notNull().default(true),
  cooldownNextAllowedAt: timestamp("cooldown_next_allowed_at"),
  cooldownReason: text("cooldown_reason"),
  lastPrCreatedAt: timestamp("last_pr_created_at"),
  
  // Plan items and recommendations
  maxChangesRecommended: integer("max_changes_recommended").default(5),
  itemsJson: jsonb("items_json").notNull(), // Array of fix plan items
  
  // Context that generated this plan
  metricsSnapshot: jsonb("metrics_snapshot"), // Vitals/metrics at time of plan
  socratesContext: jsonb("socrates_context"), // Prior learnings used
  
  // Execution results (populated after execute)
  executedAt: timestamp("executed_at"),
  executedItemsCount: integer("executed_items_count"),
  prUrl: text("pr_url"),
  prBranch: text("pr_branch"),
  executionResult: jsonb("execution_result"),
  
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // Plans expire after 24h by default
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFixPlanSchema = createInsertSchema(fixPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFixPlan = z.infer<typeof insertFixPlanSchema>;
export type FixPlan = typeof fixPlans.$inferSelect;

// Fix Plan Item schema for validation
export const fixPlanItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  why: z.string(),
  proposedChanges: z.array(z.object({
    type: z.string(), // code, config, asset, etc.
    fileHint: z.string().optional(),
    description: z.string(),
  })),
  expectedOutcome: z.string(),
  risk: z.enum(["low", "medium", "high"]),
  confidence: z.enum(["low", "medium", "high"]),
  sources: z.array(z.string()), // ["speedster", "socrates"]
});
export type FixPlanItem = z.infer<typeof fixPlanItemSchema>;

// Action Approvals - tracks approved actions from the Action Queue
export const actionApprovals = pgTable("action_approvals", {
  id: serial("id").primaryKey(),
  siteId: text("site_id").notNull(),
  actionKey: text("action_key").notNull(), // Unique key for the action (e.g., priority index + title hash)
  actionTitle: text("action_title").notNull(),
  approvedAt: timestamp("approved_at").defaultNow().notNull(),
  approvedBy: text("approved_by").default("user"),
});

export const insertActionApprovalSchema = createInsertSchema(actionApprovals).omit({
  id: true,
  approvedAt: true,
});
export type InsertActionApproval = z.infer<typeof insertActionApprovalSchema>;
export type ActionApproval = typeof actionApprovals.$inferSelect;

// Achievement Tracks - Exponential progression system for crew achievements
export const achievementTracks = pgTable("achievement_tracks", {
  id: serial("id").primaryKey(),
  siteId: text("site_id").notNull(),
  crewId: text("crew_id").notNull(), // speedster, natasha, authority, pulse, serp, socrates
  key: text("key").notNull(), // e.g., "vitals_scans", "performance_improvements"
  name: text("name").notNull(), // Display name
  description: text("description").notNull(),
  icon: text("icon").notNull(), // Lucide icon name
  currentLevel: integer("current_level").notNull().default(1),
  currentTier: text("current_tier").notNull().default("bronze"), // bronze, silver, gold, platinum, mythic
  currentValue: integer("current_value").notNull().default(0),
  nextThreshold: integer("next_threshold").notNull().default(5),
  baseThreshold: integer("base_threshold").notNull().default(5),
  growthFactor: real("growth_factor").notNull().default(1.7),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAchievementTrackSchema = createInsertSchema(achievementTracks).omit({
  id: true,
  createdAt: true,
});
export type InsertAchievementTrack = z.infer<typeof insertAchievementTrackSchema>;
export type AchievementTrack = typeof achievementTracks.$inferSelect;

// Achievement tier thresholds
export const ACHIEVEMENT_TIERS = {
  bronze: { minLevel: 1, maxLevel: 5 },
  silver: { minLevel: 6, maxLevel: 15 },
  gold: { minLevel: 16, maxLevel: 30 },
  platinum: { minLevel: 31, maxLevel: 50 },
  mythic: { minLevel: 51, maxLevel: Infinity },
} as const;

export type AchievementTier = keyof typeof ACHIEVEMENT_TIERS;

// SEO Agent Snapshots - Track Market SOV and metrics over time for Trends
export const seoAgentSnapshots = pgTable("seo_agent_snapshots", {
  id: serial("id").primaryKey(),
  siteId: text("site_id").notNull().default("default"),
  agentSlug: text("agent_slug").notNull(), // natasha, lookout, etc.
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  marketSovPct: real("market_sov_pct").notNull(),
  trackedSovPct: real("tracked_sov_pct"),
  totalKeywords: integer("total_keywords").notNull(),
  rankingKeywords: integer("ranking_keywords").notNull(),
  notRankingKeywords: integer("not_ranking_keywords").notNull(),
  top1Count: integer("top1_count").notNull().default(0),
  top3Count: integer("top3_count").notNull().default(0),
  top10Count: integer("top10_count").notNull().default(0),
  top20Count: integer("top20_count").notNull().default(0),
  top50Count: integer("top50_count").notNull().default(0),
  positionDistribution: jsonb("position_distribution"),
});

export const insertSeoAgentSnapshotSchema = createInsertSchema(seoAgentSnapshots).omit({
  id: true,
  timestamp: true,
});
export type InsertSeoAgentSnapshot = z.infer<typeof insertSeoAgentSnapshotSchema>;
export type SeoAgentSnapshot = typeof seoAgentSnapshots.$inferSelect;

// SEO Agent Competitors - Track competitor domains for competitive analysis
export const seoAgentCompetitors = pgTable("seo_agent_competitors", {
  id: serial("id").primaryKey(),
  siteId: text("site_id").notNull().default("default"),
  agentSlug: text("agent_slug").notNull().default("natasha"),
  domain: text("domain").notNull(),
  name: text("name"),
  type: text("type").default("direct"), // direct, indirect, serp-only
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSeoAgentCompetitorSchema = createInsertSchema(seoAgentCompetitors).omit({
  id: true,
  createdAt: true,
});
export type InsertSeoAgentCompetitor = z.infer<typeof insertSeoAgentCompetitorSchema>;
export type SeoAgentCompetitor = typeof seoAgentCompetitors.$inferSelect;

// Agent Achievements - Track wins and milestones for each agent
export const agentAchievements = pgTable("agent_achievements", {
  id: serial("id").primaryKey(),
  siteId: text("site_id").notNull().default("default"),
  agentSlug: text("agent_slug").notNull(), // natasha, lookout, scotty, etc.
  type: text("type").notNull(), // ranking, sov, competitor, execution
  title: text("title").notNull(),
  description: text("description"),
  value: jsonb("value"), // Flexible JSON for storing achievement-specific data
  achievedAt: timestamp("achieved_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAgentAchievementSchema = createInsertSchema(agentAchievements).omit({
  id: true,
  createdAt: true,
});
export type InsertAgentAchievement = z.infer<typeof insertAgentAchievementSchema>;
export type AgentAchievement = typeof agentAchievements.$inferSelect;

// API Keys - Secure key management for external integrations
export const apiKeys = pgTable("api_keys", {
  id: serial("id").primaryKey(),
  keyId: text("key_id").notNull().unique(), // UUID for external reference
  siteId: text("site_id").notNull().default("default"),
  displayName: text("display_name").notNull(),
  hashedKey: text("hashed_key").notNull(), // bcrypt hash of the actual key
  prefix: text("prefix").notNull(), // First 8 chars for quick lookup (ark_prod_abc12345)
  scopes: text("scopes").array().default([]), // ['read', 'write', 'empathy:apply', etc.]
  createdBy: text("created_by"), // User or system that created the key
  lastUsedAt: timestamp("last_used_at"),
  expiresAt: timestamp("expires_at"), // Optional expiry
  revokedAt: timestamp("revoked_at"), // Soft delete
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
});
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;
export type ApiKey = typeof apiKeys.$inferSelect;

// ==================== WEBSITE INTEGRATIONS ====================

export const integrationTypeEnum = [
  "deploy_github",
  "deploy_wordpress", 
  "deploy_replit",
  "ga4",
  "gsc",
  "clarity",
  "google_ads",
  "core_web_vitals",
  "crawler",
  "empathy",
] as const;

export const integrationStatusEnum = [
  "not_configured",
  "connecting",
  "connected",
  "needs_reauth",
  "error",
  "disabled",
] as const;

export const websiteIntegrations = pgTable("website_integrations", {
  id: serial("id").primaryKey(),
  siteId: text("site_id").notNull(),
  integrationType: text("integration_type").notNull(),
  status: text("status").notNull().default("not_configured"),
  configJson: jsonb("config_json"),
  secretRefs: text("secret_refs").array(),
  lastOkAt: timestamp("last_ok_at"),
  lastCheckedAt: timestamp("last_checked_at"),
  lastError: jsonb("last_error"),
  connectionOwner: text("connection_owner"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertWebsiteIntegrationSchema = createInsertSchema(websiteIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastOkAt: true,
  lastCheckedAt: true,
});
export type InsertWebsiteIntegration = z.infer<typeof insertWebsiteIntegrationSchema>;
export type WebsiteIntegration = typeof websiteIntegrations.$inferSelect;

export type IntegrationType = typeof integrationTypeEnum[number];
export type IntegrationStatus = typeof integrationStatusEnum[number];

export interface GitHubDeployConfig {
  repoUrl: string;
  branch: string;
  deployStrategy: "pr" | "direct_push" | "patch_file";
  authMethod: "github_app" | "pat";
  installationId?: string;
}

export interface WordPressDeployConfig {
  siteUrl: string;
  stagingUrl?: string;
  pluginVersion?: string;
}

export interface ReplitDeployConfig {
  replitUrl: string;
  deployTarget: "autoscale" | "dev";
}

export interface GA4Config {
  propertyId: string;
  dataStreamId?: string;
}

export interface GSCConfig {
  siteUrl: string;
}

export interface ClarityConfig {
  projectId: string;
}

export interface GoogleAdsConfig {
  customerId: string;
  managerId?: string;
}

export interface CoreWebVitalsConfig {
  measurementUrl?: string;
}

export interface CrawlerConfig {
  maxDepth?: number;
  maxPages?: number;
  respectRobots?: boolean;
}

export interface EmpathyConfig {
  baseUrl: string;
}

// =============================================================================
// CORE WEB VITALS DAILY TABLE
// Structured storage for Core Web Vitals metrics with individual columns
// =============================================================================

export const coreWebVitalsDaily = pgTable("core_web_vitals_daily", {
  id: serial("id").primaryKey(),
  siteId: text("site_id").notNull(),
  collectedAt: timestamp("collected_at").defaultNow().notNull(),
  
  // Core Web Vitals metrics (p75 values)
  lcp: real("lcp"), // Largest Contentful Paint in seconds
  cls: real("cls"), // Cumulative Layout Shift (unitless)
  inp: real("inp"), // Interaction to Next Paint in milliseconds
  ttfb: real("ttfb"), // Time to First Byte in milliseconds
  fcp: real("fcp"), // First Contentful Paint in seconds
  
  // Status indicators (good, needs-improvement, poor)
  lcpStatus: text("lcp_status"),
  clsStatus: text("cls_status"),
  inpStatus: text("inp_status"),
  ttfbStatus: text("ttfb_status"),
  fcpStatus: text("fcp_status"),
  
  // Overall score (0-100)
  overallScore: integer("overall_score"),
  
  // Source of the data
  source: text("source"), // "crux", "lighthouse", "worker"
  url: text("url"), // The specific URL measured
  deviceType: text("device_type").default("mobile"), // mobile, desktop
  
  // Raw data for debugging
  rawJson: jsonb("raw_json"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCoreWebVitalsDailySchema = createInsertSchema(coreWebVitalsDaily).omit({
  id: true,
  createdAt: true,
});
export type InsertCoreWebVitalsDaily = z.infer<typeof insertCoreWebVitalsDailySchema>;
export type CoreWebVitalsDaily = typeof coreWebVitalsDaily.$inferSelect;

// =============================================================================
// WEBSITE SUBSCRIPTIONS & ADD-ONS
// Tracks website subscriptions and add-on features for Arclo monetization
// =============================================================================

export const websiteSubscriptions = pgTable("website_subscriptions", {
  id: serial("id").primaryKey(),
  siteId: text("site_id").notNull(),
  scanId: text("scan_id"), // Optional link to original scan
  plan: text("plan").default("free"), // free, core
  subscriptionStatus: text("subscription_status").default("inactive"), // inactive, active, past_due, canceled
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  addons: jsonb("addons").default({}), // { content_growth: boolean, competitive_intel: boolean, authority_signals: boolean }
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertWebsiteSubscriptionSchema = createInsertSchema(websiteSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertWebsiteSubscription = z.infer<typeof insertWebsiteSubscriptionSchema>;
export type WebsiteSubscription = typeof websiteSubscriptions.$inferSelect;

// =============================================================================
// FREE REPORTS
// Stores complete Free Report v1 data with all 6 sections
// =============================================================================

export const freeReports = pgTable("free_reports", {
  id: serial("id").primaryKey(),
  reportId: text("report_id").notNull().unique(),
  scanId: text("scan_id").notNull(),
  websiteUrl: text("website_url").notNull(),
  websiteDomain: text("website_domain").notNull(),
  reportVersion: integer("report_version").default(1),
  status: text("status").default("generating"),
  
  summary: jsonb("summary"),
  competitors: jsonb("competitors"),
  keywords: jsonb("keywords"),
  technical: jsonb("technical"),
  performance: jsonb("performance"),
  nextSteps: jsonb("next_steps"),
  meta: jsonb("meta"),
  
  visibilityMode: text("visibility_mode").default("full"),
  limitedVisibilityReason: text("limited_visibility_reason"),
  limitedVisibilitySteps: jsonb("limited_visibility_steps"),
  
  shareToken: text("share_token"),
  shareTokenExpiresAt: timestamp("share_token_expires_at"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertFreeReportSchema = createInsertSchema(freeReports).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFreeReport = z.infer<typeof insertFreeReportSchema>;
export type FreeReport = typeof freeReports.$inferSelect;

// ============================================================
// CHANGE GOVERNANCE SYSTEM
// ============================================================

// Change status enum values
export type ChangeStatus = 'proposed' | 'queued' | 'applied' | 'rolled_back' | 'skipped';
export type ChangeType = 'content' | 'technical' | 'performance' | 'config';
export type ChangeScope = 'single_page' | 'template' | 'sitewide';
export type RiskLevel = 'low' | 'medium' | 'high';
export type ChangeTrigger = 'scheduled_run' | 'manual' | 'alert';

// Central Change Log - tracks all proposed/applied/rolled-back changes
export const changes = pgTable("changes", {
  id: serial("id").primaryKey(),
  changeId: text("change_id").notNull().unique(), // UUID
  websiteId: text("website_id").notNull(), // References sites.siteId
  agentId: text("agent_id").notNull(), // e.g., "crawl", "performance", "keywords", "content"
  changeType: text("change_type").notNull(), // content|technical|performance|config
  scope: text("scope").notNull(), // single_page|template|sitewide
  affectedUrls: jsonb("affected_urls").$type<string[]>(),
  description: text("description").notNull(), // plain-English
  reason: text("reason"), // why recommended
  trigger: text("trigger").notNull(), // scheduled_run|manual|alert
  confidenceScore: real("confidence_score"), // 0..1
  riskLevel: text("risk_level").default("medium").notNull(), // low|medium|high
  knowledgePass: boolean("knowledge_pass"),
  policyPass: boolean("policy_pass"),
  conflictsDetected: boolean("conflicts_detected"),
  cadencePass: boolean("cadence_pass"),
  cadenceBlockReason: text("cadence_block_reason"),
  status: text("status").default("proposed").notNull(), // proposed|queued|applied|rolled_back|skipped
  skipReason: text("skip_reason"),
  deployWindowId: text("deploy_window_id"),
  metricsBefore: jsonb("metrics_before").$type<Record<string, unknown>>(),
  metricsAfter: jsonb("metrics_after").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  queuedAt: timestamp("queued_at"),
  appliedAt: timestamp("applied_at"),
  rolledBackAt: timestamp("rolled_back_at"),
});

export const insertChangeSchema = createInsertSchema(changes).omit({
  id: true,
  createdAt: true,
});
export type InsertChange = z.infer<typeof insertChangeSchema>;
export type Change = typeof changes.$inferSelect;

// Deploy Windows - batched deployments
export const deployWindows = pgTable("deploy_windows", {
  id: serial("id").primaryKey(),
  deployWindowId: text("deploy_window_id").notNull().unique(), // UUID
  websiteId: text("website_id").notNull(),
  theme: text("theme"), // e.g. "Technical Cleanup"
  scheduledFor: timestamp("scheduled_for").notNull(),
  status: text("status").default("scheduled").notNull(), // scheduled|executed|rolled_back|canceled
  executedAt: timestamp("executed_at"),
  metricsBefore: jsonb("metrics_before").$type<Record<string, unknown>>(),
  metricsAfter: jsonb("metrics_after").$type<Record<string, unknown>>(),
  regressionFlagged: boolean("regression_flagged").default(false),
  regressionReasons: jsonb("regression_reasons").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDeployWindowSchema = createInsertSchema(deployWindows).omit({
  id: true,
  createdAt: true,
});
export type InsertDeployWindow = z.infer<typeof insertDeployWindowSchema>;
export type DeployWindow = typeof deployWindows.$inferSelect;

// Knowledge Base Rules - validation rules for changes
export const kbRules = pgTable("kb_rules", {
  id: serial("id").primaryKey(),
  ruleId: text("rule_id").notNull().unique(),
  version: integer("version").default(1).notNull(),
  category: text("category").notNull(), // cadence|content|technical|indexing|performance|compliance
  description: text("description").notNull(),
  severity: text("severity").default("medium").notNull(), // low|medium|high
  action: text("action").default("warn").notNull(), // allow|warn|block
  conditions: jsonb("conditions").$type<{
    change_type?: string;
    scope?: string;
    website_industry?: string;
    url_pattern?: string;
  }>(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertKbRuleSchema = createInsertSchema(kbRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertKbRule = z.infer<typeof insertKbRuleSchema>;
export type KbRule = typeof kbRules.$inferSelect;

// Website cadence settings (extend sites table or add separate)
export const websiteCadenceSettings = pgTable("website_cadence_settings", {
  id: serial("id").primaryKey(),
  websiteId: text("website_id").notNull().unique(),
  maxDeploysPerWeek: integer("max_deploys_per_week").default(2).notNull(),
  cooldowns: jsonb("cooldowns").$type<{
    content_refresh_days: number;
    title_meta_days: number;
    template_layout_days: number;
    technical_indexing_days: number;
    performance_days: number;
  }>().default({
    content_refresh_days: 7,
    title_meta_days: 14,
    template_layout_days: 21,
    technical_indexing_days: 14,
    performance_days: 7,
  }),
  stabilizationModeUntil: timestamp("stabilization_mode_until"),
  stabilizationReason: text("stabilization_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertWebsiteCadenceSettingsSchema = createInsertSchema(websiteCadenceSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertWebsiteCadenceSettings = z.infer<typeof insertWebsiteCadenceSettingsSchema>;
export type WebsiteCadenceSettings = typeof websiteCadenceSettings.$inferSelect;

// Free Report JSON types for strong typing
export interface FreeReportSummary {
  health_score: number;
  top_issues: Array<{
    title: string;
    explanation: string;
    severity: "low" | "medium" | "high";
    impact: "traffic" | "conversion" | "both";
    mapped_section: "competitors" | "keywords" | "technical" | "performance";
  }>;
  top_opportunities: Array<{
    title: string;
    explanation: string;
    severity: "low" | "medium" | "high";
    impact: "traffic" | "conversion" | "both";
    mapped_section: "competitors" | "keywords" | "technical" | "performance";
  }>;
  estimated_opportunity: {
    traffic_range_monthly: { min: number; max: number } | null;
    leads_range_monthly: { min: number; max: number } | null;
    revenue_range_monthly: { min: number; max: number } | null;
    confidence: "low" | "medium" | "high";
  };
}

export interface FreeReportCompetitor {
  domain: string;
  visibility_index: number;
  keyword_overlap_count: number;
  example_pages: string[];
  notes: string;
}

export interface FreeReportCompetitors {
  items: FreeReportCompetitor[];
  insight: string;
}

export interface FreeReportKeywordTarget {
  keyword: string;
  intent: "high_intent" | "informational";
  volume_range: { min: number; max: number } | null;
  current_bucket: "top_3" | "4_10" | "11_30" | "not_ranking";
  winner_domain: string | null;
}

export interface FreeReportKeywords {
  targets: FreeReportKeywordTarget[];
  bucket_counts: {
    top_3: number;
    "4_10": number;
    "11_30": number;
    not_ranking: number;
  };
  insight: string;
}

export interface FreeReportTechnicalFinding {
  title: string;
  detail: string;
  severity: "low" | "medium" | "high";
  impact: "traffic" | "conversion" | "both";
  example_urls: string[];
}

export interface FreeReportTechnicalBucket {
  name: "Indexing & Crawlability" | "Site Structure & Internal Links" | "On-page Basics" | "Errors & Warnings";
  status: "good" | "needs_attention" | "critical";
  findings: FreeReportTechnicalFinding[];
}

export interface FreeReportTechnical {
  buckets: FreeReportTechnicalBucket[];
}

export interface FreeReportPerformanceUrl {
  url: string;
  lcp_status: "good" | "needs_work" | "poor";
  cls_status: "good" | "needs_work" | "poor";
  inp_status: "good" | "needs_work" | "poor" | "not_available";
  overall: "good" | "needs_attention" | "critical";
}

export interface FreeReportPerformance {
  urls: FreeReportPerformanceUrl[];
  global_insight: string;
}

export interface FreeReportNextSteps {
  if_do_nothing: string[];
  if_you_fix_this: string[];
  ctas: Array<{
    id: "view_full_report" | "deploy_fixes" | "send_to_dev";
    label: string;
    action: "route" | "modal";
    target: string;
  }>;
  implementation_plan: Array<{
    priority: number;
    title: string;
    what_to_change: string;
    where_to_change: string;
    expected_impact: string;
    acceptance_check: string;
  }>;
}

export interface FreeReportMeta {
  generation_status: "complete" | "partial" | "failed";
  missing: {
    competitors_reason?: string;
    keywords_reason?: string;
    rank_reason?: string;
    technical_reason?: string;
    performance_reason?: string;
  };
  raw_metrics?: Record<string, unknown>;
}

// Generated Sites for "No site? No problem" feature
export const generatedSites = pgTable("generated_sites", {
  id: serial("id").primaryKey(),
  siteId: text("site_id").notNull().unique(),
  userId: integer("user_id").references(() => users.id),
  businessName: text("business_name").notNull(),
  businessCategory: text("business_category").notNull(),
  city: text("city"),
  state: text("state"),
  phone: text("phone"),
  email: text("email").notNull(),
  existingWebsite: text("existing_website"),
  description: text("description"),
  services: text("services").array(),
  brandPreference: text("brand_preference").default("modern"),
  colorTheme: text("color_theme").default("violet"),
  domainPreference: text("domain_preference").default("subdomain"),
  customDomain: text("custom_domain"),
  status: text("status").notNull().default("preview_pending"),
  buildState: text("build_state").notNull().default("pending"),
  previewUrl: text("preview_url"),
  heroImageUrl: text("hero_image_url"),
  logoUrl: text("logo_url"),
  userProvidedLogo: boolean("user_provided_logo").default(false),
  userProvidedHero: boolean("user_provided_hero").default(false),
  heroImageStatus: text("hero_image_status").default("pending"),
  previewToken: text("preview_token"),
  configVersion: integer("config_version").default(1),
  generatedPages: jsonb("generated_pages").$type<{
    home?: { title: string; sections: Array<{ type: string; content: string }> };
    services?: { title: string; sections: Array<{ type: string; content: string }> };
    about?: { title: string; sections: Array<{ type: string; content: string }> };
    contact?: { title: string; sections: Array<{ type: string; content: string }> };
  }>(),
  metadata: jsonb("metadata").$type<{
    schema_markup?: Record<string, unknown>;
    meta_tags?: Record<string, string>;
    generationLog?: Array<{ step: string; timestamp: string; status: string }>;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGeneratedSiteSchema = createInsertSchema(generatedSites).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertGeneratedSite = z.infer<typeof insertGeneratedSiteSchema>;
export type GeneratedSite = typeof generatedSites.$inferSelect;

// Background Jobs Queue for async processing
export const siteGenerationJobs = pgTable("site_generation_jobs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  siteId: integer("site_id").references(() => generatedSites.id),
  payloadJson: text("payload_json").notNull(),
  status: text("status").notNull().default("queued"),
  progress: integer("progress").default(0),
  progressMessage: text("progress_message"),
  errorMessage: text("error_message"),
  attempts: integer("attempts").default(0),
  maxAttempts: integer("max_attempts").default(3),
  runAfter: timestamp("run_after").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSiteGenerationJobSchema = createInsertSchema(siteGenerationJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSiteGenerationJob = z.infer<typeof insertSiteGenerationJobSchema>;
export type SiteGenerationJob = typeof siteGenerationJobs.$inferSelect;

// Site Assets for managing logos, images, etc.
export const siteAssets = pgTable("site_assets", {
  id: serial("id").primaryKey(),
  siteId: integer("site_id").references(() => generatedSites.id).notNull(),
  assetType: text("asset_type").notNull(),
  source: text("source").notNull(),
  sourceAssetId: text("source_asset_id"),
  urlOriginal: text("url_original").notNull(),
  urlCached: text("url_cached"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSiteAssetSchema = createInsertSchema(siteAssets).omit({
  id: true,
  createdAt: true,
});
export type InsertSiteAsset = z.infer<typeof insertSiteAssetSchema>;
export type SiteAsset = typeof siteAssets.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════
// CREW IDENTITY SYSTEM TABLES
// ═══════════════════════════════════════════════════════════════════════════

// Crew run results - tracks each worker execution
export const crewRuns = pgTable("crew_runs", {
  id: serial("id").primaryKey(),
  siteId: text("site_id").notNull(),
  crewId: text("crew_id").notNull(),
  status: text("status").notNull().default("pending"), // pending, running, completed, failed
  summary: text("summary"),
  missingOutputs: jsonb("missing_outputs").$type<string[]>(),
  rawPayload: jsonb("raw_payload"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCrewRunSchema = createInsertSchema(crewRuns).omit({
  id: true,
  createdAt: true,
});
export type InsertCrewRun = z.infer<typeof insertCrewRunSchema>;
export type CrewRun = typeof crewRuns.$inferSelect;

// Crew KPIs - normalized metric values from runs
export const crewKpis = pgTable("crew_kpis", {
  id: serial("id").primaryKey(),
  runId: integer("run_id").references(() => crewRuns.id),
  siteId: text("site_id").notNull(),
  crewId: text("crew_id").notNull(),
  metricKey: text("metric_key").notNull(),
  value: real("value"),
  unit: text("unit"),
  trendDelta: real("trend_delta"),
  measuredAt: timestamp("measured_at").defaultNow().notNull(),
});

export const insertCrewKpiSchema = createInsertSchema(crewKpis).omit({
  id: true,
});
export type InsertCrewKpi = z.infer<typeof insertCrewKpiSchema>;
export type CrewKpi = typeof crewKpis.$inferSelect;

// Crew findings - issues/recommendations from runs
export const crewFindings = pgTable("crew_findings", {
  id: serial("id").primaryKey(),
  runId: integer("run_id").references(() => crewRuns.id),
  siteId: text("site_id").notNull(),
  crewId: text("crew_id").notNull(),
  severity: text("severity").notNull(), // critical, high, medium, low, info
  title: text("title").notNull(),
  description: text("description"),
  category: text("category"),
  meta: jsonb("meta"),
  surfacedAt: timestamp("surfaced_at").defaultNow().notNull(),
});

export const insertCrewFindingSchema = createInsertSchema(crewFindings).omit({
  id: true,
});
export type InsertCrewFinding = z.infer<typeof insertCrewFindingSchema>;
export type CrewFinding = typeof crewFindings.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════
// SOCRATES LEARNING METHODOLOGY TABLES
// ═══════════════════════════════════════════════════════════════════════════

// Agent Action Logs - append-only log of all agent actions
export const agentActionLogs = pgTable("agent_action_logs", {
  id: serial("id").primaryKey(),
  actionId: text("action_id").notNull().unique(),
  agentId: text("agent_id").notNull(), // crew id like 'scotty', 'beacon', 'draper'
  siteId: text("site_id").notNull(),
  env: text("env").notNull(), // 'dev' or 'prod'
  timestampStart: timestamp("timestamp_start").notNull(),
  timestampEnd: timestamp("timestamp_end"),
  actionType: text("action_type").notNull(), // 'crawl', 'deploy', 'content_update', 'config_change', 'integration_setup', 'run'
  targets: jsonb("targets"), // array of urls, files, configs
  diffSummary: text("diff_summary"), // if code/content changed
  commitSha: text("commit_sha"),
  deployId: text("deploy_id"),
  jobId: text("job_id"),
  runId: text("run_id"),
  expectedImpact: jsonb("expected_impact"), // metrics expected to move
  riskLevel: text("risk_level"), // 'low', 'med', 'high'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAgentActionLogSchema = createInsertSchema(agentActionLogs).omit({
  id: true,
  createdAt: true,
});
export type InsertAgentActionLog = z.infer<typeof insertAgentActionLogSchema>;
export type AgentActionLog = typeof agentActionLogs.$inferSelect;

// Outcome Event Logs - append-only log of observed outcomes
export const outcomeEventLogs = pgTable("outcome_event_logs", {
  id: serial("id").primaryKey(),
  eventId: text("event_id").notNull().unique(),
  siteId: text("site_id").notNull(),
  env: text("env").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  eventType: text("event_type").notNull(), // 'regression', 'improvement', 'breakage', 'anomaly'
  metricKey: text("metric_key").notNull(), // crawl_health, pages_losing_traffic, domain_authority, LCP, indexing_coverage, clicks, etc.
  oldValue: real("old_value"),
  newValue: real("new_value"),
  delta: real("delta"),
  severity: text("severity"), // 'low', 'med', 'high'
  detectionSource: text("detection_source"), // 'scheduler', 'monitor', 'manual'
  context: jsonb("context"), // urls affected, error codes, affected templates
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertOutcomeEventLogSchema = createInsertSchema(outcomeEventLogs).omit({
  id: true,
  createdAt: true,
});
export type InsertOutcomeEventLog = z.infer<typeof insertOutcomeEventLogSchema>;
export type OutcomeEventLog = typeof outcomeEventLogs.$inferSelect;

// Attribution Records - links outcomes to candidate actions
export const attributionRecords = pgTable("attribution_records", {
  id: serial("id").primaryKey(),
  attributionId: text("attribution_id").notNull().unique(),
  siteId: text("site_id").notNull(),
  env: text("env").notNull(),
  eventId: text("event_id").notNull(), // references outcomeEventLogs.eventId
  candidateActionIds: jsonb("candidate_action_ids"), // array of actionIds
  timeProximityScore: real("time_proximity_score"), // 0-1
  changeSurfaceScore: real("change_surface_score"), // 0-1
  historicalLikelihoodScore: real("historical_likelihood_score"), // 0-1
  confounders: jsonb("confounders"), // array of possible causes
  confidence: real("confidence").notNull(), // 0-1
  explanation: text("explanation"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAttributionRecordSchema = createInsertSchema(attributionRecords).omit({
  id: true,
  createdAt: true,
});
export type InsertAttributionRecord = z.infer<typeof insertAttributionRecordSchema>;
export type AttributionRecord = typeof attributionRecords.$inferSelect;

// Socrates Knowledge Base Entries - learnings derived from attribution
export const socratesKbEntries = pgTable("socrates_kb_entries", {
  id: serial("id").primaryKey(),
  kbId: text("kb_id").notNull().unique(),
  title: text("title").notNull(),
  problemStatement: text("problem_statement").notNull(),
  contextScope: jsonb("context_scope").notNull(), // metricKeys[], siteArchetype, techStack, pageType, environment
  triggerPattern: text("trigger_pattern"), // what signals to look for
  rootCauseHypothesis: text("root_cause_hypothesis"),
  evidence: jsonb("evidence").notNull(), // eventIds[], actionIds[], diffs, beforeAfter
  recommendedAction: text("recommended_action"),
  avoidAction: text("avoid_action"),
  guardrail: text("guardrail"),
  confidence: real("confidence").notNull(), // 0-1
  status: text("status").notNull().default("draft"), // 'draft', 'active', 'deprecated'
  tags: jsonb("tags"), // array of tags
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSocratesKbEntrySchema = createInsertSchema(socratesKbEntries).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSocratesKbEntry = z.infer<typeof insertSocratesKbEntrySchema>;
export type SocratesKbEntry = typeof socratesKbEntries.$inferSelect;

// SEO Reports - stores reports generated by the SERP Worker
export const seoReports = pgTable("seo_reports", {
  id: serial("id").primaryKey(),
  siteId: text("site_id").notNull(),
  reportId: text("report_id").notNull().unique(),
  domain: text("domain").notNull(),
  email: text("email"),
  status: text("status").notNull().default("queued"), // queued, running, complete, failed
  reportJson: jsonb("report_json"),
  errorMessage: text("error_message"),
  source: text("source").default("free_report"), // free_report, scheduled, manual
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const insertSeoReportSchema = createInsertSchema(seoReports).omit({
  id: true,
  createdAt: true,
});
export type InsertSeoReport = z.infer<typeof insertSeoReportSchema>;
export type SeoReport = typeof seoReports.$inferSelect;

// Completed Work - tracks recommendations that have been completed (for fingerprinting)
export const completedWork = pgTable("completed_work", {
  id: serial("id").primaryKey(),
  siteId: text("site_id").notNull(),
  domain: text("domain").notNull(),
  fingerprint: text("fingerprint").notNull(), // SHA1 hash for deduplication
  page: text("page"), // URL path of the affected page
  workType: text("work_type").notNull(), // on_page_seo, technical_seo, content, authority, analytics
  action: text("action").notNull(), // Description of what was done
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCompletedWorkSchema = createInsertSchema(completedWork).omit({
  id: true,
  createdAt: true,
});
export type InsertCompletedWork = z.infer<typeof insertCompletedWorkSchema>;
export type CompletedWork = typeof completedWork.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════
// HERMES RECOMMENDATIONS - Canonical recommendation schema
// ═══════════════════════════════════════════════════════════════════════════

export const hermesRecommendations = pgTable("hermes_recommendations", {
  id: text("id").primaryKey(), // UUID
  siteId: text("site_id").notNull(), // references sites.siteId
  category: text("category").notNull(), // 'technical', 'content', 'authority', 'performance'
  agentSources: text("agent_sources").array().notNull(), // array of agent IDs that contributed
  priority: integer("priority").notNull(), // 1-100, higher = more important
  confidence: text("confidence").notNull(), // 'full' | 'degraded'
  missingInputs: text("missing_inputs").array(), // what's missing when degraded
  phase: text("phase").notNull(), // 'now' | 'next' | 'later'
  action: text("action").notNull(), // concise imperative, e.g., "Add FAQ schema to service pages"
  steps: jsonb("steps").$type<string[]>(), // array of implementation steps
  evidence: jsonb("evidence").$type<{
    inputs?: Record<string, any>;
    urls?: string[];
    keywords?: string[];
    timestamps?: string[];
  }>(), // inputs, URLs, keywords, timestamps
  definitionOfDone: text("definition_of_done"),
  dependencies: text("dependencies").array(), // configure/purchase/prerequisites
  risks: text("risks").array(),
  kbaseRefs: text("kbase_refs").array(), // doctrine or weekly learnings
  status: text("status").notNull().default("open"), // 'open' | 'acknowledged' | 'exported' | 'applied' | 'invalidated'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertHermesRecommendationSchema = createInsertSchema(hermesRecommendations).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertHermesRecommendation = z.infer<typeof insertHermesRecommendationSchema>;
export type HermesRecommendation = typeof hermesRecommendations.$inferSelect;

// ═══════════════════════════════════════════════════════════════════════════
// JOB QUEUE - Unified job queue for Hermes → Worker communication
// ═══════════════════════════════════════════════════════════════════════════

export const JobQueueStatuses = {
  QUEUED: 'queued',
  CLAIMED: 'claimed',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;
export type JobQueueStatus = typeof JobQueueStatuses[keyof typeof JobQueueStatuses];

export const jobQueue = pgTable("job_queue", {
  id: serial("id").primaryKey(),
  jobId: text("job_id").notNull().unique(), // UUID for job identification
  runId: text("run_id").notNull(), // UUID grouping related jobs in a single run
  service: text("service").notNull(), // e.g., 'rank-tracker', 'content-analyzer'
  action: text("action").notNull(), // e.g., 'run', 'check', 'sync'
  websiteId: text("website_id"), // nullable - site context
  params: jsonb("params").$type<Record<string, any>>().default({}), // action-specific parameters
  status: text("status").notNull().default("queued"), // queued, claimed, running, completed, failed
  priority: integer("priority").default(50), // 1-100, higher = more urgent
  claimedBy: text("claimed_by"), // worker instance ID that claimed the job
  claimedAt: timestamp("claimed_at"), // when the job was claimed
  result: jsonb("result").$type<Record<string, any>>(), // output from worker
  errorMessage: text("error_message"), // error details if failed
  attempts: integer("attempts").default(0), // retry tracking
  maxAttempts: integer("max_attempts").default(3),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"), // when worker started processing
  completedAt: timestamp("completed_at"), // when job finished (success or failure)
});

export const insertJobQueueSchema = createInsertSchema(jobQueue).omit({
  id: true,
  createdAt: true,
});
export type InsertJobQueue = z.infer<typeof insertJobQueueSchema>;
export type JobQueue = typeof jobQueue.$inferSelect;

// ============================================================
// Website Registry - Managed target websites
// ============================================================

export const websiteStatusEnum = ["active", "paused"] as const;
export type WebsiteStatus = typeof websiteStatusEnum[number];

export const managedWebsites = pgTable("managed_websites", {
  id: text("id").primaryKey(), // UUID
  name: text("name").notNull(),
  domain: text("domain").notNull().unique(),
  status: text("status").notNull().default("active"), // active | paused
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertManagedWebsiteSchema = createInsertSchema(managedWebsites).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertManagedWebsite = z.infer<typeof insertManagedWebsiteSchema>;
export type ManagedWebsite = typeof managedWebsites.$inferSelect;

// Website Settings - Competitors, enabled services, notes
export const managedWebsiteSettings = pgTable("managed_website_settings", {
  id: serial("id").primaryKey(),
  websiteId: text("website_id").notNull().references(() => managedWebsites.id, { onDelete: "cascade" }),
  competitors: jsonb("competitors").$type<string[]>().default([]),
  targetServicesEnabled: jsonb("target_services_enabled").$type<string[]>().default([]),
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertManagedWebsiteSettingsSchema = createInsertSchema(managedWebsiteSettings).omit({
  id: true,
  updatedAt: true,
});
export type InsertManagedWebsiteSettings = z.infer<typeof insertManagedWebsiteSettingsSchema>;
export type ManagedWebsiteSettings = typeof managedWebsiteSettings.$inferSelect;

// Website Integrations - References to secrets, not raw values
export const managedWebsiteIntegrations = pgTable("managed_website_integrations", {
  id: serial("id").primaryKey(),
  websiteId: text("website_id").notNull().references(() => managedWebsites.id, { onDelete: "cascade" }),
  integrationType: text("integration_type").notNull(), // e.g., 'github_pr', 'cms_api', 'vercel_deploy'
  config: jsonb("config").$type<Record<string, string>>().default({}), // secret key names, NOT raw secrets
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertManagedWebsiteIntegrationSchema = createInsertSchema(managedWebsiteIntegrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertManagedWebsiteIntegration = z.infer<typeof insertManagedWebsiteIntegrationSchema>;
export type ManagedWebsiteIntegration = typeof managedWebsiteIntegrations.$inferSelect;
