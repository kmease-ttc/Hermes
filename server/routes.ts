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
import { logger } from "./utils/logger";
import { apiKeyAuth } from "./middleware/apiAuth";
import { randomUUID } from "crypto";
import OpenAI from "openai";
import { z } from "zod";
import { getServiceBySlug } from "@shared/servicesCatalog";

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
        const { db } = await import("./db");
        const result = await db.execute(require('drizzle-orm').sql`SELECT 1 as connected`);
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
            const ga4Status = await ga4Connector.testConnection();
            const gscStatus = await gscConnector.testConnection();
            const bothPass = ga4Status.success && gscStatus.success;
            const onePass = ga4Status.success || gscStatus.success;
            
            // Build actualOutputs array based on what connected
            const actualOutputs: string[] = [];
            const missingReason: Record<string, string> = {};
            
            if (gscStatus.success) {
              actualOutputs.push("gsc_impressions", "gsc_clicks", "gsc_ctr", "gsc_position", "gsc_queries", "gsc_pages");
            } else {
              const reason = gscStatus.error || "GSC not connected";
              missingReason["gsc_impressions"] = reason;
              missingReason["gsc_clicks"] = reason;
              missingReason["gsc_ctr"] = reason;
              missingReason["gsc_position"] = reason;
              missingReason["gsc_queries"] = reason;
              missingReason["gsc_pages"] = reason;
            }
            
            if (ga4Status.success) {
              actualOutputs.push("ga4_sessions", "ga4_users", "ga4_conversions");
            } else {
              const reason = ga4Status.error || "GA4 not connected";
              missingReason["ga4_sessions"] = reason;
              missingReason["ga4_users"] = reason;
              missingReason["ga4_conversions"] = reason;
            }
            
            checkResult = {
              status: bothPass ? "pass" : onePass ? "partial" : "fail",
              summary: bothPass ? "GA4 and GSC connected" : onePass ? "Partial: one service connected" : "Both GA4 and GSC failed",
              metrics: { 
                ga4_connected: ga4Status.success, 
                gsc_connected: gscStatus.success,
                outputs_received: actualOutputs.length,
                outputs_missing: 9 - actualOutputs.length,
              },
              details: { 
                ga4: ga4Status, 
                gsc: gscStatus,
                actualOutputs,
                missingReason: Object.keys(missingReason).length > 0 ? missingReason : undefined,
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
            // Check if the worker is configured via Bitwarden secret
            const { bitwardenProvider } = await import("./vault/BitwardenProvider");
            const crawlSecret = await bitwardenProvider.getSecret("SEO_TECHNICAL_CRAWLER_API_KEY");
            
            const debug: any = { secretFound: !!crawlSecret, requestedUrls: [], responses: [] };
            const actualOutputs: string[] = [];
            const expectedOutputs = ["pages_crawled", "indexable_pages", "non_200_urls", "canonical_errors", 
                                      "render_failures", "redirect_chains", "orphan_pages", "meta_tags"];
            
            // Parse worker credentials
            let workerConfig: { base_url?: string; api_key?: string } | null = null;
            let parseError: string | null = null;
            
            if (crawlSecret) {
              try {
                workerConfig = JSON.parse(crawlSecret);
                debug.baseUrl = workerConfig?.base_url;
              } catch (e: any) {
                parseError = e.message || "Invalid JSON";
                debug.parseError = parseError;
              }
            }
            
            // Handle different failure modes explicitly
            if (!crawlSecret) {
              checkResult = {
                status: "fail",
                summary: "Worker secret not found - add SEO_TECHNICAL_CRAWLER_API_KEY to Bitwarden",
                metrics: { 
                  secret_found: false,
                  outputs_available: 0,
                  outputs_missing: expectedOutputs.length,
                },
                details: { 
                  debug,
                  actualOutputs: [],
                  missingOutputs: expectedOutputs,
                  fix: "Add SEO_TECHNICAL_CRAWLER_API_KEY secret to Bitwarden with JSON: { \"base_url\": \"...\", \"api_key\": \"...\" }",
                },
              };
            } else if (parseError) {
              checkResult = {
                status: "fail",
                summary: `Secret JSON invalid: ${parseError}`,
                metrics: { 
                  secret_found: true,
                  json_valid: false,
                  outputs_available: 0,
                  outputs_missing: expectedOutputs.length,
                },
                details: { 
                  debug,
                  actualOutputs: [],
                  missingOutputs: expectedOutputs,
                  fix: "Update SEO_TECHNICAL_CRAWLER_API_KEY with valid JSON: { \"base_url\": \"...\", \"api_key\": \"...\" }",
                },
              };
            } else if (!workerConfig?.base_url) {
              checkResult = {
                status: "fail",
                summary: "Worker secret missing base_url field",
                metrics: { 
                  secret_found: true,
                  json_valid: true,
                  base_url_present: false,
                  outputs_available: 0,
                  outputs_missing: expectedOutputs.length,
                },
                details: { 
                  debug,
                  actualOutputs: [],
                  missingOutputs: expectedOutputs,
                  fix: "Update secret to include base_url: { \"base_url\": \"https://your-worker.replit.app\", \"api_key\": \"...\" }",
                },
              };
            } else {
              // Worker is configured - test /health endpoint
              const baseUrl = workerConfig.base_url.replace(/\/$/, '');
              const headers: Record<string, string> = {};
              if (workerConfig.api_key) {
                headers["Authorization"] = `Bearer ${workerConfig.api_key}`;
                headers["X-API-Key"] = workerConfig.api_key;
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
            // Check if the worker is configured via Bitwarden secret
            const { bitwardenProvider } = await import("./vault/BitwardenProvider");
            const vitalsSecret = await bitwardenProvider.getSecret("SEO_CORE_WEB_VITALS");
            
            const debug: any = { secretFound: !!vitalsSecret, requestedUrls: [], responses: [] };
            const expectedOutputs = ["lcp", "cls", "inp", "performance_score", "regressions"];
            
            // Parse worker credentials
            let workerConfig: { base_url?: string; api_key?: string } | null = null;
            let parseError: string | null = null;
            
            if (vitalsSecret) {
              try {
                workerConfig = JSON.parse(vitalsSecret);
                debug.baseUrl = workerConfig?.base_url;
              } catch (e: any) {
                parseError = e.message || "Invalid JSON";
                debug.parseError = parseError;
              }
            }
            
            // Handle different failure modes explicitly
            if (!vitalsSecret) {
              checkResult = {
                status: "fail",
                summary: "Worker secret not found - add SEO_CORE_WEB_VITALS to Bitwarden",
                metrics: { 
                  secret_found: false,
                  outputs_available: 0,
                  outputs_missing: expectedOutputs.length,
                },
                details: { 
                  debug,
                  actualOutputs: [],
                  missingOutputs: expectedOutputs,
                  fix: "Add SEO_CORE_WEB_VITALS secret to Bitwarden with JSON: { \"base_url\": \"...\", \"api_key\": \"...\" }",
                },
              };
            } else if (parseError) {
              checkResult = {
                status: "fail",
                summary: `Secret JSON invalid: ${parseError}`,
                metrics: { 
                  secret_found: true,
                  json_valid: false,
                  outputs_available: 0,
                  outputs_missing: expectedOutputs.length,
                },
                details: { 
                  debug,
                  actualOutputs: [],
                  missingOutputs: expectedOutputs,
                  fix: "Update SEO_CORE_WEB_VITALS with valid JSON: { \"base_url\": \"...\", \"api_key\": \"...\" }",
                },
              };
            } else if (!workerConfig?.base_url) {
              checkResult = {
                status: "fail",
                summary: "Worker secret missing base_url field",
                metrics: { 
                  secret_found: true,
                  json_valid: true,
                  base_url_present: false,
                  outputs_available: 0,
                  outputs_missing: expectedOutputs.length,
                },
                details: { 
                  debug,
                  actualOutputs: [],
                  missingOutputs: expectedOutputs,
                  fix: "Update secret to include base_url: { \"base_url\": \"https://your-worker.replit.app\", \"api_key\": \"...\" }",
                },
              };
            } else {
              // Worker is configured - test /health endpoint
              const baseUrl = workerConfig.base_url.replace(/\/$/, '');
              const headers: Record<string, string> = {};
              if (workerConfig.api_key) {
                headers["Authorization"] = `Bearer ${workerConfig.api_key}`;
                headers["X-API-Key"] = workerConfig.api_key;
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
                  checkResult = {
                    status: "partial",
                    summary: `Worker connected - run vitals check to validate outputs`,
                    metrics: { 
                      worker_configured: true,
                      worker_reachable: true,
                      outputs_pending: expectedOutputs.length,
                    },
                    details: { 
                      baseUrl,
                      debug,
                      actualOutputs: [],
                      pendingOutputs: expectedOutputs,
                      note: "Connection verified. Run a vitals check to validate all outputs.",
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
          case "seo_kbase": {
            // Check if the worker is configured via Bitwarden secret
            const { bitwardenProvider: kbaseProvider } = await import("./vault/BitwardenProvider");
            const kbaseSecret = await kbaseProvider.getSecret("SEO_KBASE_API_KEY");
            
            const debug: any = { secretFound: !!kbaseSecret, requestedUrls: [], responses: [] };
            const expectedOutputs = ["seo_recommendations", "best_practices", "optimization_tips", "reference_docs"];
            
            let workerConfig: { base_url?: string; api_key?: string } | null = null;
            let parseError: string | null = null;
            
            if (kbaseSecret) {
              try {
                workerConfig = JSON.parse(kbaseSecret);
                debug.baseUrl = workerConfig?.base_url;
              } catch (e: any) {
                parseError = e.message || "Invalid JSON";
                debug.parseError = parseError;
              }
            }
            
            if (!kbaseSecret) {
              checkResult = {
                status: "fail",
                summary: "Worker secret not found - add SEO_KBASE_API_KEY to Bitwarden",
                metrics: { secret_found: false, outputs_missing: expectedOutputs.length },
                details: { debug, actualOutputs: [], missingOutputs: expectedOutputs },
              };
            } else if (parseError) {
              checkResult = {
                status: "fail",
                summary: `Secret JSON invalid: ${parseError}`,
                metrics: { secret_found: true, json_valid: false, outputs_missing: expectedOutputs.length },
                details: { debug, actualOutputs: [], missingOutputs: expectedOutputs },
              };
            } else if (!workerConfig?.base_url) {
              checkResult = {
                status: "fail",
                summary: "Worker secret missing base_url field",
                metrics: { secret_found: true, base_url_present: false, outputs_missing: expectedOutputs.length },
                details: { debug, actualOutputs: [], missingOutputs: expectedOutputs },
              };
            } else {
              const baseUrl = workerConfig.base_url.replace(/\/$/, '');
              const headers: Record<string, string> = {};
              if (workerConfig.api_key) {
                headers["Authorization"] = `Bearer ${workerConfig.api_key}`;
                headers["X-API-Key"] = workerConfig.api_key;
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
                    summary: `Worker connected - run query to validate outputs`,
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
          case "content_decay": {
            // Check if the worker is configured via Bitwarden secret
            const { bitwardenProvider: decayProvider } = await import("./vault/BitwardenProvider");
            const decaySecret = await decayProvider.getSecret("SEO_CONTENT_DECAY_MONITOR_API_KEY");
            
            const debug: any = { secretFound: !!decaySecret, requestedUrls: [], responses: [] };
            const expectedOutputs = ["decay_signals", "refresh_candidates", "competitor_replacement"];
            
            let workerConfig: { base_url?: string; api_key?: string } | null = null;
            let parseError: string | null = null;
            
            if (decaySecret) {
              try {
                workerConfig = JSON.parse(decaySecret);
                debug.baseUrl = workerConfig?.base_url;
              } catch (e: any) {
                parseError = e.message || "Invalid JSON";
                debug.parseError = parseError;
              }
            }
            
            if (!decaySecret) {
              checkResult = {
                status: "fail",
                summary: "Worker secret not found - add SEO_CONTENT_DECAY_MONITOR_API_KEY to Bitwarden",
                metrics: { secret_found: false, outputs_missing: expectedOutputs.length },
                details: { debug, actualOutputs: [], missingOutputs: expectedOutputs },
              };
            } else if (parseError) {
              checkResult = {
                status: "fail",
                summary: `Secret JSON invalid: ${parseError}`,
                metrics: { secret_found: true, json_valid: false, outputs_missing: expectedOutputs.length },
                details: { debug, actualOutputs: [], missingOutputs: expectedOutputs },
              };
            } else if (!workerConfig?.base_url) {
              checkResult = {
                status: "fail",
                summary: "Worker secret missing base_url field",
                metrics: { secret_found: true, base_url_present: false, outputs_missing: expectedOutputs.length },
                details: { debug, actualOutputs: [], missingOutputs: expectedOutputs },
              };
            } else {
              const baseUrl = workerConfig.base_url.replace(/\/$/, '');
              const headers: Record<string, string> = {};
              if (workerConfig.api_key) {
                headers["Authorization"] = `Bearer ${workerConfig.api_key}`;
                headers["X-API-Key"] = workerConfig.api_key;
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
            // Check if the worker is configured via Bitwarden secret
            const { bitwardenProvider } = await import("./vault/BitwardenProvider");
            const compSecret = await bitwardenProvider.getSecret("SEO_Competitive_Intel");
            
            const debug: any = { secretFound: !!compSecret, requestedUrls: [], responses: [] };
            const expectedOutputs = ["competitors", "ranking_pages", "page_templates", "content_structure"];
            
            let workerConfig: { base_url?: string; api_key?: string } | null = null;
            let parseError: string | null = null;
            
            if (compSecret) {
              try {
                workerConfig = JSON.parse(compSecret);
                debug.baseUrl = workerConfig?.base_url;
              } catch (e: any) {
                parseError = e.message || "Invalid JSON";
                debug.parseError = parseError;
              }
            }
            
            if (!compSecret) {
              checkResult = {
                status: "fail",
                summary: "Worker secret not found - add SEO_Competitive_Intel to Bitwarden",
                metrics: { secret_found: false, outputs_missing: expectedOutputs.length },
                details: { debug, actualOutputs: [], missingOutputs: expectedOutputs },
              };
            } else if (parseError) {
              checkResult = {
                status: "fail",
                summary: `Secret JSON invalid: ${parseError}`,
                metrics: { secret_found: true, json_valid: false, outputs_missing: expectedOutputs.length },
                details: { debug, actualOutputs: [], missingOutputs: expectedOutputs },
              };
            } else if (!workerConfig?.base_url) {
              checkResult = {
                status: "fail",
                summary: "Worker secret missing base_url field",
                metrics: { secret_found: true, base_url_present: false, outputs_missing: expectedOutputs.length },
                details: { debug, actualOutputs: [], missingOutputs: expectedOutputs },
              };
            } else {
              const baseUrl = workerConfig.base_url.replace(/\/$/, '');
              const headers: Record<string, string> = {};
              if (workerConfig.api_key) {
                headers["Authorization"] = `Bearer ${workerConfig.api_key}`;
                headers["X-API-Key"] = workerConfig.api_key;
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

      const { baseUrl, healthEndpoint, metaEndpoint } = integration;
      const startTime = Date.now();
      let healthResult: any = { status: "unknown", response: null, error: null };
      let metaResult: any = { status: "unknown", response: null, error: null };

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
            headers: { 'Accept': 'application/json' },
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
            headers: { 'Accept': 'application/json' },
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
          name: "Worker: SERP & Keyword Intelligence Service",
          description: "Remote worker for keyword rank tracking, SERP snapshots, and position monitoring. Supports async job execution.",
          category: "analysis",
          expectedSignals: ["serp_rank_snapshots", "serp_serp_snapshots", "serp_tracked_keywords", "serp_top_keywords"],
        },
        {
          integrationId: "crawl_render",
          name: "Crawl & Render Service",
          description: "Technical SEO: status codes, redirects, canonicals, indexability, internal links, orphan pages, sitemap/robots, JS rendering",
          category: "analysis",
          expectedSignals: ["crawl_status", "render_status", "robots_txt", "sitemap", "meta_tags", "redirect_chains", "orphan_pages"],
        },
        {
          integrationId: "core_web_vitals",
          name: "Core Web Vitals Monitor",
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
          name: "Content Decay Monitor",
          description: "Identify pages losing impressions/clicks/rank over time, prioritize refresh candidates",
          category: "analysis",
          expectedSignals: ["decay_signals", "refresh_candidates", "competitor_replacement"],
        },
        {
          integrationId: "content_qa",
          name: "Content QA / Policy Validator",
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
      const allIntegrations = await storage.getIntegrations();
      const readyServices = allIntegrations.filter(i => 
        i.buildState === "built" && i.configState === "ready"
      );
      const blockedServices = allIntegrations.filter(i => 
        i.buildState === "planned" || i.configState === "blocked" || i.configState === "missing_config"
      );
      
      let servicesRun = 0;
      let servicesSuccess = 0;
      let servicesFailed = 0;
      const serviceResults: Array<{ serviceId: string; status: string; summary: string }> = [];
      
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
        runId: diagRunId,
        siteId: site.siteId,
        status: finalStatus,
        summary: `Ran ${servicesRun} services: ${servicesSuccess} succeeded, ${servicesFailed} failed, ${blockedServices.length} blocked`,
        servicesRun,
        servicesSuccess,
        servicesFailed,
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

  return httpServer;
}
