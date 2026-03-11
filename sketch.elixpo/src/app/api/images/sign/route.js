import { NextResponse } from 'next/server'

export const runtime = 'edge'

export async function POST(request) {
  try {
    const body = await request.json()

    if (!body.sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 })
    }

    const timestamp = Math.floor(Date.now() / 1000)
    const folder = `lixsketch/${body.sessionId}`
    const publicId = `${folder}/${body.filename || `img_${timestamp}`}`

    const apiSecret = process.env.CLOUDINARY_KEY_SECRET
    const apiKey = process.env.CLOUDINARY_KEY_

    // Generate Cloudinary signature (SHA-256 HMAC)
    const paramsToSign = `folder=${folder}&public_id=${publicId}&timestamp=${timestamp}`
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(apiSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(paramsToSign + apiSecret))
    const signature = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')

    return NextResponse.json({
      signature,
      timestamp,
      apiKey,
      folder,
      publicId,
      cloudName: 'elixpo',
    })
  } catch (err) {
    console.error('[api/images/sign] Error:', err)
    return NextResponse.json({ error: 'Failed to generate upload signature' }, { status: 500 })
  }
}
