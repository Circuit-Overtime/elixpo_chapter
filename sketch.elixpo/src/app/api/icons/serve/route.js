export const runtime = 'edge'

import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const name = (searchParams.get('name') || '').trim()

  if (!name || !name.endsWith('.svg')) {
    return NextResponse.json(
      { error: 'Invalid or missing SVG filename.' },
      { status: 400 }
    )
  }

  // Prevent path traversal
  const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '')
  const origin = new URL(request.url).origin

  try {
    const res = await fetch(`${origin}/icons/${safeName}`)
    if (!res.ok) {
      return NextResponse.json({ error: 'SVG file not found.' }, { status: 404 })
    }
    const svg = await res.text()
    return new NextResponse(svg, {
      headers: { 'Content-Type': 'text/plain' },
    })
  } catch {
    return NextResponse.json({ error: 'SVG file not found.' }, { status: 404 })
  }
}
