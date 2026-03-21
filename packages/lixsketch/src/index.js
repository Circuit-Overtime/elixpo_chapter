/* eslint-disable */
/**
 * @lixsketch/engine - Open-source SVG whiteboard engine
 *
 * Usage:
 *   import { createSketchEngine } from '@lixsketch/engine';
 *
 *   const engine = createSketchEngine(svgElement, {
 *     onEvent: (type, data) => console.log(type, data),
 *   });
 *   await engine.init();
 *   engine.setActiveTool('rectangle');
 */

// Main engine class
export { SketchEngine, default } from './SketchEngine.js';

// Shape classes
export { Rectangle } from './shapes/Rectangle.js';
export { Circle } from './shapes/Circle.js';
export { Arrow } from './shapes/Arrow.js';
export { Line } from './shapes/Line.js';
export { TextShape } from './shapes/TextShape.js';
export { CodeShape } from './shapes/CodeShape.js';
export { ImageShape } from './shapes/ImageShape.js';
export { IconShape } from './shapes/IconShape.js';
export { Frame } from './shapes/Frame.js';
export { FreehandStroke } from './shapes/FreehandStroke.js';

// Convenience factory
import { SketchEngine } from './SketchEngine.js';

/**
 * Create and return a new SketchEngine instance.
 *
 * @param {SVGSVGElement} svgElement - The SVG element to mount on
 * @param {Object} [options]
 * @param {number} [options.initialZoom=1]
 * @param {number} [options.minZoom=0.4]
 * @param {number} [options.maxZoom=30]
 * @param {function} [options.onEvent] - Callback for engine events:
 *   'sidebar:select'  - { sidebar, shapeName }
 *   'sidebar:clear'   - undefined
 *   'zoom:change'     - number
 *   'tool:change'     - string
 *   'scene:change'    - undefined
 * @returns {SketchEngine}
 */
export function createSketchEngine(svgElement, options = {}) {
    return new SketchEngine(svgElement, options);
}

// Tool name constants
export const TOOLS = {
    SELECT: 'select',
    PAN: 'pan',
    RECTANGLE: 'rectangle',
    CIRCLE: 'circle',
    LINE: 'line',
    ARROW: 'arrow',
    FREEHAND: 'freehand',
    TEXT: 'text',
    CODE: 'code',
    ERASER: 'eraser',
    LASER: 'laser',
    IMAGE: 'image',
    FRAME: 'frame',
    ICON: 'icon',
};
