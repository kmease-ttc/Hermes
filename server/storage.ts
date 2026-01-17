import { db } from "./db";
import crypto from "crypto";
import { 
  oauthTokens,
  users,
  ga4Daily, 
  gscDaily, 
  adsDaily, 
  webChecksDaily,
  reports,
  tickets,
  config,
  runs,
  gscPageDaily,
  gscQueryDaily,
  ga4LandingDaily,
  anomalies,
  hypotheses,
  serpKeywords,
  serpRankings,
  sites,
  findings,
  auditLogs,
  siteIntegrations,
  vaultConfig,
  actionRuns,
  integrations,
  integrationChecks,
  serviceRuns,
  diagnosticRuns,
  qaRuns,
  qaRunItems,
  testJobs,
  artifacts,
  runContexts,
  contentDrafts,
  serviceEvents,
  changeProposals,
  changeProposalActions,
  connectorDiagnostics,
  crewState,
  type CrewState,
  type InsertCrewState,
  crewRuns,
  type CrewRun,
  type InsertCrewRun,
  crewKpis,
  type CrewKpi,
  type InsertCrewKpi,
  crewFindings,
  type CrewFinding,
  type InsertCrewFinding,
  fixPlans,
  type FixPlan,
  type InsertFixPlan,
  integrationStatusCache,
  type IntegrationStatusCache,
  type InsertIntegrationStatusCache,
  dashboardMetricSnapshots,
  type DashboardMetricSnapshot,
  type InsertDashboardMetricSnapshot,
  actionApprovals,
  type ActionApproval,
  type InsertActionApproval,
  seoAgentSnapshots,
  type SeoAgentSnapshot,
  type InsertSeoAgentSnapshot,
  seoAgentCompetitors,
  type SeoAgentCompetitor,
  type InsertSeoAgentCompetitor,
  type OAuthToken,
  type InsertOAuthToken,
  type User,
  type InsertUser,
  type GA4Daily,
  type InsertGA4Daily,
  type GSCDaily,
  type InsertGSCDaily,
  type AdsDaily,
  type InsertAdsDaily,
  type WebChecksDaily,
  type InsertWebChecksDaily,
  type Report,
  type InsertReport,
  type Ticket,
  type InsertTicket,
  type Config,
  type InsertConfig,
  type Run,
  type InsertRun,
  type GscPageDaily,
  type InsertGscPageDaily,
  type GscQueryDaily,
  type InsertGscQueryDaily,
  type Ga4LandingDaily,
  type InsertGa4LandingDaily,
  type Anomaly,
  type InsertAnomaly,
  type Hypothesis,
  type InsertHypothesis,
  type SerpKeyword,
  type InsertSerpKeyword,
  type SerpRanking,
  type InsertSerpRanking,
  type Site,
  type InsertSite,
  type Finding,
  type InsertFinding,
  type AuditLog,
  type InsertAuditLog,
  type SiteIntegration,
  type InsertSiteIntegration,
  type VaultConfig,
  type InsertVaultConfig,
  type ActionRun,
  type InsertActionRun,
  type Integration,
  type InsertIntegration,
  type IntegrationCheck,
  type InsertIntegrationCheck,
  type ServiceRun,
  type InsertServiceRun,
  type DiagnosticRun,
  type InsertDiagnosticRun,
  type QaRun,
  type InsertQaRun,
  type QaRunItem,
  type InsertQaRunItem,
  type TestJob,
  type InsertTestJob,
  type TestJobProgress,
  type Artifact,
  type InsertArtifact,
  type RunContext,
  type InsertRunContext,
  type ContentDraft,
  type InsertContentDraft,
  type ServiceEvent,
  type InsertServiceEvent,
  type ChangeProposal,
  type InsertChangeProposal,
  type ChangeProposalAction,
  type InsertChangeProposalAction,
  type ConnectorDiagnostic,
  type InsertConnectorDiagnostic,
  industryBenchmarks,
  type IndustryBenchmark,
  type InsertIndustryBenchmark,
  seoWorkerResults,
  type SeoWorkerResult,
  type InsertSeoWorkerResult,
  seoMetricEvents,
  type SeoMetricEvent,
  type InsertSeoMetricEvent,
  aiFindings,
  type AiFinding,
  type InsertAiFinding,
  aiSnapshots,
  type AiSnapshot,
  type InsertAiSnapshot,
  draperSettings,
  type DraperSettings,
  type InsertDraperSettings,
  draperActionQueue,
  type DraperAction,
  type InsertDraperAction,
  seoSuggestions,
  type SeoSuggestion,
  type InsertSeoSuggestion,
  seoKbaseInsights,
  type SeoKbaseInsight,
  type InsertSeoKbaseInsight,
  seoRuns,
  type SeoRun,
  type InsertSeoRun,
  achievementTracks,
  type AchievementTrack,
  type InsertAchievementTrack,
  ACHIEVEMENT_TIERS,
  kbInsights,
  type KbInsight,
  type InsertKbInsight,
  kbRecommendations,
  type KbRecommendation,
  type InsertKbRecommendation,
  seoAgentCompetitors,
  type SeoAgentCompetitor,
  type InsertSeoAgentCompetitor,
  agentAchievements,
  type AgentAchievement,
  type InsertAgentAchievement,
  apiKeys,
  type ApiKey,
  type InsertApiKey,
  websiteIntegrations,
  type WebsiteIntegration,
  type InsertWebsiteIntegration,
  coreWebVitalsDaily,
  type CoreWebVitalsDaily,
  type InsertCoreWebVitalsDaily,
  freeReports,
  type FreeReport,
  type InsertFreeReport,
  verificationTokens,
  type VerificationToken,
  type InsertVerificationToken,
  reportShares,
  type ReportShare,
  type InsertReportShare,
  agentActionLogs,
  type AgentActionLog,
  type InsertAgentActionLog,
  outcomeEventLogs,
  type OutcomeEventLog,
  type InsertOutcomeEventLog,
  attributionRecords,
  type AttributionRecord,
  type InsertAttributionRecord,
  socratesKbEntries,
  type SocratesKbEntry,
  type InsertSocratesKbEntry,
} from "@shared/schema";
import { eq, desc, and, gte, sql, asc, or, isNull, arrayContains } from "drizzle-orm";

export interface IStorage {
  // OAuth Token Management
  saveToken(token: InsertOAuthToken): Promise<OAuthToken>;
  getToken(provider: string): Promise<OAuthToken | undefined>;
  updateToken(provider: string, token: Partial<InsertOAuthToken>): Promise<void>;
  
  // GA4 Data
  saveGA4Data(data: InsertGA4Daily[]): Promise<void>;
  getGA4DataByDateRange(startDate: string, endDate: string, siteId?: string): Promise<GA4Daily[]>;
  upsertGA4Daily(data: InsertGA4Daily): Promise<void>;
  
  // GSC Data
  saveGSCData(data: InsertGSCDaily[]): Promise<void>;
  getGSCDataByDateRange(startDate: string, endDate: string, siteId?: string): Promise<GSCDaily[]>;
  upsertGSCDaily(data: InsertGSCDaily): Promise<void>;
  
  // Ads Data
  saveAdsData(data: InsertAdsDaily[]): Promise<void>;
  getAdsDataByDateRange(startDate: string, endDate: string): Promise<AdsDaily[]>;
  
  // Website Checks
  saveWebChecks(checks: InsertWebChecksDaily[]): Promise<void>;
  getWebChecksByDate(date: string): Promise<WebChecksDaily[]>;
  
  // Reports
  saveReport(report: InsertReport): Promise<Report>;
  getLatestReport(): Promise<Report | undefined>;
  getReportsByDateRange(startDate: string, endDate: string): Promise<Report[]>;
  
  // Tickets
  saveTicket(ticket: InsertTicket): Promise<Ticket>;
  saveTickets(tickets: InsertTicket[]): Promise<Ticket[]>;
  getLatestTickets(limit?: number): Promise<Ticket[]>;
  getTicketById(ticketId: string): Promise<Ticket | undefined>;
  updateTicketStatus(ticketId: string, status: string): Promise<void>;
  
  // Config
  getConfig(key: string): Promise<string | undefined>;
  setConfig(key: string, value: string): Promise<void>;
  
  // Runs
  saveRun(run: InsertRun): Promise<Run>;
  updateRun(runId: string, updates: Partial<InsertRun>): Promise<Run | undefined>;
  getLatestRun(): Promise<Run | undefined>;
  getRunById(runId: string): Promise<Run | undefined>;
  getRunsByDateRange(startDate: Date, endDate: Date): Promise<Run[]>;
  getCompletedRunForDate(date: string): Promise<Run | undefined>;
  getRecentRuns(limit: number): Promise<Run[]>;
  getReportById(id: number): Promise<Report | undefined>;
  
  // GSC Page Daily
  saveGscPageData(data: InsertGscPageDaily[]): Promise<void>;
  getGscPageDataByRunId(runId: string): Promise<GscPageDaily[]>;
  
  // GSC Query Daily
  saveGscQueryData(data: InsertGscQueryDaily[]): Promise<void>;
  getGscQueryDataByRunId(runId: string): Promise<GscQueryDaily[]>;
  
  // GA4 Landing Daily
  saveGa4LandingData(data: InsertGa4LandingDaily[]): Promise<void>;
  getGa4LandingDataByRunId(runId: string): Promise<Ga4LandingDaily[]>;
  
  // Anomalies
  saveAnomalies(data: InsertAnomaly[]): Promise<Anomaly[]>;
  getAnomaliesByRunId(runId: string): Promise<Anomaly[]>;
  getRecentAnomalies(siteId: string, days: number): Promise<Anomaly[]>;
  
  // Hypotheses
  saveHypotheses(data: InsertHypothesis[]): Promise<Hypothesis[]>;
  getHypothesesByRunId(runId: string): Promise<Hypothesis[]>;
  
  // Tickets by Run
  getTicketsByRunId(runId: string): Promise<Ticket[]>;
  
  // SERP Keywords
  getSerpKeywords(activeOnly?: boolean): Promise<SerpKeyword[]>;
  getSerpKeywordById(id: number): Promise<SerpKeyword | undefined>;
  saveSerpKeyword(keyword: InsertSerpKeyword): Promise<SerpKeyword>;
  saveSerpKeywords(keywords: InsertSerpKeyword[]): Promise<SerpKeyword[]>;
  updateSerpKeyword(id: number, updates: Partial<InsertSerpKeyword>): Promise<void>;
  deleteSerpKeyword(id: number): Promise<void>;
  
  // SERP Rankings
  saveSerpRankings(rankings: InsertSerpRanking[]): Promise<SerpRanking[]>;
  getLatestRankings(): Promise<(SerpRanking & { keyword: string })[]>;
  getRankingHistoryByKeyword(keywordId: number, limit?: number): Promise<SerpRanking[]>;
  getRankingsByDate(date: string): Promise<SerpRanking[]>;
  getAllRankingsWithHistory(days: number): Promise<SerpRanking[]>;
  
  // SEO Agent Snapshots
  saveAgentSnapshot(snapshot: InsertSeoAgentSnapshot): Promise<SeoAgentSnapshot>;
  getAgentSnapshots(agentSlug: string, siteId?: string, limit?: number): Promise<SeoAgentSnapshot[]>;
  
  // Sites Registry
  getSites(activeOnly?: boolean): Promise<Site[]>;
  getSiteById(siteId: string): Promise<Site | undefined>;
  createSite(site: InsertSite): Promise<Site>;
  updateSite(siteId: string, updates: Partial<InsertSite>): Promise<Site | undefined>;
  deleteSite(siteId: string): Promise<void>;
  updateSiteHealthScore(siteId: string, score: number): Promise<void>;
  updateSiteLastDiagnosis(siteId: string): Promise<void>;
  
  // Findings
  saveFindings(findings: InsertFinding[]): Promise<Finding[]>;
  getFindingsBySite(siteId: string, status?: string): Promise<Finding[]>;
  getFindingsBySource(siteId: string, sourceIntegration: string, limit?: number): Promise<Finding[]>;
  getFindingsCount(siteId: string, sourceIntegration?: string): Promise<number>;
  getLatestFindings(siteId: string, limit?: number): Promise<Finding[]>;
  updateFindingStatus(findingId: string, status: string): Promise<void>;
  
  // Audit Logs
  saveAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogsBySite(siteId: string, limit?: number): Promise<AuditLog[]>;
  getAllAuditLogs(limit?: number): Promise<AuditLog[]>;
  getRecentMissionCompletions(siteId: string, crewId: string, hours: number): Promise<AuditLog[]>;
  saveMissionExecution(params: {
    siteId: string;
    crewId: string;
    missionId: string;
    runId: string;
    status: 'success' | 'failed';
    summary: string;
    metadata?: Record<string, any>;
  }): Promise<AuditLog>;
  
  // Site Integrations
  getSiteIntegrations(siteId: string): Promise<SiteIntegration[]>;
  getSiteIntegration(siteId: string, integrationType: string): Promise<SiteIntegration | undefined>;
  saveSiteIntegration(integration: InsertSiteIntegration): Promise<SiteIntegration>;
  updateSiteIntegration(id: number, updates: Partial<InsertSiteIntegration>): Promise<SiteIntegration | undefined>;
  deleteSiteIntegration(id: number): Promise<void>;
  
  // Vault Config
  getVaultConfig(): Promise<VaultConfig | undefined>;
  saveVaultConfig(configData: InsertVaultConfig): Promise<VaultConfig>;
  updateVaultConfig(id: number, updates: Partial<InsertVaultConfig>): Promise<VaultConfig | undefined>;
  
  // Action Runs
  createActionRun(run: InsertActionRun): Promise<ActionRun>;
  updateActionRun(runId: string, updates: Partial<InsertActionRun>): Promise<ActionRun | undefined>;
  getActionRunsByAnomaly(siteId: string, anomalyId: string): Promise<ActionRun[]>;
  getActionRunById(runId: string): Promise<ActionRun | undefined>;
  getLatestActionRuns(siteId: string, limit?: number): Promise<ActionRun[]>;
  
  // GSC Daily for ActionRunner
  getGSCDailyByDateRange(startDate: string, endDate: string): Promise<GSCDaily[]>;
  
  // Platform Integrations
  getIntegrations(): Promise<Integration[]>;
  getIntegrationById(integrationId: string): Promise<Integration | undefined>;
  createIntegration(integration: InsertIntegration): Promise<Integration>;
  updateIntegration(integrationId: string, updates: Partial<InsertIntegration>): Promise<Integration | undefined>;
  deleteIntegration(integrationId: string): Promise<void>;
  
  // Integration Health Checks
  saveIntegrationCheck(check: InsertIntegrationCheck): Promise<IntegrationCheck>;
  getIntegrationChecks(integrationId: string, limit?: number): Promise<IntegrationCheck[]>;
  getLatestIntegrationChecks(): Promise<IntegrationCheck[]>;
  
  // Diagnostic Runs
  createDiagnosticRun(run: InsertDiagnosticRun): Promise<DiagnosticRun>;
  updateDiagnosticRun(runId: string, updates: Partial<InsertDiagnosticRun>): Promise<DiagnosticRun | undefined>;
  getDiagnosticRunById(runId: string): Promise<DiagnosticRun | undefined>;
  getDiagnosticRunsBySite(siteId: string, limit?: number): Promise<DiagnosticRun[]>;
  getLatestDiagnosticRuns(limit?: number): Promise<DiagnosticRun[]>;
  
  // Service Runs
  createServiceRun(run: InsertServiceRun): Promise<ServiceRun>;
  updateServiceRun(runId: string, updates: Partial<InsertServiceRun>): Promise<ServiceRun | undefined>;
  getServiceRunById(runId: string): Promise<ServiceRun | undefined>;
  getServiceRunsByService(serviceId: string, limit?: number): Promise<ServiceRun[]>;
  getServiceRunsBySite(siteId: string, limit?: number): Promise<ServiceRun[]>;
  getLatestServiceRuns(limit?: number): Promise<ServiceRun[]>;
  getLastRunPerService(): Promise<Map<string, ServiceRun>>;
  getLastRunPerServiceBySite(siteId: string): Promise<Map<string, ServiceRun>>;
  getServicesWithLastRun(): Promise<Array<Integration & { lastRun: ServiceRun | null }>>;
  
  // QA Runs
  createQaRun(run: InsertQaRun): Promise<QaRun>;
  updateQaRun(runId: string, updates: Partial<InsertQaRun>): Promise<QaRun | undefined>;
  getQaRunById(runId: string): Promise<QaRun | undefined>;
  getLatestQaRuns(limit?: number): Promise<QaRun[]>;
  createQaRunItem(item: InsertQaRunItem): Promise<QaRunItem>;
  getQaRunItems(qaRunId: string): Promise<QaRunItem[]>;
  
  // Hub-and-Spoke: Artifacts
  createArtifact(artifact: InsertArtifact): Promise<Artifact>;
  getArtifactById(artifactId: string): Promise<Artifact | undefined>;
  getArtifactsByType(type: string, websiteId?: string): Promise<Artifact[]>;
  getArtifactsByRunContext(runContextId: string): Promise<Artifact[]>;
  getArtifactsByProducer(producerService: string, limit?: number): Promise<Artifact[]>;
  
  // Hub-and-Spoke: Run Contexts
  createRunContext(context: InsertRunContext): Promise<RunContext>;
  updateRunContext(runId: string, updates: Partial<InsertRunContext>): Promise<RunContext | undefined>;
  getRunContextById(runId: string): Promise<RunContext | undefined>;
  getRunContextsByWorkflow(workflowName: string, limit?: number): Promise<RunContext[]>;
  getRunContextsByWebsite(websiteId: string, limit?: number): Promise<RunContext[]>;
  getActiveRunContexts(): Promise<RunContext[]>;
  
  // Hub-and-Spoke: Content Drafts
  createContentDraft(draft: InsertContentDraft): Promise<ContentDraft>;
  updateContentDraft(draftId: string, updates: Partial<InsertContentDraft>): Promise<ContentDraft | undefined>;
  getContentDraftById(draftId: string): Promise<ContentDraft | undefined>;
  getContentDraftsByWebsite(websiteId: string, limit?: number): Promise<ContentDraft[]>;
  getContentDraftsByState(state: string): Promise<ContentDraft[]>;
  getContentDraftsByDateRange(websiteId: string, startDate: Date, endDate: Date): Promise<ContentDraft[]>;
  
  // Hub-and-Spoke: Service Events
  createServiceEvent(event: InsertServiceEvent): Promise<ServiceEvent>;
  updateServiceEvent(eventId: string, updates: Partial<InsertServiceEvent>): Promise<ServiceEvent | undefined>;
  getServiceEventById(eventId: string): Promise<ServiceEvent | undefined>;
  getPendingNotifications(): Promise<ServiceEvent[]>;
  getServiceEventsByWebsite(websiteId: string, limit?: number): Promise<ServiceEvent[]>;
  
  // Test Jobs (async connection/smoke test tracking)
  createTestJob(job: InsertTestJob): Promise<TestJob>;
  updateTestJob(jobId: string, updates: Partial<InsertTestJob>): Promise<TestJob | undefined>;
  getTestJobById(jobId: string): Promise<TestJob | undefined>;
  getLatestTestJobs(limit?: number): Promise<TestJob[]>;
  getRunningTestJobs(): Promise<TestJob[]>;
  
  // Service Runs by Type (for latest smoke run consistency)
  getLatestServiceRunsByType(runType: string): Promise<Map<string, ServiceRun>>;
  
  // Connector Diagnostics (stage-by-stage smoke test results)
  createConnectorDiagnostic(diagnostic: InsertConnectorDiagnostic): Promise<ConnectorDiagnostic>;
  updateConnectorDiagnostic(runId: string, updates: Partial<InsertConnectorDiagnostic>): Promise<ConnectorDiagnostic | undefined>;
  getConnectorDiagnosticByRunId(runId: string): Promise<ConnectorDiagnostic | undefined>;
  getConnectorDiagnosticsByService(serviceId: string, limit?: number): Promise<ConnectorDiagnostic[]>;
  getLatestConnectorDiagnostic(serviceId: string, siteId?: string): Promise<ConnectorDiagnostic | undefined>;
  
  // Industry Benchmarks
  getBenchmarksByIndustry(industry: string): Promise<IndustryBenchmark[]>;
  getAllBenchmarks(): Promise<IndustryBenchmark[]>;
  getAvailableIndustries(): Promise<string[]>;
  saveBenchmarks(benchmarks: InsertIndustryBenchmark[]): Promise<IndustryBenchmark[]>;
  
  // SEO Worker Results
  saveSeoWorkerResult(result: InsertSeoWorkerResult): Promise<SeoWorkerResult>;
  saveSeoWorkerResults(results: InsertSeoWorkerResult[]): Promise<SeoWorkerResult[]>;
  getSeoWorkerResultsByRunId(runId: string): Promise<SeoWorkerResult[]>;
  getSeoWorkerResultsBySite(siteId: string, limit?: number): Promise<SeoWorkerResult[]>;
  getLatestSeoWorkerResults(siteId: string): Promise<SeoWorkerResult[]>;
  getLatestWorkerResultByKey(siteId: string, workerKey: string): Promise<SeoWorkerResult | undefined>;
  updateSeoWorkerResult(id: number, updates: Partial<InsertSeoWorkerResult>): Promise<SeoWorkerResult | undefined>;
  getSeoWorkerResultsByDateRange(siteId: string, workerKey: string, startDate: Date, endDate: Date): Promise<SeoWorkerResult[]>;
  
  // SEO Metric Events (normalized metrics with canonical keys)
  saveMetricEvent(event: InsertSeoMetricEvent): Promise<SeoMetricEvent>;
  saveMetricEvents(events: InsertSeoMetricEvent[]): Promise<SeoMetricEvent[]>;
  getLatestMetricsByService(siteId: string, serviceId: string): Promise<SeoMetricEvent | undefined>;
  getLatestMetricsBySite(siteId: string): Promise<SeoMetricEvent[]>;
  getAllLatestMetrics(siteId: string): Promise<Record<string, any>>;
  
  // SEO Suggestions
  saveSeoSuggestion(suggestion: InsertSeoSuggestion): Promise<SeoSuggestion>;
  saveSeoSuggestions(suggestions: InsertSeoSuggestion[]): Promise<SeoSuggestion[]>;
  getSeoSuggestionsByRunId(runId: string): Promise<SeoSuggestion[]>;
  getSeoSuggestionsBySite(siteId: string, status?: string, limit?: number): Promise<SeoSuggestion[]>;
  getLatestSeoSuggestions(siteId: string, limit?: number): Promise<SeoSuggestion[]>;
  updateSeoSuggestionStatus(suggestionId: string, status: string): Promise<void>;
  getSeoSuggestionById(suggestionId: string): Promise<SeoSuggestion | undefined>;
  getSuggestionsByAgent(siteId: string, agentId: string, limit?: number): Promise<SeoSuggestion[]>;
  getFindingsByAgent(siteId: string, agentId: string, limit?: number): Promise<Finding[]>;
  
  // SEO KBase Insights
  saveSeoKbaseInsight(insight: InsertSeoKbaseInsight): Promise<SeoKbaseInsight>;
  saveSeoKbaseInsights(insights: InsertSeoKbaseInsight[]): Promise<SeoKbaseInsight[]>;
  getSeoKbaseInsightsByRunId(runId: string): Promise<SeoKbaseInsight[]>;
  getSeoKbaseInsightsBySite(siteId: string, limit?: number): Promise<SeoKbaseInsight[]>;
  getLatestSeoKbaseInsights(siteId: string, limit?: number): Promise<SeoKbaseInsight[]>;
  
  // SEO Runs (orchestration tracking)
  createSeoRun(run: InsertSeoRun): Promise<SeoRun>;
  getSeoRunById(runId: string): Promise<SeoRun | undefined>;
  updateSeoRun(runId: string, updates: Partial<InsertSeoRun>): Promise<SeoRun | undefined>;
  getLatestSeoRun(siteId: string): Promise<SeoRun | undefined>;
  getRecentSeoRuns(siteId: string, limit?: number): Promise<SeoRun[]>;
  
  // Crew State
  getCrewState(siteId: string): Promise<CrewState[]>;
  enableCrewAgent(siteId: string, agentId: string): Promise<CrewState>;
  disableCrewAgent(siteId: string, agentId: string): Promise<void>;
  
  // Fix Plans
  createFixPlan(plan: InsertFixPlan): Promise<FixPlan>;
  getFixPlanById(planId: string): Promise<FixPlan | undefined>;
  getLatestFixPlan(siteId: string, crewId: string): Promise<FixPlan | undefined>;
  updateFixPlan(planId: string, updates: Partial<InsertFixPlan>): Promise<FixPlan | undefined>;
  getLastExecutedPlan(siteId: string, crewId: string, topic: string): Promise<FixPlan | undefined>;
  getRecentFixPlans(siteId: string, crewId: string, limit?: number): Promise<FixPlan[]>;
  
  // Achievement Tracks
  getAchievementTracks(siteId: string, crewId?: string): Promise<AchievementTrack[]>;
  getAchievementTrackByKey(siteId: string, crewId: string, key: string): Promise<AchievementTrack | undefined>;
  createAchievementTrack(track: InsertAchievementTrack): Promise<AchievementTrack>;
  updateAchievementTrack(id: number, updates: Partial<InsertAchievementTrack>): Promise<AchievementTrack | undefined>;
  incrementAchievementProgress(siteId: string, crewId: string, key: string, amount?: number): Promise<AchievementTrack | undefined>;
  initializeCrewAchievements(siteId: string, crewId: string): Promise<AchievementTrack[]>;
  
  // KB Insights
  getInsights(siteId: string, limit?: number): Promise<KbInsight[]>;
  getInsightById(insightId: string): Promise<KbInsight | null>;
  saveInsight(insight: InsertKbInsight): Promise<KbInsight>;
  saveInsights(insights: InsertKbInsight[]): Promise<void>;
  getInsightsCount(siteId: string): Promise<number>;
  deleteInsightsBySynthesisRun(synthesisRunId: string): Promise<void>;

  // KB Recommendations
  getRecommendations(siteId: string, limit?: number): Promise<KbRecommendation[]>;
  getRecommendationById(recommendationId: string): Promise<KbRecommendation | null>;
  saveRecommendation(rec: InsertKbRecommendation): Promise<KbRecommendation>;
  saveRecommendations(recs: InsertKbRecommendation[]): Promise<void>;
  getRecommendationsCount(siteId: string): Promise<number>;
  updateRecommendationStatus(recommendationId: string, status: string): Promise<void>;

  // SEO Agent Competitors
  getCompetitors(siteId: string, agentSlug?: string): Promise<SeoAgentCompetitor[]>;
  addCompetitor(competitor: InsertSeoAgentCompetitor): Promise<SeoAgentCompetitor>;
  deleteCompetitor(id: number): Promise<void>;
  
  // AI Findings (Atlas)
  getAiFindings(siteId: string, limit?: number): Promise<AiFinding[]>;
  getAiFindingsBySeverity(siteId: string, severity: string): Promise<AiFinding[]>;
  createAiFinding(finding: InsertAiFinding): Promise<AiFinding>;
  resolveAiFinding(findingId: string): Promise<void>;
  clearAiFindings(siteId: string): Promise<void>;
  
  // AI Snapshots (Atlas)
  getAiSnapshots(siteId: string, limit?: number): Promise<AiSnapshot[]>;
  getLatestAiSnapshot(siteId: string): Promise<AiSnapshot | undefined>;
  createAiSnapshot(snapshot: InsertAiSnapshot): Promise<AiSnapshot>;
  
  // Draper Settings
  getDraperSettings(siteId: string): Promise<DraperSettings | undefined>;
  upsertDraperSettings(siteId: string, settings: Partial<InsertDraperSettings>): Promise<DraperSettings>;
  
  // Draper Action Queue
  getDraperActions(siteId: string, limit?: number): Promise<DraperAction[]>;
  createDraperAction(action: InsertDraperAction): Promise<DraperAction>;
  updateDraperActionStatus(id: number, status: string, result?: any): Promise<void>;
  cancelDraperAction(id: number): Promise<void>;
  
  // Core Web Vitals Daily
  insertCoreWebVitalsDaily(data: InsertCoreWebVitalsDaily): Promise<CoreWebVitalsDaily>;
  getLatestCoreWebVitals(siteId: string): Promise<CoreWebVitalsDaily | undefined>;
  getCoreWebVitalsHistory(siteId: string, days: number): Promise<CoreWebVitalsDaily[]>;
  
  // Free Reports
  createFreeReport(data: InsertFreeReport): Promise<FreeReport>;
  getFreeReportById(reportId: string): Promise<FreeReport | null>;
  getFreeReportByShareToken(token: string): Promise<FreeReport | null>;
  updateFreeReport(reportId: string, updates: Partial<FreeReport>): Promise<void>;
  createShareToken(reportId: string): Promise<string>;
  
  // Report Shares
  createReportShare(data: InsertReportShare): Promise<ReportShare>;
  getReportShareByToken(shareToken: string): Promise<ReportShare | null>;
  getReportSharesByScanId(scanId: string): Promise<ReportShare[]>;
  incrementShareViewCount(shareToken: string): Promise<void>;
  revokeReportShare(id: number): Promise<void>;
  
  // Crew Runs (canonical identity system)
  createCrewRun(run: InsertCrewRun): Promise<CrewRun>;
  updateCrewRun(runId: number, updates: Partial<InsertCrewRun>): Promise<CrewRun | undefined>;
  getCrewRunById(runId: number): Promise<CrewRun | undefined>;
  getLatestCrewRun(siteId: string, crewId: string): Promise<CrewRun | undefined>;
  getRecentCrewRuns(siteId: string, crewId: string, limit?: number): Promise<CrewRun[]>;
  
  // Crew KPIs
  saveCrewKpis(kpis: InsertCrewKpi[]): Promise<CrewKpi[]>;
  getCrewKpisByRunId(runId: number): Promise<CrewKpi[]>;
  getLatestCrewKpis(siteId: string, crewId: string): Promise<CrewKpi[]>;
  
  // Crew Findings
  saveCrewFindings(findings: InsertCrewFinding[]): Promise<CrewFinding[]>;
  getCrewFindingsByRunId(runId: number): Promise<CrewFinding[]>;
  getRecentCrewFindings(siteId: string, crewId: string, limit?: number): Promise<CrewFinding[]>;
  
  // Socrates: Agent Action Logs
  createAgentActionLog(data: InsertAgentActionLog): Promise<AgentActionLog>;
  getAgentActionLogsByTimeWindow(siteId: string, startTime: Date, endTime: Date): Promise<AgentActionLog[]>;
  getAgentActionLogsByActionIds(actionIds: string[]): Promise<AgentActionLog[]>;
  
  // Socrates: Outcome Event Logs
  createOutcomeEventLog(data: InsertOutcomeEventLog): Promise<OutcomeEventLog>;
  getOutcomeEventLogsBySite(siteId: string, limit?: number): Promise<OutcomeEventLog[]>;
  getUnattributedOutcomeEvents(siteId: string): Promise<OutcomeEventLog[]>;
  
  // Socrates: Attribution Records
  createAttributionRecord(data: InsertAttributionRecord): Promise<AttributionRecord>;
  getAttributionsByEventId(eventId: string): Promise<AttributionRecord[]>;
  
  // Socrates: Knowledge Base Entries
  createSocratesKbEntry(data: InsertSocratesKbEntry): Promise<SocratesKbEntry>;
  updateSocratesKbEntry(kbId: string, updates: Partial<InsertSocratesKbEntry>): Promise<SocratesKbEntry | null>;
  getSocratesKbEntriesByContext(params: { siteId?: string; metricKeys?: string[]; agentId?: string; status?: string; limit?: number }): Promise<SocratesKbEntry[]>;
  getSocratesKbEntryByKbId(kbId: string): Promise<SocratesKbEntry | null>;
}

class DBStorage implements IStorage {
  async saveToken(token: InsertOAuthToken): Promise<OAuthToken> {
    const existing = await this.getToken(token.provider);
    
    if (existing) {
      await db
        .update(oauthTokens)
        .set({ ...token, updatedAt: new Date() })
        .where(eq(oauthTokens.provider, token.provider));
      
      return (await this.getToken(token.provider))!;
    } else {
      const [newToken] = await db.insert(oauthTokens).values(token).returning();
      return newToken;
    }
  }

  async getToken(provider: string): Promise<OAuthToken | undefined> {
    const [token] = await db
      .select()
      .from(oauthTokens)
      .where(eq(oauthTokens.provider, provider))
      .limit(1);
    return token;
  }

  async updateToken(provider: string, token: Partial<InsertOAuthToken>): Promise<void> {
    await db
      .update(oauthTokens)
      .set({ ...token, updatedAt: new Date() })
      .where(eq(oauthTokens.provider, provider));
  }

  async saveGA4Data(data: InsertGA4Daily[]): Promise<void> {
    if (data.length === 0) return;
    await db.insert(ga4Daily).values(data);
  }

  async getGA4DataByDateRange(startDate: string, endDate: string, siteId?: string): Promise<GA4Daily[]> {
    const conditions = [gte(ga4Daily.date, startDate), sql`${ga4Daily.date} <= ${endDate}`];
    if (siteId) {
      conditions.push(eq(ga4Daily.siteId, siteId));
    }
    return db
      .select()
      .from(ga4Daily)
      .where(and(...conditions))
      .orderBy(ga4Daily.date);
  }

  async upsertGA4Daily(data: InsertGA4Daily): Promise<void> {
    const existing = await db
      .select()
      .from(ga4Daily)
      .where(eq(ga4Daily.date, data.date))
      .limit(1);
    
    if (existing.length > 0) {
      await db
        .update(ga4Daily)
        .set({
          sessions: data.sessions,
          users: data.users,
          events: data.events,
          conversions: data.conversions,
          rawData: data.rawData,
        })
        .where(eq(ga4Daily.date, data.date));
    } else {
      await db.insert(ga4Daily).values(data);
    }
  }

  async saveGSCData(data: InsertGSCDaily[]): Promise<void> {
    if (data.length === 0) return;
    await db.insert(gscDaily).values(data);
  }

  async getGSCDataByDateRange(startDate: string, endDate: string, siteId?: string): Promise<GSCDaily[]> {
    // Normalize date format: convert YYYYMMDD to YYYY-MM-DD if needed
    const normalizeDate = (d: string) => {
      if (d.includes('-')) return d;
      if (d.length === 8) return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`;
      return d;
    };
    const normalizedStart = normalizeDate(startDate);
    const normalizedEnd = normalizeDate(endDate);
    
    const conditions = [gte(gscDaily.date, normalizedStart), sql`${gscDaily.date} <= ${normalizedEnd}`];
    if (siteId) {
      conditions.push(eq(gscDaily.siteId, siteId));
    }
    return db
      .select()
      .from(gscDaily)
      .where(and(...conditions))
      .orderBy(gscDaily.date);
  }

  async upsertGSCDaily(data: InsertGSCDaily): Promise<void> {
    const existing = await db
      .select()
      .from(gscDaily)
      .where(eq(gscDaily.date, data.date))
      .limit(1);
    
    if (existing.length > 0) {
      await db
        .update(gscDaily)
        .set({
          impressions: data.impressions,
          clicks: data.clicks,
          ctr: data.ctr,
          position: data.position,
          rawData: data.rawData,
        })
        .where(eq(gscDaily.date, data.date));
    } else {
      await db.insert(gscDaily).values(data);
    }
  }

  async saveAdsData(data: InsertAdsDaily[]): Promise<void> {
    if (data.length === 0) return;
    await db.insert(adsDaily).values(data);
  }

  async getAdsDataByDateRange(startDate: string, endDate: string): Promise<AdsDaily[]> {
    return db
      .select()
      .from(adsDaily)
      .where(and(gte(adsDaily.date, startDate), sql`${adsDaily.date} <= ${endDate}`))
      .orderBy(adsDaily.date);
  }

  async saveWebChecks(checks: InsertWebChecksDaily[]): Promise<void> {
    if (checks.length === 0) return;
    await db.insert(webChecksDaily).values(checks);
  }

  async getWebChecksByDate(date: string): Promise<WebChecksDaily[]> {
    return db
      .select()
      .from(webChecksDaily)
      .where(eq(webChecksDaily.date, date));
  }

  async saveReport(report: InsertReport): Promise<Report> {
    const [newReport] = await db.insert(reports).values(report).returning();
    return newReport;
  }

  async getLatestReport(): Promise<Report | undefined> {
    const [report] = await db
      .select()
      .from(reports)
      .orderBy(desc(reports.createdAt))
      .limit(1);
    return report;
  }

  async getReportsByDateRange(startDate: string, endDate: string): Promise<Report[]> {
    return db
      .select()
      .from(reports)
      .where(and(gte(reports.date, startDate), sql`${reports.date} <= ${endDate}`))
      .orderBy(desc(reports.date));
  }

  async saveTicket(ticket: InsertTicket): Promise<Ticket> {
    const [newTicket] = await db.insert(tickets).values(ticket).returning();
    return newTicket;
  }

  async saveTickets(ticketList: InsertTicket[]): Promise<Ticket[]> {
    if (ticketList.length === 0) return [];
    return db.insert(tickets).values(ticketList).returning();
  }

  async getLatestTickets(limit: number = 10): Promise<Ticket[]> {
    return db
      .select()
      .from(tickets)
      .orderBy(desc(tickets.createdAt))
      .limit(limit);
  }

  async getTicketById(ticketId: string): Promise<Ticket | undefined> {
    const [ticket] = await db
      .select()
      .from(tickets)
      .where(eq(tickets.ticketId, ticketId))
      .limit(1);
    return ticket;
  }

  async updateTicketStatus(ticketId: string, status: string): Promise<void> {
    await db
      .update(tickets)
      .set({ status, updatedAt: new Date() })
      .where(eq(tickets.ticketId, ticketId));
  }

  async getConfig(key: string): Promise<string | undefined> {
    const [conf] = await db
      .select()
      .from(config)
      .where(eq(config.key, key))
      .limit(1);
    return conf?.value;
  }

  async setConfig(key: string, value: string): Promise<void> {
    const existing = await this.getConfig(key);
    
    if (existing) {
      await db
        .update(config)
        .set({ value, updatedAt: new Date() })
        .where(eq(config.key, key));
    } else {
      await db.insert(config).values({ key, value });
    }
  }

  async saveRun(run: InsertRun): Promise<Run> {
    const [newRun] = await db.insert(runs).values(run).returning();
    return newRun;
  }

  async updateRun(runId: string, updates: Partial<InsertRun>): Promise<Run | undefined> {
    await db
      .update(runs)
      .set(updates)
      .where(eq(runs.runId, runId));
    return this.getRunById(runId);
  }

  async getLatestRun(): Promise<Run | undefined> {
    const [run] = await db
      .select()
      .from(runs)
      .orderBy(desc(runs.createdAt))
      .limit(1);
    return run;
  }

  async getRunById(runId: string): Promise<Run | undefined> {
    const [run] = await db
      .select()
      .from(runs)
      .where(eq(runs.runId, runId))
      .limit(1);
    return run;
  }

  async getRunsByDateRange(startDate: Date, endDate: Date): Promise<Run[]> {
    return db
      .select()
      .from(runs)
      .where(and(gte(runs.startedAt, startDate), sql`${runs.startedAt} <= ${endDate}`))
      .orderBy(desc(runs.startedAt));
  }

  async getCompletedRunForDate(date: string): Promise<Run | undefined> {
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);
    
    const [run] = await db
      .select()
      .from(runs)
      .where(and(
        eq(runs.runType, "full"),
        eq(runs.status, "completed"),
        gte(runs.startedAt, startOfDay),
        sql`${runs.startedAt} <= ${endOfDay}`
      ))
      .orderBy(desc(runs.startedAt))
      .limit(1);
    return run;
  }

  async getRecentRuns(limit: number): Promise<Run[]> {
    return db
      .select()
      .from(runs)
      .where(and(
        eq(runs.runType, "full"),
        eq(runs.status, "completed")
      ))
      .orderBy(desc(runs.createdAt))
      .limit(limit);
  }

  async getReportById(id: number): Promise<Report | undefined> {
    const [report] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, id))
      .limit(1);
    return report;
  }

  async saveGscPageData(data: InsertGscPageDaily[]): Promise<void> {
    if (data.length === 0) return;
    await db.insert(gscPageDaily).values(data);
  }

  async getGscPageDataByRunId(runId: string): Promise<GscPageDaily[]> {
    return db
      .select()
      .from(gscPageDaily)
      .where(eq(gscPageDaily.runId, runId))
      .orderBy(desc(gscPageDaily.date));
  }

  async saveGscQueryData(data: InsertGscQueryDaily[]): Promise<void> {
    if (data.length === 0) return;
    await db.insert(gscQueryDaily).values(data);
  }

  async getGscQueryDataByRunId(runId: string): Promise<GscQueryDaily[]> {
    return db
      .select()
      .from(gscQueryDaily)
      .where(eq(gscQueryDaily.runId, runId))
      .orderBy(desc(gscQueryDaily.date));
  }

  async saveGa4LandingData(data: InsertGa4LandingDaily[]): Promise<void> {
    if (data.length === 0) return;
    await db.insert(ga4LandingDaily).values(data);
  }

  async getGa4LandingDataByRunId(runId: string): Promise<Ga4LandingDaily[]> {
    return db
      .select()
      .from(ga4LandingDaily)
      .where(eq(ga4LandingDaily.runId, runId))
      .orderBy(desc(ga4LandingDaily.date));
  }

  async saveAnomalies(data: InsertAnomaly[]): Promise<Anomaly[]> {
    if (data.length === 0) return [];
    return db.insert(anomalies).values(data).returning();
  }

  async getAnomaliesByRunId(runId: string): Promise<Anomaly[]> {
    return db
      .select()
      .from(anomalies)
      .where(eq(anomalies.runId, runId))
      .orderBy(desc(anomalies.createdAt));
  }

  async getRecentAnomalies(siteId: string, days: number): Promise<Anomaly[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    // Filter by createdAt and siteId via scope JSONB field
    // If siteId is "default" or scope contains matching siteId, include it
    // Also include anomalies with null scope for backwards compatibility
    if (siteId === "default") {
      // For default site, return all recent anomalies
      return db
        .select()
        .from(anomalies)
        .where(gte(anomalies.createdAt, cutoffDate))
        .orderBy(desc(anomalies.createdAt));
    }
    
    // For specific siteId, filter by scope->>'siteId' or null scope
    return db
      .select()
      .from(anomalies)
      .where(
        and(
          gte(anomalies.createdAt, cutoffDate),
          or(
            sql`${anomalies.scope}->>'siteId' = ${siteId}`,
            isNull(anomalies.scope)
          )
        )
      )
      .orderBy(desc(anomalies.createdAt));
  }

  async saveHypotheses(data: InsertHypothesis[]): Promise<Hypothesis[]> {
    if (data.length === 0) return [];
    return db.insert(hypotheses).values(data).returning();
  }

  async getHypothesesByRunId(runId: string): Promise<Hypothesis[]> {
    return db
      .select()
      .from(hypotheses)
      .where(eq(hypotheses.runId, runId))
      .orderBy(hypotheses.rank);
  }

  async getTicketsByRunId(runId: string): Promise<Ticket[]> {
    return db
      .select()
      .from(tickets)
      .where(eq(tickets.runId, runId))
      .orderBy(tickets.priority);
  }

  // SERP Keywords
  async getSerpKeywords(activeOnly = true): Promise<SerpKeyword[]> {
    if (activeOnly) {
      return db
        .select()
        .from(serpKeywords)
        .where(eq(serpKeywords.active, true))
        .orderBy(desc(serpKeywords.priority));
    }
    return db
      .select()
      .from(serpKeywords)
      .orderBy(desc(serpKeywords.priority));
  }

  async getSerpKeywordById(id: number): Promise<SerpKeyword | undefined> {
    const [keyword] = await db
      .select()
      .from(serpKeywords)
      .where(eq(serpKeywords.id, id))
      .limit(1);
    return keyword;
  }

  async saveSerpKeyword(keyword: InsertSerpKeyword): Promise<SerpKeyword> {
    const [newKeyword] = await db.insert(serpKeywords).values(keyword).returning();
    return newKeyword;
  }

  async saveSerpKeywords(keywords: InsertSerpKeyword[]): Promise<SerpKeyword[]> {
    if (keywords.length === 0) return [];
    return db.insert(serpKeywords).values(keywords).onConflictDoNothing().returning();
  }

  async updateSerpKeyword(id: number, updates: Partial<InsertSerpKeyword>): Promise<void> {
    await db.update(serpKeywords).set(updates).where(eq(serpKeywords.id, id));
  }

  async deleteSerpKeyword(id: number): Promise<void> {
    await db.delete(serpKeywords).where(eq(serpKeywords.id, id));
  }

  // SERP Rankings
  async saveSerpRankings(rankings: InsertSerpRanking[]): Promise<SerpRanking[]> {
    if (rankings.length === 0) return [];
    return db.insert(serpRankings).values(rankings).returning();
  }

  async getLatestRankings(): Promise<(SerpRanking & { keyword: string })[]> {
    const latestDate = await db
      .select({ date: serpRankings.date })
      .from(serpRankings)
      .orderBy(desc(serpRankings.date))
      .limit(1);
    
    if (latestDate.length === 0) return [];
    
    const results = await db
      .select({
        id: serpRankings.id,
        keywordId: serpRankings.keywordId,
        date: serpRankings.date,
        searchEngine: serpRankings.searchEngine,
        location: serpRankings.location,
        device: serpRankings.device,
        position: serpRankings.position,
        url: serpRankings.url,
        change: serpRankings.change,
        volume: serpRankings.volume,
        serpFeatures: serpRankings.serpFeatures,
        createdAt: serpRankings.createdAt,
        keyword: serpKeywords.keyword,
      })
      .from(serpRankings)
      .innerJoin(serpKeywords, eq(serpRankings.keywordId, serpKeywords.id))
      .where(eq(serpRankings.date, latestDate[0].date))
      .orderBy(asc(serpRankings.position));
    
    return results;
  }

  async getRankingHistoryByKeyword(keywordId: number, limit = 30): Promise<SerpRanking[]> {
    return db
      .select()
      .from(serpRankings)
      .where(eq(serpRankings.keywordId, keywordId))
      .orderBy(desc(serpRankings.date))
      .limit(limit);
  }

  async getRankingsByDate(date: string): Promise<SerpRanking[]> {
    return db
      .select()
      .from(serpRankings)
      .where(eq(serpRankings.date, date))
      .orderBy(asc(serpRankings.position));
  }

  async getAllRankingsWithHistory(days: number): Promise<SerpRanking[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];
    
    return db
      .select()
      .from(serpRankings)
      .where(gte(serpRankings.date, cutoffStr))
      .orderBy(desc(serpRankings.date), asc(serpRankings.keywordId));
  }

  // SEO Agent Snapshots
  async saveAgentSnapshot(snapshot: InsertSeoAgentSnapshot): Promise<SeoAgentSnapshot> {
    const [result] = await db.insert(seoAgentSnapshots).values(snapshot).returning();
    return result;
  }

  async getAgentSnapshots(agentSlug: string, siteId = "default", limit = 30): Promise<SeoAgentSnapshot[]> {
    return db
      .select()
      .from(seoAgentSnapshots)
      .where(and(
        eq(seoAgentSnapshots.agentSlug, agentSlug),
        eq(seoAgentSnapshots.siteId, siteId)
      ))
      .orderBy(desc(seoAgentSnapshots.timestamp))
      .limit(limit);
  }

  // Sites Registry
  async getSites(activeOnly = true): Promise<Site[]> {
    if (activeOnly) {
      return db.select().from(sites).where(eq(sites.active, true)).orderBy(desc(sites.createdAt));
    }
    return db.select().from(sites).orderBy(desc(sites.createdAt));
  }

  async getSiteById(siteId: string): Promise<Site | undefined> {
    const [site] = await db.select().from(sites).where(eq(sites.siteId, siteId)).limit(1);
    return site;
  }

  async createSite(site: InsertSite): Promise<Site> {
    const [newSite] = await db.insert(sites).values(site).returning();
    return newSite;
  }

  async updateSite(siteId: string, updates: Partial<InsertSite>): Promise<Site | undefined> {
    const existing = await this.getSiteById(siteId);
    if (!existing) return undefined;

    const mergedUpdates: Partial<InsertSite> = { ...updates };

    if (updates.integrations !== undefined) {
      mergedUpdates.integrations = {
        ...(existing.integrations as object || {}),
        ...(updates.integrations as object || {}),
      };
    }
    if (updates.crawlSettings !== undefined) {
      mergedUpdates.crawlSettings = {
        ...(existing.crawlSettings as object || {}),
        ...(updates.crawlSettings as object || {}),
      };
    }
    if (updates.guardrails !== undefined) {
      mergedUpdates.guardrails = {
        ...(existing.guardrails as object || {}),
        ...(updates.guardrails as object || {}),
      };
    }
    if (updates.cadence !== undefined) {
      mergedUpdates.cadence = {
        ...(existing.cadence as object || {}),
        ...(updates.cadence as object || {}),
      };
    }

    const [updated] = await db
      .update(sites)
      .set({ ...mergedUpdates, updatedAt: new Date() })
      .where(eq(sites.siteId, siteId))
      .returning();
    return updated;
  }

  async deleteSite(siteId: string): Promise<void> {
    await db.update(sites).set({ active: false, updatedAt: new Date() }).where(eq(sites.siteId, siteId));
  }

  async updateSiteHealthScore(siteId: string, score: number): Promise<void> {
    await db.update(sites).set({ healthScore: score, updatedAt: new Date() }).where(eq(sites.siteId, siteId));
  }

  async updateSiteLastDiagnosis(siteId: string): Promise<void> {
    await db.update(sites).set({ lastDiagnosisAt: new Date(), updatedAt: new Date() }).where(eq(sites.siteId, siteId));
  }

  // Findings
  async saveFindings(findingsData: InsertFinding[]): Promise<Finding[]> {
    if (findingsData.length === 0) return [];
    return db.insert(findings).values(findingsData).returning();
  }

  async getFindingsBySite(siteId: string, status?: string): Promise<Finding[]> {
    if (status) {
      return db.select().from(findings).where(and(eq(findings.siteId, siteId), eq(findings.status, status))).orderBy(desc(findings.createdAt));
    }
    return db.select().from(findings).where(eq(findings.siteId, siteId)).orderBy(desc(findings.createdAt));
  }

  async updateFindingStatus(findingId: string, status: string): Promise<void> {
    await db.update(findings).set({ status, updatedAt: new Date() }).where(eq(findings.findingId, findingId));
  }

  async getFindingsBySource(siteId: string, sourceIntegration: string, limit = 50): Promise<Finding[]> {
    return db
      .select()
      .from(findings)
      .where(and(eq(findings.siteId, siteId), eq(findings.sourceIntegration, sourceIntegration)))
      .orderBy(desc(findings.createdAt))
      .limit(limit);
  }

  async getFindingsCount(siteId: string, sourceIntegration?: string): Promise<number> {
    const conditions = [eq(findings.siteId, siteId)];
    if (sourceIntegration) {
      conditions.push(eq(findings.sourceIntegration, sourceIntegration));
    }
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(findings)
      .where(and(...conditions));
    return Number(result[0]?.count || 0);
  }

  async getLatestFindings(siteId: string, limit = 10): Promise<Finding[]> {
    return db
      .select()
      .from(findings)
      .where(eq(findings.siteId, siteId))
      .orderBy(desc(findings.createdAt))
      .limit(limit);
  }

  // Audit Logs
  async saveAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  async getAuditLogsBySite(siteId: string, limit = 50): Promise<AuditLog[]> {
    return db.select().from(auditLogs).where(eq(auditLogs.siteId, siteId)).orderBy(desc(auditLogs.createdAt)).limit(limit);
  }

  async getAllAuditLogs(limit = 100): Promise<AuditLog[]> {
    return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
  }

  async getRecentMissionCompletions(siteId: string, crewId: string, hours: number): Promise<AuditLog[]> {
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    // Base conditions for all mission completions
    const baseConditions = [
      eq(auditLogs.siteId, siteId),
      eq(auditLogs.action, 'mission_completed'),
      gte(auditLogs.createdAt, cutoffTime),
    ];
    
    // Only add crew filter if not 'all'
    if (crewId !== 'all') {
      baseConditions.push(sql`${auditLogs.details}->>'crewId' = ${crewId}`);
    }
    
    return db
      .select()
      .from(auditLogs)
      .where(and(...baseConditions))
      .orderBy(desc(auditLogs.createdAt));
  }

  async saveMissionExecution(params: {
    siteId: string;
    crewId: string;
    missionId: string;
    runId: string;
    status: 'success' | 'failed';
    summary: string;
    metadata?: Record<string, any>;
  }): Promise<AuditLog> {
    return this.saveAuditLog({
      siteId: params.siteId,
      action: 'mission_completed',
      actor: 'system',
      details: {
        crewId: params.crewId,
        missionId: params.missionId,
        runId: params.runId,
        status: params.status,
        summary: params.summary,
        ...(params.metadata || {}),
      },
    });
  }

  // Site Integrations
  async getSiteIntegrations(siteId: string): Promise<SiteIntegration[]> {
    return db.select().from(siteIntegrations).where(eq(siteIntegrations.siteId, siteId)).orderBy(siteIntegrations.integrationType);
  }

  async getSiteIntegration(siteId: string, integrationType: string): Promise<SiteIntegration | undefined> {
    const [integration] = await db
      .select()
      .from(siteIntegrations)
      .where(and(eq(siteIntegrations.siteId, siteId), eq(siteIntegrations.integrationType, integrationType)))
      .limit(1);
    return integration;
  }

  async saveSiteIntegration(integration: InsertSiteIntegration): Promise<SiteIntegration> {
    const existing = await this.getSiteIntegration(integration.siteId, integration.integrationType);
    if (existing) {
      const [updated] = await db
        .update(siteIntegrations)
        .set({ ...integration, updatedAt: new Date() })
        .where(eq(siteIntegrations.id, existing.id))
        .returning();
      return updated;
    }
    const [newIntegration] = await db.insert(siteIntegrations).values(integration).returning();
    return newIntegration;
  }

  async updateSiteIntegration(id: number, updates: Partial<InsertSiteIntegration>): Promise<SiteIntegration | undefined> {
    const [updated] = await db
      .update(siteIntegrations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(siteIntegrations.id, id))
      .returning();
    return updated;
  }

  async deleteSiteIntegration(id: number): Promise<void> {
    await db.delete(siteIntegrations).where(eq(siteIntegrations.id, id));
  }

  // Vault Config
  async getVaultConfig(): Promise<VaultConfig | undefined> {
    const [config] = await db.select().from(vaultConfig).orderBy(desc(vaultConfig.createdAt)).limit(1);
    return config;
  }

  async saveVaultConfig(configData: InsertVaultConfig): Promise<VaultConfig> {
    const existing = await this.getVaultConfig();
    if (existing) {
      const [updated] = await db
        .update(vaultConfig)
        .set({ ...configData, updatedAt: new Date() })
        .where(eq(vaultConfig.id, existing.id))
        .returning();
      return updated;
    }
    const [newConfig] = await db.insert(vaultConfig).values(configData).returning();
    return newConfig;
  }

  async updateVaultConfig(id: number, updates: Partial<InsertVaultConfig>): Promise<VaultConfig | undefined> {
    const [updated] = await db
      .update(vaultConfig)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(vaultConfig.id, id))
      .returning();
    return updated;
  }

  // Action Runs
  async createActionRun(run: InsertActionRun): Promise<ActionRun> {
    const [newRun] = await db.insert(actionRuns).values(run).returning();
    return newRun;
  }

  async updateActionRun(runId: string, updates: Partial<InsertActionRun>): Promise<ActionRun | undefined> {
    const [updated] = await db
      .update(actionRuns)
      .set(updates)
      .where(eq(actionRuns.runId, runId))
      .returning();
    return updated;
  }

  async getActionRunsByAnomaly(siteId: string, anomalyId: string): Promise<ActionRun[]> {
    return db
      .select()
      .from(actionRuns)
      .where(and(eq(actionRuns.siteId, siteId), eq(actionRuns.anomalyId, anomalyId)))
      .orderBy(desc(actionRuns.createdAt));
  }

  async getActionRunById(runId: string): Promise<ActionRun | undefined> {
    const [run] = await db.select().from(actionRuns).where(eq(actionRuns.runId, runId)).limit(1);
    return run;
  }

  async getLatestActionRuns(siteId: string, limit = 10): Promise<ActionRun[]> {
    return db
      .select()
      .from(actionRuns)
      .where(eq(actionRuns.siteId, siteId))
      .orderBy(desc(actionRuns.createdAt))
      .limit(limit);
  }

  // GSC Daily for ActionRunner (alias)
  async getGSCDailyByDateRange(startDate: string, endDate: string): Promise<GSCDaily[]> {
    return this.getGSCDataByDateRange(startDate, endDate);
  }

  // Platform Integrations
  async getIntegrations(): Promise<Integration[]> {
    return db.select().from(integrations).orderBy(asc(integrations.name));
  }

  async getIntegrationById(integrationId: string): Promise<Integration | undefined> {
    const [integration] = await db
      .select()
      .from(integrations)
      .where(eq(integrations.integrationId, integrationId))
      .limit(1);
    return integration;
  }

  async createIntegration(integration: InsertIntegration): Promise<Integration> {
    const [newIntegration] = await db.insert(integrations).values(integration).returning();
    return newIntegration;
  }

  async updateIntegration(integrationId: string, updates: Partial<InsertIntegration>): Promise<Integration | undefined> {
    const [updated] = await db
      .update(integrations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(integrations.integrationId, integrationId))
      .returning();
    return updated;
  }

  async deleteIntegration(integrationId: string): Promise<void> {
    await db.delete(integrations).where(eq(integrations.integrationId, integrationId));
  }

  // Integration Health Checks
  async saveIntegrationCheck(check: InsertIntegrationCheck): Promise<IntegrationCheck> {
    const [newCheck] = await db.insert(integrationChecks).values(check).returning();
    return newCheck;
  }

  async getIntegrationChecks(integrationId: string, limit = 10): Promise<IntegrationCheck[]> {
    return db
      .select()
      .from(integrationChecks)
      .where(eq(integrationChecks.integrationId, integrationId))
      .orderBy(desc(integrationChecks.checkedAt))
      .limit(limit);
  }

  async getLatestIntegrationChecks(): Promise<IntegrationCheck[]> {
    return db
      .select()
      .from(integrationChecks)
      .orderBy(desc(integrationChecks.checkedAt))
      .limit(50);
  }

  // Service Runs
  async createServiceRun(run: InsertServiceRun): Promise<ServiceRun> {
    const [newRun] = await db.insert(serviceRuns).values(run).returning();
    return newRun;
  }

  async updateServiceRun(runId: string, updates: Partial<InsertServiceRun>): Promise<ServiceRun | undefined> {
    const [updated] = await db
      .update(serviceRuns)
      .set(updates)
      .where(eq(serviceRuns.runId, runId))
      .returning();
    return updated;
  }

  async getServiceRunById(runId: string): Promise<ServiceRun | undefined> {
    const [run] = await db.select().from(serviceRuns).where(eq(serviceRuns.runId, runId)).limit(1);
    return run;
  }

  async getServiceRunsByService(serviceId: string, limit = 25): Promise<ServiceRun[]> {
    return db
      .select()
      .from(serviceRuns)
      .where(eq(serviceRuns.serviceId, serviceId))
      .orderBy(desc(serviceRuns.startedAt))
      .limit(limit);
  }

  async getServiceRunsBySite(siteId: string, limit = 50): Promise<ServiceRun[]> {
    return db
      .select()
      .from(serviceRuns)
      .where(eq(serviceRuns.siteId, siteId))
      .orderBy(desc(serviceRuns.startedAt))
      .limit(limit);
  }

  async getLatestServiceRuns(limit = 50): Promise<ServiceRun[]> {
    return db
      .select()
      .from(serviceRuns)
      .orderBy(desc(serviceRuns.startedAt))
      .limit(limit);
  }

  async getLastRunPerService(): Promise<Map<string, ServiceRun>> {
    const allRuns = await db
      .select()
      .from(serviceRuns)
      .orderBy(desc(serviceRuns.startedAt));
    
    const lastRunMap = new Map<string, ServiceRun>();
    for (const run of allRuns) {
      if (!lastRunMap.has(run.serviceId)) {
        lastRunMap.set(run.serviceId, run);
      }
    }
    return lastRunMap;
  }

  async getLastRunPerServiceBySite(siteId: string): Promise<Map<string, ServiceRun>> {
    // Include runs for this specific site OR global runs (siteId is null)
    // Order by startedAt DESC so we get the most recent run first
    const allRuns = await db
      .select()
      .from(serviceRuns)
      .where(or(eq(serviceRuns.siteId, siteId), isNull(serviceRuns.siteId)))
      .orderBy(desc(serviceRuns.startedAt));
    
    const lastRunMap = new Map<string, ServiceRun>();
    for (const run of allRuns) {
      // Simply take the first (newest) run per service - already sorted by startedAt DESC
      if (!lastRunMap.has(run.serviceId)) {
        lastRunMap.set(run.serviceId, run);
      }
    }
    return lastRunMap;
  }

  async getServicesWithLastRun(): Promise<Array<Integration & { lastRun: ServiceRun | null }>> {
    const allIntegrations = await this.getIntegrations();
    const lastRunMap = await this.getLastRunPerService();
    
    return allIntegrations.map(integration => ({
      ...integration,
      lastRun: lastRunMap.get(integration.integrationId) || null,
    }));
  }

  // Diagnostic Runs implementation
  async createDiagnosticRun(run: InsertDiagnosticRun): Promise<DiagnosticRun> {
    const [newRun] = await db.insert(diagnosticRuns).values(run).returning();
    return newRun;
  }

  async updateDiagnosticRun(runId: string, updates: Partial<InsertDiagnosticRun>): Promise<DiagnosticRun | undefined> {
    const [updated] = await db
      .update(diagnosticRuns)
      .set(updates)
      .where(eq(diagnosticRuns.runId, runId))
      .returning();
    return updated;
  }

  async getDiagnosticRunById(runId: string): Promise<DiagnosticRun | undefined> {
    const [run] = await db.select().from(diagnosticRuns).where(eq(diagnosticRuns.runId, runId)).limit(1);
    return run;
  }

  async getDiagnosticRunsBySite(siteId: string, limit = 25): Promise<DiagnosticRun[]> {
    return db
      .select()
      .from(diagnosticRuns)
      .where(eq(diagnosticRuns.siteId, siteId))
      .orderBy(desc(diagnosticRuns.startedAt))
      .limit(limit);
  }

  async getLatestDiagnosticRuns(limit = 25): Promise<DiagnosticRun[]> {
    return db
      .select()
      .from(diagnosticRuns)
      .orderBy(desc(diagnosticRuns.startedAt))
      .limit(limit);
  }

  // QA Runs implementation
  async createQaRun(run: InsertQaRun): Promise<QaRun> {
    const [newRun] = await db.insert(qaRuns).values(run).returning();
    return newRun;
  }

  async updateQaRun(runId: string, updates: Partial<InsertQaRun>): Promise<QaRun | undefined> {
    const [updated] = await db
      .update(qaRuns)
      .set(updates)
      .where(eq(qaRuns.runId, runId))
      .returning();
    return updated;
  }

  async getQaRunById(runId: string): Promise<QaRun | undefined> {
    const [run] = await db.select().from(qaRuns).where(eq(qaRuns.runId, runId)).limit(1);
    return run;
  }

  async getLatestQaRuns(limit = 10): Promise<QaRun[]> {
    return db
      .select()
      .from(qaRuns)
      .orderBy(desc(qaRuns.startedAt))
      .limit(limit);
  }

  async createQaRunItem(item: InsertQaRunItem): Promise<QaRunItem> {
    const [newItem] = await db.insert(qaRunItems).values(item).returning();
    return newItem;
  }

  async getQaRunItems(qaRunId: string): Promise<QaRunItem[]> {
    return db
      .select()
      .from(qaRunItems)
      .where(eq(qaRunItems.qaRunId, qaRunId))
      .orderBy(asc(qaRunItems.id));
  }

  // Hub-and-Spoke: Artifacts implementation
  async createArtifact(artifact: InsertArtifact): Promise<Artifact> {
    const [newArtifact] = await db.insert(artifacts).values(artifact).returning();
    return newArtifact;
  }

  async getArtifactById(artifactId: string): Promise<Artifact | undefined> {
    const [artifact] = await db.select().from(artifacts).where(eq(artifacts.artifactId, artifactId)).limit(1);
    return artifact;
  }

  async getArtifactsByType(type: string, websiteId?: string): Promise<Artifact[]> {
    if (websiteId) {
      return db
        .select()
        .from(artifacts)
        .where(and(eq(artifacts.type, type), eq(artifacts.websiteId, websiteId)))
        .orderBy(desc(artifacts.createdAt));
    }
    return db
      .select()
      .from(artifacts)
      .where(eq(artifacts.type, type))
      .orderBy(desc(artifacts.createdAt));
  }

  async getArtifactsByRunContext(runContextId: string): Promise<Artifact[]> {
    return db
      .select()
      .from(artifacts)
      .where(eq(artifacts.runContextId, runContextId))
      .orderBy(asc(artifacts.createdAt));
  }

  async getArtifactsByProducer(producerService: string, limit = 50): Promise<Artifact[]> {
    return db
      .select()
      .from(artifacts)
      .where(eq(artifacts.producerService, producerService))
      .orderBy(desc(artifacts.createdAt))
      .limit(limit);
  }

  // Hub-and-Spoke: Run Contexts implementation
  async createRunContext(context: InsertRunContext): Promise<RunContext> {
    const [newContext] = await db.insert(runContexts).values(context).returning();
    return newContext;
  }

  async updateRunContext(runId: string, updates: Partial<InsertRunContext>): Promise<RunContext | undefined> {
    const [updated] = await db
      .update(runContexts)
      .set(updates)
      .where(eq(runContexts.runId, runId))
      .returning();
    return updated;
  }

  async getRunContextById(runId: string): Promise<RunContext | undefined> {
    const [context] = await db.select().from(runContexts).where(eq(runContexts.runId, runId)).limit(1);
    return context;
  }

  async getRunContextsByWorkflow(workflowName: string, limit = 25): Promise<RunContext[]> {
    return db
      .select()
      .from(runContexts)
      .where(eq(runContexts.workflowName, workflowName))
      .orderBy(desc(runContexts.createdAt))
      .limit(limit);
  }

  async getRunContextsByWebsite(websiteId: string, limit = 25): Promise<RunContext[]> {
    return db
      .select()
      .from(runContexts)
      .where(eq(runContexts.websiteId, websiteId))
      .orderBy(desc(runContexts.createdAt))
      .limit(limit);
  }

  async getActiveRunContexts(): Promise<RunContext[]> {
    return db
      .select()
      .from(runContexts)
      .where(or(eq(runContexts.state, 'running'), eq(runContexts.state, 'pending'), eq(runContexts.state, 'waiting_input')))
      .orderBy(desc(runContexts.createdAt));
  }

  // Hub-and-Spoke: Content Drafts implementation
  async createContentDraft(draft: InsertContentDraft): Promise<ContentDraft> {
    const [newDraft] = await db.insert(contentDrafts).values(draft).returning();
    return newDraft;
  }

  async updateContentDraft(draftId: string, updates: Partial<InsertContentDraft>): Promise<ContentDraft | undefined> {
    const [updated] = await db
      .update(contentDrafts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(contentDrafts.draftId, draftId))
      .returning();
    return updated;
  }

  async getContentDraftById(draftId: string): Promise<ContentDraft | undefined> {
    const [draft] = await db.select().from(contentDrafts).where(eq(contentDrafts.draftId, draftId)).limit(1);
    return draft;
  }

  async getContentDraftsByWebsite(websiteId: string, limit = 50): Promise<ContentDraft[]> {
    return db
      .select()
      .from(contentDrafts)
      .where(eq(contentDrafts.websiteId, websiteId))
      .orderBy(desc(contentDrafts.updatedAt))
      .limit(limit);
  }

  async getContentDraftsByState(state: string): Promise<ContentDraft[]> {
    return db
      .select()
      .from(contentDrafts)
      .where(eq(contentDrafts.state, state))
      .orderBy(desc(contentDrafts.updatedAt));
  }

  async getContentDraftsByDateRange(websiteId: string, startDate: Date, endDate: Date): Promise<ContentDraft[]> {
    return db
      .select()
      .from(contentDrafts)
      .where(and(
        eq(contentDrafts.websiteId, websiteId),
        gte(contentDrafts.updatedAt, startDate),
        sql`${contentDrafts.updatedAt} <= ${endDate}`
      ))
      .orderBy(desc(contentDrafts.updatedAt));
  }

  // Hub-and-Spoke: Service Events implementation
  async createServiceEvent(event: InsertServiceEvent): Promise<ServiceEvent> {
    const [newEvent] = await db.insert(serviceEvents).values(event).returning();
    return newEvent;
  }

  async updateServiceEvent(eventId: string, updates: Partial<InsertServiceEvent>): Promise<ServiceEvent | undefined> {
    const [updated] = await db
      .update(serviceEvents)
      .set(updates)
      .where(eq(serviceEvents.eventId, eventId))
      .returning();
    return updated;
  }

  async getServiceEventById(eventId: string): Promise<ServiceEvent | undefined> {
    const [event] = await db.select().from(serviceEvents).where(eq(serviceEvents.eventId, eventId)).limit(1);
    return event;
  }

  async getPendingNotifications(): Promise<ServiceEvent[]> {
    return db
      .select()
      .from(serviceEvents)
      .where(and(eq(serviceEvents.notify, true), eq(serviceEvents.notified, false)))
      .orderBy(asc(serviceEvents.createdAt));
  }

  async getServiceEventsByWebsite(websiteId: string, limit = 50): Promise<ServiceEvent[]> {
    return db
      .select()
      .from(serviceEvents)
      .where(eq(serviceEvents.websiteId, websiteId))
      .orderBy(desc(serviceEvents.createdAt))
      .limit(limit);
  }

  // Test Jobs implementation
  async createTestJob(job: InsertTestJob): Promise<TestJob> {
    const [newJob] = await db.insert(testJobs).values(job).returning();
    return newJob;
  }

  async updateTestJob(jobId: string, updates: Partial<InsertTestJob>): Promise<TestJob | undefined> {
    const [updated] = await db
      .update(testJobs)
      .set(updates)
      .where(eq(testJobs.jobId, jobId))
      .returning();
    return updated;
  }

  async getTestJobById(jobId: string): Promise<TestJob | undefined> {
    const [job] = await db.select().from(testJobs).where(eq(testJobs.jobId, jobId)).limit(1);
    return job;
  }

  async getLatestTestJobs(limit = 10): Promise<TestJob[]> {
    return db
      .select()
      .from(testJobs)
      .orderBy(desc(testJobs.createdAt))
      .limit(limit);
  }

  async getRunningTestJobs(): Promise<TestJob[]> {
    return db
      .select()
      .from(testJobs)
      .where(or(eq(testJobs.status, 'queued'), eq(testJobs.status, 'running')))
      .orderBy(desc(testJobs.createdAt));
  }

  // Get latest service run per service, filtered by run type
  async getLatestServiceRunsByType(runType: string): Promise<Map<string, ServiceRun>> {
    const allRuns = await db
      .select()
      .from(serviceRuns)
      .where(eq(serviceRuns.runType, runType))
      .orderBy(desc(serviceRuns.startedAt));
    
    const latestByService = new Map<string, ServiceRun>();
    for (const run of allRuns) {
      if (!latestByService.has(run.serviceId)) {
        latestByService.set(run.serviceId, run);
      }
    }
    return latestByService;
  }

  // =============================================================================
  // CHANGE PROPOSALS STORAGE
  // =============================================================================

  async createChangeProposal(proposal: InsertChangeProposal): Promise<ChangeProposal> {
    const [created] = await db.insert(changeProposals).values(proposal).returning();
    return created;
  }

  async updateChangeProposal(proposalId: string, updates: Partial<InsertChangeProposal>): Promise<ChangeProposal | undefined> {
    const [updated] = await db
      .update(changeProposals)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(changeProposals.proposalId, proposalId))
      .returning();
    return updated;
  }

  async getChangeProposalById(proposalId: string): Promise<ChangeProposal | undefined> {
    const [proposal] = await db
      .select()
      .from(changeProposals)
      .where(eq(changeProposals.proposalId, proposalId))
      .limit(1);
    return proposal;
  }

  async getChangeProposalByFingerprint(fingerprint: string): Promise<ChangeProposal | undefined> {
    const [proposal] = await db
      .select()
      .from(changeProposals)
      .where(and(
        eq(changeProposals.fingerprint, fingerprint),
        eq(changeProposals.status, 'open')
      ))
      .limit(1);
    return proposal;
  }

  async listChangeProposals(filters: {
    websiteId?: string;
    serviceKey?: string;
    status?: string | string[];
    riskLevel?: string | string[];
    type?: string | string[];
    limit?: number;
    offset?: number;
  } = {}): Promise<{ proposals: ChangeProposal[]; total: number }> {
    const conditions = [];
    
    if (filters.websiteId) {
      conditions.push(eq(changeProposals.websiteId, filters.websiteId));
    }
    if (filters.serviceKey) {
      conditions.push(eq(changeProposals.serviceKey, filters.serviceKey));
    }
    if (filters.status) {
      const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
      conditions.push(or(...statuses.map(s => eq(changeProposals.status, s))));
    }
    if (filters.riskLevel) {
      const levels = Array.isArray(filters.riskLevel) ? filters.riskLevel : [filters.riskLevel];
      conditions.push(or(...levels.map(l => eq(changeProposals.riskLevel, l))));
    }
    if (filters.type) {
      const types = Array.isArray(filters.type) ? filters.type : [filters.type];
      conditions.push(or(...types.map(t => eq(changeProposals.type, t))));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(changeProposals)
      .where(whereClause);

    const proposals = await db
      .select()
      .from(changeProposals)
      .where(whereClause)
      .orderBy(desc(changeProposals.createdAt))
      .limit(filters.limit || 50)
      .offset(filters.offset || 0);

    return { proposals, total: Number(countResult?.count || 0) };
  }

  async getOpenProposalsCount(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(changeProposals)
      .where(eq(changeProposals.status, 'open'));
    return Number(result?.count || 0);
  }

  async supersedePreviousProposals(fingerprint: string, newProposalId: string): Promise<void> {
    await db
      .update(changeProposals)
      .set({ 
        status: 'superseded', 
        supersededBy: newProposalId,
        updatedAt: new Date() 
      })
      .where(and(
        eq(changeProposals.fingerprint, fingerprint),
        eq(changeProposals.status, 'open')
      ));
  }

  // Change Proposal Actions (audit trail)
  async createChangeProposalAction(action: InsertChangeProposalAction): Promise<ChangeProposalAction> {
    const [created] = await db.insert(changeProposalActions).values(action).returning();
    return created;
  }

  async getChangeProposalActions(proposalId: string): Promise<ChangeProposalAction[]> {
    return db
      .select()
      .from(changeProposalActions)
      .where(eq(changeProposalActions.proposalId, proposalId))
      .orderBy(asc(changeProposalActions.createdAt));
  }

  // Connector Diagnostics
  async createConnectorDiagnostic(diagnostic: InsertConnectorDiagnostic): Promise<ConnectorDiagnostic> {
    const [created] = await db.insert(connectorDiagnostics).values(diagnostic).returning();
    return created;
  }

  async updateConnectorDiagnostic(runId: string, updates: Partial<InsertConnectorDiagnostic>): Promise<ConnectorDiagnostic | undefined> {
    const [updated] = await db
      .update(connectorDiagnostics)
      .set(updates)
      .where(eq(connectorDiagnostics.runId, runId))
      .returning();
    return updated;
  }

  async getConnectorDiagnosticByRunId(runId: string): Promise<ConnectorDiagnostic | undefined> {
    const [diagnostic] = await db
      .select()
      .from(connectorDiagnostics)
      .where(eq(connectorDiagnostics.runId, runId))
      .limit(1);
    return diagnostic;
  }

  async getConnectorDiagnosticsByService(serviceId: string, limit = 20): Promise<ConnectorDiagnostic[]> {
    return db
      .select()
      .from(connectorDiagnostics)
      .where(eq(connectorDiagnostics.serviceId, serviceId))
      .orderBy(desc(connectorDiagnostics.createdAt))
      .limit(limit);
  }

  async getLatestConnectorDiagnostic(serviceId: string, siteId?: string): Promise<ConnectorDiagnostic | undefined> {
    const conditions = [eq(connectorDiagnostics.serviceId, serviceId)];
    if (siteId) {
      conditions.push(eq(connectorDiagnostics.siteId, siteId));
    }
    const [diagnostic] = await db
      .select()
      .from(connectorDiagnostics)
      .where(and(...conditions))
      .orderBy(desc(connectorDiagnostics.createdAt))
      .limit(1);
    return diagnostic;
  }

  // Industry Benchmarks
  async getBenchmarksByIndustry(industry: string): Promise<IndustryBenchmark[]> {
    return db
      .select()
      .from(industryBenchmarks)
      .where(eq(industryBenchmarks.industry, industry))
      .orderBy(industryBenchmarks.metric);
  }

  async getAllBenchmarks(): Promise<IndustryBenchmark[]> {
    return db
      .select()
      .from(industryBenchmarks)
      .orderBy(industryBenchmarks.industry, industryBenchmarks.metric);
  }

  async getAvailableIndustries(): Promise<string[]> {
    const results = await db
      .selectDistinct({ industry: industryBenchmarks.industry })
      .from(industryBenchmarks)
      .orderBy(industryBenchmarks.industry);
    return results.map(r => r.industry);
  }

  async saveBenchmarks(benchmarks: InsertIndustryBenchmark[]): Promise<IndustryBenchmark[]> {
    if (benchmarks.length === 0) return [];
    return db.insert(industryBenchmarks).values(benchmarks).returning();
  }

  // SEO Worker Results
  async saveSeoWorkerResult(result: InsertSeoWorkerResult): Promise<SeoWorkerResult> {
    const [created] = await db.insert(seoWorkerResults).values(result).returning();
    return created;
  }

  async saveSeoWorkerResults(results: InsertSeoWorkerResult[]): Promise<SeoWorkerResult[]> {
    if (results.length === 0) return [];
    return db.insert(seoWorkerResults).values(results).returning();
  }

  async getSeoWorkerResultsByRunId(runId: string): Promise<SeoWorkerResult[]> {
    return db
      .select()
      .from(seoWorkerResults)
      .where(eq(seoWorkerResults.runId, runId))
      .orderBy(seoWorkerResults.workerKey);
  }

  async getSeoWorkerResultsBySite(siteId: string, limit = 50): Promise<SeoWorkerResult[]> {
    return db
      .select()
      .from(seoWorkerResults)
      .where(eq(seoWorkerResults.siteId, siteId))
      .orderBy(desc(seoWorkerResults.createdAt))
      .limit(limit);
  }

  async getLatestSeoWorkerResults(siteId: string): Promise<SeoWorkerResult[]> {
    const latestResult = await db
      .select({ runId: seoWorkerResults.runId })
      .from(seoWorkerResults)
      .where(eq(seoWorkerResults.siteId, siteId))
      .orderBy(desc(seoWorkerResults.createdAt))
      .limit(1);
    
    if (latestResult.length === 0) return [];
    
    return db
      .select()
      .from(seoWorkerResults)
      .where(and(
        eq(seoWorkerResults.siteId, siteId),
        eq(seoWorkerResults.runId, latestResult[0].runId)
      ))
      .orderBy(seoWorkerResults.workerKey);
  }

  async getLatestWorkerResultByKey(siteId: string, workerKey: string): Promise<SeoWorkerResult | undefined> {
    const [result] = await db
      .select()
      .from(seoWorkerResults)
      .where(and(
        eq(seoWorkerResults.siteId, siteId),
        eq(seoWorkerResults.workerKey, workerKey),
        eq(seoWorkerResults.status, "success")
      ))
      .orderBy(desc(seoWorkerResults.createdAt))
      .limit(1);
    return result;
  }

  async updateSeoWorkerResult(id: number, updates: Partial<InsertSeoWorkerResult>): Promise<SeoWorkerResult | undefined> {
    const [updated] = await db
      .update(seoWorkerResults)
      .set(updates)
      .where(eq(seoWorkerResults.id, id))
      .returning();
    return updated;
  }

  async getSeoWorkerResultsByDateRange(siteId: string, workerKey: string, startDate: Date, endDate: Date): Promise<SeoWorkerResult[]> {
    return db
      .select()
      .from(seoWorkerResults)
      .where(and(
        eq(seoWorkerResults.siteId, siteId),
        eq(seoWorkerResults.workerKey, workerKey),
        gte(seoWorkerResults.createdAt, startDate),
        sql`${seoWorkerResults.createdAt} <= ${endDate}`
      ))
      .orderBy(desc(seoWorkerResults.createdAt));
  }

  // SEO Metric Events (normalized metrics with canonical keys)
  async saveMetricEvent(event: InsertSeoMetricEvent): Promise<SeoMetricEvent> {
    const [created] = await db.insert(seoMetricEvents).values(event).returning();
    return created;
  }

  async saveMetricEvents(events: InsertSeoMetricEvent[]): Promise<SeoMetricEvent[]> {
    if (events.length === 0) return [];
    return db.insert(seoMetricEvents).values(events).returning();
  }

  async getLatestMetricsByService(siteId: string, serviceId: string): Promise<SeoMetricEvent | undefined> {
    const [event] = await db
      .select()
      .from(seoMetricEvents)
      .where(and(
        eq(seoMetricEvents.siteId, siteId),
        eq(seoMetricEvents.serviceId, serviceId)
      ))
      .orderBy(desc(seoMetricEvents.collectedAt))
      .limit(1);
    return event;
  }

  async getLatestMetricsBySite(siteId: string): Promise<SeoMetricEvent[]> {
    const subquery = db
      .select({
        serviceId: seoMetricEvents.serviceId,
        maxCollectedAt: sql<Date>`max(${seoMetricEvents.collectedAt})`.as('max_collected_at'),
      })
      .from(seoMetricEvents)
      .where(eq(seoMetricEvents.siteId, siteId))
      .groupBy(seoMetricEvents.serviceId)
      .as('latest');
    
    return db
      .select()
      .from(seoMetricEvents)
      .innerJoin(subquery, and(
        eq(seoMetricEvents.serviceId, subquery.serviceId),
        eq(seoMetricEvents.collectedAt, subquery.maxCollectedAt)
      ))
      .where(eq(seoMetricEvents.siteId, siteId))
      .then(rows => rows.map(r => r.seo_metric_events));
  }

  async getAllLatestMetrics(siteId: string): Promise<Record<string, any>> {
    const events = await this.getLatestMetricsBySite(siteId);
    const allMetrics: Record<string, any> = {};
    
    for (const event of events) {
      const metrics = event.metricsJson as Record<string, any>;
      if (metrics) {
        Object.assign(allMetrics, metrics);
      }
    }
    
    return allMetrics;
  }

  // SEO Suggestions
  async saveSeoSuggestion(suggestion: InsertSeoSuggestion): Promise<SeoSuggestion> {
    const [created] = await db.insert(seoSuggestions).values(suggestion).returning();
    return created;
  }

  async saveSeoSuggestions(suggestions: InsertSeoSuggestion[]): Promise<SeoSuggestion[]> {
    if (suggestions.length === 0) return [];
    return db.insert(seoSuggestions).values(suggestions).returning();
  }

  async getSeoSuggestionsByRunId(runId: string): Promise<SeoSuggestion[]> {
    return db
      .select()
      .from(seoSuggestions)
      .where(eq(seoSuggestions.runId, runId))
      .orderBy(desc(seoSuggestions.severity), seoSuggestions.category);
  }

  async getSeoSuggestionsBySite(siteId: string, status?: string, limit = 50): Promise<SeoSuggestion[]> {
    const conditions = [eq(seoSuggestions.siteId, siteId)];
    if (status) {
      conditions.push(eq(seoSuggestions.status, status));
    }
    return db
      .select()
      .from(seoSuggestions)
      .where(and(...conditions))
      .orderBy(desc(seoSuggestions.createdAt))
      .limit(limit);
  }

  async getLatestSeoSuggestions(siteId: string, limit = 20): Promise<SeoSuggestion[]> {
    return db
      .select()
      .from(seoSuggestions)
      .where(and(
        eq(seoSuggestions.siteId, siteId),
        eq(seoSuggestions.status, 'open')
      ))
      .orderBy(desc(seoSuggestions.severity), desc(seoSuggestions.createdAt))
      .limit(limit);
  }

  async updateSeoSuggestionStatus(suggestionId: string, status: string): Promise<void> {
    await db
      .update(seoSuggestions)
      .set({ status, updatedAt: new Date() })
      .where(eq(seoSuggestions.suggestionId, suggestionId));
  }

  async getSeoSuggestionById(suggestionId: string): Promise<SeoSuggestion | undefined> {
    const [suggestion] = await db
      .select()
      .from(seoSuggestions)
      .where(eq(seoSuggestions.suggestionId, suggestionId))
      .limit(1);
    return suggestion;
  }

  async getSuggestionsByAgent(siteId: string, agentId: string, limit = 20): Promise<SeoSuggestion[]> {
    return db
      .select()
      .from(seoSuggestions)
      .where(and(
        eq(seoSuggestions.siteId, siteId),
        arrayContains(seoSuggestions.sourceWorkers, [agentId])
      ))
      .orderBy(desc(seoSuggestions.createdAt))
      .limit(limit);
  }

  async getFindingsByAgent(siteId: string, agentId: string, limit = 20): Promise<Finding[]> {
    return db
      .select()
      .from(findings)
      .where(and(
        eq(findings.siteId, siteId),
        eq(findings.sourceIntegration, agentId)
      ))
      .orderBy(desc(findings.createdAt))
      .limit(limit);
  }

  // SEO KBase Insights
  async saveSeoKbaseInsight(insight: InsertSeoKbaseInsight): Promise<SeoKbaseInsight> {
    const [created] = await db.insert(seoKbaseInsights).values(insight).returning();
    return created;
  }

  async saveSeoKbaseInsights(insights: InsertSeoKbaseInsight[]): Promise<SeoKbaseInsight[]> {
    if (insights.length === 0) return [];
    return db.insert(seoKbaseInsights).values(insights).returning();
  }

  async getSeoKbaseInsightsByRunId(runId: string): Promise<SeoKbaseInsight[]> {
    return db
      .select()
      .from(seoKbaseInsights)
      .where(eq(seoKbaseInsights.runId, runId))
      .orderBy(desc(seoKbaseInsights.priority));
  }

  async getSeoKbaseInsightsBySite(siteId: string, limit = 20): Promise<SeoKbaseInsight[]> {
    return db
      .select()
      .from(seoKbaseInsights)
      .where(eq(seoKbaseInsights.siteId, siteId))
      .orderBy(desc(seoKbaseInsights.createdAt))
      .limit(limit);
  }

  async getLatestSeoKbaseInsights(siteId: string, limit = 5): Promise<SeoKbaseInsight[]> {
    return db
      .select()
      .from(seoKbaseInsights)
      .where(eq(seoKbaseInsights.siteId, siteId))
      .orderBy(desc(seoKbaseInsights.priority), desc(seoKbaseInsights.createdAt))
      .limit(limit);
  }

  // SEO Runs (orchestration tracking)
  async createSeoRun(run: InsertSeoRun): Promise<SeoRun> {
    const [created] = await db.insert(seoRuns).values(run).returning();
    return created;
  }

  async getSeoRunById(runId: string): Promise<SeoRun | undefined> {
    const [run] = await db
      .select()
      .from(seoRuns)
      .where(eq(seoRuns.runId, runId))
      .limit(1);
    return run;
  }

  async updateSeoRun(runId: string, updates: Partial<InsertSeoRun>): Promise<SeoRun | undefined> {
    const [updated] = await db
      .update(seoRuns)
      .set(updates)
      .where(eq(seoRuns.runId, runId))
      .returning();
    return updated;
  }

  async getLatestSeoRun(siteId: string): Promise<SeoRun | undefined> {
    const [run] = await db
      .select()
      .from(seoRuns)
      .where(eq(seoRuns.siteId, siteId))
      .orderBy(desc(seoRuns.createdAt))
      .limit(1);
    return run;
  }

  async getRecentSeoRuns(siteId: string, limit = 10): Promise<SeoRun[]> {
    return db
      .select()
      .from(seoRuns)
      .where(eq(seoRuns.siteId, siteId))
      .orderBy(desc(seoRuns.createdAt))
      .limit(limit);
  }

  // Crew State
  async getCrewState(siteId: string): Promise<CrewState[]> {
    return db
      .select()
      .from(crewState)
      .where(eq(crewState.siteId, siteId))
      .orderBy(asc(crewState.agentId));
  }

  async enableCrewAgent(siteId: string, agentId: string): Promise<CrewState> {
    const existing = await db
      .select()
      .from(crewState)
      .where(and(eq(crewState.siteId, siteId), eq(crewState.agentId, agentId)))
      .limit(1);
    
    if (existing.length > 0) {
      const [updated] = await db
        .update(crewState)
        .set({ enabled: true, updatedAt: new Date() })
        .where(and(eq(crewState.siteId, siteId), eq(crewState.agentId, agentId)))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(crewState)
        .values({ siteId, agentId, enabled: true, needsConfig: false })
        .returning();
      return created;
    }
  }

  async disableCrewAgent(siteId: string, agentId: string): Promise<void> {
    await db
      .update(crewState)
      .set({ enabled: false, updatedAt: new Date() })
      .where(and(eq(crewState.siteId, siteId), eq(crewState.agentId, agentId)));
  }

  // Integration Status Cache (SWR)
  async getIntegrationCache(siteId: string): Promise<IntegrationStatusCache | undefined> {
    const [cache] = await db
      .select()
      .from(integrationStatusCache)
      .where(eq(integrationStatusCache.siteId, siteId))
      .limit(1);
    return cache;
  }

  async saveIntegrationCache(data: InsertIntegrationStatusCache): Promise<IntegrationStatusCache> {
    const existing = await this.getIntegrationCache(data.siteId);
    
    if (existing) {
      const [updated] = await db
        .update(integrationStatusCache)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(integrationStatusCache.siteId, data.siteId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(integrationStatusCache)
        .values(data)
        .returning();
      return created;
    }
  }

  async updateIntegrationCacheRefreshStatus(
    siteId: string, 
    status: string, 
    error?: string,
    durationMs?: number
  ): Promise<void> {
    await db
      .update(integrationStatusCache)
      .set({
        lastRefreshAttemptAt: new Date(),
        lastRefreshStatus: status,
        lastRefreshError: error || null,
        lastRefreshDurationMs: durationMs || null,
        updatedAt: new Date(),
      })
      .where(eq(integrationStatusCache.siteId, siteId));
  }

  async isIntegrationCacheStale(siteId: string): Promise<boolean> {
    const cache = await this.getIntegrationCache(siteId);
    if (!cache) return true;
    
    const ttl = cache.ttlSeconds || 60;
    const now = new Date();
    const cachedAt = new Date(cache.cachedAt);
    const ageSeconds = (now.getTime() - cachedAt.getTime()) / 1000;
    
    return ageSeconds >= ttl;
  }

  // Dashboard Metric Snapshots - for SWR metrics display
  async getDashboardMetricSnapshot(siteId: string): Promise<DashboardMetricSnapshot | undefined> {
    const [snapshot] = await db
      .select()
      .from(dashboardMetricSnapshots)
      .where(eq(dashboardMetricSnapshots.siteId, siteId))
      .limit(1);
    return snapshot;
  }

  async saveDashboardMetricSnapshot(
    siteId: string,
    metrics: Record<string, unknown>,
    sourceRunIds?: string[],
    dateRange?: { from: string; to: string }
  ): Promise<DashboardMetricSnapshot> {
    const existing = await this.getDashboardMetricSnapshot(siteId);
    
    const data: InsertDashboardMetricSnapshot = {
      siteId,
      metricsJson: metrics,
      sourceRunIds: sourceRunIds || null,
      dateRangeFrom: dateRange?.from || null,
      dateRangeTo: dateRange?.to || null,
      capturedAt: new Date(),
      lastRefreshStatus: 'success',
      lastRefreshAttemptAt: new Date(),
    };
    
    if (existing) {
      const [updated] = await db
        .update(dashboardMetricSnapshots)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(dashboardMetricSnapshots.siteId, siteId))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(dashboardMetricSnapshots)
        .values(data)
        .returning();
      return created;
    }
  }

  async updateDashboardSnapshotRefreshStatus(
    siteId: string,
    status: string,
    error?: string
  ): Promise<void> {
    await db
      .update(dashboardMetricSnapshots)
      .set({
        lastRefreshAttemptAt: new Date(),
        lastRefreshStatus: status,
        lastRefreshError: error || null,
        updatedAt: new Date(),
      })
      .where(eq(dashboardMetricSnapshots.siteId, siteId));
  }

  async mergeDashboardMetrics(
    siteId: string,
    newMetrics: Record<string, unknown>
  ): Promise<DashboardMetricSnapshot> {
    const existing = await this.getDashboardMetricSnapshot(siteId);
    const existingMetrics = (existing?.metricsJson as Record<string, unknown>) || {};
    
    // Only overwrite with non-null values
    const merged: Record<string, unknown> = { ...existingMetrics };
    for (const [key, value] of Object.entries(newMetrics)) {
      if (value !== null && value !== undefined) {
        merged[key] = value;
      }
    }
    
    return this.saveDashboardMetricSnapshot(siteId, merged);
  }
  
  // Fix Plans
  async createFixPlan(plan: InsertFixPlan): Promise<FixPlan> {
    const [created] = await db.insert(fixPlans).values(plan).returning();
    return created;
  }
  
  async getFixPlanById(planId: string): Promise<FixPlan | undefined> {
    const [plan] = await db
      .select()
      .from(fixPlans)
      .where(eq(fixPlans.planId, planId))
      .limit(1);
    return plan;
  }
  
  async getLatestFixPlan(siteId: string, crewId: string): Promise<FixPlan | undefined> {
    const [plan] = await db
      .select()
      .from(fixPlans)
      .where(and(
        eq(fixPlans.siteId, siteId),
        eq(fixPlans.crewId, crewId),
        eq(fixPlans.status, 'pending')
      ))
      .orderBy(desc(fixPlans.generatedAt))
      .limit(1);
    return plan;
  }
  
  async updateFixPlan(planId: string, updates: Partial<InsertFixPlan>): Promise<FixPlan | undefined> {
    const [updated] = await db
      .update(fixPlans)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(fixPlans.planId, planId))
      .returning();
    return updated;
  }
  
  async getLastExecutedPlan(siteId: string, crewId: string, topic: string): Promise<FixPlan | undefined> {
    const [plan] = await db
      .select()
      .from(fixPlans)
      .where(and(
        eq(fixPlans.siteId, siteId),
        eq(fixPlans.crewId, crewId),
        eq(fixPlans.topic, topic),
        eq(fixPlans.status, 'executed')
      ))
      .orderBy(desc(fixPlans.executedAt))
      .limit(1);
    return plan;
  }
  
  async getRecentFixPlans(siteId: string, crewId: string, limit: number = 10): Promise<FixPlan[]> {
    return db
      .select()
      .from(fixPlans)
      .where(and(
        eq(fixPlans.siteId, siteId),
        eq(fixPlans.crewId, crewId)
      ))
      .orderBy(desc(fixPlans.generatedAt))
      .limit(limit);
  }
  
  // Action Approvals
  async approveAction(siteId: string, actionKey: string, actionTitle: string): Promise<ActionApproval> {
    const [approval] = await db
      .insert(actionApprovals)
      .values({ siteId, actionKey, actionTitle })
      .returning();
    return approval;
  }
  
  async getApprovedActions(siteId: string): Promise<ActionApproval[]> {
    return db
      .select()
      .from(actionApprovals)
      .where(eq(actionApprovals.siteId, siteId))
      .orderBy(desc(actionApprovals.approvedAt));
  }
  
  async isActionApproved(siteId: string, actionKey: string): Promise<boolean> {
    const [approval] = await db
      .select()
      .from(actionApprovals)
      .where(and(
        eq(actionApprovals.siteId, siteId),
        eq(actionApprovals.actionKey, actionKey)
      ))
      .limit(1);
    return !!approval;
  }
  
  // Achievement Tracks
  async getAchievementTracks(siteId: string, crewId?: string): Promise<AchievementTrack[]> {
    if (crewId) {
      return db
        .select()
        .from(achievementTracks)
        .where(and(
          eq(achievementTracks.siteId, siteId),
          eq(achievementTracks.crewId, crewId)
        ))
        .orderBy(asc(achievementTracks.key));
    }
    return db
      .select()
      .from(achievementTracks)
      .where(eq(achievementTracks.siteId, siteId))
      .orderBy(asc(achievementTracks.crewId), asc(achievementTracks.key));
  }
  
  async getAchievementTrackByKey(siteId: string, crewId: string, key: string): Promise<AchievementTrack | undefined> {
    const [track] = await db
      .select()
      .from(achievementTracks)
      .where(and(
        eq(achievementTracks.siteId, siteId),
        eq(achievementTracks.crewId, crewId),
        eq(achievementTracks.key, key)
      ))
      .limit(1);
    return track;
  }
  
  async createAchievementTrack(track: InsertAchievementTrack): Promise<AchievementTrack> {
    const [created] = await db
      .insert(achievementTracks)
      .values(track)
      .returning();
    return created;
  }
  
  async updateAchievementTrack(id: number, updates: Partial<InsertAchievementTrack>): Promise<AchievementTrack | undefined> {
    const [updated] = await db
      .update(achievementTracks)
      .set({ ...updates, lastUpdated: new Date() })
      .where(eq(achievementTracks.id, id))
      .returning();
    return updated;
  }
  
  async incrementAchievementProgress(siteId: string, crewId: string, key: string, amount: number = 1): Promise<AchievementTrack | undefined> {
    const track = await this.getAchievementTrackByKey(siteId, crewId, key);
    if (!track) return undefined;
    
    let newValue = track.currentValue + amount;
    let newLevel = track.currentLevel;
    let newThreshold = track.nextThreshold;
    let newTier = track.currentTier;
    
    while (newValue >= newThreshold) {
      newLevel++;
      newThreshold = Math.round(track.baseThreshold * Math.pow(track.growthFactor, newLevel - 1));
      
      const tierEntries = Object.entries(ACHIEVEMENT_TIERS);
      for (const [tier, range] of tierEntries) {
        if (newLevel >= range.minLevel && newLevel <= range.maxLevel) {
          newTier = tier;
          break;
        }
      }
    }
    
    return this.updateAchievementTrack(track.id, {
      currentValue: newValue,
      currentLevel: newLevel,
      nextThreshold: newThreshold,
      currentTier: newTier,
    });
  }
  
  async initializeCrewAchievements(siteId: string, crewId: string): Promise<AchievementTrack[]> {
    const existing = await this.getAchievementTracks(siteId, crewId);
    if (existing.length > 0) return existing;
    
    const trackDefinitions: Record<string, Array<{ key: string; name: string; description: string; icon: string }>> = {
      speedster: [
        { key: "vitals_scans", name: "Vitals Scanner", description: "Core Web Vitals scans completed", icon: "Zap" },
        { key: "performance_wins", name: "Performance Champion", description: "Performance improvements delivered", icon: "TrendingUp" },
        { key: "stability_streak", name: "Stability Keeper", description: "Days without performance regression", icon: "Shield" },
        { key: "benchmarks_beaten", name: "Benchmark Breaker", description: "Industry benchmarks exceeded", icon: "Target" },
        { key: "autonomous_fixes", name: "Auto-Pilot Master", description: "Autonomous fixes executed successfully", icon: "Bot" },
      ],
      natasha: [
        { key: "content_audits", name: "Content Auditor", description: "Content audits completed", icon: "FileSearch" },
        { key: "metadata_fixes", name: "Meta Master", description: "Metadata issues fixed", icon: "Tags" },
        { key: "content_gaps", name: "Gap Finder", description: "Content gaps identified", icon: "Search" },
        { key: "seo_scores", name: "Score Improver", description: "SEO scores improved", icon: "TrendingUp" },
        { key: "pages_optimized", name: "Page Optimizer", description: "Pages optimized", icon: "FileText" },
      ],
      authority: [
        { key: "backlinks_found", name: "Link Hunter", description: "Backlinks discovered", icon: "Link" },
        { key: "domain_rating", name: "Authority Builder", description: "Domain rating improvements", icon: "Award" },
        { key: "toxic_removed", name: "Toxic Cleaner", description: "Toxic links disavowed", icon: "Trash2" },
        { key: "outreach_wins", name: "Outreach Pro", description: "Successful outreach campaigns", icon: "Send" },
        { key: "mentions_tracked", name: "Mention Monitor", description: "Brand mentions tracked", icon: "AtSign" },
      ],
      pulse: [
        { key: "diagnostics_run", name: "Diagnostic Expert", description: "Diagnostic runs completed", icon: "Activity" },
        { key: "issues_detected", name: "Issue Detector", description: "Issues detected early", icon: "AlertTriangle" },
        { key: "uptime_days", name: "Uptime Guardian", description: "Days with 100% uptime", icon: "CheckCircle" },
        { key: "anomalies_caught", name: "Anomaly Catcher", description: "Anomalies caught before impact", icon: "Eye" },
        { key: "reports_generated", name: "Report Master", description: "Health reports generated", icon: "FileBarChart" },
      ],
      serp: [
        { key: "keywords_tracked", name: "Keyword Tracker", description: "Keywords being tracked", icon: "Search" },
        { key: "ranking_wins", name: "Ranking Champion", description: "Keyword position improvements", icon: "TrendingUp" },
        { key: "top_10_entries", name: "Top 10 Achiever", description: "Keywords in top 10", icon: "Trophy" },
        { key: "serp_features", name: "Feature Snatcher", description: "SERP features captured", icon: "Star" },
        { key: "competitor_beats", name: "Competitor Crusher", description: "Competitors outranked", icon: "Swords" },
      ],
      socrates: [
        { key: "insights_generated", name: "Insight Generator", description: "Strategic insights generated", icon: "Lightbulb" },
        { key: "patterns_found", name: "Pattern Finder", description: "Patterns identified in data", icon: "Brain" },
        { key: "recommendations", name: "Advisor", description: "Recommendations provided", icon: "MessageSquare" },
        { key: "predictions_made", name: "Predictor", description: "Accurate predictions made", icon: "TrendingUp" },
        { key: "strategies_formed", name: "Strategist", description: "Strategies formulated", icon: "Map" },
      ],
    };
    
    const definitions = trackDefinitions[crewId] || [];
    const createdTracks: AchievementTrack[] = [];
    
    for (const def of definitions) {
      const track = await this.createAchievementTrack({
        siteId,
        crewId,
        key: def.key,
        name: def.name,
        description: def.description,
        icon: def.icon,
        currentLevel: 1,
        currentTier: "bronze",
        currentValue: 0,
        nextThreshold: 5,
        baseThreshold: 5,
        growthFactor: 1.7,
        lastUpdated: new Date(),
      });
      createdTracks.push(track);
    }
    
    return createdTracks;
  }

  // KB Insights
  async getInsights(siteId: string, limit?: number): Promise<KbInsight[]> {
    const query = db
      .select()
      .from(kbInsights)
      .where(eq(kbInsights.siteId, siteId))
      .orderBy(desc(kbInsights.createdAt));
    
    if (limit) {
      return query.limit(limit);
    }
    return query;
  }

  async getInsightById(insightId: string): Promise<KbInsight | null> {
    const [insight] = await db
      .select()
      .from(kbInsights)
      .where(eq(kbInsights.insightId, insightId))
      .limit(1);
    return insight || null;
  }

  async saveInsight(insight: InsertKbInsight): Promise<KbInsight> {
    const [result] = await db.insert(kbInsights).values(insight).returning();
    return result;
  }

  async saveInsights(insights: InsertKbInsight[]): Promise<void> {
    if (insights.length === 0) return;
    await db.insert(kbInsights).values(insights).onConflictDoNothing();
  }

  async getInsightsCount(siteId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(kbInsights)
      .where(eq(kbInsights.siteId, siteId));
    return result?.count || 0;
  }

  async deleteInsightsBySynthesisRun(synthesisRunId: string): Promise<void> {
    await db
      .delete(kbInsights)
      .where(eq(kbInsights.synthesisRunId, synthesisRunId));
  }

  // KB Recommendations
  async getRecommendations(siteId: string, limit?: number): Promise<KbRecommendation[]> {
    const query = db
      .select()
      .from(kbRecommendations)
      .where(eq(kbRecommendations.siteId, siteId))
      .orderBy(desc(kbRecommendations.createdAt));
    
    if (limit) {
      return query.limit(limit);
    }
    return query;
  }

  async getRecommendationById(recommendationId: string): Promise<KbRecommendation | null> {
    const [rec] = await db
      .select()
      .from(kbRecommendations)
      .where(eq(kbRecommendations.recommendationId, recommendationId))
      .limit(1);
    return rec || null;
  }

  async saveRecommendation(rec: InsertKbRecommendation): Promise<KbRecommendation> {
    const [result] = await db.insert(kbRecommendations).values(rec).returning();
    return result;
  }

  async saveRecommendations(recs: InsertKbRecommendation[]): Promise<void> {
    if (recs.length === 0) return;
    await db.insert(kbRecommendations).values(recs).onConflictDoNothing();
  }

  async getRecommendationsCount(siteId: string): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(kbRecommendations)
      .where(eq(kbRecommendations.siteId, siteId));
    return result?.count || 0;
  }

  async updateRecommendationStatus(recommendationId: string, status: string): Promise<void> {
    await db
      .update(kbRecommendations)
      .set({ status })
      .where(eq(kbRecommendations.recommendationId, recommendationId));
  }

  // SEO Agent Competitors
  async getCompetitors(siteId: string, agentSlug = "natasha"): Promise<SeoAgentCompetitor[]> {
    return db
      .select()
      .from(seoAgentCompetitors)
      .where(and(
        eq(seoAgentCompetitors.siteId, siteId),
        eq(seoAgentCompetitors.agentSlug, agentSlug)
      ))
      .orderBy(desc(seoAgentCompetitors.createdAt));
  }

  async addCompetitor(competitor: InsertSeoAgentCompetitor): Promise<SeoAgentCompetitor> {
    const [result] = await db.insert(seoAgentCompetitors).values(competitor).returning();
    return result;
  }

  async deleteCompetitor(id: number): Promise<void> {
    await db.delete(seoAgentCompetitors).where(eq(seoAgentCompetitors.id, id));
  }

  // Agent Achievements
  async saveAchievement(achievement: InsertAgentAchievement): Promise<AgentAchievement> {
    const [result] = await db.insert(agentAchievements).values(achievement).returning();
    return result;
  }

  async getAchievements(agentSlug: string, siteId = "default", limit = 20): Promise<AgentAchievement[]> {
    return db
      .select()
      .from(agentAchievements)
      .where(and(
        eq(agentAchievements.agentSlug, agentSlug),
        eq(agentAchievements.siteId, siteId)
      ))
      .orderBy(desc(agentAchievements.achievedAt))
      .limit(limit);
  }

  async getRecentAchievements(siteId = "default", limit = 10): Promise<AgentAchievement[]> {
    return db
      .select()
      .from(agentAchievements)
      .where(eq(agentAchievements.siteId, siteId))
      .orderBy(desc(agentAchievements.achievedAt))
      .limit(limit);
  }

  async hasAchievement(agentSlug: string, siteId: string, type: string, title: string): Promise<boolean> {
    const existing = await db
      .select({ id: agentAchievements.id })
      .from(agentAchievements)
      .where(and(
        eq(agentAchievements.agentSlug, agentSlug),
        eq(agentAchievements.siteId, siteId),
        eq(agentAchievements.type, type),
        eq(agentAchievements.title, title)
      ))
      .limit(1);
    return existing.length > 0;
  }

  async deleteAchievement(id: number): Promise<void> {
    await db.delete(agentAchievements).where(eq(agentAchievements.id, id));
  }

  // AI Findings (Atlas)
  async getAiFindings(siteId: string, limit?: number): Promise<AiFinding[]> {
    const query = db
      .select()
      .from(aiFindings)
      .where(and(
        eq(aiFindings.siteId, siteId),
        isNull(aiFindings.resolvedAt)
      ))
      .orderBy(desc(aiFindings.detectedAt));
    
    if (limit) {
      return query.limit(limit);
    }
    return query;
  }

  async getAiFindingsBySeverity(siteId: string, severity: string): Promise<AiFinding[]> {
    return db
      .select()
      .from(aiFindings)
      .where(and(
        eq(aiFindings.siteId, siteId),
        eq(aiFindings.severity, severity),
        isNull(aiFindings.resolvedAt)
      ))
      .orderBy(desc(aiFindings.detectedAt));
  }

  async createAiFinding(finding: InsertAiFinding): Promise<AiFinding> {
    const [result] = await db.insert(aiFindings).values(finding).returning();
    return result;
  }

  async resolveAiFinding(findingId: string): Promise<void> {
    await db
      .update(aiFindings)
      .set({ resolvedAt: new Date() })
      .where(eq(aiFindings.findingId, findingId));
  }

  async clearAiFindings(siteId: string): Promise<void> {
    await db.delete(aiFindings).where(eq(aiFindings.siteId, siteId));
  }

  // AI Snapshots (Atlas)
  async getAiSnapshots(siteId: string, limit?: number): Promise<AiSnapshot[]> {
    const query = db
      .select()
      .from(aiSnapshots)
      .where(eq(aiSnapshots.siteId, siteId))
      .orderBy(desc(aiSnapshots.capturedAt));
    
    if (limit) {
      return query.limit(limit);
    }
    return query;
  }

  async getLatestAiSnapshot(siteId: string): Promise<AiSnapshot | undefined> {
    const [snapshot] = await db
      .select()
      .from(aiSnapshots)
      .where(eq(aiSnapshots.siteId, siteId))
      .orderBy(desc(aiSnapshots.capturedAt))
      .limit(1);
    return snapshot;
  }

  async createAiSnapshot(snapshot: InsertAiSnapshot): Promise<AiSnapshot> {
    const [result] = await db.insert(aiSnapshots).values(snapshot).returning();
    return result;
  }

  // Draper Settings
  async getDraperSettings(siteId: string): Promise<DraperSettings | undefined> {
    const [settings] = await db
      .select()
      .from(draperSettings)
      .where(eq(draperSettings.siteId, siteId))
      .limit(1);
    return settings;
  }

  async upsertDraperSettings(siteId: string, settings: Partial<InsertDraperSettings>): Promise<DraperSettings> {
    const existing = await this.getDraperSettings(siteId);
    
    if (existing) {
      await db
        .update(draperSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(draperSettings.siteId, siteId));
      return (await this.getDraperSettings(siteId))!;
    } else {
      const [newSettings] = await db
        .insert(draperSettings)
        .values({ ...settings, siteId })
        .returning();
      return newSettings;
    }
  }

  // Draper Action Queue
  async getDraperActions(siteId: string, limit = 50): Promise<DraperAction[]> {
    return db
      .select()
      .from(draperActionQueue)
      .where(eq(draperActionQueue.siteId, siteId))
      .orderBy(desc(draperActionQueue.createdAt))
      .limit(limit);
  }

  async createDraperAction(action: InsertDraperAction): Promise<DraperAction> {
    const [result] = await db.insert(draperActionQueue).values(action).returning();
    return result;
  }

  async updateDraperActionStatus(id: number, status: string, result?: any): Promise<void> {
    const updateData: any = { status, updatedAt: new Date() };
    if (result !== undefined) {
      updateData.result = result;
    }
    await db
      .update(draperActionQueue)
      .set(updateData)
      .where(eq(draperActionQueue.id, id));
  }

  async cancelDraperAction(id: number): Promise<void> {
    await db
      .update(draperActionQueue)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(draperActionQueue.id, id));
  }

  // API Keys
  async createApiKey(key: InsertApiKey): Promise<ApiKey> {
    const [result] = await db.insert(apiKeys).values(key).returning();
    return result;
  }

  async getApiKeys(siteId = "default"): Promise<ApiKey[]> {
    return db
      .select()
      .from(apiKeys)
      .where(and(
        eq(apiKeys.siteId, siteId),
        isNull(apiKeys.revokedAt)
      ))
      .orderBy(desc(apiKeys.createdAt));
  }

  async getApiKeyByPrefix(prefix: string): Promise<ApiKey | undefined> {
    const [key] = await db
      .select()
      .from(apiKeys)
      .where(and(
        eq(apiKeys.prefix, prefix),
        isNull(apiKeys.revokedAt)
      ))
      .limit(1);
    return key;
  }

  async getApiKeyById(keyId: string): Promise<ApiKey | undefined> {
    const [key] = await db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.keyId, keyId))
      .limit(1);
    return key;
  }

  async revokeApiKey(keyId: string): Promise<void> {
    await db
      .update(apiKeys)
      .set({ revokedAt: new Date() })
      .where(eq(apiKeys.keyId, keyId));
  }

  async updateApiKeyLastUsed(keyId: string): Promise<void> {
    await db
      .update(apiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(apiKeys.keyId, keyId));
  }

  // Finding by ID
  async getFindingById(findingId: string): Promise<Finding | undefined> {
    const [finding] = await db
      .select()
      .from(findings)
      .where(eq(findings.findingId, findingId))
      .limit(1);
    return finding;
  }

  // Website Integrations
  async getWebsiteIntegrations(siteId: string): Promise<WebsiteIntegration[]> {
    return db
      .select()
      .from(websiteIntegrations)
      .where(eq(websiteIntegrations.siteId, siteId))
      .orderBy(asc(websiteIntegrations.integrationType));
  }

  async getWebsiteIntegration(siteId: string, integrationType: string): Promise<WebsiteIntegration | undefined> {
    const [result] = await db
      .select()
      .from(websiteIntegrations)
      .where(and(
        eq(websiteIntegrations.siteId, siteId),
        eq(websiteIntegrations.integrationType, integrationType)
      ))
      .limit(1);
    return result;
  }

  async upsertWebsiteIntegration(integration: InsertWebsiteIntegration): Promise<WebsiteIntegration> {
    const existing = await this.getWebsiteIntegration(integration.siteId, integration.integrationType);
    
    if (existing) {
      const [updated] = await db
        .update(websiteIntegrations)
        .set({ 
          ...integration,
          updatedAt: new Date()
        })
        .where(eq(websiteIntegrations.id, existing.id))
        .returning();
      return updated;
    } else {
      const [created] = await db
        .insert(websiteIntegrations)
        .values(integration)
        .returning();
      return created;
    }
  }

  async updateWebsiteIntegrationStatus(
    siteId: string, 
    integrationType: string, 
    status: string, 
    error?: { message: string; code?: string; details?: any }
  ): Promise<void> {
    const updates: any = { 
      status,
      lastCheckedAt: new Date(),
      updatedAt: new Date()
    };
    
    if (status === "connected") {
      updates.lastOkAt = new Date();
      updates.lastError = null;
    } else if (error) {
      updates.lastError = { ...error, timestamp: new Date().toISOString() };
    }
    
    await db
      .update(websiteIntegrations)
      .set(updates)
      .where(and(
        eq(websiteIntegrations.siteId, siteId),
        eq(websiteIntegrations.integrationType, integrationType)
      ));
  }

  async deleteWebsiteIntegration(siteId: string, integrationType: string): Promise<void> {
    await db
      .delete(websiteIntegrations)
      .where(and(
        eq(websiteIntegrations.siteId, siteId),
        eq(websiteIntegrations.integrationType, integrationType)
      ));
  }

  // Core Web Vitals Daily
  async insertCoreWebVitalsDaily(data: InsertCoreWebVitalsDaily): Promise<CoreWebVitalsDaily> {
    const [result] = await db
      .insert(coreWebVitalsDaily)
      .values(data)
      .returning();
    return result;
  }

  async getLatestCoreWebVitals(siteId: string): Promise<CoreWebVitalsDaily | undefined> {
    const [result] = await db
      .select()
      .from(coreWebVitalsDaily)
      .where(eq(coreWebVitalsDaily.siteId, siteId))
      .orderBy(desc(coreWebVitalsDaily.collectedAt))
      .limit(1);
    return result;
  }

  async getCoreWebVitalsHistory(siteId: string, days: number): Promise<CoreWebVitalsDaily[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    return db
      .select()
      .from(coreWebVitalsDaily)
      .where(and(
        eq(coreWebVitalsDaily.siteId, siteId),
        gte(coreWebVitalsDaily.collectedAt, cutoffDate)
      ))
      .orderBy(asc(coreWebVitalsDaily.collectedAt));
  }

  // Free Reports
  async createFreeReport(data: InsertFreeReport): Promise<FreeReport> {
    const [result] = await db
      .insert(freeReports)
      .values(data)
      .returning();
    return result;
  }

  async getFreeReportById(reportId: string): Promise<FreeReport | null> {
    const [result] = await db
      .select()
      .from(freeReports)
      .where(eq(freeReports.reportId, reportId))
      .limit(1);
    return result || null;
  }

  async getFreeReportByShareToken(token: string): Promise<FreeReport | null> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const [result] = await db
      .select()
      .from(freeReports)
      .where(eq(freeReports.shareToken, hashedToken))
      .limit(1);
    return result || null;
  }

  async updateFreeReport(reportId: string, updates: Partial<FreeReport>): Promise<void> {
    await db
      .update(freeReports)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(freeReports.reportId, reportId));
  }

  async createShareToken(reportId: string): Promise<string> {
    const rawToken = crypto.randomUUID();
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    await db
      .update(freeReports)
      .set({ 
        shareToken: hashedToken, 
        shareTokenExpiresAt: expiresAt,
        updatedAt: new Date() 
      })
      .where(eq(freeReports.reportId, reportId));
    
    return rawToken;
  }

  // Report Shares
  async createReportShare(data: InsertReportShare): Promise<ReportShare> {
    const [result] = await db
      .insert(reportShares)
      .values(data)
      .returning();
    return result;
  }

  async getReportShareByToken(shareToken: string): Promise<ReportShare | null> {
    const [result] = await db
      .select()
      .from(reportShares)
      .where(eq(reportShares.shareToken, shareToken))
      .limit(1);
    return result || null;
  }

  async getReportSharesByScanId(scanId: string): Promise<ReportShare[]> {
    return db
      .select()
      .from(reportShares)
      .where(eq(reportShares.scanId, scanId))
      .orderBy(desc(reportShares.createdAt));
  }

  async incrementShareViewCount(shareToken: string): Promise<void> {
    await db
      .update(reportShares)
      .set({
        viewCount: sql`${reportShares.viewCount} + 1`,
        lastViewedAt: new Date(),
      })
      .where(eq(reportShares.shareToken, shareToken));
  }

  async revokeReportShare(id: number): Promise<void> {
    await db
      .update(reportShares)
      .set({ revokedAt: new Date() })
      .where(eq(reportShares.id, id));
  }

  // User Authentication
  async getUserByEmail(email: string): Promise<User | null> {
    const [result] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    return result || null;
  }

  async getUserById(id: number): Promise<User | null> {
    const [result] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result || null;
  }

  async createUser(data: InsertUser): Promise<User> {
    const [result] = await db
      .insert(users)
      .values({
        ...data,
        email: data.email.toLowerCase(),
      })
      .returning();
    return result;
  }

  async updateUserLogin(userId: number): Promise<void> {
    await db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async updateUserDefaultWebsite(userId: number, websiteId: string): Promise<void> {
    await db
      .update(users)
      .set({ defaultWebsiteId: websiteId, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async getUserWebsites(userId: number): Promise<string[]> {
    // For now, return all sites. In a multi-tenant setup, this would filter by user ownership
    const allSites = await db.select({ siteId: sites.siteId }).from(sites);
    return allSites.map(s => s.siteId);
  }

  // Verification Tokens
  async createVerificationToken(data: InsertVerificationToken): Promise<VerificationToken> {
    const [result] = await db
      .insert(verificationTokens)
      .values(data)
      .returning();
    return result;
  }

  async getVerificationToken(token: string, purpose: string): Promise<VerificationToken | null> {
    const [result] = await db
      .select()
      .from(verificationTokens)
      .where(
        and(
          eq(verificationTokens.token, token),
          eq(verificationTokens.purpose, purpose),
          isNull(verificationTokens.consumedAt)
        )
      )
      .limit(1);
    return result || null;
  }

  async consumeVerificationToken(tokenId: number): Promise<void> {
    await db
      .update(verificationTokens)
      .set({ consumedAt: new Date() })
      .where(eq(verificationTokens.id, tokenId));
  }

  async deleteUserVerificationTokens(userId: number, purpose: string): Promise<void> {
    await db
      .delete(verificationTokens)
      .where(
        and(
          eq(verificationTokens.userId, userId),
          eq(verificationTokens.purpose, purpose)
        )
      );
  }

  async verifyUser(userId: number): Promise<void> {
    await db
      .update(users)
      .set({ verifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  async updateUserPassword(userId: number, passwordHash: string): Promise<void> {
    await db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  // Crew Runs (canonical identity system)
  async createCrewRun(run: InsertCrewRun): Promise<CrewRun> {
    const [result] = await db.insert(crewRuns).values(run).returning();
    return result;
  }

  async updateCrewRun(runId: number, updates: Partial<InsertCrewRun>): Promise<CrewRun | undefined> {
    const [result] = await db
      .update(crewRuns)
      .set(updates)
      .where(eq(crewRuns.id, runId))
      .returning();
    return result;
  }

  async getCrewRunById(runId: number): Promise<CrewRun | undefined> {
    const [result] = await db
      .select()
      .from(crewRuns)
      .where(eq(crewRuns.id, runId))
      .limit(1);
    return result;
  }

  async getLatestCrewRun(siteId: string, crewId: string): Promise<CrewRun | undefined> {
    const [result] = await db
      .select()
      .from(crewRuns)
      .where(and(eq(crewRuns.siteId, siteId), eq(crewRuns.crewId, crewId)))
      .orderBy(desc(crewRuns.createdAt))
      .limit(1);
    return result;
  }

  async getRecentCrewRuns(siteId: string, crewId: string, limit: number = 10): Promise<CrewRun[]> {
    return db
      .select()
      .from(crewRuns)
      .where(and(eq(crewRuns.siteId, siteId), eq(crewRuns.crewId, crewId)))
      .orderBy(desc(crewRuns.createdAt))
      .limit(limit);
  }

  // Crew KPIs
  async saveCrewKpis(kpis: InsertCrewKpi[]): Promise<CrewKpi[]> {
    if (kpis.length === 0) return [];
    return db.insert(crewKpis).values(kpis).returning();
  }

  async getCrewKpisByRunId(runId: number): Promise<CrewKpi[]> {
    return db
      .select()
      .from(crewKpis)
      .where(eq(crewKpis.runId, runId));
  }

  async getLatestCrewKpis(siteId: string, crewId: string): Promise<CrewKpi[]> {
    const latestRun = await this.getLatestCrewRun(siteId, crewId);
    if (!latestRun) return [];
    return this.getCrewKpisByRunId(latestRun.id);
  }

  // Crew Findings
  async saveCrewFindings(findings: InsertCrewFinding[]): Promise<CrewFinding[]> {
    if (findings.length === 0) return [];
    return db.insert(crewFindings).values(findings).returning();
  }

  async getCrewFindingsByRunId(runId: number): Promise<CrewFinding[]> {
    return db
      .select()
      .from(crewFindings)
      .where(eq(crewFindings.runId, runId));
  }

  async getRecentCrewFindings(siteId: string, crewId: string, limit: number = 20): Promise<CrewFinding[]> {
    return db
      .select()
      .from(crewFindings)
      .where(and(eq(crewFindings.siteId, siteId), eq(crewFindings.crewId, crewId)))
      .orderBy(desc(crewFindings.surfacedAt))
      .limit(limit);
  }

  // Socrates: Agent Action Logs
  async createAgentActionLog(data: InsertAgentActionLog): Promise<AgentActionLog> {
    const [result] = await db.insert(agentActionLogs).values(data).returning();
    return result;
  }

  async getAgentActionLogsByTimeWindow(siteId: string, startTime: Date, endTime: Date): Promise<AgentActionLog[]> {
    return db
      .select()
      .from(agentActionLogs)
      .where(
        and(
          eq(agentActionLogs.siteId, siteId),
          gte(agentActionLogs.timestampStart, startTime),
          sql`${agentActionLogs.timestampStart} <= ${endTime}`
        )
      )
      .orderBy(desc(agentActionLogs.timestampStart));
  }

  async getAgentActionLogsByActionIds(actionIds: string[]): Promise<AgentActionLog[]> {
    if (actionIds.length === 0) return [];
    return db
      .select()
      .from(agentActionLogs)
      .where(sql`${agentActionLogs.actionId} = ANY(${actionIds})`);
  }

  // Socrates: Outcome Event Logs
  async createOutcomeEventLog(data: InsertOutcomeEventLog): Promise<OutcomeEventLog> {
    const [result] = await db.insert(outcomeEventLogs).values(data).returning();
    return result;
  }

  async getOutcomeEventLogsBySite(siteId: string, limit: number = 100): Promise<OutcomeEventLog[]> {
    return db
      .select()
      .from(outcomeEventLogs)
      .where(eq(outcomeEventLogs.siteId, siteId))
      .orderBy(desc(outcomeEventLogs.timestamp))
      .limit(limit);
  }

  async getUnattributedOutcomeEvents(siteId: string): Promise<OutcomeEventLog[]> {
    return db
      .select()
      .from(outcomeEventLogs)
      .where(
        and(
          eq(outcomeEventLogs.siteId, siteId),
          sql`NOT EXISTS (
            SELECT 1 FROM ${attributionRecords} 
            WHERE ${attributionRecords.eventId} = ${outcomeEventLogs.eventId}
          )`
        )
      )
      .orderBy(desc(outcomeEventLogs.timestamp));
  }

  // Socrates: Attribution Records
  async createAttributionRecord(data: InsertAttributionRecord): Promise<AttributionRecord> {
    const [result] = await db.insert(attributionRecords).values(data).returning();
    return result;
  }

  async getAttributionsByEventId(eventId: string): Promise<AttributionRecord[]> {
    return db
      .select()
      .from(attributionRecords)
      .where(eq(attributionRecords.eventId, eventId))
      .orderBy(desc(attributionRecords.confidence));
  }

  // Socrates: Knowledge Base Entries
  async createSocratesKbEntry(data: InsertSocratesKbEntry): Promise<SocratesKbEntry> {
    const [result] = await db.insert(socratesKbEntries).values(data).returning();
    return result;
  }

  async updateSocratesKbEntry(kbId: string, updates: Partial<InsertSocratesKbEntry>): Promise<SocratesKbEntry | null> {
    const [result] = await db
      .update(socratesKbEntries)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(socratesKbEntries.kbId, kbId))
      .returning();
    return result || null;
  }

  async getSocratesKbEntriesByContext(params: { 
    siteId?: string; 
    metricKeys?: string[]; 
    agentId?: string; 
    status?: string; 
    limit?: number 
  }): Promise<SocratesKbEntry[]> {
    const conditions: any[] = [];
    
    if (params.status) {
      conditions.push(eq(socratesKbEntries.status, params.status));
    }
    
    let query = db
      .select()
      .from(socratesKbEntries);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    const results = await query
      .orderBy(desc(socratesKbEntries.confidence))
      .limit(params.limit || 50);
    
    return results;
  }

  async getSocratesKbEntryByKbId(kbId: string): Promise<SocratesKbEntry | null> {
    const [result] = await db
      .select()
      .from(socratesKbEntries)
      .where(eq(socratesKbEntries.kbId, kbId))
      .limit(1);
    return result || null;
  }
}

export const storage = new DBStorage();
