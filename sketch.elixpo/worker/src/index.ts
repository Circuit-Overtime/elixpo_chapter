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

    // --- Image upload route ---

    if (url.pathname === '/api/images/sign' && request.method === 'POST') {
      return handleImageSign(request, env);
    }

    // Health check
    if (url.pathname === '/health') {
      return json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    return json({ error: 'Not found' }, 404);
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
    maxRooms: 10, // free plan
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

    const sceneId = crypto.randomUUID();
    const token = generateToken();
    const permissionId = crypto.randomUUID();
    const sizeBytes = new Blob([body.encryptedData]).size;

    await env.DB.batch([
      env.DB.prepare(
        `INSERT INTO scenes (id, session_id, workspace_name, encrypted_data, permission, created_by, size_bytes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        sceneId,
        body.sessionId,
        body.workspaceName || 'Untitled',
        body.encryptedData,
        body.permission || 'view',
        body.createdBy || null,
        sizeBytes
      ),
      env.DB.prepare(
        `INSERT INTO scene_permissions (id, scene_id, token, permission)
         VALUES (?, ?, ?, ?)`
      ).bind(
        permissionId,
        sceneId,
        token,
        body.permission || 'view'
      ),
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

    // Delete the scene (cascade deletes scene_permissions)
    await env.DB.prepare(
      `DELETE FROM scenes WHERE id = ?`
    ).bind(perm.scene_id).run();

    return json({ success: true });
  } catch (err) {
    return json({ error: 'Failed to delete scene' }, 500);
  }
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
