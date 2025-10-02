class ArrowTool {
    constructor(canvas, ctx, elements, redrawCanvas, saveState) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.elements = elements;
        this.redrawCanvas = redrawCanvas;
        this.saveState = saveState;
        this.isDrawing = false;
        this.startX = 0;
        this.startY = 0;
    }

    handleMouseDown(e) {
        this.isDrawing = true;
        this.startX = e.offsetX;
        this.startY = e.offsetY;
        return true;
    }

    handleMouseMove(e) {
        if (!this.isDrawing) return false;
        
        this.redrawCanvas();
        this.drawArrow(this.ctx, this.startX, this.startY, e.offsetX, e.offsetY);
        return true;
    }

    handleMouseUp(e, selectedColor, selectedStrokeWidth) {
        if (!this.isDrawing) return false;
        
        this.isDrawing = false;
        this.elements.push({
            type: 'arrow',
            x1: this.startX,
            y1: this.startY,
            x2: e.offsetX,
            y2: e.offsetY,
            color: selectedColor,
            strokeWidth: selectedStrokeWidth
        });
        this.saveState();
        this.redrawCanvas();
        return true;
    }

    drawArrow(context, fromX, fromY, toX, toY, strokeWidth = 3, color = '#ffffff') {
        const headLength = Math.min(20, Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2)) / 3);
        const dx = toX - fromX;
        const dy = toY - fromY;
        const angle = Math.atan2(dy, dx);

        // Draw the shaft
        context.beginPath();
        context.moveTo(fromX, fromY);
        context.lineTo(toX, toY);
        context.strokeStyle = color;
        context.lineWidth = strokeWidth;
        context.lineCap = 'round';
        context.stroke();

        // Draw the arrowhead
        context.beginPath();
        context.moveTo(toX, toY);
        context.lineTo(
            toX - headLength * Math.cos(angle - Math.PI / 6),
            toY - headLength * Math.sin(angle - Math.PI / 6)
        );
        context.moveTo(toX, toY);
        context.lineTo(
            toX - headLength * Math.cos(angle + Math.PI / 6),
            toY - headLength * Math.sin(angle + Math.PI / 6)
        );
        context.strokeStyle = color;
        context.lineWidth = strokeWidth;
        context.lineCap = 'round';
        context.stroke();
    }

    drawElement(element) {
        this.ctx.globalAlpha = element.opacity || 1;
        this.drawArrow(this.ctx, element.x1, element.y1, element.x2, element.y2, element.strokeWidth, element.color);
        this.ctx.globalAlpha = 1;
    }

    updateCursorStyle() {
        this.canvas.style.cursor = 'crosshair';
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ArrowTool;
}