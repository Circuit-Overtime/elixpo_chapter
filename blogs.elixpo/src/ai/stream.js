// Client-side streaming helper — calls our /api/ai/stream proxy

/**
 * Stream AI text generation from the server proxy.
 * @param {Object} opts
 * @param {string} opts.systemPrompt
 * @param {string} opts.userPrompt
 * @param {function} opts.onChunk - Called with each text chunk
 * @param {function} [opts.onDone] - Called when stream completes with full text
 * @param {function} [opts.onError] - Called on error
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<string>} - Full generated text
 */
export async function streamAI({ systemPrompt, userPrompt, onChunk, onDone, onError, signal }) {
  let fullText = '';

  try {
    const res = await fetch('/api/ai/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt, userPrompt }),
      signal,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(err);
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
        if (data === '[DONE]') {
          onDone?.(fullText);
          return fullText;
        }

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullText += content;
            onChunk?.(content, fullText);
          }
        } catch {
          // skip malformed
        }
      }
    }

    onDone?.(fullText);
    return fullText;
  } catch (err) {
    if (err.name === 'AbortError') return fullText;
    onError?.(err);
    throw err;
  }
}
