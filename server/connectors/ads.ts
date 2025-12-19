import { GoogleAdsApi, Customer } from "google-ads-api";
import { googleAuth } from "../auth/google-oauth";
import { storage } from "../storage";
import { type InsertAdsDaily } from "@shared/schema";
import { logger } from "../utils/logger";
import { withRetry, RateLimiter } from "../utils/retry";

const rateLimiter = new RateLimiter(10, 1);

export interface CampaignStatus {
  id: string;
  name: string;
  status: string;
  budget: number;
  budgetType: string;
  servingStatus?: string;
  primaryStatus?: string;
  primaryStatusReasons?: string[];
}

export interface PolicyIssue {
  campaignId: string;
  campaignName: string;
  adGroupId?: string;
  adId?: string;
  policyTopic: string;
  policyType: string;
  evidences?: string[];
}

export interface ChangeHistoryEvent {
  changeDateTime: string;
  userEmail?: string;
  changeResourceType: string;
  changeResourceName: string;
  operation: string;
  oldResource?: any;
  newResource?: any;
}

export interface ConversionAction {
  id: string;
  name: string;
  status: string;
  type: string;
  category: string;
  primaryForGoal: boolean;
  countingType: string;
}

export class AdsConnector {
  private customerId: string;
  private developerToken: string;
  private loginCustomerId: string;
  private client: GoogleAdsApi | null = null;

  constructor() {
    const rawId = process.env.ADS_CUSTOMER_ID || '';
    this.customerId = rawId.replace(/-/g, '');
    this.developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '';
    this.loginCustomerId = (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID || '').replace(/-/g, '');
    
    if (!this.customerId) {
      logger.warn('Ads', 'ADS_CUSTOMER_ID not set');
    }
    if (!this.developerToken) {
      logger.warn('Ads', 'GOOGLE_ADS_DEVELOPER_TOKEN not set - using placeholder data');
    }
  }

  private async getClient(): Promise<Customer | null> {
    if (!this.developerToken || !this.customerId) {
      return null;
    }

    try {
      const tokens = await googleAuth.getTokens();
      if (!tokens || !tokens.refresh_token) {
        logger.warn('Ads', 'No refresh token available for Google Ads API');
        return null;
      }

      this.client = new GoogleAdsApi({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        developer_token: this.developerToken,
      });

      const customer = this.client.Customer({
        customer_id: this.customerId,
        refresh_token: tokens.refresh_token,
        login_customer_id: this.loginCustomerId || undefined,
      });

      return customer;
    } catch (error: any) {
      logger.error('Ads', 'Failed to initialize Google Ads client', { error: error.message });
      return null;
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
        const customer = await this.getClient();
        
        if (!customer) {
          logger.warn('Ads', 'Google Ads API not configured. Returning placeholder data.');
          const results: InsertAdsDaily[] = [{
            date: startDate,
            spend: 0,
            impressions: 0,
            clicks: 0,
            cpc: 0,
            campaignId: null,
            campaignName: null,
            campaignStatus: 'UNKNOWN',
            disapprovals: 0,
            policyIssues: null,
            searchTerms: null,
            rawData: { note: 'Google Ads API credentials missing' },
          }];
          await storage.saveAdsData(results);
          return results;
        }

        try {
          const campaigns = await customer.query(`
            SELECT
              segments.date,
              campaign.id,
              campaign.name,
              campaign.status,
              metrics.cost_micros,
              metrics.impressions,
              metrics.clicks,
              metrics.average_cpc
            FROM campaign
            WHERE segments.date BETWEEN '${startDate}' AND '${endDate}'
            ORDER BY segments.date DESC
          `);

          const results: InsertAdsDaily[] = [];
          const dailyAggregates = new Map<string, InsertAdsDaily>();

          for (const row of campaigns) {
            const date = row.segments?.date || startDate;
            const existing = dailyAggregates.get(date);
            
            const spend = (row.metrics?.cost_micros || 0) / 1_000_000;
            const impressions = row.metrics?.impressions || 0;
            const clicks = row.metrics?.clicks || 0;
            const cpc = (row.metrics?.average_cpc || 0) / 1_000_000;

            if (existing) {
              existing.spend = (existing.spend || 0) + spend;
              existing.impressions = (existing.impressions || 0) + impressions;
              existing.clicks = (existing.clicks || 0) + clicks;
            } else {
              dailyAggregates.set(date, {
                date,
                spend,
                impressions,
                clicks,
                cpc,
                campaignId: String(row.campaign?.id || ''),
                campaignName: row.campaign?.name || null,
                campaignStatus: String(row.campaign?.status || 'UNKNOWN'),
                disapprovals: 0,
                policyIssues: null,
                searchTerms: null,
                rawData: row,
              });
            }
          }

          results.push(...dailyAggregates.values());

          if (results.length === 0) {
            results.push({
              date: startDate,
              spend: 0,
              impressions: 0,
              clicks: 0,
              cpc: 0,
              campaignId: null,
              campaignName: null,
              campaignStatus: 'NO_DATA',
              disapprovals: 0,
              policyIssues: null,
              searchTerms: null,
              rawData: { note: 'No campaign data for date range' },
            });
          }

          await storage.saveAdsData(results);
          logger.info('Ads', `Saved ${results.length} records`);
          
          return results;
        } catch (error: any) {
          const errorDetails = {
            message: error.message || 'Unknown error',
            code: error.code || error.errors?.[0]?.error_code || 'N/A',
            details: error.errors || error.details || error.stack?.slice(0, 200),
          };
          logger.error('Ads', 'Failed to fetch campaign data', errorDetails);
          
          const results: InsertAdsDaily[] = [{
            date: startDate,
            spend: 0,
            impressions: 0,
            clicks: 0,
            cpc: 0,
            campaignId: null,
            campaignName: null,
            campaignStatus: 'ERROR',
            disapprovals: 0,
            policyIssues: null,
            searchTerms: null,
            rawData: { error: errorDetails },
          }];
          await storage.saveAdsData(results);
          return results;
        }
      },
      { maxAttempts: 3, delayMs: 2000 },
      'Ads fetchDailyData'
    );
  }

  async getCampaignStatuses(): Promise<CampaignStatus[]> {
    if (!this.customerId) {
      throw new Error('ADS_CUSTOMER_ID environment variable is required');
    }

    logger.info('Ads', 'Fetching campaign statuses');

    const customer = await this.getClient();
    if (!customer) {
      return [{
        id: 'placeholder',
        name: 'Campaign Status Check',
        status: 'UNKNOWN',
        budget: 0,
        budgetType: 'UNKNOWN',
        servingStatus: 'API not configured',
        primaryStatus: 'UNKNOWN',
        primaryStatusReasons: ['Google Ads API credentials missing'],
      }];
    }

    try {
      const campaigns = await customer.query(`
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.serving_status,
          campaign.primary_status,
          campaign.primary_status_reasons,
          campaign_budget.amount_micros,
          campaign_budget.type
        FROM campaign
        WHERE campaign.status != 'REMOVED'
      `);

      return campaigns.map((row: any) => ({
        id: String(row.campaign?.id || ''),
        name: row.campaign?.name || 'Unknown',
        status: String(row.campaign?.status || 'UNKNOWN'),
        budget: (row.campaign_budget?.amount_micros || 0) / 1_000_000,
        budgetType: String(row.campaign_budget?.type || 'UNKNOWN'),
        servingStatus: String(row.campaign?.serving_status || 'UNKNOWN'),
        primaryStatus: String(row.campaign?.primary_status || 'UNKNOWN'),
        primaryStatusReasons: row.campaign?.primary_status_reasons || [],
      }));
    } catch (error: any) {
      const errorMsg = error.message || error.errors?.[0]?.message || JSON.stringify(error);
      const errorCode = error.code || error.errors?.[0]?.error_code?.authorization_error || 'UNKNOWN';
      logger.error('Ads', 'Failed to fetch campaign statuses', { error: errorMsg, code: errorCode, stack: error.stack?.slice(0, 300) });
      return [{
        id: 'error',
        name: 'Error fetching campaigns',
        status: 'ERROR',
        budget: 0,
        budgetType: 'UNKNOWN',
        servingStatus: `${errorCode}: ${errorMsg}`,
        primaryStatus: 'ERROR',
        primaryStatusReasons: [errorMsg],
      }];
    }
  }

  async getPolicyIssues(): Promise<PolicyIssue[]> {
    if (!this.customerId) {
      throw new Error('ADS_CUSTOMER_ID environment variable is required');
    }

    logger.info('Ads', 'Fetching policy issues');

    const customer = await this.getClient();
    if (!customer) {
      return [];
    }

    try {
      const adGroupAds = await customer.query(`
        SELECT
          campaign.id,
          campaign.name,
          ad_group.id,
          ad_group_ad.ad.id,
          ad_group_ad.policy_summary.approval_status,
          ad_group_ad.policy_summary.policy_topic_entries
        FROM ad_group_ad
        WHERE ad_group_ad.policy_summary.approval_status != 'APPROVED'
      `);

      const issues: PolicyIssue[] = [];
      for (const row of adGroupAds) {
        const entries = row.ad_group_ad?.policy_summary?.policy_topic_entries || [];
        for (const entry of entries) {
          issues.push({
            campaignId: String(row.campaign?.id || ''),
            campaignName: row.campaign?.name || 'Unknown',
            adGroupId: String(row.ad_group?.id || ''),
            adId: String(row.ad_group_ad?.ad?.id || ''),
            policyTopic: entry.topic || 'Unknown',
            policyType: entry.type || 'UNKNOWN',
            evidences: entry.evidences?.map((e: any) => JSON.stringify(e)) || [],
          });
        }
      }

      return issues;
    } catch (error: any) {
      logger.error('Ads', 'Failed to fetch policy issues', { error: error.message });
      return [];
    }
  }

  async getChangeHistory(startDate: string, endDate: string): Promise<ChangeHistoryEvent[]> {
    if (!this.customerId) {
      throw new Error('ADS_CUSTOMER_ID environment variable is required');
    }

    logger.info('Ads', `Fetching change history from ${startDate} to ${endDate}`);

    const customer = await this.getClient();
    if (!customer) {
      return [];
    }

    try {
      const changes = await customer.query(`
        SELECT
          change_event.change_date_time,
          change_event.user_email,
          change_event.change_resource_type,
          change_event.change_resource_name,
          change_event.client_type,
          change_event.changed_fields
        FROM change_event
        WHERE change_event.change_date_time >= '${startDate}'
          AND change_event.change_date_time <= '${endDate} 23:59:59'
        ORDER BY change_event.change_date_time DESC
        LIMIT 100
      `);

      return changes.map((row: any) => ({
        changeDateTime: row.change_event?.change_date_time || '',
        userEmail: row.change_event?.user_email || undefined,
        changeResourceType: String(row.change_event?.change_resource_type || 'UNKNOWN'),
        changeResourceName: row.change_event?.change_resource_name || '',
        operation: row.change_event?.client_type || 'UNKNOWN',
        oldResource: undefined,
        newResource: row.change_event?.changed_fields || undefined,
      }));
    } catch (error: any) {
      logger.error('Ads', 'Failed to fetch change history', { error: error.message });
      return [];
    }
  }

  async getConversionActions(): Promise<ConversionAction[]> {
    if (!this.customerId) {
      throw new Error('ADS_CUSTOMER_ID environment variable is required');
    }

    logger.info('Ads', 'Fetching conversion actions');

    const customer = await this.getClient();
    if (!customer) {
      return [{
        id: 'placeholder',
        name: 'Conversion Tracking Check',
        status: 'UNKNOWN',
        type: 'UNKNOWN',
        category: 'UNKNOWN',
        primaryForGoal: false,
        countingType: 'UNKNOWN',
      }];
    }

    try {
      const conversions = await customer.query(`
        SELECT
          conversion_action.id,
          conversion_action.name,
          conversion_action.status,
          conversion_action.type,
          conversion_action.category,
          conversion_action.primary_for_goal,
          conversion_action.counting_type
        FROM conversion_action
        WHERE conversion_action.status != 'REMOVED'
      `);

      return conversions.map((row: any) => ({
        id: String(row.conversion_action?.id || ''),
        name: row.conversion_action?.name || 'Unknown',
        status: String(row.conversion_action?.status || 'UNKNOWN'),
        type: String(row.conversion_action?.type || 'UNKNOWN'),
        category: String(row.conversion_action?.category || 'UNKNOWN'),
        primaryForGoal: row.conversion_action?.primary_for_goal || false,
        countingType: String(row.conversion_action?.counting_type || 'UNKNOWN'),
      }));
    } catch (error: any) {
      logger.error('Ads', 'Failed to fetch conversion actions', { error: error.message });
      return [];
    }
  }

  async checkBillingStatus(): Promise<{ status: string; message: string }> {
    if (!this.customerId) {
      throw new Error('ADS_CUSTOMER_ID environment variable is required');
    }

    logger.info('Ads', 'Checking billing status');

    const customer = await this.getClient();
    if (!customer) {
      return {
        status: 'UNKNOWN',
        message: 'Google Ads API not configured',
      };
    }

    try {
      const billing = await customer.query(`
        SELECT
          billing_setup.id,
          billing_setup.status,
          billing_setup.payments_account
        FROM billing_setup
        LIMIT 1
      `);

      if (billing.length > 0) {
        const setup = billing[0];
        return {
          status: String(setup.billing_setup?.status || 'UNKNOWN'),
          message: `Billing setup ID: ${setup.billing_setup?.id || 'N/A'}`,
        };
      }

      return {
        status: 'NOT_FOUND',
        message: 'No billing setup found',
      };
    } catch (error: any) {
      logger.error('Ads', 'Failed to check billing status', { error: error.message });
      return {
        status: 'ERROR',
        message: error.message,
      };
    }
  }

  async getDataByDateRange(startDate: string, endDate: string): Promise<InsertAdsDaily[]> {
    return storage.getAdsDataByDateRange(startDate, endDate);
  }
}

export const adsConnector = new AdsConnector();
