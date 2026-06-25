export const runtime = "edge";

import { getDatabase } from "@/lib/d1-client";
import { getSession } from "@/lib/session";
import { listWorkspacesForUser } from "@/lib/workspace";
import { resolveActiveRole } from "@/lib/workspace-guard";
import { type NextRequest, NextResponse } from "next/server";

/** GET /api/auth/me — lightweight session probe for the navbar/client. */
export async function GET(request: NextRequest) {
    const session = await getSession(request);
    if (!session) {
        return NextResponse.json({ authenticated: false }, { status: 200 });
    }

    let workspaces: Array<{
        tenantId: string;
        name: string;
        slug: string | null;
        role: string;
        active: boolean;
    }> = [];
    try {
        const db = await getDatabase();
        const rows = await listWorkspacesForUser(db, session.uid, session.email);
        workspaces = rows.map((w) => ({
            tenantId: w.tenant_id,
            name: w.name,
            slug: w.slug,
            role: w.role,
            active: w.tenant_id === session.tenantId,
        }));
    } catch {
        // best-effort; the navbar still works without the switcher list
    }

    // Live role from the DB (not the cookie) so UI gating reflects role changes
    // immediately — falls back to viewer (read-only) if membership was revoked.
    const role = (await resolveActiveRole(session)) ?? "viewer";

    return NextResponse.json({
        authenticated: true,
        user: {
            uid: session.uid,
            email: session.email,
            name: session.name ?? null,
            avatar: session.avatar ?? null,
            tenantId: session.tenantId,
            role,
        },
        workspaces,
    });
}
