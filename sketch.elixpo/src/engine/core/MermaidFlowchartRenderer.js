/* eslint-disable */
/**
 * MermaidFlowchartRenderer - Renders parsed flowchart diagrams as high-quality SVG.
 *
 * One renderer for both preview and canvas — ensures they always match.
 * Supports: rectangle [], rounded rectangle (), circle (()), diamond/rhombus {},
 * directed/undirected edges with labels, subgraphs, all directions (TD/TB/LR/RL/BT).
 *
 * Dark theme matching the app aesthetic.
 */

// Layout constants
const NODE_W = 150;
const NODE_H = 50;
const H_SPACING = 200;
const V_SPACING = 120;
const SIDE_MARGIN = 50;
const TOP_MARGIN = 40;
const FONT_FAMILY = 'lixFont, sans-serif';

// Theme colors (dark theme)
const THEME = {
    bg: '#1e1e28',
    nodeBg: 'transparent',
    nodeStroke: '#9090c0',
    nodeText: '#e0e0e0',
    edgeStroke: '#888',
    edgeText: '#a0a0b0',
    subgraphBg: 'rgba(80,80,120,0.08)',
    subgraphBorder: '#555',
    subgraphLabel: '#888',
};

function escapeXml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function measureText(text, fontSize) {
    return text.length * fontSize * 0.55;
}

/**
 * Render a parsed flowchart diagram to SVG markup.
 *
 * @param {Object} diagram - Parsed from parseMermaid()
 * @param {Object} opts - { width?, height?, fitToContent? }
 * @returns {string} SVG markup string
 */
export function renderFlowchartSVG(diagram, opts = {}) {
    if (!diagram || !diagram.nodes || diagram.nodes.length === 0) return '';

    const nodes = diagram.nodes;
    const edges = diagram.edges || [];
    const subgraphs = diagram.subgraphs || [];
    const direction = diagram.direction || 'TD';

    // Compute bounds of laid-out nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(n => {
        const nw = n.width || NODE_W;
        const nh = n.height || NODE_H;
        minX = Math.min(minX, n.x);
        minY = Math.min(minY, n.y);
        maxX = Math.max(maxX, n.x + nw);
        maxY = Math.max(maxY, n.y + nh);
    });

    const dw = maxX - minX || 1;
    const dh = maxY - minY || 1;

    // If fitToContent or explicit size, scale to fit
    const targetW = opts.width || dw + SIDE_MARGIN * 2;
    const targetH = opts.height || dh + TOP_MARGIN * 2;

    let scale, offX, offY;
    if (opts.width || opts.height) {
        const pad = 40;
        scale = Math.min(
            (targetW - pad * 2) / dw,
            (targetH - pad * 2) / dh,
            1.8
        );
        offX = (targetW - dw * scale) / 2 - minX * scale;
        offY = (targetH - dh * scale) / 2 - minY * scale;
    } else {
        scale = 1;
        offX = SIDE_MARGIN - minX;
        offY = TOP_MARGIN - minY;
    }

    const totalWidth = opts.width || Math.round(dw * scale + SIDE_MARGIN * 2);
    const totalHeight = opts.height || Math.round(dh * scale + TOP_MARGIN * 2);

    // Build node lookup for edge rendering
    const nodeById = new Map();
    nodes.forEach(n => {
        const nw = (n.width || NODE_W) * scale;
        const nh = (n.height || NODE_H) * scale;
        const nx = n.x * scale + offX;
        const ny = n.y * scale + offY;
        nodeById.set(n.id, {
            x: nx, y: ny, w: nw, h: nh,
            cx: nx + nw / 2, cy: ny + nh / 2,
            type: n.type, label: n.label,
            fill: n.fill, stroke: n.stroke, strokeWidth: n.strokeWidth,
        });
    });

    let svg = '';
    const defs = [];

    // Arrow markers (normal, dotted, thick)
    defs.push(`<marker id="fc-arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <path d="M1,1 L9,3.5 L1,6" fill="none" stroke="${THEME.edgeStroke}" stroke-width="1.5" stroke-linejoin="round" />
    </marker>`);
    defs.push(`<marker id="fc-arrow-thick" markerWidth="12" markerHeight="9" refX="11" refY="4.5" orient="auto">
      <path d="M1,1 L11,4.5 L1,8" fill="none" stroke="${THEME.edgeStroke}" stroke-width="2" stroke-linejoin="round" />
    </marker>`);

    // Background
    svg += `<rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="${THEME.bg}" rx="8" />`;

    // --- Subgraphs (rendered first, behind everything) ---
    for (const sg of subgraphs) {
        if (!sg.nodes || sg.nodes.length === 0) continue;

        let sgMinX = Infinity, sgMinY = Infinity, sgMaxX = -Infinity, sgMaxY = -Infinity;
        let hasNodes = false;
        for (const nid of sg.nodes) {
            const nd = nodeById.get(nid);
            if (!nd) continue;
            hasNodes = true;
            sgMinX = Math.min(sgMinX, nd.x);
            sgMinY = Math.min(sgMinY, nd.y);
            sgMaxX = Math.max(sgMaxX, nd.x + nd.w);
            sgMaxY = Math.max(sgMaxY, nd.y + nd.h);
        }
        if (!hasNodes) continue;

        const sgPad = 20 * scale;
        const sgX = sgMinX - sgPad;
        const sgY = sgMinY - sgPad - 16 * scale;
        const sgW = (sgMaxX - sgMinX) + sgPad * 2;
        const sgH = (sgMaxY - sgMinY) + sgPad * 2 + 16 * scale;

        svg += `<g data-fc-type="subgraph" data-fc-id="${escapeXml(sg.id)}">`;
        svg += `<rect x="${sgX}" y="${sgY}" width="${sgW}" height="${sgH}" rx="6" fill="${THEME.subgraphBg}" stroke="${THEME.subgraphBorder}" stroke-width="1" stroke-dasharray="4 2" />`;
        if (sg.label) {
            svg += `<text x="${sgX + 8}" y="${sgY + 14}" fill="${THEME.subgraphLabel}" font-size="${Math.max(9, 11 * scale)}" font-family="${FONT_FAMILY}">${escapeXml(sg.label)}</text>`;
        }
        svg += `</g>`;
    }

    // --- Edges ---
    edges.forEach(e => {
        const f = nodeById.get(e.from);
        const t = nodeById.get(e.to);
        if (!f || !t) return;

        const directed = e.directed !== false;
        const edgeStyle = e.style || 'normal';
        let strokeW, dashArr, markerRef;
        if (edgeStyle === 'thick') {
            strokeW = 3;
            dashArr = '';
            markerRef = directed ? ' marker-end="url(#fc-arrow-thick)"' : '';
        } else if (edgeStyle === 'dotted') {
            strokeW = 1.5;
            dashArr = ' stroke-dasharray="5 3"';
            markerRef = directed ? ' marker-end="url(#fc-arrow)"' : '';
        } else {
            strokeW = 1.5;
            dashArr = '';
            markerRef = directed ? ' marker-end="url(#fc-arrow)"' : '';
        }
        const eStroke = e.stroke || THEME.edgeStroke;

        // Compute connection points
        const sp = getEdgePoint(f, t);
        const ep = getEdgePoint(t, f);

        // Determine if we should curve
        const dx = t.cx - f.cx;
        const dy = t.cy - f.cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let mx = (sp.x + ep.x) / 2;
        let my = (sp.y + ep.y) / 2;

        svg += `<g data-fc-type="edge" data-fc-from="${escapeXml(e.from)}" data-fc-to="${escapeXml(e.to)}">`;

        if (dist > 0 && Math.abs(dy) > 15 && Math.abs(dx) > 15) {
            // Curved edge
            const perpX = -dy / dist;
            const perpY = dx / dist;
            const curveAmt = dist * 0.12;
            const cpx = mx + perpX * curveAmt;
            const cpy = my + perpY * curveAmt;
            mx = 0.25 * sp.x + 0.5 * cpx + 0.25 * ep.x;
            my = 0.25 * sp.y + 0.5 * cpy + 0.25 * ep.y;
            svg += `<path d="M ${sp.x} ${sp.y} Q ${cpx} ${cpy} ${ep.x} ${ep.y}" fill="none" stroke="${eStroke}" stroke-width="${strokeW}"${dashArr}${markerRef} />`;
        } else {
            svg += `<line x1="${sp.x}" y1="${sp.y}" x2="${ep.x}" y2="${ep.y}" stroke="${eStroke}" stroke-width="${strokeW}"${dashArr}${markerRef} />`;
        }

        // Edge label (supports multi-line via \n)
        if (e.label) {
            const labelFontSize = Math.max(8, 10 * scale);
            const labelLines = e.label.split('\n');
            const maxLineW = Math.max(...labelLines.map(l => measureText(l, labelFontSize)));
            const labelW = maxLineW + 12;
            const labelH = labelLines.length * (labelFontSize + 3) + 6;
            svg += `<rect x="${mx - labelW / 2}" y="${my - labelH / 2}" width="${labelW}" height="${labelH}" rx="3" fill="${THEME.bg}" opacity="0.85" />`;
            if (labelLines.length === 1) {
                svg += `<text x="${mx}" y="${my + 1}" text-anchor="middle" dominant-baseline="central" fill="${THEME.edgeText}" font-size="${labelFontSize}" font-family="${FONT_FAMILY}">${escapeXml(e.label)}</text>`;
            } else {
                const startY = my - ((labelLines.length - 1) * (labelFontSize + 3)) / 2;
                svg += `<text x="${mx}" text-anchor="middle" fill="${THEME.edgeText}" font-size="${labelFontSize}" font-family="${FONT_FAMILY}">`;
                labelLines.forEach((ln, idx) => {
                    svg += `<tspan x="${mx}" dy="${idx === 0 ? 0 : labelFontSize + 3}" y="${idx === 0 ? startY : ''}">${escapeXml(ln)}</tspan>`;
                });
                svg += `</text>`;
            }
        }

        svg += `</g>`;
    });

    // --- Nodes ---
    nodes.forEach(n => {
        const d = nodeById.get(n.id);
        if (!d) return;

        const nStroke = n.stroke || THEME.nodeStroke;
        const nFill = n.fill || THEME.nodeBg;
        const nStrokeWidth = n.strokeWidth || 1.8;
        const fontSize = Math.max(9, Math.min(13, 12 * scale));

        svg += `<g data-fc-type="node" data-fc-id="${escapeXml(n.id)}">`;

        if (n.type === 'circle') {
            const r = Math.min(d.w, d.h) / 2;
            svg += `<circle cx="${d.cx}" cy="${d.cy}" r="${r}" fill="${nFill}" stroke="${nStroke}" stroke-width="${nStrokeWidth}" />`;
        } else if (n.type === 'diamond') {
            const hw = d.w / 2 * 0.85;
            const hh = d.h / 2 * 0.85;
            svg += `<polygon points="${d.cx},${d.cy - hh} ${d.cx + hw},${d.cy} ${d.cx},${d.cy + hh} ${d.cx - hw},${d.cy}" fill="${nFill}" stroke="${nStroke}" stroke-width="${nStrokeWidth}" />`;
        } else if (n.type === 'asymmetric') {
            // Flag/asymmetric shape: pointed left, flat right
            const notchX = d.x + 15 * scale;
            svg += `<polygon points="${d.x},${d.y} ${d.x + d.w},${d.y} ${d.x + d.w},${d.y + d.h} ${d.x},${d.y + d.h} ${notchX},${d.cy}" fill="${nFill}" stroke="${nStroke}" stroke-width="${nStrokeWidth}" />`;
        } else if (n.type === 'roundrect') {
            svg += `<rect x="${d.x}" y="${d.y}" width="${d.w}" height="${d.h}" rx="${12 * scale}" fill="${nFill}" stroke="${nStroke}" stroke-width="${nStrokeWidth}" />`;
        } else {
            svg += `<rect x="${d.x}" y="${d.y}" width="${d.w}" height="${d.h}" rx="${3 * scale}" fill="${nFill}" stroke="${nStroke}" stroke-width="${nStrokeWidth}" />`;
        }

        // Node label (supports multi-line via \n)
        if (n.label) {
            let labelFill = nFill && nFill !== 'transparent' && nFill !== THEME.nodeBg ? getContrastColor(nFill) : nStroke;
            if (isColorTooDark(labelFill)) labelFill = '#d0d0d0';

            const labelLines = n.label.split('\n');
            if (labelLines.length === 1) {
                svg += `<text x="${d.cx}" y="${d.cy}" text-anchor="middle" dominant-baseline="central" fill="${labelFill}" font-size="${fontSize}" font-family="${FONT_FAMILY}" font-weight="500">${escapeXml(n.label)}</text>`;
            } else {
                const lineH = fontSize + 3;
                const startY = d.cy - ((labelLines.length - 1) * lineH) / 2;
                svg += `<text text-anchor="middle" fill="${labelFill}" font-size="${fontSize}" font-family="${FONT_FAMILY}" font-weight="500">`;
                labelLines.forEach((ln, idx) => {
                    svg += `<tspan x="${d.cx}" y="${startY + idx * lineH}">${escapeXml(ln)}</tspan>`;
                });
                svg += `</text>`;
            }
        }

        svg += `</g>`;
    });

    // Build final SVG
    const defsStr = defs.length > 0 ? `<defs>${defs.join('')}</defs>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">${defsStr}${svg}</svg>`;
}

/**
 * Get the connection point on a node's boundary toward another node.
 */
function getEdgePoint(node, target) {
    const dx = target.cx - node.cx;
    const dy = target.cy - node.cy;

    if (node.type === 'circle') {
        const r = Math.min(node.w, node.h) / 2;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        return { x: node.cx + (dx / dist) * r, y: node.cy + (dy / dist) * r };
    }

    if (node.type === 'diamond') {
        // Diamond edge intersection
        const hw = node.w / 2 * 0.85;
        const hh = node.h / 2 * 0.85;
        const adx = Math.abs(dx) || 0.001;
        const ady = Math.abs(dy) || 0.001;
        const t = Math.min(hw / adx, hh / ady);
        return { x: node.cx + dx * t * 0.95, y: node.cy + dy * t * 0.95 };
    }

    // Rectangle / rounded rect / asymmetric - exit from edges
    const hw = node.w / 2;
    const hh = node.h / 2;

    if (Math.abs(dx) < 0.001 || Math.abs(dy) * hw > Math.abs(dx) * hh) {
        if (dy > 0) return { x: node.cx, y: node.y + node.h };
        return { x: node.cx, y: node.y };
    }
    if (dx > 0) return { x: node.x + node.w, y: node.cy };
    return { x: node.x, y: node.cy };
}

function isColorTooDark(hex) {
    if (!hex || hex === 'transparent' || hex === 'none') return false;
    const rgb = parseColor(hex);
    if (!rgb) return false;
    return (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) < 80;
}

function parseColor(hex) {
    if (!hex || hex === 'transparent' || hex === 'none') return null;
    let c = hex.replace('#', '');
    // Support 3-char shorthand (#9f6 → #99ff66)
    if (c.length === 3) c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    if (c.length < 6) return null;
    return {
        r: parseInt(c.substring(0, 2), 16),
        g: parseInt(c.substring(2, 4), 16),
        b: parseInt(c.substring(4, 6), 16),
    };
}

function getLuminance(hex) {
    const rgb = parseColor(hex);
    if (!rgb) return 0;
    return 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
}

function getContrastColor(bgHex) {
    // Pick dark or light text based on background luminance
    return getLuminance(bgHex) > 140 ? '#1a1a2e' : '#f0f0f0';
}

/**
 * Generate preview SVG for the modal.
 */
export function renderFlowchartPreviewSVG(diagram) {
    return renderFlowchartSVG(diagram, { width: 600, height: 450 });
}

/**
 * Render a flowchart diagram onto the canvas inside a Frame.
 */
export function renderFlowchartOnCanvas(diagram) {
    if (!diagram || !diagram.nodes || diagram.nodes.length === 0) return false;
    if (!window.svg || !window.Frame) {
        console.error('[FlowchartRenderer] Engine not initialized');
        return false;
    }

    // Generate the SVG markup (no fixed size — use natural dimensions)
    const svgMarkup = renderFlowchartSVG(diagram);
    if (!svgMarkup) return false;

    // Parse SVG to get dimensions
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgMarkup, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    if (!svgEl) return false;

    const gWidth = parseFloat(svgEl.getAttribute('width'));
    const gHeight = parseFloat(svgEl.getAttribute('height'));

    // Viewport center
    const vb = window.currentViewBox || { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
    const vcx = vb.x + vb.width / 2;
    const vcy = vb.y + vb.height / 2;

    const framePad = 30;
    const frameW = gWidth + framePad * 2;
    const frameH = gHeight + framePad * 2;
    const frameX = vcx - frameW / 2;
    const frameY = vcy - frameH / 2;

    const title = diagram.title || 'Flowchart';

    // Create frame
    let frame;
    try {
        frame = new window.Frame(frameX, frameY, frameW, frameH, {
            stroke: '#888', strokeWidth: 2, fill: 'transparent', opacity: 1,
            frameName: title,
        });
        frame._diagramType = 'flowchart';
        frame._diagramData = diagram;

        window.shapes.push(frame);
        if (window.pushCreateAction) window.pushCreateAction(frame);
    } catch (err) {
        console.error('[FlowchartRenderer] Frame creation failed:', err);
        return false;
    }

    // Insert SVG content into the canvas
    const NS = 'http://www.w3.org/2000/svg';
    try {
        const graphGroup = document.createElementNS(NS, 'g');
        graphGroup.setAttribute('data-type', 'flowchart-diagram');
        graphGroup.setAttribute('transform', `translate(${frameX + framePad}, ${frameY + framePad})`);

        // Copy defs
        const defs = svgEl.querySelector('defs');
        if (defs) {
            let mainDefs = window.svg.querySelector('defs');
            if (!mainDefs) {
                mainDefs = document.createElementNS(NS, 'defs');
                window.svg.insertBefore(mainDefs, window.svg.firstChild);
            }
            while (defs.firstChild) {
                mainDefs.appendChild(defs.firstChild);
            }
        }

        // Copy all child elements (skip defs)
        while (svgEl.childNodes.length > 0) {
            const child = svgEl.childNodes[0];
            if (child.nodeName === 'defs') {
                svgEl.removeChild(child);
                continue;
            }
            graphGroup.appendChild(child);
        }

        window.svg.appendChild(graphGroup);

        // Wrap as a shape-like object for the frame
        const fcShape = {
            shapeName: 'flowchartContent',
            group: graphGroup,
            element: graphGroup,
            x: frameX + framePad,
            y: frameY + framePad,
            width: gWidth,
            height: gHeight,
            move(dx, dy) {
                this.x += dx;
                this.y += dy;
                this.group.setAttribute('transform', `translate(${this.x}, ${this.y})`);
            },
            updateAttachedArrows() {},
        };

        window.shapes.push(fcShape);
        if (frame.addShapeToFrame) frame.addShapeToFrame(fcShape);
    } catch (err) {
        console.error('[FlowchartRenderer] SVG insertion failed:', err);
    }

    // Select the frame
    window.currentShape = frame;
    if (frame.selectFrame) frame.selectFrame();
    if (window.__sketchStoreApi) window.__sketchStoreApi.setSelectedShapeSidebar('frame');

    return true;
}
