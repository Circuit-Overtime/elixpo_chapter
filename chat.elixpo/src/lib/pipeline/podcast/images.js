import { chatCompletion, generateImage } from "../pollinations.js";

/**
 * Generate a visual prompt for podcast images.
 * @param {"thumbnail"|"banner"} imageType
 */
export async function generateVisualPrompt(topic, imageType) {
  const systemPrompts = {
    thumbnail:
      "You're a prompt engineer for AI image generation. Given a podcast title or topic, craft a striking thumbnail description in a short sentence. " +
      "The output should be visually bold and conceptually relevant to the topic. " +
      "Avoid generic robotic faces or tech blobs. Instead, understand the topic and hint at metaphors or symbols like colorful microphones, headphones, " +
      "scenes from the theme (e.g., astronomy, gaming), or artistic interpretations that would attract a viewer. " +
      "Make it pop: use vivid adjectives, 'illustration', 'vector art', 'vibrant colors', and strong contrast. Avoid all text or logos. " +
      "Output only a single sentence, about 30 words, no formatting or lists.",
    banner:
      "You're a visual prompt generator for AI art. Given a podcast topic, produce a realistic, serene, oil-painting-style scene in a short sentence suitable for a cinematic banner (1280x720). " +
      "Focus on atmosphere, lighting, and visual clarity — avoid clutter or text. Use phrases like 'oil painting', 'cinematic lighting', 'soft focus', or 'Tyndall effect'. " +
      "Produce a single, clear image description in 30 words, no markdown formatting or overheads.",
  };

  return chatCompletion({
    model: "openai-fast",
    messages: [
      { role: "system", content: systemPrompts[imageType] },
      { role: "user", content: topic },
    ],
    seed: Math.floor(Math.random() * 999999),
  });
}

/**
 * Generate podcast thumbnail (512x512).
 * @returns {Buffer}
 */
export async function generatePodcastThumbnail(topic) {
  const prompt = await generateVisualPrompt(topic, "thumbnail");
  console.log("🎨 Generating podcast thumbnail...");
  return generateImage({
    prompt: `${prompt} -- aspect ratio of 1:1 square mode`,
    width: 512,
    height: 512,
    model: "flux",
    seed: 56,
  });
}

/**
 * Generate podcast banner (1280x720).
 * @returns {Buffer}
 */
export async function generatePodcastBanner(topic) {
  const prompt = await generateVisualPrompt(topic, "banner");
  console.log("🖼️ Generating podcast banner...");
  return generateImage({
    prompt: `${prompt} -- aspect ratio of 16:9 landscape mode`,
    width: 1280,
    height: 720,
    model: "flux",
    seed: 56,
  });
}
