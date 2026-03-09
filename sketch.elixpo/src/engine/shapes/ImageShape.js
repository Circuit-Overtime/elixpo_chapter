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
        // Remove any selection UI if needed
        removeSelectionOutline();
    }

    selectShape() {
        // Select the image
        selectImage({ target: this.element, stopPropagation: () => {} });
    }
}

export { ImageShape };
