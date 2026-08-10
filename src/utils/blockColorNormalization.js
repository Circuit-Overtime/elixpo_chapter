const COLOR_LEAK_SOURCE_BLOCKS = new Set(["codeBlock", "mermaidBlock"]);

const LEAKED_GRAY_VALUES = new Set([
    "gray",
    "grey",
    "default",
    "#9ca3af",
    "rgb(156,163,175)",
    "rgba(156,163,175,1)",
]);

function normalizeColorValue(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "");
}

function clearLeakedGray(content) {
    if (!Array.isArray(content)) return content;
    let changed = false;
    const normalized = content.map((item) => {
        let next = item;
        if (LEAKED_GRAY_VALUES.has(normalizeColorValue(item?.styles?.textColor))) {
            const styles = { ...item.styles };
            delete styles.textColor;
            next = { ...next, styles };
            changed = true;
        }
        if (Array.isArray(item?.content)) {
            const nested = clearLeakedGray(item.content);
            if (nested === item.content) return next;
            next = { ...next, content: nested };
            changed = true;
        }
        return next;
    });
    return changed ? normalized : content;
}

/**
 * BlockNote can carry the neutral code-block foreground into the next text
 * block. Only clear that palette value at the boundary where the leak occurs,
 * preserving deliberately gray text everywhere else.
 */
export function clearInheritedBlockTextColors(blocks) {
    if (!Array.isArray(blocks)) return blocks;
    let changed = false;
    const normalized = blocks.map((block, index) => {
        const previousType = blocks[index - 1]?.type;
        const children = clearInheritedBlockTextColors(block?.children);
        const shouldReset = COLOR_LEAK_SOURCE_BLOCKS.has(previousType);
        const content = shouldReset
            ? clearLeakedGray(block?.content)
            : block?.content;
        if (children === block?.children && content === block?.content) return block;
        changed = true;
        return { ...block, children, content };
    });
    return changed ? normalized : blocks;
}
