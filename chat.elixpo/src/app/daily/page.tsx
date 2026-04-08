"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import CloseButton from "@/components/CloseButton";
import SourcePill from "@/components/SourcePill";
import type { NewsItem } from "@/lib/types";

export default function DailyPage() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [maskColor, setMaskColor] = useState("linear-gradient(to bottom, rgba(56,126,134,0.729), rgb(15,109,120))");

  const audioRefs = useRef<HTMLAudioElement[]>([]);
  const playTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const headline = `Your Elixpo Daily For ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;

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

  const updateDominantColor = useCallback((imageUrl: string) => {
    fetch(`/api/dominant-color?imageUrl=${encodeURIComponent(imageUrl)}`)
      .then((r) => r.json())
      .then((data) => setMaskColor(data.color))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    const audio = audioRefs.current[currentIdx];
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
    };
    const onEnded = () => {
      if (currentIdx < items.length - 1) {
        const nextIdx = currentIdx + 1;
        setCurrentIdx(nextIdx);
        audioRefs.current[nextIdx].currentTime = 0;
        playTimeoutRef.current = setTimeout(() => {
          audioRefs.current[nextIdx].play();
          setIsPlaying(true);
        }, 1500);
      } else {
        setIsPlaying(false);
      }
    };
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    if (items[currentIdx]?.image_url) {
      updateDominantColor(items[currentIdx].image_url);
    }

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, [currentIdx, items, updateDominantColor]);

  const togglePlay = () => {
    const audio = audioRefs.current[currentIdx];
    if (!audio) return;
    if (audio.paused) { audio.play(); } else { audio.pause(); }
  };

  const switchTrack = (direction: "prev" | "next") => {
    const newIdx = direction === "prev" ? currentIdx - 1 : currentIdx + 1;
    if (newIdx < 0 || newIdx >= items.length) return;
    audioRefs.current[currentIdx].pause();
    if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
    setCurrentIdx(newIdx);
    audioRefs.current[newIdx].currentTime = 0;
    playTimeoutRef.current = setTimeout(() => {
      audioRefs.current[newIdx].play();
    }, 1500);
  };

  const seekTo = (barIdx: number, e: React.MouseEvent<HTMLDivElement>) => {
    if (barIdx !== currentIdx) {
      // Switch to this track
      audioRefs.current[currentIdx].pause();
      setCurrentIdx(barIdx);
      audioRefs.current[barIdx].currentTime = 0;
      setTimeout(() => audioRefs.current[barIdx].play(), 500);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = x / rect.width;
    audioRefs.current[barIdx].currentTime = percent * (audioRefs.current[barIdx].duration || 0);
  };

  const formatTime = (sec: number) => {
    sec = Math.floor(sec);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const percent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <section className="relative h-screen w-screen overflow-hidden" style={{ background: "#ffc" }}>
      <CloseButton />

      {/* Backdrop image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{
          backgroundImage: items[currentIdx]?.image_url ? `url('${items[currentIdx].image_url}')` : undefined,
          filter: loading ? "blur(8px)" : undefined,
          opacity: loading ? 0.3 : 1,
        }}
      />

      {/* Color mask */}
      <div
        className="absolute -bottom-[20%] h-[70%] w-[200%] -left-[50%] z-[10] transition-colors duration-800"
        style={{ background: maskColor, filter: "blur(70px)" }}
      />

      {/* Source pills */}
      {items[currentIdx]?.source_link && (
        <div className="absolute top-[73%] left-1/2 -translate-x-1/2 z-10 flex items-center gap-2.5 max-sm:top-[64%]">
          <SourcePill sourceLink={items[currentIdx].source_link} />
        </div>
      )}

      {/* Title */}
      <p className="absolute top-[50%] left-1/2 -translate-x-1/2 text-2xl font-bold z-10 text-center font-[family-name:var(--font-parkinsans)] w-[80%] max-sm:text-lg max-sm:top-[45%]" style={{ color: "#ffd" }}>
        {loading ? headline : (items[currentIdx]?.topic?.slice(0, 80) + "..." || headline)}
      </p>
      <p className="absolute top-[66%] left-1/2 -translate-x-1/2 text-sm z-10 w-[80%] text-center text-white font-[family-name:var(--font-parkinsans)] max-sm:top-[58%] max-sm:text-xs">
        This daily-update is generated by Elixpo Copilot. There might be mistakes
      </p>

      {/* Playback zone */}
      <div className="absolute top-[83%] left-1/2 -translate-x-1/2 w-[30%] h-[104px] rounded-[25px] z-10 select-none max-lg:w-[50%] max-sm:w-[80%] max-sm:top-[80%] max-sm:text-[0.8em]" style={{ background: "#11111169", boxShadow: "0 12px 20px #1111116a" }}>
        {/* Seek bars */}
        <div className="relative flex items-center w-[90%] h-[40%] left-[5%] top-[10%] gap-[5px]">
          <span className="font-[family-name:var(--font-parkinsans)] font-bold mr-2.5 ml-2.5" style={{ color: "#ffc" }}>
            {formatTime(currentTime)}
          </span>
          {items.map((_, idx) => (
            <div
              key={idx}
              onClick={(e) => seekTo(idx, e)}
              className="relative h-1.5 rounded-[10px] cursor-pointer transition-all duration-250"
              style={{
                width: idx === currentIdx ? "75%" : "6%",
                background: "#ffc",
              }}
            >
              {idx === currentIdx && (
                <>
                  <div
                    className="absolute h-1.5 rounded-[20px] top-0 left-0"
                    style={{ width: `${percent}%`, background: "#ddb581" }}
                  />
                  <div
                    className="absolute w-[15px] h-[15px] rounded-full -top-[5px] z-[1] cursor-pointer"
                    style={{ left: `calc(${percent}% - 8px)`, background: "rgb(50,40,19)" }}
                  />
                </>
              )}
            </div>
          ))}
          <span className="font-[family-name:var(--font-parkinsans)] font-bold mr-2.5 ml-2.5" style={{ color: "#ffc" }}>
            {formatTime(duration)}
          </span>
        </div>

        {/* Controls */}
        <div className="relative flex items-center justify-between w-[50%] h-[40%] left-1/2 -translate-x-1/2 top-[10%]">
          <svg
            viewBox="0 0 24 24"
            className="w-[30px] h-[30px] cursor-pointer rotate-y-180 max-sm:w-5 max-sm:h-5"
            onClick={() => switchTrack("prev")}
          >
            <path d="M2.99998 19.247C2.99998 20.6548 4.57779 21.4864 5.73913 20.6906L16.2376 13.4972C17.2478 12.8051 17.253 11.3161 16.2476 10.6169L5.74918 3.31534C4.58885 2.50835 2.99998 3.33868 2.99998 4.75204V19.247ZM20.9999 20.25C20.9999 20.6642 20.6641 21 20.2499 21C19.8357 21 19.4999 20.6642 19.4999 20.25V3.75C19.4999 3.33579 19.8357 3 20.2499 3C20.6641 3 20.9999 3.33579 20.9999 3.75V20.25Z" fill="#ffc" />
          </svg>
          <svg
            viewBox="0 0 32 32"
            className="w-[30px] h-[30px] cursor-pointer max-sm:w-5 max-sm:h-5"
            onClick={togglePlay}
          >
            {isPlaying ? (
              <path d="M7.25 29C5.45507 29 4 27.5449 4 25.75V7.25C4 5.45507 5.45507 4 7.25 4H10.75C12.5449 4 14 5.45507 14 7.25V25.75C14 27.5449 12.5449 29 10.75 29H7.25ZM21.25 29C19.4551 29 18 27.5449 18 25.75V7.25C18 5.45507 19.4551 4 21.25 4H24.75C26.5449 4 28 5.45507 28 7.25V25.75C28 27.5449 26.5449 29 24.75 29H21.25Z" fill="#ffc" />
            ) : (
              <path d="M12.2246 27.5373C9.89137 28.8585 7 27.173 7 24.4917V7.50044C7 4.81864 9.89234 3.1332 12.2256 4.45537L27.2233 12.9542C29.5897 14.2951 29.5891 17.7047 27.2223 19.0449L12.2246 27.5373Z" fill="#ffc" />
            )}
          </svg>
          <svg
            viewBox="0 0 24 24"
            className="w-[30px] h-[30px] cursor-pointer max-sm:w-5 max-sm:h-5"
            onClick={() => switchTrack("next")}
          >
            <path d="M2.99998 19.247C2.99998 20.6548 4.57779 21.4864 5.73913 20.6906L16.2376 13.4972C17.2478 12.8051 17.253 11.3161 16.2476 10.6169L5.74918 3.31534C4.58885 2.50835 2.99998 3.33868 2.99998 4.75204V19.247ZM20.9999 20.25C20.9999 20.6642 20.6641 21 20.2499 21C19.8357 21 19.4999 20.6642 19.4999 20.25V3.75C19.4999 3.33579 19.8357 3 20.2499 3C20.6641 3 20.9999 3.33579 20.9999 3.75V20.25Z" fill="#ffc" />
          </svg>
        </div>
      </div>
    </section>
  );
}
