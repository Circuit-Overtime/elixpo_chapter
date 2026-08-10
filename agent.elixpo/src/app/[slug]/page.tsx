import { notFound } from "next/navigation";
import { FloorView } from "@/components/dashboard-views";
import { getDashboardSnapshot, getFloor } from "@/lib/github-dashboard";

export const dynamic = "force-dynamic";

export default async function FloorAliasPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const floor = getFloor(slug);
  if (!floor) notFound();
  return <FloorView snapshot={await getDashboardSnapshot()} floor={floor} />;
}
