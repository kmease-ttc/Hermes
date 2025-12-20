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
} from "@shared/schema";
import { eq, desc, and, gte, sql, asc } from "drizzle-orm";

export interface IStorage {
  // OAuth Token Management
  saveToken(token: InsertOAuthToken): Promise<OAuthToken>;
  getToken(provider: string): Promise<OAuthToken | undefined>;
  updateToken(provider: string, token: Partial<InsertOAuthToken>): Promise<void>;
  
  // GA4 Data
  saveGA4Data(data: InsertGA4Daily[]): Promise<void>;
  getGA4DataByDateRange(startDate: string, endDate: string): Promise<GA4Daily[]>;
  
  // GSC Data
  saveGSCData(data: InsertGSCDaily[]): Promise<void>;
  getGSCDataByDateRange(startDate: string, endDate: string): Promise<GSCDaily[]>;
  
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
}

export const storage = new DBStorage();
