"use client";

import CheckIcon from "@mui/icons-material/Check";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Button } from "@mui/material";
import { useState } from "react";
import { LLM_DOCS } from "../llm-content";

export default function CopyForLlm() {
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(LLM_DOCS);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
        } catch {
            // ignore
        }
    };

    return (
        <Button
            onClick={copy}
            startIcon={copied ? <CheckIcon sx={{ fontSize: "1.05rem !important" }} /> : <ContentCopyIcon sx={{ fontSize: "1.05rem !important" }} />}
            sx={{
                textTransform: "none",
                fontWeight: 600,
                fontSize: "0.85rem",
                color: copied ? "#86efac" : "#f5f5f4",
                px: 1.8,
                py: 0.8,
                borderRadius: "10px",
                border: "1px solid rgba(155,123,247,0.3)",
                background: "rgba(155,123,247,0.08)",
                "&:hover": { borderColor: "#9b7bf7", background: "rgba(155,123,247,0.14)" },
            }}
        >
            {copied ? "Copied" : "Copy for LLM"}
        </Button>
    );
}
