import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

// Create a custom OpenAI provider instance pointing to Pollinations AI
// Note: As per Pollinations docs, their endpoints can be used without auth for free models.
// The user will provide their own api keys later for specific models.
const pollinations = createOpenAI({
  baseURL: 'https://gen.pollinations.ai/v1',
  apiKey: process.env.POLLINATIONS_API_KEY || 'YOUR_API_KEY',
});

// Optional: Allow responses up to 3 minutes
export const maxDuration = 180;

export async function POST(req: Request) {
  try {
    const { messages, model = 'openai' } = (await req.json()) as any;

    // Call the Pollinations API
    const result = await streamText({
      model: pollinations(model),
      messages,
      temperature: 0.7,
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error('API Chat Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'An error occurred during chat completion.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
