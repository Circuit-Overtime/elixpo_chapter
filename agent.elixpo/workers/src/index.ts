/**
 * Elixpo Cloudflare Worker — edge API for D1 and KV operations.
 * The core agent runs on the VPS; this worker provides:
 *   - D1 read/write for user data, sessions metadata, memories
 *   - KV for rate limiting, feature flags
 *   - Lightweight edge endpoints
 */

export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  ENVIRONMENT: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check
      if (path === "/health") {
        return json({ status: "ok", env: env.ENVIRONMENT }, corsHeaders);
      }

      // === D1 Routes ===

      // GET /d1/users/:id
      if (path.startsWith("/d1/users/") && request.method === "GET") {
        const id = path.split("/d1/users/")[1];
        const user = await env.DB.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
        if (!user) return json({ error: "not found" }, corsHeaders, 404);
        return json(user, corsHeaders);
      }

      // GET /d1/users?github_user_id=123
      if (path === "/d1/users" && request.method === "GET") {
        const ghId = url.searchParams.get("github_user_id");
        if (ghId) {
          const user = await env.DB.prepare("SELECT * FROM users WHERE github_user_id = ?").bind(Number(ghId)).first();
          return json(user || { error: "not found" }, corsHeaders, user ? 200 : 404);
        }
        const { results } = await env.DB.prepare("SELECT * FROM users ORDER BY created_at DESC LIMIT 50").all();
        return json({ users: results }, corsHeaders);
      }

      // POST /d1/users
      if (path === "/d1/users" && request.method === "POST") {
        const body: any = await request.json();
        await env.DB.prepare(
          "INSERT INTO users (id, github_user_id, github_username, email, api_key_hash, settings, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(body.id, body.github_user_id, body.github_username, body.email, body.api_key_hash, JSON.stringify(body.settings || {}), body.created_at, body.updated_at).run();
        return json({ ok: true }, corsHeaders, 201);
      }

      // GET /d1/sessions
      if (path === "/d1/sessions" && request.method === "GET") {
        const userId = url.searchParams.get("user_id");
        const limit = Number(url.searchParams.get("limit") || "50");
        let query = "SELECT * FROM sessions_meta ORDER BY updated_at DESC LIMIT ?";
        let stmt = env.DB.prepare(query).bind(limit);
        if (userId) {
          query = "SELECT * FROM sessions_meta WHERE user_id = ? ORDER BY updated_at DESC LIMIT ?";
          stmt = env.DB.prepare(query).bind(userId, limit);
        }
        const { results } = await stmt.all();
        return json({ sessions: results }, corsHeaders);
      }

      // POST /d1/sessions
      if (path === "/d1/sessions" && request.method === "POST") {
        const body: any = await request.json();
        await env.DB.prepare(
          "INSERT OR REPLACE INTO sessions_meta (id, status, trigger, repo_full_name, issue_number, pr_number, user_id, created_at, updated_at, completed_at, prompt_tokens, completion_tokens, total_tokens, current_step, result_pr_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(body.id, body.status, body.trigger, body.repo_full_name, body.issue_number, body.pr_number, body.user_id, body.created_at, body.updated_at, body.completed_at, body.prompt_tokens || 0, body.completion_tokens || 0, body.total_tokens || 0, body.current_step || 0, body.result_pr_url).run();
        return json({ ok: true }, corsHeaders, 201);
      }

      // GET /d1/memories?repo_id=xxx
      if (path === "/d1/memories" && request.method === "GET") {
        const repoId = url.searchParams.get("repo_id");
        const category = url.searchParams.get("category");
        let query = "SELECT * FROM memories WHERE 1=1";
        const params: any[] = [];
        if (repoId) { query += " AND repo_id = ?"; params.push(repoId); }
        if (category) { query += " AND category = ?"; params.push(category); }
        query += " ORDER BY relevance_score DESC LIMIT 50";
        const { results } = await env.DB.prepare(query).bind(...params).all();
        return json({ memories: results }, corsHeaders);
      }

      // POST /d1/memories
      if (path === "/d1/memories" && request.method === "POST") {
        const body: any = await request.json();
        await env.DB.prepare(
          "INSERT INTO memories (id, repo_id, user_id, category, content, source_session_id, relevance_score, created_at, last_accessed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
        ).bind(body.id, body.repo_id, body.user_id, body.category, body.content, body.source_session_id, body.relevance_score || 1.0, body.created_at, body.last_accessed_at).run();
        return json({ ok: true }, corsHeaders, 201);
      }

      // === KV Routes ===

      // GET /kv/:key
      if (path.startsWith("/kv/") && request.method === "GET") {
        const key = path.slice(4);
        const value = await env.KV.get(key);
        if (value === null) return json({ error: "not found" }, corsHeaders, 404);
        return json({ key, value }, corsHeaders);
      }

      // PUT /kv/:key
      if (path.startsWith("/kv/") && request.method === "PUT") {
        const key = path.slice(4);
        const body: any = await request.json();
        const ttl = body.ttl ? { expirationTtl: body.ttl } : undefined;
        await env.KV.put(key, body.value, ttl);
        return json({ ok: true }, corsHeaders);
      }

      // DELETE /kv/:key
      if (path.startsWith("/kv/") && request.method === "DELETE") {
        const key = path.slice(4);
        await env.KV.delete(key);
        return json({ ok: true }, corsHeaders);
      }

      return json({ error: "not found" }, corsHeaders, 404);
    } catch (err: any) {
      return json({ error: err.message }, corsHeaders, 500);
    }
  },
};

function json(data: any, headers: Record<string, string>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}
