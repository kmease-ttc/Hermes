-- Migration 009: Add notification service tables + per-site Google credentials
-- Phase 2 (Notifications consolidation) + Phase 3 (Per-client Google OAuth)

-- ════════════════════════════════════════════════════════════════════════════
-- NOTIFICATION SERVICE TABLES (consolidated from Worker-Notification)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "notification_settings" (
  "website_id" text PRIMARY KEY,
  "default_from_name" text,
  "default_from_email" text,
  "reply_to_email" text,
  "timezone" text DEFAULT 'America/Chicago',
  "quiet_hours_start" text DEFAULT '21:00',
  "quiet_hours_end" text DEFAULT '07:00',
  "enabled" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "notification_recipients" (
  "id" serial PRIMARY KEY,
  "website_id" text NOT NULL,
  "email" text NOT NULL,
  "name" text,
  "role" text DEFAULT 'admin',
  "enabled" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "notification_rules" (
  "id" serial PRIMARY KEY,
  "website_id" text NOT NULL,
  "event_type" text NOT NULL,
  "min_severity" text DEFAULT 'info',
  "delivery_mode" text DEFAULT 'immediate',
  "throttle_minutes" integer DEFAULT 30,
  "dedup_key_strategy" text DEFAULT 'by_event_type',
  "enabled" boolean DEFAULT true,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "notification_events" (
  "id" serial PRIMARY KEY,
  "website_id" text NOT NULL,
  "event_type" text NOT NULL,
  "severity" text NOT NULL,
  "title" text NOT NULL,
  "summary" text,
  "payload_json" jsonb,
  "dedup_key" text,
  "source" text,
  "occurred_at" timestamp DEFAULT now(),
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "notification_deliveries" (
  "id" serial PRIMARY KEY,
  "event_id" integer,
  "website_id" text NOT NULL,
  "channel" text DEFAULT 'email',
  "recipient" text NOT NULL,
  "subject" text,
  "template_id" text,
  "provider_message_id" text,
  "status" text DEFAULT 'queued',
  "error_code" text,
  "error_message" text,
  "attempt_count" integer DEFAULT 0,
  "last_attempt_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "notification_suppressions" (
  "id" serial PRIMARY KEY,
  "website_id" text NOT NULL,
  "dedup_key" text NOT NULL,
  "suppressed_until" timestamp NOT NULL,
  "reason" text,
  "created_at" timestamp DEFAULT now()
);

-- Indexes for notification tables
CREATE INDEX IF NOT EXISTS "idx_notif_recipients_website" ON "notification_recipients" ("website_id");
CREATE INDEX IF NOT EXISTS "idx_notif_rules_website_event" ON "notification_rules" ("website_id", "event_type");
CREATE INDEX IF NOT EXISTS "idx_notif_events_website" ON "notification_events" ("website_id");
CREATE INDEX IF NOT EXISTS "idx_notif_events_created" ON "notification_events" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_notif_deliveries_event" ON "notification_deliveries" ("event_id");
CREATE INDEX IF NOT EXISTS "idx_notif_deliveries_website" ON "notification_deliveries" ("website_id");
CREATE INDEX IF NOT EXISTS "idx_notif_suppressions_lookup" ON "notification_suppressions" ("website_id", "dedup_key", "suppressed_until");

-- ════════════════════════════════════════════════════════════════════════════
-- PER-SITE GOOGLE CREDENTIALS (Phase 3: Per-Client OAuth)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "site_google_credentials" (
  "id" serial PRIMARY KEY,
  "site_id" integer NOT NULL UNIQUE,
  "access_token" text NOT NULL,
  "refresh_token" text NOT NULL,
  "token_expiry" timestamp NOT NULL,
  "scopes" text[] NOT NULL,
  "ga4_property_id" text,
  "gsc_site_url" text,
  "ads_customer_id" text,
  "ads_login_customer_id" text,
  "google_email" text,
  "connected_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_site_google_creds_site" ON "site_google_credentials" ("site_id");
