import crypto from "crypto";
import fs from "fs";
import path from "path";

import { uploadBuffer, deleteFolder } from "../storage.js";
import { fetchPodcastTopics, pickPodcastTopic } from "./topics.js";
import { getLatestInfo, generatePodcastScript } from "./creator.js";
import { generatePodcastSpeech } from "./audio.js";
import { generatePodcastThumbnail, generatePodcastBanner } from "./images.js";

const BACKUP_FILE = path.resolve("tmp/podcastBackup.json");
const CLOUDINARY_ROOT = "elixpochat/podcast";

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

function generatePodcastId(podcastName) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  return crypto.createHash("sha256").update(`${timestamp}_${podcastName}`).digest("hex").slice(0, 16);
}

/**
 * Run the full podcast generation pipeline.
 * @param {D1Database} db - Cloudflare D1 database
 */
export async function runPodcastPipeline(db) {
  console.log("🎙️ Starting podcast pipeline...");
  ensureTmp();

  let backup = loadBackup();
  let podcastId, topicName, topicSource, podcastScript;

  if (backup && backup.status) {
    podcastId = backup.podcast_id;
    topicName = backup.topic_name;
    topicSource = backup.topic_source;
    podcastScript = backup.podcast_script;
    console.log("🗂️ Resumed from backup.");
  } else {
    const topics = await fetchPodcastTopics();
    if (!topics.length) {
      console.log("⚠️ No trending topics found.");
      return;
    }

    const picked = await pickPodcastTopic(topics);
    topicName = (picked.podcast_title || "").replace(/,/g, " ").trim();
    topicSource = picked.source_url || "";
    podcastId = generatePodcastId(topicName);

    backup = {
      podcast_id: podcastId,
      topic_name: topicName,
      topic_source: topicSource,
      status: "topic_stored",
    };
    logBackup(backup);
    console.log(`📌 Topic stored: ${topicName} | ID: ${podcastId}`);
  }

  const folder = `${CLOUDINARY_ROOT}/${podcastId}`;

  // Script generation
  if (backup.status === "topic_stored") {
    console.log("📝 Generating podcast script...");
    const info = await getLatestInfo(topicName);
    podcastScript = await generatePodcastScript(info, topicName);
    backup.podcast_script = podcastScript;
    backup.status = "script_generated";
    logBackup(backup);
    console.log("✅ Script generated.");
  }

  // Speech + transcript
  if (backup.status === "script_generated") {
    console.log("🔊 Generating speech...");
    const { buffer: speechBuffer, transcript } = await generatePodcastSpeech(podcastScript || backup.podcast_script);
    const audioUrl = await uploadBuffer(speechBuffer, folder, "audio", "video");
    const transcriptUrl = await uploadBuffer(Buffer.from(JSON.stringify(transcript)), folder, "transcript", "raw");
    backup.audio_url = audioUrl;
    backup.transcript_url = transcriptUrl;
    backup.status = "audio_uploaded";
    logBackup(backup);
    console.log("✅ Speech + transcript uploaded.");
  }

  // Images
  if (backup.status === "audio_uploaded") {
    console.log("🎨 Generating images...");
    const thumbBuffer = await generatePodcastThumbnail(topicName);
    const thumbUrl = await uploadBuffer(thumbBuffer, folder, "thumbnail");

    const bannerBuffer = await generatePodcastBanner(topicName);
    const bannerUrl = await uploadBuffer(bannerBuffer, folder, "banner");

    backup.thumbnail_url = thumbUrl;
    backup.banner_url = bannerUrl;
    backup.status = "images_uploaded";
    logBackup(backup);
    console.log("✅ Images uploaded.");
  }

  // Write to D1 and cleanup
  if (backup.status === "images_uploaded") {
    console.log("💾 Saving to database...");

    await db
      .prepare(
        "INSERT OR REPLACE INTO podcasts (id, podcast_name, podcast_audio_url, podcast_music_url, podcast_transcript_url, podcast_thumbnail_url, podcast_banner_url, topic_source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(podcastId, topicName, backup.audio_url, backup.music_url || "", backup.transcript_url || "", backup.thumbnail_url, backup.banner_url, topicSource)
      .run();

    // Cleanup old podcast
    const prevStats = await db.prepare("SELECT data FROM gen_stats WHERE key = ?").bind("podcast").first();
    if (prevStats) {
      const prev = JSON.parse(prevStats.data);
      if (prev.latestPodcastID && prev.latestPodcastID !== podcastId) {
        await deleteFolder(`${CLOUDINARY_ROOT}/${prev.latestPodcastID}`);
      }
    }

    const statsData = JSON.stringify({
      latestPodcastID: podcastId,
      latestPodcastName: topicName,
      latestPodcastThumbnail: backup.thumbnail_url,
      latestPodcastBanner: backup.banner_url,
    });
    await db.prepare("INSERT OR REPLACE INTO gen_stats (key, data) VALUES (?, ?)").bind("podcast", statsData).run();

    fs.unlinkSync(BACKUP_FILE);
    backup.status = "complete";
    console.log("✅ Podcast pipeline complete!");
  }
}
