import { NextResponse } from 'next/server'
import { getCloudflareBindings } from '@/lib/cloudflare'

export const runtime = 'edge'

export async function GET(request) {
  try {
    const { DB } = getCloudflareBindings()
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')
    const guestId = url.searchParams.get('guestId')

    if (!userId && !guestId) {
      return NextResponse.json({ error: 'Missing userId or guestId' }, { status: 400 })
    }

    const identifier = userId || guestId
    const ownerType = userId ? 'user' : 'guest'

    const scenes = await DB.prepare(
      `SELECT s.id, s.session_id, s.workspace_name, s.created_at, s.updated_at,
              s.last_accessed_at, s.size_bytes, s.view_count,
              sp.token
       FROM scenes s
       LEFT JOIN scene_permissions sp ON sp.scene_id = s.id
       WHERE s.created_by = ? AND s.owner_type = ?
       ORDER BY s.last_accessed_at DESC`
    ).bind(identifier, ownerType).all()

    // Workspace limit: guests=1, free authenticated=3
    const maxWorkspaces = userId ? 3 : 1

    return NextResponse.json({
      workspaces: scenes.results || [],
      maxWorkspaces,
      count: scenes.results?.length || 0,
    })
  } catch (err) {
    console.error('[api/scenes/list] Error:', err)
    return NextResponse.json({ error: 'Failed to list workspaces' }, { status: 500 })
  }
}
