# @lixsketch/engine

Open-source SVG whiteboard engine with a hand-drawn aesthetic. The core drawing engine behind [LixSketch](https://sketch.elixpo.com).

Build your own whiteboard, diagramming tool, or collaborative canvas with a few lines of code.

## Install

```bash
npm install @lixsketch/engine
```

## Quick Start

```html
<svg id="my-canvas" xmlns="http://www.w3.org/2000/svg" width="100%" height="100vh"></svg>

<script type="module">
  import { createSketchEngine, TOOLS } from '@lixsketch/engine';

  const svg = document.getElementById('my-canvas');
  svg.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);

  const engine = createSketchEngine(svg, {
    initialZoom: 1,
    minZoom: 0.4,
    maxZoom: 30,
    onEvent: (type, data) => {
      console.log('Engine event:', type, data);
    },
  });

  await engine.init();
  engine.setActiveTool(TOOLS.RECTANGLE);
</script>
```

## API

### `createSketchEngine(svgElement, options?)`

Creates a new engine instance.

**Options:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `initialZoom` | `number` | `1` | Starting zoom level |
| `minZoom` | `number` | `0.4` | Minimum zoom |
| `maxZoom` | `number` | `30` | Maximum zoom |
| `onEvent` | `function` | `() => {}` | Callback for engine events |

### Engine Instance

```javascript
await engine.init();                    // Initialize (required before use)
engine.setActiveTool('rectangle');      // Switch tool
engine.undo();                          // Undo last action
engine.redo();                          // Redo last undone action
engine.shapes;                          // Array of all shapes on canvas
engine.cleanup();                       // Destroy and clean up
```

### Scene Operations

```javascript
const sceneData = engine.scene.save('My Diagram');  // Serialize to JSON
engine.scene.load(sceneData);                       // Load from JSON
engine.scene.download('export');                    // Download as .lixsketch
engine.scene.reset();                               // Clear canvas
engine.scene.exportPNG();                           // Export as PNG
engine.scene.exportPDF();                           // Export as PDF (print)
engine.scene.copyAsPNG();                           // Copy PNG to clipboard
engine.scene.copyAsSVG();                           // Copy SVG to clipboard
```

### LixScript (Programmatic Diagrams)

```javascript
engine.lixscript.execute(`
  rect start at 200, 60 size 200x65 {
    stroke: #4A90D9
    label: "Start"
  }

  rect end at start.x, start.bottom + 150 size 200x65 {
    stroke: #2ECC71
    label: "End"
  }

  arrow a1 from start.bottom to end.top {
    stroke: #e0e0e0
  }
`);
```

### Events

The `onEvent` callback receives:

| Event | Data | Description |
|-------|------|-------------|
| `sidebar:select` | `{ sidebar, shapeName }` | Shape selected, show properties UI |
| `sidebar:clear` | - | Selection cleared |
| `zoom:change` | `number` | Zoom level changed |

### Available Tools

```javascript
import { TOOLS } from '@lixsketch/engine';

TOOLS.SELECT      // Selection/move tool
TOOLS.PAN         // Pan/hand tool
TOOLS.RECTANGLE   // Rectangle drawing
TOOLS.CIRCLE      // Circle/ellipse drawing
TOOLS.LINE        // Line drawing
TOOLS.ARROW       // Arrow drawing
TOOLS.FREEHAND    // Freehand brush
TOOLS.TEXT        // Text placement
TOOLS.CODE        // Code block
TOOLS.ERASER      // Eraser
TOOLS.LASER       // Laser pointer
TOOLS.IMAGE       // Image insertion
TOOLS.FRAME       // Frame/artboard
TOOLS.ICON        // Icon insertion
```

### Shape Classes

All shape classes are exported for advanced use:

```javascript
import {
  Rectangle, Circle, Arrow, Line,
  TextShape, CodeShape, ImageShape,
  IconShape, Frame, FreehandStroke
} from '@lixsketch/engine';
```

## Fonts

Optional hand-drawn fonts for the authentic LixSketch look:

```javascript
import '@lixsketch/engine/fonts';
```

## File Format

The `.lixsketch` format is JSON:

```json
{
  "format": "lixsketch",
  "version": 1,
  "name": "My Diagram",
  "shapes": [...]
}
```

Files are fully interoperable between the web app, VS Code extension, and any custom integration.

## Requirements

- Browser environment with DOM (or DOM-compatible like VS Code Webview)
- SVG support

## License

MIT
