"use client";

import { Box, CircularProgress } from "@mui/material";
import dynamic from "next/dynamic";
import type { LixEditorInnerProps } from "./lix-editor-inner";

// The editor (BlockNote/Mantine) is browser-only — never server-render it.
const Inner = dynamic(() => import("./lix-editor-inner"), {
    ssr: false,
    loading: () => (
        <Box sx={{ display: "grid", placeItems: "center", minHeight: 320 }}>
            <CircularProgress sx={{ color: "#9b7bf7" }} />
        </Box>
    ),
});

/** WYSIWYG template editor. Pass onReady to get the imperative handle. */
export default function LixEditor(props: LixEditorInnerProps) {
    return <Inner {...props} />;
}

export type { LixEditorInnerProps };
