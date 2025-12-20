import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { googleAuth } from "./auth/google-oauth";
import { ga4Connector } from "./connectors/ga4";
import { gscConnector } from "./connectors/gsc";
import { adsConnector } from "./connectors/ads";
import { websiteChecker } from "./website_checks";
import { analysisEngine } from "./analysis";
import { runFullDiagnostic } from "./analysis/orchestrator";
import { logger } from "./utils/logger";
import { apiKeyAuth } from "./middleware/apiAuth";
import { randomUUID } from "crypto";
import OpenAI from "openai";

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

  return httpServer;
}
