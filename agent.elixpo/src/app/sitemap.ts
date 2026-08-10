import type { MetadataRoute } from "next";
import { floors } from "@/lib/dashboard-model";
import { absoluteUrl, SOCIAL_IMAGE } from "@/lib/site-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  const generatedAt = new Date();
  const routes = [
    { path: "/", priority: 1 },
    { path: "/floors", priority: 0.9 },
    { path: "/runs", priority: 0.8 },
    { path: "/work", priority: 0.8 },
    { path: "/journal", priority: 0.7 },
    { path: "/security", priority: 0.7 },
    ...floors.map((floor) => ({ path: `/floors/${floor.slug}`, priority: 0.8 })),
  ];

  return routes.map(({ path, priority }) => ({
    url: absoluteUrl(path),
    lastModified: generatedAt,
    changeFrequency: "daily" as const,
    priority,
    ...(path === "/" ? { images: [absoluteUrl(SOCIAL_IMAGE.url)] } : {}),
  }));
}
