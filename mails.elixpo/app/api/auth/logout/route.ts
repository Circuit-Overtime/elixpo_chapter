export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

/** GET /api/auth/logout — clear the session cookie and return home. */
export async function GET(request: NextRequest) {
    const res = NextResponse.redirect(`${request.nextUrl.origin}/`);
    res.cookies.delete(SESSION_COOKIE);
    return res;
}
