function handleEdit() {
    // Toggle element selection mode
    selectTool('pointer');
    document.getElementById('pointer').click();
}

function handleView() {
    // Reset zoom to 100%
    currentZoom = 100;
    scale = 1;
    zoomPercentage.textContent = '100%';
    redrawCanvas();
}

function handleExport() {
    const canvas = document.getElementById('canvas');
    const link = document.createElement('a');
    link.download = 'inkflow-drawing.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

function handleInsertEmbed() {
    const url = prompt('Enter URL to embed:');
    if (url) {
        // Store embed URL in elements array
        elements.push({
            type: 'embed',
            url: url,
            x1: canvas.width / 4,
            y1: canvas.height / 4
        });
        redrawCanvas();
    }
}

function handleUploadMedia() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    elements.push({
                        type: 'image',
                        x1: canvas.width / 4,
                        y1: canvas.height / 4,
                        width: img.width,
                        height: img.height,
                        src: event.target.result
                    });
                    redrawCanvas();
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    };
    input.click();
}

function handleDownload() {
    const dataStr = JSON.stringify(elements);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const exportName = 'inkflow-data.json';

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportName);
    linkElement.click();
}

function handlePreferences() {
    alert('Preferences will be available in the next update!');
}

function handleLanguage() {
    alert('Language settings will be available in the next update!');
}

function handleKeyboardBinding() {
    alert('Keyboard binding customization will be available in the next update!');
}

function handleDocs() {
    window.open('https://github.com/yourusername/inkflow/wiki', '_blank');
}

// Clipboard for cut/copy/paste operations
let clipboard = null;

function handleUndo() {
    document.getElementById('undo').click();
}

function handleRedo() {
    document.getElementById('redo').click();
}

function handleCut() {
    if (selectedElement) {
        clipboard = JSON.parse(JSON.stringify(selectedElement));
        elements = elements.filter(el => el !== selectedElement);
        selectedElement = null;
        redrawCanvas();
    }
}

function handleCopy() {
    if (selectedElement) {
        clipboard = JSON.parse(JSON.stringify(selectedElement));
    }
}

function handlePaste() {
    if (clipboard) {
        const newElement = JSON.parse(JSON.stringify(clipboard));
        // Offset pasted element slightly to make it visible
        newElement.x1 += 20;
        newElement.y1 += 20;
        if (newElement.x2) newElement.x2 += 20;
        if (newElement.y2) newElement.y2 += 20;
        elements.push(newElement);
        redrawCanvas();
    }
}

function handleSelectAll() {
    // Switch to pointer tool
    selectTool('pointer');
    document.getElementById('pointer').click();
    // Select all elements (highlight them)
    elements.forEach(element => {
        element.selected = true;
    });
    redrawCanvas();
}

function handleDeleteAll() {
    if (confirm('Are you sure you want to delete all elements?')) {
        elements = [];
        redrawCanvas();
    }
}

function handleZoomIn() {
    document.getElementById('zoom-in').click();
}

function handleZoomOut() {
    document.getElementById('zoom-out').click();
}

function handleZoomReset() {
    currentZoom = 100;
    scale = 1;
    zoomPercentage.textContent = '100%';
    redrawCanvas();
}

function handleZoomToFit() {
    // Calculate the bounds of all elements
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    elements.forEach(element => {
        minX = Math.min(minX, element.x1, element.x2 || element.x1);
        minY = Math.min(minY, element.y1, element.y2 || element.y1);
        maxX = Math.max(maxX, element.x1, element.x2 || element.x1);
        maxY = Math.max(maxY, element.y1, element.y2 || element.y1);
    });

    if (minX === Infinity) return; // No elements to fit

    const padding = 50;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;
    const canvasRatio = canvas.width / canvas.height;
    const contentRatio = width / height;

    let newZoom;
    if (contentRatio > canvasRatio) {
        newZoom = (canvas.width / width) * 90; // 90% of full width
    } else {
        newZoom = (canvas.height / height) * 90; // 90% of full height
    }

    currentZoom = Math.min(Math.max(Math.round(newZoom), 70), 200);
    scale = currentZoom / 100;
    zoomPercentage.textContent = currentZoom + '%';
    redrawCanvas();
}

// Export functions
function handleExportPNG() {
    const canvas = document.getElementById('canvas');
    const link = document.createElement('a');
    link.download = 'inkflow-drawing.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
}

function handleExportSVG() {
    const roughCanvas = document.getElementById('canvas');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', roughCanvas.width);
    svg.setAttribute('height', roughCanvas.height);

    elements.forEach(element => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        // Convert canvas elements to SVG paths
        path.setAttribute('d', getSVGPath(element));
        path.setAttribute('stroke', element.color);
        path.setAttribute('fill', element.fillColor || 'none');
        svg.appendChild(path);
    });

    const svgData = new XMLSerializer().serializeToString(svg);
    const blob = new Blob([svgData], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.download = 'inkflow-drawing.svg';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
}

function handleExportJPG() {
    const canvas = document.getElementById('canvas');
    const link = document.createElement('a');
    link.download = 'inkflow-drawing.jpg';
    link.href = canvas.toDataURL('image/jpeg', 0.8);
    link.click();
}

let currentLink = '';
function handleGenerateLink() {
    const canvas = document.getElementById('canvas');
    const imageData = canvas.toDataURL('image/png');

    // Generate a random string for the URL
    const randomString = Math.random().toString(36).substring(2, 15);
    currentLink = `https://inkflow.app/share/${randomString}`;

    // Store the image data in localStorage (in a real app, this would be server-side)
    localStorage.setItem(randomString, imageData);

    // Copy link to clipboard
    navigator.clipboard.writeText(currentLink).then(() => {
        // Show a tooltip or notification that link was copied
        const notification = document.createElement('div');
        notification.textContent = 'Link copied to clipboard!';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 9999;
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 2000);
    });
}

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey) {
        switch (e.key.toLowerCase()) {
            case 'z':
                e.preventDefault();
                handleUndo();
                break;
            case 'y':
                e.preventDefault();
                handleRedo();
                break;
            case 'x':
                e.preventDefault();
                handleCut();
                break;
            case 'c':
                e.preventDefault();
                handleCopy();
                break;
            case 'v':
                e.preventDefault();
                handlePaste();
                break;
            case 'a':
                e.preventDefault();
                handleSelectAll();
                break;
            case 'd':
                e.preventDefault();
                handleDeleteAll();
                break;
        }
    }
});

// Add keyboard shortcuts for zoom controls
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey) {
        switch (e.key) {
            case '0':
                e.preventDefault();
                handleZoomReset();
                break;
            case '1':
                e.preventDefault();
                handleZoomToFit();
                break;
        }
    }
});

// Add keyboard shortcuts for export functions
document.addEventListener('keydown', (e) => {
    if (e.altKey) {
        switch (e.key.toLowerCase()) {
            case 'p':
                e.preventDefault();
                handleExportPNG();
                break;
            case 's':
                e.preventDefault();
                handleExportSVG();
                break;
            case 'j':
                e.preventDefault();
                handleExportJPG();
                break;
            case 'l':
                e.preventDefault();
                handleGenerateLink();
                break;
        }
    }
});

// Helper function to convert canvas elements to SVG paths
function getSVGPath(element) {
    switch (element.type) {
        case 'line':
            return `M ${element.x1} ${element.y1} L ${element.x2} ${element.y2}`;
        case 'rectangle':
            return `M ${element.x1} ${element.y1} h ${element.x2 - element.x1} v ${element.y2 - element.y1} h ${element.x1 - element.x2} Z`;
        // Add more cases for other shapes
        default:
            return '';
    }
}
