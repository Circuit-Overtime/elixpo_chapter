"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { NewsDetails, PodcastDetails, WeatherResponse } from "@/lib/types";

export default function HomePage() {
  const router = useRouter();
  const [news, setNews] = useState<NewsDetails | null>(null);
  const [podcast, setPodcast] = useState<PodcastDetails | null>(null);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);

  const newsRef = useRef<HTMLDivElement>(null);
  const podcastRef = useRef<HTMLDivElement>(null);
  const weatherRef = useRef<HTMLDivElement>(null);

  function animateIn(el: HTMLElement | null) {
    if (!el) return;
    el.style.transition = "opacity 0.8s ease, transform 0.8s ease";
    el.style.opacity = "1";
    el.style.transform = "translateY(0)";
  }

  useEffect(() => {
    fetch("/api/news-details")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setNews(data);
          setTimeout(() => animateIn(newsRef.current), 50);
        }
      })
      .catch(console.error);

    fetch("/api/podcast-details")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setPodcast(data);
          setTimeout(() => animateIn(podcastRef.current), 50);
        }
      })
      .catch(console.error);

    fetch("https://ipapi.co/json/")
      .then((r) => r.json())
      .then((ipData) => {
        const loc = [ipData.city, ipData.latitude, ipData.longitude]
          .filter(Boolean)
          .join(", ");
        return fetch(`/api/weather?location=${encodeURIComponent(loc)}`);
      })
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) {
          setWeather(data);
          setTimeout(() => animateIn(weatherRef.current), 50);
        }
      })
      .catch(console.error);
  }, []);

  const formatDate = (dateStr: string) => {
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sept","Oct","Nov","Dec"];
    const [year, month, day] = dateStr.split("T")[0].split("-");
    return { date: `${months[parseInt(month, 10) - 1]} ${day}`, year };
  };

  const newsDate = news?.latestNewsDate ? formatDate(news.latestNewsDate) : null;

  return (
    <section className="relative min-h-screen w-screen overflow-y-auto overflow-x-hidden" style={{ background: "#141A2B" }}>
      <div className="relative mx-auto w-[85%] max-w-[1200px] pt-[5%] pb-20">
        <h2 className="text-center font-[family-name:var(--font-parkinsans)] text-[clamp(1.5rem,3.5vw,3.5rem)] font-extrabold tracking-wide leading-tight pb-2.5" style={{ color: "#ffc" }}>
          Elixpo Chat!
        </h2>

        <div className="mt-5 mb-15 grid grid-cols-8 grid-rows-6 gap-4 h-[450px] max-lg:h-[600px] max-md:h-auto max-md:flex max-md:flex-col max-md:gap-4">
          {/* News Card */}
          <div
            ref={newsRef}
            onClick={() => router.push("/daily")}
            className="col-span-4 row-span-6 rounded-[65px] overflow-hidden relative cursor-pointer transition-all duration-250 max-md:h-[350px] max-md:rounded-[15px] max-md:border-2 max-md:border-white/55"
            style={{ background: "#1E2538", boxShadow: "inset 0 0 10px #111", opacity: 0, transform: "translateY(30px)" }}
          >
            {/* Blurred background */}
            <div
              className="absolute inset-0 bg-cover bg-center bg-no-repeat"
              style={{
                backgroundImage: news?.latestNewsThumbnail ? `url(${news.latestNewsThumbnail})` : undefined,
                filter: "blur(40px) brightness(0.3)",
                boxShadow: "inset 0 0 20px #111",
              }}
            />
            <div className="absolute inset-0 z-[1] p-4 box-border">
              {/* Waveform + logo */}
              <div className="relative top-[20%] left-1/2 -translate-x-1/2 w-[80%] h-[100px] bg-[url('https://studiostaticassetsprod.azureedge.net/bundle-cmc/images/wave.svg')] bg-cover bg-center rounded-[20px] invert max-md:top-[10%]">
                {news?.latestNewsThumbnail && (
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100px] h-[100px] rounded-[25px] bg-cover bg-center invert"
                    style={{ backgroundImage: `url(${news.latestNewsThumbnail})` }}
                  />
                )}
              </div>
              <div className="relative top-[30%] left-[5%] text-xl font-bold font-[family-name:var(--font-parkinsans)] max-md:top-[15%] max-md:text-lg" style={{ color: "#ffc" }}>
                Elixpo Daily
              </div>
              <div className="relative top-[30%] left-[5%] w-[90%] flex flex-wrap p-1 text-white overflow-hidden max-md:top-[15%]">
                {newsDate && (
                  <>
                    <p className="text-base font-medium mr-2.5">{newsDate.date}</p>
                    <span className="w-2 h-2 bg-white rounded-full mt-2.5 mr-2.5" />
                    <p className="text-base font-medium mr-2.5">{newsDate.year}</p>
                    <p className="text-sm basis-full mt-0 max-h-[90px] overflow-hidden text-ellipsis" style={{ color: "rgba(255,255,204,0.65)" }}>
                      {news?.latestNewsSummary}
                    </p>
                  </>
                )}
              </div>
              {/* Play button */}
              <div
                className="relative top-[30%] left-[5%] h-10 w-[90%] flex items-center justify-center rounded-[10px] rounded-b-[35px] bg-white cursor-pointer transition-all duration-250 hover:bg-[#ffc] hover:shadow-[inset_0_0_10px_rgba(237,163,78,0.789)] max-md:top-[18%] max-md:left-1/2 max-md:-translate-x-1/2 max-md:text-[0.8em]"
              >
                <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor">
                  <path d="M12.2246 27.5373C9.89137 28.8585 7 27.173 7 24.4917V7.50044C7 4.81864 9.89234 3.1332 12.2256 4.45537L27.2233 12.9542C29.5897 14.2951 29.5891 17.7047 27.2223 19.0449L12.2246 27.5373Z" />
                </svg>
                <span className="ml-2.5 text-lg text-[#111] font-[family-name:var(--font-parkinsans)]">Play Now</span>
              </div>
            </div>
          </div>

          {/* Weather Card */}
          <div
            ref={weatherRef}
            onClick={() => router.push("/discover")}
            className="col-span-4 row-span-3 col-start-5 rounded-[55px] overflow-hidden relative cursor-pointer transition-all duration-250 max-md:h-[200px] max-md:rounded-[30px]"
            style={{ background: "#1E2538", boxShadow: "inset 0 0 10px #111", opacity: 0, transform: "translateY(30px)" }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: weather?.bannerLink ? `url('${weather.bannerLink}')` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "blur(5px) brightness(0.4)",
                opacity: weather ? 0.8 : 0,
                transition: "opacity 0.8s ease",
              }}
            />
            <div className="absolute inset-0 z-[1] p-4" style={{ background: "rgba(0,0,0,0.3)" }}>
              <p className="relative top-[10%] left-[5%] text-xl font-bold font-[family-name:var(--font-parkinsans)]" style={{ color: "#ffc" }}>
                {weather?.structuredWeather.location || "Loading..."}
              </p>
              <div className="relative top-[55%] flex w-[85%] h-[60px] left-[7.5%] max-md:top-[40%]">
                <div className="text-3xl font-bold font-[family-name:var(--font-parkinsans)] flex-1" style={{ color: "#ffc" }}>
                  {weather ? (
                    <>{weather.structuredWeather.current.temperature}<span className="text-base align-top">°C</span></>
                  ) : "—"}
                </div>
                <div>
                  <div className="text-lg font-medium font-[family-name:var(--font-parkinsans)]" style={{ color: "#ffc" }}>
                    {weather?.structuredWeather.current.condition || ""}
                  </div>
                  <div className="text-sm font-normal font-[family-name:var(--font-parkinsans)]" style={{ color: "#ffc" }}>
                    {weather ? `Wind: ${weather.structuredWeather.current.wind_speed} km/h` : ""}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Podcast Card */}
          <div
            ref={podcastRef}
            onClick={() => router.push("/podcast")}
            className="col-span-4 row-span-3 col-start-5 row-start-4 rounded-[55px] overflow-hidden relative cursor-pointer transition-all duration-250 max-md:h-[200px] max-md:rounded-[30px]"
            style={{ background: "#1E2538", boxShadow: "inset 0 0 10px #111", opacity: 0, transform: "translateY(30px)" }}
          >
            {podcast?.latestPodcastThumbnail && (
              <div
                className="absolute left-[2.5%] top-[2.5%] h-[90%] w-[40%] rounded-[30px] bg-cover bg-center max-md:w-[50%]"
                style={{ backgroundImage: `url(${podcast.latestPodcastThumbnail})` }}
              />
            )}
            <div className="absolute top-[5%] left-[45%] h-[90%] w-[50%]">
              <div className="relative top-[40%] flex items-center gap-2 text-lg justify-center" style={{ color: "#ffc" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
                  <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
                </svg>
                <span>Elixpo Podcasts</span>
              </div>
              <div
                className="relative top-[42%] left-[5%] text-lg font-bold text-left px-5 leading-relaxed max-md:left-[20%] max-md:text-sm max-md:w-full"
                style={{ color: "#ffc" }}
              >
                {podcast?.latestPodcastName || "Loading..."}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
