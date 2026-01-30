/**
 * Simulates the exact browser flow from WhiteHero.tsx.
 *
 * This test replicates every fetch call the React frontend makes,
 * in the exact order and with the exact request shapes, to catch
 * any mismatch between frontend expectations and backend responses.
 *
 * Run:  npx vitest run tests/frontend-flow.test.ts
 */
import { describe, it, expect } from "vitest";

const BASE = `http://localhost:${process.env.PORT || 3000}`;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

describe("Browser flow simulation", () => {
  /**
   * Simulates exactly what WhiteHero.tsx handleLocationSubmit() does:
   *   1. normalizeUrl(input) → prepend https:// if missing
   *   2. POST /api/scan with { url, geoLocation: { city, state } }
   *   3. Navigate to /scan/preview/:scanId
   *
   * Then simulates ScanPreview.tsx:
   *   4. Poll GET /api/scan/:id/status every 2s until preview_ready
   *   5. POST /api/report/free with { scanId }
   *   6. Navigate to /report/free/:reportId
   *
   * Then simulates FreeReport.tsx:
   *   7. GET /api/report/free/:reportId
   *   8. Verify report has all sections the frontend expects
   */
  it("full user journey: enter URL → location → scan → report", async () => {
    // --- Step 1: Simulate frontend URL normalization ---
    const userInput = "example.com";
    let normalized = userInput.trim().toLowerCase();
    if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
      normalized = "https://" + normalized;
    }
    expect(normalized).toBe("https://example.com");

    // --- Step 2: POST /api/scan (WhiteHero.tsx:155-162) ---
    const scanRes = await fetch(`${BASE}/api/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: normalized,
        geoLocation: { city: "Los Angeles", state: "California" },
      }),
    });

    // Frontend checks: if (!res.ok) throw
    expect(scanRes.ok).toBe(true);
    expect(scanRes.status).toBe(200);

    const scanData = await scanRes.json();

    // Frontend reads: data.scanId || data.id
    expect(scanData.ok).toBe(true);
    const scanId = scanData.scanId || scanData.id;
    expect(scanId).toBeTruthy();
    expect(scanId).toMatch(/^scan_/);

    // --- Step 3: Frontend navigates to /scan/preview/:scanId ---
    // (client-side navigation, nothing to test server-side)

    // --- Step 4: Poll status (ScanPreview.tsx:36-56) ---
    let statusData: any;
    const pollStart = Date.now();
    const maxPollMs = 45_000;

    while (Date.now() - pollStart < maxPollMs) {
      const statusRes = await fetch(`${BASE}/api/scan/${scanId}/status`);

      // Frontend checks: res.status === 404 → throw "Scan not found"
      expect(statusRes.status).not.toBe(404);
      expect(statusRes.ok).toBe(true);

      statusData = await statusRes.json();

      // Frontend checks these status values to decide polling behavior
      expect(["queued", "running", "preview_ready", "completed", "failed"]).toContain(
        statusData.status
      );

      // Frontend stops polling when not queued/running
      if (statusData.status !== "queued" && statusData.status !== "running") break;

      await sleep(2000);
    }

    // Frontend condition: status === "preview_ready" || status === "completed"
    expect(["preview_ready", "completed"]).toContain(statusData?.status);

    // --- Step 5: Generate report (ScanPreview.tsx:76-90) ---
    const reportGenRes = await fetch(`${BASE}/api/report/free`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scanId }),
    });

    // Frontend: let data = await res.json()
    const reportGenData = await reportGenRes.json();

    // Frontend checks: data.ok && data.reportId
    expect(reportGenRes.ok).toBe(true);
    expect(reportGenData.ok).toBe(true);
    expect(reportGenData.reportId).toBeTruthy();

    const reportId = reportGenData.reportId;
    expect(reportId).toMatch(/^fr_/);

    // --- Step 6: Frontend navigates to /report/free/:reportId ---
    // (client-side navigation)

    // --- Step 7: Fetch report (FreeReport.tsx:1111-1130) ---
    const reportRes = await fetch(`${BASE}/api/report/free/${reportId}`);
    expect(reportRes.ok).toBe(true);

    const reportData = await reportRes.json();

    // Frontend checks: !data.ok || !data.report → throw
    expect(reportData.ok).toBe(true);
    expect(reportData.report).toBeTruthy();

    // --- Step 8: Verify FreeReportData shape (FreeReport.tsx:143-199) ---
    const report = reportData.report;

    // Required top-level fields
    expect(report.report_id).toBe(reportId);
    expect(report.website_id).toBeTruthy();
    expect(report.created_at).toBeTruthy();
    expect(report.source_scan_id).toBe(scanId);
    expect(report.inputs).toHaveProperty("target_url");

    // summary section (FreeReport.tsx:144-153)
    expect(report.summary).toBeDefined();
    expect(report.summary).toHaveProperty("health_score");
    expect(report.summary).toHaveProperty("top_issues");
    expect(report.summary).toHaveProperty("top_opportunities");
    expect(typeof report.summary.health_score).toBe("number");
    expect(Array.isArray(report.summary.top_issues)).toBe(true);

    // competitors section
    expect(report.competitors).toBeDefined();
    expect(report.competitors).toHaveProperty("items");
    expect(Array.isArray(report.competitors.items)).toBe(true);

    // keywords section
    expect(report.keywords).toBeDefined();
    expect(report.keywords).toHaveProperty("targets");
    expect(report.keywords).toHaveProperty("bucket_counts");
    expect(Array.isArray(report.keywords.targets)).toBe(true);
    const bc = report.keywords.bucket_counts;
    expect(bc).toHaveProperty("rank_1");
    expect(bc).toHaveProperty("top_3");
    expect(bc).toHaveProperty("4_10");
    expect(bc).toHaveProperty("11_30");
    expect(bc).toHaveProperty("not_ranking");

    // technical section
    expect(report.technical).toBeDefined();
    expect(report.technical).toHaveProperty("buckets");
    expect(Array.isArray(report.technical.buckets)).toBe(true);
    for (const bucket of report.technical.buckets) {
      expect(bucket).toHaveProperty("name");
      expect(bucket).toHaveProperty("status");
      expect(bucket).toHaveProperty("findings");
      expect(Array.isArray(bucket.findings)).toBe(true);
    }

    // performance section
    expect(report.performance).toBeDefined();
    expect(report.performance).toHaveProperty("urls");
    expect(Array.isArray(report.performance.urls)).toBe(true);

    // next_steps section
    expect(report.next_steps).toBeDefined();
    expect(report.next_steps).toHaveProperty("ctas");
    expect(Array.isArray(report.next_steps.ctas)).toBe(true);
    for (const cta of report.next_steps.ctas) {
      expect(cta).toHaveProperty("id");
      expect(cta).toHaveProperty("label");
      expect(cta).toHaveProperty("action");
    }

    // meta section (used by frontend for score display)
    expect(report.meta).toBeDefined();
    expect(report.meta).toHaveProperty("scores");
    expect(report.meta.scores).toHaveProperty("overall");
    expect(typeof report.meta.scores.overall).toBe("number");

    // visibility
    expect(["full", "limited"]).toContain(report.visibilityMode);

    console.log("\n✅ Full browser flow passed!");
    console.log(`   Scan ID:   ${scanId}`);
    console.log(`   Report ID: ${reportId}`);
    console.log(`   Score:     ${report.summary.health_score}/100`);
    console.log(`   Sections:  ${Object.keys(report).length} fields`);
    console.log(`   Findings:  ${report.technical.buckets.reduce((n: number, b: any) => n + b.findings.length, 0)} technical issues`);
  });
});
