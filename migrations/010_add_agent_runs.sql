-- Migration 010: Agent-based scan execution tracking + rollups
-- Adds per-agent job tracking, scan rollups, and scan_requests metadata columns

-- ════════════════════════════════════════════════════════════════════════════
-- AGENT RUNS TABLE — per-agent job tracking within a scan
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "agent_runs" (
  "id" serial PRIMARY KEY,
  "scan_id" text NOT NULL,
  "crew_id" text NOT NULL,           -- scotty, speedster, lookout, natasha, atlas
  "agent_step" text NOT NULL,        -- technical_crawl, cwv, serp, competitive, atlas_ai
  "status" text NOT NULL DEFAULT 'pending',   -- pending, running, completed, failed, skipped
  "scan_mode" text NOT NULL DEFAULT 'light',  -- light, full
  "started_at" timestamp,
  "completed_at" timestamp,
  "duration_ms" integer,
  "rows_written" integer DEFAULT 0,
  "result_summary" jsonb,
  "error_message" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_agent_runs_scan_id" ON "agent_runs" ("scan_id");
CREATE INDEX IF NOT EXISTS "idx_agent_runs_status" ON "agent_runs" ("status");

-- ════════════════════════════════════════════════════════════════════════════
-- SCAN REQUESTS — additional columns for mode, domain, idempotency
-- ════════════════════════════════════════════════════════════════════════════

ALTER TABLE "scan_requests"
  ADD COLUMN IF NOT EXISTS "scan_mode" text DEFAULT 'light',
  ADD COLUMN IF NOT EXISTS "domain" text,
  ADD COLUMN IF NOT EXISTS "idempotency_key" text,
  ADD COLUMN IF NOT EXISTS "agent_summary" jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS "idx_scan_idempotency"
  ON "scan_requests" ("idempotency_key") WHERE "idempotency_key" IS NOT NULL;

-- ════════════════════════════════════════════════════════════════════════════
-- SCAN ROLLUPS — website-level aggregation across scans
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "scan_rollups" (
  "id" serial PRIMARY KEY,
  "domain" text NOT NULL UNIQUE,
  "latest_scan_id" text NOT NULL,
  "scan_mode" text NOT NULL,
  "overall_score" integer,
  "technical_score" integer,
  "performance_score" integer,
  "serp_score" integer,
  "content_score" integer,
  "ai_score" integer,
  "findings_count" integer,
  "scan_count" integer DEFAULT 1,
  "first_scan_at" timestamp,
  "latest_scan_at" timestamp NOT NULL DEFAULT now(),
  "score_trend" jsonb,
  "updated_at" timestamp NOT NULL DEFAULT now()
);
