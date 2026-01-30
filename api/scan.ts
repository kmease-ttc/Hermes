import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "./_lib/db.js";
import { randomUUID } from "crypto";

function setCorsHeaders(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    setCorsHeaders(res);

    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method === "GET") return res.json({ ok: true, fn: "scan", ts: Date.now() });
    if (req.method !== "POST") return res.status(405).json({ ok: false, message: "Method not allowed" });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    if (!body?.url || typeof body.url !== "string") {
      return res.status(400).json({ ok: false, message: "Valid URL is required" });
    }

    let normalizedUrl = body.url.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }
    try { new URL(normalizedUrl); } catch { return res.status(400).json({ ok: false, message: "Invalid URL format" }); }

    const pool = getPool();
    const scanId = `scan_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const geoLocation = body.geoLocation || null;

    // Ensure table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS scan_requests (
        id SERIAL PRIMARY KEY,
        scan_id TEXT NOT NULL UNIQUE,
        target_url TEXT NOT NULL,
        normalized_url TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        email TEXT,
        preview_findings JSONB,
        full_report JSONB,
        score_summary JSONB,
        geo_scope TEXT,
        geo_location JSONB,
        error_message TEXT,
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS free_reports (
        id SERIAL PRIMARY KEY,
        report_id TEXT NOT NULL UNIQUE,
        scan_id TEXT NOT NULL,
        website_url TEXT NOT NULL,
        website_domain TEXT NOT NULL,
        report_version INTEGER DEFAULT 1,
        status TEXT DEFAULT 'generating',
        summary JSONB, competitors JSONB, keywords JSONB,
        technical JSONB, performance JSONB, next_steps JSONB, meta JSONB,
        visibility_mode TEXT DEFAULT 'full',
        limited_visibility_reason TEXT,
        limited_visibility_steps JSONB,
        share_token TEXT,
        share_token_expires_at TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Insert scan record
    await pool.query(
      `INSERT INTO scan_requests (scan_id, target_url, normalized_url, status, geo_scope, geo_location, started_at, created_at, updated_at)
       VALUES ($1, $2, $3, 'running', $4, $5::jsonb, NOW(), NOW(), NOW())`,
      [scanId, body.url, normalizedUrl, geoLocation ? "local" : null, geoLocation ? JSON.stringify(geoLocation) : null]
    );

    // Extract domain for analysis
    let domain: string;
    try { domain = new URL(normalizedUrl).hostname.replace(/^www\./, ""); }
    catch { domain = normalizedUrl.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]; }

    // Run lightweight analysis in parallel
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    let technicalOk = false;
    let hasTitle = true, hasMetaDesc = true, hasH1 = true, hasCanonical = true;
    let httpStatus = 200;

    try {
      const htmlRes = await fetch(`https://${domain}`, {
        headers: { "User-Agent": "Arclo-SEO-Scanner/1.0" },
        redirect: "follow",
        signal: controller.signal,
      });
      httpStatus = htmlRes.status;
      const html = await htmlRes.text();
      hasTitle = /<title[^>]*>.+<\/title>/i.test(html);
      hasMetaDesc = /<meta[^>]*name=["']description["'][^>]*>/i.test(html);
      hasH1 = /<h1[^>]*>/i.test(html);
      hasCanonical = /<link[^>]*rel=["']canonical["'][^>]*>/i.test(html);
      technicalOk = true;
    } catch (e) {
      console.log("[Scan] Technical check failed:", (e as Error)?.message);
    } finally {
      clearTimeout(timeout);
    }

    // PageSpeed Insights
    let performanceScore = 70;
    let lcpMs: number | null = null;
    let clsValue: number | null = null;
    let psiOk = false;

    try {
      const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY || "";
      const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(`https://${domain}`)}&strategy=mobile${apiKey ? `&key=${apiKey}` : ""}`;
      const ctrl2 = new AbortController();
      const t2 = setTimeout(() => ctrl2.abort(), 20000);
      const psiRes = await fetch(psiUrl, { signal: ctrl2.signal });
      clearTimeout(t2);
      if (psiRes.ok) {
        const psiJson = await psiRes.json();
        const lhr = psiJson.lighthouseResult;
        if (lhr?.categories?.performance?.score != null) {
          performanceScore = Math.round(lhr.categories.performance.score * 100);
        }
        lcpMs = lhr?.audits?.["largest-contentful-paint"]?.numericValue || null;
        clsValue = lhr?.audits?.["cumulative-layout-shift"]?.numericValue ?? null;
        psiOk = true;
      }
    } catch (e) {
      console.log("[Scan] PSI check failed:", (e as Error)?.message);
    }

    // Build findings
    const findings: any[] = [];
    let idx = 1;
    let missingMeta = 0, missingH1 = 0, brokenLinks = 0;

    if (technicalOk) {
      if (!hasMetaDesc) { missingMeta = 1; findings.push({ id: `f_${idx++}`, title: "Missing Meta Description", severity: "medium", impact: "Medium", effort: "Low", summary: "Page is missing a meta description tag." }); }
      if (!hasH1) { missingH1 = 1; findings.push({ id: `f_${idx++}`, title: "Missing H1 Tag", severity: "medium", impact: "Medium", effort: "Low", summary: "Page is missing an H1 heading." }); }
      if (!hasTitle) { findings.push({ id: `f_${idx++}`, title: "Missing Title Tag", severity: "high", impact: "High", effort: "Low", summary: "Page is missing a title tag." }); }
      if (!hasCanonical) { findings.push({ id: `f_${idx++}`, title: "Missing Canonical Tag", severity: "low", impact: "Low", effort: "Low", summary: "Page is missing a canonical link tag." }); }
      if (httpStatus >= 400) { brokenLinks = 1; findings.push({ id: `f_${idx++}`, title: "HTTP Error", severity: "high", impact: "High", effort: "Medium", summary: `Page returned HTTP ${httpStatus}.` }); }
    } else {
      missingMeta = 5; missingH1 = 2;
      findings.push({ id: `f_${idx++}`, title: "Site Could Not Be Fully Analyzed", severity: "medium", impact: "High", effort: "Low", summary: "Our crawler could not fully access your site." });
    }

    if (psiOk) {
      if (lcpMs && lcpMs > 2500) findings.push({ id: `f_${idx++}`, title: "Slow Page Speed", severity: lcpMs > 4000 ? "high" : "medium", impact: lcpMs > 4000 ? "High" : "Medium", effort: "Medium", summary: `LCP is ${(lcpMs / 1000).toFixed(1)}s on mobile.` });
      if (clsValue !== null && clsValue > 0.1) findings.push({ id: `f_${idx++}`, title: "Layout Shifts Detected", severity: clsValue > 0.25 ? "high" : "medium", impact: clsValue > 0.25 ? "High" : "Medium", effort: "Medium", summary: `CLS is ${clsValue.toFixed(2)}.` });
    } else {
      performanceScore = 70;
      findings.push({ id: `f_${idx++}`, title: "Performance Analysis Limited", severity: "low", impact: "Medium", effort: "Low", summary: "Core Web Vitals analysis was limited." });
    }

    // Calculate scores
    const techIssueCount = findings.filter(f => f.severity === "high" || f.severity === "medium").length;
    const technicalScore = Math.max(20, 100 - techIssueCount * 10 - brokenLinks * 15);
    const contentScore = Math.max(20, 100 - missingMeta * 8 - missingH1 * 6);
    const serpScore = 50;
    const authorityScore = 50;
    const overall = Math.round(technicalScore * 0.25 + performanceScore * 0.25 + contentScore * 0.2 + serpScore * 0.15 + authorityScore * 0.15);

    const severity = 100 - overall;
    const trafficAtRisk = Math.max(200, Math.round(severity * 35 + findings.length * 50));
    const clicksLost = Math.max(100, Math.round(trafficAtRisk * 1.5));

    const scoreSummary = {
      overall: Math.min(100, Math.max(0, overall)),
      technical: Math.min(100, Math.max(0, technicalScore)),
      content: Math.min(100, Math.max(0, contentScore)),
      performance: Math.min(100, Math.max(0, performanceScore)),
      serp: serpScore,
      authority: authorityScore,
      costOfInaction: {
        trafficAtRisk,
        clicksLost,
        leadsMin: Math.max(5, Math.round(clicksLost * 0.025 * 0.6)),
        leadsMax: Math.max(15, Math.round(clicksLost * 0.025 * 1.6)),
        pageOneOpportunities: Math.max(3, findings.length),
      },
    };

    const visibilityMode = technicalOk ? "full" : "limited";
    const fullReport = {
      visibilityMode,
      limitedVisibilityReason: !technicalOk ? "Crawl was limited" : null,
      limitedVisibilitySteps: !technicalOk ? ["Allow our crawler access", "Submit your sitemap"] : [],
      technical: technicalOk ? { ok: true, pages_crawled: 1, findings: findings.filter(f => f.title !== "Performance Analysis Limited" && f.title !== "Slow Page Speed" && f.title !== "Layout Shifts Detected") } : null,
      performance: psiOk ? { ok: true, performance_score: performanceScore, lab: { lcp_ms: lcpMs, cls: clsValue }, url: `https://${domain}` } : null,
      serp: null,
      competitive: null,
      backlinks: null,
      keywords: { quickWins: [{ keyword: "Keyword analysis pending", position: 0 }], declining: [] },
      competitors: [{ domain: "Competitor analysis pending", overlap: 0 }],
      contentGaps: [],
      authority: { domainAuthority: null, referringDomains: null },
    };

    // Update scan to preview_ready
    await pool.query(
      `UPDATE scan_requests
       SET status = 'preview_ready', preview_findings = $1::jsonb, score_summary = $2::jsonb,
           full_report = $3::jsonb, completed_at = NOW(), updated_at = NOW()
       WHERE scan_id = $4`,
      [JSON.stringify(findings), JSON.stringify(scoreSummary), JSON.stringify(fullReport), scanId]
    );

    return res.status(200).json({ ok: true, scanId, status: "queued", message: "Scan started successfully" });
  } catch (error: any) {
    console.error("[Scan] Unhandled error:", error?.message, error?.stack);
    if (!res.headersSent) {
      return res.status(500).json({ ok: false, message: error?.message || "Scan failed" });
    }
  }
}
