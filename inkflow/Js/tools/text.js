class TextTool {
    constructor(canvas, ctx, elements, redrawCanvas, saveState) {
        this.canvas = canvas;
        this.ctx = ctx;
        this.elements = elements;
        this.redrawCanvas = redrawCanvas;
        this.saveState = saveState;
        this.isWriting = false;
        this.textInput = document.getElementById('textInput');
    }

    handleMouseDown(e, selectedColor, selectedStrokeWidth, currentZoom) {
        if (!this.isWriting) {
            this.showTextInput(e.offsetX, e.offsetY, selectedColor, selectedStrokeWidth, currentZoom);
            return true;
        }
        return false;
    }

    handleMouseMove(e) {
        // Text tool doesn't need mouse move handling
        return false;
    }

    handleMouseUp(e) {
        // Text tool doesn't need mouse up handling during writing
        return false;
    }

    showTextInput(x, y, selectedColor, selectedStrokeWidth, currentZoom) {
        this.isWriting = true;
        this.textInput.style.left = `${x * (currentZoom / 100)}px`;
        this.textInput.style.top = `${y * (currentZoom / 100)}px`;
        this.textInput.style.display = 'block';
        this.textInput.style.color = selectedColor;
        this.textInput.value = '';
        
        // Set font size based on stroke width and zoom
        const baseSize = 25;
        const widthMultiplier = selectedStrokeWidth / 4;
        const scaledFontSize = Math.round(baseSize * widthMultiplier * (currentZoom / 100));
        this.textInput.style.fontSize = `${scaledFontSize}px`;
        
        this.textInput.focus();
        
        // Remove previous event listeners to avoid duplicates
        this.textInput.removeEventListener('keydown', this.handleKeyDown);
        this.textInput.removeEventListener('blur', this.handleBlur);
        
        // Add event listeners
        this.textInput.addEventListener('keydown', this.handleKeyDown.bind(this));
        this.textInput.addEventListener('blur', this.handleBlur.bind(this));
    }

    handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            this.finishTextInput();
        }
        // Allow Shift+Enter for new lines
        if (e.key === 'Escape') {
            this.cancelTextInput();
        }
        
        // Adjust size as user types
        setTimeout(() => this.adjustSize(), 0);
    }

    handleBlur() {
        // Only finish text input if there's actual content
        if (this.textInput.value.trim() !== '') {
            this.finishTextInput();
        } else {
            this.cancelTextInput();
        }
    }

    finishTextInput() {
        const text = this.textInput.value;
        if (text && text.trim() !== '') {
            const currentZoom = window.currentZoom || 100;
            const selectedColor = window.selectedColor || '#ffffff';
            const selectedStrokeWidth = window.selectedStrokeWidth || 3;
            
            this.elements.push({
                type: 'text',
                x1: parseInt(this.textInput.style.left) / (currentZoom / 100),
                y1: (parseInt(this.textInput.style.top) + 20) / (currentZoom / 100),
                text: text,
                color: selectedColor,
                zoom: currentZoom,
                textWidth: selectedStrokeWidth / 4
            });
            this.redrawCanvas();
            this.saveState();
        }
        this.hideTextInput();
    }

    cancelTextInput() {
        this.hideTextInput();
    }

    hideTextInput() {
        this.textInput.style.display = 'none';
        this.isWriting = false;
        this.textInput.value = '';
        
        // Remove event listeners
        this.textInput.removeEventListener('keydown', this.handleKeyDown);
        this.textInput.removeEventListener('blur', this.handleBlur);
    }

    adjustSize() {
        this.textInput.style.width = 'auto';
        this.textInput.style.height = 'auto';
        this.textInput.style.height = `${this.textInput.scrollHeight}px`;
        this.textInput.style.width = `${this.textInput.scrollWidth}px`;
    }

    drawElement(element, currentZoom) {
        const scaledFontSize = Math.round(25 * (element.textWidth || 1) * (currentZoom / 100));
        this.ctx.font = `${scaledFontSize}px lato, sans-serif`;
        this.ctx.fillStyle = element.color;
        
        if (element.text !== undefined) {
            const lines = element.text.split('\n');
            const lineHeight = scaledFontSize * 1.2;
            lines.forEach((line, index) => {
                this.ctx.fillText(
                    line,
                    element.x1 * (currentZoom / 100),
                    (element.y1 + index * lineHeight) * (currentZoom / 100)
                );
            });
        }
    }

    updateCursorStyle() {
        this.canvas.style.cursor = 'text';
    }

    getTextWidth(text) {
        this.ctx.font = `25px lato, sans-serif`;
        return this.ctx.measureText(text).width;
    }

    // Handle clicking on existing text to edit
    handleTextEdit(clickedElement, e, currentZoom) {
        if (clickedElement.type === 'text') {
            this.textInput.value = clickedElement.text || '';
            this.textInput.style.left = `${clickedElement.x1 * (currentZoom / 100)}px`;
            this.textInput.style.top = `${(clickedElement.y1 - 20) * (currentZoom / 100)}px`;
            this.textInput.style.display = 'block';
            this.textInput.style.color = clickedElement.color;
            this.isWriting = true;

            // Set font size based on stored text width and current zoom
            const scaledFontSize = Math.round(25 * (clickedElement.textWidth || 1) * (currentZoom / 100));
            this.textInput.style.fontSize = `${scaledFontSize}px`;

            // Remove the old text element
            const elementIndex = this.elements.indexOf(clickedElement);
            if (elementIndex > -1) {
                this.elements.splice(elementIndex, 1);
            }
            this.redrawCanvas();

            // Focus the text input
            setTimeout(() => {
                this.textInput.focus();
                this.textInput.setSelectionRange(this.textInput.value.length, this.textInput.value.length);
            }, 0);

            // Add event listeners
            this.textInput.addEventListener('keydown', this.handleKeyDown.bind(this));
            this.textInput.addEventListener('blur', this.handleBlur.bind(this));
            
            return true;
        }
        return false;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TextTool;
}