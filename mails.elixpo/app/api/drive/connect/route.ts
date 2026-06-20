export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import { buildAuthUrl, driveConfigured } from "@/lib/drive";
import { appUrl } from "@/lib/env";
import { getSession } from "@/lib/session";

/** GET /api/drive/connect — kick off Google Drive OAuth (redirects to Google). */
export async function GET(request: NextRequest) {
    const session = await getSession(request);
    if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

    const base = await appUrl();
    if (!(await driveConfigured())) {
        return NextResponse.redirect(`${base}/dashboard/settings?drive=not_configured`);
    }
    const url = await buildAuthUrl(session.tenantId);
    return NextResponse.redirect(url);
}
