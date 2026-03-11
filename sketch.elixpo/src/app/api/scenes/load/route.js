import { NextResponse } from 'next/server'
import { getCloudflareBindings } from '@/lib/cloudflare'

export const runtime = 'edge'

export async function GET(request) {
  try {
    const { DB } = getCloudflareBindings()
    const url = new URL(request.url)
    const token = url.searchParams.get('token')

    if (!token) {
      return NextResponse.json({ error: 'Missing token' }, { status: 400 })
    }

    const perm = await DB.prepare(
      `SELECT sp.permission, s.encrypted_data, s.workspace_name, s.session_id
       FROM scene_permissions sp
       JOIN scenes s ON sp.scene_id = s.id
       WHERE sp.token = ?`
    ).bind(token).first()

    if (!perm) {
      return NextResponse.json({ error: 'Scene not found or link expired' }, { status: 404 })
    }

    // Increment view count
    await DB.prepare(
      `UPDATE scenes SET view_count = view_count + 1 WHERE session_id = ?`
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
