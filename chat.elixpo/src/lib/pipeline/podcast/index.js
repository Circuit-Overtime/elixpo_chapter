import crypto from "crypto";
import fs from "fs";
import path from "path";

import { uploadBuffer, deleteFolder } from "../storage.js";
import { fetchPodcastTopics, pickPodcastTopic } from "./topics.js";
import { getLatestInfo, generatePodcastScript } from "./creator.js";
import { generatePodcastSpeech, generatePodcastMusic } from "./audio.js";
import { generatePodcastThumbnail, generatePodcastBanner } from "./images.js";

const BACKUP_FILE = path.resolve("tmp/podcastBackup.json");

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
  return crypto.createHash("sha256").update(`${timestamp}_${podcastName}`).digest("hex");
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
    // Fetch and pick topic
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

  // Speech generation (elevenlabs)
  if (backup.status === "script_generated") {
    console.log("🔊 Generating speech...");
    const speechBuffer = await generatePodcastSpeech(podcastScript || backup.podcast_script);
    const audioUrl = await uploadBuffer(speechBuffer, `podcast/${podcastId}`, `podcast_${podcastId}`, "video");
    backup.audio_url = audioUrl;
    backup.status = "speech_uploaded";
    logBackup(backup);
    console.log("✅ Speech uploaded.");
  }

  // Background music generation (acestep)
  if (backup.status === "speech_uploaded") {
    console.log("🎵 Generating background music...");
    const musicBuffer = await generatePodcastMusic(topicName, 60);
    const musicUrl = await uploadBuffer(musicBuffer, `podcast/${podcastId}`, `podcast_music_${podcastId}`, "video");
    backup.music_url = musicUrl;
    backup.status = "audio_uploaded";
    logBackup(backup);
    console.log("✅ Background music uploaded.");
  }

  // Thumbnail & Banner
  if (backup.status === "audio_uploaded") {
    console.log("🎨 Generating images...");
    const thumbBuffer = await generatePodcastThumbnail(topicName);
    const thumbUrl = await uploadBuffer(thumbBuffer, `podcast/${podcastId}`, `podcastThumbnail_${podcastId}`);

    const bannerBuffer = await generatePodcastBanner(topicName);
    const bannerUrl = await uploadBuffer(bannerBuffer, `podcast/${podcastId}`, `podcastBanner_${podcastId}`);

    backup.thumbnail_url = thumbUrl;
    backup.banner_url = bannerUrl;
    backup.status = "images_uploaded";
    logBackup(backup);
    console.log("✅ Images uploaded.");
  }

  // Write to D1 and cleanup
  if (backup.status === "images_uploaded") {
    console.log("💾 Saving to database...");

    // Insert podcast record
    await db
      .prepare(
        "INSERT OR REPLACE INTO podcasts (id, podcast_name, podcast_audio_url, topic_source, podcast_banner_url) VALUES (?, ?, ?, ?, ?)"
      )
      .bind(podcastId, topicName, backup.audio_url, topicSource, backup.banner_url)
      .run();

    // Cleanup old podcast from Cloudinary
    const prevStats = await db.prepare("SELECT data FROM gen_stats WHERE key = ?").bind("podcast").first();
    if (prevStats) {
      const prev = JSON.parse(prevStats.data);
      if (prev.latestPodcastID && prev.latestPodcastID !== podcastId) {
        await deleteFolder(`podcast/${prev.latestPodcastID}`);
      }
    }

    // Update gen_stats
    const statsData = JSON.stringify({
      latestPodcastID: podcastId,
      latestPodcastName: topicName,
      latestPodcastThumbnail: backup.thumbnail_url,
    });
    await db.prepare("INSERT OR REPLACE INTO gen_stats (key, data) VALUES (?, ?)").bind("podcast", statsData).run();

    // Cleanup backup
    fs.unlinkSync(BACKUP_FILE);
    backup.status = "complete";
    console.log("✅ Podcast pipeline complete!");
  }
}
