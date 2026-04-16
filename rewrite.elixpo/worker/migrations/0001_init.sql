-- ReWrite D1 Schema — v1
-- Users, sessions, documents (compressed), paragraphs, job history

-- ============================================================
-- USERS — Elixpo OAuth or anonymous guests
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL DEFAULT 'anonymous',  -- 'elixpo' | 'anonymous'
    email TEXT,
    display_name TEXT,
    avatar_url TEXT,
    oauth_provider_id TEXT,                      -- Elixpo user ID
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider_id);

-- ============================================================
-- SESSIONS — one per paraphrase job (browser tab / API call)
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'pending',       -- pending | running | completed | failed
    progress REAL NOT NULL DEFAULT 0,             -- 0–100
    original_text_compressed BLOB,                -- gzip-compressed original text
    filename TEXT,
    domain TEXT NOT NULL DEFAULT 'general',
    intensity TEXT NOT NULL DEFAULT 'aggressive',
    paragraph_count INTEGER NOT NULL DEFAULT 0,
    flagged_count INTEGER NOT NULL DEFAULT 0,
    original_score REAL,
    final_score REAL,
    error TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);

-- ============================================================
-- DOCUMENTS — compressed storage for all user documents
-- Every text/file that touches the platform gets stored here.
-- Content is gzip-compressed before insertion.
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    session_id TEXT REFERENCES sessions(id),
    filename TEXT,
    content_type TEXT NOT NULL DEFAULT 'text/plain',
    original_size INTEGER NOT NULL,               -- bytes before compression
    compressed_size INTEGER NOT NULL,             -- bytes after compression
    content_compressed BLOB NOT NULL,             -- gzip-compressed content
    checksum TEXT NOT NULL,                       -- SHA-256 of original content
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_session ON documents(session_id);

-- ============================================================
-- PARAGRAPHS — per-paragraph progress during paraphrase
-- ============================================================
CREATE TABLE IF NOT EXISTS paragraphs (
    session_id TEXT NOT NULL REFERENCES sessions(id),
    idx INTEGER NOT NULL,
    original_text TEXT,
    rewritten_text TEXT,
    original_score REAL,
    current_score REAL,
    status TEXT NOT NULL DEFAULT 'pending',       -- pending | rewriting | done | failed
    attempts INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT DEFAULT (datetime('now')),
    PRIMARY KEY (session_id, idx)
);

-- ============================================================
-- JOB HISTORY — completed jobs for user dashboard
-- ============================================================
CREATE TABLE IF NOT EXISTS job_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL REFERENCES users(id),
    session_id TEXT NOT NULL REFERENCES sessions(id),
    filename TEXT,
    domain TEXT,
    original_score REAL,
    final_score REAL,
    paragraph_count INTEGER,
    flagged_count INTEGER,
    duration_seconds REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_job_history_user ON job_history(user_id, created_at DESC);
