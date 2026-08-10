import { LiveDashboard } from "@/components/live-dashboard";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata(
  "Workflow Runs",
  "Track recent OreoFlow GitHub workflow runs, statuses, actors, branches, and execution activity.",
  "/runs",
);

export default function RunsPage() {
  return <LiveDashboard view="runs" />;
}
