import { FloorDirectoryView } from "@/components/dashboard-views";
import { getDashboardSnapshot } from "@/lib/github-dashboard";

export const dynamic = "force-dynamic";

export default async function FloorsPage() {
  return <FloorDirectoryView snapshot={await getDashboardSnapshot()} />;
}
