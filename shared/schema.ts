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

// GA4 Daily Snapshots
export const ga4Daily = pgTable("ga4_daily", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD
  sessions: integer("sessions").notNull(),
  users: integer("users").notNull(),
  events: integer("events").notNull(),
  conversions: integer("conversions").notNull(),
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
  intent: text("intent"), // informational, transactional, navigational
  priority: integer("priority").default(50), // 1-100
  targetUrl: text("target_url"), // Expected landing page
  tags: text("tags").array(), // e.g., ["therapy", "local", "branded"]
  active: boolean("active").default(true),
  lastChecked: timestamp("last_checked"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSerpKeywordSchema = createInsertSchema(serpKeywords).omit({
  id: true,
  createdAt: true,
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
  category: text("category").notNull(), // crawlability, indexation, content, performance, structured_data, internal_links, analytics, ads, security_headers
  severity: text("severity").notNull(), // critical, high, medium, low
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
