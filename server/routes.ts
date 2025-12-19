import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { googleAuth } from "./auth/google-oauth";
import { ga4Connector } from "./connectors/ga4";
import { gscConnector } from "./connectors/gsc";
import { adsConnector } from "./connectors/ads";
import { websiteChecker } from "./website_checks";
import { analysisEngine } from "./analysis";
import { logger } from "./utils/logger";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // OAuth Authentication Routes
  app.get("/api/auth/status", async (req, res) => {
    try {
      const isAuthenticated = await googleAuth.isAuthenticated();
      res.json({ authenticated: isAuthenticated });
    } catch (error: any) {
      logger.error('API', 'Auth status check failed', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/auth/url", async (req, res) => {
    try {
      const url = googleAuth.getAuthUrl();
      res.json({ url });
    } catch (error: any) {
      logger.error('API', 'Failed to generate auth URL', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/auth/callback", async (req, res) => {
    try {
      const code = req.query.code as string;
      
      if (!code) {
        return res.redirect('/dashboard?auth=error&message=Authorization+code+required');
      }

      await googleAuth.exchangeCodeForTokens(code);
      logger.info('API', 'OAuth authentication successful');
      res.redirect('/dashboard?auth=success');
    } catch (error: any) {
      logger.error('API', 'OAuth callback failed', { error: error.message });
      res.redirect('/dashboard?auth=error&message=' + encodeURIComponent(error.message));
    }
  });

  // Run Diagnostics
  app.post("/api/run", async (req, res) => {
    try {
      logger.info('API', 'Starting diagnostic run');
      
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const isAuthenticated = await googleAuth.isAuthenticated();
      
      if (!isAuthenticated) {
        logger.warn('API', 'Not authenticated, skipping API data fetch');
      } else {
        await Promise.all([
          ga4Connector.fetchDailyData(startDate, endDate).catch(e => logger.error('API', 'GA4 fetch failed', { error: e.message })),
          gscConnector.fetchDailyData(startDate, endDate).catch(e => logger.error('API', 'GSC fetch failed', { error: e.message })),
          adsConnector.fetchDailyData(startDate, endDate).catch(e => logger.error('API', 'Ads fetch failed', { error: e.message })),
        ]);
      }

      await websiteChecker.runDailyChecks();

      const report = await analysisEngine.generateReport(startDate, endDate);

      const rootCauses = typeof report.rootCauses === 'string' 
        ? JSON.parse(report.rootCauses) 
        : report.rootCauses;
      
      await analysisEngine.generateTickets(report.id, rootCauses);

      logger.info('API', 'Diagnostic run completed', { reportId: report.id });
      
      res.json({
        success: true,
        reportId: report.id,
        summary: report.summary,
      });
    } catch (error: any) {
      logger.error('API', 'Diagnostic run failed', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get Latest Report
  app.get("/api/report/latest", async (req, res) => {
    try {
      const report = await storage.getLatestReport();
      
      if (!report) {
        return res.status(404).json({ error: 'No reports found' });
      }

      res.json(report);
    } catch (error: any) {
      logger.error('API', 'Failed to fetch latest report', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get Latest Tickets
  app.get("/api/tickets/latest", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const tickets = await storage.getLatestTickets(limit);
      res.json(tickets);
    } catch (error: any) {
      logger.error('API', 'Failed to fetch latest tickets', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Get Dashboard Summary Stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [ga4Data, adsData, webChecks] = await Promise.all([
        storage.getGA4DataByDateRange(startDate, endDate),
        storage.getAdsDataByDateRange(startDate, endDate),
        storage.getWebChecksByDate(endDate),
      ]);

      const totalSessions = ga4Data.reduce((sum, d) => sum + d.sessions, 0);
      const totalSpend = adsData.reduce((sum, d) => sum + d.spend, 0);
      const healthScore = webChecks.filter(c => c.statusCode === 200).length / Math.max(webChecks.length, 1) * 100;

      res.json({
        organicTraffic: {
          total: totalSessions,
          trend: ga4Data.map(d => ({ date: d.date, value: d.sessions })),
        },
        adsSpend: {
          total: totalSpend,
          trend: adsData.map(d => ({ date: d.date, value: d.spend })),
        },
        healthScore: Math.round(healthScore),
        webChecks: {
          total: webChecks.length,
          passed: webChecks.filter(c => c.statusCode === 200).length,
        },
      });
    } catch (error: any) {
      logger.error('API', 'Failed to fetch dashboard stats', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  // Update Ticket Status
  app.patch("/api/tickets/:ticketId/status", async (req, res) => {
    try {
      const { ticketId } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Status required' });
      }

      await storage.updateTicketStatus(ticketId, status);
      const ticket = await storage.getTicketById(ticketId);

      res.json(ticket);
    } catch (error: any) {
      logger.error('API', 'Failed to update ticket status', { error: error.message });
      res.status(500).json({ error: error.message });
    }
  });

  return httpServer;
}
