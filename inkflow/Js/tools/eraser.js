class EraserTool {
    constructor(canvas, ctx, elements, redrawCanvas, saveState) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.elements = elements;
        this.redrawCanvas = redrawCanvas;
        this.saveState = saveState;
        this.eraserRadius = 20;
        this.hoveredElement = null;
    }

    handleMouseDown(e) {
        const erasedElement = this.getElementAtPosition(e.offsetX, e.offsetY);
        if (erasedElement) {
            this.removeElement(erasedElement);
            return true;
        }
        return false;
    }

    handleMouseMove(e) {
        // Update hovered element for visual feedback
        this.hoveredElement = this.getElementAtPosition(e.offsetX, e.offsetY);
        this.showEraserRadius(e);
        return true;
    }

    handleMouseUp(e) {
        this.hoveredElement = null;
        return false;
    }

    getElementAtPosition(x, y) {
        for (let i = this.elements.length - 1; i >= 0; i--) {
            const element = this.elements[i];
            if (this.isWithinEraserRadius(x, y, element)) {
                return element;
            }
        }
        return null;
    }

    isWithinEraserRadius(x, y, element) {
        const distance = Math.sqrt(
            Math.pow(x - element.x1, 2) + Math.pow(y - element.y1, 2)
        );
        return distance <= this.eraserRadius;
    }

    removeElement(element) {
        const index = this.elements.indexOf(element);
        if (index > -1) {
            this.elements.splice(index, 1);
            this.saveState();
            this.redrawCanvas();
        }
    }

    showEraserRadius(e) {
        this.redrawCanvas();
        
        // Draw eraser preview circle
        this.ctx.beginPath();
        this.ctx.arc(e.offsetX, e.offsetY, this.eraserRadius, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(69, 69, 69, 0.5)';
        this.ctx.fillStyle = 'rgba(69, 69, 69, 0.5)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        this.ctx.fill();
    }

    drawElement(element) {
        // Eraser tool doesn't draw elements, it removes them
        // This method is kept for consistency with other tools
    }

    updateCursorStyle() {
        this.canvas.style.cursor = 'none'; // Hide cursor since we show custom eraser circle
    }

    // Special rendering for hovered elements
    renderHoveredElement() {
        if (this.hoveredElement && this.hoveredElement.type === 'pencil') {
            this.ctx.globalAlpha = 0.3;
            this.drawElement(this.hoveredElement);
            this.ctx.globalAlpha = 1;
        }
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = EraserTool;
}