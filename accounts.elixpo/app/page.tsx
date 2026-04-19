"use client";

import { Box, CircularProgress } from "@mui/material";
import { redirect } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
    useEffect(() => {
        redirect("/login");
    }, []);

    return (
        <Box
            sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "100vh",
                background: "linear-gradient(135deg, #1e2420 0%, #141a16 100%)",
            }}
        >
            <CircularProgress sx={{ color: "#22c55e" }} size={60} />
        </Box>
    );
}
