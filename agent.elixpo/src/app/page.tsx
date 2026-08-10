import { BuildingDashboard } from "@/components/dashboard-views";
import { getDashboardSnapshot } from "@/lib/github-dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  return <BuildingDashboard snapshot={await getDashboardSnapshot()} />;
}
