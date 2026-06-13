import type { MetadataRoute } from "next";

export const dynamic = "force-static";

const baseUrl = "https://elixpo.com";

const routes: { path: string; freq: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "", freq: "weekly", priority: 1 },
  { path: "/projects", freq: "weekly", priority: 0.9 },
  { path: "/community", freq: "weekly", priority: 0.8 },
  { path: "/about", freq: "monthly", priority: 0.8 },
  { path: "/features", freq: "monthly", priority: 0.7 },
  { path: "/resources", freq: "monthly", priority: 0.7 },
  { path: "/contributing", freq: "monthly", priority: 0.6 },
  { path: "/code-of-conduct", freq: "monthly", priority: 0.5 },
  { path: "/terms", freq: "yearly", priority: 0.3 },
  { path: "/privacy", freq: "yearly", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return routes.map(({ path, freq, priority }) => ({
    url: `${baseUrl}${path}`,
    lastModified,
    changeFrequency: freq,
    priority,
  }));
}
