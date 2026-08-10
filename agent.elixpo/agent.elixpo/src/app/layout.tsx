import type { Metadata } from "next";
import { OperationsNav } from "@/components/operations-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "OreoFlow · Agent Operations",
  description: "The private operations room for the elixpoo agent system.",
  icons: {
    icon: [{ url: "/logo.png", type: "image/png", sizes: "1024x1024" }],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const controlRepo = process.env.ELIXPO_GITHUB_CONTROL_REPO || "elixpo/agent.elixpo";
  return (
    <html lang="en">
      <body><div className="operations-shell"><OperationsNav repositoryUrl={`https://github.com/${controlRepo}`} />{children}</div></body>
    </html>
  );
}
