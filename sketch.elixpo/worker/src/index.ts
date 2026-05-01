export { RoomDurableObject } from './RoomDurableObject';

export interface Env {
  ROOM: DurableObjectNamespace;
  DB: D1Database;
  KV: KVNamespace;
  ENVIRONMENT: string;
  MAX_ROOM_USERS: string;
  ROOM_TTL_HOURS: string;
  IDLE_TIMEOUT_MINS: string;
  ELIXPO_AUTH_URL: string;
  APP_ORIGIN: string;
  ELIXPO_CLIENT_ID: string;
  ELIXPO_CLIENT_SECRET: string;
  CLOUDINARY_KEY: string;
  CLOUDINARY_SECRET: string;
  SESSION_SECRET: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // WebSocket: /room/:roomId
    if (url.pathname.startsWith('/room/')) {
      const roomId = url.pathname.split('/room/')[1];
      if (!roomId) {
        return json({ error: 'Missing room ID' }, 400);
      }
      const durableId = env.ROOM.idFromName(roomId);
      const stub = env.ROOM.get(durableId);
      return stub.fetch(request);
    }

    // --- Auth routes ---

    // OAuth callback: exchange code for tokens, create/update user, return session
    if (url.pathname === '/api/auth/callback' && request.method === 'GET') {
      return handleAuthCallback(request, env);
    }

    // Get current user from session token
    if (url.pathname === '/api/auth/me' && request.method === 'GET') {
      return handleAuthMe(request, env);
    }

    // Refresh session token
    if (url.pathname === '/api/auth/refresh' && request.method === 'POST') {
      return handleAuthRefresh(request, env);
    }

    // --- Scene routes ---

    if (url.pathname === '/api/scenes/save' && request.method === 'POST') {
      return handleSceneSave(request, env);
    }

    if (url.pathname === '/api/scenes/load' && request.method === 'GET') {
      return handleSceneLoad(request, env);
    }

    if (url.pathname === '/api/scenes/delete' && request.method === 'DELETE') {
      return handleSceneDelete(request, env);
    }

    // --- Canvas doc routes (paired WYSIWYG document per session) ---

    if (url.pathname === '/api/canvas-docs/save' && request.method === 'POST') {
      return handleCanvasDocSave(request, env);
    }

    if (url.pathname === '/api/canvas-docs/load' && request.method === 'GET') {
      return handleCanvasDocLoad(request, env);
    }

    if (url.pathname === '/api/canvas-docs/layout' && request.method === 'POST') {
      return handleCanvasLayoutSave(request, env);
    }

    // --- Workspace routes ---

    if (url.pathname === '/api/scenes/list' && request.method === 'GET') {
      return handleSceneList(request, env);
    }

    if (url.pathname === '/api/scenes/cleanup' && request.method === 'POST') {
      return handleSceneCleanup(request, env);
    }

    // --- Image routes ---

    if (url.pathname === '/api/images/sign' && request.method === 'POST') {
      return handleImageSign(request, env);
    }

    if (url.pathname === '/api/images/delete' && request.method === 'DELETE') {
      return handleImageDelete(request, env);
    }

    // --- AI quota routes ---

    if (url.pathname === '/api/ai/quota' && request.method === 'GET') {
      return handleAIQuota(request, env);
    }

    if (url.pathname === '/api/ai/usage' && request.method === 'POST') {
      return handleAIUsage(request, env);
    }

    // --- User quota summary ---

    if (url.pathname === '/api/user/quota-summary' && request.method === 'GET') {
      return handleQuotaSummary(request, env);
    }

    // Health check
    if (url.pathname === '/health') {
      return json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    return json({ error: 'Not found' }, 404);
  },

  // Scheduled cleanup: runs via Cloudflare Cron Trigger (e.g. daily)
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil((async () => {
      try {
        const staleScenes = await env.DB.prepare(
          `SELECT id, session_id FROM scenes
           WHERE last_accessed_at < datetime('now', '-1 month')
              OR (last_accessed_at IS NULL AND created_at < datetime('now', '-1 month'))`
        ).all<{ id: string; session_id: string }>();

        if (!staleScenes.results || staleScenes.results.length === 0) return;

        for (const scene of staleScenes.results) {
          try {
            await deleteCloudinaryFolder(scene.session_id, env);
          } catch {}
          await env.DB.prepare(`DELETE FROM scenes WHERE id = ?`).bind(scene.id).run();
        }
        console.log(`[Scheduled Cleanup] Deleted ${staleScenes.results.length} stale workspaces`);
      } catch (err) {
        console.error('[Scheduled Cleanup] Error:', err);
      }
    })());
  },
};

// =============================================================================
// Auth Handlers
// =============================================================================

async function handleAuthCallback(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  // The app origin to redirect back to after auth
  const appOrigin = url.searchParams.get('app_origin') || env.APP_ORIGIN || 'https://sketch.elixpo.com';

  if (error) {
    return Response.redirect(`${appOrigin}?auth_error=${encodeURIComponent(error)}`, 302);
  }

  if (!code) {
    return Response.redirect(`${appOrigin}?auth_error=missing_code`, 302);
  }

  // Determine redirect URI (same as what was used for the authorize request)
  const redirectUri = `${url.origin}/api/auth/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch(`${env.ELIXPO_AUTH_URL}/api/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      client_id: env.ELIXPO_CLIENT_ID,
      client_secret: env.ELIXPO_CLIENT_SECRET,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.json().catch(() => ({}));
    return json({ error: 'Token exchange failed', details: err }, 401);
  }

  const tokens = await tokenRes.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  // Fetch user profile from Elixpo Accounts
  const userRes = await fetch(`${env.ELIXPO_AUTH_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userRes.ok) {
    return json({ error: 'Failed to fetch user profile' }, 401);
  }

  const profile = await userRes.json() as {
    id: string;
    email: string;
    displayName: string;
    avatar: string | null;
    isAdmin: boolean;
    emailVerified: boolean;
  };

  // Extract security metadata from request headers
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const userAgent = request.headers.get('User-Agent') || 'unknown';
  const locale = request.headers.get('Accept-Language')?.split(',')[0] || 'unknown';
  const country = request.headers.get('CF-IPCountry') || 'unknown';
  const timezone = request.headers.get('CF-Timezone') || '';

  // Upsert user in D1
  await env.DB.prepare(
    `INSERT INTO users (id, email, display_name, avatar, provider, ip_address, user_agent, locale, country, timezone, login_count, last_login_at, created_at)
     VALUES (?, ?, ?, ?, 'elixpo', ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       email = excluded.email,
       display_name = excluded.display_name,
       avatar = excluded.avatar,
       ip_address = excluded.ip_address,
       user_agent = excluded.user_agent,
       locale = excluded.locale,
       country = excluded.country,
       timezone = excluded.timezone,
       login_count = login_count + 1,
       last_login_at = datetime('now')`
  ).bind(
    profile.id, profile.email, profile.displayName, profile.avatar,
    ip, userAgent, locale, country, timezone
  ).run();

  // Create a LixSketch session token (stored in KV)
  const sessionToken = generateToken(48);
  const sessionData = {
    userId: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    avatar: profile.avatar,
    isAdmin: profile.isAdmin,
    refreshToken: tokens.refresh_token,
  };

  // Store session in KV with 24h TTL
  await env.KV.put(`session:${sessionToken}`, JSON.stringify(sessionData), {
    expirationTtl: 86400,
  });

  // Redirect back to app with session token and user info
  const userParam = encodeURIComponent(JSON.stringify({
    id: profile.id,
    email: profile.email,
    displayName: profile.displayName,
    avatar: profile.avatar,
    isAdmin: profile.isAdmin,
  }));

  return Response.redirect(
    `${appOrigin}?auth_token=${sessionToken}&auth_user=${userParam}`,
    302
  );
}

async function handleAuthMe(request: Request, env: Env): Promise<Response> {
  const sessionToken = extractBearerToken(request);
  if (!sessionToken) {
    return json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const sessionData = await env.KV.get(`session:${sessionToken}`, 'json') as {
    userId: string;
    email: string;
    displayName: string;
    avatar: string | null;
    isAdmin: boolean;
  } | null;

  if (!sessionData) {
    return json({ error: 'Session expired or invalid' }, 401);
  }

  // Also get room count for this user
  const roomCount = await env.DB.prepare(
    `SELECT COUNT(*) as count FROM rooms WHERE owner_user_id = ? AND status = 'active'`
  ).bind(sessionData.userId).first<{ count: number }>();

  return json({
    user: {
      id: sessionData.userId,
      email: sessionData.email,
      displayName: sessionData.displayName,
      avatar: sessionData.avatar,
      isAdmin: sessionData.isAdmin,
    },
    activeRooms: roomCount?.count || 0,
    maxRooms: 1, // 1 room per user
  });
}

async function handleAuthRefresh(request: Request, env: Env): Promise<Response> {
  const sessionToken = extractBearerToken(request);
  if (!sessionToken) {
    return json({ error: 'Missing session token' }, 401);
  }

  const sessionData = await env.KV.get(`session:${sessionToken}`, 'json') as {
    userId: string;
    email: string;
    displayName: string;
    avatar: string | null;
    isAdmin: boolean;
    refreshToken: string;
  } | null;

  if (!sessionData || !sessionData.refreshToken) {
    return json({ error: 'Session expired' }, 401);
  }

  // Refresh tokens with Elixpo Accounts
  const tokenRes = await fetch(`${env.ELIXPO_AUTH_URL}/api/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: sessionData.refreshToken,
      client_id: env.ELIXPO_CLIENT_ID,
    }),
  });

  if (!tokenRes.ok) {
    // Refresh token expired — delete session
    await env.KV.delete(`session:${sessionToken}`);
    return json({ error: 'Refresh failed, please sign in again' }, 401);
  }

  const tokens = await tokenRes.json() as {
    access_token: string;
    refresh_token: string;
  };

  // Update session with new refresh token
  sessionData.refreshToken = tokens.refresh_token;
  await env.KV.put(`session:${sessionToken}`, JSON.stringify(sessionData), {
    expirationTtl: 86400,
  });

  return json({ success: true });
}

// =============================================================================
// Scene Handlers
// =============================================================================

async function handleSceneSave(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as {
      sessionId: string;
      encryptedData: string;
      permission?: string;
      workspaceName?: string;
      createdBy?: string;
    };

    if (!body.sessionId || !body.encryptedData) {
      return json({ error: 'Missing sessionId or encryptedData' }, 400);
    }

    const ownerType = body.createdBy && !body.createdBy.startsWith('guest-') ? 'user' : 'guest';
    const maxWorkspaces = ownerType === 'user' ? 3 : 1;

    // Check if updating an existing workspace
    const existing = await env.DB.prepare(
      `SELECT id FROM scenes WHERE session_id = ?`
    ).bind(body.sessionId).first<{ id: string }>();

    if (existing) {
      const sizeBytes = new Blob([body.encryptedData]).size;
      await env.DB.prepare(
        `UPDATE scenes SET encrypted_data = ?, workspace_name = ?, updated_at = datetime('now'),
         last_accessed_at = datetime('now'), size_bytes = ?, owner_type = ? WHERE id = ?`
      ).bind(body.encryptedData, body.workspaceName || 'Untitled', sizeBytes, ownerType, existing.id).run();

      const perm = await env.DB.prepare(
        `SELECT token FROM scene_permissions WHERE scene_id = ?`
      ).bind(existing.id).first<{ token: string }>();

      return json({ sceneId: existing.id, token: perm?.token || null });
    }

    // New workspace — enforce limit
    if (body.createdBy) {
      const count = await env.DB.prepare(
        `SELECT COUNT(*) as count FROM scenes WHERE created_by = ? AND owner_type = ?`
      ).bind(body.createdBy, ownerType).first<{ count: number }>();

      if (count && count.count >= maxWorkspaces) {
        return json({
          error: 'WORKSPACE_LIMIT',
          message: `You can have at most ${maxWorkspaces} workspace${maxWorkspaces > 1 ? 's' : ''}.`,
          maxWorkspaces,
          currentCount: count.count,
        }, 429);
      }
    }

    const sceneId = crypto.randomUUID();
    const token = generateToken();
    const permissionId = crypto.randomUUID();
    const sizeBytes = new Blob([body.encryptedData]).size;

    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO scenes (id, session_id, workspace_name, encrypted_data, permission, created_by, size_bytes, owner_type, last_accessed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(sceneId, body.sessionId, body.workspaceName || 'Untitled', body.encryptedData, body.permission || 'view', body.createdBy || null, sizeBytes, ownerType),
      env.DB.prepare(
        `INSERT INTO scene_permissions (id, scene_id, token, permission)
         VALUES (?, ?, ?, ?)`
      ).bind(permissionId, sceneId, token, body.permission || 'view'),
    ]);

    return json({ sceneId, token }, 201);
  } catch (err) {
    return json({ error: 'Failed to save scene' }, 500);
  }
}

async function handleSceneLoad(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return json({ error: 'Missing token' }, 400);
    }

    const perm = await env.DB.prepare(
      `SELECT sp.permission, s.encrypted_data, s.workspace_name, s.session_id
       FROM scene_permissions sp
       JOIN scenes s ON sp.scene_id = s.id
       WHERE sp.token = ?`
    ).bind(token).first<{
      permission: string;
      encrypted_data: string;
      workspace_name: string;
      session_id: string;
    }>();

    if (!perm) {
      return json({ error: 'Scene not found or link expired' }, 404);
    }

    // Increment view count
    await env.DB.prepare(
      `UPDATE scenes SET view_count = view_count + 1 WHERE session_id = ?`
    ).bind(perm.session_id).run();

    return json({
      encryptedData: perm.encrypted_data,
      permission: perm.permission,
      workspaceName: perm.workspace_name,
    });
  } catch (err) {
    return json({ error: 'Failed to load scene' }, 500);
  }
}

async function handleSceneDelete(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as {
      token: string;
      sessionId: string;
    };

    if (!body.token || !body.sessionId) {
      return json({ error: 'Missing token or sessionId' }, 400);
    }

    // Verify the token belongs to the session before deleting
    const perm = await env.DB.prepare(
      `SELECT sp.scene_id, s.session_id
       FROM scene_permissions sp
       JOIN scenes s ON sp.scene_id = s.id
       WHERE sp.token = ?`
    ).bind(body.token).first<{
      scene_id: string;
      session_id: string;
    }>();

    if (!perm) {
      return json({ error: 'Scene not found' }, 404);
    }

    if (perm.session_id !== body.sessionId) {
      return json({ error: 'Unauthorized — session mismatch' }, 403);
    }

    // Delete the scene (cascade deletes scene_permissions). Also drop
    // the paired canvas doc — there's no real FK so we cascade manually.
    await env.DB.batch([
      env.DB.prepare(`DELETE FROM canvas_docs WHERE session_id = ?`).bind(perm.session_id),
      env.DB.prepare(`DELETE FROM scenes WHERE id = ?`).bind(perm.scene_id),
    ]);

    return json({ success: true });
  } catch (err) {
    return json({ error: 'Failed to delete scene' }, 500);
  }
}

// =============================================================================
// Workspace List Handler
// =============================================================================

async function handleSceneList(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const guestId = url.searchParams.get('guestId');

    if (!userId && !guestId) {
      return json({ error: 'Missing userId or guestId' }, 400);
    }

    const identifier = userId || guestId;
    const ownerType = userId ? 'user' : 'guest';

    const scenes = await env.DB.prepare(
      `SELECT s.id, s.session_id, s.workspace_name, s.created_at, s.updated_at,
              s.last_accessed_at, s.size_bytes, s.view_count,
              sp.token
       FROM scenes s
       LEFT JOIN scene_permissions sp ON sp.scene_id = s.id
       WHERE s.created_by = ? AND s.owner_type = ?
       ORDER BY s.last_accessed_at DESC`
    ).bind(identifier, ownerType).all();

    // Workspace limit: guests=1, free authenticated=3
    const maxWorkspaces = userId ? 3 : 1;

    return json({
      workspaces: scenes.results || [],
      maxWorkspaces,
      count: scenes.results?.length || 0,
    });
  } catch (err) {
    return json({ error: 'Failed to list workspaces' }, 500);
  }
}

// =============================================================================
// Workspace Cleanup Handler (delete stale workspaces > 1 month)
// =============================================================================

async function handleSceneCleanup(request: Request, env: Env): Promise<Response> {
  try {
    // Find scenes not accessed in over 1 month
    const staleScenes = await env.DB.prepare(
      `SELECT id, session_id FROM scenes
       WHERE last_accessed_at < datetime('now', '-1 month')
          OR (last_accessed_at IS NULL AND created_at < datetime('now', '-1 month'))`
    ).all<{ id: string; session_id: string }>();

    if (!staleScenes.results || staleScenes.results.length === 0) {
      return json({ deleted: 0, message: 'No stale workspaces found' });
    }

    const deletedSessionIds: string[] = [];

    for (const scene of staleScenes.results) {
      // Delete Cloudinary folder for this session
      try {
        await deleteCloudinaryFolder(scene.session_id, env);
      } catch (err) {
        console.error(`[Cleanup] Failed to delete Cloudinary folder for ${scene.session_id}:`, err);
      }

      // Delete from DB (cascade deletes scene_permissions)
      await env.DB.prepare(`DELETE FROM scenes WHERE id = ?`).bind(scene.id).run();
      deletedSessionIds.push(scene.session_id);
    }

    return json({
      deleted: deletedSessionIds.length,
      sessionIds: deletedSessionIds,
    });
  } catch (err) {
    return json({ error: 'Failed to cleanup workspaces' }, 500);
  }
}

async function deleteCloudinaryFolder(sessionId: string, env: Env): Promise<void> {
  const cloudName = 'elixpo';
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `lixsketch/${sessionId}`;

  // Delete all resources in the folder
  const deleteParams = `prefix=${folder}&timestamp=${timestamp}`;
  const signature = await cloudinarySign(deleteParams, env.CLOUDINARY_SECRET);

  await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload?prefix=${encodeURIComponent(folder)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Basic ${btoa(`${env.CLOUDINARY_KEY}:${env.CLOUDINARY_SECRET}`)}`,
      },
    }
  );

  // Also try to delete the folder itself
  await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/folders/${encodeURIComponent(folder)}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Basic ${btoa(`${env.CLOUDINARY_KEY}:${env.CLOUDINARY_SECRET}`)}`,
      },
    }
  );
}

// =============================================================================
// Image Upload Handler (Cloudinary signed upload)
// =============================================================================

async function handleImageSign(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as {
      sessionId: string;
      filename?: string;
    };

    if (!body.sessionId) {
      return json({ error: 'Missing sessionId' }, 400);
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `lixsketch/${body.sessionId}`;
    const publicId = `${folder}/${body.filename || `img_${timestamp}`}`;

    // Generate Cloudinary signature
    const paramsToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}`;
    const signature = await cloudinarySign(paramsToSign, env.CLOUDINARY_SECRET);

    return json({
      signature,
      timestamp,
      apiKey: env.CLOUDINARY_KEY,
      folder,
      publicId,
      cloudName: 'elixpo', // Cloudinary cloud name
    });
  } catch (err) {
    return json({ error: 'Failed to generate upload signature' }, 500);
  }
}

// =============================================================================
// Image Delete Handler (delete from Cloudinary)
// =============================================================================

async function handleImageDelete(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as {
      publicId?: string;
      sessionId?: string;
    };

    if (!body.publicId && !body.sessionId) {
      return json({ error: 'Missing publicId or sessionId' }, 400);
    }

    const cloudName = 'elixpo';

    if (body.publicId) {
      // Delete a single image by public_id
      const timestamp = Math.floor(Date.now() / 1000);
      const paramsToSign = `public_id=${body.publicId}&timestamp=${timestamp}`;
      const signature = await cloudinarySign(paramsToSign, env.CLOUDINARY_SECRET);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            public_id: body.publicId,
            signature,
            api_key: env.CLOUDINARY_KEY,
            timestamp,
          }),
        }
      );

      const result = await res.json() as { result: string };
      return json({ success: true, result: result.result });
    }

    if (body.sessionId) {
      // Delete all images for a session
      await deleteCloudinaryFolder(body.sessionId, env);
      return json({ success: true });
    }

    return json({ error: 'No action taken' }, 400);
  } catch (err) {
    return json({ error: 'Failed to delete image' }, 500);
  }
}

async function cloudinarySign(params: string, apiSecret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(apiSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(params + apiSecret));
  // Cloudinary expects hex-encoded SHA-1, but with Web Crypto we use SHA-256
  // Actually, Cloudinary uses SHA-1 by default but accepts SHA-256 with signature_algorithm param
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// =============================================================================
// AI Quota Handlers
// =============================================================================

const AI_LIMITS: Record<string, number> = {
  guest: 5,
  free: 10,
  pro: 50,
  team: -1, // unlimited
};

async function handleAIQuota(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const guestId = url.searchParams.get('guestId');

    if (!userId && !guestId) {
      return json({ error: 'Missing userId or guestId' }, 400);
    }

    let tier = 'guest';
    if (userId) {
      const user = await env.DB.prepare(
        `SELECT tier FROM users WHERE id = ?`
      ).bind(userId).first<{ tier: string }>();
      tier = user?.tier || 'free';
    }

    const limit = AI_LIMITS[tier] ?? 10;
    const col = userId ? 'user_id' : 'guest_id';
    const identifier = userId || guestId;

    const result = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM ai_usage
       WHERE ${col} = ? AND used_at >= date('now')`
    ).bind(identifier).first<{ count: number }>();

    const used = result?.count || 0;

    return json({
      used,
      limit: limit === -1 ? 'unlimited' : limit,
      remaining: limit === -1 ? 'unlimited' : Math.max(0, limit - used),
      tier,
    });
  } catch (err) {
    return json({ error: 'Failed to fetch AI quota' }, 500);
  }
}

async function handleAIUsage(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as {
      userId?: string;
      guestId?: string;
      mode?: string;
    };

    if (!body.userId && !body.guestId) {
      return json({ error: 'Missing userId or guestId' }, 400);
    }

    let tier = 'guest';
    if (body.userId) {
      const user = await env.DB.prepare(
        `SELECT tier FROM users WHERE id = ?`
      ).bind(body.userId).first<{ tier: string }>();
      tier = user?.tier || 'free';
    }

    const limit = AI_LIMITS[tier] ?? 10;
    const col = body.userId ? 'user_id' : 'guest_id';
    const identifier = body.userId || body.guestId;

    // Check current usage
    const result = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM ai_usage
       WHERE ${col} = ? AND used_at >= date('now')`
    ).bind(identifier).first<{ count: number }>();

    const used = result?.count || 0;

    if (limit !== -1 && used >= limit) {
      return json({ error: 'Daily AI limit reached', quotaExceeded: true, used, limit }, 429);
    }

    // Record usage
    const id = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO ai_usage (id, user_id, guest_id, mode) VALUES (?, ?, ?, ?)`
    ).bind(id, body.userId || null, body.guestId || null, body.mode || 'lixscript').run();

    return json({
      used: used + 1,
      limit: limit === -1 ? 'unlimited' : limit,
      remaining: limit === -1 ? 'unlimited' : Math.max(0, limit - used - 1),
    });
  } catch (err) {
    return json({ error: 'Failed to record AI usage' }, 500);
  }
}

// =============================================================================
// User Quota Summary Handler
// =============================================================================

async function handleQuotaSummary(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const guestId = url.searchParams.get('guestId');

    if (!userId && !guestId) {
      return json({ error: 'Missing userId or guestId' }, 400);
    }

    const identifier = userId || guestId;
    const ownerType = userId ? 'user' : 'guest';

    // Get tier
    let tier = 'guest';
    let email: string | null = null;
    let displayName: string | null = null;
    if (userId) {
      const user = await env.DB.prepare(
        `SELECT tier, email, display_name FROM users WHERE id = ?`
      ).bind(userId).first<{ tier: string; email: string; display_name: string }>();
      tier = user?.tier || 'free';
      email = user?.email || null;
      displayName = user?.display_name || null;
    }

    // AI usage today
    const aiCol = userId ? 'user_id' : 'guest_id';
    const aiResult = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM ai_usage
       WHERE ${aiCol} = ? AND used_at >= date('now')`
    ).bind(identifier).first<{ count: number }>();
    const aiUsed = aiResult?.count || 0;
    const aiLimit = AI_LIMITS[tier] ?? 10;

    // Workspace count
    const wsResult = await env.DB.prepare(
      `SELECT COUNT(*) as count FROM scenes
       WHERE created_by = ? AND owner_type = ?`
    ).bind(identifier, ownerType).first<{ count: number }>();
    const workspaceCount = wsResult?.count || 0;
    const workspaceLimit = userId ? 3 : 1;

    // Image storage (sum of size_bytes for user's scenes)
    const storageResult = await env.DB.prepare(
      `SELECT COALESCE(SUM(size_bytes), 0) as total FROM scenes
       WHERE created_by = ? AND owner_type = ?`
    ).bind(identifier, ownerType).first<{ total: number }>();
    const storageUsed = storageResult?.total || 0;

    return json({
      tier,
      email,
      displayName,
      isGuest: !userId,
      ai: {
        used: aiUsed,
        limit: aiLimit === -1 ? 'unlimited' : aiLimit,
        remaining: aiLimit === -1 ? 'unlimited' : Math.max(0, aiLimit - aiUsed),
      },
      workspaces: {
        used: workspaceCount,
        limit: workspaceLimit,
      },
      storage: {
        usedBytes: storageUsed,
        limitBytes: 5 * 1024 * 1024, // 5MB per room
      },
    });
  } catch (err) {
    return json({ error: 'Failed to fetch quota summary' }, 500);
  }
}

// =============================================================================
// Canvas Doc Handlers
// =============================================================================

const DOC_SIZE_LIMIT_BYTES = 5_000_000; // 5 MB encrypted blob ceiling

// In-memory rate limit (per-isolate). Best-effort — Workers spin up many
// isolates so this is a soft cap, not a hard one. Pair with KV if/when
// we need a global rate limit.
const _docRateMap = new Map<string, number[]>();
const DOC_RATE_LIMIT_WINDOW_MS = 60_000;
const DOC_RATE_LIMIT_MAX = 6;

function isDocRateLimited(key: string): boolean {
  const now = Date.now();
  const arr = _docRateMap.get(key) || [];
  const recent = arr.filter((t) => now - t < DOC_RATE_LIMIT_WINDOW_MS);
  if (recent.length >= DOC_RATE_LIMIT_MAX) {
    _docRateMap.set(key, recent);
    return true;
  }
  recent.push(now);
  _docRateMap.set(key, recent);
  return false;
}

// Verify the caller owns this canvas. We mirror scenes' existing model:
// the scene's `created_by` is the source of truth; first save claims it.
async function authorizeCanvasOwner(
  env: Env,
  sessionId: string,
  callerId: string | undefined,
): Promise<{ ok: true; ownerType: 'user' | 'guest'; firstWrite: boolean } | { ok: false; status: number; error: string }> {
  const scene = await env.DB.prepare(
    `SELECT created_by, owner_type FROM scenes WHERE session_id = ?`
  ).bind(sessionId).first<{ created_by: string | null; owner_type: string }>();

  // If the scene doesn't exist yet, allow the doc save — first canvas
  // save will land shortly and claim ownership. (The scene autosave
  // creates the row very early.)
  if (!scene) {
    return { ok: true, ownerType: callerId && !callerId.startsWith('guest-') ? 'user' : 'guest', firstWrite: true };
  }

  // If the scene has an owner, the caller must match it.
  if (scene.created_by) {
    if (!callerId || callerId !== scene.created_by) {
      return { ok: false, status: 403, error: 'Unauthorized — not the canvas owner' };
    }
  }
  return { ok: true, ownerType: (scene.owner_type as 'user' | 'guest') || 'guest', firstWrite: false };
}

async function handleCanvasDocSave(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as {
      sessionId: string;
      encryptedData: string;
      createdBy?: string;
      clientId?: string;
      // Last-known server updated_at on the client. Used for optimistic
      // concurrency: if the server has a newer save, reject.
      lastSeenUpdatedAt?: string;
    };

    if (!body.sessionId || typeof body.encryptedData !== 'string') {
      return json({ error: 'Missing sessionId or encryptedData' }, 400);
    }

    const sizeBytes = new Blob([body.encryptedData]).size;
    if (sizeBytes > DOC_SIZE_LIMIT_BYTES) {
      return json({ error: 'DOC_TOO_LARGE', limit: DOC_SIZE_LIMIT_BYTES, size: sizeBytes }, 413);
    }

    const auth = await authorizeCanvasOwner(env, body.sessionId, body.createdBy);
    if (!auth.ok) return json({ error: auth.error }, auth.status);

    if (isDocRateLimited(body.sessionId)) {
      return json({ error: 'RATE_LIMITED', message: 'Too many doc saves; try again shortly.' }, 429);
    }

    // Optimistic concurrency: reject if a different client already wrote
    // a newer version since the caller last loaded.
    if (body.lastSeenUpdatedAt) {
      const existing = await env.DB.prepare(
        `SELECT updated_at, client_id FROM canvas_docs WHERE session_id = ?`
      ).bind(body.sessionId).first<{ updated_at: string; client_id: string | null }>();
      if (existing && existing.updated_at > body.lastSeenUpdatedAt && existing.client_id !== (body.clientId || null)) {
        return json({
          error: 'CONFLICT',
          message: 'A newer version exists from another tab/device.',
          serverUpdatedAt: existing.updated_at,
        }, 409);
      }
    }

    await env.DB.prepare(
      `INSERT INTO canvas_docs (session_id, encrypted_data, created_by, client_id, size_bytes, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(session_id) DO UPDATE SET
         encrypted_data = excluded.encrypted_data,
         client_id = excluded.client_id,
         size_bytes = excluded.size_bytes,
         updated_at = datetime('now')`
    ).bind(body.sessionId, body.encryptedData, body.createdBy || null, body.clientId || null, sizeBytes).run();

    // Read back the updated_at so the client can use it for next-write
    // concurrency check.
    const fresh = await env.DB.prepare(
      `SELECT updated_at FROM canvas_docs WHERE session_id = ?`
    ).bind(body.sessionId).first<{ updated_at: string }>();

    return json({ ok: true, updatedAt: fresh?.updated_at });
  } catch (err) {
    return json({ error: 'Failed to save canvas doc' }, 500);
  }
}

async function handleCanvasDocLoad(request: Request, env: Env): Promise<Response> {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    const callerId = url.searchParams.get('callerId') || undefined;
    if (!sessionId) return json({ error: 'Missing sessionId' }, 400);

    const auth = await authorizeCanvasOwner(env, sessionId, callerId);
    if (!auth.ok) return json({ error: auth.error }, auth.status);

    const row = await env.DB.prepare(
      `SELECT cd.encrypted_data, cd.updated_at, cd.client_id, s.layout_mode
       FROM canvas_docs cd
       LEFT JOIN scenes s ON s.session_id = cd.session_id
       WHERE cd.session_id = ?`
    ).bind(sessionId).first<{
      encrypted_data: string;
      updated_at: string;
      client_id: string | null;
      layout_mode: string | null;
    }>();

    if (!row) {
      const scene = await env.DB.prepare(
        `SELECT layout_mode FROM scenes WHERE session_id = ?`
      ).bind(sessionId).first<{ layout_mode: string | null }>();
      return json({ encryptedData: null, layoutMode: scene?.layout_mode || 'canvas' });
    }

    return json({
      encryptedData: row.encrypted_data,
      updatedAt: row.updated_at,
      clientId: row.client_id,
      layoutMode: row.layout_mode || 'canvas',
    });
  } catch (err) {
    return json({ error: 'Failed to load canvas doc' }, 500);
  }
}

async function handleCanvasLayoutSave(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as { sessionId: string; layoutMode: string; createdBy?: string };
    if (!body.sessionId || !['canvas', 'split', 'docs'].includes(body.layoutMode)) {
      return json({ error: 'Invalid sessionId or layoutMode' }, 400);
    }
    const auth = await authorizeCanvasOwner(env, body.sessionId, body.createdBy);
    if (!auth.ok) return json({ error: auth.error }, auth.status);

    await env.DB.prepare(
      `UPDATE scenes SET layout_mode = ? WHERE session_id = ?`
    ).bind(body.layoutMode, body.sessionId).run();
    return json({ ok: true });
  } catch (err) {
    return json({ error: 'Failed to save layout mode' }, 500);
  }
}

// =============================================================================
// Helpers
// =============================================================================

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

function generateToken(length = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => chars[v % chars.length]).join('');
}

function extractBearerToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}
