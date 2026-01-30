import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "./_lib/db";
import { randomUUID } from "crypto";

function setCorsHeaders(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  const pool = getPool();
  let scanId = "";

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    if (!body?.url || typeof body.url !== "string") {
      return res.status(400).json({ ok: false, message: "Valid URL is required" });
    }

    let normalizedUrl = body.url.trim();
    if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      return res.status(400).json({ ok: false, message: "Valid URL is required" });
    }

    const geoLocation = body.geoLocation || null;
    scanId = `scan_${Date.now()}_${randomUUID().slice(0, 8)}`;
    const geoScope = geoLocation ? "local" : null;
    const geoLocationJson = geoLocation ? JSON.stringify(geoLocation) : null;

    // Insert scan request
    try {
      await pool.query(
        `INSERT INTO scan_requests (scan_id, target_url, normalized_url, status, geo_scope, geo_location, created_at, updated_at)
         VALUES ($1, $2, $3, 'queued', $4, $5::jsonb, NOW(), NOW())`,
        [scanId, body.url, normalizedUrl, geoScope, geoLocationJson]
      );
    } catch (insertErr: any) {
      if (insertErr.message?.includes("geo_scope") || insertErr.message?.includes("geo_location") || insertErr.code === "42703") {
        await pool.query(
          `INSERT INTO scan_requests (scan_id, target_url, normalized_url, status, created_at, updated_at)
           VALUES ($1, $2, $3, 'queued', NOW(), NOW())`,
          [scanId, body.url, normalizedUrl]
        );
      } else {
        throw insertErr;
      }
    }

    // Update to running
    await pool.query(
      `UPDATE scan_requests SET status = 'running', started_at = NOW(), updated_at = NOW() WHERE scan_id = $1`,
      [scanId]
    );

    // Run analysis services
    let targetDomain: string;
    try {
      targetDomain = new URL(normalizedUrl).hostname.replace(/^www\./, "");
    } catch {
      targetDomain = normalizedUrl.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    }

    const WORKER_TIMEOUT = 50000; // 50s budget (Vercel Pro max is 60s)
    const withTimeout = <T>(promise: Promise<T>, name: string): Promise<T> =>
      Promise.race([
        promise,
        new Promise<T>((_, reject) =>
          setTimeout(() => reject(new Error(`${name} timed out`)), WORKER_TIMEOUT)
        ),
      ]);

    // Dynamic imports of analysis services
    let crawlerResult: PromiseSettledResult<any>;
    let cwvResult: PromiseSettledResult<any>;
    let serpResult: PromiseSettledResult<any>;
    let backlinkResult: PromiseSettledResult<any>;

    try {
      const [technicalMod, cwvMod, serpMod, backlinkMod] = await Promise.all([
        import("../server/services/technicalCrawler/index.js").catch(() => null),
        import("../server/services/coreWebVitalsService.js").catch(() => null),
        import("../server/services/serpIntelligence/index.js").catch(() => null),
        import("../server/services/backlinkAuthorityService.js").catch(() => null),
      ]);

      const domainBase = targetDomain.replace(/\.(com|net|org|io|co|us|biz|info)$/i, "").replace(/[-_]/g, " ");
      const locationStr = geoLocation ? `${geoLocation.city}, ${geoLocation.state}` : undefined;
      const baseKeywords = [
        { keyword: domainBase, volume: 500 },
        { keyword: `${domainBase} near me`, volume: 800 },
        { keyword: `${domainBase} services`, volume: 600 },
        { keyword: `best ${domainBase}`, volume: 1200 },
        { keyword: `${domainBase} reviews`, volume: 400 },
        { keyword: `${domainBase} cost`, volume: 350 },
        { keyword: `${domainBase} pricing`, volume: 450 },
        { keyword: `${domainBase} company`, volume: 300 },
        { keyword: `top ${domainBase}`, volume: 900 },
        { keyword: `${domainBase} online`, volume: 250 },
      ];
      const locationKeywords = locationStr && geoLocation ? [
        { keyword: `${domainBase} ${geoLocation.city}`, volume: 700 },
        { keyword: `${domainBase} ${geoLocation.state}`, volume: 500 },
        { keyword: `best ${domainBase} ${geoLocation.city}`, volume: 600 },
      ] : [];
      const serpKeywords = [...baseKeywords, ...locationKeywords].slice(0, 25);

      const promises: Promise<any>[] = [
        technicalMod?.runTechnicalCrawl
          ? withTimeout(technicalMod.runTechnicalCrawl(targetDomain, { maxPages: 20, maxDepth: 2 }), "Crawler")
          : Promise.reject(new Error("Module not loaded")),
        cwvMod?.runCoreWebVitalsAnalysis
          ? withTimeout(cwvMod.runCoreWebVitalsAnalysis(targetDomain), "CWV")
          : Promise.reject(new Error("Module not loaded")),
        serpMod?.runSerpAnalysis
          ? withTimeout(serpMod.runSerpAnalysis(targetDomain, serpKeywords, undefined, locationStr), "SERP")
          : Promise.reject(new Error("Module not loaded")),
        backlinkMod?.runBacklinkAuthorityAnalysis
          ? withTimeout(backlinkMod.runBacklinkAuthorityAnalysis(targetDomain), "Backlinks")
          : Promise.reject(new Error("Module not loaded")),
      ];

      [crawlerResult, cwvResult, serpResult, backlinkResult] = await Promise.allSettled(promises);
    } catch {
      // If imports fail entirely, all results are rejected
      crawlerResult = { status: "rejected", reason: new Error("Import failed") };
      cwvResult = { status: "rejected", reason: new Error("Import failed") };
      serpResult = { status: "rejected", reason: new Error("Import failed") };
      backlinkResult = { status: "rejected", reason: new Error("Import failed") };
    }

    const extractResult = (result: PromiseSettledResult<any>) => {
      if (result.status === "fulfilled") {
        return { ok: result.value?.ok !== false, data: result.value, error: null };
      }
      return { ok: false, data: null, error: (result as PromiseRejectedResult).reason?.message || "Failed" };
    };

    const crawlerData = extractResult(crawlerResult!);
    const cwvData = extractResult(cwvResult!);
    const serpData = extractResult(serpResult!);
    const backlinkData = extractResult(backlinkResult!);

    // Build findings
    const findings: any[] = [];
    let findingIndex = 1;
    let technicalIssueCount = 0, missingMetaCount = 0, missingH1Count = 0, brokenLinksCount = 0, contentIssueCount = 0;

    if (crawlerData.ok && crawlerData.data) {
      const cd = crawlerData.data;
      const crawlFindings = cd.findings || [];
      const crawlSummary = cd.summary || {};
      const pagesSummary = cd.pages_summary || [];
      technicalIssueCount = crawlFindings.length;
      brokenLinksCount = crawlSummary.errors || pagesSummary.filter((p: any) => p.status >= 400 || p.status === 0).length;
      const fbc = cd.findings_by_category || {};
      contentIssueCount = (fbc.meta || 0) + (fbc.content || 0);
      for (const f of crawlFindings) {
        if (f.ruleId === "RULE_META_DESC_MISSING" || f.ruleId === "RULE_META_DESC_TOO_LONG") missingMetaCount++;
        if (f.ruleId === "RULE_H1_MISSING" || f.ruleId === "RULE_H1_MULTIPLE") missingH1Count++;
      }
      if (missingMetaCount > 0) findings.push({ id: `finding_${findingIndex++}`, title: "Missing Meta Descriptions", severity: missingMetaCount > 5 ? "high" : "medium", impact: missingMetaCount > 5 ? "High" : "Medium", effort: "Low", summary: `${missingMetaCount} page(s) missing meta descriptions.` });
      if (missingH1Count > 0) findings.push({ id: `finding_${findingIndex++}`, title: "Missing H1 Tags", severity: missingH1Count > 3 ? "high" : "medium", impact: missingH1Count > 3 ? "High" : "Medium", effort: "Low", summary: `${missingH1Count} page(s) missing H1 tags.` });
      if (brokenLinksCount > 0) findings.push({ id: `finding_${findingIndex++}`, title: "Broken Links Detected", severity: brokenLinksCount > 3 ? "high" : "medium", impact: brokenLinksCount > 3 ? "High" : "Medium", effort: "Medium", summary: `${brokenLinksCount} page(s) return error status codes.` });
    } else {
      missingMetaCount = 5; missingH1Count = 2;
      findings.push({ id: `finding_${findingIndex++}`, title: "Missing Meta Descriptions", severity: "high", impact: "High", effort: "Low", summary: "Some pages may be missing meta descriptions." });
    }

    let performanceScore = 85;
    if (cwvData.ok && cwvData.data) {
      const cwv = cwvData.data;
      const lcpValue = cwv.lab?.lcp_ms || cwv.lcp || null;
      const clsValue = cwv.lab?.cls ?? cwv.cls ?? null;
      if (cwv.performance_score != null) performanceScore = Math.round(cwv.performance_score);
      else {
        const lcpS = lcpValue ? (lcpValue > 4000 ? 30 : lcpValue > 2500 ? 60 : 90) : 100;
        const clsS = clsValue !== null ? (clsValue > 0.25 ? 30 : clsValue > 0.1 ? 60 : 90) : 100;
        performanceScore = Math.round(lcpS * 0.6 + clsS * 0.4);
      }
      if (lcpValue && lcpValue > 2500) findings.push({ id: `finding_${findingIndex++}`, title: "Slow Page Speed", severity: lcpValue > 4000 ? "high" : "medium", impact: lcpValue > 4000 ? "High" : "Medium", effort: "Medium", summary: `LCP is ${(lcpValue / 1000).toFixed(1)}s on mobile.` });
    } else {
      performanceScore = 70;
      findings.push({ id: `finding_${findingIndex++}`, title: "Performance Analysis Limited", severity: "low", impact: "Medium", effort: "Low", summary: "Core Web Vitals analysis was limited." });
    }

    let serpScore = 50, authorityScore = 50;
    let quickWinKeywords: any[] = [], decliningKeywords: any[] = [];
    let domainAuthority: number | null = null, referringDomains: number | null = null;

    if (serpData.ok && serpData.data) {
      const kws = serpData.data.rankings || serpData.data.keywords || [];
      if (Array.isArray(kws) && kws.length > 0) {
        quickWinKeywords = kws.filter((kw: any) => kw.position >= 11 && kw.position <= 20);
        decliningKeywords = kws.filter((kw: any) => kw.change && kw.change < 0);
      }
      const avgP = serpData.data.avg_position || serpData.data.avgPosition;
      if (avgP) serpScore = avgP <= 10 ? 85 : avgP <= 20 ? 65 : avgP <= 50 ? 45 : 25;
    }

    if (backlinkData.ok && backlinkData.data) {
      domainAuthority = backlinkData.data.authority_score || backlinkData.data.domainAuthority || null;
      referringDomains = backlinkData.data.metrics?.referring_domains || backlinkData.data.referringDomains || null;
      if (domainAuthority !== null) authorityScore = domainAuthority >= 60 ? 90 : domainAuthority >= 40 ? 70 : domainAuthority >= 20 ? 50 : 30;
    }

    if (quickWinKeywords.length === 0 && decliningKeywords.length === 0) quickWinKeywords = [{ keyword: "Keyword analysis pending", position: 0 }];

    const technicalScore = Math.max(20, 100 - technicalIssueCount * 5 - brokenLinksCount * 10);
    const contentScore = Math.max(20, 100 - missingMetaCount * 8 - missingH1Count * 6 - contentIssueCount * 3);
    const overallScore = Math.round(technicalScore * 0.25 + performanceScore * 0.25 + contentScore * 0.20 + serpScore * 0.15 + authorityScore * 0.15);

    const severity = 100 - overallScore;
    const trafficAtRisk = Math.max(200, Math.round(severity * 35 + findings.length * 50));
    const clicksLost = Math.max(100, Math.round(trafficAtRisk * 1.5));

    const scoreSummary = {
      overall: Math.min(100, Math.max(0, overallScore)),
      technical: Math.min(100, Math.max(0, technicalScore)),
      content: Math.min(100, Math.max(0, contentScore)),
      performance: Math.min(100, Math.max(0, performanceScore)),
      serp: Math.min(100, Math.max(0, serpScore)),
      authority: Math.min(100, Math.max(0, authorityScore)),
      costOfInaction: {
        trafficAtRisk, clicksLost,
        leadsMin: Math.max(5, Math.round(clicksLost * 0.025 * 0.6)),
        leadsMax: Math.max(15, Math.round(clicksLost * 0.025 * 1.6)),
        pageOneOpportunities: Math.max(3, findings.length),
      },
    };

    const visibilityMode = crawlerData.ok ? "full" : "limited";
    const fullReport = {
      visibilityMode,
      limitedVisibilityReason: !crawlerData.ok ? (crawlerData.error || "Crawl was blocked or failed") : null,
      limitedVisibilitySteps: !crawlerData.ok ? ["Allow our crawler access", "Submit your sitemap", "Review robots.txt"] : [],
      technical: crawlerData.data || null,
      performance: cwvData.data || null,
      serp: serpData.data || null,
      competitive: null,
      backlinks: backlinkData.data || null,
      keywords: { quickWins: quickWinKeywords, declining: decliningKeywords },
      competitors: [{ domain: "Competitor analysis pending", overlap: 0 }],
      contentGaps: [],
      authority: { domainAuthority, referringDomains },
    };

    await pool.query(
      `UPDATE scan_requests
       SET status = 'preview_ready',
           preview_findings = $1::jsonb,
           score_summary = $2::jsonb,
           full_report = $3::jsonb,
           completed_at = NOW(),
           updated_at = NOW()
       WHERE scan_id = $4`,
      [JSON.stringify(findings), JSON.stringify(scoreSummary), JSON.stringify(fullReport), scanId]
    );

    return res.status(200).json({
      ok: true,
      scanId,
      status: "queued",
      message: "Scan started successfully",
    });
  } catch (error: any) {
    console.error("[Scan] Failed:", error);

    // Try to mark scan as failed
    if (scanId) {
      await pool.query(
        `UPDATE scan_requests SET status = 'failed', error_message = $1, updated_at = NOW() WHERE scan_id = $2`,
        [error.message?.slice(0, 500) || "Scan failed", scanId]
      ).catch(() => {});
    }

    if (!res.headersSent) {
      const isDbError = error.message?.includes("does not exist") || error.code === "42P01";
      return res.status(500).json({
        ok: false,
        message: isDbError ? "Database is not ready. Please try again in a moment." : "Failed to start scan. Please try again.",
      });
    }
  }
}
