import { googleAuth } from "../auth/google-oauth";
import { storage } from "../storage";
import { type InsertAdsDaily } from "@shared/schema";
import { logger } from "../utils/logger";
import { withRetry, RateLimiter } from "../utils/retry";

const rateLimiter = new RateLimiter(10, 1);

export class AdsConnector {
  private customerId: string;

  constructor() {
    this.customerId = process.env.ADS_CUSTOMER_ID || '';
    if (!this.customerId) {
      logger.warn('Ads', 'ADS_CUSTOMER_ID not set');
    }
  }

  async fetchDailyData(startDate: string, endDate: string): Promise<InsertAdsDaily[]> {
    if (!this.customerId) {
      throw new Error('ADS_CUSTOMER_ID environment variable is required');
    }

    logger.info('Ads', `Fetching data from ${startDate} to ${endDate}`);
    
    await rateLimiter.acquire();

    return withRetry(
      async () => {
        await googleAuth.getAuthenticatedClient();

        logger.warn('Ads', 'Google Ads API integration requires additional setup. Returning mock data.');
        
        const results: InsertAdsDaily[] = [{
          date: startDate,
          spend: 0,
          impressions: 0,
          clicks: 0,
          cpc: 0,
          campaignId: null,
          campaignName: null,
          campaignStatus: 'PAUSED',
          disapprovals: 0,
          policyIssues: null,
          searchTerms: null,
          rawData: null,
        }];

        await storage.saveAdsData(results);
        logger.info('Ads', `Saved ${results.length} records (mock data)`);
        
        return results;
      },
      { maxAttempts: 3, delayMs: 2000 },
      'Ads fetchDailyData'
    );
  }

  async getDataByDateRange(startDate: string, endDate: string): Promise<InsertAdsDaily[]> {
    return storage.getAdsDataByDateRange(startDate, endDate);
  }
}

export const adsConnector = new AdsConnector();
