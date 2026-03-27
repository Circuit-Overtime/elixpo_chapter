// Pollinations AI client for LixBlogs
// Uses OpenAI-compatible API at gen.pollinations.ai

const POLLINATIONS_BASE = 'https://gen.pollinations.ai/v1';

/**
 * Stream a chat completion from Pollinations AI.
 * Yields text chunks as they arrive.
 *
 * @param {Object} opts
 * @param {string} opts.systemPrompt - System instruction
 * @param {string} opts.userPrompt - User message
 * @param {string} [opts.model] - Model name (default: 'openai')
 * @param {number} [opts.temperature] - Temperature (default: 0.7)
 * @param {AbortSignal} [opts.signal] - AbortController signal
 * @returns {AsyncGenerator<string>} - Yields text chunks
 */
export async function* streamChatCompletion({ systemPrompt, userPrompt, model = 'openai', temperature = 0.7, signal }) {
  const apiKey = process.env.NEXT_PUBLIC_POLLINATIONS_TEXT_API_KEY || process.env.POLLINATIONS_TEXT_API_KEY;

  const res = await fetch(`${POLLINATIONS_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      stream: true,
    }),
    signal,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI request failed (${res.status}): ${err}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') return;

      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) yield content;
      } catch {
        // skip malformed chunks
      }
    }
  }
}

/**
 * Non-streaming chat completion.
 */
export async function chatCompletion({ systemPrompt, userPrompt, model = 'openai', temperature = 0.7 }) {
  const apiKey = process.env.NEXT_PUBLIC_POLLINATIONS_TEXT_API_KEY || process.env.POLLINATIONS_TEXT_API_KEY;

  const res = await fetch(`${POLLINATIONS_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature,
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`AI request failed (${res.status}): ${err}`);
  }

  const json = await res.json();
  return json.choices?.[0]?.message?.content || '';
}
