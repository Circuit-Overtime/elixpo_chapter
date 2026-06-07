"use client";

import {
    Check as CheckIcon,
    ContentCopy as ContentCopyIcon,
} from "@mui/icons-material";
import { Box, IconButton, Tooltip } from "@mui/material";
import { useState } from "react";

interface CodeBlockProps {
    code: string;
    language?: string;
}

export default function CodeBlock({ code, language }: CodeBlockProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy code: ", err);
        }
    };

    return (
        <Box
            sx={{
                position: "relative",
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(155, 123, 247, 0.15)",
                borderRadius: "8px",
                p: 2,
                mb: 2,
                "&:hover .copy-btn": {
                    opacity: 1,
                },
            }}
        >
            <Tooltip title={copied ? "Copied!" : "Copy code"}>
                <IconButton
                    className="copy-btn"
                    onClick={handleCopy}
                    size="small"
                    sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        color: copied ? "#9b7bf7" : "rgba(255, 255, 255, 0.4)",
                        bgcolor: "rgba(255, 255, 255, 0.05)",
                        opacity: { xs: 1, md: 0 },
                        transition: "all 0.2s ease",
                        "&:hover": {
                            bgcolor: "rgba(255, 255, 255, 0.1)",
                            color: "#fff",
                        },
                    }}
                >
                    {copied ? (
                        <CheckIcon sx={{ fontSize: "0.95rem" }} />
                    ) : (
                        <ContentCopyIcon sx={{ fontSize: "0.95rem" }} />
                    )}
                </IconButton>
            </Tooltip>
            <Box
                component="pre"
                sx={{
                    margin: 0,
                    fontFamily: "var(--font-geist-mono), monospace",
                    fontSize: "0.82rem",
                    color: "#9b7bf7",
                    overflowX: "auto",
                    whiteSpace: "pre",
                    pr: 4,
                    "&::-webkit-scrollbar": {
                        height: "6px",
                    },
                    "&::-webkit-scrollbar-thumb": {
                        bgcolor: "rgba(255, 255, 255, 0.1)",
                        borderRadius: "3px",
                    },
                }}
            >
                {code}
            </Box>
        </Box>
    );
}
