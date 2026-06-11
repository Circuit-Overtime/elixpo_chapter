import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { POLLINATIONS_API_KEY, POLLINATIONS_BASE_URL, DEFAULT_MODEL } from "@/lib/pollinations";
import { saveMessage, createConversation, getMessages } from "@/lib/chat/db";
import { NextRequest } from "next/server";

// Hardcoded user ID for now since auth integration is pending
const DUMMY_USER_ID = "user_123";

const pollinations = createOpenAI({
  apiKey: POLLINATIONS_API_KEY,
  baseURL: `${POLLINATIONS_BASE_URL}/v1`,
});

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { messages, model = DEFAULT_MODEL, id: conversationId } = (await req.json()) as any;

    let currentConversationId = conversationId;

    if (!currentConversationId) {
      currentConversationId = await createConversation(DUMMY_USER_ID, "New Chat", model);
    }

    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === "user") {
      await saveMessage({
        conversationId: currentConversationId,
        role: "user",
        content: lastMessage.content,
        model,
      });
    }

    const systemPrompt = `You are Elixpo Chat, an advanced AI assistant. You are capable of text, voice, and image analysis.
You are powered by Pollinations AI and run on optimized CPU inference.
Be helpful, concise, and do not use emojis unless specifically requested. Keep your design clean.`;

    const result = streamText({
      model: pollinations(model),
      system: systemPrompt,
      messages,
      async onFinish({ text }) {
        await saveMessage({
          conversationId: currentConversationId,
          role: "assistant",
          content: text,
          model,
        });
      },
    });

    return result.toTextStreamResponse({
      headers: {
        "x-conversation-id": currentConversationId,
      },
    });
  } catch (error: any) {
    console.error("API Chat Error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return new Response("Missing id", { status: 400 });

  const messages = await getMessages(id);
  return new Response(JSON.stringify(messages), {
    headers: { "Content-Type": "application/json" },
  });
}

