import { chatCompletion } from "../pollinations.js";

/**
 * Research a news topic using perplexity-fast (has web search).
 */
export async function generateNewsAnalysis(newsTitle) {
  console.log(`🔬 Researching '${newsTitle}' via perplexity-fast...`);
  const content = await chatCompletion({
    model: "perplexity-fast",
    messages: [
      { role: "user", content: `Give me the latest detailed news for the topic: ${newsTitle}` },
    ],
  });

  if (!content) throw new Error("perplexity-fast returned empty content");
  console.log("✅ Analysis received.");
  return content;
}

/**
 * Generate a news script from analysis content. Returns { script, source_link }.
 */
export async function generateNewsScript(analysisContent) {
  console.log("📝 Generating news script...");
  const systemPrompt =
    "You are the lively, engaging, and emotionally intelligent newswriter for the 'Elixpo Daily News'. " +
    "Start directly with the topic — no introductions or identity mentions. " +
    "Write the news in a crisp, energetic, and approachable tone based *only* on the provided analysis. " +
    "Use fast-paced storytelling, clear language, and emotional color where appropriate, maintaining a warm, human, and trustworthy presence. " +
    "You may add a gentle chuckle, subtle pauses, or light empathy if appropriate — never robotic or dull. " +
    "Avoid markdown, bullet points, or any formatting — just plain text. Write the final script in fluent, flowing prose. " +
    "Do not invent facts or add commentary beyond the content provided in the analysis. Stick tightly to the given material, but write with charm and energy. " +
    "Keep the script suitable for a short podcast narration of about 1–2 minutes. Use natural transitions and avoid formal tone or filler. " +
    "Ensure the script flows well for natural speech. " +
    'Return the script and the link of the news source in a JSON object with keys "script" and "source_link". ' +
    'Example: {"script": "Your script here.", "source_link": "the news link here"}';

  const raw = await chatCompletion({
    model: "openai",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Create a news script based on this analysis: ${analysisContent}` },
    ],
    json: true,
    seed: 123,
  });

  const parsed = JSON.parse(raw);
  if (!parsed.script) throw new Error("Script generation returned no script");
  console.log("✅ News script generated.");
  return parsed;
}
