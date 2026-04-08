import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Elixpo Chat",
  description:
    "Your personalized hub for news, weather, podcasts, and more. Stay informed with Elixpo Daily, weather updates, and engaging podcasts.",
  keywords: [
    "Elixpo Chat",
    "news",
    "weather",
    "podcasts",
    "daily updates",
    "weather forecast",
    "podcast player",
  ],
  openGraph: {
    type: "website",
    url: "https://chat.elixpo.com/",
    title: "Elixpo Chat - Connect, Stay Informed, Explore",
    description:
      "Your personalized hub for news, weather, podcasts, and more.",
    images: [
      "https://github.com/user-attachments/assets/ab767204-588d-4367-8551-7ac43d523e1b",
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@elixpo",
    title: "Elixpo Chat - Connect, Stay Informed, Explore",
    description:
      "Your personalized hub for news, weather, podcasts, and more.",
    images: [
      "https://github.com/user-attachments/assets/ab767204-588d-4367-8551-7ac43d523e1b",
    ],
  },
  icons: { icon: "/images/ElixpoChatIcon.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Parkinsans:wght@300..800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css?family=Nunito+Sans"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/weather-icons/2.0.12/css/weather-icons.min.css"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
