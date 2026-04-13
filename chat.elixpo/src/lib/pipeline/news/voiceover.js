import fs from "fs";
import path from "path";
import { generateAudio, chatCompletion } from "../pollinations.js";
import { compressAudio } from "../compress.js";
import { NEWS_TTS_PROMPT } from "../prompts.js";
import { MODELS } from "../config.js";

const TRIGGER_WORDS = /\b(psychosis|suicide|suicidal|self-harm|kill|murder|assault|abuse|rape|violence|drug abuse|overdose|terrorist|terrorism|bomb|shoot|weapon|extremist)\b/gi;

function sanitizeForParaphrase(text) {
  return text.replace(TRIGGER_WORDS, "[topic]");
}

export async function generateVoiceover(script, newsIndex, voice = "shimmer") {
  const itemDir = path.resolve(`tmp/news/item_${newsIndex}`);
  if (!fs.existsSync(itemDir)) fs.mkdirSync(itemDir, { recursive: true });

  console.log(`🎙️ Generating voiceover for topic ${newsIndex} (${voice})...`);

  let text = script;
  let base64 = null;
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      base64 = await generateAudio({ script: text, voice, developerPrompt: NEWS_TTS_PROMPT });
      break;
    } catch (err) {
      const isContentFilter = err.message?.includes("content management policy") || err.message?.includes("filtered");
      if (!isContentFilter || attempt === maxAttempts - 1) throw err;

      console.warn(`  ⚠️ Content filter hit on topic ${newsIndex}, paraphrasing (attempt ${attempt + 2})...`);
      console.warn(`  📄 Blocked text: "${text.slice(0, 150)}..."`);
      const safeInput = sanitizeForParaphrase(text);
      text = await chatCompletion({
        model: MODELS.promptWriter,
        messages: [
          { role: "system", content: "Rewrite the following spoken dialogue to be friendly and safe for all audiences. Replace any references marked [topic] with gentle neutral phrasing. Keep the same conversational tone, same length, same meaning. Output only the rewritten text, nothing else." },
          { role: "user", content: safeInput },
        ],
        seed : 58541,
      });
    }
  }

  const rawBuffer = Buffer.from(base64, "base64");
  const buffer = compressAudio(rawBuffer, path.join(itemDir, "audio"));
  fs.writeFileSync(path.join(itemDir, "audio.mp3"), buffer);
  console.log(`✅ Voiceover saved (${buffer.length} bytes)`);

  return { buffer };
}
