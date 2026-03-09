import { NextResponse } from 'next/server'
import Fuse from 'fuse.js'
import fs from 'fs'
import path from 'path'

let fuse = null
let dataArray = null
let lastLoadTime = 0
const RELOAD_INTERVAL = 60_000
const iconsDir = path.join(process.cwd(), 'public', 'icons')

function loadData() {
  const now = Date.now()
  if (dataArray && fuse && now - lastLoadTime < RELOAD_INTERVAL) return

  const metaPath = path.join(iconsDir, 'info', 'icons.json')
  if (!fs.existsSync(metaPath)) return

  const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
  dataArray = Object.keys(metadata).map((filename) => ({
    filename,
    ...metadata[filename],
  }))

  fuse = new Fuse(dataArray, {
    includeScore: true,
    threshold: 0.4,
    keys: ['filename', 'keywords', 'description', 'category'],
  })
  lastLoadTime = now
}

// In-memory SVG cache to avoid repeated disk reads
const svgCache = new Map()

function readSvg(filename) {
  if (svgCache.has(filename)) return svgCache.get(filename)
  try {
    const filePath = path.join(iconsDir, filename)
    const content = fs.readFileSync(filePath, 'utf-8')
    svgCache.set(filename, content)
    return content
  } catch {
    return null
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') || '').trim().toLowerCase()
  const category = (searchParams.get('category') || '').trim().toLowerCase()
  const inline = searchParams.get('inline') === '1'

  loadData()
  if (!dataArray) return NextResponse.json({ results: [] })

  let results

  if (q) {
    const fuseResults = fuse.search(q)
    results = fuseResults.map((r) => r.item)
    if (category) {
      results = results.filter((item) => item.category === category)
    }
  } else if (category) {
    results = dataArray.filter((item) => item.category === category)
  } else {
    results = dataArray.slice(0, 60)
  }

  const sliced = results.slice(0, 60)

  // If inline requested, bundle SVG content into response
  if (inline) {
    const withSvg = sliced.map((item) => ({
      ...item,
      svg: readSvg(item.filename),
    }))
    return NextResponse.json({ results: withSvg })
  }

  return NextResponse.json({ results: sliced })
}
