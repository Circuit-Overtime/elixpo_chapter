import { Box, Button, Stack, Typography } from "@mui/material";
import Image from "next/image";
import Link from "next/link";

const ACCENT = "#9b7bf7";

const PRIMARY = {
    textTransform: "none" as const,
    fontWeight: 700,
    fontSize: "0.92rem",
    color: "#fff",
    px: 2.8,
    py: 1.1,
    borderRadius: "11px",
    background: "linear-gradient(135deg, #9b7bf7 0%, #7c5cff 100%)",
    boxShadow: "0 8px 24px rgba(124,92,255,0.35)",
    "&:hover": { background: "linear-gradient(135deg, #b094ff 0%, #8a6dff 100%)" },
};
const GHOST = {
    textTransform: "none" as const,
    fontWeight: 600,
    fontSize: "0.9rem",
    color: "#f5f5f4",
    px: 2.6,
    py: 1.1,
    borderRadius: "11px",
    border: "1px solid rgba(255,255,255,0.16)",
    "&:hover": { borderColor: "rgba(155,123,247,0.5)", background: "rgba(155,123,247,0.06)" },
};

export default function NotFound() {
    return (
        <Box
            sx={{
                minHeight: "100vh",
                display: "grid",
                placeItems: "center",
                px: 3,
                color: "#f5f5f4",
            }}
        >
            <Stack alignItems="center" textAlign="center" spacing={3} sx={{ maxWidth: 460 }}>
                <Image
                    src="/logo.png"
                    alt="Elixpo Mails"
                    width={52}
                    height={52}
                    style={{ borderRadius: 12 }}
                />
                <Box>
                    <Typography
                        sx={{
                            fontWeight: 900,
                            fontSize: { xs: "4.5rem", md: "6rem" },
                            lineHeight: 1,
                            letterSpacing: "-0.04em",
                            background: "linear-gradient(135deg, #f5f5f4 0%, #9b7bf7 120%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                        }}
                    >
                        404
                    </Typography>
                    <Typography
                        sx={{
                            fontWeight: 800,
                            fontSize: "1.4rem",
                            mt: 1,
                            letterSpacing: "-0.01em",
                        }}
                    >
                        Lost in the outbox
                    </Typography>
                    <Typography
                        sx={{
                            color: "rgba(245,245,244,0.55)",
                            fontSize: "0.98rem",
                            mt: 1,
                            lineHeight: 1.6,
                        }}
                    >
                        This page didn&rsquo;t make it to the inbox. The link may be broken or the
                        page may have moved.
                    </Typography>
                </Box>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <Button component={Link} href="/" sx={PRIMARY}>
                        Back home
                    </Button>
                    <Button component={Link} href="/docs" sx={GHOST}>
                        Read the docs
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
}
