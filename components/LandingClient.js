export default function LandingClient() {
  return (
    <main className="relative h-screen min-h-[100svh] w-full overflow-hidden bg-[#151512]">
      <video
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/og-video.mp4" type="video/mp4" />
      </video>
    </main>
  );
}
