import { NextResponse } from 'next/server'
import { getCloudflareBindings, generateToken } from '@/lib/cloudflare'

export const runtime = 'edge'

// Workspace limits: guests get 1, free authenticated users get 3
const GUEST_WORKSPACE_LIMIT = 1
const FREE_WORKSPACE_LIMIT = 3

export async function POST(request) {
  try {
    const { DB } = getCloudflareBindings()
    const body = await request.json()

    if (!body.sessionId || !body.encryptedData) {
      return NextResponse.json({ error: 'Missing sessionId or encryptedData' }, { status: 400 })
    }

    const ownerType = body.createdBy && !body.createdBy.startsWith('guest-') ? 'user' : 'guest'
    const maxWorkspaces = ownerType === 'user' ? FREE_WORKSPACE_LIMIT : GUEST_WORKSPACE_LIMIT

    // Check if this is an update to an existing workspace (same session_id)
    const existing = await DB.prepare(
      `SELECT id FROM scenes WHERE session_id = ?`
    ).bind(body.sessionId).first()

    if (existing) {
      // Update existing workspace — no limit check needed
      const sizeBytes = new Blob([body.encryptedData]).size
      await DB.prepare(
        `UPDATE scenes SET encrypted_data = ?, workspace_name = ?, updated_at = datetime('now'),
         last_accessed_at = datetime('now'), size_bytes = ?, owner_type = ?
         WHERE id = ?`
      ).bind(
        body.encryptedData,
        body.workspaceName || 'Untitled',
        sizeBytes,
        ownerType,
        existing.id
      ).run()

      // Get existing token
      const perm = await DB.prepare(
        `SELECT token FROM scene_permissions WHERE scene_id = ?`
      ).bind(existing.id).first()

      return NextResponse.json({ sceneId: existing.id, token: perm?.token || null })
    }

    // New workspace — enforce limit
    if (body.createdBy) {
      const count = await DB.prepare(
        `SELECT COUNT(*) as count FROM scenes WHERE created_by = ? AND owner_type = ?`
      ).bind(body.createdBy, ownerType).first()

      if (count && count.count >= maxWorkspaces) {
        return NextResponse.json({
          error: 'WORKSPACE_LIMIT',
          message: `You can have at most ${maxWorkspaces} workspace${maxWorkspaces > 1 ? 's' : ''}. Delete an existing workspace to create a new one.`,
          maxWorkspaces,
          currentCount: count.count,
        }, { status: 429 })
      }
    }

    const sceneId = crypto.randomUUID()
    const token = generateToken()
    const permissionId = crypto.randomUUID()
    const sizeBytes = new Blob([body.encryptedData]).size

    await DB.batch([
      DB.prepare(
        `INSERT INTO scenes (id, session_id, workspace_name, encrypted_data, permission, created_by, size_bytes, owner_type, last_accessed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`
      ).bind(
        sceneId,
        body.sessionId,
        body.workspaceName || 'Untitled',
        body.encryptedData,
        body.permission || 'view',
        body.createdBy || null,
        sizeBytes,
        ownerType
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
