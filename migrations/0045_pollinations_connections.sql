CREATE TABLE IF NOT EXISTS pollinations_connections (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  access_token_encrypted TEXT NOT NULL,
  token_fingerprint TEXT NOT NULL,
  granted_scope TEXT NOT NULL DEFAULT '',
  permitted_models TEXT NOT NULL DEFAULT '[]',
  approved_budget REAL,
  expires_at INTEGER,
  key_valid INTEGER NOT NULL DEFAULT 1,
  key_type TEXT,
  key_permissions TEXT NOT NULL DEFAULT '[]',
  account_handle TEXT,
  account_avatar TEXT,
  balance REAL,
  usage_summary TEXT,
  cache_expires_at INTEGER,
  status TEXT NOT NULL DEFAULT 'connected',
  last_checked_at INTEGER,
  last_error_code TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_pollinations_token_fingerprint
  ON pollinations_connections(token_fingerprint);
