import { chatCompletion, generateImage } from "../pollinations.js";

/**
 * Generate a visual prompt for a news banner image.
 */
export async function generateVisualPrompt(topic) {
  const systemPrompt =
    "You are a visual scene translator for podcast topics. Your task is to deeply understand the given text and extract the core setting or subject it refers to, " +
    "ignoring specific names, brands, or people. Instead, convert it into a relaxing, realistic scene described in the style of a watercolor painting. " +
    "Always focus on evoking calm, cinematic imagery — like misty mornings, soft backlighting, natural textures, and the Tyndall effect. " +
    "Avoid text, characters, or clutter. Think in terms of peaceful visual therapy. Use artistic terms like 'water painting', 'sun-drenched landscape', 'serene golf course at dawn', " +
    "'cinematic lighting', 'soft haze', or 'distant silhouette'. Output just one 25-30 word image description suitable for a banner (1280x720).";

  return chatCompletion({
    model: "gemini-fast",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: topic },
    ],
    seed: 42,
  });
}

/**
 * Generate banner image (1280x720) for a news item.
 * @returns {Buffer} Image bytes
 */
export async function generateBannerImage(prompt) {
  console.log(`🖼️ Generating banner image...`);
  return generateImage({
    prompt: `${prompt} -- aspect ratio of 16:9 landscape mode`,
    width: 1280,
    height: 720,
    model: "zimage",
    seed: 42,
  });
}

/**
 * Generate a combined visual prompt for a thumbnail from multiple topics.
 */
export async function createCombinedVisualPrompt(topics) {
  const systemPrompt =
    "You're an AI art prompt generator. Given multiple news topics, combine their essence into a single cohesive visual scene. " +
    "Generate a colored vector digital illustration (not realistic) in a 1:1 square format (512x512), suitable for icon or thumbnail use. " +
    "The style should be vibrant, minimal yet meaningful, and thematically unified — no text, no faces. Think in terms of abstract symbols, color harmony, and metaphor. " +
    "Output just one short prompt of 40-50 words, describing what the image should look like — in vector art terms.";

  const combined = Array.isArray(topics) ? topics.join(" | ") : topics;
  return chatCompletion({
    model: "gemini-fast",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: combined },
    ],
    seed: 42,
    temperature: 0.4,
  });
}

/**
 * Generate a vector-style thumbnail image (512x512).
 * @returns {Buffer} Image bytes
 */
export async function generateThumbnailImage(prompt) {
  console.log(`🎨 Generating thumbnail image...`);
  return generateImage({
    prompt: `${prompt} -- vector digital art -- colorful -- 1:1 icon style`,
    width: 512,
    height: 512,
    model: "zimage",
    seed: 42,
  });
}

/**
 * Create a combined news summary from multiple topics.
 */
export async function createCombinedNewsSummary(topics) {
  const combined = Array.isArray(topics) ? topics.join(" | ") : topics;
  return chatCompletion({
    model: "gemini-fast",
    messages: [
      {
        role: "system",
        content:
          "Given several news headlines, write a single concise summary that combines their main ideas. " +
          "The summary should be 20 words long, clear, and capture the essence of all topics.",
      },
      { role: "user", content: combined },
    ],
    seed: 42,
    temperature: 0.4,
  });
}
