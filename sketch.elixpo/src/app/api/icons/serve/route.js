import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

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
  const safeName = path.basename(name)
  const filePath = path.join(process.cwd(), 'public', 'icons', safeName)

  try {
    const svg = fs.readFileSync(filePath, 'utf-8')
    return new NextResponse(svg, {
      headers: { 'Content-Type': 'text/plain' },
    })
  } catch {
    return NextResponse.json(
      { error: 'SVG file not found.' },
      { status: 404 }
    )
  }
}
