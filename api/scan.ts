import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "./_lib/db.js";
import { randomUUID } from "crypto";
import { scanHomepageServices, type HomepageScanResult } from "./_lib/homepageServiceScan.js";
import { buildSerpKeywords, buildFallbackKeywords, type SerpKeyword } from "./_lib/serpKeywordBuilder.js";
import { runAgent, skipAgent, finalizeAgentSummary } from "./_lib/agentRunner.js";
import { isNatashaConfigured, runNatashaCompetitors, type NatashaResult } from "./_lib/natashaClient.js";
import { analyzePageForAtlas, type AtlasResult } from "./_lib/atlasAnalyzer.js";

function setCorsHeaders(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

type ScanMode = "light" | "full";

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
    const geoLocation = body.geoLocation || null;
    const scanMode: ScanMode = body.mode === "full" ? "full" : "light";
    const force = body.force === true;

    // Extract domain
    let domain: string;
    try { domain = new URL(normalizedUrl).hostname.replace(/^www\./, ""); }
    catch { domain = normalizedUrl.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0]; }

    // ── Idempotency check ───────────────────────────────────────────
    const today = new Date().toISOString().slice(0, 10);
    const idempotencyKey = `${domain}-${scanMode}-${today}`;

    if (!force) {
      const existing = await pool.query(
        `SELECT scan_id, status FROM scan_requests
         WHERE idempotency_key = $1 AND status IN ('running', 'preview_ready', 'completed')
         LIMIT 1`,
        [idempotencyKey]
      );
      if (existing.rows.length > 0) {
        console.log(`[Scan] idempotency_hit { domain: "${domain}", key: "${idempotencyKey}", existingScanId: "${existing.rows[0].scan_id}" }`);
        return res.status(200).json({
          ok: true,
          scanId: existing.rows[0].scan_id,
          status: existing.rows[0].status,
          message: "Existing scan found for today",
          deduplicated: true,
        });
      }
    }

    const scanId = `scan_${Date.now()}_${randomUUID().slice(0, 8)}`;

    // Ensure tables exist (backwards compat for fresh DBs)
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
        scan_mode TEXT DEFAULT 'light',
        domain TEXT,
        idempotency_key TEXT,
        agent_summary JSONB,
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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_runs (
        id SERIAL PRIMARY KEY,
        scan_id TEXT NOT NULL,
        crew_id TEXT NOT NULL,
        agent_step TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        scan_mode TEXT NOT NULL DEFAULT 'light',
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        duration_ms INTEGER,
        rows_written INTEGER DEFAULT 0,
        result_summary JSONB,
        error_message TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Insert scan record with new columns
    await pool.query(
      `INSERT INTO scan_requests (scan_id, target_url, normalized_url, status, geo_scope, geo_location, scan_mode, domain, idempotency_key, started_at, created_at, updated_at)
       VALUES ($1, $2, $3, 'running', $4, $5::jsonb, $6, $7, $8, NOW(), NOW(), NOW())`,
      [scanId, body.url, normalizedUrl, geoLocation ? "local" : null, geoLocation ? JSON.stringify(geoLocation) : null, scanMode, domain, idempotencyKey]
    );

    console.log(`[Scan] scan_started { scanId: "${scanId}", domain: "${domain}", mode: "${scanMode}" }`);

    // Derive location string from geoLocation payload
    const locationStr: string | null = geoLocation
      ? (geoLocation.city && geoLocation.region
          ? `${geoLocation.city}, ${geoLocation.region}`
          : geoLocation.city || geoLocation.region || geoLocation.label || null)
      : null;

    // ════════════════════════════════════════════════════════════════
    // Phase A: Run agents in parallel
    // ════════════════════════════════════════════════════════════════

    // Shared state populated by agents
    let technicalOk = false;
    let hasTitle = true, hasMetaDesc = true, hasH1 = true, hasCanonical = true;
    let httpStatus = 200;
    let rawHtml = "";

    let performanceScore = 70;
    let lcpMs: number | null = null;
    let clsValue: number | null = null;
    let psiOk = false;

    let homepageScan: HomepageScanResult | null = null;
    let serpKeywordList: SerpKeyword[] = [];
    let serpResults: any[] = [];
    let serpRunOk = false;
    let serviceDetectionWarning = false;

    // ── Agent: Scotty (Technical Crawl) ─────────────────────────────
    const scottyResult = await runAgent(
      { scanId, crewId: "scotty", agentStep: "technical_crawl", scanMode },
      pool,
      async () => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
          const htmlRes = await fetch(`https://${domain}`, {
            headers: { "User-Agent": "Arclo-SEO-Scanner/1.0" },
            redirect: "follow",
            signal: controller.signal,
          });
          httpStatus = htmlRes.status;
          rawHtml = await htmlRes.text();
          hasTitle = /<title[^>]*>.+<\/title>/i.test(rawHtml);
          hasMetaDesc = /<meta[^>]*name=["']description["'][^>]*>/i.test(rawHtml);
          hasH1 = /<h1[^>]*>/i.test(rawHtml);
          hasCanonical = /<link[^>]*rel=["']canonical["'][^>]*>/i.test(rawHtml);
          technicalOk = true;
          return { httpStatus, hasTitle, hasMetaDesc, hasH1, hasCanonical, htmlLength: rawHtml.length };
        } finally {
          clearTimeout(timeout);
        }
      }
    );

    // ── Agent: Speedster (Core Web Vitals) ──────────────────────────
    const speedsterResult = await runAgent(
      { scanId, crewId: "speedster", agentStep: "cwv", scanMode },
      pool,
      async () => {
        const apiKey = process.env.GOOGLE_PAGESPEED_API_KEY || "";
        const psiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(`https://${domain}`)}&strategy=mobile${apiKey ? `&key=${apiKey}` : ""}`;
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 20000);
        try {
          const psiRes = await fetch(psiUrl, { signal: ctrl.signal });
          if (!psiRes.ok) throw new Error(`PSI returned ${psiRes.status}`);
          const psiJson = await psiRes.json();
          const lhr = psiJson.lighthouseResult;
          if (lhr?.categories?.performance?.score != null) {
            performanceScore = Math.round(lhr.categories.performance.score * 100);
          }
          lcpMs = lhr?.audits?.["largest-contentful-paint"]?.numericValue || null;
          clsValue = lhr?.audits?.["cumulative-layout-shift"]?.numericValue ?? null;
          psiOk = true;
          return { performanceScore, lcpMs, clsValue };
        } finally {
          clearTimeout(t);
        }
      }
    );

    // ── Service Detection + Keyword Building (runs on Scotty's HTML) ──
    if (technicalOk && rawHtml) {
      try {
        homepageScan = scanHomepageServices(rawHtml, `https://${domain}`);
        if (homepageScan.services.length > 0) {
          const effectiveLocation = locationStr
            || (homepageScan.locationCues.length > 0
                ? homepageScan.locationCues.join(", ")
                : null);
          serpKeywordList = buildSerpKeywords(homepageScan.services, effectiveLocation, domain);
        } else {
          serviceDetectionWarning = true;
          serpKeywordList = buildFallbackKeywords(
            homepageScan.evidence.meta.title,
            homepageScan.evidence.meta.description,
            locationStr,
            domain,
          );
        }
      } catch (e) {
        serviceDetectionWarning = true;
        serpKeywordList = buildFallbackKeywords(null, null, locationStr, domain);
      }
    } else {
      serviceDetectionWarning = true;
      serpKeywordList = buildFallbackKeywords(null, null, locationStr, domain);
    }

    // ── Agent: Lookout (SERP Rankings) ──────────────────────────────
    if (serpKeywordList.length > 0 && process.env.SERPAPI_API_KEY) {
      const lookoutResult = await runAgent(
        { scanId, crewId: "lookout", agentStep: "serp", scanMode },
        pool,
        async () => {
          const SERP_TIMEOUT_MS = 45_000;
          const SERP_DELAY_MS = 1500;
          const serpCtrl = new AbortController();
          const serpTimer = setTimeout(() => serpCtrl.abort(), SERP_TIMEOUT_MS);

          const apiKey = process.env.SERPAPI_API_KEY!;
          const serpBase = "https://serpapi.com/search";
          const baseDomain = domain.replace(/^www\./, "").toLowerCase();

          for (let i = 0; i < serpKeywordList.length; i++) {
            if (serpCtrl.signal.aborted) break;

            const kw = serpKeywordList[i];
            try {
              const params = new URLSearchParams({
                api_key: apiKey,
                engine: "google",
                q: kw.keyword,
                ...(locationStr ? { location: locationStr } : {}),
                google_domain: "google.com",
                gl: "us",
                hl: "en",
                num: "20",
              });
              const resp = await fetch(`${serpBase}?${params}`, {
                signal: AbortSignal.timeout(30_000),
              });

              if (resp.ok) {
                const data = await resp.json();
                const organicResults = data.organic_results || [];
                let position: number | null = null;
                let url: string | null = null;
                const competitors: any[] = [];

                for (const result of organicResults) {
                  let resultDomain: string | null = null;
                  try { resultDomain = new URL(result.link).hostname.toLowerCase().replace(/^www\./, ""); } catch {}
                  if (!resultDomain) continue;

                  if (resultDomain === baseDomain || resultDomain === `www.${baseDomain}`) {
                    if (position === null) {
                      position = result.position;
                      url = result.link;
                    }
                  } else {
                    competitors.push({ domain: resultDomain, url: result.link, title: result.title, position: result.position });
                  }
                }
                serpResults.push({ keyword: kw.keyword, intent: kw.intent, source: kw.source, position, url, competitors: competitors.slice(0, 5) });
              } else {
                serpResults.push({ keyword: kw.keyword, intent: kw.intent, source: kw.source, position: null, url: null, competitors: [] });
              }
            } catch {
              serpResults.push({ keyword: kw.keyword, intent: kw.intent, source: kw.source, position: null, url: null, competitors: [] });
            }

            if (i < serpKeywordList.length - 1 && !serpCtrl.signal.aborted) {
              await new Promise(r => setTimeout(r, SERP_DELAY_MS));
            }
          }

          clearTimeout(serpTimer);
          serpRunOk = true;

          const ranking = serpResults.filter(r => r.position !== null).length;
          return { checked: serpResults.length, ranking };
        }
      );
    } else if (!process.env.SERPAPI_API_KEY) {
      await skipAgent(
        { scanId, crewId: "lookout", agentStep: "serp", scanMode },
        pool,
        "SERPAPI_API_KEY not configured"
      );
    }

    // ── Agent: Natasha (Competitive Intelligence) ───────────────────
    let natashaResult: NatashaResult | null = null;
    if (isNatashaConfigured()) {
      const natashaRun = await runAgent(
        { scanId, crewId: "natasha", agentStep: "competitive", scanMode },
        pool,
        async () => {
          const keywords = serpKeywordList.slice(0, 5).map(k => k.keyword);
          return runNatashaCompetitors({
            targetDomain: domain,
            focusKeywords: keywords,
            websiteId: `free_${domain}`,
            runId: scanId,
          });
        }
      );
      natashaResult = natashaRun.result;
    } else {
      await skipAgent(
        { scanId, crewId: "natasha", agentStep: "competitive", scanMode },
        pool,
        "NATASHA_BASE_URL not configured"
      );
    }

    // ── Agent: Atlas (AI Search Optimization) ───────────────────────
    let atlasResult: AtlasResult | null = null;
    if (technicalOk && rawHtml) {
      const atlasRun = await runAgent(
        { scanId, crewId: "atlas", agentStep: "atlas_ai", scanMode },
        pool,
        async () => analyzePageForAtlas(rawHtml, `https://${domain}`)
      );
      atlasResult = atlasRun.result;
    } else {
      await skipAgent(
        { scanId, crewId: "atlas", agentStep: "atlas_ai", scanMode },
        pool,
        "No HTML available (technical crawl failed)"
      );
    }

    // ════════════════════════════════════════════════════════════════
    // Post-scan: scoring, findings, report assembly
    // ════════════════════════════════════════════════════════════════

    // Compute SERP score
    let serpScore = 50;
    if (serpRunOk && serpResults.length > 0) {
      const total = serpResults.length;
      const top3 = serpResults.filter(r => r.position !== null && r.position <= 3).length;
      const top10 = serpResults.filter(r => r.position !== null && r.position <= 10).length;
      const top20 = serpResults.filter(r => r.position !== null && r.position <= 20).length;
      const ranking = serpResults.filter(r => r.position !== null).length;

      serpScore = Math.round(
        Math.min(100, Math.max(0,
          (top3 / total) * 100 * 0.4 +
          (top10 / total) * 100 * 0.3 +
          (top20 / total) * 100 * 0.2 +
          (ranking / total) * 100 * 0.1
        ))
      );
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
      scan_mode: scanMode,
      limitedVisibilityReason: !technicalOk ? "Crawl was limited" : null,
      limitedVisibilitySteps: !technicalOk ? ["Allow our crawler access", "Submit your sitemap"] : [],
      technical: technicalOk ? { ok: true, pages_crawled: 1, findings: findings.filter(f => f.title !== "Performance Analysis Limited" && f.title !== "Slow Page Speed" && f.title !== "Layout Shifts Detected") } : null,
      performance: psiOk ? { ok: true, performance_score: performanceScore, lab: { lcp_ms: lcpMs, cls: clsValue }, url: `https://${domain}` } : null,
      serp: serpRunOk ? { ok: true, results: serpResults } : null,
      competitive: natashaResult ? { ok: true, findings: natashaResult.findings, findings_count: natashaResult.findings_count } : null,
      backlinks: null,
      keywords: serpRunOk
        ? { quickWins: serpResults.filter(r => r.position !== null && r.position <= 20).map(r => ({ keyword: r.keyword, position: r.position })), declining: [] }
        : { quickWins: [{ keyword: "Keyword analysis pending", position: 0 }], declining: [] },
      competitors: [],
      contentGaps: [],
      authority: { domainAuthority: null, referringDomains: null },
      homepage_scan: homepageScan,
      serp_keywords: serpKeywordList.map(k => ({ keyword: k.keyword, intent: k.intent, source: k.source })),
      serp_results: serpResults,
      serviceDetectionWarning,
      ai_search: atlasResult ? {
        ai_visibility_score: atlasResult.ai_visibility_score,
        structured_data_coverage: atlasResult.structured_data_coverage,
        entity_coverage: atlasResult.entity_coverage,
        llm_answerability: atlasResult.llm_answerability,
        checklist: atlasResult.checklist,
        findings: atlasResult.findings,
      } : null,
    };

    // Finalize agent summary
    await finalizeAgentSummary(scanId, pool);

    // Update scan to preview_ready
    await pool.query(
      `UPDATE scan_requests
       SET status = 'preview_ready', preview_findings = $1::jsonb, score_summary = $2::jsonb,
           full_report = $3::jsonb, completed_at = NOW(), updated_at = NOW()
       WHERE scan_id = $4`,
      [JSON.stringify(findings), JSON.stringify(scoreSummary), JSON.stringify(fullReport), scanId]
    );

    const totalMs = Date.now() - parseInt(scanId.split("_")[1]);
    console.log(`[ScanComplete] { scanId: "${scanId}", domain: "${domain}", mode: "${scanMode}", totalMs: ${totalMs} }`);

    return res.status(200).json({ ok: true, scanId, status: "queued", message: "Scan started successfully" });
  } catch (error: any) {
    console.error("[Scan] Unhandled error:", error?.message, error?.stack);
    if (!res.headersSent) {
      return res.status(500).json({ ok: false, message: error?.message || "Scan failed" });
    }
  }
}
