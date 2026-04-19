"use client";

import {
    Delete,
    MoreVert,
    Pause,
    PlayArrow,
    Search,
} from "@mui/icons-material";
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    InputAdornment,
    Menu,
    MenuItem,
    Snackbar,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import type React from "react";
import { useState } from "react";
import { useApps } from "../../../src/lib/hooks/useAdminData";

export default function AppsPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedApp, setSelectedApp] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [dialogAction, setDialogAction] = useState<
        "suspend" | "activate" | "delete" | null
    >(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [toast, setToast] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error";
    }>({ open: false, message: "", severity: "success" });
    const { data, loading, error, refetch } = useApps(page, search);

    const handleMenuOpen = (
        event: React.MouseEvent<HTMLElement>,
        appId: string,
    ) => {
        setAnchorEl(event.currentTarget);
        setSelectedApp(appId);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleActionClick = (action: "suspend" | "activate" | "delete") => {
        setDialogAction(action);
        setDialogOpen(true);
        handleMenuClose();
    };

    const selectedAppData = data?.apps.find((a) => a.id === selectedApp);

    const handleConfirmAction = async () => {
        if (!selectedApp || !dialogAction) return;
        setActionLoading(true);
        try {
            let res: Response;
            if (dialogAction === "delete") {
                res = await fetch("/api/admin/apps", {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({ appId: selectedApp }),
                });
            } else {
                res = await fetch("/api/admin/apps", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        appId: selectedApp,
                        action: dialogAction,
                    }),
                });
            }

            const result: any = await res.json();

            if (res.ok) {
                setToast({
                    open: true,
                    message: result.message || "Action completed",
                    severity: "success",
                });
                setDialogOpen(false);
                refetch();
            } else {
                setToast({
                    open: true,
                    message: result.error || "Action failed",
                    severity: "error",
                });
            }
        } catch {
            setToast({
                open: true,
                message: "Network error",
                severity: "error",
            });
        } finally {
            setActionLoading(false);
        }
    };

    const getDialogTitle = () => {
        switch (dialogAction) {
            case "suspend":
                return "Suspend Application";
            case "activate":
                return "Activate Application";
            case "delete":
                return "Delete Application";
            default:
                return "Confirm Action";
        }
    };

    const getDialogMessage = () => {
        switch (dialogAction) {
            case "suspend":
                return "This will suspend the application. It will no longer be able to process OAuth requests.";
            case "activate":
                return "This will reactivate the application.";
            case "delete":
                return "This will permanently delete the application and all associated data. This action cannot be undone.";
            default:
                return "Are you sure?";
        }
    };

    if (error) {
        return (
            <Box sx={{ color: "#ef4444" }}>
                <Typography variant="h6">Error loading applications</Typography>
                <Typography variant="body2">{error}</Typography>
            </Box>
        );
    }

    return (
        <Box>
            <Box sx={{ mb: 3 }}>
                <Typography
                    variant="h5"
                    sx={{ fontWeight: 700, color: "#fff", mb: 0.5 }}
                >
                    Applications
                </Typography>
                <Typography variant="body2" sx={{ color: "#9ca3af" }}>
                    Manage all registered OAuth applications
                </Typography>
            </Box>

            <Card
                sx={{
                    bgcolor: "#1e2420",
                    border: "1px solid #333",
                    borderRadius: "12px",
                    mb: 3,
                }}
            >
                <CardContent>
                    <TextField
                        placeholder="Search apps or owner email..."
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                        fullWidth
                        variant="outlined"
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Search sx={{ color: "#6b7280", mr: 1 }} />
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            "& .MuiOutlinedInput-root": {
                                color: "#e5e7eb",
                                "& fieldset": { borderColor: "#3a4a3e" },
                                "&:hover fieldset": { borderColor: "#22c55e" },
                            },
                            "& .MuiOutlinedInput-input::placeholder": {
                                color: "#6b7280",
                                opacity: 1,
                            },
                        }}
                    />
                </CardContent>
            </Card>

            <Card
                sx={{
                    bgcolor: "#1e2420",
                    border: "1px solid #333",
                    borderRadius: "12px",
                    overflow: "hidden",
                }}
            >
                {loading ? (
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            minHeight: "300px",
                        }}
                    >
                        <CircularProgress sx={{ color: "#22c55e" }} />
                    </Box>
                ) : (
                    <Box sx={{ overflowX: "auto" }}>
                        <Table>
                            <TableHead>
                                <TableRow
                                    sx={{
                                        bgcolor: "#1a201c",
                                        borderBottom: "1px solid #333",
                                    }}
                                >
                                    <TableCell
                                        sx={{
                                            color: "#9ca3af",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Application Name
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            color: "#9ca3af",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Owner
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            color: "#9ca3af",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Status
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            color: "#9ca3af",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Requests
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            color: "#9ca3af",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Created
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            color: "#9ca3af",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Actions
                                    </TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data?.apps.map((app) => (
                                    <TableRow
                                        key={app.id}
                                        sx={{
                                            borderBottom: "1px solid #333",
                                            "&:hover": {
                                                bgcolor:
                                                    "rgba(34, 197, 94, 0.05)",
                                            },
                                        }}
                                    >
                                        <TableCell sx={{ color: "#e5e7eb" }}>
                                            <Box>
                                                <Typography
                                                    variant="body2"
                                                    sx={{ fontWeight: 600 }}
                                                >
                                                    {app.name}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    sx={{ color: "#6b7280" }}
                                                >
                                                    {app.id}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell sx={{ color: "#9ca3af" }}>
                                            {app.owner.email}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={app.status}
                                                size="small"
                                                sx={{
                                                    bgcolor:
                                                        app.status === "active"
                                                            ? "rgba(34, 197, 94, 0.2)"
                                                            : "rgba(239, 68, 68, 0.2)",
                                                    color:
                                                        app.status === "active"
                                                            ? "#22c55e"
                                                            : "#ef4444",
                                                    fontWeight: 600,
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ color: "#e5e7eb" }}>
                                            {app.requests >= 1000
                                                ? `${(app.requests / 1000).toFixed(1)}K`
                                                : app.requests}
                                        </TableCell>
                                        <TableCell sx={{ color: "#9ca3af" }}>
                                            {new Date(
                                                app.createdAt,
                                            ).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <IconButton
                                                size="small"
                                                onClick={(e) =>
                                                    handleMenuOpen(e, app.id)
                                                }
                                                sx={{ color: "#9ca3af" }}
                                            >
                                                <MoreVert fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Box>
                )}
            </Card>

            {/* Pagination */}
            {data && data.pagination.pages > 1 && (
                <Box
                    sx={{
                        display: "flex",
                        justifyContent: "center",
                        gap: 1,
                        mt: 2,
                    }}
                >
                    <Button
                        disabled={page <= 1}
                        onClick={() => setPage(page - 1)}
                        sx={{ color: "#9ca3af", textTransform: "none" }}
                    >
                        Previous
                    </Button>
                    <Typography
                        sx={{
                            color: "#9ca3af",
                            alignSelf: "center",
                            fontSize: "0.9rem",
                        }}
                    >
                        Page {page} of {data.pagination.pages}
                    </Typography>
                    <Button
                        disabled={page >= data.pagination.pages}
                        onClick={() => setPage(page + 1)}
                        sx={{ color: "#9ca3af", textTransform: "none" }}
                    >
                        Next
                    </Button>
                </Box>
            )}

            {/* Context Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                slotProps={{
                    paper: {
                        sx: {
                            bgcolor: "#1e2420",
                            border: "1px solid #333",
                            "& .MuiMenuItem-root": {
                                color: "#e5e7eb",
                                fontSize: "0.9rem",
                                "&:hover": {
                                    bgcolor: "rgba(34, 197, 94, 0.1)",
                                },
                            },
                        },
                    },
                }}
            >
                {selectedAppData?.status === "active" ? (
                    <MenuItem onClick={() => handleActionClick("suspend")}>
                        <Pause fontSize="small" sx={{ mr: 1 }} />
                        Suspend
                    </MenuItem>
                ) : (
                    <MenuItem onClick={() => handleActionClick("activate")}>
                        <PlayArrow fontSize="small" sx={{ mr: 1 }} />
                        Activate
                    </MenuItem>
                )}
                <MenuItem
                    onClick={() => handleActionClick("delete")}
                    sx={{
                        "&.MuiMenuItem-root": { color: "#ef4444 !important" },
                    }}
                >
                    <Delete fontSize="small" sx={{ mr: 1 }} />
                    Delete
                </MenuItem>
            </Menu>

            {/* Confirmation Dialog */}
            <Dialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
                slotProps={{
                    paper: {
                        sx: {
                            bgcolor: "#1e2420",
                            border: "1px solid #333",
                            minWidth: 400,
                            "& .MuiDialogTitle-root": {
                                color: "#fff",
                                fontWeight: 600,
                            },
                            "& .MuiDialogContent-root": { color: "#9ca3af" },
                        },
                    },
                }}
            >
                <DialogTitle>{getDialogTitle()}</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1 }}>{getDialogMessage()}</Box>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setDialogOpen(false)}
                        sx={{ color: "#9ca3af" }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmAction}
                        disabled={actionLoading}
                        sx={{
                            color:
                                dialogAction === "delete"
                                    ? "#ef4444"
                                    : "#22c55e",
                            fontWeight: 600,
                        }}
                    >
                        {actionLoading ? "Processing..." : "Confirm"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Toast */}
            <Snackbar
                open={toast.open}
                autoHideDuration={4000}
                onClose={() => setToast({ ...toast, open: false })}
                anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
            >
                <Alert
                    severity={toast.severity}
                    onClose={() => setToast({ ...toast, open: false })}
                    sx={{ width: "100%" }}
                >
                    {toast.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}
