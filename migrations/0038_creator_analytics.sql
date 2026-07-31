-- Privacy-safe, append-only creator analytics. Existing blog_views and
-- interaction tables remain the historical aggregate source of truth.
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  blog_id TEXT NOT NULL REFERENCES blogs(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  visitor_hash TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN (
    'impression', 'view', 'read_progress', 'read_complete', 'share'
  )),
  event_value REAL,
  referrer_source TEXT,
  referrer_domain TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  device_category TEXT,
  country_code TEXT,
  occurred_at INTEGER NOT NULL DEFAULT (unixepoch()),
  dedupe_key TEXT NOT NULL UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_blog_time
  ON analytics_events(blog_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_blog_type_time
  ON analytics_events(blog_id, event_type, occurred_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_visitor_time
  ON analytics_events(visitor_hash, occurred_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_time
  ON analytics_events(user_id, occurred_at);

