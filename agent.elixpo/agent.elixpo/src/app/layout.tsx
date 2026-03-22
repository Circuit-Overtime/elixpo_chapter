import type { Metadata } from "next";
import { DM_Sans, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import Image from "next/image";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Elixpo Agent",
  description:
    "Autonomous AI software engineering agent by Elixpo. Tag @elixpoo on any GitHub issue or PR and let the agent handle it.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} dark`}
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        {/* Background gradient overlay */}
        <div
          className="fixed inset-0 -z-10"
          style={{
            background:
              "linear-gradient(135deg, #101510 0%, #0f1a0f 50%, #101510 100%)",
          }}
        />
        <div
          className="fixed inset-0 -z-10 opacity-30"
          style={{
            background:
              "radial-gradient(ellipse at 20% 50%, rgba(163, 230, 53, 0.06) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(134, 239, 172, 0.04) 0%, transparent 50%)",
          }}
        />

        {/* Navigation */}
        <nav className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#101510]/80 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
            <a href="/" className="flex items-center gap-3 group">
              <Image
                src="/logo.png"
                alt="Elixpo Agent"
                width={32}
                height={32}
                className="rounded-lg transition-transform group-hover:scale-105"
              />
              <span className="text-lg font-semibold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                Elixpo Agent
              </span>
            </a>
            <div className="flex items-center gap-8 text-sm">
              <a
                href="/dashboard"
                className="text-[rgba(245,245,244,0.6)] hover:text-[#f5f5f4] transition-colors font-medium"
              >
                Dashboard
              </a>
              <a
                href="/settings"
                className="text-[rgba(245,245,244,0.6)] hover:text-[#f5f5f4] transition-colors font-medium"
              >
                Settings
              </a>
              <a
                href="https://github.com/elixpo/elixpoagent"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[rgba(245,245,244,0.6)] hover:text-[#f5f5f4] transition-colors font-medium"
              >
                <svg
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  className="size-4"
                >
                  <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                GitHub
              </a>
            </div>
          </div>
        </nav>

        {/* Main content */}
        <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>

        {/* Footer */}
        <footer className="border-t border-white/[0.06] mt-auto">
          <div className="mx-auto max-w-7xl px-6 py-12">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
              {/* Brand */}
              <div className="md:col-span-2 space-y-4">
                <div className="flex items-center gap-3">
                  <Image
                    src="/logo.png"
                    alt="Elixpo Agent"
                    width={28}
                    height={28}
                    className="rounded-lg"
                  />
                  <span
                    className="text-base font-semibold tracking-tight"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Elixpo Agent
                  </span>
                </div>
                <p className="text-sm text-[rgba(245,245,244,0.5)] max-w-sm leading-relaxed">
                  Autonomous AI software engineering agent. Tag{" "}
                  <code className="text-[#a3e635] text-xs font-mono bg-[rgba(163,230,53,0.1)] px-1.5 py-0.5 rounded">
                    @elixpoo
                  </code>{" "}
                  on any GitHub issue or PR and let the agent handle it.
                </p>
              </div>

              {/* Product links */}
              <div className="space-y-4">
                <h4
                  className="text-xs font-semibold uppercase tracking-wider text-[rgba(245,245,244,0.4)]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Product
                </h4>
                <div className="flex flex-col gap-2.5">
                  <a
                    href="/dashboard"
                    className="text-sm text-[rgba(245,245,244,0.5)] hover:text-[#f5f5f4] transition-colors"
                  >
                    Dashboard
                  </a>
                  <a
                    href="/settings"
                    className="text-sm text-[rgba(245,245,244,0.5)] hover:text-[#f5f5f4] transition-colors"
                  >
                    Settings
                  </a>
                  <a
                    href="https://github.com/elixpo/elixpoagent"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[rgba(245,245,244,0.5)] hover:text-[#f5f5f4] transition-colors"
                  >
                    Documentation
                  </a>
                </div>
              </div>

              {/* Connect links */}
              <div className="space-y-4">
                <h4
                  className="text-xs font-semibold uppercase tracking-wider text-[rgba(245,245,244,0.4)]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Connect
                </h4>
                <div className="flex flex-col gap-2.5">
                  <a
                    href="https://github.com/elixpo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[rgba(245,245,244,0.5)] hover:text-[#f5f5f4] transition-colors"
                  >
                    GitHub
                  </a>
                  <a
                    href="https://github.com/elixpo/elixpoagent"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[rgba(245,245,244,0.5)] hover:text-[#f5f5f4] transition-colors"
                  >
                    Source Code
                  </a>
                </div>
              </div>
            </div>

            {/* Bottom bar */}
            <div className="mt-10 pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-xs text-[rgba(245,245,244,0.35)]">
                Built by{" "}
                <a
                  href="https://github.com/elixpo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[rgba(245,245,244,0.5)] hover:text-[#a3e635] transition-colors"
                >
                  Elixpo
                </a>
              </p>
              <p className="text-xs text-[rgba(245,245,244,0.35)]">
                Elixpo Agent v0.1.0
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
