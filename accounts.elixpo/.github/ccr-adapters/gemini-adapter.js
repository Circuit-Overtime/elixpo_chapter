#!/usr/bin/env node
"use strict";

/**
 * gemini-adapter.js — CCR transformer for Pollinations → Vertex Gemini 3.
 *
 * Vertex demands a `thought_signature` on every replayed assistant tool_use
 * block. CCR doesn't track signatures across turns and Pollinations' OpenAI
 * proxy strips them on return. Pollinations exposes no `thinking_budget` /
 * `thinkingConfig` pass-through, so thinking can't be disabled server-side.
 *
 * Workaround: rewrite conversation history so no tool_use blocks ever reach
 * Vertex AND the model sees no special-syntax artifacts in prior assistant
 * turns to mimic (earlier iterations had Gemini copying our flattened strings
 * like `[called X]` or placeholder `(continuing)` as plain-text replies).
 *
 * Rules:
 *   1. Tool exchanges (tool_use → tool_result) become user-role narrative
 *      notes like "Earlier I ran X(args). It returned: Y".
 *   2. Assistant messages that contained ONLY tool_use (no real text) are
 *      dropped entirely — no placeholders to copy.
 *   3. Assistant messages with real text keep that text only; any tool_use
 *      blocks inside are discarded (their context moves to the next user
 *      note).
 *   4. Consecutive user messages are merged so Vertex sees a clean alternation.
 *
 * The current turn's response is untouched; real tool calls still flow.
 *
 * CCR contract: `registerTransformerFromConfig` calls `new Ctor(options)`.
 * Register at top-level and reference by name:
 *
 *   {
 *     "transformers": [{"path": "/abs/path/gemini-adapter.js"}],
 *     "Providers": [{
 *       "transformer": { "use": ["gemini-adapter", "openai", ...] }
 *     }]
 *   }
 */

const GEMINI_RE = /^gemini/i;

function asString(x) {
    if (x == null) return "";
    if (typeof x === "string") return x;
    try { return JSON.stringify(x); } catch { return String(x); }
}

function buildToolUseIndex(messages) {
    const index = new Map();
    for (const m of messages) {
        if (m?.role !== "assistant") continue;
        if (Array.isArray(m.content)) {
            for (const b of m.content) {
                if (b?.type === "tool_use" && b.id) {
                    index.set(b.id, { name: b.name, input: asString(b.input) });
                }
            }
        } else if (Array.isArray(m.tool_calls)) {
            for (const tc of m.tool_calls) {
                if (tc?.id) {
                    const fn = tc.function || {};
                    index.set(tc.id, { name: fn.name, input: fn.arguments || "{}" });
                }
            }
        }
    }
    return index;
}

function toolResultNarrative(toolUseIndex, toolUseId, resultContent) {
    const tu = toolUseIndex.get(toolUseId);
    const result = asString(resultContent);
    return tu
        ? `Earlier I ran ${tu.name} with ${tu.input}. It returned: ${result}`
        : `Earlier tool output: ${result}`;
}

function flattenMessages(messages) {
    const toolUseIndex = buildToolUseIndex(messages);
    const out = [];

    for (const m of messages) {
        if (!m || typeof m !== "object") continue;
        const role = m.role;

        if (role === "assistant" && Array.isArray(m.content)) {
            const texts = [];
            for (const b of m.content) {
                if (b?.type === "text" && b.text) texts.push(b.text);
            }
            if (texts.length > 0) out.push({ role: "assistant", content: texts.join("\n") });
            continue;
        }

        if (role === "assistant" && Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
            const c = typeof m.content === "string" ? m.content : asString(m.content);
            if (c) out.push({ role: "assistant", content: c });
            continue;
        }

        if (role === "assistant") {
            const c = asString(m.content);
            if (c) out.push({ role: "assistant", content: c });
            continue;
        }

        if (role === "user" && Array.isArray(m.content)) {
            const parts = [];
            for (const b of m.content) {
                if (b?.type === "text" && b.text) parts.push(b.text);
                else if (b?.type === "tool_result") {
                    parts.push(toolResultNarrative(toolUseIndex, b.tool_use_id, b.content));
                }
            }
            if (parts.length > 0) out.push({ role: "user", content: parts.join("\n") });
            continue;
        }

        if (role === "tool") {
            out.push({
                role: "user",
                content: toolResultNarrative(toolUseIndex, m.tool_call_id, m.content),
            });
            continue;
        }

        out.push(m);
    }

    const merged = [];
    for (const m of out) {
        const last = merged[merged.length - 1];
        if (last && last.role === "user" && m.role === "user") {
            last.content = `${last.content}\n${m.content}`;
        } else {
            merged.push(m);
        }
    }

    for (const m of merged) {
        if (m && typeof m === "object") {
            delete m.tool_calls;
            delete m.tool_call_id;
        }
    }
    return merged;
}

class GeminiFlattenAdapter {
    constructor(options) {
        this.name = "gemini-adapter";
        this.options = options || {};
    }

    async transformRequestIn(request)  { return this._flatten(request); }
    async transformRequestOut(request) { return this._flatten(request); }

    _flatten(request) {
        const body = request && request.body ? request.body : request;
        if (!body || typeof body !== "object") return request;
        if (typeof body.model !== "string" || !GEMINI_RE.test(body.model)) return request;
        if (!Array.isArray(body.messages)) return request;

        body.messages = flattenMessages(body.messages);
        return request;
    }
}

module.exports = GeminiFlattenAdapter;
