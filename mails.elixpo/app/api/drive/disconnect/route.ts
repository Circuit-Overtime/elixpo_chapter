export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/d1-client";
import { deleteConnection } from "@/lib/drive";
import { getSession } from "@/lib/session";

/** POST /api/drive/disconnect — revoke + remove the workspace's Drive connection. */
export async function POST(request: NextRequest) {
    const session = await getSession(request);
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const db = await getDatabase();
    await deleteConnection(db, session.tenantId);
    return NextResponse.json({ ok: true });
}
