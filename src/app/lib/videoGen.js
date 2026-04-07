// Video generation module
// Handles video creation via the /api/generate/video endpoint

const API_BASE = '/api';

const VIDEO_MODELS = [
  { id: 'ltx-2', label: 'LTX-2.3', desc: 'Fast text-to-video with upscaler', maxDuration: 10 },
];

const DEFAULT_MODEL = 'ltx-2';

/**
 * Generate a video from a text prompt
 * @param {Object} options
 * @param {string} options.prompt - Text description of the video
 * @param {string} [options.model='ltx-2'] - Video model to use
 * @param {number} [options.width=1024] - Width in pixels
 * @param {number} [options.height=576] - Height in pixels
 * @param {number} [options.duration=5] - Duration in seconds
 * @param {string} [options.imageUrl] - Reference image URL (starting frame)
 * @param {AbortSignal} [options.signal] - AbortController signal
 * @returns {Promise<{success: boolean, videoData?: string, error?: string}>}
 */
export async function generateVideo({
  prompt,
  model = DEFAULT_MODEL,
  width = 1024,
  height = 576,
  duration = 5,
  imageUrl = null,
  signal = null,
}) {
  if (!prompt?.trim()) {
    return { success: false, error: 'Prompt is required' };
  }

  try {
    const res = await fetch(`${API_BASE}/generate/video`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: prompt.trim(),
        model,
        width,
        height,
        duration,
        imageUrl,
      }),
      signal,
    });

    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data.error || 'Video generation failed' };
    }

    return {
      success: true,
      videoData: data.videoData,
      model: data.model,
      duration: data.duration,
      creditsCost: data.creditsCost,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { success: false, error: 'Cancelled' };
    }
    return { success: false, error: err.message || 'Video generation failed' };
  }
}

/**
 * Convert an image source to a URL suitable for the video API reference image
 * Handles base64, blob, and http URLs
 */
export async function prepareImageForVideo(imageSrc) {
  if (!imageSrc) return null;
  // HTTP URLs can be passed directly
  if (imageSrc.startsWith('http')) return imageSrc;
  // Base64 data URIs — pass through (API handles them)
  if (imageSrc.startsWith('data:')) return imageSrc;
  // Blob URL — convert to base64
  if (imageSrc.startsWith('blob:')) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        resolve(c.toDataURL('image/png'));
      };
      img.onerror = () => resolve(null);
      img.src = imageSrc;
    });
  }
  return null;
}

export { VIDEO_MODELS, DEFAULT_MODEL };
