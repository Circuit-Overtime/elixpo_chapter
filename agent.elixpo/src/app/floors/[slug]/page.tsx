import { notFound } from "next/navigation";
import { LiveDashboard } from "@/components/live-dashboard";
import { floors, getFloor } from "@/lib/dashboard-model";

export function generateStaticParams() {
  return floors.map((floor) => ({ slug: floor.slug }));
}

export default async function FloorPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const floor = getFloor(slug);
  if (!floor) notFound();
  return <LiveDashboard view="floor" floor={floor} />;
}
