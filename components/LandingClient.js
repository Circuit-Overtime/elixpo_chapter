"use client";

import PixelBloomCanvas from "@/components/PixelBloomCanvas";

export default function LandingClient() {
  return (
    <main className="relative h-screen min-h-[100svh] w-full overflow-hidden bg-[#151512]">
      <PixelBloomCanvas mode="background" className="absolute inset-0" />
    </main>
  );
}
