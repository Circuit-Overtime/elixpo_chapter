export const runtime = 'edge'

import { NextResponse } from 'next/server'

let cachedData = null

async function getDataArray(origin) {
  if (cachedData) return cachedData

  const res = await fetch(`${origin}/icons/info/icons.json`)
  if (!res.ok) return []

  const metadata = await res.json()
  cachedData = Object.keys(metadata).map((filename) => ({
    filename,
    ...metadata[filename],
  }))
  return cachedData
}

export async function GET(request) {
  const url = new URL(request.url)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)
  const limit = parseInt(url.searchParams.get('limit') || '5', 10)

  const dataArray = await getDataArray(url.origin)
  const paginated = dataArray.slice(offset, offset + limit)

  return NextResponse.json({
    offset,
    limit,
    total: dataArray.length,
    results: paginated,
  })
}
