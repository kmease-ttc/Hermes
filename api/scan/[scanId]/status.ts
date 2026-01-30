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

  const { scanId } = req.query;

  if (!scanId || typeof scanId !== "string") {
    return res.status(400).json({ ok: false, message: "Scan ID is required" });
  }

  try {
    const pool = getPool();
    const result = await pool.query(
      `SELECT scan_id, status, error_message, created_at, started_at, completed_at
       FROM scan_requests
       WHERE scan_id = $1`,
      [scanId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ ok: false, message: "Scan not found" });
    }

    const scan = result.rows[0];
    let progress = 0;
    let message = "Starting scan...";

    if (scan.status === "queued") {
      progress = 10;
      message = "Queued for scanning...";
    } else if (scan.status === "running") {
      progress = 50;
      message = "Analyzing SEO, performance, and content...";
    } else if (scan.status === "preview_ready" || scan.status === "completed") {
      progress = 100;
      message = "Scan complete!";
    } else if (scan.status === "failed") {
      progress = 0;
      message = scan.error_message || "Scan failed";
    }

    return res.json({
      scanId: scan.scan_id,
      status: scan.status,
      progress,
      message,
    });
  } catch (error: any) {
    console.error(`[ScanStatus] Error for ${scanId}:`, error);
    return res.status(500).json({ ok: false, message: "Failed to check scan status" });
  }
}
