/**
 * End-to-end scan pipeline tests.
 *
 * Tests the full "Analyze My Website" flow against the running server:
 *   1. POST /api/scan — start a scan
 *   2. GET  /api/scan/:id/status — poll until ready
 *   3. POST /api/report/free — generate report
 *   4. GET  /api/report/free/:id — retrieve report
 *
 * Run:  npm run test:scan
 * Requires: server running on localhost (PORT env or 3000)
 */
import { describe, it, expect, beforeAll } from "vitest";

const BASE = `http://localhost:${process.env.PORT || 3000}`;

async function api(path: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Origin: BASE,
      ...options?.headers,
    },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, body };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/* ------------------------------------------------------------------ */
/*  Health & Connectivity                                              */
/* ------------------------------------------------------------------ */
describe("Server connectivity", () => {
  it("serves the landing page HTML", async () => {
    const res = await fetch(BASE);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("<html");
    expect(html).toContain("Arclo");
  });

  it("GET /api/health returns JSON", async () => {
    const { status, body } = await api("/api/health");
    // Health endpoint may return 500 if non-critical tables (runs) are missing
    // but it should always return JSON with serverTime
    expect([200, 500]).toContain(status);
    expect(body).toHaveProperty("serverTime");
  });
});

/* ------------------------------------------------------------------ */
/*  Scan Start — POST /api/scan                                        */
/* ------------------------------------------------------------------ */
describe("POST /api/scan", () => {
  it("rejects missing URL", async () => {
    const { status, body } = await api("/api/scan", {
      method: "POST",
      body: JSON.stringify({}),
    });
    expect(status).toBe(400);
    expect(body?.ok).toBe(false);
  });

  it("rejects invalid URL", async () => {
    const { status, body } = await api("/api/scan", {
      method: "POST",
      body: JSON.stringify({ url: "not-a-url" }),
    });
    expect(status).toBe(400);
    expect(body?.ok).toBe(false);
  });

  it("accepts a valid URL and returns scanId", async () => {
    const { status, body } = await api("/api/scan", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com" }),
    });
    expect(status).toBe(200);
    expect(body?.ok).toBe(true);
    expect(body?.scanId).toMatch(/^scan_/);
    expect(body?.status).toBe("queued");
  });

  it("accepts URL with geoLocation", async () => {
    const { status, body } = await api("/api/scan", {
      method: "POST",
      body: JSON.stringify({
        url: "https://example.com",
        geoLocation: { city: "Austin", state: "Texas" },
      }),
    });
    expect(status).toBe(200);
    expect(body?.ok).toBe(true);
    expect(body?.scanId).toMatch(/^scan_/);
  });
});

/* ------------------------------------------------------------------ */
/*  Full pipeline: scan → poll → report → retrieve                     */
/* ------------------------------------------------------------------ */
describe("Full scan pipeline", () => {
  let scanId: string;
  let reportId: string;

  beforeAll(async () => {
    // Start a fresh scan
    const { body } = await api("/api/scan", {
      method: "POST",
      body: JSON.stringify({
        url: "https://example.com",
        geoLocation: { city: "Los Angeles", state: "California" },
      }),
    });
    expect(body?.ok).toBe(true);
    scanId = body.scanId;
  });

  it("scan status starts as queued or running", async () => {
    const { status, body } = await api(`/api/scan/${scanId}/status`);
    expect(status).toBe(200);
    expect(["queued", "running", "preview_ready", "completed"]).toContain(body?.status);
  });

  it("scan reaches preview_ready within 45 seconds", async () => {
    const deadline = Date.now() + 45_000;
    let lastStatus = "";

    while (Date.now() < deadline) {
      const { body } = await api(`/api/scan/${scanId}/status`);
      lastStatus = body?.status;
      if (lastStatus === "preview_ready" || lastStatus === "completed") break;
      if (lastStatus === "failed") throw new Error(`Scan failed: ${body?.message}`);
      await sleep(2000);
    }

    expect(["preview_ready", "completed"]).toContain(lastStatus);
  });

  it("scan status at 100% progress when ready", async () => {
    const { body } = await api(`/api/scan/${scanId}/status`);
    expect(body?.progress).toBe(100);
  });

  it("POST /api/report/free generates a report", async () => {
    const { status, body } = await api("/api/report/free", {
      method: "POST",
      body: JSON.stringify({ scanId }),
    });
    expect(status).toBe(200);
    expect(body?.ok).toBe(true);
    expect(body?.reportId).toMatch(/^fr_/);
    reportId = body.reportId;
  });

  it("GET /api/report/free/:id retrieves the report", async () => {
    const { status, body } = await api(`/api/report/free/${reportId}`);
    expect(status).toBe(200);
    expect(body?.ok).toBe(true);
    expect(body?.report).toBeDefined();
  });

  it("report contains all required sections", async () => {
    const { body } = await api(`/api/report/free/${reportId}`);
    const report = body?.report;

    expect(report).toHaveProperty("report_id");
    expect(report).toHaveProperty("summary");
    expect(report).toHaveProperty("competitors");
    expect(report).toHaveProperty("keywords");
    expect(report).toHaveProperty("technical");
    expect(report).toHaveProperty("performance");
    expect(report).toHaveProperty("next_steps");
    expect(report).toHaveProperty("meta");
    expect(report).toHaveProperty("visibilityMode");
  });

  it("report summary has health_score between 0 and 100", async () => {
    const { body } = await api(`/api/report/free/${reportId}`);
    const score = body?.report?.summary?.health_score;
    expect(score).toBeTypeOf("number");
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("report meta contains scores", async () => {
    const { body } = await api(`/api/report/free/${reportId}`);
    const scores = body?.report?.meta?.scores;
    expect(scores).toBeDefined();
    expect(scores).toHaveProperty("overall");
    expect(scores).toHaveProperty("technical");
    expect(scores).toHaveProperty("content");
    expect(scores).toHaveProperty("performance");
  });

  it("report technical section has buckets", async () => {
    const { body } = await api(`/api/report/free/${reportId}`);
    const buckets = body?.report?.technical?.buckets;
    expect(Array.isArray(buckets)).toBe(true);
    expect(buckets.length).toBeGreaterThan(0);
    for (const bucket of buckets) {
      expect(bucket).toHaveProperty("name");
      expect(bucket).toHaveProperty("status");
      expect(bucket).toHaveProperty("findings");
    }
  });

  it("report keywords section has targets and bucket_counts", async () => {
    const { body } = await api(`/api/report/free/${reportId}`);
    const kw = body?.report?.keywords;
    expect(kw).toHaveProperty("targets");
    expect(kw).toHaveProperty("bucket_counts");
    expect(Array.isArray(kw.targets)).toBe(true);
  });

  it("report performance section has urls array", async () => {
    const { body } = await api(`/api/report/free/${reportId}`);
    const perf = body?.report?.performance;
    expect(perf).toHaveProperty("urls");
    expect(Array.isArray(perf.urls)).toBe(true);
  });

  it("report next_steps has CTAs", async () => {
    const { body } = await api(`/api/report/free/${reportId}`);
    const ns = body?.report?.next_steps;
    expect(ns).toHaveProperty("ctas");
    expect(Array.isArray(ns.ctas)).toBe(true);
    expect(ns.ctas.length).toBeGreaterThan(0);
  });
});

/* ------------------------------------------------------------------ */
/*  Edge cases & error handling                                        */
/* ------------------------------------------------------------------ */
describe("Error handling", () => {
  it("GET /api/scan/nonexistent/status returns 404", async () => {
    const { status } = await api("/api/scan/nonexistent/status");
    expect(status).toBe(404);
  });

  it("GET /api/report/free/nonexistent returns 404", async () => {
    const { status } = await api("/api/report/free/nonexistent");
    expect(status).toBe(404);
  });

  it("POST /api/report/free with bad scanId returns error", async () => {
    const { status, body } = await api("/api/report/free", {
      method: "POST",
      body: JSON.stringify({ scanId: "scan_nonexistent" }),
    });
    expect([400, 404]).toContain(status);
    expect(body?.ok).toBe(false);
  });
});
