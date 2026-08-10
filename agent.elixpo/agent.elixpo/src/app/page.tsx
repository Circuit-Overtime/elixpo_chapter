import { LiveDashboard } from "@/components/live-dashboard";
import { pageMetadata, SITE_DESCRIPTION } from "@/lib/site-metadata";

export const metadata = pageMetadata("Live Agent Operations", SITE_DESCRIPTION, "/");

export default function Home() {
  return <LiveDashboard view="building" />;
}
