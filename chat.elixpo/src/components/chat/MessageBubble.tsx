"use client";

import { marked } from "marked";
import { useMemo } from "react";
import TaskBlock from "./TaskBlock";
import type { DisplayMessage } from "@/lib/chat/use-chat";

// Configure marked for safe rendering
marked.setOptions({ breaks: true, gfm: true });

function renderMarkdown(text: string) {
  // Auto-embed image URLs as <img> tags
  const withImages = text.replace(
    /(?<!!)\bhttps?:\/\/\S+\.(?:png|jpg|jpeg|gif|webp|svg)(?:\?\S*)?/gi,
    (url) => `![](${url})`
  );
  return marked.parse(withImages) as string;
}

export default function MessageBubble({ message }: { message: DisplayMessage }) {
  const isUser = message.role === "user";
  const html = useMemo(() => (isUser ? null : renderMarkdown(message.content)), [message.content, isUser]);

  return (
    <div className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {/* Avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-lg bg-neutral-900 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-white text-[10px] font-bold">E</span>
        </div>
      )}

      <div className={`max-w-[75%] ${isUser ? "order-first" : ""}`}>
        {/* Task blocks */}
        {message.taskBlocks?.map((task, i) => (
          <TaskBlock key={i} content={task} />
        ))}

        {/* Main content */}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "bg-neutral-900 text-white rounded-br-md"
              : "bg-neutral-100 text-neutral-800 rounded-bl-md"
          }`}
        >
          {isUser ? (
            <>
              {message.images?.map((img, i) => (
                <img key={i} src={img} alt="" className="rounded-lg mb-2 max-w-full max-h-48 object-cover" />
              ))}
              <p className="whitespace-pre-wrap">{message.content}</p>
            </>
          ) : (
            <>
              {message.content ? (
                <div
                  className="prose prose-sm prose-neutral max-w-none [&_img]:rounded-lg [&_img]:my-2 [&_img]:max-h-64 [&_a]:text-blue-600 [&_code]:bg-neutral-200 [&_code]:px-1 [&_code]:rounded [&_pre]:bg-neutral-800 [&_pre]:text-neutral-100 [&_pre]:rounded-lg [&_pre]:p-3"
                  dangerouslySetInnerHTML={{ __html: html || "" }}
                />
              ) : message.isStreaming ? (
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              ) : null}
            </>
          )}
        </div>

        {/* Streaming cursor */}
        {message.isStreaming && message.content && (
          <span className="inline-block w-1.5 h-4 bg-neutral-400 animate-pulse ml-1 rounded-full align-text-bottom" />
        )}
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-white text-[10px] font-bold">U</span>
        </div>
      )}
    </div>
  );
}
