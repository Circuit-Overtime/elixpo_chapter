import crypto from "crypto";
import fs from "fs";
import path from "path";

import { MAX_NEWS_ITEMS, NEWS_VOICES } from "../config.js";
import { uploadBuffer } from "../storage.js";
import { compressThumbnail, compressBanner, extractDominantColor } from "../compress.js";
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

const TMP_ROOT = path.resolve("tmp/news");
const BACKUP_FILE = path.join(TMP_ROOT, "_backup.json");
const CLOUDINARY_ROOT = "elixpochat/news";

function ensureDirs(totalItems) {
  if (!fs.existsSync(TMP_ROOT)) fs.mkdirSync(TMP_ROOT, { recursive: true });
  for (let i = 0; i < totalItems; i++) {
    const dir = path.join(TMP_ROOT, `item_${i}`);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

function cleanupTmp() {
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
  console.log("🧹 Cleaned up tmp/news/");
}

function logBackup(state) {
  if (!fs.existsSync(TMP_ROOT)) fs.mkdirSync(TMP_ROOT, { recursive: true });
  fs.writeFileSync(BACKUP_FILE, JSON.stringify(state, null, 2), "utf-8");
}

function loadBackup() {
  if (!fs.existsSync(BACKUP_FILE)) return null;
  return JSON.parse(fs.readFileSync(BACKUP_FILE, "utf-8"));
}

function writeMetadata(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
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

  let backup = loadBackup();
  let overallId, topicResults, items;

  if (backup) {
    overallId = backup.overall_id;
    topicResults = backup.topics;
    items = backup.items;
    console.log("🗂️ Resumed from backup.");
  } else {
    topicResults = await fetchTrendingTopics();
    if (!topicResults.length) {
      console.log("⚠️ No trending topics found.");
      return;
    }
    const now = new Date().toISOString().replace(/\D/g, "");
    overallId = crypto.createHash("sha256").update(now).digest("hex").slice(0, 16);
    items = Array.from({ length: topicResults.length }, () => ({}));
    backup = { overall_id: overallId, topics: topicResults, items, status: "started" };
    logBackup(backup);
  }

  const totalItems = Math.min(topicResults.length, MAX_NEWS_ITEMS);
  ensureDirs(totalItems);

  for (let index = 0; index < totalItems; index++) {
    const { title: topic, category } = topicResults[index];
    const newsId = crypto.createHash("sha256").update(`${topic}-${index}-${overallId}`).digest("hex").slice(0, 16);
    const item = items[index] || {};
    const itemDir = path.join(TMP_ROOT, `item_${index}`);

    item.news_id = item.news_id || newsId;
    item.topic = item.topic || topic;
    item.category = item.category || category;

    if (item.status === "complete") {
      console.log(`✅ Skipping complete [${category}]: ${topic}`);
      continue;
    }

    console.log(`⚙️ [${index + 1}/${totalItems}] [${category}] ${topic}`);

    const prevTopic = index > 0 ? topicResults[index - 1].title : null;
    const nextTopic = index < totalItems - 1 ? topicResults[index + 1].title : null;
    const voice = NEWS_VOICES[index % NEWS_VOICES.length];

    // Step 1: Script
    if (!item.status || item.status === "started" || item.status?.includes("script_failed")) {
      try {
        const info = await safeRetry(() => generateNewsAnalysis(topic));
        const scriptData = await safeRetry(() => generateNewsScript(info, prevTopic, nextTopic, index, totalItems));
        item.timestamp = new Date().toISOString();
        item.script = scriptData.script;
        item.source_link = scriptData.source_link || "";
        item.voice = voice;
        item.status = "script_generated";
        item.error = null;
        items[index] = item;

        // Save script to item folder
        fs.writeFileSync(path.join(itemDir, "script.txt"), item.script, "utf-8");
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

    // Step 2: Banner (generated after topic/script is decided)
    if (item.status === "script_generated" || item.status?.includes("image_failed")) {
      try {
        const prompt = await generateVisualPrompt(item.topic);
        const rawImg = await safeRetry(() => generateBannerImage(prompt));
        const imgBuffer = compressBanner(rawImg, path.join(itemDir, "banner"));
        fs.writeFileSync(path.join(itemDir, "banner.jpg"), imgBuffer);

        // Extract gradient color from banner
        const gradientColor = extractDominantColor(imgBuffer, path.join(itemDir, "banner_color"));

        const imageUrl = await uploadBuffer(imgBuffer, `${CLOUDINARY_ROOT}/item_${index}`, "banner");
        item.image_url = imageUrl;
        item.gradient_color = gradientColor;
        item.status = "image_uploaded";
        item.error = null;
        items[index] = item;
        logBackup(backup);
        console.log(`✅ Banner uploaded for topic ${index}`);
      } catch (err) {
        item.status = `news${index}_image_failed`;
        item.error = err.message;
        items[index] = item;
        logBackup(backup);
        console.error(`❌ Image error for topic ${index}: ${err.message}`);
        continue;
      }
    }

    // Step 3: Audio + Transcript
    if (item.status === "image_uploaded" || item.status?.includes("audio_failed")) {
      try {
        console.log(`🎙️ Voice: ${voice} for topic ${index}`);
        const { buffer: audioBuffer, transcript } = await safeRetry(() => generateVoiceover(item.script, index, voice));

        // Save audio and transcript to item folder
        fs.writeFileSync(path.join(itemDir, "audio.mp3"), audioBuffer);
        fs.writeFileSync(path.join(itemDir, "transcript.json"), JSON.stringify(transcript, null, 2));

        const audioUrl = await uploadBuffer(audioBuffer, `${CLOUDINARY_ROOT}/item_${index}`, "audio", "video");
        const transcriptUrl = await uploadBuffer(Buffer.from(JSON.stringify(transcript)), `${CLOUDINARY_ROOT}/item_${index}`, "transcript", "raw");

        item.audio_url = audioUrl;
        item.transcript_url = transcriptUrl;
        item.status = "complete";
        item.error = null;
        items[index] = item;

        // Write item metadata
        writeMetadata(path.join(itemDir, "metadata.json"), {
          news_id: item.news_id,
          topic: item.topic,
          category: item.category,
          source_link: item.source_link,
          voice: item.voice,
          timestamp: item.timestamp,
          audio_url: item.audio_url,
          transcript_url: item.transcript_url,
          image_url: item.image_url,
        });

        logBackup(backup);
        console.log(`✅ Complete: topic ${index}`);
      } catch (err) {
        item.status = `news${index}_audio_failed`;
        item.error = err.message;
        items[index] = item;
        logBackup(backup);
        console.error(`❌ Audio error for topic ${index}: ${err.message}`);
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
    const rawThumb = await generateThumbnailImage(thumbPrompt);
    const thumbBuffer = compressThumbnail(rawThumb, path.join(TMP_ROOT, "thumbnail"));
    fs.writeFileSync(path.join(TMP_ROOT, "thumbnail.jpg"), thumbBuffer);
    const thumbUrl = await uploadBuffer(thumbBuffer, CLOUDINARY_ROOT, "thumbnail");

    const summaryText = await createCombinedNewsSummary(completedTopics);

    const dbItems = items.map((it) => ({
      audio_url: it.audio_url,
      transcript_url: it.transcript_url,
      topic: it.topic,
      category: it.category,
      image_url: it.image_url,
      source_link: it.source_link,
      gradient_color: it.gradient_color,
    }));

    await db.prepare("INSERT OR REPLACE INTO news (id, items) VALUES (?, ?)").bind(overallId, JSON.stringify(dbItems)).run();

    const statsData = JSON.stringify({
      latestNewsId: overallId,
      latestNewsThumbnail: thumbUrl,
      latestNewsSummary: summaryText,
      latestNewsDate: new Date().toISOString(),
    });
    await db.prepare("INSERT OR REPLACE INTO gen_stats (key, data) VALUES (?, ?)").bind("news", statsData).run();

    // Write overall metadata
    writeMetadata(path.join(TMP_ROOT, "metadata.json"), {
      id: overallId,
      date: new Date().toISOString(),
      summary: summaryText,
      thumbnail_url: thumbUrl,
      total_items: totalItems,
      items: dbItems,
    });

    // cleanupTmp();
    console.log("✅ News pipeline complete!");
  } catch (err) {
    backup.status = "final_error";
    backup.error = err.message;
    logBackup(backup);
    console.error(`❌ Final step error: ${err.message}`);
  }
}
