/**
 * Route Tests
 * 
 * Tests for canonical routes, deprecated route redirects, and route validation.
 */

import { describe, it, expect } from 'vitest';
import {
  ROUTES,
  buildRoute,
  DEPRECATED_ROUTES,
  isValidRoute,
  resolveDeprecatedRoute,
  getSafeRoute,
  getPostActionRoute,
  isKnownAgent,
} from './routes';

describe('Route Constants', () => {
  it('should have all required canonical routes defined', () => {
    expect(ROUTES.HOME).toBe('/');
    expect(ROUTES.DASHBOARD).toBe('/dashboard');
    expect(ROUTES.MISSION_CONTROL).toBe('/mission-control');
    expect(ROUTES.CREW).toBe('/crew');
    expect(ROUTES.AGENTS).toBe('/agents');
    expect(ROUTES.AGENT_DETAIL).toBe('/agents/:agentId');
    expect(ROUTES.KEYWORDS).toBe('/keywords');
    expect(ROUTES.AUTHORITY).toBe('/authority');
    expect(ROUTES.SPEEDSTER).toBe('/speedster');
    expect(ROUTES.SOCRATES).toBe('/socrates');
    expect(ROUTES.INTEGRATIONS).toBe('/integrations');
    expect(ROUTES.SETTINGS).toBe('/settings');
    expect(ROUTES.HELP).toBe('/help');
  });
});

describe('Route Builders', () => {
  it('should build agent routes correctly', () => {
    expect(buildRoute.agent('pulse')).toBe('/agents/pulse');
    expect(buildRoute.agent('natasha')).toBe('/agents/natasha');
    expect(buildRoute.agent('speedster')).toBe('/agents/speedster');
  });

  it('should build run routes correctly', () => {
    expect(buildRoute.run('run123')).toBe('/runs/run123');
    expect(buildRoute.run('abc-def')).toBe('/runs/abc-def');
  });

  it('should build site routes correctly', () => {
    expect(buildRoute.site('site1')).toBe('/sites/site1');
  });

  it('should build settings tab routes correctly', () => {
    expect(buildRoute.settingsTab('sites')).toBe('/settings?tab=sites');
    expect(buildRoute.settingsTab('integrations')).toBe('/settings?tab=integrations');
  });
});

describe('Route Validation', () => {
  it('should validate canonical static routes', () => {
    expect(isValidRoute('/')).toBe(true);
    expect(isValidRoute('/dashboard')).toBe(true);
    expect(isValidRoute('/mission-control')).toBe(true);
    expect(isValidRoute('/crew')).toBe(true);
    expect(isValidRoute('/agents')).toBe(true);
    expect(isValidRoute('/keywords')).toBe(true);
    expect(isValidRoute('/settings')).toBe(true);
  });

  it('should validate dynamic routes', () => {
    expect(isValidRoute('/agents/pulse')).toBe(true);
    expect(isValidRoute('/agents/natasha')).toBe(true);
    expect(isValidRoute('/runs/run123')).toBe(true);
    expect(isValidRoute('/sites/site1')).toBe(true);
  });

  it('should reject invalid routes', () => {
    expect(isValidRoute('/nonexistent')).toBe(false);
    expect(isValidRoute('/foo/bar/baz')).toBe(false);
    expect(isValidRoute('/crew/unknown/nested')).toBe(false);
  });

  it('should strip query params and hash for validation', () => {
    expect(isValidRoute('/dashboard?tab=overview')).toBe(true);
    expect(isValidRoute('/settings#advanced')).toBe(true);
    expect(isValidRoute('/agents/pulse?view=details#section')).toBe(true);
  });
});

describe('Deprecated Route Resolution', () => {
  it('should resolve known deprecated routes to canonical targets', () => {
    expect(resolveDeprecatedRoute('/crew/speedster')).toBe('/speedster');
    expect(resolveDeprecatedRoute('/crew/socrates')).toBe('/socrates');
    expect(resolveDeprecatedRoute('/crew/lookout')).toBe('/keywords');
    expect(resolveDeprecatedRoute('/crew/authority')).toBe('/authority');
  });

  it('should resolve crew agent routes to agents routes', () => {
    expect(resolveDeprecatedRoute('/crew/natasha')).toBe('/agents/natasha');
    expect(resolveDeprecatedRoute('/crew/hemingway')).toBe('/agents/hemingway');
    expect(resolveDeprecatedRoute('/crew/marcus')).toBe('/agents/marcus');
    expect(resolveDeprecatedRoute('/crew/pulse')).toBe('/agents/pulse');
  });

  it('should return null for unknown routes', () => {
    expect(resolveDeprecatedRoute('/dashboard')).toBe(null);
    expect(resolveDeprecatedRoute('/agents/pulse')).toBe(null);
    expect(resolveDeprecatedRoute('/completely-unknown')).toBe(null);
  });
});

describe('Safe Route Helper', () => {
  it('should return valid routes unchanged', () => {
    expect(getSafeRoute('/dashboard')).toBe('/dashboard');
    expect(getSafeRoute('/agents/pulse')).toBe('/agents/pulse');
  });

  it('should redirect deprecated routes to canonical', () => {
    expect(getSafeRoute('/crew/speedster')).toBe('/speedster');
    expect(getSafeRoute('/crew/natasha')).toBe('/agents/natasha');
  });

  it('should fall back to dashboard for invalid routes', () => {
    expect(getSafeRoute('/nonexistent')).toBe('/dashboard');
  });

  it('should use custom fallback if provided', () => {
    expect(getSafeRoute('/nonexistent', '/crew')).toBe('/crew');
  });
});

describe('Post-Action Route Helper', () => {
  it('should prefer valid preferred route', () => {
    expect(getPostActionRoute('/agents/pulse', '/dashboard')).toBe('/dashboard');
  });

  it('should stay on current page if valid and no preferred route', () => {
    expect(getPostActionRoute('/agents/pulse')).toBe('/agents/pulse');
  });

  it('should fall back to dashboard for invalid current route', () => {
    expect(getPostActionRoute('/nonexistent')).toBe('/dashboard');
  });
});

describe('Known Agents', () => {
  it('should identify known agents', () => {
    expect(isKnownAgent('pulse')).toBe(true);
    expect(isKnownAgent('natasha')).toBe(true);
    expect(isKnownAgent('speedster')).toBe(true);
    expect(isKnownAgent('socrates')).toBe(true);
  });

  it('should reject unknown agents', () => {
    expect(isKnownAgent('unknown')).toBe(false);
    expect(isKnownAgent('')).toBe(false);
  });
});
