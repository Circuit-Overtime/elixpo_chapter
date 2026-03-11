/* eslint-disable */
// Icon tool event handlers - extracted from icons.js
import { pushCreateAction, pushDeleteAction, pushTransformAction, pushFrameAttachmentAction } from '../core/UndoRedo.js';
import { updateAttachedArrows as updateArrowsForShape, cleanupAttachments } from './arrowTool.js';


let isDraggingIcon = false;
let iconToPlace = null;
let iconX = 0;
let iconY = 0;
let scaleFactor = 0.2;
let currentIconElement = null;

let selectedIcon = null;
let originalX, originalY, originalWidth, originalHeight;
let currentAnchor = null;
let isDragging = false;
let isRotatingIcon = false;
let dragOffsetX, dragOffsetY;
let startRotationMouseAngle = null;
let startIconRotation = null;
let iconRotation = 0;
let aspect_ratio_lock = true;
const minIconSize = 25;
const miniatureSize = 40;
const placedIconSize = 40;
let draggedShapeInitialFrameIcon = null;
let hoveredFrameIcon = null;
let _pendingDragChecker = null; // module-level ref so cancelDragPrep can remove it

const iconSearchInput = document.getElementById('iconSearchInput') || document.createElement('input');
let searchTimeout = null;


function getSVGElement() {
    return document.getElementById('freehand-canvas');
}


function removeSelection() {
    const svg = getSVGElement();
    if (!svg) return;

    const outline = svg.querySelector(".selection-outline");
    if (outline) {
        svg.removeChild(outline);
    }

    removeResizeAnchors();
    removeRotationAnchor();

    if (selectedIcon) {
        selectedIcon.removeEventListener('mousedown', startDrag);
        selectedIcon.removeEventListener('mouseup', stopDrag);
        selectedIcon.removeEventListener('mouseleave', stopDrag);
    }
}

function wrapIconElement(element) {
    const iconShape = new IconShape(element);
    return iconShape;
}

document.getElementById("importIcon")?.addEventListener('click', () => {
    

    const iconContainer = document.getElementById('iconsToolBar');
    if (iconContainer) {
        if(iconContainer.classList.contains('hidden')) {
            iconContainer.classList.remove('hidden');
            iconSearchInput.focus();
        }
        else 
        {
            iconContainer.classList.add('hidden');
        }
        
    }
});

function getSVGCoordsFromMouse(e) {
    const svg = getSVGElement();
    const viewBox = svg.viewBox.baseVal;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const svgX = viewBox.x + (mouseX / rect.width) * viewBox.width;
    const svgY = viewBox.y + (mouseY / rect.height) * viewBox.height;
    return { x: svgX, y: svgY };
}

const handleMouseMoveIcon = (e) => {
    if (!isDraggingIcon || !iconToPlace || !isIconToolActive) return;

    const { x, y } = getSVGCoordsFromMouse(e);
    iconX = x;
    iconY = y;

    drawMiniatureIcon();

    if (typeof shapes !== 'undefined' && Array.isArray(shapes)) {
        shapes.forEach(frame => {
            if (frame.shapeName === 'frame') {
                const tempIconBounds = {
                    x: iconX - 50,
                    y: iconY - 50,
                    width: 100,
                    height: 100
                };

                if (frame.isShapeInFrame(tempIconBounds)) {
                    frame.highlightFrame();
                    hoveredFrameIcon = frame;
                    if (window.__iconShapeState) window.__iconShapeState.hoveredFrameIcon = frame;
                } else if (hoveredFrameIcon === frame) {
                    frame.removeHighlight();
                    hoveredFrameIcon = null;
                    if (window.__iconShapeState) window.__iconShapeState.hoveredFrameIcon = null;
                }
            }
        });
    }
};

const drawMiniatureIcon = () => {
    if (!isDraggingIcon || !iconToPlace || !isIconToolActive) return;

    const svg = getSVGElement();
    if (!svg) {
        console.error('SVG element not found for miniature icon');
        return;
    }

    if (currentIconElement) {
        svg.removeChild(currentIconElement);
        currentIconElement = null;
    }

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = iconToPlace;
    const svgElement = tempDiv.querySelector('svg');

    if (svgElement) {
        const iconGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");

        const viewBox = svgElement.getAttribute('viewBox');
        let vbWidth = 24, vbHeight = 24;

        if (viewBox) {
            const [, , widthStr, heightStr] = viewBox.split(/\s+/);
            vbWidth = parseFloat(widthStr) || 24;
            vbHeight = parseFloat(heightStr) || 24;
        } else {
            const width = svgElement.getAttribute('width');
            const height = svgElement.getAttribute('height');
            if (width && height) {
                vbWidth = parseFloat(width) || 24;
                vbHeight = parseFloat(height) || 24;
            }
        }

        const scale = miniatureSize / Math.max(vbWidth, vbHeight);
        iconGroup.setAttribute("transform", `translate(${iconX - miniatureSize / 2}, ${iconY - miniatureSize / 2}) scale(${scale})`);

        const allChildren = svgElement.children;
        for (let i = 0; i < allChildren.length; i++) {
            const clonedChild = allChildren[i].cloneNode(true);
            
            const applyGrayStyle = (element) => {
                if (element.nodeType === 1) {
                    element.setAttribute('fill', '#666');
                    element.setAttribute('stroke', '#666');
                    
                    for (let j = 0; j < element.children.length; j++) {
                        applyGrayStyle(element.children[j]);
                    }
                }
            };
            
            applyGrayStyle(clonedChild);
            iconGroup.appendChild(clonedChild);
        }

        iconGroup.setAttribute("style", "pointer-events: none; opacity: 0.7;");
        iconGroup.setAttribute("class", "miniature-icon");

        currentIconElement = iconGroup;
        svg.appendChild(currentIconElement);
    }
};

const handleMouseDownIcon = async (e) => {
    if (isSelectionToolActive) {
        const clickedIcon = e.target.closest('[type="icon"]');
        if (clickedIcon) {
            e.preventDefault();
            e.stopPropagation();
            
            if (selectedIcon === clickedIcon) {
                originalX = parseFloat(selectedIcon.getAttribute('x')) || 0;
                originalY = parseFloat(selectedIcon.getAttribute('y')) || 0;
                originalWidth = parseFloat(selectedIcon.getAttribute('width')) || placedIconSize;
                originalHeight = parseFloat(selectedIcon.getAttribute('height')) || placedIconSize;

                const { x, y } = getSVGCoordsFromMouse(e);
                dragOffsetX = x - originalX;
                dragOffsetY = y - originalY;

                const initialMouseX = x;
                const initialMouseY = y;

                // Threshold in screen pixels converted to SVG units, so zoom doesn't affect sensitivity
                const svgEl = getSVGElement();
                const svgRect2 = svgEl ? svgEl.getBoundingClientRect() : { width: 1536 };
                const svgViewW = svgEl ? svgEl.viewBox.baseVal.width : 1536;
                const dragThreshold = 12 * (svgViewW / svgRect2.width); // ~12 screen pixels

                function checkDragStartWithThreshold(moveEvent) {
                    const { x: currentX, y: currentY } = getSVGCoordsFromMouse(moveEvent);
                    const deltaX = Math.abs(currentX - initialMouseX);
                    const deltaY = Math.abs(currentY - initialMouseY);

                    if (deltaX > dragThreshold || deltaY > dragThreshold) {
                        document.removeEventListener('mousemove', checkDragStartWithThreshold);
                        document.removeEventListener('mouseup', cancelDragPrep);
                        window.removeEventListener('mouseup', cancelDragPrep);

                        const svg = getSVGElement();
                        if (svg) svg.removeEventListener('mouseup', cancelDragPrep);

                        startDrag(moveEvent);
                    }
                }

                _pendingDragChecker = checkDragStartWithThreshold;
                document.addEventListener('mousemove', checkDragStartWithThreshold);
                document.addEventListener('mouseup', cancelDragPrep);
                window.addEventListener('mouseup', cancelDragPrep);

                const svg = getSVGElement();
                if (svg) svg.addEventListener('mouseup', cancelDragPrep);

                return;
            } else {
                selectIcon(e);
                return;
            }
        }
    }

    if (!isDraggingIcon || !iconToPlace || !isIconToolActive) {
        return;
    }

    let placedIconShape = null;

    try {
        const svg = getSVGElement();
        if (!svg) {
            throw new Error('SVG element not found');
        }

        if (currentIconElement) {
            svg.removeChild(currentIconElement);
            currentIconElement = null;
        }

        const { x: placedX, y: placedY } = getSVGCoordsFromMouse(e);

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = iconToPlace;
        const originalSvgElement = tempDiv.querySelector('svg');

        if (!originalSvgElement) {
            throw new Error('Invalid SVG content');
        }

        const finalIconGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
        const finalX = placedX - placedIconSize / 2;
        const finalY = placedY - placedIconSize / 2;

        const viewBox = originalSvgElement.getAttribute('viewBox');
        let vbWidth = 24, vbHeight = 24;

        if (viewBox) {
            const [, , widthStr, heightStr] = viewBox.split(/\s+/);
            vbWidth = parseFloat(widthStr) || 24;
            vbHeight = parseFloat(heightStr) || 24;
        } else {
            const width = originalSvgElement.getAttribute('width');
            const height = originalSvgElement.getAttribute('height');
            if (width && height) {
                vbWidth = parseFloat(width) || 24;
                vbHeight = parseFloat(height) || 24;
            }
        }

        const scale = placedIconSize / Math.max(vbWidth, vbHeight);
        const localCenterX = placedIconSize / 2 / scale;
        const localCenterY = placedIconSize / 2 / scale;
        finalIconGroup.setAttribute('transform', `translate(${finalX}, ${finalY}) scale(${scale}) rotate(0, ${localCenterX}, ${localCenterY})`);
        finalIconGroup.setAttribute('data-viewbox-width', vbWidth);
        finalIconGroup.setAttribute('data-viewbox-height', vbHeight);

        const backgroundRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        backgroundRect.setAttribute('x', 0);
        backgroundRect.setAttribute('y', 0);
        backgroundRect.setAttribute('width', vbWidth);
        backgroundRect.setAttribute('height', vbHeight);
        backgroundRect.setAttribute('fill', 'transparent');
        backgroundRect.setAttribute('stroke', 'none');
        backgroundRect.setAttribute('style', 'pointer-events: all; cursor: pointer;');
        finalIconGroup.appendChild(backgroundRect);

        const allChildren = originalSvgElement.children;
        for (let i = 0; i < allChildren.length; i++) {
            const clonedChild = allChildren[i].cloneNode(true);

            // Apply white fill/stroke so icons are visible on dark canvas
            const applyWhiteStyle = (element) => {
                if (element.nodeType === 1) {
                    const fill = element.getAttribute('fill');
                    const stroke = element.getAttribute('stroke');
                    // Replace black/dark fills with white; leave 'none'/'transparent' alone
                    if (!fill || fill === '#000' || fill === '#000000' || fill === 'black' || fill === 'currentColor') {
                        element.setAttribute('fill', '#ffffff');
                    }
                    if (stroke === '#000' || stroke === '#000000' || stroke === 'black' || stroke === 'currentColor') {
                        element.setAttribute('stroke', '#ffffff');
                    }
                    for (let j = 0; j < element.children.length; j++) {
                        applyWhiteStyle(element.children[j]);
                    }
                }
            };
            applyWhiteStyle(clonedChild);

            finalIconGroup.appendChild(clonedChild);
        }

        finalIconGroup.setAttribute('x', finalX);
        finalIconGroup.setAttribute('y', finalY);
        finalIconGroup.setAttribute('width', placedIconSize);
        finalIconGroup.setAttribute('height', placedIconSize);
        finalIconGroup.setAttribute('type', 'icon');
        finalIconGroup.setAttribute('data-shape-x', finalX);
        finalIconGroup.setAttribute('data-shape-y', finalY);
        finalIconGroup.setAttribute('data-shape-width', placedIconSize);
        finalIconGroup.setAttribute('data-shape-height', placedIconSize);
        finalIconGroup.setAttribute('data-shape-rotation', 0);
        finalIconGroup.shapeID = `icon-${String(Date.now()).slice(0, 8)}-${Math.floor(Math.random() * 10000)}`;
        finalIconGroup.setAttribute('id', finalIconGroup.shapeID);
        finalIconGroup.setAttribute('style', 'cursor: pointer; pointer-events: all;');

        svg.appendChild(finalIconGroup);

        const iconShape = wrapIconElement(finalIconGroup);
        placedIconShape = iconShape;

        if (typeof shapes !== 'undefined' && Array.isArray(shapes)) {
            shapes.push(iconShape);
            console.log('Icon added to shapes array for arrow attachment and frame functionality');
        } else {
            console.warn('shapes array not found - arrows and frames may not work with icons');
        }

        const finalFrame = hoveredFrameIcon;
        if (finalFrame) {
            finalFrame.addShapeToFrame(iconShape);
            pushFrameAttachmentAction(finalFrame, iconShape, 'attach', null);
        }

        pushCreateAction(iconShape);

        // mousedown handles selection; click listener removed to avoid double-selection conflicts

        if (hoveredFrameIcon) {
            hoveredFrameIcon.removeHighlight();
            hoveredFrameIcon = null;
            if (window.__iconShapeState) window.__iconShapeState.hoveredFrameIcon = null;
        }

        console.log('Icon placed successfully:', finalIconGroup);

    } catch (error) {
        console.error("Error placing icon:", error);
        isDraggingIcon = false;
        iconToPlace = null;
        isIconToolActive = false;
    } finally {
        isDraggingIcon = false;
        iconToPlace = null;
        isIconToolActive = false;
        document.body.style.cursor = 'default';
    }

    // Auto-select placed icon and switch to selection tool
    if (placedIconShape) {
        // Switch to select tool via Zustand store bridge
        if (window.__sketchStoreApi) window.__sketchStoreApi.setActiveTool('select', { afterDraw: true });
        currentShape = placedIconShape;
        currentShape.isSelected = true;
        requestAnimationFrame(() => {
            placedIconShape.selectShape();
        });
    }
};

const handleMouseUpIcon = (e) => {
    if (isSelectionToolActive) {
        const clickedElement = e.target;
        const isIconElement = clickedElement.closest('[type="icon"]');
        const isAnchorElement = clickedElement.classList.contains('resize-anchor') ||
            clickedElement.classList.contains('rotation-anchor') ||
            clickedElement.classList.contains('selection-outline');

        if (!isIconElement && !isAnchorElement && selectedIcon) {
            removeSelection();
            selectedIcon = null;
        }
    }

    if (hoveredFrameIcon) {
        hoveredFrameIcon.removeHighlight();
        hoveredFrameIcon = null;
    }
};

function addSelectionOutline() {
    if (!selectedIcon) return;

    const svg = getSVGElement();
    if (!svg) return;

    // Use stored SVG-space data attributes — reliable even immediately after DOM insertion
    const x = parseFloat(selectedIcon.getAttribute('data-shape-x')) || 0;
    const y = parseFloat(selectedIcon.getAttribute('data-shape-y')) || 0;
    const width = parseFloat(selectedIcon.getAttribute('data-shape-width')) || 40;
    const height = parseFloat(selectedIcon.getAttribute('data-shape-height')) || 40;
    const rotation = parseFloat(selectedIcon.getAttribute('data-shape-rotation')) || 0;

    const centerX = x + width / 2;
    const centerY = y + height / 2;

    const selectionPadding = Math.max(4, width * 0.08);
    const expandedX = x - selectionPadding;
    const expandedY = y - selectionPadding;
    const expandedWidth = width + 2 * selectionPadding;
    const expandedHeight = height + 2 * selectionPadding;

    removeSelection();

    const outline = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    outline.setAttribute("x", expandedX);
    outline.setAttribute("y", expandedY);
    outline.setAttribute("width", expandedWidth);
    outline.setAttribute("height", expandedHeight);
    outline.setAttribute("fill", "none");
    outline.setAttribute("stroke", "#5B57D1");
    outline.setAttribute("stroke-width", 1.5);
    outline.setAttribute("stroke-dasharray", "4 3");
    outline.setAttribute("style", "pointer-events: none;");
    outline.setAttribute("class", "selection-outline");
    if (rotation !== 0) {
        outline.setAttribute("transform", `rotate(${rotation}, ${centerX}, ${centerY})`);
    }

    svg.appendChild(outline);

    addResizeAnchors(expandedX, expandedY, expandedWidth, expandedHeight, centerX, centerY, width, rotation);
    addRotationAnchor(expandedX, expandedY, expandedWidth, expandedHeight, centerX, centerY, width, rotation);
}

function checkDragStart(event) {
    document.removeEventListener('mousemove', checkDragStart);
    document.removeEventListener('mouseup', cancelDragPrep);
    startDrag(event);
}
function cancelDragPrep(event) {
    if (_pendingDragChecker) {
        document.removeEventListener('mousemove', _pendingDragChecker);
        _pendingDragChecker = null;
    }
    document.removeEventListener('mouseup', cancelDragPrep);
    window.removeEventListener('mouseup', cancelDragPrep);

    const svg = getSVGElement();
    if (svg) {
        svg.removeEventListener('mouseup', cancelDragPrep);
    }
}

function startDrag(event) {
    console.log("start dragging icon");
    if (!isSelectionToolActive || !selectedIcon) return;
    
    isDragging = true;
    if (window.__iconShapeState) window.__iconShapeState.isDragging = true;

    let iconShape = null;
    if (typeof shapes !== 'undefined' && Array.isArray(shapes)) {
        iconShape = shapes.find(shape => shape.shapeName === 'icon' && shape.element === selectedIcon);
    }

    if (iconShape) {
        draggedShapeInitialFrameIcon = iconShape.parentFrame || null;

        if (iconShape.parentFrame) {
            iconShape.parentFrame.temporarilyRemoveFromFrame(iconShape);
        }
    }

    document.addEventListener('mousemove', dragIcon);
    document.addEventListener('mouseup', stopDrag);
    
    window.addEventListener('mouseup', stopDrag);
    
    const svg = getSVGElement();
    if (svg) {
        svg.addEventListener('mouseup', stopDrag);
    }
    
    document.addEventListener('dragstart', preventDefaultDrag);
    document.addEventListener('selectstart', preventDefaultDrag);
}

function preventDefaultDrag(e) {
    e.preventDefault();
    return false;
}

function selectIcon(event) {
    if (!isSelectionToolActive) return;

    event.stopPropagation();

    let targetIcon = event.target.closest('[type="icon"]');
    if (!targetIcon) {
        let current = event.target;
        while (current && current !== document) {
            if (current.getAttribute && current.getAttribute('type') === 'icon') {
                targetIcon = current;
                break;
            }
            current = current.parentElement;
        }
    }

    if (selectedIcon !== targetIcon) {
        if (selectedIcon) {
            removeSelection();
        }

        selectedIcon = targetIcon;

        if (!selectedIcon) {
            console.warn('Could not find icon to select');
            return;
        }

        const transform = selectedIcon.getAttribute('transform');
        if (transform) {
            const rotateMatch = transform.match(/rotate\(([^,\s]+)/);
            if (rotateMatch) {
                iconRotation = parseFloat(rotateMatch[1]);
            }
        } else {
            iconRotation = 0;
        }

        addSelectionOutline();

        originalX = parseFloat(selectedIcon.getAttribute('x')) || 0;
        originalY = parseFloat(selectedIcon.getAttribute('y')) || 0;
        originalWidth = parseFloat(selectedIcon.getAttribute('width')) || placedIconSize;
        originalHeight = parseFloat(selectedIcon.getAttribute('height')) || placedIconSize;

        // Set currentShape so EventDispatcher routes subsequent events to icon handler
        const iconShape = (typeof shapes !== 'undefined' && Array.isArray(shapes))
            ? shapes.find(s => s.shapeName === 'icon' && s.element === selectedIcon)
            : null;
        if (iconShape) {
            currentShape = iconShape;
            currentShape.isSelected = true;
            if (window.__showSidebarForShape) window.__showSidebarForShape('icon');
        }
    }
}

function addResizeAnchors(x, y, width, height, centerX, centerY, iconWidth, rotation) {
    const svg = getSVGElement();
    if (!svg) return;

    const anchorSize = Math.max(8, Math.min(16, iconWidth * 0.15));
    const anchorStrokeWidth = Math.max(1.5, anchorSize * 0.15);

    const positions = [
        { x: x, y: y, cursor: "nw-resize" },
        { x: x + width, y: y, cursor: "ne-resize" },
        { x: x, y: y + height, cursor: "sw-resize" },
        { x: x + width, y: y + height, cursor: "se-resize" }
    ];

    positions.forEach((pos) => {
        const anchor = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        anchor.setAttribute("x", pos.x - anchorSize / 2);
        anchor.setAttribute("y", pos.y - anchorSize / 2);
        anchor.setAttribute("width", anchorSize);
        anchor.setAttribute("height", anchorSize);
        anchor.setAttribute("fill", "#121212");
        anchor.setAttribute("stroke", "#5B57D1");
        anchor.setAttribute("stroke-width", anchorStrokeWidth);
        anchor.setAttribute("class", "resize-anchor");
        anchor.setAttribute("transform", `rotate(${rotation}, ${centerX}, ${centerY})`);
        anchor.style.cursor = pos.cursor;

        svg.appendChild(anchor);

        anchor.addEventListener('mousedown', startResize);
        anchor.addEventListener('mouseup', stopResize);
    });
}

function addRotationAnchor(x, y, width, height, centerX, centerY, iconWidth, rotation) {
    const svg = getSVGElement();
    if (!svg) return;

    const anchorRadius = Math.max(6, Math.min(12, iconWidth * 0.12));
    const anchorStrokeWidth = Math.max(1.5, anchorRadius * 0.2);
    const rotationDistance = Math.max(25, iconWidth * 0.4);

    const rotationAnchorX = x + width / 2;
    const rotationAnchorY = y - rotationDistance;

    const rotationAnchor = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    rotationAnchor.setAttribute('cx', rotationAnchorX);
    rotationAnchor.setAttribute('cy', rotationAnchorY);
    rotationAnchor.setAttribute('r', anchorRadius);
    rotationAnchor.setAttribute('class', 'rotation-anchor');
    rotationAnchor.setAttribute('fill', '#121212');
    rotationAnchor.setAttribute('stroke', '#5B57D1');
    rotationAnchor.setAttribute('stroke-width', anchorStrokeWidth);
    rotationAnchor.setAttribute('style', 'pointer-events: all; cursor: grab;');
    rotationAnchor.setAttribute('transform', `rotate(${rotation}, ${centerX}, ${centerY})`);

    svg.appendChild(rotationAnchor);

    rotationAnchor.addEventListener('mousedown', startRotation);
    rotationAnchor.addEventListener('mouseup', stopRotation);

    rotationAnchor.addEventListener('mouseover', function() {
        if (!isRotatingIcon && !isDragging) {
            rotationAnchor.style.cursor = 'grab';
        }
    });

    rotationAnchor.addEventListener('mouseout', function() {
        if (!isRotatingIcon && !isDragging) {
            rotationAnchor.style.cursor = 'default';
        }
    });
}

function removeRotationAnchor() {
    const svg = getSVGElement();
    if (!svg) return;

    const rotationAnchor = svg.querySelector(".rotation-anchor");
    if (rotationAnchor) {
        svg.removeChild(rotationAnchor);
    }
}

function removeResizeAnchors() {
    const svg = getSVGElement();
    if (!svg) return;

    const anchors = svg.querySelectorAll(".resize-anchor");
    anchors.forEach(anchor => svg.removeChild(anchor));
}

function startResize(event) {
    event.preventDefault();
    event.stopPropagation();

    currentAnchor = event.target;

    originalX = parseFloat(selectedIcon.getAttribute('x')) || 0;
    originalY = parseFloat(selectedIcon.getAttribute('y')) || 0;
    originalWidth = parseFloat(selectedIcon.getAttribute('width')) || 100;
    originalHeight = parseFloat(selectedIcon.getAttribute('height')) || 100;

    const { x: mouseX, y: mouseY } = getSVGCoordsFromMouse(event);
    currentAnchor.startMouseX = mouseX;
    currentAnchor.startMouseY = mouseY;

    currentAnchor.iconRotation = iconRotation;

    const svg = getSVGElement();
    if (svg) {
        svg.addEventListener('mousemove', resizeIcon);
    }
    document.addEventListener('mouseup', stopResize);
}

function stopResize(event) {
    stopInteracting();
    document.removeEventListener('mouseup', stopResize);
}

function resizeIcon(event) {
    if (!selectedIcon || !currentAnchor) return;

    const { x: currentMouseX, y: currentMouseY } = getSVGCoordsFromMouse(event);
    
    const centerX = originalX + originalWidth / 2;
    const centerY = originalY + originalHeight / 2;
    const rotation = currentAnchor.iconRotation || 0;
    const rotationRad = (rotation * Math.PI) / 180;

    const rawDeltaX = currentMouseX - currentAnchor.startMouseX;
    const rawDeltaY = currentMouseY - currentAnchor.startMouseY;

    const deltaX = rawDeltaX * Math.cos(-rotationRad) - rawDeltaY * Math.sin(-rotationRad);
    const deltaY = rawDeltaX * Math.sin(-rotationRad) + rawDeltaY * Math.cos(-rotationRad);

    let newWidth = originalWidth;
    let newHeight = originalHeight;
    let newX = originalX;
    let newY = originalY;

    const scaleFactor = 1.0;

    switch (currentAnchor.style.cursor) {
        case "nw-resize":
            newWidth = Math.max(minIconSize, originalWidth - deltaX * scaleFactor);
            newHeight = Math.max(minIconSize, originalHeight - deltaY * scaleFactor);
            if (aspect_ratio_lock) {
                const scale = Math.min(newWidth / originalWidth, newHeight / originalHeight);
                newWidth = originalWidth * scale;
                newHeight = originalHeight * scale;
            }
            newX = originalX + (originalWidth - newWidth);
            newY = originalY + (originalHeight - newHeight);
            break;
        case "ne-resize":
            newWidth = Math.max(minIconSize, originalWidth + deltaX * scaleFactor);
            newHeight = Math.max(minIconSize, originalHeight - deltaY * scaleFactor);
            if (aspect_ratio_lock) {
                const scale = Math.max(newWidth / originalWidth, newHeight / originalHeight);
                newWidth = originalWidth * scale;
                newHeight = originalHeight * scale;
            }
            newX = originalX;
            newY = originalY + (originalHeight - newHeight);
            break;
        case "sw-resize":
            newWidth = Math.max(minIconSize, originalWidth - deltaX * scaleFactor);
            newHeight = Math.max(minIconSize, originalHeight + deltaY * scaleFactor);
            if (aspect_ratio_lock) {
                const scale = Math.max(newWidth / originalWidth, newHeight / originalHeight);
                newWidth = originalWidth * scale;
                newHeight = originalHeight * scale;
            }
            newX = originalX + (originalWidth - newWidth);
            newY = originalY;
            break;
        case "se-resize":
            newWidth = Math.max(minIconSize, originalWidth + deltaX * scaleFactor);
            newHeight = Math.max(minIconSize, originalHeight + deltaY * scaleFactor);
            if (aspect_ratio_lock) {
                const scale = Math.max(newWidth / originalWidth, newHeight / originalHeight);
                newWidth = originalWidth * scale;
                newHeight = originalHeight * scale;
            }
            newX = originalX;
            newY = originalY;
            break;
    }

    selectedIcon.setAttribute('width', newWidth);
    selectedIcon.setAttribute('height', newHeight);
    selectedIcon.setAttribute('x', newX);
    selectedIcon.setAttribute('y', newY);

    selectedIcon.setAttribute('data-shape-x', newX);
    selectedIcon.setAttribute('data-shape-y', newY);
    selectedIcon.setAttribute('data-shape-width', newWidth);
    selectedIcon.setAttribute('data-shape-height', newHeight);

    const vbWidth = parseFloat(selectedIcon.getAttribute('data-viewbox-width')) || 24;
    const vbHeight = parseFloat(selectedIcon.getAttribute('data-viewbox-height')) || 24;
    const scale = newWidth / Math.max(vbWidth, vbHeight);
    const localCenterX = newWidth / 2 / scale;
    const localCenterY = newHeight / 2 / scale;
    selectedIcon.setAttribute('transform', `translate(${newX}, ${newY}) scale(${scale}) rotate(${iconRotation}, ${localCenterX}, ${localCenterY})`);

    updateArrowsForShape(selectedIcon);

    addSelectionOutline();
}

function dragIcon(event) {
    if (!isDragging || !selectedIcon) return;

    const { x, y } = getSVGCoordsFromMouse(event);
    let newX = x - dragOffsetX;
    let newY = y - dragOffsetY;

    selectedIcon.setAttribute('x', newX);
    selectedIcon.setAttribute('y', newY);

    selectedIcon.setAttribute('data-shape-x', newX);
    selectedIcon.setAttribute('data-shape-y', newY);

    const width = parseFloat(selectedIcon.getAttribute('width')) || 100;
    const height = parseFloat(selectedIcon.getAttribute('height')) || 100;
    const vbWidth = parseFloat(selectedIcon.getAttribute('data-viewbox-width')) || 24;
    const vbHeight = parseFloat(selectedIcon.getAttribute('data-viewbox-height')) || 24;
    const scale = width / Math.max(vbWidth, vbHeight);
    const localCenterX = width / 2 / scale;
    const localCenterY = height / 2 / scale;
    
    selectedIcon.setAttribute('transform', `translate(${newX}, ${newY}) scale(${scale}) rotate(${iconRotation}, ${localCenterX}, ${localCenterY})`);

    if (typeof shapes !== 'undefined' && Array.isArray(shapes)) {
        const iconShape = shapes.find(shape => shape.shapeName === 'icon' && shape.element === selectedIcon);
        if (iconShape) {
            iconShape.x = newX;
            iconShape.y = newY;
            iconShape.updateFrameContainment();
        }
    }

    updateArrowsForShape(selectedIcon);

    removeSelection();
    addSelectionOutline();
}

function stopDrag(event) {
    if (!isDragging) return;
    
    console.log("stop dragging icon");
    isDragging = false;
    if (window.__iconShapeState) window.__iconShapeState.isDragging = false;

    document.removeEventListener('mousemove', dragIcon);
    document.removeEventListener('mouseup', stopDrag);
    window.removeEventListener('mouseup', stopDrag);
    
    const svg = getSVGElement();
    if (svg) {
        svg.removeEventListener('mouseup', stopDrag);
    }
    
    document.removeEventListener('dragstart', preventDefaultDrag);
    document.removeEventListener('selectstart', preventDefaultDrag);
    
    stopInteracting();
}

function startRotation(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!selectedIcon) return;

    isRotatingIcon = true;
    console.log(selectedIcon)
    const iconX = parseFloat(selectedIcon.getAttribute('x'));
    const iconY = parseFloat(selectedIcon.getAttribute('y'));
    const iconWidth = parseFloat(selectedIcon.getAttribute('width'));
    const iconHeight = parseFloat(selectedIcon.getAttribute('height'));

    const centerX = iconX + iconWidth / 2;
    const centerY = iconY + iconHeight / 2;

    const { x: mouseX, y: mouseY } = getSVGCoordsFromMouse(event);

    startRotationMouseAngle = Math.atan2(mouseY - centerY, mouseX - centerX) * 180 / Math.PI;
    console.log('Start rotation mouse angle:', startRotationMouseAngle);
    startIconRotation = iconRotation;

    const svg = getSVGElement();
    if (svg) {
        svg.addEventListener('mousemove', rotateIcon);
        svg.style.cursor = 'grabbing';
    }
    document.addEventListener('mouseup', stopRotation);
}

function rotateIcon(event) {
    if (!isRotatingIcon || !selectedIcon) return;

    const iconX = parseFloat(selectedIcon.getAttribute('x')) || 0;
    const iconY = parseFloat(selectedIcon.getAttribute('y')) || 0;
    const iconWidth = parseFloat(selectedIcon.getAttribute('width')) || 100;
    const iconHeight = parseFloat(selectedIcon.getAttribute('height')) || 100;

    const centerX = iconX + iconWidth / 2;
    const centerY = iconY + iconHeight / 2;

    const { x: mouseX, y: mouseY } = getSVGCoordsFromMouse(event);

    const currentMouseAngle = Math.atan2(mouseY - centerY, mouseX - centerX) * 180 / Math.PI;
    const angleDiff = currentMouseAngle - startRotationMouseAngle;

    iconRotation = startIconRotation + angleDiff;
    iconRotation = iconRotation % 360;
    if (iconRotation < 0) iconRotation += 360;

    const vbWidth = parseFloat(selectedIcon.getAttribute('data-viewbox-width')) || 24;
    const vbHeight = parseFloat(selectedIcon.getAttribute('data-viewbox-height')) || 24;
    const scale = iconWidth / Math.max(vbWidth, vbHeight);
    const localCenterX = iconWidth / 2 / scale;
    const localCenterY = iconHeight / 2 / scale;

    selectedIcon.setAttribute('transform', `translate(${iconX}, ${iconY}) scale(${scale}) rotate(${iconRotation}, ${localCenterX}, ${localCenterY})`);

    selectedIcon.setAttribute('data-shape-rotation', iconRotation);

    updateArrowsForShape(selectedIcon);

    removeSelection();
    addSelectionOutline();
}

function stopRotation(event) {
    if (!isRotatingIcon) return;
    stopInteracting();
    isRotatingIcon = false;
    startRotationMouseAngle = null;
    startIconRotation = null;

    const svg = getSVGElement();
    if (svg) {
        svg.removeEventListener('mousemove', rotateIcon);
        svg.style.cursor = 'default';
    }
    document.removeEventListener('mouseup', stopRotation);
}

function stopInteracting() {
    if (selectedIcon && (isDragging || isRotatingIcon || currentAnchor)) {
        const newPos = {
            x: parseFloat(selectedIcon.getAttribute('x')) || 0,
            y: parseFloat(selectedIcon.getAttribute('y')) || 0,
            width: parseFloat(selectedIcon.getAttribute('width')) || 100,
            height: parseFloat(selectedIcon.getAttribute('height')) || 100,
            rotation: iconRotation
        };

        let originalRotation = iconRotation;
        if (isRotatingIcon && startIconRotation !== null) {
            originalRotation = startIconRotation;
        }

        const oldPos = {
            x: originalX,
            y: originalY,
            width: originalWidth,
            height: originalHeight,
            rotation: originalRotation
        };

        let iconShape = null;
        if (typeof shapes !== 'undefined' && Array.isArray(shapes)) {
            iconShape = shapes.find(shape => shape.shapeName === 'icon' && shape.element === selectedIcon);
            if (iconShape) {
                iconShape.x = newPos.x;
                iconShape.y = newPos.y;
                iconShape.width = newPos.width;
                iconShape.height = newPos.height;
                iconShape.rotation = newPos.rotation;
            }
        }

        const oldPosWithFrame = {
            ...oldPos,
            parentFrame: draggedShapeInitialFrameIcon
        };
        const newPosWithFrame = {
            ...newPos,
            parentFrame: iconShape ? iconShape.parentFrame : null
        };

        const stateChanged = newPos.x !== oldPos.x || newPos.y !== oldPos.y ||
            newPos.width !== oldPos.width || newPos.height !== oldPos.height ||
            newPos.rotation !== oldPos.rotation;
        const frameChanged = oldPosWithFrame.parentFrame !== newPosWithFrame.parentFrame;

        if ((stateChanged || frameChanged) && iconShape) {
            pushTransformAction(iconShape, oldPosWithFrame, newPosWithFrame);
        }

        if (isDragging && iconShape) {
            const finalFrame = hoveredFrameIcon;

            if (draggedShapeInitialFrameIcon !== finalFrame) {
                if (draggedShapeInitialFrameIcon) {
                    draggedShapeInitialFrameIcon.removeShapeFromFrame(iconShape);
                }

                if (finalFrame) {
                    finalFrame.addShapeToFrame(iconShape);
                }

                if (frameChanged) {
                    pushFrameAttachmentAction(finalFrame || draggedShapeInitialFrameIcon, iconShape,
                        finalFrame ? 'attach' : 'detach', draggedShapeInitialFrameIcon);
                }
            } else if (draggedShapeInitialFrameIcon) {
                draggedShapeInitialFrameIcon.restoreToFrame(iconShape);
            }
        }

        draggedShapeInitialFrameIcon = null;
    }

    if (hoveredFrameIcon) {
        hoveredFrameIcon.removeHighlight();
        hoveredFrameIcon = null;
        if (window.__iconShapeState) window.__iconShapeState.hoveredFrameIcon = null;
    }

    isDragging = false;
    if (window.__iconShapeState) window.__iconShapeState.isDragging = false;
    isRotatingIcon = false;

    const svg = getSVGElement();
    if (svg) {
        svg.removeEventListener('mousemove', dragIcon);
        svg.removeEventListener('mousemove', resizeIcon);
        svg.removeEventListener('mousemove', rotateIcon);
    }
    
    document.removeEventListener('mousemove', dragIcon);
    document.removeEventListener('mousemove', resizeIcon);
    document.removeEventListener('mousemove', rotateIcon);
    
    currentAnchor = null;
    startRotationMouseAngle = null;
    startIconRotation = null;

    if (selectedIcon) {
        originalX = parseFloat(selectedIcon.getAttribute('x')) || 0;
        originalY = parseFloat(selectedIcon.getAttribute('y')) || 0;
        originalWidth = parseFloat(selectedIcon.getAttribute('width')) || 100;
        originalHeight = parseFloat(selectedIcon.getAttribute('height')) || 100;

        selectedIcon.setAttribute('data-shape-x', originalX);
        selectedIcon.setAttribute('data-shape-y', originalY);
        selectedIcon.setAttribute('data-shape-width', originalWidth);
        selectedIcon.setAttribute('data-shape-height', originalHeight);
        selectedIcon.setAttribute('data-shape-rotation', iconRotation);

        updateArrowsForShape(selectedIcon);
    }
}

function deleteCurrentIcon() {
    if (selectedIcon) {
        let iconShape = null;
        if (typeof shapes !== 'undefined' && Array.isArray(shapes)) {
            iconShape = shapes.find(shape => shape.shapeName === 'icon' && shape.element === selectedIcon);
            if (iconShape) {
                const idx = shapes.indexOf(iconShape);
                if (idx !== -1) shapes.splice(idx, 1);

                if (iconShape.group && iconShape.group.parentNode) {
                    iconShape.group.parentNode.removeChild(iconShape.group);
                }
            }
        }

        if (!iconShape && selectedIcon.parentNode) {
            selectedIcon.parentNode.removeChild(selectedIcon);
        }

        if (typeof cleanupAttachments === 'function') {
            cleanupAttachments(selectedIcon);
        }

        if (iconShape) {
            pushDeleteAction(iconShape);
        }

        removeSelection();
        selectedIcon = null;
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' && selectedIcon) {
        deleteCurrentIcon();
    }
});

async function fetchIconsFromServer() {
    try {
        const apiUrl = "/api/icons/feed?offset=0&limit=20";
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return data.results;
    } catch (error) {
        console.error('Failed to fetch icons from server:', error);
        return null;
    }
}

async function renderIconsFromServer() {
    const icons = await fetchIconsFromServer();
    if (icons) {
        document.getElementById("iconsContainer").innerHTML = '';

        for (const icon of icons) {
            try {
                const response = await fetch(`/api/icons/serve?name=${encodeURIComponent(icon.filename)}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const svgContent = await response.text();

                const normalizedSVG = normalizeSVGSize(svgContent);

                // Use normalizedSVG for display, not original svgContent
                let svgIcon = `<div class="icons" data-url="${icon.filename}" data-svg="${encodeURIComponent(normalizedSVG)}">
                   ${normalizedSVG}
                </div>`;
                document.getElementById("iconsContainer").innerHTML += svgIcon;
            } catch (error) {
                console.error('Failed to render icon:', icon.filename, error);
            }
        }

        addIconClickListeners();
    }
}

async function searchAndRenderIcons(query) {
    try {
        const apiUrl = `/api/icons/search?q=${encodeURIComponent(query)}`;
        
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const searchResults = await response.json();

        document.getElementById("iconsContainer").innerHTML = '';

        for (const icon of searchResults) {
            try {
                const svgResponse = await fetch(`/api/icons/serve?name=${encodeURIComponent(icon.filename)}`);
                if (!svgResponse.ok) {
                    throw new Error(`HTTP error! status: ${svgResponse.status}`);
                }
                const svgContent = await svgResponse.text();

                const normalizedSVG = normalizeSVGSize(svgContent);

                // Use normalizedSVG for display, not original svgContent
                let svgIcon = `<div class="icons" data-url="${icon.filename}">
                   ${normalizedSVG}
                </div>`;
                document.getElementById("iconsContainer").innerHTML += svgIcon;
            } catch (error) {
                console.error('Failed to render search result:', icon.filename, error);
            }
        }

        addIconClickListeners();

    } catch (error) {
        console.error('Failed to search icons:', error);
    }
}

function normalizeSVGSize(svgContent, fillColor = '#fff', strokeColor = null) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = svgContent;
    const svgElement = tempDiv.querySelector('svg');
    
    if (svgElement) {
        const originalViewBox = svgElement.getAttribute('viewBox');
        
        svgElement.setAttribute('width', '35');
        svgElement.setAttribute('height', '35');
        
        if (!originalViewBox) {
            const width = svgElement.getAttribute('width') || '24';
            const height = svgElement.getAttribute('height') || '24';
            const numWidth = parseFloat(width);
            const numHeight = parseFloat(height);
            
            if (!isNaN(numWidth) && !isNaN(numHeight)) {
                svgElement.setAttribute('viewBox', `0 0 ${numWidth} ${numHeight}`);
            }
        }
        
        // Apply custom styling with more selective logic
        const applyCustomStyling = (element) => {
            if (element.nodeType === 1) {
                const tagName = element.tagName.toLowerCase();
                
                // Only apply to shape elements, not container elements like 'g'
                if (['path', 'circle', 'rect', 'polygon', 'ellipse', 'polyline', 'line'].includes(tagName)) {
                    const currentFill = element.getAttribute('fill');
                    const currentStroke = element.getAttribute('stroke');
                    
                    // Check if parent <g> has explicit colors - if so, don't override
                    let parentG = element.parentElement;
                    let hasParentColor = false;
                    
                    while (parentG && parentG.tagName.toLowerCase() === 'g') {
                        if (parentG.getAttribute('fill') || parentG.getAttribute('stroke')) {
                            hasParentColor = true;
                            break;
                        }
                        parentG = parentG.parentElement;
                    }
                    
                    // Only apply white fill if:
                    // 1. Element doesn't have explicit 'none' fill
                    // 2. Element doesn't already have a specific color (other than black/default)
                    // 3. Parent <g> doesn't have explicit colors
                    if (!hasParentColor && currentFill !== 'none') {
                        // Only override if it's black, default, or unset
                        if (!currentFill || currentFill === '#000' || currentFill === '#000000' || currentFill === 'black' || currentFill === 'currentColor') {
                            element.setAttribute('fill', fillColor);
                        }
                    }
                    
                    // Handle stroke similarly
                    if (strokeColor && !hasParentColor) {
                        if (currentStroke && currentStroke !== 'none') {
                            if (!currentStroke || currentStroke === '#000' || currentStroke === '#000000' || currentStroke === 'black' || currentStroke === 'currentColor') {
                                element.setAttribute('stroke', strokeColor);
                            }
                        }
                    }
                }
                
                // Recursively process children
                for (let i = 0; i < element.children.length; i++) {
                    applyCustomStyling(element.children[i]);
                }
            }
        };
        
        applyCustomStyling(svgElement);
        
        return svgElement.outerHTML;
    }

    return svgContent;
}

function addIconClickListeners() {
    const iconElements = document.querySelectorAll('#iconsContainer .icons');
    iconElements.forEach(iconElement => {
        iconElement.addEventListener('click', (e) => {
            const filename = iconElement.getAttribute('data-url') || 'unknown';
            handleIconClick(e, filename);
        });
    });
}

// Track active category filter
let activeCategory = null; // { query: string } or null

// Category filter dropdowns
document.querySelectorAll('.choiceBoxes').forEach(box => {
    box.addEventListener('click', async () => {
        const wasSelected = box.classList.contains('selected');
        document.querySelectorAll('.choiceBoxes').forEach(b => b.classList.remove('selected'));

        if (!wasSelected) {
            box.classList.add('selected');
            const label = box.querySelector('p')?.textContent.trim() || '';
            const queryMap = {
                'General Icons': null,           // null = default feed
                'Tech Icons': 'tech',
                'Devops Icons': 'devops'
            };
            const catQuery = queryMap.hasOwnProperty(label) ? queryMap[label] : label.toLowerCase();
            activeCategory = catQuery ? { query: catQuery } : null;

            const searchText = iconSearchInput.value.trim();
            if (searchText) {
                // Combine category + search text
                const combined = catQuery ? `${catQuery} ${searchText}` : searchText;
                await searchAndRenderIcons(combined);
            } else if (catQuery) {
                await searchAndRenderIcons(catQuery);
            } else {
                await renderIconsFromServer();
            }
        } else {
            // Deselected — fall back to search text or default feed
            activeCategory = null;
            const searchText = iconSearchInput.value.trim();
            if (searchText) {
                await searchAndRenderIcons(searchText);
            } else {
                await renderIconsFromServer();
            }
        }
    });
});

iconSearchInput.addEventListener('input', async (e) => {
    const query = e.target.value.trim();

    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }

    searchTimeout = setTimeout(async () => {
        if (query === '') {
            // Respect active category when search is cleared
            if (activeCategory) {
                await searchAndRenderIcons(activeCategory.query);
            } else {
                await renderIconsFromServer();
            }
        } else {
            // Combine with category if active
            const combined = activeCategory ? `${activeCategory.query} ${query}` : query;
            await searchAndRenderIcons(combined);
        }
    }, 300);
});

function handleIconClick(event, filename) {
    event.stopPropagation();

    const iconElement = event.currentTarget;
    const svgElement = iconElement.querySelector('svg');

    if (svgElement) {
        iconToPlace = svgElement.outerHTML;
        isDraggingIcon = true;
        isIconToolActive = true;

        console.log('Icon selected and ready to place:', filename);

        const iconContainer = document.getElementById('iconsToolBar');
        if (iconContainer) {
            iconContainer.classList.add('hidden');
        }

        document.body.style.cursor = 'crosshair';
    }
}



// Bridge for React sidebar to trigger icon placement
window.prepareIconPlacement = function(svgContent) {
    iconToPlace = svgContent;
    isDraggingIcon = true;
    window.isIconToolActive = true;
    document.body.style.cursor = 'crosshair';
};

// Bridge for IconShape to call selectIcon and removeSelection
window.__iconToolSelectIcon = selectIcon;
window.__iconToolRemoveSelection = removeSelection;

// Try to render legacy icons but don't fail if elements missing
try { renderIconsFromServer(); } catch(e) { /* React handles icon UI */ }

export { handleMouseDownIcon, handleMouseMoveIcon, handleMouseUpIcon, startDrag, stopDrag}