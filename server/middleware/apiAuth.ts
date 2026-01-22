import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

// Paths that allow unauthenticated GET access (dashboard/frontend reads)
const DASHBOARD_GET_PATHS = [
  "/briefing",
  "/api/health",
  "/api/system/health",
  "/api/status",
  "/api/report",
  "/api/tickets",
  "/api/run",
  "/api/runs",
  "/api/services",
  "/api/alerts",
  "/api/dashboard",
  "/api/auth",
  "/api/campaigns",
  "/api/serp",
  "/api/sites",
  "/api/ai",
  "/api/vault",
  "/api/actions",
  "/api/integrations",
  "/api/platform",
  "/api/tests",
  "/api/changes",
  "/api/diagnostics",
  "/api/debug",
  "/api/benchmarks",
  "/api/findings",
  "/api/crew",
  "/api/export",
  "/api/missions",
  "/api/agents",
  "/api/latest",
  "/api/kb",
  "/api/fix-plan",
  "/api/site-executor",
  "/api/competitive",
  "/api/suggestions",
  "/api/kbase",
  "/api/metrics",
  "/api/qa",
  "/api/audit-logs",
  "/api/achievements",
  "/api/crews",
  "/api/snapshots",
  "/api/popular",
  "/api/scan",
];

// Paths that allow unauthenticated POST access (only basic safe operations)
const DASHBOARD_POST_PATHS = [
  "/api/run",
  "/api/auth",
  "/api/integrations",
  "/api/sites",
  "/api/hermes",
  "/api/ai",
  "/api/benchmarks",
  "/api/missions",
  "/api/fix-plan",
  "/api/actions",
  "/api/competitive",
  "/api/suggestions",
  "/api/kbase",
  "/api/qa",
  "/api/vault",
  "/api/achievements",
  "/api/popular",
  "/api/scan",
];

// Paths that allow same-origin POST access (UI actions, protected by origin check)
const SAME_ORIGIN_POST_PATHS = [
  "/api/tests",
  "/api/changes",
  "/api/diagnostics",
  "/api/services",
  "/api/kbase",
  "/api/serp",
  "/api/crew",
  "/api/kb",
  "/api/fix-plan",
  "/api/snapshots",
  "/api/scan",
];

// Check if request is from same origin (browser UI)
function isSameOriginRequest(req: Request): boolean {
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const host = req.headers.host;
  
  // Check Origin header (set by browsers for CORS/same-origin requests)
  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (host && originUrl.host === host) {
        return true;
      }
    } catch {}
  }
  
  // Check Referer header as fallback
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (host && refererUrl.host === host) {
        return true;
      }
    } catch {}
  }
  
  return false;
}

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith("/api/") && req.path !== "/briefing") {
    return next();
  }

  const isGetRequest = req.method === "GET" || req.method === "HEAD";
  const isPostRequest = req.method === "POST";
  
  // Check if path matches dashboard GET paths (for GET requests)
  const matchesGetPath = DASHBOARD_GET_PATHS.some(path => 
    req.path === path || 
    req.path.startsWith(path + "/") || 
    req.path.startsWith(path + "?")
  );
  
  // Check if path matches dashboard POST paths (for POST requests)
  const matchesPostPath = DASHBOARD_POST_PATHS.some(path => 
    req.path === path || 
    req.path.startsWith(path + "/") || 
    req.path.startsWith(path + "?")
  );
  
  // Check if path matches same-origin POST paths (UI actions)
  const matchesSameOriginPath = SAME_ORIGIN_POST_PATHS.some(path => 
    req.path === path || 
    req.path.startsWith(path + "/") || 
    req.path.startsWith(path + "?")
  );
  
  // Allow unauthenticated GET on dashboard paths
  if (isGetRequest && matchesGetPath) {
    return next();
  }
  
  // Allow unauthenticated POST on specific safe paths
  if (isPostRequest && matchesPostPath) {
    return next();
  }
  
  // Allow same-origin POST requests on UI action paths (browser requests only)
  if (isPostRequest && matchesSameOriginPath && isSameOriginRequest(req)) {
    logger.debug("API", "Allowing same-origin UI request", { path: req.path });
    return next();
  }

  const providedKey = req.headers["x-api-key"] as string || 
    (req.headers.authorization?.startsWith("Bearer ") 
      ? req.headers.authorization.slice(7) 
      : null);

  if (!providedKey) {
    logger.warn("API", "Missing API key", { path: req.path, method: req.method });
    return res.status(401).json({ 
      error: "API key required",
      hint: "Provide X-API-Key header or Authorization: Bearer <key>"
    });
  }

  const apiKey = process.env.TRAFFIC_DOCTOR_API_KEY;
  
  if (!apiKey) {
    logger.warn("API", "TRAFFIC_DOCTOR_API_KEY not configured");
    return res.status(401).json({ 
      error: "API key required",
      hint: "Server API key not configured"
    });
  }

  if (providedKey !== apiKey) {
    logger.warn("API", "Invalid API key", { path: req.path });
    return res.status(403).json({ error: "Invalid API key" });
  }

  next();
}

/**
 * Internal API authentication middleware
 * Validates X-Internal-API-Key header against ARCLO_INTERNAL_API_KEY env variable
 * Used for Hermes ↔ SERP Worker bidirectional communication
 */
export function internalApiAuth(req: Request, res: Response, next: NextFunction) {
  const providedKey = req.headers["x-internal-api-key"] as string;

  if (!providedKey) {
    logger.warn("InternalAPI", "Missing internal API key", { path: req.path, method: req.method });
    return res.status(401).json({ 
      error: "Internal API key required",
      hint: "Provide X-Internal-API-Key header"
    });
  }

  const internalKey = process.env.ARCLO_INTERNAL_API_KEY;
  
  if (!internalKey) {
    logger.warn("InternalAPI", "ARCLO_INTERNAL_API_KEY not configured");
    return res.status(500).json({ 
      error: "Internal API not configured",
      hint: "Server internal API key not set"
    });
  }

  if (providedKey !== internalKey) {
    logger.warn("InternalAPI", "Invalid internal API key", { path: req.path });
    return res.status(403).json({ error: "Invalid internal API key" });
  }

  next();
}
