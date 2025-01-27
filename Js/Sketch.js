const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const rc = rough.canvas(canvas, {
    options: {
        roughness: 0.5,
        bowing: 0.5,
        stroke: '#ffffff',
        strokeWidth: 2,
        fillStyle: 'solid',
        fillWeight: 0.5,
        curveFitting: 1,
        simplification: 0.5
    }
});
const angleInfo = document.getElementById('angleInfo');
const sidebar = document.getElementById('sidebar');
const savedList = document.getElementById('saved-list');
const textInput = document.getElementById('textInput');
const zoomPercentage = document.getElementById('zoom-percentage');
const zoomIn = document.getElementById('zoom-in');
const zoomOut = document.getElementById('zoom-out');
let currentZoom = 100;

let isDrawing = false;
let isWriting = false;
let hoveredElement = null;
let selectedStrokeWidth = 3;
let lastX = 0;
let lastY = 0;
let elements = [];
let selectedTool = 'pencil';
let selectedColor = '#ffffff';
let currentElement = null;
let selectedElement = null;
let offsetX = 0;
let offsetY = 0;
let isPanning = false;
let startPanX = 0;
let startPanY = 0;
let scale = 1;
const scaleFactor = 0.1;
let startX, startY;

let undoStack = [];
let redoStack = [];
const maxHistorySize = 10;

let isTeamCodePopupOpen = false;

function resizeCanvas() {
    canvas.width = window.innerWidth * 2;
    canvas.height = window.innerHeight * 2;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.scale(2, 2);
    redrawCanvas();
}

window.addEventListener('resize', handleResize);

// Touch event handlers starts here
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    handleMouseDown(mouseEvent);
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    if (isPanning) {
        pan(mouseEvent);
    } else {
        handleMouseMove(mouseEvent);
    }
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    const mouseEvent = new MouseEvent('mouseup', {});
    handleMouseUp(mouseEvent);
});

// Prevent all zooming gestures
canvas.addEventListener('gesturestart', (e) => {
    e.preventDefault();
});

canvas.addEventListener('gesturechange', (e) => {
    e.preventDefault();
});

canvas.addEventListener('gestureend', (e) => {
    e.preventDefault();
});
// Touch event handlers up to here

zoomIn.addEventListener('click', () => {
    currentZoom = Math.min(currentZoom + 10, 200); // Limit zoom to 200%
    zoomPercentage.textContent = currentZoom + '%';

    const zoom = 1 + scaleFactor;
    scale *= zoom;

    // Get center of canvas
    const centerX = canvas.width / 4; // Divide by 4 because canvas is scaled 2x
    const centerY = canvas.height / 4;

    elements.forEach(element => {
        element.x1 = centerX + (element.x1 - centerX) * zoom;
        element.y1 = centerY + (element.y1 - centerY) * zoom;
        if (element.x2 !== undefined) element.x2 = centerX + (element.x2 - centerX) * zoom;
        if (element.y2 !== undefined) element.y2 = centerY + (element.y2 - centerY) * zoom;
    });
    redrawCanvas();
});

zoomOut.addEventListener('click', () => {
    if (currentZoom > 10) {
        currentZoom -= 10;
        zoomPercentage.textContent = currentZoom + '%';

        const zoom = 1 - scaleFactor;
        scale *= zoom;

        // Get center of canvas
        const centerX = canvas.width / 4; // Divide by 4 because canvas is scaled 2x
        const centerY = canvas.height / 4;

        elements.forEach(element => {
            element.x1 = centerX + (element.x1 - centerX) * zoom;
            element.y1 = centerY + (element.y1 - centerY) * zoom;
            if (element.x2 !== undefined) element.x2 = centerX + (element.x2 - centerX) * zoom;
            if (element.y2 !== undefined) element.y2 = centerY + (element.y2 - centerY) * zoom;
        });
        redrawCanvas();
    }
});

canvas.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
        e.preventDefault();
        const mouseX = e.offsetX;
        const mouseY = e.offsetY;
        const zoom = e.deltaY < 0 ? 1 + scaleFactor : 1 - scaleFactor;

        scale *= zoom;

        elements.forEach(element => {
            element.x1 = mouseX + (element.x1 - mouseX) * zoom;
            element.y1 = mouseY + (element.y1 - mouseY) * zoom;
            if (element.x2 !== undefined) element.x2 = mouseX + (element.x2 - mouseX) * zoom;
            if (element.y2 !== undefined) element.y2 = mouseY + (element.y2 - mouseY) * zoom;
        });

        redrawCanvas();
    }
});

canvas.addEventListener('mousedown', (e) => {
    handleMouseDown(e);
});

canvas.addEventListener('mousemove', (e) => {
    if (isPanning) {
        pan(e);
    } else {
        handleMouseMove(e);
    }
});

canvas.addEventListener('mouseup', (e) => {
    handleMouseUp(e);
});

document.getElementById('strokeWidth').addEventListener('change', (e) => {
    selectedStrokeWidth = Math.max(1, parseInt(e.target.value)); // Ensure stroke width is at least 1
});

document.querySelectorAll('.tool').forEach(tool => {
    tool.addEventListener('click', () => {
        if (tool.id === 'clear') {
            elements = [];
            redrawCanvas();
        } else if (tool.id === 'save') {
            saveWork();
        } else if (tool.id === 'open-sidebar') {
            sidebar.classList.toggle('open');
        } else if (tool.id === 'undo') {
            undo();
        } else if (tool.id === 'redo') {
            redo();
        } else if (tool.id === 'select') {
            selectedTool = 'select';
            document.querySelector('.tool.active')?.classList.remove('active');
            tool.classList.add('active');
        } else {
            document.querySelector('.tool.active')?.classList.remove('active');
            tool.classList.add('active');
            selectedTool = tool.id;
            updateCursorStyle();
        }
    });
});

document.querySelectorAll('#main-toolbar2 .tool').forEach(tool => {
    tool.addEventListener('click', () => {
        if (tool.id === 'clear') {
            elements = [];
            redrawCanvas();
        } else if (tool.id === 'save') {
            saveWork();
        } else if (tool.id === 'open-sidebar') {
            sidebar.classList.toggle('open');
        } else if (tool.id === 'undo') {
            undo();
        } else if (tool.id === 'redo') {
            redo();
        } else if (tool.id === 'select') {
            selectedTool = 'select';
            document.querySelector('.tool.active')?.classList.remove('active');
            tool.classList.add('active');
        } else {
            document.querySelector('.tool.active')?.classList.remove('active');
            tool.classList.add('active');
            selectedTool = tool.id;
            updateCursorStyle();
        }
        // Hide main toolbar2 when a tool is selected
        const toolbar2 = document.getElementById('main-toolbar2');
        toolbar2.style.display = 'none';
    });
});

document.getElementById('colorPicker').addEventListener('input', (e) => {
    selectedColor = e.target.value;
});

canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mouseup', handleMouseUp);

canvas.addEventListener('mousemove', (e) => {
    if (selectedTool === 'eraser') {
        hoveredElement = elements.find(element =>
            element.type === 'pencil' &&
            isWithinEraserRadius(e.offsetX, e.offsetY, element)
        );
        redrawCanvas();
    } else {
        hoveredElement = null;
        redrawCanvas();
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (selectedTool === 'eraser' && hoveredElement && hoveredElement.type === 'pencil') {
        elements = elements.filter(element => element !== hoveredElement);
        hoveredElement = null;
        redrawCanvas();
    }
});

function isWithinEraserRadius(x, y, element) {
    const eraserRadius = 20;
    const distance = Math.sqrt(
        Math.pow((element.x1 + element.x2) / 2 - x, 2) +
        Math.pow((element.y1 + element.y2) / 2 - y, 2)
    );
    return distance <= eraserRadius;
}

function handleMouseDown(e) {
    if (selectedTool === 'select') {
        const clickedX = e.offsetX;
        const clickedY = e.offsetY;
        selectedElement = getElementAtPosition(clickedX, clickedY);

        if (selectedElement) {
            offsetX = clickedX - selectedElement.x1;
            offsetY = clickedY - selectedElement.y1;
        } else {
            isPanning = true;
            startPanX = e.clientX;
            startPanY = e.clientY;
        }
    } else if (selectedTool === 'arrow') {
        isDrawing = true;
        startX = e.offsetX;
        startY = e.offsetY;
    } else {
        startDrawing(e);
    }
}

function handleMouseMove(e) {
    if (selectedElement) {
        const newX = e.offsetX;
        const newY = e.offsetY;

        const moveX = newX - offsetX;
        const moveY = newY - offsetY;

        const dx = moveX - selectedElement.x1;
        const dy = moveY - selectedElement.y1;

        selectedElement.x1 = moveX;
        selectedElement.y1 = moveY;

        if (selectedElement.x2 !== undefined && selectedElement.y2 !== undefined) {
            selectedElement.x2 += dx;
            selectedElement.y2 += dy;
        }

        if (selectedElement.type === 'pencil') {
            elements = elements.map(element => {
                if (element === selectedElement) {
                    return {
                        ...element,
                        x1: element.x1 + dx,
                        y1: element.y1 + dy,
                        x2: element.x2 + dx,
                        y2: element.y2 + dy
                    };
                }
                return element;
            });
        }

        redrawCanvas();
    } else if (isPanning) {
        pan(e);
    } else if (isDrawing && selectedTool === 'arrow') {
        redrawCanvas();
        const context = canvas.getContext('2d');
        drawArrow(context, startX, startY, e.offsetX, e.offsetY);
    } else {
        draw(e);
    }
}

function handleMouseUp(e) {
    if (selectedElement) {
        selectedElement = null;
    } else if (isPanning) {
        isPanning = false;
    } else if (isDrawing && selectedTool === 'arrow') {
        isDrawing = false;
        elements.push({
            type: 'arrow',
            x1: startX,
            y1: startY,
            x2: e.offsetX,
            y2: e.offsetY,
            color: selectedColor
        });
        saveState();
        redrawCanvas();
    } else {
        stopDrawing();
        saveState();
    }
}

function startDrawing(e) {
    isDrawing = true;
    [lastX, lastY] = [e.offsetX, e.offsetY];
    if ((selectedTool === 'text') && !isWriting) {
        showTextInput(e.offsetX, e.offsetY);
    } else {
        currentElement = {
            type: selectedTool,
            x1: lastX,
            y1: lastY,
            color: selectedColor,
            roughness: 0.5,
            strokeWidth: selectedStrokeWidth,
            fillStyle: 'solid',
            fillWeight: 0.5
        };
    }
}

function draw(e) {
    if (!isDrawing) return;

    const currentX = e.offsetX;
    const currentY = e.offsetY; // Define currentY

    if (selectedTool === 'pencil') {
        // Use quadratic curves for smoother lines
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.quadraticCurveTo(lastX, lastY, currentX, currentY);
        ctx.strokeStyle = selectedColor;
        ctx.lineWidth = selectedStrokeWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();

        elements.push({
            type: 'pencil',
            x1: lastX,
            y1: lastY,
            x2: currentX,
            y2: currentY,
            color: selectedColor,
            strokeWidth: selectedStrokeWidth,
            roughness: 0.3
        });

        [lastX, lastY] = [currentX, currentY];
    } else if (selectedTool === 'eraser') {
        const eraserRadius = 20;
        elements = elements.filter(element => {
            if (element.type !== 'pencil') return true;

            const distance = Math.sqrt(
                Math.pow((element.x1 + element.x2) / 2 - currentX, 2) +
                Math.pow((element.y1 + element.y2) / 2 - currentY, 2)
            );
            return distance > eraserRadius;
        });
    } else if (currentElement) {
        currentElement.x2 = currentX;
        currentElement.y2 = currentY;
    }

    if (selectedTool === 'line') {
        showAngle(lastX, lastY, currentX, currentY);
    }

    redrawCanvas();
}

function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    angleInfo.style.display = 'none';

    if (currentElement && selectedTool !== 'pencil' && selectedTool !== 'eraser' && selectedTool !== 'text') {
        elements.push(currentElement);
    }
    currentElement = null;
    saveState();
    redrawCanvas();
}

function redrawCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    elements.forEach(element => {
        if (element === hoveredElement && element.type === 'pencil') {
            ctx.globalAlpha = 0.3;
            drawElement(element);
            ctx.globalAlpha = 1;
        } else {
            drawElement(element);
        }
    });

    if (currentElement) {
        drawElement(currentElement);
    }
}

function showEraserRadius(e) {
    redrawCanvas();
    const eraserRadius = 20;
    ctx.beginPath();
    ctx.arc(e.offsetX, e.offsetY, eraserRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(69, 69, 69, 0.5)';
    ctx.fillStyle = 'rgba(69, 69, 69, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fill();
}

function drawElement(element) {
    const options = {
        stroke: element.color,
        roughness: element.roughness || 0.5,
        strokeWidth: element.strokeWidth || 2,
        fillStyle: 'solid',
        fillWeight: 0.5,
        bowing: 0.5,
        curveFitting: 1,
        simplification: 0.5
    };

    switch (element.type) {
        case 'pencil':
            drawSmoothLine(ctx, element.x1, element.y1, element.x2, element.y2, options);
            break;
        case 'line':
            drawFluidLine(ctx, element.x1, element.y1, element.x2, element.y2, options);
            break;
        case 'rectangle':
            drawRoundedRectangle(ctx, element.x1, element.y1, element.x2 - element.x1, element.y2 - element.y1, 10, options);
            break;
        case 'circle':
            drawSmoothCircle(ctx, element.x1, element.y1, element.x2, element.y2, options);
            break;
        case 'text':
            ctx.font = '25px "Comic Sans MS"'; // Set default font to Comic Sans MS
            ctx.fillStyle = element.color;
            if (element.text !== undefined) {
                ctx.fillText(element.text, element.x1, element.y1);
            }
            break;
        case 'arrow':
            drawArrow(ctx, element.x1, element.y1, element.x2, element.y2);
            break;
        case 'triangle':
            drawPolygon(ctx, element.x1, element.y1, element.x2, element.y2, 3, options);
            break;
        case 'pentagon':
            drawPolygon(ctx, element.x1, element.y1, element.x2, element.y2, 5, options);
            break;
        case 'star':
            drawStar(ctx, element.x1, element.y1, element.x2, element.y2, options);
            break;
        case 'diamond':
            drawDiamond(ctx, element.x1, element.y1, element.x2, element.y2, options);
            break;
        case 'hexagon':
            drawPolygon(ctx, element.x1, element.y1, element.x2, element.y2, 6, options);
            break;
    }
}

// New function to draw fluid lines with rounded ends
function drawFluidLine(ctx, x1, y1, x2, y2, options) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = options.stroke;
    ctx.lineWidth = options.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
}

function drawSmoothLine(ctx, x1, y1, x2, y2, options) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.quadraticCurveTo(x1, y1, x2, y2);
    ctx.strokeStyle = options.stroke;
    ctx.lineWidth = options.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
}

function drawPolygon(ctx, x1, y1, x2, y2, sides, options) {
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
    ctx.strokeStyle = options.stroke;
    ctx.lineWidth = options.strokeWidth;
    ctx.stroke();
}

function drawStar(ctx, x1, y1, x2, y2, options) {
    const outerRadius = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1)) / 2;
    const innerRadius = outerRadius / 2.5;
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;
    const angle = Math.PI / 5;

    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
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
    ctx.strokeStyle = options.stroke;
    ctx.lineWidth = options.strokeWidth;
    ctx.stroke();
}

function drawDiamond(ctx, x1, y1, x2, y2, options) {
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);
    const centerX = (x1 + x2) / 2;
    const centerY = (y1 + y2) / 2;

    ctx.beginPath();
    ctx.moveTo(centerX, y1);
    ctx.lineTo(x2, centerY);
    ctx.lineTo(centerX, y2);
    ctx.lineTo(x1, centerY);
    ctx.closePath();
    ctx.strokeStyle = options.stroke;
    ctx.lineWidth = options.strokeWidth;
    ctx.stroke();
}

function drawRoundedRectangle(ctx, x, y, width, height, radius, options) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.strokeStyle = options.stroke;
    ctx.lineWidth = options.strokeWidth;
    ctx.stroke();
}

function drawSmoothCircle(ctx, x1, y1, x2, y2, options) {
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);
    const diameter = Math.max(width, height);
    const centerX = x1 + width / 2;
    const centerY = y1 + height / 2;

    ctx.beginPath();
    ctx.arc(centerX, centerY, diameter / 2, 0, Math.PI * 2);
    ctx.strokeStyle = options.stroke;
    ctx.lineWidth = options.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
}

function pan(e) {
    const dx = (e.clientX - startPanX) / 2;
    const dy = (e.clientY - startPanY) / 2;
    elements.forEach(element => {
        element.x1 += dx;
        element.y1 += dy;
        if (element.x2 !== undefined) element.x2 += dx;
        if (element.y2 !== undefined) element.y2 += dy;
    });
    startPanX = e.clientX;
    startPanY = e.clientY;
    redrawCanvas();
}

function showAngle(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    let angle = Math.atan2(dy, dx) * 180 / Math.PI;
    angle = (angle + 360) % 360;
    angleInfo.textContent = `Angle: ${angle.toFixed(1)}°`;
    angleInfo.style.display = 'block';
}

function showTextInput(x, y) {
    isWriting = true;
    textInput.value = '';
    textInput.style.display = 'block';
    textInput.style.fontSize = '25px';
    textInput.style.color = selectedColor;
    textInput.style.backgroundColor = 'transparent';
    textInput.style.fontFamily = '"Comic Sans MS"'; // Set default font to Comic Sans MS
    textInput.style.caretColor = selectedColor;
    textInput.style.left = `${x}px`;
    textInput.style.top = `${y - 20}px`;
    setTimeout(() => textInput.focus(), 500);
    textInput.focus();
}

canvas.addEventListener('click', (e) => {
    if (isWriting) {
        const text = textInput.value;
        if (text && text.trim() !== '') {
            elements.push({
                type: 'text',
                x1: parseInt(textInput.style.left),
                y1: parseInt(textInput.style.top) + 20,
                text: text,
                color: selectedColor
            });
            redrawCanvas();
        } else {
            textInput.value = '';
        }
        textInput.style.display = 'none';
        isWriting = false;
    }
});

function adjustSize() {
    textInput.style.width = 'auto';
    textInput.style.height = 'auto';
    textInput.style.height = `${textInput.scrollHeight}px`;
    textInput.style.width = `${textInput.scrollWidth}px`;
}

textInput.addEventListener('input', adjustSize);

function saveWork() {
    const name = prompt("Enter a name for this work:");
    if (name) {
        const savedWorks = JSON.parse(localStorage.getItem('savedWorks') || '[]');
        savedWorks.push({ name, elements: JSON.parse(JSON.stringify(elements)) });
        localStorage.setItem('savedWorks', JSON.stringify(savedWorks));
    }
}

function loadWork(index) {
    const savedWorks = JSON.parse(localStorage.getItem('savedWorks') || '[]');
    if (savedWorks[index]) {
        elements = JSON.parse(JSON.stringify(savedWorks[index].elements));
        redrawCanvas();
        sidebar.classList.remove('open');
    }
}

function deleteWork(index) {
    const savedWorks = JSON.parse(localStorage.getItem('savedWorks') || '[]');
    savedWorks.splice(index, 1);
    localStorage.setItem('savedWorks', JSON.stringify(savedWorks));
}

function handleResize() {
    resizeCanvas();
}

function updateCursorStyle() {
    if (selectedTool === 'select') {
        canvas.style.cursor = 'grab';
    } else if (selectedTool === 'text') {
        canvas.style.cursor = 'text';
    } else {
        canvas.style.cursor = 'crosshair';
    }
}

function drawArrow(context, fromX, fromY, toX, toY) {
    const headLength = 10;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);

    context.beginPath();
    context.moveTo(fromX, fromY);

    const midX = (fromX + toX) / 2;
    const midY = (fromY + toY) / 2;
    context.quadraticCurveTo(midX, midY, toX, toY);

    context.moveTo(toX, toY);
    context.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    context.moveTo(toX, toY);
    context.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));

    context.strokeStyle = selectedColor;
    context.lineWidth = 2;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.stroke();
}

function getElementAtPosition(x, y) {
    for (let i = elements.length - 1; i >= 0; i--) {
        const element = elements[i];
        if (isWithinBounds(element, x, y)) {
            return element;
        }
    }
    return null;
}

function isWithinBounds(element, x, y) {
    const tolerance = 5;
    switch (element.type) {
        case 'line':
        case 'arrow':
        case 'pencil':
            return pointToLineDistance(element.x1, element.y1, element.x2, element.y2, x, y) < tolerance;
        case 'rectangle':
            return x >= element.x1 && x <= element.x2 && y >= element.y1 && y <= element.y2;
        case 'circle':
            const radius = Math.abs(element.x2 - element.x1) / 2;
            const centerX = element.x1 + radius;
            const centerY = element.y1 + radius;
            const distFromCenter = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
            return distFromCenter <= radius;
        case 'text':
            return x >= element.x1 && x <= element.x1 + 100 && y >= element.y1 - 20 && y <= element.y1;
        default:
            return false;
    }
}

function pointToLineDistance(x1, y1, x2, y2, px, py) {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    const param = len_sq !== 0 ? dot / len_sq : -1;
    let xx, yy;

    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
}

function saveState() {
    if (undoStack.length >= maxHistorySize) {
        undoStack.shift(); // Remove the oldest state if max size is reached
    }
    undoStack.push([...elements]);
    redoStack = [];
}

function undo() {
    if (undoStack.length > 0) {
        redoStack.push([...elements]);
        elements = undoStack.pop();
        redrawCanvas();
    }
}

function redo() {
    if (redoStack.length > 0) {
        undoStack.push([...elements]);
        elements = redoStack.pop();
        redrawCanvas();
    }
}

window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        undo();
    } else if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        redo();
    } else if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveWork();
    }
});

const themeBtn = document.getElementById('theme-btn');
const themeIcon = themeBtn.querySelector('i');

// Check for saved theme preference
const currentTheme = localStorage.getItem('theme') || 'dark';
if (currentTheme === 'light') {
    document.body.classList.add('light-theme');
    themeIcon.classList.remove('fa-moon');
    themeIcon.classList.add('fa-sun');
    selectedColor = '#000000'; // Set pencil color to black
    document.getElementById('colorPicker').value = '#000000'; // Update color picker
} else {
    selectedColor = '#ffffff'; // Set pencil color to white or default
    document.getElementById('colorPicker').value = '#ffffff'; // Update color picker
}

// Theme toggle functionality
themeBtn.addEventListener('click', () => {
    document.body.classList.toggle('light-theme');

    if (document.body.classList.contains('light-theme')) {
        localStorage.setItem('theme', 'light');
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
        selectedColor = '#000000'; // Set pencil color to black
        document.getElementById('colorPicker').value = '#000000'; // Update color picker
    } else {
        localStorage.setItem('theme', 'dark');
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
        selectedColor = '#ffffff'; // Reset pencil color to white or default
        document.getElementById('colorPicker').value = '#ffffff'; // Update color picker
    }

    // Redraw canvas with new theme colors
    redrawCanvas();
});

window.addEventListener('resize', handleResize);

handleResize();
updateCursorStyle();


//more tools trigger toolbar open and close
function toggleMainToolbar2() {
    const toolbar2 = document.getElementById('main-toolbar2');
    toolbar2.style.display = toolbar2.style.display === 'none' ? 'block' : 'none';
}

// Save all data to local storage
function saveAllData() {
    const data = {
        elements,
        selectedTool,
        selectedColor,
        selectedStrokeWidth,
        currentZoom,
        scale
    };
    localStorage.setItem('inkFlowData', JSON.stringify(data));
}

// Load all data from local storage
function loadAllData() {
    const data = JSON.parse(localStorage.getItem('inkFlowData'));
    if (data) {
        elements = data.elements || [];
        selectedTool = data.selectedTool || 'pencil';
        selectedColor = data.selectedColor || '#ffffff';
        // selectedStrokeWidth = data.selectedStrokeWidth || 3;
        currentZoom = data.currentZoom || 100;
        scale = data.scale || 1;
        
        // Update the stroke width input value to match loaded stroke width
        document.getElementById('strokeWidth').value = selectedStrokeWidth;
        
        redrawCanvas();
        updateCursorStyle();
        zoomPercentage.textContent = currentZoom + '%';
    }
}

//KEYBOARD MAPPING FOR ALL TOOLS
document.addEventListener('keydown', handleKeyDown);

function handleKeyDown(event) {
    if (isTeamCodePopupOpen || selectedTool === 'text') return; // Disable keyboard mapping when team code popup is open or text tool is selected

    // Convert key to lowercase for case-insensitive comparison
    const key = event.key.toLowerCase();

    // Mapping of keys to tools
    if (key === 'x' || key === '1') {
        selectTool('select');
        document.getElementById('select').click();
    }
    if (key === 'y' || key === '2') {
        selectTool('pointer');
        document.getElementById('pointer').click();
    }
    if (key === 'r' || key === '3') {
        selectTool('rectangle');
        document.getElementById('rectangle').click();
    }
    if (key === 'c' || key === '4') {
        selectTool('circle');
        document.getElementById('circle').click();
    }
    if (key === 'a' || key === '5') {
        selectTool('arrow');
        document.getElementById('arrow').click();
    }
    if (key === 'p' || key === '6') {
        selectTool('pencil');
        document.getElementById('pencil').click();
    }
    if (key === 'e' || key === '7') {
        selectTool('eraser');
        document.getElementById('eraser').click();
    }
    if (key === 't' || key === '8') {
        selectTool('text');
        document.getElementById('text').click();
    }
    // Theme toggle
    if (event.key === 'q' || event.key === 'Q' || event.key === '*') {
        document.getElementById('theme-btn').click();
    }

    // Undo/Redo
    if (event.ctrlKey && (event.key === 'z' || event.key === 'Z')) {
        event.preventDefault();
        document.getElementById('undo').click();
    }
    if (event.ctrlKey && (event.key === 'y' || event.key === 'Y')) {
        event.preventDefault();
        document.getElementById('redo').click();
    }

    // Clear all
    if (event.ctrlKey && (event.key === 'd' || event.key === 'D')) {
        event.preventDefault();
        document.getElementById('clear').click();
    }

    // // Zoom controls
    // if (event.ctrlKey && event.key === '+') {
    //     event.preventDefault();
    //     document.getElementById('zoom-in').click();
    // }
    // if (event.ctrlKey && event.key === '-') {
    //     event.preventDefault();
    //     document.getElementById('zoom-out').click();
    // }

    if (key === 'w' || key === '9') document.getElementById('colorPicker').click();
    if (key === 'm' || key === '0') toggleMainToolbar2();
}

function selectTool(toolId) {
    // Remove active class from all tools
    document.querySelectorAll('.tool').forEach(tool => tool.classList.remove('active'));
    // Add active class to selected tool
    document.getElementById(toolId).classList.add('active');
    selectedTool = toolId;

    // Re-enable keyboard mapping when switching from text tool
    if (toolId !== 'text') {
        document.addEventListener('keydown', handleKeyDown);
    } else {
        document.removeEventListener('keydown', handleKeyDown);
    }
}

// Add your team joining logic here
function showTeamCodePopup() {
    document.getElementById('teamCodePopup').style.display = 'block';
    isTeamCodePopupOpen = true;
}

function hideTeamCodePopup() {
    document.getElementById('teamCodePopup').style.display = 'none';
    isTeamCodePopupOpen = false;
}

function joinTeam() {
    const teamCode = document.getElementById('teamCode').value;

    hideTeamCodePopup();
}

// Save data on window unload
window.addEventListener('beforeunload', saveAllData);

// Load data on window load
window.addEventListener('load', loadAllData);
