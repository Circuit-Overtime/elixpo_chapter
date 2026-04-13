"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import CloseButton from "@/components/CloseButton";
import SourcePill from "@/components/SourcePill";
import type { NewsItem, TranscriptSegment } from "@/lib/types";

const CATEGORY_COLORS: Record<string, string> = {
  tech: "#f59e0b",
  science: "#10b981",
  sports: "#3b82f6",
  health: "#ef4444",
  entertainment: "#a855f7",
  travel: "#06b6d4",
  business: "#f97316",
};

export default function NewsPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dominantColor, setDominantColor] = useState("rgba(30, 37, 56, 0.9)");
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [activeSegmentIdx, setActiveSegmentIdx] = useState(-1);

  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const playTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const headline = `Elixpo Daily — ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((data) => {
        const newsItems: NewsItem[] = Array.isArray(data.items) ? data.items : Object.values(data.items);
        setItems(newsItems);
        audioRefs.current = newsItems.map((item) => {
          const audio = new Audio(item.audio_url);
          audio.preload = "auto";
          return audio;
        });
        setLoading(false);
      })
      .catch(console.error);

    return () => {
      audioRefs.current.forEach((a) => { a.pause(); a.src = ""; });
      if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
    };
  }, []);

  // Load transcript when track changes
  const loadTranscript = useCallback((item: NewsItem) => {
    if (!item.transcript_url) { setSegments([]); return; }
    fetch(item.transcript_url)
      .then((r) => r.json())
      .then((data) => {
        const segs = data.segments || data.words || [];
        setSegments(segs);
        setActiveSegmentIdx(-1);
      })
      .catch(() => setSegments([]));
  }, []);

  const updateDominantColor = useCallback((imageUrl: string) => {
    fetch(`/api/dominant-color?imageUrl=${encodeURIComponent(imageUrl)}`)
      .then((r) => r.json())
      .then((data) => setDominantColor(data.color))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    const audio = audioRefs.current[currentIdx];
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
      // Find active transcript segment
      if (segments.length > 0) {
        const t = audio.currentTime;
        const idx = segments.findIndex((s) => t >= s.start && t < s.end);
        setActiveSegmentIdx(idx);
      }
    };
    const onEnded = () => {
      if (currentIdx < items.length - 1) {
        const nextIdx = currentIdx + 1;
        setCurrentIdx(nextIdx);
        audioRefs.current[nextIdx].currentTime = 0;
        playTimeoutRef.current = setTimeout(() => { audioRefs.current[nextIdx].play(); setIsPlaying(true); }, 1200);
      } else { setIsPlaying(false); }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    if (items[currentIdx]?.image_url) updateDominantColor(items[currentIdx].image_url);
    loadTranscript(items[currentIdx]);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [currentIdx, items, segments, updateDominantColor, loadTranscript]);

  // Auto-scroll transcript
  useEffect(() => {
    if (activeSegmentIdx < 0 || !transcriptRef.current) return;
    const el = transcriptRef.current.children[activeSegmentIdx] as HTMLElement;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeSegmentIdx]);

  const togglePlay = () => {
    const audio = audioRefs.current[currentIdx];
    if (!audio) return;
    if (audio.paused) audio.play(); else audio.pause();
  };

  const switchTrack = (idx: number) => {
    if (idx < 0 || idx >= items.length || idx === currentIdx) return;
    audioRefs.current[currentIdx].pause();
    if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
    setCurrentIdx(idx);
    audioRefs.current[idx].currentTime = 0;
    playTimeoutRef.current = setTimeout(() => audioRefs.current[idx].play(), 800);
  };

  const seekTo = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const audio = audioRefs.current[currentIdx];
    if (audio?.duration) audio.currentTime = percent * audio.duration;
  };

  const formatTime = (sec: number) => {
    sec = Math.floor(sec);
    return `${Math.floor(sec / 60).toString().padStart(2, "0")}:${(sec % 60).toString().padStart(2, "0")}`;
  };

  const percent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const currentItem = items[currentIdx];
  const categoryColor = CATEGORY_COLORS[currentItem?.category] || "#f59e0b";

  return (
    <section className="relative h-screen w-screen overflow-hidden flex">
      <CloseButton />

      {/* Gradient background */}
      <div className="absolute inset-0 transition-colors duration-1000" style={{ background: `linear-gradient(135deg, ${dominantColor}, #0a0a0a)` }} />
      {currentItem?.image_url && (
        <div className="absolute inset-0 bg-cover bg-center opacity-15 transition-all duration-700" style={{ backgroundImage: `url('${currentItem.image_url}')`, filter: "blur(50px) brightness(0.4)" }} />
      )}

      {/* Left: Player */}
      <div className="relative z-10 flex flex-col items-center justify-center w-full lg:w-[60%] px-6">
        {/* Category badge */}
        {currentItem?.category && (
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4" style={{ background: categoryColor, color: "#fff" }}>
            {currentItem.category}
          </span>
        )}

        {/* Thumbnail */}
        {currentItem?.image_url && (
          <div className="w-[260px] h-[160px] rounded-2xl bg-cover bg-center shadow-2xl shadow-black/40 border border-white/10 mb-6 transition-all duration-500" style={{ backgroundImage: `url('${currentItem.image_url}')` }} />
        )}

        {/* Title */}
        <p className="text-lg font-bold text-center text-white font-[family-name:var(--font-parkinsans)] max-w-lg mb-2 max-sm:text-base">
          {loading ? headline : (currentItem?.topic?.slice(0, 100) || headline)}
        </p>

        {/* Source */}
        {currentItem?.source_link && (
          <div className="mb-6">
            <SourcePill sourceLink={currentItem.source_link} />
          </div>
        )}

        {/* 7 Category tiles (seek bars) */}
        <div className="flex gap-1.5 mb-4 w-full max-w-md">
          {items.map((item, idx) => {
            const isActive = idx === currentIdx;
            const color = CATEGORY_COLORS[item.category] || "#666";
            return (
              <button
                key={idx}
                onClick={() => switchTrack(idx)}
                className="flex-1 h-2 rounded-full cursor-pointer transition-all duration-300 relative overflow-hidden"
                style={{ background: isActive ? "rgba(255,255,255,0.3)" : `${color}44` }}
                title={`${item.category}: ${item.topic?.slice(0, 50)}`}
              >
                {isActive && (
                  <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-100" style={{ width: `${percent}%`, background: color }} />
                )}
                {!isActive && (
                  <div className="absolute inset-0 rounded-full" style={{ background: color, opacity: 0.6 }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Time + main seek */}
        <div className="flex items-center gap-3 w-full max-w-md mb-4">
          <span className="text-xs text-white/60 font-mono w-10 text-right">{formatTime(currentTime)}</span>
          <div onClick={seekTo} className="flex-1 h-1.5 rounded-full cursor-pointer relative" style={{ background: "rgba(255,255,255,0.2)" }}>
            <div className="absolute inset-y-0 left-0 rounded-full bg-white" style={{ width: `${percent}%` }} />
            <div className="absolute w-3 h-3 rounded-full bg-white -top-[3px] shadow" style={{ left: `calc(${percent}% - 6px)` }} />
          </div>
          <span className="text-xs text-white/60 font-mono w-10">{formatTime(duration)}</span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-8">
          <button onClick={() => switchTrack(currentIdx - 1)} className="text-white/70 hover:text-white transition-colors" disabled={currentIdx === 0}>
            <svg viewBox="0 0 24 24" className="w-6 h-6"><path d="M2.99998 19.247C2.99998 20.6548 4.57779 21.4864 5.73913 20.6906L16.2376 13.4972C17.2478 12.8051 17.253 11.3161 16.2476 10.6169L5.74918 3.31534C4.58885 2.50835 2.99998 3.33868 2.99998 4.75204V19.247ZM20.9999 20.25C20.9999 20.6642 20.6641 21 20.2499 21C19.8357 21 19.4999 20.6642 19.4999 20.25V3.75C19.4999 3.33579 19.8357 3 20.2499 3C20.6641 3 20.9999 3.33579 20.9999 3.75V20.25Z" fill="currentColor" /><title>Previous</title></svg>
          </button>
          <button onClick={togglePlay} className="w-14 h-14 rounded-full bg-white flex items-center justify-center hover:scale-105 transition-transform">
            {isPlaying ? (
              <svg viewBox="0 0 32 32" className="w-6 h-6"><path d="M7.25 29C5.45507 29 4 27.5449 4 25.75V7.25C4 5.45507 5.45507 4 7.25 4H10.75C12.5449 4 14 5.45507 14 7.25V25.75C14 27.5449 12.5449 29 10.75 29H7.25ZM21.25 29C19.4551 29 18 27.5449 18 25.75V7.25C18 5.45507 19.4551 4 21.25 4H24.75C26.5449 4 28 5.45507 28 7.25V25.75C28 27.5449 26.5449 29 24.75 29H21.25Z" fill="#0a0a0a" /></svg>
            ) : (
              <svg viewBox="0 0 32 32" className="w-6 h-6 ml-1"><path d="M12.2246 27.5373C9.89137 28.8585 7 27.173 7 24.4917V7.50044C7 4.81864 9.89234 3.1332 12.2256 4.45537L27.2233 12.9542C29.5897 14.2951 29.5891 17.7047 27.2223 19.0449L12.2246 27.5373Z" fill="#0a0a0a" /></svg>
            )}
          </button>
          <button onClick={() => switchTrack(currentIdx + 1)} className="text-white/70 hover:text-white transition-colors" disabled={currentIdx === items.length - 1}>
            <svg viewBox="0 0 24 24" className="w-6 h-6"><path d="M2.99998 19.247C2.99998 20.6548 4.57779 21.4864 5.73913 20.6906L16.2376 13.4972C17.2478 12.8051 17.253 11.3161 16.2476 10.6169L5.74918 3.31534C4.58885 2.50835 2.99998 3.33868 2.99998 4.75204V19.247ZM20.9999 20.25C20.9999 20.6642 20.6641 21 20.2499 21C19.8357 21 19.4999 20.6642 19.4999 20.25V3.75C19.4999 3.33579 19.8357 3 20.2499 3C20.6641 3 20.9999 3.33579 20.9999 3.75V20.25Z" fill="currentColor" /><title>Next</title></svg>
          </button>
        </div>
      </div>

      {/* Right: Live transcript */}
      <div className="hidden lg:flex relative z-10 w-[40%] flex-col justify-center pr-12">
        <h3 className="text-xs uppercase tracking-widest text-white/40 mb-4 font-semibold">Live Transcript</h3>
        <div ref={transcriptRef} className="max-h-[60vh] overflow-y-auto pr-4 space-y-2" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.15) transparent" }}>
          {segments.length > 0 ? segments.map((seg, i) => (
            <p
              key={i}
              className="text-sm leading-relaxed transition-all duration-300 cursor-pointer"
              style={{
                color: i === activeSegmentIdx ? "#fff" : "rgba(255,255,255,0.35)",
                transform: i === activeSegmentIdx ? "scale(1.02)" : "scale(1)",
                fontWeight: i === activeSegmentIdx ? 600 : 400,
              }}
              onClick={() => {
                const audio = audioRefs.current[currentIdx];
                if (audio) audio.currentTime = seg.start;
              }}
            >
              {seg.text}
            </p>
          )) : (
            <p className="text-sm text-white/20 italic">
              {loading ? "Loading..." : "Transcript will appear when audio plays"}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
