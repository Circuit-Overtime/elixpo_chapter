class AdvancedShapes {
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
        this.currentShapeType = null;
    }

    handleMouseDown(e, selectedColor, selectedStrokeWidth, currentOpacity, shapeType) {
        this.isDrawing = true;
        this.startX = e.offsetX;
        this.startY = e.offsetY;
        this.currentShapeType = shapeType;
        
        this.currentElement = {
            type: shapeType,
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
        this.currentShapeType = null;
        this.saveState();
        this.redrawCanvas();
        return true;
    }

    drawPolygon(ctx, x1, y1, x2, y2, sides, options) {
        const radius = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) / 2;
        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;
        const angle = (2 * Math.PI) / sides;

        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const x = centerX + radius * Math.cos(i * angle);
            const y = centerY + radius * Math.sin(i * angle);
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        if (options.fill !== 'transparent') {
            ctx.fillStyle = options.fill;
            ctx.fill();
        }
        ctx.strokeStyle = options.stroke;
        ctx.lineWidth = options.strokeWidth;
        ctx.stroke();
    }

    drawStar(ctx, x1, y1, x2, y2, options) {
        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;
        const outerRadius = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) / 2;
        const innerRadius = outerRadius * 0.5;
        const points = 5;
        const angle = Math.PI / points;

        ctx.beginPath();
        for (let i = 0; i < 2 * points; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const x = centerX + radius * Math.cos(i * angle);
            const y = centerY + radius * Math.sin(i * angle);
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();
        if (options.fill !== 'transparent') {
            ctx.fillStyle = options.fill;
            ctx.fill();
        }
        ctx.strokeStyle = options.stroke;
        ctx.lineWidth = options.strokeWidth;
        ctx.stroke();
    }

    drawDiamond(ctx, x1, y1, x2, y2, options) {
        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;
        const width = Math.abs(x2 - x1) / 2;
        const height = Math.abs(y2 - y1) / 2;

        ctx.beginPath();
        ctx.moveTo(centerX, centerY - height); // Top
        ctx.lineTo(centerX + width, centerY); // Right
        ctx.lineTo(centerX, centerY + height); // Bottom
        ctx.lineTo(centerX - width, centerY); // Left
        ctx.closePath();

        if (options.fill !== 'transparent') {
            ctx.fillStyle = options.fill;
            ctx.fill();
        }
        ctx.strokeStyle = options.stroke;
        ctx.lineWidth = options.strokeWidth;
        ctx.stroke();
    }

    drawParallelogram(ctx, x1, y1, x2, y2, options) {
        const width = Math.abs(x2 - x1);
        const height = Math.abs(y2 - y1);
        const offset = width * 0.3;

        ctx.beginPath();
        ctx.moveTo(x1 + offset, y1);
        ctx.lineTo(x2, y1);
        ctx.lineTo(x2 - offset, y2);
        ctx.lineTo(x1, y2);
        ctx.closePath();

        if (options.fill !== 'transparent') {
            ctx.fillStyle = options.fill;
            ctx.fill();
        }
        ctx.strokeStyle = options.stroke;
        ctx.lineWidth = options.strokeWidth;
        ctx.stroke();
    }

    drawArrowhead(ctx, x1, y1, x2, y2, options) {
        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;
        const width = Math.abs(x2 - x1) / 2;
        const height = Math.abs(y2 - y1) / 2;

        ctx.beginPath();
        ctx.moveTo(centerX + width, centerY);
        ctx.lineTo(centerX - width, centerY - height);
        ctx.lineTo(centerX - width + width * 0.3, centerY);
        ctx.lineTo(centerX - width, centerY + height);
        ctx.closePath();

        if (options.fill !== 'transparent') {
            ctx.fillStyle = options.fill;
            ctx.fill();
        }
        ctx.strokeStyle = options.stroke;
        ctx.lineWidth = options.strokeWidth;
        ctx.stroke();
    }

    drawPlus(ctx, x1, y1, x2, y2, options) {
        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;
        const size = Math.min(Math.abs(x2 - x1), Math.abs(y2 - y1));
        const thickness = size * 0.2;

        ctx.beginPath();
        // Horizontal bar
        ctx.rect(centerX - size / 2, centerY - thickness / 2, size, thickness);
        // Vertical bar
        ctx.rect(centerX - thickness / 2, centerY - size / 2, thickness, size);

        if (options.fill !== 'transparent') {
            ctx.fillStyle = options.fill;
            ctx.fill();
        }
        ctx.strokeStyle = options.stroke;
        ctx.lineWidth = options.strokeWidth;
        ctx.stroke();
    }

    drawCross(ctx, x1, y1, x2, y2, options) {
        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;
        const size = Math.min(Math.abs(x2 - x1), Math.abs(y2 - y1));
        const thickness = size * 0.15;

        ctx.beginPath();
        ctx.moveTo(centerX - size / 2 + thickness, centerY - size / 2);
        ctx.lineTo(centerX + size / 2, centerY - size / 2);
        ctx.lineTo(centerX + size / 2, centerY - size / 2 + thickness);
        ctx.lineTo(centerX + size / 2 - thickness, centerY + size / 2);
        ctx.lineTo(centerX + size / 2, centerY + size / 2);
        ctx.lineTo(centerX - size / 2, centerY + size / 2);
        ctx.lineTo(centerX - size / 2, centerY + size / 2 - thickness);
        ctx.lineTo(centerX - size / 2 + thickness, centerY - size / 2);
        ctx.closePath();

        if (options.fill !== 'transparent') {
            ctx.fillStyle = options.fill;
            ctx.fill();
        }
        ctx.stroke();
    }

    drawChevron(ctx, x1, y1, x2, y2, options) {
        const centerX = (x1 + x2) / 2;
        const centerY = (y1 + y2) / 2;
        const width = Math.abs(x2 - x1) / 2;
        const height = Math.abs(y2 - y1) / 2;

        ctx.beginPath();
        ctx.moveTo(centerX - width, centerY - height);
        ctx.lineTo(centerX, centerY);
        ctx.lineTo(centerX - width, centerY + height);
        ctx.lineTo(centerX - width + width * 0.3, centerY + height * 0.7);
        ctx.lineTo(centerX - width * 0.3, centerY);
        ctx.lineTo(centerX - width + width * 0.3, centerY - height * 0.7);
        ctx.closePath();

        if (options.fill !== 'transparent') {
            ctx.fillStyle = options.fill;
            ctx.fill();
        }
        ctx.strokeStyle = options.stroke;
        ctx.lineWidth = options.strokeWidth;
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

        switch (element.type) {
            case 'triangle':
                this.drawPolygon(this.ctx, element.x1, element.y1, element.x2, element.y2, 3, options);
                break;
            case 'pentagon':
                this.drawPolygon(this.ctx, element.x1, element.y1, element.x2, element.y2, 5, options);
                break;
            case 'hexagon':
                this.drawPolygon(this.ctx, element.x1, element.y1, element.x2, element.y2, 6, options);
                break;
            case 'octagon':
                this.drawPolygon(this.ctx, element.x1, element.y1, element.x2, element.y2, 8, options);
                break;
            case 'star':
                this.drawStar(this.ctx, element.x1, element.y1, element.x2, element.y2, options);
                break;
            case 'diamond':
                this.drawDiamond(this.ctx, element.x1, element.y1, element.x2, element.y2, options);
                break;
            case 'parallelogram':
                this.drawParallelogram(this.ctx, element.x1, element.y1, element.x2, element.y2, options);
                break;
            case 'arrowhead':
                this.drawArrowhead(this.ctx, element.x1, element.y1, element.x2, element.y2, options);
                break;
            case 'plus':
                this.drawPlus(this.ctx, element.x1, element.y1, element.x2, element.y2, options);
                break;
            case 'cross':
                this.drawCross(this.ctx, element.x1, element.y1, element.x2, element.y2, options);
                break;
            case 'chevron':
                this.drawChevron(this.ctx, element.x1, element.y1, element.x2, element.y2, options);
                break;
        }

        this.ctx.globalAlpha = 1;
    }

    updateCursorStyle() {
        this.canvas.style.cursor = 'crosshair';
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdvancedShapes;
}