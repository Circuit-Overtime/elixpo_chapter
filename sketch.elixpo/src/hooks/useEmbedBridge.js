"use client"

import { useEffect, useRef } from 'react'
import useUIStore from '@/store/useUIStore'
import { compressImage, installEngineShortcuts } from '@elixpo/lixsketch'

// Forward declarations resolved at module bottom.
let _installImageUpload = null
let _resolveImageUpload = null

// PostMessage protocol used by /embed/canvas to talk to the host app
// (e.g. blogs.elixpo). The host owns persistence and auth; the iframe
// just renders the canvas and ships scene snapshots back.
//
// Parent → child:
//   { type: 'lixsketch:init', subpageId, content, metadata, theme }
//   { type: 'lixsketch:request-save' }
//
// Child → parent:
//   { type: 'lixsketch:ready' }
//   { type: 'lixsketch:save', content, metadata, sizeBytes }
//   { type: 'lixsketch:exit' }
//   { type: 'lixsketch:dirty' }
//
// Origin allowlist is configured via NEXT_PUBLIC_LIXSKETCH_EMBED_ORIGINS
// (comma-separated). Falls back to '*' in dev only.
const ALLOWED_ORIGINS = (process.env.NEXT_PUBLIC_LIXSKETCH_EMBED_ORIGINS || '')
  .split(',').map((s) => s.trim()).filter(Boolean)

function isAllowedOrigin(origin) {
  if (ALLOWED_ORIGINS.length === 0) return true // dev fallback
  return ALLOWED_ORIGINS.includes(origin)
}

const SAVE_DEBOUNCE_MS = 1500

export default function useEmbedBridge() {
  const initializedRef = useRef(false)
  const subpageIdRef = useRef(null)
  const parentOriginRef = useRef('*')
  const lastSavedJsonRef = useRef('')

  // Tell the parent we're alive; parent will reply with 'init' carrying the
  // scene content. Done after engine init completes (window.__sceneSerializer
  // is set by SketchEngine.init).
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.parent === window) return // not actually iframed

    let waitTimer = null
    function announceReady() {
      const serializer = window.__sceneSerializer
      if (!serializer) {
        waitTimer = setTimeout(announceReady, 200)
        return
      }
      window.parent.postMessage({ type: 'lixsketch:ready' }, parentOriginRef.current)
    }
    announceReady()
    return () => { if (waitTimer) clearTimeout(waitTimer) }
  }, [])

  // Listen for parent messages
  useEffect(() => {
    if (typeof window === 'undefined') return

    function handleMessage(e) {
      if (!isAllowedOrigin(e.origin)) return
      const msg = e.data
      if (!msg || typeof msg !== 'object') return

      if (msg.type === 'lixsketch:init') {
        parentOriginRef.current = e.origin
        subpageIdRef.current = msg.subpageId || null
        window.__embedSubpageId = subpageIdRef.current
        // Some product code (modals, getSessionID()) reaches for window.__sessionID;
        // give it a stable value derived from the host subpage id so those paths
        // don't blow up. Cloud-sync code paths are still inert because no
        // useAutoSave hook is mounted in the embed page.
        window.__sessionID = subpageIdRef.current

        // Apply scene if the parent supplied one
        const serializer = window.__sceneSerializer
        if (serializer && msg.content) {
          try {
            const sceneData = typeof msg.content === 'string' ? JSON.parse(msg.content) : msg.content
            if (sceneData && sceneData.format === 'lixsketch') {
              serializer.load(sceneData)
              lastSavedJsonRef.current = JSON.stringify(sceneData)
            }
          } catch (err) {
            console.warn('[embedBridge] init load failed:', err)
          }
        }

        if (msg.theme === 'light' || msg.theme === 'dark') {
          // Hook up if/when sketch.elixpo gains a runtime theme switch.
        }

        initializedRef.current = true

        // Re-route image uploads through the host once we know the parent origin.
        _installImageUpload?.()

        // Force select tool so user can interact with imported shapes
        if (window.__sketchEngine?.setActiveTool) {
          window.__sketchEngine.setActiveTool('select')
        }
      }

      if (msg.type === 'lixsketch:request-save') {
        flushSave({ silent: false })
      }

      if (msg.type === 'lixsketch:upload-image-result') {
        _resolveImageUpload?.(msg)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Watch for scene changes (MutationObserver on the SVG + mouseup), debounce
  // and post a save up. Mirrors useAutoSave's strategy.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (window.parent === window) return

    let debounce = null
    let observer = null
    let svgRef = null

    function flush() {
      const serializer = window.__sceneSerializer
      if (!serializer || !initializedRef.current) return
      try {
        const workspaceName = useUIStore.getState().workspaceName || 'Untitled'
        const sceneData = serializer.save(workspaceName)
        const json = JSON.stringify(sceneData)
        if (json === lastSavedJsonRef.current) return
        lastSavedJsonRef.current = json

        const metadata = {
          shapeCount: Array.isArray(sceneData.shapes) ? sceneData.shapes.length : 0,
          viewport: sceneData.viewport || null,
          zoom: sceneData.zoom || 1,
          sizeBytes: json.length,
          savedAt: Date.now(),
        }

        window.parent.postMessage({
          type: 'lixsketch:save',
          subpageId: subpageIdRef.current,
          content: sceneData,
          metadata,
        }, parentOriginRef.current)
      } catch (err) {
        console.warn('[embedBridge] save failed:', err)
      }
    }

    // Expose for the request-save message handler above
    flushSave = flush

    function debounced() {
      window.parent.postMessage({ type: 'lixsketch:dirty' }, parentOriginRef.current)
      clearTimeout(debounce)
      debounce = setTimeout(flush, SAVE_DEBOUNCE_MS)
    }

    function attach() {
      const svg = window.svg
      if (!svg) {
        setTimeout(attach, 300)
        return
      }
      svgRef = svg
      observer = new MutationObserver(debounced)
      observer.observe(svg, { childList: true, subtree: true, attributes: true })
      svg.addEventListener('mouseup', debounced)
    }
    attach()

    function handleUnload() { flush() }
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      clearTimeout(debounce)
      if (observer) observer.disconnect()
      if (svgRef) svgRef.removeEventListener('mouseup', debounced)
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, [])
}

// Module-scoped pointer set inside the effect above so the message handler
// can trigger a flush without a re-subscribe.
let flushSave = () => {}

export function postExitToHost() {
  if (typeof window === 'undefined') return
  if (window.parent === window) return
  window.parent.postMessage({ type: 'lixsketch:exit' }, '*')
}

// ── Image upload bridge ───────────────────────────────────────────────
// In standalone mode the engine uploads images to Cloudinary via the
// sketch.elixpo worker (see imageTool.js → uploadImageToCloudinary).
// In embed mode we re-route uploads through the host so the resulting
// asset is tracked against the parent blog's media budget. The bridge
// installs a window-level override that sends the image's data URL up,
// awaits a {url} reply, then writes it back onto the SVG element.
const _pendingUploads = new Map()
let _uploadSeq = 0

export function installEmbedImageUpload() {
  if (typeof window === 'undefined') return
  if (window.parent === window) return

  window.uploadImageToCloudinary = async function embedUpload(imageShape) {
    const href = imageShape?.element?.getAttribute('href') || ''
    if (!href.startsWith('data:')) return // already a remote URL

    imageShape.uploadStatus = 'uploading'
    imageShape.uploadAbortController = new AbortController()
    const signal = imageShape.uploadAbortController.signal
    imageShape.showUploadIndicator?.()

    const requestId = `up_${Date.now().toString(36)}_${++_uploadSeq}`

    try {
      // Compress in the iframe so we don't ship 5MB base64 across postMessage.
      // The host re-encodes to a Blob on receipt; Cloudinary applies its own
      // pipeline on top.
      let payloadDataUrl = href
      try {
        const compressed = await compressImage(href)
        if (compressed?.dataUrl) payloadDataUrl = compressed.dataUrl
      } catch (err) {
        console.warn('[embedUpload] compression failed, sending raw:', err)
      }
      if (signal.aborted) return

      const result = await new Promise((resolve, reject) => {
        _pendingUploads.set(requestId, { resolve, reject })
        signal.addEventListener('abort', () => {
          _pendingUploads.delete(requestId)
          reject(new Error('aborted'))
        })
        window.parent.postMessage({
          type: 'lixsketch:upload-image',
          requestId,
          dataUrl: payloadDataUrl,
          filename: `canvas_img_${Date.now()}`,
        }, '*')
      })

      if (signal.aborted) return
      if (!result?.url) throw new Error(result?.error || 'Upload failed')

      imageShape.element.setAttribute('href', result.url)
      imageShape.element.setAttribute('data-href', result.url)
      if (result.publicId) imageShape.element.setAttribute('data-cloudinary-id', result.publicId)
      if (typeof result.sizeBytes === 'number') {
        const oldSize = imageShape.element.__fileSize || 0
        imageShape.element.__fileSize = result.sizeBytes
        window.__roomImageBytesUsed = Math.max(0, (window.__roomImageBytesUsed || 0) - oldSize + result.sizeBytes)
      }
      imageShape.uploadStatus = 'done'
    } catch (err) {
      if (!signal.aborted) {
        console.warn('[embedUpload] failed:', err)
        imageShape.uploadStatus = 'failed'
      }
    } finally {
      imageShape.removeUploadIndicator?.()
      imageShape.uploadAbortController = null
    }
  }
}

// Resolves the matching upload promise when the host posts back the result.
export function _resolveEmbedUpload(msg) {
  if (!msg || !msg.requestId) return
  const entry = _pendingUploads.get(msg.requestId)
  if (!entry) return
  _pendingUploads.delete(msg.requestId)
  entry.resolve(msg)
}

// Wire the forward-declared hooks now that the actual implementations exist.
_installImageUpload = installEmbedImageUpload
_resolveImageUpload = _resolveEmbedUpload
