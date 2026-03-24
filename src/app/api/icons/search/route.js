export const runtime = 'edge'

import { NextResponse } from 'next/server'
import Fuse from 'fuse.js'

let fuse = null
let dataArray = null
const svgCache = new Map()

async function loadData(origin) {
  if (dataArray && fuse) return

  const res = await fetch(`${origin}/icons/info/icons.json`)
  if (!res.ok) return

  const metadata = await res.json()
  dataArray = Object.keys(metadata).map((filename) => ({
    filename,
    ...metadata[filename],
  }))

  fuse = new Fuse(dataArray, {
    includeScore: true,
    threshold: 0.4,
    keys: ['filename', 'keywords', 'description', 'category'],
  })
}

async function fetchSvg(origin, filename) {
  if (svgCache.has(filename)) return svgCache.get(filename)
  try {
    const svgRes = await fetch(`${origin}/icons/${filename}`)
    const svg = svgRes.ok ? await svgRes.text() : null
    if (svg) svgCache.set(filename, svg)
    return svg
  } catch {
    return null
  }
}

export async function GET(request) {
  const url = new URL(request.url)
  const origin = url.origin
  const q = (url.searchParams.get('q') || '').trim().toLowerCase()
  const category = (url.searchParams.get('category') || '').trim().toLowerCase()
  const inline = url.searchParams.get('inline') === '1'

  await loadData(origin)
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

  if (inline) {
    const withSvg = await Promise.all(
      sliced.map(async (item) => {
        const svg = await fetchSvg(origin, item.filename)
        return { ...item, svg }
      })
    )
    return NextResponse.json({ results: withSvg }, {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
    })
  }

  return NextResponse.json({ results: sliced }, {
    headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' },
  })
}
