/**
 * Per-Site Google Connection Routes
 *
 * Manages per-site Google OAuth credentials for GA4, GSC, and Ads.
 * Each site connects its own Google account via OAuth, storing
 * tokens in the site_google_credentials table.
 */

import { Router } from 'express';
import { z } from 'zod';
import { google } from 'googleapis';
import { googleAuth } from '../auth/google-oauth';
import { storage } from '../storage';
import { requireAuth } from '../auth/session';
import { logger } from '../utils/logger';

const router = Router();

// ════════════════════════════════════════════════════════════════════════════
// POST /api/sites/:siteId/google/connect — Start OAuth flow for a site
// ════════════════════════════════════════════════════════════════════════════

router.post('/sites/:siteId/google/connect', requireAuth, async (req, res) => {
  try {
    const siteId = parseInt(req.params.siteId, 10);
    if (isNaN(siteId)) {
      return res.status(400).json({ ok: false, error: 'Invalid site ID' });
    }

    const authUrl = googleAuth.getAuthUrlForSite(siteId);
    res.json({ ok: true, authUrl });
  } catch (error: any) {
    logger.error('GoogleConnect', 'Failed to generate auth URL', { error: error.message });
    res.status(500).json({ ok: false, error: error.message || 'Failed to start Google connection' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/google/callback — OAuth callback (handles per-site state)
// ════════════════════════════════════════════════════════════════════════════

router.get('/google/callback', async (req, res) => {
  try {
    const { code, state } = req.query;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ ok: false, error: 'Missing authorization code' });
    }

    // Parse siteId from state parameter
    let siteId: number | undefined;
    if (state && typeof state === 'string') {
      try {
        const parsed = JSON.parse(state);
        siteId = parsed.siteId;
      } catch {
        // Not JSON state — fall through to legacy flow
      }
    }

    if (siteId !== undefined) {
      // Per-site OAuth flow
      const creds = await googleAuth.exchangeCodeForSiteTokens(code, siteId);
      logger.info('GoogleConnect', `Site ${siteId} connected Google account`, {
        googleEmail: creds.googleEmail,
      });

      // Redirect back to site settings in the app
      const appUrl = process.env.APP_URL || 'http://localhost:5000';
      return res.redirect(`${appUrl}/sites/${siteId}/settings?google=connected`);
    }

    // Legacy global OAuth flow (no siteId in state)
    await googleAuth.exchangeCodeForTokens(code);
    const appUrl = process.env.APP_URL || 'http://localhost:5000';
    return res.redirect(`${appUrl}/settings?google=connected`);
  } catch (error: any) {
    logger.error('GoogleConnect', 'OAuth callback failed', { error: error.message });
    const appUrl = process.env.APP_URL || 'http://localhost:5000';
    return res.redirect(`${appUrl}/settings?google=error&message=${encodeURIComponent(error.message)}`);
  }
});

// ════════════════════════════════════════════════════════════════════════════
// DELETE /api/sites/:siteId/google/disconnect — Remove Google credentials
// ════════════════════════════════════════════════════════════════════════════

router.delete('/sites/:siteId/google/disconnect', requireAuth, async (req, res) => {
  try {
    const siteId = parseInt(req.params.siteId, 10);
    if (isNaN(siteId)) {
      return res.status(400).json({ ok: false, error: 'Invalid site ID' });
    }

    await storage.deleteSiteGoogleCredentials(siteId);
    logger.info('GoogleConnect', `Site ${siteId} disconnected Google account`);
    res.json({ ok: true });
  } catch (error: any) {
    logger.error('GoogleConnect', 'Failed to disconnect Google', { error: error.message });
    res.status(500).json({ ok: false, error: 'Failed to disconnect Google account' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/sites/:siteId/google/status — Connection status
// ════════════════════════════════════════════════════════════════════════════

router.get('/sites/:siteId/google/status', requireAuth, async (req, res) => {
  try {
    const siteId = parseInt(req.params.siteId, 10);
    if (isNaN(siteId)) {
      return res.status(400).json({ ok: false, error: 'Invalid site ID' });
    }

    const creds = await storage.getSiteGoogleCredentials(siteId);

    if (!creds) {
      return res.json({
        ok: true,
        connected: false,
        ga4: null,
        gsc: null,
        ads: null,
      });
    }

    res.json({
      ok: true,
      connected: true,
      googleEmail: creds.googleEmail,
      connectedAt: creds.connectedAt?.toISOString() || null,
      ga4: creds.ga4PropertyId ? { propertyId: creds.ga4PropertyId } : null,
      gsc: creds.gscSiteUrl ? { siteUrl: creds.gscSiteUrl } : null,
      ads: creds.adsCustomerId ? {
        customerId: creds.adsCustomerId,
        loginCustomerId: creds.adsLoginCustomerId,
      } : null,
    });
  } catch (error: any) {
    logger.error('GoogleConnect', 'Failed to fetch Google status', { error: error.message });
    res.status(500).json({ ok: false, error: 'Failed to fetch Google connection status' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// GET /api/sites/:siteId/google/properties — Discover available properties
// ════════════════════════════════════════════════════════════════════════════

router.get('/sites/:siteId/google/properties', requireAuth, async (req, res) => {
  try {
    const siteId = parseInt(req.params.siteId, 10);
    if (isNaN(siteId)) {
      return res.status(400).json({ ok: false, error: 'Invalid site ID' });
    }

    const auth = await googleAuth.getAuthenticatedClientForSite(siteId);

    // Discover GA4 properties
    const ga4Properties: Array<{ propertyId: string; displayName: string }> = [];
    try {
      const adminApi = google.analyticsadmin('v1beta');
      const accountsRes = await adminApi.accounts.list({ auth });
      const accounts = accountsRes.data.accounts || [];

      for (const account of accounts) {
        const propsRes = await adminApi.properties.list({
          auth,
          filter: `parent:${account.name}`,
        });
        for (const prop of propsRes.data.properties || []) {
          const id = prop.name?.replace('properties/', '') || '';
          if (id) {
            ga4Properties.push({
              propertyId: id,
              displayName: prop.displayName || id,
            });
          }
        }
      }
    } catch (err: any) {
      logger.warn('GoogleConnect', 'Failed to list GA4 properties', { error: err.message });
    }

    // Discover GSC sites
    const gscSites: Array<{ siteUrl: string; permissionLevel: string }> = [];
    try {
      const searchConsole = google.searchconsole('v1');
      const sitesRes = await searchConsole.sites.list({ auth });
      for (const entry of sitesRes.data.siteEntry || []) {
        if (entry.siteUrl) {
          gscSites.push({
            siteUrl: entry.siteUrl,
            permissionLevel: entry.permissionLevel || 'unknown',
          });
        }
      }
    } catch (err: any) {
      logger.warn('GoogleConnect', 'Failed to list GSC sites', { error: err.message });
    }

    res.json({
      ok: true,
      ga4: ga4Properties,
      gsc: gscSites,
    });
  } catch (error: any) {
    logger.error('GoogleConnect', 'Failed to discover properties', { error: error.message });
    res.status(500).json({ ok: false, error: error.message || 'Failed to discover Google properties' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// PUT /api/sites/:siteId/google/properties — Save selected properties
// ════════════════════════════════════════════════════════════════════════════

const updatePropertiesSchema = z.object({
  ga4PropertyId: z.string().optional(),
  gscSiteUrl: z.string().optional(),
  adsCustomerId: z.string().optional(),
  adsLoginCustomerId: z.string().optional(),
});

router.put('/sites/:siteId/google/properties', requireAuth, async (req, res) => {
  try {
    const siteId = parseInt(req.params.siteId, 10);
    if (isNaN(siteId)) {
      return res.status(400).json({ ok: false, error: 'Invalid site ID' });
    }

    const body = updatePropertiesSchema.parse(req.body);

    const creds = await storage.getSiteGoogleCredentials(siteId);
    if (!creds) {
      return res.status(404).json({ ok: false, error: 'No Google credentials found. Connect Google first.' });
    }

    await storage.updateSiteGoogleCredentials(siteId, {
      ga4PropertyId: body.ga4PropertyId ?? creds.ga4PropertyId,
      gscSiteUrl: body.gscSiteUrl ?? creds.gscSiteUrl,
      adsCustomerId: body.adsCustomerId ?? creds.adsCustomerId,
      adsLoginCustomerId: body.adsLoginCustomerId ?? creds.adsLoginCustomerId,
    });

    logger.info('GoogleConnect', `Site ${siteId} properties updated`, body);

    res.json({ ok: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: error.errors[0]?.message || 'Validation failed' });
    }
    logger.error('GoogleConnect', 'Failed to update properties', { error: error.message });
    res.status(500).json({ ok: false, error: 'Failed to update Google properties' });
  }
});

export default router;
