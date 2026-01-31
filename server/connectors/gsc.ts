import { google } from "googleapis";
import { googleAuth } from "../auth/google-oauth";
import { storage } from "../storage";
import { type InsertGSCDaily, type InsertGscUrlInspection, type InsertGscCoverageDaily } from "@shared/schema";
import { logger } from "../utils/logger";
import { withRetry, RateLimiter } from "../utils/retry";

const rateLimiter = new RateLimiter(10, 1);
// Separate rate limiter for URL Inspection API (600 req/min limit, conservative at 5/sec)
const inspectionRateLimiter = new RateLimiter(5, 5);

const GSC_INSPECTION_DAILY_LIMIT = parseInt(process.env.GSC_INSPECTION_DAILY_LIMIT || '100', 10);

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
  private siteId?: number;

  constructor(siteUrl?: string, siteId?: number) {
    this.siteUrl = siteUrl || process.env.GSC_SITE || '';
    this.siteId = siteId;
    if (!this.siteUrl) {
      logger.warn('GSC', 'GSC site URL not set');
    }
  }

  private async getAuth() {
    if (this.siteId !== undefined) {
      return googleAuth.getAuthenticatedClientForSite(this.siteId);
    }
    return googleAuth.getAuthenticatedClient();
  }

  async fetchDailyData(startDate: string, endDate: string): Promise<InsertGSCDaily[]> {
    if (!this.siteUrl) {
      throw new Error('GSC site URL is required');
    }

    logger.info('GSC', `Fetching data from ${startDate} to ${endDate}`);
    
    await rateLimiter.acquire();

    return withRetry(
      async () => {
        const auth = await this.getAuth();
        
        const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(this.siteUrl)}/searchAnalytics/query`;
        
        const accessToken = (auth.credentials as any).access_token;
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate,
            endDate,
            dimensions: ['date', 'query', 'page'],
            rowLimit: 5000,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`GSC API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const rows = data.rows || [];
        
        const results: InsertGSCDaily[] = rows.map((row: any) => ({
          date: row.keys?.[0] || startDate,
          clicks: row.clicks || 0,
          impressions: row.impressions || 0,
          ctr: row.ctr || 0,
          position: row.position || 0,
          query: row.keys?.[1] || null,
          page: row.keys?.[2] || null,
          rawData: {
            keys: row.keys,
            clicks: row.clicks,
            impressions: row.impressions,
            ctr: row.ctr,
            position: row.position,
          },
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
      throw new Error('GSC site URL is required');
    }

    logger.info('GSC', 'Fetching sitemaps list');
    
    await rateLimiter.acquire();

    return withRetry(
      async () => {
        const auth = await this.getAuth();
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
      throw new Error('GSC site URL is required');
    }

    logger.info('GSC', `Inspecting URL: ${pageUrl}`);
    
    await rateLimiter.acquire();

    try {
      const auth = await this.getAuth();
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
      throw new Error('GSC site URL is required');
    }

    await rateLimiter.acquire();

    return withRetry(
      async () => {
        const auth = await this.getAuth();
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
      throw new Error('GSC site URL is required');
    }

    await rateLimiter.acquire();

    return withRetry(
      async () => {
        const auth = await this.getAuth();
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
    return storage.getGSCDataByDateRange(startDate, endDate) as any;
  }

  async testConnection(): Promise<{ success: boolean; message: string; sampleCount?: number }> {
    if (!this.siteUrl) {
      return { success: false, message: 'GSC site URL not configured' };
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const data = await this.fetchDailyData(yesterday, today);
      return { success: true, message: 'GSC connected', sampleCount: data.length };
    } catch (error: any) {
      return { success: false, message: error.message || 'GSC connection failed' };
    }
  }

  /**
   * Returns the top N page URLs by clicks, suitable for batch inspection.
   */
  async getTopPagesForInspection(startDate: string, endDate: string, limit: number = GSC_INSPECTION_DAILY_LIMIT): Promise<string[]> {
    const pages = await this.getPerformanceByPage(startDate, endDate, limit);
    return pages.map(p => p.page);
  }

  /**
   * Classify a URL Inspection result into an error category.
   */
  private classifyInspectionResult(status: IndexingStatus): { isIndexed: boolean; hasError: boolean; errorCategory: string | null } {
    // Check if indexed
    const isIndexed = status.verdict === 'PASS' ||
      status.coverageState?.toLowerCase().includes('submitted and indexed') ||
      status.coverageState?.toLowerCase().includes('indexed');

    if (isIndexed) {
      return { isIndexed: true, hasError: false, errorCategory: null };
    }

    // Classify the error
    if (status.robotsTxtState === 'DISALLOWED' || status.pageFetchState === 'BLOCKED_BY_ROBOTS') {
      return { isIndexed: false, hasError: true, errorCategory: 'robots_blocked' };
    }
    if (status.indexingState === 'BLOCKED_BY_META_TAG') {
      return { isIndexed: false, hasError: true, errorCategory: 'noindex' };
    }
    if (status.pageFetchState === 'SOFT_404' || status.pageFetchState === 'NOT_FOUND') {
      return { isIndexed: false, hasError: true, errorCategory: 'not_found' };
    }
    if (status.pageFetchState === 'SERVER_ERROR') {
      return { isIndexed: false, hasError: true, errorCategory: 'server_error' };
    }
    if (status.pageFetchState === 'REDIRECT_ERROR') {
      return { isIndexed: false, hasError: true, errorCategory: 'redirect_error' };
    }

    return { isIndexed: false, hasError: true, errorCategory: 'crawl_error' };
  }

  /**
   * Inspect multiple URLs in batch, classify results, and persist to storage.
   * Respects daily API limits (default 100 URLs/site/day).
   */
  async batchUrlInspection(urls: string[], siteId: string): Promise<{
    inspected: number;
    indexed: number;
    errors: number;
    coveragePercent: number;
    results: InspectionResult[];
  }> {
    if (!this.siteUrl) {
      throw new Error('GSC site URL is required');
    }

    const capped = urls.slice(0, GSC_INSPECTION_DAILY_LIMIT);
    logger.info('GSC', `Starting batch URL inspection for ${capped.length} URLs (site: ${siteId})`);

    const today = new Date().toISOString().split('T')[0];
    const results: InspectionResult[] = [];
    const inspectionRows: InsertGscUrlInspection[] = [];

    for (const pageUrl of capped) {
      await inspectionRateLimiter.acquire();

      const status = await this.fetchUrlInspection(pageUrl);
      if (!status) {
        // Inspection failed for this URL, skip
        continue;
      }

      const classification = this.classifyInspectionResult(status);

      const result: InspectionResult = {
        pageUrl,
        coverageState: status.coverageState,
        verdict: status.verdict || 'UNKNOWN',
        robotsTxtState: status.robotsTxtState || 'UNKNOWN',
        indexingState: status.indexingState || 'UNKNOWN',
        pageFetchState: status.pageFetchState || 'UNKNOWN',
        ...classification,
        rawData: status,
      };
      results.push(result);

      inspectionRows.push({
        websiteId: siteId,
        date: today,
        pageUrl,
        coverageState: status.coverageState,
        verdict: status.verdict || null,
        robotsTxtState: status.robotsTxtState || null,
        indexingState: status.indexingState || null,
        pageFetchState: status.pageFetchState || null,
        isIndexed: classification.isIndexed,
        hasError: classification.hasError,
        errorCategory: classification.errorCategory,
        rawData: status,
      });
    }

    // Persist individual inspection results
    await storage.saveUrlInspections(inspectionRows);

    // Compute and persist daily aggregate
    const indexed = results.filter(r => r.isIndexed).length;
    const errorCount = results.filter(r => r.hasError).length;
    const inspected = results.length;
    const coveragePercent = inspected > 0 ? (indexed / inspected) * 100 : 0;

    const coverageData: InsertGscCoverageDaily = {
      siteId,
      date: new Date(today),
      totalInspected: inspected,
      totalIndexed: indexed,
      totalNotIndexed: inspected - indexed,
      totalErrors: errorCount,
      robotsBlocked: results.filter(r => r.errorCategory === 'robots_blocked').length,
      noindexDetected: results.filter(r => r.errorCategory === 'noindex').length,
      crawlErrors: results.filter(r => r.errorCategory === 'crawl_error').length,
      redirectErrors: results.filter(r => r.errorCategory === 'redirect_error').length,
      serverErrors: results.filter(r => r.errorCategory === 'server_error').length,
      notFoundErrors: results.filter(r => r.errorCategory === 'not_found').length,
      coveragePercent: Math.round(coveragePercent * 10) / 10,
      rawData: { urlCount: capped.length, successfulInspections: inspected },
    };

    await storage.saveGscCoverageDaily(coverageData);

    logger.info('GSC', `Batch inspection complete: ${inspected} inspected, ${indexed} indexed, ${errorCount} errors (${coveragePercent.toFixed(1)}% coverage)`);

    return { inspected, indexed, errors: errorCount, coveragePercent, results };
  }
}

export interface InspectionResult {
  pageUrl: string;
  coverageState: string;
  verdict: string;
  robotsTxtState: string;
  indexingState: string;
  pageFetchState: string;
  isIndexed: boolean;
  hasError: boolean;
  errorCategory: string | null;
  rawData: any;
}

/** Global singleton (legacy — uses env var + global oauth_tokens row) */
export const gscConnector = new GSCConnector();

/**
 * Factory: create a GSCConnector for a specific site using per-site credentials.
 */
export async function createGSCConnector(siteId: number): Promise<GSCConnector> {
  const creds = await storage.getSiteGoogleCredentials(siteId);
  if (!creds) {
    throw new Error(`No Google credentials found for site ${siteId}`);
  }
  if (!creds.gscSiteUrl) {
    throw new Error(`No GSC site URL configured for site ${siteId}`);
  }
  return new GSCConnector(creds.gscSiteUrl, siteId);
}
