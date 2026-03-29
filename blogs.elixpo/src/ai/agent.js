// Client-side AI module — structured JSON request + image generation
// Server proxy: /api/ai/agent (returns JSON), /api/ai/stream (legacy streaming)

const IMAGE_API = '/api/ai/image';

// ── Structured JSON AI request (calls /api/ai/agent) ──

/**
 * Request structured AI response (JSON with operations).
 *
 * @param {Object} opts
 * @param {string} opts.systemPrompt
 * @param {string} opts.userPrompt
 * @param {Array} [opts.blocks] - Document blocks with IDs for edit context: [{ id, type, text }]
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<{ title: string|null, operations: Array }>}
 */
export async function requestAgent({ systemPrompt, userPrompt, blocks, signal }) {
  const res = await fetch('/api/ai/agent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemPrompt, userPrompt, blocks }),
    signal,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'AI request failed' }));
    throw new Error(err.error || `AI error (${res.status})`);
  }

  return await res.json();
}

// ── Simple text streaming (calls /api/ai/stream) — kept for selection toolbar ──

/**
 * Stream AI text generation from the server proxy.
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

// ── Image generation + upload ──

/**
 * Generate an image via Pollinations and upload to Cloudinary.
 */
export async function generateAndUploadImage({
  imageId,
  prompt,
  alt,
  width = 1024,
  height = 576,
  blogId,
  onPreview,
  onDone,
  onError,
  onPhase,
  signal,
}) {
  try {
    const timeoutController = new AbortController();
    const timeout = setTimeout(() => timeoutController.abort(), 120000);
    const combinedSignal = signal
      ? AbortSignal.any([signal, timeoutController.signal])
      : timeoutController.signal;

    onPhase?.('generating_image');

    const imageRes = await fetch(IMAGE_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, width, height, model: 'flux' }),
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

    // Show preview immediately
    const previewUrl = URL.createObjectURL(blob);
    onPreview?.({ id: imageId, previewUrl, alt });

    // Compress before upload
    const compressed = await compressForBlog(blob);

    // Upload
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
    URL.revokeObjectURL(previewUrl);
    saveImageToLocal(imageId, uploadData.url, alt, blogId);

    onDone?.({ id: imageId, url: uploadData.url, alt });
    return { id: imageId, url: uploadData.url, alt };
  } catch (err) {
    if (err.name === 'AbortError') return null;
    console.error(`Image generation failed for ${imageId}:`, err);
    onError?.({ id: imageId, error: err.message });
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
