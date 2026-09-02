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

Running `lixrl login` again reuses a valid key already stored for the selected profile. Use `lixrl login --force` only when you intentionally want to rotate that key. The CLI cannot revoke account keys by itself during device login; if the active-key allowance is full, revoke one in the browser, wait until its status shows **Revoked**, and then press Enter in the terminal.

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

The interactive terminal uses distinct colors and symbols for successful operations, status information, correctable warnings, and failures. Set `NO_COLOR=1` for plain output. Command names, subcommands, required arguments, and required flags are validated before the CLI reads your keychain or asks you to sign in, so typos return an immediate usage message.

Network requests, browser approvals, keychain writes, and QR rendering show a compact spinner only while that asynchronous operation is pending. Spinner frames are cleared before the final result and are never emitted by `--json`, `--quiet`, or non-interactive output.

## Agent skills

The npm package contains focused skills for link management and QR generation. They are not copied anywhere during installation.

```bash
lixrl skills list
lixrl skills inspect lixrl-links
lixrl skills install lixrl-links
lixrl skills install lixrl-qr
```

`skills install` copies the selected skill into the current Codex skills directory. This keeps the skill version tied to the installed CLI release.
