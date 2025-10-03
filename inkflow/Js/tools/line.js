class LineTool {
    constructor(canvas, ctx, elements, redrawCanvas, saveState) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.elements = elements;
        this.redrawCanvas = redrawCanvas;
        this.saveState = saveState;
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
        this.currentElement = null;
    }

    handleMouseDown(e, selectedColor, selectedStrokeWidth, currentOpacity) {
        this.isDrawing = true;
        this.startX = e.offsetX;
        this.startY = e.offsetY;
        
        this.currentElement = {
            type: 'line',
            x1: this.startX,
            y1: this.startY,
            x2: this.startX,
            y2: this.startY,
            color: selectedColor,
            roughness: 0.5,
            strokeWidth: selectedStrokeWidth,
            fillStyle: 'solid',
            fillWeight: 0.5,
            opacity: currentOpacity
        };
        return true;
    }

    handleMouseMove(e) {
        if (!this.isDrawing || !this.currentElement) return false;

        this.currentElement.x2 = e.offsetX;
        this.currentElement.y2 = e.offsetY;
        this.redrawCanvas();
        return true;
    }

    handleMouseUp(e) {
        if (!this.isDrawing) return false;
        
        this.isDrawing = false;
        if (this.currentElement) {
            this.currentElement.x2 = e.offsetX;
            this.currentElement.y2 = e.offsetY;
            this.elements.push(this.currentElement);
        }
        this.currentElement = null;
        this.saveState();
        this.redrawCanvas();
        return true;
    }

    drawFluidLine(ctx, x1, y1, x2, y2, options) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = options.stroke;
        ctx.lineWidth = options.strokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }

    drawElement(element) {
        const options = {
            stroke: element.color,
            roughness: element.roughness || 0.5,
            strokeWidth: element.strokeWidth,
            fillStyle: 'solid',
            fillWeight: 0.5,
            bowing: 0.5,
            curveFitting: 1,
            simplification: 0.5,
            fill: element.fillColor || 'transparent'
        };

        this.ctx.globalAlpha = element.opacity || 1;
        this.drawFluidLine(this.ctx, element.x1, element.y1, element.x2, element.y2, options);
        this.ctx.globalAlpha = 1;
    }

    updateCursorStyle() {
        this.canvas.style.cursor = 'crosshair';
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LineTool;
}