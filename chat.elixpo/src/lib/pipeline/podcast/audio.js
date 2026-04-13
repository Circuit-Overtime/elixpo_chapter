import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { generateAudio, transcribeAudio } from "../pollinations.js";
import { compressAudio } from "../compress.js";
import { PODCAST_VOICE_FEMALE, PODCAST_VOICE_MALE } from "../config.js";
import { PODCAST_TTS_PROMPT } from "../prompts.js";

const TMP = path.resolve("tmp/podcast");

/**
 * Generate podcast speech from parsed sections.
 * Each [MALE]/[FEMALE] section gets its own audio with the right voice.
 * Concatenated into one final audio. Returns buffer, transcript, and
 * a timeline mapping each section to its time range in the final audio.
 *
 * @param {Array<{type: string, content: string}>} sections - Parsed script sections (male/female/image)
 * @returns {{ buffer: Buffer, transcript: object, timeline: Array<{type: string, content: string, start: number, end: number}> }}
 */
export async function generatePodcastSpeech(sections) {
  if (!fs.existsSync(TMP)) fs.mkdirSync(TMP, { recursive: true });

  const speechSections = sections.filter((s) => s.type === "male" || s.type === "female");
  const segmentPaths = [];
  const segmentDurations = [];

  for (let i = 0; i < speechSections.length; i++) {
    const section = speechSections[i];
    const voice = section.type === "male" ? PODCAST_VOICE_MALE : PODCAST_VOICE_FEMALE;
    const segPath = path.join(TMP, `segment_${i}.mp3`);

    console.log(`🎙️ [${i + 1}/${speechSections.length}] ${section.type} (${voice})...`);
    const base64 = await generateAudio({
      script: section.content,
      voice,
      developerPrompt: PODCAST_TTS_PROMPT,
    });
    const rawBuffer = Buffer.from(base64, "base64");
    const compressed = compressAudio(rawBuffer, path.join(TMP, `segment_${i}`));
    fs.writeFileSync(segPath, compressed);
    segmentPaths.push(segPath);

    // Get duration of this segment via ffprobe
    let dur = 0;
    try {
      const raw = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${segPath}" 2>/dev/null`).toString().trim();
      dur = parseFloat(raw) || 0;
    } catch { dur = 0; }
    segmentDurations.push(dur);

    console.log(`  ✅ Segment ${i + 1}: ${dur.toFixed(1)}s (${(compressed.length / 1024).toFixed(0)}KB)`);
  }

  // Concatenate all segments
  console.log("🔗 Concatenating segments...");
  const listPath = path.join(TMP, "segments.txt");
  fs.writeFileSync(listPath, segmentPaths.map((p) => `file '${p}'`).join("\n"));

  const finalPath = path.join(TMP, "audio.mp3");
  try {
    // Concat with 150ms crossfade between segments for natural speaker transitions
    const filterParts = [];
    let inputArgs = "";
    for (let i = 0; i < segmentPaths.length; i++) inputArgs += ` -i "${segmentPaths[i]}"`;

    if (segmentPaths.length === 1) {
      execSync(`ffmpeg -y -i "${segmentPaths[0]}" -codec:a libmp3lame -b:a 128k "${finalPath}" 2>/dev/null`);
    } else {
      // Use acrossfade for pairs, then chain them
      let chain = "[0:a]";
      for (let i = 1; i < segmentPaths.length; i++) {
        const out = i === segmentPaths.length - 1 ? "" : `[a${i}]`;
        filterParts.push(`${chain}[${i}:a]acrossfade=d=0.15:c1=tri:c2=tri${out ? out : ""}`);
        chain = `[a${i}]`;
      }
      execSync(`ffmpeg -y${inputArgs} -filter_complex "${filterParts.join(";")}" -codec:a libmp3lame -b:a 128k "${finalPath}" 2>/dev/null`);
    }
  } catch {
    console.warn("  ⚠️ Concat failed, merging buffers");
    fs.writeFileSync(finalPath, Buffer.concat(segmentPaths.map((p) => fs.readFileSync(p))));
  }

  const buffer = fs.readFileSync(finalPath);
  console.log(`✅ Final audio: ${(buffer.length / 1024).toFixed(0)}KB`);

  // Build timeline — maps each section (speech + image) to a time range
  const timeline = [];
  let speechIdx = 0;
  let runningTime = 0;

  for (const section of sections) {
    if (section.type === "male" || section.type === "female") {
      const dur = segmentDurations[speechIdx] || 0;
      timeline.push({
        type: section.type,
        content: section.content,
        start: Math.round(runningTime * 100) / 100,
        end: Math.round((runningTime + dur) * 100) / 100,
      });
      runningTime += dur;
      speechIdx++;
    } else if (section.type === "image") {
      // Image appears at the current time position
      timeline.push({
        type: "image",
        content: section.content,
        start: Math.round(runningTime * 100) / 100,
        end: Math.round(runningTime * 100) / 100, // instant marker
      });
    }
  }

  // Save timeline
  fs.writeFileSync(path.join(TMP, "timeline.json"), JSON.stringify(timeline, null, 2));
  console.log(`📋 Timeline: ${timeline.length} entries`);

  // Cleanup segment files
  for (const p of segmentPaths) if (fs.existsSync(p)) fs.unlinkSync(p);
  if (fs.existsSync(listPath)) fs.unlinkSync(listPath);

  // Transcribe
  console.log("📝 Transcribing final audio...");
  const transcript = await transcribeAudio(buffer, "podcast.mp3");
  console.log(`✅ Transcript: ${transcript.segments?.length || 0} segments`);

  return { buffer, transcript, timeline };
}
