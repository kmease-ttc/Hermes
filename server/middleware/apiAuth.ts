import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

// Paths that allow unauthenticated GET access (dashboard/frontend)
const DASHBOARD_GET_PATHS = [
  "/briefing",
  "/api/health",
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
];

// Paths that allow unauthenticated POST access (specific safe operations)
const DASHBOARD_POST_PATHS = [
  "/api/run",
  "/api/auth",
  "/api/integrations",
  "/api/sites",
  "/api/hermes",
  "/api/ai",
  "/api/tests",
  "/api/changes",
  "/api/diagnostics",
  "/api/services",
];

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
  
  // Allow unauthenticated GET on dashboard paths
  if (isGetRequest && matchesGetPath) {
    return next();
  }
  
  // Allow unauthenticated POST on specific safe paths
  if (isPostRequest && matchesPostPath) {
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
