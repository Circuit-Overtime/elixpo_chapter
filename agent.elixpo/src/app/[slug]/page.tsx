import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LiveDashboard } from "@/components/live-dashboard";
import { floors, getFloor } from "@/lib/dashboard-model";
import { pageMetadata } from "@/lib/site-metadata";

export function generateStaticParams() {
  return floors.map((floor) => ({ slug: floor.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const floor = getFloor(slug);
  if (!floor) return {};
  return pageMetadata(floor.name, floor.description, `/floors/${floor.slug}`);
}

export default async function FloorAliasPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const floor = getFloor(slug);
  if (!floor) notFound();
  return <LiveDashboard view="floor" floor={floor} />;
}
