/* eslint-disable */

const ROTATION_SELECTOR = '[data-screen-space-rotation-anchor="true"]';

function getZoom() {
    return Math.max(0.001, Number(window.currentZoom) || 1);
}

export function registerRotationAnchor(anchor, options = {}) {
    if (!anchor) return;
    const zoom = getZoom();
    const radius = Number(options.radius) || 8;
    const gap = Number(options.gap) || 30;
    const edgeY = Number(options.edgeY);

    anchor.setAttribute('data-screen-space-rotation-anchor', 'true');
    anchor.setAttribute('data-screen-radius', String(radius));
    anchor.setAttribute('data-screen-gap', String(gap));
    anchor.setAttribute('data-applied-zoom', String(zoom));
    anchor.setAttribute('r', String(radius / zoom));
    if (Number.isFinite(edgeY)) anchor.setAttribute('cy', String(edgeY - gap / zoom));

    anchor.__rotationConnector = options.line || null;
    anchor.__rotationConnectorEnd = options.lineEnd || '2';
    syncRotationConnector(anchor);
}

function syncRotationConnector(anchor) {
    const line = anchor.__rotationConnector;
    if (!line) return;
    const end = anchor.__rotationConnectorEnd === '1' ? '1' : '2';
    line.setAttribute(`x${end}`, anchor.getAttribute('cx'));
    line.setAttribute(`y${end}`, anchor.getAttribute('cy'));
}

export function syncRotationAnchorsToZoom() {
    if (typeof document === 'undefined') return;
    const zoom = getZoom();
    document.querySelectorAll(ROTATION_SELECTOR).forEach((anchor) => {
        const previousZoom = Math.max(0.001, Number(anchor.getAttribute('data-applied-zoom')) || zoom);
        if (Math.abs(previousZoom - zoom) < 0.000001) return;
        const radius = Number(anchor.getAttribute('data-screen-radius')) || 8;
        const gap = Number(anchor.getAttribute('data-screen-gap')) || 30;
        const currentY = Number(anchor.getAttribute('cy')) || 0;
        const edgeY = currentY + gap / previousZoom;

        anchor.setAttribute('cy', String(edgeY - gap / zoom));
        anchor.setAttribute('r', String(radius / zoom));
        anchor.setAttribute('data-applied-zoom', String(zoom));
        syncRotationConnector(anchor);
    });
}

export function installScreenSpaceControlSync(svgElement) {
    if (!svgElement || typeof MutationObserver === 'undefined') return;
    window.__screenSpaceControlObserver?.disconnect?.();
    const observer = new MutationObserver(syncRotationAnchorsToZoom);
    observer.observe(svgElement, { attributes: true, attributeFilter: ['viewBox'] });
    window.__screenSpaceControlObserver = observer;
}
