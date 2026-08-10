import { LiveDashboard } from "@/components/live-dashboard";
import { pageMetadata } from "@/lib/site-metadata";

export const metadata = pageMetadata(
  "Security Watch",
  "Review public safety signals, workflow failures, policy gates, and security events from OreoFlow operations.",
  "/security",
);

export default function SecurityPage() {
  return <LiveDashboard view="security" />;
}
