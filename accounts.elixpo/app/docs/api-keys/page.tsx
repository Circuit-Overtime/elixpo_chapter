"use client";

import {
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import CodeBlock from "../../components/code-block";

const API_KEY_HEADER = `GET https://accounts.elixpo.com/api/auth/me
Authorization: Bearer elx_live_9b7bf7c2866eee9d3e488297`;

export default function ApiKeysDocsPage() {
    return (
        <Box>
            <Typography
                variant="h1"
                sx={{
                    fontSize: "2rem",
                    fontWeight: 800,
                    color: "#fff",
                    mb: 2,
                    letterSpacing: "-0.02em",
                }}
            >
                API Keys
            </Typography>
            <Typography
                sx={{
                    color: "rgba(255, 255, 255, 0.7)",
                    mb: 4,
                    fontSize: "1rem",
                    lineHeight: 1.7,
                }}
            >
                API keys are designed for machine-to-machine communications,
                automation scripts, and server-side utilities. They grant direct
                access to resources without requiring user interaction or
                browser login flows.
            </Typography>

            <Typography
                variant="h2"
                sx={{
                    fontSize: "1.4rem",
                    fontWeight: 700,
                    color: "#fff",
                    mt: 4,
                    mb: 2,
                    letterSpacing: "-0.01em",
                }}
            >
                How to Use
            </Typography>
            <Typography
                sx={{
                    color: "rgba(255, 255, 255, 0.7)",
                    mb: 2,
                    lineHeight: 1.6,
                }}
            >
                Include your API key as a Bearer token in the{" "}
                <code>Authorization</code> header of your HTTP requests.
            </Typography>
            <CodeBlock code={API_KEY_HEADER} language="http" />

            <Typography
                variant="h2"
                sx={{
                    fontSize: "1.4rem",
                    fontWeight: 700,
                    color: "#fff",
                    mt: 4,
                    mb: 2,
                    letterSpacing: "-0.01em",
                }}
            >
                Scopes Reference
            </Typography>
            <Typography
                sx={{
                    color: "rgba(255, 255, 255, 0.7)",
                    mb: 3,
                    lineHeight: 1.6,
                }}
            >
                When generating a key in the Developer Portal, you must select
                the granular permissions (scopes) it is allowed to execute:
            </Typography>
            <TableContainer
                sx={{
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "8px",
                    mb: 4,
                    background: "rgba(255, 255, 255, 0.01)",
                }}
            >
                <Table size="small">
                    <TableHead sx={{ bgcolor: "rgba(255, 255, 255, 0.02)" }}>
                        <TableRow>
                            <TableCell
                                sx={{
                                    color: "#9ca3af",
                                    fontWeight: 600,
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                Scope Name
                            </TableCell>
                            <TableCell
                                sx={{
                                    color: "#9ca3af",
                                    fontWeight: 600,
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                Permissions Granted
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        <TableRow>
                            <TableCell
                                sx={{
                                    color: "#fff",
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                <code>users:read</code>
                            </TableCell>
                            <TableCell
                                sx={{
                                    color: "rgba(255, 255, 255, 0.7)",
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                Allows querying and searching user profiles and
                                status.
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell
                                sx={{
                                    color: "#fff",
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                <code>users:write</code>
                            </TableCell>
                            <TableCell
                                sx={{
                                    color: "rgba(255, 255, 255, 0.7)",
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                Allows creating users, editing roles, or
                                suspending/deactivating users.
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell
                                sx={{
                                    color: "#fff",
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                <code>apps:read</code>
                            </TableCell>
                            <TableCell
                                sx={{
                                    color: "rgba(255, 255, 255, 0.7)",
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                Allows reading developer OAuth client
                                registrations.
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell
                                sx={{
                                    color: "#fff",
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                <code>apps:write</code>
                            </TableCell>
                            <TableCell
                                sx={{
                                    color: "rgba(255, 255, 255, 0.7)",
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                Allows registering, modifying, or deleting OAuth
                                clients.
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell
                                sx={{
                                    color: "#fff",
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                <code>webhooks:read</code> / <code>write</code>
                            </TableCell>
                            <TableCell
                                sx={{
                                    color: "rgba(255, 255, 255, 0.7)",
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                Allows managing webhook subscriptions and
                                reading logs.
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell
                                sx={{
                                    color: "#fff",
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                <code>admin:read</code> / <code>write</code>
                            </TableCell>
                            <TableCell
                                sx={{
                                    color: "rgba(255, 255, 255, 0.7)",
                                    borderBottom:
                                        "1px solid rgba(255, 255, 255, 0.08)",
                                }}
                            >
                                Grants access to admin panels, audit logs, and
                                general settings.
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>

            <Typography
                variant="h2"
                sx={{
                    fontSize: "1.4rem",
                    fontWeight: 700,
                    color: "#fff",
                    mt: 4,
                    mb: 2,
                    letterSpacing: "-0.01em",
                }}
            >
                Security Guidelines
            </Typography>
            <Typography
                sx={{
                    color: "rgba(255, 255, 255, 0.7)",
                    mb: 2,
                    lineHeight: 1.6,
                }}
            >
                API keys prefix with <code>elx_live_</code>. Never check API
                keys into version control (git). If a key is accidentally
                exposed, revoke it immediately from the Developer Dashboard to
                prevent unauthorized access.
            </Typography>
        </Box>
    );
}
