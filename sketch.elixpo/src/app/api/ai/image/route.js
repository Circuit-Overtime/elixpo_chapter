export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { getCloudflareBindings } from '@/lib/cloudflare'

const POLLINATIONS_IMAGE_URL = 'https://image.pollinations.ai/'

const IMAGE_GEN_LIMITS = {
  guest: 5,
  free: 10,
  pro: 50,
  team: -1,
}

const IMAGE_EDIT_LIMITS = {
  guest: 3,
  free: 5,
  pro: 25,
  team: -1,
}

/**
 * POST /api/ai/image
 * Generate an image or edit an existing image via Pollinations API.
 *
 * Body:
 *   prompt: string (required)
 *   model: 'zimage' | 'flux' | 'gptimage' | 'nanobanana' (default 'zimage')
 *   width: number (default 768, max 768)
 *   height: number (default 768, max 768)
 *   enhance: boolean (default true)
 *   negative_prompt: string (optional)
 *   seed: number (optional, -1 for random)
 *   referenceImage: string (optional, URL for editing)
 *   userId: string (optional)
 *   guestId: string (optional)
 */
export async function POST(request) {
  try {
    const body = await request.json()
    const {
      prompt, model = 'zimage', width = 768, height = 768,
      enhance = true, negative_prompt, seed,
      referenceImage, userId, guestId,
    } = body

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const apiKey = process.env.POLLINATIONS_IMAGE_API
    if (!apiKey) {
      return NextResponse.json({ error: 'Image API not configured' }, { status: 500 })
    }

    // --- Quota check ---
    const { DB } = getCloudflareBindings()
    const isEdit = !!referenceImage
    const quotaMode = isEdit ? 'image-edit' : 'image-gen'

    let tier = 'guest'
    if (userId) {
      const user = await DB.prepare(`SELECT tier FROM users WHERE id = ?`).bind(userId).first()
      tier = user?.tier || 'free'
    }

    const limits = isEdit ? IMAGE_EDIT_LIMITS : IMAGE_GEN_LIMITS
    const limit = limits[tier] ?? 10
    const col = userId ? 'user_id' : 'guest_id'
    const identifier = userId || guestId

    if (!identifier) {
      return NextResponse.json({ error: 'Missing userId or guestId' }, { status: 400 })
    }

    const result = await DB.prepare(
      `SELECT COUNT(*) as count FROM ai_usage
       WHERE ${col} = ? AND mode = ? AND used_at >= date('now')`
    ).bind(identifier, quotaMode).first()

    const used = result?.count || 0
    if (limit !== -1 && used >= limit) {
      return NextResponse.json({
        error: `Daily ${isEdit ? 'image edit' : 'image generation'} limit reached (${used}/${limit})`,
        quotaExceeded: true, used, limit,
      }, { status: 429 })
    }

    // --- Build Pollinations URL ---
    const clampedW = Math.min(Math.max(width, 256), 768)
    const clampedH = Math.min(Math.max(height, 256), 768)

    const params = new URLSearchParams({
      model,
      width: String(clampedW),
      height: String(clampedH),
      enhance: String(enhance),
      safe: 'true',
      seed: String(seed ?? -1),
      nologo: 'true',
      nofeed: 'true',
    })

    if (negative_prompt) params.set('negative_prompt', negative_prompt)
    if (referenceImage) params.set('image', referenceImage)

    const encodedPrompt = encodeURIComponent(prompt.trim())
    const imageUrl = `${POLLINATIONS_IMAGE_URL}${encodedPrompt}?${params.toString()}`

    console.log('[AI Image] Generating:', { model, prompt: prompt.slice(0, 80), width: clampedW, height: clampedH, isEdit })

    // Fetch the image
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 120000) // 2 min timeout for image gen

    const imgResponse = await fetch(imageUrl, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!imgResponse.ok) {
      const errText = await imgResponse.text().catch(() => '')
      console.error('[AI Image] Generation failed:', imgResponse.status, errText)
      return NextResponse.json(
        { error: 'Image generation failed. Try a different prompt or model.' },
        { status: 502 }
      )
    }

    // Convert to base64 data URL
    const imageBuffer = await imgResponse.arrayBuffer()
    const base64 = btoa(
      new Uint8Array(imageBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
    )
    const contentType = imgResponse.headers.get('content-type') || 'image/jpeg'
    const dataUrl = `data:${contentType};base64,${base64}`

    // --- Record usage ---
    const id = crypto.randomUUID()
    await DB.prepare(
      `INSERT INTO ai_usage (id, user_id, guest_id, mode) VALUES (?, ?, ?, ?)`
    ).bind(id, userId || null, guestId || null, quotaMode).run()

    console.log('[AI Image] Success, size:', imageBuffer.byteLength, 'bytes')

    return NextResponse.json({
      imageUrl: dataUrl,
      width: clampedW,
      height: clampedH,
      model,
      used: used + 1,
      limit: limit === -1 ? 'unlimited' : limit,
      remaining: limit === -1 ? 'unlimited' : Math.max(0, limit - used - 1),
    })
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error('[AI Image] Request timed out')
      return NextResponse.json({ error: 'Image generation timed out. Try a simpler prompt.' }, { status: 504 })
    }
    console.error('[AI Image] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/ai/image?type=gen|edit&userId=...&guestId=...
 * Check image quota.
 */
export async function GET(request) {
  try {
    const { DB } = getCloudflareBindings()
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')
    const guestId = url.searchParams.get('guestId')
    const type = url.searchParams.get('type') || 'gen'

    if (!userId && !guestId) {
      return NextResponse.json({ error: 'Missing userId or guestId' }, { status: 400 })
    }

    let tier = 'guest'
    if (userId) {
      const user = await DB.prepare(`SELECT tier FROM users WHERE id = ?`).bind(userId).first()
      tier = user?.tier || 'free'
    }

    const isEdit = type === 'edit'
    const limits = isEdit ? IMAGE_EDIT_LIMITS : IMAGE_GEN_LIMITS
    const limit = limits[tier] ?? 10
    const quotaMode = isEdit ? 'image-edit' : 'image-gen'
    const col = userId ? 'user_id' : 'guest_id'
    const identifier = userId || guestId

    const result = await DB.prepare(
      `SELECT COUNT(*) as count FROM ai_usage
       WHERE ${col} = ? AND mode = ? AND used_at >= date('now')`
    ).bind(identifier, quotaMode).first()

    const used = result?.count || 0

    return NextResponse.json({
      used,
      limit: limit === -1 ? 'unlimited' : limit,
      remaining: limit === -1 ? 'unlimited' : Math.max(0, limit - used),
      tier,
      type: quotaMode,
    })
  } catch (err) {
    console.error('[api/ai/image] Quota error:', err)
    return NextResponse.json({ error: 'Failed to fetch image quota' }, { status: 500 })
  }
}
