# @elixpo/lixsketch

Open-source SVG whiteboard engine with a hand-drawn aesthetic. The core drawing engine behind [LixSketch](https://sketch.elixpo.com).

Build your own whiteboard, diagramming tool, or collaborative canvas with a few lines of code.

## Install

```bash
npm install @elixpo/lixsketch
```

## Quick Start

```html
<svg id="my-canvas" xmlns="http://www.w3.org/2000/svg" width="100%" height="100vh"></svg>

<script type="module">
  import { createSketchEngine, TOOLS } from '@elixpo/lixsketch';

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
import { TOOLS } from '@elixpo/lixsketch';

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
} from '@elixpo/lixsketch';
```

## Fonts

Optional hand-drawn fonts for the authentic LixSketch look:

```javascript
import '@elixpo/lixsketch/fonts';
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

## MCP server

The same package includes a local MCP server for structured canvas operations. It edits an atomic `.lixjson` file; open that file in LixSketch, or provide a custom scene store when embedding the server in another host.

```json
{
  "mcpServers": {
    "lixsketch": {
      "command": "npx",
      "args": [
        "-y",
        "@elixpo/lixsketch",
        "--scene",
        "/absolute/path/to/architecture.lixjson"
      ]
    }
  }
}
```

The CLI can also be started directly:

```bash
npx @elixpo/lixsketch --scene ./architecture.lixjson
```

The stdio channel is reserved for MCP JSON-RPC. Server status is written to stderr.

### MCP tools

| Tool | Purpose |
|------|---------|
| `canvas_get` | Read canvas summary, revision, and optional shapes |
| `canvas_apply_patch` | Atomically add, update, translate, or delete shapes |
| `canvas_validate` | Validate format, geometry, IDs, and limits |
| `canvas_preview` | Produce a lightweight SVG preview |
| `canvas_new` | Create a blank canvas after explicit confirmation |
| `templates_search` | Search public marketplace templates |
| `template_insert` | Insert a template with remapped shape and relationship IDs |

Mutations accept `expectedRevision` for conflict detection. `canvas_apply_patch` and `template_insert` support `dryRun: true`. A single patch is either fully stored or not stored at all.

Supported structured shape types are rectangle, circle, line, arrow, frame, freehand stroke, and text. Images and arbitrary SVG markup are intentionally excluded from direct MCP writes.

### Programmatic server

Use a memory store in tests, or implement the same asynchronous `read()` and `write(scene)` interface to connect another persistence layer:

```javascript
import {
  createLixSketchMcpServer,
  MemorySceneStore,
  createEmptyScene,
} from '@elixpo/lixsketch/mcp';

const server = createLixSketchMcpServer({
  store: new MemorySceneStore(createEmptyScene('Architecture')),
});

const result = await server.callTool('canvas_apply_patch', {
  expectedRevision: 0,
  operations: [
    {
      op: 'add',
      shape: {
        type: 'rectangle',
        x: 120,
        y: 80,
        width: 220,
        height: 100,
        options: { stroke: '#a78bfa', fill: '#2f2442' },
      },
    },
  ],
});
```

The browser engine and hosted platform can provide their own store adapter. Node hosts can import `FileSceneStore` and `serveLixSketchStdio` from `@elixpo/lixsketch/mcp/node`; browser and Worker bundles should continue to use the runtime-neutral `@elixpo/lixsketch/mcp` entry point.

## Requirements

- Browser environment with DOM (or DOM-compatible like VS Code Webview)
- SVG support

## License

MIT
