let selectedTool = document.querySelector(".bxs-pointer");
let history = [];
let redoStack = [];
let shapes = [];
const svg = document.querySelector('#freehand-canvas');
const tools = document.querySelectorAll(".toolbar i");
const roughCanvas = window.rough.svg(svg);  
const roughGenerator = roughCanvas.generator;
let currentShape = null;
let lastMousePos = null; 

const eraserCursorSVG = `data:image/svg+xml;base64,${btoa(`
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
    <circle cx="10" cy="10" r="7" fill="#222" stroke="white" stroke-width="2"/>
  </svg>
`)}`;

const lazerCursor = `data:image/svg+xml;base64,${btoa(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
    <g fill="none" stroke="#fff" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round" transform="rotate(90 10 10)">
      <path clip-rule="evenodd" d="m9.644 13.69 7.774-7.773a2.357 2.357 0 0 0-3.334-3.334l-7.773 7.774L8 12l1.643 1.69Z"></path>
      <path d="m13.25 3.417 3.333 3.333M10 10l2-2M5 15l3-3M2.156 17.894l1-1M5.453 19.029l-.144-1.407M2.377 11.887l.866 1.118M8.354 17.273l-1.194-.758M.953 14.652l1.408.13"></path>
    </g>
  </svg>
`)}`;


let currentZoom = 1;
const minScale = 0.4;
const maxScale = 30; 
const minZoom = 0.4;
const maxZoom = 30; 
let currentTranslation = { x: 0, y: 0 }; 
const freehandCanvas = document.getElementById("freehand-canvas");
const zoomInBtn = document.getElementById("zoomIn");
const zoomOutBtn = document.getElementById("zoomOut");
const zoomPercentSpan = document.getElementById("zoomPercent");
let currentMatrix = new DOMMatrix();
let container  = document.querySelector(".container");
let isPanning = false;
let panStart = null;
let startCanvasX, startCanvasY;
let currentViewBox = {
  x: 0,
  y: 0,
  width: window.innerWidth,
  height: window.innerHeight
};


let isPaintToolActive = false;
let isTextToolActive = false;
let isCircleToolActive = false;
let isSquareToolActive = false;
let isLaserToolActive = false;
let isEraserToolActive  = false;
let isImageToolActive = false;
let isArrowToolActive = false;
let isLineToolActive = false;
let isSelectionToolActive = false;
let isPanningToolActive = false;
let isFrameToolActive = false;
let isIconToolActive = false;
let isCodeToolActive = false;
let isTextInCodeMode = false;

const paintBrushSideBar = document.getElementById("paintBrushToolBar");
const lineSideBar = document.getElementById("lineSideBar");
const squareSideBar = document.getElementById("squareSideBar");
const circleSideBar = document.getElementById("circleSideBar");
const arrowSideBar = document.getElementById("arrowSideBar");
const textSideBar = document.getElementById("textToolBar");
const frameSideBar = document.getElementById("frameSideBar");

const ACTION_CREATE = "create";
const ACTION_DELETE = "delete";
const ACTION_MODIFY = "modify";  
const ACTION_PASTE = "paste";

document.addEventListener("click", function(event) {
  const menuIcon = document.getElementById("menuIcon");
  const menu = document.querySelector(".menu");

  if (menuIcon.contains(event.target)) {
    menu.classList.toggle("hidden");
  } else if (!menu.contains(event.target)) {
    menu.classList.add("hidden");
  }
});

// --- Menu item action handlers ---
document.addEventListener("DOMContentLoaded", function() {
  const menu = document.querySelector(".menu");
  if (!menu) return;

  menu.addEventListener("click", function(e) {
    const item = e.target.closest("span[data-action]");
    if (!item) return;

    const action = item.dataset.action;
    menu.classList.add("hidden");

    switch (action) {
      case "shortcuts":
        toggleShortcutsModal();
        break;

      case "reset":
        if (confirm("Are you sure you want to reset the canvas? All shapes will be deleted.")) {
          if (typeof shapes !== 'undefined') {
            shapes.forEach(shape => {
              if (shape.group && shape.group.parentNode) {
                shape.group.parentNode.removeChild(shape.group);
              }
            });
            shapes.length = 0;
          }
          if (typeof history !== 'undefined') history.length = 0;
          if (typeof redoStack !== 'undefined') redoStack.length = 0;
          if (typeof clearAllSelections === 'function') clearAllSelections();
          if (typeof updateUndoRedoButtons === 'function') updateUndoRedoButtons();
          currentShape = null;
        }
        break;

      case "save":
        toggleSaveAsModal();
        break;

      case "github":
        window.open("https://github.com/elixpo/elixposketch", "_blank");
        break;

      case "help":
        toggleShortcutsModal();
        break;

      case "find":
        // Placeholder — no find implementation yet
        break;

      case "open":
        // Placeholder — no open/load implementation yet
        break;

      case "report":
        window.open("https://github.com/elixpo/elixposketch/issues", "_blank");
        break;

      case "follow":
        window.open("https://github.com/elixpo", "_blank");
        break;
    }
  });

  // --- Theme toggle ---
  const themeIcons = menu.querySelectorAll(".themeControlIcons");
  themeIcons.forEach(icon => {
    icon.addEventListener("click", function(e) {
      e.stopPropagation();
      themeIcons.forEach(i => i.classList.remove("selected"));
      this.classList.add("selected");
    });
  });

  // --- Canvas background color ---
  const colorOptions = menu.querySelectorAll(".colorOptionsCanvas");
  colorOptions.forEach(option => {
    option.addEventListener("click", function(e) {
      e.stopPropagation();
      colorOptions.forEach(o => o.classList.remove("selected"));
      this.classList.add("selected");
      const color = this.dataset.id;
      svg.style.background = color;
    });
  });

  // --- Ctrl+/ button in header ---
  const ctrlSlashBtn = document.querySelector(".outsourceBtns.shareBtn:last-of-type");
  if (ctrlSlashBtn && ctrlSlashBtn.textContent.trim() === "Ctrl + /") {
    ctrlSlashBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      toggleShortcutsModal();
    });
  }

  // --- Save As modal handlers ---
  const saveModal = document.getElementById("saveAsModal");
  if (saveModal) {
    saveModal.querySelector(".save-modal-overlay").addEventListener("click", () => saveModal.classList.add("hidden"));
    saveModal.querySelector(".save-modal-close").addEventListener("click", () => saveModal.classList.add("hidden"));

    saveModal.querySelectorAll(".save-option:not(.disabled)").forEach(option => {
      option.addEventListener("click", function() {
        const format = this.dataset.format;
        saveModal.classList.add("hidden");
        const name = document.getElementById("workspaceNameInput").value || "LixSketch";

        switch (format) {
          case "png":
            exportCanvasAsImage(name);
            break;
          case "pdf":
            exportCanvasAsPDF(name);
            break;
        }
      });
    });
  }
});

// --- Save As modal toggle ---
function toggleSaveAsModal() {
  const modal = document.getElementById("saveAsModal");
  if (!modal) return;
  modal.classList.toggle("hidden");
}

// --- Export canvas as PNG ---
function exportCanvasAsImage(name) {
  const svgClone = svg.cloneNode(true);
  // Remove any UI overlays (selection boxes, resize handles, etc.)
  svgClone.querySelectorAll('.selection-box, .resize-handle, .multi-selection-rect').forEach(el => el.remove());

  const svgData = new XMLSerializer().serializeToString(svgClone);
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = function() {
    const canvas = document.createElement("canvas");
    canvas.width = svg.viewBox.baseVal.width || svg.clientWidth;
    canvas.height = svg.viewBox.baseVal.height || svg.clientHeight;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = svg.style.background || "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    const link = document.createElement("a");
    link.download = name + ".png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };
  img.src = url;
}

// --- Export canvas as PDF ---
function exportCanvasAsPDF(name) {
  const svgClone = svg.cloneNode(true);
  svgClone.querySelectorAll('.selection-box, .resize-handle, .multi-selection-rect').forEach(el => el.remove());

  const svgData = new XMLSerializer().serializeToString(svgClone);
  const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  img.onload = function() {
    const canvas = document.createElement("canvas");
    const w = svg.viewBox.baseVal.width || svg.clientWidth;
    const h = svg.viewBox.baseVal.height || svg.clientHeight;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = svg.style.background || "#000";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    const imgData = canvas.toDataURL("image/png");

    // Build a minimal PDF with the image embedded
    const pdfWindow = window.open("", "_blank");
    if (pdfWindow) {
      pdfWindow.document.write(`
        <html><head><title>${name}</title>
        <style>
          @page { size: ${w}px ${h}px; margin: 0; }
          body { margin: 0; }
          img { width: 100%; height: 100%; }
        </style></head>
        <body><img src="${imgData}" onload="window.print();" /></body></html>
      `);
      pdfWindow.document.close();
    }
  };
  img.src = url;
}


function toolExtraPopup() {
    if (selectedTool.classList.contains("bx-stroke-pen")) {

        disableAllTools();
        disSelectAllTools();
        document.querySelector(".bx-stroke-pen").classList.add("selected");
        isPaintToolActive = true;
        svg.style.cursor = "crosshair"
        disableAllSideBars();
        paintBrushSideBar.classList.remove("hidden");
    }
    else if (selectedTool.classList.contains("bx-square")) {

        disableAllTools();
        disSelectAllTools();
        document.querySelector(".bx-square").classList.add("selected");
        svg.style.cursor = "crosshair"
        isSquareToolActive = true;
        disableAllSideBars();
        squareSideBar.classList.remove("hidden");
    }
    else if(selectedTool.classList.contains("bx-circle"))
    {

        disableAllTools();
        disSelectAllTools();
        document.querySelector(".bx-circle").classList.add("selected");
        svg.style.cursor = "crosshair"
        isCircleToolActive = true;
        disableAllSideBars();
        circleSideBar.classList.remove("hidden"); 
    }
    else if(selectedTool.classList.contains("bx-right-arrow-alt"))
    {
        disableAllTools();
        disSelectAllTools();
        document.querySelector(".bx-right-arrow-alt").classList.add("selected");
        isArrowToolActive = true;
        disableAllSideBars();
        arrowSideBar.classList.remove("hidden");
    }
    else if(selectedTool.classList.contains("bxs-pointer"))
    {
        disableAllTools();
        disSelectAllTools();
        document.querySelector(".bxs-pointer").classList.add("selected");
        isSelectionToolActive = true;
        svg.style.cursor = "all-scroll";
        disableAllSideBars();
    }
    else if(selectedTool.classList.contains("bxs-hand"))
    {
        disableAllTools();
        disSelectAllTools();
        document.querySelector(".bxs-hand").classList.add("selected");
        isPanningToolActive = true;
        svg.style.cursor = "grab";
        disableAllSideBars();
    }
    else if(selectedTool.classList.contains("bx-text"))
    {
      disableAllTools();
      disSelectAllTools();
      document.querySelector(".bx-text").classList.add("selected");
      isTextToolActive = true;
      if (isTextInCodeMode) {
        isCodeToolActive = true;
      }
      svg.style.cursor = "text";
      disableAllSideBars();
      textSideBar.classList.remove("hidden");
      // Show/hide language selector based on mode
      const langSelector = document.getElementById("textLanguageSelector");
      if (langSelector) {
        langSelector.classList.toggle("hidden", !isTextInCodeMode);
      }
    }
    else if(selectedTool.classList.contains("bxs-magic-wand"))
    {
        disableAllTools();
        disSelectAllTools();
        document.querySelector(".bxs-magic-wand").classList.add("selected");
        svg.style.cursor = "crosshair";
        isLaserToolActive = true;
        disableAllSideBars();
    }
    else if(selectedTool.classList.contains("bxs-minus"))
    {
        disableAllTools();
        disSelectAllTools();
        document.querySelector(".bxs-minus").classList.add("selected");
        svg.style.cursor = "crosshair";
        isLineToolActive = true;
        disableAllSideBars();
        lineSideBar.classList.remove("hidden");
    }
    else if(selectedTool.classList.contains("bxs-eraser"))
    {
        disableAllTools();
        disSelectAllTools();
        document.querySelector(".bxs-eraser").classList.add("selected");
        isEraserToolActive  = true;
        svg.style.cursor = `url(${eraserCursorSVG}) 10 10, auto`; // Maintain custom cursor
        disableAllSideBars();
    }
    else if(selectedTool.classList.contains("bx-image-alt"))
    {
        disableAllTools();
        disSelectAllTools();
        document.querySelector(".bx-image-alt").classList.add("selected");
        disableAllSideBars();
        svg.style.cursor = "crosshair"
    }
    else if(selectedTool.classList.contains("bx-frame"))
    {
        disableAllTools();
        disSelectAllTools();
        isFrameToolActive = true;
        document.querySelector(".bx-frame").classList.add("selected");
        disableAllSideBars();
        svg.style.cursor = "crosshair"
    }
    else if(selectedTool.classList.contains("bx-wink-smile"))
    {
        disableAllTools();
        disSelectAllTools();
        isIconToolActive = true;
        document.querySelector(".bx-wink-smile").classList.add("selected");
        disableAllSideBars();
        svg.style.cursor = "crosshair"
    }
    else {
        disableAllTools();
        disSelectAllTools();
        disableAllSideBars();
        svg.style.cursor = "crosshair"
    }
    

}


function disSelectAllTools()
{
  tools.forEach(t => t.classList.remove("selected"));
}

function disableAllSideBars()
{
  paintBrushSideBar.classList.add("hidden");
  lineSideBar.classList.add("hidden");
  squareSideBar.classList.add("hidden");
  circleSideBar.classList.add("hidden");
  arrowSideBar.classList.add("hidden");
  textSideBar.classList.add("hidden");
  if (frameSideBar) frameSideBar.classList.add("hidden");
}
function disableAllTools() 
{
  isPaintToolActive = false;
  isSquareToolActive = false;
  isCircleToolActive = false;
  isArrowToolActive = false;
  isTextToolActive = false;
  isLaserToolActive = false;
  isLineToolActive = false;
  isEraserToolActive  = false;
  isSelectionToolActive = false;
  isImageToolActive = false;
  isPanningToolActive = false;
  isFrameToolActive = false;
  isIconToolActive = false;
  isCodeToolActive = false;
}


tools.forEach(tool => tool.addEventListener("click", handleToolSelection));
function handleToolSelection(event) {
  // Deselect any currently selected shape before switching tools
  if (typeof currentShape !== 'undefined' && currentShape && typeof currentShape.removeSelection === 'function') {
    currentShape.removeSelection();
    currentShape = null;
  }
  if (typeof clearAllSelections === 'function') clearAllSelections();

  tools.forEach(t => t.classList.remove("selected"));
  const tool = event.target;
  tool.classList.add("selected");
  selectedTool = tool;
  toolExtraPopup();
}

window.onload = () => {
  toolExtraPopup();
  // updateUndoRedoButtons();
  resizeCanvas();
};

// --- Programmatic tool selection by icon class ---
function selectToolByClass(iconClass) {
  // Deselect current shape
  if (typeof currentShape !== 'undefined' && currentShape && typeof currentShape.removeSelection === 'function') {
    currentShape.removeSelection();
    currentShape = null;
  }
  if (typeof clearAllSelections === 'function') clearAllSelections();

  const toolIcon = document.querySelector(`.toolbar .${iconClass}`);
  if (!toolIcon) return;

  tools.forEach(t => t.classList.remove("selected"));
  toolIcon.classList.add("selected");
  selectedTool = toolIcon;
  toolExtraPopup();
}

// --- Keyboard shortcut map: key -> icon class ---
const toolShortcutMap = {
  'h': 'bxs-hand',       // Hand / Pan
  'v': 'bxs-pointer',    // Selection
  '1': 'bxs-pointer',    // Selection (alt)
  'r': 'bx-square',      // Rectangle
  '2': 'bx-square',      // Rectangle (alt)
  'o': 'bx-circle',      // Ellipse
  '4': 'bx-circle',      // Ellipse (alt)
  'a': 'bx-right-arrow-alt', // Arrow
  '5': 'bx-right-arrow-alt', // Arrow (alt)
  'l': 'bxs-minus',      // Line
  '6': 'bxs-minus',      // Line (alt)
  'p': 'bx-stroke-pen',  // Draw / Pen
  '7': 'bx-stroke-pen',  // Draw (alt)
  't': 'bx-text',        // Text
  '8': 'bx-text',        // Text (alt)
  '9': 'bx-image-alt',   // Insert image
  'e': 'bxs-eraser',     // Eraser
  '0': 'bxs-eraser',     // Eraser (alt)
  'f': 'bx-frame',       // Frame
  'k': 'bxs-magic-wand', // Laser pointer
};

// --- Central keyboard shortcut handler ---
document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();

  // --- Global Ctrl shortcuts that work even when typing ---
  if (e.ctrlKey || e.metaKey) {
    if (key === 's') {
      e.preventDefault();
      toggleSaveAsModal();
      return;
    }
    if (key === '/') {
      e.preventDefault();
      toggleShortcutsModal();
      return;
    }
  }

  // Skip if user is typing in an input, textarea, or contenteditable
  const tag = e.target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
  // Skip if a text/code editor overlay is active
  if (document.querySelector('.text-edit-overlay:not(.hidden)')) return;

  // --- Ctrl/Cmd shortcuts ---
  if (e.ctrlKey || e.metaKey) {
    // Select All: Ctrl+A
    if (key === 'a' && !e.shiftKey) {
      e.preventDefault();
      // Switch to selection tool first
      selectToolByClass('bxs-pointer');
      // Select all shapes
      if (typeof shapes !== 'undefined' && shapes.length > 0 && typeof clearAllSelections === 'function') {
        clearAllSelections();
        shapes.forEach(shape => {
          if (typeof multiSelection !== 'undefined') {
            multiSelection.addShape(shape);
          }
        });
      }
      return;
    }

    // Group: Ctrl+G
    if (key === 'g' && !e.shiftKey) {
      e.preventDefault();
      if (typeof multiSelection !== 'undefined' && multiSelection.selectedShapes.size > 1) {
        groupSelectedShapes();
      }
      return;
    }

    // Ungroup: Ctrl+Shift+G
    if (key === 'g' && e.shiftKey) {
      e.preventDefault();
      if (typeof currentShape !== 'undefined' && currentShape && currentShape.shapeName === 'frame') {
        ungroupFrame(currentShape);
      }
      return;
    }

    // Duplicate: Ctrl+D
    if (key === 'd') {
      e.preventDefault();
      duplicateSelection();
      return;
    }

    return; // Don't process tool shortcuts when Ctrl is held
  }

  // --- Tool switching shortcuts (no modifier keys) ---
  if (!e.shiftKey && !e.altKey) {
    const iconClass = toolShortcutMap[key];
    if (iconClass) {
      e.preventDefault();
      selectToolByClass(iconClass);
      return;
    }

    // Escape: close any open modal, otherwise deselect all
    if (e.key === 'Escape') {
      const shortcutsModal = document.getElementById('shortcutsModal');
      if (shortcutsModal && !shortcutsModal.classList.contains('hidden')) {
        shortcutsModal.classList.add('hidden');
        return;
      }
      const saveModal = document.getElementById('saveAsModal');
      if (saveModal && !saveModal.classList.contains('hidden')) {
        saveModal.classList.add('hidden');
        return;
      }
      if (typeof currentShape !== 'undefined' && currentShape && typeof currentShape.removeSelection === 'function') {
        currentShape.removeSelection();
        currentShape = null;
      }
      if (typeof clearAllSelections === 'function') clearAllSelections();
      disableAllSideBars();
      return;
    }
  }
});

// --- Shortcuts modal toggle ---
function toggleShortcutsModal() {
  const modal = document.getElementById('shortcutsModal');
  if (!modal) return;
  modal.classList.toggle('hidden');
}

// Close modal when clicking overlay or close button
document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('shortcutsModal');
  if (!modal) return;
  modal.querySelector('.shortcuts-overlay').addEventListener('click', () => modal.classList.add('hidden'));
  modal.querySelector('.shortcuts-close').addEventListener('click', () => modal.classList.add('hidden'));
});

// --- Group selected shapes into a frame ---
function groupSelectedShapes() {
  if (typeof multiSelection === 'undefined' || multiSelection.selectedShapes.size < 2) return;

  const shapesArr = Array.from(multiSelection.selectedShapes);

  // Calculate bounding box of all selected shapes
  const bounds = multiSelection.getBounds();
  if (!bounds) return;

  // Add padding
  const padding = 20;
  const frameX = bounds.x - padding;
  const frameY = bounds.y - padding;
  const frameW = bounds.width + padding * 2;
  const frameH = bounds.height + padding * 2;

  // Clear multi-selection first
  multiSelection.clearSelection();

  // Create a frame via Frame class if available
  if (typeof Frame === 'function') {
    const frame = new Frame(frameX, frameY, frameW, frameH);
    frame.draw();
    shapes.push(frame);

    // Add shapes to frame
    shapesArr.forEach(shape => {
      if (typeof frame.addShapeToFrame === 'function') {
        frame.addShapeToFrame(shape);
      }
    });

    // Push create action for undo
    if (typeof pushCreateAction === 'function') {
      pushCreateAction(frame);
    }

    // Select the frame
    currentShape = frame;
    if (typeof frame.addAnchors === 'function') {
      frame.addAnchors();
    }
  }
}

// --- Ungroup a frame (release children) ---
function ungroupFrame(frame) {
  if (!frame || frame.shapeName !== 'frame') return;

  // Release all children from frame
  if (frame.containedShapes && frame.containedShapes.length > 0) {
    const children = [...frame.containedShapes];
    children.forEach(child => {
      if (typeof frame.removeShapeFromFrame === 'function') {
        frame.removeShapeFromFrame(child);
      }
    });
  }

  // Remove frame selection
  if (typeof frame.removeSelection === 'function') {
    frame.removeSelection();
  }

  // Remove frame from DOM
  if (frame.group && frame.group.parentNode) {
    frame.group.parentNode.removeChild(frame.group);
  }

  // Remove from shapes array
  const idx = shapes.indexOf(frame);
  if (idx !== -1) shapes.splice(idx, 1);

  // Push delete action for undo
  if (typeof pushDeleteAction === 'function') {
    pushDeleteAction(frame);
  }

  currentShape = null;
  disableAllSideBars();
}

// --- Duplicate current selection ---
function duplicateSelection() {
  const offset = 20;

  // Multi-selection duplicate
  if (typeof multiSelection !== 'undefined' && multiSelection.selectedShapes.size > 0) {
    const newShapes = [];
    multiSelection.selectedShapes.forEach(shape => {
      const dup = duplicateSingleShape(shape, offset);
      if (dup) newShapes.push(dup);
    });
    multiSelection.clearSelection();
    newShapes.forEach(s => {
      if (typeof multiSelection.addShape === 'function') {
        multiSelection.addShape(s);
      }
    });
    return;
  }

  // Single shape duplicate
  if (currentShape) {
    const dup = duplicateSingleShape(currentShape, offset);
    if (dup) {
      if (typeof currentShape.removeSelection === 'function') currentShape.removeSelection();
      currentShape = dup;
      if (typeof dup.addAnchors === 'function') dup.addAnchors();
    }
  }
}

function duplicateSingleShape(shape, offset) {
  if (!shape) return null;

  let newShape = null;
  switch (shape.shapeName) {
    case 'rectangle':
      if (typeof Rectangle === 'function') {
        newShape = new Rectangle(shape.x + offset, shape.y + offset, shape.width, shape.height);
        newShape.strokeColor = shape.strokeColor;
        newShape.fillColor = shape.fillColor;
        newShape.strokeWidth = shape.strokeWidth;
        newShape.roughness = shape.roughness;
        newShape.fillStyle = shape.fillStyle;
        newShape.draw();
        shapes.push(newShape);
      }
      break;
    case 'circle':
      if (typeof Circle === 'function') {
        newShape = new Circle(shape.x + offset, shape.y + offset, shape.rx, shape.ry);
        newShape.strokeColor = shape.strokeColor;
        newShape.fillColor = shape.fillColor;
        newShape.strokeWidth = shape.strokeWidth;
        newShape.roughness = shape.roughness;
        newShape.fillStyle = shape.fillStyle;
        newShape.draw();
        shapes.push(newShape);
      }
      break;
    case 'line':
      if (typeof Line === 'function') {
        newShape = new Line(
          { x: shape.startPoint.x + offset, y: shape.startPoint.y + offset },
          { x: shape.endPoint.x + offset, y: shape.endPoint.y + offset }
        );
        newShape.strokeColor = shape.strokeColor;
        newShape.strokeWidth = shape.strokeWidth;
        newShape.draw();
        shapes.push(newShape);
      }
      break;
    case 'frame':
      if (typeof Frame === 'function') {
        newShape = new Frame(shape.x + offset, shape.y + offset, shape.width, shape.height);
        newShape.draw();
        shapes.push(newShape);
      }
      break;
    default:
      return null;
  }

  if (newShape && typeof pushCreateAction === 'function') {
    pushCreateAction(newShape);
  }
  return newShape;
}

// Expose new functions globally
window.selectToolByClass = selectToolByClass;
window.groupSelectedShapes = groupSelectedShapes;
window.ungroupFrame = ungroupFrame;
window.duplicateSelection = duplicateSelection;

