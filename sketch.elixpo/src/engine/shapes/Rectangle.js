/* eslint-disable */
// Rectangle shape class - extracted from drawSquare.js
// Depends on globals: svg, shapes, rough, currentShape, currentZoom, rc
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
            stroke: squareStrokecolor,
            strokeWidth: squareStrokeThicknes,
            fill: squareBackgroundColor,
            fillStyle: squareFillStyleValue,
            strokeDasharray: squareOutlineStyle === "dashed" ? "10,10" : (squareOutlineStyle === "dotted" ? "2,8" : ""),
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
         if (!this.group.parentNode) {
             svg.appendChild(this.group);
         }
         this._lastDrawn = {
            width: null,
            height: null,
            options: null
        };
        this.isBeingDrawn = false;
        this.draw(); 
    }
    draw() {
        const childrenToRemove = [];
        for (let i = 0; i < this.group.children.length; i++) {
            const child = this.group.children[i];
            if (child !== this.element) { 
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
    updateSidebar() {
        SquarecolorOptions.forEach(span => {
            const color = span.getAttribute("data-id");
            if (color === this.options.stroke) {
                span.classList.add("selected");
            } else {
                span.classList.remove("selected");
            }
        });
        backgroundColorOptionsSquare.forEach(span => {
             const color = span.getAttribute("data-id");
            if (color === this.options.fill) {
                span.classList.add("selected");
            } else {
                span.classList.remove("selected");
            }
        });

        fillStyleOptions.forEach(span => {
            const style = span.getAttribute("data-id");
            if (style === this.options.fillStyle) {
                 span.classList.add("selected");
             } else {
                 span.classList.remove("selected");
             }
        });

        squareStrokeThicknessValue.forEach(span => {
             const thickness = parseInt(span.getAttribute("data-id"));
            if (thickness === this.options.strokeWidth) {
                 span.classList.add("selected");
             } else {
                 span.classList.remove("selected");
             }
        });

        squareOutlineStyleValue.forEach(span => {
            const style = span.getAttribute("data-id");
            let currentStyle = "solid";
            if (this.options.strokeDasharray === "10,10") currentStyle = "dashed";
            else if (this.options.strokeDasharray === "2,8") currentStyle = "dotted";

            if (style === currentStyle) {
                span.classList.add("selected");
            } else {
                span.classList.remove("selected");
            }
        });
    }
}

export { Rectangle };
