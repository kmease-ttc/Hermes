import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

const PUBLIC_READ_PATHS = [
  "/briefing",
  "/api/health",
  "/api/status",
  "/api/report/latest",
  "/api/tickets/latest",
  "/api/run/latest",
  "/api/run/analysis",
  "/api/run/compare",
  "/api/alerts",
  "/api/dashboard/stats",
  "/api/auth/status",
  "/api/auth/url", 
  "/api/auth/callback",
  "/api/campaigns",
  "/api/serp/keywords",
  "/api/serp/rankings",
  "/api/serp/overview",
  "/api/sites",
  "/api/ai/ask",
];

export function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith("/api/") && req.path !== "/briefing") {
    return next();
  }

  const isPublicReadPath = PUBLIC_READ_PATHS.some(path => 
    req.path === path || 
    req.path.startsWith(path + "/") || 
    req.path.startsWith(path + "?")
  );
  
  if (isPublicReadPath && req.method === "GET") {
    return next();
  }

  if (req.path.startsWith("/api/auth/")) {
    return next();
  }

  const referer = req.headers.referer || req.headers.origin;
  const host = req.headers.host;
  
  if (referer && host) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.host === host || refererUrl.hostname === 'localhost') {
        return next();
      }
    } catch {
    }
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
