-- =============================================================================
-- Elixpo Art — D1 Database Schema
-- =============================================================================

-- Pricing plans available on the platform
CREATE TABLE IF NOT EXISTS plans (
  id         TEXT PRIMARY KEY,            -- 'free', 'pro', 'enterprise'
  name       TEXT NOT NULL,
  price_monthly  REAL NOT NULL DEFAULT 0,
  price_yearly   REAL NOT NULL DEFAULT 0,
  daily_credits  INTEGER NOT NULL DEFAULT 40,
  max_resolution TEXT NOT NULL DEFAULT '1024x1024',
  max_video_length INTEGER NOT NULL DEFAULT 0,  -- seconds, 0 = no video
  priority_queue INTEGER NOT NULL DEFAULT 0,     -- 1 = priority
  features   TEXT NOT NULL DEFAULT '[]',         -- JSON array of feature strings
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Users
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY,              -- from SSO / oauth sub
  email           TEXT NOT NULL UNIQUE,
  display_name    TEXT,
  avatar_url      TEXT,
  plan_id         TEXT NOT NULL DEFAULT 'free',
  credits_remaining INTEGER NOT NULL DEFAULT 40,
  credits_reset_at  TEXT NOT NULL DEFAULT (datetime('now')),
  stripe_customer_id TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- Generated images / videos
CREATE TABLE IF NOT EXISTS creations (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'image',     -- 'image' or 'video'
  prompt      TEXT NOT NULL,
  negative_prompt TEXT,
  model       TEXT,
  width       INTEGER,
  height      INTEGER,
  steps       INTEGER,
  seed        INTEGER,
  url         TEXT,                               -- CDN / R2 link
  thumbnail_url TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',    -- pending, generating, completed, failed
  duration    REAL,                               -- video duration in seconds
  credits_used INTEGER NOT NULL DEFAULT 1,
  metadata    TEXT,                                -- extra JSON (cfg_scale, sampler, etc.)
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Credit transactions for audit trail
CREATE TABLE IF NOT EXISTS credit_transactions (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     TEXT NOT NULL,
  amount      INTEGER NOT NULL,                   -- positive = grant, negative = spend
  reason      TEXT NOT NULL,                       -- 'daily_reset', 'generation', 'bonus', 'purchase'
  creation_id TEXT,                                -- links to creation if spent on generation
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (creation_id) REFERENCES creations(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan_id);
CREATE INDEX IF NOT EXISTS idx_creations_user ON creations(user_id);
CREATE INDEX IF NOT EXISTS idx_creations_status ON creations(status);
CREATE INDEX IF NOT EXISTS idx_creations_created ON creations(created_at);
CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON credit_transactions(user_id);

-- =============================================================================
-- Seed pricing plans
-- =============================================================================

INSERT OR IGNORE INTO plans (id, name, price_monthly, price_yearly, daily_credits, max_resolution, max_video_length, priority_queue, features) VALUES
  ('free', 'Free', 0, 0, 40, '1024x1024', 0, 0, '["40 images/day","Standard models","1024x1024 max","Community support"]'),
  ('pro', 'Pro', 12, 120, 200, '2048x2048', 30, 1, '["200 images/day","All models + video","2048x2048 max","30s video generation","Priority queue","Early access to new models"]'),
  ('enterprise', 'Enterprise', 49, 490, 1000, '4096x4096', 120, 1, '["1000 images/day","All models + video","4096x4096 max","2min video generation","Priority queue","API access","Dedicated support","Custom model fine-tuning"]');
