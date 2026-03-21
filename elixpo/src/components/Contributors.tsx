"use client";

import Image from "next/image";
import contributorsData from "@/data/contributors.json";

export default function Contributors() {
  const contributors = contributorsData.contributors;

  // Split contributors into orbital rings
  const orbit1 = contributors.slice(0, 6);
  const orbit2 = contributors.slice(6, 15);
  const orbit3 = contributors.slice(15);

  return (
    <section className="py-24 md:py-32 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
            {contributorsData.headline}
          </h2>
          <p className="text-muted max-w-xl mx-auto text-base">
            {contributorsData.subheadline}
          </p>
        </div>

        {/* Solar System */}
        <div className="relative w-full aspect-square max-w-[600px] mx-auto">
          {/* Center - Founder avatar */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
            <Image
              src="https://github.com/Circuit-Overtime.png"
              alt="Circuit-Overtime"
              width={80}
              height={80}
              className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-accent shadow-xl shadow-accent/30"
              unoptimized
            />
          </div>

          {/* Orbit 1 - innermost */}
          <div className="absolute inset-[25%] rounded-full border border-border/40">
            <div className="relative w-full h-full animate-orbit-slow">
              {orbit1.map((username, i) => {
                const angle = (i / orbit1.length) * 360;
                const rad = (angle * Math.PI) / 180;
                const x = 50 + 50 * Math.cos(rad);
                const y = 50 + 50 * Math.sin(rad);
                return (
                  <div
                    key={username}
                    className="absolute animate-counter-orbit-slow"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <Image
                      src={`https://github.com/${username}.png`}
                      alt={username}
                      width={36}
                      height={36}
                      className="w-8 h-8 md:w-9 md:h-9 rounded-full border-2 border-white shadow-md"
                      unoptimized
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Orbit 2 - middle */}
          <div className="absolute inset-[12%] rounded-full border border-border/30">
            <div className="relative w-full h-full animate-orbit-medium">
              {orbit2.map((username, i) => {
                const angle = (i / orbit2.length) * 360;
                const rad = (angle * Math.PI) / 180;
                const x = 50 + 50 * Math.cos(rad);
                const y = 50 + 50 * Math.sin(rad);
                return (
                  <div
                    key={username}
                    className="absolute animate-counter-orbit-medium"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <Image
                      src={`https://github.com/${username}.png`}
                      alt={username}
                      width={32}
                      height={32}
                      className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-white shadow-md"
                      unoptimized
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Orbit 3 - outermost */}
          <div className="absolute inset-0 rounded-full border border-border/20">
            <div className="relative w-full h-full animate-orbit-outer">
              {orbit3.map((username, i) => {
                const angle = (i / orbit3.length) * 360;
                const rad = (angle * Math.PI) / 180;
                const x = 50 + 50 * Math.cos(rad);
                const y = 50 + 50 * Math.sin(rad);
                return (
                  <div
                    key={username}
                    className="absolute animate-counter-orbit-outer"
                    style={{
                      left: `${x}%`,
                      top: `${y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    <Image
                      src={`https://github.com/${username}.png`}
                      alt={username}
                      width={28}
                      height={28}
                      className="w-6 h-6 md:w-7 md:h-7 rounded-full border-2 border-white shadow-sm"
                      unoptimized
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Contributor count */}
        <p className="text-center text-sm text-muted mt-8">
          {contributors.length}+ contributors and growing
        </p>
      </div>
    </section>
  );
}
