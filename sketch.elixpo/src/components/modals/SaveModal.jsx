"use client"

import { useState, useEffect, useCallback } from 'react'
import useUIStore from '@/store/useUIStore'
import useCollabStore from '@/store/useCollabStore'
import { getSessionID } from '@/hooks/useSessionID'
import { generateKey } from '@/utils/encryption'

// ── Export helpers ────────────────────────────────────────────

function getCleanSVG() {
  const svgEl = window.svg
  if (!svgEl) return null
  const clone = svgEl.cloneNode(true)
  clone.querySelectorAll(
    '[data-selection], .selection-handle, .resize-handle, .rotation-handle, .anchor, .rotate-anchor'
  ).forEach((el) => el.remove())
  return clone
}

function renderToCanvas(clone, scale, bgColor) {
  return new Promise((resolve) => {
    const svgData = new XMLSerializer().serializeToString(clone)
    const vb = window.svg.viewBox.baseVal
    const canvas = document.createElement('canvas')
    canvas.width = vb.width * scale
    canvas.height = vb.height * scale
    const ctx = canvas.getContext('2d')
    ctx.scale(scale, scale)

    const img = new Image()
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    img.onload = () => {
      if (bgColor) {
        ctx.fillStyle = bgColor
        ctx.fillRect(0, 0, vb.width, vb.height)
      }
      ctx.drawImage(img, 0, 0, vb.width, vb.height)
      URL.revokeObjectURL(url)
      resolve(canvas)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}

// ── Component ────────────────────────────────────────────────

export default function SaveModal() {
  const saveModalOpen = useUIStore((s) => s.saveModalOpen)
  const toggleSaveModal = useUIStore((s) => s.toggleSaveModal)
  const workspaceName = useUIStore((s) => s.workspaceName)
  const setWorkspaceName = useUIStore((s) => s.setWorkspaceName)

  // Live collab state
  const [collabLink, setCollabLink] = useState('')
  const [collabCopied, setCollabCopied] = useState(false)
  const [startingCollab, setStartingCollab] = useState(false)
  const [collabError, setCollabError] = useState('')
  const collabConnected = useCollabStore((s) => s.connected)

  // Export state
  const [bgMode, setBgMode] = useState('dark')
  const [exportScale, setExportScale] = useState(2)
  const [previewUrl, setPreviewUrl] = useState(null)

  const getBgColor = useCallback(() => {
    if (bgMode === 'dark') return '#121212'
    if (bgMode === 'light') return '#ffffff'
    return null
  }, [bgMode])

  // Generate preview when modal opens or bg changes
  useEffect(() => {
    if (!saveModalOpen) return
    let cancelled = false
    const generate = async () => {
      const clone = getCleanSVG()
      if (!clone) return
      const canvas = await renderToCanvas(clone, 1, getBgColor())
      if (cancelled || !canvas) return
      setPreviewUrl(canvas.toDataURL('image/png'))
    }
    generate()
    return () => { cancelled = true }
  }, [saveModalOpen, bgMode, getBgColor])

  if (!saveModalOpen) return null

  // ── Collab handlers ──

  const handleStartCollab = async () => {
    setStartingCollab(true)
    setCollabError('')

    try {
      const sessionId = getSessionID()

      let key = useUIStore.getState().sessionEncryptionKey
      if (!key) {
        key = useUIStore.getState().loadEncryptionKeyForSession(sessionId)
      }
      if (!key) {
        key = await generateKey()
      }
      useUIStore.getState().setSessionEncryptionKey(key, sessionId)
      const roomId = sessionId
      const origin = window.location.origin
      const link = `${origin}/room/${roomId}#key=${key}`

      setCollabLink(link)
      setCollabCopied(false)
    } catch (err) {
      console.error('[SaveModal] Failed to start collab:', err)
      setCollabError(err.message || 'Failed to start collaboration')
    } finally {
      setStartingCollab(false)
    }
  }

  const handleCopyCollabLink = () => {
    if (!collabLink) return
    navigator.clipboard.writeText(collabLink).then(() => {
      setCollabCopied(true)
      setTimeout(() => setCollabCopied(false), 2000)
    })
  }

  const handleEndSession = () => {
    const ws = useCollabStore.getState().ws
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close()
    }
    useCollabStore.getState().reset()
    setCollabLink('')
    setCollabCopied(false)
  }

  // ── Export handlers ──

  const fileName = (workspaceName || 'lixsketch-export').replace(/[^a-zA-Z0-9_-]/g, '_')

  const handleExportLixjson = () => {
    const serializer = window.__sceneSerializer
    if (!serializer) return
    serializer.download(workspaceName || 'Untitled')
    toggleSaveModal()
  }

  const handleExportPNG = async () => {
    const clone = getCleanSVG()
    if (!clone) return
    const canvas = await renderToCanvas(clone, exportScale, getBgColor())
    if (!canvas) return

    canvas.toBlob((blob) => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `${fileName}-${exportScale}x.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }, 'image/png')
    toggleSaveModal()
  }

  const handleExportSVG = () => {
    const clone = getCleanSVG()
    if (!clone) return

    const bg = getBgColor()
    if (bg) {
      const ns = 'http://www.w3.org/2000/svg'
      const rect = document.createElementNS(ns, 'rect')
      const vb = window.svg.viewBox.baseVal
      rect.setAttribute('width', vb.width)
      rect.setAttribute('height', vb.height)
      rect.setAttribute('fill', bg)
      clone.insertBefore(rect, clone.firstChild)
    }

    const svgData = new XMLSerializer().serializeToString(clone)
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${fileName}.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toggleSaveModal()
  }

  const handleExportPDF = () => {
    const serializer = window.__sceneSerializer
    if (!serializer) return
    serializer.exportPDF()
    toggleSaveModal()
  }

  // ── Render ──

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center font-[lixFont]"
      onClick={toggleSaveModal}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative bg-surface-card border border-border-light rounded-2xl w-[420px] mx-4 max-h-[90vh] overflow-y-auto docs-scroll"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3">
          <h2 className="text-text-primary text-base font-medium">Save & Export</h2>
          <button
            onClick={toggleSaveModal}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover cursor-pointer transition-all duration-200"
          >
            <i className="bx bx-x text-xl" />
          </button>
        </div>

        <div className="px-6 pb-6 flex flex-col gap-4">
          {/* Workspace Name */}
          <div>
            <label className="text-text-dim text-xs uppercase tracking-wider mb-1.5 block">Workspace Name</label>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="e.g. cosmic-penguin"
              className="w-full bg-surface text-text-primary text-sm border border-border-light rounded-lg px-3 py-2 outline-none focus:border-accent-blue transition-all duration-200"
              spellCheck={false}
            />
          </div>

          {/* ── Export As ── */}
          <div className="p-3.5 rounded-xl border border-border-light bg-surface/50">
            <div className="flex items-center gap-2 mb-3">
              <i className="bx bx-export text-lg text-accent-blue" />
              <span className="text-text-primary text-sm font-medium">Export As</span>
            </div>

            {/* Preview */}
            <div
              className="w-full h-[140px] rounded-lg overflow-hidden border border-border-light mb-3 flex items-center justify-center"
              style={{
                background: bgMode === 'none'
                  ? 'repeating-conic-gradient(#2a2a35 0% 25%, #1e1e28 0% 50%) 0 0 / 16px 16px'
                  : getBgColor(),
              }}
            >
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
              ) : (
                <span className="text-text-dim text-xs">Generating preview...</span>
              )}
            </div>

            {/* Background toggle */}
            <div className="flex items-center gap-3 mb-3">
              <p className="text-text-dim text-[10px] uppercase tracking-wider shrink-0">BG</p>
              <div className="flex items-center gap-1 flex-1">
                {[
                  { value: 'dark', label: 'Dark', icon: 'bxs-moon' },
                  { value: 'light', label: 'Light', icon: 'bxs-sun' },
                  { value: 'none', label: 'None', icon: 'bx-hide' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setBgMode(opt.value)}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] cursor-pointer transition-all duration-200 ${
                      bgMode === opt.value
                        ? 'bg-accent-blue/20 text-accent-blue'
                        : 'text-text-muted hover:bg-surface-hover'
                    }`}
                  >
                    <i className={`bx ${opt.icon} text-xs`} />
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scale selector (for PNG) */}
            <div className="flex items-center gap-3 mb-3">
              <p className="text-text-dim text-[10px] uppercase tracking-wider shrink-0">Scale</p>
              <div className="flex items-center gap-1 flex-1">
                {[1, 2, 3].map((s) => (
                  <button
                    key={s}
                    onClick={() => setExportScale(s)}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] cursor-pointer transition-all duration-200 ${
                      exportScale === s
                        ? 'bg-accent-blue/20 text-accent-blue'
                        : 'text-text-muted hover:bg-surface-hover'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* Format buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportPNG}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-accent-blue hover:bg-accent-blue-hover text-text-primary text-xs cursor-pointer transition-all duration-200"
              >
                <i className="bx bx-image text-sm" />
                PNG Image
              </button>
              <button
                onClick={handleExportSVG}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-surface hover:bg-surface-hover border border-border-light text-text-secondary text-xs cursor-pointer transition-all duration-200"
              >
                <i className="bx bx-code-alt text-sm" />
                SVG Vector
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-surface hover:bg-surface-hover border border-border-light text-text-secondary text-xs cursor-pointer transition-all duration-200"
              >
                <i className="bx bxs-file-pdf text-sm" />
                PDF Document
              </button>
              <button
                onClick={handleExportLixjson}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-surface hover:bg-surface-hover border border-border-light text-text-secondary text-xs cursor-pointer transition-all duration-200"
              >
                <i className="bx bx-braces text-sm" />
                .lixjson Scene
              </button>
            </div>
          </div>

          {/* ── Live Collaborate ── */}
          <div className="p-3.5 rounded-xl border border-border-light bg-surface/50">
            <div className="flex items-center gap-2 mb-2.5">
              <i className="bx bx-group text-lg text-accent-blue" />
              <div className="flex-1">
                <span className="text-text-primary text-sm font-medium">Live Collaborate</span>
                <p className="text-text-dim text-[10px] leading-relaxed">Real-time E2E encrypted editing with up to 10 people</p>
              </div>
              <span className="flex items-center gap-1 text-[10px] text-green-400/80">
                <i className="bx bxs-lock-alt text-xs" />
                Encrypted
              </span>
            </div>

            {collabLink || collabConnected ? (
              <>
                {collabLink && (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={collabLink}
                      readOnly
                      className="flex-1 bg-surface text-text-secondary text-xs border border-border-light rounded-lg px-2.5 py-2 outline-none truncate"
                      onClick={(e) => e.target.select()}
                    />
                    <button
                      onClick={handleCopyCollabLink}
                      className={`shrink-0 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200 ${
                        collabCopied
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-accent-blue hover:bg-accent-blue-hover text-text-primary'
                      }`}
                    >
                      {collabCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                )}
                {collabConnected && (
                  <div className="flex items-center gap-1.5 mt-2 text-[10px] text-green-400/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    Live — connected to room
                  </div>
                )}
                <button
                  onClick={handleEndSession}
                  className="w-full mt-2 py-2 rounded-lg border border-red-500/30 text-red-400 text-xs cursor-pointer hover:bg-red-500/10 transition-all duration-200 flex items-center justify-center gap-1.5"
                >
                  <i className="bx bx-power-off text-sm" />
                  End Session
                </button>
              </>
            ) : (
              <button
                onClick={handleStartCollab}
                disabled={startingCollab}
                className="w-full py-2.5 rounded-lg bg-accent-blue hover:bg-accent-blue-hover text-text-primary text-sm cursor-pointer transition-all duration-200 disabled:opacity-50"
              >
                {startingCollab ? 'Starting room...' : 'Start Live Session'}
              </button>
            )}

            {collabError && (
              <p className="text-red-400 text-[10px] mt-2">{collabError}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
