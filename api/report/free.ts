import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../_lib/db.js";
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
    if (req.method === "GET") return res.json({ ok: true, fn: "report/free", ts: Date.now() });
    if (req.method !== "POST") return res.status(405).json({ ok: false, message: "Method not allowed" });

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const scanId = body?.scanId;
    if (!scanId || typeof scanId !== "string") {
      return res.status(400).json({ ok: false, message: "scanId is required" });
    }

    const pool = getPool();

    const scanResult = await pool.query(
      `SELECT scan_id, target_url, normalized_url, status, preview_findings, full_report, score_summary
       FROM scan_requests WHERE scan_id = $1`,
      [scanId]
    );

    if (scanResult.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Scan not found" });
    }

    const scan = scanResult.rows[0];
    if (scan.status !== "preview_ready" && scan.status !== "completed") {
      return res.status(400).json({ ok: false, message: "Scan is not ready yet" });
    }

    const reportId = `fr_${Date.now()}_${randomUUID().slice(0, 8)}`;

    let domain: string;
    try { domain = new URL(scan.normalized_url || scan.target_url).hostname; }
    catch { domain = (scan.normalized_url || scan.target_url).replace(/^https?:\/\//, "").split("/")[0]; }

    const previewFindings = scan.preview_findings || [];
    const scoreSummary = scan.score_summary || {};
    const fullReport = scan.full_report || {};

    // Build technical buckets
    const bucketMap: Record<string, any[]> = {};
    for (const f of previewFindings) {
      const cat = f.category || (f.title?.toLowerCase().includes("meta") ? "meta" : "errors");
      if (!bucketMap[cat]) bucketMap[cat] = [];
      bucketMap[cat].push({
        id: f.id || `f_${Math.random().toString(36).slice(2, 8)}`,
        title: f.title || "Issue found",
        severity: f.severity || "medium",
        description: f.summary || f.description || "",
        evidence: [],
      });
    }

    const technicalBuckets = Object.entries(bucketMap).map(([name, findings]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, " "),
      status: findings.some((f: any) => f.severity === "high") ? "critical" : findings.some((f: any) => f.severity === "medium") ? "warning" : "ok",
      findings,
    }));

    if (technicalBuckets.length === 0) {
      technicalBuckets.push({ name: "General", status: "ok", findings: [{ id: "f_none", title: "No major issues detected", severity: "low", description: "Initial scan looks good.", evidence: [] }] });
    }

    // Performance
    const cwv = fullReport.performance || {};
    let performanceUrls: any[];
    if (cwv?.ok && cwv?.lab) {
      const lcpMs = cwv.lab.lcp_ms;
      const cls = cwv.lab.cls;
      const lcpStatus = lcpMs && lcpMs > 4000 ? "poor" : lcpMs && lcpMs > 2500 ? "needs_work" : "good";
      const clsStatus = cls !== null && cls > 0.25 ? "poor" : cls !== null && cls > 0.1 ? "needs_work" : "good";
      const overall = lcpStatus === "poor" || clsStatus === "poor" ? "critical" : lcpStatus === "needs_work" || clsStatus === "needs_work" ? "needs_attention" : "good";
      performanceUrls = [{ url: cwv.url || scan.normalized_url, lcp_status: lcpStatus, cls_status: clsStatus, inp_status: "not_available", overall }];
    } else {
      performanceUrls = [{ url: scan.normalized_url, lcp_status: "good", cls_status: "good", inp_status: "not_available", overall: "good" }];
    }

    // Keywords (placeholder)
    const keywordTargets = [
      { keyword: `${domain.replace("www.", "")} services`, intent: "high_intent", rank: null, volume: 500, winner_domain: null },
      { keyword: `best ${domain.split(".")[0]}`, intent: "informational", rank: null, volume: 1200, winner_domain: null },
      { keyword: `${domain.split(".")[0]} near me`, intent: "high_intent", rank: null, volume: 800, winner_domain: null },
    ];

    // Competitors (placeholder)
    const competitorItems = [
      { domain: `competitor1-${domain.split(".")[0]}.com`, overlap_pct: 0, shared_keywords: 0, example_pages: [] },
      { domain: `competitor2-${domain.split(".")[0]}.com`, overlap_pct: 0, shared_keywords: 0, example_pages: [] },
    ];

    // Summary
    const healthScore = scoreSummary.overall ?? 65;
    const topIssues = previewFindings
      .filter((f: any) => f.severity === "high" || f.severity === "medium")
      .slice(0, 3)
      .map((f: any) => f.title || f.summary || "Issue found");

    const summary = {
      health_score: healthScore,
      top_issues: topIssues.length > 0 ? topIssues : ["Review site SEO fundamentals"],
      top_opportunities: ["Optimize meta descriptions", "Improve page speed", "Build quality backlinks"],
      one_liner: `Your site scores ${healthScore}/100. ${topIssues.length > 0 ? `Key issue: ${topIssues[0]}.` : "Looking solid overall."}`,
    };

    const nextSteps = {
      ctas: [
        { id: "cta_1", label: "Fix Technical Issues", action: "signup", description: "Address the technical SEO issues found in your scan" },
        { id: "cta_2", label: "Track Keywords", action: "signup", description: "Monitor your keyword rankings over time" },
        { id: "cta_3", label: "Get Full Report", action: "signup", description: "Unlock the complete SEO analysis with actionable recommendations" },
      ],
    };

    const meta = {
      generation_status: "partial",
      missing: { keywords: "Requires Search Console", competitors: "Requires SERP API" },
      scores: {
        overall: scoreSummary.overall ?? null,
        technical: scoreSummary.technical ?? null,
        content: scoreSummary.content ?? null,
        performance: scoreSummary.performance ?? null,
        serp: scoreSummary.serp ?? null,
        authority: scoreSummary.authority ?? null,
      },
      costOfInaction: scoreSummary.costOfInaction || null,
    };

    const visMode = fullReport.visibilityMode || "full";

    await pool.query(
      `INSERT INTO free_reports (
        report_id, scan_id, website_url, website_domain, report_version, status,
        summary, competitors, keywords, technical, performance, next_steps, meta,
        visibility_mode, limited_visibility_reason, limited_visibility_steps,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb, $13::jsonb, $14, $15, $16::jsonb, NOW(), NOW())`,
      [
        reportId, scanId,
        scan.normalized_url || scan.target_url, domain,
        1, "ready",
        JSON.stringify(summary),
        JSON.stringify({ items: competitorItems, insight: "Competitor data requires SERP API integration." }),
        JSON.stringify({ targets: keywordTargets, bucket_counts: { rank_1: 0, top_3: 0, "4_10": 0, "11_30": 0, not_ranking: keywordTargets.length }, insight: "Keyword data requires Search Console integration." }),
        visMode === "limited" ? null : JSON.stringify({ buckets: technicalBuckets }),
        JSON.stringify({ urls: performanceUrls, global_insight: "Connect Google Search Console for detailed Core Web Vitals data." }),
        JSON.stringify(nextSteps),
        JSON.stringify(meta),
        visMode,
        fullReport.limitedVisibilityReason || null,
        JSON.stringify(fullReport.limitedVisibilitySteps || []),
      ]
    );

    return res.json({ ok: true, reportId });
  } catch (error: any) {
    console.error("[FreeReport] Failed:", error?.message, error?.stack);
    if (!res.headersSent) {
      return res.status(500).json({ ok: false, message: error?.message || "Failed to create free report" });
    }
  }
}
