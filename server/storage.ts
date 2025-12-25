import { db } from "./db";
import { 
  oauthTokens, 
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
  type OAuthToken,
  type InsertOAuthToken,
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
} from "@shared/schema";
import { eq, desc, and, gte, sql, asc, or, isNull } from "drizzle-orm";

export interface IStorage {
  // OAuth Token Management
  saveToken(token: InsertOAuthToken): Promise<OAuthToken>;
  getToken(provider: string): Promise<OAuthToken | undefined>;
  updateToken(provider: string, token: Partial<InsertOAuthToken>): Promise<void>;
  
  // GA4 Data
  saveGA4Data(data: InsertGA4Daily[]): Promise<void>;
  getGA4DataByDateRange(startDate: string, endDate: string): Promise<GA4Daily[]>;
  upsertGA4Daily(data: InsertGA4Daily): Promise<void>;
  
  // GSC Data
  saveGSCData(data: InsertGSCDaily[]): Promise<void>;
  getGSCDataByDateRange(startDate: string, endDate: string): Promise<GSCDaily[]>;
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
  updateFindingStatus(findingId: string, status: string): Promise<void>;
  
  // Audit Logs
  saveAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogsBySite(siteId: string, limit?: number): Promise<AuditLog[]>;
  
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

  async getGA4DataByDateRange(startDate: string, endDate: string): Promise<GA4Daily[]> {
    return db
      .select()
      .from(ga4Daily)
      .where(and(gte(ga4Daily.date, startDate), sql`${ga4Daily.date} <= ${endDate}`))
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

  async getGSCDataByDateRange(startDate: string, endDate: string): Promise<GSCDaily[]> {
    return db
      .select()
      .from(gscDaily)
      .where(and(gte(gscDaily.date, startDate), sql`${gscDaily.date} <= ${endDate}`))
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

  // Audit Logs
  async saveAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const [newLog] = await db.insert(auditLogs).values(log).returning();
    return newLog;
  }

  async getAuditLogsBySite(siteId: string, limit = 50): Promise<AuditLog[]> {
    return db.select().from(auditLogs).where(eq(auditLogs.siteId, siteId)).orderBy(desc(auditLogs.createdAt)).limit(limit);
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
}

export const storage = new DBStorage();
