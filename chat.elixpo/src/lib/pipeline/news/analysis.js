import { chatCompletion } from "../pollinations.js";


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
 * Generate a news script from analysis content with awareness of surrounding stories.
 * @param {string} analysisContent - The researched content for this topic
 * @param {string|null} prevTopic - The previous news topic (for transition context)
 * @param {string|null} nextTopic - The next news topic (for teaser context)
 * @param {number} index - Index of this news item (0-based)
 * @param {number} total - Total number of news items
 * Returns { script, source_link }.
 */
export async function generateNewsScript(analysisContent, prevTopic, nextTopic, index, total) {
  console.log("📝 Generating news script...");

  let contextHint = "";
  if (index === 0) {
    contextHint = `This is the FIRST story in today's Elixpo Daily (${total} stories total). Open with a brief, warm welcome to Elixpo Daily — just one line, then dive into the story. `;
    if (nextTopic) contextHint += `At the end, tease the next story naturally: "${nextTopic}". `;
  } else if (index === total - 1) {
    contextHint = `This is the LAST story in today's Elixpo Daily. `;
    if (prevTopic) contextHint += `The previous story was about "${prevTopic}" — transition naturally from that. `;
    contextHint += `End with a warm sign-off: thank listeners for tuning into Elixpo Daily and invite them back tomorrow. `;
  } else {
    if (prevTopic) contextHint += `The previous story was about "${prevTopic}" — open with a brief natural transition from that. `;
    if (nextTopic) contextHint += `At the end, tease the next story: "${nextTopic}". `;
  }

  const systemPrompt =
    "You are the engaging, warm, and sharp newswriter for 'Elixpo Daily'. " +
    "Write news scripts that feel like a friend telling you something fascinating — not a formal anchor reading a teleprompter. " +
    contextHint +
    "CRITICAL: Output ONLY the spoken words. NO music cues, NO sound effects, NO stage directions, NO parentheticals, NO bold text, NO asterisks, NO markdown. Just pure, clean spoken prose. " +
    "Write based ONLY on the provided analysis — don't invent facts. But tell the story with energy, clarity, and charm. " +
    "Use rhetorical questions, vivid descriptions, and natural transitions. Make the listener feel the weight or excitement of the news. " +
    "Keep the script to exactly 1 minute of narration (140-160 words). Be concise but impactful — every word counts. " +
    'Return the script and the news source link as JSON: {"script": "...", "source_link": "..."}';

  const raw = await chatCompletion({
    model: "gemini-fast",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Create a news script based on this analysis: ${analysisContent}` },
    ],
    json: true,
    seed: 123 + index,
  });

  const parsed = JSON.parse(raw);
  if (!parsed.script) throw new Error("Script generation returned no script");
  console.log("✅ News script generated.");
  return parsed;
}
