# Setting Up Tommy

Tommy is a self-hosted Discord bot that connects your Discord server to a GitHub repository. It lets team members manage issues, review PRs, search code, and run project management — all from Discord.

This guide walks you through setup from scratch. No prior experience with bots required.

---

## What You Need Before Starting

- A computer or server that stays on (Tommy runs 24/7)
- Python 3.10 or newer installed
- A Discord account with permission to add bots to your server
- A GitHub account with access to the repo you want to connect

---

## Step 1 — Clone Tommy

```bash
git clone https://github.com/elixpo/tommy.git
cd tommy
python -m venv venv
source venv/bin/activate    # on Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Tommy also needs a clone of **your project's repo** to index it for code search. You don't need to do this manually — Tommy clones it automatically into `data/repo/` when embeddings are enabled (Step 5). But the machine running Tommy needs `git` installed and network access to GitHub.

---

## Step 2 — Create a Discord Bot

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **"New Application"** and give it a name (e.g. "Tommy")
3. Go to the **Bot** tab on the left
4. Click **"Reset Token"** and copy the token — you'll need it soon
5. Scroll down to **"Privileged Gateway Intents"** and turn ON:
   - **Message Content Intent**
   - **Server Members Intent**
6. Go to the **OAuth2** tab → **URL Generator**
   - Under "Scopes", check `bot` and `applications.commands`
   - Under "Bot Permissions", check: `Send Messages`, `Read Messages/View Channels`, `Create Public Threads`, `Embed Links`, `Attach Files`, `Read Message History`, `Add Reactions`
7. Copy the generated URL, open it in your browser, and add the bot to your server

---

## Step 3 — Create a GitHub App

A GitHub App lets Tommy interact with your repo securely.

1. Go to [GitHub Settings → Developer Settings → GitHub Apps](https://github.com/settings/apps)
2. Click **"New GitHub App"**
3. Fill in:
   - **Name**: anything (e.g. "tommy-bot")
   - **Homepage URL**: your repo URL
   - **Webhook**: uncheck "Active" (Tommy handles its own webhooks)
4. Under **Permissions → Repository**, set:
   - Contents: **Read & Write**
   - Issues: **Read & Write**
   - Pull Requests: **Read & Write**
   - Metadata: **Read**
5. Click **"Create GitHub App"**
6. On the next page, note the **App ID** number at the top
7. Scroll down and click **"Generate a private key"** — save the `.pem` file into your tommy folder as `tommy.pem`
8. Click **"Install App"** in the left sidebar → select your repo → **Install**
9. After installing, look at the URL — it will be like `https://github.com/settings/installations/12345`. The number at the end is your **Installation ID**.

---

## Step 4 — Set Up Your Environment

```bash
cp .env.example .env
```

Open `.env` in a text editor and fill in:

```
DISCORD_TOKEN=paste-your-discord-bot-token
GITHUB_APP_ID=your-app-id-number
GITHUB_PRIVATE_KEY=./tommy.pem
GITHUB_INSTALLATION_ID=your-installation-id
POLLINATIONS_TOKEN=                          # leave blank for free Pollinations AI
```

The `.env.example` file has detailed comments explaining how to get each key.

---

## Step 5 — Configure the Bot

Open `config.json` and fill in **every section**. The file ships empty — Tommy won't know which repo to work with until you tell it.

```jsonc
{
  "bot": {
    "name": "Tommy",                          // display name (change if you want)
    "default_repo": "your-org/your-repo"      // the GitHub repo Tommy manages
  },
  "discord": {
    "admin_role_ids": [123456789]             // Discord role IDs that count as admin
                                              // (right-click a role → Copy Role ID)
                                              // leave empty [] if everyone is admin
  },
  "github": {
    "bot_username": "tommy-bot",              // your GitHub App's slug
    "admin_users": ["your-github-username"],  // GitHub usernames with admin access
    "whitelisted_repos": ["your-org/your-repo"],  // repos Tommy is allowed to touch
    "admin_only_mentions": false              // true = only admins can @mention the bot
  },
  "ai": {
    "model": "glm",                           // default AI model for the Discord bot
    "fallback_model": ""                      // optional fallback if primary fails
  },
  "embeddings": {
    "provider": "api",                        // "api" (remote) or "local" (on your machine)
    "model": "text-embedding-3-small",        // embedding model name
    "api_base_url": "https://api.openai.com/v1"  // embedding API endpoint
  },
  "features": {
    "local_embeddings_enabled": false,        // set true to index your codebase
    "embeddings_repo": "your-org/your-repo",  // repo to embed (usually same as default_repo)
    "doc_embeddings_enabled": false,          // set true to index documentation sites
    "doc_sites": []                           // URLs to crawl, e.g. ["https://docs.your-app.com"]
  }
}
```

Tommy uses [Pollinations AI](https://pollinations.ai) as the default LLM provider — it's free and requires no signup. The `POLLINATIONS_TOKEN` in your `.env` can be left blank to use the free tier. The default model `glm` works well out of the box.

> **Tip**: To enable code search across your repo, set `features.local_embeddings_enabled` to `true` and `features.embeddings_repo` to your repo. You'll also need an `EMBEDDINGS_API_KEY` in `.env` if using the API embedding provider, or switch to `"provider": "local"` to run embeddings on your machine (no API key needed).

---

## Step 6 — Add Your Project Knowledge (Optional)

Open `src/context/repo_info.txt` and write a short description of your project. This is background knowledge the bot uses in every conversation — think of it as a cheat sheet you'd give a new team member. Things like:

- What your project does
- Key API endpoints or services
- Important links (docs, dashboards)
- Terminology or concepts unique to your project

---

## Step 7 — Run the Bot

```bash
python main.py
```

You should see:

```
Starting Tommy Bot...
Bot: Tommy
Default repo: your-org/your-repo
GitHub auth: App
```

Mention the bot in Discord (`@Tommy help`) to verify it's working.

---

## Step 8 — Choose Which Pipelines to Enable

Tommy ships with 6 CI pipelines. **All of them are controlled from `config.json`** — you pick what you want, and the rest stays off.

Open `config.json` and look at the `pipelines` section:

```jsonc
"pipelines": {
  "pr_assistant": {
    "enabled": true,                 // Mention tommy in issues/PRs → AI responds
    "prompt_suffix": ""              // Extra instructions appended to the AI prompt
  },
  "pr_review": {
    "enabled": true,                 // AI code reviews on PRs
    "prompt_suffix": ""
  },
  "autofix": {
    "enabled": true,                 // Label an issue "tommy" → AI fixes it and opens a PR
    "prompt_suffix": ""
  },
  "pr_assign_author": {
    "enabled": true                  // Auto-assign PR author on open
  },
  "project_manager": {
    "enabled": false,                // Auto-categorize and label new issues/PRs
    "prompt_suffix": ""
  },
  "pr_merge_report": {
    "enabled": false,                // Post PR summary + image to Discord on merge
    "discord_webhook_url": "",       // Discord webhook URL (required if enabled)
    "prompt_suffix": ""
  }
}
```

Set `"enabled": true` for the ones you want, `false` for the rest. That's it — no workflow files to edit.

### Customizing AI behavior with `prompt_suffix`

Each pipeline has a `prompt_suffix` field. Whatever you write here gets appended to the AI's system prompt for that pipeline. Use it to add project-specific instructions:

```jsonc
"pr_review": {
  "enabled": true,
  "prompt_suffix": "Always check for SQL injection. Our ORM is SQLAlchemy."
}
```

### Add GitHub Secrets

For the CI pipelines to work, go to your repo → **Settings → Secrets and Variables → Actions** and add:

| Secret Name | Value |
|---|---|
| `TOMMY_BOT_APP_ID` | Your GitHub App ID (same as `.env`) |
| `TOMMY_BOT_PRIVATE_KEY` | Contents of your `.pem` file (paste the full text) |
| `PLN_GITHUB_TOMMY_KEY` | Your AI provider token (same as `POLLINATIONS_TOKEN`) |

> The secret names are configurable in `.github/tommy.yml` → `github.secrets`.

### Advanced CI settings

Open `.github/tommy.yml` for advanced settings that most users won't need to touch:

- `bot.trigger_phrase` — the keyword that activates the bot in GitHub (default: `tommy`)
- `ai.models` — which AI models the CI pipelines use
- `autofix.label` — which GitHub label triggers the autofix pipeline (default: `tommy`)
- `pr_review.auto_review` / `review_on_sync` — auto-trigger reviews without being asked

---

## What Tommy Creates on Disk

Tommy stores all runtime data in a `data/` folder at the project root. This folder is created automatically — you never need to create it yourself.

```
data/
├── repo/                    # Cloned copy of your repo (for code search)
│   └── your-org_your-repo/  # Auto-cloned, auto-updated on PR merges
├── embeddings/              # Code embedding vectors (ChromaDB)
├── doc_embeddings/          # Documentation embedding vectors (ChromaDB)
├── doc_cache/               # Cached scraped documentation pages
└── sandbox/                 # Docker sandbox workspace (for code agent)
    └── workspace/           # Mounted into the sandbox container
```

- **`data/repo/`** — Tommy clones your repo here when `local_embeddings_enabled` is `true`. It auto-pulls when PRs are merged so the index stays fresh.
- **`data/embeddings/`** — ChromaDB vector database storing your code chunks. Persists across restarts so re-embedding is incremental (only changed files).
- **`data/doc_embeddings/`** — Same as above but for documentation sites configured in `doc_sites`.
- **`data/doc_cache/`** — Raw crawled pages from your doc sites, cached to avoid re-scraping.
- **`data/sandbox/`** — Working directory for the code agent. Files here are mounted into a Docker container named `tommy_sandbox` when running autonomous coding tasks.

> **Cleanup**: You can safely delete any folder inside `data/` to force a fresh rebuild. Tommy will recreate everything on the next run.

---

## Running with Docker (Recommended for Production)

The easiest way to run Tommy in production:

```bash
# Make sure you've done Steps 4 and 5 first (.env and config.json)
docker compose up -d
```

This starts three containers:

| Container | What it does |
|---|---|
| `tommy` | The bot itself |
| `tommy-chromadb` | Vector database for code/doc embeddings |
| `tommy_sandbox` | Isolated workspace for the code agent |

To view logs:
```bash
docker compose logs -f tommy
```

To stop:
```bash
docker compose down
```

Your data (repo clones, embeddings, sandbox files) is stored in Docker volumes and persists across restarts.

---

## Running Without Docker

If you prefer running directly on the host:

```bash
# Using systemd (Linux)
# Create /etc/systemd/system/tommy.service, then:
sudo systemctl enable tommy
sudo systemctl start tommy

# Or simply using screen/tmux:
screen -S tommy
python main.py
# Ctrl+A, D to detach
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Invalid Discord token" | Double-check `DISCORD_TOKEN` in `.env`. Reset the token in the Discord Developer Portal if needed. |
| "Privileged Intents Required" | Enable Message Content Intent in Discord Developer Portal → Bot tab. |
| Bot doesn't respond | Make sure the bot has permission to read/send messages in the channel. Check that it's actually online in the server member list. |
| GitHub commands fail | Verify your GitHub App is installed on the correct repo and has the right permissions. |
| Embeddings fail | Check `EMBEDDINGS_API_KEY` in `.env` if using `"provider": "api"`. For local models, make sure the model downloads successfully. |
| Code search returns nothing | Make sure `local_embeddings_enabled` is `true` and `embeddings_repo` points to your repo in `config.json`. Check the logs for embedding progress. |
| `data/` folder is huge | The repo clone and embeddings can take space. Delete `data/embeddings/` to force a re-index, or `data/repo/` to re-clone. |
