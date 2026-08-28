# @elixpo/lixrl-cli

Official command-line client for [Lixrl](https://lixrl.com). Manage production short links and QR codes from a terminal, deployment job, or agent workflow.

```bash
npm install --global @elixpo/lixrl-cli
lixrl login --open
lixrl whoami
```

Device login opens Elixpo Accounts, asks Lixrl to create a scoped API key, and stores that key in the operating-system keychain. The Accounts tokens used during approval remain in memory and are revoked after the exchange.

## Sign in securely

### Browser and device flow

```bash
lixrl login --open
lixrl whoami
```

The CLI displays a prefilled Accounts URL and one-time code. Press Enter to open it or use `--open` to launch it immediately. After identity approval, Lixrl asks you to choose the key name, read or read/write access, and an optional expiry date. If your plan has no free key slot, the CLI offers to open key management so you can revoke an unused key and retry without starting the Accounts login again. Passwords, browser cookies, and Accounts refresh tokens are never stored by the CLI.

### Paste an existing key

```bash
lixrl login --key
```

Create the key at [lixrl.com/profile/keys](https://lixrl.com/profile/keys), then paste it into the masked prompt. This path is useful when an administrator has already issued a restricted key.

For CI, set `LIXRL_API_KEY` through the CI secret store and use `--json --no-input`; never place the key in source files, command arguments, generated content, or logs.

Use `lixrl --help` for the complete command list. `shortner` is provided as a compatibility alias.

## Core workflows

```bash
lixrl urls create https://example.com/launch --title "Launch" --tag campaign
lixrl urls list --search launch --json
lixrl urls analytics abc123 --days 30
lixrl urls export --output links.csv
lixrl keys create --name deploy --scopes read,write
lixrl domains claim team
lixrl qr https://example.com --format png --style rounded --output launch.png
lixrl qr https://example.com --track --style aurora --output campaign.svg
```

Deletion, API-key revocation, mapping removal, and file replacement require `--yes`. Use `--json --no-input` for automation.

## Agent skills

The npm package contains focused skills for link management and QR generation. They are not copied anywhere during installation.

```bash
lixrl skills list
lixrl skills inspect lixrl-links
lixrl skills install lixrl-links
lixrl skills install lixrl-qr
```

`skills install` copies the selected skill into the current Codex skills directory. This keeps the skill version tied to the installed CLI release.
