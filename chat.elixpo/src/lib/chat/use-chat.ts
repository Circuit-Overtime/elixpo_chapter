"use client";

import { useState, useRef, useCallback } from "react";
import { chatStream, getSession } from "./search-client";

export interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  images?: string[];
  isStreaming?: boolean;
  taskBlocks?: string[];
}

/**
 * Parse <TASK>...</TASK> blocks from streaming content.
 * Returns { tasks: string[], cleanContent: string }
 */
function parseTaskBlocks(raw: string): { tasks: string[]; cleanContent: string } {
  const tasks: string[] = [];
  const cleanContent = raw.replace(/<TASK>([\s\S]*?)<\/TASK>/g, (_, inner) => {
    tasks.push(inner.trim());
    return "";
  });
  return { tasks, cleanContent: cleanContent.trim() };
}

export function useChat(initialSessionId?: string) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(initialSessionId || "");
  const abortRef = useRef<AbortController | null>(null);
  const streamTextRef = useRef("");

  /** Load existing session */
  const loadSession = useCallback(async (sid: string) => {
    try {
      const history = await getSession(sid);
      const displayMsgs: DisplayMessage[] = history.map((msg, i) => {
        const { tasks, cleanContent } = parseTaskBlocks(typeof msg.content === "string" ? msg.content : "");
        return {
          id: `hist-${i}`,
          role: msg.role as "user" | "assistant",
          content: cleanContent || (typeof msg.content === "string" ? msg.content : ""),
          taskBlocks: tasks.length ? tasks : undefined,
        };
      });
      setMessages(displayMsgs);
      setSessionId(sid);
    } catch (err) {
      console.error("Failed to load session:", err);
    }
  }, []);

  /** Send a message */
  const sendMessage = useCallback(async (content: string, images?: string[]) => {
    if (!content.trim() && !images?.length) return;

    // Generate session ID on first message (no separate create call needed)
    let sid = sessionId;
    if (!sid) {
      sid = crypto.randomUUID().slice(0, 11);
      setSessionId(sid);
    }

    // Build user message content
    const userContent: ChatMessage["content"] = images?.length
      ? [
          { type: "text", text: content },
          ...images.map((url) => ({ type: "image_url" as const, image_url: { url } })),
        ]
      : content;

    const userMsg: DisplayMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content,
      images,
    };

    const assistantMsg: DisplayMessage = {
      id: `asst-${Date.now()}`,
      role: "assistant",
      content: "",
      isStreaming: true,
      taskBlocks: [],
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsLoading(true);
    streamTextRef.current = "";

    const controller = await chatStream(
      {
        messages: [{ role: "user", content: userContent }],
        session_id: sid,
        stream: true,
      },
      {
        onChunk: (delta) => {
          streamTextRef.current += delta;
          const { tasks, cleanContent } = parseTaskBlocks(streamTextRef.current);

          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content: cleanContent,
                taskBlocks: tasks.length ? tasks : undefined,
                isStreaming: true,
              };
            }
            return updated;
          });
        },
        onDone: (fullText) => {
          const { tasks, cleanContent } = parseTaskBlocks(fullText);
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content: cleanContent,
                taskBlocks: tasks.length ? tasks : undefined,
                isStreaming: false,
              };
            }
            return updated;
          });
          setIsLoading(false);
        },
        onError: (err) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === "assistant") {
              updated[updated.length - 1] = {
                ...last,
                content: `Error: ${err.message}`,
                isStreaming: false,
              };
            }
            return updated;
          });
          setIsLoading(false);
        },
      }
    );

    abortRef.current = controller;
  }, [sessionId]);

  /** Stop streaming */
  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last?.isStreaming) {
        updated[updated.length - 1] = { ...last, isStreaming: false };
      }
      return updated;
    });
  }, []);

  return {
    messages,
    isLoading,
    sessionId,
    sendMessage,
    stopStreaming,
    loadSession,
  };
}
