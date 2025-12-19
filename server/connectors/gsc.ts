import { google } from "googleapis";
import { googleAuth } from "../auth/google-oauth";
import { storage } from "../storage";
import { type InsertGSCDaily } from "@shared/schema";
import { logger } from "../utils/logger";
import { withRetry, RateLimiter } from "../utils/retry";

const rateLimiter = new RateLimiter(10, 1);

export class GSCConnector {
  private siteUrl: string;

  constructor() {
    this.siteUrl = process.env.GSC_SITE || '';
    if (!this.siteUrl) {
      logger.warn('GSC', 'GSC_SITE not set');
    }
  }

  async fetchDailyData(startDate: string, endDate: string): Promise<InsertGSCDaily[]> {
    if (!this.siteUrl) {
      throw new Error('GSC_SITE environment variable is required');
    }

    logger.info('GSC', `Fetching data from ${startDate} to ${endDate}`);
    
    await rateLimiter.acquire();

    return withRetry(
      async () => {
        const auth = await googleAuth.getAuthenticatedClient();
        const searchConsole = google.searchconsole('v1');

        const response = await searchConsole.searchanalytics.query({
          auth,
          siteUrl: this.siteUrl,
          requestBody: {
            startDate,
            endDate,
            dimensions: ['date', 'query', 'page'],
            rowLimit: 25000,
          },
        });

        const rows = response.data.rows || [];
        const results: InsertGSCDaily[] = rows.map(row => ({
          date: row.keys?.[0] || startDate,
          clicks: row.clicks || 0,
          impressions: row.impressions || 0,
          ctr: row.ctr || 0,
          position: row.position || 0,
          query: row.keys?.[1] || null,
          page: row.keys?.[2] || null,
          rawData: row as any,
        }));

        await storage.saveGSCData(results);
        logger.info('GSC', `Saved ${results.length} records`);
        
        return results;
      },
      { maxAttempts: 3, delayMs: 2000 },
      'GSC fetchDailyData'
    );
  }

  async getDataByDateRange(startDate: string, endDate: string): Promise<InsertGSCDaily[]> {
    return storage.getGSCDataByDateRange(startDate, endDate);
  }
}

export const gscConnector = new GSCConnector();
