---
name: lixrl-links
description: Manage Lixrl production short links through the installed lixrl CLI. Use when creating, listing, editing, disabling, deleting, exporting, or inspecting analytics for Lixrl links, or when managing Lixrl API keys and paid subdomains.
---

# Lixrl Links

Use the installed `lixrl` executable. Do not read credential files or ask the user to paste an API key into chat.

## Workflow

1. Run `lixrl whoami --json --no-input` before authenticated work.
2. If authentication is missing, ask the user to run `lixrl login --open` locally. For CI, point them to `LIXRL_API_KEY`.
3. Inspect state with `lixrl urls list --json --no-input` before modifying it.
4. Use `--json --no-input` for every automated command.
5. Show the exact target and ask the user before adding `--yes` to delete, revoke, remove, unmap, or overwrite.
6. Report the returned short code or resource ID. Never expose API-key values after key creation.

Run `lixrl --help` for the complete command surface. Prefer `urls disable` over deletion when the desired outcome is reversible.
