// Agentic AI endpoint — returns structured JSON response (no streaming)

import { enforceAILimits } from '../../../../lib/aiRateLimit';

const POLLINATIONS_BASE = 'https://gen.pollinations.ai/v1';

export async function POST(request) {
  const apiKey = process.env.POLLINATIONS_TEXT_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'AI not configured' }), { status: 500 });
  }

  const { error } = await enforceAILimits();
  if (error) return error;

  const body = await request.json();
  const { systemPrompt, userPrompt, blocks, model = 'openai' } = body;

  // Build user prompt with block context if provided
  let fullUserPrompt = userPrompt;
  if (blocks && blocks.length > 0) {
    const blockContext = blocks.map((b) =>
      `[${b.id}] (${b.type}) ${b.text}`
    ).join('\n');
    fullUserPrompt = `## Current document blocks (with IDs for editing):\n${blockContext}\n\n---\n\n${userPrompt}`;
  }

  const chatMessages = [
    ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
    { role: 'user', content: fullUserPrompt },
  ];

  try {
    const aiRes = await fetch(`${POLLINATIONS_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: chatMessages,
        temperature: 0.7,
        stream: false,
        response_format: { type: 'json_object' },
      }),
    });

    if (!aiRes.ok) {
      const err = await aiRes.text();
      return new Response(JSON.stringify({ error: `AI error: ${err}` }), { status: aiRes.status });
    }

    const result = await aiRes.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ error: 'No response from AI' }), { status: 500 });
    }

    // Parse the JSON content — strip code fences if model wraps it
    let parsed;
    try {
      let jsonStr = content.trim();
      // Strip markdown code fences if present
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
      }
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      return new Response(JSON.stringify({
        error: 'AI returned invalid JSON',
        raw: content.slice(0, 500),
      }), { status: 422 });
    }

    // Basic validation
    if (!parsed.operations || !Array.isArray(parsed.operations)) {
      return new Response(JSON.stringify({
        error: 'AI response missing operations array',
        raw: content.slice(0, 500),
      }), { status: 422 });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || 'AI request failed' }), { status: 500 });
  }
}
