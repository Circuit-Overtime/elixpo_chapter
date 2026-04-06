'use client';
// useCollaboration — manages Yjs doc, WebSocket provider, and editing lock
// Returns collaboration props for BlockNote's useCreateBlockNote({ collaboration })

import { useState, useEffect, useRef } from 'react';

// Collab worker URL — set this to your deployed collab worker domain
const COLLAB_WS_URL = process.env.NEXT_PUBLIC_COLLAB_URL || 'wss://blog_collab.elixpo.com';

export function useCollaboration({ blogId, user, enabled = false }) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectedUsers, setConnectedUsers] = useState([]);
  const [error, setError] = useState(null);
  const [needsSeed, setNeedsSeed] = useState(false);
  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const heartbeatRef = useRef(null);

  // Collaboration config for BlockNote (null when not in collab mode)
  const [collaboration, setCollaboration] = useState(null);

  useEffect(() => {
    if (!enabled || !blogId || !user) return;

    let cancelled = false;

    async function init() {
      try {
        // Dynamic imports — only load Yjs when collab is active
        const Y = await import('yjs');
        const { WebsocketProvider } = await import('y-websocket');

        if (cancelled) return;

        const ydoc = new Y.Doc();
        ydocRef.current = ydoc;

        const wsUrl = COLLAB_WS_URL.replace(/^http/, 'ws');
        const provider = new WebsocketProvider(
          wsUrl,
          `blog-${blogId}`,
          ydoc,
          {
            params: {
              userId: user.id,
              userName: user.display_name || user.username || 'Anonymous',
            },
            connect: true,
          }
        );
        providerRef.current = provider;

        // Set local awareness state
        provider.awareness.setLocalStateField('user', {
          id: user.id,
          name: user.display_name || user.username || 'Anonymous',
          color: generateColor(user.id),
          avatar: user.avatar_url,
        });

        // Track connection state
        provider.on('status', ({ status }) => {
          if (!cancelled) setIsConnected(status === 'connected');
        });

        // After initial sync, check if the Yjs fragment is empty (needs seeding from existing content)
        provider.once('synced', () => {
          if (cancelled) return;
          const fragment = ydoc.getXmlFragment('prosemirror');
          if (fragment.length === 0) {
            setNeedsSeed(true);
          }
        });

        // Track connected users via awareness
        provider.awareness.on('change', () => {
          if (cancelled) return;
          const users = [];
          provider.awareness.getStates().forEach((state) => {
            if (state.user) users.push(state.user);
          });
          setConnectedUsers(users);
        });

        // Set collaboration config for BlockNote
        setCollaboration({
          fragment: ydoc.getXmlFragment('prosemirror'),
          user: {
            name: user.display_name || user.username || 'Anonymous',
            color: generateColor(user.id),
          },
          provider,
        });

        // Start heartbeat to keep editing lock alive
        heartbeatRef.current = setInterval(() => {
          fetch('/api/collab/heartbeat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ blogId }),
          }).catch(() => {});
        }, 60000); // every 60 seconds

        // Acquire editing lock
        fetch('/api/collab/lock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blogId }),
        }).catch(() => {});

      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }

    init();

    return () => {
      cancelled = true;

      // Cleanup
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);

      if (providerRef.current) {
        providerRef.current.disconnect();
        providerRef.current.destroy();
        providerRef.current = null;
      }
      if (ydocRef.current) {
        ydocRef.current.destroy();
        ydocRef.current = null;
      }

      setCollaboration(null);
      setIsConnected(false);
      setConnectedUsers([]);
      setNeedsSeed(false);

      // Release editing lock
      fetch('/api/collab/lock', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogId }),
      }).catch(() => {});
    };
  }, [enabled, blogId, user?.id]);

  return {
    collaboration,
    isConnected,
    connectedUsers,
    error,
    needsSeed,
    clearSeed: () => setNeedsSeed(false),
  };
}

function generateColor(userId) {
  let hash = 0;
  for (let i = 0; i < (userId || '').length; i++) {
    hash = ((hash << 5) - hash) + userId.charCodeAt(i);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 60%)`;
}
