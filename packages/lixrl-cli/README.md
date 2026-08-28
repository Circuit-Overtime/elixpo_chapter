# @elixpo/lixrl-cli

Official command-line client for [Lixrl](https://lixrl.com). Version 1.0.1 manages production short links and is designed for both people and automated agents.

```bash
npm install --global @elixpo/lixrl-cli
lixrl login --open
lixrl whoami
```

Create a read/write API key at [lixrl.com/profile/keys](https://lixrl.com/profile/keys). Interactive login stores the key in the operating-system keychain. CI can provide `LIXRL_API_KEY` without writing it to disk.

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
