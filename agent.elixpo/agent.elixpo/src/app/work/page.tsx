import { LiveDashboard } from "@/components/live-dashboard";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata(
  "Repository Work",
  "Follow issues and pull requests currently moving through OreoFlow's autonomous GitHub contribution pipeline.",
  "/work",
);

export default function WorkPage() {
  return <LiveDashboard view="work" />;
}
