// Collab Worker — routes WebSocket connections to the CollabDurableObject
// Deployed as a separate CF Worker (Durable Objects require a dedicated worker)

import { CollabDurableObject } from './collab-do.js';

export { CollabDurableObject };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: corsHeaders(request),
      });
    }

    // Route: /blog/:blogId (WebSocket upgrade)
    // Route: /blog/:blogId/status (HTTP — get connected users)
    const match = url.pathname.match(/^\/blog\/([a-zA-Z0-9_-]+)(\/status)?$/);
    if (!match) {
      return new Response('Not found', { status: 404 });
    }

    const blogId = match[1];
    const isStatus = !!match[2];

    // Authenticate — validate session cookie
    const session = await validateSession(request, env);
    if (!session && !isStatus) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
      });
    }

    // Check the user has edit access to this blog
    if (session && !isStatus) {
      const hasAccess = await checkEditAccess(env.DB, blogId, session.userId);
      if (!hasAccess) {
        return new Response(JSON.stringify({ error: 'Not authorized' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json', ...corsHeaders(request) },
        });
      }
    }

    // Get the Durable Object for this blog
    const doId = env.COLLAB_DO.idFromName(blogId);
    const doStub = env.COLLAB_DO.get(doId);

    // Add user info to the URL for the DO
    if (session) {
      url.searchParams.set('userId', session.userId);
      url.searchParams.set('userName', session.displayName || session.username || 'Anonymous');
      url.searchParams.set('userColor', generateColor(session.userId));
    }

    // Forward to DO
    const doResponse = await doStub.fetch(new Request(url.toString(), request));

    // Add CORS headers to the response
    const response = new Response(doResponse.body, doResponse);
    for (const [key, value] of Object.entries(corsHeaders(request))) {
      response.headers.set(key, value);
    }
    return response;
  },
};

// Validate session from cookie (shared with main app)
async function validateSession(request, env) {
  try {
    const cookie = request.headers.get('Cookie') || '';
    const match = cookie.match(/lixblogs_session=([^;]+)/);
    if (!match) return null;

    const sessionToken = match[1];

    // Decode the JWT-like session (same as lib/auth.js in the main app)
    // For simplicity, we validate by querying D1 for the session
    if (!env.DB) return null;

    const row = await env.DB.prepare(
      'SELECT user_id, username, display_name FROM sessions WHERE token = ? AND expires_at > ?'
    ).bind(sessionToken, Math.floor(Date.now() / 1000)).first();

    if (!row) return null;

    return {
      userId: row.user_id,
      username: row.username,
      displayName: row.display_name,
    };
  } catch {
    return null;
  }
}

// Check if user can edit this blog (author or co-author with write access)
async function checkEditAccess(db, blogId, userId) {
  if (!db) return true; // Allow in dev without D1
  try {
    // Check if author
    const blog = await db.prepare(
      'SELECT author_id, published_as FROM blogs WHERE id = ?'
    ).bind(blogId).first();

    if (!blog) return false;
    if (blog.author_id === userId) return true;

    // Check co-author
    const coAuthor = await db.prepare(
      "SELECT user_id FROM blog_co_authors WHERE blog_id = ? AND user_id = ? AND status = 'accepted'"
    ).bind(blogId, userId).first();
    if (coAuthor) return true;

    // Check org member with write access
    if (blog.published_as?.startsWith('org:')) {
      const orgId = blog.published_as.replace('org:', '');
      const member = await db.prepare(
        "SELECT role FROM org_members WHERE org_id = ? AND user_id = ? AND role IN ('admin','maintain','write')"
      ).bind(orgId, userId).first();
      if (member) return true;
    }

    return false;
  } catch {
    return true; // Fail open in dev
  }
}

function generateColor(userId) {
  // Deterministic color from userId
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
}
