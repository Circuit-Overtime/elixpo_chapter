"use client";

import {
    Delete,
    Lock,
    LockOpen,
    MoreVert,
    Search,
    Shield,
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
import { useUsers } from "../../../src/lib/hooks/useAdminData";

export default function UsersPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
    const [actionDialogOpen, setActionDialogOpen] = useState(false);
    const [currentAction, setCurrentAction] = useState<string | null>(null);
    const [suspendReason, setSuspendReason] = useState("");
    const [actionLoading, setActionLoading] = useState(false);
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteLoading, setInviteLoading] = useState(false);
    const [toast, setToast] = useState<{
        open: boolean;
        message: string;
        severity: "success" | "error";
    }>({ open: false, message: "", severity: "success" });
    const { data, loading, error, refetch } = useUsers(page, search);

    const handleMenuOpen = (
        event: React.MouseEvent<HTMLElement>,
        userId: string,
    ) => {
        setAnchorEl(event.currentTarget);
        setSelectedUserId(userId);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
    };

    const handleActionClick = (action: string) => {
        setCurrentAction(action);
        setSuspendReason("");
        setActionDialogOpen(true);
        handleMenuClose();
    };

    const selectedUser = data?.users.find((u) => u.id === selectedUserId);

    const handleConfirmAction = async () => {
        setActionLoading(true);
        try {
            const response = await fetch("/api/admin/users", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    userId: selectedUserId,
                    action: currentAction,
                    ...(currentAction === "suspend" && suspendReason
                        ? { reason: suspendReason }
                        : {}),
                }),
            });

            const result: any = await response.json();

            if (response.ok) {
                setToast({
                    open: true,
                    message: result.message || "Action completed",
                    severity: "success",
                });
                setActionDialogOpen(false);
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

    const handleInviteAdmin = async () => {
        if (!inviteEmail || !inviteEmail.includes("@")) {
            setToast({
                open: true,
                message: "Please enter a valid email",
                severity: "error",
            });
            return;
        }
        setInviteLoading(true);
        try {
            const res = await fetch("/api/admin/invite", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ email: inviteEmail }),
            });
            const result: any = await res.json();
            if (res.ok) {
                setToast({
                    open: true,
                    message: result.message || "Invitation sent",
                    severity: "success",
                });
                setInviteDialogOpen(false);
                setInviteEmail("");
            } else {
                setToast({
                    open: true,
                    message: result.error || "Failed to send invite",
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
            setInviteLoading(false);
        }
    };

    if (error) {
        return (
            <Box sx={{ color: "#ef4444" }}>
                <Typography variant="h6">Error loading users</Typography>
                <Typography variant="body2">{error}</Typography>
            </Box>
        );
    }

    const getActionTitle = (action: string | null) => {
        switch (action) {
            case "toggle_admin":
                return "Toggle Admin Status";
            case "suspend":
                return "Suspend User";
            case "activate":
                return "Activate User";
            case "delete":
                return "Delete User";
            default:
                return "Confirm Action";
        }
    };

    const getActionMessage = (action: string | null) => {
        switch (action) {
            case "toggle_admin":
                return "This will change the admin status for this user.";
            case "suspend":
                return "The user account will be suspended and they will receive a notification email.";
            case "activate":
                return "The user account will be reactivated.";
            case "delete":
                return "This will permanently delete the user and all their data (OAuth apps, tokens, identities). This action cannot be undone.";
            default:
                return "Are you sure?";
        }
    };

    return (
        <Box>
            <Box
                sx={{
                    mb: 3,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                }}
            >
                <Box>
                    <Typography
                        variant="h5"
                        sx={{ fontWeight: 700, color: "#fff", mb: 0.5 }}
                    >
                        Users Management
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#9ca3af" }}>
                        Manage user accounts and permissions
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    onClick={() => setInviteDialogOpen(true)}
                    sx={{
                        color: "#22c55e",
                        borderColor: "#22c55e",
                        textTransform: "none",
                        fontWeight: 600,
                        "&:hover": {
                            borderColor: "#16a34a",
                            bgcolor: "rgba(34, 197, 94, 0.1)",
                        },
                    }}
                >
                    Invite Admin
                </Button>
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
                        placeholder="Search by email..."
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
                                        Email
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
                                        Role
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            color: "#9ca3af",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Verified
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            color: "#9ca3af",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Apps
                                    </TableCell>
                                    <TableCell
                                        sx={{
                                            color: "#9ca3af",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Last Login
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
                                {data?.users.map((user) => (
                                    <TableRow
                                        key={user.id}
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
                                                    {user.email}
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    sx={{ color: "#6b7280" }}
                                                >
                                                    {user.id}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={
                                                    user.isActive
                                                        ? "Active"
                                                        : "Suspended"
                                                }
                                                size="small"
                                                sx={{
                                                    bgcolor: user.isActive
                                                        ? "rgba(34, 197, 94, 0.2)"
                                                        : "rgba(239, 68, 68, 0.2)",
                                                    color: user.isActive
                                                        ? "#22c55e"
                                                        : "#ef4444",
                                                    fontWeight: 600,
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                icon={
                                                    user.isAdmin ? (
                                                        <Shield />
                                                    ) : undefined
                                                }
                                                label={
                                                    user.isAdmin
                                                        ? "Admin"
                                                        : "User"
                                                }
                                                size="small"
                                                sx={{
                                                    bgcolor: user.isAdmin
                                                        ? "rgba(59, 130, 246, 0.2)"
                                                        : "rgba(107, 114, 128, 0.2)",
                                                    color: user.isAdmin
                                                        ? "#3b82f6"
                                                        : "#9ca3af",
                                                    fontWeight: 600,
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={
                                                    user.emailVerified
                                                        ? "Verified"
                                                        : "Unverified"
                                                }
                                                size="small"
                                                variant="outlined"
                                                sx={{
                                                    borderColor:
                                                        user.emailVerified
                                                            ? "#22c55e"
                                                            : "#6b7280",
                                                    color: user.emailVerified
                                                        ? "#22c55e"
                                                        : "#9ca3af",
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell sx={{ color: "#e5e7eb" }}>
                                            {user.appsCount}
                                        </TableCell>
                                        <TableCell sx={{ color: "#9ca3af" }}>
                                            {user.lastLogin
                                                ? new Date(
                                                      user.lastLogin,
                                                  ).toLocaleDateString()
                                                : "Never"}
                                        </TableCell>
                                        <TableCell>
                                            <IconButton
                                                size="small"
                                                onClick={(e) =>
                                                    handleMenuOpen(e, user.id)
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
                <MenuItem onClick={() => handleActionClick("toggle_admin")}>
                    <Shield fontSize="small" sx={{ mr: 1 }} />
                    {selectedUser?.isAdmin ? "Remove Admin" : "Make Admin"}
                </MenuItem>
                {selectedUser?.isActive ? (
                    <MenuItem onClick={() => handleActionClick("suspend")}>
                        <Lock fontSize="small" sx={{ mr: 1 }} />
                        Suspend
                    </MenuItem>
                ) : (
                    <MenuItem onClick={() => handleActionClick("activate")}>
                        <LockOpen fontSize="small" sx={{ mr: 1 }} />
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

            {/* Action Confirmation Dialog */}
            <Dialog
                open={actionDialogOpen}
                onClose={() => setActionDialogOpen(false)}
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
                <DialogTitle>{getActionTitle(currentAction)}</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1 }}>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            {getActionMessage(currentAction)}
                        </Typography>
                        {currentAction === "suspend" && (
                            <TextField
                                fullWidth
                                label="Reason (optional, included in email)"
                                value={suspendReason}
                                onChange={(e) =>
                                    setSuspendReason(e.target.value)
                                }
                                multiline
                                rows={2}
                                sx={{
                                    mt: 1,
                                    "& .MuiOutlinedInput-root": {
                                        color: "#e5e7eb",
                                        "& fieldset": {
                                            borderColor: "#3a4a3e",
                                        },
                                    },
                                    "& .MuiInputLabel-root": {
                                        color: "#6b7280",
                                    },
                                }}
                            />
                        )}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setActionDialogOpen(false)}
                        sx={{ color: "#9ca3af" }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirmAction}
                        disabled={actionLoading}
                        sx={{
                            color:
                                currentAction === "delete"
                                    ? "#ef4444"
                                    : "#22c55e",
                            fontWeight: 600,
                        }}
                    >
                        {actionLoading ? "Processing..." : "Confirm"}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Invite Admin Dialog */}
            <Dialog
                open={inviteDialogOpen}
                onClose={() => setInviteDialogOpen(false)}
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
                <DialogTitle>Invite Admin</DialogTitle>
                <DialogContent>
                    <Box sx={{ pt: 1 }}>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            Send an admin invitation email. The recipient must
                            have or create an account with this email to accept.
                        </Typography>
                        <TextField
                            fullWidth
                            label="Email address"
                            type="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            sx={{
                                mt: 1,
                                "& .MuiOutlinedInput-root": {
                                    color: "#e5e7eb",
                                    "& fieldset": { borderColor: "#3a4a3e" },
                                    "&:hover fieldset": {
                                        borderColor: "#22c55e",
                                    },
                                },
                                "& .MuiInputLabel-root": { color: "#6b7280" },
                            }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={() => setInviteDialogOpen(false)}
                        sx={{ color: "#9ca3af" }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleInviteAdmin}
                        disabled={inviteLoading}
                        sx={{ color: "#22c55e", fontWeight: 600 }}
                    >
                        {inviteLoading ? "Sending..." : "Send Invite"}
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
