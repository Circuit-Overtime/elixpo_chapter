import { WorkView } from "@/components/dashboard-views";
import { getDashboardSnapshot } from "@/lib/github-dashboard";

export const dynamic = "force-dynamic";

export default async function WorkPage() {
  return <WorkView snapshot={await getDashboardSnapshot()} />;
}
