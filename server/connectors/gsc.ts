import { google } from "googleapis";
import { googleAuth } from "../auth/google-oauth";
import { storage } from "../storage";
import { type InsertGSCDaily } from "@shared/schema";
import { logger } from "../utils/logger";
import { withRetry, RateLimiter } from "../utils/retry";

const rateLimiter = new RateLimiter(10, 1);

export interface SitemapInfo {
  path: string;
  lastSubmitted?: string;
  lastDownloaded?: string;
  isPending: boolean;
  isSitemapsIndex: boolean;
  warnings?: number;
  errors?: number;
}

export interface IndexingStatus {
  coverageState: string;
  robotsTxtState?: string;
  indexingState?: string;
  pageFetchState?: string;
  verdict?: string;
}

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
          rawData: JSON.parse(JSON.stringify({
            keys: row.keys,
            clicks: row.clicks,
            impressions: row.impressions,
            ctr: row.ctr,
            position: row.position,
          })),
        }));

        await storage.saveGSCData(results);
        logger.info('GSC', `Saved ${results.length} records`);
        
        return results;
      },
      { maxAttempts: 3, delayMs: 2000 },
      'GSC fetchDailyData'
    );
  }

  async fetchSitemaps(): Promise<SitemapInfo[]> {
    if (!this.siteUrl) {
      throw new Error('GSC_SITE environment variable is required');
    }

    logger.info('GSC', 'Fetching sitemaps list');
    
    await rateLimiter.acquire();

    return withRetry(
      async () => {
        const auth = await googleAuth.getAuthenticatedClient();
        const searchConsole = google.searchconsole('v1');

        const response = await searchConsole.sitemaps.list({
          auth,
          siteUrl: this.siteUrl,
        });

        const sitemaps = response.data.sitemap || [];
        
        const results: SitemapInfo[] = sitemaps.map(sitemap => ({
          path: sitemap.path || '',
          lastSubmitted: sitemap.lastSubmitted || undefined,
          lastDownloaded: sitemap.lastDownloaded || undefined,
          isPending: sitemap.isPending || false,
          isSitemapsIndex: sitemap.isSitemapsIndex || false,
          warnings: sitemap.warnings ? parseInt(sitemap.warnings) : 0,
          errors: sitemap.errors ? parseInt(sitemap.errors) : 0,
        }));

        logger.info('GSC', `Found ${results.length} sitemaps`);
        return results;
      },
      { maxAttempts: 3, delayMs: 2000 },
      'GSC fetchSitemaps'
    );
  }

  async fetchUrlInspection(pageUrl: string): Promise<IndexingStatus | null> {
    if (!this.siteUrl) {
      throw new Error('GSC_SITE environment variable is required');
    }

    logger.info('GSC', `Inspecting URL: ${pageUrl}`);
    
    await rateLimiter.acquire();

    try {
      const auth = await googleAuth.getAuthenticatedClient();
      const searchConsole = google.searchconsole('v1');

      const response = await searchConsole.urlInspection.index.inspect({
        auth,
        requestBody: {
          inspectionUrl: pageUrl,
          siteUrl: this.siteUrl,
        },
      });

      const result = response.data.inspectionResult;
      
      return {
        coverageState: result?.indexStatusResult?.coverageState || 'UNKNOWN',
        robotsTxtState: result?.indexStatusResult?.robotsTxtState || undefined,
        indexingState: result?.indexStatusResult?.indexingState || undefined,
        pageFetchState: result?.indexStatusResult?.pageFetchState || undefined,
        verdict: result?.indexStatusResult?.verdict || undefined,
      };
    } catch (error: any) {
      logger.warn('GSC', `URL inspection failed for ${pageUrl}`, { error: error.message });
      return null;
    }
  }

  async getPerformanceByPage(startDate: string, endDate: string, limit: number = 50) {
    if (!this.siteUrl) {
      throw new Error('GSC_SITE environment variable is required');
    }

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
            dimensions: ['page'],
            rowLimit: limit,
          },
        });

        return (response.data.rows || []).map(row => ({
          page: row.keys?.[0] || '',
          clicks: row.clicks || 0,
          impressions: row.impressions || 0,
          ctr: row.ctr || 0,
          position: row.position || 0,
        }));
      },
      { maxAttempts: 3, delayMs: 2000 },
      'GSC getPerformanceByPage'
    );
  }

  async getPerformanceByQuery(startDate: string, endDate: string, limit: number = 100) {
    if (!this.siteUrl) {
      throw new Error('GSC_SITE environment variable is required');
    }

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
            dimensions: ['query'],
            rowLimit: limit,
          },
        });

        return (response.data.rows || []).map(row => ({
          query: row.keys?.[0] || '',
          clicks: row.clicks || 0,
          impressions: row.impressions || 0,
          ctr: row.ctr || 0,
          position: row.position || 0,
        }));
      },
      { maxAttempts: 3, delayMs: 2000 },
      'GSC getPerformanceByQuery'
    );
  }

  async getDataByDateRange(startDate: string, endDate: string): Promise<InsertGSCDaily[]> {
    return storage.getGSCDataByDateRange(startDate, endDate);
  }
}

export const gscConnector = new GSCConnector();
