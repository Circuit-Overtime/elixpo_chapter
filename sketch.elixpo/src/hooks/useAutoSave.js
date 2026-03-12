"use client"

import { useEffect, useRef } from 'react'
import useCollabStore from '@/store/useCollabStore'
import useUIStore from '@/store/useUIStore'
import { WORKER_URL } from '@/store/useAuthStore'
import useAuthStore from '@/store/useAuthStore'
import { getSessionID } from '@/hooks/useSessionID'
import { encrypt, generateKey } from '@/utils/encryption'
import { useProfileStore } from '@/hooks/useGuestProfile'

const LOCAL_SAVE_KEY = 'lixsketch-autosave'
const LOCAL_SAVE_META_KEY = 'lixsketch-autosave-meta'
const SAVE_INTERVAL = 30_000 // 30 seconds
const CLOUD_SYNC_INTERVAL = 5 * 60_000 // 5 minutes

/**
 * Auto-saves the scene to localStorage periodically when the user
 * is NOT in a shared collaboration room. Syncs to cloud every 5 minutes
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

      const saved = localStorage.getItem(LOCAL_SAVE_KEY)
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
          const meta = localStorage.getItem(LOCAL_SAVE_META_KEY)
          if (meta) {
            const { workspaceName } = JSON.parse(meta)
            if (workspaceName) {
              useUIStore.getState().setWorkspaceName(workspaceName)
            }
          }
        }
      } catch (err) {
        console.warn('[AutoSave] Failed to restore:', err)
      }
      hasRestored.current = true
    }

    // Delay to let engine initialize
    setTimeout(tryRestore, 1000)
  }, [isInRoom])

  // Periodic auto-save to localStorage
  useEffect(() => {
    if (isInRoom) return // skip in collab rooms

    const save = () => {
      const serializer = window.__sceneSerializer
      const shapes = window.shapes
      if (!serializer || !shapes || shapes.length === 0) return

      try {
        const workspaceName = useUIStore.getState().workspaceName || 'Untitled'
        const sceneData = serializer.save(workspaceName)
        localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(sceneData))
        localStorage.setItem(LOCAL_SAVE_META_KEY, JSON.stringify({
          workspaceName,
          savedAt: Date.now(),
          shapeCount: shapes.length,
        }))
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

  // Deferred cloud sync every 5 minutes (only if authenticated)
  useEffect(() => {
    if (isInRoom) return
    if (!WORKER_URL) return

    const syncToCloud = async () => {
      const authState = useAuthStore.getState()
      if (!authState.isAuthenticated) return

      const shapes = window.shapes
      if (!shapes || shapes.length === 0) return

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
          console.log('[AutoSave] Cloud sync complete')
        }
      } catch (err) {
        console.warn('[AutoSave] Cloud sync failed:', err)
      }
    }

    const interval = setInterval(syncToCloud, CLOUD_SYNC_INTERVAL)
    return () => clearInterval(interval)
  }, [isInRoom])
}
