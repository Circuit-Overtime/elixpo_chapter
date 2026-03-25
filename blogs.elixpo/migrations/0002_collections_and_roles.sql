-- Add slugid to blogs (short shareable ID)
ALTER TABLE blogs ADD COLUMN slugid TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_blogs_slugid ON blogs(slugid);

-- Add collection_id to blogs (nullable, for org collections)
ALTER TABLE blogs ADD COLUMN collection_id TEXT;

-- Add page_emoji to blogs
ALTER TABLE blogs ADD COLUMN page_emoji TEXT;

-- Remove owned_org_id from users (users can now own multiple orgs)
-- SQLite doesn't support DROP COLUMN in older versions, so we leave it and ignore it

-- Update org_members roles: admin, maintain, write, read
-- (just a convention change, no schema change needed — role TEXT already flexible)

-- Collections (belong to an org)
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cover_r2_key TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(org_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_collections_org ON collections(org_id);

-- Add foreign key for collection_id in blogs (can't ALTER ADD FK in SQLite, enforced at app level)
CREATE INDEX IF NOT EXISTS idx_blogs_collection ON blogs(collection_id);
