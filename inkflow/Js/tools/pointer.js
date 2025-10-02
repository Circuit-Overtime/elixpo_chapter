class PointerTool {
    constructor(canvas, ctx, elements, redrawCanvas, saveState) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.elements = elements;
        this.redrawCanvas = redrawCanvas;
        this.saveState = saveState;
        this.isDragging = false;
        this.selectedElement = null;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.animationFrameId = null;
        this.lastTimestamp = 0;
        this.ANIMATION_DURATION = 100;
        this.startDragPos = { x: 0, y: 0 };
        this.targetPos = { x: 0, y: 0 };
        this.isAnimating = false;
    }

    handleMouseDown(e) {
        const clickedX = e.offsetX;
        const clickedY = e.offsetY;
        this.selectedElement = this.getElementAtPosition(clickedX, clickedY);

        if (this.selectedElement) {
            this.isDragging = true;
            this.dragOffsetX = clickedX - this.selectedElement.x1;
            this.dragOffsetY = clickedY - this.selectedElement.y1;
            this.canvas.style.cursor = 'move';
            return true;
        }
        return false;
    }

    handleMouseMove(e) {
        if (this.isDragging && this.selectedElement) {
            const newX = e.offsetX;
            const newY = e.offsetY;

            // Calculate the movement delta
            const dx = newX - this.dragOffsetX - this.selectedElement.x1;
            const dy = newY - this.dragOffsetY - this.selectedElement.y1;

            // Move both points for all shape types
            this.selectedElement.x1 += dx;
            this.selectedElement.y1 += dy;
            this.selectedElement.x2 += dx;
            this.selectedElement.y2 += dy;

            this.redrawCanvas();
            return true;
        }
        return false;
    }

    handleMouseUp(e) {
        if (this.isDragging) {
            this.isDragging = false;
            this.selectedElement = null;
            this.saveState();
            this.updateCursorStyle();
            return true;
        }
        return false;
    }

    getElementAtPosition(x, y) {
        // Find the topmost element at the given position
        for (let i = this.elements.length - 1; i >= 0; i--) {
            const element = this.elements[i];
            if (this.isPointInElement(x, y, element)) {
                return element;
            }
        }
        return null;
    }

    isPointInElement(x, y, element) {
        const tolerance = 5;
        switch (element.type) {
            case 'line':
            case 'arrow':
                return this.isPointOnLine(x, y, element.x1, element.y1, element.x2, element.y2, tolerance);
            case 'rectangle':
                return this.isPointInRectangle(x, y, element.x1, element.y1, element.x2, element.y2);
            case 'circle':
                return this.isPointInCircle(x, y, element.x1, element.y1, element.x2, element.y2);
            case 'text':
                return this.isPointInText(x, y, element);
            case 'pencil':
                return this.isPointOnPencilStroke(x, y, element, tolerance);
            default:
                return this.isPointInRectangle(x, y, element.x1, element.y1, element.x2, element.y2);
        }
    }

    isPointOnLine(x, y, x1, y1, x2, y2, tolerance) {
        const distance = this.distanceFromPointToLine(x, y, x1, y1, x2, y2);
        return distance <= tolerance;
    }

    isPointInRectangle(x, y, x1, y1, x2, y2) {
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        return x >= minX && x <= maxX && y >= minY && y <= maxY;
    }

    isPointInCircle(x, y, x1, y1, x2, y2) {
        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;
        const radius = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)) / 2;
        const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        return distance <= radius;
    }

    isPointInText(x, y, element) {
        // Simple bounding box check for text
        const textWidth = this.ctx.measureText(element.text || '').width;
        const textHeight = 25; // Approximate text height
        return x >= element.x1 && x <= element.x1 + textWidth && 
               y >= element.y1 - textHeight && y <= element.y1;
    }

    isPointOnPencilStroke(x, y, element, tolerance) {
        // Check if point is near the pencil stroke line
        return this.distanceFromPointToLine(x, y, element.x1, element.y1, element.x2, element.y2) <= tolerance;
    }

    distanceFromPointToLine(x, y, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const length = Math.sqrt(dx * dx + dy * dy);
        
        if (length === 0) return Math.sqrt((x - x1) * (x - x1) + (y - y1) * (y - y1));
        
        const t = Math.max(0, Math.min(1, ((x - x1) * dx + (y - y1) * dy) / (length * length)));
        const projectionX = x1 + t * dx;
        const projectionY = y1 + t * dy;
        
        return Math.sqrt((x - projectionX) * (x - projectionX) + (y - projectionY) * (y - projectionY));
    }

    updateCursorStyle() {
        this.canvas.style.cursor = 'move';
    }

    animateMove() {
        const currentTime = performance.now();
        const elapsed = currentTime - this.lastTimestamp;
        const progress = Math.min(elapsed / this.ANIMATION_DURATION, 1);

        // Calculate intermediate position
        const currentX = this.selectedElement.x1 + (this.targetPos.x - this.selectedElement.x1) * progress;
        const currentY = this.selectedElement.y1 + (this.targetPos.y - this.selectedElement.y1) * progress;

        // Move the element
        const dx = currentX - this.selectedElement.x1;
        const dy = currentY - this.selectedElement.y1;

        this.selectedElement.x1 = currentX;
        this.selectedElement.y1 = currentY;
        if (this.selectedElement.x2 !== undefined) this.selectedElement.x2 += dx;
        if (this.selectedElement.y2 !== undefined) this.selectedElement.y2 += dy;

        this.redrawCanvas();

        if (progress < 1) {
            this.animationFrameId = requestAnimationFrame(() => this.animateMove());
        } else {
            this.isAnimating = false;
            cancelAnimationFrame(this.animationFrameId);
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PointerTool;
}