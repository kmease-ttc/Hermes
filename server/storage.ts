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
  type InsertRun
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
}

export const storage = new DBStorage();
