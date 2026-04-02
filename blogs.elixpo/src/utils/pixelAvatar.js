/**
 * Deterministic pixel art generators for avatars and banners.
 * Pixels cluster near corners/edges with a solid color center.
 */

// Shared hash function
function hashSeed(seed) {
  let hash = 0;
  const s = seed || 'default';
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

// Curated palettes: [bg, primary, accent]
const PALETTES = [
  ['#1a1040', '#c084fc', '#e9d5ff'], // purple → lavender
  ['#0f2a1a', '#4ade80', '#bbf7d0'], // green → mint
  ['#0c1a2e', '#60a5fa', '#bfdbfe'], // navy → sky blue
  ['#2a1215', '#fb7185', '#fecdd3'], // rose → pink
  ['#1a1708', '#fbbf24', '#fef08a'], // gold → amber
  ['#0f1f2e', '#22d3ee', '#a5f3fc'], // teal → cyan
  ['#1e1028', '#a78bfa', '#ddd6fe'], // indigo → violet
  ['#1a0f08', '#fb923c', '#fed7aa'], // ember → orange
  ['#0f1a1a', '#2dd4bf', '#99f6e4'], // sea → teal
  ['#1a0820', '#e879f9', '#f5d0fe'], // magenta → fuchsia
  ['#101828', '#818cf8', '#c7d2fe'], // slate → periwinkle
  ['#1a1a08', '#a3e635', '#d9f99d'], // olive → lime
];

/**
 * Generate a deterministic pixel avatar SVG data URL.
 * Pixels cluster near corners with a solid center.
 */
export function generatePixelAvatar(seed) {
  const h = hashSeed(seed);
  const palette = PALETTES[h % PALETTES.length];
  const [bg, fg, fgLight] = palette;

  const SIZE = 48;
  const GRID = 6;
  const CELL = SIZE / GRID;

  // Generate pattern — higher probability near edges/corners
  const bits = [];
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < Math.ceil(GRID / 2); x++) {
      // Distance from center (0 = center, 1 = corner)
      const cx = Math.abs(x - (GRID - 1) / 2) / ((GRID - 1) / 2);
      const cy = Math.abs(y - (GRID - 1) / 2) / ((GRID - 1) / 2);
      const edgeness = Math.max(cx, cy);

      // Higher threshold in center = fewer pixels; lower near edges = more pixels
      const threshold = 60 + (1 - edgeness) * 120;
      bits.push(((h * (y * 11 + x * 17 + 7)) & 0xFF) > threshold);
    }
  }

  let rects = '';
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const bx = x < Math.ceil(GRID / 2) ? x : GRID - 1 - x; // mirror
      if (bits[y * Math.ceil(GRID / 2) + bx]) {
        const fill = ((x + y) % 3 === 0) ? fgLight : fg;
        rects += `<rect x="${x * CELL}" y="${y * CELL}" width="${CELL}" height="${CELL}" fill="${fill}" rx="1"/>`;
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}"><rect width="${SIZE}" height="${SIZE}" fill="${bg}" rx="8"/>${rects}</svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Generate a deterministic blog banner SVG data URL.
 * Same style as org avatars — symmetric pixel blocks in 4 corners, solid center.
 */
export function generateBlogBanner(seed) {
  const h = hashSeed(seed);
  const palette = PALETTES[h % PALETTES.length];
  const [bg, fg, fgLight] = palette;

  const W = 720;
  const H = 240;
  const PX = 8;
  // Corner block size in cells — bigger = pixels reach further toward center
  const CX = 14;
  const CY = 12;

  // Generate one corner pattern (CX x CY), then mirror to all 4
  const bits = [];
  for (let y = 0; y < CY; y++) {
    for (let x = 0; x < CX; x++) {
      // Denser at corner (x=0,y=0), sparser further out
      const dist = Math.sqrt(x * x + y * y) / Math.sqrt(CX * CX + CY * CY);
      const threshold = dist * 200;
      bits.push(((h * (y * 7 + x * 13 + 3)) & 0xFF) > threshold);
    }
  }

  let rects = '';
  const drawCorner = (ox, oy, flipX, flipY) => {
    for (let y = 0; y < CY; y++) {
      for (let x = 0; x < CX; x++) {
        if (!bits[y * CX + x]) continue;
        const fill = ((x + y) % 3 === 0) ? fgLight : fg;
        const px = flipX ? ox - (x + 1) * PX : ox + x * PX;
        const py = flipY ? oy - (y + 1) * PX : oy + y * PX;
        rects += `<rect x="${px}" y="${py}" width="${PX}" height="${PX}" fill="${fill}" rx="1"/>`;
      }
    }
  };

  drawCorner(0, 0, false, false);       // top-left
  drawCorner(W, 0, true, false);        // top-right
  drawCorner(0, H, false, true);        // bottom-left
  drawCorner(W, H, true, true);         // bottom-right

  // Scattered low-opacity pixels across the whole banner for blocksy texture
  let bgPixels = '';
  for (let y = 0; y < Math.floor(H / PX); y++) {
    for (let x = 0; x < Math.floor(W / PX); x++) {
      const val = ((h * (y * 53 + x * 37 + 19)) & 0xFF);
      if (val > 230) {
        const fill = val % 3 === 0 ? fgLight : fg;
        bgPixels += `<rect x="${x * PX}" y="${y * PX}" width="${PX}" height="${PX}" fill="${fill}" opacity="0.06" rx="1"/>`;
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="${bg}" rx="12"/>
    <ellipse cx="${W/2}" cy="${H/2}" rx="220" ry="90" fill="${fg}" opacity="0.12" filter="url(#gb)"/>
    <ellipse cx="${W*0.35}" cy="${H*0.4}" rx="140" ry="70" fill="${fgLight}" opacity="0.08" filter="url(#gb)"/>
    <ellipse cx="${W*0.65}" cy="${H*0.6}" rx="160" ry="80" fill="${fg}" opacity="0.10" filter="url(#gb)"/>
    <defs><filter id="gb"><feGaussianBlur stdDeviation="50"/></filter></defs>
    ${bgPixels}
    ${rects}
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
