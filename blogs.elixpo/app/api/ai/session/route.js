export const runtime = 'edge';
// Session management for lixsearch AI — create/retrieve per-blog sessions

import { getSession } from '../../../../lib/auth';

const LIXSEARCH_BASE = 'https://search.elixpo.com';

/**
 * GET /api/ai/session?slugid=xxx
 * Returns the existing ai_session_id for a blog, or null.
 */
export async function GET(request) {
  const session = await getSession();
  if (!session?.userId) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const slugid = searchParams.get('slugid');
  if (!slugid) {
    return new Response(JSON.stringify({ error: 'Missing slugid' }), { status: 400 });
  }

  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const db = getDB();
    const blog = await db.prepare('SELECT ai_session_id FROM blogs WHERE slugid = ? AND author_id = ?')
      .bind(slugid, session.userId).first();

    return new Response(JSON.stringify({ sessionId: blog?.ai_session_id || null }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    // D1 unavailable (local dev)
    return new Response(JSON.stringify({ sessionId: null }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * POST /api/ai/session
 * Creates a new lixsearch session and stores it on the blog record.
 * Body: { slugid, query? }
 */
export async function POST(request) {
  const session = await getSession();
  if (!session?.userId) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  const body = await request.json();
  const { slugid, query = 'Blog writing assistant session' } = body;
  if (!slugid) {
    return new Response(JSON.stringify({ error: 'Missing slugid' }), { status: 400 });
  }

  // Check if blog already has a session
  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    const db = getDB();
    const blog = await db.prepare('SELECT ai_session_id FROM blogs WHERE slugid = ? AND author_id = ?')
      .bind(slugid, session.userId).first();

    if (blog?.ai_session_id) {
      return new Response(JSON.stringify({ sessionId: blog.ai_session_id }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch {
    // D1 unavailable — proceed to create session anyway
  }

  // Create a new lixsearch session
  try {
    const res = await fetch(`${LIXSEARCH_BASE}/api/session/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: `Failed to create session: ${err}` }), { status: 502 });
    }

    const data = await res.json();
    const sessionId = data.session_id;

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'No session_id returned' }), { status: 502 });
    }

    // Store session_id on the blog record
    try {
      const { getDB } = await import('../../../../lib/cloudflare');
      const db = getDB();
      await db.prepare('UPDATE blogs SET ai_session_id = ? WHERE slugid = ? AND author_id = ?')
        .bind(sessionId, slugid, session.userId).run();
    } catch {
      // D1 unavailable — session created but not persisted (will work for current session)
    }

    return new Response(JSON.stringify({ sessionId }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'Session creation failed' }), { status: 500 });
  }
}
