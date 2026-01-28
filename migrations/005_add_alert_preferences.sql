ALTER TABLE digest_schedule ADD COLUMN IF NOT EXISTS alert_preferences JSONB;
