import { AlertsView } from "@/components/dashboard-views";
import { getDashboardSnapshot } from "@/lib/github-dashboard";

export const dynamic = "force-dynamic";

export default async function AlertsPage() {
  return <AlertsView snapshot={await getDashboardSnapshot()} />;
}
