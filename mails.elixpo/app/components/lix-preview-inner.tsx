"use client";

import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "@elixpo/lixeditor/styles";
import { type LixBlock, LixPreview, LixThemeProvider } from "@elixpo/lixeditor";

export interface LixPreviewInnerProps {
    blocks?: LixBlock[] | null;
    html?: string;
}

export default function LixPreviewInner({ blocks, html }: LixPreviewInnerProps) {
    return (
        <LixThemeProvider theme="dark">
            <LixPreview blocks={blocks} html={html} />
        </LixThemeProvider>
    );
}
