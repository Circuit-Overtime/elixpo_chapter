"use client";

import { useState } from "react";

export default function CopyEmail({ email }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = email;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="group flex items-center gap-4 px-6 py-4 rounded-[15px] bg-[#e6ddc6] border-2 border-[#222] hover:bg-[#1B1B19] hover:text-[#E2D9C8] transition-all duration-300 cursor-pointer w-full max-w-[600px]"
    >
      <ion-icon name="mail-outline" style={{ fontSize: "1.8em" }}></ion-icon>
      <span className="emailText text-[1.4em] font-bold tracking-wide flex-1 text-left">
        {email}
      </span>
      <span className="text-[0.95em] font-semibold opacity-70 group-hover:opacity-100 transition-opacity">
        {copied ? "Copied!" : "Click to copy"}
      </span>
    </button>
  );
}
