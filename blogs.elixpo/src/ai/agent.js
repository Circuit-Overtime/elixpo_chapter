// Client-side AI module — text streaming + agentic orchestrator with image generation
// All client-side AI logic lives here. Server proxies: /api/ai/stream, /api/ai/agent

// Image generation goes through our server proxy to keep API key safe
const IMAGE_API = '/api/ai/image';

// ── Simple text streaming (calls /api/ai/stream) ──

/**
 * Stream AI text generation from the server proxy.
 * @param {Object} opts
 * @param {string} opts.systemPrompt
 * @param {string} opts.userPrompt
 * @param {function} opts.onChunk - Called with (chunk, fullText)
 * @param {function} [opts.onDone] - Called when stream completes with full text
 * @param {function} [opts.onError] - Called on error
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<string>}
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

// ── Agentic streaming (calls /api/ai/agent, supports tool calls) ──

/**
 * Stream agentic AI — supports text streaming + tool calls (image generation).
 *
 * @param {Object} opts
 * @param {string} opts.systemPrompt
 * @param {string} opts.userPrompt
 * @param {function} opts.onChunk - Called with (chunk, fullText) for text content
 * @param {function} opts.onDone - Called with (fullText) when complete
 * @param {function} opts.onError - Called with (error)
 * @param {function} opts.onImageStart - Called with ({id, prompt, alt}) when image gen starts
 * @param {function} opts.onImagePreview - Called with ({id, previewUrl, alt}) when image is generated but before upload
 * @param {function} opts.onImageDone - Called with ({id, url, alt}) when image is uploaded
 * @param {function} opts.onImageError - Called with ({id, error}) on image gen failure
 * @param {function} opts.onPhase - Called with phase string: 'thinking' | 'writing' | 'generating_image' | 'uploading'
 * @param {string} opts.blogId - Blog ID for Cloudinary upload path
 * @param {AbortSignal} opts.signal
 * @returns {Promise<{text: string, images: Array}>}
 */
export async function streamAgent({
  systemPrompt,
  userPrompt,
  onChunk,
  onDone,
  onError,
  onImageStart,
  onImagePreview,
  onImageDone,
  onImageError,
  onPhase,
  blogId,
  signal,
}) {
  let fullText = '';
  const images = [];
  let pendingToolCalls = [];
  let currentToolCall = null;

  try {
    onPhase?.('thinking');

    const res = await fetch('/api/ai/agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ systemPrompt, userPrompt }),
      signal,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'AI request failed' }));
      throw new Error(err.error || `AI error (${res.status})`);
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
        if (data === '[DONE]') break;

        try {
          const parsed = JSON.parse(data);
          const choice = parsed.choices?.[0];
          if (!choice) continue;

          const delta = choice.delta;

          // Text content
          if (delta?.content) {
            if (!fullText) onPhase?.('writing');
            fullText += delta.content;
            onChunk?.(delta.content, fullText);
          }

          // Tool call accumulation
          if (delta?.tool_calls) {
            for (const tc of delta.tool_calls) {
              if (tc.index !== undefined) {
                if (!pendingToolCalls[tc.index]) {
                  pendingToolCalls[tc.index] = {
                    id: tc.id || '',
                    name: '',
                    arguments: '',
                  };
                }
                const pending = pendingToolCalls[tc.index];
                if (tc.id) pending.id = tc.id;
                if (tc.function?.name) pending.name = tc.function.name;
                if (tc.function?.arguments) pending.arguments += tc.function.arguments;
              }
            }
          }

          // Finish reason — process tool calls
          if (choice.finish_reason === 'tool_calls' || choice.finish_reason === 'stop') {
            // Process any accumulated tool calls
            for (const tc of pendingToolCalls) {
              if (tc && tc.name === 'generate_image') {
                try {
                  const args = JSON.parse(tc.arguments);
                  const imageId = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

                  // Insert placeholder marker into the text stream
                  const placeholder = `\n![${args.alt || 'AI generated image'}](IMG_LOADING:${imageId})\n`;
                  fullText += placeholder;
                  onChunk?.(placeholder, fullText);

                  onImageStart?.({ id: imageId, prompt: args.prompt, alt: args.alt || '' });
                  onPhase?.('generating_image');

                  // Fire off image generation asynchronously
                  // Default to 16:9 within 1024x1024 → 1024x576
                  images.push(
                    generateAndUploadImage({
                      imageId,
                      prompt: args.prompt,
                      alt: args.alt || '',
                      width: args.width || 1024,
                      height: args.height || 576,
                      blogId,
                      onImagePreview,
                      onImageDone,
                      onImageError,
                      onPhase,
                      signal,
                    })
                  );
                } catch (e) {
                  console.error('Failed to parse image tool call:', e);
                }
              }
            }
            pendingToolCalls = [];
          }
        } catch {
          // skip malformed chunks
        }
      }
    }

    // Wait for all pending image generations
    if (images.length > 0) {
      onPhase?.('generating_image');
      await Promise.allSettled(images);
    }

    onDone?.(fullText);
    return { text: fullText, images };
  } catch (err) {
    if (err.name === 'AbortError') return { text: fullText, images };
    onError?.(err);
    throw err;
  }
}

/**
 * Generate an image via Pollinations and upload to Cloudinary.
 */
async function generateAndUploadImage({
  imageId,
  prompt,
  alt,
  width,
  height,
  blogId,
  onImagePreview,
  onImageDone,
  onImageError,
  onPhase,
  signal,
}) {
  try {
    // Generate image via server proxy (keeps API key server-side)
    // GPT image generation can take up to 90s — use a generous timeout
    const timeoutController = new AbortController();
    const timeout = setTimeout(() => timeoutController.abort(), 120000);
    const combinedSignal = signal
      ? AbortSignal.any([signal, timeoutController.signal])
      : timeoutController.signal;

    const imageRes = await fetch(IMAGE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, width, height, model: "flux" }),
      signal: combinedSignal,
    });
    clearTimeout(timeout);

    if (!imageRes.ok) {
      throw new Error(`Image generation failed (${imageRes.status})`);
    }

    const imageData = await imageRes.json();
    const b64 = imageData.data?.[0]?.b64_json;
    if (!b64) throw new Error('No image data returned');

    // Convert base64 to blob
    const byteChars = atob(b64);
    const byteArray = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) {
      byteArray[i] = byteChars.charCodeAt(i);
    }
    const blob = new Blob([byteArray], { type: 'image/png' });

    // Show preview immediately using a blob URL (before upload)
    const previewUrl = URL.createObjectURL(blob);
    onImagePreview?.({ id: imageId, previewUrl, alt });

    // Compress client-side before upload
    const compressed = await compressForBlog(blob);

    // Upload to Cloudinary via our API
    onPhase?.('uploading');
    const formData = new FormData();
    formData.append('file', compressed, `${imageId}.webp`);
    if (blogId) formData.append('blogId', blogId);
    formData.append('type', 'image');

    const uploadRes = await fetch('/api/media/upload', {
      method: 'POST',
      body: formData,
      signal,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      throw new Error(err.error || 'Upload failed');
    }

    const uploadData = await uploadRes.json();

    // Clean up the blob URL now that we have the real one
    URL.revokeObjectURL(previewUrl);

    // Save to localStorage for persistence across reloads
    saveImageToLocal(imageId, uploadData.url, alt, blogId);

    onImageDone?.({ id: imageId, url: uploadData.url, alt });
    return { id: imageId, url: uploadData.url, alt };
  } catch (err) {
    if (err.name === 'AbortError') return null;
    console.error(`Image generation failed for ${imageId}:`, err);
    onImageError?.({ id: imageId, error: err.message });
    return null;
  }
}

/**
 * Compress image blob for blog embedding (max 100KB, WebP).
 */
async function compressForBlog(blob, maxBytes = 100 * 1024) {
  const img = new Image();
  const url = URL.createObjectURL(blob);

  return new Promise((resolve) => {
    img.onload = () => {
      URL.revokeObjectURL(url);

      // Scale down if needed
      const maxW = 1200, maxH = 900;
      let w = img.width, h = img.height;
      if (w > maxW || h > maxH) {
        const ratio = Math.min(maxW / w, maxH / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, w, h);

      // Iteratively reduce quality
      let quality = 0.85;
      const tryCompress = () => {
        canvas.toBlob((b) => {
          if (b.size <= maxBytes || quality <= 0.3) {
            resolve(new File([b], 'image.webp', { type: 'image/webp' }));
          } else {
            quality -= 0.1;
            tryCompress();
          }
        }, 'image/webp', quality);
      };
      tryCompress();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(new File([blob], 'image.webp', { type: blob.type }));
    };
    img.src = url;
  });
}

/**
 * Save AI-generated image URL to localStorage for persistence.
 */
function saveImageToLocal(imageId, url, alt, blogId) {
  const key = `lixblogs_ai_images_${blogId || 'draft'}`;
  try {
    const existing = JSON.parse(localStorage.getItem(key) || '{}');
    existing[imageId] = { url, alt, createdAt: Date.now() };
    localStorage.setItem(key, JSON.stringify(existing));
  } catch { /* localStorage full or unavailable */ }
}

/**
 * Get saved AI image URLs from localStorage.
 */
export function getLocalImages(blogId) {
  const key = `lixblogs_ai_images_${blogId || 'draft'}`;
  try {
    return JSON.parse(localStorage.getItem(key) || '{}');
  } catch {
    return {};
  }
}
