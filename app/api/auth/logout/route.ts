export const runtime = "edge";

import { SESSION_COOKIE } from "@/lib/session";
import { NextResponse } from "next/server";

function clear() {
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
    return res;
}

export async function POST() {
    return clear();
}

export async function GET() {
    return clear();
}
