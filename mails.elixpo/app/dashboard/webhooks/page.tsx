export const runtime = "edge";

import { Box } from "@mui/material";
import { PageHeader } from "../../components/dashboard-ui";
import WebhooksManager from "../../components/webhooks-manager";
import { requireDashboardSession } from "@/lib/dashboard-session";

export default async function WebhooksPage() {
    await requireDashboardSession();
    return (
        <Box>
            <PageHeader
                title="Webhooks"
                description="Create named, signed trigger endpoints on your templates and call them from your stack to send."
            />
            <WebhooksManager />
        </Box>
    );
}
