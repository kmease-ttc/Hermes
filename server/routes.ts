import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { googleAuth } from "./auth/google-oauth";
import { ga4Connector } from "./connectors/ga4";
import { gscConnector } from "./connectors/gsc";
import { adsConnector } from "./connectors/ads";
import { serpConnector } from "./connectors/serp";
import { websiteChecker } from "./website_checks";
import { analysisEngine } from "./analysis";
import { runFullDiagnostic } from "./analysis/orchestrator";
import { logger } from "./utils/logger";
import { apiKeyAuth } from "./middleware/apiAuth";
import { randomUUID } from "crypto";
import OpenAI from "openai";
import { z } from "zod";

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

  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const now = new Date();
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      const formatDate = (d: Date) => d.toISOString().split("T")[0].replace(/-/g, "");
      const endDate = formatDate(now);
      const startDate = formatDate(weekAgo);
      
      const endDateDash = now.toISOString().split("T")[0];

      const [ga4Data, adsData, webChecks] = await Promise.all([
        storage.getGA4DataByDateRange(startDate, endDate),
        storage.getAdsDataByDateRange(startDate, endDate),
        storage.getWebChecksByDate(endDateDash),
      ]);

      const totalSessions = ga4Data.reduce((sum, d) => sum + d.sessions, 0);
      const totalSpend = adsData.reduce((sum, d) => sum + d.spend, 0);
      const healthScore = webChecks.filter(c => c.statusCode === 200).length / Math.max(webChecks.length, 1) * 100;

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

      res.json({
        organicTraffic: {
          total: totalSessions,
          trend: ga4Trend,
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

  // SERP Tracking Endpoints
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

      const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);
      const keywordsToCheck = keywords.slice(0, limit);
      
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

  // Get single integration details
  app.get("/api/integrations/:integrationId", async (req, res) => {
    try {
      const integration = await storage.getIntegrationById(req.params.integrationId);
      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }
      
      // Get recent health checks
      const checks = await storage.getIntegrationChecks(req.params.integrationId, 10);
      
      res.json({
        ...integration,
        recentChecks: checks,
      });
    } catch (error: any) {
      logger.error("API", "Failed to get integration", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Test an integration connection
  app.post("/api/integrations/:integrationId/test", async (req, res) => {
    try {
      const integration = await storage.getIntegrationById(req.params.integrationId);
      if (!integration) {
        return res.status(404).json({ error: "Integration not found" });
      }

      const startTime = Date.now();
      let checkResult: { status: string; details: any; sampleData?: any } = {
        status: "fail",
        details: { message: "Unknown integration type" },
      };

      // Test based on integration type
      switch (integration.integrationId) {
        case "google_data_connector": {
          // Test GA4 + GSC connections
          const ga4Status = await ga4Connector.testConnection();
          const gscStatus = await gscConnector.testConnection();
          
          checkResult = {
            status: ga4Status.success && gscStatus.success ? "pass" : ga4Status.success || gscStatus.success ? "warning" : "fail",
            details: {
              ga4: ga4Status,
              gsc: gscStatus,
            },
          };
          break;
        }
        case "google_ads_connector": {
          const adsStatus = await adsConnector.testConnection();
          checkResult = {
            status: adsStatus.success ? "pass" : "fail",
            details: adsStatus,
          };
          break;
        }
        case "serp_intel": {
          const serpStatus = await serpConnector.testConnection();
          checkResult = {
            status: serpStatus.success ? "pass" : "fail",
            details: serpStatus,
          };
          break;
        }
        case "crawl_render": {
          const websiteStatus = await websiteChecker.checkRobotsTxt("https://example.com");
          checkResult = {
            status: websiteStatus ? "pass" : "fail",
            details: { message: "Website health check capability verified" },
          };
          break;
        }
        default:
          checkResult = {
            status: "warning",
            details: { message: `No test handler for integration: ${integration.integrationId}` },
          };
      }

      const durationMs = Date.now() - startTime;

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
      const newHealthStatus = checkResult.status === "pass" ? "healthy" : checkResult.status === "warning" ? "degraded" : "error";
      await storage.updateIntegration(integration.integrationId, {
        healthStatus: newHealthStatus,
        lastSuccessAt: checkResult.status === "pass" ? new Date() : integration.lastSuccessAt,
        lastErrorAt: checkResult.status === "fail" ? new Date() : integration.lastErrorAt,
        lastError: checkResult.status === "fail" ? JSON.stringify(checkResult.details) : integration.lastError,
      });

      res.json({
        integrationId: integration.integrationId,
        ...checkResult,
        durationMs,
        testedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error("API", "Failed to test integration", { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Seed default platform integrations
  app.post("/api/integrations/seed", async (req, res) => {
    try {
      const defaultIntegrations = [
        {
          integrationId: "google_data_connector",
          name: "Google Data Connector",
          description: "Connects to GA4 and Google Search Console for traffic and search analytics",
          category: "data",
          expectedSignals: ["impressions", "clicks", "ctr", "position", "sessions", "users", "conversions"],
        },
        {
          integrationId: "google_ads_connector",
          name: "Google Ads",
          description: "Connects to Google Ads for campaign performance and policy status",
          category: "data",
          expectedSignals: ["spend", "impressions", "clicks", "cpc", "conversions", "policy_issues"],
        },
        {
          integrationId: "serp_intel",
          name: "SERP & Keyword Intelligence",
          description: "Real-time SERP tracking and keyword ranking verification via SerpApi",
          category: "analysis",
          expectedSignals: ["keyword_rankings", "serp_features", "position_changes"],
        },
        {
          integrationId: "crawl_render",
          name: "Crawl & Render Engine",
          description: "Website health checks, robots.txt, sitemap validation, and page rendering",
          category: "analysis",
          expectedSignals: ["crawl_status", "render_status", "robots_txt", "sitemap", "meta_tags"],
        },
        {
          integrationId: "bitwarden_vault",
          name: "Bitwarden Secrets Manager",
          description: "Secure credential storage for API keys and OAuth tokens",
          category: "infrastructure",
          expectedSignals: ["vault_status", "secrets_available"],
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

  return httpServer;
}
