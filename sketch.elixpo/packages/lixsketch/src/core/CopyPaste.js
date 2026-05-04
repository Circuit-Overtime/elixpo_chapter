/* eslint-disable */
// Centralized Copy/Paste system for ALL shape types
// Supports single and multi-selection copy/paste
// Pastes at mouse pointer position with offset to prevent stacking

import { pushCreateAction } from './UndoRedo.js';
import { Rectangle } from '../shapes/Rectangle.js';
import { Circle } from '../shapes/Circle.js';
import { Line } from '../shapes/Line.js';
import { Arrow } from '../shapes/Arrow.js';
import { FreehandStroke } from '../shapes/FreehandStroke.js';
import { Frame } from '../shapes/Frame.js';
import { TextShape } from '../shapes/TextShape.js';
import { CodeShape } from '../shapes/CodeShape.js';
import { ImageShape } from '../shapes/ImageShape.js';
import { isAllowedImage, isAllowedImageDataUrl } from '../utils/allowedImageTypes.js';
import { compressImage } from '../utils/imageCompressor.js';
import { IconShape } from '../shapes/IconShape.js';

// Clipboard storage
let clipboard = null; // { shapes: [...clonedData], centerX, centerY }
let pasteCount = 0;   // Increments per paste to offset repeated pastes

// Last known mouse position in SVG coordinates
let lastMouseSVG = { x: 0, y: 0 };

function getSVGElement() {
    return document.getElementById('freehand-canvas');
}

function getSVGCoordsFromMouse(e) {
    const svgEl = getSVGElement();
    if (!svgEl) return { x: 0, y: 0 };
    const viewBox = svgEl.viewBox.baseVal;
    const rect = svgEl.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const svgX = viewBox.x + (mouseX / rect.width) * viewBox.width;
    const svgY = viewBox.y + (mouseY / rect.height) * viewBox.height;
    return { x: svgX, y: svgY };
}

function cloneOptions(options) {
    return JSON.parse(JSON.stringify(options));
}

// ============================================================
// SERIALIZE: Extract copyable data from a shape
// ============================================================
function serializeShape(shape) {
    switch (shape.shapeName) {
        case 'rectangle':
            return {
                type: 'rectangle',
                x: shape.x,
                y: shape.y,
                width: shape.width,
                height: shape.height,
                rotation: shape.rotation,
                options: cloneOptions(shape.options)
            };

        case 'circle':
            return {
                type: 'circle',
                x: shape.x,
                y: shape.y,
                rx: shape.rx,
                ry: shape.ry,
                rotation: shape.rotation,
                options: cloneOptions(shape.options)
            };

        case 'line':
            return {
                type: 'line',
                startPoint: { x: shape.startPoint.x, y: shape.startPoint.y },
                endPoint: { x: shape.endPoint.x, y: shape.endPoint.y },
                controlPoint: shape.controlPoint ? { x: shape.controlPoint.x, y: shape.controlPoint.y } : null,
                isCurved: shape.isCurved || false,
                options: cloneOptions(shape.options)
            };

        case 'arrow':
            return {
                type: 'arrow',
                startPoint: { x: shape.startPoint.x, y: shape.startPoint.y },
                endPoint: { x: shape.endPoint.x, y: shape.endPoint.y },
                controlPoint1: shape.controlPoint1 ? { x: shape.controlPoint1.x, y: shape.controlPoint1.y } : null,
                controlPoint2: shape.controlPoint2 ? { x: shape.controlPoint2.x, y: shape.controlPoint2.y } : null,
                options: cloneOptions(shape.options),
                arrowOutlineStyle: shape.arrowOutlineStyle,
                arrowHeadStyle: shape.arrowHeadStyle,
                arrowCurved: shape.arrowCurved,
                arrowCurveAmount: shape.arrowCurveAmount
            };

        case 'freehandStroke':
            return {
                type: 'freehandStroke',
                points: JSON.parse(JSON.stringify(shape.points)),
                rotation: shape.rotation,
                options: cloneOptions(shape.options)
            };

        case 'frame':
            return {
                type: 'frame',
                x: shape.x,
                y: shape.y,
                width: shape.width,
                height: shape.height,
                rotation: shape.rotation,
                frameName: shape.frameName,
                options: cloneOptions(shape.options)
            };

        case 'text': {
            const group = shape.group;
            const textEl = group.querySelector('text');
            return {
                type: 'text',
                x: shape.x,
                y: shape.y,
                rotation: shape.rotation,
                groupHTML: group.cloneNode(true).outerHTML
            };
        }

        case 'code': {
            const group = shape.group;
            return {
                type: 'code',
                x: shape.x,
                y: shape.y,
                rotation: shape.rotation,
                groupHTML: group.cloneNode(true).outerHTML
            };
        }

        case 'image': {
            const el = shape.element;
            return {
                type: 'image',
                x: shape.x,
                y: shape.y,
                width: shape.width,
                height: shape.height,
                rotation: shape.rotation,
                href: el.getAttribute('href') || el.getAttributeNS('http://www.w3.org/1999/xlink', 'href') || ''
            };
        }

        case 'icon': {
            const el = shape.element;
            return {
                type: 'icon',
                x: shape.x,
                y: shape.y,
                width: shape.width,
                height: shape.height,
                rotation: shape.rotation,
                elementHTML: el.cloneNode(true).outerHTML,
                viewboxWidth: parseFloat(el.getAttribute('data-viewbox-width')) || 24,
                viewboxHeight: parseFloat(el.getAttribute('data-viewbox-height')) || 24
            };
        }

        default:
            console.warn('Copy not supported for shape type:', shape.shapeName);
            return null;
    }
}

// ============================================================
// Get bounding center of a serialized shape
// ============================================================
function getShapeCenter(data) {
    switch (data.type) {
        case 'rectangle':
        case 'frame':
            return { x: data.x + data.width / 2, y: data.y + data.height / 2 };
        case 'circle':
            return { x: data.x, y: data.y };
        case 'line':
            return {
                x: (data.startPoint.x + data.endPoint.x) / 2,
                y: (data.startPoint.y + data.endPoint.y) / 2
            };
        case 'arrow':
            return {
                x: (data.startPoint.x + data.endPoint.x) / 2,
                y: (data.startPoint.y + data.endPoint.y) / 2
            };
        case 'freehandStroke': {
            if (!data.points.length) return { x: 0, y: 0 };
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            data.points.forEach(p => {
                if (p[0] < minX) minX = p[0];
                if (p[1] < minY) minY = p[1];
                if (p[0] > maxX) maxX = p[0];
                if (p[1] > maxY) maxY = p[1];
            });
            return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
        }
        case 'text':
        case 'code':
            return { x: data.x, y: data.y };
        case 'image':
        case 'icon':
            return { x: data.x + data.width / 2, y: data.y + data.height / 2 };
        default:
            return { x: 0, y: 0 };
    }
}

// ============================================================
// DESERIALIZE: Create a new shape from copied data at offset
// ============================================================
function createShapeFromData(data, offsetX, offsetY) {
    const svgEl = getSVGElement();
    if (!svgEl) return null;

    switch (data.type) {
        case 'rectangle': {
            const newRect = new Rectangle(
                data.x + offsetX,
                data.y + offsetY,
                data.width,
                data.height,
                cloneOptions(data.options)
            );
            newRect.rotation = data.rotation;
            newRect.draw();
            return newRect;
        }

        case 'circle': {
            const newCircle = new Circle(
                data.x + offsetX,
                data.y + offsetY,
                data.rx,
                data.ry,
                cloneOptions(data.options)
            );
            newCircle.rotation = data.rotation;
            newCircle.draw();
            return newCircle;
        }

        case 'line': {
            const newLine = new Line(
                { x: data.startPoint.x + offsetX, y: data.startPoint.y + offsetY },
                { x: data.endPoint.x + offsetX, y: data.endPoint.y + offsetY },
                cloneOptions(data.options)
            );
            if (data.isCurved && data.controlPoint) {
                newLine.isCurved = true;
                newLine.controlPoint = { x: data.controlPoint.x + offsetX, y: data.controlPoint.y + offsetY };
            }
            newLine.draw();
            return newLine;
        }

        case 'arrow': {
            const opts = {
                ...cloneOptions(data.options),
                arrowOutlineStyle: data.arrowOutlineStyle,
                arrowHeadStyle: data.arrowHeadStyle,
                arrowCurved: data.arrowCurved,
                arrowCurveAmount: data.arrowCurveAmount,
                controlPoint1: data.controlPoint1 ? { x: data.controlPoint1.x + offsetX, y: data.controlPoint1.y + offsetY } : null,
                controlPoint2: data.controlPoint2 ? { x: data.controlPoint2.x + offsetX, y: data.controlPoint2.y + offsetY } : null
            };
            const newArrow = new Arrow(
                { x: data.startPoint.x + offsetX, y: data.startPoint.y + offsetY },
                { x: data.endPoint.x + offsetX, y: data.endPoint.y + offsetY },
                opts
            );
            return newArrow;
        }

        case 'freehandStroke': {
            const offsetPoints = data.points.map(p => [
                p[0] + offsetX,
                p[1] + offsetY,
                p[2] || 0.5
            ]);
            const newStroke = new FreehandStroke(offsetPoints, cloneOptions(data.options));
            newStroke.rotation = data.rotation;
            newStroke.draw();
            return newStroke;
        }

        case 'frame': {
            const newFrame = new Frame(
                data.x + offsetX,
                data.y + offsetY,
                data.width,
                data.height,
                { ...cloneOptions(data.options), frameName: data.frameName, rotation: data.rotation }
            );
            newFrame.rotation = data.rotation;
            return newFrame;
        }

        case 'text': {
            // Parse the cloned HTML and insert into SVG
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = data.groupHTML;
            const clonedGroup = tempDiv.firstElementChild;
            if (!clonedGroup) return null;

            // Generate new unique ID
            const newID = `text-${String(Date.now()).slice(0, 8)}-${Math.floor(Math.random() * 10000)}`;
            clonedGroup.setAttribute('id', newID);
            const textChild = clonedGroup.querySelector('text');
            if (textChild) textChild.setAttribute('id', `${newID}-text`);

            // Update position
            const newX = data.x + offsetX;
            const newY = data.y + offsetY;
            const rotation = data.rotation || 0;
            if (textChild && rotation) {
                try {
                    const bbox = { x: 0, y: 0, width: 100, height: 30 }; // approximate until appended
                    clonedGroup.setAttribute('transform', `translate(${newX}, ${newY}) rotate(${rotation}, ${bbox.width / 2}, ${bbox.height / 2})`);
                } catch (e) {
                    clonedGroup.setAttribute('transform', `translate(${newX}, ${newY})`);
                }
            } else {
                clonedGroup.setAttribute('transform', `translate(${newX}, ${newY})`);
            }
            clonedGroup.setAttribute('data-x', newX);
            clonedGroup.setAttribute('data-y', newY);

            svgEl.appendChild(clonedGroup);

            const textShape = new TextShape(clonedGroup);
            return textShape;
        }

        case 'code': {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = data.groupHTML;
            const clonedGroup = tempDiv.firstElementChild;
            if (!clonedGroup) return null;

            const newID = `code-${String(Date.now()).slice(0, 8)}-${Math.floor(Math.random() * 10000)}`;
            clonedGroup.setAttribute('id', newID);
            const codeChild = clonedGroup.querySelector('text');
            if (codeChild) codeChild.setAttribute('id', `${newID}-code`);

            const newX = data.x + offsetX;
            const newY = data.y + offsetY;
            const rotation = data.rotation || 0;
            if (rotation) {
                clonedGroup.setAttribute('transform', `translate(${newX}, ${newY}) rotate(${rotation}, 0, 0)`);
            } else {
                clonedGroup.setAttribute('transform', `translate(${newX}, ${newY})`);
            }
            clonedGroup.setAttribute('data-x', newX);
            clonedGroup.setAttribute('data-y', newY);

            svgEl.appendChild(clonedGroup);

            const codeShape = new CodeShape(clonedGroup);
            return codeShape;
        }

        case 'image': {
            const imgEl = document.createElementNS('http://www.w3.org/2000/svg', 'image');
            const newX = data.x + offsetX;
            const newY = data.y + offsetY;
            imgEl.setAttribute('x', newX);
            imgEl.setAttribute('y', newY);
            imgEl.setAttribute('width', data.width);
            imgEl.setAttribute('height', data.height);
            imgEl.setAttribute('href', data.href);
            imgEl.setAttribute('data-shape-x', newX);
            imgEl.setAttribute('data-shape-y', newY);
            imgEl.setAttribute('data-shape-width', data.width);
            imgEl.setAttribute('data-shape-height', data.height);
            imgEl.setAttribute('preserveAspectRatio', 'none');
            imgEl.setAttribute('style', 'cursor: pointer;');

            // ImageShape constructor moves element into a group and appends to svg
            svgEl.appendChild(imgEl);
            const imageShape = new ImageShape(imgEl);
            imageShape.rotation = data.rotation;
            return imageShape;
        }

        case 'icon': {
            // Parse the cloned icon element HTML
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = data.elementHTML;
            const clonedEl = tempDiv.firstElementChild;
            if (!clonedEl) return null;

            const newX = data.x + offsetX;
            const newY = data.y + offsetY;
            const newID = `icon-${String(Date.now()).slice(0, 8)}-${Math.floor(Math.random() * 10000)}`;
            clonedEl.setAttribute('id', newID);
            clonedEl.setAttribute('x', newX);
            clonedEl.setAttribute('y', newY);
            clonedEl.setAttribute('data-shape-x', newX);
            clonedEl.setAttribute('data-shape-y', newY);
            clonedEl.setAttribute('data-shape-width', data.width);
            clonedEl.setAttribute('data-shape-height', data.height);
            clonedEl.setAttribute('data-shape-rotation', data.rotation);
            clonedEl.setAttribute('data-viewbox-width', data.viewboxWidth);
            clonedEl.setAttribute('data-viewbox-height', data.viewboxHeight);

            // Recalculate transform
            const scale = data.width / Math.max(data.viewboxWidth, data.viewboxHeight);
            const localCenterX = data.width / 2 / scale;
            const localCenterY = data.height / 2 / scale;
            clonedEl.setAttribute('transform', `translate(${newX}, ${newY}) scale(${scale}) rotate(${data.rotation}, ${localCenterX}, ${localCenterY})`);

            svgEl.appendChild(clonedEl);

            const iconShape = new IconShape(clonedEl);
            return iconShape;
        }

        default:
            return null;
    }
}

// ============================================================
// COPY: Serialize currently selected shapes
// ============================================================
function copySelected() {
    const shapesToCopy = [];

    // Check multi-selection first
    if (window.multiSelection && window.multiSelection.selectedShapes && window.multiSelection.selectedShapes.size > 0) {
        window.multiSelection.selectedShapes.forEach(shape => {
            const data = serializeShape(shape);
            if (data) shapesToCopy.push(data);
        });
    }
    // Fall back to single currentShape
    else if (typeof currentShape !== 'undefined' && currentShape && currentShape.isSelected) {
        const data = serializeShape(currentShape);
        if (data) shapesToCopy.push(data);
    }

    if (shapesToCopy.length === 0) return false;

    // Calculate center of all copied shapes
    let totalX = 0, totalY = 0;
    shapesToCopy.forEach(d => {
        const c = getShapeCenter(d);
        totalX += c.x;
        totalY += c.y;
    });
    const centerX = totalX / shapesToCopy.length;
    const centerY = totalY / shapesToCopy.length;

    clipboard = {
        shapes: shapesToCopy,
        centerX,
        centerY
    };
    pasteCount = 0;

    return true;
}

// ============================================================
// PASTE: Create new shapes from clipboard at mouse position
// ============================================================
function pasteClipboard() {
    if (!clipboard || clipboard.shapes.length === 0) return false;

    pasteCount++;
    const baseOffset = 20 * pasteCount;

    // Calculate paste position: center the group on the mouse pointer
    const targetX = lastMouseSVG.x;
    const targetY = lastMouseSVG.y;
    const groupOffsetX = targetX - clipboard.centerX + baseOffset;
    const groupOffsetY = targetY - clipboard.centerY + baseOffset;

    // Deselect all currently selected shapes
    if (typeof shapes !== 'undefined' && Array.isArray(shapes)) {
        shapes.forEach(s => {
            if (s.isSelected && typeof s.removeSelection === 'function') {
                s.removeSelection();
                s.isSelected = false;
            }
        });
    }
    if (window.multiSelection) {
        window.multiSelection.clearSelection();
    }
    if (typeof currentShape !== 'undefined') {
        currentShape = null;
    }
    if (typeof disableAllSideBars === 'function') {
        disableAllSideBars();
    }

    const pastedShapes = [];

    clipboard.shapes.forEach(data => {
        const newShape = createShapeFromData(data, groupOffsetX, groupOffsetY);
        if (newShape) {
            if (typeof shapes !== 'undefined' && Array.isArray(shapes)) {
                shapes.push(newShape);
            }
            pushCreateAction(newShape);
            pastedShapes.push(newShape);
        }
    });

    // Select the pasted shapes
    if (pastedShapes.length === 1) {
        const s = pastedShapes[0];
        s.isSelected = true;
        currentShape = s;
        if (typeof s.addAnchors === 'function') {
            s.addAnchors();
        } else if (typeof s.selectShape === 'function') {
            s.selectShape();
        }
    } else if (pastedShapes.length > 1 && window.multiSelection) {
        pastedShapes.forEach(s => {
            window.multiSelection.addShape(s);
        });
        window.multiSelection.updateControls();
    }

    return true;
}

// ============================================================
// KEYBOARD HANDLER: Ctrl+C / Ctrl+V
// ============================================================
function handleCopyPasteKeydown(e) {
    // Don't intercept if user is typing in an input/textarea/contenteditable
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (copySelected()) {
            e.preventDefault();
        }
    }

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        if (pasteClipboard()) {
            e.preventDefault();
        }
    }
}

// Track mouse position for paste placement
function handleMouseMoveForPaste(e) {
    const svgEl = getSVGElement();
    if (!svgEl) return;
    const viewBox = svgEl.viewBox.baseVal;
    const rect = svgEl.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    lastMouseSVG.x = viewBox.x + (mouseX / rect.width) * viewBox.width;
    lastMouseSVG.y = viewBox.y + (mouseY / rect.height) * viewBox.height;
}

// ============================================================
// PASTE IMAGE FROM CLIPBOARD (external images, screenshots)
// ============================================================
function handlePasteEvent(e) {
    // Don't intercept if user is typing
    const tag = (e.target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;

    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
        if (item.type.startsWith('image/')) {
            e.preventDefault();
            const blob = item.getAsFile();
            if (!blob) return;

            // Validate against the canonical allowlist — clipboard sources
            // can include animated GIFs / HEIC / TIFF / arbitrary mime types.
            if (!isAllowedImage(blob)) {
                console.warn('[CopyPaste] Rejected pasted image type:', blob.type);
                return;
            }

            const reader = new FileReader();
            reader.onload = async (ev) => {
                const rawDataUrl = ev.target.result;
                const isSvg = (blob.type || '').toLowerCase() === 'image/svg+xml';
                let placedDataUrl = rawDataUrl;
                if (!isSvg) {
                    try {
                        const compressed = await compressImage(rawDataUrl);
                        if (compressed?.dataUrl) placedDataUrl = compressed.dataUrl;
                    } catch (err) {
                        console.warn('[CopyPaste] Pre-placement compression failed, using raw:', err);
                    }
                }
                placeImageFromDataUrl(placedDataUrl);
            };
            reader.readAsDataURL(blob);
            return; // only handle first image
        }
    }
}

function placeImageFromDataUrl(dataUrl) {
    const svgEl = getSVGElement();
    if (!svgEl || !window.ImageShape) return;

    const img = new Image();
    img.onload = () => {
        const aspectRatio = img.height / img.width;
        const displayW = Math.min(400, img.width);
        const displayH = displayW * aspectRatio;

        // Place at center of current viewport
        const vb = svgEl.viewBox.baseVal;
        const cx = vb.x + vb.width / 2;
        const cy = vb.y + vb.height / 2;

        const imgEl = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        imgEl.setAttribute('href', dataUrl);
        imgEl.setAttribute('x', cx - displayW / 2);
        imgEl.setAttribute('y', cy - displayH / 2);
        imgEl.setAttribute('width', displayW);
        imgEl.setAttribute('height', displayH);
        imgEl.setAttribute('data-shape-x', cx - displayW / 2);
        imgEl.setAttribute('data-shape-y', cy - displayH / 2);
        imgEl.setAttribute('data-shape-width', displayW);
        imgEl.setAttribute('data-shape-height', displayH);
        imgEl.setAttribute('type', 'image');
        imgEl.setAttribute('preserveAspectRatio', 'none');

        svgEl.appendChild(imgEl);
        const imageShape = new ImageShape(imgEl);
        if (window.shapes) window.shapes.push(imageShape);
        if (window.pushCreateAction) window.pushCreateAction(imageShape);

        // Compress and upload to Cloudinary
        if (window.uploadImageToCloudinary) {
            window.uploadImageToCloudinary(imageShape);
        }

        console.log('[CopyPaste] Pasted image from clipboard');
    };
    img.src = dataUrl;
}

// ============================================================
// INIT: Set up event listeners
// ============================================================
function initCopyPaste() {
    document.addEventListener('keydown', handleCopyPasteKeydown);
    document.addEventListener('pointermove', handleMouseMoveForPaste);
    document.addEventListener('paste', handlePasteEvent);

    // Expose for context menu
    window.copySelected = copySelected;
    window.pasteClipboard = pasteClipboard;
}

export { initCopyPaste, copySelected, pasteClipboard };
