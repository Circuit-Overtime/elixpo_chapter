/* eslint-disable */
/**
 * GraphRenderer - Renders mathematical equations as SVG graphs.
 * Produces axes, grid, tick labels, and equation curves.
 */

import { parseExpression } from './GraphMathParser.js';

const GRAPH_COLORS = [
    '#4A90D9', '#E74C3C', '#2ECC71', '#F39C12', '#9B59B6',
    '#1ABC9C', '#E67E22', '#3498DB', '#E91E63', '#00BCD4',
];

/**
 * Calculate nice tick intervals for a given range.
 */
function niceInterval(range) {
    const rough = range / 8;
    const mag = Math.pow(10, Math.floor(Math.log10(rough)));
    const residual = rough / mag;
    let nice;
    if (residual <= 1.5) nice = 1;
    else if (residual <= 3) nice = 2;
    else if (residual <= 7) nice = 5;
    else nice = 10;
    return nice * mag;
}

/**
 * Render graph as SVG markup string.
 * @param {Array} equations - [{expression: string, color: string}]
 * @param {Object} settings - {xMin, xMax, yMin, yMax, showGrid, width, height}
 * @returns {string} SVG markup
 */
export function renderGraphSVG(equations, settings) {
    const {
        xMin = -10, xMax = 10,
        yMin = -10, yMax = 10,
        showGrid = true,
        width = 600, height = 400,
    } = settings || {};

    const pad = { top: 20, right: 20, bottom: 35, left: 45 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;
    const xRange = xMax - xMin || 1;
    const yRange = yMax - yMin || 1;

    // Coordinate transforms
    const toSvgX = (x) => pad.left + ((x - xMin) / xRange) * plotW;
    const toSvgY = (y) => pad.top + ((yMax - y) / yRange) * plotH;

    let svg = '';

    // Background
    svg += `<rect x="0" y="0" width="${width}" height="${height}" fill="#0d1117" rx="8" />`;
    svg += `<rect x="${pad.left}" y="${pad.top}" width="${plotW}" height="${plotH}" fill="#111822" />`;

    // Grid & ticks
    const xTick = niceInterval(xRange);
    const yTick = niceInterval(yRange);

    // Vertical grid lines + x labels
    const xStart = Math.ceil(xMin / xTick) * xTick;
    for (let x = xStart; x <= xMax; x += xTick) {
        const sx = toSvgX(x);
        if (sx < pad.left || sx > pad.left + plotW) continue;
        if (showGrid) {
            svg += `<line x1="${sx}" y1="${pad.top}" x2="${sx}" y2="${pad.top + plotH}" stroke="rgba(255,255,255,0.06)" stroke-width="0.5" />`;
        }
        // Tick label
        const label = Math.abs(x) < 1e-10 ? '0' : (Number.isInteger(x) ? x : x.toFixed(1));
        svg += `<text x="${sx}" y="${pad.top + plotH + 16}" text-anchor="middle" fill="#8b949e" font-size="10" font-family="lixCode, monospace">${label}</text>`;
    }

    // Horizontal grid lines + y labels
    const yStart = Math.ceil(yMin / yTick) * yTick;
    for (let y = yStart; y <= yMax; y += yTick) {
        const sy = toSvgY(y);
        if (sy < pad.top || sy > pad.top + plotH) continue;
        if (showGrid) {
            svg += `<line x1="${pad.left}" y1="${sy}" x2="${pad.left + plotW}" y2="${sy}" stroke="rgba(255,255,255,0.06)" stroke-width="0.5" />`;
        }
        const label = Math.abs(y) < 1e-10 ? '0' : (Number.isInteger(y) ? y : y.toFixed(1));
        svg += `<text x="${pad.left - 8}" y="${sy + 3}" text-anchor="end" fill="#8b949e" font-size="10" font-family="lixCode, monospace">${label}</text>`;
    }

    // Axes
    if (xMin <= 0 && xMax >= 0) {
        const ax = toSvgX(0);
        svg += `<line x1="${ax}" y1="${pad.top}" x2="${ax}" y2="${pad.top + plotH}" stroke="rgba(255,255,255,0.25)" stroke-width="1" />`;
    }
    if (yMin <= 0 && yMax >= 0) {
        const ay = toSvgY(0);
        svg += `<line x1="${pad.left}" y1="${ay}" x2="${pad.left + plotW}" y2="${ay}" stroke="rgba(255,255,255,0.25)" stroke-width="1" />`;
    }

    // Plot border
    svg += `<rect x="${pad.left}" y="${pad.top}" width="${plotW}" height="${plotH}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1" />`;

    // Equations
    const samplesPerPixel = 2;
    const totalSamples = plotW * samplesPerPixel;
    const dx = xRange / totalSamples;

    equations.forEach((eq, eqIdx) => {
        if (!eq.expression || !eq.expression.trim()) return;

        const fn = parseExpression(eq.expression);
        if (!fn) return;

        const color = eq.color || GRAPH_COLORS[eqIdx % GRAPH_COLORS.length];
        let pathData = '';
        let drawing = false;

        for (let i = 0; i <= totalSamples; i++) {
            const x = xMin + i * dx;
            let y;
            try { y = fn(x); } catch { y = NaN; }

            if (!isFinite(y) || isNaN(y) || y < yMin - yRange * 5 || y > yMax + yRange * 5) {
                drawing = false;
                continue;
            }

            // Clamp to plot area for rendering
            const clampedY = Math.max(yMin - yRange * 0.5, Math.min(yMax + yRange * 0.5, y));
            const sx = toSvgX(x);
            const sy = toSvgY(clampedY);

            if (!drawing) {
                pathData += `M ${sx.toFixed(1)} ${sy.toFixed(1)} `;
                drawing = true;
            } else {
                pathData += `L ${sx.toFixed(1)} ${sy.toFixed(1)} `;
            }
        }

        if (pathData) {
            svg += `<path d="${pathData.trim()}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />`;
        }
    });

    // Clip path for plot area
    const clipId = 'graph-clip-' + Date.now();
    const defs = `<defs><clipPath id="${clipId}"><rect x="${pad.left}" y="${pad.top}" width="${plotW}" height="${plotH}" /></clipPath></defs>`;

    // Re-wrap: curves should be clipped
    // Rebuild with clip group
    let curves = '';
    equations.forEach((eq, eqIdx) => {
        if (!eq.expression || !eq.expression.trim()) return;
        const fn = parseExpression(eq.expression);
        if (!fn) return;

        const color = eq.color || GRAPH_COLORS[eqIdx % GRAPH_COLORS.length];
        let pathData = '';
        let drawing = false;

        for (let i = 0; i <= totalSamples; i++) {
            const x = xMin + i * dx;
            let y;
            try { y = fn(x); } catch { y = NaN; }

            if (!isFinite(y) || isNaN(y)) { drawing = false; continue; }

            const sx = toSvgX(x);
            const sy = toSvgY(y);

            if (!drawing) {
                pathData += `M ${sx.toFixed(1)} ${sy.toFixed(1)} `;
                drawing = true;
            } else {
                pathData += `L ${sx.toFixed(1)} ${sy.toFixed(1)} `;
            }
        }

        if (pathData) {
            curves += `<path d="${pathData.trim()}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />`;
        }
    });

    // Equation legend
    let legendY = pad.top + 12;
    let legend = '';
    equations.forEach((eq, eqIdx) => {
        if (!eq.expression || !eq.expression.trim()) return;
        const color = eq.color || GRAPH_COLORS[eqIdx % GRAPH_COLORS.length];
        legend += `<circle cx="${pad.left + 12}" cy="${legendY}" r="4" fill="${color}" />`;
        legend += `<text x="${pad.left + 22}" y="${legendY + 3}" fill="${color}" font-size="11" font-family="lixCode, monospace">${escapeXml(eq.expression)}</text>`;
        legendY += 18;
    });

    // Remove the non-clipped curves from svg (we added them above for building)
    // Rebuild cleanly
    let cleanSvg = '';
    cleanSvg += `<rect x="0" y="0" width="${width}" height="${height}" fill="#0d1117" rx="8" />`;
    cleanSvg += `<rect x="${pad.left}" y="${pad.top}" width="${plotW}" height="${plotH}" fill="#111822" />`;

    // Grid + ticks (re-add)
    for (let x = xStart; x <= xMax; x += xTick) {
        const sx = toSvgX(x);
        if (sx < pad.left || sx > pad.left + plotW) continue;
        if (showGrid) {
            cleanSvg += `<line x1="${sx}" y1="${pad.top}" x2="${sx}" y2="${pad.top + plotH}" stroke="rgba(255,255,255,0.06)" stroke-width="0.5" />`;
        }
        const label = Math.abs(x) < 1e-10 ? '0' : (Number.isInteger(x) ? x : x.toFixed(1));
        cleanSvg += `<text x="${sx}" y="${pad.top + plotH + 16}" text-anchor="middle" fill="#8b949e" font-size="10" font-family="lixCode, monospace">${label}</text>`;
    }
    for (let y = yStart; y <= yMax; y += yTick) {
        const sy = toSvgY(y);
        if (sy < pad.top || sy > pad.top + plotH) continue;
        if (showGrid) {
            cleanSvg += `<line x1="${pad.left}" y1="${sy}" x2="${pad.left + plotW}" y2="${sy}" stroke="rgba(255,255,255,0.06)" stroke-width="0.5" />`;
        }
        const label = Math.abs(y) < 1e-10 ? '0' : (Number.isInteger(y) ? y : y.toFixed(1));
        cleanSvg += `<text x="${pad.left - 8}" y="${sy + 3}" text-anchor="end" fill="#8b949e" font-size="10" font-family="lixCode, monospace">${label}</text>`;
    }
    // Axes
    if (xMin <= 0 && xMax >= 0) {
        const ax = toSvgX(0);
        cleanSvg += `<line x1="${ax}" y1="${pad.top}" x2="${ax}" y2="${pad.top + plotH}" stroke="rgba(255,255,255,0.25)" stroke-width="1" />`;
    }
    if (yMin <= 0 && yMax >= 0) {
        const ay = toSvgY(0);
        cleanSvg += `<line x1="${pad.left}" y1="${ay}" x2="${pad.left + plotW}" y2="${ay}" stroke="rgba(255,255,255,0.25)" stroke-width="1" />`;
    }
    // Plot border
    cleanSvg += `<rect x="${pad.left}" y="${pad.top}" width="${plotW}" height="${plotH}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="1" />`;

    // Clipped curves
    cleanSvg += `<g clip-path="url(#${clipId})">${curves}</g>`;

    // Legend
    cleanSvg += legend;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${defs}${cleanSvg}</svg>`;
}

/**
 * Generate a preview SVG for the modal.
 */
export function renderGraphPreviewSVG(equations, settings) {
    return renderGraphSVG(equations, {
        ...settings,
        width: 520,
        height: 380,
    });
}

function escapeXml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export { GRAPH_COLORS };
