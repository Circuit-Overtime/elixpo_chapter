"use client"

import useSketchStore, { TOOLS } from '@/store/useSketchStore'
import { useState, useEffect, useCallback, useRef } from 'react'

const iconResultCache = new Map()

const CATEGORIES = [
  { value: null, label: 'All', icon: 'bxs-grid-alt' },
  { value: 'tech', label: 'Tech', icon: 'bxs-chip' },
  { value: 'devops', label: 'DevOps', icon: 'bxs-server' },
  { value: 'design', label: 'Design', icon: 'bxs-palette' },
  { value: 'social media', label: 'Social', icon: 'bxs-share-alt' },
  { value: 'navigation', label: 'Nav', icon: 'bxs-navigation' },
  { value: 'business', label: 'Business', icon: 'bxs-briefcase' },
  { value: 'media', label: 'Media', icon: 'bxs-videos' },
]

function IconCell({ icon, onClick }) {
  const name = icon.filename?.replace('.svg', '').replace(/_/g, ' ') || ''
  return (
    <button
      onClick={onClick}
      title={name}
      style={{ width: '44px', height: '44px', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '8px', cursor: 'pointer', background: 'transparent', border: 'none', padding: 0 }}
      className="hover:bg-white/10 transition-colors duration-100"
    >
      {icon.svg ? (
        <div
          style={{ width: '24px', height: '24px', overflow: 'hidden', flexShrink: 0, pointerEvents: 'none', filter: 'brightness(0) invert(1)' }}
          dangerouslySetInnerHTML={{ __html: icon.svg }}
        />
      ) : (
        <img
          src={`/icons/${encodeURIComponent(icon.filename)}`}
          alt=""
          style={{ width: '24px', height: '24px', pointerEvents: 'none', filter: 'invert(1)' }}
          loading="lazy"
        />
      )}
    </button>
  )
}

export default function IconSidebar() {
  const activeTool = useSketchStore((s) => s.activeTool)
  const setActiveTool = useSketchStore((s) => s.setActiveTool)
  const visible = activeTool === TOOLS.ICON
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(null)
  const [icons, setIcons] = useState([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef(null)

  // Close on Escape
  useEffect(() => {
    if (!visible) return
    const handler = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setActiveTool(TOOLS.SELECT)
      }
    }
    document.addEventListener('keydown', handler, true)
    return () => document.removeEventListener('keydown', handler, true)
  }, [visible, setActiveTool])

  // Close when clicking on the canvas (outside the sidebar)
  useEffect(() => {
    if (!visible) return
    const svgEl = document.getElementById('freehand-canvas')
    if (!svgEl) return
    const handleCanvasClick = () => setActiveTool(TOOLS.SELECT)
    svgEl.addEventListener('mousedown', handleCanvasClick)
    return () => svgEl.removeEventListener('mousedown', handleCanvasClick)
  }, [visible, setActiveTool])

  const fetchIcons = useCallback(async (searchQuery, cat) => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('q', searchQuery)
    if (cat) params.set('category', cat)
    params.set('inline', '1')
    const cacheKey = params.toString()

    // Return cached results instantly if available
    if (iconResultCache.has(cacheKey)) {
      setIcons(iconResultCache.get(cacheKey))
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/icons/search?${cacheKey}`)
      if (res.ok) {
        const data = await res.json()
        const results = data.results || []
        iconResultCache.set(cacheKey, results)
        setIcons(results)
      }
    } catch (err) {
      console.error('Icon fetch failed:', err)
    }
    setLoading(false)
  }, [])

  // Fetch icons when visibility, query, or category changes (debounced for query typing)
  useEffect(() => {
    if (!visible) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchIcons(query, category)
    }, query ? 300 : 0)
    return () => clearTimeout(debounceRef.current)
  }, [query, visible, category, fetchIcons])

  const handleIconClick = useCallback((icon) => {
    if (typeof window === 'undefined') return
    const place = (svgContent) => {
      if (window.prepareIconPlacement) {
        window.prepareIconPlacement(svgContent)
      } else {
        window.iconToPlace = svgContent
      }
    }
    if (icon.svg) {
      place(icon.svg)
    } else {
      fetch(`/icons/${encodeURIComponent(icon.filename)}`)
        .then((r) => r.text())
        .then(place)
        .catch(() => {})
    }
  }, [])

  return (
    <div
      className={`fixed top-[60px] right-2 bottom-[56px] w-[300px] bg-[#18181c] border border-white/[0.06] rounded-2xl z-[999] font-[lixFont] flex flex-col transition-transform duration-200 ${
        visible ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="px-3.5 pt-3.5 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-white/90 text-sm font-medium">Icons</h3>
          <button
            onClick={() => setActiveTool(TOOLS.SELECT)}
            className="w-6 h-6 flex items-center justify-center rounded-md text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors duration-100"
            title="Close (Esc)"
          >
            <i className="bx bx-x text-lg" />
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-lg px-2.5 py-2">
          <i className="bx bxs-search text-white/40 text-sm" />
          <input
            id="iconSearchInput"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search icons..."
            className="flex-1 bg-transparent text-white/90 text-sm outline-none placeholder:text-white/30"
            spellCheck={false}
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-white/30 hover:text-white/60">
              <i className="bx bxs-x-circle text-sm" />
            </button>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-1 px-3.5 pb-2.5 shrink-0">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value || 'all'}
            onClick={() => setCategory(cat.value)}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs whitespace-nowrap transition-colors duration-100 ${
              category === cat.value
                ? 'bg-accent-blue/20 text-accent-blue-hover'
                : 'text-white/50 hover:bg-white/[0.06] hover:text-white/80'
            }`}
          >
            <i className={`bx ${cat.icon} text-xs`} />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Divider */}
      <div className="h-px bg-white/[0.06] mx-3.5 shrink-0" />

      {/* Icon grid — scrollable */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-3 py-2.5" id="iconsContainer">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-white/40 text-sm">
            <i className="bx bxs-hourglass bx-spin text-lg mr-2" />
            Loading...
          </div>
        ) : icons.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-white/40 text-sm">
            No icons found
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', gap: '2px' }}>
            {icons.map((icon, i) => (
              <IconCell
                key={icon.filename || i}
                icon={icon}
                onClick={() => handleIconClick(icon)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
