export const runtime = "edge";

import { getDatabase } from "@/lib/d1-client";
import { requireDashboardSession } from "@/lib/dashboard-session";
import { getWorkspaceInfo } from "@/lib/workspace";
import { redirect } from "next/navigation";

/** /workspace — redirect to the active workspace's slugged page. */
export default async function WorkspaceIndex() {
    const session = await requireDashboardSession();
    let slug = session.tenantId;
    try {
        const db = await getDatabase();
        const info = await getWorkspaceInfo(db, session.tenantId);
        slug = info?.slug || session.tenantId;
    } catch {
        slug = session.tenantId;
    }
    redirect(`/workspace/${slug}`);
}
