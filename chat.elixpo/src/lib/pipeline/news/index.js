import crypto from "crypto";
import fs from "fs";
import path from "path";

import { MAX_NEWS_ITEMS, VOICES } from "../config.js";
import { uploadBuffer, deleteFolder } from "../storage.js";
import { fetchTrendingTopics } from "./topics.js";
import { generateNewsAnalysis, generateNewsScript } from "./analysis.js";
import { generateVoiceover } from "./voiceover.js";
import {
  generateVisualPrompt,
  generateBannerImage,
  createCombinedVisualPrompt,
  generateThumbnailImage,
  createCombinedNewsSummary,
} from "./images.js";

const BACKUP_FILE = path.resolve("tmp/newsBackup.json");

function ensureTmp() {
  const dir = path.resolve("tmp");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function logBackup(state) {
  ensureTmp();
  fs.writeFileSync(BACKUP_FILE, JSON.stringify(state, null, 2), "utf-8");
}

function loadBackup() {
  if (!fs.existsSync(BACKUP_FILE)) return null;
  return JSON.parse(fs.readFileSync(BACKUP_FILE, "utf-8"));
}

async function safeRetry(fn, retries = 2, wait = 5000) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i < retries) {
        console.log(`Retry ${i + 1}/${retries} after error: ${err.message}`);
        await new Promise((r) => setTimeout(r, wait));
      } else throw err;
    }
  }
}

/**
 * Run the full news generation pipeline.
 * @param {D1Database} db - Cloudflare D1 database
 */
export async function runNewsPipeline(db) {
  console.log("🚀 Starting news pipeline...");
  ensureTmp();

  let backup = loadBackup();
  let overallId, trendingTopics, items;

  if (backup) {
    overallId = backup.overall_id;
    trendingTopics = backup.topics;
    items = backup.items;
    console.log("🗂️ Resumed from backup.");
  } else {
    trendingTopics = await fetchTrendingTopics();
    if (!trendingTopics.length) {
      console.log("⚠️ No trending topics found.");
      return;
    }
    const now = new Date().toISOString().replace(/\D/g, "");
    overallId = crypto.createHash("sha256").update(now).digest("hex").slice(0, 16);
    items = Array.from({ length: MAX_NEWS_ITEMS }, () => ({}));
    backup = { overall_id: overallId, topics: trendingTopics, items, summary: "", thumbnail_url: "", status: "started" };
    logBackup(backup);
  }

  // Process each news item
  for (let index = 0; index < Math.min(trendingTopics.length, MAX_NEWS_ITEMS); index++) {
    const topic = trendingTopics[index];
    const newsId = crypto.createHash("sha256").update(`${topic}-${index}-${overallId}`).digest("hex").slice(0, 16);
    const item = items[index] || {};
    item.news_id = item.news_id || newsId;
    item.topic = item.topic || topic;

    if (item.status === "complete") {
      console.log(`✅ Skipping complete topic ${index}: ${topic}`);
      continue;
    }

    console.log(`⚙️ Processing topic ${index + 1}/${MAX_NEWS_ITEMS}: ${topic}`);

    // Step 1: Script
    if (!item.status || item.status === "started" || item.status?.includes("script_failed")) {
      try {
        const info = await safeRetry(() => generateNewsAnalysis(topic));
        const scriptData = await safeRetry(() => generateNewsScript(info));
        item.timestamp = new Date().toISOString();
        item.script = scriptData.script;
        item.source_link = scriptData.source_link || "";
        item.status = "script_generated";
        item.error = null;
        items[index] = item;
        logBackup(backup);
        console.log(`✅ Script generated for topic ${index}`);
      } catch (err) {
        item.status = `news${index}_script_failed`;
        item.error = err.message;
        items[index] = item;
        logBackup(backup);
        console.error(`❌ Script error for topic ${index}: ${err.message}`);
        continue;
      }
    }

    // Step 2: Audio
    if (item.status === "script_generated" || item.status?.includes("audio_failed")) {
      try {
        const voice = VOICES[index % VOICES.length];
        const audioBuffer = await safeRetry(() => generateVoiceover(item.script, index, voice));
        const audioUrl = await uploadBuffer(audioBuffer, `news/${overallId}/${newsId}`, `news${index}`, "video");
        item.audio_url = audioUrl;
        item.status = "audio_uploaded";
        item.error = null;
        items[index] = item;
        logBackup(backup);
        console.log(`✅ Audio uploaded for topic ${index}`);
      } catch (err) {
        item.status = `news${index}_audio_failed`;
        item.error = err.message;
        items[index] = item;
        logBackup(backup);
        console.error(`❌ Audio error for topic ${index}: ${err.message}`);
        continue;
      }
    }

    // Step 3: Image
    if (item.status === "audio_uploaded" || item.status?.includes("image_failed")) {
      try {
        const prompt = await generateVisualPrompt(item.topic);
        const imgBuffer = await safeRetry(() => generateBannerImage(prompt));
        const imageUrl = await uploadBuffer(imgBuffer, `news/${overallId}/${newsId}`, "newsBackground");
        item.image_url = imageUrl;
        item.status = "complete";
        item.error = null;
        items[index] = item;
        logBackup(backup);
        console.log(`✅ Image uploaded, item complete for topic ${index}`);
      } catch (err) {
        item.status = `news${index}_image_failed`;
        item.error = err.message;
        items[index] = item;
        logBackup(backup);
        console.error(`❌ Image error for topic ${index}: ${err.message}`);
        continue;
      }
    }

    await new Promise((r) => setTimeout(r, 3000));
  }

  // Final: Thumbnail & Summary
  const allComplete = items.every((it) => it.status === "complete");
  if (!allComplete) {
    console.log("⚠️ Not all items complete. Final steps skipped.");
    return;
  }

  try {
    console.log("🖼️ Generating final thumbnail & summary...");
    const completedTopics = items.map((it) => it.topic).filter(Boolean);

    const thumbPrompt = await createCombinedVisualPrompt(completedTopics);
    const thumbBuffer = await generateThumbnailImage(thumbPrompt);
    const thumbUrl = await uploadBuffer(thumbBuffer, `news/${overallId}`, "newsThumbnail");

    const summaryText = await createCombinedNewsSummary(completedTopics);

    // Clean items for DB storage (only keep essential fields)
    const dbItems = items.map((it) => ({
      audio_url: it.audio_url,
      topic: it.topic,
      image_url: it.image_url,
      source_link: it.source_link,
    }));

    // Write to D1
    await db.prepare("INSERT OR REPLACE INTO news (id, items) VALUES (?, ?)").bind(overallId, JSON.stringify(dbItems)).run();

    // Get previous news ID for cleanup
    const prevStats = await db.prepare("SELECT data FROM gen_stats WHERE key = ?").bind("news").first();
    if (prevStats) {
      const prev = JSON.parse(prevStats.data);
      if (prev.latestNewsId && prev.latestNewsId !== overallId) {
        await deleteFolder(`news/${prev.latestNewsId}`);
      }
    }

    // Update gen_stats
    const statsData = JSON.stringify({
      latestNewsId: overallId,
      latestNewsThumbnail: thumbUrl,
      latestNewsSummary: summaryText,
      latestNewsDate: new Date().toISOString(),
    });
    await db.prepare("INSERT OR REPLACE INTO gen_stats (key, data) VALUES (?, ?)").bind("news", statsData).run();

    // Clean backup
    fs.unlinkSync(BACKUP_FILE);
    console.log("✅ News pipeline complete!");
  } catch (err) {
    backup.status = "final_error";
    backup.error = err.message;
    logBackup(backup);
    console.error(`❌ Final step error: ${err.message}`);
  }
}
