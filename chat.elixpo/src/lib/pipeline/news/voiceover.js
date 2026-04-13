import { generateAudio, transcribeAudio } from "../pollinations.js";

const DEVELOPER_PROMPT =
  "You are a charismatic news host narrating a story for Elixpo Daily. " +
  "Your pace is lively and confident — you move with energy, like someone genuinely excited to share this news. " +
  "But you know when to breathe. A brief pause before a big reveal, a beat after a surprising fact, then right back to momentum. " +
  "Your voice has range: curiosity when posing questions, warmth when something matters, a spark of excitement when something is genuinely cool. " +
  "Sound human — natural breaths, the occasional 'you know' or 'right?', a genuine reaction if something is wild or funny. " +
  "Don't paraphrase or skip anything — narrate the script fully, word for word, with feeling and conviction. " +
  "Think of your favorite news podcast host — sharp, relatable, clear, and engaging. Not a monotone anchor. Not a screaming YouTuber. Just a great storyteller who happens to be delivering the news. " +
  "No robotic reading. No rushing through content. No sleepy delivery. Every sentence should land.";

/**
 * Generate voiceover audio + transcript for a news script.
 * @param {string} script - The news script text
 * @param {number} newsIndex - Index of the news item
 * @param {string} voice - "shimmer" (female) or "ash" (male)
 * @returns {{ buffer: Buffer, transcript: object }} WAV audio buffer + whisper transcript
 */
export async function generateVoiceover(script, newsIndex, voice = "shimmer") {
  console.log(`🎙️ Generating voiceover for topic ${newsIndex} (${voice})...`);
  const base64 = await generateAudio({ script, voice, developerPrompt: DEVELOPER_PROMPT });
  const buffer = Buffer.from(base64, "base64");
  console.log(`✅ Voiceover generated for topic ${newsIndex}`);

  console.log(`📝 Transcribing audio for topic ${newsIndex}...`);
  const transcript = await transcribeAudio(buffer, `news${newsIndex}.wav`);
  console.log(`✅ Transcript generated for topic ${newsIndex}`);

  return { buffer, transcript };
}
