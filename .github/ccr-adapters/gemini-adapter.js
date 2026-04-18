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
 * Vertex. Assistant turns keep ONLY their real text; the tool_use + paired
 * tool_result become a single narrative user-role note. Vertex sees no
 * historical tool_use to demand signatures for, and — critically — the
 * model does not see its own prior calls formatted in any special syntax
 * (earlier versions used `[called X with Y]` brackets, which Gemini copied
 * verbatim as plain-text replies on turn 3+ instead of emitting real tool
 * calls). The current turn's response is untouched, so real tool calls
 * still flow.
 *
 * CCR contract: loaded by `registerTransformerFromConfig`, which calls
 * `new Ctor(options)`. Register at top-level and reference by name:
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

/**
 * Rewrite a message array so no tool_use / tool_result blocks survive.
 * Works on Anthropic content-block shape AND OpenAI tool_calls shape.
 *
 * - Assistant messages: strip tool_use / tool_calls, keep text only.
 * - Tool results: convert to a user-role narrative line that carries
 *   the call name + args + result, so the model still has context.
 * - Pair tool_use with its tool_result via id lookup across messages.
 */
function flattenMessages(messages) {
    const toolUseById = new Map();
    for (const m of messages) {
        if (m?.role === "assistant" && Array.isArray(m.content)) {
            for (const b of m.content) {
                if (b?.type === "tool_use" && b.id) {
                    toolUseById.set(b.id, { name: b.name, input: asString(b.input) });
                }
            }
        } else if (m?.role === "assistant" && Array.isArray(m.tool_calls)) {
            for (const tc of m.tool_calls) {
                if (tc?.id) {
                    const fn = tc.function || {};
                    toolUseById.set(tc.id, { name: fn.name, input: fn.arguments || "{}" });
                }
            }
        }
    }

    const out = [];
    for (const m of messages) {
        if (!m || typeof m !== "object") continue;

        if (m.role === "assistant" && Array.isArray(m.content)) {
            const texts = [];
            for (const b of m.content) {
                if (b?.type === "text" && b.text) texts.push(b.text);
            }
            out.push({ role: "assistant", content: texts.join("\n") || "(continuing)" });
            continue;
        }

        if (m.role === "assistant" && Array.isArray(m.tool_calls)) {
            const content = typeof m.content === "string" ? m.content : asString(m.content);
            out.push({ role: "assistant", content: content || "(continuing)" });
            continue;
        }

        if (m.role === "user" && Array.isArray(m.content)) {
            const parts = [];
            for (const b of m.content) {
                if (b?.type === "text" && b.text) parts.push(b.text);
                else if (b?.type === "tool_result") {
                    const tu = toolUseById.get(b.tool_use_id);
                    const result = asString(b.content);
                    parts.push(tu
                        ? `Earlier I ran ${tu.name} with ${tu.input}. It returned: ${result}`
                        : `Earlier tool output: ${result}`);
                }
            }
            out.push({ role: "user", content: parts.join("\n") });
            continue;
        }

        if (m.role === "tool") {
            const tu = toolUseById.get(m.tool_call_id);
            const result = asString(m.content);
            out.push({
                role: "user",
                content: tu
                    ? `Earlier I ran ${tu.name} with ${tu.input}. It returned: ${result}`
                    : `Earlier tool output: ${result}`,
            });
            continue;
        }

        out.push(m);
    }

    for (const m of out) {
        if (m && typeof m === "object") {
            delete m.tool_calls;
            delete m.tool_call_id;
        }
    }
    return out;
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
