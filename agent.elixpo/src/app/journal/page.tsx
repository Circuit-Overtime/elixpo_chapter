import { JournalView } from "@/components/dashboard-views";
import { getDashboardSnapshot } from "@/lib/github-dashboard";

export const dynamic = "force-dynamic";

export default async function JournalPage() {
  return <JournalView snapshot={await getDashboardSnapshot()} />;
}
