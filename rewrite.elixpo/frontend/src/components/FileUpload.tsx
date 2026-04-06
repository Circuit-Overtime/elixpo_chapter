"use client";

import { useState, useRef, useCallback } from "react";

interface FileUploadProps {
  onFile: (file: File) => void;
  accept?: string;
  maxSize?: number;
}

export function FileUpload({
  onFile,
  accept = ".pdf,.docx,.tex,.txt,.md",
  maxSize = 10 * 1024 * 1024,
}: FileUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      if (file.size > maxSize) {
        setError(`File too large. Max ${maxSize / 1024 / 1024} MB.`);
        return;
      }
      onFile(file);
    },
    [maxSize, onFile]
  );

  return (
    <div
      className={`glass-card p-8 text-center cursor-pointer transition-all ${
        dragOver ? "border-lime-border bg-lime-dim" : ""
      }`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <div className="text-4xl mb-3 opacity-50">📄</div>
      <p className="text-text-secondary mb-1">
        Drop a file here or <span className="text-lime underline">browse</span>
      </p>
      <p className="text-text-subtle text-sm">PDF, DOCX, LaTeX, TXT — up to 10 MB</p>
      {error && <p className="text-error text-sm mt-2">{error}</p>}
    </div>
  );
}
