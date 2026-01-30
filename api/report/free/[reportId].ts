import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPool } from "../../_lib/db";

function setCorsHeaders(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", process.env.FRONTEND_URL || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  }

  const { reportId } = req.query;

  if (!reportId || typeof reportId !== "string") {
    return res.status(400).json({ ok: false, message: "Report ID is required" });
  }

  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT report_id, scan_id, website_url, website_domain, report_version, status,
              summary, competitors, keywords, technical, performance, next_steps, meta,
              visibility_mode, limited_visibility_reason, limited_visibility_steps,
              created_at, updated_at
       FROM free_reports
       WHERE report_id = $1`,
      [reportId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Report not found" });
    }

    const report = result.rows[0];

    if (report.status === "generating") {
      return res.status(202).json({
        ok: true,
        status: "generating",
        message: "Report is still being generated",
      });
    }

    return res.json({
      ok: true,
      report: {
        report_id: report.report_id,
        website_id: report.website_domain,
        created_at: report.created_at,
        source_scan_id: report.scan_id,
        report_version: report.report_version,
        inputs: { target_url: report.website_url },
        summary: report.summary,
        competitors: report.competitors,
        keywords: report.keywords,
        technical: report.technical,
        performance: report.performance,
        next_steps: report.next_steps,
        meta: report.meta,
        visibilityMode: report.visibility_mode || "full",
        limitedVisibilityReason: report.limited_visibility_reason || null,
        limitedVisibilitySteps: report.limited_visibility_steps || [],
      },
    });
  } catch (error: any) {
    console.error(`[FreeReport] Failed to get report ${reportId}:`, error);
    return res.status(500).json({ ok: false, message: "Failed to get report" });
  }
}
