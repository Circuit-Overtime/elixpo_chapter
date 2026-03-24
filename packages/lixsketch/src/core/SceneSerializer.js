/* eslint-disable */
/**
 * SceneSerializer - Save and load .lixsketch scene files
 *
 * Format: JSON with metadata + serialized shapes array
 * File extension: .lixsketch (actually JSON)
 */

import { Rectangle } from '../shapes/Rectangle.js';
import { Circle } from '../shapes/Circle.js';
import { Line } from '../shapes/Line.js';
import { Arrow } from '../shapes/Arrow.js';
import { FreehandStroke } from '../shapes/FreehandStroke.js';
import { Frame } from '../shapes/Frame.js';
import { TextShape } from '../shapes/TextShape.js';
import { CodeShape } from '../shapes/CodeShape.js';
import { ImageShape } from '../shapes/ImageShape.js';
import { IconShape } from '../shapes/IconShape.js';

const FORMAT_VERSION = 1;

// Generate a unique session ID for each scene
let _sessionID = null;
export function getSessionID() {
    if (!_sessionID) {
        _sessionID = `lx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }
    return _sessionID;
}
export function resetSessionID() {
    _sessionID = null;
}

function cloneOptions(options) {
    return JSON.parse(JSON.stringify(options));
}

// ============================================================
// SERIALIZE a single shape to plain data
// ============================================================
function serializeShape(shape) {
    const base = {
        shapeID: shape.shapeID,
        parentFrame: shape.parentFrame ? shape.parentFrame.shapeID : null,
    };

    switch (shape.shapeName) {
        case 'rectangle':
            return {
                ...base,
                type: 'rectangle',
                x: shape.x, y: shape.y,
                width: shape.width, height: shape.height,
                rotation: shape.rotation,
                options: cloneOptions(shape.options),
            };

        case 'circle':
            return {
                ...base,
                type: 'circle',
                x: shape.x, y: shape.y,
                rx: shape.rx, ry: shape.ry,
                rotation: shape.rotation,
                options: cloneOptions(shape.options),
            };

        case 'line':
            return {
                ...base,
                type: 'line',
                startPoint: { x: shape.startPoint.x, y: shape.startPoint.y },
                endPoint: { x: shape.endPoint.x, y: shape.endPoint.y },
                controlPoint: shape.controlPoint ? { x: shape.controlPoint.x, y: shape.controlPoint.y } : null,
                isCurved: shape.isCurved || false,
                options: cloneOptions(shape.options),
            };

        case 'arrow': {
            const data = {
                ...base,
                type: 'arrow',
                startPoint: { x: shape.startPoint.x, y: shape.startPoint.y },
                endPoint: { x: shape.endPoint.x, y: shape.endPoint.y },
                options: cloneOptions(shape.options),
                arrowOutlineStyle: shape.arrowOutlineStyle,
                arrowHeadStyle: shape.arrowHeadStyle,
                arrowCurved: shape.arrowCurved,
                arrowCurveAmount: shape.arrowCurveAmount,
            };
            if (shape.controlPoint1) data.controlPoint1 = { x: shape.controlPoint1.x, y: shape.controlPoint1.y };
            if (shape.controlPoint2) data.controlPoint2 = { x: shape.controlPoint2.x, y: shape.controlPoint2.y };
            // Serialize attachments by shapeID
            if (shape.startAttachment) data.startAttachmentID = shape.startAttachment.shapeID;
            if (shape.endAttachment) data.endAttachmentID = shape.endAttachment.shapeID;
            return data;
        }

        case 'freehandStroke':
            return {
                ...base,
                type: 'freehandStroke',
                points: JSON.parse(JSON.stringify(shape.points)),
                rotation: shape.rotation,
                options: cloneOptions(shape.options),
            };

        case 'frame':
            return {
                ...base,
                type: 'frame',
                x: shape.x, y: shape.y,
                width: shape.width, height: shape.height,
                rotation: shape.rotation,
                frameName: shape.frameName,
                fillStyle: shape.fillStyle || 'transparent',
                fillColor: shape.fillColor || '#1e1e28',
                gridSize: shape.gridSize || 20,
                gridColor: shape.gridColor || 'rgba(255,255,255,0.06)',
                options: cloneOptions(shape.options),
                containedShapeIDs: shape.containedShapes
                    ? Array.from(shape.containedShapes).map(s => s.shapeID)
                    : [],
            };

        case 'text': {
            const group = shape.group;
            return {
                ...base,
                type: 'text',
                x: shape.x, y: shape.y,
                rotation: shape.rotation,
                groupHTML: group.cloneNode(true).outerHTML,
            };
        }

        case 'code': {
            const group = shape.group;
            return {
                ...base,
                type: 'code',
                x: shape.x, y: shape.y,
                rotation: shape.rotation,
                groupHTML: group.cloneNode(true).outerHTML,
            };
        }

        case 'image': {
            const el = shape.element;
            return {
                ...base,
                type: 'image',
                x: shape.x, y: shape.y,
                width: shape.width, height: shape.height,
                rotation: shape.rotation,
                href: el.getAttribute('href') || el.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || '',
            };
        }

        case 'icon': {
            const el = shape.element;
            return {
                ...base,
                type: 'icon',
                x: shape.x, y: shape.y,
                width: shape.width, height: shape.height,
                rotation: shape.rotation,
                elementHTML: el.cloneNode(true).outerHTML,
                viewboxWidth: parseFloat(el.getAttribute('data-viewbox-width')) || 24,
                viewboxHeight: parseFloat(el.getAttribute('data-viewbox-height')) || 24,
            };
        }

        default:
            console.warn('[SceneSerializer] Unknown shape type:', shape.shapeName);
            return null;
    }
}

// ============================================================
// DESERIALIZE: Create a shape from saved data
// ============================================================
function deserializeShape(data) {
    const svgEl = window.svg;
    if (!svgEl) return null;
    const ns = 'http://www.w3.org/2000/svg';

    switch (data.type) {
        case 'rectangle': {
            const shape = new Rectangle(data.x, data.y, data.width, data.height, data.options || {});
            if (data.rotation) shape.rotation = data.rotation;
            if (data.shapeID) shape.shapeID = data.shapeID;
            return shape;
        }

        case 'circle': {
            const shape = new Circle(data.x, data.y, data.rx, data.ry, data.options || {});
            if (data.rotation) shape.rotation = data.rotation;
            if (data.shapeID) shape.shapeID = data.shapeID;
            return shape;
        }

        case 'line': {
            const shape = new Line(data.startPoint, data.endPoint, data.options || {});
            if (data.controlPoint) shape.controlPoint = data.controlPoint;
            if (data.isCurved) shape.isCurved = data.isCurved;
            if (data.shapeID) shape.shapeID = data.shapeID;
            return shape;
        }

        case 'arrow': {
            const shape = new Arrow(data.startPoint, data.endPoint, data.options || {});
            if (data.controlPoint1) shape.controlPoint1 = data.controlPoint1;
            if (data.controlPoint2) shape.controlPoint2 = data.controlPoint2;
            if (data.arrowOutlineStyle) shape.arrowOutlineStyle = data.arrowOutlineStyle;
            if (data.arrowHeadStyle) shape.arrowHeadStyle = data.arrowHeadStyle;
            if (data.arrowCurved) shape.arrowCurved = data.arrowCurved;
            if (data.arrowCurveAmount) shape.arrowCurveAmount = data.arrowCurveAmount;
            if (data.shapeID) shape.shapeID = data.shapeID;
            return shape;
        }

        case 'freehandStroke': {
            const shape = new FreehandStroke(data.points, data.options || {});
            if (data.rotation) shape.rotation = data.rotation;
            if (data.shapeID) shape.shapeID = data.shapeID;
            return shape;
        }

        case 'frame': {
            const frameOpts = { ...(data.options || {}), frameName: data.frameName || 'Frame' };
            if (data.fillStyle) frameOpts.fillStyle = data.fillStyle;
            if (data.fillColor) frameOpts.fillColor = data.fillColor;
            if (data.gridSize) frameOpts.gridSize = data.gridSize;
            if (data.gridColor) frameOpts.gridColor = data.gridColor;
            const shape = new Frame(data.x, data.y, data.width, data.height, frameOpts);
            if (data.rotation) shape.rotation = data.rotation;
            if (data.shapeID) shape.shapeID = data.shapeID;
            shape.draw();
            return shape;
        }

        case 'text': {
            if (!data.groupHTML) return null;
            const parser = new DOMParser();
            const doc = parser.parseFromString(`<svg xmlns="${ns}">${data.groupHTML}</svg>`, 'image/svg+xml');
            const group = doc.querySelector('g');
            if (!group) return null;
            const imported = svgEl.ownerDocument.importNode(group, true);
            svgEl.appendChild(imported);
            const shape = new TextShape(imported);
            if (data.shapeID) shape.shapeID = data.shapeID;
            return shape;
        }

        case 'code': {
            if (!data.groupHTML) return null;
            const parser = new DOMParser();
            const doc = parser.parseFromString(`<svg xmlns="${ns}">${data.groupHTML}</svg>`, 'image/svg+xml');
            const group = doc.querySelector('g');
            if (!group) return null;
            const imported = svgEl.ownerDocument.importNode(group, true);
            svgEl.appendChild(imported);
            const shape = new CodeShape(imported);
            if (data.shapeID) shape.shapeID = data.shapeID;
            return shape;
        }

        case 'image': {
            const imgEl = document.createElementNS(ns, 'image');
            imgEl.setAttribute('x', data.x);
            imgEl.setAttribute('y', data.y);
            imgEl.setAttribute('width', data.width);
            imgEl.setAttribute('height', data.height);
            imgEl.setAttribute('href', data.href);
            imgEl.setAttribute('preserveAspectRatio', 'none');
            svgEl.appendChild(imgEl);
            const shape = new ImageShape(imgEl);
            if (data.rotation) shape.rotation = data.rotation;
            if (data.shapeID) shape.shapeID = data.shapeID;
            return shape;
        }

        case 'icon': {
            if (!data.elementHTML) return null;
            const parser = new DOMParser();
            // Wrap in <svg> so the parser treats the <g> as a valid child, not a document root
            const doc = parser.parseFromString(`<svg xmlns="${ns}">${data.elementHTML}</svg>`, 'image/svg+xml');
            const iconGroup = doc.querySelector('g');
            if (!iconGroup) return null;
            const imported = svgEl.ownerDocument.importNode(iconGroup, true);
            svgEl.appendChild(imported);
            const shape = new IconShape(imported);
            if (data.shapeID) shape.shapeID = data.shapeID;
            return shape;
        }

        default:
            console.warn('[SceneSerializer] Unknown type:', data.type);
            return null;
    }
}

// ============================================================
// SAVE: Serialize entire scene to .lixsketch JSON
// ============================================================
export function saveScene(workspaceName = 'Untitled') {
    const allShapes = window.shapes || [];
    const serialized = [];

    for (const shape of allShapes) {
        const data = serializeShape(shape);
        if (data) serialized.push(data);
    }

    const scene = {
        format: 'lixsketch',
        version: FORMAT_VERSION,
        sessionID: getSessionID(),
        name: workspaceName,
        createdAt: new Date().toISOString(),
        viewport: window.currentViewBox ? { ...window.currentViewBox } : null,
        zoom: window.currentZoom || 1,
        shapes: serialized,
    };

    return scene;
}

// ============================================================
// LOAD: Deserialize .lixsketch JSON and recreate scene
// ============================================================
export function loadScene(sceneData) {
    if (!sceneData || sceneData.format !== 'lixsketch') {
        console.error('[SceneSerializer] Invalid scene format');
        return false;
    }

    // Clear current scene
    const svgEl = window.svg;
    if (!svgEl) return false;

    // Remove all existing shape DOM elements
    const existingShapes = window.shapes || [];
    existingShapes.forEach(shape => {
        // For frames, clean up clipGroup and clipPath too
        if (shape.shapeName === 'frame') {
            if (shape.clipGroup && shape.clipGroup.parentNode) {
                shape.clipGroup.parentNode.removeChild(shape.clipGroup);
            }
            if (shape.clipPath && shape.clipPath.parentNode) {
                shape.clipPath.parentNode.removeChild(shape.clipPath);
            }
        }
        if (shape.group && shape.group.parentNode) {
            shape.group.parentNode.removeChild(shape.group);
        } else if (shape.element && shape.element.parentNode) {
            shape.element.parentNode.removeChild(shape.element);
        }
    });

    // Clear arrays IN PLACE — tool modules hold direct references to these
    // arrays from import-time, so replacing them breaks interactivity.
    if (window.shapes) window.shapes.length = 0; else window.shapes = [];
    window.currentShape = null;
    if (window.historyStack) window.historyStack.length = 0; else window.historyStack = [];
    if (window.redoStack) window.redoStack.length = 0; else window.redoStack = [];

    // Build ID -> shape map for frame containment and arrow attachments
    const idMap = new Map();

    // First pass: create all shapes (frames first to allow containment)
    const frameData = sceneData.shapes.filter(s => s.type === 'frame');
    const otherData = sceneData.shapes.filter(s => s.type !== 'frame');

    // Create frames first
    for (const data of frameData) {
        const shape = deserializeShape(data);
        if (shape) {
            window.shapes.push(shape);
            if (data.shapeID) idMap.set(data.shapeID, shape);
        }
    }

    // Create all other shapes
    for (const data of otherData) {
        const shape = deserializeShape(data);
        if (shape) {
            window.shapes.push(shape);
            if (data.shapeID) idMap.set(data.shapeID, shape);
        }
    }

    // Second pass: restore frame containment
    for (const data of frameData) {
        const frame = idMap.get(data.shapeID);
        if (frame && data.containedShapeIDs && data.containedShapeIDs.length > 0) {
            for (const childID of data.containedShapeIDs) {
                const child = idMap.get(childID);
                if (!child) {
                    console.warn(`[SceneSerializer] Frame "${data.frameName}" references missing shape: ${childID}`);
                    continue;
                }
                try {
                    if (typeof frame.addShapeToFrame === 'function') {
                        frame.addShapeToFrame(child);
                    } else {
                        // Fallback: manually set containment
                        frame.containedShapes.push(child);
                        child.parentFrame = frame;
                    }
                } catch (err) {
                    console.warn(`[SceneSerializer] Failed to restore containment for ${childID} in frame ${data.shapeID}:`, err);
                    // Fallback: at least set the reference
                    if (!frame.containedShapes.includes(child)) {
                        frame.containedShapes.push(child);
                    }
                    child.parentFrame = frame;
                }
            }
        }
    }

    // Third pass: restore arrow attachments
    for (const data of sceneData.shapes) {
        if (data.type === 'arrow') {
            const arrow = idMap.get(data.shapeID);
            if (!arrow) continue;
            if (data.startAttachmentID) {
                const target = idMap.get(data.startAttachmentID);
                if (target && arrow.setStartAttachment) arrow.setStartAttachment(target);
            }
            if (data.endAttachmentID) {
                const target = idMap.get(data.endAttachmentID);
                if (target && arrow.setEndAttachment) arrow.setEndAttachment(target);
            }
        }
    }

    // Restore viewport
    if (sceneData.viewport && svgEl) {
        const vb = sceneData.viewport;
        window.currentViewBox = { ...vb };
        svgEl.setAttribute('viewBox', `${vb.x} ${vb.y} ${vb.width} ${vb.height}`);
    }
    if (sceneData.zoom) {
        window.currentZoom = sceneData.zoom;
    }

    console.log(`[SceneSerializer] Loaded ${window.shapes.length} shapes from "${sceneData.name}"`);

    // Re-sync tool flags so shapes are interactable after restore
    if (window.__sketchEngine && typeof window.__sketchEngine.setActiveTool === 'function') {
        const store = window.__sketchStoreApi;
        const currentTool = store ? store.getState().activeTool : 'select';
        window.__sketchEngine.setActiveTool(currentTool);
    } else {
        // Fallback: ensure selection tool is active
        window.isSelectionToolActive = true;
    }

    return true;
}

// ============================================================
// DOWNLOAD: Trigger browser download of .lixsketch file
// ============================================================
export function downloadScene(workspaceName = 'Untitled') {
    const scene = saveScene(workspaceName);
    const json = JSON.stringify(scene, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${workspaceName.replace(/[^a-zA-Z0-9_-]/g, '_')}.lixjson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============================================================
// UPLOAD: Open file picker and load .lixsketch file
// ============================================================
// Validate scene JSON structure before loading
export function validateScene(data) {
    if (!data || typeof data !== 'object') return { valid: false, error: 'Not a valid JSON object' };
    if (data.format !== 'lixsketch') return { valid: false, error: 'Not a LixSketch scene file (missing format field)' };
    if (!data.version || data.version > FORMAT_VERSION) return { valid: false, error: `Unsupported version: ${data.version}` };
    if (!Array.isArray(data.shapes)) return { valid: false, error: 'Invalid scene: missing shapes array' };
    return {
        valid: true,
        name: data.name || 'Untitled',
        shapeCount: data.shapes.length,
        sessionID: data.sessionID || null,
        createdAt: data.createdAt || null,
    };
}

export function uploadScene() {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.lixjson,.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return resolve(false);

            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    const validation = validateScene(data);
                    if (!validation.valid) {
                        console.error('[SceneSerializer] Invalid file:', validation.error);
                        resolve({ success: false, error: validation.error });
                        return;
                    }
                    resetSessionID(); // New session for loaded scene
                    const result = loadScene(data);
                    resolve({ success: result, validation });
                } catch (err) {
                    console.error('[SceneSerializer] Failed to parse file:', err);
                    resolve({ success: false, error: 'Failed to parse JSON file' });
                }
            };
            reader.readAsText(file);
        };
        input.click();
    });
}

// ============================================================
// EXPORT as PNG
// ============================================================
export function exportAsPNG() {
    const svgEl = window.svg;
    if (!svgEl) return;

    const clone = svgEl.cloneNode(true);
    // Remove selection UI elements
    const selectionEls = clone.querySelectorAll('[data-selection], .selection-handle, .resize-handle, .rotation-handle');
    selectionEls.forEach(el => el.remove());

    const svgData = new XMLSerializer().serializeToString(clone);
    const canvas = document.createElement('canvas');
    const vb = svgEl.viewBox.baseVal;
    canvas.width = vb.width * 2; // 2x for retina
    canvas.height = vb.height * 2;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
        // Draw dark background
        ctx.fillStyle = '#121212';
        ctx.fillRect(0, 0, vb.width, vb.height);
        ctx.drawImage(img, 0, 0, vb.width, vb.height);
        URL.revokeObjectURL(url);

        canvas.toBlob(blob => {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'lixsketch-export.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }, 'image/png');
    };
    img.src = url;
}

// ============================================================
// COPY to clipboard as PNG
// ============================================================
export function copyAsPNG() {
    const svgEl = window.svg;
    if (!svgEl) return;

    const clone = svgEl.cloneNode(true);
    const selectionEls = clone.querySelectorAll('[data-selection], .selection-handle, .resize-handle, .rotation-handle');
    selectionEls.forEach(el => el.remove());

    const svgData = new XMLSerializer().serializeToString(clone);
    const canvas = document.createElement('canvas');
    const vb = svgEl.viewBox.baseVal;
    canvas.width = vb.width * 2;
    canvas.height = vb.height * 2;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
        ctx.fillStyle = '#121212';
        ctx.fillRect(0, 0, vb.width, vb.height);
        ctx.drawImage(img, 0, 0, vb.width, vb.height);
        URL.revokeObjectURL(url);

        canvas.toBlob(blob => {
            if (!blob) return;
            navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
            ]).catch(err => console.warn('[SceneSerializer] Clipboard write failed:', err));
        }, 'image/png');
    };
    img.src = url;
}

// ============================================================
// COPY to clipboard as SVG
// ============================================================
export function copyAsSVG() {
    const svgEl = window.svg;
    if (!svgEl) return;

    const clone = svgEl.cloneNode(true);
    const selectionEls = clone.querySelectorAll('[data-selection], .selection-handle, .resize-handle, .rotation-handle');
    selectionEls.forEach(el => el.remove());

    const svgData = new XMLSerializer().serializeToString(clone);
    navigator.clipboard.writeText(svgData)
        .catch(err => console.warn('[SceneSerializer] Clipboard write failed:', err));
}

// ============================================================
// EXPORT as PDF (uses browser print)
// ============================================================
export function exportAsPDF() {
    const svgEl = window.svg;
    if (!svgEl) return;

    const clone = svgEl.cloneNode(true);
    const selectionEls = clone.querySelectorAll('[data-selection], .selection-handle, .resize-handle, .rotation-handle');
    selectionEls.forEach(el => el.remove());

    const svgData = new XMLSerializer().serializeToString(clone);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head><title>LixSketch Export</title>
        <style>
            body { margin: 0; background: #121212; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
            svg { max-width: 100vw; max-height: 100vh; }
            @media print { body { background: white; } }
        </style>
        </head>
        <body>${svgData}</body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
}

// ============================================================
// RESET: Clear the entire canvas
// ============================================================
export function resetCanvas() {
    const svgEl = window.svg;
    if (!svgEl) return;

    // Remove all shape DOM elements + frame clipGroups/clipPaths
    const existingShapes = window.shapes || [];
    existingShapes.forEach(shape => {
        if (shape.shapeName === 'frame') {
            if (shape.clipGroup && shape.clipGroup.parentNode) {
                shape.clipGroup.parentNode.removeChild(shape.clipGroup);
            }
            if (shape.clipPath && shape.clipPath.parentNode) {
                shape.clipPath.parentNode.removeChild(shape.clipPath);
            }
        }
        if (shape.group && shape.group.parentNode) {
            shape.group.parentNode.removeChild(shape.group);
        } else if (shape.element && shape.element.parentNode) {
            shape.element.parentNode.removeChild(shape.element);
        }
    });

    // Remove selection UI
    svgEl.querySelectorAll(
        '.selection-outline, .resize-anchor, .rotation-anchor, [data-selection]'
    ).forEach(el => el.remove());

    // Clear arrays IN PLACE (same reason as loadScene)
    if (window.shapes) window.shapes.length = 0; else window.shapes = [];
    window.currentShape = null;
    if (window.historyStack) window.historyStack.length = 0; else window.historyStack = [];
    if (window.redoStack) window.redoStack.length = 0; else window.redoStack = [];

    if (typeof window.clearAllSelections === 'function') {
        window.clearAllSelections();
    }
    if (typeof window.disableAllSideBars === 'function') {
        window.disableAllSideBars();
    }

    // Clear auto-save (both legacy and session-scoped keys)
    try {
        localStorage.removeItem('lixsketch-autosave');
        localStorage.removeItem('lixsketch-autosave-meta');
        const sid = window.__sessionID;
        if (sid) {
            localStorage.removeItem(`lixsketch-autosave-${sid}`);
            localStorage.removeItem(`lixsketch-autosave-meta-${sid}`);
        }
    } catch (_) {}

    console.log('[SceneSerializer] Canvas reset');
}

// ============================================================
// FIND: Search for text content on the canvas
// ============================================================
export function findTextOnCanvas(query) {
    const allShapes = window.shapes || [];
    if (!query || query.trim() === '') return [];

    const lowerQuery = query.toLowerCase();
    const results = [];

    for (const shape of allShapes) {
        let textContent = '';

        if (shape.shapeName === 'text' || shape.shapeName === 'code') {
            const group = shape.group;
            if (group) {
                // Get all text content from SVG text/tspan elements
                const textEls = group.querySelectorAll('text, tspan');
                textEls.forEach(el => {
                    if (el.textContent) textContent += el.textContent + ' ';
                });
                // Also check foreignObject content
                const foreignEls = group.querySelectorAll('foreignObject *');
                foreignEls.forEach(el => {
                    if (el.textContent) textContent += el.textContent + ' ';
                });
            }
        } else if (shape.shapeName === 'frame') {
            textContent = shape.frameName || '';
        }

        textContent = textContent.trim();
        if (textContent && textContent.toLowerCase().includes(lowerQuery)) {
            results.push({
                shape,
                text: textContent,
                type: shape.shapeName,
                x: shape.x || 0,
                y: shape.y || 0,
            });
        }
    }

    return results;
}

// ============================================================
// Initialize bridge for React components
// ============================================================
export function initSceneSerializer() {
    window.__sceneSerializer = {
        save: saveScene,
        load: loadScene,
        download: downloadScene,
        upload: uploadScene,
        exportPNG: exportAsPNG,
        exportPDF: exportAsPDF,
        copyAsPNG,
        copyAsSVG,
        resetCanvas,
        findText: findTextOnCanvas,
    };
}
