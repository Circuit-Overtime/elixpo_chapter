/**
 * gemini-adapter.js — claude-code-router transformer for Gemini models.
 *
 * PROBLEM:
 *   Vertex AI's Gemini 3 requires every function_call content block in a
 *   continuing conversation to carry a `thought_signature`. claude-code-router
 *   doesn't track signatures across turns, so multi-step tool use 400s with:
 *
 *     vertex-ai error: function call ... is missing a `thought_signature`
 *
 * FIX:
 *   Disable Gemini's "thinking" mode on every outgoing request. When thinking
 *   is off, Vertex doesn't require thought_signature echoes. We try several
 *   fields (thinking_budget, thinking, extra_body.thinkingConfig) because
 *   different proxies surface this differently — harmless if some are ignored.
 *
 * INSTALL:
 *   Referenced in the router config via:
 *     "transformer": {
 *       "use": [
 *         "/home/runner/.../gemini-adapter.js",
 *         "openai",
 *         ["maxtoken", {"max_tokens": 9000}]
 *       ]
 *     }
 */

const GEMINI_RE = /^gemini/i;

module.exports = {
    name: "gemini-adapter",

    transformRequestIn: async (request) => {
        const body = request?.body ?? request;
        const model = body?.model;

        if (typeof model !== "string" || !GEMINI_RE.test(model)) {
            return request;
        }

        // Disable thinking via every field name we've seen accepted in the wild.
        // Vertex / Pollinations / Gemini API have slightly different shapes.
        body.thinking_budget = 0;
        body.thinking = { type: "disabled" };

        body.extra_body = body.extra_body || {};
        body.extra_body.thinkingConfig = {
            thinkingBudget: 0,
            includeThoughts: false,
        };

        // Strip any incoming thought_signature / thoughts blocks. They'd be stale
        // relative to the new (non-thinking) call anyway.
        if (Array.isArray(body.messages)) {
            for (const msg of body.messages) {
                if (Array.isArray(msg.content)) {
                    for (const block of msg.content) {
                        if (block && typeof block === "object") {
                            delete block.thought_signature;
                            delete block.thoughts;
                        }
                    }
                }
            }
        }

        return request;
    },
};
