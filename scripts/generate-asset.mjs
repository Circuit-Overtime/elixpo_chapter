// Generate an image asset from a prompt file via the Pollinations API.
//
// Usage:
//   node scripts/generate-asset.mjs <name>
//   node scripts/generate-asset.mjs all
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
const EDIT_API = "https://gen.pollinations.ai/v1/images/edits";
const PROMPTS_DIR = "prompts";
const PORTFOLIO_ORDER_FILE = "content/portfolio-order.json";
const MEMBER_PROMPT_NAME = "member-card-cover";

function loadLocalEnv(file = ".env.local") {
  if (!fs.existsSync(file)) return;

  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(file);
    return;
  }

  // Compatibility fallback for early Node 20 releases without process.loadEnvFile.
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || process.env[match[1]] !== undefined) continue;

    let value = match[2];
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

loadLocalEnv();

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
  if (meta.type === "member-cover-edit") {
    await generateMemberCovers(meta, prompt, token);
    return;
  }
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

function resolveMemberPath(template, slug) {
  return template.replaceAll("{slug}", slug);
}

async function readEditResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.startsWith("image/")) {
    return Buffer.from(await response.arrayBuffer());
  }

  const data = await response.json();
  const base64 = data.data?.[0]?.b64_json;
  const imageUrl = data.data?.[0]?.url;
  if (base64) return Buffer.from(base64, "base64");
  if (imageUrl) {
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) throw new Error(`result download ${imageResponse.status}`);
    return Buffer.from(await imageResponse.arrayBuffer());
  }
  throw new Error("edit API returned no image data");
}

async function generateMemberCovers(meta, prompt, token) {
  if (!meta.source || !meta.output) {
    throw new Error("member cover prompt requires 'source' and 'output' frontmatter");
  }

  const slugs = JSON.parse(fs.readFileSync(PORTFOLIO_ORDER_FILE, "utf8"));
  const width = Math.min(parseInt(meta.width || "768", 10), 768);
  const height = Math.min(parseInt(meta.height || "768", 10), 768);
  const model = meta.model || "gptimage";
  const quality = meta.quality || "high";

  for (const slug of slugs) {
    const source = resolveMemberPath(meta.source, slug);
    const output = resolveMemberPath(meta.output, slug);
    if (!fs.existsSync(source)) {
      console.warn(`↷ ${slug}: source not found (${source})`);
      continue;
    }

    process.stdout.write(`→ ${slug} cover (${model}, ${width}x${height})... `);
    const form = new FormData();
    const sourceBuffer = fs.readFileSync(source);
    const sourceFormat = (await sharp(sourceBuffer).metadata()).format;
    const sourceType = sourceFormat === "webp" ? "image/webp" : sourceFormat === "png" ? "image/png" : "image/jpeg";
    form.append("image", new Blob([sourceBuffer], { type: sourceType }), path.basename(source));
    form.append("prompt", prompt);
    form.append("model", model);
    form.append("size", `${width}x${height}`);
    form.append("quality", quality);
    form.append("response_format", "b64_json");
    form.append("nologo", "true");

    const response = await fetch(EDIT_API, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    if (!response.ok) {
      throw new Error(`${slug}: edit API ${response.status}: ${(await response.text()).slice(0, 200)}`);
    }

    const editedImage = await readEditResponse(response);
    fs.mkdirSync(path.dirname(output), { recursive: true });
    await sharp(editedImage)
      .resize(width, height, { fit: "cover", position: "centre" })
      .webp({ quality: 72, effort: 6 })
      .toFile(output);
    const { size } = fs.statSync(output);
    console.log(`saved ${output} (${(size / 1024).toFixed(0)} KB)`);
  }
}

async function main() {
  const token = process.env.POLLINATIONS_TOKEN;
  if (!token) {
    console.error("Missing POLLINATIONS_TOKEN. Set it in .env.local or the shell environment.");
    process.exit(1);
  }

  const arg = process.argv[2];
  if (!arg) {
    console.error("Usage: node scripts/generate-asset.mjs <name|members|all>");
    process.exit(1);
  }

  const names =
    arg === "members"
      ? [MEMBER_PROMPT_NAME]
      : arg === "all"
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
