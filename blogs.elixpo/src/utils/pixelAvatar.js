/**
 * Generate a deterministic pixel avatar SVG data URL from a seed string.
 * Creates a 5x5 symmetric pixel grid with colors derived from the seed hash.
 */
export function generatePixelAvatar(seed) {
  const hash = [...(seed || 'org')].reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);
  const colors = ['#9b7bf7', '#60a5fa', '#4ade80', '#fbbf24', '#f472b6', '#f87171', '#2dd4bf', '#818cf8'];
  const bg = colors[Math.abs(hash) % colors.length];
  const fg = colors[Math.abs(hash * 7) % colors.length];

  const bits = [];
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 3; x++) {
      bits.push(((Math.abs(hash * (y * 3 + x + 1))) % 3) > 0);
    }
  }

  let rects = '';
  for (let y = 0; y < 5; y++) {
    for (let x = 0; x < 5; x++) {
      const bx = x < 3 ? x : 4 - x;
      if (bits[y * 3 + bx]) {
        rects += `<rect x="${x * 8 + 4}" y="${y * 8 + 4}" width="8" height="8" fill="${fg}" rx="1"/>`;
      }
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48"><rect width="48" height="48" fill="${bg}" rx="8"/>${rects}</svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
