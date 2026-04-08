import fs from "fs";
import path from "path";
import { generateAudio } from "../pollinations.js";

const DEVELOPER_PROMPT =
  "You are a charismatic, confident podcast host narrating a story your listeners NEED to hear. " +
  "Your pace is brisk and lively — you move with energy and momentum, like someone who's genuinely excited about what they're sharing. " +
  "But you're not a machine gun. You know when to hit the gas and when to briefly ease off — a quick beat before a big reveal, a half-second pause after a shocking stat, then right back to full speed. " +
  "Your voice has range: curiosity when asking rhetorical questions, real excitement when something is cool, a knowing grin when something is ironic. " +
  "Sound human — occasional natural breaths, a quick 'right?' or 'I mean', maybe a small chuckle if something's genuinely funny. But keep the momentum going. " +
  "Think energetic TED talk meets your favorite podcast host — engaging, punchy, clear, and impossible to tune out. " +
  "No monotone. No sleepy reading. No skipping content. Deliver every word with conviction and energy.";

export async function generatePodcastSpeech(script, voice = "shimmer") {
  console.log("🎙️ Generating podcast speech (openai-audio)...");
  const base64 = await generateAudio({ script, voice, developerPrompt: DEVELOPER_PROMPT });
  const buffer = Buffer.from(base64, "base64");
  console.log("✅ Podcast speech generated.");
  return buffer;
}


const script = `Hey everyone, and welcome back to the Elixpo Podcast! Today, we are diving headfirst into a topic that's become as common as scrolling through your feed: "Decoding The Vibe: Social Media's New Blame Game!"

Yeah, that sound. We all know it, we all probably react to it. And lately, it feels like the entire social media landscape is defined by it, doesn't it? It's a constant cycle of blame. Who's at fault? The platforms? Us? The algorithms? It's a complex mess, and we're going to try and untangle some of it right now.

Now, just a quick note, it's April 8th, 2026, and while there aren't any brand new articles with that exact title popping up in my feed today, the trends we're seeing are hotter than ever, building on some really significant developments from earlier this year. We're talking about how outrage drives sharing but not action, and some absolutely massive legal battles holding tech giants accountable.

Let's start with this fascinating insight about outrage and virality. Imagine this: you see a post that just ignites something in you. It's unfair, it's alarming, it makes you mad. What do you do? You hit share, right? You want everyone to see this! You want to raise awareness! But here's the kicker, and this is what a recent study is really highlighting: that initial wave of outrage, while it gets a ton of shares, often leads to nothing.

Think about it. We share to signal our pain, our alarm. It's a way to say, "Hey, I see this terrible thing!" But then we often just detach. We don't click the petition link. We don't sign up to volunteer. We don't donate. The outrage is a powerful motivator for visibility, but it's a pretty weak motivator for actual, meaningful action. It's like we're shouting into the void, hoping someone else will do something.

And this perfectly captures that "blame game" vibe we're seeing everywhere, right? Emotional content, especially that fiery, outraged stuff, goes viral. It gets the likes, the shares, the retweets. But does it actually solve anything? Usually, no. It's a performance of outrage, not necessarily a catalyst for change.

But here's where it gets really interesting. Some researchers are suggesting a two-wave strategy. First, you hit them with the outrage. Get their attention. Build that initial wave of awareness. Then, crucially, you follow up with something reasonable. Something that offers solutions, that legitimizes the discussion, and that actually gives people a tangible way to engage. It's like, "Okay, you're angry about this? Great. Here's what we can do about it." It's a subtle shift, but it's a game-changer for moving beyond just complaining.

Now, let's talk about something that's been making major headlines: the legal side of this blame game. Because it's not just about our scrolling habits anymore. We're talking about landmark trials, people. Back on February 10th of this year, 2026, some absolutely huge legal arguments kicked off. We're talking about lawsuits against giants like Instagram and YouTube, accusing them of essentially ruining a young woman's mental health during her formative years.

The plaintiff, who is now 20, is alleging that the algorithms, those invisible forces driving our feeds, directly contributed to her experiencing severe anxiety, body dysmorphia, and even suicidal thoughts. It's a chilling thought, isn't it? That the very platforms designed to connect us might be causing such profound harm.

Of course, the companies are defending themselves. They're pointing to recent youth protection guidelines, saying they're trying to do better. But the damage, the allegations, they're laid bare.

And then, the other shoe dropped. On March 26th, just a few weeks ago, a verdict came down. And it's being called a "game-changing moment for social media."

This verdict is forcing us to ask some really tough questions about the future obligations of Big Tech. Amidst all these claims of addiction, of mental health crises fueled by endless scrolling and curated perfection, what are these companies truly responsible for? Are they just neutral platforms, or are they active participants in shaping the well-being of their users, especially the young ones?

It feels like we're at a crossroads. On one hand, we have the psychological dance of outrage and engagement, where our emotions are amplified and weaponized for virality, often without real-world impact. On the other, we have the legal system finally stepping in, demanding accountability for the harms that these platforms can inflict.

So, when we talk about "Decoding The Vibe: Social Media's New Blame Game," we're talking about this perfect storm. It's the outrage-driven sharing that makes us feel like we're doing something, when we might just be feeding the algorithm. It's the landmark legal battles that are forcing these tech giants to confront the consequences of their designs. It's the constant push and pull between our engagement and their algorithms, and who ultimately bears the responsibility.

It's a lot to process, I know. And as we move forward, especially beyond March 2026, we're going to be watching very closely. Are these verdicts going to lead to real change? Will we see more effective strategies for actual engagement and problem-solving on social media? Or will we just keep playing the same blame game, fueled by outrage and endless scrolling?

That's all the time we have for today on the Elixpo Podcast. I hope this dive into the social media blame game has given you some food for thought. Remember to be mindful of what you share, why you share it, and what action, if any, you're truly driving. Thanks for tuning in, and we'll catch you next time!`;

generatePodcastSpeech(script).then((buffer) => {
  const outPath = path.join("podcast_speech_test.mp3");
  fs.writeFileSync(outPath, buffer);
  console.log(`🎙️ Speech saved → ${outPath} (${buffer.length} bytes)`);
});
