export const runtime = "edge";

import LockIcon from "@mui/icons-material/Lock";
import { Box, Chip, Stack, Typography } from "@mui/material";
import { PageHeader } from "../../components/dashboard-ui";
import DriveConnectionCard from "../../components/drive-connection-card";
import { GlassCard } from "../../components/glass-card";
import WorkspaceNameForm from "../../components/workspace-name-form";
import { getDatabase } from "@/lib/d1-client";
import { requireDashboardSession } from "@/lib/dashboard-session";
import { getTenant } from "@/lib/tenant";

const TEXT = "#f5f5f4";
const TEXT_55 = "rgba(245,245,244,0.55)";
const BORDER = "rgba(255,255,255,0.07)";

function ReadOnlyField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
    return (
        <Box>
            <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "rgba(245,245,244,0.4)", mb: 0.7 }}>
                {label}
            </Typography>
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    px: 1.6,
                    py: 1.15,
                    borderRadius: "10px",
                    border: `1px solid ${BORDER}`,
                    background: "rgba(255,255,255,0.02)",
                }}
            >
                <Typography
                    sx={{
                        fontSize: "0.92rem",
                        color: value ? "rgba(245,245,244,0.85)" : "rgba(245,245,244,0.4)",
                        fontFamily: mono ? "var(--font-geist-mono)" : undefined,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                    }}
                >
                    {value || "—"}
                </Typography>
                <LockIcon sx={{ fontSize: 15, color: "rgba(245,245,244,0.3)", flexShrink: 0 }} />
            </Box>
        </Box>
    );
}

export default async function SettingsPage() {
    const session = await requireDashboardSession();

    let workspaceName = "";
    try {
        const db = await getDatabase();
        const tenant = await getTenant(db, session.tenantId);
        workspaceName = tenant?.name || "";
    } catch {
        workspaceName = "";
    }

    return (
        <Box>
            <PageHeader
                title="Settings"
                description="Manage your workspace and review the identity synced from Elixpo Accounts."
            />

            <Stack spacing={2.5} sx={{ maxWidth: 720 }}>
                {/* Workspace — editable */}
                <GlassCard>
                    <Typography sx={{ fontWeight: 700, fontSize: "1.05rem", color: TEXT, mb: 0.4 }}>
                        Workspace
                    </Typography>
                    <Typography sx={{ color: TEXT_55, fontSize: "0.88rem", mb: 2.5 }}>
                        Your business name across mail.elixpo. The workspace ID is a fixed
                        internal identifier and can&rsquo;t be changed.
                    </Typography>

                    <WorkspaceNameForm initialName={workspaceName} />

                    <Box sx={{ mt: 2.5 }}>
                        <ReadOnlyField label="Workspace ID" value={session.tenantId} mono />
                    </Box>
                </GlassCard>

                {/* Account identity — read-only from Accounts */}
                <GlassCard>
                    <Typography sx={{ fontWeight: 700, fontSize: "1.05rem", color: TEXT, mb: 0.4 }}>
                        Account identity
                    </Typography>
                    <Typography sx={{ color: TEXT_55, fontSize: "0.88rem", mb: 2.5 }}>
                        Read-only — synced from your Elixpo Accounts profile.
                    </Typography>
                    <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" } }}>
                        <ReadOnlyField label="Name" value={session.name || ""} />
                        <ReadOnlyField label="Email" value={session.email} />
                        <ReadOnlyField label="Account ID" value={session.uid} mono />
                    </Box>
                </GlassCard>

                {/* Connections — Google Drive for attachments */}
                <DriveConnectionCard />

                {/* Future preferences */}
                <GlassCard>
                    <Stack direction="row" alignItems="center" spacing={1.2} sx={{ mb: 0.4 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: "1.05rem", color: TEXT }}>
                            Workspace preferences
                        </Typography>
                        <Chip
                            label="Coming soon"
                            size="small"
                            sx={{ height: 20, fontSize: "0.62rem", fontWeight: 700, color: "rgba(245,245,244,0.5)", bgcolor: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}` }}
                        />
                    </Stack>
                    <Typography sx={{ color: TEXT_55, fontSize: "0.88rem" }}>
                        Default sender, secret rotation policy, log retention, and team access will be configurable here.
                    </Typography>
                </GlassCard>
            </Stack>
        </Box>
    );
}
