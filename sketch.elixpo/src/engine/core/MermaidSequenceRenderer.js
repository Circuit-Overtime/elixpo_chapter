/* eslint-disable */
/**
 * MermaidSequenceRenderer - Renders parsed sequence diagrams as high-quality SVG.
 *
 * One renderer for both preview and canvas — ensures they always match.
 * The canvas renderer inserts the SVG into a frame; elements inside are
 * individually editable (each participant box, message label, note, etc.
 * is its own SVG group with data attributes for the editor).
 *
 * Design follows the reference image: dark theme, clean lines,
 * participant boxes at top and bottom, dashed lifelines, arrow styles.
 */

import { parseSequenceDiagram } from './MermaidSequenceParser.js';

// Layout constants
const PARTICIPANT_W = 100;
const PARTICIPANT_H = 36;
const PARTICIPANT_GAP = 140;
const MSG_ROW_HEIGHT = 50;
const NOTE_PAD = 10;
const NOTE_MAX_W = 160;
const TOP_MARGIN = 30;
const BOTTOM_MARGIN = 30;
const SIDE_MARGIN = 40;
const FONT_FAMILY = 'lixFont, sans-serif';
const CODE_FONT = 'lixCode, monospace';

// Theme colors (dark theme matching the app)
const THEME = {
    bg: '#1e1e28',
    participantBg: '#232329',
    participantBorder: '#555',
    participantText: '#e8e8ee',
    lifeline: '#444',
    messageLine: '#888',
    messageDash: '#666',
    messageText: '#e0e0e0',
    noteBg: '#3a3520',
    noteBorder: '#665e30',
    noteText: '#d4c870',
    blockBg: 'rgba(80,80,120,0.12)',
    blockBorder: '#555',
    blockLabel: '#a0a0b0',
    crossColor: '#e74c3c',
};

function escapeXml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/**
 * Measure approximate text width (since we can't use DOM measurement in pure SVG generation).
 * Uses a rough character-width heuristic.
 */
function measureText(text, fontSize) {
    const avgCharWidth = fontSize * 0.55;
    return text.length * avgCharWidth;
}

/**
 * Word-wrap text into lines that fit within maxWidth.
 */
function wrapText(text, fontSize, maxWidth) {
    // Handle <br/> tags
    const segments = text.split(/<br\s*\/?>/i);
    const lines = [];
    for (const segment of segments) {
        const words = segment.split(/\s+/);
        let currentLine = '';
        for (const word of words) {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            if (measureText(testLine, fontSize) > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);
    }
    return lines.length > 0 ? lines : [''];
}

/**
 * Render a parsed sequence diagram to SVG markup.
 *
 * @param {Object} diagram - Parsed from parseSequenceDiagram()
 * @param {Object} opts - { width?, fitToContent? }
 * @returns {string} SVG markup string
 */
export function renderSequenceSVG(diagram, opts = {}) {
    if (!diagram || diagram.type !== 'sequenceDiagram') return '';

    const participants = diagram.participants;
    const messages = diagram.messages;
    const notes = diagram.notes;
    const blocks = diagram.blocks || [];

    const pCount = participants.length;
    if (pCount === 0) return '';

    // Build participant index map
    const pIndex = new Map();
    participants.forEach((p, i) => pIndex.set(p.name, i));

    // Calculate total width
    const contentWidth = (pCount - 1) * PARTICIPANT_GAP + PARTICIPANT_W;
    const totalWidth = opts.width || Math.max(contentWidth + SIDE_MARGIN * 2, 400);
    const startX = (totalWidth - contentWidth) / 2;

    // Participant X centers
    const pCenters = participants.map((_, i) => startX + i * PARTICIPANT_GAP + PARTICIPANT_W / 2);

    // Pre-calculate note heights to account for row expansion
    const noteAtMsg = new Map(); // msgIndex -> [{note, height}]
    for (const note of notes) {
        const fontSize = 11;
        const lines = wrapText(note.text, fontSize, NOTE_MAX_W - NOTE_PAD * 2);
        const h = lines.length * (fontSize + 4) + NOTE_PAD * 2;
        if (!noteAtMsg.has(note.atMessage)) noteAtMsg.set(note.atMessage, []);
        noteAtMsg.get(note.atMessage).push({ ...note, lines, height: h });
    }

    // Calculate message Y positions (accounting for notes that expand rows)
    const topBoxBottom = TOP_MARGIN + PARTICIPANT_H;
    let currentY = topBoxBottom + 30;  // gap after top participant boxes

    const msgYPositions = [];
    for (let mi = 0; mi < messages.length; mi++) {
        // Check if notes appear before this message
        const notesBefore = noteAtMsg.get(mi);
        if (notesBefore) {
            const maxNoteH = Math.max(...notesBefore.map(n => n.height));
            currentY += maxNoteH + 10;
        }
        msgYPositions.push(currentY);
        currentY += MSG_ROW_HEIGHT;
    }

    // Notes after last message
    const notesAfterLast = noteAtMsg.get(messages.length);
    if (notesAfterLast) {
        const maxNoteH = Math.max(...notesAfterLast.map(n => n.height));
        currentY += maxNoteH + 10;
    }

    const bottomBoxTop = currentY + 20;
    const totalHeight = bottomBoxTop + PARTICIPANT_H + BOTTOM_MARGIN;

    // Start building SVG
    let svg = '';
    const defs = [];

    // Arrow markers
    defs.push(`<marker id="seq-arrow-open" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polyline points="1,1 9,3.5 1,6" fill="none" stroke="${THEME.messageLine}" stroke-width="1.5" stroke-linejoin="round" />
    </marker>`);
    defs.push(`<marker id="seq-arrow-filled" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
      <polygon points="1,1 9,3.5 1,6" fill="${THEME.messageLine}" stroke="none" />
    </marker>`);

    // Background
    svg += `<rect x="0" y="0" width="${totalWidth}" height="${totalHeight}" fill="${THEME.bg}" rx="8" />`;

    // Title
    if (diagram.title) {
        svg += `<text x="${totalWidth / 2}" y="${TOP_MARGIN - 8}" text-anchor="middle" fill="${THEME.participantText}" font-size="14" font-family="${FONT_FAMILY}" font-weight="600">${escapeXml(diagram.title)}</text>`;
    }

    // --- Lifelines (dashed vertical lines) ---
    for (let pi = 0; pi < pCount; pi++) {
        const cx = pCenters[pi];
        svg += `<line x1="${cx}" y1="${topBoxBottom}" x2="${cx}" y2="${bottomBoxTop}" stroke="${THEME.lifeline}" stroke-width="1" stroke-dasharray="6 4" />`;
    }

    // --- Participant boxes (top) ---
    for (let pi = 0; pi < pCount; pi++) {
        const cx = pCenters[pi];
        const bx = cx - PARTICIPANT_W / 2;
        const by = TOP_MARGIN;
        svg += `<g data-seq-type="participant" data-seq-id="${escapeXml(participants[pi].name)}" data-seq-pos="top">`;
        svg += `<rect x="${bx}" y="${by}" width="${PARTICIPANT_W}" height="${PARTICIPANT_H}" rx="4" fill="${THEME.participantBg}" stroke="${THEME.participantBorder}" stroke-width="1.5" />`;
        svg += `<text x="${cx}" y="${by + PARTICIPANT_H / 2 + 1}" text-anchor="middle" dominant-baseline="central" fill="${THEME.participantText}" font-size="13" font-family="${FONT_FAMILY}">${escapeXml(participants[pi].name)}</text>`;
        svg += `</g>`;
    }

    // --- Participant boxes (bottom) ---
    for (let pi = 0; pi < pCount; pi++) {
        const cx = pCenters[pi];
        const bx = cx - PARTICIPANT_W / 2;
        const by = bottomBoxTop;
        svg += `<g data-seq-type="participant" data-seq-id="${escapeXml(participants[pi].name)}" data-seq-pos="bottom">`;
        svg += `<rect x="${bx}" y="${by}" width="${PARTICIPANT_W}" height="${PARTICIPANT_H}" rx="4" fill="${THEME.participantBg}" stroke="${THEME.participantBorder}" stroke-width="1.5" />`;
        svg += `<text x="${cx}" y="${by + PARTICIPANT_H / 2 + 1}" text-anchor="middle" dominant-baseline="central" fill="${THEME.participantText}" font-size="13" font-family="${FONT_FAMILY}">${escapeXml(participants[pi].name)}</text>`;
        svg += `</g>`;
    }

    // --- Blocks (alt/loop/opt etc.) ---
    for (const block of blocks) {
        const startY = block.startMsg < msgYPositions.length
            ? msgYPositions[block.startMsg] - 20
            : topBoxBottom + 20;
        const endY = block.endMsg <= msgYPositions.length
            ? (block.endMsg < msgYPositions.length ? msgYPositions[block.endMsg] - 10 : currentY)
            : currentY;

        const blockX = startX - 15;
        const blockW = contentWidth + 30;

        svg += `<g data-seq-type="block" data-block-type="${block.type}">`;
        svg += `<rect x="${blockX}" y="${startY}" width="${blockW}" height="${endY - startY}" rx="4" fill="${THEME.blockBg}" stroke="${THEME.blockBorder}" stroke-width="1" stroke-dasharray="4 2" />`;
        // Type label in top-left corner
        svg += `<rect x="${blockX}" y="${startY}" width="${measureText(block.type, 10) + 12}" height="18" rx="3" fill="${THEME.blockBorder}" />`;
        svg += `<text x="${blockX + 6}" y="${startY + 12}" fill="${THEME.bg}" font-size="10" font-family="${FONT_FAMILY}" font-weight="600">${escapeXml(block.type)}</text>`;
        // Condition label
        if (block.label) {
            svg += `<text x="${blockX + measureText(block.type, 10) + 20}" y="${startY + 12}" fill="${THEME.blockLabel}" font-size="10" font-family="${FONT_FAMILY}" font-style="italic">[${escapeXml(block.label)}]</text>`;
        }

        // Section dividers (else sections)
        for (let si = 1; si < block.sections.length; si++) {
            const section = block.sections[si];
            const secY = section.startMsg < msgYPositions.length
                ? msgYPositions[section.startMsg] - 15
                : endY - 10;
            svg += `<line x1="${blockX}" y1="${secY}" x2="${blockX + blockW}" y2="${secY}" stroke="${THEME.blockBorder}" stroke-width="1" stroke-dasharray="4 2" />`;
            if (section.label) {
                svg += `<text x="${blockX + 8}" y="${secY + 13}" fill="${THEME.blockLabel}" font-size="10" font-family="${FONT_FAMILY}" font-style="italic">[${escapeXml(section.label)}]</text>`;
            }
        }
        svg += `</g>`;
    }

    // --- Messages ---
    for (let mi = 0; mi < messages.length; mi++) {
        const msg = messages[mi];
        const y = msgYPositions[mi];
        const fromIdx = pIndex.get(msg.from);
        const toIdx = pIndex.get(msg.to);
        if (fromIdx === undefined || toIdx === undefined) continue;

        const fromX = pCenters[fromIdx];
        const toX = pCenters[toIdx];
        const isSelf = fromIdx === toIdx;

        svg += `<g data-seq-type="message" data-seq-idx="${mi}">`;

        if (isSelf) {
            // Self-message: loop arrow to the right
            const loopW = 40;
            const loopH = 25;
            const dash = msg.solid ? '' : ` stroke-dasharray="6 3"`;
            svg += `<path d="M ${fromX} ${y} L ${fromX + loopW} ${y} L ${fromX + loopW} ${y + loopH} L ${fromX + 4} ${y + loopH}" fill="none" stroke="${THEME.messageLine}" stroke-width="1.5"${dash} marker-end="url(#seq-arrow-open)" />`;
            if (msg.text) {
                svg += `<text x="${fromX + loopW + 6}" y="${y + loopH / 2 + 1}" dominant-baseline="central" fill="${THEME.messageText}" font-size="12" font-family="${FONT_FAMILY}">${escapeXml(msg.text)}</text>`;
            }
        } else {
            const isLeft = toX < fromX;
            const lineEndX = isLeft ? toX + 4 : toX - 4;
            const dash = msg.solid ? '' : ` stroke-dasharray="6 3"`;

            // Arrow line
            const markerId = msg.arrowHead === 'filled' ? 'seq-arrow-filled' : 'seq-arrow-open';

            if (msg.cross) {
                // Cross at end (lost message)
                svg += `<line x1="${fromX}" y1="${y}" x2="${lineEndX}" y2="${y}" stroke="${THEME.messageLine}" stroke-width="1.5"${dash} />`;
                // X mark
                const xSize = 6;
                svg += `<line x1="${toX - xSize}" y1="${y - xSize}" x2="${toX + xSize}" y2="${y + xSize}" stroke="${THEME.crossColor}" stroke-width="2" />`;
                svg += `<line x1="${toX + xSize}" y1="${y - xSize}" x2="${toX - xSize}" y2="${y + xSize}" stroke="${THEME.crossColor}" stroke-width="2" />`;
            } else {
                svg += `<line x1="${fromX}" y1="${y}" x2="${lineEndX}" y2="${y}" stroke="${THEME.messageLine}" stroke-width="1.5"${dash} marker-end="url(#${markerId})" />`;
            }

            // Message text (centered above the line)
            if (msg.text) {
                const midX = (fromX + toX) / 2;
                const textContent = msg.number ? `${msg.number}. ${msg.text}` : msg.text;
                svg += `<text x="${midX}" y="${y - 8}" text-anchor="middle" fill="${THEME.messageText}" font-size="12" font-family="${FONT_FAMILY}">${escapeXml(textContent)}</text>`;
            }
        }

        svg += `</g>`;
    }

    // --- Notes ---
    for (const [msgIdx, noteGroup] of noteAtMsg.entries()) {
        const baseY = msgIdx < msgYPositions.length
            ? msgYPositions[msgIdx] - 15
            : (msgIdx > 0 ? msgYPositions[msgIdx - 1] + MSG_ROW_HEIGHT - 15 : topBoxBottom + 30);

        for (const note of noteGroup) {
            const targetIdxs = note.targets.map(t => pIndex.get(t)).filter(i => i !== undefined);
            if (targetIdxs.length === 0) continue;

            const fontSize = 11;
            const lineH = fontSize + 4;
            const noteH = note.lines.length * lineH + NOTE_PAD * 2;
            const noteW = Math.min(
                NOTE_MAX_W,
                Math.max(...note.lines.map(l => measureText(l, fontSize))) + NOTE_PAD * 2 + 10
            );

            let noteX;
            if (note.position === 'left of') {
                const px = pCenters[targetIdxs[0]];
                noteX = px - PARTICIPANT_W / 2 - noteW - 8;
            } else if (note.position === 'right of') {
                const px = pCenters[targetIdxs[0]];
                noteX = px + PARTICIPANT_W / 2 + 8;
            } else {
                // 'over' - center between targets
                if (targetIdxs.length >= 2) {
                    const minP = Math.min(...targetIdxs);
                    const maxP = Math.max(...targetIdxs);
                    const center = (pCenters[minP] + pCenters[maxP]) / 2;
                    noteX = center - noteW / 2;
                } else {
                    noteX = pCenters[targetIdxs[0]] - noteW / 2;
                }
            }

            const noteY = baseY - noteH;

            svg += `<g data-seq-type="note">`;
            svg += `<rect x="${noteX}" y="${noteY}" width="${noteW}" height="${noteH}" rx="3" fill="${THEME.noteBg}" stroke="${THEME.noteBorder}" stroke-width="1" />`;
            // Render wrapped text lines
            note.lines.forEach((line, li) => {
                svg += `<text x="${noteX + NOTE_PAD}" y="${noteY + NOTE_PAD + li * lineH + fontSize}" fill="${THEME.noteText}" font-size="${fontSize}" font-family="${FONT_FAMILY}">${escapeXml(line)}</text>`;
            });
            svg += `</g>`;
        }
    }

    // Build final SVG
    const defsStr = defs.length > 0 ? `<defs>${defs.join('')}</defs>` : '';
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}">${defsStr}${svg}</svg>`;
}

/**
 * Generate preview SVG for the modal (fixed width).
 */
export function renderSequencePreviewSVG(diagram) {
    return renderSequenceSVG(diagram, { width: 620 });
}

/**
 * Parse raw mermaid source and render sequence SVG.
 * Returns SVG string or empty string if not a sequence diagram.
 */
export function parseAndRenderSequence(src) {
    const diagram = parseSequenceDiagram(src);
    if (!diagram) return '';
    return renderSequenceSVG(diagram);
}

/**
 * Render a sequence diagram onto the canvas inside a Frame.
 * Creates real SVG groups with data attributes so individual elements
 * can be selected and edited.
 */
export function renderSequenceOnCanvas(diagram) {
    if (!diagram || diagram.type !== 'sequenceDiagram') return false;
    if (!window.svg || !window.Frame) {
        console.error('[SequenceRenderer] Engine not initialized');
        return false;
    }

    // Generate the SVG markup
    const svgMarkup = renderSequenceSVG(diagram);
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

    const title = diagram.title || 'Sequence Diagram';

    // Create frame
    let frame;
    try {
        frame = new window.Frame(frameX, frameY, frameW, frameH, {
            stroke: '#888', strokeWidth: 2, fill: 'transparent', opacity: 1,
            frameName: title,
        });
        frame._diagramType = 'sequence';
        frame._diagramData = diagram;

        window.shapes.push(frame);
        if (window.pushCreateAction) window.pushCreateAction(frame);
    } catch (err) {
        console.error('[SequenceRenderer] Frame creation failed:', err);
        return false;
    }

    // Insert SVG content into the canvas
    const NS = 'http://www.w3.org/2000/svg';
    try {
        const graphGroup = document.createElementNS(NS, 'g');
        graphGroup.setAttribute('data-type', 'sequence-diagram');
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
        const seqShape = {
            shapeName: 'sequenceContent',
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

        window.shapes.push(seqShape);
        if (frame.addShapeToFrame) frame.addShapeToFrame(seqShape);
    } catch (err) {
        console.error('[SequenceRenderer] SVG insertion failed:', err);
    }

    // Select the frame
    window.currentShape = frame;
    if (frame.selectFrame) frame.selectFrame();
    if (window.__sketchStoreApi) window.__sketchStoreApi.setSelectedShapeSidebar('frame');

    return true;
}
