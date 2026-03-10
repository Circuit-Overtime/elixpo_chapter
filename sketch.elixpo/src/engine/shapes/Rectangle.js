/* eslint-disable */
// Rectangle shape class - extracted from drawSquare.js
// Depends on globals: svg, shapes, rough, currentShape, currentZoom, rc

// Create local rc from globals; tool-state vars default to false
const rc = rough.svg(svg);
let isDraggingShapeSquare = false;
let isResizingShapeSquare = false;
let isRotatingShapeSquare = false;
let hoveredFrame = null;
const SquarecolorOptions = document.querySelectorAll(".squareStrokeSpan");
const backgroundColorOptionsSquare = document.querySelectorAll(".squareBackgroundSpan");
const fillStyleOptions = document.querySelectorAll(".squareFillStyleSpan");
const squareStrokeThicknessValue = document.querySelectorAll(".squareStrokeThickSpan");
const squareOutlineStyleValue = document.querySelectorAll(".squareOutlineStyle");
// Depends on globals: squareStrokecolor, squareBackgroundColor, squareFillStyleValue, squareStrokeThicknes, squareOutlineStyle
// Depends on globals: isDraggingShapeSquare, isResizingShapeSquare, isRotatingShapeSquare
// Depends on globals: squareSideBar, disableAllSideBars
// Depends on DOM query: SquarecolorOptions, backgroundColorOptionsSquare, fillStyleOptions, squareStrokeThicknessValue, squareOutlineStyleValue

class Rectangle {
    constructor(x, y, width, height, options = {}) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.options = {
            roughness: 1.5,
            stroke: "#fff",
            strokeWidth: 2,
            fill: "transparent",
            fillStyle: "none",
            strokeDasharray: "",
            ...options
        };
        this.element = null;
        this.isSelected = false;
        this.rotation = 0;
        this.group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.anchors = [];
        this.rotationAnchor = null;
        this.selectionPadding = 8;
        this.selectionOutline = null;
        this.shapeName = 'rectangle';
        this.shapeID = `rectangle-${String(Date.now()).slice(0, 8)}-${Math.floor(Math.random() * 10000)}`;
        this.group.setAttribute('id', this.shapeID);

        // Embedded label support
        this.label = options.label || '';
        this.labelElement = null;
        this.labelColor = options.labelColor || '#e0e0e0';
        this.labelFontSize = options.labelFontSize || 14;
        this._isEditingLabel = false;
        this._hitArea = null;

         if (!this.group.parentNode) {
             svg.appendChild(this.group);
         }
         this._lastDrawn = {
            width: null,
            height: null,
            options: null
        };
        this.isBeingDrawn = false;
        this._setupLabelDblClick();
        this.draw();
    }
    draw() {
        const childrenToRemove = [];
        for (let i = 0; i < this.group.children.length; i++) {
            const child = this.group.children[i];
            if (child !== this.element && child !== this.labelElement && child !== this._hitArea) {
                 childrenToRemove.push(child);
            }
        }
         childrenToRemove.forEach(child => this.group.removeChild(child));

        const optionsString = JSON.stringify(this.options);
        const isInitialDraw = this.element === null;
        const optionsChanged = optionsString !== this._lastDrawn.options;
        const sizeChanged = this.width !== this._lastDrawn.width || this.height !== this._lastDrawn.height;

        // Only regenerate rough element if it's not being actively drawn OR if options changed OR initial draw
        if (isInitialDraw || optionsChanged || (!this.isBeingDrawn && sizeChanged)) {
            if (this.element && this.element.parentNode === this.group) {
                this.group.removeChild(this.element);
            }
            const roughRect = rc.rectangle(0, 0, this.width, this.height, this.options);
            this.element = roughRect;
            this.group.appendChild(roughRect);

            // Cache the values
            this._lastDrawn.width = this.width;
            this._lastDrawn.height = this.height;
            this._lastDrawn.options = optionsString;
        }

        // Hit area for dblclick detection (transparent rect that captures pointer events)
        if (!this._hitArea) {
            this._hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            this._hitArea.setAttribute('fill', 'transparent');
            this._hitArea.setAttribute('stroke', 'none');
            this._hitArea.setAttribute('style', 'pointer-events: all;');
            this.group.insertBefore(this._hitArea, this.group.firstChild);
        }
        this._hitArea.setAttribute('x', 0);
        this._hitArea.setAttribute('y', 0);
        this._hitArea.setAttribute('width', this.width);
        this._hitArea.setAttribute('height', this.height);

        // Update embedded label
        this._updateLabelElement();

        const rotateCenterX = this.width / 2;
        const rotateCenterY = this.height / 2;
        this.group.setAttribute('transform', `translate(${this.x}, ${this.y}) rotate(${this.rotation}, ${rotateCenterX}, ${rotateCenterY})`);

        if (this.isSelected) {
            this.addAnchors();
        }
        if (!this.group.parentNode) {
            this.updateAttachedArrows();
            svg.appendChild(this.group);
        }
    }

    _updateLabelElement() {
        if (!this.label) {
            // Remove label element if label is empty
            if (this.labelElement && this.labelElement.parentNode === this.group) {
                this.group.removeChild(this.labelElement);
                this.labelElement = null;
            }
            return;
        }

        if (!this.labelElement) {
            this.labelElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            this.labelElement.setAttribute('class', 'shape-label');
            this.labelElement.setAttribute('pointer-events', 'none');
        }

        // Position at center of rectangle
        this.labelElement.setAttribute('x', this.width / 2);
        this.labelElement.setAttribute('y', this.height / 2);
        this.labelElement.setAttribute('text-anchor', 'middle');
        this.labelElement.setAttribute('dominant-baseline', 'central');
        this.labelElement.setAttribute('fill', this.labelColor);
        this.labelElement.setAttribute('font-size', this.labelFontSize);
        this.labelElement.setAttribute('font-family', 'lixFont, sans-serif');
        this.labelElement.textContent = this.label;

        // Ensure label is after the rough element (on top)
        if (this.labelElement.parentNode !== this.group) {
            // Insert after element but before any anchors
            if (this.element && this.element.nextSibling) {
                this.group.insertBefore(this.labelElement, this.element.nextSibling);
            } else {
                this.group.appendChild(this.labelElement);
            }
        }
    }

    _setupLabelDblClick() {
        this.group.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.startLabelEdit();
        });
    }

    startLabelEdit() {
        if (this._isEditingLabel) return;
        this._isEditingLabel = true;

        // Hide label element during editing
        if (this.labelElement) {
            this.labelElement.setAttribute('visibility', 'hidden');
        }

        // Get shape's screen position via CTM
        const ctm = this.group.getScreenCTM();
        if (!ctm) { this._isEditingLabel = false; return; }

        // Map the shape corners to screen coords
        const pt1 = svg.createSVGPoint();
        pt1.x = 0; pt1.y = 0;
        const screenTL = pt1.matrixTransform(ctm);
        const pt2 = svg.createSVGPoint();
        pt2.x = this.width; pt2.y = this.height;
        const screenBR = pt2.matrixTransform(ctm);

        const screenW = Math.abs(screenBR.x - screenTL.x);
        const screenH = Math.abs(screenBR.y - screenTL.y);
        const screenX = Math.min(screenTL.x, screenBR.x);
        const screenY = Math.min(screenTL.y, screenBR.y);

        // Create HTML overlay
        const overlay = document.createElement('div');
        overlay.className = 'shape-label-editor';
        overlay.style.cssText = `
            position: fixed; z-index: 10000;
            left: ${screenX}px; top: ${screenY}px;
            width: ${screenW}px; height: ${screenH}px;
            display: flex; align-items: center; justify-content: center;
            pointer-events: auto;
        `;

        const canvasBg = window.getComputedStyle(svg).backgroundColor || '#000';
        const input = document.createElement('div');
        input.setAttribute('contenteditable', 'true');
        input.style.cssText = `
            max-width: ${screenW - 8}px; min-width: 30px; min-height: 20px;
            background: ${canvasBg}; border: none;
            outline: none; padding: 2px 6px;
            color: ${this.labelColor}; font-size: ${Math.max(12, this.labelFontSize * (screenW / Math.max(this.width, 1)))}px;
            font-family: lixFont, sans-serif; text-align: center;
            white-space: pre-wrap; word-break: break-word;
            cursor: text;
        `;
        if (this.label) {
            input.textContent = this.label;
        } else {
            input.innerHTML = '&nbsp;';
        }

        overlay.appendChild(input);
        document.body.appendChild(overlay);

        // Focus and select all text
        setTimeout(() => {
            input.focus();
            const sel = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(input);
            sel.removeAllRanges();
            sel.addRange(range);
        }, 10);

        const finishEdit = () => {
            const newText = input.textContent.trim().replace(/\u00A0/g, '');
            this.label = newText;
            this._isEditingLabel = false;

            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            if (this.labelElement) this.labelElement.setAttribute('visibility', 'visible');
            this.draw();
        };

        input.addEventListener('blur', finishEdit);
        input.addEventListener('keydown', (e) => {
            e.stopPropagation();
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); input.blur(); }
            if (e.key === 'Escape') { input.textContent = this.label; input.blur(); }
        });
        input.addEventListener('mousedown', (e) => e.stopPropagation());
        input.addEventListener('mousemove', (e) => e.stopPropagation());
        input.addEventListener('mouseup', (e) => e.stopPropagation());
    }

    setLabel(text, color, fontSize) {
        this.label = text || '';
        if (color) this.labelColor = color;
        if (fontSize) this.labelFontSize = fontSize;
        this.draw();
    }

    setDrawingState(isDrawing) {
        this.isBeingDrawn = isDrawing;
    }

    getRotatedCursor(direction, angle) {
        const directions = ['ns', 'nesw', 'ew', 'nwse'];
        angle = angle % 360;
        if (angle < 0) angle += 360;

        const baseDirectionMap = {
            '0': 'nwse', '1': 'nesw', 
            '2': 'nesw', '3': 'nwse', 
            '4': 'ns',   '5': 'ns',     
            '6': 'ew',   '7': 'ew'      
        };
        const baseDirection = baseDirectionMap[direction];
        let effectiveAngle = angle; 
        if (baseDirection === 'nesw') {
            effectiveAngle += 45;
        } else if (baseDirection === 'ew') {
            effectiveAngle += 90;
        } else if (baseDirection === 'nwse') {
            effectiveAngle += 135;
        }
        effectiveAngle = effectiveAngle % 360;
        if (effectiveAngle < 0) effectiveAngle += 360;
        const index = Math.round(effectiveAngle / 45) % 4; 
         let finalIndex;
         if (effectiveAngle >= 337.5 || effectiveAngle < 22.5) finalIndex = 0; 
         else if (effectiveAngle >= 22.5 && effectiveAngle < 67.5) finalIndex = 1; 
         else if (effectiveAngle >= 67.5 && effectiveAngle < 112.5) finalIndex = 2; 
         else if (effectiveAngle >= 112.5 && effectiveAngle < 157.5) finalIndex = 3;
         else if (effectiveAngle >= 157.5 && effectiveAngle < 202.5) finalIndex = 0; 
         else if (effectiveAngle >= 202.5 && effectiveAngle < 247.5) finalIndex = 1; 
         else if (effectiveAngle >= 247.5 && effectiveAngle < 292.5) finalIndex = 2; 
         else if (effectiveAngle >= 292.5 && effectiveAngle < 337.5) finalIndex = 3; 
         else finalIndex = 0; 
        return directions[finalIndex];
    }
    addAnchors() {
        const anchorSize = 10;
        const anchorStrokeWidth = 2;
        const self = this;
        const expandedX = -this.selectionPadding; 
        const expandedY = -this.selectionPadding; 
        const expandedWidth = this.width + 2 * this.selectionPadding;
        const expandedHeight = this.height + 2 * this.selectionPadding;

        const positions = [
            { x: expandedX, y: expandedY }, 
            { x: expandedX + expandedWidth, y: expandedY }, 
            { x: expandedX, y: expandedY + expandedHeight }, 
            { x: expandedX + expandedWidth, y: expandedY + expandedHeight }, 
            { x: expandedX + expandedWidth / 2, y: expandedY }, 
            { x: expandedX + expandedWidth / 2, y: expandedY + expandedHeight }, 
            { x: expandedX, y: expandedHeight / 2 + expandedY }, 
            { x: expandedX + expandedWidth, y: expandedHeight / 2 + expandedY } 
        ];

        const outlinePoints = [
            [positions[0].x, positions[0].y],
            [positions[1].x, positions[1].y],
            [positions[3].x, positions[3].y],
            [positions[2].x, positions[2].y],
            [positions[0].x, positions[0].y]
        ];

        this.anchors.forEach(anchor => {
             if (anchor.parentNode === this.group) {
                 this.group.removeChild(anchor);
             }
         });
          if (this.rotationAnchor && this.rotationAnchor.parentNode === this.group) {
             this.group.removeChild(this.rotationAnchor);
         }
          if (this.selectionOutline && this.selectionOutline.parentNode === this.group) {
             this.group.removeChild(this.selectionOutline);
         }

        this.anchors = [];
        const anchorDirections = {
            0: 'nwse', 
            1: 'nesw', 
            2: 'nesw', 
            3: 'nwse', 
            4: 'ns',   
            5: 'ns',   
            6: 'ew',   
            7: 'ew'    
        };

        positions.forEach((pos, i) => {
            const anchor = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            anchor.setAttribute('x', pos.x - anchorSize / 2);
            anchor.setAttribute('y', pos.y - anchorSize / 2);
            anchor.setAttribute('width', anchorSize);
            anchor.setAttribute('height', anchorSize);
            anchor.setAttribute('class', 'anchor');
            anchor.setAttribute('data-index', i);
            anchor.setAttribute('fill', '#121212');
            anchor.setAttribute('stroke', '#5B57D1');
            anchor.setAttribute('stroke-width', anchorStrokeWidth);
            anchor.setAttribute('style', 'pointer-events: all;'); 

            anchor.addEventListener('mouseover', function () {
                const index = this.getAttribute('data-index');
                const baseDirection = anchorDirections[index];
                const rotatedCursor = self.getRotatedCursor(index, self.rotation); 
                svg.style.cursor = rotatedCursor + '-resize';
            });

            anchor.addEventListener('mouseout', function () {
                 if (!isResizingShapeSquare && !isDraggingShapeSquare && !isRotatingShapeSquare) {
                     svg.style.cursor = 'default';
                 }
            });

            this.group.appendChild(anchor);
            this.anchors[i] = anchor;
        });
        const rotationAnchorPos = { x: expandedX + expandedWidth / 2, y: expandedY - 30 };
        this.rotationAnchor = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        this.rotationAnchor.setAttribute('cx', rotationAnchorPos.x);
        this.rotationAnchor.setAttribute('cy', rotationAnchorPos.y);
        this.rotationAnchor.setAttribute('r', 8);
        this.rotationAnchor.setAttribute('class', 'rotate-anchor');
        this.rotationAnchor.setAttribute('fill', '#121212');
        this.rotationAnchor.setAttribute('stroke', '#5B57D1');
        this.rotationAnchor.setAttribute('stroke-width', anchorStrokeWidth);
        this.rotationAnchor.setAttribute('style', 'pointer-events: all;');
        this.group.appendChild(this.rotationAnchor);

        this.rotationAnchor.addEventListener('mouseover', function () {
             if (!isResizingShapeSquare && !isDraggingShapeSquare && !isRotatingShapeSquare) {
                 svg.style.cursor = 'grab';
             }
        });
        this.rotationAnchor.addEventListener('mouseout', function () {
            if (!isResizingShapeSquare && !isDraggingShapeSquare && !isRotatingShapeSquare) {
                svg.style.cursor = 'default';
            }
        });

        const pointsAttr = outlinePoints.map(p => p.join(',')).join(' ');
        const outline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        outline.setAttribute('points', pointsAttr);
        outline.setAttribute('fill', 'none');
        outline.setAttribute('stroke', '#5B57D1');
        outline.setAttribute('stroke-width', 1.5);
        outline.setAttribute('stroke-dasharray', '4 2');
        outline.setAttribute('style', 'pointer-events: none;'); 
        this.group.appendChild(outline);
        this.selectionOutline = outline;

        // Show relevant sidebar
        disableAllSideBars();
        squareSideBar.classList.remove("hidden");
        if (window.__showSidebarForShape) window.__showSidebarForShape('rectangle');
        this.updateSidebar();
    }

    removeSelection() {
        // Remove selection elements (anchors, outline, rotation anchor) from the group
        this.anchors.forEach(anchor => {
             if (anchor.parentNode === this.group) {
                 this.group.removeChild(anchor);
             }
         });
         if (this.rotationAnchor && this.rotationAnchor.parentNode === this.group) {
            this.group.removeChild(this.rotationAnchor);
         }
         if (this.selectionOutline && this.selectionOutline.parentNode === this.group) {
            this.group.removeChild(this.selectionOutline);
         }
        this.anchors = [];
        this.rotationAnchor = null;
        this.selectionOutline = null;
        this.isSelected = false;
    }

    contains(x, y) {
         if (!this.element) return false; 
        const CTM = this.group.getCTM();
        if (!CTM) return false; 
        const inverseCTM = CTM.inverse();

        const svgPoint = svg.createSVGPoint();
        svgPoint.x = x;
        svgPoint.y = y;
        const transformedPoint = svgPoint.matrixTransform(inverseCTM);
        const tolerance = 5;
        return transformedPoint.x >= -tolerance && transformedPoint.x <= this.width + tolerance &&
               transformedPoint.y >= -tolerance && transformedPoint.y <= this.height + tolerance;
    }

     // Helper to check if a point is near an anchor
     isNearAnchor(x, y) {
         if (!this.isSelected) return null;
         const buffer = 10; 
         const anchorSize = 10; 

         // Iterate through anchors
         for (let i = 0; i < this.anchors.length; i++) {
             const anchor = this.anchors[i];
             const anchorLocalX = parseFloat(anchor.getAttribute('x')) + anchorSize / 2;
             const anchorLocalY = parseFloat(anchor.getAttribute('y')) + anchorSize / 2;
             const svgPoint = svg.createSVGPoint();
             svgPoint.x = anchorLocalX;
             svgPoint.y = anchorLocalY;
             const transformedPoint = svgPoint.matrixTransform(this.group.getCTM());
             const anchorLeft = transformedPoint.x - anchorSize/2 - buffer;
             const anchorRight = transformedPoint.x + anchorSize/2 + buffer;
             const anchorTop = transformedPoint.y - anchorSize/2 - buffer;
             const anchorBottom = transformedPoint.y + anchorSize/2 + buffer;
             if (x >= anchorLeft && x <= anchorRight && y >= anchorTop && y <= anchorBottom) {
                 return { type: 'resize', index: i };
             }
         }

         // Check rotation anchor
         if (this.rotationAnchor) {
             const rotateAnchorLocalX = parseFloat(this.rotationAnchor.getAttribute('cx'));
             const rotateAnchorLocalY = parseFloat(this.rotationAnchor.getAttribute('cy'));
             const svgPoint = svg.createSVGPoint();
             svgPoint.x = rotateAnchorLocalX;
             svgPoint.y = rotateAnchorLocalY;
             const transformedPoint = svgPoint.matrixTransform(this.group.getCTM());
             const rotateAnchorRadius = parseFloat(this.rotationAnchor.getAttribute('r'));
             const distSq = (x - transformedPoint.x)**2 + (y - transformedPoint.y)**2;
             if (distSq <= (rotateAnchorRadius + buffer)**2) {
                 return { type: 'rotate' };
             }
         }

         return null;
     }


move(dx, dy) {
    this.x += dx;
    this.y += dy;
    this.updateAttachedArrows();
    
    // Only update frame containment if we're actively dragging the shape itself
    // and not being moved by a parent frame
    if (isDraggingShapeSquare && !this.isBeingMovedByFrame) {
        this.updateFrameContainment();
    }

    this.draw();
}

updateFrameContainment() {
    // Don't update if we're being moved by a frame
    if (this.isBeingMovedByFrame) return;
    
    let targetFrame = null;
    
    // Find which frame this shape is over
    shapes.forEach(shape => {
        if (shape.shapeName === 'frame' && shape.isShapeInFrame(this)) {
            targetFrame = shape;
        }
    });
    
    // If we have a parent frame and we're being dragged, temporarily remove clipping
    if (this.parentFrame && isDraggingShapeSquare) {
        this.parentFrame.temporarilyRemoveFromFrame(this);
    }
    
    // Update frame highlighting
    if (hoveredFrame && hoveredFrame !== targetFrame) {
        hoveredFrame.removeHighlight();
    }
    
    if (targetFrame && targetFrame !== hoveredFrame) {
        targetFrame.highlightFrame();
    }
    
    hoveredFrame = targetFrame;
}

    updatePosition(anchorIndex, newMouseX, newMouseY) {
        const CTM = this.group.getCTM();
        if (!CTM) return; 
        const inverseCTM = CTM.inverse();
        const svgPoint = svg.createSVGPoint();
        svgPoint.x = newMouseX;
        svgPoint.y = newMouseY;
        const transformedPoint = svgPoint.matrixTransform(inverseCTM);
        let oldX = 0; 
        let oldY = 0; 
        let oldWidth = this.width;
        let oldHeight = this.height;

        let newLocalX = 0; 
        let newLocalY = 0; 
        let newWidth = oldWidth;
        let newHeight = oldHeight;

        switch (anchorIndex) {
            case 0: 
                newLocalX = transformedPoint.x;
                newLocalY = transformedPoint.y;
                newWidth = oldWidth - newLocalX;
                newHeight = oldHeight - newLocalY;
                break;
            case 1: 
                newLocalY = transformedPoint.y;
                newWidth = transformedPoint.x - oldX;
                newHeight = oldHeight - newLocalY;
                break;
            case 2: 
                newLocalX = transformedPoint.x;
                newWidth = oldWidth - newLocalX;
                newHeight = transformedPoint.y - oldY;
                break;
            case 3: 
                newWidth = transformedPoint.x - oldX;
                newHeight = transformedPoint.y - oldY;
                break;
            case 4: 
                newLocalY = transformedPoint.y;
                newHeight = oldHeight - newLocalY;
                break;
            case 5: 
                newHeight = transformedPoint.y - oldY;
                break;
            case 6: 
                newLocalX = transformedPoint.x;
                newWidth = oldWidth - newLocalX;
                break;
            case 7: 
                newWidth = transformedPoint.x - oldX;
                break;
        }
        if (newWidth < 0) {
            this.x += newLocalX + newWidth; 
            this.width = Math.abs(newWidth);
        } else {
             this.x += newLocalX; 
             this.width = newWidth;
        }

        if (newHeight < 0) {
            this.y += newLocalY + newHeight; 
            this.height = Math.abs(newHeight);
        } else {
            this.y += newLocalY; 
            this.height = newHeight;
        }
        this.updateAttachedArrows();
    }

        updateAttachedArrows() {
        shapes.forEach(shape => {
            if (shape && shape.shapeName === 'arrow' && typeof shape.updateAttachments === 'function') {
                
                if ((shape.attachedToStart && shape.attachedToStart.shape === this) ||
                    (shape.attachedToEnd && shape.attachedToEnd.shape === this)) {
                    shape.updateAttachments();
                }
            }
        });
    }   

    rotate(angle) {
        angle = angle % 360;
        if (angle < 0) angle += 360;
        this.rotation = angle;
    }

     // Method to update the sidebar based on the shape's current options
    // No-op: React sidebar handles UI updates via Zustand store
    updateSidebar() {}
}

export { Rectangle };
