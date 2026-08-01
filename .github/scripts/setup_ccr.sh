#!/usr/bin/env bash
set -euo pipefail

: "${ELIXPO_POLLINATIONS_API_KEY_GITHUB:?missing ELIXPO_POLLINATIONS_API_KEY_GITHUB}"

CONFIG_ROOT="${1:-.}"
CCR_HOME="$HOME/.claude-code-router"
mkdir -p "$CCR_HOME"
cp "$CONFIG_ROOT"/.github/ccr-adapters/*.js "$CCR_HOME/"

read_config() {
  python3 -c "import sys; sys.path.insert(0, '$CONFIG_ROOT/.github'); from ci_config import $1; print($1)"
}

AGENT_MODEL="$(read_config LLM_MODEL_AGENT)"
CODE_MODEL="$(read_config LLM_MODEL_CODE)"
THINK_MODEL="$(read_config LLM_MODEL_THINKING)"
SEARCH_MODEL="$(read_config LLM_MODEL_SEARCH)"
AGENT_TOKENS="$(read_config LLM_MAX_TOKENS_AGENT)"
CODE_TOKENS="$(read_config LLM_MAX_TOKENS_CODE)"
THINK_TOKENS="$(read_config LLM_MAX_TOKENS_THINKING)"
SEARCH_TOKENS="$(read_config LLM_MAX_TOKENS_SEARCH)"

NORMALIZER="$CCR_HOME/openai-normalize.js"
TOOL_PATCHER="$CCR_HOME/tool-schema-patcher.js"

cat > "$CCR_HOME/config.json" <<EOF
{
  "LOG": false,
  "NON_INTERACTIVE_MODE": true,
  "API_TIMEOUT_MS": 600000,
  "HOST": "127.0.0.1",
  "APIKEY": "ccr-pollinations",
  "transformers": [
    {"path": "$NORMALIZER"},
    {"path": "$TOOL_PATCHER"}
  ],
  "Providers": [
    {
      "name": "pollinations-agent",
      "api_base_url": "https://gen.pollinations.ai/v1/chat/completions",
      "api_key": "$ELIXPO_POLLINATIONS_API_KEY_GITHUB",
      "models": ["$AGENT_MODEL"],
      "transformer": {"use": ["openai-normalize", "openai", "tool-schema-patcher", ["maxtoken", {"max_tokens": $AGENT_TOKENS}]]}
    },
    {
      "name": "pollinations-code",
      "api_base_url": "https://gen.pollinations.ai/v1/chat/completions",
      "api_key": "$ELIXPO_POLLINATIONS_API_KEY_GITHUB",
      "models": ["$CODE_MODEL"],
      "transformer": {"use": ["openai-normalize", "openai", "tool-schema-patcher", ["maxtoken", {"max_tokens": $CODE_TOKENS}]]}
    },
    {
      "name": "pollinations-thinking",
      "api_base_url": "https://gen.pollinations.ai/v1/chat/completions",
      "api_key": "$ELIXPO_POLLINATIONS_API_KEY_GITHUB",
      "models": ["$THINK_MODEL"],
      "transformer": {"use": ["openai-normalize", "openai", "tool-schema-patcher", ["maxtoken", {"max_tokens": $THINK_TOKENS}]]}
    },
    {
      "name": "pollinations-search",
      "api_base_url": "https://gen.pollinations.ai/v1/chat/completions",
      "api_key": "$ELIXPO_POLLINATIONS_API_KEY_GITHUB",
      "models": ["$SEARCH_MODEL"],
      "transformer": {"use": ["openai-normalize", "openai", "tool-schema-patcher", ["maxtoken", {"max_tokens": $SEARCH_TOKENS}]]}
    }
  ],
  "Router": {
    "default": "pollinations-agent,$AGENT_MODEL",
    "background": "pollinations-code,$CODE_MODEL",
    "think": "pollinations-thinking,$THINK_MODEL",
    "webSearch": "pollinations-search,$SEARCH_MODEL"
  }
}
EOF

echo "CCR routes: default=$AGENT_MODEL background=$CODE_MODEL think=$THINK_MODEL webSearch=$SEARCH_MODEL"
