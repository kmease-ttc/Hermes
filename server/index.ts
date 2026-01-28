import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { startScheduler } from "./scheduler";
import { initializeDatabase } from "./db";
import { startWorker } from "./siteGeneration/worker";
import { initializeQueueOrchestrator } from "./queueOrchestrator";
import crypto from "crypto";

const app = express();
const httpServer = createServer(app);

const SERVICE_NAME = "hermes";
const VERSION = "1.0.0";
const SCHEMA_VERSION = "2025-12-25";

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] as string || `req_${crypto.randomUUID()}`;
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await initializeDatabase();
  await initializeQueueOrchestrator();
  log("✅ Queue orchestrator initialized");
  await registerRoutes(httpServer, app);

  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    const errorCode = status === 401 ? "unauthorized" : 
                      status === 403 ? "forbidden" :
                      status === 404 ? "not_found" :
                      status === 400 ? "invalid_input" :
                      status === 429 ? "rate_limited" :
                      status === 502 ? "upstream_error" :
                      status === 504 ? "timeout" : "internal";

    if (req.path.startsWith("/api")) {
      res.status(status).json({
        ok: false,
        service: SERVICE_NAME,
        version: VERSION,
        schema_version: SCHEMA_VERSION,
        request_id: req.requestId || "unknown",
        error: {
          code: errorCode,
          message,
          details: process.env.NODE_ENV !== "production" ? { stack: err.stack } : {}
        }
      });
    } else {
      res.status(status).json({ message });
    }
    
    if (status >= 500) {
      console.error(`[${req.requestId}] Error:`, err);
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
      startScheduler();
      startWorker();
      log("Site generation worker started");
    },
  );
})();
