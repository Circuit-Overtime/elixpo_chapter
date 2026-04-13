import crypto from "crypto";
import fs from "fs";
import path from "path";

import { uploadBuffer } from "../storage.js";
import { compressThumbnail, compressBanner, extractDominantColor } from "../compress.js";
import { CLOUDINARY_PODCAST_ROOT, MODELS } from "../config.js";
import { generateImage } from "../pollinations.js";
import { BANNER_STYLE } from "../prompts.js";
import { fetchPodcastTopics, pickPodcastTopic } from "./topics.js";
import { getLatestInfo, generatePodcastScript } from "./creator.js";
import { generatePodcastSpeech } from "./audio.js";
import { generatePodcastThumbnail, generatePodcastBanner } from "./images.js";

const TMP_ROOT = path.resolve("tmp/podcast");
const BACKUP_FILE = path.join(TMP_ROOT, "_backup.json");

function ensureTmp() {
  if (!fs.existsSync(TMP_ROOT)) fs.mkdirSync(TMP_ROOT, { recursive: true });
  const carouselDir = path.join(TMP_ROOT, "carousel");
  if (!fs.existsSync(carouselDir)) fs.mkdirSync(carouselDir, { recursive: true });
}

function cleanupTmp() {
  fs.rmSync(TMP_ROOT, { recursive: true, force: true });
  console.log("🧹 Cleaned up tmp/podcast/");
}

function logBackup(state) {
  ensureTmp();
  fs.writeFileSync(BACKUP_FILE, JSON.stringify(state, null, 2), "utf-8");
}

function loadBackup() {
  if (!fs.existsSync(BACKUP_FILE)) return null;
  return JSON.parse(fs.readFileSync(BACKUP_FILE, "utf-8"));
}

function writeMetadata(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function generatePodcastId(podcastName) {
  const timestamp = String(Math.floor(Date.now() / 1000));
  return crypto.createHash("sha256").update(`${timestamp}_${podcastName}`).digest("hex").slice(0, 16);
}

export async function runPodcastPipeline(db) {
  console.log("🎙️ Starting podcast pipeline...");
  ensureTmp();

  let backup = loadBackup();
  let podcastId, topicName, topicSource, sections;

  if (backup && backup.status) {
    podcastId = backup.podcast_id;
    topicName = backup.topic_name;
    topicSource = backup.topic_source;
    sections = backup.sections;
    console.log("🗂️ Resumed from backup.");
  } else {
    const topics = await fetchPodcastTopics();
    if (!topics.length) { console.log("⚠️ No topics."); return; }

    const picked = await pickPodcastTopic(topics);
    topicName = (picked.podcast_title || "").replace(/,/g, " ").trim();
    topicSource = picked.source_url || "";
    podcastId = generatePodcastId(topicName);

    backup = { podcast_id: podcastId, topic_name: topicName, topic_source: topicSource, status: "topic_stored" };
    logBackup(backup);
    console.log(`📌 Topic: ${topicName} | ID: ${podcastId}`);
  }

  // Step 1: Script → { script, sections }
  if (backup.status === "topic_stored") {
    console.log("📝 Generating script...");
    const info = await getLatestInfo(topicName);
    const result = await generatePodcastScript(info, topicName, topicSource);
    sections = result.sections;
    backup.script = result.script;
    backup.sections = sections;
    backup.status = "script_generated";
    fs.writeFileSync(path.join(TMP_ROOT, "script.txt"), result.script, "utf-8");
    logBackup(backup);
  }
  sections = sections || backup.sections;

  // Step 2: Thumbnail + Banner
  if (backup.status === "script_generated") {
    console.log("🎨 Generating thumbnail + banner...");
    const rawThumb = await generatePodcastThumbnail(topicName);
    const thumbBuffer = compressThumbnail(rawThumb, path.join(TMP_ROOT, "thumbnail"));
    fs.writeFileSync(path.join(TMP_ROOT, "thumbnail.jpg"), thumbBuffer);
    const thumbUrl = await uploadBuffer(thumbBuffer, CLOUDINARY_PODCAST_ROOT, "thumbnail");

    const rawBanner = await generatePodcastBanner(topicName);
    const bannerBuffer = compressBanner(rawBanner, path.join(TMP_ROOT, "banner"));
    fs.writeFileSync(path.join(TMP_ROOT, "banner.jpg"), bannerBuffer);
    const bannerUrl = await uploadBuffer(bannerBuffer, CLOUDINARY_PODCAST_ROOT, "banner");

    const gradientColor = extractDominantColor(bannerBuffer, path.join(TMP_ROOT, "banner_color"));

    backup.thumbnail_url = thumbUrl;
    backup.banner_url = bannerUrl;
    backup.gradient_color = gradientColor;
    backup.status = "main_images_uploaded";
    logBackup(backup);
    console.log("✅ Thumbnail + banner done.");
  }

  // Step 3: 5 carousel images from [IMAGE] tags
  if (backup.status === "main_images_uploaded") {
    const imageSections = sections.filter((s) => s.type === "image");
    const carouselUrls = backup.carousel_urls || [];

    console.log(`🖼️ Generating ${imageSections.length} carousel images...`);
    for (let i = carouselUrls.length; i < imageSections.length; i++) {
      const desc = imageSections[i].content;
      console.log(`  [${i + 1}/${imageSections.length}] ${desc.slice(0, 60)}...`);
      const imgBuffer = await generateImage({
        prompt: `${desc} ${BANNER_STYLE}`,
        width: 1280,
        height: 720,
        model: MODELS.imageGen,
        seed: 300 + i,
      });
      const compressed = compressBanner(imgBuffer, path.join(TMP_ROOT, "carousel", `slide_${i}`));
      fs.writeFileSync(path.join(TMP_ROOT, "carousel", `slide_${i}.jpg`), compressed);
      const url = await uploadBuffer(compressed, `${CLOUDINARY_PODCAST_ROOT}/carousel`, `slide_${i}`);
      carouselUrls.push(url);
      backup.carousel_urls = carouselUrls;
      logBackup(backup);
    }

    backup.status = "carousel_uploaded";
    logBackup(backup);
    console.log(`✅ ${carouselUrls.length} carousel images done.`);
  }

  // Step 4: Multi-voice speech + timeline
  if (backup.status === "carousel_uploaded") {
    console.log("🔊 Generating multi-voice speech...");
    const { buffer: speechBuffer, timeline } = await generatePodcastSpeech(sections);

    fs.writeFileSync(path.join(TMP_ROOT, "audio.mp3"), speechBuffer);
    fs.writeFileSync(path.join(TMP_ROOT, "timeline.json"), JSON.stringify(timeline, null, 2));

    const audioUrl = await uploadBuffer(speechBuffer, CLOUDINARY_PODCAST_ROOT, "audio", "video");
    const timelineUrl = await uploadBuffer(Buffer.from(JSON.stringify(timeline)), CLOUDINARY_PODCAST_ROOT, "timeline", "raw");

    backup.audio_url = audioUrl;
    backup.timeline_url = timelineUrl;
    backup.status = "audio_uploaded";
    logBackup(backup);
    console.log("✅ Speech + timeline uploaded.");
  }

  // Step 5: Save to D1 + metadata
  if (backup.status === "audio_uploaded") {
    console.log("💾 Saving to database...");

    const timeline = JSON.parse(fs.readFileSync(path.join(TMP_ROOT, "timeline.json"), "utf-8"));
    const lastSpeech = [...timeline].reverse().find((t) => t.type !== "image");
    const duration = lastSpeech ? Math.ceil(lastSpeech.end) : null;

    // Map carousel images to time positions
    const imageTimeline = timeline.filter((t) => t.type === "image").map((t, i) => ({
      time: t.start,
      url: (backup.carousel_urls || [])[i] || "",
      description: t.content,
    }));

    await db
      .prepare(
        "INSERT OR REPLACE INTO podcasts (id, podcast_name, podcast_audio_url, podcast_music_url, podcast_transcript_url, podcast_thumbnail_url, podcast_banner_url, topic_source) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .bind(podcastId, topicName, backup.audio_url, "", backup.transcript_url || "", backup.thumbnail_url, backup.banner_url, topicSource)
      .run();

    const statsData = JSON.stringify({
      latestPodcastID: podcastId,
      latestPodcastName: topicName,
      latestPodcastThumbnail: backup.thumbnail_url,
      latestPodcastBanner: backup.banner_url,
      gradientColor: backup.gradient_color,
      timelineUrl: backup.timeline_url,
      carouselImages: imageTimeline,
      duration,
    });
    await db.prepare("INSERT OR REPLACE INTO gen_stats (key, data) VALUES (?, ?)").bind("podcast", statsData).run();

    writeMetadata(path.join(TMP_ROOT, "metadata.json"), {
      id: podcastId,
      name: topicName,
      source: topicSource,
      date: new Date().toISOString(),
      duration,
      gradient_color: backup.gradient_color,
      audio_url: backup.audio_url,
      transcript_url: backup.transcript_url,
      timeline_url: backup.timeline_url,
      thumbnail_url: backup.thumbnail_url,
      banner_url: backup.banner_url,
      carousel: imageTimeline,
    });

    // cleanupTmp();
    backup.status = "complete";
    console.log("✅ Podcast pipeline complete!");
  }
}
