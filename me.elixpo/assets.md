# Generated Assets

Image assets are generated from prompt files in [`prompts/`](./prompts) via the Pollinations
API (`gptimage` model) and committed as static `.webp`. We pre-generate rather than hotlink the
API at runtime (needs a token, adds latency).

## How to generate

1. Get a token from https://auth.pollinations.ai and put it in `.env.local`:
   ```
   POLLINATIONS_TOKEN=your_token_here
   ```
2. Generate one asset, or all of them:
   ```bash
   npm run gen:asset maintainer-advisory   # one
   npm run gen:asset all                   # every prompt in prompts/
   ```
   (Equivalent to `node --env-file=.env.local scripts/generate-asset.mjs <name>`.)

Each prompt file (`prompts/<name>.md`) declares its own `output` path, `width`, `height`,
`model`, and `quality` in frontmatter, followed by the prompt text.

## Catalogue

| Asset | Prompt file | Output | Used by |
|-------|-------------|--------|---------|
| Maintainer Advisory | [maintainer-advisory.md](./prompts/maintainer-advisory.md) | `public/assets/ayushman/spotlight/maintainer-advisory.webp` | `ayushman` spotlight |
| Speaking at GitHub | [speaking-github.md](./prompts/speaking-github.md) | `public/assets/ayushman/spotlight/speaking-github.webp` | `ayushman` spotlight |
| OWASP JIS University | [owasp-jisu.md](./prompts/owasp-jisu.md) | `public/assets/ayushman/spotlight/owasp-jisu.webp` | `ayushman` spotlight |
| Kolkata Hacktoberfest | [kolkata-hacktoberfest.md](./prompts/kolkata-hacktoberfest.md) | `public/assets/ayushman/spotlight/kolkata-hacktoberfest.webp` | `ayushman` spotlight |
| Elixpo Search | [elixpo-search.md](./prompts/elixpo-search.md) | `public/assets/ayushman/spotlight/elixpo-search.webp` | `ayushman` spotlight |
| Site favicon (panda mascot) | [favicon.md](./prompts/favicon.md) | `app/icon.png` | site-wide favicon |

## Favicon

The site icon is the Elixpo panda mascot. `app/icon.png` (512²) is generated from
[`prompts/favicon.md`](./prompts/favicon.md) and serves as the modern `<link rel="icon">`.
The legacy multi-size `app/favicon.ico` is derived from it with ImageMagick:

```bash
npm run gen:asset favicon   # regenerate app/icon.png
convert app/icon.png -background none -define icon:auto-resize=64,48,32,16 app/favicon.ico
```

## Adding a new asset

1. Create `prompts/<name>.md` with the frontmatter + prompt.
2. Add a row to the catalogue above.
3. Reference the `output` path wherever you need it (e.g. a `spotlight.json` `image` field).
4. Run `npm run gen:asset <name>`.
