-- Migration: 0001_initial_schema
-- Elixpo D1 Schema — users, repos, installations, sessions metadata, memories

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    github_user_id INTEGER UNIQUE,
    github_username TEXT NOT NULL DEFAULT '',
    email TEXT,
    api_key_hash TEXT,
    settings TEXT DEFAULT '{}',
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS repos (
    id TEXT PRIMARY KEY,
    github_repo_id INTEGER UNIQUE,
    full_name TEXT NOT NULL,
    installation_id INTEGER,
    default_branch TEXT DEFAULT 'main',
    language TEXT,
    settings TEXT DEFAULT '{}',
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS installations (
    id INTEGER PRIMARY KEY,
    account_type TEXT NOT NULL DEFAULT 'user',
    account_login TEXT NOT NULL,
    account_id INTEGER NOT NULL,
    permissions TEXT DEFAULT '{}',
    events TEXT DEFAULT '[]',
    created_at REAL NOT NULL,
    suspended_at REAL
);

CREATE TABLE IF NOT EXISTS sessions_meta (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'pending',
    trigger TEXT NOT NULL,
    repo_full_name TEXT,
    issue_number INTEGER,
    pr_number INTEGER,
    user_id TEXT REFERENCES users(id),
    created_at REAL NOT NULL,
    updated_at REAL NOT NULL,
    completed_at REAL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    current_step INTEGER DEFAULT 0,
    result_pr_url TEXT
);

CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    repo_id TEXT REFERENCES repos(id),
    user_id TEXT REFERENCES users(id),
    category TEXT NOT NULL DEFAULT 'codebase_fact',
    content TEXT NOT NULL,
    source_session_id TEXT,
    relevance_score REAL DEFAULT 1.0,
    created_at REAL NOT NULL,
    last_accessed_at REAL NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions_meta(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_repo ON sessions_meta(repo_full_name);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions_meta(status);
CREATE INDEX IF NOT EXISTS idx_memories_repo ON memories(repo_id);
CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
CREATE INDEX IF NOT EXISTS idx_repos_full_name ON repos(full_name);
CREATE INDEX IF NOT EXISTS idx_users_github ON users(github_user_id);
