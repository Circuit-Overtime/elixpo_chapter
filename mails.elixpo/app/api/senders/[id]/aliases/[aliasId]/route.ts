export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import { getDatabase } from "@/lib/d1-client";
import { getSession } from "@/lib/session";
import { deleteAlias, getAlias } from "@/lib/senders";

type Ctx = { params: Promise<{ id: string; aliasId: string }> };

/** DELETE /api/senders/:id/aliases/:aliasId — remove a From identity. */
export async function DELETE(request: NextRequest, { params }: Ctx) {
    const session = await getSession(request);
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    const { id, aliasId } = await params;

    const db = await getDatabase();
    const alias = await getAlias(db, session.tenantId, id, aliasId);
    if (!alias) return NextResponse.json({ error: "not_found" }, { status: 404 });

    await deleteAlias(db, session.tenantId, id, aliasId);
    return NextResponse.json({ ok: true });
}
