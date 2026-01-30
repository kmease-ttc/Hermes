import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../_lib/db";
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

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const scanId = body?.scanId;

    if (!scanId || typeof scanId !== "string") {
      return res.status(400).json({ ok: false, message: "scanId is required" });
    }

    const pool = getPool();

    // Get scan data
    const scanResult = await pool.query(
      `SELECT scan_id, target_url, normalized_url, status, preview_findings, full_report, score_summary, geo_scope, geo_location
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
    try {
      domain = new URL(scan.normalized_url || scan.target_url).hostname;
    } catch {
      domain = (scan.normalized_url || scan.target_url).replace(/^https?:\/\//, "").split("/")[0];
    }

    // Import the transformers (pure functions, no server dependency)
    const {
      transformToSummary,
      transformToCompetitors,
      transformToKeywords,
      transformToTechnical,
      transformToPerformance,
      transformToNextSteps,
    } = await import("../../server/services/freeReportTransformers.js");

    const previewFindings = scan.preview_findings || [];
    const scoreSummary = scan.score_summary || {};
    const fullReport = scan.full_report || {};

    // Build crawler findings
    const rawCrawlerFindings = fullReport.technical?.findings || [];
    const crawlFindings = rawCrawlerFindings.length > 0
      ? rawCrawlerFindings.map((f: any) => ({
          category: f.category || "errors",
          severity: f.severity || "medium",
          title: f.ruleId || f.title || "Unknown issue",
          description: f.summary || f.description || f.detail,
          evidence: f.evidence ? [f.evidence] : [],
        }))
      : previewFindings.map((f: any) => ({
          category: f.category || "errors",
          severity: f.severity || "medium",
          title: f.title || f.issue || "Unknown issue",
          description: f.description || f.detail,
          evidence: f.evidence || [],
        }));

    const technical = transformToTechnical(crawlFindings);
    const allTechnicalFindings = technical.buckets.flatMap((b: any) => b.findings);

    // Performance
    const cwvFromScan = fullReport.performance || {};
    let performanceUrls: any[] = [];

    if (cwvFromScan.ok && cwvFromScan.lab) {
      const lcpMs = cwvFromScan.lab?.lcp_ms;
      const cls = cwvFromScan.lab?.cls;
      const lcpStatus = lcpMs && lcpMs > 4000 ? "poor" : lcpMs && lcpMs > 2500 ? "needs_work" : "good";
      const clsStatus = cls !== null && cls > 0.25 ? "poor" : cls !== null && cls > 0.1 ? "needs_work" : "good";
      const overall = lcpStatus === "poor" || clsStatus === "poor" ? "critical" :
        lcpStatus === "needs_work" || clsStatus === "needs_work" ? "needs_attention" : "good";
      performanceUrls = [{ url: cwvFromScan.url || scan.normalized_url, lcp_status: lcpStatus, cls_status: clsStatus, inp_status: "not_available", overall }];
    } else {
      performanceUrls = [{
        url: scan.normalized_url || scan.target_url,
        lcp_status: allTechnicalFindings.some((f: any) => f.severity === "high") ? "needs_work" : "good",
        cls_status: "good", inp_status: "not_available",
        overall: allTechnicalFindings.some((f: any) => f.severity === "high") ? "needs_attention" : "good",
      }];
    }

    const performance = {
      urls: performanceUrls,
      global_insight: performanceUrls.some((u: any) => u.overall === "critical")
        ? "Performance issues detected that may impact rankings."
        : performanceUrls.some((u: any) => u.overall === "needs_attention")
        ? "Some pages need performance improvements."
        : "Page performance appears acceptable.",
    };

    // Keywords
    const serpFromScan = fullReport.serp || {};
    let serpKeywords = serpFromScan.rankings || [];
    const validSerpKeywords = serpKeywords.filter((kw: any) => {
      const kwText = kw.keyword || kw.query || "";
      return typeof kwText === "string" && kwText.trim().length > 0;
    });

    const keywordData = validSerpKeywords.length > 0
      ? validSerpKeywords.map((kw: any) => ({
          keyword: (kw.keyword || kw.query || "").trim(),
          intent: kw.priority === "money" || kw.category === "transactional" ? "high_intent" : "informational",
          position: kw.currentPosition || kw.position || null,
          volume: kw.volume || kw.searchVolume || 0,
          winnerDomain: undefined,
        }))
      : [
          { keyword: `${domain.replace("www.", "")} services`, intent: "high_intent", position: null, volume: 500, winnerDomain: undefined },
          { keyword: `best ${domain.split(".")[0]}`, intent: "informational", position: null, volume: 1200, winnerDomain: undefined },
          { keyword: `${domain.split(".")[0]} near me`, intent: "high_intent", position: null, volume: 800, winnerDomain: undefined },
        ];

    const keywords = transformToKeywords(keywordData);
    keywords.insight = validSerpKeywords.length > 0
      ? `Tracking ${validSerpKeywords.length} keywords.`
      : "Keyword data requires Search Console integration.";

    // Competitors
    const competitorData = [
      { domain: `competitor1-${domain.split(".")[0]}.com`, keywordCount: 0, positions: [], examplePages: [] },
      { domain: `competitor2-${domain.split(".")[0]}.com`, keywordCount: 0, positions: [], examplePages: [] },
    ];
    const competitors = transformToCompetitors(competitorData, { domain });
    competitors.insight = "Competitor analysis requires SERP API integration.";

    // Summary
    const baseScore = scoreSummary.overall ?? scoreSummary.overall_score ?? null;
    const summary = transformToSummary(allTechnicalFindings, performanceUrls, keywords.targets, { domain });
    if (typeof baseScore === "number") summary.health_score = baseScore;

    // Next steps
    const nextSteps = transformToNextSteps(allTechnicalFindings, performanceUrls, keywords.targets, summary.health_score);

    // Meta
    const meta = {
      generation_status: validSerpKeywords.length > 0 ? "complete" : "partial",
      missing: validSerpKeywords.length > 0 ? {} : { keywords: "Requires Search Console", competitors: "Requires SERP API" },
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

    const scanVisibilityMode = fullReport.visibilityMode || "full";

    // Insert report into free_reports table
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
        JSON.stringify(summary), JSON.stringify(competitors), JSON.stringify(keywords),
        scanVisibilityMode === "limited" ? null : JSON.stringify(technical),
        JSON.stringify(performance), JSON.stringify(nextSteps), JSON.stringify(meta),
        scanVisibilityMode, fullReport.limitedVisibilityReason || null,
        JSON.stringify(fullReport.limitedVisibilitySteps || []),
      ]
    );

    return res.json({ ok: true, reportId });
  } catch (error: any) {
    console.error("[FreeReport] Failed to create report:", error);
    return res.status(500).json({ ok: false, message: "Failed to create free report" });
  }
}
