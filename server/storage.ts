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
} from "@shared/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";

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
}

export const storage = new DBStorage();
