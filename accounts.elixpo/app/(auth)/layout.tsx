import { Box } from "@mui/material";
import BackgroundAurora from "../components/background-aurora";
import Navbar from "../components/navbar";

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Box sx={{ position: "relative", minHeight: "100vh" }}>
            <BackgroundAurora variant="auth" />
            <Box sx={{ position: "relative", zIndex: 1 }}>
                <Navbar />
                {children}
            </Box>
        </Box>
    );
}
