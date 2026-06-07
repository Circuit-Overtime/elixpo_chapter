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

    // Phase 5 (issue #22): no wrapper frame. The graph is conceptually a
    // single rendering — axes, grid, curves all interlocked — so we don't
    // split it into per-curve shapes. Instead the graph becomes ONE
    // first-class shape on the canvas: a `graphShape` that implements the
    // shape API the engine relies on (contains / selectShape / etc.) so
    // it can be selected, dragged, attached to by arrows, picked up by
    // the rect-drag — exactly like a user-drawn shape.
    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgMarkup, 'image/svg+xml');
        const svgEl = doc.querySelector('svg');
        if (!svgEl) return false;

        const graphGroup = document.createElementNS(NS, 'g');
        graphGroup.setAttribute('data-type', 'graph-group');
        graphGroup.setAttribute('transform', `translate(${frameX + 20}, ${frameY + 20})`);

        // Copy defs (clip paths)
        const defs = svgEl.querySelector('defs');
        if (defs) {
            const defsClone = defs.cloneNode(true);
            window.svg.querySelector('defs')?.appendChild(defsClone.firstChild) ||
                window.svg.insertBefore(defsClone, window.svg.firstChild);
        }

        while (svgEl.childNodes.length > 0) {
            const child = svgEl.childNodes[0];
            if (child.nodeName === 'defs') { svgEl.removeChild(child); continue; }
            graphGroup.appendChild(child);
        }
        window.svg.appendChild(graphGroup);

        const graphShape = {
            shapeName: 'graph',                  // first-class shapeName
            shapeID: `graph-${Date.now().toString(36)}-${Math.floor(Math.random() * 10000)}`,
            group: graphGroup,
            element: graphGroup,
            x: frameX + 20,
            y: frameY + 20,
            width: GRAPH_WIDTH,
            height: GRAPH_HEIGHT,
            rotation: 0,
            isSelected: false,
            _selectionRect: null,
            _graphData: {
                equations: equations.map(eq => ({ expression: eq.expression, color: eq.color })),
                settings: { ...settings },
            },

            // ── Shape API the engine relies on ────────────────────────
            contains(px, py) {
                return px >= this.x && px <= this.x + this.width
                    && py >= this.y && py <= this.y + this.height;
            },
            move(dx, dy) {
                this.x += dx; this.y += dy;
                this.group.setAttribute('transform', `translate(${this.x}, ${this.y})`);
                this._updateSelectionRect();
            },
            selectShape() {
                this.isSelected = true;
                if (this._selectionRect) return;
                const r = document.createElementNS(NS, 'rect');
                r.setAttribute('fill', 'none');
                r.setAttribute('stroke', '#9b7bf7');
                r.setAttribute('stroke-width', '1.5');
                r.setAttribute('stroke-dasharray', '4 3');
                r.setAttribute('pointer-events', 'none');
                window.svg.appendChild(r);
                this._selectionRect = r;
                this._updateSelectionRect();
            },
            removeSelection() {
                this.isSelected = false;
                if (this._selectionRect && this._selectionRect.parentNode) {
                    this._selectionRect.parentNode.removeChild(this._selectionRect);
                }
                this._selectionRect = null;
            },
            _updateSelectionRect() {
                if (!this._selectionRect) return;
                const pad = 4;
                this._selectionRect.setAttribute('x', this.x - pad);
                this._selectionRect.setAttribute('y', this.y - pad);
                this._selectionRect.setAttribute('width', this.width + pad * 2);
                this._selectionRect.setAttribute('height', this.height + pad * 2);
            },
            updateAttachedArrows() {
                if (typeof window.updateAttachedArrows === 'function') {
                    window.updateAttachedArrows(this);
                }
            },
        };

        window.shapes.push(graphShape);
        if (window.pushCreateAction) window.pushCreateAction(graphShape);

        // Auto-select so the user sees something landed.
        window.currentShape = graphShape;
        graphShape.selectShape();
    } catch (err) {
        console.error('[GraphEngine] SVG insertion failed:', err);
        return false;
    }

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
