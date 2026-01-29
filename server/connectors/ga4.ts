import { google } from "googleapis";
import { googleAuth } from "../auth/google-oauth";
import { storage } from "../storage";
import { type InsertGA4Daily } from "@shared/schema";
import { logger } from "../utils/logger";
import { withRetry, RateLimiter } from "../utils/retry";

const rateLimiter = new RateLimiter(10, 1);

export interface RealtimeData {
  activeUsers: number;
  eventCount: number;
  lastEventTime?: string;
  isHealthy: boolean;
}

export interface EngagementMetrics {
  engagementRate: number;
  engagedSessions: number;
  averageSessionDuration: number;
  bounceRate: number;
  sessionsPerUser: number;
}

export interface ChannelPerformance {
  channel: string;
  sessions: number;
  users: number;
  conversions: number;
  engagementRate: number;
}

export interface LandingPagePerformance {
  landingPage: string;
  sessions: number;
  users: number;
  bounceRate: number;
  conversions: number;
}

export class GA4Connector {
  private propertyId: string;
  private siteId?: number;

  constructor(propertyId?: string, siteId?: number) {
    this.propertyId = propertyId || process.env.GA4_PROPERTY_ID || '';
    this.siteId = siteId;
    if (!this.propertyId) {
      logger.warn('GA4', 'GA4 property ID not set');
    }
  }

  private async getAuth() {
    if (this.siteId !== undefined) {
      return googleAuth.getAuthenticatedClientForSite(this.siteId);
    }
    return googleAuth.getAuthenticatedClient();
  }

  async fetchDailyData(startDate: string, endDate: string): Promise<InsertGA4Daily[]> {
    if (!this.propertyId) {
      throw new Error('GA4 property ID is required');
    }

    logger.info('GA4', `Fetching data from ${startDate} to ${endDate}`);

    await rateLimiter.acquire();

    return withRetry(
      async () => {
        const auth = await this.getAuth();
        const analyticsData = google.analyticsdata('v1beta');

        const response = await analyticsData.properties.runReport({
          auth,
          property: `properties/${this.propertyId}`,
          requestBody: {
            dateRanges: [{ startDate, endDate }],
            dimensions: [
              { name: 'date' },
              { name: 'sessionDefaultChannelGroup' },
              { name: 'landingPage' },
              { name: 'deviceCategory' },
              { name: 'country' },
            ],
            metrics: [
              { name: 'sessions' },
              { name: 'activeUsers' },
              { name: 'eventCount' },
              { name: 'conversions' },
              { name: 'bounceRate' },
              { name: 'averageSessionDuration' },
              { name: 'screenPageViewsPerSession' },
            ],
          },
        });

        const rows = response.data.rows || [];
        const results: InsertGA4Daily[] = rows.map(row => ({
          date: row.dimensionValues?.[0]?.value || startDate,
          sessions: parseInt(row.metricValues?.[0]?.value || '0'),
          users: parseInt(row.metricValues?.[1]?.value || '0'),
          events: parseInt(row.metricValues?.[2]?.value || '0'),
          conversions: parseInt(row.metricValues?.[3]?.value || '0'),
          bounceRate: parseFloat(row.metricValues?.[4]?.value || '0') * 100 || null, // Convert to percentage
          avgSessionDuration: parseFloat(row.metricValues?.[5]?.value || '0') || null,
          pagesPerSession: parseFloat(row.metricValues?.[6]?.value || '0') || null,
          channel: row.dimensionValues?.[1]?.value || null,
          landingPage: row.dimensionValues?.[2]?.value || null,
          device: row.dimensionValues?.[3]?.value || null,
          geo: row.dimensionValues?.[4]?.value || null,
          rawData: row as any,
        }));

        await storage.saveGA4Data(results);
        logger.info('GA4', `Saved ${results.length} records`);
        
        return results;
      },
      { maxAttempts: 3, delayMs: 2000 },
      'GA4 fetchDailyData'
    );
  }

  async checkRealtimeHealth(): Promise<RealtimeData> {
    if (!this.propertyId) {
      throw new Error('GA4 property ID is required');
    }

    logger.info('GA4', 'Checking realtime tag health');
    
    await rateLimiter.acquire();

    return withRetry(
      async () => {
        const auth = await this.getAuth();
        const analyticsData = google.analyticsdata('v1beta');

        const response = await analyticsData.properties.runRealtimeReport({
          auth,
          property: `properties/${this.propertyId}`,
          requestBody: {
            metrics: [
              { name: 'activeUsers' },
              { name: 'eventCount' },
            ],
          },
        });

        const row = response.data.rows?.[0];
        const activeUsers = parseInt(row?.metricValues?.[0]?.value || '0');
        const eventCount = parseInt(row?.metricValues?.[1]?.value || '0');

        const result: RealtimeData = {
          activeUsers,
          eventCount,
          isHealthy: activeUsers > 0 || eventCount > 0,
        };

        logger.info('GA4', `Realtime health check: ${result.isHealthy ? 'HEALTHY' : 'NO ACTIVITY'}`, {
          activeUsers,
          eventCount,
        });

        return result;
      },
      { maxAttempts: 2, delayMs: 1000 },
      'GA4 checkRealtimeHealth'
    );
  }

  async getEngagementMetrics(startDate: string, endDate: string): Promise<EngagementMetrics> {
    if (!this.propertyId) {
      throw new Error('GA4 property ID is required');
    }

    await rateLimiter.acquire();

    return withRetry(
      async () => {
        const auth = await this.getAuth();
        const analyticsData = google.analyticsdata('v1beta');

        const response = await analyticsData.properties.runReport({
          auth,
          property: `properties/${this.propertyId}`,
          requestBody: {
            dateRanges: [{ startDate, endDate }],
            metrics: [
              { name: 'engagementRate' },
              { name: 'engagedSessions' },
              { name: 'averageSessionDuration' },
              { name: 'bounceRate' },
              { name: 'sessionsPerUser' },
            ],
          },
        });

        const row = response.data.rows?.[0];
        
        return {
          engagementRate: parseFloat(row?.metricValues?.[0]?.value || '0'),
          engagedSessions: parseInt(row?.metricValues?.[1]?.value || '0'),
          averageSessionDuration: parseFloat(row?.metricValues?.[2]?.value || '0'),
          bounceRate: parseFloat(row?.metricValues?.[3]?.value || '0'),
          sessionsPerUser: parseFloat(row?.metricValues?.[4]?.value || '0'),
        };
      },
      { maxAttempts: 3, delayMs: 2000 },
      'GA4 getEngagementMetrics'
    );
  }

  async getChannelPerformance(startDate: string, endDate: string): Promise<ChannelPerformance[]> {
    if (!this.propertyId) {
      throw new Error('GA4 property ID is required');
    }

    await rateLimiter.acquire();

    return withRetry(
      async () => {
        const auth = await this.getAuth();
        const analyticsData = google.analyticsdata('v1beta');

        const response = await analyticsData.properties.runReport({
          auth,
          property: `properties/${this.propertyId}`,
          requestBody: {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'sessionDefaultChannelGroup' }],
            metrics: [
              { name: 'sessions' },
              { name: 'activeUsers' },
              { name: 'conversions' },
              { name: 'engagementRate' },
            ],
            orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
            limit: 20,
          },
        });

        return (response.data.rows || []).map(row => ({
          channel: row.dimensionValues?.[0]?.value || 'Unknown',
          sessions: parseInt(row.metricValues?.[0]?.value || '0'),
          users: parseInt(row.metricValues?.[1]?.value || '0'),
          conversions: parseInt(row.metricValues?.[2]?.value || '0'),
          engagementRate: parseFloat(row.metricValues?.[3]?.value || '0'),
        }));
      },
      { maxAttempts: 3, delayMs: 2000 },
      'GA4 getChannelPerformance'
    );
  }

  async getLandingPagePerformance(startDate: string, endDate: string, limit: number = 50): Promise<LandingPagePerformance[]> {
    if (!this.propertyId) {
      throw new Error('GA4 property ID is required');
    }

    await rateLimiter.acquire();

    return withRetry(
      async () => {
        const auth = await this.getAuth();
        const analyticsData = google.analyticsdata('v1beta');

        const response = await analyticsData.properties.runReport({
          auth,
          property: `properties/${this.propertyId}`,
          requestBody: {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'landingPage' }],
            metrics: [
              { name: 'sessions' },
              { name: 'activeUsers' },
              { name: 'bounceRate' },
              { name: 'conversions' },
            ],
            orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
            limit,
          },
        });

        return (response.data.rows || []).map(row => ({
          landingPage: row.dimensionValues?.[0]?.value || 'Unknown',
          sessions: parseInt(row.metricValues?.[0]?.value || '0'),
          users: parseInt(row.metricValues?.[1]?.value || '0'),
          bounceRate: parseFloat(row.metricValues?.[2]?.value || '0'),
          conversions: parseInt(row.metricValues?.[3]?.value || '0'),
        }));
      },
      { maxAttempts: 3, delayMs: 2000 },
      'GA4 getLandingPagePerformance'
    );
  }

  async getDeviceBreakdown(startDate: string, endDate: string) {
    if (!this.propertyId) {
      throw new Error('GA4 property ID is required');
    }

    await rateLimiter.acquire();

    return withRetry(
      async () => {
        const auth = await this.getAuth();
        const analyticsData = google.analyticsdata('v1beta');

        const response = await analyticsData.properties.runReport({
          auth,
          property: `properties/${this.propertyId}`,
          requestBody: {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'deviceCategory' }],
            metrics: [
              { name: 'sessions' },
              { name: 'activeUsers' },
              { name: 'conversions' },
            ],
          },
        });

        return (response.data.rows || []).map(row => ({
          device: row.dimensionValues?.[0]?.value || 'Unknown',
          sessions: parseInt(row.metricValues?.[0]?.value || '0'),
          users: parseInt(row.metricValues?.[1]?.value || '0'),
          conversions: parseInt(row.metricValues?.[2]?.value || '0'),
        }));
      },
      { maxAttempts: 3, delayMs: 2000 },
      'GA4 getDeviceBreakdown'
    );
  }

  async getGeoBreakdown(startDate: string, endDate: string, limit: number = 20) {
    if (!this.propertyId) {
      throw new Error('GA4 property ID is required');
    }

    await rateLimiter.acquire();

    return withRetry(
      async () => {
        const auth = await this.getAuth();
        const analyticsData = google.analyticsdata('v1beta');

        const response = await analyticsData.properties.runReport({
          auth,
          property: `properties/${this.propertyId}`,
          requestBody: {
            dateRanges: [{ startDate, endDate }],
            dimensions: [{ name: 'country' }],
            metrics: [
              { name: 'sessions' },
              { name: 'activeUsers' },
              { name: 'conversions' },
            ],
            orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
            limit,
          },
        });

        return (response.data.rows || []).map(row => ({
          country: row.dimensionValues?.[0]?.value || 'Unknown',
          sessions: parseInt(row.metricValues?.[0]?.value || '0'),
          users: parseInt(row.metricValues?.[1]?.value || '0'),
          conversions: parseInt(row.metricValues?.[2]?.value || '0'),
        }));
      },
      { maxAttempts: 3, delayMs: 2000 },
      'GA4 getGeoBreakdown'
    );
  }

  async getDataByDateRange(startDate: string, endDate: string): Promise<InsertGA4Daily[]> {
    return storage.getGA4DataByDateRange(startDate, endDate);
  }

  async testConnection(): Promise<{ success: boolean; message: string; sampleCount?: number }> {
    if (!this.propertyId) {
      return { success: false, message: 'GA4 property ID not configured' };
    }

    try {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const data = await this.fetchDailyData(yesterday, today);
      return { success: true, message: 'GA4 connected', sampleCount: data.length };
    } catch (error: any) {
      return { success: false, message: error.message || 'GA4 connection failed' };
    }
  }
}

/** Global singleton (legacy — uses env var + global oauth_tokens row) */
export const ga4Connector = new GA4Connector();

/**
 * Factory: create a GA4Connector for a specific site using per-site credentials.
 */
export async function createGA4Connector(siteId: number): Promise<GA4Connector> {
  const creds = await storage.getSiteGoogleCredentials(siteId);
  if (!creds) {
    throw new Error(`No Google credentials found for site ${siteId}`);
  }
  if (!creds.ga4PropertyId) {
    throw new Error(`No GA4 property configured for site ${siteId}`);
  }
  return new GA4Connector(creds.ga4PropertyId, siteId);
}
