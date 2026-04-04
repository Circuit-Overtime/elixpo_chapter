/**
 * Blog content compression/decompression.
 * Uses LZ-based compression (browser-native CompressionStream where available,
 * fallback to simple LZ77 for edge runtime).
 *
 * Content is stored as: "lz:" + base64(compressed)
 * Uncompressed content (legacy) is stored as raw JSON string.
 */

/**
 * Compress a JSON-serializable object to a compact string.
 * @param {any} data - The data to compress (usually editor blocks array)
 * @returns {string} - Compressed string prefixed with "lz:"
 */
export function compressBlogContent(data) {
  const json = typeof data === 'string' ? data : JSON.stringify(data);
  const compressed = lzCompress(json);
  return 'lz:' + compressed;
}

/**
 * Decompress blog content. Handles both compressed ("lz:" prefix) and raw JSON.
 * @param {string} stored - The stored content string
 * @returns {any} - Parsed JSON data
 */
export function decompressBlogContent(stored) {
  if (!stored) return null;
  if (typeof stored !== 'string') return stored;

  if (stored.startsWith('lz:')) {
    const decompressed = lzDecompress(stored.slice(3));
    return JSON.parse(decompressed);
  }

  // Legacy: raw JSON
  try {
    return JSON.parse(stored);
  } catch {
    return stored;
  }
}

/**
 * Check if content is compressed.
 */
export function isCompressed(stored) {
  return typeof stored === 'string' && stored.startsWith('lz:');
}

// ── LZ77-style compression (works in edge runtime, no dependencies) ──

function lzCompress(input) {
  if (!input) return '';
  const dict = {};
  let dictSize = 256;
  let w = '';
  const result = [];

  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    const wc = w + c;
    if (dict[wc] !== undefined || wc.length === 1) {
      w = wc;
    } else {
      // Output the code for w
      if (w.length === 1) {
        result.push(w.charCodeAt(0));
      } else {
        result.push(dict[w]);
      }
      // Add wc to dictionary
      if (dictSize < 65536) {
        dict[wc] = dictSize++;
      }
      w = c;
    }
  }

  // Output the code for remaining w
  if (w) {
    if (w.length === 1) {
      result.push(w.charCodeAt(0));
    } else {
      result.push(dict[w]);
    }
  }

  // Encode as base64-safe string
  const bytes = new Uint8Array(result.length * 2);
  for (let i = 0; i < result.length; i++) {
    bytes[i * 2] = (result[i] >> 8) & 0xFF;
    bytes[i * 2 + 1] = result[i] & 0xFF;
  }
  return uint8ToBase64(bytes);
}

function lzDecompress(compressed) {
  if (!compressed) return '';
  const bytes = base64ToUint8(compressed);
  const codes = [];
  for (let i = 0; i < bytes.length; i += 2) {
    codes.push((bytes[i] << 8) | bytes[i + 1]);
  }

  if (codes.length === 0) return '';

  const dict = {};
  let dictSize = 256;
  let w = String.fromCharCode(codes[0]);
  const result = [w];

  for (let i = 1; i < codes.length; i++) {
    const code = codes[i];
    let entry;
    if (code < 256) {
      entry = String.fromCharCode(code);
    } else if (dict[code] !== undefined) {
      entry = dict[code];
    } else if (code === dictSize) {
      entry = w + w[0];
    } else {
      throw new Error('Invalid compressed data');
    }

    result.push(entry);

    if (dictSize < 65536) {
      dict[dictSize++] = w + entry[0];
    }
    w = entry;
  }

  return result.join('');
}

// ── Base64 helpers (work in both browser and edge runtime) ──

function uint8ToBase64(bytes) {
  if (typeof btoa === 'function') {
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
  return Buffer.from(bytes).toString('base64');
}

function base64ToUint8(b64) {
  if (typeof atob === 'function') {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  return new Uint8Array(Buffer.from(b64, 'base64'));
}
