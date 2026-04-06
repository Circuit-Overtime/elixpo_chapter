// Fetches available models from Pollinations API and categorizes them
const MODELS_URL = 'https://gen.pollinations.ai/image/models';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

let _cache = null;
let _cacheTime = 0;

export async function fetchModels() {
  const now = Date.now();
  if (_cache && now - _cacheTime < CACHE_TTL) return _cache;

  try {
    const res = await fetch(MODELS_URL, { next: { revalidate: 600 } });
    if (!res.ok) throw new Error(`Models API ${res.status}`);
    const raw = await res.json();

    const imageModels = [];
    const videoModels = [];

    for (const m of raw) {
      // Skip paid-only models
      if (m.paid_only) continue;

      const entry = {
        id: m.name,
        label: m.description?.split(' - ')[0] || m.name,
        desc: m.description?.split(' - ')[1] || '',
        inputModalities: m.input_modalities || [],
        outputModalities: m.output_modalities || [],
      };

      if (m.output_modalities?.includes('video')) {
        videoModels.push(entry);
      } else {
        imageModels.push(entry);
      }
    }

    _cache = { imageModels, videoModels, all: [...imageModels, ...videoModels] };
    _cacheTime = now;
    return _cache;
  } catch (err) {
    console.error('[models] Failed to fetch models:', err);
    // Return fallback if cache exists
    if (_cache) return _cache;
    // Hardcoded fallback
    return {
      imageModels: [
        { id: 'flux', label: 'Flux Schnell', desc: 'Fast high-quality image generation' },
        { id: 'gptimage', label: 'GPT Image 1 Mini', desc: "OpenAI's image generation model" },
        { id: 'klein', label: 'FLUX.2 Klein 4B', desc: 'Fast image generation and editing' },
        { id: 'zimage', label: 'Z-Image Turbo', desc: 'Fast 6B Flux with 2x upscaling' },
      ],
      videoModels: [
        { id: 'ltx-2', label: 'LTX-2.3', desc: 'Fast text-to-video generation with upscaler' },
      ],
      all: [],
    };
  }
}
