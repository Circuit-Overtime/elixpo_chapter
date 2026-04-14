"use client";

import { useState, useEffect, useCallback } from "react";

interface Toast {
  id: number;
  message: string;
  type: "success" | "error";
}

let toastId = 0;
const listeners = new Set<(toast: Toast) => void>();

export function showToast(message: string, type: "success" | "error" = "success") {
  const toast: Toast = { id: ++toastId, message, type };
  listeners.forEach((fn) => fn(toast));
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const handler = (toast: Toast) => {
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, 3000);
    };
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, []);

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-2.5 rounded-xl text-xs font-medium shadow-lg border backdrop-blur-xl animate-[slideUp_0.3s_ease-out] ${
            t.type === "success"
              ? "bg-[rgba(34,197,94,0.12)] text-success border-[rgba(34,197,94,0.3)]"
              : "bg-[rgba(239,68,68,0.12)] text-error border-[rgba(239,68,68,0.3)]"
          }`}
        >
          <span className="mr-1.5">{t.type === "success" ? "✓" : "✕"}</span>
          {t.message}
        </div>
      ))}
    </div>
  );
}
