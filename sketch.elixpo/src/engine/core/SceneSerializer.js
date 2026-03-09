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
            const shape = new Frame(data.x, data.y, data.width, data.height, data.options || {});
            if (data.frameName) shape.setTitle(data.frameName);
            if (data.rotation) shape.rotation = data.rotation;
            if (data.shapeID) shape.shapeID = data.shapeID;
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
            const doc = parser.parseFromString(data.elementHTML, 'image/svg+xml');
            const svgIcon = doc.documentElement;
            if (!svgIcon) return null;
            const imported = svgEl.ownerDocument.importNode(svgIcon, true);
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
        if (shape.group && shape.group.parentNode) {
            shape.group.parentNode.removeChild(shape.group);
        } else if (shape.element && shape.element.parentNode) {
            shape.element.parentNode.removeChild(shape.element);
        }
    });

    window.shapes = [];
    window.currentShape = null;
    window.historyStack = [];
    window.redoStack = [];

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
        if (frame && data.containedShapeIDs) {
            data.containedShapeIDs.forEach(childID => {
                const child = idMap.get(childID);
                if (child && typeof frame.addShapeToFrame === 'function') {
                    frame.addShapeToFrame(child);
                }
            });
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
    a.download = `${workspaceName.replace(/[^a-zA-Z0-9_-]/g, '_')}.lixsketch`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============================================================
// UPLOAD: Open file picker and load .lixsketch file
// ============================================================
export function uploadScene() {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.lixsketch,.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return resolve(false);

            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    const result = loadScene(data);
                    resolve(result);
                } catch (err) {
                    console.error('[SceneSerializer] Failed to parse file:', err);
                    reject(err);
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
    };
}
