export const runtime = "edge";

import { Box, Container } from "@mui/material";
import type React from "react";
import DashboardTopbar, { type DashboardUser } from "../components/dashboard-topbar";
import { requireDashboardSession } from "@/lib/dashboard-session";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const session = await requireDashboardSession();

    const user: DashboardUser = {
        name: session.name || "",
        email: session.email,
        avatar: session.avatar ?? null,
        tenantId: session.tenantId,
    };

    return (
        <Box sx={{ position: "relative", minHeight: "100vh", color: "#f5f5f4" }}>
            {/* Aurora background is global (root layout). Top nav, full-width content. */}
            <DashboardTopbar user={user} />
            <Box component="main">
                <Container maxWidth="lg" sx={{ py: { xs: 3.5, md: 5 }, px: { xs: 2, md: 3 } }}>
                    {children}
                </Container>
            </Box>
        </Box>
    );
}
