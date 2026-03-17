/* eslint-disable */
// ImageShape class - extracted from imageTool.js
// Depends on globals: svg, shapes, currentShape

import { updateAttachedArrows as updateArrowsForShape } from "../tools/arrowTool.js";
let isDragging = false;
let hoveredFrameImage = null;
function selectImage() {} // stub - image selection handled by imageTool

class ImageShape {
    constructor(element) {
        this.element = element;
        this.shapeName = 'image';
        this.shapeID = element.shapeID || `image-${String(Date.now()).slice(0, 8)}-${Math.floor(Math.random() * 10000)}`;

        // Frame attachment properties
        this.parentFrame = null;

        // Upload pipeline state
        this.uploadStatus = 'pending'; // 'pending' | 'uploading' | 'done' | 'failed'
        this.uploadAbortController = null;
        this._uploadIndicator = null;

        // Update element attributes
        this.element.setAttribute('type', 'image');
        this.element.shapeID = this.shapeID;

        // Create a group wrapper for the image to work with frames properly
        this.group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        this.group.setAttribute('id', this.shapeID);

        // Move the image element into the group
        if (this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.group.appendChild(this.element);
        svg.appendChild(this.group);
    }

    showUploadIndicator() {
        if (this._uploadIndicator) return;
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'upload-indicator');

        const x = this.x + 6;
        const y = this.y + 6;

        // Background circle
        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        bg.setAttribute('cx', x + 10);
        bg.setAttribute('cy', y + 10);
        bg.setAttribute('r', 12);
        bg.setAttribute('fill', 'rgba(0,0,0,0.7)');
        g.appendChild(bg);

        // Caution/loading icon (⚡ style triangle)
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        icon.setAttribute('points', `${x+10},${y+3} ${x+17},${y+16} ${x+3},${y+16}`);
        icon.setAttribute('fill', 'none');
        icon.setAttribute('stroke', '#FBBF24');
        icon.setAttribute('stroke-width', '1.5');
        icon.setAttribute('stroke-linejoin', 'round');
        g.appendChild(icon);

        // Exclamation mark inside
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x + 10);
        line.setAttribute('y1', y + 8);
        line.setAttribute('x2', x + 10);
        line.setAttribute('y2', y + 12);
        line.setAttribute('stroke', '#FBBF24');
        line.setAttribute('stroke-width', '1.5');
        line.setAttribute('stroke-linecap', 'round');
        g.appendChild(line);

        const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dot.setAttribute('cx', x + 10);
        dot.setAttribute('cy', y + 14.5);
        dot.setAttribute('r', 0.8);
        dot.setAttribute('fill', '#FBBF24');
        g.appendChild(dot);

        // Pulsing animation
        const animate = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        animate.setAttribute('attributeName', 'opacity');
        animate.setAttribute('values', '1;0.4;1');
        animate.setAttribute('dur', '1.5s');
        animate.setAttribute('repeatCount', 'indefinite');
        g.appendChild(animate);

        // Apply same transform as image (rotation)
        const transform = this.element.getAttribute('transform');
        if (transform) g.setAttribute('transform', transform);

        g.style.pointerEvents = 'none';
        this.group.appendChild(g);
        this._uploadIndicator = g;
    }

    removeUploadIndicator() {
        if (this._uploadIndicator && this._uploadIndicator.parentNode) {
            this._uploadIndicator.parentNode.removeChild(this._uploadIndicator);
        }
        this._uploadIndicator = null;
    }

    updateUploadIndicatorPosition() {
        if (!this._uploadIndicator) return;
        const x = this.x + 6;
        const y = this.y + 6;

        const bg = this._uploadIndicator.querySelector('circle');
        if (bg) { bg.setAttribute('cx', x + 10); bg.setAttribute('cy', y + 10); }

        const icon = this._uploadIndicator.querySelector('polygon');
        if (icon) icon.setAttribute('points', `${x+10},${y+3} ${x+17},${y+16} ${x+3},${y+16}`);

        const line = this._uploadIndicator.querySelector('line');
        if (line) {
            line.setAttribute('x1', x + 10); line.setAttribute('y1', y + 8);
            line.setAttribute('x2', x + 10); line.setAttribute('y2', y + 12);
        }

        const dots = this._uploadIndicator.querySelectorAll('circle');
        if (dots[1]) { dots[1].setAttribute('cx', x + 10); dots[1].setAttribute('cy', y + 14.5); }

        const transform = this.element.getAttribute('transform');
        if (transform) this._uploadIndicator.setAttribute('transform', transform);
    }
    
    // Position and dimension properties for frame compatibility
    get x() {
        return parseFloat(this.element.getAttribute('x'));
    }
    
    set x(value) {
        this.element.setAttribute('x', value);
        this.element.setAttribute('data-shape-x', value);
    }
    
    get y() {
        return parseFloat(this.element.getAttribute('y'));
    }
    
    set y(value) {
        this.element.setAttribute('y', value);
        this.element.setAttribute('data-shape-y', value);
    }
    
    get width() {
        return parseFloat(this.element.getAttribute('width'));
    }
    
    set width(value) {
        this.element.setAttribute('width', value);
        this.element.setAttribute('data-shape-width', value);
    }
    
    get height() {
        return parseFloat(this.element.getAttribute('height'));
    }
    
    set height(value) {
        this.element.setAttribute('height', value);
        this.element.setAttribute('data-shape-height', value);
    }
    
    get rotation() {
        const transform = this.element.getAttribute('transform');
        if (transform) {
            const rotateMatch = transform.match(/rotate\(([^,]+)/);
            if (rotateMatch) {
                return parseFloat(rotateMatch[1]);
            }
        }
        return 0;
    }
    
    set rotation(value) {
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        this.element.setAttribute('transform', `rotate(${value}, ${centerX}, ${centerY})`);
        this.element.setAttribute('data-shape-rotation', value);
    }

    move(dx, dy) {
        this.x += dx;
        this.y += dy;

        // Update transform for rotation
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height / 2;
        this.element.setAttribute('transform', `rotate(${this.rotation}, ${centerX}, ${centerY})`);

        // Only update frame containment if we're actively dragging the shape itself
        // and not being moved by a parent frame
        if (isDragging && !this.isBeingMovedByFrame) {
            this.updateFrameContainment();
        }

        this.updateAttachedArrows();
    }

    updateAttachedArrows() {
        updateArrowsForShape(this);
    }

    updateFrameContainment() {
        // Don't update if we're being moved by a frame
        if (this.isBeingMovedByFrame) return;
        
        let targetFrame = null;
        
        // Find which frame this shape is over
        if (typeof shapes !== 'undefined' && Array.isArray(shapes)) {
            shapes.forEach(shape => {
                if (shape.shapeName === 'frame' && shape.isShapeInFrame(this)) {
                    targetFrame = shape;
                }
            });
        }
        
        // If we have a parent frame and we're being dragged, temporarily remove clipping
        if (this.parentFrame && isDragging) {
            this.parentFrame.temporarilyRemoveFromFrame(this);
        }
        
        // Update frame highlighting
        if (hoveredFrameImage && hoveredFrameImage !== targetFrame) {
            hoveredFrameImage.removeHighlight();
        }
        
        if (targetFrame && targetFrame !== hoveredFrameImage) {
            targetFrame.highlightFrame();
        }
        
        hoveredFrameImage = targetFrame;
    }

    contains(x, y) {
        const imgX = this.x;
        const imgY = this.y;
        const imgWidth = this.width;
        const imgHeight = this.height;
        
        // Simple bounding box check (could be enhanced for rotation)
        return x >= imgX && x <= imgX + imgWidth && y >= imgY && y <= imgY + imgHeight;
    }

    // Add draw method for consistency with other shapes
    draw() {
        // Images don't need redrawing like other shapes, but we need this method for consistency
        // Update any visual state if needed
    }

    // Add methods for frame compatibility
    removeSelection() {
        // Remove selection outlines from SVG
        svg.querySelectorAll(".selection-outline").forEach(el => el.remove());
        // Remove resize/rotation anchors if present
        svg.querySelectorAll(".resize-anchor, .rotation-anchor").forEach(el => el.remove());
    }

    selectShape() {
        // Select the image
        selectImage({ target: this.element, stopPropagation: () => {} });
    }
}

export { ImageShape };
