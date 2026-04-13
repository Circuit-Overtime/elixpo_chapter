import { chatCompletion } from "../pollinations.js";
import { MODELS, PODCAST_HOST_FEMALE, PODCAST_HOST_MALE } from "../config.js";

export async function getLatestInfo(topicName) {
  console.log(`🔍 Fetching latest info for: ${topicName}`);
  const content = await chatCompletion({
    model: MODELS.research,
    messages: [
      { role: "user", content: `Find me the detailed latest news on this topic: ${topicName}` },
    ],
    seed: Math.floor(Math.random() * 1000),
  });

  if (!content) throw new Error("Research returned empty content");
  console.log("✅ Received research.");
  return content;
}

/**
 * Parse the tagged script into sections.
 * Returns array of { type: "male"|"female"|"image", content: string }
 */
export function parseScript(raw) {
  const sections = [];
  const tagRegex = /\[(MALE|FEMALE|IMAGE:[^\]]*)\]/gi;
  let lastIndex = 0;
  let currentVoice = "female";
  let match;

  while ((match = tagRegex.exec(raw)) !== null) {
    const textBefore = raw.slice(lastIndex, match.index).trim();
    if (textBefore) {
      sections.push({ type: currentVoice, content: textBefore });
    }

    const tag = match[1];
    if (tag.toUpperCase() === "MALE") {
      currentVoice = "male";
    } else if (tag.toUpperCase() === "FEMALE") {
      currentVoice = "female";
    } else if (tag.toUpperCase().startsWith("IMAGE:")) {
      sections.push({ type: "image", content: tag.slice(6).trim() });
    }

    lastIndex = tagRegex.lastIndex;
  }

  const remaining = raw.slice(lastIndex).trim();
  if (remaining) {
    sections.push({ type: currentVoice, content: remaining });
  }

  return sections;
}

function cleanScript(raw) {
  return raw
    .replace(/\n{3,}/g, "\n")
    .replace(/^\s+|\s+$/gm, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function generatePodcastScript(infoMarkdown, topicName) {
  console.log("⏳ Generating podcast script...");
  const now = new Date().toISOString();
  const systemPrompt =
    `You are a podcast scriptwriter for the 'Elixpo Podcast' — a two-host show. The female host is named ${PODCAST_HOST_FEMALE} and the male host is named ${PODCAST_HOST_MALE}. ` +
    `Current date: ${now}. Mention the date if relevant. ` +
    "Use these tags to mark who speaks:\n" +
    `  [FEMALE] — ${PODCAST_HOST_FEMALE}'s lines\n` +
    `  [MALE] — ${PODCAST_HOST_MALE}'s lines\n` +
    "  [IMAGE:description] — insert exactly 5 of these throughout the script. Description should be a short 15-20 word visual scene related to what's being discussed.\n\n" +
    "Rules:\n" +
    `- Randomly pick who opens the show — sometimes ${PODCAST_HOST_FEMALE} welcomes listeners and introduces ${PODCAST_HOST_MALE}, sometimes ${PODCAST_HOST_MALE} opens and introduces ${PODCAST_HOST_FEMALE}. Vary it.\n` +
    "- The second host responds with a quick natural reaction — 'Hey!', 'What's up everyone!', 'Good to be here!' — NOT a full greeting. No repeating the welcome. Jump straight into the topic.\n" +
    "- NO overlapping content. Each host adds NEW information or a NEW angle. If one host explains something, the other reacts, asks a question, or builds on it — never restates the same point.\n" +
    "- Alternate naturally: one host says 2-4 short sentences, then the other picks up. Like a real conversation, not a ping-pong of monologues.\n" +
    "- They refer to each other by name occasionally to make it feel personal.\n" +
    "- Sprinkle natural fillers: 'umm', 'hmm', 'you know', 'right?', 'I mean', 'okay so'.\n" +
    "- Keep sentences SHORT and punchy — this is spoken, not written prose.\n" +
    "- Place [IMAGE:...] tags at 5 evenly spaced moments in the conversation.\n" +
    "- CRITICAL: Output ONLY spoken words with tags. NO markdown, NO bold, NO asterisks, NO stage directions, NO parentheticals.\n" +
    "- STRICT LIMIT: 900-1000 words total. Do NOT exceed 1000 words. The TTS speaks at ~150 wpm with pauses, so 1000 words = ~5 minutes.\n" +
    `- End naturally — either host can start the sign-off and the other adds to it. Vary who wraps up. Keep it short and warm.`;

  const raw = await chatCompletion({
    model: MODELS.scriptWriter,
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Based on this content about '${topicName}':\n\n${infoMarkdown}\n\nWrite a two-host podcast script (${PODCAST_HOST_FEMALE} & ${PODCAST_HOST_MALE}) of 900-1000 words MAX with [MALE], [FEMALE], and exactly 5 [IMAGE:...] tags. No repeated greetings, no overlapping content.`,
      },
    ],
    seed: Math.floor(Math.random() * 1000),
  });

  if (!raw) throw new Error("Podcast script generation returned empty");

  const script = cleanScript(raw);
  const sections = parseScript(script);
  const speechSections = sections.filter((s) => s.type !== "image");
  const imageSections = sections.filter((s) => s.type === "image");
  const wordCount = speechSections.reduce((sum, s) => sum + s.content.split(/\s+/).length, 0);

  console.log(`✅ Script: ${wordCount} words, ${speechSections.length} speech sections, ${imageSections.length} images`);
  return { script, sections };
}
