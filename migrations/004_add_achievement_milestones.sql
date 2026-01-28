CREATE TABLE IF NOT EXISTS achievement_milestones (
  id SERIAL PRIMARY KEY,
  site_id TEXT NOT NULL,
  track_id INTEGER NOT NULL,
  category_id TEXT NOT NULL,
  track_key TEXT NOT NULL,
  level INTEGER NOT NULL,
  tier TEXT NOT NULL,
  previous_tier TEXT,
  headline TEXT NOT NULL,
  notified_at TIMESTAMP,
  achieved_at TIMESTAMP NOT NULL DEFAULT NOW()
);
