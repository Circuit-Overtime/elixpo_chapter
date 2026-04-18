#!/usr/bin/env node
"use strict";

/**
 * gemini-adapter.js — CCR transformer for Pollinations → Vertex Gemini 3.
 *
 * Vertex demands a `thought_signature` on every replayed assistant tool_use
 * block. CCR doesn't track signatures across turns, and Pollinations'
 * OpenAI-compat proxy strips them on return and exposes no `thinking_budget`
 * / `extra_body.thinkingConfig` pass-through — so we cannot disable thinking
 * server-side. Instead we flatten every historical tool_use / tool_result
 * into plain text before the request leaves CCR. Vertex sees no structured
 * tool_use in history and never demands signatures. The current turn's
 * response is untouched, so the agent loop still issues real tool calls.
 *
 * CCR contract: loaded by `registerTransformerFromConfig` which calls
 * `new Ctor(options)`. The instance must expose `name` and at least one
 * transform hook. Register at the top level and reference by name:
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

function flattenAnthropicMessage(m) {
    if (!Array.isArray(m.content)) return m;
    const parts = [];
    for (const b of m.content) {
        if (!b || typeof b !== "object") continue;
        if (b.type === "text" && b.text) parts.push(b.text);
        else if (b.type === "tool_use") parts.push(`[called ${b.name} with ${asString(b.input)}]`);
        else if (b.type === "tool_result") parts.push(`[tool result]: ${asString(b.content)}`);
    }
    const role = m.role === "tool" ? "user" : m.role;
    return { role, content: parts.join("\n") };
}

function flattenOpenAIMessage(m) {
    if (m.role === "assistant" && Array.isArray(m.tool_calls) && m.tool_calls.length > 0) {
        const parts = [];
        if (m.content) parts.push(asString(m.content));
        for (const tc of m.tool_calls) {
            const fn = tc.function || {};
            parts.push(`[called ${fn.name || "?"} with ${fn.arguments || "{}"}]`);
        }
        return { role: "assistant", content: parts.join("\n") };
    }
    if (m.role === "tool") {
        return { role: "user", content: `[tool result]: ${asString(m.content)}` };
    }
    return m;
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

        body.messages = body.messages.map(m => {
            if (!m || typeof m !== "object") return m;
            if (Array.isArray(m.content)) return flattenAnthropicMessage(m);
            return flattenOpenAIMessage(m);
        });

        for (const m of body.messages) {
            if (m && typeof m === "object") {
                delete m.tool_calls;
                delete m.tool_call_id;
            }
        }
        return request;
    }
}

module.exports = GeminiFlattenAdapter;
