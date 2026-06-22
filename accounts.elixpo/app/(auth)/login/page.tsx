"use client";

import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import {
    Box,
    Button,
    Checkbox,
    FormControlLabel,
    IconButton,
    InputAdornment,
    TextField,
    Typography,
} from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const textFieldSx = {
    "& .MuiOutlinedInput-root": {
        color: "#f5f5f4",
        background: "transparent",
        "& fieldset": { borderColor: "rgba(255, 255, 255, 0.1)" },
        "&:hover fieldset": { borderColor: "rgba(255, 255, 255, 0.2)" },
        "&.Mui-focused fieldset": { borderColor: "#9b7bf7" },
        "& input:-webkit-autofill": {
            WebkitBoxShadow: "0 0 0 1000px transparent inset !important",
            WebkitTextFillColor: "#f5f5f4 !important",
            WebkitTransition: "background-color 5000s ease-in-out 0s",
        },
        "& input:-webkit-autofill:hover": {
            WebkitBoxShadow: "0 0 0 1000px transparent inset !important",
            WebkitTextFillColor: "#f5f5f4 !important",
        },
        "& input:-webkit-autofill:focus": {
            WebkitBoxShadow: "0 0 0 1000px transparent inset !important",
            WebkitTextFillColor: "#f5f5f4 !important",
        },
    },
    "& .MuiInputBase-input::placeholder": { color: "transparent", opacity: 0 },
    "& .MuiInputLabel-root": { color: "rgba(255, 255, 255, 0.7)" },
    "& .MuiInputLabel-root.Mui-focused": { color: "#9b7bf7" },
};

const LoginContent = () => {
    const searchParams = useSearchParams();
    const next = searchParams.get("next");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [rememberMe, setRememberMe] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [error, setError] = useState("");

    // Auto-redirect if already logged in (valid cookie session)
    useEffect(() => {
        const checkExistingSession = async () => {
            try {
                const res = await fetch("/api/auth/me", {
                    credentials: "include",
                });
                if (res.ok) {
                    const data: any = await res.json();
                    if (next) {
                        window.location.href = next;
                    } else if (!data.displayName) {
                        window.location.href = "/setup-name";
                    } else {
                        window.location.href = "/dashboard/oauth-apps";
                    }
                    return; // don't set checkingAuth to false — we're navigating away
                }
            } catch {
                // No valid session, show login form
            }
            setCheckingAuth(false);
        };
        checkExistingSession();
    }, [next]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    password,
                    provider: "email",
                    rememberMe,
                }),
            });

            const data: any = await res.json();

            if (!res.ok) {
                setError(data.error || "Login failed");
                return;
            }

            // MFA gate — credentials were valid but the user has 2FA
            // enabled on an untrusted device. The server returned an
            // mfaToken instead of auth tokens; bounce to /mfa to collect
            // the second factor. Pass availableMethods in the URL so the
            // challenge page can render only the buttons that actually
            // work, and forward any ?next= so the post-2FA redirect lands
            // in the right place.
            if (data.requiresMfa && data.mfaToken) {
                const params = new URLSearchParams({
                    token: data.mfaToken,
                });
                if (Array.isArray(data.availableMethods)) {
                    params.set("methods", data.availableMethods.join(","));
                }
                if (next) params.set("next", next);
                window.location.href = `/mfa?${params.toString()}`;
                return;
            }

            // If there's a ?next= param (e.g. from /oauth/authorize redirect), go there.
            // Otherwise fall back to the default dashboard.
            if (next) {
                window.location.href = next;
            } else if (data.needsDisplayName) {
                window.location.href = "/setup-name";
            } else {
                window.location.href = "/dashboard/oauth-apps";
            }
        } catch {
            setError("Network error, please try again");
        } finally {
            setLoading(false);
        }
    };

    const handleSSOLogin = (
        provider: "google" | "github" | "discord" | "microsoft",
    ) => {
        // Redirect through our backend so state cookie is set correctly before going to provider
        const url = `/api/auth/oauth/${provider}?mode=login${next ? `&next=${encodeURIComponent(next)}` : ""}`;
        window.location.href = url;
    };

    if (checkingAuth) {
        return (
            <Box
                sx={{
                    minHeight: "90vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "transparent",
                }}
            >
                <CircularProgress sx={{ color: "#9b7bf7" }} />
            </Box>
        );
    }

    return (
        <Box
            sx={{
                minHeight: "90vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "transparent",
                p: 2,
            }}
        >
            <Box
                sx={{
                    maxWidth: "900px",
                    width: "100%",
                    display: "flex",
                    gap: 2.5,
                    backdropFilter: "blur(20px)",
                    background:
                        "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "16px",
                    p: 3,
                    flexDirection: { xs: "column", md: "row" },
                }}
            >
                <Box
                    sx={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                    }}
                >
                    <Box sx={{ mb: 2, textAlign: "center" }}>
                        <Typography
                            variant="h4"
                            sx={{ fontWeight: 700, color: "#f5f5f4", mb: 0.5 }}
                        >
                            Welcome Back
                        </Typography>
                        <Typography
                            sx={{
                                color: "rgba(255, 255, 255, 0.5)",
                                fontSize: "0.95rem",
                            }}
                        >
                            Sign in to your SSO account
                        </Typography>
                    </Box>

                    <form onSubmit={handleSubmit}>
                        <TextField
                            fullWidth
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            margin="dense"
                            sx={textFieldSx}
                            required
                        />
                        <TextField
                            fullWidth
                            label="Password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            margin="dense"
                            sx={textFieldSx}
                            required
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            onClick={() =>
                                                setShowPassword(!showPassword)
                                            }
                                            edge="end"
                                            sx={{
                                                color: "rgba(255,255,255,0.4)",
                                            }}
                                        >
                                            {showPassword ? (
                                                <VisibilityOffIcon />
                                            ) : (
                                                <VisibilityIcon />
                                            )}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                mt: 1,
                                mb: 2,
                            }}
                        >
                            <FormControlLabel
                                control={
                                    <Checkbox
                                        checked={rememberMe}
                                        onChange={(e) =>
                                            setRememberMe(e.target.checked)
                                        }
                                        sx={{
                                            color: "rgba(255, 255, 255, 0.5)",
                                            "&.Mui-checked": {
                                                color: "#9b7bf7",
                                            },
                                        }}
                                    />
                                }
                                label={
                                    <Typography
                                        sx={{
                                            color: "rgba(255, 255, 255, 0.7)",
                                            fontSize: "0.9rem",
                                        }}
                                    >
                                        Remember me
                                    </Typography>
                                }
                            />
                            <Link
                                href="/forgot-password"
                                style={{
                                    color: "#9b7bf7",
                                    textDecoration: "none",
                                    fontSize: "0.9rem",
                                }}
                            >
                                Forgot?
                            </Link>
                        </Box>

                        {error && (
                            <Typography
                                sx={{
                                    color: "#f87171",
                                    fontSize: "0.85rem",
                                    mb: 1,
                                    textAlign: "center",
                                }}
                            >
                                {error}
                            </Typography>
                        )}

                        <Button
                            fullWidth
                            variant="contained"
                            type="submit"
                            disabled={loading}
                            sx={{
                                background: "rgba(155, 123, 247, 0.15)",
                                color: "#9b7bf7",
                                border: "1px solid rgba(155, 123, 247, 0.3)",
                                fontWeight: 600,
                                py: 1.5,
                                textTransform: "none",
                                fontSize: "1rem",
                                "&:hover": {
                                    background: "rgba(155, 123, 247, 0.25)",
                                    borderColor: "rgba(155, 123, 247, 0.5)",
                                },
                                "&:disabled": {
                                    color: "rgba(255, 255, 255, 0.4)",
                                    borderColor: "rgba(255, 255, 255, 0.1)",
                                },
                            }}
                        >
                            {loading ? "Signing in..." : "Sign in"}
                        </Button>
                    </form>

                    <Box
                        sx={{
                            mt: 2,
                            pt: 2,
                            borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                            textAlign: "center",
                        }}
                    >
                        <Typography
                            sx={{ color: "rgba(255, 255, 255, 0.7)", mb: 1 }}
                        >
                            Don't have an account?
                        </Typography>
                        <Link
                            href={
                                next
                                    ? `/register?next=${encodeURIComponent(next)}`
                                    : "/register"
                            }
                            style={{
                                color: "#9b7bf7",
                                textDecoration: "none",
                                fontWeight: 600,
                            }}
                        >
                            Create account
                        </Link>
                    </Box>
                </Box>

                <Box
                    sx={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        paddingLeft: { xs: 0, md: 3 },
                        borderLeft: {
                            xs: "none",
                            md: "1px solid rgba(255, 255, 255, 0.1)",
                        },
                        paddingTop: { xs: 2, md: 0 },
                        borderTop: {
                            xs: "1px solid rgba(255, 255, 255, 0.1)",
                            md: "none",
                        },
                    }}
                >
                    <Box sx={{ mb: 2, textAlign: "center" }}>
                        <Typography
                            sx={{
                                color: "rgba(255, 255, 255, 0.5)",
                                fontSize: "0.9rem",
                            }}
                        >
                            Or continue with
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1.5,
                        }}
                    >
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => handleSSOLogin("google")}
                            sx={{
                                color: "#f5f5f4",
                                borderColor: "rgba(255, 255, 255, 0.2)",
                                "&:hover": {
                                    borderColor: "rgba(255, 255, 255, 0.4)",
                                    backgroundColor:
                                        "rgba(255, 255, 255, 0.05)",
                                },
                                py: 1,
                                textTransform: "none",
                                fontSize: "0.95rem",
                                fontWeight: 500,
                            }}
                        >
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                }}
                            >
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path
                                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        fill="#4285F4"
                                    />
                                    <path
                                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        fill="#34A853"
                                    />
                                    <path
                                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        fill="#FBBC05"
                                    />
                                    <path
                                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        fill="#EA4335"
                                    />
                                </svg>
                                Sign in with Google
                            </Box>
                        </Button>
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => handleSSOLogin("github")}
                            sx={{
                                color: "#f5f5f4",
                                borderColor: "rgba(255, 255, 255, 0.2)",
                                "&:hover": {
                                    borderColor: "rgba(255, 255, 255, 0.4)",
                                    backgroundColor:
                                        "rgba(255, 255, 255, 0.05)",
                                },
                                py: 1,
                                textTransform: "none",
                                fontSize: "0.95rem",
                                fontWeight: 500,
                            }}
                        >
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                }}
                            >
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                                </svg>
                                Sign in with GitHub
                            </Box>
                        </Button>
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => handleSSOLogin("discord")}
                            sx={{
                                color: "#f5f5f4",
                                borderColor: "rgba(255, 255, 255, 0.2)",
                                "&:hover": {
                                    borderColor: "rgba(255, 255, 255, 0.4)",
                                    backgroundColor:
                                        "rgba(255, 255, 255, 0.05)",
                                },
                                py: 1,
                                textTransform: "none",
                                fontSize: "0.95rem",
                                fontWeight: 500,
                            }}
                        >
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                }}
                            >
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 24 24"
                                    fill="#5865F2"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.956 2.42-2.157 2.42zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.21 0 2.176 1.094 2.157 2.418 0 1.334-.946 2.42-2.157 2.42z" />
                                </svg>
                                Sign in with Discord
                            </Box>
                        </Button>
                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => handleSSOLogin("microsoft")}
                            sx={{
                                color: "#f5f5f4",
                                borderColor: "rgba(255, 255, 255, 0.2)",
                                "&:hover": {
                                    borderColor: "rgba(255, 255, 255, 0.4)",
                                    backgroundColor:
                                        "rgba(255, 255, 255, 0.05)",
                                },
                                py: 1,
                                textTransform: "none",
                                fontSize: "0.95rem",
                                fontWeight: 500,
                            }}
                        >
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                }}
                            >
                                <svg
                                    width="20"
                                    height="20"
                                    viewBox="0 0 23 23"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path d="M0 0h11v11H0z" fill="#F25022" />
                                    <path d="M12 0h11v11H12z" fill="#7FBA00" />
                                    <path d="M0 12h11v11H0z" fill="#00A4EF" />
                                    <path d="M12 12h11v11H12z" fill="#FFB900" />
                                </svg>
                                Sign in with Microsoft
                            </Box>
                        </Button>
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

const LoginPage = () => (
    <Suspense>
        <LoginContent />
    </Suspense>
);

export default LoginPage;
