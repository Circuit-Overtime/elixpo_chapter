"use client"

import { useEffect, useRef } from 'react'
import useCollabStore from '@/store/useCollabStore'
import useUIStore from '@/store/useUIStore'
import { WORKER_URL } from '@/store/useAuthStore'
import useAuthStore from '@/store/useAuthStore'
import { getSessionID } from '@/hooks/useSessionID'
import { encrypt, generateKey } from '@/utils/encryption'
import { useProfileStore } from '@/hooks/useGuestProfile'

const LOCAL_SAVE_KEY_PREFIX = 'lixsketch-autosave'
const LOCAL_SAVE_META_KEY_PREFIX = 'lixsketch-autosave-meta'

function getLocalSaveKey() {
  const sessionId = window.__sessionID
  return sessionId ? `${LOCAL_SAVE_KEY_PREFIX}-${sessionId}` : LOCAL_SAVE_KEY_PREFIX
}
function getLocalSaveMetaKey() {
  const sessionId = window.__sessionID
  return sessionId ? `${LOCAL_SAVE_META_KEY_PREFIX}-${sessionId}` : LOCAL_SAVE_META_KEY_PREFIX
}

// ── Intervals ──
const LOCAL_BUFFER_INTERVAL = 3_000    // localStorage buffer: every 3 seconds
const CLOUD_SYNC_INTERVAL = 5 * 60_000 // DB sync: every 5 minutes

// ── Rate limiting: max 2 DB saves per minute ──
const RATE_LIMIT_WINDOW = 60_000
const RATE_LIMIT_MAX = 2
const _dbSaveTimestamps = []

function isRateLimited() {
  const now = Date.now()
  // Remove timestamps older than the window
  while (_dbSaveTimestamps.length > 0 && now - _dbSaveTimestamps[0] > RATE_LIMIT_WINDOW) {
    _dbSaveTimestamps.shift()
  }
  return _dbSaveTimestamps.length >= RATE_LIMIT_MAX
}

function recordDbSave() {
  _dbSaveTimestamps.push(Date.now())
}

// ── Save to localStorage (the buffer) ──
function saveToLocalStorage() {
  const serializer = window.__sceneSerializer
  const shapes = window.shapes
  if (!serializer || !Array.isArray(shapes)) return false

  try {
    const workspaceName = useUIStore.getState().workspaceName || 'Untitled'
    const sceneData = serializer.save(workspaceName)
    localStorage.setItem(getLocalSaveKey(), JSON.stringify(sceneData))
    localStorage.setItem(getLocalSaveMetaKey(), JSON.stringify({
      workspaceName,
      savedAt: Date.now(),
      shapeCount: shapes.length,
    }))

    // Signal the UI that a local save just happened
    if (typeof window.__onLocalSave === 'function') window.__onLocalSave()
    const status = useUIStore.getState().saveStatus
    if (status !== 'local' && status !== 'cloud') {
      useUIStore.getState().setSaveStatus('local')
    }
    return true
  } catch (err) {
    console.warn('[AutoSave] Local buffer save failed:', err)
    return false
  }
}

// ── Show quick-save toast ──
function showSaveToast() {
  const toast = document.getElementById('save-toast')
  if (!toast) return
  toast.classList.remove('hidden')
  clearTimeout(toast._hideTimer)
  toast._hideTimer = setTimeout(() => toast.classList.add('hidden'), 2000)
}

// ── Save to DB (from localStorage buffer) ──
async function saveToDb() {
  if (!WORKER_URL) return false

  if (isRateLimited()) {
    console.log('[AutoSave] Rate limited — skipping DB save')
    return false
  }

  const serializer = window.__sceneSerializer
  if (!serializer) return false

  try {
    const authState = useAuthStore.getState()
    const workspaceName = useUIStore.getState().workspaceName || 'Untitled'

    // Read from localStorage buffer (single source of truth)
    const localData = localStorage.getItem(getLocalSaveKey())
    let sceneJSON
    if (localData) {
      sceneJSON = localData // already JSON string
    } else {
      // Fallback: serialize current state
      const sceneData = serializer.save(workspaceName)
      sceneJSON = JSON.stringify(sceneData)
    }

    const key = await generateKey()
    const encryptedData = await encrypt(sceneJSON, key)

    const sessionId = getSessionID()
    const createdBy = authState.isAuthenticated
      ? (authState.user?.id || 'anonymous')
      : (useProfileStore.getState().profile?.id || localStorage.getItem('lixsketch-guest-session') || 'anonymous')

    const res = await fetch(`${WORKER_URL}/api/scenes/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        encryptedData,
        permission: 'edit',
        workspaceName,
        createdBy,
        ownerType: authState.isAuthenticated ? 'user' : 'guest',
      }),
    })

    if (res.ok) {
      recordDbSave()
      useUIStore.getState().setSaveStatus('cloud')
      // Store encryption key for this session
      useUIStore.getState().setSessionEncryptionKey?.(key, sessionId)
      console.log('[AutoSave] Synced to cloud')
      return true
    } else if (res.status === 429) {
      const data = await res.json().catch(() => ({}))
      console.warn(`[AutoSave] Workspace limit reached (${data.currentCount}/${data.maxWorkspaces}). ${data.message || ''}`)
      useUIStore.getState().setSaveStatus('local')
      return false
    } else {
      console.warn('[AutoSave] DB save failed:', res.status)
      useUIStore.getState().setSaveStatus('failed')
      return false
    }
  } catch (err) {
    console.warn('[AutoSave] DB save failed:', err)
    useUIStore.getState().setSaveStatus('failed')
    return false
  }
}

/**
 * Trigger an immediate cloud sync from anywhere (e.g. Ctrl+S).
 * Saves to localStorage first, then pushes to DB.
 */
export async function triggerCloudSync() {
  saveToLocalStorage()
  const ok = await saveToDb()
  if (ok) showSaveToast()
  return ok
}

/**
 * Auto-saves the scene using localStorage as a constant buffer.
 *
 * Flow:
 *   1. Page load → pull from DB → store in localStorage → render
 *   2. Continuous: localStorage updates every 3s (+ on every SVG mutation)
 *   3. DB sync: every 5 min, on back/close/canvas-switch
 *   4. Rate limit: max 2 DB saves per minute
 *   5. Status: green=cloud, yellow=local buffer, red=DB failed
 *   6. Toast on successful DB save
 */
export default function useAutoSave() {
  const roomId = useCollabStore((s) => s.roomId)
  const connected = useCollabStore((s) => s.connected)
  const hasRestored = useRef(false)

  const isInRoom = !!(roomId && connected)

  // ──────────────────────────────────────────────────────
  // 1. RESTORE: DB → localStorage → render
  // ──────────────────────────────────────────────────────
  useEffect(() => {
    if (hasRestored.current) return
    if (isInRoom) return

    const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    if (!isLocalhost) {
      useUIStore.getState().setCanvasLoading(true, 'Restoring canvas...')
    }

    const tryRestore = async () => {
      const serializer = window.__sceneSerializer
      const shapes = window.shapes

      if (!serializer || !window.svg) {
        setTimeout(tryRestore, 500)
        return
      }

      // If shapes already exist (e.g. from a shared link load), skip
      if (shapes && shapes.length > 0) {
        hasRestored.current = true
        useUIStore.getState().setCanvasLoading(false)
        return
      }

      if (window.__isNewWorkspace) {
        hasRestored.current = true
        console.log('[AutoSave] New workspace — starting with blank canvas')
        useUIStore.getState().setCanvasLoading(false)
        return
      }

      // Clean up other sessions' localStorage entries
      const currentKey = getLocalSaveKey()
      const currentMetaKey = getLocalSaveMetaKey()
      try {
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith(LOCAL_SAVE_KEY_PREFIX) && key !== currentKey && key !== currentMetaKey && key !== 'lixsketch-autosave' && key !== 'lixsketch-autosave-meta') {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k))
      } catch {}

      let restoredFromLocal = false
      let restoredFromCloud = false

      // ── Try cloud first (authoritative source) ──
      if (WORKER_URL) {
        try {
          useUIStore.getState().setCanvasLoading(true, 'Fetching from cloud...')
          const sessionId = getSessionID()
          const res = await fetch(`${WORKER_URL}/api/scenes/load?sessionId=${sessionId}`)
          if (res.ok) {
            const data = await res.json()
            if (data.encryptedData) {
              const encKey = useUIStore.getState().loadEncryptionKeyForSession(sessionId)
              if (encKey) {
                try {
                  const { decrypt } = await import('@/utils/encryption')
                  const decrypted = await decrypt(data.encryptedData, encKey)
                  const sceneData = JSON.parse(decrypted)
                  if (sceneData && sceneData.format === 'lixsketch' && sceneData.shapes?.length > 0) {
                    // Store in localStorage buffer first
                    localStorage.setItem(currentKey, JSON.stringify(sceneData))
                    // Then render
                    serializer.load(sceneData)
                    restoredFromCloud = true
                    console.log(`[AutoSave] Restored ${sceneData.shapes.length} shapes from cloud`)
                    useUIStore.getState().setSaveStatus('cloud')
                  }
                } catch (decErr) {
                  console.warn('[AutoSave] Failed to decrypt cloud data:', decErr)
                }
              }
            }
            if (data.workspaceName) {
              useUIStore.getState().setWorkspaceName(data.workspaceName)
            }
          }
        } catch (err) {
          console.warn('[AutoSave] Cloud fetch failed:', err)
        }
      }

      // ── Fallback: restore from localStorage ──
      if (!restoredFromCloud) {
        const saved = localStorage.getItem(currentKey) || localStorage.getItem('lixsketch-autosave')
        if (saved) {
          try {
            const sceneData = JSON.parse(saved)
            if (sceneData && sceneData.format === 'lixsketch' && sceneData.shapes?.length > 0) {
              serializer.load(sceneData)
              restoredFromLocal = true
              console.log(`[AutoSave] Restored ${sceneData.shapes.length} shapes from local cache`)

              const meta = localStorage.getItem(currentMetaKey) || localStorage.getItem('lixsketch-autosave-meta')
              if (meta) {
                try {
                  const { workspaceName } = JSON.parse(meta)
                  if (workspaceName) useUIStore.getState().setWorkspaceName(workspaceName)
                } catch {}
              }
              useUIStore.getState().setSaveStatus('local')
            }
          } catch (err) {
            console.warn('[AutoSave] Failed to restore from local:', err)
          }
        }
      }

      // Ensure shapes are interactive after restore
      if (restoredFromCloud || restoredFromLocal) {
        // Force selection tool active so shapes are clickable/draggable
        if (window.__sketchEngine && typeof window.__sketchEngine.setActiveTool === 'function') {
          window.__sketchEngine.setActiveTool('select')
        } else {
          window.isSelectionToolActive = true
        }
        // Sync Zustand store too so toolbar reflects correct tool
        try {
          const store = window.__sketchStoreApi
          if (store && store.setActiveTool) store.setActiveTool('select')
        } catch {}
      }

      // If restored from local, do a background cloud sync
      if (restoredFromLocal && !restoredFromCloud) {
        setTimeout(() => saveToDb(), 3000)
      }

      hasRestored.current = true
      useUIStore.getState().setCanvasLoading(false)
    }

    setTimeout(tryRestore, 800)
  }, [isInRoom])

  // ──────────────────────────────────────────────────────
  // 2. AUTO-SAVE ON EVERY CANVAS CHANGE (debounced)
  //    MutationObserver catches all DOM changes; mouseup catches
  //    the end of draw/move/resize operations.
  // ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isInRoom) return

    let debounceTimer = null
    const debouncedSave = () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        saveToLocalStorage()
        // Mark dirty relative to cloud
        const status = useUIStore.getState().saveStatus
        if (status === 'cloud') {
          useUIStore.getState().setSaveStatus('local')
        }
      }, 400) // 400ms debounce — fast enough to feel instant, avoids thrashing
    }

    const waitForSvg = () => {
      const svg = window.svg
      if (!svg) { setTimeout(waitForSvg, 500); return }

      const observer = new MutationObserver(debouncedSave)
      observer.observe(svg, { childList: true, subtree: true, attributes: true })
      svg.addEventListener('mouseup', debouncedSave)

      observerRef.current = { observer, svg }
    }

    const observerRef = { current: null }
    waitForSvg()

    return () => {
      clearTimeout(debounceTimer)
      if (observerRef.current) {
        observerRef.current.observer.disconnect()
        observerRef.current.svg.removeEventListener('mouseup', debouncedSave)
      }
    }
  }, [isInRoom])

  // ──────────────────────────────────────────────────────
  // 3. LOCALSTORAGE BUFFER: constant updates (every 3s + beforeunload)
  //    Includes zoom level and canvas pan state
  // ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isInRoom) return

    const interval = setInterval(saveToLocalStorage, LOCAL_BUFFER_INTERVAL)

    const handleUnload = () => saveToLocalStorage()
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', handleUnload)
      saveToLocalStorage() // final save on cleanup
    }
  }, [isInRoom])

  // ──────────────────────────────────────────────────────
  // 4. DB SYNC: every 5 min + back button + page close + canvas switch
  //    Rate limited to 2 saves per minute
  // ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isInRoom) return
    if (!WORKER_URL) return

    // Periodic sync every 5 minutes
    const interval = setInterval(() => {
      const shapes = window.shapes
      if (!shapes || shapes.length === 0) return
      saveToDb()
    }, CLOUD_SYNC_INTERVAL)

    // Save to DB on page close / back button / navigation away
    const handleBeforeUnload = () => {
      saveToLocalStorage()
      // Use sendBeacon for reliable save on page close
      const serializer = window.__sceneSerializer
      if (!serializer) return

      try {
        const localData = localStorage.getItem(getLocalSaveKey())
        if (localData) {
          // Best-effort beacon (can't encrypt here synchronously, so just save to localStorage)
          // The next load will push localStorage → DB
          console.log('[AutoSave] Page closing — localStorage buffer is up to date')
        }
      } catch {}
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    // Save on back/forward navigation (popstate)
    const handlePopState = () => {
      saveToLocalStorage()
      saveToDb()
    }
    window.addEventListener('popstate', handlePopState)

    // Save on visibility change (user switches tab/minimizes)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveToLocalStorage()
        saveToDb()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('popstate', handlePopState)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isInRoom])

  // ──────────────────────────────────────────────────────
  // 5. NEW WORKSPACE: save immediately on creation
  // ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isInRoom) return
    if (!WORKER_URL) return
    if (!window.__isNewWorkspace) return

    const saveNewWorkspace = async () => {
      const serializer = window.__sceneSerializer
      if (!serializer || !window.svg) {
        setTimeout(saveNewWorkspace, 1000)
        return
      }

      try {
        const authState = useAuthStore.getState()
        const workspaceName = useUIStore.getState().workspaceName || 'Untitled'
        const sceneData = serializer.save(workspaceName)
        const sceneJSON = JSON.stringify(sceneData)

        const key = await generateKey()
        const encryptedData = await encrypt(sceneJSON, key)

        const sessionId = getSessionID()
        const createdBy = authState.isAuthenticated
          ? (authState.user?.id || 'anonymous')
          : (useProfileStore.getState().profile?.id || localStorage.getItem('lixsketch-guest-session') || 'anonymous')

        const res = await fetch(`${WORKER_URL}/api/scenes/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            encryptedData,
            permission: 'edit',
            workspaceName,
            createdBy,
            ownerType: authState.isAuthenticated ? 'user' : 'guest',
          }),
        })

        if (res.ok) {
          useUIStore.getState().setSaveStatus('cloud')
          useUIStore.getState().setSessionEncryptionKey?.(key, sessionId)
          console.log('[AutoSave] New workspace saved to cloud')
        } else if (res.status === 429) {
          const data = await res.json().catch(() => ({}))
          console.warn(`[AutoSave] Workspace limit reached (${data.currentCount}/${data.maxWorkspaces}). ${data.message || ''}`)
        }
      } catch (err) {
        console.warn('[AutoSave] Failed to save new workspace:', err)
      }

      window.__isNewWorkspace = false
    }

    setTimeout(saveNewWorkspace, 2000)
  }, [isInRoom])
}
