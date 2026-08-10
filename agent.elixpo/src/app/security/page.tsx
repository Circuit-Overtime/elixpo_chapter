import { SecurityView } from "@/components/dashboard-views";
import { getDashboardSnapshot } from "@/lib/github-dashboard";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  return <SecurityView snapshot={await getDashboardSnapshot()} />;
}
