import { NextResponse } from 'next/server'
import { getCloudflareBindings } from '@/lib/cloudflare'

export const runtime = 'edge'

export async function GET(request) {
  try {
    let DB;
    try {
      const bindings = getCloudflareBindings()
      DB = bindings.DB
    } catch {
      return NextResponse.json({ encryptedData: null, error: 'Local dev: DB unavailable' }, { status: 200 })
    }

    if (!DB) {
      return NextResponse.json({ encryptedData: null, error: 'Local dev: DB unavailable' }, { status: 200 })
    }

    const url = new URL(request.url)
    const token = url.searchParams.get('token')
    const sessionId = url.searchParams.get('sessionId')

    if (!token && !sessionId) {
      return NextResponse.json({ error: 'Missing token or sessionId' }, { status: 400 })
    }

    let perm
    
    if (token) {
      perm = await DB.prepare(
        `SELECT sp.permission, s.encrypted_data, s.workspace_name, s.session_id
         FROM scene_permissions sp
         JOIN scenes s ON sp.scene_id = s.id
         WHERE sp.token = ?`
      ).bind(token).first()
    } else if (sessionId) {
      // Intentional bypass: querying by sessionId directly allows owners/initial creators
      // to load the scene from their local storage or URL without needing a share token.
      perm = await DB.prepare(
        `SELECT permission, encrypted_data, workspace_name, session_id
         FROM scenes
         WHERE session_id = ?`
      ).bind(sessionId).first()
    }

    if (!perm) {
      return NextResponse.json({ error: 'Scene not found or link expired' }, { status: 404 })
    }

    // Increment view count and update last accessed time
    await DB.prepare(
      `UPDATE scenes SET view_count = view_count + 1, last_accessed_at = datetime('now') WHERE session_id = ?`
    ).bind(perm.session_id).run()

    return NextResponse.json({
      encryptedData: perm.encrypted_data,
      permission: perm.permission,
      workspaceName: perm.workspace_name,
    })
  } catch (err) {
    console.error('[api/scenes/load] Error:', err)
    return NextResponse.json({ error: 'Failed to load scene' }, { status: 500 })
  }
}
