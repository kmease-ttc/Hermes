import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "./_lib/db.js";
import { getSessionUser, setCorsHeaders } from "./_lib/auth.js";
import { randomUUID } from "crypto";

/**
 * POST /api/sites - Create a new site for the logged-in user
 * GET  /api/sites - List all sites for the logged-in user
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") return res.status(200).end();

  // ── Authentication ──────────────────────────────────────────
  const user = await getSessionUser(req);
  if (!user) {
    console.log("[Sites] add_website_request_rejected: no session");
    return res.status(401).json({
      ok: false,
      error: "Please sign in to add a website. Your session may have expired.",
    });
  }

  const pool = getPool();
  const userId = user.id;

  // Ensure user_id column exists (may not be in original Drizzle schema)
  try {
    await pool.query(`ALTER TABLE sites ADD COLUMN IF NOT EXISTS user_id INTEGER`);
  } catch {
    // Column may already exist or ALTER fails on some setups — non-fatal
  }

  // ── GET: List user's sites ──────────────────────────────────
  if (req.method === "GET") {
    try {
      const result = await pool.query(
        `SELECT * FROM sites WHERE user_id = $1 ORDER BY created_at DESC`,
        [userId]
      );
      return res.json(result.rows);
    } catch (error: any) {
      console.error("[Sites] list_sites_failed", { userId, error: error.message });
      // Fallback: if user_id column doesn't exist, return all active sites
      try {
        const fallback = await pool.query(
          `SELECT * FROM sites WHERE active = true ORDER BY created_at DESC`
        );
        return res.json(fallback.rows);
      } catch (e2: any) {
        return res.status(500).json({ ok: false, error: "Failed to list sites" });
      }
    }
  }

  // ── POST: Create a new site ─────────────────────────────────
  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    console.log("[Sites] add_website_request_received", {
      userId,
      displayName: body?.displayName,
      baseUrl: body?.baseUrl,
    });

    // ── Validate ────────────────────────────────────────────
    if (!body?.displayName || typeof body.displayName !== "string" || body.displayName.trim().length === 0) {
      return res.status(400).json({ ok: false, error: "Display name is required" });
    }
    if (!body?.baseUrl || typeof body.baseUrl !== "string" || body.baseUrl.trim().length === 0) {
      return res.status(400).json({ ok: false, error: "URL is required" });
    }

    // ── Normalize domain ────────────────────────────────────
    let baseUrl = body.baseUrl.trim();
    if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
      baseUrl = `https://${baseUrl}`;
    }
    try {
      const parsed = new URL(baseUrl);
      parsed.hostname = parsed.hostname.toLowerCase();
      baseUrl = parsed.origin + parsed.pathname.replace(/\/+$/, "");
    } catch {
      return res.status(400).json({ ok: false, error: "Invalid URL format" });
    }

    const displayName = body.displayName.trim();
    const siteId = `site_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const status = body.status || "onboarding";
    const domain = new URL(baseUrl).hostname.replace(/^www\./, "").toLowerCase();

    // ── Check for duplicate baseUrl ─────────────────────────
    const existing = await pool.query(
      `SELECT site_id FROM sites WHERE base_url = $1 LIMIT 1`,
      [baseUrl]
    );
    if (existing.rows.length > 0) {
      const existingSiteId = existing.rows[0].site_id;
      const reportResult = await pool.query(
        `SELECT report_id FROM free_reports
         WHERE website_domain = $1
         ORDER BY created_at DESC LIMIT 1`,
        [domain]
      );
      const hasExistingReport = reportResult.rows.length > 0;
      const latestReportId = hasExistingReport ? reportResult.rows[0].report_id : null;

      return res.status(409).json({
        ok: false,
        error: "This site has already been added.",
        siteId: existingSiteId,
        hasExistingReport,
        latestReportId,
      });
    }

    // ── Insert site record ──────────────────────────────────
    // Only use columns that exist in the Drizzle schema + user_id (ensured above)
    const insertResult = await pool.query(
      `INSERT INTO sites (
        site_id, user_id, display_name, base_url, status, active,
        category, tech_stack, repo_provider, repo_identifier,
        deploy_method, crawl_settings, sitemaps, key_pages,
        integrations, guardrails, cadence,
        owner_name, owner_contact, health_score,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, true,
        $6, $7, $8, $9,
        $10, $11::jsonb, $12, $13,
        $14::jsonb, $15::jsonb, $16::jsonb,
        $17, $18, $19,
        NOW(), NOW()
      ) RETURNING *`,
      [
        siteId,
        userId,
        displayName,
        baseUrl,
        status,
        body.category || null,
        body.techStack || null,
        body.repoProvider || null,
        body.repoIdentifier || null,
        body.deployMethod || null,
        body.crawlSettings ? JSON.stringify(body.crawlSettings) : null,
        body.sitemaps || null,
        body.keyPages || null,
        body.integrations ? JSON.stringify(body.integrations) : null,
        body.guardrails ? JSON.stringify(body.guardrails) : null,
        body.cadence ? JSON.stringify(body.cadence) : null,
        body.ownerName || null,
        body.ownerContact || null,
        null, // healthScore
      ]
    );

    const newSite = insertResult.rows[0];

    // ── Check for existing scan/report for this domain ──────
    const reportResult = await pool.query(
      `SELECT report_id FROM free_reports
       WHERE website_domain = $1
       ORDER BY created_at DESC LIMIT 1`,
      [domain]
    );
    const hasExistingReport = reportResult.rows.length > 0;
    const latestReportId = hasExistingReport ? reportResult.rows[0].report_id : null;

    // ── Schedule weekly automation (non-fatal) ───────────────
    try {
      await pool.query(
        `CREATE TABLE IF NOT EXISTS website_automation (
          id SERIAL PRIMARY KEY,
          site_id TEXT NOT NULL UNIQUE,
          user_id INTEGER NOT NULL,
          domain TEXT NOT NULL,
          weekly_scan_enabled BOOLEAN DEFAULT true,
          auto_updates_enabled BOOLEAN DEFAULT false,
          auto_updates_consent_at TIMESTAMP,
          last_weekly_scan_at TIMESTAMP,
          next_scheduled_at TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        )`
      );

      const nextScheduled = new Date();
      nextScheduled.setDate(nextScheduled.getDate() + 7);
      nextScheduled.setHours(7, 0, 0, 0);

      await pool.query(
        `INSERT INTO website_automation (site_id, user_id, domain, weekly_scan_enabled, next_scheduled_at)
         VALUES ($1, $2, $3, true, $4)
         ON CONFLICT (site_id) DO NOTHING`,
        [siteId, userId, domain, nextScheduled]
      );
      console.log("[Sites] weekly_automation_scheduled", { siteId, domain, nextScheduled });
    } catch (autoErr: any) {
      console.warn("[Sites] weekly_automation_setup_failed", { siteId, error: autoErr.message });
    }

    // ── Audit log (non-fatal) ───────────────────────────────
    try {
      await pool.query(
        `INSERT INTO audit_log (site_id, action, actor, details, created_at)
         VALUES ($1, $2, $3, $4::jsonb, NOW())`,
        [siteId, "site_added", "api", JSON.stringify({ displayName, baseUrl })]
      );
    } catch {
      // non-fatal
    }

    console.log("[Sites] add_website_created", {
      siteId,
      userId,
      displayName,
      domain,
      hasExistingReport,
    });

    return res.status(201).json({
      ...newSite,
      siteId: newSite.site_id,
      websiteId: newSite.site_id,
      domain,
      hasExistingReport,
      latestReportId,
    });
  } catch (error: any) {
    console.error("[Sites] add_website_failed", {
      userId,
      error: error.message,
      stack: error.stack,
      code: error.code,
      detail: error.detail,
    });

    if (error.code === "23505") {
      return res.status(409).json({ ok: false, error: "This site has already been added." });
    }

    return res.status(500).json({
      ok: false,
      error: `Failed to add site: ${error.message}`,
    });
  }
}
