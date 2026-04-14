"use client";

import { useState, useRef, KeyboardEvent } from "react";

interface ChatInputProps {
  onSend: (content: string, images?: string[]) => void;
  onStop?: () => void;
  isLoading: boolean;
  disabled?: boolean;
  model: string;
  onModelChange: (model: string) => void;
}

const MODELS = [
  { id: "lixsearch", name: "lixSearch", desc: "Web search + AI" },
];

const MENU_ITEMS = [
  { icon: "📎", label: "Add files or photos", action: "upload" },
  { icon: "📸", label: "Take a screenshot", action: "screenshot" },
  { icon: "📁", label: "Add to project", action: "project", arrow: true },
  { icon: "🔬", label: "Research", action: "research" },
  { icon: "🌐", label: "Web search", action: "websearch", toggle: true },
  { icon: "✏️", label: "Use style", action: "style", arrow: true },
];

export default function ChatInput({ onSend, onStop, isLoading, disabled, model, onModelChange }: ChatInputProps) {
  const [text, setText] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [showMenu, setShowMenu] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [webSearch, setWebSearch] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (isLoading && onStop) { onStop(); return; }
    if (!text.trim() && !images.length) return;
    onSend(text.trim(), images.length ? images : undefined);
    setText("");
    setImages([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).slice(0, 3 - images.length).forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => { if (typeof reader.result === "string") setImages((p) => [...p, reader.result as string].slice(0, 3)); };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleMenuAction = (action: string) => {
    if (action === "upload") { setShowMenu(false); fileRef.current?.click(); }
    else if (action === "websearch") { setWebSearch(!webSearch); }
    else { setShowMenu(false); }
  };

  const autoResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + "px";
    }
  };

  const currentModel = MODELS.find((m) => m.id === model) || MODELS[0];

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="max-w-3xl mx-auto">
        {/* Image previews */}
        {images.length > 0 && (
          <div className="flex gap-2 mb-2 px-1">
            {images.map((img, i) => (
              <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-neutral-200">
                <img src={img} alt="" className="w-full h-full object-cover" />
                <button onClick={() => setImages((p) => p.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white text-[8px] flex items-center justify-center cursor-pointer">✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Main input */}
        <div className="rounded-2xl bg-neutral-50 border border-neutral-200 focus-within:border-neutral-400 transition-colors">
          <div className="px-4 pt-3 pb-2">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => { setText(e.target.value); autoResize(); }}
              onKeyDown={handleKeyDown}
              placeholder="Message Elixpo..."
              disabled={disabled}
              rows={1}
              className="w-full bg-transparent outline-none text-sm text-neutral-900 placeholder:text-neutral-400 resize-none max-h-[200px]"
            />
          </div>

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-1">
              {/* + Menu */}
              <div className="relative">
                <button
                  onClick={() => { setShowMenu(!showMenu); setShowModelPicker(false); }}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-600 hover:bg-neutral-200/50 transition-colors cursor-pointer"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>

                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                    <div className="absolute bottom-full left-0 mb-2 w-56 bg-white rounded-xl shadow-2xl border border-neutral-100 z-50 py-1">
                      {MENU_ITEMS.map((item) => (
                        <button
                          key={item.action}
                          onClick={() => handleMenuAction(item.action)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors cursor-pointer ${
                            item.toggle && webSearch ? "text-blue-600 font-medium" : "text-neutral-700 hover:bg-neutral-50"
                          }`}
                        >
                          <span className="text-base w-5 text-center">{item.icon}</span>
                          <span className="flex-1">{item.label}</span>
                          {item.toggle && webSearch && (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>
                          )}
                          {item.arrow && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 18l6-6-6-6" /></svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
            </div>

            <div className="flex items-center gap-2">
              {/* Model selector */}
              <div className="relative">
                <button
                  onClick={() => { setShowModelPicker(!showModelPicker); setShowMenu(false); }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-neutral-500 hover:bg-neutral-200/50 transition-colors cursor-pointer"
                >
                  <span>{currentModel.name}</span>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6" /></svg>
                </button>

                {showModelPicker && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowModelPicker(false)} />
                    <div className="absolute bottom-full right-0 mb-2 w-52 bg-white rounded-xl shadow-2xl border border-neutral-100 z-50 py-1">
                      {MODELS.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => { onModelChange(m.id); setShowModelPicker(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm cursor-pointer transition-colors ${model === m.id ? "text-blue-600 bg-blue-50" : "text-neutral-700 hover:bg-neutral-50"}`}
                        >
                          <div className="flex-1">
                            <p className="font-medium">{m.name}</p>
                            <p className="text-[10px] text-neutral-400">{m.desc}</p>
                          </div>
                          {model === m.id && <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6L9 17l-5-5" /></svg>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Send/Stop */}
              <button
                onClick={handleSend}
                disabled={disabled || (!isLoading && !text.trim() && !images.length)}
                className={`p-2 rounded-lg flex-shrink-0 transition-all cursor-pointer ${
                  isLoading ? "bg-red-500 hover:bg-red-600 text-white"
                    : text.trim() || images.length ? "bg-neutral-900 hover:bg-neutral-800 text-white"
                    : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                }`}
              >
                {isLoading ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="12" y1="19" x2="12" y2="5" /><polyline points="5 12 12 5 19 12" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-neutral-400 text-center mt-2">Powered by lixSearch</p>
      </div>
    </div>
  );
}
