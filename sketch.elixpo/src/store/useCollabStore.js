"use client"

import { create } from 'zustand'

const useCollabStore = create((set, get) => ({
  // Connection state
  connected: false,
  roomId: null,
  myColor: null,
  users: [],       // [{ userId, displayName, avatar, color }]
  expiresAt: null,
  adminUserId: null,

  // WebSocket ref (not reactive, just stored)
  ws: null,

  setConnected: (connected) => set({ connected }),
  setRoomInfo: (info) => set({
    roomId: info.roomId,
    myColor: info.yourColor,
    users: info.users || [],
    expiresAt: info.expiresAt,
    adminUserId: info.adminUserId,
  }),

  addUser: (user) => set((s) => ({
    users: [...s.users.filter((u) => u.userId !== user.userId), user],
  })),

  removeUser: (userId) => set((s) => ({
    users: s.users.filter((u) => u.userId !== userId),
  })),

  updatePresence: (userId, cursor) => set((s) => ({
    users: s.users.map((u) =>
      u.userId === userId ? { ...u, cursor } : u
    ),
  })),

  setWs: (ws) => set({ ws }),

  reset: () => set({
    connected: false,
    roomId: null,
    myColor: null,
    users: [],
    expiresAt: null,
    adminUserId: null,
    ws: null,
  }),
}))

export default useCollabStore
