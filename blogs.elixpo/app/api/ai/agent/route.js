// Agentic AI endpoint — supports function calling for text + image generation

import { enforceAILimits } from '../../../../lib/aiRateLimit';

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

  const { error } = await enforceAILimits();
  if (error) return error;

  const body = await request.json();
  const { systemPrompt, userPrompt, messages, model = 'gemini-fast' } = body;

  const chatMessages = messages || [
    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
    { role: 'user', content: userPrompt },
  ];

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

  return new Response(aiRes.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
