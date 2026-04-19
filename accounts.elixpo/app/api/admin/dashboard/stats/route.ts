export const runtime = "edge";

import { type NextRequest, NextResponse } from "next/server";
import { verifyAdminSession } from "../../../../../src/lib/admin-middleware";
import { getDatabase } from "../../../../../src/lib/d1-client";
import {
    getAdminDashboardStats,
    getRequestTrend,
    getTopApps,
    listAdminUsers,
    listOAuthClients,
} from "../../../../../src/lib/db";
import { cacheGetOrSet } from "../../../../../src/lib/kv-cache";

export async function GET(request: NextRequest) {
    const session = await verifyAdminSession(request);

    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const timeRange = searchParams.get("range") || "7d";

        const daysBack =
            timeRange === "90d" ? 90 : timeRange === "30d" ? 30 : 7;

        const result = await cacheGetOrSet(
            `admin:stats:${timeRange}`,
            300,
            async () => {
                const db = await getDatabase();
                const [
                    stats,
                    requestTrend,
                    topApps,
                    recentUsersResult,
                    recentAppsResult,
                ] = await Promise.all([
                    getAdminDashboardStats(db, daysBack),
                    getRequestTrend(db, daysBack > 30 ? 30 : daysBack),
                    getTopApps(db, 5),
                    listAdminUsers(db, 5, 0),
                    listOAuthClients(db, 5, 0),
                ]);
                return {
                    ...stats,
                    requestTrend,
                    topApps,
                    recentUsers: recentUsersResult.results || [],
                    recentApps: recentAppsResult.results || [],
                };
            },
        );

        return NextResponse.json({
            ...result,
            lastUpdated: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Dashboard stats error:", error);
        return NextResponse.json(
            { error: "Failed to fetch dashboard stats" },
            { status: 500 },
        );
    }
}
