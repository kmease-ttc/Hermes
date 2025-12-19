import { google } from "googleapis";
import { googleAuth } from "../auth/google-oauth";
import { storage } from "../storage";
import { type InsertGA4Daily } from "@shared/schema";
import { logger } from "../utils/logger";
import { withRetry, RateLimiter } from "../utils/retry";

const rateLimiter = new RateLimiter(10, 1);

export class GA4Connector {
  private propertyId: string;

  constructor() {
    this.propertyId = process.env.GA4_PROPERTY_ID || '';
    if (!this.propertyId) {
      logger.warn('GA4', 'GA4_PROPERTY_ID not set');
    }
  }

  async fetchDailyData(startDate: string, endDate: string): Promise<InsertGA4Daily[]> {
    if (!this.propertyId) {
      throw new Error('GA4_PROPERTY_ID environment variable is required');
    }

    logger.info('GA4', `Fetching data from ${startDate} to ${endDate}`);
    
    await rateLimiter.acquire();

    return withRetry(
      async () => {
        const auth = await googleAuth.getAuthenticatedClient();
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

  async getDataByDateRange(startDate: string, endDate: string): Promise<InsertGA4Daily[]> {
    return storage.getGA4DataByDateRange(startDate, endDate);
  }
}

export const ga4Connector = new GA4Connector();
