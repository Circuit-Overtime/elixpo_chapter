import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

let cachedData = null
let lastLoadTime = 0
const RELOAD_INTERVAL = 60_000

function getDataArray() {
  const now = Date.now()
  if (cachedData && now - lastLoadTime < RELOAD_INTERVAL) return cachedData

  const metaPath = path.join(process.cwd(), 'public', 'icons', 'info', 'icons.json')
  if (!fs.existsSync(metaPath)) return []

  const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
  cachedData = Object.keys(metadata).map((filename) => ({
    filename,
    ...metadata[filename],
  }))
  lastLoadTime = now
  return cachedData
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const offset = parseInt(searchParams.get('offset') || '0', 10)
  const limit = parseInt(searchParams.get('limit') || '5', 10)

  const dataArray = getDataArray()
  const paginated = dataArray.slice(offset, offset + limit)

  return NextResponse.json({
    offset,
    limit,
    total: dataArray.length,
    results: paginated,
  })
}
