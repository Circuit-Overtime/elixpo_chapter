import { LiveDashboard } from "@/components/live-dashboard";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata(
  "Agent Floor Directory",
  "Explore OreoFlow's operations lobby, autonomous GitHub workflow floor, and community discussions floor.",
  "/floors",
);

export default function FloorsPage() {
  return <LiveDashboard view="floors" />;
}
