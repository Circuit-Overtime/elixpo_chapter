/* eslint-disable */
// Event dispatcher - extracted from eventListeners.js
// Central event routing for all tools

import { handleMouseDownRect, handleMouseMoveRect, handleMouseUpRect } from '../tools/rectangleTool.js';
import { handleMouseDownArrow, handleMouseMoveArrow, handleMouseUpArrow } from '../tools/arrowTool.js';
import { handleMouseDownCircle, handleMouseMoveCircle, handleMouseUpCircle } from '../tools/circleTool.js';
import { handleMouseUpImage, handleMouseDownImage, handleMouseMoveImage } from '../tools/imageTool.js';
import { handleMouseDownLine, handleMouseMoveLine, handleMouseUpLine } from '../tools/lineTool.js';
import { handleFreehandMouseDown, handleFreehandMouseMove, handleFreehandMouseUp } from '../tools/freehandTool.js';
import { handleTextMouseDown, handleTextMouseMove, handleTextMouseUp } from '../tools/textTool.js';
import { handleMouseDownFrame, handleMouseMoveFrame, handleMouseUpFrame } from '../tools/frameTool.js';
import { handleMultiSelectionMouseDown, handleMultiSelectionMouseMove, handleMultiSelectionMouseUp, removeMultiSelectionRect, multiSelection, isMultiSelecting} from './Selection.js';
import { handleMouseDownIcon, handleMouseMoveIcon, handleMouseUpIcon } from '../tools/iconTool.js';
import { handleCodeMouseDown, handleCodeMouseMove, handleCodeMouseUp } from '../tools/codeTool.js';

const handleMainMouseDown = (e) => {
    // Safety: remove any stray selection rectangle from a previous interrupted drag
    removeMultiSelectionRect();

    // For non-selection tools: deselect everything when clicking on empty canvas
    // (Selection tool handles its own deselection in handleMultiSelectionMouseDown)
    if (!isSelectionToolActive) {
        // Clear multi-selection for any tool switch
        if (multiSelection.selectedShapes.size > 0) {
            multiSelection.clearSelection();
        }
        // Deselect current individual shape when starting a new tool action
        if (currentShape && typeof currentShape.removeSelection === 'function') {
            currentShape.removeSelection();
            currentShape = null;
        }
        if (typeof disableAllSideBars === 'function') {
            disableAllSideBars();
        }
    }

    if (isSquareToolActive) {
        handleMouseDownRect(e);
    } else if (isArrowToolActive) {
        handleMouseDownArrow(e);
    } else if (isCircleToolActive) {
        handleMouseDownCircle(e);
    } else if (isImageToolActive) {
        handleMouseDownImage(e);
    } 
    else if (isLineToolActive) {
        handleMouseDownLine(e);
    }
    else if (isPaintToolActive) {
        handleFreehandMouseDown(e);
    }
    else if (isTextToolActive) {
        // Text tool handles both text and code shapes based on target and mode
        const targetCodeGroup = e.target.closest('g[data-type="code-group"]');
        const targetTextGroup = e.target.closest('g[data-type="text-group"]');
        if (targetCodeGroup && !targetTextGroup) {
            handleCodeMouseDown(e);
        } else if (isTextInCodeMode && !targetTextGroup && !targetCodeGroup) {
            handleCodeMouseDown(e);
        } else {
            handleTextMouseDown(e);
        }
    }
    else if (isFrameToolActive) {
        handleMouseDownFrame(e);
    }
    else if (isIconToolActive) {
        handleMouseDownIcon(e);
    }
    else if (isSelectionToolActive) {
        // Try multi-selection first when selection tool is active
        if (handleMultiSelectionMouseDown(e)) {
            return; // Multi-selection handled the event
        }

        // Remember previous shape to detect deselection
        const prevShape = currentShape;
        let handled = false;

        // If multi-selection didn't handle it, proceed with shape-specific selection
        if (currentShape?.shapeName === 'rectangle') {
            handleMouseDownRect(e);
            handled = true;
        } else if (currentShape?.shapeName === 'arrow') {
            handleMouseDownArrow(e);
            handled = true;
        } else if (currentShape?.shapeName === 'circle') {
            handleMouseDownCircle(e);
            handled = true;
        } else if (currentShape?.shapeName === 'image') {
            handleMouseDownImage(e);
            handled = true;
        }
        else if (currentShape?.shapeName === 'line') {
            handleMouseDownLine(e);
            handled = true;
        }
        else if (currentShape?.shapeName === 'freehandStroke') {
            handleFreehandMouseDown(e);
            handled = true;
        }
        else if (currentShape?.shapeName === 'text') {
            handleTextMouseDown(e);
            handled = true;
        }
        else if (currentShape?.shapeName === 'frame') {
            handleMouseDownFrame(e);
            handled = true;
        }
        else if (currentShape?.shapeName === 'icon') {
            handleMouseDownIcon(e);
            handled = true;
        }
        else if( currentShape?.shapeName === 'code') {
            handleCodeMouseDown(e);
            handled = true;
        }

        // If the handler deselected (currentShape cleared) but didn't select something new,
        // fall through to try all handlers so clicking another shape type works
        if (handled && prevShape && !currentShape) {
            handled = false;
        }

        if (!handled) {
            const originalCurrentShape = currentShape;
            handleMouseDownRect(e);
            if (currentShape && currentShape !== originalCurrentShape) return;
            handleMouseDownCircle(e);
            if (currentShape && currentShape !== originalCurrentShape) return;
            handleMouseDownArrow(e);
            if (currentShape && currentShape !== originalCurrentShape) return;
            handleMouseDownImage(e);
            if (currentShape && currentShape !== originalCurrentShape) return;
            handleMouseDownLine(e);
            if (currentShape && currentShape !== originalCurrentShape) return;
            handleFreehandMouseDown(e);
            if (currentShape && currentShape !== originalCurrentShape) return;
            handleTextMouseDown(e);
            if (currentShape && currentShape !== originalCurrentShape) return;
            handleMouseDownFrame(e);
            if (currentShape && currentShape !== originalCurrentShape) return;
            handleMouseDownIcon(e);
            if (currentShape && currentShape !== originalCurrentShape) return;
            handleCodeMouseDown(e);
            if (currentShape && currentShape !== originalCurrentShape) return;
            if (currentShape === originalCurrentShape) {
                if (currentShape) {
                    currentShape.removeSelection();
                    currentShape = null;
                }
            }
        }
    }
};

const handleMainMouseMove = (e) => {
    if (isSquareToolActive) {
        handleMouseMoveRect(e);
    } else if (isArrowToolActive) {
        handleMouseMoveArrow(e);
    } else if (isCircleToolActive) {
        handleMouseMoveCircle(e);
    } else if (isImageToolActive) {
        handleMouseMoveImage(e);
    } 
    else if (isLineToolActive) {
        handleMouseMoveLine(e);
    }
    else if (isPaintToolActive) {
        handleFreehandMouseMove(e);
    }
    else if (isTextToolActive) {
        handleTextMouseMove(e);
        handleCodeMouseMove(e);
    }
    else if (isFrameToolActive) {
        handleMouseMoveFrame(e);
    }
    else if (isIconToolActive) {
        handleMouseMoveIcon(e);
    }
    else if (isSelectionToolActive) {
        // Handle multi-selection operations first - these take priority
        if (isMultiSelecting || multiSelection.isDragging || multiSelection.isResizing || multiSelection.isRotating) {
            if (handleMultiSelectionMouseMove(e)) {
                return; // Multi-selection handled the event
            }
        }
        
        // Shape-specific mouse move handling
        if (currentShape?.shapeName === 'rectangle') {
            handleMouseMoveRect(e);
        } else if (currentShape?.shapeName === 'arrow') {
            handleMouseMoveArrow(e);
        } else if (currentShape?.shapeName === 'circle') {
            handleMouseMoveCircle(e);
        } else if (currentShape?.shapeName === 'image') {
            handleMouseMoveImage(e);
        } 
        else if (currentShape?.shapeName === 'line') {
            handleMouseMoveLine(e);
        }
        else if (currentShape?.shapeName === 'freehandStroke') {
            handleFreehandMouseMove(e);
        }
        else if (currentShape?.shapeName === 'text') {
            handleTextMouseMove(e);
        }
        else if (currentShape?.shapeName === 'frame') {
            handleMouseMoveFrame(e);
        }
        else if (currentShape?.shapeName === 'icon') {
            handleMouseMoveIcon(e);
        }
        else if (currentShape?.shapeName === 'code') {
            handleCodeMouseMove(e);
        }

        else {
            // Try multi-selection mouse move for cursor updates
            if (handleMultiSelectionMouseMove(e)) {
                return;
            }
            
            handleMouseMoveRect(e);
            handleMouseMoveArrow(e);
            handleMouseMoveCircle(e);
            handleMouseMoveImage(e);
            handleMouseMoveLine(e);
            handleFreehandMouseMove(e);
            handleTextMouseMove(e);
            handleMouseMoveFrame(e);
            handleMouseMoveIcon(e);
            handleCodeMouseMove(e);
        }
    }
};

const handleMainMouseUp = (e) => {
    if (isSquareToolActive) {
        handleMouseUpRect(e);
    } else if (isArrowToolActive) {
        handleMouseUpArrow(e);
    } else if (isCircleToolActive) {
        handleMouseUpCircle(e);
    } else if (isImageToolActive) {
        handleMouseUpImage(e);
    } 
    else if (isLineToolActive) {    
        handleMouseUpLine(e);
    }
    else if (isPaintToolActive) {
        handleFreehandMouseUp(e);
    }
    else if (isTextToolActive) {
        handleTextMouseUp(e);
        handleCodeMouseUp(e);
    }
    else if (isFrameToolActive) {
        handleMouseUpFrame(e);
    }
    else if (isIconToolActive) {
        handleMouseUpIcon(e);
    }

    else if (isSelectionToolActive) {
        // Always try multi-selection cleanup first
        if (isMultiSelecting || multiSelection.isDragging || multiSelection.isResizing || multiSelection.isRotating) {
            handleMultiSelectionMouseUp(e);
            return;
        }

        // Shape-specific mouse up handling
        if (currentShape?.shapeName === 'rectangle') {
            handleMouseUpRect(e);
        } else if (currentShape?.shapeName === 'arrow') {
            handleMouseUpArrow(e);
        } else if (currentShape?.shapeName === 'circle') {
            handleMouseUpCircle(e);
        } else if (currentShape?.shapeName === 'image') {
            handleMouseUpImage(e);
        }
        else if (currentShape?.shapeName === 'line') {
            handleMouseUpLine(e);
        }
        else if (currentShape?.shapeName === 'freehandStroke') {
            handleFreehandMouseUp(e);
        }
        else if (currentShape?.shapeName === 'text') {
            handleTextMouseUp(e);
        }
        else if (currentShape?.shapeName === 'frame') {
            handleMouseUpFrame(e);
        }
        else if (currentShape?.shapeName === 'icon') {
            handleMouseUpIcon(e);
        }
        else if (currentShape?.shapeName === 'code') {
            handleCodeMouseUp(e);
        }

        else {
            handleMultiSelectionMouseUp(e);
            handleMouseUpRect(e);
            handleMouseUpArrow(e);
            handleMouseUpCircle(e);
            handleMouseUpImage(e);
            handleMouseUpLine(e);
            handleFreehandMouseUp(e);
            handleTextMouseUp(e);
            handleMouseUpFrame(e);
            handleMouseUpIcon(e);
            handleCodeMouseUp(e);
        }
    }
};

const handleMainMouseLeave = (e) => {
    // Stop all active drawing tools when pointer leaves the canvas

    // Fire mouseUp for whichever tool is active to finalize/cancel the operation
    handleMainMouseUp(e);

    // Always clean up any stray selection rectangle when pointer leaves canvas
    removeMultiSelectionRect();

    // Eraser: force cleanup any lingering trail
    if (typeof window.forceCleanupEraserTrail === 'function') {
        window.forceCleanupEraserTrail();
    }

    // Laser: stop drawing and fade out active laser (globals from laserTool.js)
    if (typeof isDrawing !== 'undefined' && isDrawing) {
        isDrawing = false;
        if (typeof lasers !== 'undefined' && lasers.length > 0 && typeof fadeLaserTrail === 'function') {
            const lastLaser = lasers[lasers.length - 1];
            fadeLaserTrail(lastLaser);
        }
    }
};

let _boundSvg = null;

function initEventDispatcher(svgEl) {
    if (_boundSvg) cleanupEventDispatcher();
    const target = svgEl || svg;
    target.addEventListener('mousedown', handleMainMouseDown);
    target.addEventListener('mousemove', handleMainMouseMove);
    target.addEventListener('mouseup', handleMainMouseUp);
    target.addEventListener('mouseleave', handleMainMouseLeave);
    _boundSvg = target;
}

function cleanupEventDispatcher() {
    if (_boundSvg) {
        _boundSvg.removeEventListener('mousedown', handleMainMouseDown);
        _boundSvg.removeEventListener('mousemove', handleMainMouseMove);
        _boundSvg.removeEventListener('mouseup', handleMainMouseUp);
        _boundSvg.removeEventListener('mouseleave', handleMainMouseLeave);
        _boundSvg = null;
    }
}

// Auto-init if svg is already available (first load)
if (typeof svg !== 'undefined' && svg) {
    initEventDispatcher(svg);
}

export { handleMainMouseDown, handleMainMouseMove, handleMainMouseUp, handleMainMouseLeave, initEventDispatcher, cleanupEventDispatcher };
