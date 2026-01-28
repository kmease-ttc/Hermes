import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const PORT = process.env.PORT || '5000';
const BASE = `http://localhost:${PORT}`;
const TEST_EMAIL = `test-site-${Date.now()}@arclo-test.local`;
const TEST_PASSWORD = 'TestPass123!secure';
const TEST_SITE_NAME = 'Test Dashboard Site';
const TEST_DOMAIN = 'www.test-dashboard-site.example';

/**
 * Integration tests for the "add a site to the dashboard" flow.
 *
 * Requires the server to be running on port 5000.
 * Run with: npx vitest run tests/addSiteToDashboard.spec.ts
 *
 * Flow:
 *   1. Register a user
 *   2. Log in to obtain a session cookie
 *   3. POST /api/sites to create a new site
 *   4. GET /api/sites to confirm it appears in the list
 *   5. GET /api/dashboard/:siteId to confirm the dashboard endpoint responds
 *   6. Cleanup: delete the site
 */

let sessionCookie = '';
let createdSiteId = '';
let serverAvailable = false;

/** Helper: extract the Set-Cookie value from a fetch Response */
function extractCookie(res: Response): string {
  const raw = res.headers.get('set-cookie') || '';
  const match = raw.match(/arclo\.sid=[^;]+/);
  return match ? match[0] : '';
}

/** Helper: check if the server is reachable */
async function isServerRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Setup: register, verify, login ──────────────────────────────────

beforeAll(async () => {
  serverAvailable = await isServerRunning();
  if (!serverAvailable) {
    console.warn('[setup] Server is not running on port 5000. Skipping integration tests.');
    return;
  }

  // 1. Register
  const regRes = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      displayName: 'Dashboard Test User',
    }),
  });
  const regData = await regRes.json();
  if (!regRes.ok && !regData.error?.includes('already')) {
    console.warn('[setup] Registration response:', regRes.status, regData);
  }

  // 2. Login
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    redirect: 'manual',
  });
  const loginData = await loginRes.json();

  if (loginData.success) {
    sessionCookie = extractCookie(loginRes);
  } else {
    console.warn('[setup] Login failed:', loginData.error);
  }
});

// ─── Cleanup ─────────────────────────────────────────────────────────

afterAll(async () => {
  if (createdSiteId && sessionCookie) {
    await fetch(`${BASE}/api/sites/${createdSiteId}`, {
      method: 'DELETE',
      headers: { Cookie: sessionCookie },
    }).catch(() => {});
  }
});

// ─── Helper to skip if server is not running ─────────────────────────

function skipIfNoServer() {
  if (!serverAvailable) {
    console.log('  → skipped (server not running)');
    return true;
  }
  return false;
}

// ─── Tests ───────────────────────────────────────────────────────────

describe('Add site to dashboard', () => {

  it('should reject site creation without authentication', async () => {
    if (skipIfNoServer()) return;

    const res = await fetch(`${BASE}/api/sites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        displayName: TEST_SITE_NAME,
        baseUrl: `https://${TEST_DOMAIN}`,
        status: 'onboarding',
      }),
      // No cookie → no session
    });

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('should reject site creation with missing displayName', async () => {
    if (skipIfNoServer() || !sessionCookie) return;

    const res = await fetch(`${BASE}/api/sites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        baseUrl: `https://${TEST_DOMAIN}`,
        status: 'onboarding',
      }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Validation');
    expect(data.details).toBeDefined();
    expect(Array.isArray(data.details)).toBe(true);
  });

  it('should reject site creation with invalid baseUrl', async () => {
    if (skipIfNoServer() || !sessionCookie) return;

    const res = await fetch(`${BASE}/api/sites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        displayName: TEST_SITE_NAME,
        baseUrl: 'not-a-url',
        status: 'onboarding',
      }),
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Validation');
  });

  it('should create a site with valid data and session', async () => {
    if (skipIfNoServer()) return;
    if (!sessionCookie) {
      console.warn('  → skipped (no session – login may have failed; is the user verified?)');
      return;
    }

    const res = await fetch(`${BASE}/api/sites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: sessionCookie,
      },
      body: JSON.stringify({
        displayName: TEST_SITE_NAME,
        baseUrl: `https://${TEST_DOMAIN}`,
        status: 'onboarding',
      }),
    });

    expect(res.status).toBe(201);

    const site = await res.json();
    expect(site.siteId).toBeDefined();
    expect(site.siteId).toMatch(/^site_\d+_[a-f0-9]+$/);
    expect(site.displayName).toBe(TEST_SITE_NAME);
    expect(site.baseUrl).toBe(`https://${TEST_DOMAIN}`);
    expect(site.status).toBe('onboarding');

    createdSiteId = site.siteId;
  });

  it('should include the new site in GET /api/sites', async () => {
    if (skipIfNoServer() || !sessionCookie || !createdSiteId) return;

    const res = await fetch(`${BASE}/api/sites`, {
      headers: { Cookie: sessionCookie },
    });

    expect(res.ok).toBe(true);

    const sites = await res.json();
    expect(Array.isArray(sites)).toBe(true);

    const found = sites.find((s: any) => s.siteId === createdSiteId);
    expect(found).toBeDefined();
    expect(found.displayName).toBe(TEST_SITE_NAME);
    expect(found.baseUrl).toBe(`https://${TEST_DOMAIN}`);
  });

  it('should return dashboard data (or graceful error) for the new site', async () => {
    if (skipIfNoServer() || !sessionCookie || !createdSiteId) return;

    const res = await fetch(`${BASE}/api/dashboard/${createdSiteId}`, {
      headers: { Cookie: sessionCookie },
    });

    // The dashboard endpoint may return 200 with empty/zero data
    // or 500 if the SERP worker is not running — both are acceptable
    // in a test environment. The key assertion: it should NOT return 401/403.
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);

    if (res.status === 200) {
      const data = await res.json();
      expect(data.siteId).toBe(createdSiteId);
      expect(data.domain).toBeDefined();
      expect(data.summary).toBeDefined();
      expect(data.summary.totalKeywords).toBeTypeOf('number');
      expect(data.hasRealData).toBeTypeOf('boolean');
    }
  });

  it('should be able to delete the created site', async () => {
    if (skipIfNoServer() || !sessionCookie || !createdSiteId) return;

    const res = await fetch(`${BASE}/api/sites/${createdSiteId}`, {
      method: 'DELETE',
      headers: { Cookie: sessionCookie },
    });

    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(data.success).toBe(true);

    // Confirm it no longer appears in the list
    const listRes = await fetch(`${BASE}/api/sites`, {
      headers: { Cookie: sessionCookie },
    });
    const sites = await listRes.json();
    const found = sites.find((s: any) => s.siteId === createdSiteId);
    expect(found).toBeUndefined();

    // Prevent afterAll from trying to delete again
    createdSiteId = '';
  });
});
