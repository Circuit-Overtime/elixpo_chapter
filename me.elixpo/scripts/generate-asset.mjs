// Generate an image asset from a prompt file via the Pollinations API.
//
// Usage:
//   node --env-file=.env.local scripts/generate-asset.mjs <name>
//   node --env-file=.env.local scripts/generate-asset.mjs all
//
// Each prompt lives in prompts/<name>.md with frontmatter:
//   ---
//   output: public/assets/.../foo.webp
//   width: 1024
//   height: 512
//   model: gptimage
//   quality: high
//   ---
//   <the prompt text>
//
// Reads POLLINATIONS_TOKEN from the environment (.env.local). Output is converted to WebP.

import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const API = "https://gen.pollinations.ai/image";
const PROMPTS_DIR = "prompts";

function parsePromptFile(file) {
  const raw = fs.readFileSync(file, "utf8");
  const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`${file}: missing frontmatter block`);
  const meta = {};
  for (const line of m[1].split("\n")) {
    const i = line.indexOf(":");
    if (i > -1) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { meta, prompt: m[2].trim() };
}

async function generate(name, token) {
  const file = path.join(PROMPTS_DIR, name.endsWith(".md") ? name : `${name}.md`);
  if (!fs.existsSync(file)) throw new Error(`prompt file not found: ${file}`);

  const { meta, prompt } = parsePromptFile(file);
  if (!meta.output) throw new Error(`${file}: 'output' missing in frontmatter`);

  const MAX = 768; // cap generation + output resolution
  const width = Math.min(parseInt(meta.width || "768", 10), MAX);
  const height = Math.min(parseInt(meta.height || "768", 10), MAX);
  const model = meta.model || "gptimage";
  const quality = meta.quality || "high";

  const params = new URLSearchParams({ model, width, height, quality });
  const url = `${API}/${encodeURIComponent(prompt)}?${params}`;

  process.stdout.write(`→ ${name} (${model}, ${width}x${height})... `);
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    throw new Error(`API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());

  fs.mkdirSync(path.dirname(meta.output), { recursive: true });
  // Downscale to the capped size if the API returned larger, then encode by extension.
  const ext = path.extname(meta.output).toLowerCase();
  let pipeline = sharp(buf).resize(width, height, { fit: "cover", withoutEnlargement: true });
  if (ext === ".png") pipeline = pipeline.png({ compressionLevel: 9 });
  else if (ext === ".jpg" || ext === ".jpeg") pipeline = pipeline.jpeg({ quality: 82 });
  else pipeline = pipeline.webp({ quality: 72, effort: 6 });
  await pipeline.toFile(meta.output);
  const { size } = fs.statSync(meta.output);
  console.log(`saved ${meta.output} (${(size / 1024).toFixed(0)} KB)`);
}

async function main() {
  const token = process.env.POLLINATIONS_TOKEN;
  if (!token) {
    console.error("Missing POLLINATIONS_TOKEN. Set it in .env.local and run with --env-file=.env.local");
    process.exit(1);
  }

  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: node --env-file=.env.local scripts/generate-asset.mjs <name|all>");
    process.exit(1);
  }

  const names =
    arg === "all"
      ? fs.readdirSync(PROMPTS_DIR).filter((f) => f.endsWith(".md")).map((f) => f.replace(/\.md$/, ""))
      : [arg];

  for (const name of names) {
    try {
      await generate(name, token);
    } catch (err) {
      console.error(`✗ ${name}: ${err.message}`);
      if (arg !== "all") process.exit(1);
    }
  }
}

main();
