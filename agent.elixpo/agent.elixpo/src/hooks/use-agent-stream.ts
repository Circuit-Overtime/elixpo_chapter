"use client";

import { useCallback, useRef, useState } from "react";
import { connectSessionStream } from "@/lib/api";
import type { AgentEvent } from "@/types";

export function useAgentStream(sessionId: string) {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current) return;

    const ws = connectSessionStream(
      sessionId,
      (event) => {
        setEvents((prev) => [...prev, event]);
      },
      () => {
        setConnected(false);
        wsRef.current = null;
      },
    );

    ws.onopen = () => setConnected(true);
    wsRef.current = ws;
  }, [sessionId]);

  const send = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const startSession = useCallback(
    (task: string, repo?: string) => {
      connect();
      // Wait for connection, then send start
      const interval = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          clearInterval(interval);
          send({ action: "start", task, repo });
        }
      }, 100);
    },
    [connect, send],
  );

  const resumeSession = useCallback(
    (followUp: string) => {
      if (!connected) connect();
      const interval = setInterval(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          clearInterval(interval);
          send({ action: "resume", follow_up: followUp });
        }
      }, 100);
    },
    [connect, connected, send],
  );

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }, []);

  return { events, connected, startSession, resumeSession, disconnect };
}
