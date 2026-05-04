/* eslint-disable */
/**
 * @lixsketch/engine - Open-source SVG whiteboard engine
 *
 * Usage:
 *   import { createSketchEngine } from '@elixpo/lixsketch';
 *
 *   const engine = createSketchEngine(svgElement, {
 *     onEvent: (type, data) => console.log(type, data),
 *   });
 *   await engine.init();
 *   engine.setActiveTool('rectangle');
 *
 * Shape classes are loaded lazily by the engine during init() and exposed
 * on `window` (Rectangle, Circle, Arrow, etc.) and via `engine._modules.shapes`.
 * They CANNOT be statically imported because they depend on globals (rough, svg)
 * that are only set up during engine initialization.
 */

// Main engine class
export { SketchEngine, default } from './SketchEngine.js';

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

// Scene serialization helpers — for embedded consumers (e.g. blogs.elixpo) that
// need to round-trip a scene through their own storage. saveScene reads from
// window.shapes (populated by an active engine); loadScene rebuilds shapes onto
// the active engine's SVG. Both must be called after engine.init() completes.
export { saveScene, loadScene } from './core/SceneSerializer.js';

// Adaptive image compressor — same one the engine uses internally for
// uploads. Exported so embedded hosts can pre-compress images before
// shipping them across a postMessage boundary.
export { compressImage } from './utils/imageCompressor.js';

// Engine-local keyboard shortcuts (tool switching, delete, group/ungroup,
// space-to-pan, escape-deselect). App-level shortcuts (cloud save, modal
// toggles) are intentionally NOT included — those belong to the consumer.
export { installEngineShortcuts, SHORTCUT_MAP } from './EngineShortcuts.js';

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
