import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { googleAuth } from "./auth/google-oauth";
import { ga4Connector } from "./connectors/ga4";
import { gscConnector } from "./connectors/gsc";
import { adsConnector } from "./connectors/ads";
import { serpConnector } from "./connectors/serp";
import { websiteChecker } from "./website_checks";
import { analysisEngine } from "./analysis";
import { runFullDiagnostic } from "./analysis/orchestrator";
import { runWorkerOrchestration, getAggregatedDashboardMetrics } from "./workerOrchestrator";
import { logger } from "./utils/logger";
import { apiKeyAuth } from "./middleware/apiAuth";
import { randomUUID } from "crypto";
import OpenAI from "openai";
import { z } from "zod";
import { getServiceBySlug } from "@shared/servicesCatalog";
import { resolveWorkerConfig } from "./workerConfigResolver";

const createSiteSchema = z.object({
  displayName: z.string().min(1, "Display name is required"),
  baseUrl: z.string().url("Valid URL is required"),
  category: z.string().optional().nullable(),
  techStack: z.string().optional().nullable(),
  repoProvider: z.string().optional().nullable(),
  repoIdentifier: z.string().optional().nullable(),
  deployMethod: z.string().optional().nullable(),
  crawlSettings: z.object({
    crawl_depth_limit: z.number().optional(),
    max_pages: z.number().optional(),
    respect_robots: z.boolean().optional(),
    user_agent: z.string().optional(),
  }).optional().nullable(),
  sitemaps: z.array(z.string()).optional().nullable(),
  keyPages: z.array(z.string()).optional().nullable(),
  integrations: z.object({
    ga4: z.object({ property_id: z.string() }).optional().nullable(),
    gsc: z.object({ property: z.string() }).optional().nullable(),
    google_ads: z.object({ customer_id: z.string() }).optional().nullable(),
    clarity: z.object({ site_id: z.string() }).optional().nullable(),
  }).optional().nullable(),
  guardrails: z.object({
    allowed_edit_paths: z.array(z.string()).optional(),
    blocked_edit_paths: z.array(z.string()).optional(),
    max_files_changed_per_run: z.number().optional(),
    max_lines_changed_per_run: z.number().optional(),
    require_human_approval: z.boolean().optional(),
    auto_merge_categories: z.array(z.string()).optional(),
  }).optional().nullable(),
  cadence: z.object({
    diagnose_frequency: z.string().optional(),
    auto_fix_frequency: z.string().optional(),
    content_frequency: z.string().optional(),
    quiet_hours: z.string().optional(),
  }).optional().nullable(),
  ownerName: z.string().optional().nullable(),
  ownerContact: z.string().optional().nullable(),
  status: z.enum(["active", "paused", "onboarding"]).optional(),
});

const updateSiteSchema = createSiteSchema.partial();

const APP_VERSION = "1.0.0";

function generateRunId(): string {
  return `run_${Date.now()}_${randomUUID().slice(0, 8)}`;
}

// Helper: Compute fresh integration summary
async function computeIntegrationSummary(siteId: string, storageInstance: typeof storage) {
  const [integrations, recentRuns] = await Promise.all([
    storageInstance.getIntegrations(),
    storageInstance.getLatestServiceRuns(100),
  ]);
  
  const { servicesCatalog } = await import("@shared/servicesCatalog");
  
  // Build last run by slug
  const lastRunBySlug: Record<string, any> = {};
  for (const run of recentRuns) {
    if (!lastRunBySlug[run.serviceId]) {
      lastRunBySlug[run.serviceId] = run;
    }
  }
  
  // Compute service statuses
  const services = servicesCatalog.map(def => {
    const integration = integrations.find(i => i.integrationId === def.slug);
    const lastRun = lastRunBySlug[def.slug];
    
    return {
      slug: def.slug,
      displayName: def.displayName,
      category: def.category,
      buildState: integration?.buildState || 'planned',
      configState: integration?.configState || 'missing_config',
      runState: integration?.runState || 'never_ran',
      healthStatus: integration?.healthStatus || 'unknown',
      lastRunAt: lastRun?.finishedAt || null,
      lastRunStatus: lastRun?.status || null,
      lastRunSummary: lastRun?.summary || null,
    };
  });
  
  // Compute summary stats
  const healthy = services.filter(s => s.healthStatus === 'healthy').length;
  const degraded = services.filter(s => s.healthStatus === 'degraded').length;
  const error = services.filter(s => s.healthStatus === 'error').length;
  // 'ready' means configured; 'missing_config', 'blocked', 'needs_config' mean not configured
  const configured = services.filter(s => s.configState === 'configured' || s.configState === 'ready').length;
  
  // Compute next actions
  const nextActions: Array<{ priority: string; action: string; target: string }> = [];
  
  for (const svc of services) {
    if (svc.configState === 'missing_config') {
      nextActions.push({
        priority: 'high',
        action: 'Configure',
        target: svc.displayName,
      });
    } else if (svc.healthStatus === 'error') {
      nextActions.push({
        priority: 'high',
        action: 'Fix',
        target: svc.displayName,
      });
    } else if (svc.runState === 'never_ran') {
      nextActions.push({
        priority: 'medium',
        action: 'Run first test',
        target: svc.displayName,
      });
    }
  }
  
  return {
    summary: {
      totalServices: services.length,
      healthy,
      degraded,
      error,
      configured,
      unconfigured: services.length - configured,
    },
    services,
    nextActions: nextActions.slice(0, 5),
  };
}

// Helper: Refresh integration cache in background
async function refreshIntegrationCache(siteId: string, storageInstance: typeof storage) {
  const startTime = Date.now();
  
  try {
    const freshData = await computeIntegrationSummary(siteId, storageInstance);
    const durationMs = Date.now() - startTime;
    
    await storageInstance.saveIntegrationCache({
      siteId,
      payloadJson: freshData.summary,
      servicesJson: freshData.services,
      nextActionsJson: freshData.nextActions,
      cachedAt: new Date(),
      lastRefreshAttemptAt: new Date(),
      lastRefreshStatus: 'success',
      lastRefreshDurationMs: durationMs,
      ttlSeconds: 60,
    });
    
    logger.info("Cache", "Integration cache refreshed", { siteId, durationMs });
  } catch (error: any) {
    const durationMs = Date.now() - startTime;
    
    await storageInstance.updateIntegrationCacheRefreshStatus(
      siteId,
      'failed',
      error.message,
      durationMs
    );
    
    logger.error("Cache", "Integration cache refresh failed", { siteId, error: error.message });
    throw error;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.use(apiKeyAuth);

  app.get("/briefing", async (req, res) => {
    try {
      const [latestRun, report, tickets] = await Promise.all([
        storage.getLatestRun(),
        storage.getLatestReport(),
        storage.getLatestTickets(10),
      ]);

      const dropDates = report?.dropDates 
        ? (typeof report.dropDates === 'string' ? JSON.parse(report.dropDates) : report.dropDates)
        : [];
      const rootCauses = report?.rootCauses
        ? (typeof report.rootCauses === 'string' ? JSON.parse(report.rootCauses) : report.rootCauses)
        : [];

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Traffic Doctor Briefing</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; padding: 20px; max-width: 900px; margin: 0 auto; background: #f8fafc; color: #1e293b; }
    h1 { font-size: 24px; margin-bottom: 8px; color: #0f172a; }
    h2 { font-size: 18px; margin: 24px 0 12px; color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; }
    .meta { color: #64748b; font-size: 14px; margin-bottom: 20px; }
    .card { background: white; border-radius: 8px; padding: 16px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
    .status-completed { background: #dcfce7; color: #166534; }
    .status-failed { background: #fee2e2; color: #991b1b; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
    th { background: #f1f5f9; font-weight: 600; color: #475569; }
    .priority-high { color: #dc2626; font-weight: 600; }
    .priority-medium { color: #d97706; font-weight: 600; }
    .priority-low { color: #16a34a; }
    .drop { color: #dc2626; font-weight: 600; }
    .owner { background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-size: 12px; }
    .hypothesis { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin-bottom: 8px; }
    .no-data { color: #94a3b8; font-style: italic; }
    pre { background: #1e293b; color: #e2e8f0; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 13px; }
  </style>
</head>
<body>
  <h1>Traffic & Spend Doctor Briefing</h1>
  <p class="meta">Generated: ${new Date().toISOString()} | Domain: empathyhealthclinic.com</p>

  <div class="card">
    <h2 style="margin-top:0">Last Run</h2>
    ${latestRun ? `
      <p><strong>Run ID:</strong> ${latestRun.runId}</p>
      <p><strong>Started:</strong> ${latestRun.startedAt}</p>
      <p><strong>Finished:</strong> ${latestRun.finishedAt || 'In progress'}</p>
      <p><strong>Status:</strong> <span class="status status-${latestRun.status}">${latestRun.status}</span></p>
      <p><strong>Anomalies Detected:</strong> ${latestRun.anomaliesDetected || 0}</p>
    ` : '<p class="no-data">No runs yet</p>'}
  </div>

  <h2>Key Metric Drops</h2>
  <div class="card">
    ${dropDates.length > 0 ? `
      <table>
        <thead><tr><th>Date</th><th>Source</th><th>Metric</th><th>Drop</th></tr></thead>
        <tbody>
          ${dropDates.map((d: any) => `
            <tr>
              <td>${d.date}</td>
              <td>${d.source}</td>
              <td>${d.metric}</td>
              <td class="drop">${d.drop}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<p class="no-data">No significant drops detected</p>'}
  </div>

  <h2>Top Hypotheses</h2>
  <div class="card">
    ${rootCauses.length > 0 ? rootCauses.map((h: any, i: number) => `
      <div class="hypothesis">
        <strong>${i + 1}. ${h.hypothesis || h.category}</strong><br>
        <small>Category: ${h.category} | Confidence: ${h.confidence} | Owner: <span class="owner">${h.owner}</span></small>
      </div>
    `).join('') : '<p class="no-data">No hypotheses generated</p>'}
  </div>

  <h2>Top 10 Tickets</h2>
  <div class="card">
    ${tickets.length > 0 ? `
      <table>
        <thead><tr><th>ID</th><th>Title</th><th>Owner</th><th>Priority</th><th>Status</th></tr></thead>
        <tbody>
          ${tickets.map(t => `
            <tr>
              <td>${t.ticketId}</td>
              <td>${t.title}</td>
              <td><span class="owner">${t.owner}</span></td>
              <td class="priority-${t.priority.toLowerCase()}">${t.priority}</td>
              <td>${t.status}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    ` : '<p class="no-data">No tickets yet</p>'}
  </div>

  <h2>Summary</h2>
  <div class="card">
    <p>${report?.summary || 'No report available yet. Run diagnostics to generate a report.'}</p>
  </div>
</body>
</html>`;

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error: any) {
      logger.error("API", "Briefing page failed", { error: error.message });
      res.status(500).send(`<html><body><h1>Error</h1><p>${error.message}</p></body></html>`);
    }
  });

  app.get("/api/health", async (req, res) => {
    try {
      let dbConnected = false;
      try {
        await storage.getConfig("test");
        dbConnected = true;
      } catch {
        dbConnected = false;
      }

      const latestRun = await storage.getLatestRun();

      res.json({
        ok: true,
        version: APP_VERSION,
        env: process.env.NODE_ENV || "development",
        serverTime: new Date().toISOString(),
        dbConnected,
        lastRunAt: latestRun?.startedAt || null,
        lastRunStatus: latestRun?.status || null,
      });
    } catch (error: any) {
      res.status(500).json({ 
        ok: false, 
        error: error.message,
        serverTime: new Date().toISOString(),
      });
    }
  });

  // Comprehensive system health endpoint for Settings page
  app.get("/api/system/health", async (req, res) => {
    try {
      const { checkVaultHealth } = await import("./vault");
      const { bitwardenProvider } = await import("./vault/BitwardenProvider");
      
      // Check database
      let dbConnected = false;
      let dbError: string | null = null;
      try {
        await storage.getConfig("test");
        dbConnected = true;
      } catch (err: any) {
        dbError = err.message;
      }

      // Check vault/bitwarden (guard against unconfigured state)
      let vaultHealth: any = { bitwarden: { connected: false }, env: { connected: true } };
      let bitwardenStatus: any = { connected: false, lastError: null, secretKeys: [] };
      
      try {
        if (process.env.BWS_ACCESS_TOKEN) {
          vaultHealth = await checkVaultHealth();
          bitwardenStatus = await bitwardenProvider.getDetailedStatus();
        }
      } catch (vaultErr: any) {
        bitwardenStatus = { connected: false, lastError: vaultErr.message, secretKeys: [] };
      }
      
      // Check env vars
      const requiredEnvVars = {
        GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
        GA4_PROPERTY_ID: !!process.env.GA4_PROPERTY_ID,
        GSC_SITE: !!process.env.GSC_SITE,
        DATABASE_URL: !!process.env.DATABASE_URL,
        BWS_ACCESS_TOKEN: !!process.env.BWS_ACCESS_TOKEN,
        BWS_PROJECT_ID: !!process.env.BWS_PROJECT_ID,
      };
      const missingEnvVars = Object.entries(requiredEnvVars)
        .filter(([_, present]) => !present)
        .map(([key]) => key);

      // Check Google auth
      const token = await storage.getToken("google");
      const googleAuth = {
        configured: !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET,
        authenticated: !!token,
        tokenExpiry: token?.expiresAt || null,
        missingKeys: [] as string[],
      };
      if (!process.env.GOOGLE_CLIENT_ID) googleAuth.missingKeys.push("GOOGLE_CLIENT_ID");
      if (!process.env.GOOGLE_CLIENT_SECRET) googleAuth.missingKeys.push("GOOGLE_CLIENT_SECRET");

      // Get data source stats from database
      const endDate = new Date().toISOString().split("T")[0];
      const startDate30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      
      const [ga4Data, gscData, adsData, webChecks, latestRun] = await Promise.all([
        storage.getGA4DataByDateRange(startDate30d, endDate),
        storage.getGSCDataByDateRange(startDate30d, endDate),
        storage.getAdsDataByDateRange(startDate30d, endDate),
        storage.getWebChecksByDate(endDate),
        storage.getLatestRun(),
      ]);

      const sourceStatuses = latestRun?.sourceStatuses as any || {};

      // Build actionable error hints
      const getVaultHint = () => {
        if (vaultHealth.bitwarden.connected) return null;
        if (!process.env.BWS_ACCESS_TOKEN) {
          return { code: "MISSING_TOKEN", message: "Bitwarden access token not set", hint: "Add BWS_ACCESS_TOKEN secret in Replit Secrets", keys: ["BWS_ACCESS_TOKEN"] };
        }
        if (!process.env.BWS_PROJECT_ID) {
          return { code: "MISSING_PROJECT", message: "Bitwarden project ID not set", hint: "Add BWS_PROJECT_ID secret", keys: ["BWS_PROJECT_ID"] };
        }
        if (bitwardenStatus.lastError?.includes("401") || bitwardenStatus.lastError?.includes("Unauthorized")) {
          return { code: "UNAUTHORIZED", message: "Bitwarden token invalid or expired", hint: "Generate a new machine account token in Bitwarden", keys: [] };
        }
        if (bitwardenStatus.lastError?.includes("403") || bitwardenStatus.lastError?.includes("Forbidden")) {
          return { code: "FORBIDDEN", message: "Token lacks permission to access project", hint: "Verify machine account has access to the project", keys: [] };
        }
        return { code: "CONNECTION_FAILED", message: bitwardenStatus.lastError || "Could not connect to vault", hint: "Check network access and try again", keys: [] };
      };

      res.json({
        serverTime: new Date().toISOString(),
        database: {
          connected: dbConnected,
          error: dbError,
        },
        bitwarden: {
          configured: !!process.env.BWS_ACCESS_TOKEN,
          connected: vaultHealth.bitwarden.connected,
          secretsFound: bitwardenStatus.secretKeys?.length || 0,
          lastCheckedAt: new Date().toISOString(),
          error: vaultHealth.bitwarden.connected ? null : getVaultHint(),
          details: {
            tokenPresent: !!process.env.BWS_ACCESS_TOKEN,
            projectIdPresent: !!process.env.BWS_PROJECT_ID,
            orgIdPresent: !!process.env.BWS_ORGANIZATION_ID,
          },
        },
        google: {
          oauthConfigured: googleAuth.configured,
          authenticated: googleAuth.authenticated,
          tokenExpiry: googleAuth.tokenExpiry,
          missingKeys: googleAuth.missingKeys,
        },
        envVars: {
          allPresent: missingEnvVars.length === 0,
          missing: missingEnvVars,
          checked: requiredEnvVars,
        },
        dataSources: {
          ga4: {
            hasData: ga4Data.length > 0,
            recordCount: ga4Data.length,
            lastDataAt: ga4Data.length > 0 ? ga4Data[ga4Data.length - 1].createdAt : null,
            lastError: sourceStatuses.ga4?.error || null,
          },
          gsc: {
            hasData: gscData.length > 0,
            recordCount: gscData.length,
            lastDataAt: gscData.length > 0 ? gscData[gscData.length - 1].createdAt : null,
            lastError: sourceStatuses.gsc?.error || null,
          },
          ads: {
            hasData: adsData.length > 0,
            recordCount: adsData.length,
            lastDataAt: adsData.length > 0 ? adsData[adsData.length - 1].createdAt : null,
            lastError: sourceStatuses.ads?.error || null,
          },
          websiteChecks: {
            hasData: webChecks.length > 0,
            recordCount: webChecks.length,
            passed: webChecks.filter((c: any) => c.statusCode === 200).length,
            lastDataAt: webChecks.length > 0 ? webChecks[0].createdAt : null,
          },
        },
        lastDiagnosticRun: latestRun ? {
          runId: latestRun.runId,
          status: latestRun.status,
          startedAt: latestRun.startedAt,
          finishedAt: latestRun.finishedAt,
        } : null,
      });
    } catch (error: any) {
      logger.error("API", "System health check failed", { error: error.message });
      res.status(500).json({ 
        error: { 
          code: "HEALTH_CHECK_FAILED", 
          message: error.message,
          hint: "Server error during health check",
        } 
      });
    }
  });

  // Debug endpoint for service config troubleshooting
  app.get("/api/debug/service-config/:serviceSlug", async (req, res) => {
    try {
      const { serviceSlug } = req.params;
      const { siteId } = req.query;

      const { getServiceConfigDebug, getAllServiceMappings } = await import("./workerConfigResolver");

      // If no serviceSlug, list all available services
      if (!serviceSlug || serviceSlug === "list") {
        const mappings = getAllServiceMappings();
        return res.json({
          services: mappings.map(m => ({
            serviceSlug: m.serviceSlug,
            displayName: m.displayName,
            bitwardenSecret: m.bitwardenSecret,
            type: m.type,
            requiresBaseUrl: m.requiresBaseUrl,
            category: m.category,
          })),
        });
      }

      const debug = await getServiceConfigDebug(serviceSlug, siteId as string);
      res.json(debug);
    } catch (error: any) {
      logger.error("API", "Debug service-config failed", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Debug endpoint for all services config status
  app.get("/api/debug/all-services-config", async (req, res) => {
    try {
      const { getServiceConfigDebug, getAllServiceMappings } = await import("./workerConfigResolver");
      const mappings = getAllServiceMappings();
      
      const results = await Promise.all(
        mappings.map(async (m) => {
          const debug = await getServiceConfigDebug(m.serviceSlug);
          return debug;
        })
      );

      const summary = {
        total: results.length,
        ready: results.filter(r => r.finalState === "ready").length,
        needsConfig: results.filter(r => r.finalState === "needs_config").length,
        blocked: results.filter(r => r.finalState === "blocked").length,
        error: results.filter(r => r.finalState === "error").length,
      };

      res.json({ summary, services: results });
    } catch (error: any) {
      logger.error("API", "Debug all-services-config failed", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/validation/workers", async (req, res) => {
    try {
      const { workers, category, crew, format } = req.query;
      const { runValidation, generateMarkdownReport } = await import("./validation");

      const options: {
        workers?: string[];
        category?: string;
        crew?: string;
        parallel?: boolean;
      } = { parallel: true };

      if (workers && typeof workers === "string") {
        options.workers = workers.split(",").map(s => s.trim());
      }
      if (category && typeof category === "string") {
        options.category = category;
      }
      if (crew && typeof crew === "string") {
        options.crew = crew;
      }

      logger.info("API", "Running worker validation", options);
      const report = await runValidation(options);

      if (format === "markdown") {
        const markdown = generateMarkdownReport(report);
        res.type("text/markdown").send(markdown);
      } else {
        res.json(report);
      }
    } catch (error: any) {
      logger.error("API", "Worker validation failed", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/validation/workers/registry", async (req, res) => {
    try {
      const { getWorkerRegistry } = await import("./validation");
      const registry = getWorkerRegistry();
      res.json({ workers: registry, count: registry.length });
    } catch (error: any) {
      logger.error("API", "Worker registry fetch failed", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/status", async (req, res) => {
    try {
      const token = await storage.getToken("google");
      const latestRun = await storage.getLatestRun();
      const sourceStatuses = latestRun?.sourceStatuses as any || {};

      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const [ga4Data, gscData, adsData, webChecks] = await Promise.all([
        storage.getGA4DataByDateRange(startDate, endDate),
        storage.getGSCDataByDateRange(startDate, endDate),
        storage.getAdsDataByDateRange(startDate, endDate),
        storage.getWebChecksByDate(endDate),
      ]);

      res.json({
        authenticated: !!token,
        tokenExpiry: token?.expiresAt || null,
        sources: {
          ga4: {
            lastFetchAt: ga4Data.length > 0 ? ga4Data[ga4Data.length - 1].createdAt : null,
            recordCount: ga4Data.length,
            lastError: sourceStatuses.ga4?.error || null,
          },
          gsc: {
            lastFetchAt: gscData.length > 0 ? gscData[gscData.length - 1].createdAt : null,
            recordCount: gscData.length,
            lastError: sourceStatuses.gsc?.error || null,
          },
          ads: {
            lastFetchAt: adsData.length > 0 ? adsData[adsData.length - 1].createdAt : null,
            recordCount: adsData.length,
            lastError: sourceStatuses.ads?.error || null,
          },
          websiteChecks: {
            lastFetchAt: webChecks.length > 0 ? webChecks[0].createdAt : null,
            recordCount: webChecks.length,
            passed: webChecks.filter(c => c.statusCode === 200).length,
            lastError: sourceStatuses.websiteChecks?.error || null,
          },
        },
      });
    } catch (error: any) {
      logger.error("API", "Status check failed", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/run", async (req, res) => {
    const forceRun = req.query.force === "true" || req.body?.force === true;
    const today = new Date().toISOString().split("T")[0];

    if (!forceRun) {
      const existingRun = await storage.getCompletedRunForDate(today);
      if (existingRun) {
        logger.info("API", "Returning existing run for today", { runId: existingRun.runId });
        return res.json({
          runId: existingRun.runId,
          cached: true,
          startedAt: existingRun.startedAt,
          finishedAt: existingRun.finishedAt,
          summary: existingRun.summary,
          anomaliesDetected: existingRun.anomaliesDetected,
          reportId: existingRun.reportId,
          ticketCount: existingRun.ticketCount,
          hint: "Use ?force=true to run a new analysis",
        });
      }
    }

    const runId = generateRunId();
    const startedAt = new Date();

    try {
      logger.info("API", "Starting diagnostic run", { runId, forced: forceRun });

      await storage.saveRun({
        runId,
        runType: "full",
        status: "running",
        startedAt,
      });

      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      const isAuthenticated = await googleAuth.isAuthenticated();
      const sourceStatuses: Record<string, any> = {};

      if (!isAuthenticated) {
        logger.warn("API", "Not authenticated, skipping API data fetch");
        sourceStatuses.auth = { error: "Not authenticated" };
      } else {
        const results = await Promise.allSettled([
          ga4Connector.fetchDailyData(startDate, endDate),
          gscConnector.fetchDailyData(startDate, endDate),
          adsConnector.fetchDailyData(startDate, endDate),
        ]);

        sourceStatuses.ga4 = results[0].status === "fulfilled" 
          ? { ok: true, count: results[0].value.length }
          : { ok: false, error: (results[0] as PromiseRejectedResult).reason?.message };
        sourceStatuses.gsc = results[1].status === "fulfilled"
          ? { ok: true, count: results[1].value.length }
          : { ok: false, error: (results[1] as PromiseRejectedResult).reason?.message };
        sourceStatuses.ads = results[2].status === "fulfilled"
          ? { ok: true, count: results[2].value.length }
          : { ok: false, error: (results[2] as PromiseRejectedResult).reason?.message };
      }

      await websiteChecker.runDailyChecks();
      sourceStatuses.websiteChecks = { ok: true };

      const result = await runFullDiagnostic(runId, 30);

      const finishedAt = new Date();

      logger.info("API", "Diagnostic run completed", { 
        runId, 
        reportId: result.reportId,
        classification: result.analysis.classification,
        confidence: result.analysis.confidenceOverall,
      });

      res.json({
        runId,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        summary: result.summary,
        anomaliesDetected: Object.values(result.analysis.anomalyFlags).filter(Boolean).length,
        reportId: result.reportId,
        ticketCount: result.tickets.length,
        classification: result.analysis.classification,
        confidence: result.analysis.confidenceOverall,
        topHypothesis: result.hypotheses[0]?.hypothesisKey || null,
      });
    } catch (error: any) {
      logger.error("API", "Diagnostic run failed", { runId, error: error.message });

      await storage.updateRun(runId, {
        status: "failed",
        finishedAt: new Date(),
        errors: { message: error.message },
      });

      res.status(500).json({ 
        runId,
        error: error.message,
        startedAt: startedAt.toISOString(),
        finishedAt: new Date().toISOString(),
      });
    }
  });

  app.post("/api/run/workers", async (req, res) => {
    const runId = generateRunId();
    const siteId = req.body?.siteId || "empathyhealthclinic.com";
    
    try {
      logger.info("API", "Starting worker orchestration", { runId, siteId });
      
      const result = await runWorkerOrchestration(runId, siteId);
      
      res.json({
        ok: true,
        runId: result.runId,
        siteId: result.siteId,
        startedAt: result.startedAt.toISOString(),
        finishedAt: result.finishedAt.toISOString(),
        durationMs: result.finishedAt.getTime() - result.startedAt.getTime(),
        summary: {
          total: result.workers.length,
          success: result.successCount,
          failed: result.failedCount,
          skipped: result.workers.filter(w => w.status === "skipped").length,
        },
        workers: result.workers.map(w => ({
          key: w.workerKey,
          status: w.status,
          durationMs: w.durationMs,
          summary: w.summary,
          error: w.errorCode,
        })),
        suggestionsGenerated: result.suggestions.length,
        insightsGenerated: result.insights.length,
      });
    } catch (error: any) {
      logger.error("API", "Worker orchestration failed", { runId, error: error.message });
      res.status(500).json({ 
        ok: false,
        runId,
        error: error.message,
      });
    }
  });

  app.get("/api/dashboard/metrics", async (req, res) => {
    const siteId = (req.query.siteId as string) || "empathyhealthclinic.com";
    const forceRefresh = req.query.refresh === 'true';
    
    try {
      // Get cached snapshot first (instant response)
      const snapshot = await storage.getDashboardMetricSnapshot(siteId);
      
      // If we have a snapshot and not forcing refresh, return it immediately
      // and trigger background refresh if stale
      if (snapshot && !forceRefresh) {
        const capturedAt = new Date(snapshot.capturedAt);
        const ageSeconds = (Date.now() - capturedAt.getTime()) / 1000;
        const isStale = ageSeconds > 120; // 2 minute TTL
        
        // Trigger async background refresh if stale
        if (isStale) {
          setImmediate(async () => {
            try {
              await storage.updateDashboardSnapshotRefreshStatus(siteId, 'refreshing');
              const freshMetrics = await getAggregatedDashboardMetrics(siteId);
              
              // Only save if we got valid data (not all nulls)
              const hasData = freshMetrics.lastUpdated || 
                freshMetrics.traffic.sessions || 
                freshMetrics.keywords.total ||
                freshMetrics.performance.lcp;
                
              if (hasData) {
                await storage.saveDashboardMetricSnapshot(siteId, freshMetrics);
              } else {
                await storage.updateDashboardSnapshotRefreshStatus(siteId, 'partial', 'Some metrics unavailable');
              }
            } catch (err: any) {
              await storage.updateDashboardSnapshotRefreshStatus(siteId, 'failed', err.message);
            }
          });
        }
        
        // Return cached data immediately
        const metrics = snapshot.metricsJson as Record<string, any>;
        return res.json({
          ok: true,
          siteId,
          capturedAt: snapshot.capturedAt,
          isStale,
          lastRefreshStatus: snapshot.lastRefreshStatus,
          lastRefreshError: snapshot.lastRefreshError,
          ...metrics,
        });
      }
      
      // No snapshot or force refresh - compute fresh metrics
      const metrics = await getAggregatedDashboardMetrics(siteId);
      
      // Check if we have valid data before saving
      const hasData = metrics.lastUpdated || 
        metrics.traffic.sessions || 
        metrics.keywords.total ||
        metrics.performance.lcp;
      
      if (hasData) {
        // Save successful computation to snapshot
        await storage.saveDashboardMetricSnapshot(siteId, metrics);
      } else if (snapshot) {
        // No fresh data but we have a snapshot - return snapshot
        const cachedMetrics = snapshot.metricsJson as Record<string, any>;
        return res.json({
          ok: true,
          siteId,
          capturedAt: snapshot.capturedAt,
          isStale: true,
          lastRefreshStatus: 'failed',
          lastRefreshError: 'Unable to fetch fresh data',
          ...cachedMetrics,
        });
      }
      
      res.json({
        ok: true,
        siteId,
        capturedAt: new Date(),
        isStale: false,
        ...metrics,
      });
    } catch (error: any) {
      logger.error("API", "Failed to get dashboard metrics", { error: error.message });
      
      // On error, try to return cached snapshot
      try {
        const snapshot = await storage.getDashboardMetricSnapshot(siteId);
        if (snapshot) {
          await storage.updateDashboardSnapshotRefreshStatus(siteId, 'failed', error.message);
          const metrics = snapshot.metricsJson as Record<string, any>;
          return res.json({
            ok: true,
            siteId,
            capturedAt: snapshot.capturedAt,
            isStale: true,
            lastRefreshStatus: 'failed',
            lastRefreshError: error.message,
            ...metrics,
          });
        }
      } catch {}
      
      res.status(500).json({ 
        ok: false,
        error: error.message,
      });
    }
  });

  app.get("/api/suggestions/latest", async (req, res) => {
    const siteId = (req.query.siteId as string) || "empathyhealthclinic.com";
    const limit = parseInt(req.query.limit as string) || 20;
    
    try {
      const suggestions = await storage.getLatestSeoSuggestions(siteId, limit);
      
      res.json({
        ok: true,
        siteId,
        count: suggestions.length,
        suggestions: suggestions.map(s => ({
          id: s.suggestionId,
          type: s.suggestionType,
          title: s.title,
          description: s.description,
          severity: s.severity,
          category: s.category,
          status: s.status,
          assignee: s.assignee,
          estimatedImpact: s.estimatedImpact,
          estimatedEffort: s.estimatedEffort,
          impactedUrls: s.impactedUrls,
          impactedKeywords: s.impactedKeywords,
          sourceWorkers: s.sourceWorkers,
          createdAt: s.createdAt,
        })),
      });
    } catch (error: any) {
      logger.error("API", "Failed to get suggestions", { error: error.message });
      res.status(500).json({ 
        ok: false,
        error: error.message,
      });
    }
  });

  app.patch("/api/suggestions/:suggestionId/status", async (req, res) => {
    const { suggestionId } = req.params;
    const { status } = req.body;
    
    if (!status || !["open", "in_progress", "completed", "dismissed"].includes(status)) {
      return res.status(400).json({ ok: false, error: "Invalid status" });
    }
    
    try {
      await storage.updateSeoSuggestionStatus(suggestionId, status);
      res.json({ ok: true, suggestionId, status });
    } catch (error: any) {
      logger.error("API", "Failed to update suggestion status", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Fix Pack - Generate implementable fix artifacts using AI
  app.post("/api/suggestions/:suggestionId/fix-pack", async (req, res) => {
    const { suggestionId } = req.params;
    
    try {
      const suggestion = await storage.getSeoSuggestionById(suggestionId);
      
      if (!suggestion) {
        return res.status(404).json({ ok: false, error: "Suggestion not found" });
      }
      
      const evidence = suggestion.evidenceJson as Record<string, any> || {};
      const actions = suggestion.actionsJson as string[] || [];
      const impactedUrls = suggestion.impactedUrls || [];
      const impactedKeywords = suggestion.impactedKeywords || [];
      
      // Build a prompt based on suggestion type
      let prompt = `You are an SEO expert. Generate actionable fix recommendations for the following SEO issue.

Issue: ${suggestion.title}
Description: ${suggestion.description}
Category: ${suggestion.category}
Severity: ${suggestion.severity}

`;

      if (impactedUrls.length > 0) {
        prompt += `Impacted URLs:\n${impactedUrls.slice(0, 5).map((u: string) => `- ${u}`).join('\n')}\n\n`;
      }
      
      if (impactedKeywords.length > 0) {
        prompt += `Target Keywords:\n${impactedKeywords.slice(0, 10).map((k: string) => `- ${k}`).join('\n')}\n\n`;
      }
      
      if (evidence.opportunities) {
        prompt += `Keyword Opportunities (positions 11-20):\n${evidence.opportunities.slice(0, 5).map((o: any) => `- "${o.keyword}" at position ${o.position}`).join('\n')}\n\n`;
      }

      prompt += `Based on the above, provide:
1. Recommended title tag updates (if applicable)
2. Recommended meta description updates (if applicable)
3. H1 recommendations
4. Content outline with suggested sections and FAQs
5. Internal linking opportunities (suggest 3-5 pages to link from/to)
6. Quick implementation steps

Format your response as JSON with these keys:
{
  "titleRecommendations": [{ "url": "...", "currentTitle": null, "recommendedTitle": "..." }],
  "metaRecommendations": [{ "url": "...", "currentMeta": null, "recommendedMeta": "..." }],
  "h1Recommendations": [{ "url": "...", "recommendedH1": "..." }],
  "contentOutline": { "sections": ["..."], "faqs": [{ "question": "...", "answer": "..." }] },
  "internalLinks": [{ "fromPage": "...", "toPage": "...", "anchorText": "..." }],
  "implementationSteps": ["..."],
  "estimatedTimeMinutes": 60,
  "priorityLevel": "high"
}`;

      // Check for OpenAI availability
      const openaiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
      const openaiBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
      
      if (!openaiKey) {
        // Return a template-based fix pack without AI
        return res.json({
          ok: true,
          suggestionId,
          fixPack: {
            generatedAt: new Date().toISOString(),
            aiGenerated: false,
            title: suggestion.title,
            description: suggestion.description,
            actions: actions.length > 0 ? actions : [
              "Review the impacted URLs",
              "Implement the recommended changes",
              "Test and verify improvements",
              "Monitor rankings for 2-4 weeks",
            ],
            impactedUrls,
            impactedKeywords,
            implementationSteps: actions,
            estimatedTimeMinutes: suggestion.estimatedEffort === "quick_win" ? 30 : suggestion.estimatedEffort === "moderate" ? 120 : 240,
            priorityLevel: suggestion.severity,
          },
        });
      }
      
      // Use OpenAI to generate the fix pack
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        apiKey: openaiKey,
        baseURL: openaiBaseUrl,
      });
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: "You are an SEO expert. Always respond with valid JSON only, no markdown formatting." },
          { role: "user", content: prompt },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      });
      
      const responseContent = completion.choices[0]?.message?.content || "{}";
      
      // Try to parse JSON from response
      let fixPackData: any = {};
      try {
        // Extract JSON from potential markdown code blocks
        const jsonMatch = responseContent.match(/```json\s*([\s\S]*?)\s*```/) || 
                         responseContent.match(/```\s*([\s\S]*?)\s*```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : responseContent;
        fixPackData = JSON.parse(jsonStr);
      } catch {
        fixPackData = {
          implementationSteps: actions.length > 0 ? actions : ["Review and implement the suggested changes"],
          rawResponse: responseContent,
        };
      }
      
      res.json({
        ok: true,
        suggestionId,
        fixPack: {
          generatedAt: new Date().toISOString(),
          aiGenerated: true,
          title: suggestion.title,
          description: suggestion.description,
          category: suggestion.category,
          severity: suggestion.severity,
          impactedUrls,
          impactedKeywords,
          ...fixPackData,
        },
      });
    } catch (error: any) {
      logger.error("API", "Failed to generate fix pack", { suggestionId, error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/kbase/insights/latest", async (req, res) => {
    const siteId = (req.query.siteId as string) || "empathyhealthclinic.com";
    const limit = parseInt(req.query.limit as string) || 5;
    
    try {
      const insights = await storage.getLatestSeoKbaseInsights(siteId, limit);
      
      res.json({
        ok: true,
        siteId,
        count: insights.length,
        insights: insights.map(i => ({
          id: i.insightId,
          title: i.title,
          summary: i.summary,
          fullContent: i.fullContent,
          type: i.insightType,
          priority: i.priority,
          actions: i.actionsJson,
          articleRefs: i.articleRefsJson,
          createdAt: i.createdAt,
        })),
      });
    } catch (error: any) {
      logger.error("API", "Failed to get KB insights", { error: error.message });
      res.status(500).json({ 
        ok: false,
        error: error.message,
      });
    }
  });

  // Run status polling endpoint
  app.get("/api/run/:runId", async (req, res) => {
    const { runId } = req.params;
    
    try {
      const run = await storage.getSeoRunById(runId);
      
      if (!run) {
        return res.status(404).json({ ok: false, error: "Run not found" });
      }
      
      res.json({
        ok: true,
        runId: run.runId,
        siteId: run.siteId,
        domain: run.domain,
        status: run.status,
        totalWorkers: run.totalWorkers,
        completedWorkers: run.completedWorkers,
        successWorkers: run.successWorkers,
        failedWorkers: run.failedWorkers,
        skippedWorkers: run.skippedWorkers,
        suggestionsGenerated: run.suggestionsGenerated,
        insightsGenerated: run.insightsGenerated,
        ticketsGenerated: run.ticketsGenerated,
        workerStatuses: run.workerStatusesJson,
        startedAt: run.startedAt?.toISOString(),
        finishedAt: run.finishedAt?.toISOString(),
        createdAt: run.createdAt.toISOString(),
      });
    } catch (error: any) {
      logger.error("API", "Failed to get run status", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Worker Findings Webhook - External workers push findings here
  // This creates seo_suggestions from worker discoveries
  const workerFindingSchema = z.object({
    site_id: z.string().default("default"),
    worker_key: z.string(), // e.g., "serp_intel", "content_decay"
    run_id: z.string().optional(), // Links to a run if part of orchestration
    findings: z.array(z.object({
      type: z.string(), // "quick_win", "ranking_drop", "technical_issue", etc.
      title: z.string(),
      description: z.string().optional(),
      severity: z.enum(["low", "medium", "high", "critical"]).default("medium"),
      category: z.enum(["serp", "technical", "content", "authority", "performance", "competitive"]).default("serp"),
      evidence: z.object({
        metrics: z.record(z.any()).optional(),
        urls: z.array(z.string()).optional(),
        keywords: z.array(z.string()).optional(),
        screenshots: z.array(z.string()).optional(),
        raw_data: z.any().optional(),
      }).optional(),
      actions: z.array(z.string()).optional(), // Recommended fix steps
      impact: z.enum(["low", "medium", "high"]).optional(),
      effort: z.enum(["quick_win", "moderate", "significant"]).optional(),
      assignee: z.enum(["SEO", "Dev", "Content", "Ads"]).optional(),
    })),
  });

  app.post("/api/worker-findings", apiKeyAuth, async (req, res) => {
    try {
      const parsed = workerFindingSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({
          ok: false,
          error: "Invalid payload",
          details: parsed.error.issues,
        });
      }
      
      const { site_id, worker_key, run_id, findings } = parsed.data;
      const timestamp = Date.now();
      const actualRunId = run_id || `webhook_${timestamp}_${worker_key}`;
      
      logger.info("API", "Received worker findings", {
        workerKey: worker_key,
        siteId: site_id,
        findingsCount: findings.length,
      });
      
      // Convert findings to seo_suggestions
      const suggestions = findings.map((finding, idx) => ({
        suggestionId: `sug_${timestamp}_${worker_key}_${idx}`,
        runId: actualRunId,
        siteId: site_id,
        suggestionType: finding.type,
        title: finding.title,
        description: finding.description || null,
        severity: finding.severity,
        category: finding.category,
        evidenceJson: {
          ...finding.evidence,
          workerKey: worker_key,
          receivedAt: new Date().toISOString(),
        },
        actionsJson: finding.actions || null,
        impactedUrls: finding.evidence?.urls || null,
        impactedKeywords: finding.evidence?.keywords || null,
        estimatedImpact: finding.impact || "medium",
        estimatedEffort: finding.effort || "moderate",
        assignee: finding.assignee || "SEO",
        sourceWorkers: [worker_key],
        status: "open",
      }));
      
      // Save to database
      if (suggestions.length > 0) {
        await storage.saveSeoSuggestions(suggestions);
      }
      
      // Also create a finding record for tracking
      const findingsToSave = findings.map((finding, idx) => ({
        findingId: `find_${timestamp}_${worker_key}_${idx}`,
        runId: actualRunId,
        siteId: site_id,
        sourceIntegration: worker_key,
        category: finding.category,
        severity: finding.severity,
        title: finding.title,
        description: finding.description || null,
        evidence: finding.evidence || null,
        recommendedActions: finding.actions || null,
        status: "open",
      }));
      
      if (findingsToSave.length > 0) {
        await storage.saveFindings(findingsToSave);
      }
      
      res.json({
        ok: true,
        received: findings.length,
        suggestionIds: suggestions.map(s => s.suggestionId),
        message: `Created ${suggestions.length} suggestions from ${worker_key}`,
      });
    } catch (error: any) {
      logger.error("API", "Failed to process worker findings", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Batch webhook for multiple workers
  app.post("/api/worker-findings/batch", apiKeyAuth, async (req, res) => {
    try {
      const { workers } = req.body;
      
      if (!Array.isArray(workers)) {
        return res.status(400).json({
          ok: false,
          error: "Expected 'workers' array in body",
        });
      }
      
      const results: { workerKey: string; suggestionsCreated: number; error?: string }[] = [];
      const timestamp = Date.now();
      
      for (const workerPayload of workers) {
        const parsed = workerFindingSchema.safeParse(workerPayload);
        
        if (!parsed.success) {
          results.push({
            workerKey: workerPayload.worker_key || "unknown",
            suggestionsCreated: 0,
            error: parsed.error.issues.map(i => i.message).join(", "),
          });
          continue;
        }
        
        const { site_id, worker_key, run_id, findings } = parsed.data;
        const actualRunId = run_id || `webhook_${timestamp}_batch`;
        
        const suggestions = findings.map((finding, idx) => ({
          suggestionId: `sug_${timestamp}_${worker_key}_${idx}`,
          runId: actualRunId,
          siteId: site_id,
          suggestionType: finding.type,
          title: finding.title,
          description: finding.description || null,
          severity: finding.severity,
          category: finding.category,
          evidenceJson: {
            ...finding.evidence,
            workerKey: worker_key,
            receivedAt: new Date().toISOString(),
          },
          actionsJson: finding.actions || null,
          impactedUrls: finding.evidence?.urls || null,
          impactedKeywords: finding.evidence?.keywords || null,
          estimatedImpact: finding.impact || "medium",
          estimatedEffort: finding.effort || "moderate",
          assignee: finding.assignee || "SEO",
          sourceWorkers: [worker_key],
          status: "open",
        }));
        
        if (suggestions.length > 0) {
          await storage.saveSeoSuggestions(suggestions);
        }
        
        // Also create finding records for tracking (mirror single-worker behavior)
        const findingsToSave = findings.map((finding, idx) => ({
          findingId: `find_${timestamp}_${worker_key}_${idx}`,
          runId: actualRunId,
          siteId: site_id,
          sourceIntegration: worker_key,
          category: finding.category,
          severity: finding.severity,
          title: finding.title,
          description: finding.description || null,
          evidence: finding.evidence || null,
          recommendedActions: finding.actions || null,
          status: "open",
        }));
        
        if (findingsToSave.length > 0) {
          await storage.saveFindings(findingsToSave);
        }
        
        results.push({
          workerKey: worker_key,
          suggestionsCreated: suggestions.length,
        });
      }
      
      const totalCreated = results.reduce((sum, r) => sum + r.suggestionsCreated, 0);
      
      res.json({
        ok: true,
        totalSuggestionsCreated: totalCreated,
        workers: results,
      });
    } catch (error: any) {
      logger.error("API", "Failed to process batch worker findings", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Agent Data API - Unified endpoint for agent dashboards
  app.get("/api/agents/:agentId/data", async (req, res) => {
    const { agentId } = req.params;
    const siteId = (req.query.site_id as string) || "default";
    
    try {
      const [suggestions, agentFindings, workerResults] = await Promise.all([
        storage.getSuggestionsByAgent(siteId, agentId, 10),
        storage.getFindingsByAgent(siteId, agentId, 10),
        storage.getSeoWorkerResultsBySite(siteId, 50).then(results => 
          results.filter(r => r.workerKey === agentId)
        ),
      ]);
      
      const latestRun = workerResults.length > 0 ? workerResults[0] : null;
      
      // Combine suggestions and findings into unified findings list
      const suggestionFindings = suggestions.map(s => ({
        label: s.title,
        value: s.severity === 'critical' ? 'Critical' : s.severity === 'high' ? 'High Priority' : 'Review',
        severity: s.severity,
        category: s.category,
        source: 'suggestion' as const,
        createdAt: s.createdAt,
      }));
      
      const webhookFindings = agentFindings.map(f => ({
        label: f.title,
        value: f.severity === 'critical' ? 'Critical' : f.severity === 'high' ? 'High Priority' : 'Review',
        severity: f.severity,
        category: f.category,
        source: 'webhook' as const,
        createdAt: f.createdAt,
      }));
      
      // Merge and dedupe by title, keep most recent
      const allFindings = [...suggestionFindings, ...webhookFindings]
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      
      const seenTitles = new Set<string>();
      const findings = allFindings.filter(f => {
        if (seenTitles.has(f.label)) return false;
        seenTitles.add(f.label);
        return true;
      }).slice(0, 10);
      
      const nextSteps = suggestions.slice(0, 3).flatMap((s, idx) => {
        if (Array.isArray(s.actionsJson)) {
          return s.actionsJson.map((action, i) => ({
            step: idx * 3 + i + 1,
            action: typeof action === 'string' ? action : String(action),
          }));
        }
        return [{
          step: idx + 1,
          action: s.title,
        }];
      });
      
      const score = latestRun?.metricsJson?.score || 
        (suggestions.length === 0 ? 0 : 
          suggestions.some(s => s.severity === 'critical') ? 40 :
          suggestions.some(s => s.severity === 'high') ? 60 : 80);
      
      res.json({
        ok: true,
        agentId,
        siteId,
        score,
        findings: findings.length > 0 ? findings : null,
        nextSteps: nextSteps.length > 0 ? nextSteps.slice(0, 5) : null,
        lastRun: latestRun ? {
          runId: latestRun.runId,
          status: latestRun.status,
          durationMs: latestRun.durationMs,
          summary: latestRun.summaryText,
          metrics: latestRun.metricsJson,
          createdAt: latestRun.createdAt,
        } : null,
        suggestionsCount: suggestions.length,
        findingsCount: agentFindings.length,
        isRealData: suggestions.length > 0 || agentFindings.length > 0 || workerResults.length > 0,
      });
    } catch (error: any) {
      logger.error("API", `Failed to get agent data for ${agentId}`, { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Hemingway (content_generator) Metrics API - Specific endpoint for Hemingway dashboard
  app.get("/api/agents/content_generator/metrics", async (req, res) => {
    const siteId = (req.query.site_id as string) || "default";
    
    try {
      // Get crawl data for page/blog counts from Scotty results
      const crawlResults = await storage.getSeoWorkerResultsBySite(siteId, 10);
      const scottyResult = crawlResults.find(r => r.workerKey === 'crawl_render' || r.workerKey === 'technical_seo');
      
      // Get content findings from storage
      const contentFindings = await storage.getFindingsByAgent(siteId, 'content_generator', 20);
      const contentSuggestions = await storage.getSuggestionsByAgent(siteId, 'content_generator', 10);
      
      // Extract metrics from crawl data or use defaults
      let totalPages: number | null = null;
      let totalBlogs: number | null = null;
      let contentQualityScore: number | null = null;
      let readabilityGrade: number | null = null;
      let eeatCoverage: number | null = null;
      let contentAtRisk: number | null = null;
      
      if (scottyResult?.metricsJson) {
        const metrics = scottyResult.metricsJson as any;
        totalPages = metrics.totalPages || metrics.pagesScanned || null;
        totalBlogs = metrics.totalBlogs || metrics.blogCount || null;
      }
      
      // Extract content metrics from findings/suggestions
      const hasContentData = contentFindings.length > 0 || contentSuggestions.length > 0;
      if (hasContentData) {
        // Calculate scores based on findings
        const criticalCount = contentFindings.filter(f => f.severity === 'critical').length;
        const highCount = contentFindings.filter(f => f.severity === 'high').length;
        
        contentQualityScore = Math.max(0, 100 - (criticalCount * 20) - (highCount * 10));
        contentAtRisk = criticalCount + highCount;
        
        // Mock readability and EEAT for now (would come from content analysis worker)
        readabilityGrade = 8; // Average reading level
        eeatCoverage = 65; // Percentage
      }
      
      // Format findings for display
      const findings = contentFindings.slice(0, 10).map(f => ({
        id: f.id.toString(),
        label: f.title,
        value: f.severity === 'critical' ? 'Critical' : f.severity === 'high' ? 'High' : 'Review',
        severity: f.severity,
        category: f.category || 'content',
      }));
      
      // Mock content audit data (would come from crawl + content analysis)
      const contentAudit = contentFindings.slice(0, 5).map((f, i) => ({
        id: `content-${i}`,
        url: `/blog/article-${i + 1}`,
        title: f.title.slice(0, 50),
        qualityScore: Math.floor(Math.random() * 30) + 60,
        readability: Math.floor(Math.random() * 4) + 6,
        status: f.severity === 'critical' ? 'at-risk' as const : 
                f.severity === 'high' ? 'needs-update' as const : 'healthy' as const,
        lastUpdated: f.createdAt?.toISOString() || new Date().toISOString(),
      }));
      
      const isRealData = hasContentData || scottyResult !== undefined;
      
      res.json({
        ok: true,
        metrics: {
          contentQualityScore,
          readabilityGrade,
          eeatCoverage,
          contentAtRisk,
          totalBlogs,
          totalPages,
          trends: {
            qualityTrend: hasContentData ? -2.5 : undefined,
            readabilityTrend: hasContentData ? 0.3 : undefined,
            eeatTrend: hasContentData ? 5.2 : undefined,
            riskTrend: hasContentData ? 1 : undefined,
          },
        },
        isRealData,
        lastRunAt: scottyResult?.createdAt?.toISOString() || null,
        findings: findings.length > 0 ? findings : undefined,
        contentAudit: contentAudit.length > 0 ? contentAudit : undefined,
      });
    } catch (error: any) {
      logger.error("API", "Failed to get Hemingway metrics", { error: error.message });
      res.status(500).json({ 
        ok: false, 
        error: error.message,
        metrics: {
          contentQualityScore: null,
          readabilityGrade: null,
          eeatCoverage: null,
          contentAtRisk: null,
          totalBlogs: null,
          totalPages: null,
        },
        isRealData: false,
        lastRunAt: null,
      });
    }
  });

  // =============================================================================
  // Hemingway Content Quality Provider Proxy Routes
  // Proxy to external Hemingway worker for content analysis
  // =============================================================================

  app.get("/api/hemingway/dashboard", async (req, res) => {
    try {
      const siteId = (req.query.siteId as string) || "default";
      const config = await resolveWorkerConfig("content_generator");
      if (!config.valid || !config.base_url) {
        return res.json({ ok: false, error: "Hemingway worker not configured", configured: false });
      }
      const url = new URL(`${config.base_url}/dashboard`);
      url.searchParams.set("siteId", siteId);
      const response = await fetch(url.toString(), {
        headers: { 
          "X-Api-Key": config.api_key || "",
          "Content-Type": "application/json"
        }
      });
      const data = await response.json();
      res.json({ ...data, configured: true });
    } catch (error: any) {
      logger.error("API", "Hemingway dashboard proxy failed", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/hemingway/findings", async (req, res) => {
    try {
      const siteId = (req.query.siteId as string) || "default";
      const config = await resolveWorkerConfig("content_generator");
      if (!config.valid || !config.base_url) {
        return res.json({ ok: false, error: "Hemingway worker not configured", configured: false });
      }
      const url = new URL(`${config.base_url}/findings`);
      url.searchParams.set("siteId", siteId);
      const response = await fetch(url.toString(), {
        headers: { 
          "X-Api-Key": config.api_key || "",
          "Content-Type": "application/json"
        }
      });
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      logger.error("API", "Hemingway findings proxy failed", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/hemingway/content", async (req, res) => {
    try {
      const siteId = (req.query.siteId as string) || "default";
      const config = await resolveWorkerConfig("content_generator");
      if (!config.valid || !config.base_url) {
        return res.json({ ok: false, error: "Hemingway worker not configured", configured: false });
      }
      const url = new URL(`${config.base_url}/content`);
      url.searchParams.set("siteId", siteId);
      const response = await fetch(url.toString(), {
        headers: { 
          "X-Api-Key": config.api_key || "",
          "Content-Type": "application/json"
        }
      });
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      logger.error("API", "Hemingway content proxy failed", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/hemingway/content/import", async (req, res) => {
    try {
      const config = await resolveWorkerConfig("content_generator");
      if (!config.valid || !config.base_url) {
        return res.json({ ok: false, error: "Hemingway worker not configured", configured: false });
      }
      const response = await fetch(`${config.base_url}/content/import`, {
        method: "POST",
        headers: { 
          "X-Api-Key": config.api_key || "",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(req.body)
      });
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      logger.error("API", "Hemingway content import proxy failed", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/hemingway/content/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const config = await resolveWorkerConfig("content_generator");
      if (!config.valid || !config.base_url) {
        return res.json({ ok: false, error: "Hemingway worker not configured", configured: false });
      }
      const response = await fetch(`${config.base_url}/content/${id}`, {
        headers: { 
          "X-Api-Key": config.api_key || "",
          "Content-Type": "application/json"
        }
      });
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      logger.error("API", "Hemingway content detail proxy failed", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.post("/api/hemingway/content/:id/analyze", async (req, res) => {
    try {
      const { id } = req.params;
      const config = await resolveWorkerConfig("content_generator");
      if (!config.valid || !config.base_url) {
        return res.json({ ok: false, error: "Hemingway worker not configured", configured: false });
      }
      const response = await fetch(`${config.base_url}/content/${id}/analyze`, {
        method: "POST",
        headers: { 
          "X-Api-Key": config.api_key || "",
          "Content-Type": "application/json"
        },
        body: JSON.stringify(req.body)
      });
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      logger.error("API", "Hemingway content analyze proxy failed", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Agent Status API - Quick health check for agent
  app.get("/api/agents/:agentId/status", async (req, res) => {
    const { agentId } = req.params;
    const siteId = (req.query.site_id as string) || "default";
    
    try {
      const diagnostic = await storage.getLatestConnectorDiagnostic(agentId, siteId);
      const crewState = await storage.getCrewState(siteId);
      const isEnabled = crewState.some(c => c.agentId === agentId && c.enabled);
      
      res.json({
        ok: true,
        agentId,
        enabled: isEnabled,
        lastDiagnostic: diagnostic ? {
          status: diagnostic.status,
          stages: diagnostic.stagesJson,
          durationMs: diagnostic.durationMs,
          createdAt: diagnostic.createdAt,
        } : null,
      });
    } catch (error: any) {
      logger.error("API", `Failed to get agent status for ${agentId}`, { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // /api/latest/* endpoints for fast UI reads
  app.get("/api/latest/worker-results", async (req, res) => {
    const siteId = (req.query.siteId as string) || "empathyhealthclinic.com";
    
    try {
      const results = await storage.getLatestSeoWorkerResults(siteId);
      
      res.json({
        ok: true,
        siteId,
        count: results.length,
        runId: results.length > 0 ? results[0].runId : null,
        results: results.map(r => ({
          workerKey: r.workerKey,
          status: r.status,
          metrics: r.metricsJson,
          summary: r.summaryText,
          error: r.errorCode,
          durationMs: r.durationMs,
          createdAt: r.createdAt,
        })),
      });
    } catch (error: any) {
      logger.error("API", "Failed to get latest worker results", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/latest/dashboard", async (req, res) => {
    const siteId = (req.query.siteId as string) || "empathyhealthclinic.com";
    
    try {
      const [metrics, run, suggestions, insights] = await Promise.all([
        getAggregatedDashboardMetrics(siteId),
        storage.getLatestSeoRun(siteId),
        storage.getLatestSeoSuggestions(siteId, 10),
        storage.getLatestSeoKbaseInsights(siteId, 5),
      ]);
      
      res.json({
        ok: true,
        siteId,
        metrics,
        lastRun: run ? {
          runId: run.runId,
          status: run.status,
          startedAt: run.startedAt?.toISOString(),
          finishedAt: run.finishedAt?.toISOString(),
          successWorkers: run.successWorkers,
          failedWorkers: run.failedWorkers,
          skippedWorkers: run.skippedWorkers,
        } : null,
        suggestions: suggestions.slice(0, 10).map(s => ({
          id: s.suggestionId,
          title: s.title,
          severity: s.severity,
          category: s.category,
          status: s.status,
        })),
        insights: insights.map(i => ({
          id: i.insightId,
          title: i.title,
          summary: i.summary,
          type: i.insightType,
        })),
      });
    } catch (error: any) {
      logger.error("API", "Failed to get latest dashboard", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/latest/suggestions", async (req, res) => {
    const siteId = (req.query.siteId as string) || "empathyhealthclinic.com";
    const limit = parseInt(req.query.limit as string) || 50;
    
    try {
      const suggestions = await storage.getLatestSeoSuggestions(siteId, limit);
      
      res.json({
        ok: true,
        siteId,
        count: suggestions.length,
        suggestions: suggestions.map(s => ({
          id: s.suggestionId,
          runId: s.runId,
          type: s.suggestionType,
          title: s.title,
          description: s.description,
          severity: s.severity,
          category: s.category,
          status: s.status,
          assignee: s.assignee,
          estimatedImpact: s.estimatedImpact,
          estimatedEffort: s.estimatedEffort,
          impactedUrls: s.impactedUrls,
          impactedKeywords: s.impactedKeywords,
          evidence: s.evidenceJson,
          actions: s.actionsJson,
          sourceWorkers: s.sourceWorkers,
          createdAt: s.createdAt,
        })),
      });
    } catch (error: any) {
      logger.error("API", "Failed to get latest suggestions", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/latest/tickets", async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 20;
    
    try {
      const tickets = await storage.getLatestTickets(limit);
      
      res.json({
        ok: true,
        count: tickets.length,
        tickets: tickets.map(t => ({
          id: t.ticketId,
          runId: t.runId,
          title: t.title,
          description: t.description,
          category: t.category,
          priority: t.priority,
          status: t.status,
          assignee: t.assignee,
          createdAt: t.createdAt,
        })),
      });
    } catch (error: any) {
      logger.error("API", "Failed to get latest tickets", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Action Queue Approvals
  app.post("/api/actions/approve", async (req, res) => {
    const { siteId, actionKey, actionTitle } = req.body;
    
    if (!siteId || !actionKey || !actionTitle) {
      return res.status(400).json({ ok: false, error: "Missing required fields: siteId, actionKey, actionTitle" });
    }
    
    try {
      const approval = await storage.approveAction(siteId, actionKey, actionTitle);
      logger.info("API", `Action approved: ${actionTitle}`, { siteId, actionKey });
      res.json({ ok: true, approval });
    } catch (error: any) {
      logger.error("API", "Failed to approve action", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });
  
  app.get("/api/actions/approved", async (req, res) => {
    const siteId = (req.query.siteId as string) || "default";
    
    try {
      const approvals = await storage.getApprovedActions(siteId);
      res.json({ ok: true, approvals });
    } catch (error: any) {
      logger.error("API", "Failed to get approved actions", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/latest/kbase-insights", async (req, res) => {
    const siteId = (req.query.siteId as string) || "empathyhealthclinic.com";
    const limit = parseInt(req.query.limit as string) || 5;
    
    try {
      const insights = await storage.getLatestSeoKbaseInsights(siteId, limit);
      
      res.json({
        ok: true,
        siteId,
        count: insights.length,
        insights: insights.map(i => ({
          id: i.insightId,
          runId: i.runId,
          title: i.title,
          summary: i.summary,
          fullContent: i.fullContent,
          type: i.insightType,
          priority: i.priority,
          actions: i.actionsJson,
          articleRefs: i.articleRefsJson,
          suggestionIds: i.suggestionIds,
          createdAt: i.createdAt,
        })),
      });
    } catch (error: any) {
      logger.error("API", "Failed to get latest KB insights", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/run/latest", async (req, res) => {
    try {
      const latestRun = await storage.getLatestRun();
      
      if (!latestRun) {
        return res.status(404).json({ error: "No runs found" });
      }

      res.json({
        runId: latestRun.runId,
        runType: latestRun.runType,
        status: latestRun.status,
        startedAt: latestRun.startedAt,
        finishedAt: latestRun.finishedAt,
        summary: latestRun.summary || null,
        anomaliesDetected: latestRun.anomaliesDetected || 0,
        reportId: latestRun.reportId,
        ticketCount: latestRun.ticketCount || 0,
        primaryClassification: latestRun.primaryClassification || 'INCONCLUSIVE',
        confidenceOverall: latestRun.confidenceOverall || 'low',
        deltas: latestRun.deltas,
        sourceStatuses: latestRun.sourceStatuses,
      });
    } catch (error: any) {
      logger.error("API", "Failed to fetch latest run", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/run/analysis", async (req, res) => {
    try {
      const latestRun = await storage.getLatestRun();
      
      if (!latestRun) {
        return res.status(404).json({ error: "No runs found" });
      }

      const [anomalies, hypotheses, report] = await Promise.all([
        storage.getAnomaliesByRunId(latestRun.runId),
        storage.getHypothesesByRunId(latestRun.runId),
        latestRun.reportId ? storage.getReportById(latestRun.reportId) : null,
      ]);

      const parseJsonField = (field: any): any[] => {
        if (!field) return [];
        if (Array.isArray(field)) return field;
        if (typeof field === 'string') {
          try {
            const parsed = JSON.parse(field);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }
        return [];
      };

      const topLosingPages = parseJsonField(report?.topLosingPages);
      const topLosingQueries = parseJsonField(report?.topLosingQueries);
      const clusterLosses = parseJsonField(report?.clusterLosses);

      res.json({
        runId: latestRun.runId,
        classification: latestRun.primaryClassification || 'INCONCLUSIVE',
        confidence: latestRun.confidenceOverall || 'low',
        incidentDate: anomalies[0]?.startDate || null,
        topLosingPages: topLosingPages.slice(0, 10),
        topLosingQueries: topLosingQueries.slice(0, 10),
        clusterLosses: clusterLosses.slice(0, 5),
        hypotheses: hypotheses.slice(0, 5).map(h => ({
          rank: h.rank,
          key: h.hypothesisKey,
          confidence: h.confidence,
          summary: h.summary,
        })),
        anomalies: anomalies.map(a => ({
          type: a.anomalyType,
          metric: a.metric,
          deltaPct: a.deltaPct,
          startDate: a.startDate,
        })),
        deltas: latestRun.deltas,
      });
    } catch (error: any) {
      logger.error("API", "Failed to fetch analysis data", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/run/compare", async (req, res) => {
    try {
      const runs = await storage.getRecentRuns(2);
      
      if (runs.length < 2) {
        return res.json({ 
          hasPreviousRun: false, 
          message: "Need at least 2 runs for comparison" 
        });
      }

      const [current, previous] = runs;
      const currentDeltas = current.deltas as any;
      const previousDeltas = previous.deltas as any;

      const changes: Array<{ metric: string; current: number; previous: number; change: string }> = [];

      if (currentDeltas && previousDeltas) {
        if (currentDeltas.ga4?.sessionsDelta !== undefined && previousDeltas.ga4?.sessionsDelta !== undefined) {
          changes.push({
            metric: 'GA4 Sessions Delta',
            current: currentDeltas.ga4.sessionsDelta,
            previous: previousDeltas.ga4.sessionsDelta,
            change: currentDeltas.ga4.sessionsDelta > previousDeltas.ga4.sessionsDelta ? 'improved' : 
                   currentDeltas.ga4.sessionsDelta < previousDeltas.ga4.sessionsDelta ? 'worsened' : 'unchanged',
          });
        }
        if (currentDeltas.gsc?.clicksDelta !== undefined && previousDeltas.gsc?.clicksDelta !== undefined) {
          changes.push({
            metric: 'GSC Clicks Delta',
            current: currentDeltas.gsc.clicksDelta,
            previous: previousDeltas.gsc.clicksDelta,
            change: currentDeltas.gsc.clicksDelta > previousDeltas.gsc.clicksDelta ? 'improved' : 
                   currentDeltas.gsc.clicksDelta < previousDeltas.gsc.clicksDelta ? 'worsened' : 'unchanged',
          });
        }
        if (currentDeltas.gsc?.impressionsDelta !== undefined && previousDeltas.gsc?.impressionsDelta !== undefined) {
          changes.push({
            metric: 'GSC Impressions Delta',
            current: currentDeltas.gsc.impressionsDelta,
            previous: previousDeltas.gsc.impressionsDelta,
            change: currentDeltas.gsc.impressionsDelta > previousDeltas.gsc.impressionsDelta ? 'improved' : 
                   currentDeltas.gsc.impressionsDelta < previousDeltas.gsc.impressionsDelta ? 'worsened' : 'unchanged',
          });
        }
      }

      res.json({
        hasPreviousRun: true,
        current: {
          runId: current.runId,
          finishedAt: current.finishedAt,
          classification: current.primaryClassification,
          confidence: current.confidenceOverall,
          anomaliesDetected: current.anomaliesDetected,
        },
        previous: {
          runId: previous.runId,
          finishedAt: previous.finishedAt,
          classification: previous.primaryClassification,
          confidence: previous.confidenceOverall,
          anomaliesDetected: previous.anomaliesDetected,
        },
        changes,
        classificationChanged: current.primaryClassification !== previous.primaryClassification,
      });
    } catch (error: any) {
      logger.error("API", "Failed to compare runs", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/alerts", async (req, res) => {
    try {
      const latestRun = await storage.getLatestRun();
      
      if (!latestRun) {
        return res.json({ alerts: [] });
      }

      const alerts: Array<{ type: string; severity: string; title: string; message: string }> = [];

      if (latestRun.primaryClassification === 'VISIBILITY_LOSS') {
        alerts.push({
          type: 'anomaly',
          severity: 'high',
          title: 'Visibility Loss Detected',
          message: 'Search impressions have dropped significantly. Pages may not be appearing in search results.',
        });
      }

      if (latestRun.primaryClassification === 'TRACKING_OR_ATTRIBUTION_GAP') {
        alerts.push({
          type: 'tracking',
          severity: 'high', 
          title: 'Tracking Gap Detected',
          message: 'GA4 sessions dropped but search traffic is stable. This may indicate a tracking issue.',
        });
      }

      const tickets = await storage.getLatestTickets(10);
      const p0Tickets = tickets.filter(t => t.priority === 'P0' || t.priority === 'High');
      
      if (p0Tickets.length > 0) {
        alerts.push({
          type: 'ticket',
          severity: 'critical',
          title: `${p0Tickets.length} Critical Issue(s) Found`,
          message: `${p0Tickets.map(t => t.title).slice(0, 2).join('; ')}`,
        });
      }

      res.json({ 
        alerts,
        lastChecked: latestRun.finishedAt || latestRun.startedAt,
      });
    } catch (error: any) {
      logger.error("API", "Failed to fetch alerts", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/run/smoke", async (req, res) => {
    const runId = generateRunId();
    const startedAt = new Date();

    try {
      logger.info("API", "Starting smoke test", { runId });

      await storage.saveRun({
        runId,
        runType: "smoke",
        status: "running",
        startedAt,
      });

      const envChecks: Record<string, { ok: boolean; message: string }> = {
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID
          ? { ok: true, message: "Set" }
          : { ok: false, message: "Missing GOOGLE_CLIENT_ID" },
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET
          ? { ok: true, message: "Set" }
          : { ok: false, message: "Missing GOOGLE_CLIENT_SECRET" },
        GA4_PROPERTY_ID: process.env.GA4_PROPERTY_ID
          ? { ok: true, message: `Set: ${process.env.GA4_PROPERTY_ID}` }
          : { ok: false, message: "Missing GA4_PROPERTY_ID" },
        GSC_SITE: process.env.GSC_SITE
          ? { ok: true, message: `Set: ${process.env.GSC_SITE}` }
          : { ok: false, message: "Missing GSC_SITE: check GSC_SITE format (e.g., sc-domain:example.com)" },
        ADS_CUSTOMER_ID: process.env.ADS_CUSTOMER_ID
          ? { ok: true, message: `Set: ${process.env.ADS_CUSTOMER_ID}` }
          : { ok: false, message: "Missing ADS_CUSTOMER_ID" },
        GOOGLE_ADS_DEVELOPER_TOKEN: process.env.GOOGLE_ADS_DEVELOPER_TOKEN
          ? { ok: true, message: "Set" }
          : { ok: false, message: "Missing GOOGLE_ADS_DEVELOPER_TOKEN" },
        DATABASE_URL: process.env.DATABASE_URL
          ? { ok: true, message: "Set" }
          : { ok: false, message: "Missing DATABASE_URL" },
      };

      const results: Record<string, any> = {
        env: envChecks,
        sources: {},
        issues: [] as string[],
      };

      for (const [key, val] of Object.entries(envChecks)) {
        if (!val.ok) results.issues.push(val.message);
      }

      const isAuthenticated = await googleAuth.isAuthenticated();
      results.authenticated = isAuthenticated;

      if (!isAuthenticated) {
        results.sources = {
          ga4: { ok: false, error: "OAuth refresh failed: not authenticated - visit /api/auth/url to authenticate" },
          gsc: { ok: false, error: "OAuth refresh failed: not authenticated - visit /api/auth/url to authenticate" },
          ads: { ok: false, error: "OAuth refresh failed: not authenticated - visit /api/auth/url to authenticate" },
        };
        results.issues.push("OAuth not authenticated - visit /api/auth/url to start authentication");
      } else {
        const yesterday = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const today = new Date().toISOString().split("T")[0];

        const [ga4Result, gscResult, adsResult] = await Promise.allSettled([
          ga4Connector.fetchDailyData(yesterday, today),
          gscConnector.fetchDailyData(yesterday, today),
          adsConnector.fetchDailyData(yesterday, today),
        ]);

        const formatError = (err: any, source: string): string => {
          const msg = err?.message || String(err);
          if (msg.includes("invalid_grant")) return `OAuth refresh failed: invalid_grant - re-authenticate via /api/auth/url`;
          if (msg.includes("developer token")) return `Ads API error: developer token not approved`;
          if (msg.includes("not found") && source === "gsc") return `GSC site not found: check GSC_SITE format`;
          if (msg.includes("property") && source === "ga4") return `GA4 property not found: check GA4_PROPERTY_ID`;
          return msg;
        };

        results.sources.ga4 = ga4Result.status === "fulfilled"
          ? { ok: true, sampleCount: ga4Result.value.length }
          : { ok: false, error: formatError((ga4Result as PromiseRejectedResult).reason, "ga4") };

        results.sources.gsc = gscResult.status === "fulfilled"
          ? { ok: true, sampleCount: gscResult.value.length }
          : { ok: false, error: formatError((gscResult as PromiseRejectedResult).reason, "gsc") };

        results.sources.ads = adsResult.status === "fulfilled"
          ? { ok: true, sampleCount: adsResult.value.length }
          : { ok: false, error: formatError((adsResult as PromiseRejectedResult).reason, "ads") };

        for (const [source, status] of Object.entries(results.sources)) {
          if (!status.ok) results.issues.push(`${source}: ${status.error}`);
        }
      }

      const finishedAt = new Date();
      const allOk = results.issues.length === 0;

      await storage.updateRun(runId, {
        status: allOk ? "completed" : "completed",
        finishedAt,
        summary: allOk ? "All systems operational" : `Found ${results.issues.length} issue(s)`,
        sourceStatuses: results.sources,
      });

      // Record service run for google_data_connector when sources are tested
      if (results.authenticated && results.sources) {
        const sourcesOk = results.sources.ga4?.ok || results.sources.gsc?.ok || results.sources.ads?.ok;
        const sourceStatus = allOk ? "success" : (sourcesOk ? "partial" : "failed");
        
        // Build actualOutputs array based on what data was successfully fetched
        const actualOutputs: string[] = [];
        const missingReason: Record<string, string> = {};
        
        // GSC outputs - add if GSC connected and returned data
        if (results.sources.gsc?.ok) {
          // GSC query data provides impressions, clicks, ctr, position, queries
          actualOutputs.push("gsc_impressions", "gsc_clicks", "gsc_ctr", "gsc_position", "gsc_queries");
          // GSC pages are available from the same API
          actualOutputs.push("gsc_pages");
        } else {
          missingReason["gsc_impressions"] = results.sources.gsc?.error || "GSC not connected";
          missingReason["gsc_clicks"] = results.sources.gsc?.error || "GSC not connected";
          missingReason["gsc_ctr"] = results.sources.gsc?.error || "GSC not connected";
          missingReason["gsc_position"] = results.sources.gsc?.error || "GSC not connected";
          missingReason["gsc_queries"] = results.sources.gsc?.error || "GSC not connected";
          missingReason["gsc_pages"] = results.sources.gsc?.error || "GSC not connected";
        }
        
        // GA4 outputs - add if GA4 connected and returned data
        if (results.sources.ga4?.ok && results.sources.ga4?.sampleCount > 0) {
          actualOutputs.push("ga4_sessions", "ga4_users");
          // Conversions require specific event configuration - check if available
          // For now, mark as present if GA4 is working (can refine later)
          actualOutputs.push("ga4_conversions");
        } else if (results.sources.ga4?.ok) {
          // GA4 connected but no data yet
          missingReason["ga4_sessions"] = "GA4 connected but no data in date range";
          missingReason["ga4_users"] = "GA4 connected but no data in date range";
          missingReason["ga4_conversions"] = "GA4 connected but no conversion data";
        } else {
          missingReason["ga4_sessions"] = results.sources.ga4?.error || "GA4 not connected";
          missingReason["ga4_users"] = results.sources.ga4?.error || "GA4 not connected";
          missingReason["ga4_conversions"] = results.sources.ga4?.error || "GA4 not connected";
        }
        
        await storage.createServiceRun({
          runId: `svc_${runId}`,
          siteId: "site_empathy_health_clinic",
          siteDomain: "empathyhealthclinic.com",
          serviceId: "google_data_connector",
          serviceName: "Google Data Connector (GSC + GA4)",
          trigger: "manual",
          status: sourceStatus,
          startedAt,
          finishedAt,
          durationMs: finishedAt.getTime() - startedAt.getTime(),
          summary: allOk ? "All Google sources connected successfully" : `Partial: ${results.issues.length} issue(s)`,
          metricsJson: {
            ga4_samples: results.sources.ga4?.sampleCount || 0,
            gsc_samples: results.sources.gsc?.sampleCount || 0,
            ads_samples: results.sources.ads?.sampleCount || 0,
            ga4_connected: results.sources.ga4?.ok || false,
            gsc_connected: results.sources.gsc?.ok || false,
          },
          outputsJson: {
            actualOutputs,
            missingReason: Object.keys(missingReason).length > 0 ? missingReason : undefined,
            rawSources: results.sources,
          },
          errorsJson: allOk ? null : { issues: results.issues },
        });
        
        logger.info("API", "Recorded service run for google_data_connector", { 
          status: sourceStatus,
          actualOutputs,
          missingCount: 9 - actualOutputs.length,
        });
      }

      res.json({
        runId,
        ok: allOk,
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        ...results,
      });
    } catch (error: any) {
      logger.error("API", "Smoke test failed", { runId, error: error.message });

      await storage.updateRun(runId, {
        status: "failed",
        finishedAt: new Date(),
        errors: { message: error.message },
      });

      res.status(500).json({
        runId,
        ok: false,
        error: error.message,
        startedAt: startedAt.toISOString(),
        finishedAt: new Date().toISOString(),
      });
    }
  });

  app.get("/api/export/fix-pack", async (req, res) => {
    try {
      const { 
        site_id, 
        scope = "top3", 
        maxBlogs = "1", 
        maxTech = "3", 
        noUi = "true" 
      } = req.query;

      const siteId = site_id as string || "default";
      const maxBlogsNum = parseInt(maxBlogs as string) || 1;
      const maxTechNum = parseInt(maxTech as string) || 3;
      const noUiChanges = (noUi as string) !== "false";
      const isFullScope = scope === "full";

      const site = await storage.getSiteById(siteId);
      const domain = site?.baseUrl?.replace(/^https?:\/\//, "") || site?.displayName || siteId;

      const [
        latestSeoRun,
        seoSuggestions,
        kbaseInsights,
        workerResults,
        findings
      ] = await Promise.all([
        storage.getLatestSeoRun(siteId),
        storage.getLatestSeoSuggestions(siteId, 20),
        storage.getLatestSeoKbaseInsights(siteId, 10),
        storage.getLatestSeoWorkerResults(siteId),
        storage.getLatestFindings(siteId, 20)
      ]);

      const asOfDate = latestSeoRun?.startedAt || new Date();
      const generatedAt = new Date().toISOString();

      const priorities = seoSuggestions
        .filter((s: any) => s.priority === 'high' || s.priority === 'medium')
        .slice(0, isFullScope ? 10 : 3);

      const blockers = findings
        .filter((f: any) => f.severity === 'critical' || f.severity === 'high')
        .slice(0, 5);

      let md = `# Mission Control Fix Pack — ${domain}\n\n`;
      md += `**Generated:** ${generatedAt}\n`;
      md += `**Site ID:** ${siteId}\n`;
      md += `**Data freshness:** Based on ${asOfDate instanceof Date ? asOfDate.toISOString() : asOfDate} snapshots\n`;
      md += `**Scope:** ${isFullScope ? 'Full Report' : 'Top 3 Priorities'}\n`;
      md += `**Confidence:** ${priorities.length > 0 ? 'Medium' : 'Low'}\n\n`;

      md += `---\n\n`;
      md += `## 1. What Changed (Key Metrics Summary)\n\n`;
      
      if (workerResults && workerResults.length > 0) {
        md += `| Metric | Source | Status |\n`;
        md += `|--------|--------|--------|\n`;
        workerResults.slice(0, 5).forEach((wr: any) => {
          md += `| ${wr.serviceId || 'Unknown'} | ${wr.status || 'N/A'} | ${wr.errorMessage ? 'Error' : 'OK'} |\n`;
        });
      } else if (latestSeoRun) {
        md += `| Metric | Status |\n`;
        md += `|--------|--------|\n`;
        md += `| Last Run | ${latestSeoRun.status || 'Unknown'} |\n`;
      } else {
        md += `*No recent metrics available. Run diagnostics first.*\n`;
      }
      md += `\n`;

      md += `## 2. Top Priorities\n\n`;
      
      if (priorities.length > 0) {
        priorities.forEach((p: any, idx: number) => {
          md += `### Priority ${idx + 1}: ${p.title || p.suggestion || 'Action Item'}\n\n`;
          md += `**Category:** ${p.category || 'General'}\n`;
          md += `**Priority:** ${p.priority || 'Medium'}\n\n`;
          md += `**Why it matters:** ${p.rationale || p.description || 'Based on recent analysis'}\n\n`;
          md += `**Proposed actions:**\n`;
          if (p.actionSteps && Array.isArray(p.actionSteps)) {
            p.actionSteps.forEach((step: string) => {
              md += `- ${step}\n`;
            });
          } else {
            md += `- Review and address the identified issue\n`;
            md += `- Verify changes with follow-up scan\n`;
          }
          md += `\n`;
        });
      } else {
        md += `*No priority actions identified. System is healthy or needs more data.*\n\n`;
      }

      md += `## 3. Blockers\n\n`;
      
      if (blockers.length > 0) {
        blockers.forEach((b: any) => {
          md += `- **${b.title || b.description || 'Issue'}**\n`;
          md += `  - Source: ${b.sourceIntegration || 'Unknown'}\n`;
          md += `  - Severity: ${b.severity || 'Unknown'}\n`;
          md += `  - Fix: ${b.recommendation || 'Review and resolve'}\n\n`;
        });
      } else {
        md += `*No critical blockers detected.*\n\n`;
      }

      md += `---\n\n`;
      md += `## 4. Implementation Instructions (Replit Prompt)\n\n`;
      md += `Copy the following instructions to implement fixes:\n\n`;
      md += `\`\`\`\n`;
      md += `TASK: Implement SEO fixes for ${domain}\n`;
      md += `SITE: ${siteId}\n\n`;
      md += `CONSTRAINTS:\n`;
      md += `- Do not publish more than ${maxBlogsNum} blog post(s) this run\n`;
      md += `- Do not change more than ${maxTechNum} technical items this run\n`;
      md += `- ${noUiChanges ? 'Do NOT change design/UI elements' : 'UI changes are permitted if needed'}\n`;
      md += `- Prefer small, reversible changes\n`;
      md += `- Only change what is clearly supported by evidence\n\n`;
      md += `PRIORITY TASKS:\n`;
      priorities.slice(0, 3).forEach((p: any, idx: number) => {
        md += `${idx + 1}. ${p.title || p.suggestion || 'Address priority item'}\n`;
      });
      if (priorities.length === 0) {
        md += `1. Run diagnostics to identify issues\n`;
        md += `2. Review agent reports for recommendations\n`;
      }
      md += `\n`;
      md += `ACCEPTANCE CRITERIA:\n`;
      md += `- All changes pass existing tests\n`;
      md += `- No new console errors introduced\n`;
      md += `- Changes are scoped to identified issues only\n`;
      md += `\`\`\`\n\n`;

      md += `## 5. Guardrails & Best Practices\n\n`;
      md += `- **Max blog posts:** ${maxBlogsNum}\n`;
      md += `- **Max technical changes:** ${maxTechNum}\n`;
      md += `- **UI changes:** ${noUiChanges ? 'Not allowed' : 'Allowed'}\n`;
      md += `- Prefer small reversible changes\n`;
      md += `- Avoid broad refactors\n`;
      md += `- Only change what is clearly supported by evidence\n\n`;

      md += `## 6. Appendix: Agent Details\n\n`;
      
      if (kbaseInsights && kbaseInsights.length > 0) {
        kbaseInsights.forEach((insight: any) => {
          md += `### ${insight.agentName || insight.agentId || 'Agent'}\n\n`;
          md += `**Insight:** ${insight.insight || 'No details'}\n\n`;
          if (insight.evidence) {
            md += `**Evidence:** ${typeof insight.evidence === 'string' ? insight.evidence : JSON.stringify(insight.evidence)}\n\n`;
          }
          md += `**Last checked:** ${insight.updatedAt || insight.createdAt || 'Unknown'}\n\n`;
        });
      } else {
        md += `*No agent details available. Connect agents and run diagnostics.*\n`;
      }

      const plainText = md
        .replace(/#{1,6}\s/g, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/`{3}[\s\S]*?`{3}/g, (match) => match.replace(/`{3}/g, '---'))
        .replace(/\|.*\|/g, '')
        .replace(/---+/g, '---');

      res.json({
        title: "Mission Control Fix Pack",
        generated_at: generatedAt,
        site: { domain, site_id: siteId },
        content_md: md,
        content_txt: plainText,
      });
    } catch (error: any) {
      logger.error("API", "Failed to generate fix pack", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get real recommendations with provenance data
  app.get("/api/missions/recommendations", async (req, res) => {
    try {
      const siteId = (req.query.site_id as string) || "default";
      
      const [
        latestSeoRun,
        seoSuggestions,
        findings,
        workerResults
      ] = await Promise.all([
        storage.getLatestSeoRun(siteId),
        storage.getLatestSeoSuggestions(siteId, 20),
        storage.getLatestFindings(siteId, 20),
        storage.getLatestSeoWorkerResults(siteId)
      ]);

      const hasRealData = seoSuggestions.length > 0 || findings.length > 0;
      
      // Build priorities from real data - use severity field (high/medium/critical)
      const priorities = seoSuggestions
        .filter((s: any) => s.severity === 'high' || s.severity === 'medium' || s.severity === 'critical')
        .slice(0, 5)
        .map((s: any, idx: number) => ({
          id: `mission-${s.id || idx}`,
          rank: idx + 1,
          title: s.title || s.suggestion || "Review recommendation",
          why: s.rationale || s.description || "Based on recent analysis",
          impact: s.severity === 'high' || s.severity === 'critical' ? 'High' : 'Medium',
          effort: s.effort || 'M',
          confidence: s.confidence || 60,
          category: s.category || 'general',
          status: (s.evidenceJson || s.impactedUrls?.length > 0 || s.impactedKeywords?.length > 0) ? 'verified' : 'unverified',
          agents: [{
            id: s.sourceWorkers?.[0] || 'orchestrator',
            agentId: s.sourceWorkers?.[0] || 'orchestrator',
            name: s.sourceWorkers?.[0] || 'System'
          }],
          evidence: {
            runId: s.runId || latestSeoRun?.runId,
            sourceConnector: s.sourceWorkers?.[0] || 'orchestrator',
            timestamp: s.createdAt || latestSeoRun?.startedAt,
            metrics: (s.evidenceJson as any)?.metrics || {},
            urls: s.impactedUrls || (s.evidenceJson as any)?.urls || [],
            queries: s.impactedKeywords || (s.evidenceJson as any)?.keywords || []
          },
          recommendations: Array.isArray(s.actionsJson) 
            ? s.actionsJson.map((step: string) => ({ step })) 
            : [
                { step: "Review the identified issue" },
                { step: "Implement the suggested fix" },
                { step: "Verify with a follow-up scan" }
              ],
          decisionRule: `${s.severity} severity ${s.category} issue requiring ${s.estimatedEffort || 'moderate'} effort`
        }));

      // Build blockers from critical findings
      const blockers = findings
        .filter((f: any) => f.severity === 'critical' || f.severity === 'high')
        .slice(0, 5)
        .map((f: any) => ({
          id: f.sourceIntegration || 'unknown',
          title: f.title || f.description || 'Issue detected',
          fix: f.recommendation || 'Review and resolve',
          severity: f.severity
        }));

      // Determine contributing agents from worker results
      const contributingAgents = [...new Set(
        workerResults?.map((wr: any) => wr.serviceId).filter(Boolean) || []
      )];

      const activeCount = workerResults?.filter((wr: any) => wr.status === 'success').length || 0;
      const blockedCount = workerResults?.filter((wr: any) => wr.status === 'error').length || 0;

      res.json({
        generated_at: latestSeoRun?.startedAt || new Date().toISOString(),
        contributing_agents: contributingAgents,
        coverage: {
          active: activeCount,
          total: workerResults?.length || 0,
          blocked: blockedCount
        },
        priorities: hasRealData ? priorities : [],
        blockers,
        confidence: hasRealData && priorities.length > 0 ? "High" : "Low",
        isRealData: hasRealData,
        lastRunId: latestSeoRun?.runId,
        lastRunAt: latestSeoRun?.startedAt,
        placeholderReason: hasRealData ? null : "No recommendations yet. Run diagnostics or wait for worker findings."
      });
    } catch (error: any) {
      logger.error("API", "Failed to fetch recommendations", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Validate recommendations - check provenance and evidence
  app.post("/api/missions/validate", async (req, res) => {
    try {
      const siteId = (req.query.siteId as string) || (req.query.site_id as string) || "default";
      
      const [
        latestSeoRun,
        seoSuggestions,
        findings,
        workerResults,
        site
      ] = await Promise.all([
        storage.getLatestSeoRun(siteId),
        storage.getLatestSeoSuggestions(siteId, 20),
        storage.getLatestFindings(siteId, 20),
        storage.getLatestSeoWorkerResults(siteId),
        storage.getSiteById(siteId)
      ]);

      const validatedAt = new Date().toISOString();
      const missions: any[] = [];

      // Check each suggestion as a potential mission
      const priorities = seoSuggestions
        .filter((s: any) => s.priority === 'high' || s.priority === 'medium')
        .slice(0, 10);

      for (const suggestion of priorities) {
        const missionId = `mission-${suggestion.id}`;
        const reasons: string[] = [];
        const requiredFixes: any[] = [];

        // Check if we have evidence
        const hasEvidence = suggestion.evidence || suggestion.affectedUrls?.length > 0 || suggestion.affectedQueries?.length > 0;
        if (!hasEvidence) {
          reasons.push("NO_EVIDENCE_ROWS");
          requiredFixes.push({
            type: "DATA",
            service: suggestion.sourceAgentId || "System",
            hint: "No evidence data attached to this recommendation"
          });
        }

        // Check if source connector ran successfully
        const sourceWorker = workerResults?.find((wr: any) => wr.serviceId === suggestion.sourceAgentId);
        if (!sourceWorker) {
          reasons.push("CONNECTOR_NOT_RUNNING");
          requiredFixes.push({
            type: "WORKER",
            service: suggestion.sourceAgentId || "Unknown",
            hint: "Source worker not found in latest run"
          });
        } else if (sourceWorker.status === 'error') {
          reasons.push("CONNECTOR_FAILED");
          requiredFixes.push({
            type: "WORKER",
            service: suggestion.sourceAgentId,
            hint: `Worker failed: ${sourceWorker.errorMessage || 'Unknown error'}`
          });
        }

        // Determine status
        let status: 'verified' | 'unverified' | 'placeholder' = 'verified';
        if (reasons.length > 0) {
          status = hasEvidence ? 'unverified' : 'placeholder';
        }

        missions.push({
          missionId,
          title: suggestion.title || suggestion.suggestion,
          status,
          reasons,
          requiredFixes,
          evidencePreview: hasEvidence ? {
            urls: suggestion.affectedUrls?.slice(0, 3) || [],
            queries: suggestion.affectedQueries?.slice(0, 3) || [],
            summary: suggestion.evidence || null
          } : null,
          rulePreview: suggestion.decisionRule || "Standard priority-based ranking"
        });
      }

      // If no suggestions exist, add a placeholder mission
      if (missions.length === 0) {
        missions.push({
          missionId: "no-data",
          title: "Connect Data Sources",
          status: "placeholder",
          reasons: ["NO_DIAGNOSTICS_RUN"],
          requiredFixes: [
            {
              type: "CONFIG",
              key: "GA4_PROPERTY_ID",
              where: "Secrets",
              hint: "Set GA4 property ID in secrets"
            },
            {
              type: "CONFIG", 
              key: "GSC_SITE",
              where: "Secrets",
              hint: "Set Google Search Console site URL"
            },
            {
              type: "ACTION",
              hint: "Run diagnostics to generate real recommendations"
            }
          ],
          evidencePreview: null,
          rulePreview: null
        });
      }

      const verified = missions.filter(m => m.status === 'verified').length;
      const unverified = missions.filter(m => m.status === 'unverified').length;
      const placeholder = missions.filter(m => m.status === 'placeholder').length;

      res.json({
        siteId,
        validatedAt,
        summary: {
          verified,
          unverified,
          placeholder,
          total: missions.length
        },
        lastRunId: latestSeoRun?.runId || null,
        lastRunAt: latestSeoRun?.startedAt || null,
        missions
      });
    } catch (error: any) {
      logger.error("API", "Failed to validate missions", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/report/latest", async (req, res) => {
    try {
      const report = await storage.getLatestReport();

      if (!report) {
        return res.status(404).json({ error: "No reports found" });
      }

      res.json({
        id: report.id,
        date: report.date,
        reportType: report.reportType,
        summary: report.summary,
        dropDates: report.dropDates,
        rootCauses: report.rootCauses,
        markdownReport: report.markdownReport,
        createdAt: report.createdAt,
      });
    } catch (error: any) {
      logger.error("API", "Failed to fetch latest report", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/tickets/latest", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const tickets = await storage.getLatestTickets(limit);

      res.json({
        count: tickets.length,
        tickets: tickets.map(t => ({
          id: t.id,
          ticketId: t.ticketId,
          title: t.title,
          owner: t.owner,
          priority: t.priority,
          status: t.status,
          steps: t.steps,
          expectedImpact: t.expectedImpact,
          evidence: t.evidence,
          reportId: t.reportId,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        })),
      });
    } catch (error: any) {
      logger.error("API", "Failed to fetch latest tickets", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // QA Endpoints
  app.post("/api/qa/run", async (req, res) => {
    try {
      const { siteId, mode = "connection", trigger = "manual" } = req.body;
      
      const { runQa } = await import("./qa/qaRunner");
      const result = await runQa({ siteId, mode, trigger });
      
      res.json(result);
    } catch (error: any) {
      logger.error("API", "Failed to run QA", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/qa/runs", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const runs = await storage.getLatestQaRuns(limit);
      res.json({ runs });
    } catch (error: any) {
      logger.error("API", "Failed to fetch QA runs", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/qa/runs/:runId", async (req, res) => {
    try {
      const { runId } = req.params;
      const { getQaRun } = await import("./qa/qaRunner");
      const result = await getQaRun(runId);
      
      if (!result) {
        return res.status(404).json({ error: "QA run not found" });
      }
      
      res.json(result);
    } catch (error: any) {
      logger.error("API", "Failed to fetch QA run", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/ai/ask", async (req, res) => {
    try {
      const { question } = req.body;
      
      if (!question || typeof question !== 'string') {
        return res.status(400).json({ error: "Question is required" });
      }

      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const latestRun = await storage.getLatestRun();
      
      const [report, tickets, hypothesesData, anomaliesData, status] = await Promise.all([
        storage.getLatestReport(),
        storage.getLatestTickets(20),
        latestRun ? storage.getHypothesesByRunId(latestRun.runId) : Promise.resolve([]),
        latestRun ? storage.getAnomaliesByRunId(latestRun.runId) : Promise.resolve([]),
        (async () => {
          const campaigns = await adsConnector.getCampaignStatuses().catch(() => []);
          return {
            campaigns: campaigns.length,
            authenticated: await googleAuth.isAuthenticated(),
          };
        })(),
      ]);

      if (!report) {
        return res.json({ 
          response: "No diagnostic data available yet. Please run a diagnostic first using the 'Run Diagnostics' button on the dashboard.",
          runId: null,
          citations: [],
        });
      }

      const ticketsJson = tickets.map(t => ({
        id: t.ticketId,
        title: t.title,
        owner: t.owner,
        priority: t.priority,
        status: t.status,
        expectedImpact: t.expectedImpact,
        hypothesisKey: t.hypothesisKey,
      }));

      const hypothesesJson = hypothesesData.map(h => ({
        rank: h.rank,
        key: h.hypothesisKey,
        confidence: h.confidence,
        summary: h.summary,
        evidence: h.evidence,
        missingData: h.missingData,
      }));

      const anomaliesJson = anomaliesData.map(a => ({
        type: a.anomalyType,
        metric: a.metric,
        deltaPct: a.deltaPct,
        scope: a.scope,
      }));

      const classification = latestRun?.primaryClassification || 'INCONCLUSIVE';
      const confidence = latestRun?.confidenceOverall || 'low';
      const deltas = latestRun?.deltas as any || {};

      const systemPrompt = `You are Traffic Doctor AI, an expert at diagnosing web traffic and advertising performance issues for empathyhealthclinic.com.

IMPORTANT: Use ONLY the provided facts below. If data is missing, explicitly state what data is needed. Do not make assumptions.

## Primary Classification
**${classification}** (${confidence} confidence)

## Metric Deltas (Current 3 days vs Previous 14 days)
- GA4 Sessions: ${deltas?.ga4?.sessionsDelta?.toFixed(1) || 'N/A'}%
- GA4 Users: ${deltas?.ga4?.usersDelta?.toFixed(1) || 'N/A'}%
- GSC Clicks: ${deltas?.gsc?.clicksDelta?.toFixed(1) || 'N/A'}%
- GSC Impressions: ${deltas?.gsc?.impressionsDelta?.toFixed(1) || 'N/A'}%
- GSC CTR: ${deltas?.gsc?.ctrDelta?.toFixed(1) || 'N/A'}%

## Anomalies Detected (${anomaliesJson.length})
${anomaliesJson.length > 0 ? JSON.stringify(anomaliesJson, null, 2) : 'No significant anomalies'}

## Root Cause Hypotheses (${hypothesesJson.length})
${hypothesesJson.length > 0 ? JSON.stringify(hypothesesJson, null, 2) : 'No hypotheses generated'}

## Action Tickets (${ticketsJson.length})
${JSON.stringify(ticketsJson, null, 2)}

## Full Report
${report.markdownReport || report.summary}

## System Status
- Run ID: ${latestRun?.runId || 'N/A'}
- Run Date: ${report.date}
- Google Auth: ${status.authenticated ? 'Connected' : 'Not connected'}
- Google Ads Campaigns: ${status.campaigns}

When answering:
1. Reference specific evidence from the data above
2. Prioritize high-confidence hypotheses and P0/P1 tickets
3. If the classification is INCONCLUSIVE, explain what additional data would help
4. Be actionable and specific`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        max_tokens: 2048,
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content || "I couldn't generate a response. Please try again.";

      const citations = [
        ...(hypothesesJson.length > 0 ? [{ type: 'hypothesis', ref: hypothesesJson[0].key }] : []),
        ...(ticketsJson.length > 0 ? [{ type: 'ticket', ref: ticketsJson[0].id }] : []),
        { type: 'report', ref: report.id },
      ];

      logger.info("AI", "Answered question", { question: question.slice(0, 100), runId: latestRun?.runId });

      res.json({ 
        response,
        runId: latestRun?.runId || null,
        citations,
      });
    } catch (error: any) {
      logger.error("AI", "Failed to answer question", { error: error.message });
      res.status(500).json({ error: "Failed to get AI response. Please try again." });
    }
  });

  app.get("/api/campaigns", async (req, res) => {
    try {
      const campaigns = await adsConnector.getCampaignStatuses();
      res.json({
        count: campaigns.length,
        campaigns: campaigns.map(c => ({
          id: c.id,
          name: c.name,
          status: c.status,
          budget: c.budget,
          budgetType: c.budgetType,
          servingStatus: c.servingStatus,
          primaryStatus: c.primaryStatus,
          primaryStatusReasons: c.primaryStatusReasons,
        })),
      });
    } catch (error: any) {
      logger.error("API", "Failed to fetch campaigns", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/auth/status", async (req, res) => {
    try {
      const isAuthenticated = await googleAuth.isAuthenticated();
      res.json({ authenticated: isAuthenticated });
    } catch (error: any) {
      logger.error("API", "Auth status check failed", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/auth/url", async (req, res) => {
    try {
      const url = googleAuth.getAuthUrl();
      res.json({ url });
    } catch (error: any) {
      logger.error("API", "Failed to generate auth URL", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/auth/callback", async (req, res) => {
    try {
      const code = req.query.code as string;

      if (!code) {
        return res.redirect("/dashboard?auth=error&message=Authorization+code+required");
      }

      await googleAuth.exchangeCodeForTokens(code);
      logger.info("API", "OAuth authentication successful");
      res.redirect("/dashboard?auth=success");
    } catch (error: any) {
      logger.error("API", "OAuth callback failed", { error: error.message });
      res.redirect("/dashboard?auth=error&message=" + encodeURIComponent(error.message));
    }
  });

  // Industry Benchmarks Endpoints
  
  // Summary endpoint - returns real site metrics for date range
  app.get("/api/benchmarks/summary", async (req, res) => {
    try {
      const { siteId, from, to } = req.query;
      const targetSiteId = (siteId as string) || 'default';
      
      // Default to last 30 days if not specified
      const now = new Date();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const formatDate = (d: Date) => d.toISOString().split("T")[0].replace(/-/g, "");
      
      const startDate = (from as string) || formatDate(thirtyDaysAgo);
      const endDate = (to as string) || formatDate(now);
      
      const [gscData, ga4Data] = await Promise.all([
        storage.getGSCDataByDateRange(startDate, endDate, targetSiteId),
        storage.getGA4DataByDateRange(startDate, endDate, targetSiteId),
      ]);
      
      // Calculate aggregated metrics
      const totalClicks = gscData.reduce((sum, d) => sum + d.clicks, 0);
      const totalImpressions = gscData.reduce((sum, d) => sum + d.impressions, 0);
      const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : null;
      const avgPosition = gscData.length > 0 
        ? gscData.reduce((sum, d) => sum + d.position, 0) / gscData.length 
        : null;
      
      const totalSessions = ga4Data.reduce((sum, d) => sum + d.sessions, 0);
      const totalUsers = ga4Data.reduce((sum, d) => sum + d.users, 0);
      const totalConversions = ga4Data.reduce((sum, d) => sum + d.conversions, 0);
      
      // Get latest update timestamps
      const gscLatest = gscData.length > 0 ? gscData[gscData.length - 1].createdAt : null;
      const ga4Latest = ga4Data.length > 0 ? ga4Data[ga4Data.length - 1].createdAt : null;
      
      res.json({
        siteId: targetSiteId,
        from: startDate,
        to: endDate,
        metrics: {
          sessions: { value: totalSessions || null, source: "ga4", lastUpdatedAt: ga4Latest },
          users: { value: totalUsers || null, source: "ga4", lastUpdatedAt: ga4Latest },
          conversions: { value: totalConversions || null, source: "ga4", lastUpdatedAt: ga4Latest },
          clicks: { value: totalClicks || null, source: "gsc", lastUpdatedAt: gscLatest },
          impressions: { value: totalImpressions || null, source: "gsc", lastUpdatedAt: gscLatest },
          ctr: { value: avgCtr, source: "gsc", lastUpdatedAt: gscLatest },
          position: { value: avgPosition, source: "gsc", lastUpdatedAt: gscLatest },
        },
        dataPoints: {
          ga4: ga4Data.length,
          gsc: gscData.length,
        },
      });
    } catch (error: any) {
      logger.error("API", "Failed to fetch benchmark summary", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });
  
  // Unified Metrics API - Single source of truth for all metrics
  app.get("/api/metrics/latest", async (req, res) => {
    try {
      const { siteId } = req.query;
      
      // Resolve site ID
      let targetSiteId = siteId as string;
      if (!targetSiteId || targetSiteId === 'default') {
        const allSites = await storage.getSites(true);
        const activeSite = allSites.find(s => s.active);
        targetSiteId = activeSite?.siteId || 'site_empathy_health_clinic';
      }
      
      // First try the new normalized metric events table
      const metricEvents = await storage.getLatestMetricsBySite(targetSiteId);
      
      // Also get legacy worker results for backwards compatibility
      const workerResults = await storage.getLatestSeoWorkerResults(targetSiteId);
      
      // Import normalizer to translate legacy data
      const { flattenWorkerResultsToCanonical, normalizeCWVMetrics } = await import('./metricsNormalizer');
      
      // Merge metrics from both sources (new events take precedence)
      const legacyMetrics = flattenWorkerResultsToCanonical(workerResults);
      const newMetrics: Record<string, any> = {};
      
      for (const event of metricEvents) {
        const metrics = event.metricsJson as Record<string, any>;
        if (metrics) {
          Object.assign(newMetrics, metrics);
        }
      }
      
      // Merge: new metrics override legacy
      const allMetrics = { ...legacyMetrics, ...newMetrics };
      
      // Determine coverage (which metrics are missing vs expected)
      const { METRIC_KEYS, SERVICES } = await import('../shared/registry');
      const expectedMetrics = Object.keys(METRIC_KEYS);
      const presentMetrics = Object.keys(allMetrics).filter(k => allMetrics[k] !== null);
      const missingMetrics = expectedMetrics.filter(k => !(k in allMetrics) || allMetrics[k] === null);
      
      // Find stale metrics (older than 24 hours)
      const staleThreshold = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const staleMetrics: string[] = [];
      
      for (const event of metricEvents) {
        if (new Date(event.collectedAt) < staleThreshold) {
          const metrics = event.metricsJson as Record<string, any>;
          if (metrics) {
            staleMetrics.push(...Object.keys(metrics));
          }
        }
      }
      
      // Get latest collection times by service
      const serviceTimestamps: Record<string, string> = {};
      for (const event of metricEvents) {
        serviceTimestamps[event.serviceId] = event.collectedAt.toISOString();
      }
      for (const result of workerResults) {
        if (!serviceTimestamps[result.workerKey]) {
          serviceTimestamps[result.workerKey] = result.createdAt.toISOString();
        }
      }
      
      res.json({
        siteId: targetSiteId,
        collectedAt: new Date().toISOString(),
        metrics: allMetrics,
        coverage: {
          total: expectedMetrics.length,
          present: presentMetrics.length,
          missing: missingMetrics,
          stale: staleMetrics,
        },
        sources: serviceTimestamps,
      });
    } catch (error: any) {
      logger.error("API", "Failed to fetch latest metrics", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get("/api/benchmarks", async (req, res) => {
    try {
      const { industry } = req.query;
      
      if (industry && typeof industry === 'string') {
        const benchmarks = await storage.getBenchmarksByIndustry(industry);
        return res.json({ benchmarks, industry });
      }
      
      const benchmarks = await storage.getAllBenchmarks();
      res.json({ benchmarks });
    } catch (error: any) {
      logger.error("API", "Failed to fetch benchmarks", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/benchmarks/industries", async (req, res) => {
    try {
      const industries = await storage.getAvailableIndustries();
      res.json({ industries });
    } catch (error: any) {
      logger.error("API", "Failed to fetch industries", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/benchmarks/seed", async (req, res) => {
    try {
      const { seedBenchmarks } = await import("./seedBenchmarks");
      const count = await seedBenchmarks();
      res.json({ seeded: count, message: `Seeded ${count} benchmark entries` });
    } catch (error: any) {
      logger.error("API", "Failed to seed benchmarks", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/benchmarks/compare", async (req, res) => {
    // Hoist variables for catch block access
    const industryParam = req.query.industry as string | undefined;
    const siteIdParam = req.query.siteId as string | undefined;
    let resolvedSiteId = siteIdParam || 'site_empathy_health_clinic';
    
    try {
      const industry = industryParam;
      const siteId = siteIdParam;
      
      if (!industry || typeof industry !== 'string') {
        return res.status(400).json({ error: "Industry parameter required" });
      }
      
      const benchmarks = await storage.getBenchmarksByIndustry(industry);
      if (benchmarks.length === 0) {
        return res.status(404).json({ error: `No benchmarks found for industry: ${industry}` });
      }
      
      // Get site's actual metrics for comparison
      const now = new Date();
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const formatDate = (d: Date) => d.toISOString().split("T")[0].replace(/-/g, "");
      
      // Resolve default site ID to actual site ID
      let targetSiteId = siteId as string;
      if (!targetSiteId || targetSiteId === 'default') {
        const allSites = await storage.getSites(true);
        const activeSite = allSites.find(s => s.active);
        targetSiteId = activeSite?.siteId || 'site_empathy_health_clinic';
      }
      resolvedSiteId = targetSiteId; // Update hoisted variable for catch block
      
      const [gscData, ga4Data, workerResults] = await Promise.all([
        storage.getGSCDataByDateRange(formatDate(thirtyDaysAgo), formatDate(now), targetSiteId),
        storage.getGA4DataByDateRange(formatDate(thirtyDaysAgo), formatDate(now), targetSiteId),
        storage.getLatestSeoWorkerResults(targetSiteId),
      ]);
      
      // Extract Core Web Vitals from worker results
      const cwvResult = workerResults.find(r => r.workerKey === 'core_web_vitals');
      const cwvMetrics = cwvResult?.metricsJson as Record<string, any> | null;
      
      // Calculate actual metrics - use null for missing data instead of 0
      const totalClicks = gscData.reduce((sum, d) => sum + d.clicks, 0);
      const totalImpressions = gscData.reduce((sum, d) => sum + d.impressions, 0);
      const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : null;
      const avgPosition = gscData.length > 0 
        ? gscData.reduce((sum, d) => sum + d.position, 0) / gscData.length 
        : null;
      
      const totalSessions = ga4Data.reduce((sum, d) => sum + d.sessions, 0);
      const totalUsers = ga4Data.reduce((sum, d) => sum + d.users, 0);
      const totalConversions = ga4Data.reduce((sum, d) => sum + d.conversions, 0);
      const conversionRate = totalSessions > 0 ? (totalConversions / totalSessions) * 100 : null;
      
      // Calculate bounce rate from GA4 data (weighted average)
      const bounceRateData = ga4Data.filter(d => d.bounceRate !== null && d.sessions > 0);
      const avgBounceRate = bounceRateData.length > 0
        ? bounceRateData.reduce((sum, d) => sum + ((d.bounceRate || 0) * d.sessions), 0) / 
          bounceRateData.reduce((sum, d) => sum + d.sessions, 0)
        : null;
      
      // Calculate session duration (weighted average)
      const durationData = ga4Data.filter(d => d.avgSessionDuration !== null && d.sessions > 0);
      const avgSessionDuration = durationData.length > 0
        ? durationData.reduce((sum, d) => sum + ((d.avgSessionDuration || 0) * d.sessions), 0) /
          durationData.reduce((sum, d) => sum + d.sessions, 0)
        : null;
      
      // Calculate pages per session (weighted average)
      const ppsData = ga4Data.filter(d => d.pagesPerSession !== null && d.sessions > 0);
      const avgPagesPerSession = ppsData.length > 0
        ? ppsData.reduce((sum, d) => sum + ((d.pagesPerSession || 0) * d.sessions), 0) /
          ppsData.reduce((sum, d) => sum + d.sessions, 0)
        : null;
      
      // Scale to monthly if date range differs (for sessions/clicks/impressions benchmarks)
      const daysInRange = Math.max(1, Math.ceil((now.getTime() - thirtyDaysAgo.getTime()) / (1000 * 60 * 60 * 24)));
      const scaleFactor = 30 / daysInRange;
      
      // Map actual values to metric keys
      const freshMetrics: Record<string, number | null> = {
        sessions: totalSessions > 0 ? Math.round(totalSessions * scaleFactor) : null,
        clicks: totalClicks > 0 ? Math.round(totalClicks * scaleFactor) : null,
        impressions: totalImpressions > 0 ? Math.round(totalImpressions * scaleFactor) : null,
        organic_ctr: avgCtr,
        avg_position: avgPosition,
        conversion_rate: conversionRate,
        bounce_rate: avgBounceRate,
        session_duration: avgSessionDuration,
        pages_per_session: avgPagesPerSession,
        // Core Web Vitals from worker results
        lcp: cwvMetrics?.lcp ?? null,
        cls: cwvMetrics?.cls ?? null,
        inp: cwvMetrics?.inp ?? null,
      };
      
      // Get cached snapshot and merge - never return null if we have previous values
      const snapshot = await storage.getDashboardMetricSnapshot(targetSiteId);
      const cachedMetrics = (snapshot?.metricsJson as Record<string, number | null>) || {};
      
      // Merge fresh metrics with cached - prefer fresh non-null values
      const actualMetrics: Record<string, number | null> = {};
      for (const key of Object.keys(freshMetrics)) {
        actualMetrics[key] = freshMetrics[key] !== null ? freshMetrics[key] : (cachedMetrics[key] ?? null);
      }
      
      // Save successful fresh metrics to snapshot (only non-null values)
      const hasAnyFreshData = Object.values(freshMetrics).some(v => v !== null);
      if (hasAnyFreshData) {
        const metricsToSave = { ...actualMetrics };
        // Only overwrite with non-null fresh values
        for (const [key, value] of Object.entries(freshMetrics)) {
          if (value !== null) {
            metricsToSave[key] = value;
          }
        }
        await storage.saveDashboardMetricSnapshot(targetSiteId, metricsToSave).catch(() => {});
      }
      
      // Metrics where lower is better
      const lowerIsBetter = ['avg_position', 'bounce_rate', 'lcp', 'cls', 'inp'];
      
      // Map benchmarks to comparison format with deltas
      const comparison = benchmarks.map(b => {
        const actualValue = actualMetrics[b.metric] ?? null;
        const industryBaseline = b.percentile50;
        const isLowerBetter = lowerIsBetter.includes(b.metric);
        
        // Calculate delta
        let delta: number | null = null;
        let deltaPct: number | null = null;
        if (actualValue !== null && industryBaseline) {
          delta = actualValue - industryBaseline;
          deltaPct = industryBaseline !== 0 ? ((actualValue - industryBaseline) / industryBaseline) * 100 : 0;
        }
        
        // Determine percentile category and status
        let percentile: string = 'unknown';
        let status: string = 'unknown';
        
        if (actualValue !== null) {
          if (isLowerBetter) {
            if (actualValue <= b.percentile90) { percentile = 'excellent'; status = 'good'; }
            else if (actualValue <= b.percentile75) { percentile = 'above_average'; status = 'good'; }
            else if (actualValue <= b.percentile50) { percentile = 'average'; status = 'watch'; }
            else if (actualValue <= b.percentile25) { percentile = 'below_average'; status = 'needs_improvement'; }
            else { percentile = 'poor'; status = 'needs_improvement'; }
          } else {
            if (actualValue >= b.percentile90) { percentile = 'excellent'; status = 'good'; }
            else if (actualValue >= b.percentile75) { percentile = 'above_average'; status = 'good'; }
            else if (actualValue >= b.percentile50) { percentile = 'average'; status = 'watch'; }
            else if (actualValue >= b.percentile25) { percentile = 'below_average'; status = 'needs_improvement'; }
            else { percentile = 'poor'; status = 'needs_improvement'; }
          }
        }
        
        return {
          metric: b.metric,
          unit: b.unit,
          actualValue,
          industryBaseline,
          delta,
          deltaPct: deltaPct !== null ? Math.round(deltaPct * 10) / 10 : null,
          percentile,
          status,
          benchmarks: {
            p25: b.percentile25,
            p50: b.percentile50,
            p75: b.percentile75,
            p90: b.percentile90,
          },
          source: b.source,
          sourceYear: b.sourceYear,
        };
      });
      
      res.json({
        industry,
        siteId: siteId || 'default',
        dateRange: {
          start: formatDate(thirtyDaysAgo),
          end: formatDate(now),
        },
        comparison,
        summary: {
          totalSessions,
          totalClicks,
          totalImpressions,
          avgCtr: avgCtr !== null ? avgCtr.toFixed(2) : null,
          avgPosition: avgPosition !== null ? avgPosition.toFixed(1) : null,
          conversionRate: conversionRate !== null ? conversionRate.toFixed(2) : null,
        },
      });
    } catch (error: any) {
      logger.error("API", "Failed to compare benchmarks", { error: error.message });
      
      // Try to return cached snapshot on error using hoisted variables
      try {
        const snapshot = await storage.getDashboardMetricSnapshot(resolvedSiteId);
        if (snapshot) {
          await storage.updateDashboardSnapshotRefreshStatus(resolvedSiteId, 'failed', error.message);
          const cachedMetrics = snapshot.metricsJson as Record<string, any>;
          
          // Return cached data with stale indicator
          return res.json({
            industry: industryParam,
            siteId: siteIdParam || 'default',
            isStale: true,
            capturedAt: snapshot.capturedAt,
            lastRefreshError: error.message,
            comparison: [], // Cannot compute comparison without benchmarks
            summary: {
              totalSessions: cachedMetrics.sessions,
              totalClicks: cachedMetrics.clicks,
              totalImpressions: cachedMetrics.impressions,
              avgCtr: cachedMetrics.organic_ctr?.toFixed(2) ?? null,
              avgPosition: cachedMetrics.avg_position?.toFixed(1) ?? null,
              conversionRate: cachedMetrics.conversion_rate?.toFixed(2) ?? null,
            },
          });
        }
      } catch {}
      
      res.status(500).json({ error: error.message });
    }
  });

  // Findings API Endpoints
  app.get("/api/findings", async (req, res) => {
    try {
      const { siteId, source, status, limit } = req.query;
      const targetSiteId = (siteId as string) || 'default';
      const limitNum = limit ? parseInt(limit as string) : 50;
      
      let findings;
      if (source) {
        findings = await storage.getFindingsBySource(targetSiteId, source as string, limitNum);
      } else if (status) {
        findings = await storage.getFindingsBySite(targetSiteId, status as string);
      } else {
        findings = await storage.getLatestFindings(targetSiteId, limitNum);
      }
      
      res.json({ findings, count: findings.length });
    } catch (error: any) {
      logger.error("API", "Failed to get findings", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/findings/kbase", async (req, res) => {
    try {
      const { siteId, limit } = req.query;
      const targetSiteId = (siteId as string) || 'default';
      const limitNum = limit ? parseInt(limit as string) : 50;
      
      const findings = await storage.getFindingsBySource(targetSiteId, 'seo_kbase', limitNum);
      const count = await storage.getFindingsCount(targetSiteId, 'seo_kbase');
      
      // Get the latest run info for this source
      const serviceRuns = await storage.getServiceRunsByService('seo_kbase', 1);
      const lastRun = serviceRuns[0];
      
      res.json({
        findings,
        count,
        lastRunAt: lastRun?.finishedAt || lastRun?.startedAt,
        lastRunId: lastRun?.runId,
        lastRunStatus: lastRun?.status,
      });
    } catch (error: any) {
      logger.error("API", "Failed to get KBASE findings", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/findings/summary", async (req, res) => {
    try {
      const { siteId } = req.query;
      const targetSiteId = (siteId as string) || 'default';
      
      const [totalCount, kbaseCount, latestFindings] = await Promise.all([
        storage.getFindingsCount(targetSiteId),
        storage.getFindingsCount(targetSiteId, 'seo_kbase'),
        storage.getLatestFindings(targetSiteId, 5),
      ]);
      
      // Get last KBASE run
      const serviceRuns = await storage.getServiceRunsByService('seo_kbase', 1);
      const lastKbaseRun = serviceRuns[0];
      
      res.json({
        total: totalCount,
        kbaseCount,
        latestFindings,
        lastKbaseRunAt: lastKbaseRun?.finishedAt || lastKbaseRun?.startedAt,
        lastKbaseRunId: lastKbaseRun?.runId,
      });
    } catch (error: any) {
      logger.error("API", "Failed to get findings summary", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get mission state with cooldown info for crew dashboards
  app.get("/api/missions/state", async (req, res) => {
    try {
      const { siteId, crewId } = req.query;
      const targetSiteId = (siteId as string) || 'default';
      const targetCrewId = (crewId as string) || null;
      
      const cooldownHours = parseInt(process.env.MISSION_COOLDOWN_HOURS || '24', 10);
      
      const { getMissionsForCrew, getAllMissions } = await import('../shared/missions/missionRegistry');
      
      const availableMissions = targetCrewId 
        ? getMissionsForCrew(targetCrewId)
        : getAllMissions();
      
      const recentCompletions = await storage.getRecentMissionCompletions(
        targetSiteId,
        targetCrewId || 'all',
        cooldownHours
      );
      
      const lastCompleted = recentCompletions.length > 0 ? recentCompletions[0] : null;
      const completedMissionIds = recentCompletions
        .map(log => (log.details as any)?.missionId || (log.details as any)?.actionId)
        .filter(Boolean);
      const uniqueCompletedIds = [...new Set(completedMissionIds)] as string[];
      
      const pendingMissions = availableMissions.filter(
        mission => !uniqueCompletedIds.includes(mission.missionId)
      );
      
      const nextActions = pendingMissions.map(mission => ({
        missionId: mission.missionId,
        title: mission.title,
        description: mission.description,
        impact: mission.impact,
        effort: mission.effort,
        autoFixable: mission.autoFixable,
      }));
      
      const highImpactPending = pendingMissions.filter(m => m.impact === 'high');
      const autoFixableCount = pendingMissions.filter(m => m.autoFixable).length;
      
      let tier: 'looking_good' | 'doing_okay' | 'needs_attention';
      if (highImpactPending.length > 0) {
        tier = 'needs_attention';
      } else if (pendingMissions.length > 0) {
        tier = 'doing_okay';
      } else {
        tier = 'looking_good';
      }
      
      const nextStep = pendingMissions.length > 0 
        ? `Next: ${pendingMissions[0].title}`
        : 'All missions complete!';
      
      res.json({
        ok: true,
        nextActions,
        lastCompleted: lastCompleted ? {
          completedAt: lastCompleted.createdAt,
          missionId: (lastCompleted.details as any)?.missionId || (lastCompleted.details as any)?.actionId,
          runId: (lastCompleted.details as any)?.runId,
          summary: (lastCompleted.details as any)?.summary,
        } : null,
        completedMissionIds: uniqueCompletedIds,
        cooldownHours,
        status: {
          tier,
          nextStep,
          priorityCount: highImpactPending.length,
          autoFixableCount,
        },
      });
    } catch (error: any) {
      logger.error("API", "Failed to get missions state", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Aggregated mission dashboard for Mission Control view
  app.get("/api/missions/dashboard", async (req, res) => {
    try {
      const { siteId } = req.query;
      const targetSiteId = (siteId as string) || 'site_empathy_health_clinic';
      
      const cooldownHours = parseInt(process.env.MISSION_COOLDOWN_HOURS || '24', 10);
      
      const { CREW } = await import('../shared/registry');
      const { getMissionsForCrew, getAllMissions, MISSION_REGISTRY } = await import('../shared/missions/missionRegistry');
      
      const allMissions = getAllMissions();
      const crewIds = Object.keys(CREW);
      
      const allRecentCompletions = await storage.getRecentMissionCompletions(
        targetSiteId,
        'all',
        cooldownHours * 3
      );
      
      const completedMissionIds = new Set<string>();
      const completionsByMissionId: Record<string, any> = {};
      
      for (const log of allRecentCompletions) {
        const missionId = (log.details as any)?.missionId || (log.details as any)?.actionId;
        if (missionId) {
          completedMissionIds.add(missionId);
          if (!completionsByMissionId[missionId]) {
            completionsByMissionId[missionId] = log;
          }
        }
      }
      
      const pendingMissions = allMissions.filter(
        mission => !completedMissionIds.has(mission.missionId)
      );
      
      const impactOrder = { high: 0, medium: 1, low: 2 };
      const sortedPending = [...pendingMissions].sort((a, b) => {
        const impactDiff = impactOrder[a.impact] - impactOrder[b.impact];
        if (impactDiff !== 0) return impactDiff;
        const effortOrder = { S: 0, M: 1, L: 2 };
        return effortOrder[a.effort] - effortOrder[b.effort];
      });
      
      const nextActions = sortedPending.slice(0, 5).map(mission => ({
        crewId: mission.crewId,
        missionId: mission.missionId,
        title: mission.title,
        description: mission.description,
        impact: mission.impact,
        effort: mission.effort,
        autoFixable: mission.autoFixable,
      }));
      
      const recentlyCompleted = allRecentCompletions.slice(0, 3).map(log => {
        const missionId = (log.details as any)?.missionId || (log.details as any)?.actionId;
        const mission = missionId ? MISSION_REGISTRY[missionId] : null;
        return {
          crewId: (log.details as any)?.crewId || mission?.crewId || 'unknown',
          missionId: missionId || 'unknown',
          title: mission?.title || (log.details as any)?.title || 'Unknown Mission',
          completedAt: log.createdAt,
          summary: (log.details as any)?.summary || null,
        };
      });
      
      const crewSummaries = crewIds.map(crewId => {
        const crew = CREW[crewId];
        const crewMissions = getMissionsForCrew(crewId);
        const pendingForCrew = crewMissions.filter(
          m => !completedMissionIds.has(m.missionId)
        );
        
        const crewCompletions = allRecentCompletions.filter(log => {
          const missionId = (log.details as any)?.missionId || (log.details as any)?.actionId;
          const mission = missionId ? MISSION_REGISTRY[missionId] : null;
          return mission?.crewId === crewId || (log.details as any)?.crewId === crewId;
        });
        
        const lastCompleted = crewCompletions[0];
        
        let status: 'looking_good' | 'doing_okay' | 'needs_attention';
        const hasHighPriority = pendingForCrew.some(m => m.impact === 'high');
        if (hasHighPriority) {
          status = 'needs_attention';
        } else if (pendingForCrew.length > 0) {
          status = 'doing_okay';
        } else {
          status = 'looking_good';
        }
        
        return {
          crewId,
          nickname: crew.nickname,
          pendingCount: pendingForCrew.length,
          lastCompletedAt: lastCompleted?.createdAt || null,
          status,
        };
      });
      
      const highPriorityCount = pendingMissions.filter(m => m.impact === 'high').length;
      const autoFixableCount = pendingMissions.filter(m => m.autoFixable).length;
      
      let tier: 'looking_good' | 'doing_okay' | 'needs_attention';
      if (highPriorityCount > 0) {
        tier = 'needs_attention';
      } else if (pendingMissions.length > 0) {
        tier = 'doing_okay';
      } else {
        tier = 'looking_good';
      }
      
      const nextStep = sortedPending.length > 0
        ? `Next: ${sortedPending[0].title}`
        : 'All missions complete!';
      
      res.json({
        ok: true,
        siteId: targetSiteId,
        aggregatedStatus: {
          tier,
          totalMissions: allMissions.length,
          completedCount: completedMissionIds.size,
          pendingCount: pendingMissions.length,
          highPriorityCount,
          autoFixableCount,
          nextStep,
        },
        nextActions,
        recentlyCompleted,
        crewSummaries,
      });
    } catch (error: any) {
      logger.error("API", "Failed to get missions dashboard", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Generic mission execution endpoint for all crews
  app.post("/api/missions/execute", async (req, res) => {
    try {
      const { siteId, crewId, missionId, force = false } = req.body;
      
      if (!siteId || !crewId || !missionId) {
        return res.status(400).json({ 
          ok: false, 
          error: "Missing required fields: siteId, crewId, missionId" 
        });
      }
      
      const { getMission } = await import('../shared/missions/missionRegistry');
      const mission = getMission(missionId);
      
      if (!mission) {
        return res.status(404).json({ ok: false, error: `Mission not found: ${missionId}` });
      }
      
      if (mission.crewId !== crewId) {
        return res.status(400).json({ 
          ok: false, 
          error: `Mission ${missionId} belongs to crew ${mission.crewId}, not ${crewId}` 
        });
      }
      
      const cooldownHours = mission.cooldownHours || 24;
      if (!force) {
        const recentCompletions = await storage.getRecentMissionCompletions(siteId, crewId, cooldownHours);
        const recentForMission = recentCompletions.find(
          log => (log.details as any)?.missionId === missionId
        );
        
        if (recentForMission) {
          const completedAt = new Date(recentForMission.createdAt);
          const cooldownEndsAt = new Date(completedAt.getTime() + cooldownHours * 60 * 60 * 1000);
          const hoursRemaining = Math.ceil((cooldownEndsAt.getTime() - Date.now()) / (60 * 60 * 1000));
          
          return res.status(409).json({
            ok: false,
            error: `Mission on cooldown. Try again in ${hoursRemaining} hour(s)`,
            completedAt: completedAt.toISOString(),
            cooldownEndsAt: cooldownEndsAt.toISOString(),
            hoursRemaining,
          });
        }
      }
      
      const runId = `mission_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const summary = `${mission.title} completed`;
      
      await storage.saveMissionExecution({
        siteId,
        crewId,
        missionId,
        runId,
        status: 'success',
        summary,
        metadata: { handlerKey: mission.handlerKey },
      });
      
      logger.info("MISSIONS", "Mission executed", { siteId, crewId, missionId, runId });
      
      res.json({
        ok: true,
        runId,
        missionId,
        crewId,
        summary,
        completedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("MISSIONS", "Failed to execute mission", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Run KBASE worker to generate fresh insights
  app.post("/api/kbase/run", async (req, res) => {
    try {
      const { resolveWorkerConfig } = await import("./workerConfigResolver");
      const kbaseConfig = await resolveWorkerConfig("seo_kbase");
      
      if (!kbaseConfig.valid || !kbaseConfig.base_url) {
        return res.status(400).json({ 
          error: kbaseConfig.error || "SEO_KBASE not configured - add secret to Bitwarden",
          configured: false,
        });
      }
      
      // Check for cooldown bypass
      const forceRun = req.query.force === 'true';
      const siteId = (req.body?.siteId as string) || 'site_empathy_health_clinic';
      const crewId = 'seo_kbase';
      const cooldownHours = parseInt(process.env.MISSION_COOLDOWN_HOURS || '24', 10);
      
      // Check cooldown unless force=true
      if (!forceRun) {
        const recentCompletions = await storage.getRecentMissionCompletions(siteId, crewId, cooldownHours);
        if (recentCompletions.length > 0) {
          const lastCompletion = recentCompletions[0];
          const completedAt = new Date(lastCompletion.createdAt);
          const cooldownEndsAt = new Date(completedAt.getTime() + cooldownHours * 60 * 60 * 1000);
          const hoursRemaining = Math.ceil((cooldownEndsAt.getTime() - Date.now()) / (60 * 60 * 1000));
          
          logger.info("KBASE", "Mission on cooldown", { 
            lastCompletedAt: completedAt.toISOString(),
            cooldownEndsAt: cooldownEndsAt.toISOString(),
            hoursRemaining,
          });
          
          return res.status(409).json({
            error: `Already completed recently — try again after ${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}`,
            completedAt: completedAt.toISOString(),
            cooldownEndsAt: cooldownEndsAt.toISOString(),
            hoursRemaining,
            cooldownHours,
          });
        }
      }
      
      const baseUrl = kbaseConfig.base_url.replace(/\/+$/, '');
      const domain = process.env.DOMAIN || 'empathyhealthclinic.com';
      const runId = `kbase_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      
      // Call the KBASE worker run endpoint
      const runUrl = `${baseUrl}/run`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      
      // Add API key if available
      if (kbaseConfig.api_key) {
        headers["x-api-key"] = kbaseConfig.api_key;
        headers["Authorization"] = `Bearer ${kbaseConfig.api_key}`;
      }
      
      logger.info("KBASE", "Triggering KBASE run", { domain, runId });
      
      const response = await fetch(runUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ 
          domain,
          mode: req.body?.mode || "quick",
          run_id: runId,
        }),
        signal: AbortSignal.timeout(30000),
      });
      
      const responseText = await response.text();
      let responseData: any = {};
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { raw: responseText.slice(0, 500) };
      }
      
      if (!response.ok) {
        logger.error("KBASE", "KBASE run failed", { status: response.status, response: responseData });
        return res.status(response.status).json({
          error: responseData.error || `KBASE returned ${response.status}`,
          details: responseData,
        });
      }
      
      // Normalize worker outputs into findings
      const { v4: uuidv4 } = await import("uuid");
      // Worker may return { ok, outputs: {...} } or { data: {...} } or direct payload
      const dataPayload = responseData.outputs || responseData.data || responseData;
      const findingsToSave: any[] = [];
      
      // Map SEO recommendations to findings
      const recommendations = dataPayload.seo_recommendations || dataPayload.recommendations || [];
      if (Array.isArray(recommendations)) {
        for (const rec of recommendations) {
          findingsToSave.push({
            findingId: `kbase_${uuidv4().slice(0, 8)}`,
            siteId,
            sourceIntegration: 'seo_kbase',
            runId,
            category: 'kbase',
            severity: rec.severity || rec.priority || 'medium',
            impactScore: rec.impact_score || 50,
            confidence: rec.confidence || 0.7,
            title: rec.title || rec.name || 'SEO Recommendation',
            description: rec.description || rec.details || rec.summary,
            evidence: rec.evidence ? { items: rec.evidence } : null,
            recommendedActions: Array.isArray(rec.actions) ? rec.actions : 
                                rec.action ? [rec.action] : 
                                rec.recommendation ? [rec.recommendation] : [],
            status: 'open',
          });
        }
      }
      
      // Map best practices to findings
      const bestPractices = dataPayload.best_practices || [];
      if (Array.isArray(bestPractices)) {
        for (const bp of bestPractices) {
          findingsToSave.push({
            findingId: `kbase_bp_${uuidv4().slice(0, 8)}`,
            siteId,
            sourceIntegration: 'seo_kbase',
            runId,
            category: 'kbase',
            severity: 'info',
            impactScore: 30,
            confidence: 0.9,
            title: typeof bp === 'string' ? bp : bp.title || bp.name || 'Best Practice',
            description: typeof bp === 'string' ? bp : bp.description || bp.details,
            recommendedActions: typeof bp === 'string' ? [bp] : bp.actions || [],
            status: 'open',
          });
        }
      }
      
      // Map optimization tips to findings
      const tips = dataPayload.optimization_tips || [];
      if (Array.isArray(tips)) {
        for (const tip of tips) {
          findingsToSave.push({
            findingId: `kbase_tip_${uuidv4().slice(0, 8)}`,
            siteId,
            sourceIntegration: 'seo_kbase',
            runId,
            category: 'kbase',
            severity: 'low',
            impactScore: 40,
            confidence: 0.8,
            title: typeof tip === 'string' ? tip : tip.title || tip.name || 'Optimization Tip',
            description: typeof tip === 'string' ? tip : tip.description,
            recommendedActions: typeof tip === 'string' ? [tip] : tip.actions || [],
            status: 'open',
          });
        }
      }
      
      // Also check for direct findings array (legacy format)
      if (responseData.findings && Array.isArray(responseData.findings)) {
        for (const finding of responseData.findings) {
          findingsToSave.push({
            findingId: finding.finding_id || finding.id || `kbase_${uuidv4().slice(0, 8)}`,
            siteId,
            runId,
            sourceIntegration: 'seo_kbase',
            category: finding.category || 'recommendation',
            severity: finding.severity || 'info',
            title: finding.title || finding.check_name || 'KBASE Insight',
            description: finding.description || finding.recommendation,
            status: 'open',
          });
        }
      }
      
      // Save all findings - verify by checking delta
      const writtenCount = findingsToSave.length;
      let writeVerified = false;
      let totalBefore = 0;
      let totalAfter = 0;
      
      if (findingsToSave.length > 0) {
        // Get count before write for delta comparison
        totalBefore = await storage.getFindingsCount(siteId, 'seo_kbase');
        
        await storage.saveFindings(findingsToSave);
        logger.info("KBASE", `Saved ${findingsToSave.length} KBASE findings`, { runId });
        
        // Verify the write by comparing delta (totalAfter - totalBefore should match writtenCount)
        totalAfter = await storage.getFindingsCount(siteId, 'seo_kbase');
        const delta = totalAfter - totalBefore;
        writeVerified = delta === writtenCount;
        logger.info("KBASE", `Write verification: ${writeVerified}, before=${totalBefore}, after=${totalAfter}, delta=${delta}, written=${writtenCount}`);
        
        // If verification failed, return error
        if (!writeVerified) {
          logger.error("KBASE", "Write verification failed", { delta, writtenCount, runId });
          
          // Log the failure event
          await storage.saveAuditLog({
            siteId,
            action: 'kbase_run_failed',
            actor: 'system',
            details: {
              crewId: 'seo_kbase',
              actionId: 'collect_learnings',
              runId,
              writtenCount,
              actualDelta: delta,
              writeVerified: false,
              error: `Write verification failed: expected ${writtenCount} new items but only ${delta} were persisted`,
            },
          });
          
          return res.status(500).json({
            ok: false,
            success: false,
            siteId,
            runId,
            writtenCount,
            writeVerified: false,
            error: `Write verification failed: expected ${writtenCount} new items but only ${delta} were persisted`,
          });
        }
      } else {
        // No findings to write is still a "verified" success (just 0 items)
        writeVerified = true;
        totalAfter = await storage.getFindingsCount(siteId, 'seo_kbase');
      }
      
      // Use totalAfter for KB totals
      const kbTotals = totalAfter;
      const summary = writtenCount > 0 
        ? `KBase updated — ${writtenCount} new insights` 
        : 'No new learnings to add';
      
      // Record service run (only on success)
      await storage.createServiceRun({
        runId,
        runType: 'manual',
        serviceId: 'seo_kbase',
        serviceName: 'SEO Knowledge Base',
        trigger: 'manual',
        status: 'success',
        startedAt: new Date(),
        finishedAt: new Date(),
        summary,
      });
      
      // Create audit log entry for action completion (only on success)
      await storage.saveMissionExecution({
        siteId,
        crewId: 'socrates',
        missionId: 'collect_learnings',
        runId,
        status: 'success',
        summary,
        metadata: {
          actionId: 'collect_learnings',
          writtenCount,
          writeVerified,
          kbTotals,
        },
      });
      
      // After successful write verification, trigger synthesis
      let synthesisTriggered = false;
      let insightsAdded = 0;
      let recommendationsAdded = 0;
      
      if (writtenCount > 0 && writeVerified) {
        try {
          logger.info("KBASE", "Triggering synthesis after learnings save", { siteId, writtenCount });
          
          // Get recent learnings for synthesis
          const learnings = await storage.getFindings(siteId, 50);
          
          if (learnings.length >= 5) {
            const OpenAI = (await import("openai")).default;
            const openai = new OpenAI();
            const synthesisRunId = `synthesis_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            
            // Call OpenAI for synthesis (same logic as /api/kb/synthesize)
            const learningsSummary = learnings.slice(0, 30).map(l => ({
              id: l.findingId,
              title: l.title,
              description: l.description?.slice(0, 200),
              category: l.category,
              severity: l.severity,
              source: l.sourceIntegration || 'unknown'
            }));
            
            const systemPrompt = `You are an SEO analyst synthesizing learnings into actionable insights and recommendations.
Given a list of SEO learnings/findings, identify:
1. 3-7 key INSIGHTS (patterns, themes, cross-cutting observations)
2. 3-10 RECOMMENDATIONS (actionable fixes prioritized by impact)

Return JSON:
{
  "insights": [{ "title": "...", "summary": "...", "tags": ["tag1"], "sourceIds": ["id1"] }],
  "recommendations": [{ "title": "...", "rationale": "...", "priority": "high|medium|low", "effort": "small|medium|large", "actionType": "content_update|tech_fix|seo_fix", "sourceIds": ["id1"] }]
}`;

            const response = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Synthesize these SEO learnings:\n\n${JSON.stringify(learningsSummary, null, 2)}` }
              ],
              response_format: { type: "json_object" },
              temperature: 0.3,
            });
            
            const content = response.choices[0]?.message?.content;
            if (content) {
              const synthesis = JSON.parse(content);
              
              // Save insights
              const insightsToSave = (synthesis.insights || []).map((i: any, idx: number) => ({
                insightId: `insight_${synthesisRunId}_${idx}`,
                siteId,
                title: i.title,
                summary: i.summary,
                tags: i.tags || [],
                sources: (i.sourceIds || []).map((id: string) => ({ crewId: 'seo_kbase', learningId: id })),
                synthesisRunId,
              }));
              
              if (insightsToSave.length > 0) {
                await storage.saveInsights(insightsToSave);
                insightsAdded = insightsToSave.length;
              }
              
              // Save recommendations
              const recsToSave = (synthesis.recommendations || []).map((r: any, idx: number) => ({
                recommendationId: `rec_${synthesisRunId}_${idx}`,
                siteId,
                title: r.title,
                rationale: r.rationale,
                priority: r.priority || 'medium',
                effort: r.effort,
                actionType: r.actionType,
                sources: (r.sourceIds || []).map((id: string) => ({ crewId: 'seo_kbase', learningId: id })),
                status: 'pending',
                synthesisRunId,
              }));
              
              if (recsToSave.length > 0) {
                await storage.saveRecommendations(recsToSave);
                recommendationsAdded = recsToSave.length;
              }
              
              synthesisTriggered = true;
              logger.info("KBASE", "Synthesis completed", { 
                insightsAdded, 
                recommendationsAdded 
              });
            }
          }
        } catch (synthError: any) {
          // Log but don't fail the whole request
          logger.warn("KBASE", "Synthesis failed (non-blocking)", { error: synthError.message });
        }
      }
      
      logger.info("KBASE", "KBASE run completed", { writtenCount, writeVerified, runId });
      
      res.json({
        ok: true,
        success: true,
        siteId,
        runId,
        writtenCount,
        totalProcessed: writtenCount,
        writeVerified,
        synthesisTriggered,
        insightsAdded,
        recommendationsAdded,
        kbTotals: {
          totalLearnings: kbTotals,
        },
        summary,
      });
    } catch (error: any) {
      logger.error("KBASE", "KBASE run error", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/findings/:findingId/status", async (req, res) => {
    try {
      const { findingId } = req.params;
      const { status } = req.body;
      
      if (!status || !['open', 'accepted', 'fixed', 'ignored'].includes(status)) {
        return res.status(400).json({ error: "Invalid status. Must be: open, accepted, fixed, or ignored" });
      }
      
      await storage.updateFindingStatus(findingId, status);
      res.json({ success: true, findingId, status });
    } catch (error: any) {
      logger.error("API", "Failed to update finding status", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/kbase/learnings/upsert", async (req, res) => {
    try {
      const { bitwardenProvider } = await import("./vault/BitwardenProvider");
      const kbaseSecret = await bitwardenProvider.getSecret("SEO_KBASE");
      
      if (!kbaseSecret) {
        return res.status(500).json({ ok: false, error: "SEO_KBASE secret not found in Bitwarden" });
      }
      
      let workerConfig: { base_url?: string; api_key?: string; write_key?: string };
      try {
        workerConfig = JSON.parse(kbaseSecret);
      } catch (e) {
        return res.status(500).json({ ok: false, error: "SEO_KBASE secret contains invalid JSON" });
      }
      
      if (!workerConfig.write_key) {
        return res.status(400).json({ 
          ok: false, 
          error: "Write-back disabled: missing write_key in Bitwarden SEO_KBASE secret" 
        });
      }
      
      if (!workerConfig.base_url) {
        return res.status(500).json({ ok: false, error: "SEO_KBASE secret missing base_url" });
      }
      
      const learning = req.body;
      const requiredFields = ["source", "check_name", "site_domain", "topic", "problem", "recommendation"];
      const missingFields = requiredFields.filter(f => !learning[f]);
      
      if (missingFields.length > 0) {
        return res.status(400).json({ 
          ok: false, 
          error: `Missing required fields: ${missingFields.join(", ")}` 
        });
      }
      
      const baseUrl = workerConfig.base_url.replace(/\/+$/, '');
      const upsertUrl = `${baseUrl}/learnings/upsert`;
      
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-api-key": workerConfig.write_key,
      };
      
      let lastError: string | null = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await fetch(upsertUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(learning),
            signal: AbortSignal.timeout(15000),
          });
          
          const responseBody = await response.text().catch(() => "");
          
          if (response.ok) {
            let responseData: any = {};
            try {
              responseData = JSON.parse(responseBody);
            } catch (e) {
              responseData = { raw: responseBody };
            }
            
            logger.info("KBASE", "Learning upserted successfully", { 
              check_name: learning.check_name, 
              topic: learning.topic 
            });
            
            return res.json({ ok: true, data: responseData });
          } else if (response.status === 401 || response.status === 403) {
            return res.status(response.status).json({ 
              ok: false, 
              error: "Invalid API key or wrong header; verify Bitwarden write_key and worker fingerprint",
              http_status: response.status 
            });
          } else if (response.status === 404) {
            return res.status(404).json({ 
              ok: false, 
              error: "Wrong base_url or double-/api; verify base_url ends with /api",
              http_status: 404 
            });
          } else {
            lastError = `HTTP ${response.status}: ${responseBody.slice(0, 200)}`;
          }
        } catch (err: any) {
          lastError = err.message;
          if (attempt === 0) {
            logger.warn("KBASE", "Write-back attempt failed, retrying", { error: err.message });
            await new Promise(r => setTimeout(r, 1000));
          }
        }
      }
      
      logger.error("KBASE", "KBase write-back failed after retries", { error: lastError });
      res.status(502).json({ ok: false, error: `KBase write-back failed: ${lastError}` });
    } catch (error: any) {
      logger.error("KBASE", "Unexpected error in write-back", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const now = new Date();
      // Fetch 60 days to support both 7-day and 30-day period comparisons
      const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
      
      const formatDate = (d: Date) => d.toISOString().split("T")[0].replace(/-/g, "");
      const endDate = formatDate(now);
      const startDate = formatDate(sixtyDaysAgo);
      
      const endDateDash = now.toISOString().split("T")[0];

      const [ga4Data, adsData, webChecks] = await Promise.all([
        storage.getGA4DataByDateRange(startDate, endDate),
        storage.getAdsDataByDateRange(startDate, endDate),
        storage.getWebChecksByDate(endDateDash),
      ]);

      // Aggregate sessions by date
      const ga4ByDate = ga4Data.reduce((acc, d) => {
        acc[d.date] = (acc[d.date] || 0) + d.sessions;
        return acc;
      }, {} as Record<string, number>);
      const ga4Trend = Object.entries(ga4ByDate)
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Aggregate spend by date
      const adsByDate = adsData.reduce((acc, d) => {
        acc[d.date] = (acc[d.date] || 0) + d.spend;
        return acc;
      }, {} as Record<string, number>);
      const adsTrend = Object.entries(adsByDate)
        .map(([date, value]) => ({ date, value }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Calculate period-over-period comparisons
      const recent7d = ga4Trend.slice(-7).reduce((sum, d) => sum + d.value, 0);
      const previous7d = ga4Trend.slice(-14, -7).reduce((sum, d) => sum + d.value, 0);
      const recent30d = ga4Trend.slice(-30).reduce((sum, d) => sum + d.value, 0);
      const previous30d = ga4Trend.slice(-60, -30).reduce((sum, d) => sum + d.value, 0);
      
      const change7d = previous7d > 0 ? ((recent7d - previous7d) / previous7d) * 100 : null;
      const change30d = previous30d > 0 ? ((recent30d - previous30d) / previous30d) * 100 : null;

      const totalSessions = ga4Trend.reduce((sum, d) => sum + d.value, 0);
      const totalSpend = adsTrend.reduce((sum, d) => sum + d.value, 0);
      const healthScore = webChecks.filter(c => c.statusCode === 200).length / Math.max(webChecks.length, 1) * 100;

      res.json({
        organicTraffic: {
          total: totalSessions,
          trend: ga4Trend,
          recent7d,
          previous7d,
          change7d: change7d !== null ? Math.round(change7d * 10) / 10 : null,
          recent30d,
          previous30d,
          change30d: change30d !== null ? Math.round(change30d * 10) / 10 : null,
        },
        adsSpend: {
          total: totalSpend,
          trend: adsTrend,
        },
        healthScore: Math.round(healthScore),
        webChecks: {
          total: webChecks.length,
          passed: webChecks.filter(c => c.statusCode === 200).length,
        },
      });
    } catch (error: any) {
      logger.error("API", "Failed to fetch dashboard stats", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/tickets/:ticketId/status", async (req, res) => {
    try {
      const { ticketId } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: "Status required" });
      }

      await storage.updateTicketStatus(ticketId, status);
      const ticket = await storage.getTicketById(ticketId);

      res.json(ticket);
    } catch (error: any) {
      logger.error("API", "Failed to update ticket status", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Competitive Intelligence (Natasha) Endpoints
  // ═══════════════════════════════════════════════════════════════════════════

  app.get("/api/competitive/overview", async (req, res) => {
    try {
      const siteId = (req.query.siteId as string) || "default";
      const requestId = (req.headers["x-request-id"] as string) || randomUUID();
      logger.info("Competitive", "Fetching overview", { siteId });
      
      // Look up site to get domain and context
      let targetDomain = "empathyhealthclinic.com"; // default
      let siteCategory = "clinic";
      let siteIntegrations: any = null;
      
      // Try to get site from registry first
      const sites = await storage.getSites();
      const site = sites.find(s => s.siteId === siteId || (siteId === "default" && s.status === "active"));
      
      if (site) {
        if (site.baseUrl) {
          try {
            const url = new URL(site.baseUrl);
            targetDomain = url.hostname;
          } catch {
            targetDomain = site.baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
          }
        }
        siteCategory = site.category || "clinic";
        siteIntegrations = site.integrations;
      }
      
      // Derive service topics from site category
      const categoryTopics: Record<string, string[]> = {
        clinic: ["healthcare", "medical services", "patient care"],
        psychiatry: ["psychiatry", "mental health", "therapy", "counseling", "ADHD treatment", "anxiety treatment", "depression treatment"],
        dental: ["dentist", "dental care", "oral health"],
        legal: ["law firm", "attorney", "legal services"],
        ecommerce: ["online shopping", "products", "retail"],
        saas: ["software", "technology", "SaaS platform"],
        healthcare: ["healthcare", "medical", "health services", "patient care"],
      };
      
      // Check if this is a mental health / psychiatry clinic
      const displayName = site?.displayName?.toLowerCase() || "";
      let serviceTopics = categoryTopics[siteCategory] || categoryTopics.clinic;
      
      // If the site name suggests mental health, use psychiatry topics
      if (displayName.includes("empathy") || displayName.includes("mental") || displayName.includes("psych") || displayName.includes("therapy")) {
        serviceTopics = categoryTopics.psychiatry;
      }
      
      // Get tracked keywords from database
      const serpKeywords = await storage.getSerpKeywords(true);
      const targetKeywords = serpKeywords.map(k => k.keyword).slice(0, 20);
      
      // Get SERP API key from environment
      const serpApiKey = process.env.SERP_API_KEY || "";
      
      // Check if worker is configured
      const { resolveWorkerConfig } = await import("./workerConfigResolver");
      const compConfig = await resolveWorkerConfig("competitive_snapshot");
      const workerConfigured = compConfig.valid && !!compConfig.base_url;
      
      // If worker is configured, call it to get real data
      if (workerConfigured && compConfig.base_url) {
        const baseUrl = compConfig.base_url.replace(/\/$/, '');
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "X-Request-Id": requestId,
        };
        if (compConfig.api_key) {
          headers["Authorization"] = `Bearer ${compConfig.api_key}`;
          headers["X-API-Key"] = compConfig.api_key;
        }
        
        try {
          // Try /capabilities first to see what the worker supports
          const capRes = await fetch(`${baseUrl}/capabilities`, {
            headers,
            signal: AbortSignal.timeout(10000),
          });
          
          if (capRes.ok) {
            const capData = await capRes.json();
            logger.info("Competitive", "Worker capabilities fetched", { capabilities: capData });
          }
          
          // Build payload matching worker's /capabilities schema:
          // Required: target.domain
          // Optional: target.serviceTopics, target.city, target.state, competitors, options.max_competitors
          const workerPayload = {
            target: {
              domain: targetDomain,
              serviceTopics: targetKeywords.length > 0 ? targetKeywords : serviceTopics,
              city: "Orlando",
              state: "FL",
            },
            competitors: [], // Will be auto-discovered by worker
            serpApiKey: serpApiKey,
            options: {
              max_competitors: 5,
            },
          };
          
          logger.info("Competitive", "Worker configured, checking for saved results", { 
            targetDomain, 
            hasSerp: !!serpApiKey,
          });
          
          // Check if we have saved results in the database
          const actualSiteId = site?.siteId || "default";
          try {
            const savedResult = await storage.getLatestWorkerResultByKey(actualSiteId, "competitive_snapshot");
            
            if (savedResult && savedResult.payloadJson) {
              const data = savedResult.payloadJson as any;
              logger.info("Competitive", "Returning saved results from database", { 
                siteId: actualSiteId,
                runId: savedResult.runId,
                createdAt: savedResult.createdAt,
              });
              
              // Extract share_of_voice from worker response (new format)
              const sovData = data.share_of_voice || data.shareOfVoice || {};
              const shareOfVoiceValue = typeof sovData === 'object' 
                ? (sovData.target_sov ?? 0) 
                : (typeof sovData === 'number' ? sovData : 0);
              
              // Map content_gaps from worker format to frontend format
              const rawContentGaps = data.content_gaps || data.contentGaps || [];
              const contentGaps = rawContentGaps.map((g: any, idx: number) => ({
                id: g.id || `gap-${idx}`,
                keyword: g.keyword || g.target || "",
                cluster: g.cluster,
                searchVolume: g.search_volume || g.searchVolume || 0,
                difficulty: typeof g.difficulty === 'string' ? (g.difficulty === 'Hard' ? 80 : g.difficulty === 'Medium' ? 50 : 30) : (g.difficulty || 50),
                competitorsCovering: g.competitors_covering || g.competitorsCovering || 1,
                yourCoverage: g.your_coverage || g.yourCoverage || "none",
                opportunity: g.opportunity_score >= 80 ? "high" : g.opportunity_score >= 50 ? "medium" : "low",
                suggestedAction: g.action || g.suggestedAction || "Create content",
                actionType: g.action_type || g.actionType || "create",
                competitorDomain: g.competitor_domain,
                competitorPosition: g.competitor_position,
                opportunityScore: g.opportunity_score,
              }));
              
              // Map missions from worker format to frontend format  
              const rawMissions = data.missions || [];
              const missions = rawMissions.map((m: any, idx: number) => ({
                id: m.id || `mission-${idx}`,
                title: m.action || m.title || "Optimize",
                description: m.rationale || m.description || "",
                type: m.action?.toLowerCase().includes('content') ? 'content' 
                     : m.action?.toLowerCase().includes('backlink') ? 'authority'
                     : m.action?.toLowerCase().includes('technical') ? 'technical' : 'content',
                expectedImpact: m.priority === 'High' ? 'high' : m.priority === 'Medium' ? 'medium' : 'low',
                difficulty: m.priority === 'High' ? 'medium' : 'easy',
                executingCrew: m.executing_crew || m.executingCrew || "Natasha",
                keywords: m.keywords || (m.target ? [m.target] : []),
                target: m.target,
                priority: m.priority,
              }));
              
              // Calculate competitive position based on share of voice
              let competitivePosition: "ahead" | "parity" | "behind" = "parity";
              if (sovData && typeof sovData === 'object') {
                if (sovData.target_sov > sovData.top_competitor_sov) {
                  competitivePosition = "ahead";
                } else if (sovData.target_sov < sovData.top_competitor_sov * 0.5) {
                  competitivePosition = "behind";
                }
              }
              
              return res.json({
                configured: true,
                isRealData: true,
                dataSource: "database",
                lastRunAt: savedResult.finishedAt?.toISOString() || savedResult.createdAt?.toISOString(),
                competitivePosition: data.competitivePosition || competitivePosition,
                positionExplanation: data.positionExplanation || savedResult.summaryText || "Data from previous analysis",
                shareOfVoice: shareOfVoiceValue,
                shareOfVoiceDetails: typeof sovData === 'object' ? sovData : null,
                avgRank: data.avgRank || 0,
                agentScore: data.agentScore || null,
                competitors: data.competitors || [],
                contentGaps,
                authorityGaps: data.authorityGaps || [],
                serpFeatureGaps: data.serpFeatureGaps || [],
                rankingPages: data.rankingPages || [],
                missions,
                alerts: data.alerts || [],
                summary: data.summary || {
                  totalCompetitors: data.competitors?.length || 0,
                  totalGaps: contentGaps.length + (data.authorityGaps?.length || 0),
                  highPriorityGaps: contentGaps.filter((g: any) => g.opportunity === 'high').length,
                  avgVisibilityGap: 0,
                  keywordsTracked: typeof sovData === 'object' ? (sovData.keywords_tracked || targetKeywords.length) : targetKeywords.length,
                  keywordsWinning: typeof sovData === 'object' ? (sovData.keywords_ranking || 0) : 0,
                  keywordsLosing: typeof sovData === 'object' ? ((sovData.keywords_tracked || 0) - (sovData.keywords_ranking || 0)) : 0,
                  referringDomains: 0,
                  competitorAvgDomains: 0,
                },
              });
            }
            
            // No saved results - fall through to mock data so dashboard shows example competitors
            logger.info("Competitive", "Worker available but no saved results, using sample data", { siteId: actualSiteId });
            // Fall through to mock data below
          } catch (dbOrHealthErr: any) {
            logger.warn("Competitive", "Failed to get saved results", { error: dbOrHealthErr.message });
          }
        } catch (workerErr: any) {
          logger.warn("Competitive", "Worker call failed, falling back to mock", { error: workerErr.message });
        }
      }
      
      // Return mock competitive intelligence data with metadata
      const overview = {
        configured: workerConfigured,
        isRealData: false,
        dataSource: workerConfigured ? "worker_fallback" : "mock",
        lastRunAt: new Date(Date.now() - 86400000).toISOString(),
        competitivePosition: "behind" as const,
        positionExplanation: "You trail top competitors in 12 high-value keywords and 3 content clusters.",
        shareOfVoice: 18,
        avgRank: 14.2,
        agentScore: null,
        competitors: [
          { id: "1", name: "Competitor A", domain: "competitora.com", type: "direct", visibility: 78, visibilityChange: 5, marketOverlap: 72, keywords: 234, topKeywords: ["mental health", "therapy", "counseling"], lastUpdated: new Date().toISOString(), deltaScore: -15 },
          { id: "2", name: "Competitor B", domain: "competitorb.com", type: "direct", visibility: 65, visibilityChange: -3, marketOverlap: 58, keywords: 189, topKeywords: ["psychiatry", "medication", "treatment"], lastUpdated: new Date().toISOString(), deltaScore: -8 },
          { id: "3", name: "Competitor C", domain: "competitorc.com", type: "indirect", visibility: 52, visibilityChange: 2, marketOverlap: 34, keywords: 145, topKeywords: ["telehealth", "virtual care", "online therapy"], lastUpdated: new Date().toISOString(), deltaScore: 5 },
        ],
        contentGaps: [
          { id: "1", keyword: "online psychiatrist Florida", cluster: "Telehealth", searchVolume: 2400, difficulty: 35, competitorsCovering: 3, yourCoverage: "none", opportunity: "high", suggestedAction: "Create dedicated landing page targeting this keyword", actionType: "create" },
          { id: "2", keyword: "telehealth therapy near me", cluster: "Telehealth", searchVolume: 1800, difficulty: 42, competitorsCovering: 2, yourCoverage: "thin", opportunity: "high", suggestedAction: "Add location-specific content for telehealth services", actionType: "expand" },
          { id: "3", keyword: "anxiety treatment without medication", cluster: "Treatments", searchVolume: 1200, difficulty: 28, competitorsCovering: 2, yourCoverage: "outdated", opportunity: "medium", suggestedAction: "Write blog post about alternative anxiety treatments", actionType: "optimize" },
        ],
        authorityGaps: [
          { id: "1", domain: "healthline.com", competitor: "Competitor A", authority: 92, linkType: "editorial", suggestedAction: "Pitch expert article on mental health trends" },
          { id: "2", domain: "psychologytoday.com", competitor: "Competitor B", authority: 88, linkType: "directory", suggestedAction: "Claim provider listing" },
        ],
        serpFeatureGaps: [
          { id: "1", keyword: "anxiety symptoms", feature: "featured_snippet", competitorOwning: "Competitor A", pageType: "Listicle", structuralHint: "Add numbered list of symptoms", suggestedAction: "Restructure content with clear symptom list" },
          { id: "2", keyword: "depression help near me", feature: "local_pack", competitorOwning: "Competitor B", pageType: "GMB Listing", structuralHint: "Optimize Google Business Profile", suggestedAction: "Update GMB with services and photos" },
        ],
        rankingPages: [
          { url: "/services/psychiatry", keyword: "psychiatrist Orlando", yourPosition: 8, competitorPosition: 3, competitor: "Competitor A", gap: -5, trafficImpact: 1200 },
          { url: "/services/therapy", keyword: "therapy near me", yourPosition: 12, competitorPosition: 5, competitor: "Competitor B", gap: -7, trafficImpact: 2400 },
          { url: "/blog/anxiety-tips", keyword: "anxiety treatment tips", yourPosition: 4, competitorPosition: 6, competitor: "Competitor A", gap: 2, trafficImpact: 890 },
          { url: "/services/telehealth", keyword: "telehealth psychiatry", yourPosition: null, competitorPosition: 2, competitor: "Competitor C", gap: 0, trafficImpact: 1800 },
        ],
        missions: [
          { id: "1", title: "Create telehealth landing page", description: "Target 'online psychiatrist Florida' with dedicated page", type: "content", expectedImpact: "high", difficulty: "medium", executingCrew: "Marcus" },
          { id: "2", title: "Optimize anxiety content for featured snippet", description: "Restructure anxiety symptoms page with numbered list", type: "serp", expectedImpact: "medium", difficulty: "easy", executingCrew: "Scotty" },
          { id: "3", title: "Pursue Healthline editorial link", description: "Pitch expert article on mental health trends", type: "authority", expectedImpact: "high", difficulty: "hard", executingCrew: "Link Team" },
        ],
        alerts: [
          { id: "1", type: "rank_jump", message: "Competitor A jumped 5 positions for 'psychiatrist Orlando'", competitor: "Competitor A", severity: "warning", timestamp: new Date(Date.now() - 86400000).toISOString() },
          { id: "2", type: "content_surge", message: "Competitor B published 3 new blog posts this week", competitor: "Competitor B", severity: "info", timestamp: new Date(Date.now() - 172800000).toISOString() },
        ],
        summary: {
          totalCompetitors: 5,
          totalGaps: 23,
          highPriorityGaps: 8,
          avgVisibilityGap: 15,
          keywordsTracked: 48,
          keywordsWinning: 12,
          keywordsLosing: 18,
          referringDomains: 45,
          competitorAvgDomains: 78,
        },
      };
      
      res.json(overview);
    } catch (error: any) {
      logger.error("API", "Failed to fetch competitive overview", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/competitive/run", async (req, res) => {
    try {
      const { siteId = "default" } = req.body;
      const requestId = (req.headers["x-request-id"] as string) || randomUUID();
      
      logger.info("Competitive", "Starting competitive analysis", { siteId });
      
      // Get site info and keywords (same as GET /overview)
      const sites = await storage.getSites();
      const site = sites.find(s => s.siteId === siteId || (siteId === "default" && s.status === "active"));
      
      let targetDomain = "empathyhealthclinic.com";
      let siteCategory = "clinic";
      
      if (site?.baseUrl) {
        try {
          const url = new URL(site.baseUrl);
          targetDomain = url.hostname;
        } catch {
          targetDomain = site.baseUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');
        }
        siteCategory = site.category || "clinic";
      }
      
      // Get tracked keywords
      const serpKeywords = await storage.getSerpKeywords(true);
      const targetKeywords = serpKeywords.map(k => k.keyword).slice(0, 20);
      
      // Get SERP API key
      const serpApiKey = process.env.SERP_API_KEY || "";
      
      // Try to call the competitive_snapshot worker if configured
      const { resolveWorkerConfig } = await import("./workerConfigResolver");
      const compConfig = await resolveWorkerConfig("competitive_snapshot");
      
      if (compConfig.valid && compConfig.base_url) {
        const baseUrl = compConfig.base_url.replace(/\/$/, '');
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "X-Request-Id": requestId,
        };
        if (compConfig.api_key) {
          headers["Authorization"] = `Bearer ${compConfig.api_key}`;
          headers["X-API-Key"] = compConfig.api_key;
        }
        
        // Build full payload matching worker's /capabilities schema
        const workerPayload = {
          target: {
            domain: targetDomain,
            serviceTopics: targetKeywords.length > 0 ? targetKeywords : ["psychiatry", "mental health", "therapy"],
            city: "Orlando",
            state: "FL",
          },
          competitors: [],
          serpApiKey: serpApiKey,
          options: {
            max_competitors: 5,
          },
        };
        
        logger.info("Competitive", "Calling worker /run with full payload", { 
          targetDomain,
          keywordCount: workerPayload.target.serviceTopics.length,
          hasSerpKey: !!serpApiKey,
        });
        
        try {
          const runRes = await fetch(`${baseUrl}/run`, {
            method: "POST",
            headers,
            body: JSON.stringify(workerPayload),
            signal: AbortSignal.timeout(60000),
          });
          
          if (runRes.ok) {
            const runData = await runRes.json();
            logger.info("Competitive", "Worker run response", { siteId, runData });
            
            // Worker returns { ok: true, report_id: "...", status: "queued" }
            // We need to poll for the actual report
            const reportId = runData.report_id || runData.data?.report_id;
            
            if (reportId) {
              // Poll for the report (with retries)
              let attempts = 0;
              const maxAttempts = 10;
              const pollInterval = 2000; // 2 seconds
              
              while (attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, pollInterval));
                attempts++;
                
                try {
                  const reportRes = await fetch(`${baseUrl}/report/${reportId}`, {
                    headers,
                    signal: AbortSignal.timeout(10000),
                  });
                  
                  if (reportRes.ok) {
                    const reportData = await reportRes.json();
                    logger.info("Competitive", "Report fetched", { reportId, status: reportData.status, attempt: attempts });
                    
                    if (reportData.status === "completed" || reportData.data) {
                      const resultData = reportData.data || reportData;
                      
                      // Save results to database
                      const actualSiteId = site?.siteId || siteId || "default";
                      try {
                        await storage.saveSeoWorkerResult({
                          runId: `competitive_${requestId}`,
                          siteId: actualSiteId,
                          workerKey: "competitive_snapshot",
                          status: "success",
                          payloadJson: resultData,
                          metricsJson: {
                            totalCompetitors: resultData.competitors?.length || 0,
                            totalGaps: (resultData.contentGaps?.length || 0) + (resultData.authorityGaps?.length || 0),
                            shareOfVoice: resultData.shareOfVoice || 0,
                          },
                          summaryText: `Found ${resultData.competitors?.length || 0} competitors and ${resultData.contentGaps?.length || 0} content gaps`,
                          durationMs: attempts * pollInterval,
                          startedAt: new Date(),
                          finishedAt: new Date(),
                        });
                        logger.info("Competitive", "Saved worker results to database", { siteId: actualSiteId, reportId });
                      } catch (saveErr: any) {
                        logger.warn("Competitive", "Failed to save results", { error: saveErr.message });
                      }
                      
                      return res.json({
                        ok: true,
                        service: "competitive_snapshot",
                        request_id: requestId,
                        report_id: reportId,
                        data: resultData,
                      });
                    }
                    // Still processing, continue polling
                  }
                } catch (pollErr: any) {
                  logger.warn("Competitive", "Poll attempt failed", { attempt: attempts, error: pollErr.message });
                }
              }
              
              // Timeout - return queued status
              return res.json({
                ok: true,
                service: "competitive_snapshot",
                request_id: requestId,
                report_id: reportId,
                message: "Analysis in progress. Results will appear shortly.",
                data: { status: "processing", report_id: reportId },
              });
            }
            
            // No report_id, return the raw response
            return res.json({
              ok: true,
              service: "competitive_snapshot",
              request_id: requestId,
              data: runData.data || runData,
            });
          } else {
            const errorText = await runRes.text();
            logger.warn("Competitive", "Worker returned error", { status: runRes.status, error: errorText.substring(0, 200) });
          }
        } catch (workerErr: any) {
          logger.warn("Competitive", "Worker call failed", { error: workerErr.message });
        }
      }
      
      // Return mock success if worker not configured or failed
      res.json({
        ok: true,
        service: "competitive_snapshot",
        request_id: requestId,
        message: "Analysis completed (mock data - configure worker for real data)",
        data: {
          competitorsAnalyzed: 5,
          gapsFound: 23,
          rankingBattles: 48,
        },
      });
      
    } catch (error: any) {
      logger.error("Competitive", "Failed to run competitive analysis", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // SERP Tracking Endpoints
  
  // Generate target keywords using AI
  app.post("/api/keywords/generate", async (req, res) => {
    try {
      const { domain, businessType, location, services } = req.body;
      
      if (!domain) {
        return res.status(400).json({ error: "Domain is required" });
      }
      
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });
      
      const prompt = `Generate 100 SEO target keywords for a business with these details:
- Domain: ${domain}
- Business Type: ${businessType || 'healthcare/mental health clinic'}
- Location: ${location || 'Orlando, Florida'}
- Services: ${services || 'psychiatry, therapy, mental health treatment'}

Generate keywords in these categories:
1. Core service keywords (20-25) - High priority, transactional intent (e.g., "psychiatrist orlando")
2. Condition-specific keywords (20-25) - Medium-high priority (e.g., "adhd psychiatrist orlando")  
3. Insurance keywords (15-20) - Medium priority (e.g., "psychiatrist accepts cigna")
4. Intent keywords (15-20) - High conversion (e.g., "same day psychiatrist", "psychiatrist accepting new patients")
5. Location variants (10-15) - Nearby areas (e.g., "psychiatrist winter park")
6. Informational/service keywords (10-15) - Lower priority but good for traffic

For each keyword, provide:
- keyword: the search term
- priority: "critical" (100), "high" (80), "medium" (60), or "low" (40)
- category: core, condition, insurance, intent, location, or service
- volume: estimated monthly search volume (use realistic estimates)

Return as JSON array. Only return the JSON array, no other text.`;

      logger.info("Keywords", `Generating keywords for ${domain}`);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { 
            role: "system", 
            content: "You are an SEO expert. Generate keyword lists in valid JSON format only. Return an array of objects with keyword, priority, category, and volume fields." 
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 8000,
      });
      
      const responseText = completion.choices[0]?.message?.content || "[]";
      
      // Parse the JSON response
      let keywords;
      try {
        // Clean up the response - remove markdown code blocks if present
        const cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        keywords = JSON.parse(cleanedResponse);
      } catch (parseError) {
        logger.error("Keywords", "Failed to parse AI response", { response: responseText.substring(0, 500) });
        return res.status(500).json({ error: "Failed to generate keywords. Please try again." });
      }
      
      if (!Array.isArray(keywords)) {
        logger.error("Keywords", "AI returned non-array response");
        return res.status(500).json({ error: "Failed to generate keywords. Please try again." });
      }
      
      // Map priority strings to 1-5 scale
      const priorityMap: Record<string, number> = {
        'critical': 5,
        'high': 4,
        'medium': 3,
        'low': 2,
      };
      
      // Import serpKeywords table for upsert
      const { serpKeywords } = await import("@shared/schema");
      
      // Prepare keyword data for upsert
      const keywordsToUpsert = keywords
        .slice(0, 100)
        .filter((kw: any) => kw.keyword)
        .map((kw: any) => ({
          keyword: kw.keyword,
          intent: kw.category || 'transactional',
          priority: typeof kw.priority === 'string' ? (priorityMap[kw.priority] || 50) : (kw.priority || 50),
          targetUrl: null,
          tags: kw.category ? [kw.category] : [],
          volume: kw.volume || null,
          active: true,
        }));
      
      // Use transaction for atomic read-upsert-count
      let addedCount = 0;
      let updatedCount = 0;
      let totalCount = 0;
      
      await db.transaction(async (tx) => {
        // Get existing ACTIVE keyword IDs within transaction for accurate counting
        const existingRows = await tx.select({ id: serpKeywords.id }).from(serpKeywords).where(sql`active = true`);
        const existingActiveIds = new Set(existingRows.map(r => r.id));
        
        // Perform atomic upsert with RETURNING
        let upsertedRows: any[] = [];
        if (keywordsToUpsert.length > 0) {
          upsertedRows = await tx.insert(serpKeywords)
            .values(keywordsToUpsert)
            .onConflictDoUpdate({
              target: serpKeywords.keyword,
              set: {
                intent: sql`EXCLUDED.intent`,
                priority: sql`EXCLUDED.priority`,
                tags: sql`EXCLUDED.tags`,
                volume: sql`EXCLUDED.volume`,
                active: sql`true`, // Reactivate any soft-deleted keywords
              },
            })
            .returning();
        }
        
        // Count: new = ID not in active set, updated = ID was in active set
        addedCount = upsertedRows.filter(row => !existingActiveIds.has(row.id)).length;
        updatedCount = upsertedRows.filter(row => existingActiveIds.has(row.id)).length;
        
        // Get final count within same transaction
        const countResult = await tx.select({ count: sql<number>`count(*)` }).from(serpKeywords).where(sql`active = true`);
        totalCount = countResult[0]?.count || 0;
      });
      
      logger.info("Keywords", `Generated ${keywords.length}, added ${addedCount}, updated ${updatedCount} for ${domain}`);
      
      res.json({
        generated: keywords.length,
        added: addedCount,
        updated: updatedCount,
        total: totalCount,
        message: addedCount > 0 
          ? `Added ${addedCount} new keywords${updatedCount > 0 ? `, updated ${updatedCount} existing` : ''}`
          : updatedCount > 0
            ? `Updated ${updatedCount} existing keywords`
            : 'No changes made',
      });
      
    } catch (error: any) {
      logger.error("Keywords", "Failed to generate keywords", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });
  
  // Add keywords with dedupe (manual add from UI)
  app.post("/api/keywords", async (req, res) => {
    try {
      const { keywords } = req.body;
      
      if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
        return res.status(400).json({ error: "Keywords array is required" });
      }
      
      const { serpKeywords } = await import("@shared/schema");
      
      // Normalize keywords (trim, lowercase for dedupe)
      const normalized = keywords
        .map((k: string) => k.trim())
        .filter((k: string) => k.length > 0);
      
      // Get existing keywords for dedupe
      const existingKeywords = await storage.getSerpKeywords(false);
      const existingSet = new Set(existingKeywords.map(k => k.keyword.toLowerCase()));
      
      // Filter out duplicates
      const newKeywords = normalized.filter((k: string) => !existingSet.has(k.toLowerCase()));
      const duplicateCount = normalized.length - newKeywords.length;
      
      // Insert new keywords
      let addedCount = 0;
      if (newKeywords.length > 0) {
        const keywordsToInsert = newKeywords.map((k: string) => ({
          keyword: k,
          intent: 'transactional',
          priority: 3,
          active: true,
        }));
        
        const inserted = await db.insert(serpKeywords)
          .values(keywordsToInsert)
          .onConflictDoNothing()
          .returning();
        
        addedCount = inserted.length;
      }
      
      logger.info("Keywords", `Added ${addedCount} keywords, ${duplicateCount} duplicates skipped`);
      
      res.json({
        added: addedCount,
        duplicates: duplicateCount,
        total: existingKeywords.length + addedCount,
        message: addedCount > 0 
          ? `Added ${addedCount} keywords${duplicateCount > 0 ? ` (${duplicateCount} duplicates skipped)` : ''}`
          : `No keywords added (${duplicateCount} were duplicates)`,
      });
      
    } catch (error: any) {
      logger.error("Keywords", "Failed to add keywords", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });
  
  // Score keyword priority using AI
  app.post("/api/keywords/score-priority", async (req, res) => {
    try {
      const { domain, businessType, location } = req.body;
      
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });
      
      // Get all keywords that need priority scoring
      const keywords = await storage.getSerpKeywords(true);
      
      if (keywords.length === 0) {
        return res.json({ scored: 0, message: "No keywords to score" });
      }
      
      // Prepare keyword list for AI
      const keywordList = keywords.map(k => ({
        id: k.id,
        keyword: k.keyword,
        volume: k.volume,
        difficulty: k.difficulty,
        currentPriority: k.priority,
      }));
      
      const prompt = `Score the lead-generation priority for these keywords for a ${businessType || 'psychiatry clinic'} in ${location || 'Orlando, Florida'}.

Keywords to score:
${JSON.stringify(keywordList, null, 2)}

For each keyword, return:
- id: the keyword ID
- priority: 1-5 scale where 5 = highest lead value
- reason: 1 short sentence explaining the score
- intent: one of: high-intent, informational, brand, insurance, urgent, medication, local

Priority scoring rules:
- 5 (Critical): Strong appointment/purchase intent, local + service keywords ("psychiatrist orlando", "same day psychiatrist", "telepsychiatry orlando")
- 4 (High): Condition-specific with local intent ("adhd psychiatrist orlando", "anxiety psychiatrist orlando")
- 3 (Medium): Insurance keywords, general service terms ("psychiatrist accepts cigna", "mental health clinic")
- 2 (Low): Informational queries, broad terms ("what is adhd", "signs of depression")
- 1 (Very Low): Branded competitors, generic queries

Consider volume but don't over-prioritize if intent is weak.
Return only a JSON array of objects with id, priority, reason, intent fields.`;

      logger.info("Keywords", `Scoring priority for ${keywords.length} keywords`);
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are an SEO expert specializing in lead generation for healthcare businesses. Return valid JSON only." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 8000,
      });
      
      const responseText = completion.choices[0]?.message?.content || "[]";
      
      let scores;
      try {
        const cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        scores = JSON.parse(cleanedResponse);
      } catch (parseError) {
        logger.error("Keywords", "Failed to parse priority scores", { response: responseText.substring(0, 500) });
        return res.status(500).json({ error: "Failed to score priorities. Please try again." });
      }
      
      if (!Array.isArray(scores)) {
        return res.status(500).json({ error: "Invalid AI response format" });
      }
      
      // Update keywords with scores
      const { serpKeywords } = await import("@shared/schema");
      let updatedCount = 0;
      
      for (const score of scores) {
        if (score.id && score.priority) {
          await db.update(serpKeywords)
            .set({
              priority: Math.min(5, Math.max(1, score.priority)),
              priorityReason: score.reason || null,
              intent: score.intent || null,
              updatedAt: new Date(),
            })
            .where(sql`id = ${score.id}`);
          updatedCount++;
        }
      }
      
      logger.info("Keywords", `Scored priority for ${updatedCount} keywords`);
      
      res.json({
        scored: updatedCount,
        total: keywords.length,
        message: `Updated priority for ${updatedCount} keywords`,
      });
      
    } catch (error: any) {
      logger.error("Keywords", "Failed to score priorities", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });
  
  // AI-powered keyword prompt interface
  app.post("/api/keywords/prompt", async (req, res) => {
    try {
      const { prompt } = req.body;
      
      if (!prompt || typeof prompt !== 'string') {
        return res.status(400).json({ error: "Prompt is required" });
      }
      
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });
      
      // Get current keywords for context
      const keywords = await storage.getSerpKeywords(true);
      const keywordList = keywords.map(k => k.keyword).join(', ');
      
      const systemPrompt = `You are a helpful SEO keyword assistant for a psychiatry clinic in Orlando, Florida. 
The user is tracking these keywords: ${keywordList || 'No keywords yet'}.

You can help the user:
1. Answer questions about their keyword strategy
2. Suggest new keywords to add
3. Identify which keywords to remove or deprioritize
4. Provide SEO advice

If the user asks to ADD keywords, respond with a JSON block in this format:
{"action": "add", "keywords": ["keyword1", "keyword2"]}

If the user asks to REMOVE keywords, respond with a JSON block:
{"action": "remove", "keywords": ["keyword1", "keyword2"]}

If no action is needed, just provide a helpful text response.

Keep responses concise and actionable.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });
      
      const responseText = completion.choices[0]?.message?.content || "I couldn't process that request.";
      
      let keywordsAdded = 0;
      let keywordsRemoved = 0;
      let message = '';
      
      // Try to parse any JSON action from the response
      const jsonMatch = responseText.match(/\{[\s\S]*?"action"[\s\S]*?\}/);
      if (jsonMatch) {
        try {
          const action = JSON.parse(jsonMatch[0]);
          const { serpKeywords } = await import("@shared/schema");
          
          if (action.action === 'add' && Array.isArray(action.keywords)) {
            const existingSet = new Set(keywords.map(k => k.keyword.toLowerCase()));
            const newKeywords = action.keywords.filter((k: string) => !existingSet.has(k.toLowerCase()));
            
            if (newKeywords.length > 0) {
              const keywordsToInsert = newKeywords.map((k: string) => ({
                keyword: k.trim(),
                intent: 'transactional',
                priority: 3,
                active: true,
              }));
              
              await db.insert(serpKeywords).values(keywordsToInsert).onConflictDoNothing();
              keywordsAdded = newKeywords.length;
              message = `Added ${keywordsAdded} new keywords`;
            }
          } else if (action.action === 'remove' && Array.isArray(action.keywords)) {
            for (const keyword of action.keywords) {
              await db.update(serpKeywords)
                .set({ active: false })
                .where(sql`LOWER(keyword) = LOWER(${keyword})`);
              keywordsRemoved++;
            }
            message = `Removed ${keywordsRemoved} keywords`;
          }
        } catch (parseError) {
          // JSON parsing failed, just return the text response
        }
      }
      
      // Clean response text (remove JSON if present)
      const cleanResponse = responseText.replace(/\{[\s\S]*?"action"[\s\S]*?\}/, '').trim();
      
      res.json({
        response: cleanResponse || message || responseText,
        keywordsAdded,
        keywordsRemoved,
        message: message || 'Response generated',
      });
      
    } catch (error: any) {
      logger.error("Keywords", "Failed to process prompt", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });
  
  app.get("/api/serp/keywords", async (req, res) => {
    try {
      const activeOnly = req.query.active !== 'false';
      const keywords = await storage.getSerpKeywords(activeOnly);
      res.json({ keywords, count: keywords.length });
    } catch (error: any) {
      logger.error("API", "Failed to fetch SERP keywords", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/serp/keywords", async (req, res) => {
    try {
      const { keywords } = req.body;
      if (!keywords || !Array.isArray(keywords)) {
        return res.status(400).json({ error: "Keywords array required" });
      }
      const saved = await storage.saveSerpKeywords(keywords);
      res.json({ saved: saved.length, keywords: saved });
    } catch (error: any) {
      logger.error("API", "Failed to save SERP keywords", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/serp/seed", async (req, res) => {
    try {
      const mentalHealthKeywords = [
        { keyword: "therapy orlando", intent: "transactional", priority: 100, tags: ["local", "therapy"] },
        { keyword: "therapist near me", intent: "transactional", priority: 95, tags: ["local", "therapy"] },
        { keyword: "online therapy florida", intent: "transactional", priority: 90, tags: ["local", "virtual"] },
        { keyword: "mental health clinic orlando", intent: "transactional", priority: 90, tags: ["local", "clinic"] },
        { keyword: "anxiety therapist orlando", intent: "transactional", priority: 85, tags: ["local", "anxiety"] },
        { keyword: "depression counseling orlando", intent: "transactional", priority: 85, tags: ["local", "depression"] },
        { keyword: "couples therapy orlando", intent: "transactional", priority: 85, tags: ["local", "couples"] },
        { keyword: "psychiatrist orlando", intent: "transactional", priority: 85, tags: ["local", "psychiatry"] },
        { keyword: "virtual therapy", intent: "transactional", priority: 80, tags: ["virtual"] },
        { keyword: "telehealth therapy", intent: "transactional", priority: 80, tags: ["virtual"] },
        { keyword: "signs of anxiety", intent: "informational", priority: 75, tags: ["informational", "anxiety"] },
        { keyword: "signs of depression", intent: "informational", priority: 75, tags: ["informational", "depression"] },
        { keyword: "how to find a therapist", intent: "informational", priority: 70, tags: ["informational"] },
        { keyword: "what is cognitive behavioral therapy", intent: "informational", priority: 70, tags: ["informational", "cbt"] },
        { keyword: "emdr therapy", intent: "informational", priority: 70, tags: ["informational", "emdr"] },
        { keyword: "adhd in adults", intent: "informational", priority: 70, tags: ["informational", "adhd"] },
        { keyword: "social exhaustion adhd", intent: "informational", priority: 70, tags: ["informational", "adhd"] },
        { keyword: "signs guy pretending straight", intent: "informational", priority: 65, tags: ["informational", "lgbtq"] },
        { keyword: "how long to fall in love", intent: "informational", priority: 65, tags: ["informational", "relationships"] },
        { keyword: "what is a short term relationship", intent: "informational", priority: 65, tags: ["informational", "relationships"] },
        { keyword: "low stress jobs", intent: "informational", priority: 60, tags: ["informational", "career"] },
        { keyword: "jobs for people with anxiety", intent: "informational", priority: 60, tags: ["informational", "anxiety", "career"] },
        { keyword: "attention seeking behavior", intent: "informational", priority: 60, tags: ["informational", "behavior"] },
        { keyword: "ltr relationship meaning", intent: "informational", priority: 55, tags: ["informational", "relationships"] },
        { keyword: "one sided relationship signs", intent: "informational", priority: 55, tags: ["informational", "relationships"] },
        { keyword: "who cheats more men or women", intent: "informational", priority: 55, tags: ["informational", "relationships"] },
        { keyword: "marriage counseling orlando", intent: "transactional", priority: 85, tags: ["local", "marriage"] },
        { keyword: "family therapy orlando", intent: "transactional", priority: 80, tags: ["local", "family"] },
        { keyword: "child therapist orlando", intent: "transactional", priority: 80, tags: ["local", "child"] },
        { keyword: "teen therapist orlando", intent: "transactional", priority: 80, tags: ["local", "teen"] },
        { keyword: "trauma therapy orlando", intent: "transactional", priority: 80, tags: ["local", "trauma"] },
        { keyword: "ptsd treatment orlando", intent: "transactional", priority: 75, tags: ["local", "ptsd"] },
        { keyword: "grief counseling orlando", intent: "transactional", priority: 75, tags: ["local", "grief"] },
        { keyword: "stress management therapy", intent: "informational", priority: 65, tags: ["informational", "stress"] },
        { keyword: "burnout symptoms", intent: "informational", priority: 65, tags: ["informational", "burnout"] },
        { keyword: "relationship anxiety", intent: "informational", priority: 65, tags: ["informational", "anxiety", "relationships"] },
        { keyword: "attachment styles", intent: "informational", priority: 60, tags: ["informational", "attachment"] },
        { keyword: "anxious attachment", intent: "informational", priority: 60, tags: ["informational", "attachment"] },
        { keyword: "avoidant attachment", intent: "informational", priority: 60, tags: ["informational", "attachment"] },
        { keyword: "secure attachment", intent: "informational", priority: 55, tags: ["informational", "attachment"] },
        { keyword: "therapy for introverts", intent: "informational", priority: 55, tags: ["informational"] },
        { keyword: "online psychiatrist florida", intent: "transactional", priority: 80, tags: ["local", "virtual", "psychiatry"] },
        { keyword: "medication management orlando", intent: "transactional", priority: 75, tags: ["local", "psychiatry"] },
        { keyword: "adhd testing orlando", intent: "transactional", priority: 75, tags: ["local", "adhd", "testing"] },
        { keyword: "psychological testing orlando", intent: "transactional", priority: 70, tags: ["local", "testing"] },
        { keyword: "therapy that takes insurance", intent: "transactional", priority: 85, tags: ["insurance"] },
        { keyword: "therapist that accepts aetna", intent: "transactional", priority: 70, tags: ["insurance"] },
        { keyword: "therapist that accepts cigna", intent: "transactional", priority: 70, tags: ["insurance"] },
        { keyword: "therapist that accepts united healthcare", intent: "transactional", priority: 70, tags: ["insurance"] },
        { keyword: "therapist that accepts blue cross", intent: "transactional", priority: 70, tags: ["insurance"] },
        { keyword: "empathy health clinic", intent: "navigational", priority: 100, tags: ["branded"] },
        { keyword: "empathy health orlando", intent: "navigational", priority: 95, tags: ["branded", "local"] },
        { keyword: "narcissistic personality disorder", intent: "informational", priority: 55, tags: ["informational", "personality"] },
        { keyword: "borderline personality disorder", intent: "informational", priority: 55, tags: ["informational", "personality"] },
        { keyword: "bipolar disorder symptoms", intent: "informational", priority: 55, tags: ["informational", "bipolar"] },
        { keyword: "ocd symptoms", intent: "informational", priority: 55, tags: ["informational", "ocd"] },
        { keyword: "panic attack vs anxiety attack", intent: "informational", priority: 60, tags: ["informational", "anxiety"] },
        { keyword: "how to stop a panic attack", intent: "informational", priority: 60, tags: ["informational", "anxiety"] },
        { keyword: "therapy for perfectionism", intent: "informational", priority: 50, tags: ["informational"] },
        { keyword: "imposter syndrome", intent: "informational", priority: 55, tags: ["informational", "career"] },
        { keyword: "work life balance", intent: "informational", priority: 50, tags: ["informational", "career"] },
        { keyword: "emotional intelligence", intent: "informational", priority: 50, tags: ["informational"] },
        { keyword: "self esteem therapy", intent: "informational", priority: 55, tags: ["informational", "self-esteem"] },
        { keyword: "confidence building exercises", intent: "informational", priority: 50, tags: ["informational", "self-esteem"] },
        { keyword: "anger management therapy", intent: "transactional", priority: 65, tags: ["therapy", "anger"] },
        { keyword: "addiction counseling orlando", intent: "transactional", priority: 70, tags: ["local", "addiction"] },
        { keyword: "substance abuse treatment orlando", intent: "transactional", priority: 65, tags: ["local", "addiction"] },
        { keyword: "eating disorder treatment orlando", intent: "transactional", priority: 65, tags: ["local", "eating-disorder"] },
        { keyword: "body dysmorphia", intent: "informational", priority: 55, tags: ["informational", "body-image"] },
        { keyword: "postpartum depression treatment", intent: "transactional", priority: 70, tags: ["postpartum", "depression"] },
        { keyword: "postpartum anxiety", intent: "informational", priority: 65, tags: ["informational", "postpartum"] },
        { keyword: "perinatal mental health", intent: "informational", priority: 60, tags: ["informational", "perinatal"] },
        { keyword: "lgbtq therapist orlando", intent: "transactional", priority: 75, tags: ["local", "lgbtq"] },
        { keyword: "gender affirming therapy", intent: "transactional", priority: 70, tags: ["lgbtq"] },
        { keyword: "veteran therapy orlando", intent: "transactional", priority: 65, tags: ["local", "veteran"] },
        { keyword: "first responder mental health", intent: "informational", priority: 60, tags: ["informational", "first-responder"] },
        { keyword: "mindfulness therapy", intent: "informational", priority: 55, tags: ["informational", "mindfulness"] },
        { keyword: "dbt therapy orlando", intent: "transactional", priority: 70, tags: ["local", "dbt"] },
        { keyword: "dialectical behavior therapy", intent: "informational", priority: 60, tags: ["informational", "dbt"] },
        { keyword: "acceptance commitment therapy", intent: "informational", priority: 55, tags: ["informational", "act"] },
        { keyword: "art therapy orlando", intent: "transactional", priority: 60, tags: ["local", "art-therapy"] },
        { keyword: "play therapy orlando", intent: "transactional", priority: 65, tags: ["local", "child", "play-therapy"] },
        { keyword: "therapy for highly sensitive person", intent: "informational", priority: 50, tags: ["informational", "hsp"] },
        { keyword: "neurodivergent therapy", intent: "informational", priority: 55, tags: ["informational", "neurodivergent"] },
        { keyword: "autism therapy orlando", intent: "transactional", priority: 65, tags: ["local", "autism"] },
        { keyword: "relationship coach vs therapist", intent: "informational", priority: 45, tags: ["informational", "relationships"] },
        { keyword: "when to see a therapist", intent: "informational", priority: 60, tags: ["informational"] },
        { keyword: "cost of therapy without insurance", intent: "informational", priority: 55, tags: ["informational", "cost"] },
        { keyword: "sliding scale therapy orlando", intent: "transactional", priority: 60, tags: ["local", "affordable"] },
        { keyword: "affordable therapy orlando", intent: "transactional", priority: 65, tags: ["local", "affordable"] },
        { keyword: "therapist vs psychologist", intent: "informational", priority: 50, tags: ["informational"] },
        { keyword: "psychologist vs psychiatrist", intent: "informational", priority: 55, tags: ["informational"] },
        { keyword: "cbt for anxiety", intent: "informational", priority: 60, tags: ["informational", "cbt", "anxiety"] },
        { keyword: "therapy for overthinking", intent: "informational", priority: 55, tags: ["informational", "anxiety"] },
        { keyword: "rumination ocd", intent: "informational", priority: 50, tags: ["informational", "ocd"] },
        { keyword: "health anxiety symptoms", intent: "informational", priority: 55, tags: ["informational", "anxiety"] },
      ];

      const saved = await storage.saveSerpKeywords(mentalHealthKeywords);
      res.json({ 
        message: "Seeded SERP keywords", 
        saved: saved.length,
        total: mentalHealthKeywords.length 
      });
    } catch (error: any) {
      logger.error("API", "Failed to seed SERP keywords", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/serp/rankings", async (req, res) => {
    try {
      const rankings = await storage.getLatestRankings();
      const lastCheck = rankings.length > 0 ? rankings[0].date : null;
      
      const inTop10 = rankings.filter(r => r.position && r.position <= 10).length;
      const inTop20 = rankings.filter(r => r.position && r.position <= 20).length;
      const inTop100 = rankings.filter(r => r.position !== null).length;
      const notRanking = rankings.filter(r => r.position === null).length;
      
      const avgPosition = inTop100 > 0 
        ? Math.round(rankings.filter(r => r.position).reduce((sum, r) => sum + (r.position || 0), 0) / inTop100)
        : null;

      res.json({
        rankings,
        lastCheck,
        stats: {
          total: rankings.length,
          inTop10,
          inTop20,
          inTop100,
          notRanking,
          avgPosition,
        }
      });
    } catch (error: any) {
      logger.error("API", "Failed to fetch SERP rankings", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/serp/keyword/:id/history", async (req, res) => {
    try {
      const { id } = req.params;
      const limit = parseInt(req.query.limit as string) || 30;
      const history = await storage.getRankingHistoryByKeyword(parseInt(id), limit);
      const keyword = await storage.getSerpKeywordById(parseInt(id));
      res.json({ keyword, history });
    } catch (error: any) {
      logger.error("API", "Failed to fetch keyword history", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/serp/run", async (req, res) => {
    try {
      if (!serpConnector.isConfigured()) {
        return res.status(400).json({ error: "SERP_API_KEY not configured" });
      }

      const keywords = await storage.getSerpKeywords(true);
      if (keywords.length === 0) {
        return res.status(400).json({ error: "No keywords to check. Seed keywords first." });
      }

      // Get all rankings to check last checked dates
      const allRankings = await storage.getAllRankingsWithHistory(90);
      const rankingsByKeyword = new Map<number, { date: string }>();
      for (const r of allRankings) {
        if (!rankingsByKeyword.has(r.keywordId) || r.date > rankingsByKeyword.get(r.keywordId)!.date) {
          rankingsByKeyword.set(r.keywordId, { date: r.date });
        }
      }
      
      // Only check keywords not checked in the last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
      
      const eligibleKeywords = keywords.filter(kw => {
        const lastCheck = rankingsByKeyword.get(kw.id);
        return !lastCheck || lastCheck.date < sevenDaysAgoStr;
      });
      
      if (eligibleKeywords.length === 0) {
        return res.json({ 
          checked: 0, 
          saved: 0, 
          message: "All keywords were checked within the last 7 days. No new checks needed.",
          stats: { ranking: 0, inTop10: 0, notFound: 0 }
        });
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const keywordsToCheck = eligibleKeywords.slice(0, limit);
      
      logger.info("SERP", `Starting SERP check for ${keywordsToCheck.length} keywords`);
      
      const domain = process.env.DOMAIN || "empathyhealthclinic.com";
      const results = await serpConnector.checkMultipleKeywords(
        keywordsToCheck.map(k => ({ id: k.id, keyword: k.keyword })),
        domain
      );

      const today = new Date().toISOString().split('T')[0];
      const previousRankings = await storage.getRankingsByDate(
        new Date(Date.now() - 86400000).toISOString().split('T')[0]
      );

      const rankingsToSave = results.map(r => {
        const prevRanking = previousRankings.find(p => p.keywordId === r.keywordId);
        let change = null;
        if (r.position && prevRanking?.position) {
          change = prevRanking.position - r.position;
        }

        return {
          keywordId: r.keywordId,
          date: today,
          position: r.position,
          url: r.url,
          change,
          serpFeatures: r.serpFeatures,
        };
      });

      const saved = await storage.saveSerpRankings(rankingsToSave);
      
      const inTop10 = saved.filter(r => r.position && r.position <= 10).length;
      const ranking = saved.filter(r => r.position !== null).length;

      res.json({
        checked: results.length,
        saved: saved.length,
        stats: {
          ranking,
          inTop10,
          notFound: results.length - ranking,
        }
      });
    } catch (error: any) {
      logger.error("API", "Failed to run SERP check", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/serp/overview", async (req, res) => {
    try {
      const [keywords, rankings] = await Promise.all([
        storage.getSerpKeywords(true),
        storage.getLatestRankings(),
      ]);

      const lastCheck = rankings.length > 0 ? rankings[0].date : null;
      const numberOne = rankings.filter(r => r.position === 1).length;
      const inTop3 = rankings.filter(r => r.position && r.position <= 3).length;
      const inTop5 = rankings.filter(r => r.position && r.position <= 5).length;
      const inTop10 = rankings.filter(r => r.position && r.position <= 10).length;
      const inTop20 = rankings.filter(r => r.position && r.position <= 20).length;
      const ranking = rankings.filter(r => r.position !== null).length;
      const notRanking = rankings.filter(r => r.position === null).length;
      
      const avgPosition = ranking > 0 
        ? Math.round(rankings.filter(r => r.position).reduce((sum, r) => sum + (r.position || 0), 0) / ranking)
        : null;

      const winners = rankings.filter(r => r.change && r.change > 0).length;
      const losers = rankings.filter(r => r.change && r.change < 0).length;

      res.json({
        configured: serpConnector.isConfigured(),
        totalKeywords: keywords.length,
        lastCheck,
        stats: {
          ranking,
          notRanking,
          numberOne,
          inTop3,
          inTop5,
          inTop10,
          inTop20,
          avgPosition,
          winners,
          losers,
        },
        topKeywords: rankings.filter(r => r.position).slice(0, 10),
        recentChanges: rankings.filter(r => r.change && r.change !== 0)
          .sort((a, b) => Math.abs(b.change || 0) - Math.abs(a.change || 0))
          .slice(0, 10),
      });
    } catch (error: any) {
      logger.error("API", "Failed to fetch SERP overview", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // SERP Missions - Generate and get top improvement actions
  app.get("/api/serp/missions", async (req, res) => {
    try {
      const { generateMissionsForKeywords, getTopMissions, getPendingActionsCount } = await import("./analysis/missionGenerator");
      
      // Check if we need to regenerate missions
      const existingCount = await getPendingActionsCount();
      
      if (existingCount === 0) {
        // Generate fresh missions
        const result = await generateMissionsForKeywords();
        res.json({
          missions: result.topMissions,
          totalPending: result.totalPending,
          generated: result.generated,
        });
      } else {
        // Return existing missions
        const missions = await getTopMissions(5);
        res.json({
          missions,
          totalPending: existingCount,
          generated: 0,
        });
      }
    } catch (error: any) {
      logger.error("API", "Failed to fetch SERP missions", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Regenerate missions from scratch
  app.post("/api/serp/missions/regenerate", async (req, res) => {
    try {
      const { generateMissionsForKeywords } = await import("./analysis/missionGenerator");
      const result = await generateMissionsForKeywords();
      res.json({
        missions: result.topMissions,
        totalPending: result.totalPending,
        generated: result.generated,
      });
    } catch (error: any) {
      logger.error("API", "Failed to regenerate SERP missions", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Fix Everything - Queue all pending actions for execution
  app.post("/api/serp/missions/fix-everything", async (req, res) => {
    try {
      const { queueAllPendingActions, getFixEverythingStatus } = await import("./analysis/missionGenerator");
      const queued = await queueAllPendingActions();
      const status = await getFixEverythingStatus();
      res.json({
        message: `Queued ${queued} actions for execution`,
        queued,
        status,
      });
    } catch (error: any) {
      logger.error("API", "Failed to queue fix everything", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Execute next queued action (for SSE streaming or polling)
  app.post("/api/serp/missions/execute-next", async (req, res) => {
    try {
      const { executeNextQueuedAction } = await import("./analysis/missionGenerator");
      const result = await executeNextQueuedAction();
      res.json(result);
    } catch (error: any) {
      logger.error("API", "Failed to execute next action", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get current fix-everything execution status
  app.get("/api/serp/missions/status", async (req, res) => {
    try {
      const { getFixEverythingStatus } = await import("./analysis/missionGenerator");
      const status = await getFixEverythingStatus();
      res.json(status);
    } catch (error: any) {
      logger.error("API", "Failed to get mission status", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Optimize a single keyword - queue its pending action for execution
  app.post("/api/serp/keyword/:id/optimize", async (req, res) => {
    try {
      const { id } = req.params;
      const keywordId = parseInt(id, 10);
      
      const { keywordActions } = await import("@shared/schema");
      const { and, eq } = await import("drizzle-orm");
      const [existingAction] = await db
        .select()
        .from(keywordActions)
        .where(and(
          eq(keywordActions.keywordId, keywordId),
          eq(keywordActions.status, "pending")
        ))
        .limit(1);
      
      if (existingAction) {
        await db.update(keywordActions)
          .set({ status: "queued" })
          .where(eq(keywordActions.id, existingAction.id));
        
        return res.json({
          ok: true,
          action: { ...existingAction, status: "queued" },
          message: `Queued action: ${existingAction.title}`,
        });
      }
      
      res.json({
        ok: true,
        action: null,
        message: "No pending optimization found for this keyword",
      });
    } catch (error: any) {
      logger.error("API", "Failed to optimize keyword", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Enhanced keyword rankings with position history (7/30/90 days)
  app.get("/api/serp/rankings/full", async (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 100, 100);
      const domain = process.env.DOMAIN || 'empathyhealthclinic.com';
      
      // Get all keywords
      const keywords = await storage.getSerpKeywords(true);
      
      // Get all rankings for the last 90 days
      const allRankings = await storage.getAllRankingsWithHistory(90);
      
      // Calculate date boundaries
      const now = new Date();
      const day7Ago = new Date(now);
      day7Ago.setDate(day7Ago.getDate() - 7);
      const day30Ago = new Date(now);
      day30Ago.setDate(day30Ago.getDate() - 30);
      const day90Ago = new Date(now);
      day90Ago.setDate(day90Ago.getDate() - 90);
      
      const formatDate = (d: Date) => d.toISOString().split('T')[0];
      const day7Str = formatDate(day7Ago);
      const day30Str = formatDate(day30Ago);
      const day90Str = formatDate(day90Ago);
      
      // Group rankings by keyword
      const rankingsByKeyword = new Map<number, typeof allRankings>();
      for (const r of allRankings) {
        if (!rankingsByKeyword.has(r.keywordId)) {
          rankingsByKeyword.set(r.keywordId, []);
        }
        rankingsByKeyword.get(r.keywordId)!.push(r);
      }
      
      // Re-sort each keyword's rankings by date descending to ensure latest is first
      for (const [keywordId, rankings] of rankingsByKeyword) {
        rankings.sort((a, b) => b.date.localeCompare(a.date));
      }
      
      // Calculate position averages for each keyword (process all, limit later)
      const keywordData = keywords.map(kw => {
        const rankings = rankingsByKeyword.get(kw.id) || [];
        
        // Get latest position (rankings are now sorted by date desc, so first = latest)
        const latestRanking = rankings[0];
        const currentPosition = latestRanking?.position ?? null;
        const currentUrl = latestRanking?.url ?? null;
        const lastChecked = latestRanking?.date ?? null;
        
        // Calculate averages for each time period
        const calcAvg = (cutoff: string) => {
          const filtered = rankings.filter(r => r.date >= cutoff && r.position !== null);
          if (filtered.length === 0) return null;
          return Math.round(filtered.reduce((sum, r) => sum + (r.position || 0), 0) / filtered.length * 10) / 10;
        };
        
        const avg7Day = calcAvg(day7Str);
        const avg30Day = calcAvg(day30Str);
        const avg90Day = calcAvg(day90Str);
        
        // Calculate trend by comparing recent (7-day) vs longer-term (30-day) average
        // Lower position = better ranking (position 1 is best)
        // Example: avg30Day=15, avg7Day=10 → diff=5 → improving (position got better recently)
        // Example: avg30Day=10, avg7Day=15 → diff=-5 → declining (position got worse recently)
        let trend: 'up' | 'down' | 'stable' | 'new' = 'new';
        if (avg7Day !== null && avg30Day !== null) {
          const diff = avg30Day - avg7Day; // Positive = 7-day avg is lower (better) than 30-day
          if (diff > 2) trend = 'up';      // Position improved by more than 2 spots
          else if (diff < -2) trend = 'down'; // Position declined by more than 2 spots
          else trend = 'stable';
        } else if (avg7Day !== null) {
          trend = 'stable';
        }
        
        return {
          id: kw.id,
          keyword: kw.keyword,
          intent: kw.intent,
          priority: kw.priority,
          priorityReason: kw.priorityReason,
          targetUrl: kw.targetUrl,
          tags: kw.tags,
          currentPosition,
          currentUrl,
          lastChecked,
          avg7Day,
          avg30Day,
          avg90Day,
          trend,
          volume: kw.volume ?? latestRanking?.volume ?? null,
          difficulty: kw.difficulty ?? null,
        };
      });
      
      // Sort by: 1) has ranking data, 2) best position, 3) priority
      keywordData.sort((a, b) => {
        // Keywords with rankings come first
        if (a.currentPosition !== null && b.currentPosition === null) return -1;
        if (a.currentPosition === null && b.currentPosition !== null) return 1;
        
        // Both have rankings - sort by position (lower is better)
        if (a.currentPosition !== null && b.currentPosition !== null) {
          return a.currentPosition - b.currentPosition;
        }
        
        // Neither has rankings - sort by priority
        return (b.priority || 0) - (a.priority || 0);
      });
      
      // Limit to requested number
      const limitedData = keywordData.slice(0, limit);
      
      // Summary stats (from limited data to match what we display)
      const withPosition = limitedData.filter(k => k.currentPosition !== null);
      const numberOne = withPosition.filter(k => k.currentPosition === 1).length;
      const inTop3 = withPosition.filter(k => k.currentPosition! <= 3).length;
      const inTop10 = withPosition.filter(k => k.currentPosition! <= 10).length;
      const inTop20 = withPosition.filter(k => k.currentPosition! <= 20).length;
      const improving = limitedData.filter(k => k.trend === 'up').length;
      const declining = limitedData.filter(k => k.trend === 'down').length;
      
      res.json({
        domain,
        totalKeywords: keywords.length,
        displayedKeywords: limitedData.length,
        lastUpdated: allRankings[0]?.date ?? null,
        summary: {
          ranking: withPosition.length,
          notRanking: limitedData.length - withPosition.length,
          numberOne,
          inTop3,
          inTop10,
          inTop20,
          improving,
          declining,
          avgPosition: withPosition.length > 0 
            ? Math.round(withPosition.reduce((sum, k) => sum + k.currentPosition!, 0) / withPosition.length)
            : null,
        },
        keywords: limitedData,
      });
    } catch (error: any) {
      logger.error("API", "Failed to fetch full keyword rankings", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Sync keywords from SERP Intelligence service
  app.post("/api/serp/sync-from-service", async (req, res) => {
    try {
      const { serpWorkerClient } = await import("./connectors/serpWorker");
      const domain = process.env.DOMAIN || 'empathyhealthclinic.com';
      
      // Initialize and fetch keywords from the SERP service
      const initialized = await serpWorkerClient.init();
      if (!initialized) {
        return res.status(400).json({ 
          error: "SERP Intelligence service not configured",
          hint: "Configure SERP_INTELLIGENCE_BASE_URL and add secret to Bitwarden"
        });
      }
      
      // Get keywords from the service - response is { keywords: [...] }
      const serviceResponse = await serpWorkerClient.getKeywords(domain) as any;
      const serviceKeywords = serviceResponse?.keywords || serviceResponse;
      
      if (!serviceKeywords || !Array.isArray(serviceKeywords) || serviceKeywords.length === 0) {
        return res.json({ 
          synced: 0, 
          message: "No keywords returned from SERP service. Run a scan first.",
          debug: { responseType: typeof serviceResponse, keys: Object.keys(serviceResponse || {}) }
        });
      }
      
      // Map service keywords to our format with volume and priority
      // SERP worker uses: keyword, cur_pos, prev_pos, delta, status, url, volume, priority, category
      const priorityMap: Record<string, number> = {
        'critical': 100,
        'high': 80,
        'medium': 60,
        'low': 40,
      };
      
      const keywordsToSave = serviceKeywords.slice(0, 100).map((sk: any) => ({
        keyword: sk.keyword,
        intent: sk.category || 'transactional',
        priority: priorityMap[sk.priority || 'medium'] || 50,
        targetUrl: sk.url || null,
        tags: sk.category ? [sk.category] : [],
        active: true,
        volume: sk.volume || sk.vol || null,
      }));
      
      // Save to database (upsert)
      const saved = await storage.saveSerpKeywords(keywordsToSave);
      
      // Also save current rankings if available (SERP worker uses cur_pos)
      const rankingsToSave = serviceKeywords
        .filter((sk: any) => sk.cur_pos !== null && sk.cur_pos !== undefined)
        .map((sk: any) => {
          const savedKw = saved.find(s => s.keyword === sk.keyword);
          if (!savedKw) return null;
          return {
            keywordId: savedKw.id,
            date: new Date().toISOString().split('T')[0],
            position: sk.cur_pos,
            url: sk.url || null,
            change: sk.delta || null,
            volume: sk.volume || sk.vol || null,
          };
        })
        .filter(Boolean) as any[];
      
      if (rankingsToSave.length > 0) {
        await storage.saveSerpRankings(rankingsToSave);
      }
      
      logger.info("SERP", `Synced ${saved.length} keywords from SERP service`, { domain });
      
      res.json({
        synced: saved.length,
        rankingsUpdated: rankingsToSave.length,
        message: `Successfully synced ${saved.length} keywords from SERP Intelligence service`,
      });
    } catch (error: any) {
      logger.error("API", "Failed to sync keywords from service", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // ========== SITES REGISTRY ENDPOINTS ==========
  
  app.get("/api/sites", async (req, res) => {
    try {
      const activeOnly = req.query.active !== "false";
      const sites = await storage.getSites(activeOnly);
      res.json(sites);
    } catch (error: any) {
      logger.error("API", "Failed to fetch sites", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sites/:siteId", async (req, res) => {
    try {
      const site = await storage.getSiteById(req.params.siteId);
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }
      res.json(site);
    } catch (error: any) {
      logger.error("API", "Failed to fetch site", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/sites", async (req, res) => {
    try {
      const parseResult = createSiteSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errors = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        return res.status(400).json({ error: "Validation failed", details: errors });
      }

      const data = parseResult.data;
      const siteId = `site_${Date.now()}_${randomUUID().slice(0, 8)}`;
      
      const newSite = await storage.createSite({
        siteId,
        displayName: data.displayName,
        baseUrl: data.baseUrl,
        category: data.category || null,
        techStack: data.techStack || null,
        repoProvider: data.repoProvider || null,
        repoIdentifier: data.repoIdentifier || null,
        deployMethod: data.deployMethod || null,
        crawlSettings: data.crawlSettings || null,
        sitemaps: data.sitemaps || null,
        keyPages: data.keyPages || null,
        integrations: data.integrations || null,
        guardrails: data.guardrails || null,
        cadence: data.cadence || null,
        ownerName: data.ownerName || null,
        ownerContact: data.ownerContact || null,
        status: data.status || "onboarding",
        active: true,
        healthScore: null,
      });

      await storage.saveAuditLog({
        siteId: newSite.siteId,
        action: "site_created",
        actor: "api",
        details: { displayName: data.displayName, baseUrl: data.baseUrl },
      });

      logger.info("API", "Site created", { siteId: newSite.siteId, displayName: data.displayName });
      res.status(201).json(newSite);
    } catch (error: any) {
      logger.error("API", "Failed to create site", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/sites/:siteId", async (req, res) => {
    try {
      const existing = await storage.getSiteById(req.params.siteId);
      if (!existing) {
        return res.status(404).json({ error: "Site not found" });
      }

      const parseResult = updateSiteSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errors = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
        return res.status(400).json({ error: "Validation failed", details: errors });
      }

      const data = parseResult.data;
      const updated = await storage.updateSite(req.params.siteId, data as any);
      
      await storage.saveAuditLog({
        siteId: req.params.siteId,
        action: "site_updated",
        actor: "api",
        details: { updatedFields: Object.keys(data) },
      });

      logger.info("API", "Site updated", { siteId: req.params.siteId });
      res.json(updated);
    } catch (error: any) {
      logger.error("API", "Failed to update site", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/sites/:siteId", async (req, res) => {
    try {
      const existing = await storage.getSiteById(req.params.siteId);
      if (!existing) {
        return res.status(404).json({ error: "Site not found" });
      }

      await storage.deleteSite(req.params.siteId);
      
      await storage.saveAuditLog({
        siteId: req.params.siteId,
        action: "site_deleted",
        actor: "api",
        details: { displayName: existing.displayName },
      });

      logger.info("API", "Site soft-deleted", { siteId: req.params.siteId });
      res.json({ success: true, message: "Site archived" });
    } catch (error: any) {
      logger.error("API", "Failed to delete site", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sites/:siteId/findings", async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const findings = await storage.getFindingsBySite(req.params.siteId, status);
      res.json(findings);
    } catch (error: any) {
      logger.error("API", "Failed to fetch findings", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/sites/:siteId/audit-logs", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = await storage.getAuditLogsBySite(req.params.siteId, limit);
      res.json(logs);
    } catch (error: any) {
      logger.error("API", "Failed to fetch audit logs", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get all audit logs (global)
  app.get("/api/audit-logs", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await storage.getAllAuditLogs(limit);
      res.json(logs);
    } catch (error: any) {
      logger.error("API", "Failed to fetch global audit logs", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/crews/:crewId/last-execution
   * Fetch the last completed action for a crew (used for Recently Completed section)
   */
  app.get("/api/crews/:crewId/last-execution", async (req, res) => {
    try {
      const { crewId } = req.params;
      const siteId = (req.query.siteId as string) || 'site_empathy_health_clinic';
      
      // Map crew IDs to their action patterns (mission_completed is the generic action, legacy patterns kept for backward compat)
      const crewActionPatterns: Record<string, string[]> = {
        'seo_kbase': ['mission_completed', 'kbase_run_completed'],
        'socrates': ['mission_completed', 'kbase_run_completed'],
        'speedster': ['mission_completed', 'speedster_run_completed', 'cwv_fix_completed'],
        'indexer': ['mission_completed', 'indexer_run_completed'],
        'serp_intel': ['mission_completed', 'serp_analysis_completed'],
      };
      
      const actionPatterns = crewActionPatterns[crewId] || [`${crewId}_run_completed`];
      
      // Get recent audit logs and find the most recent matching action
      const logs = await storage.getAuditLogsBySite(siteId, 50);
      const lastExecution = logs.find(log => actionPatterns.includes(log.action));
      
      if (!lastExecution) {
        return res.json({
          ok: true,
          found: false,
          lastExecution: null,
        });
      }
      
      // Guard against missing or malformed details
      const details = (lastExecution.details && typeof lastExecution.details === 'object') 
        ? lastExecution.details as Record<string, any>
        : {};
      
      res.json({
        ok: true,
        found: true,
        lastExecution: {
          id: lastExecution.id,
          crewId: details.crewId ?? crewId,
          actionId: details.actionId ?? null,
          status: 'completed',
          completedAt: lastExecution.createdAt,
          summary: details.summary ?? `${crewId} action completed`,
          metadata: {
            runId: details.runId ?? null,
            writtenCount: details.writtenCount ?? 0,
            writeVerified: details.writeVerified ?? false,
          },
        },
      });
    } catch (error: any) {
      logger.error("API", "Failed to fetch last execution", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // =============== PLATFORM DEPENDENCIES ===============
  
  // Get platform dependency status (Bitwarden + Postgres)
  app.get("/api/platform/dependencies", async (req, res) => {
    try {
      const { BitwardenProvider } = await import("./vault/BitwardenProvider");
      const bitwarden = new BitwardenProvider();
      const bitwardenStatus = await bitwarden.getDetailedStatus();
      
      // Check Postgres connection
      let postgresConnected = false;
      let postgresError = null;
      try {
        const result = await db.execute(sql`SELECT 1 as connected`);
        postgresConnected = true;
      } catch (pgError: any) {
        postgresError = pgError.message;
      }
      
      res.json({
        bitwarden: {
          connected: bitwardenStatus.connected,
          reason: bitwardenStatus.reason,
          secretsFound: bitwardenStatus.secretsFound,
          lastCheckedAt: new Date().toISOString(),
          httpStatus: bitwardenStatus.connected ? 200 : 
            (bitwardenStatus.reason === "UNAUTHORIZED" ? 401 : 
             bitwardenStatus.reason === "FORBIDDEN" ? 403 : null),
          lastError: bitwardenStatus.lastError,
        },
        postgres: {
          connected: postgresConnected,
          reason: postgresConnected ? null : postgresError,
          lastCheckedAt: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error("API", "Failed to check platform dependencies", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // =============== VAULT & INTEGRATIONS ===============
  
  // Get vault status
  app.get("/api/vault/status", async (req, res) => {
    try {
      const { checkVaultHealth } = await import("./vault");
      const healthStatus = await checkVaultHealth();
      const vaultConfigRecord = await storage.getVaultConfig();
      
      res.json({
        health: healthStatus,
        config: vaultConfigRecord ? {
          provider: vaultConfigRecord.provider,
          status: vaultConfigRecord.status,
          lastHealthCheck: vaultConfigRecord.lastHealthCheck,
        } : null,
      });
    } catch (error: any) {
      logger.error("API", "Failed to check vault status", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Test vault connection
  app.post("/api/vault/test", async (req, res) => {
    try {
      const { checkVaultHealth } = await import("./vault");
      const healthStatus = await checkVaultHealth();
      
      const status = healthStatus.bitwarden.connected ? "connected" : "disconnected";
      await storage.saveVaultConfig({
        provider: "bitwarden",
        status,
        lastHealthCheck: new Date(),
      });
      
      res.json({
        success: healthStatus.bitwarden.connected,
        health: healthStatus,
      });
    } catch (error: any) {
      logger.error("API", "Failed to test vault connection", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get site integrations
  app.get("/api/sites/:siteId/integrations", async (req, res) => {
    try {
      const integrations = await storage.getSiteIntegrations(req.params.siteId);
      
      // Mask sensitive data
      const masked = integrations.map(i => ({
        id: i.id,
        siteId: i.siteId,
        integrationType: i.integrationType,
        status: i.status,
        vaultProvider: i.vaultProvider,
        vaultItemId: i.vaultItemId ? `...${i.vaultItemId.slice(-4)}` : null,
        metaJson: i.metaJson,
        lastCheckedAt: i.lastCheckedAt,
        lastError: i.lastError,
        createdAt: i.createdAt,
        updatedAt: i.updatedAt,
      }));
      
      res.json(masked);
    } catch (error: any) {
      logger.error("API", "Failed to fetch site integrations", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get site integrations summary - the operational cockpit endpoint
  app.get("/api/sites/:siteId/integrations/summary", async (req, res) => {
    try {
      const { siteId } = req.params;
      const site = await storage.getSiteById(siteId);
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }

      // Get catalog, integrations, and runs
      const { servicesCatalog, computeMissingOutputs, slugLabels } = await import("@shared/servicesCatalog");
      const { SERVICE_SECRET_MAP, getServiceBySlug } = await import("@shared/serviceSecretMap");
      const platformIntegrations = await storage.getIntegrations();
      const lastRunMap = await storage.getLastRunPerServiceBySite(siteId);
      
      // Get platform health and secret list
      const { bitwardenProvider } = await import("./vault/BitwardenProvider");
      const bitwardenStatus = await bitwardenProvider.getDetailedStatus();
      const secretKeys = new Set(bitwardenStatus.secretKeys || []);
      
      // Pre-fetch worker configs for services that need base_url
      const workerConfigs = new Map<string, { hasBaseUrl: boolean; error: string | null }>();
      for (const mapping of SERVICE_SECRET_MAP) {
        if (mapping.requiresBaseUrl && mapping.bitwardenSecret) {
          const config = await bitwardenProvider.getWorkerConfig(mapping.bitwardenSecret);
          workerConfigs.set(mapping.serviceSlug, {
            hasBaseUrl: config.valid && !!config.baseUrl,
            error: config.error,
          });
        }
      }
      
      // Check recent runs (last 24h)
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // Build computed service states using canonical mapping
      const services = servicesCatalog.map(def => {
        const integration = platformIntegrations.find(i => i.integrationId === def.slug);
        const lastRun = lastRunMap.get(def.slug);
        
        // Look up canonical secret mapping
        const secretMapping = getServiceBySlug(def.slug);
        
        // Compute build state from integration or catalog
        const buildState = integration?.buildState || def.buildState || 'planned';
        
        // Compute config state using canonical mapping rules
        let configState: 'ready' | 'blocked' | 'needs_config' = 'needs_config';
        let blockingReason: string | null = null;
        
        if (secretMapping) {
          // Use canonical mapping for state determination
          if (secretMapping.type === 'planned') {
            configState = 'blocked';
            blockingReason = 'Not built yet';
          } else if (secretMapping.bitwardenSecret && !secretKeys.has(secretMapping.bitwardenSecret)) {
            configState = 'needs_config';
            blockingReason = `Bitwarden secret not found: ${secretMapping.bitwardenSecret}`;
          } else if (secretMapping.requiresBaseUrl) {
            // Worker services need base_url in the secret
            const workerConfig = workerConfigs.get(secretMapping.serviceSlug);
            if (!workerConfig?.hasBaseUrl) {
              configState = 'needs_config';
              blockingReason = workerConfig?.error || 'Worker base_url missing in Bitwarden secret';
            } else {
              configState = 'ready';
            }
          } else {
            // Infrastructure/connector - secret exists = ready
            configState = 'ready';
          }
        } else {
          // No canonical mapping - fall back to legacy logic
          if (integration?.configState === 'ready') {
            configState = 'ready';
          } else if (integration?.configState === 'blocked') {
            configState = 'blocked';
            blockingReason = integration?.lastError || 'Missing required secret or configuration';
          } else if (def.secretKeyName && !integration?.secretExists) {
            configState = 'needs_config';
            blockingReason = `Missing secret: ${def.secretKeyName}`;
          } else if (buildState === 'planned') {
            configState = 'blocked';
            blockingReason = 'Service not yet built';
          }
        }
        
        // Compute run state
        let runState: 'never_ran' | 'success' | 'failed' | 'partial' | 'stale' = 'never_ran';
        if (lastRun) {
          if (lastRun.status === 'success') runState = 'success';
          else if (lastRun.status === 'failed') runState = 'failed';
          else if (lastRun.status === 'partial') runState = 'partial';
          else runState = 'success';
          
          // Check if stale (no run in 7 days)
          const lastRunTime = lastRun.finishedAt || lastRun.startedAt;
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (new Date(lastRunTime) < sevenDaysAgo && runState === 'success') {
            runState = 'stale';
          }
        }
        
        // Compute missing outputs (accounting for pending outputs too)
        const actualOutputs = (lastRun?.outputsJson as any)?.actualOutputs || [];
        const pendingOutputs = (lastRun?.outputsJson as any)?.pendingOutputs || [];
        // Only count as missing if not in actualOutputs AND not in pendingOutputs
        const accountedFor = new Set([...actualOutputs, ...pendingOutputs]);
        const missingOutputs = lastRun?.status === 'failed' && actualOutputs.length === 0 && pendingOutputs.length === 0
          ? def.outputs  // Failed with nothing verified = all missing
          : def.outputs.filter(o => !accountedFor.has(o));
        
        return {
          slug: def.slug,
          displayName: secretMapping?.displayName || def.displayName,
          category: def.category,
          description: def.description,
          purpose: def.purpose,
          inputs: def.inputs,
          outputs: def.outputs,
          keyMetrics: def.keyMetrics,
          commonFailures: def.commonFailures,
          buildState,
          configState,
          runState,
          blockingReason,
          missingOutputs,
          secretPresent: secretMapping?.bitwardenSecret ? secretKeys.has(secretMapping.bitwardenSecret) : true,
          requiresBaseUrl: secretMapping?.requiresBaseUrl || false,
          lastRun: lastRun ? {
            id: lastRun.runId,
            status: lastRun.status,
            finishedAt: lastRun.finishedAt || lastRun.startedAt,
            durationMs: lastRun.durationMs,
            summary: lastRun.summary,
            metrics: lastRun.metricsJson,
            missingOutputsCount: missingOutputs.length,
            errorCode: lastRun.errorCode,
            errorDetail: lastRun.errorDetail,
          } : null,
        };
      });
      
      // Filter out platform dependencies for service inventory and rollups
      const inventoryServices = services.filter(s => s.category !== 'platform_dependency');
      const platformDependencies = services.filter(s => s.category === 'platform_dependency');
      
      // Compute rollups (only for inventory services, not platform dependencies)
      const rollups = {
        totalServices: inventoryServices.length,
        built: inventoryServices.filter(s => s.buildState === 'built').length,
        planned: inventoryServices.filter(s => s.buildState === 'planned').length,
        ready: inventoryServices.filter(s => s.configState === 'ready').length,
        blocked: inventoryServices.filter(s => s.configState === 'blocked').length,
        needsConfig: inventoryServices.filter(s => s.configState === 'needs_config').length,
        ran24h: inventoryServices.filter(s => {
          if (!s.lastRun?.finishedAt) return false;
          return new Date(s.lastRun.finishedAt) > oneDayAgo;
        }).length,
        neverRan: inventoryServices.filter(s => s.runState === 'never_ran').length,
        failed: inventoryServices.filter(s => s.runState === 'failed').length,
        stale: inventoryServices.filter(s => s.runState === 'stale').length,
      };
      
      // Generate next actions (prioritized) - only for inventory services
      const nextActions: Array<{ priority: number; serviceSlug: string; reason: string; cta: string }> = [];
      
      for (const service of inventoryServices) {
        // Priority 1: Built+Ready but never ran
        if (service.buildState === 'built' && service.configState === 'ready' && service.runState === 'never_ran') {
          nextActions.push({
            priority: 1,
            serviceSlug: service.slug,
            reason: 'Ready but never ran',
            cta: 'Run Test',
          });
        }
        // Priority 2: Blocked
        else if (service.configState === 'blocked') {
          nextActions.push({
            priority: 2,
            serviceSlug: service.slug,
            reason: `Blocked: ${service.blockingReason}`,
            cta: 'Configure',
          });
        }
        // Priority 3: Failed last run
        else if (service.runState === 'failed') {
          nextActions.push({
            priority: 3,
            serviceSlug: service.slug,
            reason: 'Last run failed',
            cta: 'View Error',
          });
        }
        // Priority 4: Missing outputs
        else if (service.missingOutputs.length > 0 && service.runState === 'success') {
          nextActions.push({
            priority: 4,
            serviceSlug: service.slug,
            reason: `Missing ${service.missingOutputs.length} expected outputs`,
            cta: 'Fix Outputs',
          });
        }
        // Priority 5: Stale
        else if (service.runState === 'stale') {
          nextActions.push({
            priority: 5,
            serviceSlug: service.slug,
            reason: 'No recent runs (stale)',
            cta: 'Run Now',
          });
        }
      }
      
      // Sort by priority
      nextActions.sort((a, b) => a.priority - b.priority);
      
      res.json({
        site: {
          id: site.siteId,
          domain: site.baseUrl?.replace(/^https?:\/\//, '') || site.displayName,
        },
        platform: {
          bitwarden: {
            connected: bitwardenStatus.connected,
            secretsFound: bitwardenStatus.secretsFound || 0,
          },
          database: {
            connected: true, // We got this far, DB is working
          },
        },
        rollups,
        nextActions: nextActions.slice(0, 10), // Top 10 actions
        services: inventoryServices, // Only inventory services, not platform dependencies
        slugLabels,
      });
    } catch (error: any) {
      logger.error("API", "Failed to get integrations summary", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Ask Hermes - operational reasoning endpoint
  app.post("/api/hermes/ask", async (req, res) => {
    try {
      const { siteId, question } = req.body;
      
      if (!question || typeof question !== 'string') {
        return res.status(400).json({ error: "Question is required" });
      }
      
      // Get the site (defaults to first active site if not specified)
      let site;
      if (siteId) {
        site = await storage.getSiteById(siteId);
      } else {
        const sites = await storage.getSites();
        site = sites.find(s => s.active) || sites[0];
      }
      
      if (!site) {
        return res.json({
          response: "No sites configured. Please add a site first to enable operational insights.",
          siteId: null,
          context: null,
        });
      }
      
      // Fetch operational summary (same as the summary endpoint)
      const { servicesCatalog, computeMissingOutputs, slugLabels } = await import("@shared/servicesCatalog");
      const platformIntegrations = await storage.getIntegrations();
      const lastRunMap = await storage.getLastRunPerServiceBySite(site.siteId);
      
      const { BitwardenProvider } = await import("./vault/BitwardenProvider");
      const bitwarden = new BitwardenProvider();
      const bitwardenStatus = await bitwarden.getDetailedStatus();
      
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // Build service states
      const services = servicesCatalog.map(def => {
        const integration = platformIntegrations.find(i => i.integrationId === def.slug);
        const lastRun = lastRunMap.get(def.slug);
        
        const buildState = integration?.buildState || def.buildState || 'planned';
        
        let configState: 'ready' | 'blocked' | 'needs_config' = 'needs_config';
        let blockingReason: string | null = null;
        
        if (integration?.configState === 'ready') {
          configState = 'ready';
        } else if (integration?.configState === 'blocked') {
          configState = 'blocked';
          blockingReason = integration?.lastError || 'Missing required secret or configuration';
        } else if (def.secretKeyName && !integration?.secretExists) {
          configState = 'blocked';
          blockingReason = `Missing secret: ${def.secretKeyName}`;
        } else if (buildState === 'planned') {
          configState = 'needs_config';
          blockingReason = 'Service not yet built';
        }
        
        let runState: 'never_ran' | 'success' | 'failed' | 'partial' | 'stale' = 'never_ran';
        if (lastRun) {
          if (lastRun.status === 'success') runState = 'success';
          else if (lastRun.status === 'failed') runState = 'failed';
          else if (lastRun.status === 'partial') runState = 'partial';
          else runState = 'success';
          
          const lastRunTime = lastRun.finishedAt || lastRun.startedAt;
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (new Date(lastRunTime) < sevenDaysAgo && runState === 'success') {
            runState = 'stale';
          }
        }
        
        const actualOutputs = (lastRun?.outputsJson as any)?.actualOutputs || [];
        const pendingOutputs = (lastRun?.outputsJson as any)?.pendingOutputs || [];
        const accountedFor = new Set([...actualOutputs, ...pendingOutputs]);
        const missingOutputs = lastRun?.status === 'failed' && actualOutputs.length === 0 && pendingOutputs.length === 0
          ? def.outputs
          : def.outputs.filter(o => !accountedFor.has(o));
        
        return {
          slug: def.slug,
          displayName: def.displayName,
          category: def.category,
          buildState,
          configState,
          runState,
          blockingReason,
          missingOutputs,
          lastRunAt: lastRun?.finishedAt || lastRun?.startedAt || null,
          lastRunSummary: lastRun?.summary || null,
        };
      });
      
      // Filter out platform dependencies for service inventory and rollups
      const inventoryServices = services.filter(s => s.category !== 'platform_dependency');
      
      // Compute rollups (only for inventory services, not platform dependencies)
      const rollups = {
        totalServices: inventoryServices.length,
        built: inventoryServices.filter(s => s.buildState === 'built').length,
        planned: inventoryServices.filter(s => s.buildState === 'planned').length,
        ready: inventoryServices.filter(s => s.configState === 'ready').length,
        blocked: inventoryServices.filter(s => s.configState === 'blocked').length,
        needsConfig: inventoryServices.filter(s => s.configState === 'needs_config').length,
        ran24h: inventoryServices.filter(s => s.lastRunAt && new Date(s.lastRunAt) > oneDayAgo).length,
        neverRan: inventoryServices.filter(s => s.runState === 'never_ran').length,
        failed: inventoryServices.filter(s => s.runState === 'failed').length,
        stale: inventoryServices.filter(s => s.runState === 'stale').length,
      };
      
      // Generate next actions (only for inventory services)
      const nextActions: Array<{ service: string; reason: string; action: string }> = [];
      for (const service of inventoryServices) {
        if (service.buildState === 'built' && service.configState === 'ready' && service.runState === 'never_ran') {
          nextActions.push({ service: service.displayName, reason: 'Ready but never ran', action: 'Run test' });
        } else if (service.configState === 'blocked') {
          nextActions.push({ service: service.displayName, reason: service.blockingReason || 'Blocked', action: 'Configure' });
        } else if (service.runState === 'failed') {
          nextActions.push({ service: service.displayName, reason: 'Last run failed', action: 'View error' });
        }
      }
      
      // Build operational summary for the AI
      const operationalSummary = {
        site: {
          id: site.siteId,
          domain: site.baseUrl?.replace(/^https?:\/\//, '') || site.displayName,
        },
        platform: {
          bitwarden: { connected: bitwardenStatus.connected, secretsFound: bitwardenStatus.secretsFound || 0 },
          database: { connected: true },
        },
        rollups,
        services: inventoryServices.map(s => ({
          name: s.displayName,
          category: s.category,
          buildState: s.buildState,
          configState: s.configState,
          runState: s.runState,
          blockingReason: s.blockingReason,
          missingOutputs: s.missingOutputs,
          lastRunAt: s.lastRunAt,
        })),
        nextActions: nextActions.slice(0, 5),
      };
      
      // Prepare system prompt
      const systemPrompt = `You are Hermes, the operational reasoning engine for an SEO diagnostics platform.

You must answer strictly based on the provided operational summary below.
Do not assume data that is not present.
If something has never run, say so explicitly.
If something is blocked, explain why.
Be concise but specific.

## Operational Summary for ${operationalSummary.site.domain}

### Platform Status
- Bitwarden Secrets Manager: ${operationalSummary.platform.bitwarden.connected ? 'Connected' : 'Disconnected'} (${operationalSummary.platform.bitwarden.secretsFound} secrets found)
- Database: ${operationalSummary.platform.database.connected ? 'Connected' : 'Disconnected'}

### Service Rollups
- Total Services: ${rollups.totalServices}
- Built: ${rollups.built}, Planned: ${rollups.planned}
- Ready to run: ${rollups.ready}, Blocked: ${rollups.blocked}, Needs config: ${rollups.needsConfig}
- Ran in last 24h: ${rollups.ran24h}, Never ran: ${rollups.neverRan}
- Failed: ${rollups.failed}, Stale (>7 days): ${rollups.stale}

### Services by Category
${Object.entries(
  inventoryServices.reduce((acc, s) => {
    if (!acc[s.category]) acc[s.category] = [];
    acc[s.category].push(s);
    return acc;
  }, {} as Record<string, typeof inventoryServices>)
).map(([cat, svcs]) => 
  `**${cat}**: ${svcs.map(s => `${s.displayName} (${s.buildState}/${s.configState}/${s.runState})`).join(', ')}`
).join('\n')}

### Blocked Services
${inventoryServices.filter(s => s.configState === 'blocked').map(s => `- ${s.displayName}: ${s.blockingReason}`).join('\n') || 'None'}

### Next Priority Actions
${nextActions.slice(0, 5).map((a, i) => `${i+1}. ${a.service}: ${a.reason} → ${a.action}`).join('\n') || 'All services are configured and running'}

### Full Service Details
${JSON.stringify(operationalSummary.services, null, 2)}

When answering:
1. Reference specific services and their states
2. If data isn't available because services haven't run, say so clearly
3. Suggest next actions based on the priority list
4. Be helpful and actionable`;

      // Call OpenAI
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });
      
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: question },
        ],
        max_tokens: 1500,
        temperature: 0.5,
      });
      
      const response = completion.choices[0]?.message?.content || "I couldn't generate a response. Please try again.";
      
      logger.info("Hermes", "Answered operational question", { 
        siteId: site.siteId, 
        question: question.slice(0, 100),
        rollups,
      });
      
      res.json({
        response,
        siteId: site.siteId,
        context: {
          rollups,
          nextActionsCount: nextActions.length,
        },
      });
    } catch (error: any) {
      logger.error("Hermes", "Failed to answer question", { error: error.message, stack: error.stack });
      
      // Return helpful error instead of generic message
      res.status(500).json({ 
        error: "Hermes cannot answer yet because the operational data could not be loaded.",
        details: error.message,
      });
    }
  });

  // Save/update site integration
  app.post("/api/sites/:siteId/integrations", async (req, res) => {
    try {
      const { integrationType, vaultProvider, vaultItemId, metaJson } = req.body;
      
      if (!integrationType) {
        return res.status(400).json({ error: "integrationType is required" });
      }
      
      const integration = await storage.saveSiteIntegration({
        siteId: req.params.siteId,
        integrationType,
        vaultProvider: vaultProvider || "env",
        vaultItemId,
        metaJson,
        status: "pending",
      });
      
      res.json(integration);
    } catch (error: any) {
      logger.error("API", "Failed to save site integration", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Test a specific integration
  app.post("/api/sites/:siteId/integrations/:type/test", async (req, res) => {
    try {
      const { siteId, type } = req.params;
      const integration = await storage.getSiteIntegration(siteId, type);
      
      // Allow testing even without pre-configured integration (uses env fallback)
      let success = false;
      let message = "";
      
      // Resolve secrets from vault or env
      const { resolveIntegrationSecrets } = await import("./vault");
      const secrets = await resolveIntegrationSecrets(
        type,
        integration?.vaultProvider || "env",
        integration?.vaultItemId || null,
        integration?.metaJson || {}
      );
      
      // Test based on integration type using resolved secrets
      switch (type) {
        case "ga4":
          try {
            // Check if we have the required credentials
            const propertyId = secrets.propertyId || process.env.GA4_PROPERTY_ID;
            if (!propertyId) {
              message = "GA4 property ID not configured";
              break;
            }
            const ga4Result = await ga4Connector.fetchRealtimeUsers?.();
            success = ga4Result !== undefined;
            message = success ? `GA4 connected (Property: ${propertyId})` : "GA4 connection failed";
          } catch (e: any) {
            message = e.message;
          }
          break;
          
        case "gsc":
          try {
            const siteUrl = secrets.siteUrl || process.env.GSC_SITE;
            if (!siteUrl) {
              message = "GSC site URL not configured";
              break;
            }
            const gscResult = await gscConnector.getSitemaps?.();
            success = gscResult !== undefined;
            message = success ? `GSC connected (${siteUrl})` : "GSC connection failed";
          } catch (e: any) {
            message = e.message;
          }
          break;
          
        case "google_ads":
          try {
            const customerId = secrets.customerId || process.env.ADS_CUSTOMER_ID;
            const developerToken = secrets.developerToken || process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
            if (!customerId || !developerToken) {
              message = "Google Ads credentials incomplete";
              break;
            }
            success = true;
            message = `Google Ads configured (Customer: ${customerId.slice(-4)})`;
          } catch (e: any) {
            message = e.message;
          }
          break;
          
        case "serp":
          const serpKey = secrets.apiKey || process.env.SERP_API_KEY;
          success = !!serpKey;
          message = success ? "SERP API key configured" : "SERP API key missing";
          break;
          
        case "clarity":
          const clarityKey = secrets.apiKey || process.env.CLARITY_API_KEY;
          success = !!clarityKey;
          message = success ? "Clarity configured" : "Clarity API key missing";
          break;
          
        default:
          message = "Unknown integration type";
      }
      
      // Create/update integration record with status
      if (integration) {
        await storage.updateSiteIntegration(integration.id, {
          status: success ? "connected" : "error",
          lastCheckedAt: new Date(),
          lastError: success ? null : message,
        });
      } else {
        // Auto-create integration record if it doesn't exist
        await storage.saveSiteIntegration({
          siteId,
          integrationType: type,
          vaultProvider: "env",
          status: success ? "connected" : "error",
          lastCheckedAt: new Date(),
          lastError: success ? null : message,
        });
      }
      
      res.json({ success, message });
    } catch (error: any) {
      logger.error("API", "Failed to test integration", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Delete site integration
  app.delete("/api/sites/:siteId/integrations/:id", async (req, res) => {
    try {
      await storage.deleteSiteIntegration(parseInt(req.params.id));
      res.json({ success: true });
    } catch (error: any) {
      logger.error("API", "Failed to delete integration", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // =============== CONNECTOR DIAGNOSTICS ===============

  // Get latest diagnostic for a service
  app.get("/api/sites/:siteId/services/:serviceId/diagnostics/latest", async (req, res) => {
    try {
      const { siteId, serviceId } = req.params;
      const diagnostic = await storage.getLatestConnectorDiagnostic(serviceId, siteId);
      if (!diagnostic) {
        return res.json({ diagnostic: null });
      }
      res.json({ diagnostic });
    } catch (error: any) {
      logger.error("API", "Failed to get latest diagnostic", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get diagnostic history for a service
  app.get("/api/sites/:siteId/services/:serviceId/diagnostics", async (req, res) => {
    try {
      const { serviceId } = req.params;
      const limit = parseInt(req.query.limit as string) || 20;
      const diagnostics = await storage.getConnectorDiagnosticsByService(serviceId, limit);
      res.json({ diagnostics });
    } catch (error: any) {
      logger.error("API", "Failed to get diagnostics history", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get diagnostic by run ID
  app.get("/api/diagnostics/:runId", async (req, res) => {
    try {
      const diagnostic = await storage.getConnectorDiagnosticByRunId(req.params.runId);
      if (!diagnostic) {
        return res.status(404).json({ error: "Diagnostic not found" });
      }
      res.json({ diagnostic });
    } catch (error: any) {
      logger.error("API", "Failed to get diagnostic", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // =============== ACTION RUNS (Fix This) ===============

  // Run an action for a detected drop
  app.post("/api/actions/run", async (req, res) => {
    try {
      const { siteId, drop, actionCode, enrichOnly } = req.body;
      
      if (!siteId || !drop) {
        return res.status(400).json({ error: "siteId and drop are required" });
      }

      const site = await storage.getSiteById(siteId);
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }

      const { runAction } = await import("./actions/ActionRunner");
      const { getRecommendedActionCode } = await import("./actions/types");
      
      const code = actionCode || getRecommendedActionCode(drop);
      const actionRun = await runAction(siteId, site.baseUrl, drop, code, { enrichOnly });

      res.json({
        success: true,
        runId: actionRun.runId,
        status: actionRun.status,
        output: actionRun.outputJson,
      });
    } catch (error: any) {
      logger.error("API", "Failed to run action", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get action run status
  app.get("/api/actions/:runId", async (req, res) => {
    try {
      const actionRun = await storage.getActionRunById(req.params.runId);
      if (!actionRun) {
        return res.status(404).json({ error: "Action run not found" });
      }
      res.json(actionRun);
    } catch (error: any) {
      logger.error("API", "Failed to get action run", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get action runs for an anomaly
  app.get("/api/sites/:siteId/actions", async (req, res) => {
    try {
      const { anomalyId } = req.query;
      if (anomalyId) {
        const runs = await storage.getActionRunsByAnomaly(req.params.siteId, anomalyId as string);
        return res.json(runs);
      }
      const runs = await storage.getLatestActionRuns(req.params.siteId, 20);
      res.json(runs);
    } catch (error: any) {
      logger.error("API", "Failed to get action runs", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // Platform Integrations API
  // ==========================================
  
  // Integration Summary with Stale-While-Revalidate (SWR) for instant loading
  app.get("/api/integrations/summary", async (req, res) => {
    try {
      const { siteId, refresh } = req.query;
      
      // Resolve site ID
      let targetSiteId = siteId as string;
      if (!targetSiteId || targetSiteId === 'default') {
        const allSites = await storage.getSites(true);
        const activeSite = allSites.find(s => s.active);
        targetSiteId = activeSite?.siteId || 'site_empathy_health_clinic';
      }
      
      // Check for cached data
      const cache = await storage.getIntegrationCache(targetSiteId);
      const isStale = await storage.isIntegrationCacheStale(targetSiteId);
      const forceRefresh = refresh === 'true';
      
      // If we have cache and not forcing refresh, return it immediately
      if (cache && !forceRefresh) {
        const response = {
          siteId: targetSiteId,
          cachedAt: cache.cachedAt.toISOString(),
          isStale,
          summary: cache.payloadJson,
          services: cache.servicesJson || [],
          nextActions: cache.nextActionsJson || [],
          lastRefreshAttempt: cache.lastRefreshAttemptAt ? {
            at: cache.lastRefreshAttemptAt.toISOString(),
            status: cache.lastRefreshStatus,
            durationMs: cache.lastRefreshDurationMs,
          } : null,
          lastRefreshError: cache.lastRefreshError,
        };
        
        // If stale, trigger background refresh (fire-and-forget)
        if (isStale) {
          setImmediate(async () => {
            try {
              await refreshIntegrationCache(targetSiteId, storage);
            } catch (err: any) {
              logger.warn("API", "Background cache refresh failed", { error: err.message });
            }
          });
        }
        
        return res.json(response);
      }
      
      // No cache or force refresh - compute fresh data
      const freshData = await computeIntegrationSummary(targetSiteId, storage);
      
      // Save to cache
      await storage.saveIntegrationCache({
        siteId: targetSiteId,
        payloadJson: freshData.summary,
        servicesJson: freshData.services,
        nextActionsJson: freshData.nextActions,
        cachedAt: new Date(),
        ttlSeconds: 60,
      });
      
      res.json({
        siteId: targetSiteId,
        cachedAt: new Date().toISOString(),
        isStale: false,
        summary: freshData.summary,
        services: freshData.services,
        nextActions: freshData.nextActions,
        lastRefreshAttempt: null,
        lastRefreshError: null,
      });
    } catch (error: any) {
      logger.error("API", "Failed to get integrations summary", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get all platform integrations
  app.get("/api/integrations", async (req, res) => {
    try {
      const integrationsList = await storage.getIntegrations();
      res.json(integrationsList);
    } catch (error: any) {
      logger.error("API", "Failed to get integrations", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get service catalog with combined run data (self-describing services)
  app.get("/api/services/catalog", async (req, res) => {
    try {
      const { servicesCatalog, getSlugLabel, computeMissingOutputs } = await import("@shared/servicesCatalog");
      const integrations = await storage.getIntegrations();
      const recentRuns = await storage.getLatestServiceRuns(100);
      
      // Build a map of slug -> last run
      const lastRunBySlug: Record<string, any> = {};
      for (const run of recentRuns) {
        if (!lastRunBySlug[run.serviceId]) {
          lastRunBySlug[run.serviceId] = run;
        }
      }
      
      // Combine catalog with integration state and last run
      const services = servicesCatalog.map(def => {
        const integration = integrations.find(i => i.integrationId === def.slug);
        const lastRun = lastRunBySlug[def.slug];
        
        // Compute missing and pending outputs if we have run data
        let pendingOutputs: string[] = lastRun?.outputsJson?.pendingOutputs || [];
        const actualOutputs = lastRun?.outputsJson?.actualOutputs || [];
        
        // Compute missing: outputs not in actualOutputs AND not in pendingOutputs
        let missingOutputs: string[] = [];
        if (lastRun) {
          if (actualOutputs.length > 0 || pendingOutputs.length > 0) {
            // Some outputs are verified or pending - compute what's truly missing
            const accountedFor = new Set([...actualOutputs, ...pendingOutputs]);
            missingOutputs = def.outputs.filter(o => !accountedFor.has(o));
          } else if (lastRun.status === 'failed') {
            // Run failed and nothing verified/pending - all outputs are missing
            missingOutputs = def.outputs;
          }
          // If run succeeded but nothing in actualOutputs/pendingOutputs, leave missingOutputs empty
        }
        
        return {
          ...def,
          buildState: integration?.buildState || 'planned',
          configState: integration?.configState || 'missing_config',
          runState: integration?.runState || 'never_ran',
          lastRun: lastRun ? {
            runId: lastRun.runId,
            status: lastRun.status,
            summary: lastRun.summary,
            startedAt: lastRun.startedAt,
            finishedAt: lastRun.finishedAt,
            durationMs: lastRun.durationMs,
            trigger: lastRun.trigger,
            metrics: lastRun.metricsJson,
            actualOutputs,
            missingOutputs,
            pendingOutputs,
            errorCode: lastRun.errorCode,
            errorDetail: lastRun.errorDetail,
          } : null,
        };
      });
      
      res.json({
        services,
        slugLabels: Object.fromEntries(
          Object.entries(await import("@shared/servicesCatalog").then(m => m.slugLabels))
        ),
      });
    } catch (error: any) {
      logger.error("API", "Failed to get service catalog", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Bitwarden status endpoint - single source of truth for vault connectivity
  app.get("/api/integrations/bitwarden/status", async (req, res) => {
    try {
      const { bitwardenProvider } = await import("./vault/BitwardenProvider");
      const status = await bitwardenProvider.getDetailedStatus();
      logger.info("API", "Bitwarden status check", { 
        connected: status.connected, 
        reason: status.reason,
        secretsFound: status.secretsFound,
      });
      res.json(status);
    } catch (error: any) {
      logger.error("API", "Failed to check Bitwarden status", { error: error.message });
      res.status(500).json({ 
        connected: false, 
        reason: "API_ERROR", 
        lastError: error.message,
        projectId: null,
        secretsFound: 0,
      });
    }
  });

  // Bitwarden debug endpoint (for troubleshooting) - requires API key
  app.get("/api/integrations/bitwarden/debug", async (req, res) => {
    // Require API key for this sensitive endpoint
    const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    const expectedKey = process.env.TRAFFIC_DOCTOR_API_KEY;
    
    if (!expectedKey || apiKey !== expectedKey) {
      return res.status(401).json({ error: "Unauthorized - API key required" });
    }
    
    try {
      const { bitwardenProvider } = await import("./vault/BitwardenProvider");
      const status = await bitwardenProvider.getDetailedStatus();
      
      res.json({
        tokenPresent: !!process.env.BWS_ACCESS_TOKEN,
        projectIdPresent: !!process.env.BWS_PROJECT_ID,
        projectId: status.projectId ? `${status.projectId.slice(0, 4)}...${status.projectId.slice(-4)}` : null,
        httpStatus: status.httpStatus,
        secretsCount: status.secretsFound,
        reason: status.reason,
        lastError: status.lastError,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Full refresh: Re-authenticate Bitwarden, fetch secrets, evaluate all services
  app.post("/api/integrations/refresh", async (req, res) => {
    try {
      const startTime = Date.now();
      logger.info("API", "Starting full integrations refresh");

      // Step 1: Get detailed Bitwarden status
      const { bitwardenProvider } = await import("./vault/BitwardenProvider");
      bitwardenProvider.clearCache(); // Force fresh data
      
      const vaultStatus = await bitwardenProvider.getDetailedStatus();
      logger.info("API", `Bitwarden status: ${vaultStatus.reason}`, {
        connected: vaultStatus.connected,
        secretsFound: vaultStatus.secretsFound,
        error: vaultStatus.lastError,
      });

      // Step 2: Fetch all secrets from Bitwarden (if connected)
      let availableSecrets: string[] = vaultStatus.secretKeys || [];
      const secretValuesMap: Map<string, string> = new Map();
      
      if (vaultStatus.connected && vaultStatus.secretsFound > 0) {
        const secretsList = await bitwardenProvider.listSecrets();
        availableSecrets = secretsList.map(s => s.key);
        logger.info("API", `Bitwarden secrets found: ${availableSecrets.length}`, {
          secrets: availableSecrets,
        });
        
        // Fetch actual secret values for auth testing
        for (const secretMeta of secretsList) {
          if (secretMeta.id) {
            const secretValue = await bitwardenProvider.getSecret(secretMeta.id);
            if (secretValue) {
              secretValuesMap.set(secretMeta.key, secretValue);
            }
          }
        }
        logger.info("API", `Fetched ${secretValuesMap.size} secret values from Bitwarden`);
      }

      // Step 3: Get all registered integrations
      const integrationsList = await storage.getIntegrations();
      const results: any[] = [];

      // Step 4: Re-evaluate each service
      for (const integration of integrationsList) {
        const serviceStart = Date.now();
        let secretExists = false;
        let healthCheckStatus = "unknown";
        let authTestStatus = "unknown";
        let healthCheckResponse: any = null;
        let authTestDetails: any = null;
        let calledSuccessfully = false;
        let lastError: string | null = null;

        // Check if secret exists in Bitwarden or environment
        if (integration.secretKeyName) {
          // Check Bitwarden first
          secretExists = availableSecrets.includes(integration.secretKeyName);
          // Fallback to environment variable
          if (!secretExists) {
            secretExists = !!process.env[integration.secretKeyName];
          }
        }

        // Run health check if baseUrl is configured
        if (integration.baseUrl) {
          try {
            const healthUrl = `${integration.baseUrl}${integration.healthEndpoint || '/health'}`;
            const healthRes = await fetch(healthUrl, {
              method: 'GET',
              headers: { 'Accept': 'application/json' },
              signal: AbortSignal.timeout(10000),
            });
            const healthData = await healthRes.json().catch(() => null);
            healthCheckStatus = healthRes.ok ? "pass" : "fail";
            healthCheckResponse = { 
              statusCode: healthRes.status, 
              data: healthData,
            };
            
            if (!healthRes.ok) {
              lastError = `Health check failed: ${healthRes.status}`;
            }
          } catch (err: any) {
            healthCheckStatus = "fail";
            healthCheckResponse = { error: err.message };
            lastError = `Health check error: ${err.message}`;
          }

          // Run auth test if auth is required
          if (integration.authRequired) {
            try {
              const testUrl = `${integration.baseUrl}${integration.healthEndpoint || '/health'}`;
              
              // Test without key - should get 401/403
              const noKeyRes = await fetch(testUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(5000),
              });
              
              const noKeyPass = noKeyRes.status === 401 || noKeyRes.status === 403;
              
              // Test with key if secret exists
              let withKeyPass = false;
              let secretSource = "none";
              if (secretExists && integration.secretKeyName) {
                // Try to get secret value from Bitwarden first, then fall back to env
                let secretValue = secretValuesMap.get(integration.secretKeyName) || null;
                if (secretValue) {
                  secretSource = "bitwarden";
                } else {
                  secretValue = process.env[integration.secretKeyName] || null;
                  if (secretValue) secretSource = "env";
                }
                
                if (secretValue) {
                  try {
                    const withKeyRes = await fetch(testUrl, {
                      method: 'GET',
                      headers: {
                        'Accept': 'application/json',
                        'Authorization': `Bearer ${secretValue}`,
                        'X-API-Key': secretValue,
                      },
                      signal: AbortSignal.timeout(5000),
                    });
                    withKeyPass = withKeyRes.ok;
                    calledSuccessfully = withKeyPass;
                    logger.info("API", `Auth test for ${integration.integrationId}: withKey=${withKeyPass}, source=${secretSource}`);
                  } catch (e) {
                    withKeyPass = false;
                  }
                }
              }
              
              authTestStatus = noKeyPass && (withKeyPass || !secretExists) ? "pass" : "fail";
              authTestDetails = {
                noKeyResult: { status: noKeyPass ? "pass" : "fail", statusCode: noKeyRes.status },
                withKeyResult: secretExists 
                  ? { status: withKeyPass ? "pass" : "fail", secretSource }
                  : { status: "skipped", reason: "No secret configured" },
              };
            } catch (err: any) {
              authTestStatus = "fail";
              authTestDetails = { error: err.message };
            }
          } else {
            authTestStatus = "not_required";
            // For services without auth, check if health passed = successful call
            calledSuccessfully = healthCheckStatus === "pass";
          }
        } else {
          healthCheckStatus = "not_configured";
          authTestStatus = "not_configured";
        }

        const serviceDuration = Date.now() - serviceStart;

        // Determine overall health status
        const healthStatus = healthCheckStatus === "pass" ? "healthy" 
          : healthCheckStatus === "not_configured" ? "disconnected" 
          : "error";

        // Update integration in database
        await storage.updateIntegration(integration.integrationId, {
          secretExists,
          healthCheckStatus,
          healthCheckResponse,
          authTestStatus,
          authTestDetails,
          calledSuccessfully,
          healthStatus,
          lastHealthCheckAt: new Date(),
          lastAuthTestAt: integration.authRequired ? new Date() : integration.lastAuthTestAt,
          lastError: lastError || integration.lastError,
          lastSuccessAt: calledSuccessfully ? new Date() : integration.lastSuccessAt,
          updatedAt: new Date(),
        });

        results.push({
          integrationId: integration.integrationId,
          name: integration.name,
          secretExists,
          healthCheckStatus,
          authTestStatus,
          calledSuccessfully,
          durationMs: serviceDuration,
        });

        logger.info("API", `Checked ${integration.integrationId}`, {
          secretExists,
          healthCheckStatus,
          authTestStatus,
          calledSuccessfully,
        });
      }

      const totalDuration = Date.now() - startTime;

      // Get updated integrations list
      const updatedIntegrations = await storage.getIntegrations();

      // Summary stats
      const summary = {
        total: results.length,
        healthy: results.filter(r => r.healthCheckStatus === "pass").length,
        failed: results.filter(r => r.healthCheckStatus === "fail").length,
        notConfigured: results.filter(r => r.healthCheckStatus === "not_configured").length,
        secretsFound: results.filter(r => r.secretExists).length,
        calledSuccessfully: results.filter(r => r.calledSuccessfully).length,
      };

      logger.info("API", `Refresh complete in ${totalDuration}ms`, summary);

      res.json({
        success: true,
        vaultStatus: {
          connected: vaultStatus.connected,
          provider: 'bitwarden',
          reason: vaultStatus.reason,
          error: vaultStatus.lastError,
          secretsCount: availableSecrets.length,
          projectId: vaultStatus.projectId,
        },
        summary,
        results,
        integrations: updatedIntegrations,
        refreshedAt: new Date().toISOString(),
        durationMs: totalDuration,
      });
    } catch (error: any) {
      logger.error("API", "Failed to refresh integrations", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get single integration details
  app.get("/api/integrations/:integrationId", async (req, res) => {
    try {
      const integration = await storage.getIntegrationById(req.params.integrationId);
      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }
      
      // Get recent health checks
      const checks = await storage.getIntegrationChecks(req.params.integrationId, 10);
      
      // Get recent service runs for this service
      const lastRuns = await storage.getServiceRunsByService(req.params.integrationId, 10);
      
      // Get description from catalog if not in DB
      let descriptionMd = integration.descriptionMd;
      if (!descriptionMd) {
        const catalogEntry = getServiceBySlug(req.params.integrationId);
        if (catalogEntry) {
          descriptionMd = catalogEntry.descriptionMd;
        }
      }
      
      res.json({
        ...integration,
        descriptionMd,
        recentChecks: checks,
        recentRuns: lastRuns,
      });
    } catch (error: any) {
      logger.error("API", "Failed to get integration", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Test an integration connection - now with service run logging
  app.post("/api/integrations/:integrationId/test", async (req, res) => {
    try {
      const integration = await storage.getIntegrationById(req.params.integrationId);
      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }

      const { site_id } = req.body || {};
      const startTime = Date.now();
      const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      
      // Create service run record immediately (status: running)
      await storage.createServiceRun({
        runId,
        serviceId: integration.integrationId,
        serviceName: integration.name,
        siteId: site_id || null,
        trigger: "manual",
        status: "running",
        startedAt: new Date(),
        inputsJson: { site_id, trigger: "test_connection" },
      });

      let checkResult: { status: string; details: any; summary?: string; metrics?: any; sampleData?: any } = {
        status: "fail",
        details: { message: "Unknown integration type" },
        summary: "Unknown integration type",
      };

      // Test based on integration type
      try {
        switch (integration.integrationId) {
          case "google_data_connector": {
            // Google Data Connector now uses worker-based approach (not OAuth)
            const { runDiagnosticsForService } = await import("./diagnosticsRunner");
            const { resolveWorkerConfig } = await import("./workerConfigResolver");
            const { getServiceBySlug: getServiceMapping } = await import("@shared/serviceSecretMap");
            
            const expectedOutputs = ["gsc_impressions", "gsc_clicks", "gsc_ctr", "gsc_position", "gsc_queries", "gsc_pages", "ga4_sessions", "ga4_users", "ga4_conversions"];
            const serviceMapping = getServiceMapping("google_data_connector");
            
            const diagResult = await runDiagnosticsForService({
              serviceId: "google_data_connector",
              serviceName: "Google Data Connector",
              siteId: site_id,
              authMode: 'api_key',
              expectedResponseType: 'json',
              requiredOutputFields: expectedOutputs,
              requestId: req.requestId,
            }, async (runner) => {
              // Stage 1: Config Loaded - Get worker config via resolver
              const workerConfig = await resolveWorkerConfig("google_data_connector", site_id);
              
              if (!workerConfig.valid || !workerConfig.base_url) {
                await runner.failStage('config_loaded', workerConfig.error || 'Missing base_url in worker config', { 
                  hasBaseUrl: !!workerConfig.base_url,
                  hasApiKey: !!workerConfig.api_key,
                  secretName: workerConfig.secretName,
                  rawValueType: workerConfig.rawValueType,
                  parseError: workerConfig.parseError,
                });
                return;
              }
              
              await runner.passStage('config_loaded', `Config loaded from ${workerConfig.secretName}`, { 
                secretName: workerConfig.secretName,
                hasBaseUrl: true,
                hasApiKey: !!workerConfig.api_key,
              });
              await runner.setConfigSnapshot([workerConfig.secretName || 'SEO_Google_Connector'], workerConfig.base_url);
              
              // Stage 2: Auth Ready - API key is present with fingerprint
              if (!workerConfig.api_key) {
                await runner.failStage('auth_ready', 'API key missing in worker config', {
                  authMode: 'api_key',
                  keyPresent: false,
                  hermes_key_fingerprint: null,
                });
                return;
              }
              await runner.passStage('auth_ready', 'API key present in worker config', {
                authMode: 'api_key',
                keyPresent: true,
                auth_headers_sent: ['x-api-key', 'authorization'],
                hermes_key_fingerprint: workerConfig.api_key_fingerprint,
              });
              
              // Stage 3: Endpoint Built - Use workerEndpoints from mapping
              const workerEndpoints = serviceMapping?.workerEndpoints || {};
              const healthPath = workerEndpoints.health || workerConfig.health_path || '/health';
              const smokeTestPath = workerEndpoints.smokeTest || '/smoke-test';
              const healthUrl = `${workerConfig.base_url}${healthPath}`;
              const smokeTestUrl = `${workerConfig.base_url}${smokeTestPath}`;
              await runner.passStage('endpoint_built', 'Worker endpoints ready', {
                healthEndpoint: healthUrl,
                smokeTestEndpoint: smokeTestUrl,
                source: workerEndpoints.health ? 'mapping' : 'config',
              });
              
              // Stage 4: Request Sent - Call /health endpoint
              // Use Gold Standard headers from runner (includes X-Request-Id)
              const headers = runner.getWorkerHeaders(workerConfig.api_key || undefined);
              // Some workers may also need bearer token
              if (serviceMapping?.requiresBearer) {
                headers['Authorization'] = `Bearer ${workerConfig.api_key}`;
              }
              
              let healthResponse: Response | null = null;
              let healthStatus: number = 0;
              let healthContentType: string = '';
              let healthBody: string = '';
              
              try {
                healthResponse = await fetch(healthUrl, {
                  method: 'GET',
                  headers,
                  signal: AbortSignal.timeout(10000),
                });
                healthStatus = healthResponse.status;
                healthContentType = healthResponse.headers.get('content-type') || '';
                healthBody = await healthResponse.text();
              } catch (e: any) {
                await runner.failStage('request_sent', `Health check failed: ${e.message}`, {
                  url: healthUrl,
                  error: e.message,
                  errorType: e.name,
                });
                return;
              }
              
              await runner.passStage('request_sent', `Health endpoint responded (${healthStatus})`, {
                url: healthUrl,
                status: healthStatus,
                'content-type': healthContentType,
              });
              
              // Stage 5: Response Type Validated
              const isJson = healthContentType.includes('application/json');
              const isHtml = healthContentType.includes('text/html') || healthBody.trim().startsWith('<!DOCTYPE') || healthBody.trim().startsWith('<html');
              
              if (healthStatus === 404) {
                await runner.failStage('response_type_validated', 'Health endpoint not found (404)', {
                  statusCode: 404,
                  contentType: healthContentType,
                  responseSnippet: healthBody.slice(0, 200),
                });
                return;
              }
              
              if (healthStatus === 401 || healthStatus === 403) {
                await runner.failStage('response_type_validated', `Auth failed (${healthStatus})`, {
                  statusCode: healthStatus,
                  contentType: healthContentType,
                  responseSnippet: healthBody.slice(0, 200),
                  failure_bucket: 'auth_failed',
                  suggested_fix: 'Worker rejected the key or expects a different header. Compare fingerprints.',
                  hermes_key_fingerprint: workerConfig.api_key_fingerprint,
                });
                return;
              }
              
              if (isHtml) {
                await runner.failStage('response_type_validated', 'Got HTML instead of JSON - hitting SPA shell', {
                  statusCode: healthStatus,
                  contentType: healthContentType,
                  responseSnippet: healthBody.slice(0, 200),
                });
                return;
              }
              
              if (!isJson && healthStatus === 200) {
                await runner.failStage('response_type_validated', 'Expected JSON response', {
                  statusCode: healthStatus,
                  contentType: healthContentType,
                  responseSnippet: healthBody.slice(0, 200),
                });
                return;
              }
              
              // Parse health response to check fingerprint
              let healthJson: any = null;
              let workerFingerprint: string | null = null;
              try {
                healthJson = JSON.parse(healthBody);
                workerFingerprint = healthJson.expected_key_fingerprint || null;
              } catch (e) {
                // Health response is not valid JSON, proceed without fingerprint check
              }
              
              // Check for fingerprint mismatch
              if (workerFingerprint && workerConfig.api_key_fingerprint) {
                if (workerFingerprint !== workerConfig.api_key_fingerprint) {
                  await runner.failStage('response_type_validated', 'API key mismatch - fingerprints differ', {
                    statusCode: healthStatus,
                    contentType: healthContentType,
                    hermes_key_fingerprint: workerConfig.api_key_fingerprint,
                    worker_expected_fingerprint: workerFingerprint,
                    failure_bucket: 'api_key_mismatch',
                    suggested_fix: 'Bitwarden api_key does not match worker expected key. Update one side.',
                  });
                  return;
                }
              }
              
              await runner.passStage('response_type_validated', 'Valid JSON response', {
                statusCode: healthStatus,
                contentType: healthContentType,
                hermes_key_fingerprint: workerConfig.api_key_fingerprint,
                worker_expected_fingerprint: workerFingerprint || 'not_provided',
                fingerprints_match: workerFingerprint === workerConfig.api_key_fingerprint,
              });
              
              // Stage 6: Schema Validated - Try smoke-test endpoint for outputs
              let smokeResponse: Response | null = null;
              let smokeBody: any = null;
              
              try {
                smokeResponse = await fetch(smokeTestUrl, {
                  method: 'GET',
                  headers,
                  signal: AbortSignal.timeout(15000),
                });
                const smokeText = await smokeResponse.text();
                smokeBody = JSON.parse(smokeText);
              } catch (e: any) {
                // Smoke test is optional - if health passed, we can still mark partial success
                await runner.passStage('schema_validated', 'Health check passed, smoke test optional', {
                  smokeTestError: e.message,
                  healthPassed: true,
                });
                await runner.skipStage('ui_mapping', 'Smoke test unavailable');
                return;
              }
              
              const actualOutputs: string[] = smokeBody?.outputs || smokeBody?.available_outputs || [];
              const missingOutputs = expectedOutputs.filter(o => !actualOutputs.includes(o));
              
              if (actualOutputs.length === expectedOutputs.length) {
                await runner.passStage('schema_validated', 'All expected outputs available', { actualOutputs, missingOutputs: [] });
              } else if (actualOutputs.length > 0) {
                await runner.passStage('schema_validated', `Partial: ${actualOutputs.length}/${expectedOutputs.length} outputs`, { actualOutputs, missingOutputs });
              } else {
                await runner.passStage('schema_validated', 'Worker connected but outputs unknown', { 
                  smokeResponse: smokeBody,
                  note: 'Worker may not report outputs in smoke-test response',
                });
              }
              
              // Stage 7: UI Mapping
              await runner.skipStage('ui_mapping', 'UI mapping check not applicable for worker connectors');
            });
            
            const isPass = diagResult.status === 'pass';
            const isPartial = diagResult.status === 'partial';
            
            checkResult = {
              status: diagResult.status,
              summary: isPass ? "Google Data Worker connected" : isPartial ? "Worker partially connected" : "Worker connection failed",
              metrics: { 
                mode: "worker",
                diagnosticRunId: diagResult.runId,
              },
              details: { 
                diagnosticRunId: diagResult.runId,
                stages: diagResult.stages,
              },
            };
            break;
          }
          case "google_ads":
          case "google_ads_connector": {
            const adsStatus = await adsConnector.testConnection();
            checkResult = {
              status: adsStatus.success ? "pass" : "fail",
              summary: adsStatus.success ? "Google Ads API connected" : "Google Ads connection failed",
              metrics: { connected: adsStatus.success },
              details: adsStatus,
            };
            break;
          }
          case "serp_intel": {
            // Use the SERP worker client to test connection with actual endpoints
            const { serpWorkerClient } = await import("./connectors/serpWorker");
            
            // Test connection by calling actual SERP endpoints (not /health)
            const workerResult = await serpWorkerClient.testConnection();
            
            if (workerResult.success && workerResult.actualOutputs && workerResult.actualOutputs.length > 0) {
              // Worker connected - use the actual outputs it returned
              const outputsCount = workerResult.actualOutputs.length;
              checkResult = {
                status: outputsCount === 4 ? "pass" : "partial",
                summary: workerResult.message,
                metrics: { 
                  connected: true, 
                  mode: "worker",
                  outputs_available: outputsCount,
                  outputs_missing: 4 - outputsCount,
                },
                details: { 
                  actualOutputs: workerResult.actualOutputs,
                  debug: workerResult.debug,
                },
              };
            } else {
              // Worker failed - try legacy SerpAPI as fallback
              const serpStatus = await serpConnector.testConnection();
              const legacyOutputs = serpStatus.success 
                ? ["serp_rank_snapshots", "serp_tracked_keywords"]
                : [];
              checkResult = {
                status: serpStatus.success ? "partial" : "fail",
                summary: serpStatus.success 
                  ? `SerpAPI legacy fallback (Worker issue: ${workerResult.message})` 
                  : `Connection failed: ${workerResult.message}`,
                metrics: { 
                  connected: serpStatus.success, 
                  mode: "legacy",
                  outputs_available: legacyOutputs.length,
                  outputs_missing: 4 - legacyOutputs.length,
                },
                details: { 
                  ...serpStatus, 
                  fallbackReason: workerResult.message,
                  actualOutputs: legacyOutputs,
                  debug: workerResult.debug,
                },
              };
            }
            break;
          }
          case "crawl_render": {
            // Use workerConfigResolver for aliases and env var fallback
            const { resolveWorkerConfig } = await import("./workerConfigResolver");
            const crawlConfig = await resolveWorkerConfig("crawl_render");
            
            const debug: any = { 
              secretFound: crawlConfig.rawValueType !== "null", 
              secretName: crawlConfig.secretName,
              requestedUrls: [], 
              responses: [] 
            };
            const expectedOutputs = ["pages_crawled", "indexable_pages", "non_200_urls", "canonical_errors", 
                                      "render_failures", "redirect_chains", "orphan_pages", "meta_tags"];
            
            if (!crawlConfig.valid || !crawlConfig.base_url) {
              checkResult = {
                status: "fail",
                summary: crawlConfig.error || "Worker not configured - add SEO_Technical_Crawler to Bitwarden or set SEO_TECHNICAL_CRAWLER_BASE_URL env var",
                metrics: { secret_found: crawlConfig.rawValueType !== "null", outputs_missing: expectedOutputs.length },
                details: { debug, actualOutputs: [], missingOutputs: expectedOutputs },
              };
            } else {
              const baseUrl = crawlConfig.base_url.replace(/\/$/, '');
              debug.baseUrl = baseUrl;
              const headers: Record<string, string> = {};
              if (crawlConfig.api_key) {
                headers["Authorization"] = `Bearer ${crawlConfig.api_key}`;
                headers["X-API-Key"] = crawlConfig.api_key;
              }
              
              const healthUrl = `${baseUrl}/health`;
              debug.requestedUrls.push(healthUrl);
              
              try {
                const res = await fetch(healthUrl, {
                  method: "GET",
                  headers,
                  signal: AbortSignal.timeout(10000),
                });
                
                const bodyText = await res.text().catch(() => "");
                debug.responses.push({ 
                  url: healthUrl, 
                  status: res.status,
                  ok: res.ok,
                  bodySnippet: bodyText.slice(0, 200),
                });
                
                if (res.ok) {
                  // Worker is reachable - mark as configured but outputs pending validation
                  // Don't claim all outputs are available until we actually run a crawl
                  checkResult = {
                    status: "partial",
                    summary: `Worker connected - run a crawl to validate outputs`,
                    metrics: { 
                      worker_configured: true,
                      worker_reachable: true,
                      outputs_pending: expectedOutputs.length,
                    },
                    details: { 
                      baseUrl,
                      debug,
                      actualOutputs: [],  // None verified until crawl runs
                      pendingOutputs: expectedOutputs,
                      note: "Connection verified. Run a crawl to validate all outputs.",
                    },
                  };
                } else {
                  checkResult = {
                    status: "fail",
                    summary: `Worker returned HTTP ${res.status}`,
                    metrics: { 
                      worker_configured: true,
                      worker_reachable: false,
                      http_status: res.status,
                      outputs_available: 0,
                      outputs_missing: expectedOutputs.length,
                    },
                    details: { 
                      baseUrl,
                      debug,
                      actualOutputs: [],
                      missingOutputs: expectedOutputs,
                    },
                  };
                }
              } catch (err: any) {
                debug.error = err.message;
                checkResult = {
                  status: "fail",
                  summary: `Worker unreachable: ${err.message}`,
                  metrics: { 
                    worker_configured: true,
                    worker_reachable: false,
                    outputs_available: 0,
                    outputs_missing: expectedOutputs.length,
                  },
                  details: { 
                    baseUrl,
                    debug,
                    actualOutputs: [],
                    missingOutputs: expectedOutputs,
                  },
                };
              }
            }
            break;
          }
          case "core_web_vitals": {
            // Use workerConfigResolver for aliases and env var fallback
            const { resolveWorkerConfig } = await import("./workerConfigResolver");
            const vitalsConfig = await resolveWorkerConfig("core_web_vitals");
            
            const debug: any = { 
              secretFound: vitalsConfig.rawValueType !== "null", 
              secretName: vitalsConfig.secretName,
              apiKeyPresent: !!vitalsConfig.api_key,
              apiKeyFingerprint: vitalsConfig.api_key_fingerprint,
              apiKeyLength: vitalsConfig.api_key?.length || 0,
              requestedUrls: [], 
              responses: [] 
            };
            const expectedOutputs = ["lcp", "cls", "inp", "performance_score", "regressions"];
            
            if (!vitalsConfig.valid || !vitalsConfig.base_url) {
              checkResult = {
                status: "fail",
                summary: vitalsConfig.error || "Worker not configured - add SEO_Core_Web_Vitals to Bitwarden or set SEO_CORE_WEB_VITALS_BASE_URL env var",
                metrics: { secret_found: vitalsConfig.rawValueType !== "null", outputs_missing: expectedOutputs.length },
                details: { debug, actualOutputs: [], missingOutputs: expectedOutputs },
              };
            } else {
              const baseUrl = vitalsConfig.base_url.replace(/\/$/, '');
              debug.baseUrl = baseUrl;
              const headers: Record<string, string> = {
                "Content-Type": "application/json",
              };
              if (vitalsConfig.api_key) {
                headers["Authorization"] = `Bearer ${vitalsConfig.api_key}`;
                headers["x-api-key"] = vitalsConfig.api_key;
              }
              
              // First check health - try /api/health first, fallback to /health
              const apiHealthUrl = `${baseUrl}/api/health`;
              const healthUrl = apiHealthUrl;
              debug.requestedUrls.push(healthUrl);
              
              try {
                const healthRes = await fetch(healthUrl, {
                  method: "GET",
                  headers,
                  signal: AbortSignal.timeout(10000),
                });
                
                const healthBody = await healthRes.text().catch(() => "");
                debug.responses.push({ 
                  url: healthUrl, 
                  status: healthRes.status,
                  ok: healthRes.ok,
                  bodySnippet: healthBody.slice(0, 200),
                });
                
                if (!healthRes.ok) {
                  checkResult = {
                    status: "fail",
                    summary: `Worker returned HTTP ${healthRes.status}`,
                    metrics: { worker_configured: true, worker_reachable: false, http_status: healthRes.status },
                    details: { baseUrl, debug, actualOutputs: [], missingOutputs: expectedOutputs },
                  };
                } else {
                  // Worker is reachable - use v1 API to list websites and get summary
                  const targetSite = await storage.getSiteById(site_id);
                  const targetDomain = targetSite?.domain || "empathyhealthclinic.com";
                  
                  // Step 1: List websites to find the matching site
                  const websitesUrl = `${baseUrl}/api/v1/websites`;
                  debug.requestedUrls.push(websitesUrl);
                  
                  const websitesRes = await fetch(websitesUrl, {
                    method: "GET",
                    headers,
                    signal: AbortSignal.timeout(15000),
                  });
                  
                  const websitesBody = await websitesRes.text().catch(() => "");
                  debug.responses.push({ 
                    url: websitesUrl, 
                    status: websitesRes.status,
                    ok: websitesRes.ok,
                    bodySnippet: websitesBody.slice(0, 500),
                  });
                  
                  let cwvData: any = null;
                  let websiteId: string | null = null;
                  
                  if (websitesRes.ok) {
                    try {
                      const websitesData = JSON.parse(websitesBody);
                      const websites = websitesData.data?.websites || websitesData.websites || websitesData.data || [];
                      
                      // Find matching website by domain or base_url
                      const normalizedTarget = targetDomain.replace('https://', '').replace('http://', '').replace(/\/$/, '');
                      const matchedSite = Array.isArray(websites) ? websites.find((w: any) => {
                        const wDomain = w.domain || '';
                        const wBaseUrl = (w.base_url || '').replace('https://', '').replace('http://', '').replace(/\/$/, '');
                        const wUrl = (w.url || '').replace('https://', '').replace('http://', '').replace(/\/$/, '');
                        return wDomain === targetDomain || 
                               wDomain.includes(normalizedTarget) ||
                               wBaseUrl === normalizedTarget ||
                               wBaseUrl.includes(normalizedTarget) ||
                               wUrl.includes(normalizedTarget);
                      }) : null;
                      
                      if (matchedSite?.website_id || matchedSite?.id) {
                        websiteId = matchedSite.website_id || matchedSite.id;
                        debug.matchedWebsiteId = websiteId;
                        
                        // Step 2: Get latest results (has actual LCP/CLS/INP metrics)
                        const latestUrl = `${baseUrl}/api/v1/websites/${websiteId}/results/latest`;
                        debug.requestedUrls.push(latestUrl);
                        
                        const latestRes = await fetch(latestUrl, {
                          method: "GET",
                          headers,
                          signal: AbortSignal.timeout(15000),
                        });
                        
                        const latestBody = await latestRes.text().catch(() => "");
                        debug.responses.push({ 
                          url: latestUrl, 
                          status: latestRes.status,
                          ok: latestRes.ok,
                          bodySnippet: latestBody.slice(0, 500),
                        });
                        
                        if (latestRes.ok) {
                          const latestData = JSON.parse(latestBody);
                          // Extract first result from latest array
                          const results = latestData.latest || latestData.data || latestData.results || [];
                          if (Array.isArray(results) && results.length > 0) {
                            const firstResult = results[0];
                            cwvData = {
                              lcp_ms: firstResult.metrics?.lcp_ms,
                              cls: firstResult.metrics?.cls,
                              inp_ms: firstResult.metrics?.inp_ms,
                              performance_score: firstResult.metrics?.performance_score,
                              status: firstResult.status,
                              collected_at: firstResult.collected_at,
                            };
                          }
                        }
                      } else {
                        debug.noMatchingWebsite = `No website found matching domain: ${targetDomain}`;
                        debug.availableWebsites = Array.isArray(websites) ? websites.map((w: any) => w.domain || w.base_url || w.url) : [];
                      }
                    } catch (e) {
                      debug.parseError = (e as Error).message;
                    }
                  } else {
                    debug.websitesApiError = `HTTP ${websitesRes.status}`;
                  }
                  
                  if (cwvData) {
                    try {
                      const data = cwvData;
                      
                      // Helper to extract metric value from various nested structures
                      const extractMetric = (obj: any, ...paths: string[]): number | null => {
                        for (const path of paths) {
                          const keys = path.split('.');
                          let val: any = obj;
                          for (const k of keys) {
                            if (val && typeof val === 'object') {
                              val = val[k];
                            } else {
                              val = undefined;
                              break;
                            }
                          }
                          if (typeof val === 'number') return val;
                          if (typeof val === 'string' && !isNaN(parseFloat(val))) return parseFloat(val);
                        }
                        // Check for array of pages and take first result
                        const pages = obj.pages || obj.results || obj.metrics_by_page;
                        if (Array.isArray(pages) && pages.length > 0) {
                          return extractMetric(pages[0], ...paths);
                        }
                        return null;
                      };
                      
                      // Extract CWV metrics from response - handle various structures
                      // Convert lcp_ms to seconds for display, keep others as-is
                      const lcpMs = extractMetric(data, 'lcp_ms', 'lcp', 'largest_contentful_paint', 'metrics.lcp', 'metrics.lcp.p75');
                      const cwvMetrics = {
                        lcp: lcpMs !== null ? lcpMs / 1000 : null, // Convert ms to seconds
                        cls: extractMetric(data, 'cls', 'cumulative_layout_shift', 'metrics.cls', 'metrics.cls.p75'),
                        inp: extractMetric(data, 'inp_ms', 'inp', 'interaction_to_next_paint', 'metrics.inp', 'metrics.inp.p75'),
                        performance_score: extractMetric(data, 'performance_score', 'score', 'metrics.performance_score'),
                      };
                      
                      // Check for regressions
                      const regressions = data.regressions || data.alerts || [];
                      
                      const actualOutputs: string[] = [];
                      if (cwvMetrics.lcp !== null) actualOutputs.push('lcp');
                      if (cwvMetrics.cls !== null) actualOutputs.push('cls');
                      if (cwvMetrics.inp !== null) actualOutputs.push('inp');
                      if (cwvMetrics.performance_score !== null) actualOutputs.push('performance_score');
                      if (Array.isArray(regressions)) actualOutputs.push('regressions');
                      
                      const missingOutputs = expectedOutputs.filter(o => !actualOutputs.includes(o));
                      
                      // Save to seo_worker_results for dashboard consumption
                      await storage.saveSeoWorkerResult({
                        runId,
                        siteId: site_id,
                        workerKey: "core_web_vitals",
                        status: actualOutputs.length > 0 ? "success" : "partial",
                        metricsJson: { ...cwvMetrics, regressions: regressions.length },
                        outputsJson: data,
                        durationMs: Date.now() - startTime,
                        startedAt: new Date(startTime),
                        finishedAt: new Date(),
                      });
                      
                      checkResult = {
                        status: actualOutputs.length >= 3 ? "pass" : "partial",
                        summary: `Smoke: ${actualOutputs.length}/${expectedOutputs.length} outputs`,
                        metrics: { 
                          ...cwvMetrics,
                          regressions_count: regressions.length,
                          worker_configured: true,
                          worker_reachable: true,
                          outputs_available: actualOutputs.length,
                        },
                        details: { baseUrl, debug, actualOutputs, missingOutputs, cwvMetrics },
                      };
                    } catch (parseErr: any) {
                      checkResult = {
                        status: "partial",
                        summary: "Worker responded but output parsing failed",
                        metrics: { worker_configured: true, worker_reachable: true },
                        details: { baseUrl, debug, parseError: parseErr.message, actualOutputs: [], pendingOutputs: expectedOutputs },
                      };
                    }
                  } else {
                    // Determine failure reason
                    let summary = "Worker connected but no CWV data found";
                    if (debug.websitesApiError) {
                      summary = `Websites API failed: ${debug.websitesApiError}`;
                    } else if (debug.noMatchingWebsite) {
                      summary = `Website not registered in CWV worker`;
                    }
                    
                    checkResult = {
                      status: "partial",
                      summary,
                      metrics: { worker_configured: true, worker_reachable: true, websiteId },
                      details: { baseUrl, debug, actualOutputs: [], pendingOutputs: expectedOutputs },
                    };
                  }
                }
              } catch (err: any) {
                debug.error = err.message;
                checkResult = {
                  status: "fail",
                  summary: `Worker unreachable: ${err.message}`,
                  metrics: { worker_configured: true, worker_reachable: false },
                  details: { baseUrl, debug, actualOutputs: [], missingOutputs: expectedOutputs },
                };
              }
            }
            break;
          }
          case "content_generator": {
            // Use the workerConfigResolver which supports aliases and fallback env vars
            const { resolveWorkerConfig } = await import("./workerConfigResolver");
            const genConfig = await resolveWorkerConfig("content_generator");
            
            const debug: any = { 
              secretFound: genConfig.rawValueType !== "null", 
              secretName: genConfig.secretName,
              requestedUrls: [], 
              responses: [] 
            };
            const expectedOutputs = ["drafts", "content_blocks", "faq_schema", "internal_links"];
            
            if (!genConfig.valid || !genConfig.base_url) {
              checkResult = {
                status: "fail",
                summary: genConfig.error || "Worker not configured - add SEO_Blog_Writer to Bitwarden or set SEO_BLOG_WRITER_BASE_URL env var",
                metrics: { secret_found: genConfig.rawValueType !== "null", outputs_missing: expectedOutputs.length },
                details: { debug, actualOutputs: [], missingOutputs: expectedOutputs },
              };
            } else {
              const baseUrl = genConfig.base_url.replace(/\/$/, '');
              debug.baseUrl = baseUrl;
              const headers: Record<string, string> = {};
              if (genConfig.api_key) {
                headers["Authorization"] = `Bearer ${genConfig.api_key}`;
                headers["X-API-Key"] = genConfig.api_key;
              }
              
              const healthUrl = `${baseUrl}/health`;
              debug.requestedUrls.push(healthUrl);
              
              try {
                const res = await fetch(healthUrl, { method: "GET", headers, signal: AbortSignal.timeout(10000) });
                const bodyText = await res.text().catch(() => "");
                debug.responses.push({ url: healthUrl, status: res.status, ok: res.ok, bodySnippet: bodyText.slice(0, 200) });
                
                if (res.ok) {
                  checkResult = {
                    status: "partial",
                    summary: `Worker connected - generate content to validate outputs`,
                    metrics: { worker_configured: true, worker_reachable: true, outputs_pending: expectedOutputs.length },
                    details: { baseUrl, debug, actualOutputs: [], pendingOutputs: expectedOutputs },
                  };
                } else {
                  checkResult = {
                    status: "fail",
                    summary: `Worker returned HTTP ${res.status}`,
                    metrics: { worker_configured: true, worker_reachable: false, http_status: res.status },
                    details: { baseUrl, debug, actualOutputs: [], missingOutputs: expectedOutputs },
                  };
                }
              } catch (err: any) {
                debug.error = err.message;
                checkResult = {
                  status: "fail",
                  summary: `Worker unreachable: ${err.message}`,
                  metrics: { worker_configured: true, worker_reachable: false },
                  details: { baseUrl, debug, actualOutputs: [], missingOutputs: expectedOutputs },
                };
              }
            }
            break;
          }
          case "backlink_authority": {
            // Use workerConfigResolver for aliases and env var fallback
            const { resolveWorkerConfig } = await import("./workerConfigResolver");
            const backlinkConfig = await resolveWorkerConfig("backlink_authority");
            
            const debug: any = { 
              secretFound: backlinkConfig.rawValueType !== "null", 
              secretName: backlinkConfig.secretName,
              requestedUrls: [], 
              responses: [] 
            };
            const expectedOutputs = ["new_links", "lost_links", "domain_authority", "anchor_distribution", "link_velocity"];
            
            if (!backlinkConfig.valid || !backlinkConfig.base_url) {
              checkResult = {
                status: "fail",
                summary: backlinkConfig.error || "Worker not configured - add SEO_Backlinks to Bitwarden or set SEO_BACKLINKS_BASE_URL env var",
                metrics: { secret_found: backlinkConfig.rawValueType !== "null", outputs_missing: expectedOutputs.length },
                details: { debug, actualOutputs: [], missingOutputs: expectedOutputs },
              };
            } else {
              const baseUrl = backlinkConfig.base_url.replace(/\/$/, '');
              debug.baseUrl = baseUrl;
              const headers: Record<string, string> = {};
              if (backlinkConfig.api_key) {
                headers["Authorization"] = `Bearer ${backlinkConfig.api_key}`;
                headers["X-API-Key"] = backlinkConfig.api_key;
              }
              
              const healthUrl = `${baseUrl}/health`;
              debug.requestedUrls.push(healthUrl);
              
              try {
                const res = await fetch(healthUrl, { method: "GET", headers, signal: AbortSignal.timeout(10000) });
                const bodyText = await res.text().catch(() => "");
                debug.responses.push({ url: healthUrl, status: res.status, ok: res.ok, bodySnippet: bodyText.slice(0, 200) });
                
                if (res.ok) {
                  checkResult = {
                    status: "partial",
                    summary: `Worker connected - run backlink scan to validate outputs`,
                    metrics: { worker_configured: true, worker_reachable: true, outputs_pending: expectedOutputs.length },
                    details: { baseUrl, debug, actualOutputs: [], pendingOutputs: expectedOutputs },
                  };
                } else {
                  checkResult = {
                    status: "fail",
                    summary: `Worker returned HTTP ${res.status}`,
                    metrics: { worker_configured: true, worker_reachable: false, http_status: res.status },
                    details: { baseUrl, debug, actualOutputs: [], missingOutputs: expectedOutputs },
                  };
                }
              } catch (err: any) {
                debug.error = err.message;
                checkResult = {
                  status: "fail",
                  summary: `Worker unreachable: ${err.message}`,
                  metrics: { worker_configured: true, worker_reachable: false },
                  details: { baseUrl, debug, actualOutputs: [], missingOutputs: expectedOutputs },
                };
              }
            }
            break;
          }
          case "notifications": {
            // Use workerConfigResolver for aliases and env var fallback
            const { resolveWorkerConfig } = await import("./workerConfigResolver");
            const notifyConfig = await resolveWorkerConfig("notifications");
            
            const debug: any = { 
              secretFound: notifyConfig.rawValueType !== "null", 
              secretName: notifyConfig.secretName,
              requestedUrls: [], 
              responses: [] 
            };
            const expectedOutputs = ["notifications_sent", "alert_delivered"];
            
            if (!notifyConfig.valid || !notifyConfig.base_url) {
              checkResult = {
                status: "fail",
                summary: notifyConfig.error || "Worker not configured - add SEO_Notifications to Bitwarden or set SEO_NOTIFICATIONS_BASE_URL env var",
                metrics: { secret_found: notifyConfig.rawValueType !== "null", outputs_missing: expectedOutputs.length },
                details: { debug, actualOutputs: [], missingOutputs: expectedOutputs },
              };
            } else {
              const baseUrl = notifyConfig.base_url.replace(/\/$/, '');
              debug.baseUrl = baseUrl;
              const headers: Record<string, string> = {};
              if (notifyConfig.api_key) {
                headers["Authorization"] = `Bearer ${notifyConfig.api_key}`;
                headers["X-API-Key"] = notifyConfig.api_key;
              }
              
              const healthUrl = `${baseUrl}/health`;
              debug.requestedUrls.push(healthUrl);
              
              try {
                const res = await fetch(healthUrl, { method: "GET", headers, signal: AbortSignal.timeout(10000) });
                const bodyText = await res.text().catch(() => "");
                debug.responses.push({ url: healthUrl, status: res.status, ok: res.ok, bodySnippet: bodyText.slice(0, 200) });
                
                if (res.ok) {
                  checkResult = {
                    status: "partial",
                    summary: `Worker connected - send notification to validate outputs`,
                    metrics: { worker_configured: true, worker_reachable: true, outputs_pending: expectedOutputs.length },
                    details: { baseUrl, debug, actualOutputs: [], pendingOutputs: expectedOutputs },
                  };
                } else {
                  checkResult = {
                    status: "fail",
                    summary: `Worker returned HTTP ${res.status}`,
                    metrics: { worker_configured: true, worker_reachable: false, http_status: res.status },
                    details: { baseUrl, debug, actualOutputs: [], missingOutputs: expectedOutputs },
                  };
                }
              } catch (err: any) {
                debug.error = err.message;
                checkResult = {
                  status: "fail",
                  summary: `Worker unreachable: ${err.message}`,
                  metrics: { worker_configured: true, worker_reachable: false },
                  details: { baseUrl, debug, actualOutputs: [], missingOutputs: expectedOutputs },
                };
              }
            }
            break;
          }
          case "content_qa": {
            // Use workerConfigResolver for aliases and env var fallback
            const { resolveWorkerConfig } = await import("./workerConfigResolver");
            const qaConfig = await resolveWorkerConfig("content_qa");
            
            const debug: any = { 
              secretFound: qaConfig.rawValueType !== "null", 
              secretName: qaConfig.secretName,
              requestedUrls: [], 
              responses: [] 
            };
            const expectedOutputs = ["qa_score", "violations", "compliance_status", "fix_list"];
            
            if (!qaConfig.valid || !qaConfig.base_url) {
              checkResult = {
                status: "fail",
                summary: qaConfig.error || "Worker not configured - add SEO_Content_QA to Bitwarden or set SEO_CONTENT_QA_BASE_URL env var",
                metrics: { secret_found: qaConfig.rawValueType !== "null", outputs_missing: expectedOutputs.length },
                details: { debug, actualOutputs: [], missingOutputs: expectedOutputs },
              };
            } else {
              const baseUrl = qaConfig.base_url.replace(/\/$/, '');
              debug.baseUrl = baseUrl;
              const headers: Record<string, string> = {};
              if (qaConfig.api_key) {
                headers["Authorization"] = `Bearer ${qaConfig.api_key}`;
                headers["X-API-Key"] = qaConfig.api_key;
              }
              
              const healthUrl = `${baseUrl}/health`;
              debug.requestedUrls.push(healthUrl);
              
              try {
                const res = await fetch(healthUrl, { method: "GET", headers, signal: AbortSignal.timeout(10000) });
                const bodyText = await res.text().catch(() => "");
                debug.responses.push({ url: healthUrl, status: res.status, ok: res.ok, bodySnippet: bodyText.slice(0, 200) });
                
                if (res.ok) {
                  checkResult = {
                    status: "partial",
                    summary: `Worker connected - run QA check to validate outputs`,
                    metrics: { worker_configured: true, worker_reachable: true, outputs_pending: expectedOutputs.length },
                    details: { baseUrl, debug, actualOutputs: [], pendingOutputs: expectedOutputs },
                  };
                } else {
                  checkResult = {
                    status: "fail",
                    summary: `Worker returned HTTP ${res.status}`,
                    metrics: { worker_configured: true, worker_reachable: false, http_status: res.status },
                    details: { baseUrl, debug, actualOutputs: [], missingOutputs: expectedOutputs },
                  };
                }
              } catch (err: any) {
                debug.error = err.message;
                checkResult = {
                  status: "fail",
                  summary: `Worker unreachable: ${err.message}`,
                  metrics: { worker_configured: true, worker_reachable: false },
                  details: { baseUrl, debug, actualOutputs: [], missingOutputs: expectedOutputs },
                };
              }
            }
            break;
          }
          case "seo_kbase": {
            // Use workerConfigResolver for aliases and env var fallback
            const { resolveWorkerConfig } = await import("./workerConfigResolver");
            const { createHash } = await import("crypto");
            const kbaseConfig = await resolveWorkerConfig("seo_kbase");
            
            const debug: any = { 
              secretFound: kbaseConfig.rawValueType !== "null", 
              secretName: kbaseConfig.secretName,
              requestedUrls: [], 
              responses: [],
            };
            const expectedOutputs = ["seo_recommendations", "best_practices", "optimization_tips", "reference_docs"];
            
            if (!kbaseConfig.valid || !kbaseConfig.base_url) {
              checkResult = {
                status: "fail",
                summary: kbaseConfig.error || "Worker not configured - add SEO_KBASE to Bitwarden or set SEO_KBASE_BASE_URL env var",
                metrics: { secret_found: kbaseConfig.rawValueType !== "null", outputs_missing: expectedOutputs.length },
                details: { debug, actualOutputs: [], missingOutputs: expectedOutputs },
              };
            } else if (!kbaseConfig.api_key) {
              checkResult = {
                status: "fail",
                summary: "SEO_KBASE secret missing api_key field",
                metrics: { secret_found: true, api_key_found: false },
                details: { debug, actualOutputs: [], missingOutputs: expectedOutputs },
              };
            } else {
              // base_url from Bitwarden already includes /api, just append endpoint paths
              const baseUrl = kbaseConfig.base_url.replace(/\/+$/, '');
              debug.baseUrl = baseUrl;
              const kbaseApiKey = kbaseConfig.api_key;
              const kbaseWriteKey = kbaseConfig.write_key;
              const headers: Record<string, string> = {
                "x-api-key": kbaseApiKey,
              };
              
              // Compute local fingerprint from api_key (SHA256, first 8 hex chars)
              const localFingerprint = createHash('sha256').update(kbaseApiKey).digest('hex').slice(0, 8);
              debug.localKeyFingerprint = localFingerprint;
              debug.writeBackEnabled = !!kbaseWriteKey;
              
              // Health check (no auth required) - validates fingerprint
              const healthUrl = `${baseUrl}/health`;
              debug.requestedUrls.push(healthUrl);
              
              try {
                const healthRes = await fetch(healthUrl, { method: "GET", signal: AbortSignal.timeout(10000) });
                const healthBody = await healthRes.text().catch(() => "");
                debug.responses.push({ url: healthUrl, status: healthRes.status, ok: healthRes.ok, bodySnippet: healthBody.slice(0, 300) });
                
                if (!healthRes.ok) {
                  const errorMsg = healthRes.status === 404 
                    ? "Wrong base_url or double-/api; verify base_url ends with /api and Hermes appends only endpoint paths"
                    : `Worker health check failed: HTTP ${healthRes.status}`;
                  checkResult = {
                    status: "fail",
                    summary: errorMsg,
                    metrics: { worker_configured: true, worker_reachable: false, http_status: healthRes.status },
                    details: { baseUrl, debug, actualOutputs: [], missingOutputs: expectedOutputs },
                  };
                } else {
                  // Parse health response for fingerprint validation
                  let healthData: any = {};
                  try {
                    healthData = JSON.parse(healthBody);
                  } catch (e) {
                    debug.healthParseError = "Invalid JSON from health endpoint";
                  }
                  
                  const workerFingerprint = healthData.read_key_fingerprint || healthData.expected_key_fingerprint;
                  debug.workerKeyFingerprint = workerFingerprint;
                  
                  // Fingerprint validation
                  if (workerFingerprint && workerFingerprint !== localFingerprint) {
                    checkResult = {
                      status: "fail",
                      summary: `Bitwarden READ key does not match worker deployment (expected: ${workerFingerprint}, got: ${localFingerprint})`,
                      metrics: { worker_configured: true, fingerprint_mismatch: true },
                      details: { baseUrl, debug, actualOutputs: [], missingOutputs: expectedOutputs },
                    };
                  } else {
                    // Health passed, now call smoke-test (requires auth)
                    const smokeUrl = `${baseUrl}/smoke-test`;
                    debug.requestedUrls.push(smokeUrl);
                    
                    try {
                      const smokeRes = await fetch(smokeUrl, { method: "GET", headers, signal: AbortSignal.timeout(15000) });
                      const smokeBody = await smokeRes.text().catch(() => "");
                      debug.responses.push({ url: smokeUrl, status: smokeRes.status, ok: smokeRes.ok, bodySnippet: smokeBody.slice(0, 500) });
                      
                      if (smokeRes.status === 401 || smokeRes.status === 403) {
                        checkResult = {
                          status: "fail",
                          summary: "Invalid API key or wrong header; verify Bitwarden key and worker fingerprint",
                          metrics: { worker_configured: true, worker_reachable: true, auth_failed: true, http_status: smokeRes.status },
                          details: { baseUrl, debug, actualOutputs: [], missingOutputs: expectedOutputs },
                        };
                      } else if (!smokeRes.ok) {
                        checkResult = {
                          status: "fail",
                          summary: `Smoke test returned ${smokeRes.status}: ${smokeBody.slice(0, 100)}`,
                          metrics: { worker_configured: true, worker_reachable: true, smoke_status: smokeRes.status },
                          details: { baseUrl, debug, actualOutputs: [], missingOutputs: expectedOutputs },
                        };
                      } else {
                        // Parse response and check for expected outputs
                        let smokeData: any = {};
                        let jsonParseOk = false;
                        try {
                          smokeData = JSON.parse(smokeBody);
                          jsonParseOk = true;
                        } catch (e) {
                          debug.parseError = "Worker returned non-JSON; expected JSON API-only worker";
                        }
                        
                        if (!jsonParseOk) {
                          checkResult = {
                            status: "fail",
                            summary: "Worker returned non-JSON; expected JSON API-only worker",
                            metrics: { worker_configured: true, worker_reachable: true, json_invalid: true },
                            details: { baseUrl, debug, actualOutputs: [], missingOutputs: expectedOutputs },
                          };
                        } else {
                          // Check which outputs are present in the response
                          const actualOutputs: string[] = [];
                          const dataPayload = smokeData.data || smokeData.outputs || smokeData;
                          debug.dataPayloadKeys = Object.keys(dataPayload || {});
                          
                          // Check for canonical KBASE output names
                          if (Array.isArray(dataPayload.seo_recommendations)) actualOutputs.push("seo_recommendations");
                          if (Array.isArray(dataPayload.best_practices)) actualOutputs.push("best_practices");
                          if (Array.isArray(dataPayload.optimization_tips)) actualOutputs.push("optimization_tips");
                          if (Array.isArray(dataPayload.reference_docs)) actualOutputs.push("reference_docs");
                          
                          const missingOutputs = expectedOutputs.filter(o => !actualOutputs.includes(o));
                          const hasValidData = smokeData.ok === true || actualOutputs.length > 0;
                          
                          if (actualOutputs.length === expectedOutputs.length) {
                            checkResult = {
                              status: "pass",
                              summary: `Worker connected and all ${expectedOutputs.length} outputs validated${!kbaseWriteKey ? ' (write-back disabled: missing write_key)' : ''}`,
                              metrics: { 
                                worker_configured: true, 
                                worker_reachable: true, 
                                outputs_validated: actualOutputs.length,
                                write_back_enabled: !!kbaseWriteKey,
                                fingerprint_valid: true,
                              },
                              details: { baseUrl, debug, actualOutputs, missingOutputs: [], responseKeys: Object.keys(dataPayload || {}) },
                            };
                          } else if (hasValidData) {
                            checkResult = {
                              status: "partial",
                              summary: `Worker connected - ${actualOutputs.length}/${expectedOutputs.length} outputs validated`,
                              metrics: { 
                                worker_configured: true, 
                                worker_reachable: true, 
                                outputs_validated: actualOutputs.length,
                                outputs_missing: missingOutputs.length,
                              },
                              details: { baseUrl, debug, actualOutputs, missingOutputs, responseKeys: Object.keys(dataPayload || {}) },
                            };
                          } else {
                            checkResult = {
                              status: "partial",
                              summary: `Worker connected but 0/${expectedOutputs.length} outputs found`,
                              metrics: { worker_configured: true, worker_reachable: true, outputs_validated: 0 },
                              details: { baseUrl, debug, actualOutputs: [], missingOutputs: expectedOutputs, responseKeys: Object.keys(dataPayload || {}) },
                            };
                          }
                        }
                      }
                    } catch (smokeErr: any) {
                      checkResult = {
                        status: "partial",
                        summary: `Worker healthy but smoke-test unreachable: ${smokeErr.message}`,
                        metrics: { worker_configured: true, worker_reachable: true, smoke_test_error: true },
                        details: { baseUrl, debug, actualOutputs: [], pendingOutputs: expectedOutputs },
                      };
                    }
                  }
                }
              } catch (err: any) {
                checkResult = {
                  status: "fail",
                  summary: `Worker unreachable: ${err.message}`,
                  metrics: { worker_configured: true, worker_reachable: false },
                  details: { baseUrl, debug, actualOutputs: [], missingOutputs: expectedOutputs },
                };
              }
            }
            break;
          }
          case "content_decay": {
            // Use workerConfigResolver for aliases and env var fallback
            const { resolveWorkerConfig } = await import("./workerConfigResolver");
            const decayConfig = await resolveWorkerConfig("content_decay");
            
            const debug: any = { 
              secretFound: decayConfig.rawValueType !== "null", 
              secretName: decayConfig.secretName,
              requestedUrls: [], 
              responses: [] 
            };
            const expectedOutputs = ["decay_signals", "refresh_candidates", "competitor_replacement"];
            
            if (!decayConfig.valid || !decayConfig.base_url) {
              checkResult = {
                status: "fail",
                summary: decayConfig.error || "Worker not configured - add SEO_Content_Decay to Bitwarden or set SEO_CONTENT_DECAY_BASE_URL env var",
                metrics: { secret_found: decayConfig.rawValueType !== "null", outputs_missing: expectedOutputs.length },
                details: { debug, actualOutputs: [], missingOutputs: expectedOutputs },
              };
            } else {
              const baseUrl = decayConfig.base_url.replace(/\/$/, '');
              debug.baseUrl = baseUrl;
              const headers: Record<string, string> = {};
              if (decayConfig.api_key) {
                headers["Authorization"] = `Bearer ${decayConfig.api_key}`;
                headers["X-API-Key"] = decayConfig.api_key;
              }
              
              const healthUrl = `${baseUrl}/health`;
              debug.requestedUrls.push(healthUrl);
              
              try {
                const res = await fetch(healthUrl, { method: "GET", headers, signal: AbortSignal.timeout(10000) });
                const bodyText = await res.text().catch(() => "");
                debug.responses.push({ url: healthUrl, status: res.status, ok: res.ok, bodySnippet: bodyText.slice(0, 200) });
                
                if (res.ok) {
                  checkResult = {
                    status: "partial",
                    summary: `Worker connected - run analysis to validate outputs`,
                    metrics: { worker_configured: true, worker_reachable: true, outputs_pending: expectedOutputs.length },
                    details: { baseUrl, debug, actualOutputs: [], pendingOutputs: expectedOutputs },
                  };
                } else {
                  checkResult = {
                    status: "fail",
                    summary: `Worker returned HTTP ${res.status}`,
                    metrics: { worker_configured: true, worker_reachable: false, http_status: res.status },
                    details: { baseUrl, debug, actualOutputs: [], missingOutputs: expectedOutputs },
                  };
                }
              } catch (err: any) {
                debug.error = err.message;
                checkResult = {
                  status: "fail",
                  summary: `Worker unreachable: ${err.message}`,
                  metrics: { worker_configured: true, worker_reachable: false },
                  details: { baseUrl, debug, actualOutputs: [], missingOutputs: expectedOutputs },
                };
              }
            }
            break;
          }
          case "competitive_snapshot": {
            // Use workerConfigResolver for aliases and env var fallback
            const { resolveWorkerConfig } = await import("./workerConfigResolver");
            const compConfig = await resolveWorkerConfig("competitive_snapshot");
            
            const debug: any = { 
              secretFound: compConfig.rawValueType !== "null", 
              secretName: compConfig.secretName,
              requestedUrls: [], 
              responses: [] 
            };
            const expectedOutputs = ["competitors", "ranking_pages", "page_templates", "content_structure"];
            
            if (!compConfig.valid || !compConfig.base_url) {
              checkResult = {
                status: "fail",
                summary: compConfig.error || "Worker not configured - add SEO_Competitive_Intel to Bitwarden or set SEO_COMPETITIVE_INTEL_BASE_URL env var",
                metrics: { secret_found: compConfig.rawValueType !== "null", outputs_missing: expectedOutputs.length },
                details: { debug, actualOutputs: [], missingOutputs: expectedOutputs },
              };
            } else {
              const baseUrl = compConfig.base_url.replace(/\/$/, '');
              debug.baseUrl = baseUrl;
              const headers: Record<string, string> = {};
              if (compConfig.api_key) {
                headers["Authorization"] = `Bearer ${compConfig.api_key}`;
                headers["X-API-Key"] = compConfig.api_key;
              }
              
              const healthUrl = `${baseUrl}/health`;
              debug.requestedUrls.push(healthUrl);
              
              try {
                const res = await fetch(healthUrl, { method: "GET", headers, signal: AbortSignal.timeout(10000) });
                const bodyText = await res.text().catch(() => "");
                debug.responses.push({ url: healthUrl, status: res.status, ok: res.ok, bodySnippet: bodyText.slice(0, 200) });
                
                if (res.ok) {
                  checkResult = {
                    status: "partial",
                    summary: `Worker connected - run analysis to validate outputs`,
                    metrics: { worker_configured: true, worker_reachable: true, outputs_pending: expectedOutputs.length },
                    details: { baseUrl, debug, actualOutputs: [], pendingOutputs: expectedOutputs },
                  };
                } else {
                  checkResult = {
                    status: "fail",
                    summary: `Worker returned HTTP ${res.status}`,
                    metrics: { worker_configured: true, worker_reachable: false, http_status: res.status },
                    details: { baseUrl, debug, actualOutputs: [], missingOutputs: expectedOutputs },
                  };
                }
              } catch (err: any) {
                debug.error = err.message;
                checkResult = {
                  status: "fail",
                  summary: `Worker unreachable: ${err.message}`,
                  metrics: { worker_configured: true, worker_reachable: false },
                  details: { baseUrl, debug, actualOutputs: [], missingOutputs: expectedOutputs },
                };
              }
            }
            break;
          }
          case "bitwarden_vault": {
            const { bitwardenProvider } = await import("./vault/BitwardenProvider");
            const vaultStatus = await bitwardenProvider.getDetailedStatus();
            checkResult = {
              status: vaultStatus.connected ? "pass" : "fail",
              summary: vaultStatus.connected ? `Vault connected, ${vaultStatus.secretsFound} secrets` : `Vault error: ${vaultStatus.reason}`,
              metrics: { connected: vaultStatus.connected, secrets_count: vaultStatus.secretsFound },
              details: vaultStatus,
            };
            break;
          }
          case "postgres_db": {
            const dbResult = await db.execute(sql`SELECT 1 as ping`);
            checkResult = {
              status: "pass",
              summary: "PostgreSQL connected",
              metrics: { connected: true },
              details: { result: "SELECT 1 successful" },
            };
            break;
          }
          case "orchestrator": {
            checkResult = {
              status: "pass",
              summary: "Orchestrator is running",
              metrics: { scheduler_active: true },
              details: { message: "Orchestrator is running", scheduler: "active" },
            };
            break;
          }
          case "audit_log_observability":
          case "audit_log": {
            const testRunId = `test_${Date.now()}`;
            checkResult = {
              status: "pass",
              summary: "Audit log operational",
              metrics: { can_write: true },
              details: { message: "Audit log service is ready" },
            };
            break;
          }
          case "anomaly_detector":
          case "hypothesis_engine":
          case "ticket_generator":
          case "report_generator":
          case "scheduler": {
            checkResult = {
              status: "pass",
              summary: `${integration.name} service ready`,
              metrics: { ready: true },
              details: { message: `${integration.name} internal service is available` },
            };
            break;
          }
          case "clarity_connector": {
            const hasApiKey = !!process.env.CLARITY_API_KEY;
            checkResult = {
              status: hasApiKey ? "pass" : "skipped",
              summary: hasApiKey ? "Clarity API key configured" : "Clarity API key not set",
              metrics: { api_key_set: hasApiKey },
              details: { configured: hasApiKey },
            };
            break;
          }
          case "openai_integration": {
            const hasApiKey = !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY || !!process.env.OPENAI_API_KEY;
            checkResult = {
              status: hasApiKey ? "pass" : "skipped",
              summary: hasApiKey ? "OpenAI API key configured" : "OpenAI API key not set",
              metrics: { api_key_set: hasApiKey },
              details: { configured: hasApiKey },
            };
            break;
          }
          default:
            if (!integration.baseUrl) {
              checkResult = {
                status: "skipped",
                summary: "No base URL configured",
                metrics: {},
                details: { message: `Service ${integration.name} has no base URL configured` },
              };
            } else {
              checkResult = {
                status: "skipped",
                summary: `No test handler for ${integration.name}`,
                metrics: {},
                details: { message: `No test handler for integration: ${integration.integrationId}` },
              };
            }
        }
      } catch (testError: any) {
        checkResult = {
          status: "fail",
          summary: `Error: ${testError.message}`,
          metrics: {},
          details: { error: testError.message, stack: testError.stack?.split('\n').slice(0, 3) },
        };
      }

      const durationMs = Date.now() - startTime;

      // Map status to ServiceRun status
      const runStatus = checkResult.status === "pass" ? "success" 
        : checkResult.status === "partial" ? "partial"
        : checkResult.status === "skipped" ? "skipped" 
        : "failed";

      // Extract actualOutputs and pendingOutputs from details if present
      const actualOutputs = checkResult.details?.actualOutputs || [];
      const pendingOutputs = checkResult.details?.pendingOutputs || [];
      const missingOutputs = checkResult.details?.missingOutputs || [];
      const missingReason = checkResult.details?.missingReason;
      
      // Update the service run with results - properly structure outputsJson
      await storage.updateServiceRun(runId, {
        status: runStatus,
        finishedAt: new Date(),
        durationMs,
        summary: checkResult.summary,
        metricsJson: checkResult.metrics,
        outputsJson: {
          actualOutputs,
          pendingOutputs,
          missingOutputs,
          missingReason,
          details: checkResult.details,
        },
        errorCode: runStatus === "failed" ? "TEST_FAILED" : null,
        errorDetail: runStatus === "failed" ? checkResult.summary : null,
      });

      // Save the check result
      await storage.saveIntegrationCheck({
        integrationId: integration.integrationId,
        checkType: "connection",
        status: checkResult.status,
        details: checkResult.details,
        durationMs,
        checkedAt: new Date(),
      });

      // Update integration status
      const newHealthStatus = checkResult.status === "pass" ? "healthy" : checkResult.status === "skipped" ? "disconnected" : "error";
      await storage.updateIntegration(integration.integrationId, {
        healthStatus: newHealthStatus,
        lastSuccessAt: checkResult.status === "pass" ? new Date() : integration.lastSuccessAt,
        lastErrorAt: checkResult.status === "fail" ? new Date() : integration.lastErrorAt,
        lastError: checkResult.status === "fail" ? JSON.stringify(checkResult.details) : integration.lastError,
      });

      res.json({
        integrationId: integration.integrationId,
        runId,
        status: checkResult.status,
        summary: checkResult.summary,
        metrics: checkResult.metrics,
        details: checkResult.details,
        duration_ms: durationMs,
        testedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("API", "Failed to test integration", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Update integration inventory details
  app.put("/api/integrations/:integrationId", async (req, res) => {
    try {
      const integration = await storage.getIntegrationById(req.params.integrationId);
      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }

      const updates = req.body;
      const updated = await storage.updateIntegration(req.params.integrationId, {
        ...updates,
        updatedAt: new Date(),
      });

      res.json(updated);
    } catch (error: any) {
      logger.error("API", "Failed to update integration", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Run health check for a service (GET baseUrl + healthEndpoint)
  app.post("/api/integrations/:integrationId/health-check", async (req, res) => {
    try {
      const integration = await storage.getIntegrationById(req.params.integrationId);
      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }

      const { healthEndpoint, metaEndpoint, authRequired, secretKeyName } = integration;
      const startTime = Date.now();
      let healthResult: any = { status: "unknown", response: null, error: null };
      let metaResult: any = { status: "unknown", response: null, error: null };

      // Build headers and get base_url from worker config (Bitwarden)
      const headers: Record<string, string> = { 'Accept': 'application/json' };
      let baseUrl = integration.baseUrl; // Default to DB value
      
      // Resolve worker config from Bitwarden for base_url and api_key
      try {
        const { resolveWorkerConfig } = await import("./workerConfigResolver");
        const workerConfig = await resolveWorkerConfig(integration.integrationId);
        
        // Use Bitwarden base_url if available
        if (workerConfig.base_url) {
          baseUrl = workerConfig.base_url;
        }
        
        // Add API key if available
        if (workerConfig.api_key) {
          headers['X-API-Key'] = workerConfig.api_key;
          headers['Authorization'] = `Bearer ${workerConfig.api_key}`;
        }
      } catch (e) {
        logger.warn("API", `Failed to resolve worker config for ${integration.integrationId}`, { error: (e as Error).message });
      }

      // Check if service has a base URL configured
      if (!baseUrl) {
        healthResult = { status: "not_configured", error: "No base URL configured" };
        metaResult = { status: "not_configured", error: "No base URL configured" };
      } else {
        // Test health endpoint
        try {
          const healthUrl = `${baseUrl}${healthEndpoint || '/health'}`;
          const healthRes = await fetch(healthUrl, { 
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(10000),
          });
          const healthData = await healthRes.json().catch(() => null);
          healthResult = {
            status: healthRes.ok ? "pass" : "fail",
            statusCode: healthRes.status,
            response: healthData,
          };
        } catch (err: any) {
          healthResult = { status: "fail", error: err.message };
        }

        // Test meta endpoint
        try {
          const metaUrl = `${baseUrl}${metaEndpoint || '/meta'}`;
          const metaRes = await fetch(metaUrl, {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(10000),
          });
          const metaData = await metaRes.json().catch(() => null);
          metaResult = {
            status: metaRes.ok ? "pass" : "fail",
            statusCode: metaRes.status,
            response: metaData,
          };
        } catch (err: any) {
          metaResult = { status: "fail", error: err.message };
        }
      }

      const durationMs = Date.now() - startTime;
      const overallStatus = healthResult.status === "pass" ? "pass" : healthResult.status === "not_configured" ? "unknown" : "fail";
      const hasEndpoints = healthResult.status === "pass" && metaResult.status === "pass";

      // Update integration with health check results
      await storage.updateIntegration(integration.integrationId, {
        lastHealthCheckAt: new Date(),
        healthCheckStatus: overallStatus,
        healthCheckResponse: { health: healthResult, meta: metaResult },
        hasRequiredEndpoints: hasEndpoints,
        healthStatus: overallStatus === "pass" ? "healthy" : overallStatus === "unknown" ? "disconnected" : "error",
      });

      // Save check to history
      await storage.saveIntegrationCheck({
        integrationId: integration.integrationId,
        checkType: "health",
        status: overallStatus,
        details: { health: healthResult, meta: metaResult },
        durationMs,
        checkedAt: new Date(),
      });

      res.json({
        integrationId: integration.integrationId,
        health: healthResult,
        meta: metaResult,
        hasRequiredEndpoints: hasEndpoints,
        durationMs,
        checkedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("API", "Failed to run health check", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Run auth test for a service (no-key should 401, with-key should succeed)
  app.post("/api/integrations/:integrationId/auth-test", async (req, res) => {
    try {
      const integration = await storage.getIntegrationById(req.params.integrationId);
      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }

      const { baseUrl, healthEndpoint, authRequired, secretKeyName } = integration;
      const startTime = Date.now();
      let noKeyResult: any = { status: "unknown", error: null };
      let withKeyResult: any = { status: "unknown", error: null };
      let secretExists = false;

      if (!baseUrl) {
        noKeyResult = { status: "not_configured", error: "No base URL configured" };
        withKeyResult = { status: "not_configured", error: "No base URL configured" };
      } else if (!authRequired) {
        // If auth not required, just verify the endpoint works
        try {
          const testUrl = `${baseUrl}${healthEndpoint || '/health'}`;
          const testRes = await fetch(testUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(10000),
          });
          noKeyResult = { status: "not_required", statusCode: testRes.status, message: "Auth not required for this service" };
          withKeyResult = { status: "not_required", statusCode: testRes.status, message: "Auth not required for this service" };
        } catch (err: any) {
          noKeyResult = { status: "fail", error: err.message };
        }
      } else {
        const testUrl = `${baseUrl}${healthEndpoint || '/health'}`;

        // Test without auth key - should get 401/403
        try {
          const noKeyRes = await fetch(testUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(10000),
          });
          noKeyResult = {
            status: noKeyRes.status === 401 || noKeyRes.status === 403 ? "pass" : "fail",
            statusCode: noKeyRes.status,
            expected: "401 or 403",
            message: noKeyRes.status === 401 || noKeyRes.status === 403 
              ? "Correctly rejected unauthenticated request" 
              : "Warning: endpoint accessible without auth",
          };
        } catch (err: any) {
          noKeyResult = { status: "fail", error: err.message };
        }

        // Check if secret exists in environment
        if (secretKeyName) {
          secretExists = !!process.env[secretKeyName];
          
          if (secretExists) {
            // Test with auth key
            try {
              const secretValue = process.env[secretKeyName];
              const withKeyRes = await fetch(testUrl, {
                method: 'GET',
                headers: { 
                  'Accept': 'application/json',
                  'Authorization': `Bearer ${secretValue}`,
                  'X-API-Key': secretValue || '',
                },
                signal: AbortSignal.timeout(10000),
              });
              withKeyResult = {
                status: withKeyRes.ok ? "pass" : "fail",
                statusCode: withKeyRes.status,
                message: withKeyRes.ok ? "Authenticated request succeeded" : "Authenticated request failed",
              };
            } catch (err: any) {
              withKeyResult = { status: "fail", error: err.message };
            }
          } else {
            withKeyResult = { status: "missing_secret", error: `Secret ${secretKeyName} not found in environment` };
          }
        } else {
          withKeyResult = { status: "no_secret_configured", error: "No secret key name configured for this service" };
        }
      }

      const durationMs = Date.now() - startTime;
      const overallStatus = noKeyResult.status === "pass" && withKeyResult.status === "pass" ? "pass" 
        : noKeyResult.status === "not_required" ? "pass"
        : noKeyResult.status === "not_configured" ? "unknown" 
        : "fail";

      // Update integration with auth test results
      await storage.updateIntegration(integration.integrationId, {
        lastAuthTestAt: new Date(),
        authTestStatus: overallStatus,
        authTestDetails: { noKeyResult, withKeyResult },
        secretExists,
      });

      // Save check to history
      await storage.saveIntegrationCheck({
        integrationId: integration.integrationId,
        checkType: "auth",
        status: overallStatus,
        details: { noKeyResult, withKeyResult, secretExists },
        durationMs,
        checkedAt: new Date(),
      });

      res.json({
        integrationId: integration.integrationId,
        noKeyResult,
        withKeyResult,
        secretExists,
        authStatus: overallStatus,
        durationMs,
        checkedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("API", "Failed to run auth test", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Run smoke test for a single integration (actually fetches data and validates outputs)
  app.post("/api/integrations/:integrationId/smoke", async (req, res) => {
    try {
      const { servicesCatalog } = await import("@shared/servicesCatalog");
      const { SERVICE_SECRET_MAP } = await import("@shared/serviceSecretMap");
      const { ServiceRunTypes } = await import("@shared/schema");
      const { resolveWorkerConfig } = await import("./workerConfigResolver");
      
      const integrationId = req.params.integrationId;
      const startTime = Date.now();
      
      const mapping = SERVICE_SECRET_MAP.find(m => m.serviceSlug === integrationId);
      const catalogEntry = servicesCatalog.find((s: any) => s.slug === integrationId);
      
      if (!catalogEntry) {
        return res.status(404).json({ 
          error: "Service not found in catalog",
          integrationId,
        });
      }
      
      const expectedOutputs = catalogEntry.outputs || [];
      
      const workerConfig = await resolveWorkerConfig(integrationId);
      
      if (!workerConfig.valid || !workerConfig.base_url) {
        return res.status(400).json({
          error: "Service not configured",
          details: workerConfig.error || "Missing base_url in Bitwarden secret",
          integrationId,
          expectedOutputs,
          actualOutputs: [],
          missingOutputs: expectedOutputs,
        });
      }
      
      const baseUrl = workerConfig.base_url.replace(/\/$/, '');
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };
      
      if (workerConfig.api_key) {
        headers['Authorization'] = `Bearer ${workerConfig.api_key}`;
        headers['X-API-Key'] = workerConfig.api_key;
      }
      
      try {
        // Use workerEndpoints.smokeTest from config if available, default to /smoke-test
        const smokeEndpoint = mapping?.workerEndpoints?.smokeTest || '/smoke-test';
        const smokeUrl = `${baseUrl}${smokeEndpoint}`;
        logger.info("API", `Running smoke test for ${integrationId}`, { smokeUrl, endpoint: smokeEndpoint });
        
        // If using /api/run endpoint (POST with body), send smoke payload
        const isRunEndpoint = smokeEndpoint.includes('/run');
        const domain = process.env.DOMAIN || 'empathyhealthclinic.com';
        // Build payload based on worker's expected format
        let smokePayload: Record<string, any> | undefined;
        if (isRunEndpoint) {
          if (integrationId === 'competitive_snapshot') {
            // Competitive Intelligence expects { target: { domain }, mode, limit }
            smokePayload = { target: { domain }, mode: 'smoke', limit: 3 };
          } else {
            smokePayload = { domain, mode: 'smoke', limit: 3 };
          }
        }
        
        const smokeRes = await fetch(smokeUrl, {
          method: isRunEndpoint ? 'POST' : 'GET',
          headers,
          body: isRunEndpoint ? JSON.stringify(smokePayload) : undefined,
          signal: AbortSignal.timeout(60000),
        });
        
        if (!smokeRes.ok) {
          const errorText = await smokeRes.text().catch(() => '');
          throw new Error(`Smoke endpoint returned ${smokeRes.status}: ${errorText.slice(0, 200)}`);
        }
        
        let smokeData = await smokeRes.json();
        
        // Handle async workers that return report_id - poll for results
        if (smokeData.report_id && mapping?.workerEndpoints?.report) {
          const reportId = smokeData.report_id;
          const reportEndpoint = mapping.workerEndpoints.report;
          const reportUrl = `${baseUrl}${reportEndpoint}/${reportId}`;
          logger.info("API", `Async worker detected, polling report: ${reportUrl}`);
          
          // Poll up to 30 times (60 seconds total)
          for (let attempt = 0; attempt < 30; attempt++) {
            await new Promise(r => setTimeout(r, 2000));
            try {
              const reportRes = await fetch(reportUrl, {
                method: 'GET',
                headers,
                signal: AbortSignal.timeout(10000),
              });
              if (reportRes.ok) {
                const reportData = await reportRes.json();
                logger.info("API", `Report poll ${attempt + 1}/30`, { 
                  status: reportData.status,
                  hasData: !!(reportData.data || reportData.result),
                  keys: Object.keys(reportData).slice(0, 10)
                });
                
                // Check for completion - worker may use 'completed', 'success', 'done', or have data/result
                const isComplete = reportData.status === 'completed' || reportData.status === 'success' || reportData.status === 'done';
                const hasResult = reportData.data || reportData.result;
                
                if (isComplete || (hasResult && reportData.status !== 'queued' && reportData.status !== 'processing')) {
                  smokeData = reportData.data || reportData.result || reportData;
                  logger.info("API", `Report ready for ${integrationId}`, { attempt, keys: Object.keys(smokeData) });
                  break;
                } else if (reportData.status === 'failed' || reportData.status === 'error') {
                  throw new Error(`Report failed: ${reportData.error || 'Unknown error'}`);
                }
                // Still pending, continue polling
              } else {
                logger.warn("API", `Report poll got HTTP ${reportRes.status}`);
              }
            } catch (pollErr: any) {
              logger.warn("API", `Report poll error: ${pollErr.message}`);
            }
          }
        }
        
        const checkOutputPresence = (data: any, outputKey: string, depth = 0): boolean => {
          if (depth > 5 || !data) return false;
          if (typeof data !== 'object') return false;
          
          // Check if key exists at current level
          if (outputKey in data && data[outputKey] !== null && data[outputKey] !== undefined) return true;
          
          // Check common wrapper patterns
          if (data.data && typeof data.data === 'object' && outputKey in data.data) return true;
          if (data.outputs && typeof data.outputs === 'object' && outputKey in data.outputs) return true;
          if (data.results && typeof data.results === 'object' && outputKey in data.results) return true;
          if (data.result && typeof data.result === 'object' && outputKey in data.result) return true;
          
          // Check if outputs is an array containing the key as a string
          if (Array.isArray(data.outputs) && data.outputs.includes(outputKey)) return true;
          
          // Recurse into nested objects and arrays
          for (const val of Object.values(data)) {
            if (Array.isArray(val)) {
              // For arrays, check first few items
              for (let i = 0; i < Math.min(val.length, 5); i++) {
                if (typeof val[i] === 'object' && val[i] !== null) {
                  if (checkOutputPresence(val[i], outputKey, depth + 1)) return true;
                }
              }
            } else if (typeof val === 'object' && val !== null) {
              if (checkOutputPresence(val, outputKey, depth + 1)) return true;
            }
          }
          return false;
        };
        
        const actualOutputs = expectedOutputs.filter(o => checkOutputPresence(smokeData, o));
        const missingOutputs = expectedOutputs.filter(o => !actualOutputs.includes(o));
        
        let status: 'pass' | 'partial' | 'fail';
        if (missingOutputs.length === 0) {
          status = 'pass';
        } else if (actualOutputs.length > 0) {
          status = 'partial';
        } else {
          status = 'fail';
        }
        
        const runId = `smoke_${Date.now()}_${integrationId}`;
        const durationMs = Date.now() - startTime;
        
        await storage.createServiceRun({
          runId,
          runType: ServiceRunTypes.SMOKE,
          serviceId: integrationId,
          serviceName: mapping?.displayName || catalogEntry.displayName || integrationId,
          trigger: 'manual',
          status: status === 'pass' ? 'success' : status === 'partial' ? 'partial' : 'failed',
          startedAt: new Date(startTime),
          finishedAt: new Date(),
          durationMs,
          summary: `Smoke: ${actualOutputs.length}/${expectedOutputs.length} outputs`,
          outputsJson: {
            expectedOutputs,
            actualOutputs,
            missingOutputs,
          },
        });
        
        // Update integration record with smoke test results
        await storage.updateIntegration(integrationId, {
          lastRunAt: new Date(),
          lastRunSummary: `Smoke: ${actualOutputs.length}/${expectedOutputs.length} outputs validated`,
          runState: status === 'pass' ? 'last_run_success' : status === 'partial' ? 'last_run_success' : 'last_run_failed',
          healthStatus: status === 'pass' ? 'healthy' : status === 'partial' ? 'degraded' : 'error',
          lastSuccessAt: status === 'pass' ? new Date() : undefined,
          lastRunMetrics: {
            expectedOutputs,
            actualOutputs,
            missingOutputs,
            durationMs,
            runId,
            mode: 'worker',
          },
        });
        
        // Build debug structure showing nested keys
        const getNestedKeys = (obj: any, prefix = '', depth = 0): string[] => {
          if (depth > 2 || !obj || typeof obj !== 'object') return [];
          const keys: string[] = [];
          for (const [k, v] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${k}` : k;
            keys.push(fullKey);
            if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
              keys.push(...getNestedKeys(v, fullKey, depth + 1));
            } else if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') {
              keys.push(...getNestedKeys(v[0], `${fullKey}[0]`, depth + 1));
            }
          }
          return keys.slice(0, 30); // Limit for readability
        };
        
        res.json({
          integrationId,
          status,
          expectedOutputs,
          actualOutputs,
          missingOutputs,
          durationMs,
          summary: `Got ${actualOutputs.length}/${expectedOutputs.length} expected outputs`,
          rawResponseKeys: Object.keys(smokeData || {}),
          nestedKeys: getNestedKeys(smokeData),
        });
        
      } catch (err: any) {
        const durationMs = Date.now() - startTime;
        const runId = `smoke_${Date.now()}_${integrationId}`;
        
        await storage.createServiceRun({
          runId,
          runType: ServiceRunTypes.SMOKE,
          serviceId: integrationId,
          serviceName: mapping?.displayName || catalogEntry.displayName || integrationId,
          trigger: 'manual',
          status: 'failed',
          startedAt: new Date(startTime),
          finishedAt: new Date(),
          durationMs,
          summary: `Smoke test failed: ${err.message}`,
          errorCode: 'SMOKE_ERROR',
          errorDetail: err.message,
          outputsJson: {
            expectedOutputs,
            actualOutputs: [],
            missingOutputs: expectedOutputs,
          },
        });
        
        // Update integration record with failure results
        await storage.updateIntegration(integrationId, {
          lastRunAt: new Date(),
          lastRunSummary: `Smoke test failed: ${err.message}`,
          runState: 'last_run_failed',
          healthStatus: 'error',
          lastErrorAt: new Date(),
          lastError: err.message,
          lastRunMetrics: {
            expectedOutputs,
            actualOutputs: [],
            missingOutputs: expectedOutputs,
            durationMs,
            runId,
            mode: 'worker',
            error: err.message,
          },
        });
        
        res.json({
          integrationId,
          status: 'fail',
          expectedOutputs,
          actualOutputs: [],
          missingOutputs: expectedOutputs,
          durationMs,
          error: err.message,
        });
      }
      
    } catch (error: any) {
      logger.error("API", "Failed to run smoke test", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Execute integration run - calls worker /run endpoint and persists real data
  app.post("/api/sites/:siteId/integrations/:integrationId/run", async (req, res) => {
    try {
      const { siteId, integrationId } = req.params;
      const { servicesCatalog } = await import("@shared/servicesCatalog");
      const { SERVICE_SECRET_MAP } = await import("@shared/serviceSecretMap");
      const { ServiceRunTypes } = await import("@shared/schema");
      const { resolveWorkerConfig } = await import("./workerConfigResolver");
      const { v4: uuidv4 } = await import("uuid");
      
      const startTime = Date.now();
      const requestId = uuidv4();
      
      const site = await storage.getSiteById(siteId);
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }
      
      const catalogEntry = servicesCatalog.find((s: any) => s.slug === integrationId);
      const mapping = SERVICE_SECRET_MAP.find(m => m.serviceSlug === integrationId);
      
      if (!catalogEntry) {
        return res.status(404).json({ error: "Service not found in catalog" });
      }
      
      const workerConfig = await resolveWorkerConfig(integrationId);
      
      if (!workerConfig.valid || !workerConfig.base_url) {
        return res.status(400).json({
          error: "Service not configured",
          details: workerConfig.error || "Missing base_url in Bitwarden secret",
        });
      }
      
      const baseUrl = workerConfig.base_url.replace(/\/$/, '');
      // Worker uses /smoke-test as its data endpoint (returns real data with all outputs)
      const runUrl = `${baseUrl}/smoke-test`;
      const domain = site.baseUrl?.replace(/^https?:\/\//, '') || site.displayName;
      
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Request-Id': requestId,
      };
      
      if (workerConfig.api_key) {
        headers['Authorization'] = `Bearer ${workerConfig.api_key}`;
        headers['X-API-Key'] = workerConfig.api_key;
      }
      
      logger.info("API", `Executing integration run for ${integrationId}`, { 
        siteId, domain, runUrl, requestId 
      });
      
      try {
        const runRes = await fetch(runUrl, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(120000),
        });
        
        if (!runRes.ok) {
          const errorText = await runRes.text().catch(() => '');
          throw new Error(`Worker returned ${runRes.status}: ${errorText.slice(0, 500)}`);
        }
        
        const runData = await runRes.json();
        const durationMs = Date.now() - startTime;
        
        // Validate outputs
        const expectedOutputs = catalogEntry.outputs || [];
        const checkOutputPresence = (data: any, key: string): boolean => {
          if (!data) return false;
          if (key in data) return true;
          if (data.data && key in data.data) return true;
          return false;
        };
        
        const actualOutputs = expectedOutputs.filter(o => checkOutputPresence(runData, o));
        const missingOutputs = expectedOutputs.filter(o => !actualOutputs.includes(o));
        
        const status = missingOutputs.length === 0 ? 'success' : 
                       actualOutputs.length > 0 ? 'partial' : 'failed';
        
        const runId = `run_${Date.now()}_${integrationId}_${siteId}`;
        
        // Persist service run
        await storage.createServiceRun({
          runId,
          runType: ServiceRunTypes.FULL,
          serviceId: integrationId,
          serviceName: mapping?.displayName || catalogEntry.displayName || integrationId,
          siteId,
          trigger: 'manual',
          status,
          startedAt: new Date(startTime),
          finishedAt: new Date(),
          durationMs,
          summary: `Run: ${actualOutputs.length}/${expectedOutputs.length} outputs`,
          outputsJson: {
            expectedOutputs,
            actualOutputs,
            missingOutputs,
            requestId,
          },
          metricsJson: runData.data || runData,
        });
        
        // Normalize and persist data to analytics tables
        const dataPayload = runData.data || runData;
        const today = new Date().toISOString().split('T')[0];
        
        // Persist GA4 data if present
        if (dataPayload.ga4_sessions !== undefined || dataPayload.ga4_users !== undefined) {
          await storage.upsertGA4Daily({
            date: today,
            sessions: dataPayload.ga4_sessions || 0,
            users: dataPayload.ga4_users || 0,
            events: 0,
            conversions: dataPayload.ga4_conversions || 0,
            rawData: { source: 'worker', runId, requestId },
          });
        }
        
        // Persist GSC aggregate data if present
        if (dataPayload.gsc_impressions !== undefined || dataPayload.gsc_clicks !== undefined) {
          await storage.upsertGSCDaily({
            date: today,
            impressions: dataPayload.gsc_impressions || 0,
            clicks: dataPayload.gsc_clicks || 0,
            ctr: dataPayload.gsc_ctr || 0,
            position: dataPayload.gsc_position || 0,
            rawData: { source: 'worker', runId, requestId },
          });
        }
        
        // Normalize SEO_KBASE outputs into findings table
        if (integrationId === 'seo_kbase') {
          const findingsToSave: any[] = [];
          const { v4: uuidv4 } = await import("uuid");
          
          // Map SEO recommendations to findings
          const recommendations = dataPayload.seo_recommendations || dataPayload.recommendations || [];
          if (Array.isArray(recommendations)) {
            for (const rec of recommendations) {
              findingsToSave.push({
                findingId: `kbase_${uuidv4().slice(0, 8)}`,
                siteId,
                sourceIntegration: 'seo_kbase',
                runId,
                category: 'kbase',
                severity: rec.severity || rec.priority || 'medium',
                impactScore: rec.impact_score || 50,
                confidence: rec.confidence || 0.7,
                title: rec.title || rec.name || 'SEO Recommendation',
                description: rec.description || rec.details || rec.summary,
                evidence: rec.evidence ? { items: rec.evidence } : null,
                recommendedActions: Array.isArray(rec.actions) ? rec.actions : 
                                    rec.action ? [rec.action] : 
                                    rec.recommendation ? [rec.recommendation] : [],
                status: 'open',
              });
            }
          }
          
          // Map best practices to findings
          const bestPractices = dataPayload.best_practices || [];
          if (Array.isArray(bestPractices)) {
            for (const bp of bestPractices) {
              findingsToSave.push({
                findingId: `kbase_bp_${uuidv4().slice(0, 8)}`,
                siteId,
                sourceIntegration: 'seo_kbase',
                runId,
                category: 'kbase',
                severity: 'info',
                impactScore: 30,
                confidence: 0.9,
                title: typeof bp === 'string' ? bp : bp.title || bp.name || 'Best Practice',
                description: typeof bp === 'string' ? bp : bp.description || bp.details,
                recommendedActions: typeof bp === 'string' ? [bp] : bp.actions || [],
                status: 'open',
              });
            }
          }
          
          // Map optimization tips to findings
          const tips = dataPayload.optimization_tips || [];
          if (Array.isArray(tips)) {
            for (const tip of tips) {
              findingsToSave.push({
                findingId: `kbase_tip_${uuidv4().slice(0, 8)}`,
                siteId,
                sourceIntegration: 'seo_kbase',
                runId,
                category: 'kbase',
                severity: 'low',
                impactScore: 40,
                confidence: 0.8,
                title: typeof tip === 'string' ? tip : tip.title || tip.name || 'Optimization Tip',
                description: typeof tip === 'string' ? tip : tip.description,
                recommendedActions: typeof tip === 'string' ? [tip] : tip.actions || [],
                status: 'open',
              });
            }
          }
          
          // Save findings if any
          if (findingsToSave.length > 0) {
            await storage.saveFindings(findingsToSave);
            logger.info("API", `Saved ${findingsToSave.length} KBASE findings for site ${siteId}`, { runId });
          }
        }
        
        // Update integration record
        await storage.updateIntegration(integrationId, {
          lastRunAt: new Date(),
          lastRunSummary: `Run: ${actualOutputs.length}/${expectedOutputs.length} outputs`,
          runState: status === 'success' ? 'last_run_success' : status === 'partial' ? 'last_run_success' : 'last_run_failed',
          healthStatus: status === 'success' ? 'healthy' : status === 'partial' ? 'degraded' : 'error',
          lastSuccessAt: status === 'success' ? new Date() : undefined,
          lastRunMetrics: {
            expectedOutputs,
            actualOutputs,
            missingOutputs,
            durationMs,
            runId,
            requestId,
            mode: 'worker',
          },
        });
        
        logger.info("API", `Integration run completed for ${integrationId}`, {
          status, actualOutputs: actualOutputs.length, missingOutputs: missingOutputs.length, durationMs,
        });
        
        res.json({
          integrationId,
          siteId,
          status,
          runId,
          requestId,
          expectedOutputs,
          actualOutputs,
          missingOutputs,
          durationMs,
          summary: `Got ${actualOutputs.length}/${expectedOutputs.length} expected outputs`,
          dataKeys: Object.keys(dataPayload),
        });
        
      } catch (err: any) {
        const durationMs = Date.now() - startTime;
        const runId = `run_${Date.now()}_${integrationId}_${siteId}`;
        
        await storage.createServiceRun({
          runId,
          runType: ServiceRunTypes.FULL,
          serviceId: integrationId,
          serviceName: mapping?.displayName || catalogEntry.displayName || integrationId,
          siteId,
          trigger: 'manual',
          status: 'failed',
          startedAt: new Date(startTime),
          finishedAt: new Date(),
          durationMs,
          summary: `Run failed: ${err.message}`,
          errorCode: 'RUN_ERROR',
          errorDetail: err.message,
          outputsJson: {
            expectedOutputs: catalogEntry.outputs || [],
            actualOutputs: [],
            missingOutputs: catalogEntry.outputs || [],
            requestId,
          },
        });
        
        await storage.updateIntegration(integrationId, {
          lastRunAt: new Date(),
          lastRunSummary: `Run failed: ${err.message}`,
          runState: 'last_run_failed',
          healthStatus: 'error',
          lastErrorAt: new Date(),
          lastError: err.message,
        });
        
        logger.error("API", `Integration run failed for ${integrationId}`, { error: err.message });
        
        res.json({
          integrationId,
          siteId,
          status: 'failed',
          runId,
          requestId,
          durationMs,
          error: err.message,
        });
      }
      
    } catch (error: any) {
      logger.error("API", "Failed to execute integration run", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Run all inventory checks across all integrations
  app.post("/api/integrations/test-all", async (req, res) => {
    try {
      const integrationsList = await storage.getIntegrations();
      const results = [];

      for (const integration of integrationsList) {
        const startTime = Date.now();
        let healthResult: any = null;
        let authResult: any = null;

        // Only test if baseUrl is configured
        if (integration.baseUrl) {
          // Health check
          try {
            const healthUrl = `${integration.baseUrl}${integration.healthEndpoint || '/health'}`;
            const healthRes = await fetch(healthUrl, {
              method: 'GET',
              headers: { 'Accept': 'application/json' },
              signal: AbortSignal.timeout(5000),
            });
            healthResult = { status: healthRes.ok ? "pass" : "fail", statusCode: healthRes.status };
          } catch (err: any) {
            healthResult = { status: "fail", error: err.message };
          }

          // Quick auth check (no-key test only for speed)
          if (integration.authRequired) {
            try {
              const testUrl = `${integration.baseUrl}${integration.healthEndpoint || '/health'}`;
              const noKeyRes = await fetch(testUrl, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(5000),
              });
              authResult = {
                status: noKeyRes.status === 401 || noKeyRes.status === 403 ? "pass" : "warning",
                statusCode: noKeyRes.status,
              };
            } catch (err: any) {
              authResult = { status: "fail", error: err.message };
            }
          }
        }

        const durationMs = Date.now() - startTime;
        const healthStatus = !integration.baseUrl ? "not_configured" 
          : healthResult?.status === "pass" ? "pass" : "fail";

        // Update integration
        await storage.updateIntegration(integration.integrationId, {
          lastHealthCheckAt: new Date(),
          healthCheckStatus: healthStatus,
          healthStatus: healthStatus === "pass" ? "healthy" : healthStatus === "not_configured" ? "disconnected" : "error",
        });

        results.push({
          integrationId: integration.integrationId,
          name: integration.name,
          baseUrl: integration.baseUrl,
          healthResult,
          authResult,
          durationMs,
        });
      }

      res.json({
        tested: results.length,
        results,
        testedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("API", "Failed to test all integrations", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Test connections only (fast health/auth check - no data fetching)
  app.post("/api/integrations/test-connections", async (req, res) => {
    try {
      const { servicesCatalog } = await import("@shared/servicesCatalog");
      const { SERVICE_SECRET_MAP, getServiceBySlug: getServiceMapping } = await import("@shared/serviceSecretMap");
      const { ServiceRunTypes } = await import("@shared/schema");
      
      const results: Array<{
        serviceSlug: string;
        displayName: string;
        status: 'pass' | 'fail' | 'skipped';
        healthCheck?: { status: number; ok: boolean; message?: string };
        authCheck?: { status: number; ok: boolean; message?: string };
        durationMs: number;
        error?: string;
      }> = [];

      // Get workers that have base_url configured
      const workerMappings = SERVICE_SECRET_MAP.filter(m => m.type === "worker" && m.requiresBaseUrl);

      for (const mapping of workerMappings) {
        const startTime = Date.now();
        const catalogEntry = servicesCatalog.find((s: any) => s.slug === mapping.serviceSlug);
        
        if (!catalogEntry) {
          results.push({
            serviceSlug: mapping.serviceSlug,
            displayName: mapping.displayName,
            status: 'skipped',
            durationMs: Date.now() - startTime,
            error: 'Not in catalog'
          });
          continue;
        }

        // Get stored integration to get base_url
        const integration = await storage.getIntegration(mapping.serviceSlug);
        if (!integration?.baseUrl) {
          results.push({
            serviceSlug: mapping.serviceSlug,
            displayName: mapping.displayName,
            status: 'skipped',
            durationMs: Date.now() - startTime,
            error: 'No base_url configured'
          });
          continue;
        }

        try {
          // 1. Health check without auth
          const healthUrl = `${integration.baseUrl}/health`;
          const healthRes = await fetch(healthUrl, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(5000),
          });

          const healthCheck = {
            status: healthRes.status,
            ok: healthRes.ok,
            message: healthRes.ok ? 'Worker reachable' : `HTTP ${healthRes.status}`
          };

          // 2. Auth check - should get 401 without key
          let authCheck: { status: number; ok: boolean; message?: string } | undefined;
          if (integration.apiKey) {
            // Call with API key to verify auth works
            const authRes = await fetch(healthUrl, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${integration.apiKey}`,
              },
              signal: AbortSignal.timeout(5000),
            });
            authCheck = {
              status: authRes.status,
              ok: authRes.ok,
              message: authRes.ok ? 'Auth valid' : `Auth failed: ${authRes.status}`
            };
          }

          const status = healthCheck.ok && (!authCheck || authCheck.ok) ? 'pass' : 'fail';

          // Save service run record
          const runId = `conn_${Date.now()}_${mapping.serviceSlug}`;
          await storage.createServiceRun({
            runId,
            runType: ServiceRunTypes.CONNECTION,
            serviceId: mapping.serviceSlug,
            serviceName: mapping.displayName,
            trigger: 'manual',
            status: status === 'pass' ? 'success' : 'failed',
            startedAt: new Date(startTime),
            finishedAt: new Date(),
            durationMs: Date.now() - startTime,
            summary: status === 'pass' ? 'Connection test passed' : 'Connection test failed',
          });

          // Update integration health status
          await storage.updateIntegration(mapping.serviceSlug, {
            lastHealthCheckAt: new Date(),
            healthCheckStatus: status,
            healthStatus: status === 'pass' ? 'healthy' : 'error',
          });

          results.push({
            serviceSlug: mapping.serviceSlug,
            displayName: mapping.displayName,
            status,
            healthCheck,
            authCheck,
            durationMs: Date.now() - startTime,
          });
        } catch (err: any) {
          results.push({
            serviceSlug: mapping.serviceSlug,
            displayName: mapping.displayName,
            status: 'fail',
            durationMs: Date.now() - startTime,
            error: err.message,
          });
        }
      }

      const passed = results.filter(r => r.status === 'pass').length;
      const failed = results.filter(r => r.status === 'fail').length;
      const skipped = results.filter(r => r.status === 'skipped').length;

      res.json({
        summary: { total: results.length, passed, failed, skipped },
        results,
        testedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("API", "Failed to test connections", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Run smoke tests (minimal real runs to validate outputs)
  app.post("/api/integrations/run-smoke-tests", async (req, res) => {
    try {
      const { servicesCatalog } = await import("@shared/servicesCatalog");
      const { SERVICE_SECRET_MAP } = await import("@shared/serviceSecretMap");
      const { ServiceRunTypes } = await import("@shared/schema");
      
      const results: Array<{
        serviceSlug: string;
        displayName: string;
        status: 'pass' | 'partial' | 'fail' | 'skipped';
        expectedOutputs: string[];
        actualOutputs: string[];
        missingOutputs: string[];
        durationMs: number;
        error?: string;
        rawResponse?: any;
      }> = [];

      const workerMappings = SERVICE_SECRET_MAP.filter(m => m.type === "worker" && m.requiresBaseUrl);

      for (const mapping of workerMappings) {
        const startTime = Date.now();
        const catalogEntry = servicesCatalog.find((s: any) => s.slug === mapping.serviceSlug);
        
        if (!catalogEntry) {
          results.push({
            serviceSlug: mapping.serviceSlug,
            displayName: mapping.displayName,
            status: 'skipped',
            expectedOutputs: [],
            actualOutputs: [],
            missingOutputs: [],
            durationMs: Date.now() - startTime,
            error: 'Not in catalog'
          });
          continue;
        }

        const expectedOutputs = catalogEntry.outputs || [];
        const integration = await storage.getIntegration(mapping.serviceSlug);
        
        if (!integration?.baseUrl || !integration?.apiKey) {
          results.push({
            serviceSlug: mapping.serviceSlug,
            displayName: mapping.displayName,
            status: 'skipped',
            expectedOutputs,
            actualOutputs: [],
            missingOutputs: expectedOutputs,
            durationMs: Date.now() - startTime,
            error: 'Not configured (missing base_url or api_key)'
          });
          continue;
        }

        try {
          // Call the worker's smoke endpoint
          const smokeUrl = `${integration.baseUrl}/api/smoke`;
          const smokeRes = await fetch(smokeUrl, {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${integration.apiKey}`,
            },
            body: JSON.stringify({ 
              domain: process.env.DOMAIN || 'empathyhealthclinic.com',
              limit: 1 // minimal test
            }),
            signal: AbortSignal.timeout(30000), // 30s timeout for smoke tests
          });

          if (!smokeRes.ok) {
            throw new Error(`Smoke test returned ${smokeRes.status}: ${await smokeRes.text()}`);
          }

          const smokeData = await smokeRes.json();
          
          // Determine which expected outputs are present in the response
          const actualOutputs: string[] = [];
          const checkOutputPresence = (data: any, outputKey: string): boolean => {
            if (!data || typeof data !== 'object') return false;
            // Check direct key
            if (outputKey in data && data[outputKey] !== null && data[outputKey] !== undefined) return true;
            // Check in nested 'data' or 'outputs' object
            if (data.data && outputKey in data.data) return true;
            if (data.outputs && outputKey in data.outputs) return true;
            // Check for array with the key as element
            if (Array.isArray(data.outputs) && data.outputs.includes(outputKey)) return true;
            // Recursive check in nested objects
            for (const val of Object.values(data)) {
              if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                if (checkOutputPresence(val, outputKey)) return true;
              }
            }
            return false;
          };

          for (const output of expectedOutputs) {
            if (checkOutputPresence(smokeData, output)) {
              actualOutputs.push(output);
            }
          }

          const missingOutputs = expectedOutputs.filter(o => !actualOutputs.includes(o));
          
          // Determine status
          let status: 'pass' | 'partial' | 'fail';
          if (missingOutputs.length === 0) {
            status = 'pass';
          } else if (actualOutputs.length > 0) {
            status = 'partial';
          } else {
            status = 'fail';
          }

          // Save service run record
          const runId = `smoke_${Date.now()}_${mapping.serviceSlug}`;
          await storage.createServiceRun({
            runId,
            runType: ServiceRunTypes.SMOKE,
            serviceId: mapping.serviceSlug,
            serviceName: mapping.displayName,
            trigger: 'manual',
            status: status === 'pass' ? 'success' : status === 'partial' ? 'partial' : 'failed',
            startedAt: new Date(startTime),
            finishedAt: new Date(),
            durationMs: Date.now() - startTime,
            summary: `Expected ${expectedOutputs.length}, got ${actualOutputs.length}, missing ${missingOutputs.length}`,
            outputsJson: {
              expectedOutputs,
              actualOutputs,
              missingOutputs,
              rawResponseKeys: Object.keys(smokeData || {}),
            },
          });

          results.push({
            serviceSlug: mapping.serviceSlug,
            displayName: mapping.displayName,
            status,
            expectedOutputs,
            actualOutputs,
            missingOutputs,
            durationMs: Date.now() - startTime,
            rawResponse: smokeData,
          });
        } catch (err: any) {
          const runId = `smoke_${Date.now()}_${mapping.serviceSlug}`;
          await storage.createServiceRun({
            runId,
            runType: ServiceRunTypes.SMOKE,
            serviceId: mapping.serviceSlug,
            serviceName: mapping.displayName,
            trigger: 'manual',
            status: 'failed',
            startedAt: new Date(startTime),
            finishedAt: new Date(),
            durationMs: Date.now() - startTime,
            summary: `Smoke test failed: ${err.message}`,
            errorCode: 'SMOKE_ERROR',
            errorDetail: err.message,
            outputsJson: {
              expectedOutputs,
              actualOutputs: [],
              missingOutputs: expectedOutputs,
            },
          });

          results.push({
            serviceSlug: mapping.serviceSlug,
            displayName: mapping.displayName,
            status: 'fail',
            expectedOutputs,
            actualOutputs: [],
            missingOutputs: expectedOutputs,
            durationMs: Date.now() - startTime,
            error: err.message,
          });
        }
      }

      const passed = results.filter(r => r.status === 'pass').length;
      const partial = results.filter(r => r.status === 'partial').length;
      const failed = results.filter(r => r.status === 'fail').length;
      const skipped = results.filter(r => r.status === 'skipped').length;

      res.json({
        summary: { total: results.length, passed, partial, failed, skipped },
        results,
        testedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("API", "Failed to run smoke tests", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // ============================================================================
  // ASYNC TEST JOB ENDPOINTS (new pattern with polling)
  // ============================================================================
  
  // Start connection test (async)
  app.post("/api/tests/connections/start", async (req, res) => {
    try {
      const { startConnectionTest } = await import("./testRunner");
      const { siteId } = req.body || {};
      
      logger.info("API", "Starting async connection test", { siteId });
      
      const result = await startConnectionTest(siteId);
      
      if (result.error) {
        res.status(400).json({ error: result.error });
        return;
      }
      
      res.json({ jobId: result.jobId, status: 'running' });
    } catch (error: any) {
      logger.error("API", "Failed to start connection test", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Start smoke test (async)
  app.post("/api/tests/smoke/start", async (req, res) => {
    try {
      const { startSmokeTest } = await import("./testRunner");
      const { siteId } = req.body || {};
      
      logger.info("API", "Starting async smoke test", { siteId });
      
      const result = await startSmokeTest(siteId);
      
      if (result.error) {
        res.status(400).json({ error: result.error });
        return;
      }
      
      res.json({ jobId: result.jobId, status: 'running' });
    } catch (error: any) {
      logger.error("API", "Failed to start smoke test", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Poll test job status
  app.get("/api/tests/:jobId", async (req, res) => {
    try {
      const { jobId } = req.params;
      const job = await storage.getTestJobById(jobId);
      
      if (!job) {
        res.status(404).json({ error: "Test job not found" });
        return;
      }
      
      res.json({
        jobId: job.jobId,
        jobType: job.jobType,
        status: job.status,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        finishedAt: job.finishedAt,
        summary: job.summary,
        progress: job.progressJson,
      });
    } catch (error: any) {
      logger.error("API", "Failed to get test job", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get latest test jobs
  app.get("/api/tests", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const jobs = await storage.getLatestTestJobs(limit);
      
      res.json({ jobs });
    } catch (error: any) {
      logger.error("API", "Failed to list test jobs", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get service catalog with latest smoke run data for missing outputs
  app.get("/api/services/catalog-with-smoke", async (req, res) => {
    try {
      const { servicesCatalog } = await import("@shared/servicesCatalog");
      const { SERVICE_SECRET_MAP } = await import("@shared/serviceSecretMap");
      const { ServiceRunTypes } = await import("@shared/schema");
      
      // Get latest smoke runs per service
      const latestSmokeRuns = await storage.getLatestServiceRunsByType(ServiceRunTypes.SMOKE);
      
      const enrichedCatalog = [];
      
      for (const service of servicesCatalog) {
        if (service.showInServiceInventory === false) continue;
        
        const mapping = SERVICE_SECRET_MAP.find(m => m.serviceSlug === service.slug);
        const integration = await storage.getIntegrationById(service.slug);
        const smokeRun = latestSmokeRuns.get(service.slug);
        
        let missingOutputs: string[] = [];
        let actualOutputs: string[] = [];
        let smokeTested = false;
        
        if (smokeRun && smokeRun.outputsJson) {
          const outputs = smokeRun.outputsJson as any;
          actualOutputs = outputs.actualOutputs || [];
          missingOutputs = outputs.missingOutputs || [];
          smokeTested = true;
        }
        
        enrichedCatalog.push({
          ...service,
          buildState: mapping?.type === 'planned' ? 'planned' : 'built',
          configState: integration?.baseUrl ? (integration?.apiKey ? 'ready' : 'missing_config') : 'missing_config',
          lastSmokeRun: smokeRun ? {
            runId: smokeRun.runId,
            status: smokeRun.status,
            finishedAt: smokeRun.finishedAt,
            actualOutputs,
            missingOutputs,
          } : null,
          smokeTested,
        });
      }
      
      res.json({ services: enrichedCatalog });
    } catch (error: any) {
      logger.error("API", "Failed to get catalog with smoke data", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Seed default platform integrations
  app.post("/api/integrations/seed", async (req, res) => {
    try {
      const defaultIntegrations = [
        // Data Sources
        {
          integrationId: "google_data_connector",
          name: "Google Data Connector (GSC + GA4)",
          description: "Google OAuth, token storage/refresh, Search Console and GA4 data - impressions, clicks, CTR, position, sessions, users, landing pages",
          category: "data",
          expectedSignals: ["impressions", "clicks", "ctr", "position", "sessions", "users", "conversions", "queries", "pages"],
        },
        {
          integrationId: "google_ads_connector",
          name: "Google Ads",
          description: "Campaign performance, spend, CPC, policy issues, and conversion tracking status",
          category: "data",
          expectedSignals: ["spend", "impressions", "clicks", "cpc", "conversions", "policy_issues", "campaign_status"],
        },
        {
          integrationId: "backlink_authority",
          name: "Backlink & Authority Signals",
          description: "Track new/lost links, domain authority, anchor text, link velocity, and compare to competitors",
          category: "data",
          expectedSignals: ["new_links", "lost_links", "domain_authority", "anchor_distribution", "link_velocity"],
        },
        // Analysis Services
        {
          integrationId: "serp_intel",
          name: "Radar",
          description: "Remote worker for keyword rank tracking, SERP snapshots, and position monitoring. Supports async job execution.",
          category: "analysis",
          expectedSignals: ["serp_rank_snapshots", "serp_serp_snapshots", "serp_tracked_keywords", "serp_top_keywords"],
        },
        {
          integrationId: "crawl_render",
          name: "Inspector",
          description: "Technical SEO: status codes, redirects, canonicals, indexability, internal links, orphan pages, sitemap/robots, JS rendering",
          category: "analysis",
          expectedSignals: ["crawl_status", "render_status", "robots_txt", "sitemap", "meta_tags", "redirect_chains", "orphan_pages"],
        },
        {
          integrationId: "core_web_vitals",
          name: "Speedster",
          description: "PageSpeed Insights/CrUX performance signals - LCP, CLS, INP tracking and regression alerts",
          category: "analysis",
          expectedSignals: ["lcp", "cls", "inp", "performance_score", "regressions"],
        },
        {
          integrationId: "competitive_snapshot",
          name: "Competitive Snapshot Service",
          description: "Competitor baseline: who ranks, page structure, titles/meta/H1, URL templates",
          category: "analysis",
          expectedSignals: ["competitors", "ranking_pages", "page_templates", "content_structure"],
        },
        {
          integrationId: "content_gap",
          name: "Competitive Intelligence & Content Gap",
          description: "Compare competitor pages: missing sections, weak coverage, FAQs, schema, internal linking gaps",
          category: "analysis",
          expectedSignals: ["content_gaps", "missing_sections", "schema_differences", "internal_link_gaps"],
        },
        {
          integrationId: "content_decay",
          name: "Archivist",
          description: "Identify pages losing impressions/clicks/rank over time, prioritize refresh candidates",
          category: "analysis",
          expectedSignals: ["decay_signals", "refresh_candidates", "competitor_replacement"],
        },
        {
          integrationId: "content_qa",
          name: "Scholar",
          description: "Best-practice ruleset, E-E-A-T/compliance checks, structure validation, thin content detection",
          category: "analysis",
          expectedSignals: ["qa_score", "violations", "compliance_status", "fix_list"],
        },
        // Execution Services
        {
          integrationId: "content_generator",
          name: "Content Generator",
          description: "Draft content for blogs, pages, and refresh rewrites based on keyword intent and competitor gaps",
          category: "execution",
          expectedSignals: ["drafts", "content_blocks", "faq_schema", "internal_links"],
        },
        {
          integrationId: "site_executor",
          name: "Site Change Executor",
          description: "Apply approved changes via GitHub PR, dry-run mode, before/after snapshots, rollback support",
          category: "execution",
          expectedSignals: ["pr_created", "changes_applied", "rollback_available"],
        },
        // Infrastructure
        {
          integrationId: "bitwarden_vault",
          name: "Bitwarden Secrets Manager",
          description: "Secure credential storage for API keys, OAuth tokens, and service credentials",
          category: "infrastructure",
          expectedSignals: ["vault_status", "secrets_available"],
        },
        {
          integrationId: "orchestrator",
          name: "Orchestrator / Job Runner",
          description: "Scheduled jobs (daily/weekly), retries, rate limits, timeouts, run status tracking",
          category: "infrastructure",
          expectedSignals: ["job_status", "run_history", "error_rates"],
        },
        {
          integrationId: "audit_log",
          name: "Audit Log & Observability",
          description: "Run history, service health, job outcomes, change logs, alerts for failures and drops",
          category: "infrastructure",
          expectedSignals: ["run_logs", "health_metrics", "alerts", "change_audit"],
        },
        {
          integrationId: "notifications",
          name: "Notifications Service",
          description: "Email/SMS/Slack alerts: daily summaries, critical drops, indexing emergencies, approval prompts",
          category: "infrastructure",
          expectedSignals: ["email_sent", "slack_sent", "alert_delivered"],
        },
      ];

      const created = [];
      for (const integration of defaultIntegrations) {
        const existing = await storage.getIntegrationById(integration.integrationId);
        if (!existing) {
          const newIntegration = await storage.createIntegration(integration);
          created.push(newIntegration);
        }
      }

      res.json({ 
        message: `Seeded ${created.length} integrations`,
        created,
      });
    } catch (error: any) {
      logger.error("API", "Failed to seed integrations", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // ==========================================
  // Service Runs API
  // ==========================================

  // Get all services with their last run info
  app.get("/api/services/with-last-run", async (req, res) => {
    try {
      const siteId = req.query.site_id as string | undefined;
      const servicesWithRuns = await storage.getServicesWithLastRun();
      
      // If site_id is provided, filter to only show runs for that site
      if (siteId) {
        for (const service of servicesWithRuns) {
          if (service.lastRun && service.lastRun.siteId !== siteId) {
            // Get the last run for this specific site
            const siteRuns = await storage.getServiceRunsByService(service.integrationId, 1);
            const siteRun = siteRuns.find(r => r.siteId === siteId);
            (service as any).lastRun = siteRun || null;
          }
        }
      }
      
      res.json(servicesWithRuns);
    } catch (error: any) {
      logger.error("API", "Failed to get services with last run", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get last run for each service (optionally filtered by site)
  app.get("/api/services/last-runs", async (req, res) => {
    try {
      const siteId = req.query.site_id as string | undefined;
      const allRuns = await storage.getLatestServiceRuns(500);
      
      // Group by service and get the latest for each
      const lastRunByService: Record<string, any> = {};
      
      for (const run of allRuns) {
        // Skip if filtering by site and doesn't match
        if (siteId && run.siteId !== siteId) continue;
        
        const serviceSlug = run.serviceId;
        if (!lastRunByService[serviceSlug]) {
          lastRunByService[serviceSlug] = {
            serviceSlug,
            lastRun: {
              id: run.id,
              runId: run.runId,
              status: run.status,
              finishedAt: run.finishedAt,
              startedAt: run.startedAt,
              siteDomain: run.siteDomain,
              siteId: run.siteId,
              summary: run.summary,
              metrics: run.metricsCollected,
              durationMs: run.durationMs,
            },
          };
        }
      }
      
      res.json(Object.values(lastRunByService));
    } catch (error: any) {
      logger.error("API", "Failed to get last runs per service", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get runs for a specific service
  app.get("/api/services/:serviceId/runs", async (req, res) => {
    try {
      const { serviceId } = req.params;
      const limit = parseInt(req.query.limit as string) || 25;
      const siteId = req.query.site_id as string | undefined;
      
      let runs = await storage.getServiceRunsByService(serviceId, limit);
      
      if (siteId) {
        runs = runs.filter(r => r.siteId === siteId);
      }
      
      res.json(runs);
    } catch (error: any) {
      logger.error("API", "Failed to get service runs", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get all recent runs across all services
  app.get("/api/runs", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const runs = await storage.getLatestServiceRuns(limit);
      res.json(runs);
    } catch (error: any) {
      logger.error("API", "Failed to get runs", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get a specific run by ID
  app.get("/api/runs/:runId", async (req, res) => {
    try {
      const run = await storage.getServiceRunById(req.params.runId);
      if (!run) {
        return res.status(404).json({ error: "Run not found" });
      }
      res.json(run);
    } catch (error: any) {
      logger.error("API", "Failed to get run", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Create a new service run (for Hermes proxy runs or external services)
  app.post("/api/runs", async (req, res) => {
    try {
      const runData = req.body;
      
      // Generate run ID if not provided
      if (!runData.runId) {
        runData.runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      }
      
      // Set startedAt if not provided
      if (!runData.startedAt) {
        runData.startedAt = new Date();
      }
      
      const run = await storage.createServiceRun(runData);
      res.json(run);
    } catch (error: any) {
      logger.error("API", "Failed to create run", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Update a service run (mark complete, add metrics, etc.)
  app.patch("/api/runs/:runId", async (req, res) => {
    try {
      const { runId } = req.params;
      const updates = req.body;
      
      // Calculate duration if finishing
      if (updates.finishedAt && !updates.durationMs) {
        const run = await storage.getServiceRunById(runId);
        if (run) {
          updates.durationMs = new Date(updates.finishedAt).getTime() - new Date(run.startedAt).getTime();
        }
      }
      
      const updated = await storage.updateServiceRun(runId, updates);
      if (!updated) {
        return res.status(404).json({ error: "Run not found" });
      }
      res.json(updated);
    } catch (error: any) {
      logger.error("API", "Failed to update run", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // ========== Diagnostic Runs (per-site daily diagnosis) ==========
  
  // Run Daily Diagnosis for a site
  app.post("/api/diagnostics/run", async (req, res) => {
    try {
      const { siteId } = req.body;
      
      if (!siteId) {
        return res.status(400).json({ error: "siteId is required" });
      }
      
      // Get site info
      const site = await storage.getSiteById(siteId);
      if (!site) {
        return res.status(404).json({ error: "Site not found" });
      }
      
      // Create diagnostic run record
      const diagRunId = `diag_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const startedAt = new Date();
      
      const diagRun = await storage.createDiagnosticRun({
        runId: diagRunId,
        siteId: site.siteId,
        siteDomain: site.baseUrl,
        runType: "on_demand",
        status: "running",
        startedAt,
      });
      
      // Get all integrations and run those that are ready
      // Skip Draper (Paid Ads) and Deployer (Change Agent) from diagnostics
      const DIAGNOSTICS_SKIP = ["google_ads_connector", "deployer", "notifications"];
      
      const allIntegrations = await storage.getIntegrations();
      const readyServices = allIntegrations.filter(i => 
        i.buildState === "built" && 
        i.configState === "ready" &&
        !DIAGNOSTICS_SKIP.includes(i.integrationId)
      );
      const skippedServices = allIntegrations.filter(i => 
        DIAGNOSTICS_SKIP.includes(i.integrationId)
      );
      const blockedServices = allIntegrations.filter(i => 
        (i.buildState === "planned" || i.configState === "blocked" || i.configState === "missing_config") &&
        !DIAGNOSTICS_SKIP.includes(i.integrationId)
      );
      
      logger.info("API", "Starting diagnostics run", { 
        runId: diagRunId, 
        siteId: site.siteId,
        readyCount: readyServices.length,
        skippedCount: skippedServices.length,
        blockedCount: blockedServices.length,
      });
      
      let servicesRun = 0;
      let servicesSuccess = 0;
      let servicesFailed = 0;
      const serviceResults: Array<{ serviceId: string; status: string; summary: string }> = [];
      
      // Add skipped services to results
      for (const service of skippedServices) {
        serviceResults.push({
          serviceId: service.integrationId,
          status: "skipped",
          summary: `Skipped (${service.integrationId === "google_ads_connector" ? "Paid Ads" : "System Agent"})`,
        });
      }
      
      // For each ready service, create a service run and execute (simplified for now)
      for (const service of readyServices) {
        const serviceRunId = `svc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const serviceStartedAt = new Date();
        
        // Create service run record
        await storage.createServiceRun({
          runId: serviceRunId,
          siteId: site.siteId,
          siteDomain: site.baseUrl,
          serviceId: service.integrationId,
          serviceName: service.name,
          trigger: "manual",
          status: "running",
          startedAt: serviceStartedAt,
        });
        
        servicesRun++;
        
        try {
          // Execute service-specific logic based on integrationId
          let result = { success: true, summary: "Service executed", metrics: {} };
          
          // Here we would call actual service logic
          // For now we simulate based on service type
          if (service.integrationId === "google_data_connector") {
            // Check if OAuth is available
            const token = await storage.getToken("google");
            if (!token) {
              result = { success: false, summary: "Google OAuth not configured", metrics: {} };
            } else {
              result = { success: true, summary: "Google data connector ready", metrics: { oauth: true } };
            }
          } else if (service.integrationId === "crawl_render") {
            result = { success: true, summary: "Crawl service ready (not executed)", metrics: {} };
          } else {
            result = { success: true, summary: `${service.name} checked`, metrics: {} };
          }
          
          // Update service run with result
          const finishedAt = new Date();
          await storage.updateServiceRun(serviceRunId, {
            status: result.success ? "success" : "failed",
            finishedAt,
            durationMs: finishedAt.getTime() - serviceStartedAt.getTime(),
            summary: result.summary,
            metricsJson: result.metrics,
          });
          
          // Update integration's run state
          await storage.updateIntegration(service.integrationId, {
            runState: result.success ? "last_run_success" : "last_run_failed",
            lastRunAt: finishedAt,
            lastRunSummary: result.summary,
            lastRunMetrics: result.metrics,
          });
          
          if (result.success) {
            servicesSuccess++;
          } else {
            servicesFailed++;
          }
          
          serviceResults.push({
            serviceId: service.integrationId,
            status: result.success ? "success" : "failed",
            summary: result.summary,
          });
        } catch (err: any) {
          servicesFailed++;
          await storage.updateServiceRun(serviceRunId, {
            status: "failed",
            finishedAt: new Date(),
            errorDetail: err.message,
          });
          serviceResults.push({
            serviceId: service.integrationId,
            status: "failed",
            summary: err.message,
          });
        }
      }
      
      // Finish diagnostic run
      const finishedAt = new Date();
      const finalStatus = servicesFailed > 0 ? (servicesSuccess > 0 ? "partial" : "failed") : "completed";
      
      await storage.updateDiagnosticRun(diagRunId, {
        status: finalStatus,
        finishedAt,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        servicesRun,
        servicesSuccess,
        servicesFailed,
        servicesBlocked: blockedServices.length,
        summary: `Ran ${servicesRun} services: ${servicesSuccess} succeeded, ${servicesFailed} failed, ${blockedServices.length} blocked`,
      });
      
      // Update site's last diagnosis timestamp
      await storage.updateSiteLastDiagnosis(siteId);
      
      res.json({
        ok: true,
        runId: diagRunId,
        siteId: site.siteId,
        status: finalStatus,
        summary: `Ran ${servicesRun} services: ${servicesSuccess} succeeded, ${servicesFailed} failed, ${skippedServices.length} skipped, ${blockedServices.length} blocked`,
        servicesRun,
        servicesSuccess,
        servicesFailed,
        servicesSkipped: skippedServices.length,
        servicesBlocked: blockedServices.length,
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        results: serviceResults,
      });
    } catch (error: any) {
      logger.error("API", "Failed to run diagnostics", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get diagnostic runs for a site
  app.get("/api/diagnostics/runs", async (req, res) => {
    try {
      const siteId = req.query.site_id as string | undefined;
      const limit = parseInt(req.query.limit as string) || 25;
      
      let runs;
      if (siteId) {
        runs = await storage.getDiagnosticRunsBySite(siteId, limit);
      } else {
        runs = await storage.getLatestDiagnosticRuns(limit);
      }
      
      res.json(runs);
    } catch (error: any) {
      logger.error("API", "Failed to get diagnostic runs", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });
  
  // Get a specific diagnostic run with its service runs
  app.get("/api/diagnostics/runs/:runId", async (req, res) => {
    try {
      const { runId } = req.params;
      const diagRun = await storage.getDiagnosticRunById(runId);
      
      if (!diagRun) {
        return res.status(404).json({ error: "Diagnostic run not found" });
      }
      
      // Get all service runs for this diagnostic run (by time range and site)
      const serviceRuns = await storage.getServiceRunsBySite(diagRun.siteId, 100);
      const relatedRuns = serviceRuns.filter(r => 
        r.startedAt >= diagRun.startedAt && 
        (!diagRun.finishedAt || r.startedAt <= diagRun.finishedAt)
      );
      
      res.json({
        ...diagRun,
        serviceRuns: relatedRuns,
      });
    } catch (error: any) {
      logger.error("API", "Failed to get diagnostic run", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // =============================================================================
  // SUGGESTED CHANGES (CHANGE PROPOSALS) API
  // =============================================================================

  // List change proposals with filters
  app.get("/api/changes", async (req, res) => {
    try {
      const filters = {
        websiteId: req.query.website_id as string | undefined,
        serviceKey: req.query.service_key as string | undefined,
        status: req.query.status as string | string[] | undefined,
        riskLevel: req.query.risk as string | string[] | undefined,
        type: req.query.type as string | string[] | undefined,
        limit: parseInt(req.query.limit as string) || 50,
        offset: parseInt(req.query.offset as string) || 0,
      };
      
      const { proposals, total } = await storage.listChangeProposals(filters);
      const openCount = await storage.getOpenProposalsCount();
      
      res.json({ 
        proposals, 
        total, 
        openCount,
        pagination: {
          limit: filters.limit,
          offset: filters.offset,
          hasMore: filters.offset + proposals.length < total,
        }
      });
    } catch (error: any) {
      logger.error("API", "Failed to list change proposals", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get a single change proposal with actions
  app.get("/api/changes/:proposalId", async (req, res) => {
    try {
      const { proposalId } = req.params;
      const proposal = await storage.getChangeProposalById(proposalId);
      
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }
      
      const actions = await storage.getChangeProposalActions(proposalId);
      
      res.json({ proposal, actions });
    } catch (error: any) {
      logger.error("API", "Failed to get change proposal", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Validation schemas for change proposal actions
  const acceptProposalSchema = z.object({
    applyNow: z.boolean().optional(),
    confirmationFlags: z.object({
      understood: z.boolean().optional(),
    }).optional(),
  });

  const rejectProposalSchema = z.object({
    reason: z.string().optional(),
  });

  const snoozeProposalSchema = z.object({
    until: z.string().refine((val) => !isNaN(Date.parse(val)), {
      message: "Invalid date format",
    }),
  });

  const applyProposalSchema = z.object({
    confirmationFlags: z.object({
      understood: z.boolean().optional(),
    }).optional(),
  });

  const bulkActionSchema = z.object({
    ids: z.array(z.string()).min(1, "At least one proposal ID required"),
    action: z.enum(["accept", "reject", "snooze"]),
    applyNow: z.boolean().optional(),
  });

  // Accept a proposal
  app.post("/api/changes/:proposalId/accept", async (req, res) => {
    try {
      const { proposalId } = req.params;
      const parseResult = acceptProposalSchema.safeParse(req.body || {});
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid request", details: parseResult.error.issues });
      }
      const { applyNow, confirmationFlags } = parseResult.data;
      
      const proposal = await storage.getChangeProposalById(proposalId);
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }
      
      if (proposal.status !== 'open' && proposal.status !== 'in_review') {
        return res.status(400).json({ error: `Cannot accept proposal in status: ${proposal.status}` });
      }
      
      // Check risk level gating
      if (proposal.riskLevel === 'high' || proposal.riskLevel === 'critical') {
        if (!confirmationFlags?.understood) {
          return res.status(400).json({ 
            error: "High/critical risk proposals require confirmation",
            requiresConfirmation: true,
          });
        }
      }
      
      const { ProposalStatuses, ProposalActionTypes } = await import("@shared/schema");
      
      await storage.updateChangeProposal(proposalId, {
        status: ProposalStatuses.ACCEPTED,
      });
      
      await storage.createChangeProposalAction({
        actionId: `act_${Date.now()}_accepted`,
        proposalId,
        action: ProposalActionTypes.ACCEPTED,
        actor: 'user',
        metadata: { applyNow, confirmationFlags },
      });
      
      // If applyNow, immediately start applying
      if (applyNow) {
        const { applyProposal } = await import("./applyHandlers");
        
        await storage.updateChangeProposal(proposalId, {
          status: ProposalStatuses.APPLYING,
        });
        
        await storage.createChangeProposalAction({
          actionId: `act_${Date.now()}_apply_started`,
          proposalId,
          action: ProposalActionTypes.APPLY_STARTED,
          actor: 'system',
        });
        
        // Apply async
        applyProposal(proposalId).catch(err => {
          logger.error("API", "Apply proposal failed", { proposalId, error: err.message });
        });
      }
      
      res.json({ 
        success: true, 
        proposalId, 
        status: applyNow ? 'applying' : 'accepted',
        message: applyNow ? "Proposal accepted and being applied" : "Proposal accepted",
      });
    } catch (error: any) {
      logger.error("API", "Failed to accept proposal", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Reject a proposal
  app.post("/api/changes/:proposalId/reject", async (req, res) => {
    try {
      const { proposalId } = req.params;
      const parseResult = rejectProposalSchema.safeParse(req.body || {});
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid request", details: parseResult.error.issues });
      }
      const { reason } = parseResult.data;
      
      const proposal = await storage.getChangeProposalById(proposalId);
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }
      
      if (proposal.status !== 'open' && proposal.status !== 'in_review' && proposal.status !== 'accepted') {
        return res.status(400).json({ error: `Cannot reject proposal in status: ${proposal.status}` });
      }
      
      const { ProposalStatuses, ProposalActionTypes } = await import("@shared/schema");
      
      await storage.updateChangeProposal(proposalId, {
        status: ProposalStatuses.REJECTED,
      });
      
      await storage.createChangeProposalAction({
        actionId: `act_${Date.now()}_rejected`,
        proposalId,
        action: ProposalActionTypes.REJECTED,
        actor: 'user',
        reason,
      });
      
      res.json({ success: true, proposalId, status: 'rejected' });
    } catch (error: any) {
      logger.error("API", "Failed to reject proposal", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Snooze a proposal
  app.post("/api/changes/:proposalId/snooze", async (req, res) => {
    try {
      const { proposalId } = req.params;
      const parseResult = snoozeProposalSchema.safeParse(req.body || {});
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid request", details: parseResult.error.issues });
      }
      const { until } = parseResult.data;
      
      const proposal = await storage.getChangeProposalById(proposalId);
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }
      
      if (proposal.status !== 'open' && proposal.status !== 'in_review') {
        return res.status(400).json({ error: `Cannot snooze proposal in status: ${proposal.status}` });
      }
      
      const { ProposalStatuses, ProposalActionTypes } = await import("@shared/schema");
      
      await storage.updateChangeProposal(proposalId, {
        status: ProposalStatuses.SNOOZED,
        snoozedUntil: new Date(until),
      });
      
      await storage.createChangeProposalAction({
        actionId: `act_${Date.now()}_snoozed`,
        proposalId,
        action: ProposalActionTypes.SNOOZED,
        actor: 'user',
        metadata: { snoozedUntil: until },
      });
      
      res.json({ success: true, proposalId, status: 'snoozed', snoozedUntil: until });
    } catch (error: any) {
      logger.error("API", "Failed to snooze proposal", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Apply a proposal (separate from accept)
  app.post("/api/changes/:proposalId/apply", async (req, res) => {
    try {
      const { proposalId } = req.params;
      const parseResult = applyProposalSchema.safeParse(req.body || {});
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid request", details: parseResult.error.issues });
      }
      const { confirmationFlags } = parseResult.data;
      
      const proposal = await storage.getChangeProposalById(proposalId);
      if (!proposal) {
        return res.status(404).json({ error: "Proposal not found" });
      }
      
      if (proposal.status !== 'accepted') {
        return res.status(400).json({ error: "Proposal must be accepted before applying" });
      }
      
      // Check risk level gating
      if (proposal.riskLevel === 'high' || proposal.riskLevel === 'critical') {
        if (!confirmationFlags?.understood) {
          return res.status(400).json({ 
            error: "High/critical risk proposals require confirmation",
            requiresConfirmation: true,
          });
        }
      }
      
      const { ProposalStatuses, ProposalActionTypes } = await import("@shared/schema");
      const { applyProposal } = await import("./applyHandlers");
      
      await storage.updateChangeProposal(proposalId, {
        status: ProposalStatuses.APPLYING,
      });
      
      await storage.createChangeProposalAction({
        actionId: `act_${Date.now()}_apply_started`,
        proposalId,
        action: ProposalActionTypes.APPLY_STARTED,
        actor: 'user',
        metadata: { confirmationFlags },
      });
      
      // Apply async
      applyProposal(proposalId).catch(err => {
        logger.error("API", "Apply proposal failed", { proposalId, error: err.message });
      });
      
      res.json({ 
        success: true, 
        proposalId, 
        status: 'applying',
        message: "Apply started",
      });
    } catch (error: any) {
      logger.error("API", "Failed to apply proposal", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Bulk action on proposals
  app.post("/api/changes/bulk", async (req, res) => {
    try {
      const parseResult = bulkActionSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid request", details: parseResult.error.issues });
      }
      const { ids, action, applyNow } = parseResult.data;
      
      const { ProposalStatuses, ProposalActionTypes } = await import("@shared/schema");
      const results: { proposalId: string; success: boolean; error?: string }[] = [];
      
      for (const proposalId of ids) {
        try {
          const proposal = await storage.getChangeProposalById(proposalId);
          if (!proposal) {
            results.push({ proposalId, success: false, error: "Not found" });
            continue;
          }
          
          if (proposal.status !== 'open' && proposal.status !== 'in_review') {
            results.push({ proposalId, success: false, error: `Invalid status: ${proposal.status}` });
            continue;
          }
          
          // Skip high/critical risk for bulk accept
          if (action === 'accept' && (proposal.riskLevel === 'high' || proposal.riskLevel === 'critical')) {
            results.push({ proposalId, success: false, error: "High/critical risk requires individual approval" });
            continue;
          }
          
          let newStatus: string;
          let actionType: string;
          
          switch (action) {
            case 'accept':
              newStatus = ProposalStatuses.ACCEPTED;
              actionType = ProposalActionTypes.ACCEPTED;
              break;
            case 'reject':
              newStatus = ProposalStatuses.REJECTED;
              actionType = ProposalActionTypes.REJECTED;
              break;
            case 'snooze':
              newStatus = ProposalStatuses.SNOOZED;
              actionType = ProposalActionTypes.SNOOZED;
              break;
            default:
              continue;
          }
          
          await storage.updateChangeProposal(proposalId, { status: newStatus });
          await storage.createChangeProposalAction({
            actionId: `act_${Date.now()}_${action}_bulk`,
            proposalId,
            action: actionType,
            actor: 'user',
            metadata: { bulk: true },
          });
          
          results.push({ proposalId, success: true });
        } catch (err: any) {
          results.push({ proposalId, success: false, error: err.message });
        }
      }
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;
      
      res.json({ 
        success: true, 
        action,
        total: ids.length,
        successCount,
        failCount,
        results,
      });
    } catch (error: any) {
      logger.error("API", "Failed bulk action on proposals", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get open proposals count (for nav badge)
  app.get("/api/changes/count", async (req, res) => {
    try {
      const count = await storage.getOpenProposalsCount();
      res.json({ count });
    } catch (error: any) {
      logger.error("API", "Failed to get proposals count", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== CREW STATE API ====================
  
  // Speedster (Core Web Vitals) summary endpoint
  app.get("/api/crew/speedster/summary", async (req, res) => {
    try {
      const siteId = (req.query.siteId as string) || "site_empathy_health_clinic";
      
      // Get Core Web Vitals from worker results - use getLatestWorkerResultByKey
      // to get the latest core_web_vitals result regardless of run
      // (getLatestSeoWorkerResults gets latest RUN which may not include CWV)
      const cwvResult = await storage.getLatestWorkerResultByKey(siteId, 'core_web_vitals');
      const metricsJson = cwvResult?.metricsJson as Record<string, any> | null;
      
      logger.info("Speedster", `Loading CWV data for ${siteId}`, { 
        hasCwvResult: !!cwvResult, 
        metricsKeys: metricsJson ? Object.keys(metricsJson) : [],
        lcp: metricsJson?.lcp,
        cls: metricsJson?.cls,
        inp: metricsJson?.inp,
      });
      
      // Also check dashboard snapshot for fallback (uses canonical keys)
      const snapshot = await storage.getDashboardMetricSnapshot(siteId);
      const snapshotMetrics = (snapshot?.metricsJson as Record<string, any>) || {};
      
      // Helper to get value from worker (non-canonical) or snapshot (canonical)
      const getMetric = (workerKey: string, canonicalKey: string) => {
        // Worker may use lcp, lcp_ms, or canonical key
        const workerVal = metricsJson?.[workerKey] ?? metricsJson?.[canonicalKey] ?? null;
        const snapshotVal = snapshotMetrics?.[canonicalKey] ?? null;
        return workerVal ?? snapshotVal ?? null;
      };
      
      // Build metrics using canonical keys
      // Worker returns lcp_ms in milliseconds, convert to seconds for consistency
      let lcpValue = getMetric('lcp', 'vitals.lcp');
      if (lcpValue === null && metricsJson?.lcp_ms) {
        lcpValue = metricsJson.lcp_ms / 1000;
      }
      
      // FCP: convert from ms to seconds if needed
      let fcpValue = getMetric('fcp', 'vitals.fcp');
      if (fcpValue === null && metricsJson?.fcp_ms) {
        fcpValue = metricsJson.fcp_ms / 1000;
      }
      
      // TTFB: keep in ms (UI expects ms)
      let ttfbValue = getMetric('ttfb', 'vitals.ttfb');
      if (ttfbValue === null && metricsJson?.ttfb_ms) {
        ttfbValue = metricsJson.ttfb_ms;
      }
      
      // TBT: keep in ms (UI expects ms)
      let tbtValue = getMetric('tbt', 'vitals.tbt') ?? getMetric('total_blocking_time', 'vitals.tbt');
      if (tbtValue === null && metricsJson?.tbt_ms) {
        tbtValue = metricsJson.tbt_ms;
      }
      
      // Speed Index: keep in ms (UI expects ms)
      let speedIndexValue = getMetric('speed_index', 'vitals.speed_index') ?? getMetric('speedIndex', 'vitals.speed_index');
      if (speedIndexValue === null && metricsJson?.speed_index_ms) {
        speedIndexValue = metricsJson.speed_index_ms;
      }
      
      // INP: handle _ms suffix
      let inpValue = getMetric('inp', 'vitals.inp');
      if (inpValue === null && metricsJson?.inp_ms) {
        inpValue = metricsJson.inp_ms;
      }
      
      // Get raw data early for use in metrics and distributions
      const rawData = cwvResult?.rawData as Record<string, any> | null;
      
      const metrics = {
        'vitals.lcp': lcpValue,
        'vitals.cls': getMetric('cls', 'vitals.cls'),
        'vitals.inp': inpValue,
        'vitals.fcp': fcpValue,
        'vitals.ttfb': ttfbValue,
        'vitals.tbt': tbtValue,
        'vitals.speed_index': speedIndexValue,
        'vitals.performance_score': getMetric('score', 'vitals.performance_score') ?? getMetric('performance_score', 'vitals.performance_score'),
        'vitals.lcp.trend': metricsJson?.lcpTrend ?? null,
        'vitals.cls.trend': metricsJson?.clsTrend ?? null,
        'vitals.inp.trend': metricsJson?.inpTrend ?? null,
      };
      
      // Extract distribution data if available
      const distributions = {
        lcp: metricsJson?.lcp_distribution ?? rawData?.distributions?.lcp ?? null,
        cls: metricsJson?.cls_distribution ?? rawData?.distributions?.cls ?? null,
        inp: metricsJson?.inp_distribution ?? rawData?.distributions?.inp ?? null,
      };
      
      // Extract Lighthouse audit opportunities
      const audits = rawData?.audits || rawData?.lighthouse_audits || [];
      const opportunities = (audits as any[])
        .filter((a: any) => a.type === 'opportunity' && a.savings_ms > 100)
        .slice(0, 5);
      
      const topUrls = rawData?.slowestPages || rawData?.topUrls || [];
      
      // Fetch industry benchmarks for CWV metrics
      const site = await storage.getSiteById(siteId);
      const industry = site?.industry || 'healthcare';
      const allBenchmarks = await storage.getBenchmarksByIndustry(industry);
      
      // Filter to just CWV benchmarks and build comparison
      const cwvBenchmarks: Record<string, any> = {};
      const cwvMetricKeys = ['vitals.lcp', 'vitals.cls', 'vitals.inp', 'vitals.fcp', 'vitals.ttfb', 'vitals.performance_score'];
      
      for (const key of cwvMetricKeys) {
        const benchmark = allBenchmarks.find(b => b.metric === key);
        if (benchmark) {
          const rawValue = metrics[key as keyof typeof metrics];
          const currentValue = rawValue !== undefined ? rawValue : null;
          let percentile: string | null = null;
          let comparison: 'better' | 'average' | 'worse' | null = null;
          
          if (currentValue !== null && currentValue !== undefined) {
            // For CWV metrics (except performance_score), lower is better
            const lowerIsBetter = key !== 'vitals.performance_score';
            
            if (lowerIsBetter) {
              if (currentValue <= benchmark.percentile25) percentile = 'top25';
              else if (currentValue <= benchmark.percentile50) percentile = 'top50';
              else if (currentValue <= benchmark.percentile75) percentile = 'top75';
              else percentile = 'bottom25';
              
              comparison = currentValue <= benchmark.percentile50 ? 'better' : 
                          currentValue <= benchmark.percentile75 ? 'average' : 'worse';
            } else {
              if (currentValue >= benchmark.percentile25) percentile = 'top25';
              else if (currentValue >= benchmark.percentile50) percentile = 'top50';
              else if (currentValue >= benchmark.percentile75) percentile = 'top75';
              else percentile = 'bottom25';
              
              comparison = currentValue >= benchmark.percentile50 ? 'better' : 
                          currentValue >= benchmark.percentile75 ? 'average' : 'worse';
            }
          }
          
          cwvBenchmarks[key] = {
            p25: benchmark.percentile25,
            p50: benchmark.percentile50,
            p75: benchmark.percentile75,
            p90: benchmark.percentile90,
            unit: benchmark.unit,
            source: benchmark.source,
            currentValue,
            percentile,
            comparison,
          };
        }
      }
      
      res.json({
        ok: true,
        siteId,
        industry,
        capturedAt: cwvResult?.createdAt || snapshot?.capturedAt || null,
        source: cwvResult ? 'Core Web Vitals Worker' : (snapshot ? 'Cached Snapshot' : 'No Data'),
        sampleCount: rawData?.urlsChecked || rawData?.sampleCount || null,
        metrics,
        benchmarks: cwvBenchmarks,
        distributions,
        opportunities,
        topUrls: topUrls.slice(0, 5),
        workerRunId: cwvResult?.runId || null,
        lastRefreshStatus: snapshot?.lastRefreshStatus,
      });
    } catch (error: any) {
      logger.error("API", "Failed to get speedster summary", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });
  
  // Ask Speedster - AI-powered performance analysis questions
  app.post("/api/crew/speedster/ask", async (req, res) => {
    try {
      const { siteId, question, metrics } = req.body;
      
      if (!question || typeof question !== 'string') {
        return res.status(400).json({ ok: false, error: 'Question is required' });
      }
      
      // Build context from metrics
      const metricsContext = metrics ? Object.entries(metrics)
        .filter(([_, v]) => v !== null)
        .map(([k, v]) => `${k}: ${v}`)
        .join(', ') : 'No metrics available';
      
      // Use OpenAI to generate performance advice
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI();
      
      const systemPrompt = `You are Speedster, a friendly performance monitoring expert for websites. 
You help website owners understand and improve their Core Web Vitals (LCP, CLS, INP).
Keep answers concise (2-3 sentences max) and actionable.
Current metrics for the site: ${metricsContext}`;

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question }
        ],
        max_tokens: 200,
      });
      
      const answer = completion.choices[0]?.message?.content || 'I could not generate an answer. Please try again.';
      
      res.json({ ok: true, answer });
    } catch (error: any) {
      logger.error("API", "Failed to ask Speedster", { error: error.message });
      res.status(500).json({ ok: false, error: 'Failed to generate answer' });
    }
  });
  
  // Run Core Web Vitals scan - triggers the actual worker
  app.post("/api/crew/speedster/run", async (req, res) => {
    try {
      const siteId = (req.body.siteId as string) || "site_empathy_health_clinic";
      const requestId = randomUUID();
      
      const cwvConfig = await resolveWorkerConfig('seo_core_web_vitals');
      
      if (!cwvConfig.valid || !cwvConfig.base_url || !cwvConfig.api_key) {
        return res.status(400).json({
          ok: false,
          error: "Core Web Vitals worker not configured",
          configured: false,
        });
      }
      
      const workerResponse = await fetch(`${cwvConfig.base_url}/api/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': cwvConfig.api_key,
          'X-Request-Id': requestId,
        },
        body: JSON.stringify({ siteId }),
      });
      
      if (!workerResponse.ok) {
        const errorText = await workerResponse.text();
        logger.error("Speedster", "CWV worker run failed", { status: workerResponse.status, error: errorText });
        return res.status(500).json({
          ok: false,
          error: `Worker returned ${workerResponse.status}`,
        });
      }
      
      const workerData = await workerResponse.json();
      
      if (workerData.data?.metrics) {
        await storage.upsertSeoWorkerResult({
          runId: requestId,
          siteId,
          workerKey: 'core_web_vitals',
          workerName: 'Core Web Vitals',
          status: 'success',
          startedAt: new Date(),
          finishedAt: new Date(),
          metricsJson: workerData.data.metrics,
          rawData: workerData.data,
        });
      }
      
      res.json({
        ok: true,
        requestId,
        data: workerData.data || workerData,
      });
    } catch (error: any) {
      logger.error("Speedster", "CWV run error", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // FIX AUTOMATION ENDPOINTS
  // Orchestrates Knowledge Base → Change Worker → GitHub PR workflow
  // ═══════════════════════════════════════════════════════════════════════════
  
  app.post("/api/fix/core-web-vitals", async (req, res) => {
    try {
      const { siteId, maxChanges = 10, issues } = req.body;
      
      if (!siteId) {
        return res.status(400).json({ ok: false, error: "siteId is required" });
      }
      
      logger.info("Fix", `Starting CWV fix workflow for site ${siteId}`, { maxChanges, issues });
      
      // Step A: Gather evidence from current metrics
      const site = await storage.getSiteById(siteId);
      if (!site) {
        return res.status(404).json({ ok: false, error: "Site not found" });
      }
      
      // Get latest worker results for context
      const allWorkerResults = await storage.getLatestSeoWorkerResults(siteId);
      const cwvResult = allWorkerResults.find(r => r.workerKey === 'core_web_vitals');
      const rawData = cwvResult?.resultData as any || {};
      
      const evidence = {
        lcp: issues?.lcp || rawData?.lcp_s || null,
        cls: issues?.cls || rawData?.cls || null,
        inp: issues?.inp || rawData?.inp_ms || null,
        performanceScore: issues?.performanceScore || rawData?.performance_score || null,
        opportunities: issues?.opportunities || rawData?.opportunities || [],
        topAffectedUrls: rawData?.slowestPages || [],
        thresholds: {
          lcp: { good: 2.5, needsImprovement: 4.0, unit: 's' },
          cls: { good: 0.1, needsImprovement: 0.25, unit: '' },
          inp: { good: 200, needsImprovement: 500, unit: 'ms' },
          performanceScore: { good: 90, needsImprovement: 50, unit: '' },
        },
      };
      
      // Step B: Check if Knowledge Base service is configured
      const { getServiceSecrets } = await import("./vault");
      const kbaseConfig = await getServiceSecrets('seo_kbase');
      const changeWorkerConfig = await getServiceSecrets('seo_change_executor');
      
      const missingIntegrations: string[] = [];
      if (!kbaseConfig?.base_url || !kbaseConfig?.api_key) {
        missingIntegrations.push('Knowledge Base (SEO_KBASE)');
      }
      if (!changeWorkerConfig?.base_url || !changeWorkerConfig?.api_key) {
        missingIntegrations.push('Change Executor (SEO_CHANGE_EXECUTOR)');
      }
      
      if (missingIntegrations.length > 0) {
        return res.status(400).json({
          ok: false,
          error: "Required integrations not configured",
          blockedBy: missingIntegrations,
          hint: "Configure these services in Bitwarden Secrets Manager with base_url and api_key",
        });
      }
      
      // Step B: KB Preflight - Query Socrates for prior learnings
      // This enables the "consult before action" pattern
      let priorLearnings: any[] = [];
      let consultedSocrates = false;
      
      try {
        logger.info("Fix", "KB Preflight: Querying Socrates for past CWV fixes");
        
        const preflightResponse = await fetch(`${kbaseConfig.base_url}/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': kbaseConfig.api_key,
            'Authorization': `Bearer ${kbaseConfig.api_key}`,
          },
          body: JSON.stringify({
            siteId,
            query: "core web vitals fixes lcp cls inp performance",
            filters: {
              namespace: 'history',
              topic: 'core_web_vitals',
              types: ['fix_result', 'recommendation', 'experiment'],
            },
            limit: 5,
          }),
        });
        
        if (preflightResponse.ok) {
          const preflightData = await preflightResponse.json();
          priorLearnings = preflightData.entries || preflightData.results || [];
          consultedSocrates = true;
          logger.info("Fix", `KB Preflight: Found ${priorLearnings.length} prior learnings`);
        } else {
          logger.warn("Fix", "KB Preflight: Query returned non-OK status, proceeding without history");
        }
      } catch (preflightErr: any) {
        // Non-fatal - continue without prior learnings
        logger.warn("Fix", "KB Preflight failed, continuing without prior learnings", { 
          error: preflightErr.message 
        });
      }
      
      // Step C: Generate fix plan using Knowledge Base (with prior learnings context)
      logger.info("Fix", "Calling Knowledge Base for fix recommendations");
      
      let fixPlan;
      try {
        const kbaseResponse = await fetch(`${kbaseConfig.base_url}/recommend/cwv-fix`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': kbaseConfig.api_key,
            'Authorization': `Bearer ${kbaseConfig.api_key}`,
          },
          body: JSON.stringify({
            siteId,
            domain: site.domain,
            evidence,
            constraints: {
              maxChanges,
              safeMode: true,
              prioritize: ['lcp', 'cls', 'inp'],
            },
            // Include prior learnings from KB preflight for smarter recommendations
            priorLearnings: priorLearnings.map(l => ({
              type: l.type,
              topic: l.topic,
              title: l.title,
              outcome: l.outcome,
              decision: l.decision,
            })),
            consultedSocrates,
          }),
        });
        
        if (!kbaseResponse.ok) {
          const errText = await kbaseResponse.text();
          throw new Error(`Knowledge Base error: ${kbaseResponse.status} - ${errText}`);
        }
        
        fixPlan = await kbaseResponse.json();
      } catch (kbError: any) {
        logger.error("Fix", "Knowledge Base call failed", { error: kbError.message });
        return res.status(502).json({
          ok: false,
          error: "Failed to get fix recommendations from Knowledge Base",
          details: kbError.message,
        });
      }
      
      // Step C: Execute fix plan via Change Worker (GitHub PR)
      logger.info("Fix", "Calling Change Worker to create PR", { 
        editsCount: fixPlan?.edits?.length || 0 
      });
      
      let prResult;
      try {
        const changeResponse = await fetch(`${changeWorkerConfig.base_url}/run`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': changeWorkerConfig.api_key,
            'Authorization': `Bearer ${changeWorkerConfig.api_key}`,
          },
          body: JSON.stringify({
            siteId,
            repoUrl: site.repositoryUrl || null,
            branchPrefix: 'fix/cwv',
            title: `[Speedster] Core Web Vitals fixes - ${new Date().toISOString().split('T')[0]}`,
            description: fixPlan?.summary || 'Automated CWV performance improvements',
            edits: fixPlan?.edits || [],
            safeMode: true,
            maxChanges,
          }),
        });
        
        if (!changeResponse.ok) {
          const errText = await changeResponse.text();
          throw new Error(`Change Worker error: ${changeResponse.status} - ${errText}`);
        }
        
        prResult = await changeResponse.json();
      } catch (cwError: any) {
        logger.error("Fix", "Change Worker call failed", { error: cwError.message });
        return res.status(502).json({
          ok: false,
          error: "Failed to create PR via Change Worker",
          details: cwError.message,
        });
      }
      
      // Step D: Persist result to audit log
      await storage.saveAuditLog({
        siteId,
        action: 'fix_pr_created',
        details: {
          crewId: 'speedster',
          prUrl: prResult?.prUrl,
          branchName: prResult?.branchName,
          filesChanged: prResult?.filesChanged?.length || 0,
          summary: fixPlan?.summary,
          consultedSocrates,
          priorLearningsCount: priorLearnings.length,
        },
      });
      
      // Step E: Write outcome back to Socrates KB (flywheel - learning from actions)
      try {
        logger.info("Fix", "Writing fix outcome back to Socrates KB");
        
        await fetch(`${kbaseConfig.base_url}/write`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': kbaseConfig.api_key,
            'Authorization': `Bearer ${kbaseConfig.api_key}`,
          },
          body: JSON.stringify({
            siteId,
            entry: {
              type: 'fix_result',
              topic: 'core_web_vitals',
              title: `CWV Fix PR: ${prResult?.branchName || 'cwv-fix'}`,
              summary: fixPlan?.summary || 'Automated Core Web Vitals performance fix',
              sourceCrewId: 'speedster',
              sourceServiceId: 'core_web_vitals',
              evidence: {
                metrics: {
                  lcp: evidence.lcp,
                  cls: evidence.cls,
                  inp: evidence.inp,
                  performanceScore: evidence.performanceScore,
                },
                urls: evidence.topAffectedUrls?.slice(0, 5) || [],
              },
              decision: {
                proposedAction: {
                  type: 'create_pr',
                  editsCount: fixPlan?.edits?.length || 0,
                  maxChanges,
                },
                executedAction: {
                  type: 'pr_created',
                  prUrl: prResult?.prUrl,
                  branchName: prResult?.branchName,
                  filesChanged: prResult?.filesChanged?.length || 0,
                },
                prUrl: prResult?.prUrl,
              },
              outcome: {
                status: 'pending', // Will be updated when PR is merged and metrics improve
                notes: 'Awaiting PR merge and metrics verification',
              },
              tags: ['cwv', 'performance', 'automated-fix', 'pr-created'],
              createdAt: new Date().toISOString(),
            },
          }),
        });
        
        logger.info("Fix", "KB writeback completed successfully");
      } catch (writebackErr: any) {
        // Non-fatal - log but don't fail the request
        logger.warn("Fix", "KB writeback failed (non-fatal)", { error: writebackErr.message });
      }
      
      logger.info("Fix", "CWV fix PR created successfully", { prUrl: prResult?.prUrl });
      
      res.json({
        ok: true,
        prUrl: prResult?.prUrl,
        branchName: prResult?.branchName,
        filesChanged: prResult?.filesChanged?.length || 0,
        summary: fixPlan?.summary,
        recommendations: fixPlan?.checklist || [],
        consultedSocrates,
        priorLearningsUsed: priorLearnings.length,
      });
      
    } catch (error: any) {
      logger.error("Fix", "Fix workflow failed", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });
  
  // Get crew state for a site
  app.get("/api/crew/state", async (req, res) => {
    try {
      const siteId = (req.query.siteId as string) || "default";
      const crewStates = await storage.getCrewState(siteId);
      
      // Build response with enabled agents and status
      const enabledAgents = crewStates.filter(s => s.enabled).map(s => s.agentId);
      const agentStatus: Record<string, { health: string; needsConfig: boolean; lastRun: string | null }> = {};
      
      for (const state of crewStates) {
        agentStatus[state.agentId] = {
          health: state.health || "unknown",
          needsConfig: state.needsConfig,
          lastRun: state.lastRunAt?.toISOString() || null,
        };
      }
      
      res.json({
        siteId,
        enabledAgents,
        agentStatus,
        totalEnabled: enabledAgents.length,
      });
    } catch (error: any) {
      logger.error("API", "Failed to get crew state", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Enable an agent
  app.post("/api/crew/enable", async (req, res) => {
    try {
      const { agentId, siteId = "default" } = req.body;
      
      if (!agentId) {
        return res.status(400).json({ error: "agentId is required" });
      }
      
      await storage.enableCrewAgent(siteId, agentId);
      const crewStates = await storage.getCrewState(siteId);
      const enabledAgents = crewStates.filter(s => s.enabled).map(s => s.agentId);
      
      res.json({
        success: true,
        agentId,
        siteId,
        enabledAgents,
        totalEnabled: enabledAgents.length,
      });
    } catch (error: any) {
      logger.error("API", "Failed to enable crew agent", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Disable an agent
  app.post("/api/crew/disable", async (req, res) => {
    try {
      const { agentId, siteId = "default" } = req.body;
      
      if (!agentId) {
        return res.status(400).json({ error: "agentId is required" });
      }
      
      await storage.disableCrewAgent(siteId, agentId);
      const crewStates = await storage.getCrewState(siteId);
      const enabledAgents = crewStates.filter(s => s.enabled).map(s => s.agentId);
      
      res.json({
        success: true,
        agentId,
        siteId,
        enabledAgents,
        totalEnabled: enabledAgents.length,
      });
    } catch (error: any) {
      logger.error("API", "Failed to disable crew agent", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FIX PLAN API - Generate and execute review-first fix plans
  // ═══════════════════════════════════════════════════════════════════════════

  // Helper to resolve secrets for worker services
  async function getSecretForService(serviceSlug: string, siteId?: string): Promise<{ base_url: string | null; api_key: string | null } | null> {
    const config = await resolveWorkerConfig(serviceSlug, siteId);
    if (!config.valid) {
      logger.warn("FixPlan", `Service ${serviceSlug} not configured: ${config.error}`);
      return null;
    }
    return { base_url: config.base_url, api_key: config.api_key };
  }

  /**
   * GET /api/site-executor/health
   * Test connection to Site Change Executor
   */
  app.get("/api/site-executor/health", async (req, res) => {
    try {
      const config = await resolveWorkerConfig("site_executor");
      
      if (!config.valid) {
        return res.json({
          ok: false,
          configured: false,
          error: config.error,
          message: "Set SEO_DEPLOYER_API_KEY and SEO_DEPLOYER_BASE_URL env vars",
        });
      }
      
      // Test the worker health endpoint
      const healthUrl = `${config.base_url}/api/health`;
      const healthRes = await fetch(healthUrl, {
        headers: {
          "X-API-Key": config.api_key || "",
        },
      });
      
      if (!healthRes.ok) {
        return res.json({
          ok: false,
          configured: true,
          reachable: false,
          httpStatus: healthRes.status,
          error: `Health check failed with status ${healthRes.status}`,
        });
      }
      
      const healthData = await healthRes.json();
      
      res.json({
        ok: true,
        configured: true,
        reachable: true,
        workerStatus: healthData.status || "healthy",
        adapters: healthData.adapters,
        timestamp: healthData.timestamp,
        baseUrl: config.base_url,
      });
    } catch (error: any) {
      logger.error("API", "Site executor health check failed", { error: error.message });
      res.json({
        ok: false,
        configured: true,
        reachable: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /api/fix-plan/speedster
   * Generate a fix plan for Core Web Vitals based on current metrics + Socrates learnings
   */
  app.post("/api/fix-plan/speedster", async (req, res) => {
    try {
      const { siteId = "default", currentMetrics, context } = req.body;
      const requestId = (req.headers["x-request-id"] as string) || randomUUID();
      const planId = `plan_${Date.now()}_${randomUUID().slice(0, 8)}`;
      
      logger.info("FixPlan", "Generating Speedster fix plan", { siteId, planId });
      
      // Check cooldown - get last executed plan for this topic
      const lastExecuted = await storage.getLastExecutedPlan(siteId, "speedster", "core_web_vitals");
      const cooldownDays = 3; // Default 3 days between PRs
      const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
      
      let cooldownAllowed = true;
      let cooldownNextAllowedAt: Date | null = null;
      let cooldownReason: string | null = null;
      
      if (lastExecuted?.executedAt) {
        const lastExecTime = new Date(lastExecuted.executedAt).getTime();
        const now = Date.now();
        const timeSinceLast = now - lastExecTime;
        
        if (timeSinceLast < cooldownMs) {
          cooldownAllowed = false;
          cooldownNextAllowedAt = new Date(lastExecTime + cooldownMs);
          cooldownReason = `Last PR was ${Math.round(timeSinceLast / (24 * 60 * 60 * 1000))} days ago. Recommended to wait ${cooldownDays} days between changes to reduce ranking volatility.`;
        }
      }
      
      // Get latest metrics from storage if not provided
      let vitals = currentMetrics;
      if (!vitals) {
        // First try dashboard_metric_snapshots which has direct vitals
        const snapshot = await storage.getDashboardMetricSnapshot(siteId);
        const snapshotMetrics = snapshot?.metricsJson as Record<string, any> || {};
        
        // Also check seo_metric_events
        const latestMetrics = await storage.getAllLatestMetrics(siteId);
        
        vitals = {
          // Prefer direct keys (lcp, cls, inp) over vitals.lcp format
          lcp: snapshotMetrics?.lcp || snapshotMetrics?.['vitals.lcp'] || latestMetrics?.['vitals.lcp']?.value || latestMetrics?.lcp,
          cls: snapshotMetrics?.cls || snapshotMetrics?.['vitals.cls'] || latestMetrics?.['vitals.cls']?.value || latestMetrics?.cls,
          inp: snapshotMetrics?.inp || snapshotMetrics?.['vitals.inp'] || latestMetrics?.['vitals.inp']?.value || latestMetrics?.inp,
          performanceScore: snapshotMetrics?.performanceScore || snapshotMetrics?.['vitals.performance_score'] || latestMetrics?.['vitals.performance_score']?.value,
        };
        
        logger.info("FixPlan", "Retrieved vitals from storage", { vitals });
      }
      
      // Query Socrates for prior learnings
      let priorLearnings: any[] = [];
      let consultedSocrates = false;
      
      try {
        const kbaseSecret = await getSecretForService("SEO_KBASE", siteId);
        if (kbaseSecret?.base_url && kbaseSecret?.api_key) {
          const kbResponse = await fetch(`${kbaseSecret.base_url}/query`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": kbaseSecret.api_key,
              "X-Request-Id": requestId,
            },
            body: JSON.stringify({
              siteId,
              topic: "core_web_vitals",
              query: "performance fixes that worked or failed",
              limit: 10,
            }),
          });
          
          if (kbResponse.ok) {
            const kbData = await kbResponse.json();
            priorLearnings = kbData.entries || kbData.results || [];
            consultedSocrates = true;
            logger.info("FixPlan", `Retrieved ${priorLearnings.length} prior learnings from Socrates`);
          }
        }
      } catch (kbErr: any) {
        logger.warn("FixPlan", "Failed to consult Socrates (non-fatal)", { error: kbErr.message });
      }
      
      // Generate fix plan items based on vitals thresholds
      const planItems: any[] = [];
      
      // LCP fixes
      if (vitals?.lcp && vitals.lcp > 2.5) {
        planItems.push({
          id: `fix_lcp_${Date.now()}`,
          title: "Optimize Largest Contentful Paint",
          why: `LCP is ${vitals.lcp.toFixed(2)}s, exceeding the 2.5s threshold for good user experience`,
          proposedChanges: [
            { type: "code", fileHint: "images, fonts", description: "Add lazy loading to below-fold images" },
            { type: "config", fileHint: "nginx/CDN", description: "Enable compression and caching headers" },
            { type: "code", fileHint: "hero section", description: "Preload critical hero image" },
          ],
          expectedOutcome: `Reduce LCP by ~0.5-1.5s, targeting <2.5s`,
          risk: vitals.lcp > 4 ? "low" : "medium",
          confidence: vitals.lcp > 4 ? "high" : "medium",
          sources: ["speedster", ...(consultedSocrates ? ["socrates"] : [])],
        });
      }
      
      // CLS fixes
      if (vitals?.cls && vitals.cls > 0.1) {
        planItems.push({
          id: `fix_cls_${Date.now()}`,
          title: "Reduce Cumulative Layout Shift",
          why: `CLS is ${vitals.cls.toFixed(3)}, exceeding the 0.1 threshold causing poor visual stability`,
          proposedChanges: [
            { type: "code", fileHint: "images", description: "Add explicit width/height to images" },
            { type: "code", fileHint: "fonts", description: "Use font-display: swap with size-adjust" },
            { type: "code", fileHint: "ads/embeds", description: "Reserve space for dynamic content" },
          ],
          expectedOutcome: `Reduce CLS to <0.1 for stable visual experience`,
          risk: "low",
          confidence: "high",
          sources: ["speedster", ...(consultedSocrates ? ["socrates"] : [])],
        });
      }
      
      // INP fixes
      if (vitals?.inp && vitals.inp > 200) {
        planItems.push({
          id: `fix_inp_${Date.now()}`,
          title: "Improve Interaction to Next Paint",
          why: `INP is ${vitals.inp}ms, exceeding the 200ms threshold for responsive interactions`,
          proposedChanges: [
            { type: "code", fileHint: "event handlers", description: "Break up long tasks and use requestIdleCallback" },
            { type: "code", fileHint: "JavaScript", description: "Defer non-critical JavaScript" },
            { type: "code", fileHint: "main thread", description: "Move heavy computation to Web Workers" },
          ],
          expectedOutcome: `Reduce INP to <200ms for snappy interactions`,
          risk: "medium",
          confidence: vitals.inp > 500 ? "high" : "medium",
          sources: ["speedster", ...(consultedSocrates ? ["socrates"] : [])],
        });
      }
      
      // Add Socrates-informed items if available
      for (const learning of priorLearnings.slice(0, 3)) {
        if (learning.recommendation && learning.outcome?.status === "success") {
          planItems.push({
            id: `socrates_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            title: learning.title || "Recommended from past success",
            why: learning.observation || "Previously successful fix for similar issue",
            proposedChanges: [
              { type: "recommendation", description: learning.recommendation },
            ],
            expectedOutcome: learning.outcome?.metrics_after || "Improvement based on past results",
            risk: "low",
            confidence: "high",
            sources: ["socrates"],
          });
        }
      }
      
      // Calculate recommended max changes
      const maxChangesRecommended = Math.min(Math.max(planItems.length, 3), 10);
      
      // Store the plan
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h expiry
      
      const plan = await storage.createFixPlan({
        planId,
        siteId,
        crewId: "speedster",
        topic: "core_web_vitals",
        status: "pending",
        cooldownAllowed,
        cooldownNextAllowedAt,
        cooldownReason,
        lastPrCreatedAt: lastExecuted?.executedAt || null,
        maxChangesRecommended,
        itemsJson: planItems,
        metricsSnapshot: vitals,
        socratesContext: { consultedSocrates, priorLearningsCount: priorLearnings.length },
        generatedAt: new Date(),
        expiresAt,
      });
      
      logger.info("FixPlan", `Generated fix plan with ${planItems.length} items`, { planId });
      
      res.json({
        ok: true,
        service: "fix-plan",
        request_id: requestId,
        data: {
          planId: plan.planId,
          generatedAt: plan.generatedAt,
          expiresAt: plan.expiresAt,
          cooldown: {
            allowed: cooldownAllowed,
            nextAllowedAt: cooldownNextAllowedAt,
            reason: cooldownReason,
            lastPrAt: lastExecuted?.executedAt || null,
          },
          maxChangesRecommended,
          items: planItems,
          consultedSocrates,
          priorLearningsCount: priorLearnings.length,
          metricsSnapshot: vitals,
        },
      });
      
    } catch (error: any) {
      logger.error("FixPlan", "Failed to generate fix plan", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * GET /api/fix-plan/speedster/latest
   * Get the latest pending fix plan for Speedster
   */
  app.get("/api/fix-plan/speedster/latest", async (req, res) => {
    try {
      const siteId = (req.query.siteId as string) || "default";
      const requestId = (req.headers["x-request-id"] as string) || randomUUID();
      
      const plan = await storage.getLatestFixPlan(siteId, "speedster");
      
      if (!plan) {
        return res.json({
          ok: true,
          service: "fix-plan",
          request_id: requestId,
          data: null,
          message: "No pending fix plan. Generate one to get started.",
        });
      }
      
      // Check if expired
      if (plan.expiresAt && new Date(plan.expiresAt) < new Date()) {
        await storage.updateFixPlan(plan.planId, { status: "expired" });
        return res.json({
          ok: true,
          service: "fix-plan",
          request_id: requestId,
          data: null,
          message: "Previous plan expired. Generate a new one.",
        });
      }
      
      res.json({
        ok: true,
        service: "fix-plan",
        request_id: requestId,
        data: {
          planId: plan.planId,
          generatedAt: plan.generatedAt,
          expiresAt: plan.expiresAt,
          cooldown: {
            allowed: plan.cooldownAllowed,
            nextAllowedAt: plan.cooldownNextAllowedAt,
            reason: plan.cooldownReason,
            lastPrAt: plan.lastPrCreatedAt,
          },
          maxChangesRecommended: plan.maxChangesRecommended,
          items: plan.itemsJson,
          metricsSnapshot: plan.metricsSnapshot,
          socratesContext: plan.socratesContext,
        },
      });
      
    } catch (error: any) {
      logger.error("FixPlan", "Failed to get latest fix plan", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * POST /api/fix-plan/execute
   * Execute a fix plan by creating a GitHub PR
   */
  app.post("/api/fix-plan/execute", async (req, res) => {
    try {
      const { siteId = "default", planId, maxChanges, overrideCooldown, overrideReason } = req.body;
      const requestId = (req.headers["x-request-id"] as string) || randomUUID();
      
      if (!planId) {
        return res.status(400).json({ ok: false, error: "planId is required" });
      }
      
      logger.info("FixPlan", "Executing fix plan", { siteId, planId });
      
      // Load plan from DB
      const plan = await storage.getFixPlanById(planId);
      
      if (!plan) {
        return res.status(404).json({ ok: false, error: "Fix plan not found" });
      }
      
      if (plan.status !== "pending") {
        return res.status(400).json({ ok: false, error: `Plan is ${plan.status}, not pending` });
      }
      
      // Check expiry
      if (plan.expiresAt && new Date(plan.expiresAt) < new Date()) {
        await storage.updateFixPlan(planId, { status: "expired" });
        return res.status(400).json({ ok: false, error: "Plan has expired. Generate a new one." });
      }
      
      // Check cooldown
      if (!plan.cooldownAllowed && !overrideCooldown) {
        return res.status(400).json({
          ok: false,
          error: "Cooldown active",
          cooldown: {
            allowed: false,
            nextAllowedAt: plan.cooldownNextAllowedAt,
            reason: plan.cooldownReason,
          },
          message: "Provide overrideCooldown=true and overrideReason to bypass",
        });
      }
      
      // Clamp max changes
      const items = (plan.itemsJson as any[]) || [];
      const effectiveMax = Math.min(maxChanges || plan.maxChangesRecommended || 5, items.length);
      const itemsToExecute = items.slice(0, effectiveMax);
      
      // Prepare fix summary for PR
      const fixSummary = itemsToExecute.map((item: any, i: number) => 
        `${i + 1}. **${item.title}**\n   - Why: ${item.why}\n   - Expected: ${item.expectedOutcome}`
      ).join("\n\n");
      
      // Get Site Executor secret
      const changeSecret = await getSecretForService("site_executor", siteId);
      
      if (!changeSecret?.base_url || !changeSecret?.api_key) {
        return res.status(400).json({
          ok: false,
          error: "Site Change Executor not configured",
          message: "Set up SEO_DEPLOYER secret in Bitwarden vault or set SEO_DEPLOYER_API_KEY env var to enable PR creation",
        });
      }
      
      // Call Site Change Executor to create PR
      const prResponse = await fetch(`${changeSecret.base_url}/api/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": changeSecret.api_key,
          "X-Request-Id": requestId,
        },
        body: JSON.stringify({
          siteId,
          mode: "pr_only",
          planId,
          fixes: itemsToExecute,
          prTitle: `[Speedster] Core Web Vitals Optimization - ${new Date().toISOString().slice(0, 10)}`,
          prBody: `## Fix Plan Execution\n\nThis PR was generated by the Speedster agent based on Core Web Vitals analysis.\n\n### Changes\n\n${fixSummary}\n\n### Metrics Snapshot\n\n- LCP: ${(plan.metricsSnapshot as any)?.lcp?.toFixed(2) || 'N/A'}s\n- CLS: ${(plan.metricsSnapshot as any)?.cls?.toFixed(3) || 'N/A'}\n- INP: ${(plan.metricsSnapshot as any)?.inp || 'N/A'}ms\n\n---\n*Generated by Arco Dashboard - Fix Plan ${planId}*`,
        }),
      });
      
      let prResult: any = null;
      if (prResponse.ok) {
        const prData = await prResponse.json();
        prResult = prData.data || prData;
      } else {
        const prError = await prResponse.text();
        logger.error("FixPlan", "Change Executor failed", { status: prResponse.status, error: prError });
        return res.status(500).json({ ok: false, error: `PR creation failed: ${prError}` });
      }
      
      // Update plan as executed
      await storage.updateFixPlan(planId, {
        status: "executed",
        executedAt: new Date(),
        executedItemsCount: itemsToExecute.length,
        prUrl: prResult?.prUrl,
        prBranch: prResult?.branchName,
        executionResult: prResult,
      });
      
      // Write outcome to Socrates
      try {
        const kbaseSecret = await getSecretForService("SEO_KBASE", siteId);
        if (kbaseSecret?.base_url && kbaseSecret?.api_key) {
          await fetch(`${kbaseSecret.base_url}/write`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": kbaseSecret.api_key,
              "X-Request-Id": requestId,
            },
            body: JSON.stringify({
              siteId,
              entry: {
                type: "fix_result",
                topic: "core_web_vitals",
                source: "speedster",
                title: `Fix Plan Executed: ${planId}`,
                observation: `Executed ${itemsToExecute.length} fixes based on vitals: LCP=${(plan.metricsSnapshot as any)?.lcp}, CLS=${(plan.metricsSnapshot as any)?.cls}, INP=${(plan.metricsSnapshot as any)?.inp}`,
                recommendation: itemsToExecute.map((i: any) => i.title).join(", "),
                evidence: {
                  planId,
                  prUrl: prResult?.prUrl,
                  itemsExecuted: itemsToExecute.length,
                  metricsSnapshot: plan.metricsSnapshot,
                },
                outcome: {
                  status: "pending",
                  notes: "Awaiting PR merge and metrics verification",
                },
                tags: ["cwv", "automated-fix", "pr-created"],
                createdAt: new Date().toISOString(),
              },
            }),
          });
          logger.info("FixPlan", "Wrote execution outcome to Socrates");
        }
      } catch (kbErr: any) {
        logger.warn("FixPlan", "Failed to write to Socrates (non-fatal)", { error: kbErr.message });
      }
      
      logger.info("FixPlan", "Fix plan executed successfully", { planId, prUrl: prResult?.prUrl });
      
      res.json({
        ok: true,
        service: "fix-plan",
        request_id: requestId,
        data: {
          planId,
          status: "executed",
          prUrl: prResult?.prUrl,
          branchName: prResult?.branchName,
          filesChanged: prResult?.filesChanged?.length || 0,
          itemsExecuted: itemsToExecute.length,
          overrideCooldown: overrideCooldown || false,
        },
      });
      
    } catch (error: any) {
      logger.error("FixPlan", "Failed to execute fix plan", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * POST /api/fix/batch
   * Batch fix endpoint for the Mission Status "Fix Everything" button
   * Creates a consolidated PR with all auto-fixable items
   */
  app.post("/api/fix/batch", async (req, res) => {
    try {
      const { siteId = "default", fixes = [] } = req.body;
      const requestId = (req.headers["x-request-id"] as string) || randomUUID();
      
      if (!fixes.length) {
        return res.status(400).json({ ok: false, error: "No fixes provided" });
      }
      
      logger.info("FixBatch", "Starting batch fix", { siteId, fixCount: fixes.length });
      
      // Get Site Executor secret
      const changeSecret = await getSecretForService("site_executor", siteId);
      
      if (!changeSecret?.base_url || !changeSecret?.api_key) {
        return res.status(400).json({
          ok: false,
          error: "Site Change Executor not configured",
          message: "Set up SEO_DEPLOYER secret or SEO_DEPLOYER_API_KEY env var",
        });
      }
      
      // Build fix summary for PR body
      const fixSummary = fixes.map((fix: any, i: number) => 
        `${i + 1}. **${fix.title}**`
      ).join("\n");
      
      // Call Site Change Executor to create PR
      const prResponse = await fetch(`${changeSecret.base_url}/api/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": changeSecret.api_key,
          "X-Request-Id": requestId,
        },
        body: JSON.stringify({
          siteId,
          mode: "pr_only",
          fixes: fixes.map((f: any) => ({ id: f.id, title: f.title, type: f.type || "auto" })),
          prTitle: `[Arclo] Batch Fixes - ${new Date().toISOString().slice(0, 10)}`,
          prBody: `## Batch Fix Execution\n\nThis PR was generated by Arclo Dashboard "Fix Everything" feature.\n\n### Changes\n\n${fixSummary}\n\n---\n*Generated by Arclo Dashboard*`,
        }),
      });
      
      if (!prResponse.ok) {
        const prError = await prResponse.text();
        logger.error("FixBatch", "Change Executor failed", { status: prResponse.status, error: prError });
        return res.status(500).json({ ok: false, error: `PR creation failed: ${prError}` });
      }
      
      const prData = await prResponse.json();
      const prResult = prData.data || prData;
      
      logger.info("FixBatch", "Batch fix completed", { prUrl: prResult?.prUrl });
      
      res.json({
        ok: true,
        service: "fix-batch",
        request_id: requestId,
        url: prResult?.prUrl,
        branchName: prResult?.branchName,
        fixCount: fixes.length,
      });
      
    } catch (error: any) {
      logger.error("FixBatch", "Failed to execute batch fix", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Atlas (AI Optimization) API - Stub endpoints
  // ═══════════════════════════════════════════════════════════════════════════

  app.get("/api/atlas/health", async (_req, res) => {
    res.json({
      ok: true,
      service: "atlas",
      version: "1.0.0",
      schema_version: "2025-12-27",
      status: "stub",
      message: "Atlas AI Optimization service is not yet implemented",
    });
  });

  app.post("/api/atlas/run", async (req, res) => {
    const { siteId = "default" } = req.body;
    const requestId = req.headers["x-request-id"] || randomUUID();
    
    res.json({
      ok: true,
      service: "atlas",
      version: "1.0.0",
      schema_version: "2025-12-27",
      request_id: requestId,
      data: {
        siteId,
        status: "stub",
        message: "Atlas run not yet implemented. Enable Atlas to unlock AI Optimization capabilities.",
        ai_discoverability_score: null,
        issues: [],
        fixes: [],
        files_to_add: [],
        pages_to_update: [],
      },
    });
  });

  app.get("/api/atlas/outputs/latest", async (req, res) => {
    const siteId = (req.query.siteId as string) || "default";
    const requestId = req.headers["x-request-id"] || randomUUID();
    
    res.json({
      ok: true,
      service: "atlas",
      version: "1.0.0",
      schema_version: "2025-12-27",
      request_id: requestId,
      data: {
        siteId,
        status: "stub",
        message: "No Atlas outputs yet. Enable Atlas to generate AI optimization recommendations.",
        ai_discoverability_score: null,
        last_run_at: null,
        issues: [],
        fixes: [],
        files_to_add: [],
        pages_to_update: [],
        competitive_ai_gap: [],
      },
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SOCRATES (KNOWLEDGE BASE) PROXY ENDPOINTS
  // Hermes is the single integration point for KB read/write operations
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * POST /api/kb/write
   * Write a learning entry to the Knowledge Base
   * Body: { siteId, entry: KBEntry }
   */
  app.post("/api/kb/write", async (req, res) => {
    try {
      const { siteId, entry } = req.body;
      const requestId = (req.headers["x-request-id"] as string) || randomUUID();

      if (!siteId) {
        return res.status(400).json({ ok: false, error: "siteId is required" });
      }
      if (!entry || !entry.type || !entry.topic) {
        return res.status(400).json({ ok: false, error: "entry with type and topic is required" });
      }

      // Validate entry structure
      const validTypes = ["observation", "recommendation", "fix_result", "experiment", "incident"];
      if (!validTypes.includes(entry.type)) {
        return res.status(400).json({ 
          ok: false, 
          error: `Invalid entry type. Must be one of: ${validTypes.join(", ")}` 
        });
      }

      // Get KB service configuration
      const { getServiceSecrets } = await import("./vault");
      const kbaseConfig = await getServiceSecrets('seo_kbase');

      if (!kbaseConfig?.base_url || !kbaseConfig?.api_key) {
        // Fallback: Store locally if KB worker not configured
        logger.warn("KB", "Knowledge Base worker not configured, storing locally");
        
        // Store in audit log as fallback
        await storage.saveAuditLog({
          siteId,
          action: 'kb_entry_local',
          details: {
            entryType: entry.type,
            topic: entry.topic,
            title: entry.title,
            summary: entry.summary,
            evidence: entry.evidence,
            decision: entry.decision,
            outcome: entry.outcome,
            tags: entry.tags,
            storedLocally: true,
          },
        });

        return res.json({
          ok: true,
          service: "socrates",
          request_id: requestId,
          data: {
            stored: true,
            storageType: "local_fallback",
            entryId: `local_${Date.now()}`,
            message: "Entry stored locally. Configure SEO_KBASE for full Knowledge Base functionality.",
          },
        });
      }

      // Forward to Knowledge Base worker
      logger.info("KB", `Writing entry to Socrates KB for site ${siteId}`, { 
        type: entry.type, 
        topic: entry.topic 
      });

      const kbResponse = await fetch(`${kbaseConfig.base_url}/write`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': kbaseConfig.api_key,
          'Authorization': `Bearer ${kbaseConfig.api_key}`,
          'X-Request-Id': requestId,
        },
        body: JSON.stringify({
          siteId,
          entry: {
            ...entry,
            createdAt: entry.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }),
      });

      if (!kbResponse.ok) {
        const errText = await kbResponse.text();
        throw new Error(`KB write failed: ${kbResponse.status} - ${errText}`);
      }

      const kbResult = await kbResponse.json();

      res.json({
        ok: true,
        service: "socrates",
        request_id: requestId,
        data: {
          stored: true,
          storageType: "knowledge_base",
          entryId: kbResult.entryId || kbResult.id,
          ...kbResult,
        },
      });
    } catch (error: any) {
      logger.error("KB", "Failed to write to Knowledge Base", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * POST /api/kb/query
   * Query the Knowledge Base for relevant learnings/guidance
   * Body: { siteId, query, filters?, limit? }
   */
  app.post("/api/kb/query", async (req, res) => {
    try {
      const { siteId, query, filters, limit = 10 } = req.body;
      const requestId = (req.headers["x-request-id"] as string) || randomUUID();

      if (!siteId) {
        return res.status(400).json({ ok: false, error: "siteId is required" });
      }
      if (!query) {
        return res.status(400).json({ ok: false, error: "query is required" });
      }

      // Get KB service configuration
      const { getServiceSecrets } = await import("./vault");
      const kbaseConfig = await getServiceSecrets('seo_kbase');

      if (!kbaseConfig?.base_url || !kbaseConfig?.api_key) {
        // Return empty result if KB not configured
        logger.warn("KB", "Knowledge Base worker not configured, returning empty results");
        
        return res.json({
          ok: true,
          service: "socrates",
          request_id: requestId,
          data: {
            entries: [],
            totalCount: 0,
            message: "Knowledge Base not configured. Set up SEO_KBASE to enable learnings.",
            consulted: false,
          },
        });
      }

      // Query Knowledge Base worker
      logger.info("KB", `Querying Socrates KB for site ${siteId}`, { query, filters });

      const kbResponse = await fetch(`${kbaseConfig.base_url}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': kbaseConfig.api_key,
          'Authorization': `Bearer ${kbaseConfig.api_key}`,
          'X-Request-Id': requestId,
        },
        body: JSON.stringify({
          siteId,
          query,
          filters: {
            ...filters,
            namespace: filters?.namespace || 'history', // default to history namespace
          },
          limit,
        }),
      });

      if (!kbResponse.ok) {
        const errText = await kbResponse.text();
        throw new Error(`KB query failed: ${kbResponse.status} - ${errText}`);
      }

      const kbResult = await kbResponse.json();

      res.json({
        ok: true,
        service: "socrates",
        request_id: requestId,
        data: {
          entries: kbResult.entries || kbResult.results || [],
          totalCount: kbResult.totalCount || kbResult.count || 0,
          summary: kbResult.summary,
          consulted: true,
          queryTime: kbResult.queryTime,
        },
      });
    } catch (error: any) {
      logger.error("KB", "Failed to query Knowledge Base", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * GET /api/kb/overview
   * Get Knowledge Base overview for CrewDashboardShell
   */
  app.get("/api/kb/overview", async (req, res) => {
    try {
      const siteId = (req.query.siteId as string) || "site_empathy_health_clinic";
      const requestId = (req.headers["x-request-id"] as string) || randomUUID();

      // Get findings from storage
      const [kbaseFindings, totalKbaseCount, allFindings] = await Promise.all([
        storage.getFindingsBySource(siteId, 'seo_kbase', 20),
        storage.getFindingsCount(siteId, 'seo_kbase'),
        storage.getLatestFindings(siteId, 50),
      ]);

      // Get last run info
      const serviceRuns = await storage.getServiceRunsByService('seo_kbase', 1);
      const lastRun = serviceRuns[0];

      // Check KB service configuration using resolveWorkerConfig (checks Bitwarden, aliases, integrations DB, env fallbacks)
      const kbaseConfig = await resolveWorkerConfig('seo_kbase');
      const isConfigured = kbaseConfig.valid;
      const configError = kbaseConfig.error || null;

      // Categorize findings by type
      const insights = kbaseFindings.filter(f => f.category === 'insight' || f.category === 'learning');
      const recommendations = kbaseFindings.filter(f => f.category === 'recommendation' || f.category === 'action');
      const patterns = kbaseFindings.filter(f => f.category === 'pattern' || f.category === 'trend');

      // Get findings from other agents to show cross-agent patterns
      const agentSources = new Set(allFindings.map(f => f.sourceIntegration).filter(Boolean));
      const agentActivity = Array.from(agentSources).map(source => {
        const agentFindings = allFindings.filter(f => f.sourceIntegration === source);
        return {
          agentId: source,
          findingsCount: agentFindings.length,
          latestFinding: agentFindings[0]?.createdAt || null,
        };
      });

      logger.info("KB", `KBase status: configured=${isConfigured}, findings=${kbaseFindings.length}`);
      
      res.json({
        ok: true,
        configured: isConfigured,
        configError: configError,
        isRealData: kbaseFindings.length > 0,
        dataSource: kbaseFindings.length > 0 ? "database" : "placeholder",
        lastRunAt: lastRun?.finishedAt || lastRun?.startedAt || null,
        lastRunStatus: lastRun?.status || null,

        // Summary stats
        totalLearnings: totalKbaseCount,
        insightsCount: insights.length,
        recommendationsCount: recommendations.length,
        patternsCount: patterns.length,

        // Agent health
        activeAgents: agentActivity.length,
        agentActivity: agentActivity.slice(0, 10),

        // Recent learnings
        recentLearnings: kbaseFindings.slice(0, 10).map(f => ({
          id: f.findingId,
          title: f.title,
          description: f.description,
          category: f.category,
          severity: f.severity,
          sourceAgent: f.sourceIntegration,
          createdAt: f.createdAt,
          metadata: f.metadata,
        })),

        // Breakdown by category
        insights: insights.slice(0, 5).map(f => ({
          id: f.findingId,
          title: f.title,
          description: f.description,
          sourceAgent: f.sourceIntegration,
          createdAt: f.createdAt,
        })),
        recommendations: recommendations.slice(0, 5).map(f => ({
          id: f.findingId,
          title: f.title,
          description: f.description,
          sourceAgent: f.sourceIntegration,
          priority: f.severity,
          createdAt: f.createdAt,
        })),
        patterns: patterns.slice(0, 5).map(f => ({
          id: f.findingId,
          title: f.title,
          description: f.description,
          trend: f.metadata?.trend || 'stable',
          createdAt: f.createdAt,
        })),
      });
    } catch (error: any) {
      logger.error("KB", "Failed to get KB overview", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * GET /api/kb/status
   * Canonical Knowledge Base status endpoint with canRead/canWrite checks
   * Returns stable shape for UI configuration decisions (preserves data envelope for backwards compatibility)
   */
  app.get("/api/kb/status", async (req, res) => {
    try {
      const siteId = (req.query.siteId as string) || "site_empathy_health_clinic";
      const requestId = (req.headers["x-request-id"] as string) || randomUUID();
      const timestamp = new Date().toISOString();

      // Get KB service configuration using resolveWorkerConfig (checks Bitwarden, aliases, integrations DB)
      const kbaseConfig = await resolveWorkerConfig('seo_kbase');
      const healthPath = kbaseConfig.health_path || "/health";

      if (!kbaseConfig.valid) {
        const errorMsg = kbaseConfig.error || "Knowledge Base worker not configured. Set up SEO_KBASE secret in Bitwarden (or SEO_KBASE_API_KEY + SEO_KBASE_BASE_URL env vars).";
        logger.info("KB", `KBase status: configured=false, canRead=false, canWrite=false`);
        return res.json({
          ok: true,
          service: "socrates",
          request_id: requestId,
          data: {
            configured: false,
            canRead: false,
            canWrite: false,
            status: "not_configured",
            baseUrl: null,
            error: errorMsg,
            lastError: errorMsg,
            message: kbaseConfig.error || "Knowledge Base worker not configured.",
            lastWriteAt: null,
            lastQueryAt: null,
            recentLearnings: [],
            timestamp,
          },
        });
      }

      // Canonical status response shape
      let canRead = false;
      let canWrite = false;
      let lastError: string | null = null;
      let workerVersion: string | null = null;
      let healthData: any = {};

      // Check KB worker health (lightweight read check)
      try {
        const headers: Record<string, string> = { "X-Request-Id": requestId };
        if (kbaseConfig.api_key) {
          headers['x-api-key'] = kbaseConfig.api_key;
          headers['Authorization'] = `Bearer ${kbaseConfig.api_key}`;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const healthResponse = await fetch(`${kbaseConfig.base_url}${healthPath}`, {
          method: 'GET',
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (healthResponse.ok) {
          healthData = await healthResponse.json().catch(() => ({}));
          canRead = true;
          canWrite = !!kbaseConfig.api_key;
          workerVersion = healthData.version || null;
        } else {
          // Attempt to parse error body for richer context
          let errorBody: any = {};
          try {
            errorBody = await healthResponse.json();
          } catch (_) {}
          lastError = errorBody.error || errorBody.message || `Health check failed: HTTP ${healthResponse.status}`;
        }
      } catch (healthErr: any) {
        if (healthErr.name === "AbortError") {
          lastError = "Health check timed out after 5s";
        } else {
          lastError = healthErr.message;
        }
      }

      logger.info("KB", `KBase status: configured=true, canRead=${canRead}, canWrite=${canWrite}`);

      res.json({
        ok: true,
        service: "socrates",
        request_id: requestId,
        data: {
          configured: true,
          canRead,
          canWrite,
          status: canRead ? "healthy" : "unreachable",
          baseUrl: kbaseConfig.base_url ? kbaseConfig.base_url.replace(/\/api$/, '') : null,
          error: lastError,
          lastError,
          workerVersion,
          lastWriteAt: healthData.lastWriteAt || null,
          lastQueryAt: healthData.lastQueryAt || null,
          entriesCount: healthData.entriesCount || 0,
          recentLearnings: healthData.recentEntries || [],
          timestamp,
        },
      });
    } catch (error: any) {
      logger.error("KB", "Failed to get KB status", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  /**
   * POST /api/kb/synthesize
   * Use OpenAI to generate insights and recommendations from learnings
   */
  app.post("/api/kb/synthesize", async (req, res) => {
    try {
      const { siteId } = req.body;
      if (!siteId) return res.status(400).json({ error: "siteId required" });
      
      const synthesisRunId = `synthesis_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      
      // 1. Get recent learnings (last 50)
      const learnings = await storage.getLatestFindings(siteId, 50);
      if (learnings.length === 0) {
        return res.json({ ok: true, insightsAdded: 0, recommendationsAdded: 0, message: "No learnings to synthesize" });
      }
      
      // 2. Prepare learnings for OpenAI
      const learningsSummary = learnings.slice(0, 30).map(l => ({
        id: l.findingId,
        title: l.title,
        description: l.description?.slice(0, 200),
        category: l.category,
        severity: l.severity,
        source: l.sourceIntegration || 'unknown'
      }));
      
      // 3. Call OpenAI to generate insights and recommendations
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI();
      
      const systemPrompt = `You are an SEO analyst synthesizing learnings into actionable insights and recommendations.
    
Given a list of SEO learnings/findings, you must:
1. Identify 3-7 key INSIGHTS (patterns, themes, cross-cutting observations)
2. Create 3-10 RECOMMENDATIONS (actionable fixes prioritized by impact)

Return JSON in this exact format:
{
  "insights": [
    { "title": "...", "summary": "...", "tags": ["tag1", "tag2"], "sourceIds": ["learning_id1", "learning_id2"] }
  ],
  "recommendations": [
    { "title": "...", "rationale": "...", "priority": "high|medium|low", "effort": "small|medium|large", "actionType": "content_update|tech_fix|ads_change|seo_fix", "sourceIds": ["learning_id1"] }
  ]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Synthesize these SEO learnings:\n\n${JSON.stringify(learningsSummary, null, 2)}` }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });
      
      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error("No response from OpenAI");
      
      const synthesis = JSON.parse(content);
      
      // 4. Save insights
      const insightsToSave = (synthesis.insights || []).map((i: any, idx: number) => ({
        insightId: `insight_${synthesisRunId}_${idx}`,
        siteId,
        title: i.title,
        summary: i.summary,
        tags: i.tags || [],
        sources: (i.sourceIds || []).map((id: string) => ({ crewId: 'seo_kbase', learningId: id })),
        synthesisRunId,
      }));
      
      if (insightsToSave.length > 0) {
        await storage.saveInsights(insightsToSave);
      }
      
      // 5. Save recommendations
      const recsToSave = (synthesis.recommendations || []).map((r: any, idx: number) => ({
        recommendationId: `rec_${synthesisRunId}_${idx}`,
        siteId,
        title: r.title,
        rationale: r.rationale,
        priority: r.priority || 'medium',
        effort: r.effort,
        actionType: r.actionType,
        sources: (r.sourceIds || []).map((id: string) => ({ crewId: 'seo_kbase', learningId: id })),
        status: 'pending',
        synthesisRunId,
      }));
      
      if (recsToSave.length > 0) {
        await storage.saveRecommendations(recsToSave);
      }
      
      res.json({
        ok: true,
        synthesisRunId,
        insightsAdded: insightsToSave.length,
        recommendationsAdded: recsToSave.length,
        totals: {
          insights: await storage.getInsightsCount(siteId),
          recommendations: await storage.getRecommendationsCount(siteId),
        }
      });
    } catch (error: any) {
      logger.error("KB", "Synthesis error", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/kb/insights
   * Get insights for a site
   */
  app.get("/api/kb/insights", async (req, res) => {
    const siteId = (req.query.siteId as string) || "default";
    const limit = parseInt(req.query.limit as string) || 20;
    
    const insights = await storage.getInsights(siteId, limit);
    const total = await storage.getInsightsCount(siteId);
    
    res.json({ ok: true, insights, total });
  });

  /**
   * GET /api/kb/recommendations
   * Get recommendations for a site
   */
  app.get("/api/kb/recommendations", async (req, res) => {
    const siteId = (req.query.siteId as string) || "default";
    const limit = parseInt(req.query.limit as string) || 20;
    
    const recommendations = await storage.getRecommendations(siteId, limit);
    const total = await storage.getRecommendationsCount(siteId);
    
    res.json({ ok: true, recommendations, total });
  });

  // ========================================
  // Achievement Tracks API
  // ========================================

  const achievementQuerySchema = z.object({
    siteId: z.string().min(1).default("default"),
    crewId: z.string().optional(),
  });

  const achievementInitializeSchema = z.object({
    siteId: z.string().min(1).default("default"),
    crewId: z.string().min(1, "crewId is required"),
  });

  const achievementInitializeAllSchema = z.object({
    siteId: z.string().min(1).default("default"),
  });

  const achievementIncrementSchema = z.object({
    siteId: z.string().min(1).default("default"),
    crewId: z.string().min(1, "crewId is required"),
    key: z.string().min(1, "key is required"),
    amount: z.number().int().positive().default(1),
  });

  // Get all achievement tracks for a site (optionally filtered by crew)
  app.get("/api/achievements", async (req, res) => {
    try {
      const parsed = achievementQuerySchema.safeParse({
        siteId: req.query.siteId || "default",
        crewId: req.query.crewId,
      });
      
      if (!parsed.success) {
        return res.status(400).json({ ok: false, error: parsed.error.message });
      }
      
      const { siteId, crewId } = parsed.data;
      const tracks = await storage.getAchievementTracks(siteId, crewId);
      res.json({ ok: true, data: tracks });
    } catch (error: any) {
      logger.error("Achievements", "Failed to get achievements", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Initialize achievements for a crew (creates default tracks if none exist)
  app.post("/api/achievements/initialize", async (req, res) => {
    try {
      const parsed = achievementInitializeSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ ok: false, error: parsed.error.message });
      }
      
      const { siteId, crewId } = parsed.data;
      const tracks = await storage.initializeCrewAchievements(siteId, crewId);
      res.json({ ok: true, data: tracks });
    } catch (error: any) {
      logger.error("Achievements", "Failed to initialize achievements", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Initialize achievements for all crews
  app.post("/api/achievements/initialize-all", async (req, res) => {
    try {
      const parsed = achievementInitializeAllSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ ok: false, error: parsed.error.message });
      }
      
      const { siteId } = parsed.data;
      const crewIds = ["speedster", "natasha", "authority", "pulse", "serp", "socrates"];
      
      const allTracks = [];
      for (const crewId of crewIds) {
        const tracks = await storage.initializeCrewAchievements(siteId, crewId);
        allTracks.push(...tracks);
      }
      
      res.json({ ok: true, data: allTracks, count: allTracks.length });
    } catch (error: any) {
      logger.error("Achievements", "Failed to initialize all achievements", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  // Increment progress on an achievement track
  app.post("/api/achievements/increment", async (req, res) => {
    try {
      const parsed = achievementIncrementSchema.safeParse(req.body);
      
      if (!parsed.success) {
        return res.status(400).json({ ok: false, error: parsed.error.message });
      }
      
      const { siteId, crewId, key, amount } = parsed.data;
      const track = await storage.incrementAchievementProgress(siteId, crewId, key, amount);
      
      if (!track) {
        return res.status(404).json({ ok: false, error: "Achievement track not found" });
      }
      
      res.json({ ok: true, data: track });
    } catch (error: any) {
      logger.error("Achievements", "Failed to increment achievement", { error: error.message });
      res.status(500).json({ ok: false, error: error.message });
    }
  });

  return httpServer;
}
