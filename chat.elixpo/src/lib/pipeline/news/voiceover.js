import fs from "fs";
import path from "path";
import { generateAudio, transcribeAudio } from "../pollinations.js";
import { compressAudio } from "../compress.js";
import { NEWS_TTS_PROMPT } from "../prompts.js";

export async function generateVoiceover(script, newsIndex, voice = "shimmer") {
  const itemDir = path.resolve(`tmp/news/item_${newsIndex}`);
  if (!fs.existsSync(itemDir)) fs.mkdirSync(itemDir, { recursive: true });

  console.log(`🎙️ Generating voiceover for topic ${newsIndex} (${voice})...`);
  const base64 = await generateAudio({ script, voice, developerPrompt: NEWS_TTS_PROMPT });
  const rawBuffer = Buffer.from(base64, "base64");

  const buffer = compressAudio(rawBuffer, path.join(itemDir, "audio"));
  fs.writeFileSync(path.join(itemDir, "audio.mp3"), buffer);
  console.log(`✅ Voiceover saved (${buffer.length} bytes)`);

  console.log(`📝 Transcribing audio for topic ${newsIndex}...`);
  const transcript = await transcribeAudio(buffer, `news${newsIndex}.mp3`);
  console.log(`✅ Transcript: ${transcript.segments?.length || 0} segments`);

  return { buffer, transcript };
}
