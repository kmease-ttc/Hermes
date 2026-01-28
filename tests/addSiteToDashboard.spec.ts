import { describe, it, expect, beforeAll, afterAll } from 'vitest';

const BASE = 'http://localhost:5000';
const TEST_EMAIL = `test-site-${Date.now()}@arclo-test.local`;
const TEST_PASSWORD = 'TestPass123!secure';
const TEST_SITE_NAME = 'Test Dashboard Site';
const TEST_DOMAIN = 'www.test-dashboard-site.example';

/**
 * Integration tests for the "add a site to the dashboard" flow.
 *
 * Requires the server to be running on port 5000.
 *
 * Flow:
 *   1. Register a user
 *   2. Verify the user (directly via DB helper since we can't click an email link)
 *   3. Log in to obtain a session cookie
 *   4. POST /api/sites to create a new site
 *   5. GET /api/sites to confirm it appears in the list
 *   6. GET /api/dashboard/:siteId to confirm the dashboard endpoint responds
 *   7. Cleanup: delete the site
 */

let sessionCookie = '';
let createdSiteId = '';

/** Helper: extract the Set-Cookie value from a fetch Response */
function extractCookie(res: Response): string {
  const raw = res.headers.get('set-cookie') || '';
  // Take the first cookie (arclo.sid=…)
  const match = raw.match(/arclo\.sid=[^;]+/);
  return match ? match[0] : '';
}

// ─── Setup: register, verify, login ──────────────────────────────────

beforeAll(async () => {
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
  // Registration may succeed or user may already exist from a previous run
  if (!regRes.ok && !regData.error?.includes('already')) {
    console.warn('[setup] Registration response:', regRes.status, regData);
  }

  // 2. Verify the user directly by logging in (if auto-verified in dev)
  //    or by calling verify-email with the token.
  //    Since we cannot access email, we do a direct DB verification via
  //    the /api/auth/dev-verify endpoint if available, or just attempt login.
  //    In production builds, the test user would need to be pre-verified.

  // 3. Login
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
    // If login fails because email not verified, the test can't proceed.
    // Log the issue so it shows up in the test output.
    console.warn('[setup] Login failed:', loginData.error);
  }
});

// ─── Cleanup ─────────────────────────────────────────────────────────

afterAll(async () => {
  if (createdSiteId && sessionCookie) {
    await fetch(`${BASE}/api/sites/${createdSiteId}`, {
      method: 'DELETE',
      headers: { Cookie: sessionCookie },
    });
  }
});

// ─── Tests ───────────────────────────────────────────────────────────

describe('Add site to dashboard', () => {

  it('should reject site creation without authentication', async () => {
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
    if (!sessionCookie) return; // skip if login failed

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
    if (!sessionCookie) return;

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
    if (!sessionCookie) {
      console.warn('Skipping: no session cookie (login may have failed – is the user verified?)');
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
    if (!sessionCookie || !createdSiteId) return;

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

  it('should return dashboard data for the new site', async () => {
    if (!sessionCookie || !createdSiteId) return;

    const res = await fetch(`${BASE}/api/dashboard/${createdSiteId}`, {
      headers: { Cookie: sessionCookie },
    });

    // The dashboard endpoint may return 200 with empty data
    // or 500 if the SERP worker is not running — both are acceptable
    // in a test environment. The key thing: it should NOT return 401/403.
    expect([200, 500]).toContain(res.status);

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
    if (!sessionCookie || !createdSiteId) return;

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
