/* eslint-disable */
/**
 * GraphEngine - Bridge between graph rendering and the sketch canvas.
 * Creates Frames containing rendered graph SVG elements.
 */

import { parseExpression, isValidExpression } from './GraphMathParser.js';
import { renderGraphSVG, renderGraphPreviewSVG, GRAPH_COLORS } from './GraphRenderer.js';

const NS = 'http://www.w3.org/2000/svg';
const GRAPH_WIDTH = 600;
const GRAPH_HEIGHT = 420;

/**
 * Place a graph on the canvas inside a Frame.
 */
function renderGraphOnCanvas(equations, settings) {
    if (!equations || equations.length === 0) return false;
    if (!window.svg || !window.Frame) {
        console.error('[GraphEngine] Engine not initialized');
        return false;
    }

    // Generate full-size SVG
    const svgMarkup = renderGraphSVG(equations, {
        ...settings,
        width: GRAPH_WIDTH,
        height: GRAPH_HEIGHT,
    });
    if (!svgMarkup) return false;

    // Viewport center
    const vb = window.currentViewBox || { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
    const vcx = vb.x + vb.width / 2;
    const vcy = vb.y + vb.height / 2;

    const frameW = GRAPH_WIDTH + 40;
    const frameH = GRAPH_HEIGHT + 40;
    const frameX = vcx - frameW / 2;
    const frameY = vcy - frameH / 2;

    // Build title from equations
    const eqLabels = equations
        .filter(eq => eq.expression && eq.expression.trim())
        .map(eq => eq.expression.trim())
        .slice(0, 3);
    const title = eqLabels.length > 0
        ? 'Graph: ' + eqLabels.join(', ')
        : 'Graph';

    // Create frame
    let frame;
    try {
        frame = new window.Frame(frameX, frameY, frameW, frameH, {
            stroke: '#4A90D9', strokeWidth: 2, fill: 'transparent', opacity: 1,
            frameName: title,
        });
        // Store graph data for re-editing
        frame._graphData = {
            equations: equations.map(eq => ({ expression: eq.expression, color: eq.color })),
            settings: { ...settings },
        };
        frame._frameType = 'graph';

        window.shapes.push(frame);
        if (window.pushCreateAction) window.pushCreateAction(frame);
    } catch (err) {
        console.error('[GraphEngine] Frame creation failed:', err);
        return false;
    }

    // Parse SVG markup and insert elements into the frame
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgMarkup, 'image/svg+xml');
        const svgEl = doc.querySelector('svg');
        if (!svgEl) return false;

        // Create a group to hold all graph elements
        const graphGroup = document.createElementNS(NS, 'g');
        graphGroup.setAttribute('data-type', 'graph-group');
        graphGroup.setAttribute('transform', `translate(${frameX + 20}, ${frameY + 20})`);
        graphGroup.style.pointerEvents = 'none';

        // Copy defs (clip paths)
        const defs = svgEl.querySelector('defs');
        if (defs) {
            const defsClone = defs.cloneNode(true);
            window.svg.querySelector('defs')?.appendChild(defsClone.firstChild) ||
                window.svg.insertBefore(defsClone, window.svg.firstChild);
        }

        // Copy all child elements
        while (svgEl.childNodes.length > 0) {
            const child = svgEl.childNodes[0];
            if (child.nodeName === 'defs') {
                svgEl.removeChild(child);
                continue;
            }
            graphGroup.appendChild(child);
        }

        window.svg.appendChild(graphGroup);

        // Wrap as a simple shape-like object for the frame
        const graphShape = {
            shapeName: 'graphContent',
            group: graphGroup,
            element: graphGroup,
            x: frameX + 20,
            y: frameY + 20,
            width: GRAPH_WIDTH,
            height: GRAPH_HEIGHT,
            move(dx, dy) {
                this.x += dx;
                this.y += dy;
                this.group.setAttribute('transform', `translate(${this.x}, ${this.y})`);
            },
            updateAttachedArrows() {},
        };

        window.shapes.push(graphShape);
        if (frame.addShapeToFrame) frame.addShapeToFrame(graphShape);
    } catch (err) {
        console.error('[GraphEngine] SVG insertion failed:', err);
    }

    // Select the frame
    window.currentShape = frame;
    if (frame.selectFrame) frame.selectFrame();
    if (window.__sketchStoreApi) window.__sketchStoreApi.setSelectedShapeSidebar('frame');

    return true;
}

/**
 * Initialize the graph engine — expose bridge functions on window.
 */
export function initGraphEngine() {
    window.__graphPreview = (equations, settings) => {
        return renderGraphPreviewSVG(equations, settings);
    };
    window.__graphRenderer = renderGraphOnCanvas;
    window.__graphParser = (expr) => {
        const fn = parseExpression(expr);
        return fn ? true : false;
    };
    window.__graphValidate = isValidExpression;
    window.__graphColors = GRAPH_COLORS;
}
