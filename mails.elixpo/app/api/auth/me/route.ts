export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";

/** GET /api/auth/me — lightweight session probe for the navbar/client. */
export async function GET(request: NextRequest) {
    const session = await getSession(request);
    if (!session) {
        return NextResponse.json({ authenticated: false }, { status: 200 });
    }
    return NextResponse.json({
        authenticated: true,
        user: {
            uid: session.uid,
            email: session.email,
            name: session.name ?? null,
            avatar: session.avatar ?? null,
            tenantId: session.tenantId,
        },
    });
}
