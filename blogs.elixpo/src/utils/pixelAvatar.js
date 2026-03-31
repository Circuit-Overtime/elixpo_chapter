/**
 * Generate a deterministic pixel avatar SVG data URL from a seed string.
 * Creates a 5x5 symmetric pixel grid with high-contrast color pairs.
 */
export function generatePixelAvatar(seed) {
  // Simple hash
  let hash = 0;
  const s = seed || 'org';
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  const h = Math.abs(hash);

  // Curated high-contrast pairs: [dark bg, bright fg]
  const palettes = [
    ['#1a1040', '#c084fc', '#e9d5ff'], // deep purple → lavender
    ['#0f2a1a', '#4ade80', '#bbf7d0'], // dark green → mint
    ['#0c1a2e', '#60a5fa', '#bfdbfe'], // navy → sky blue
    ['#2a1215', '#fb7185', '#fecdd3'], // dark rose → pink
    ['#1a1708', '#fbbf24', '#fef08a'], // dark gold → amber
    ['#0f1f2e', '#22d3ee', '#a5f3fc'], // dark teal → cyan
    ['#1e1028', '#a78bfa', '#ddd6fe'], // indigo → violet
    ['#1a0f08', '#fb923c', '#fed7aa'], // dark ember → orange
    ['#0f1a1a', '#2dd4bf', '#99f6e4'], // dark sea → teal
    ['#1a0820', '#e879f9', '#f5d0fe'], // dark magenta → fuchsia
    ['#101828', '#818cf8', '#c7d2fe'], // slate → periwinkle
    ['#1a1a08', '#a3e635', '#d9f99d'], // dark olive → lime
  ];

  const palette = palettes[h % palettes.length];
  const bg = palette[0];
  // Pick between the two foreground shades based on hash
  const fg = palette[1];
  const fgLight = palette[2];

  // Generate 5x5 symmetric pixel pattern (only compute left half + center)
  const bits = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      // Use different hash multipliers for more varied patterns
      bits.push(((h * (y * 7 + x * 13 + 3)) & 0xFF) > 90);
    }
  }

  let rects = '';
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const bx = x < 3 ? x : 4 - x; // mirror
      if (bits[y * 3 + bx]) {
        // Alternate between fg and fgLight for depth
        const fill = ((x + y) % 3 === 0) ? fgLight : fg;
        rects += `<rect x="${x * 8 + 4}" y="${y * 8 + 4}" width="8" height="8" fill="${fill}" rx="1"/>`;
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="${bg}" rx="8"/>${rects}</svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
