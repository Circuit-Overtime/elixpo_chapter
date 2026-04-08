import { chatCompletion } from "../pollinations.js";

export async function getLatestInfo(topicName) {
  console.log(`🔍 Fetching latest info for: ${topicName}`);
  const content = await chatCompletion({
    model: "perplexity-fast",
    messages: [
      { role: "user", content: `Find me the detailed latest news on this topic: ${topicName}` },
    ],
    seed: Math.floor(Math.random() * 1000),
  });

  if (!content) throw new Error("perplexity-fast returned empty content");
  console.log("✅ Received info from perplexity-fast.");
  return content;
}

export async function generatePodcastScript(infoMarkdown, topicName) {
  console.log("⏳ Generating podcast script...");
  const now = new Date().toISOString();
  const systemPrompt =
    "You are a lively, expressive, and emotionally intelligent podcast scriptwriter for the 'Elixpo Podcast'. " +
    `For your context the current date/time is ${now}. Do mention the current date if it doesn't match the news. ` +
    "Greet the listener at the start with a warm welcome to the 'Elixpo Podcast' and mention the topic being spoken. " +
    "Write in an approachable, storytelling tone — not fast-paced, but immersive and detailed. The listener should feel like they're hearing a story unfold, not a news summary. " +
    "Go deep into the details. Explain context, give background, draw connections. Don't just state facts — tell the story behind them. Use analogies, rhetorical questions, and vivid descriptions to keep the listener engaged. " +
    "CRITICAL: Output ONLY the spoken words. NO music cues, NO sound effects, NO stage directions, NO parentheticals like '(Intro Music)', '(Sound of...)', '(pause)', '(chuckles)', etc. " +
    "NO bold text, NO asterisks, NO markdown formatting of any kind. Just pure, clean, flowing spoken prose. " +
    "Don't be afraid to sound human — casual rephrases, light humor, rhetorical questions. " +
    "End with a thoughtful, confident wrap-up that feels like a real podcast conclusion. " +
    "Speak only based on the provided content — don't invent unrelated details. " +
    "Generate a 5-minute script (1800-2200 words). This is important — the script must be long enough for a full 5-minute narration. " +
    "Don't include repetitive words in the greeting!";

  const script = await chatCompletion({
    model: "gemini-fast",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Based on this content about '${topicName}':\n\n${infoMarkdown}\n\nWrite a detailed podcast script of 1800–2200 words (5 minutes). Go deep, explain context, tell the full story.`,
      },
    ],
    seed: Math.floor(Math.random() * 1000),
  });

  if (!script) throw new Error("Podcast script generation returned empty");
  console.log("✅ Podcast script generated.");
  return script;
}
