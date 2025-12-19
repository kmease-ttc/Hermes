import { storage } from "../storage";
import { type InsertWebChecksDaily } from "@shared/schema";
import { logger } from "../utils/logger";
import { withRetry } from "../utils/retry";

export class WebsiteChecker {
  private domain: string;

  constructor() {
    this.domain = process.env.DOMAIN || 'empathyhealthclinic.com';
  }

  async checkRobotsTxt(): Promise<{ exists: boolean; content?: string; error?: string }> {
    try {
      const url = `https://${this.domain}/robots.txt`;
      const response = await fetch(url);
      
      if (response.ok) {
        const content = await response.text();
        return { exists: true, content };
      }
      
      return { exists: false, error: `Status ${response.status}` };
    } catch (error: any) {
      logger.error('WebCheck', 'Failed to fetch robots.txt', { error: error.message });
      return { exists: false, error: error.message };
    }
  }

  async checkSitemap(): Promise<{ exists: boolean; urls?: string[]; error?: string }> {
    try {
      const url = `https://${this.domain}/sitemap.xml`;
      const response = await fetch(url);
      
      if (response.ok) {
        const content = await response.text();
        const urlMatches = content.match(/<loc>(.*?)<\/loc>/g) || [];
        const urls = urlMatches.map(match => match.replace(/<\/?loc>/g, '')).slice(0, 50);
        
        return { exists: true, urls };
      }
      
      return { exists: false, error: `Status ${response.status}` };
    } catch (error: any) {
      logger.error('WebCheck', 'Failed to fetch sitemap.xml', { error: error.message });
      return { exists: false, error: error.message };
    }
  }

  async checkPage(url: string): Promise<InsertWebChecksDaily> {
    const date = new Date().toISOString().split('T')[0];

    try {
      const response = await fetch(url, {
        redirect: 'manual',
        headers: {
          'User-Agent': 'TrafficSpendDoctor/1.0 (SEO Monitoring Bot)',
        },
      });

      const html = await response.text();
      
      const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i);
      const canonical = canonicalMatch ? canonicalMatch[1] : null;

      const robotsMatch = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']+)["'][^>]*>/i);
      const metaRobots = robotsMatch ? robotsMatch[1] : null;

      const hasContent = html.length > 500 && !html.includes('404') && !html.includes('Not Found');

      let redirectUrl: string | null = null;
      if (response.status >= 300 && response.status < 400) {
        redirectUrl = response.headers.get('location');
      }

      return {
        date,
        url,
        statusCode: response.status,
        redirectUrl,
        canonical,
        metaRobots,
        hasContent,
        errorMessage: null,
        rawData: {
          headers: Object.fromEntries(response.headers.entries()),
          contentLength: html.length,
        },
      };
    } catch (error: any) {
      logger.error('WebCheck', `Failed to check ${url}`, { error: error.message });
      
      return {
        date,
        url,
        statusCode: 0,
        redirectUrl: null,
        canonical: null,
        metaRobots: null,
        hasContent: false,
        errorMessage: error.message,
        rawData: null,
      };
    }
  }

  async runDailyChecks(topPages: string[] = []): Promise<InsertWebChecksDaily[]> {
    logger.info('WebCheck', `Running daily checks for ${this.domain}`);

    const robotsCheck = await this.checkRobotsTxt();
    const sitemapCheck = await this.checkSitemap();

    logger.info('WebCheck', 'Robots.txt check', { exists: robotsCheck.exists });
    logger.info('WebCheck', 'Sitemap check', { exists: sitemapCheck.exists, urlCount: sitemapCheck.urls?.length });

    const pagesToCheck = topPages.length > 0 
      ? topPages 
      : sitemapCheck.urls?.slice(0, 10) || [`https://${this.domain}/`];

    const checks: InsertWebChecksDaily[] = [];

    for (const pageUrl of pagesToCheck) {
      const check = await withRetry(
        () => this.checkPage(pageUrl),
        { maxAttempts: 2, delayMs: 1000 },
        `WebCheck ${pageUrl}`
      );
      checks.push(check);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    await storage.saveWebChecks(checks);
    logger.info('WebCheck', `Completed ${checks.length} page checks`);

    return checks;
  }
}

export const websiteChecker = new WebsiteChecker();
