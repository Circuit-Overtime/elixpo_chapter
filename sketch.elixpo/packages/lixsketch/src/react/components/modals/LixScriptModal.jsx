"use client"

import { useCallback, useEffect, useRef, useState } from 'react'
import useUIStore from '../../store/useUIStore'

const SAMPLE = `# LixScript — paste shapes / arrows in a simple DSL.
# Hit Cmd/Ctrl+Enter to render onto the canvas.

rect A "Idea" 100 100 220 90
rect B "Plan"  400 100 220 90
rect C "Ship"  700 100 220 90

arrow A -> B
arrow B -> C
`

/**
 * LixScript modal — takes a script the user types and parses it directly
 * into engine shapes via @elixpo/lixsketch's LixScriptParser. No AI
 * inference, no worker round-trip. Strictly client-side parsing.
 */
export default function LixScriptModal() {
  const open = useUIStore((s) => s.aiModalOpen)
  const toggle = useUIStore((s) => s.toggleAIModal)
  const [source, setSource] = useState(SAMPLE)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null) // { tone, message }
  const taRef = useRef(null)

  useEffect(() => {
    if (!open) return
    requestAnimationFrame(() => taRef.current?.focus())
    const onKey = (e) => {
      if (e.key === 'Escape') toggle()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, toggle])

  const render = useCallback(async () => {
    if (busy) return
    setBusy(true)
    setStatus(null)
    try {
      // Lazy-import the parser. Pulling it eagerly would bring the whole
      // shape graph into the entry chunk (see SceneSerializer comment
      // in LixSketchCanvas) and crash with "svg is not defined" before
      // engine.init() has wired the engine globals.
      const mod = await import('../../../core/LixScriptParser.js')
      const parsed = mod.parseLixScript(source)
      const resolved = mod.resolveShapeRefs ? mod.resolveShapeRefs(parsed) : parsed
      mod.renderLixScript(resolved)
      setStatus({ tone: 'success', message: `Rendered ${Array.isArray(resolved) ? resolved.length : '?'} elements.` })
      // Auto-close shortly after a successful render.
      setTimeout(() => { toggle() }, 700)
    } catch (err) {
      console.warn('[LixScriptModal] parse failed:', err)
      setStatus({ tone: 'error', message: err?.message || 'Parse failed.' })
    } finally {
      setBusy(false)
    }
  }, [source, busy, toggle])

  const handleKeyDown = useCallback((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      render()
    }
  }, [render])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-sm font-[lixFont]"
      onClick={toggle}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-[560px] max-w-[94vw] bg-surface border border-border-light rounded-2xl p-5 shadow-2xl flex flex-col gap-3"
      >
        <button
          onClick={toggle}
          className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors"
          title="Close (Esc)"
        >
          <i className="bx bx-x text-lg" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent-blue/10 border border-accent-blue/30 flex items-center justify-center">
            <i className="bx bx-code-alt text-accent-blue" />
          </div>
          <div className="flex-1">
            <h2 className="text-text-primary text-sm font-medium">LixScript</h2>
            <p className="text-text-dim text-[11px]">Type shapes + arrows, render directly. No AI involved.</p>
          </div>
        </div>

        <textarea
          ref={taRef}
          value={source}
          onChange={(e) => setSource(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          className="w-full h-[260px] resize-none bg-surface-card border border-border-light rounded-lg px-3 py-2 text-[12px] text-text-primary font-[lixCode] outline-none focus:border-accent-blue/50"
        />

        <div className="flex items-center justify-between">
          {status ? (
            <span className={`text-[11px] ${status.tone === 'error' ? 'text-red-400' : 'text-green-400'}`}>
              {status.message}
            </span>
          ) : (
            <span className="text-text-dim text-[11px]">Cmd/Ctrl+Enter to render · Esc to close</span>
          )}
          <button
            onClick={render}
            disabled={busy}
            className="px-3 py-1.5 rounded-lg bg-accent-blue text-text-primary text-[12px] font-medium hover:bg-accent-blue-hover transition-colors disabled:opacity-50 disabled:pointer-events-none"
          >
            {busy ? 'Rendering…' : 'Render'}
          </button>
        </div>
      </div>
    </div>
  )
}
