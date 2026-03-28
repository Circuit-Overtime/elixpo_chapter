// Agentic AI endpoint — supports function calling for text + image generation
// The LLM decides whether to use tools (agentic) or respond directly (simple)

import { getSession } from '../../../../lib/auth';
import { getLimits } from '../../../../lib/tiers';

const POLLINATIONS_BASE = 'https://gen.pollinations.ai/v1';

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'generate_image',
      description: 'Generate an image to embed in the blog post. Use this when the content would benefit from a visual — diagrams, illustrations, hero images, concept art, etc.',
      parameters: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'Detailed image generation prompt. Be specific about style, content, colors, composition.',
          },
          alt: {
            type: 'string',
            description: 'Alt text for the image (accessibility).',
          },
          width: { type: 'integer', description: 'Image width in pixels', default: 1024 },
          height: { type: 'integer', description: 'Image height in pixels', default: 768 },
        },
        required: ['prompt', 'alt'],
      },
    },
  },
];

export async function POST(request) {
  const apiKey = process.env.POLLINATIONS_TEXT_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'AI not configured' }), { status: 500 });
  }

  const session = await getSession();
  if (!session?.userId) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 });
  }

  // Enforce AI usage tier limits
  let db;
  try {
    const { getDB } = await import('../../../../lib/cloudflare');
    db = getDB();
    const user = await db.prepare('SELECT tier, ai_usage_today, ai_usage_date FROM users WHERE id = ?')
      .bind(session.userId).first();

    if (user) {
      const limits = getLimits(user.tier);
      const today = new Date().toISOString().slice(0, 10);
      const usageToday = user.ai_usage_date === today ? user.ai_usage_today : 0;

      if (usageToday >= limits.aiRequestsPerDay) {
        return new Response(JSON.stringify({
          error: 'Daily AI limit reached',
          limit: limits.aiRequestsPerDay,
          tier: user.tier,
        }), { status: 429 });
      }

      await db.prepare('UPDATE users SET ai_usage_today = ?, ai_usage_date = ? WHERE id = ?')
        .bind(usageToday + 1, today, session.userId).run();
    }
  } catch {
    // D1 not available — skip enforcement
  }

  const body = await request.json();
  const { systemPrompt, userPrompt, messages, model = 'openai' } = body;

  // Build messages array — support both simple (systemPrompt+userPrompt) and multi-turn (messages)
  const chatMessages = messages || [
    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
    { role: 'user', content: userPrompt },
  ];

  // First call: let the LLM decide whether to use tools or respond directly
  const aiRes = await fetch(`${POLLINATIONS_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: chatMessages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0.7,
      stream: true,
    }),
  });

  if (!aiRes.ok) {
    const err = await aiRes.text();
    return new Response(JSON.stringify({ error: `AI error: ${err}` }), { status: aiRes.status });
  }

  // Stream the response through — client handles tool_calls
  return new Response(aiRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
