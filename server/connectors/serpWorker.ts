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
  volume?: number;
  priority?: string;
  category?: string;
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
      // Use workerConfigResolver which supports fallback env vars
      const { resolveWorkerConfig } = await import("../workerConfigResolver");
      const config = await resolveWorkerConfig("serp_intel");
      
      if (config.valid && config.base_url) {
        this.baseUrl = config.base_url;
        this.apiKey = config.api_key || null;
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

  async testConnection(testSite?: string): Promise<{ 
    success: boolean; 
    message: string; 
    actualOutputs?: string[];
    debug?: {
      baseUrl: string;
      requestedUrls: string[];
      responses: Array<{ url: string; status: number; bodySnippet?: string }>;
    };
  }> {
    const debug: {
      baseUrl: string;
      requestedUrls: string[];
      responses: Array<{ url: string; status: number; bodySnippet?: string }>;
    } = {
      baseUrl: "",
      requestedUrls: [],
      responses: [],
    };
    
    try {
      const initialized = await this.init();
      if (!initialized || !this.baseUrl) {
        return { 
          success: false, 
          message: "Failed to initialize - check SERP_INTELLIGENCE_API_KEY and SERP_INTELLIGENCE_BASE_URL env vars or Bitwarden secret SEO_SERP_Keyword",
          debug,
        };
      }

      debug.baseUrl = this.baseUrl;
      
      // Dynamically discover sites from the worker, or use provided site
      let site = testSite;
      if (!site) {
        try {
          const sites = await this.getSites();
          if (sites && sites.length > 0) {
            site = sites[0].domain;
            logger.info("SerpWorker", `Using discovered site: ${site}`);
          }
        } catch (err: any) {
          logger.warn("SerpWorker", `Could not discover sites: ${err.message}`);
        }
      }
      
      // Fallback to default if no site discovered
      if (!site) {
        site = "empathyhealthclinic.com";
        logger.info("SerpWorker", `Using fallback site: ${site}`);
      }
      
      const actualOutputs: string[] = [];

      // Test 1: Call /api/serp/top-keywords (proves connection works)
      const topKeywordsUrl = `${this.baseUrl}/api/serp/top-keywords?site=${encodeURIComponent(site)}`;
      debug.requestedUrls.push(topKeywordsUrl);
      
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (this.apiKey) headers["X-Api-Key"] = this.apiKey;
        
        const response = await fetch(topKeywordsUrl, { headers, signal: AbortSignal.timeout(15000) });
        const bodyText = await response.text();
        debug.responses.push({ 
          url: topKeywordsUrl, 
          status: response.status, 
          bodySnippet: bodyText.substring(0, 200) 
        });
        
        if (response.ok) {
          actualOutputs.push("serp_top_keywords");
          logger.info("SerpWorker", `top-keywords endpoint OK (${response.status})`);
        } else {
          logger.warn("SerpWorker", `top-keywords returned ${response.status}: ${bodyText.substring(0, 100)}`);
        }
      } catch (err: any) {
        debug.responses.push({ url: topKeywordsUrl, status: 0, bodySnippet: err.message });
        logger.error("SerpWorker", `top-keywords failed: ${err.message}`);
      }

      // Test 2: Call /api/serp/snapshot with a test keyword
      const testKeyword = "psychiatrist near me";
      const snapshotUrl = `${this.baseUrl}/api/serp/snapshot?site=${encodeURIComponent(site)}&keyword=${encodeURIComponent(testKeyword)}`;
      debug.requestedUrls.push(snapshotUrl);
      
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (this.apiKey) headers["X-Api-Key"] = this.apiKey;
        
        const response = await fetch(snapshotUrl, { headers, signal: AbortSignal.timeout(15000) });
        const bodyText = await response.text();
        debug.responses.push({ 
          url: snapshotUrl, 
          status: response.status, 
          bodySnippet: bodyText.substring(0, 200) 
        });
        
        if (response.ok) {
          actualOutputs.push("serp_serp_snapshots");
          logger.info("SerpWorker", `snapshot endpoint OK (${response.status})`);
        } else {
          logger.warn("SerpWorker", `snapshot returned ${response.status}: ${bodyText.substring(0, 100)}`);
        }
      } catch (err: any) {
        debug.responses.push({ url: snapshotUrl, status: 0, bodySnippet: err.message });
        logger.error("SerpWorker", `snapshot failed: ${err.message}`);
      }

      // Test 3: Call /api/serp/keywords (tracked keywords list)
      const keywordsUrl = `${this.baseUrl}/api/serp/keywords?site=${encodeURIComponent(site)}`;
      debug.requestedUrls.push(keywordsUrl);
      
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (this.apiKey) headers["X-Api-Key"] = this.apiKey;
        
        const response = await fetch(keywordsUrl, { headers, signal: AbortSignal.timeout(15000) });
        const bodyText = await response.text();
        debug.responses.push({ 
          url: keywordsUrl, 
          status: response.status, 
          bodySnippet: bodyText.substring(0, 200) 
        });
        
        if (response.ok) {
          actualOutputs.push("serp_tracked_keywords");
          logger.info("SerpWorker", `keywords endpoint OK (${response.status})`);
        } else {
          logger.warn("SerpWorker", `keywords returned ${response.status}: ${bodyText.substring(0, 100)}`);
        }
      } catch (err: any) {
        debug.responses.push({ url: keywordsUrl, status: 0, bodySnippet: err.message });
        logger.error("SerpWorker", `keywords failed: ${err.message}`);
      }

      // Test 4: Call /api/serp/rankings-over-time (rank snapshots)
      const rankingsUrl = `${this.baseUrl}/api/serp/rankings-over-time?site=${encodeURIComponent(site)}`;
      debug.requestedUrls.push(rankingsUrl);
      
      try {
        const headers: Record<string, string> = { "Content-Type": "application/json" };
        if (this.apiKey) headers["X-Api-Key"] = this.apiKey;
        
        const response = await fetch(rankingsUrl, { headers, signal: AbortSignal.timeout(15000) });
        const bodyText = await response.text();
        debug.responses.push({ 
          url: rankingsUrl, 
          status: response.status, 
          bodySnippet: bodyText.substring(0, 200) 
        });
        
        if (response.ok) {
          actualOutputs.push("serp_rank_snapshots");
          logger.info("SerpWorker", `rankings-over-time endpoint OK (${response.status})`);
        } else {
          logger.warn("SerpWorker", `rankings-over-time returned ${response.status}: ${bodyText.substring(0, 100)}`);
        }
      } catch (err: any) {
        debug.responses.push({ url: rankingsUrl, status: 0, bodySnippet: err.message });
        logger.error("SerpWorker", `rankings-over-time failed: ${err.message}`);
      }

      if (actualOutputs.length > 0) {
        return {
          success: true,
          message: `Connected to SERP Worker: ${actualOutputs.length}/4 endpoints responding`,
          actualOutputs,
          debug,
        };
      } else {
        return {
          success: false,
          message: `SERP Worker not responding - check base_url and endpoints`,
          actualOutputs: [],
          debug,
        };
      }
    } catch (error: any) {
      return { 
        success: false, 
        message: error.message,
        debug,
      };
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
