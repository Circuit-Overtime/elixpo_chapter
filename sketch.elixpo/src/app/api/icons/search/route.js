import { NextResponse } from 'next/server'
import Fuse from 'fuse.js'
import fs from 'fs'
import path from 'path'

let fuse = null
let lastLoadTime = 0
const RELOAD_INTERVAL = 60_000 // reload metadata every 60s max

function getFuse() {
  const now = Date.now()
  if (fuse && now - lastLoadTime < RELOAD_INTERVAL) return fuse

  const metaPath = path.join(process.cwd(), 'public', 'icons', 'info', 'icons.json')
  if (!fs.existsSync(metaPath)) return null

  const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
  const dataArray = Object.keys(metadata).map((filename) => ({
    filename,
    ...metadata[filename],
  }))

  fuse = new Fuse(dataArray, {
    includeScore: true,
    threshold: 0.4,
    keys: ['filename', 'keywords', 'description', 'category'],
  })
  lastLoadTime = now
  return fuse
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim().toLowerCase()

  if (!q) return NextResponse.json([])

  const fuseInstance = getFuse()
  if (!fuseInstance) return NextResponse.json([])

  const results = fuseInstance.search(q)
  const top = results.slice(0, 30).map((r) => r.item)

  return NextResponse.json(top)
}
