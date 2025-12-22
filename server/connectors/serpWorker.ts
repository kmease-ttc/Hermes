import { logger } from "../utils/logger";
import { bitwardenProvider } from "../vault/BitwardenProvider";

export interface SerpWorkerSite {
  domain: string;
  location?: string;
  industry?: string;
}

export interface SerpScanMetadata {
  lastScanTime: string;
  durationMs: number;
  keywordsTracked: number;
  keywordsInTop10: number;
  keywordsInTop3: number;
}

export interface SerpKeyword {
  keyword: string;
  currentPosition: number | null;
  previousPosition: number | null;
  delta: number;
  url?: string;
}

export interface SerpSnapshot {
  keyword: string;
  yourPosition: number | null;
  competitors: Array<{
    domain: string;
    position: number;
    title: string;
    url: string;
  }>;
}

export interface SerpCompetitor {
  domain: string;
  keywordsRanking: number;
  pages: string[];
  urlPatterns: string[];
}

export interface SerpMover {
  keyword: string;
  previousPosition: number;
  currentPosition: number;
  change: number;
  direction: "up" | "down";
}

export interface SerpSummary {
  totalKeywords: number;
  inTop3: number;
  inTop10: number;
  inTop20: number;
  improved: number;
  declined: number;
  unchanged: number;
}

export class SerpWorkerClient {
  private baseUrl: string | null = null;
  private apiKey: string | null = null;
  private initialized = false;

  async init(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      const config = await bitwardenProvider.getWorkerConfig("SEO_SERP_&_Keyword");
      
      if (config.valid && config.baseUrl) {
        this.baseUrl = config.baseUrl;
        this.apiKey = config.apiKey || null;
        this.initialized = true;
        logger.info("SerpWorker", `Initialized with base URL: ${this.baseUrl}`);
        return true;
      } else {
        logger.warn("SerpWorker", `Config not valid: ${config.error}`);
        return false;
      }
    } catch (error: any) {
      logger.error("SerpWorker", `Failed to initialize: ${error.message}`);
      return false;
    }
  }

  isConfigured(): boolean {
    return this.initialized && !!this.baseUrl;
  }

  private async request<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    if (!this.baseUrl) {
      throw new Error("SerpWorker not initialized - call init() first");
    }

    const url = new URL(endpoint, this.baseUrl);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (this.apiKey) {
      headers["X-Api-Key"] = this.apiKey;
    }

    logger.debug("SerpWorker", `Requesting: ${url.pathname}${url.search}`);
    
    const response = await fetch(url.toString(), { headers });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`SERP Worker error ${response.status}: ${text}`);
    }

    return response.json();
  }

  async getSites(): Promise<SerpWorkerSite[]> {
    await this.init();
    return this.request<SerpWorkerSite[]>("/api/serp/sites");
  }

  async getScanMetadata(site: string): Promise<SerpScanMetadata> {
    await this.init();
    return this.request<SerpScanMetadata>("/api/serp/scan-metadata", { site });
  }

  async getTopKeywords(site: string): Promise<SerpKeyword[]> {
    await this.init();
    return this.request<SerpKeyword[]>("/api/serp/top-keywords", { site });
  }

  async getKeywords(site: string): Promise<SerpKeyword[]> {
    await this.init();
    return this.request<SerpKeyword[]>("/api/serp/keywords", { site });
  }

  async getSnapshot(site: string, keyword: string): Promise<SerpSnapshot> {
    await this.init();
    return this.request<SerpSnapshot>("/api/serp/snapshot", { site, keyword });
  }

  async getRankingsOverTime(site: string): Promise<any> {
    await this.init();
    return this.request("/api/serp/rankings-over-time", { site });
  }

  async getCompetitors(site: string): Promise<SerpCompetitor[]> {
    await this.init();
    return this.request<SerpCompetitor[]>("/api/serp/competitors", { site });
  }

  async getMovers(site: string): Promise<{ gainers: SerpMover[]; losers: SerpMover[] }> {
    await this.init();
    return this.request("/api/serp/movers", { site });
  }

  async getSummary(site: string): Promise<SerpSummary> {
    await this.init();
    return this.request<SerpSummary>("/api/serp/summary", { site });
  }

  async testConnection(): Promise<{ success: boolean; message: string; sites?: string[] }> {
    try {
      const initialized = await this.init();
      if (!initialized) {
        return { success: false, message: "Failed to initialize - check Bitwarden secret SEO_SERP_&_Keyword" };
      }

      const sites = await this.getSites();
      return {
        success: true,
        message: `Connected to SERP Worker, tracking ${sites.length} sites`,
        sites: sites.map(s => s.domain),
      };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  async getFullDiagnostics(site: string): Promise<{
    summary: SerpSummary;
    scanMetadata: SerpScanMetadata;
    topKeywords: SerpKeyword[];
    movers: { gainers: SerpMover[]; losers: SerpMover[] };
    competitors: SerpCompetitor[];
  }> {
    await this.init();
    
    const [summary, scanMetadata, topKeywords, movers, competitors] = await Promise.all([
      this.getSummary(site),
      this.getScanMetadata(site),
      this.getTopKeywords(site),
      this.getMovers(site),
      this.getCompetitors(site),
    ]);

    return { summary, scanMetadata, topKeywords, movers, competitors };
  }
}

export const serpWorkerClient = new SerpWorkerClient();
