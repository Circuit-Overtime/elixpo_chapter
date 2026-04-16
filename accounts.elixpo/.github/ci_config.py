"""
Elixpo CI Configuration — accounts.elixpo
Single source of truth for all CI workflows and scripts.
"""

# ── LLM ─────────────────────────────────────────────
LLM_API_URL = "https://gen.pollinations.ai/v1/chat/completions"
LLM_MODEL = "claude-fast"

# ── GitHub Project V2 ───────────────────────────────
PROJECT_ID = "PVT_kwDOCZpXlc4BU1AU"
PROJECT_NUMBER = 1
PROJECT_OWNER = "elixpo"

# Field IDs
FIELD_STATUS = "PVTSSF_lADOCZpXlc4BU1AUzhEYBII"
FIELD_CATEGORY = "PVTSSF_lADOCZpXlc4BU1AUzhEYH1Q"
FIELD_PRIORITY = "PVTSSF_lADOCZpXlc4BU1AUzhEYT5Q"

# Category option IDs
CATEGORY_OPTIONS = {
    "Feature": "2019bfe6",
    "Bugs": "354f220a",
    "Support": "331710e9",
    "Dev": "d6a6c846",
}

# Priority option IDs
PRIORITY_OPTIONS = {
    "Urgent": "162b52af",
    "High": "dd3e0bff",
    "Medium": "2e367379",
    "Low": "f18a510c",
}

# Status option IDs
STATUS_OPTIONS = {
    "Todo": "f75ad846",
    "In Progress": "47fc9ee4",
    "Done": "98236657",
}

# ── Organization ────────────────────────────────────
ORG_MEMBERS = ["Circuit-Overtime", "anwe-ch", "elixpoo", "ez-vivek"]

# ── Repository ──────────────────────────────────────
REPO = "elixpo/accounts.elixpo"
PROJECT_NAME = "accounts.elixpo"
PROJECT_DESCRIPTION = "Elixpo OAuth SSO Provider"

# ── Gist ────────────────────────────────────────────
GIST_ACCOUNT = "elixpoo"
GIST_ID = ""  # filled after first merge creates it

# ── Agent ───────────────────────────────────────────
AGENT_TRIGGER = "@elixpo"
AGENT_LABEL = "elixpo"
