import { NextResponse } from 'next/server'
import { getCloudflareBindings, generateToken } from '@/lib/cloudflare'

export const runtime = 'edge'

export async function POST(request) {
  try {
    const { DB } = getCloudflareBindings()
    const body = await request.json()

    if (!body.sessionId || !body.encryptedData) {
      return NextResponse.json({ error: 'Missing sessionId or encryptedData' }, { status: 400 })
    }

    const sceneId = crypto.randomUUID()
    const token = generateToken()
    const permissionId = crypto.randomUUID()
    const sizeBytes = new Blob([body.encryptedData]).size

    await DB.batch([
      DB.prepare(
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
      DB.prepare(
        `INSERT INTO scene_permissions (id, scene_id, token, permission)
         VALUES (?, ?, ?, ?)`
      ).bind(
        permissionId,
        sceneId,
        token,
        body.permission || 'view'
      ),
    ])

    return NextResponse.json({ sceneId, token }, { status: 201 })
  } catch (err) {
    console.error('[api/scenes/save] Error:', err)
    return NextResponse.json({ error: 'Failed to save scene' }, { status: 500 })
  }
}
