-- Preserve public profile and personal-blog links after an Accounts username
-- change. The resolver redirects an alias to the user's current username.
CREATE TABLE IF NOT EXISTS username_aliases (
  username TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_username_aliases_user
  ON username_aliases(user_id);

-- Delivery deduplication for retried app-scoped Accounts webhooks.
CREATE TABLE IF NOT EXISTS account_webhook_events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_account_webhook_events_created
  ON account_webhook_events(created_at);
