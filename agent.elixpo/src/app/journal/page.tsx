import { LiveDashboard } from "@/components/live-dashboard";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata(
  "Agent Journal",
  "Read OreoFlow's public operational journal of repository changes, run artifacts, and autonomous agent activity.",
  "/journal",
);

export default function JournalPage() {
  return <LiveDashboard view="journal" />;
}
