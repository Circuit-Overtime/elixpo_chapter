-- ReWrite D1 Schema
-- Users, sessions, and job history

-- Users table (Elixpo OAuth or anonymous)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,                    -- UUID
    email TEXT UNIQUE,                      -- from OAuth, nullable for anon
    name TEXT,
    avatar_url TEXT,
    provider TEXT DEFAULT 'anonymous',      -- 'elixpo', 'anonymous'
    provider_id TEXT,                       -- external OAuth user ID
    created_at TEXT DEFAULT (datetime('now')),
    last_seen_at TEXT DEFAULT (datetime('now'))
);

-- Sessions table — one per browser tab / request
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,                    -- session UUID (stored in frontend localStorage)
    user_id TEXT NOT NULL,                  -- FK to users
    status TEXT DEFAULT 'pending',          -- pending, running, completed, failed
    progress REAL DEFAULT 0,               -- 0-100
    original_text TEXT,                     -- input text (for resume)
    filename TEXT,                          -- original filename if file upload
    domain TEXT DEFAULT 'general',
    intensity TEXT DEFAULT 'aggressive',
    paragraph_count INTEGER DEFAULT 0,
    flagged_count INTEGER DEFAULT 0,
    original_score REAL,
    final_score REAL,
    error TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Per-paragraph state — granular progress tracking
CREATE TABLE IF NOT EXISTS paragraphs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    idx INTEGER NOT NULL,                   -- paragraph index in document
    original_text TEXT,
    rewritten_text TEXT,
    original_score REAL,
    current_score REAL,
    status TEXT DEFAULT 'pending',          -- pending, rewriting, done, failed
    attempts INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (session_id) REFERENCES sessions(id),
    UNIQUE(session_id, idx)
);

-- Job history — completed jobs for user dashboard
CREATE TABLE IF NOT EXISTS job_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    filename TEXT,
    domain TEXT,
    original_score REAL,
    final_score REAL,
    paragraph_count INTEGER,
    flagged_count INTEGER,
    duration_seconds REAL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_paragraphs_session ON paragraphs(session_id);
CREATE INDEX IF NOT EXISTS idx_history_user ON job_history(user_id);
