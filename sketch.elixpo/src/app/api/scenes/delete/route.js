import { NextResponse } from 'next/server'
import { getCloudflareBindings } from '@/lib/cloudflare'

export const runtime = 'edge'

export async function DELETE(request) {
  try {
    const { DB } = getCloudflareBindings()
    const body = await request.json()

    if (!body.token || !body.sessionId) {
      return NextResponse.json({ error: 'Missing token or sessionId' }, { status: 400 })
    }

    const perm = await DB.prepare(
      `SELECT sp.scene_id, s.session_id
       FROM scene_permissions sp
       JOIN scenes s ON sp.scene_id = s.id
       WHERE sp.token = ?`
    ).bind(body.token).first()

    if (!perm) {
      return NextResponse.json({ error: 'Scene not found' }, { status: 404 })
    }

    if (perm.session_id !== body.sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await DB.prepare(
      `DELETE FROM scenes WHERE id = ?`
    ).bind(perm.scene_id).run()

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[api/scenes/delete] Error:', err)
    return NextResponse.json({ error: 'Failed to delete scene' }, { status: 500 })
  }
}
