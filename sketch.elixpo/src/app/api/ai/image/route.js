export const runtime = 'edge'

import { NextResponse } from 'next/server'
import { getCloudflareBindings } from '@/lib/cloudflare'

const POLLINATIONS_GEN_URL = 'https://gen.pollinations.ai/v1/images/generations'
const POLLINATIONS_EDIT_URL = 'https://gen.pollinations.ai/v1/images/edits'

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
 * Try to get Cloudflare D1 bindings. Returns null if unavailable (local dev).
 */
function tryGetDB() {
  try {
    const { DB } = getCloudflareBindings()
    return DB || null
  } catch {
    return null
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      prompt, model = 'flux', width = 768, height = 768,
      enhance = true, negative_prompt, seed,
      referenceImage, userId, guestId,
    } = body

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    const apiKey = process.env.POLLINATIONS_IMAGE_API || 'anonymous'
    // if (!apiKey) {
    //   return NextResponse.json({ error: 'Image API not configured' }, { status: 500 })
    // }

    // --- Quota check (skip if DB unavailable in local dev) ---
    const DB = tryGetDB()
    const isEdit = !!referenceImage
    const quotaMode = isEdit ? 'image-edit' : 'image-gen'
    let used = 0
    let tier = 'guest'
    let limit = (isEdit ? IMAGE_EDIT_LIMITS : IMAGE_GEN_LIMITS).guest

    if (DB) {
      if (userId) {
        const user = await DB.prepare(`SELECT tier FROM users WHERE id = ?`).bind(userId).first()
        tier = user?.tier || 'free'
      }

      const limits = isEdit ? IMAGE_EDIT_LIMITS : IMAGE_GEN_LIMITS
      limit = limits[tier] ?? 10
      const col = userId ? 'user_id' : 'guest_id'
      const identifier = userId || guestId

      if (identifier) {
        const result = await DB.prepare(
          `SELECT COUNT(*) as count FROM ai_usage
           WHERE ${col} = ? AND mode = ? AND used_at >= date('now')`
        ).bind(identifier, quotaMode).first()
        used = result?.count || 0

        if (limit !== -1 && used >= limit) {
          return NextResponse.json({
            error: `Daily ${isEdit ? 'image edit' : 'image generation'} limit reached (${used}/${limit})`,
            quotaExceeded: true, used, limit,
          }, { status: 429 })
        }
      }
    }

    // --- Clamp dimensions ---
    const clampedW = Math.min(Math.max(width, 256), 1024)
    const clampedH = Math.min(Math.max(height, 256), 1024)
    const size = `${clampedW}x${clampedH}`

    let dataUrl, contentType

    if (isEdit) {
      // --- Image Edit via /v1/images/edits ---
      console.log('[AI Image] Editing:', { model: 'nanobanana', prompt: prompt.slice(0, 80), size })

      const editBody = {
        prompt: prompt.trim(),
        model: model || 'nanobanana',
        size,
        image: referenceImage,
      }

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 120000)

      const res = await fetch(POLLINATIONS_EDIT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(editBody),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        console.error('[AI Image] Edit failed:', res.status, errText)
        return NextResponse.json(
          { error: 'Image edit failed. Try a different prompt.' },
          { status: 502 }
        )
      }

      const data = await res.json()
      if (data.data?.[0]?.b64_json) {
        contentType = 'image/png'
        dataUrl = `data:${contentType};base64,${data.data[0].b64_json}`
      } else if (data.data?.[0]?.url) {
        // If URL returned, fetch and convert to base64
        const imgRes = await fetch(data.data[0].url)
        const imgBuf = await imgRes.arrayBuffer()
        const base64 = btoa(new Uint8Array(imgBuf).reduce((d, b) => d + String.fromCharCode(b), ''))
        contentType = imgRes.headers.get('content-type') || 'image/png'
        dataUrl = `data:${contentType};base64,${base64}`
      } else {
        return NextResponse.json({ error: 'Unexpected response from image API' }, { status: 502 })
      }
    } else {
      // --- Image Generation via /v1/images/generations ---
      console.log('[AI Image] Generating:', { model, prompt: prompt.slice(0, 80), size })

      const genBody = {
        prompt: prompt.trim(),
        model,
        n: 1,
        size,
        response_format: 'b64_json',
      }
      if (negative_prompt) genBody.negative_prompt = negative_prompt
      if (seed !== undefined && seed !== -1) genBody.seed = seed
      if (enhance !== undefined) genBody.enhance = enhance

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 120000)

      const res = await fetch(POLLINATIONS_GEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(genBody),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (!res.ok) {
        const errText = await res.text().catch(() => '')
        console.error('[AI Image] Generation failed:', res.status, errText)
        return NextResponse.json(
          { error: 'Image generation failed. Try a different prompt or model.' },
          { status: 502 }
        )
      }

      const data = await res.json()
      if (data.data?.[0]?.b64_json) {
        contentType = 'image/png'
        dataUrl = `data:${contentType};base64,${data.data[0].b64_json}`
      } else if (data.data?.[0]?.url) {
        const imgRes = await fetch(data.data[0].url)
        const imgBuf = await imgRes.arrayBuffer()
        const base64 = btoa(new Uint8Array(imgBuf).reduce((d, b) => d + String.fromCharCode(b), ''))
        contentType = imgRes.headers.get('content-type') || 'image/png'
        dataUrl = `data:${contentType};base64,${base64}`
      } else {
        return NextResponse.json({ error: 'Unexpected response from image API' }, { status: 502 })
      }
    }

    // --- Record usage (skip if no DB) ---
    if (DB) {
      try {
        const id = crypto.randomUUID()
        await DB.prepare(
          `INSERT INTO ai_usage (id, user_id, guest_id, mode) VALUES (?, ?, ?, ?)`
        ).bind(id, userId || null, guestId || null, quotaMode).run()
      } catch (e) {
        console.warn('[AI Image] Failed to record usage:', e.message)
      }
      
    }

    console.log('[AI Image] Success')

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
    const DB = tryGetDB()
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')
    const guestId = url.searchParams.get('guestId')
    const type = url.searchParams.get('type') || 'gen'

    if (!userId && !guestId) {
      return NextResponse.json({ error: 'Missing userId or guestId' }, { status: 400 })
    }

    // If no DB, return unlimited (local dev)
    if (!DB) {
      return NextResponse.json({
        used: 0,
        limit: 'unlimited',
        remaining: 'unlimited',
        tier: 'free',
        type: type === 'edit' ? 'image-edit' : 'image-gen',
      })
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
