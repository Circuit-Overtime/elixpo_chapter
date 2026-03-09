/* eslint-disable */
/**
 * AIRenderer - Converts AI-generated diagram JSON into shapes on the canvas.
 *
 * Takes a diagram object with nodes[] and edges[] and creates:
 * - A Frame containing all shapes (same style as user-created frames)
 * - Rectangle/Circle shapes for nodes
 * - Arrow shapes for edges
 * - Text labels on nodes and edges
 */

const PADDING = 40;

/**
 * Render AI diagram JSON onto the canvas inside a Frame.
 * @param {Object} diagram - { title, nodes[], edges[] }
 * @returns {boolean} true if rendering succeeded
 */
export function renderAIDiagram(diagram) {
    if (!diagram || !diagram.nodes || !Array.isArray(diagram.nodes) || diagram.nodes.length === 0) {
        console.error('[AIRenderer] Invalid or empty diagram data');
        return false;
    }

    const nodes = diagram.nodes;
    const edges = diagram.edges || [];
    const title = diagram.title || 'AI Diagram';

    // Validate required globals
    if (!window.svg || !window.Frame || !window.Rectangle) {
        console.error('[AIRenderer] Engine not initialized');
        return false;
    }

    // Calculate canvas center based on current viewport
    const vb = window.currentViewBox || { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
    const viewCenterX = vb.x + vb.width / 2;
    const viewCenterY = vb.y + vb.height / 2;

    // Calculate diagram bounds from node positions
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    nodes.forEach(node => {
        const w = node.width || 160;
        const h = node.height || 60;
        if (node.x < minX) minX = node.x;
        if (node.y < minY) minY = node.y;
        if (node.x + w > maxX) maxX = node.x + w;
        if (node.y + h > maxY) maxY = node.y + h;
    });

    const diagramWidth = maxX - minX;
    const diagramHeight = maxY - minY;

    // Offset to center diagram in viewport
    const offsetX = viewCenterX - diagramWidth / 2 - minX;
    const offsetY = viewCenterY - diagramHeight / 2 - minY;

    // Create the frame with SAME style as user-created frames (frameTool defaults)
    const frameX = viewCenterX - diagramWidth / 2 - PADDING;
    const frameY = viewCenterY - diagramHeight / 2 - PADDING;
    const frameW = diagramWidth + PADDING * 2;
    const frameH = diagramHeight + PADDING * 2;

    let frame = null;
    try {
        frame = new window.Frame(frameX, frameY, frameW, frameH, {
            stroke: '#888',
            strokeWidth: 2,
            fill: 'transparent',
            opacity: 1,
        });
        frame.setTitle(title);
        window.shapes.push(frame);
        if (typeof window.pushCreateAction === 'function') window.pushCreateAction(frame);
    } catch (err) {
        console.error('[AIRenderer] Failed to create frame:', err);
        return false;
    }

    // Map node IDs to their created shapes and positions for edge connections
    const nodeMap = new Map();
    const createdShapes = [frame];

    // Create nodes
    for (const node of nodes) {
        const nx = node.x + offsetX;
        const ny = node.y + offsetY;
        const nw = node.width || 160;
        const nh = node.height || 60;

        let shape = null;

        try {
            if (node.type === 'circle' && window.Circle) {
                const rx = nw / 2;
                const ry = nh / 2;
                shape = new window.Circle(nx + rx, ny + ry, rx, ry, {
                    stroke: '#e0e0e0',
                    strokeWidth: 1.5,
                    fill: 'transparent',
                    roughness: 1,
                });
            } else if (node.type === 'diamond' && window.Rectangle) {
                const size = Math.max(nw, nh) * 0.7;
                shape = new window.Rectangle(
                    nx + nw / 2 - size / 2,
                    ny + nh / 2 - size / 2,
                    size, size, {
                        stroke: '#e0e0e0',
                        strokeWidth: 1.5,
                        fill: 'transparent',
                        roughness: 1,
                    }
                );
                if (shape.element) {
                    const cx = nx + nw / 2;
                    const cy = ny + nh / 2;
                    shape.element.setAttribute('transform', `rotate(45, ${cx}, ${cy})`);
                }
            } else if (window.Rectangle) {
                shape = new window.Rectangle(nx, ny, nw, nh, {
                    stroke: '#e0e0e0',
                    strokeWidth: 1.5,
                    fill: 'transparent',
                    roughness: 1,
                });
            }
        } catch (err) {
            console.warn('[AIRenderer] Failed to create node:', node.id, err);
            continue;
        }

        if (shape) {
            window.shapes.push(shape);
            if (typeof window.pushCreateAction === 'function') window.pushCreateAction(shape);
            createdShapes.push(shape);

            if (typeof frame.addShapeToFrame === 'function') {
                frame.addShapeToFrame(shape);
            }

            nodeMap.set(node.id, {
                shape,
                x: nx, y: ny,
                width: nw, height: nh,
                centerX: nx + nw / 2,
                centerY: ny + nh / 2,
            });
        }

        // Add label as text
        if (node.label && window.TextShape) {
            const textShape = addTextLabel(node.label, nx + nw / 2, ny + nh / 2, frame);
            if (textShape) createdShapes.push(textShape);
        }
    }

    // Create edges as arrows
    for (const edge of edges) {
        const fromNode = nodeMap.get(edge.from);
        const toNode = nodeMap.get(edge.to);
        if (!fromNode || !toNode) continue;

        const startPoint = getConnectionPoint(fromNode, toNode);
        const endPoint = getConnectionPoint(toNode, fromNode, true);

        if (window.Arrow) {
            try {
                const arrow = new window.Arrow(startPoint, endPoint, {
                    stroke: '#e0e0e0',
                    strokeWidth: 1.5,
                    roughness: 1,
                });

                window.shapes.push(arrow);
                if (typeof window.pushCreateAction === 'function') window.pushCreateAction(arrow);
                createdShapes.push(arrow);

                if (typeof frame.addShapeToFrame === 'function') {
                    frame.addShapeToFrame(arrow);
                }

                if (fromNode.shape && arrow.setStartAttachment) {
                    arrow.setStartAttachment(fromNode.shape);
                }
                if (toNode.shape && arrow.setEndAttachment) {
                    arrow.setEndAttachment(toNode.shape);
                }
            } catch (err) {
                console.warn('[AIRenderer] Failed to create arrow:', edge, err);
            }
        }

        // Add edge label
        if (edge.label && window.TextShape) {
            const midX = (startPoint.x + endPoint.x) / 2;
            const midY = (startPoint.y + endPoint.y) / 2;
            const textShape = addTextLabel(edge.label, midX, midY - 10, frame, 10);
            if (textShape) createdShapes.push(textShape);
        }
    }

    console.log(`[AIRenderer] Rendered ${nodes.length} nodes, ${edges.length} edges in frame "${title}"`);
    return true;
}

/**
 * Calculate connection point on a node's edge facing another node.
 */
function getConnectionPoint(fromNode, toNode, isTarget = false) {
    const dx = toNode.centerX - fromNode.centerX;
    const dy = toNode.centerY - fromNode.centerY;

    const hw = fromNode.width / 2;
    const hh = fromNode.height / 2;

    if (isTarget) {
        if (Math.abs(dy) * hw > Math.abs(dx) * hh) {
            return dy < 0
                ? { x: fromNode.centerX, y: fromNode.y + fromNode.height }
                : { x: fromNode.centerX, y: fromNode.y };
        } else {
            return dx < 0
                ? { x: fromNode.x + fromNode.width, y: fromNode.centerY }
                : { x: fromNode.x, y: fromNode.centerY };
        }
    } else {
        if (Math.abs(dy) * hw > Math.abs(dx) * hh) {
            return dy > 0
                ? { x: fromNode.centerX, y: fromNode.y + fromNode.height }
                : { x: fromNode.centerX, y: fromNode.y };
        } else {
            return dx > 0
                ? { x: fromNode.x + fromNode.width, y: fromNode.centerY }
                : { x: fromNode.x, y: fromNode.centerY };
        }
    }
}

/**
 * Add a text label at position.
 */
function addTextLabel(text, x, y, frame, fontSize = 14) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = window.svg;
    if (!svg) return null;

    try {
        const group = document.createElementNS(ns, 'g');
        const textEl = document.createElementNS(ns, 'text');
        textEl.setAttribute('x', x);
        textEl.setAttribute('y', y);
        textEl.setAttribute('text-anchor', 'middle');
        textEl.setAttribute('dominant-baseline', 'central');
        textEl.setAttribute('fill', '#e0e0e0');
        textEl.setAttribute('font-size', fontSize);
        textEl.setAttribute('font-family', 'lixFont, sans-serif');
        textEl.textContent = text;

        group.appendChild(textEl);
        svg.appendChild(group);

        const textShape = new window.TextShape(group);
        window.shapes.push(textShape);
        if (typeof window.pushCreateAction === 'function') window.pushCreateAction(textShape);

        if (frame && typeof frame.addShapeToFrame === 'function') {
            frame.addShapeToFrame(textShape);
        }

        return textShape;
    } catch (err) {
        console.warn('[AIRenderer] Failed to create text label:', err);
        return null;
    }
}

/**
 * Initialize the AI renderer bridge so the React modal can trigger rendering.
 */
export function initAIRenderer() {
    window.__aiRenderer = renderAIDiagram;
}
