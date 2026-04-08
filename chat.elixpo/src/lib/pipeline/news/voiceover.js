import { generateSpeech } from "../pollinations.js";

/**
 * Generate voiceover audio for a news script via elevenlabs TTS.
 * @returns {Buffer} MP3 audio buffer
 */
export async function generateVoiceover(script, newsIndex, voice = "shimmer") {
  console.log(`🎙️ Generating voiceover for topic ${newsIndex} (elevenlabs)...`);
  const buffer = await generateSpeech({ text: script, voice });
  console.log(`✅ Voiceover generated for topic ${newsIndex}`);
  return buffer;
}
