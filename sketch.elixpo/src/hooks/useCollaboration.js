"use client"

import { useEffect, useRef } from 'react'
import useCollabStore from '@/store/useCollabStore'
import useAuthStore from '@/store/useAuthStore'
import { useProfileStore } from '@/hooks/useGuestProfile'

const COLLAB_URL = process.env.NEXT_PUBLIC_COLLAB_URL || 'ws://localhost:8787'
const PING_INTERVAL = 25000
const RECONNECT_BASE = 1000
const RECONNECT_MAX = 30000

export default function useCollaboration(roomId) {
  const wsRef = useRef(null)
  const pingRef = useRef(null)
  const reconnectRef = useRef(null)
  const reconnectDelay = useRef(RECONNECT_BASE)
  const intentionalClose = useRef(false)

  useEffect(() => {
    if (!roomId) return

    // Wait for engine to be ready
    const waitForEngine = () => {
      if (window.__sketchStoreApi) {
        connect()
      } else {
        setTimeout(waitForEngine, 200)
      }
    }

    function getIdentity() {
      const authUser = useAuthStore.getState().user
      const profile = useProfileStore.getState().profile
      return {
        userId: authUser?.id || profile?.id || `anon-${Date.now().toString(36)}`,
        displayName: authUser?.displayName || profile?.displayName || 'Anonymous',
        avatar: authUser?.avatar || profile?.avatar || '',
        authToken: useAuthStore.getState().sessionToken || '',
      }
    }

    function connect() {
      if (wsRef.current?.readyState === WebSocket.OPEN) return

      const { userId, displayName, avatar, authToken } = getIdentity()

      const params = new URLSearchParams({
        userId,
        displayName: btoa(encodeURIComponent(displayName)),
        avatar: avatar || '',
      })
      if (authToken) params.set('authToken', authToken)

      const wsUrl = `${COLLAB_URL}/room/${roomId}?${params}`
      console.log('[Collab] Connecting to', wsUrl)

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws
      useCollabStore.getState().setWs(ws)

      ws.onopen = () => {
        console.log('[Collab] Connected')
        useCollabStore.getState().setConnected(true)
        reconnectDelay.current = RECONNECT_BASE

        // Start ping keepalive
        pingRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }))
          }
        }, PING_INTERVAL)
      }

      ws.onmessage = (event) => {
        let msg
        try {
          msg = JSON.parse(event.data)
        } catch {
          return
        }
        handleMessage(msg, ws)
      }

      ws.onclose = (event) => {
        console.log('[Collab] Disconnected:', event.code, event.reason)
        cleanup()
        useCollabStore.getState().setConnected(false)

        if (!intentionalClose.current) {
          scheduleReconnect()
        }
      }

      ws.onerror = () => {
        // onclose will fire after this
      }
    }

    function handleMessage(msg, ws) {
      const store = useCollabStore.getState()

      switch (msg.type) {
        case 'room-info':
          store.setRoomInfo(msg)
          // Store session ID for the room
          window.__sessionID = roomId
          // If we're not the first user, request a sync
          if (msg.users.length > 1) {
            ws.send(JSON.stringify({
              type: 'sync-request',
              lastServerSeq: 0,
            }))
          }
          break

        case 'join':
          store.addUser({
            userId: msg.from,
            displayName: msg.displayName,
            avatar: msg.avatar,
            color: msg.color,
          })
          break

        case 'leave':
          store.removeUser(msg.from)
          // Remove cursor
          removeCursor(msg.from)
          break

        case 'presence':
          store.updatePresence(msg.from, msg.cursor)
          renderCursor(msg.from, msg.cursor, msg.displayName, msg.color)
          break

        case 'op':
          // Remote operation — apply to local scene
          applyRemoteOp(msg)
          break

        case 'sync-needed': {
          // Another user needs our scene state
          const serializer = window.__sceneSerializer
          if (serializer) {
            const sceneData = serializer.save()
            ws.send(JSON.stringify({
              type: 'sync-response',
              targetUserId: msg.requestedBy,
              payload: JSON.stringify(sceneData),
            }))
          }
          break
        }

        case 'sync-response': {
          // Full scene from another user
          const serializer = window.__sceneSerializer
          if (serializer && msg.payload) {
            try {
              const sceneData = JSON.parse(msg.payload)
              serializer.load(sceneData)
              console.log('[Collab] Scene synced from peer')
            } catch (e) {
              console.error('[Collab] Failed to load synced scene:', e)
            }
          }
          break
        }

        case 'room-expired':
        case 'room-closed':
          console.warn('[Collab] Room closed:', msg.type)
          intentionalClose.current = true
          ws.close()
          break

        case 'pong':
          break
      }
    }

    function applyRemoteOp(msg) {
      // For now, ops carry the full shape payload
      // The CollaborationBridge (Phase 4) will handle granular ops
      // This is a simple relay for initial implementation
      if (msg.payload && window.__sceneSerializer) {
        try {
          const op = JSON.parse(msg.payload)
          // Dispatch to engine when CollaborationBridge is ready
          if (window.__applyRemoteOp) {
            window.__applyRemoteOp(op)
          }
        } catch {}
      }
    }

    // --- Cursor rendering ---

    const cursors = new Map()

    function renderCursor(userId, cursor, displayName, color) {
      if (!cursor || !window.svg) return

      let el = cursors.get(userId)
      if (!el) {
        el = document.createElementNS('http://www.w3.org/2000/svg', 'g')
        el.setAttribute('class', 'remote-cursor')
        el.setAttribute('data-user', userId)
        el.style.pointerEvents = 'none'

        // Cursor arrow
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
        path.setAttribute('d', 'M0,0 L0,14 L4,11 L7,17 L9,16 L6,10 L11,10 Z')
        path.setAttribute('fill', color || '#5B57D1')
        path.setAttribute('stroke', '#000')
        path.setAttribute('stroke-width', '0.5')
        el.appendChild(path)

        // Name tag
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
        bg.setAttribute('rx', '3')
        bg.setAttribute('fill', color || '#5B57D1')
        bg.setAttribute('y', '18')
        bg.setAttribute('x', '2')
        el.appendChild(bg)

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        text.setAttribute('fill', '#fff')
        text.setAttribute('font-size', '9')
        text.setAttribute('font-family', 'lixFont, sans-serif')
        text.setAttribute('y', '27')
        text.setAttribute('x', '5')
        text.textContent = displayName || userId.slice(0, 8)
        el.appendChild(text)

        // Size the bg after text is measurable
        requestAnimationFrame(() => {
          const bbox = text.getBBox?.()
          if (bbox) {
            bg.setAttribute('width', bbox.width + 6)
            bg.setAttribute('height', bbox.height + 4)
          }
        })

        window.svg.appendChild(el)
        cursors.set(userId, el)
      }

      el.setAttribute('transform', `translate(${cursor.x}, ${cursor.y})`)
    }

    function removeCursor(userId) {
      const el = cursors.get(userId)
      if (el) {
        el.remove()
        cursors.delete(userId)
      }
    }

    // --- Presence broadcasting ---

    let lastPresenceTime = 0
    function onMouseMove(e) {
      const now = Date.now()
      if (now - lastPresenceTime < 50) return // Throttle to 20fps
      lastPresenceTime = now

      const ws = wsRef.current
      if (!ws || ws.readyState !== WebSocket.OPEN) return

      // Convert screen coords to SVG viewBox coords
      const svg = window.svg
      if (!svg) return
      const pt = svg.createSVGPoint()
      pt.x = e.clientX
      pt.y = e.clientY
      const svgPt = pt.matrixTransform(svg.getScreenCTM().inverse())

      ws.send(JSON.stringify({
        type: 'presence',
        cursor: { x: Math.round(svgPt.x), y: Math.round(svgPt.y) },
      }))
    }

    document.addEventListener('mousemove', onMouseMove)

    // --- Reconnection ---

    function scheduleReconnect() {
      const delay = reconnectDelay.current
      console.log(`[Collab] Reconnecting in ${delay}ms...`)
      reconnectRef.current = setTimeout(() => {
        reconnectDelay.current = Math.min(delay * 2, RECONNECT_MAX)
        connect()
      }, delay)
    }

    function cleanup() {
      if (pingRef.current) {
        clearInterval(pingRef.current)
        pingRef.current = null
      }
    }

    waitForEngine()

    return () => {
      intentionalClose.current = true
      document.removeEventListener('mousemove', onMouseMove)
      cleanup()
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      // Clean up cursors
      cursors.forEach((el) => el.remove())
      cursors.clear()
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
      useCollabStore.getState().reset()
    }
  }, [roomId])
}
