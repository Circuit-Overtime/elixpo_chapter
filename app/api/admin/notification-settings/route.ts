export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "../../../../src/lib/admin-middleware";
import {
    getNotificationSettings,
    updateNotificationSettings,
} from "../../../../src/lib/admin-notifications";
import { getDatabase } from "../../../../src/lib/d1-client";

export async function GET(request: NextRequest) {
    const admin = await verifyAdminSession(request);
    if (!admin)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const db = await getDatabase();
    const settings = await getNotificationSettings(db);
    return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
    const admin = await verifyAdminSession(request);
    if (!admin)
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const db = await getDatabase();
    const body: any = await request.json();
    await updateNotificationSettings(db, body);
    const settings = await getNotificationSettings(db);
    return NextResponse.json(settings);
}
