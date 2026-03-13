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
const SAVE_INTERVAL = 10_000 // 10 seconds
const CLOUD_SYNC_INTERVAL = 10 * 60_000 // 10 minutes

/**
 * Trigger an immediate cloud sync from anywhere (e.g. Ctrl+S).
 * Saves to localStorage first, then pushes to cloud if authenticated.
 */
export async function triggerCloudSync() {
  if (!WORKER_URL) return

  const authState = useAuthStore.getState()
  if (!authState.isAuthenticated) return

  const serializer = window.__sceneSerializer
  const shapes = window.shapes
  if (!serializer || !shapes) return

  try {
    const workspaceName = useUIStore.getState().workspaceName || 'Untitled'
    const sceneData = serializer.save(workspaceName)
    const sceneJSON = JSON.stringify(sceneData)

    const key = await generateKey()
    const encryptedData = await encrypt(sceneJSON, key)

    const sessionId = getSessionID()
    const res = await fetch(`${WORKER_URL}/api/scenes/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        encryptedData,
        permission: 'edit',
        workspaceName,
        createdBy: authState.user?.id || useProfileStore.getState().profile?.id || 'anonymous',
        ownerType: 'user',
      }),
    })

    if (res.ok) {
      useUIStore.getState().setSaveStatus('cloud')
      console.log('[AutoSave] Cloud sync triggered via Ctrl+S')
    }
  } catch (err) {
    console.warn('[AutoSave] Cloud sync (Ctrl+S) failed:', err)
  }
}

/**
 * Auto-saves the scene to localStorage periodically when the user
 * is NOT in a shared collaboration room. Syncs to cloud every 10 minutes
 * if authenticated and WORKER_URL is available.
 *
 * On page load, restores the last auto-saved scene from localStorage.
 */
export default function useAutoSave() {
  const roomId = useCollabStore((s) => s.roomId)
  const connected = useCollabStore((s) => s.connected)
  const lastCloudSync = useRef(0)
  const engineReady = useRef(false)
  const hasRestored = useRef(false)

  // Check if we're in a collab room
  const isInRoom = !!(roomId && connected)

  // Restore scene from localStorage on first load (once engine is ready)
  useEffect(() => {
    if (hasRestored.current) return
    if (isInRoom) return // don't restore in collab rooms

    const tryRestore = () => {
      const serializer = window.__sceneSerializer
      const shapes = window.shapes

      if (!serializer || !window.svg) {
        // Engine not ready yet, retry
        setTimeout(tryRestore, 500)
        return
      }

      engineReady.current = true

      // Only restore if canvas is empty (no shapes yet)
      if (shapes && shapes.length > 0) {
        hasRestored.current = true
        return
      }

      // Skip restore for brand-new workspaces
      if (window.__isNewWorkspace) {
        hasRestored.current = true
        console.log('[AutoSave] New workspace — starting with blank canvas')
        return
      }

      // Try session-scoped key first, then fall back to legacy global key
      const saved = localStorage.getItem(getLocalSaveKey()) || localStorage.getItem('lixsketch-autosave')
      if (!saved) {
        hasRestored.current = true
        return
      }

      try {
        const sceneData = JSON.parse(saved)
        if (sceneData && sceneData.format === 'lixsketch' && sceneData.shapes?.length > 0) {
          serializer.load(sceneData)
          console.log(`[AutoSave] Restored ${sceneData.shapes.length} shapes from local save`)

          // Restore workspace name if available
          const meta = localStorage.getItem(getLocalSaveMetaKey())
          if (meta) {
            const { workspaceName } = JSON.parse(meta)
            if (workspaceName) {
              useUIStore.getState().setWorkspaceName(workspaceName)
            }
          }
          // Mark as locally saved, then sync to cloud
          useUIStore.getState().setSaveStatus('local')
          // Trigger cloud sync after restore
          setTimeout(() => triggerCloudSync(), 3000)
        }
      } catch (err) {
        console.warn('[AutoSave] Failed to restore:', err)
      }
      hasRestored.current = true
    }

    // Delay to let engine initialize
    setTimeout(tryRestore, 1000)
  }, [isInRoom])

  // Mark as 'local' immediately when the user changes the canvas after a cloud sync
  useEffect(() => {
    if (isInRoom) return

    const markDirty = () => {
      const status = useUIStore.getState().saveStatus
      if (status === 'cloud') {
        useUIStore.getState().setSaveStatus('local')
      }
    }

    // Use MutationObserver on SVG to detect shape additions/removals/edits
    const waitForSvg = () => {
      const svg = window.svg
      if (!svg) { setTimeout(waitForSvg, 500); return }

      const observer = new MutationObserver(markDirty)
      observer.observe(svg, { childList: true, subtree: true, attributes: true })

      // Also catch mouseup (end of drawing/dragging) for immediate feedback
      svg.addEventListener('mouseup', markDirty)

      observerRef.current = { observer, svg }
    }

    const observerRef = { current: null }
    waitForSvg()

    return () => {
      if (observerRef.current) {
        observerRef.current.observer.disconnect()
        observerRef.current.svg.removeEventListener('mouseup', markDirty)
      }
    }
  }, [isInRoom])

  // Periodic auto-save to localStorage
  useEffect(() => {
    if (isInRoom) return // skip in collab rooms

    const save = () => {
      const serializer = window.__sceneSerializer
      const shapes = window.shapes
      if (!serializer || !shapes) return

      try {
        const workspaceName = useUIStore.getState().workspaceName || 'Untitled'
        const sceneData = serializer.save(workspaceName)
        localStorage.setItem(getLocalSaveKey(), JSON.stringify(sceneData))
        localStorage.setItem(getLocalSaveMetaKey(), JSON.stringify({
          workspaceName,
          savedAt: Date.now(),
          shapeCount: shapes.length,
        }))
        // Mark as locally saved (only if not already cloud-synced)
        const currentStatus = useUIStore.getState().saveStatus
        if (currentStatus !== 'cloud') {
          useUIStore.getState().setSaveStatus('local')
        }
      } catch (err) {
        console.warn('[AutoSave] Local save failed:', err)
      }
    }

    const interval = setInterval(save, SAVE_INTERVAL)

    // Also save on beforeunload
    const handleUnload = () => save()
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', handleUnload)
      // Final save on cleanup
      save()
    }
  }, [isInRoom])

  // Save new workspace to DB immediately so it appears in the user's profile
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
          console.log('[AutoSave] New workspace saved to cloud')
          // Store encryption key for this session
          useUIStore.getState().setSessionEncryptionKey?.(key)
        } else {
          const err = await res.json().catch(() => ({}))
          console.warn('[AutoSave] Failed to save new workspace:', err.error || err.message)
        }
      } catch (err) {
        console.warn('[AutoSave] Failed to save new workspace:', err)
      }

      // Clear the flag so it doesn't re-run
      window.__isNewWorkspace = false
    }

    setTimeout(saveNewWorkspace, 2000)
  }, [isInRoom])

  // Deferred cloud sync every 5 minutes (only if authenticated)
  useEffect(() => {
    if (isInRoom) return
    if (!WORKER_URL) return

    const syncToCloud = async () => {
      const authState = useAuthStore.getState()
      if (!authState.isAuthenticated) return

      const shapes = window.shapes
      if (!shapes) return

      const now = Date.now()
      if (now - lastCloudSync.current < CLOUD_SYNC_INTERVAL) return

      try {
        const serializer = window.__sceneSerializer
        if (!serializer) return

        const workspaceName = useUIStore.getState().workspaceName || 'Untitled'
        const sceneData = serializer.save(workspaceName)
        const sceneJSON = JSON.stringify(sceneData)

        // Encrypt before sending
        const key = await generateKey()
        const encryptedData = await encrypt(sceneJSON, key)

        const sessionId = getSessionID()
        const res = await fetch(`${WORKER_URL}/api/scenes/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            encryptedData,
            permission: 'edit',
            workspaceName,
            createdBy: authState.user?.id || useProfileStore.getState().profile?.id || 'anonymous',
            ownerType: authState.isAuthenticated ? 'user' : 'guest',
          }),
        })

        if (res.ok) {
          lastCloudSync.current = now
          useUIStore.getState().setSaveStatus('cloud')
          console.log('[AutoSave] Cloud sync complete')
        }
      } catch (err) {
        console.warn('[AutoSave] Cloud sync failed:', err)
      }
    }

    const interval = setInterval(syncToCloud, CLOUD_SYNC_INTERVAL)

    // Also sync to cloud on beforeunload
    const handleUnload = () => {
      // Reset the interval check so it syncs immediately
      lastCloudSync.current = 0
      syncToCloud()
    }
    window.addEventListener('beforeunload', handleUnload)

    return () => {
      clearInterval(interval)
      window.removeEventListener('beforeunload', handleUnload)
    }
  }, [isInRoom])
}
