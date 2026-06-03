"use client";
import {
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_MIME_TYPES,
  IMAGE_ACCEPT_ATTR,
  compressImage,
  isAllowedImage,
  isAllowedImageDataUrl
} from "./chunk-DNAG7ML6.js";

// src/react/LixSketchCanvas.jsx
import { useCallback as useCallback17, useEffect as useEffect15, useRef as useRef12, useState as useState21 } from "react";

// src/react/store/useSketchStore.js
import { create } from "zustand";
var TOOLS = {
  SELECT: "select",
  PAN: "pan",
  RECTANGLE: "rectangle",
  CIRCLE: "circle",
  LINE: "line",
  ARROW: "arrow",
  FREEHAND: "freehand",
  TEXT: "text",
  CODE: "code",
  ERASER: "eraser",
  LASER: "laser",
  IMAGE: "image",
  FRAME: "frame",
  ICON: "icon"
};
var TOOL_CURSORS = {
  [TOOLS.SELECT]: "default",
  [TOOLS.PAN]: "grab",
  [TOOLS.RECTANGLE]: "crosshair",
  [TOOLS.CIRCLE]: "crosshair",
  [TOOLS.LINE]: "crosshair",
  [TOOLS.ARROW]: "crosshair",
  [TOOLS.FREEHAND]: "crosshair",
  [TOOLS.TEXT]: "text",
  [TOOLS.CODE]: "text",
  [TOOLS.LASER]: "crosshair",
  [TOOLS.IMAGE]: "crosshair",
  [TOOLS.FRAME]: "crosshair",
  [TOOLS.ICON]: "crosshair"
};
var TOOL_SIDEBARS = {
  [TOOLS.FREEHAND]: "paintbrush",
  [TOOLS.RECTANGLE]: "rectangle",
  [TOOLS.CIRCLE]: "circle",
  [TOOLS.LINE]: "line",
  [TOOLS.ARROW]: "arrow",
  [TOOLS.TEXT]: "text",
  [TOOLS.CODE]: "text",
  [TOOLS.FRAME]: "frame"
};
var SHORTCUT_MAP = {
  h: TOOLS.PAN,
  v: TOOLS.SELECT,
  1: TOOLS.SELECT,
  r: TOOLS.RECTANGLE,
  2: TOOLS.RECTANGLE,
  o: TOOLS.CIRCLE,
  4: TOOLS.CIRCLE,
  a: TOOLS.ARROW,
  5: TOOLS.ARROW,
  l: TOOLS.LINE,
  6: TOOLS.LINE,
  p: TOOLS.FREEHAND,
  7: TOOLS.FREEHAND,
  t: TOOLS.TEXT,
  8: TOOLS.TEXT,
  9: TOOLS.IMAGE,
  e: TOOLS.ERASER,
  0: TOOLS.ERASER,
  i: TOOLS.ICON,
  f: TOOLS.FRAME,
  k: TOOLS.LASER
};
var useSketchStore = create((set, get) => ({
  // --- Active tool (replaces 15 boolean flags) ---
  activeTool: TOOLS.SELECT,
  activeSidebar: null,
  // which sidebar to show
  selectedShapeSidebar: null,
  // sidebar shown when a shape is selected (overrides activeSidebar)
  setActiveTool: (tool, { afterDraw } = {}) => {
    if (get().viewMode && tool !== TOOLS.PAN) return;
    if (afterDraw && tool === TOOLS.SELECT && get().toolLock) return;
    set({
      activeTool: tool,
      activeSidebar: TOOL_SIDEBARS[tool] || null,
      selectedShapeSidebar: null
    });
  },
  // Called by engine when a shape is selected/deselected
  setSelectedShapeSidebar: (sidebar) => set({ selectedShapeSidebar: sidebar }),
  clearSelectedShapeSidebar: () => set({ selectedShapeSidebar: null }),
  getCursor: () => {
    const tool = get().activeTool;
    if (tool === TOOLS.ERASER) {
      return `url("data:image/svg+xml;base64,${typeof btoa !== "undefined" ? btoa('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7" fill="#222" stroke="white" stroke-width="2"/></svg>') : ""}") 10 10, auto`;
    }
    if (tool === TOOLS.LASER) {
      return `url("data:image/svg+xml;base64,${typeof btoa !== "undefined" ? btoa('<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1971c2" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>') : ""}") 0 0, auto`;
    }
    return TOOL_CURSORS[tool] || "crosshair";
  },
  // --- Shapes ---
  shapes: [],
  currentShape: null,
  lastMousePos: null,
  addShape: (shape) => set((s) => ({ shapes: [...s.shapes, shape] })),
  removeShape: (shape) => set((s) => ({ shapes: s.shapes.filter((sh) => sh !== shape) })),
  setCurrentShape: (shape) => set({ currentShape: shape }),
  setLastMousePos: (pos) => set({ lastMousePos: pos }),
  clearShapes: () => set({ shapes: [], currentShape: null }),
  // --- Undo/Redo ---
  undoStack: [],
  redoStack: [],
  pushUndo: (action) => set((s) => ({
    undoStack: [...s.undoStack, action],
    redoStack: []
    // clear redo on new action
  })),
  popUndo: () => {
    const { undoStack } = get();
    if (undoStack.length === 0) return null;
    const action = undoStack[undoStack.length - 1];
    set((s) => ({
      undoStack: s.undoStack.slice(0, -1),
      redoStack: [...s.redoStack, action]
    }));
    return action;
  },
  popRedo: () => {
    const { redoStack } = get();
    if (redoStack.length === 0) return null;
    const action = redoStack[redoStack.length - 1];
    set((s) => ({
      redoStack: s.redoStack.slice(0, -1),
      undoStack: [...s.undoStack, action]
    }));
    return action;
  },
  clearHistory: () => set({ undoStack: [], redoStack: [] }),
  // --- Viewport / Zoom ---
  zoom: 1,
  viewBox: { x: 0, y: 0, width: 0, height: 0 },
  translation: { x: 0, y: 0 },
  isPanning: false,
  panStart: null,
  setZoom: (zoom) => set({ zoom: Math.max(0.4, Math.min(30, zoom)) }),
  setViewBox: (vb) => set({ viewBox: vb }),
  setTranslation: (t) => set({ translation: t }),
  setIsPanning: (v) => set({ isPanning: v }),
  setPanStart: (p) => set({ panStart: p }),
  // --- Canvas background ---
  canvasBackground: "var(--lixsketch-bg, #ffffff)",
  setCanvasBackground: (color) => set({ canvasBackground: color }),
  // --- Grid ---
  gridEnabled: false,
  toggleGrid: () => set((s) => ({ gridEnabled: !s.gridEnabled })),
  // --- Modes ---
  viewMode: false,
  zenMode: false,
  toolLock: false,
  snapToObjects: false,
  toggleViewMode: () => {
    const entering = !get().viewMode;
    if (entering) {
      set({ viewMode: true, zenMode: false, activeTool: TOOLS.PAN, activeSidebar: null, selectedShapeSidebar: null });
    } else {
      set({ viewMode: false, activeTool: TOOLS.SELECT, activeSidebar: null });
    }
  },
  toggleZenMode: () => set((s) => ({ zenMode: !s.zenMode, viewMode: false })),
  // --- Canvas/Docs split layout ---
  // 'canvas' = sketch only, 'split' = side-by-side, 'docs' = doc only
  // Hydrated from localStorage on first store consumption (see
  // hydrateLayoutMode below). Persisted on every change.
  layoutMode: "canvas",
  setLayoutMode: (mode) => {
    if (!["canvas", "split", "docs"].includes(mode)) return;
    set({ layoutMode: mode });
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("lixsketch-layout-mode", mode);
      } catch {
      }
    }
  },
  hydrateLayoutMode: () => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("lixsketch-layout-mode");
      if (saved && ["canvas", "split", "docs"].includes(saved)) {
        set({ layoutMode: saved });
      }
    } catch {
    }
  },
  toggleToolLock: () => set((s) => ({ toolLock: !s.toolLock })),
  toggleSnapToObjects: () => set((s) => ({ snapToObjects: !s.snapToObjects })),
  // --- RoughJS refs (set once after mount) ---
  roughCanvas: null,
  roughGenerator: null,
  setRoughRefs: (canvas, generator) => set({ roughCanvas: canvas, roughGenerator: generator })
}));
var useSketchStore_default = useSketchStore;

// src/react/store/useUIStore.js
import { create as create2 } from "zustand";
function invertShapeColors(prevResolved, nextResolved) {
  if (prevResolved === nextResolved) return;
  const shapes = window.shapes;
  if (!shapes || shapes.length === 0) return;
  const from = nextResolved === "light" ? "#ffffff" : "#000000";
  const to = nextResolved === "light" ? "#000000" : "#ffffff";
  const normalize = (c) => {
    if (!c || c === "transparent" || c === "none") return c;
    const lower = c.toLowerCase().trim();
    if (lower === "#fff" || lower === "#ffffff" || lower === "white") return "#ffffff";
    if (lower === "#000" || lower === "#000000" || lower === "black") return "#000000";
    return lower;
  };
  for (const shape of shapes) {
    let changed = false;
    if (shape.options) {
      if (normalize(shape.options.stroke) === from) {
        shape.options.stroke = to;
        changed = true;
      }
      if (normalize(shape.options.fill) === from) {
        shape.options.fill = to;
        changed = true;
      }
    }
    if (shape.color !== void 0 && normalize(shape.color) === from) {
      shape.color = to;
      changed = true;
    }
    if (shape.strokeColor !== void 0 && normalize(shape.strokeColor) === from) {
      shape.strokeColor = to;
      changed = true;
    }
    if (changed && typeof shape.draw === "function") {
      shape.draw();
    }
  }
}
function applyTheme(theme) {
  const html = document.documentElement;
  let resolved = theme;
  if (theme === "system") {
    resolved = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  html.classList.remove("dark", "light");
  html.classList.add(resolved);
  if (resolved === "light") {
    html.style.setProperty("--color-surface", "#f0f0f5");
    html.style.setProperty("--color-surface-hover", "#e0e0ea");
    html.style.setProperty("--color-surface-active", "#d0d0e0");
    html.style.setProperty("--color-surface-dark", "#e8e8f0");
    html.style.setProperty("--color-surface-card", "#ffffff");
    html.style.setProperty("--color-text-primary", "#1a1a2e");
    html.style.setProperty("--color-text-secondary", "#2a2a40");
    html.style.setProperty("--color-text-muted", "#6a6a80");
    html.style.setProperty("--color-text-dim", "#9090a0");
    html.style.setProperty("--color-border", "#d0d0dd");
    html.style.setProperty("--color-border-light", "#c0c0d0");
    html.style.setProperty("--color-border-accent", "#8080c0");
    document.body.style.background = "#e8e8f0";
    const svgEl = window.svg;
    if (svgEl) svgEl.style.background = "#e8e8f0";
  } else {
    html.style.setProperty("--color-surface", "#232329");
    html.style.setProperty("--color-surface-hover", "#343448");
    html.style.setProperty("--color-surface-active", "#444480");
    html.style.setProperty("--color-surface-dark", "#1a1a20");
    html.style.setProperty("--color-surface-card", "#1e1e28");
    html.style.setProperty("--color-text-primary", "#fff");
    html.style.setProperty("--color-text-secondary", "#e8e8ee");
    html.style.setProperty("--color-text-muted", "#a0a0b0");
    html.style.setProperty("--color-text-dim", "#787888");
    html.style.setProperty("--color-border", "#333");
    html.style.setProperty("--color-border-light", "#3a3a50");
    html.style.setProperty("--color-border-accent", "#5555a0");
    document.body.style.background = "#000";
    const svgEl = window.svg;
    if (svgEl) svgEl.style.background = "";
  }
}
var useUIStore = create2((set, get) => ({
  // --- Modals ---
  shortcutsModalOpen: false,
  saveModalOpen: false,
  aiModalOpen: false,
  graphModalOpen: false,
  commandPaletteOpen: false,
  helpModalOpen: false,
  exportImageModalOpen: false,
  findBarOpen: false,
  canvasPropertiesOpen: false,
  imageGenerateModalOpen: false,
  toggleShortcutsModal: () => set((s) => ({ shortcutsModalOpen: !s.shortcutsModalOpen })),
  toggleSaveModal: () => set((s) => ({ saveModalOpen: !s.saveModalOpen })),
  toggleAIModal: () => set((s) => ({ aiModalOpen: !s.aiModalOpen })),
  toggleGraphModal: () => set((s) => ({ graphModalOpen: !s.graphModalOpen })),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),
  toggleHelpModal: () => set((s) => ({ helpModalOpen: !s.helpModalOpen })),
  toggleExportImageModal: () => set((s) => ({ exportImageModalOpen: !s.exportImageModalOpen })),
  toggleFindBar: () => set((s) => ({ findBarOpen: !s.findBarOpen })),
  closeFindBar: () => set({ findBarOpen: false }),
  toggleCanvasProperties: () => set((s) => ({ canvasPropertiesOpen: !s.canvasPropertiesOpen })),
  toggleImageGenerateModal: () => set((s) => ({ imageGenerateModalOpen: !s.imageGenerateModalOpen })),
  closeImageGenerateModal: () => set({ imageGenerateModalOpen: false }),
  closeAllModals: () => set({ shortcutsModalOpen: false, saveModalOpen: false, aiModalOpen: false, graphModalOpen: false, commandPaletteOpen: false, helpModalOpen: false, exportImageModalOpen: false, findBarOpen: false, canvasPropertiesOpen: false, imageGenerateModalOpen: false }),
  // --- Menu ---
  menuOpen: false,
  toggleMenu: () => set((s) => ({ menuOpen: !s.menuOpen })),
  closeMenu: () => set({ menuOpen: false }),
  // --- Workspace ---
  workspaceName: "",
  setWorkspaceName: (name) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("lixsketch-workspace-name", name);
    }
    set({ workspaceName: name });
  },
  // --- Save Status ---
  // 'idle' | 'local' | 'cloud' | 'failed'
  saveStatus: "idle",
  setSaveStatus: (status) => set({ saveStatus: status }),
  // --- Session / Encryption ---
  // Key is persisted in localStorage keyed by session ID so it survives page refreshes.
  // This ensures re-saving a workspace uses the same key, keeping old share links valid.
  sessionEncryptionKey: null,
  setSessionEncryptionKey: (key, sessionId) => {
    if (typeof window !== "undefined" && sessionId) {
      localStorage.setItem(`lixsketch-enc-key-${sessionId}`, key);
    }
    set({ sessionEncryptionKey: key });
  },
  loadEncryptionKeyForSession: (sessionId) => {
    if (typeof window !== "undefined" && sessionId) {
      const stored = localStorage.getItem(`lixsketch-enc-key-${sessionId}`);
      if (stored) {
        set({ sessionEncryptionKey: stored });
        return stored;
      }
    }
    return null;
  },
  clearEncryptionKeyForSession: (sessionId) => {
    if (typeof window !== "undefined" && sessionId) {
      localStorage.removeItem(`lixsketch-enc-key-${sessionId}`);
    }
    set({ sessionEncryptionKey: null });
  },
  // --- Canvas Loading ---
  canvasLoading: false,
  canvasLoadingMessage: "Loading canvas...",
  setCanvasLoading: (loading, message) => set({ canvasLoading: loading, canvasLoadingMessage: message || "Loading canvas..." }),
  // --- Theme ---
  theme: "dark",
  setTheme: (newTheme) => {
    const prev = get().theme;
    const resolve = (t) => t === "system" ? window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light" : t;
    invertShapeColors(resolve(prev), resolve(newTheme));
    applyTheme(newTheme);
    set({ theme: newTheme });
  },
  // --- Language / i18n ---
  language: "en",
  setLanguage: (lang) => {
    set({ language: lang });
  },
  persistUIPrefs: (prefs) => {
    if (typeof window !== "undefined") {
      const existing = localStorage.getItem("lix_ui_prefs");
      let parsed = {};
      try {
        if (existing) parsed = JSON.parse(existing);
      } catch (e) {
      }
      const updated = { ...parsed, ...prefs };
      localStorage.setItem("lix_ui_prefs", JSON.stringify(updated));
      if (prefs.language) {
        set({ language: prefs.language });
        window.dispatchEvent(new CustomEvent("lix-language-changed", { detail: { language: prefs.language } }));
      }
    }
  }
}));
var useUIStore_default = useUIStore;

// src/react/components/canvas/SVGCanvas.jsx
import { useRef as useRef2, useState, useEffect as useEffect2 } from "react";

// src/react/hooks/useSketchEngine.js
import { useEffect, useRef } from "react";

// src/react/hooks/inertStores.js
var noop = () => {
};
var inertAuth = {
  isAuthenticated: false,
  user: null,
  setUser: noop,
  setAuthenticated: noop,
  logout: noop
};
var inertCollab = {
  roomId: null,
  connected: false,
  setRoom: noop,
  setConnected: noop
};
var inertProfile = {
  profile: null,
  setProfile: noop
};
function makeStore(state) {
  function useStore(selector) {
    return typeof selector === "function" ? selector(state) : state;
  }
  useStore.getState = () => state;
  useStore.setState = noop;
  useStore.subscribe = () => () => {
  };
  return useStore;
}
var useAuthStore = makeStore(inertAuth);
var useCollabStore = makeStore(inertCollab);
var useProfileStore = makeStore(inertProfile);
var WORKER_URL = "";
async function triggerDocCloudSync() {
}
function persistLayoutMode() {
}
async function triggerCloudSync() {
  return false;
}

// src/react/hooks/useSketchEngine.js
function useSketchEngine(svgRef, ready = true) {
  const engineRef = useRef(null);
  useEffect(() => {
    if (!ready || !svgRef.current) return;
    let cancelled = false;
    async function initEngine() {
      try {
        const storeState = useSketchStore_default.getState();
        window.__sketchStoreApi = {
          setSelectedShapeSidebar: (sidebar) => useSketchStore_default.getState().setSelectedShapeSidebar(sidebar),
          clearSelectedShapeSidebar: () => useSketchStore_default.getState().clearSelectedShapeSidebar(),
          setActiveTool: (tool, opts) => useSketchStore_default.getState().setActiveTool(tool, opts),
          setZoom: (zoom) => useSketchStore_default.setState({ zoom }),
          getState: () => useSketchStore_default.getState()
        };
        const { SketchEngine } = await import("./SketchEngine-OFU565RZ.js");
        if (cancelled) return;
        const engine = new SketchEngine(svgRef.current);
        await engine.init();
        engineRef.current = engine;
        window.__sketchEngine = engine;
        window.__WORKER_URL = WORKER_URL;
        const currentTool = useSketchStore_default.getState().activeTool;
        engine.setActiveTool(currentTool);
      } catch (err) {
        console.error("[useSketchEngine] Failed to initialize:", err);
      }
    }
    initEngine();
    return () => {
      cancelled = true;
      if (engineRef.current) {
        engineRef.current.cleanup();
        engineRef.current = null;
      }
    };
  }, [svgRef, ready]);
  useEffect(() => {
    const unsub = useSketchStore_default.subscribe(
      (state, prevState) => {
        if (state.activeTool !== prevState?.activeTool && engineRef.current) {
          engineRef.current.setActiveTool(state.activeTool);
        }
      }
    );
    return unsub;
  }, []);
  return engineRef;
}

// src/react/components/canvas/SVGCanvas.jsx
import { jsx, jsxs } from "react/jsx-runtime";
var GRID_SIZE = 20;
function SVGCanvas() {
  const [svgReady, setSvgReady] = useState(false);
  const svgRef = useRef2(null);
  const canvasBackground = useSketchStore_default((s) => s.canvasBackground);
  const gridEnabled = useSketchStore_default((s) => s.gridEnabled);
  const getCursor = useSketchStore_default((s) => s.getCursor);
  const cursor = getCursor();
  useEffect2(() => {
    const applyImperative = (w, h) => {
      const zoom = window.currentZoom || 1;
      const cv = window.currentViewBox || { x: 0, y: 0 };
      const vbW = w / zoom;
      const vbH = h / zoom;
      const x = cv.x || 0;
      const y = cv.y || 0;
      window.currentViewBox = { x, y, width: vbW, height: vbH };
      const el = svgRef.current;
      if (el) el.setAttribute("viewBox", `${x} ${y} ${vbW} ${vbH}`);
    };
    const sync = () => {
      const el = svgRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width));
      const h = Math.max(1, Math.round(rect.height));
      applyImperative(w, h);
    };
    sync();
    setSvgReady(true);
    window.addEventListener("resize", sync);
    let ro;
    if (typeof ResizeObserver !== "undefined" && svgRef.current) {
      ro = new ResizeObserver(sync);
      ro.observe(svgRef.current);
    }
    return () => {
      window.removeEventListener("resize", sync);
      if (ro) ro.disconnect();
    };
  }, []);
  useEffect2(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handleCanvasClick = () => {
      const activeTool = useSketchStore_default.getState().activeTool;
      if (activeTool === TOOLS.ICON && !window.isIconToolActive) {
        useSketchStore_default.getState().setActiveTool(TOOLS.SELECT);
      }
    };
    svg.addEventListener("pointerdown", handleCanvasClick);
    return () => svg.removeEventListener("pointerdown", handleCanvasClick);
  }, [svgReady]);
  useSketchEngine(svgRef, svgReady);
  useEffect2(() => {
    window.__gridEnabled = gridEnabled;
  }, [gridEnabled]);
  return /* @__PURE__ */ jsxs(
    "svg",
    {
      id: "freehand-canvas",
      ref: svgRef,
      className: "absolute inset-0 w-full h-full",
      style: {
        background: canvasBackground,
        cursor,
        userSelect: "none",
        WebkitUserSelect: "none",
        touchAction: "none"
      },
      preserveAspectRatio: "none",
      suppressHydrationWarning: true,
      children: [
        gridEnabled && /* @__PURE__ */ jsxs("defs", { children: [
          /* @__PURE__ */ jsx(
            "pattern",
            {
              id: "grid-small",
              width: GRID_SIZE,
              height: GRID_SIZE,
              patternUnits: "userSpaceOnUse",
              children: /* @__PURE__ */ jsx(
                "path",
                {
                  d: `M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`,
                  fill: "none",
                  stroke: "rgba(255,255,255,0.06)",
                  strokeWidth: "0.5"
                }
              )
            }
          ),
          /* @__PURE__ */ jsxs(
            "pattern",
            {
              id: "grid-large",
              width: GRID_SIZE * 5,
              height: GRID_SIZE * 5,
              patternUnits: "userSpaceOnUse",
              children: [
                /* @__PURE__ */ jsx("rect", { width: GRID_SIZE * 5, height: GRID_SIZE * 5, fill: "url(#grid-small)" }),
                /* @__PURE__ */ jsx(
                  "path",
                  {
                    d: `M ${GRID_SIZE * 5} 0 L 0 0 0 ${GRID_SIZE * 5}`,
                    fill: "none",
                    stroke: "rgba(255,255,255,0.12)",
                    strokeWidth: "0.8"
                  }
                )
              ]
            }
          )
        ] }),
        gridEnabled && /* @__PURE__ */ jsx(
          "rect",
          {
            x: "-100000",
            y: "-100000",
            width: "200000",
            height: "200000",
            fill: "url(#grid-large)",
            style: { pointerEvents: "none" }
          }
        )
      ]
    }
  );
}

// src/react/components/Toolbar.jsx
import { Fragment, jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function getViewModeItems() {
  return [
    { tool: TOOLS.PAN, icon: "bxs-hand", title: "Pan (H)", key: "H" }
  ];
}
function getToolItems() {
  return [
    { tool: TOOLS.PAN, icon: "bxs-hand", title: "Pan (H)", key: "H" },
    { tool: TOOLS.SELECT, icon: "bxs-pointer", title: "Select (V)", key: "V" },
    "spacer",
    { tool: TOOLS.RECTANGLE, icon: "bx-square", title: "Rectangle (R)", key: "R" },
    { tool: TOOLS.CIRCLE, icon: "bx-circle", title: "Circle (O)", key: "O" },
    { tool: TOOLS.LINE, icon: "bx-minus", title: "Line (L)", key: "L" },
    { tool: TOOLS.ARROW, icon: "bx-right-arrow-alt", title: "Arrow (A)", rotate: true, key: "A" },
    { tool: TOOLS.TEXT, icon: "bx-text", title: "Text (T)", key: "T" },
    { tool: TOOLS.FREEHAND, icon: "bx-pen", title: "Freehand (P)", key: "P" },
    { tool: TOOLS.IMAGE, icon: "bx-image-alt", title: "Image (9)", key: "9" },
    { tool: TOOLS.ICON, icon: "bx-wink-smile", title: "Icon (I)", key: "I" },
    "spacer",
    { tool: TOOLS.FRAME, icon: "bx-crop", title: "Frame (F)", key: "F" },
    { tool: TOOLS.LASER, icon: "bxs-magic-wand", title: "Laser (K)", key: "K" },
    { tool: TOOLS.ERASER, icon: "bxs-eraser", title: "Eraser (E)", key: "E" }
    // AI tool entry removed while the assistant is coming-soon.
    // Restore `{ tool: 'ai', icon: null, title: 'AI', isAI: true }` here
    // when the modal becomes a real feature again.
  ];
}
function Toolbar() {
  const activeTool = useSketchStore_default((s) => s.activeTool);
  const setActiveTool = useSketchStore_default((s) => s.setActiveTool);
  const viewMode = useSketchStore_default((s) => s.viewMode);
  const toolLock = useSketchStore_default((s) => s.toolLock);
  const toggleToolLock = useSketchStore_default((s) => s.toggleToolLock);
  const toggleAIModal = useUIStore_default((s) => s.toggleAIModal);
  const items = viewMode ? getViewModeItems() : getToolItems();
  return /* @__PURE__ */ jsxs2(Fragment, { children: [
    /* @__PURE__ */ jsxs2("div", { className: `absolute left-2.5 top-1/2 -translate-y-1/2 w-[46px] rounded-xl bg-surface z-[1000] flex flex-col items-center py-1.5 gap-0.5 font-[lixFont] max-h-[calc(100vh-120px)] overflow-y-auto no-scrollbar`, children: [
      !viewMode && /* @__PURE__ */ jsxs2(Fragment, { children: [
        /* @__PURE__ */ jsxs2(
          "button",
          {
            title: "Tool Lock (Q)",
            onClick: toggleToolLock,
            className: `relative w-[33px] h-[30px] flex items-center justify-center rounded-lg transition-all duration-200 ${toolLock ? "bg-accent-blue/20 text-accent-blue" : "text-text-dim hover:text-text-muted hover:bg-surface-hover"}`,
            children: [
              /* @__PURE__ */ jsx2("i", { className: `bx ${toolLock ? "bxs-lock-alt" : "bx-lock-alt"} text-lg` }),
              /* @__PURE__ */ jsx2("span", { className: "absolute bottom-0.5 right-[-1px] text-[10px] leading-none opacity-50", children: "Q" })
            ]
          }
        ),
        /* @__PURE__ */ jsx2("div", { className: "w-6 h-px bg-border-light my-0.5" })
      ] }),
      items.map((item, idx) => {
        if (item === "spacer") {
          return /* @__PURE__ */ jsx2(
            "div",
            {
              className: "w-6 h-px bg-border-light my-0.5"
            },
            `spacer-${idx}`
          );
        }
        const isActive = activeTool === item.tool;
        if (item.isAI) {
          return /* @__PURE__ */ jsx2(
            "button",
            {
              title: item.title,
              onClick: toggleAIModal,
              className: "w-[33px] h-[31px] flex items-center justify-center rounded-lg text-text-muted hover:text-accent hover:bg-surface-hover transition-all duration-200",
              children: /* @__PURE__ */ jsxs2(
                "svg",
                {
                  width: "20",
                  height: "20",
                  viewBox: "0 0 24 24",
                  fill: "none",
                  stroke: "currentColor",
                  strokeWidth: "2",
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                  children: [
                    /* @__PURE__ */ jsx2("path", { d: "M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" }),
                    /* @__PURE__ */ jsx2("path", { d: "M18 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" })
                  ]
                }
              )
            },
            "ai"
          );
        }
        return /* @__PURE__ */ jsxs2(
          "button",
          {
            title: item.title,
            onClick: () => setActiveTool(item.tool),
            className: `relative w-[33px] h-[31px] flex items-center justify-center rounded-lg transition-all duration-200 ${isActive ? "bg-surface-active text-text-primary" : "text-text-muted hover:text-text-primary hover:bg-surface-hover"}`,
            children: [
              /* @__PURE__ */ jsx2(
                "i",
                {
                  className: `bx ${item.icon} text-xl`,
                  style: item.rotate ? { transform: "rotate(-45deg)" } : void 0
                }
              ),
              item.key && /* @__PURE__ */ jsx2("span", { className: `absolute bottom-0.5 right-[-1px] text-[10px] leading-none ${isActive ? "opacity-60" : "opacity-35"}`, children: item.key })
            ]
          },
          item.tool
        );
      })
    ] }),
    viewMode && /* @__PURE__ */ jsx2("div", { className: "absolute top-16 left-2.5 w-[46px] z-[1000] flex justify-center font-[lixFont]", children: /* @__PURE__ */ jsxs2("span", { className: "text-text-dim text-[9px] text-center leading-tight", children: [
      "View",
      /* @__PURE__ */ jsx2("br", {}),
      "Mode",
      /* @__PURE__ */ jsx2("br", {}),
      /* @__PURE__ */ jsx2("kbd", { className: "text-[8px] text-text-muted", children: "Esc" })
    ] }) })
  ] });
}

// src/react/components/Footer.jsx
import { useCallback } from "react";
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
function Footer() {
  const zoom = useSketchStore_default((s) => s.zoom);
  const setZoom = useSketchStore_default((s) => s.setZoom);
  const viewMode = useSketchStore_default((s) => s.viewMode);
  const zenMode = useSketchStore_default((s) => s.zenMode);
  const zoomPercent = Math.round(zoom * 100);
  const handleZoomIn = useCallback(() => {
    if (window.zoomFromCenter) window.zoomFromCenter(1);
  }, []);
  const handleZoomOut = useCallback(() => {
    if (window.zoomFromCenter) window.zoomFromCenter(-1);
  }, []);
  const handleZoomReset = useCallback(() => {
    if (window.zoomReset) window.zoomReset();
  }, []);
  const handleUndo = useCallback(() => {
    if (window.undo) window.undo();
  }, []);
  const handleRedo = useCallback(() => {
    if (window.redo) window.redo();
  }, []);
  if (viewMode || zenMode) return null;
  return /* @__PURE__ */ jsxs3("div", { className: "absolute bottom-1 right-5 flex items-center gap-2.5 z-[1000] font-[lixFont]", children: [
    /* @__PURE__ */ jsxs3("div", { className: "flex items-center bg-surface rounded-lg overflow-hidden", children: [
      /* @__PURE__ */ jsx3(
        "button",
        {
          onClick: handleUndo,
          title: "Undo (Ctrl+Z)",
          className: "w-9 h-9 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200",
          children: /* @__PURE__ */ jsx3("i", { className: "bx bx-undo text-lg" })
        }
      ),
      /* @__PURE__ */ jsx3("div", { className: "w-px h-5 bg-border-light" }),
      /* @__PURE__ */ jsx3(
        "button",
        {
          onClick: handleRedo,
          title: "Redo (Ctrl+Shift+Z)",
          className: "w-9 h-9 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200",
          children: /* @__PURE__ */ jsx3("i", { className: "bx bx-redo text-lg" })
        }
      )
    ] }),
    /* @__PURE__ */ jsxs3("div", { className: "flex items-center bg-surface rounded-lg overflow-hidden", children: [
      /* @__PURE__ */ jsx3(
        "button",
        {
          onClick: handleZoomOut,
          title: "Zoom Out (Ctrl+-)",
          className: "w-9 h-9 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200",
          children: /* @__PURE__ */ jsx3("i", { className: "bx bx-minus text-lg" })
        }
      ),
      /* @__PURE__ */ jsx3("div", { className: "w-px h-5 bg-border-light" }),
      /* @__PURE__ */ jsxs3(
        "button",
        {
          onClick: handleZoomReset,
          title: "Reset Zoom (Ctrl+0)",
          className: "min-w-[52px] h-9 flex items-center justify-center text-text-secondary text-sm px-2 hover:bg-surface-hover transition-all duration-200",
          children: [
            zoomPercent,
            "%"
          ]
        }
      ),
      /* @__PURE__ */ jsx3("div", { className: "w-px h-5 bg-border-light" }),
      /* @__PURE__ */ jsx3(
        "button",
        {
          onClick: handleZoomIn,
          title: "Zoom In (Ctrl++)",
          className: "w-9 h-9 flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200",
          children: /* @__PURE__ */ jsx3("i", { className: "bx bx-plus text-lg" })
        }
      )
    ] })
  ] });
}

// src/react/components/AppMenu.jsx
import { useState as useState2 } from "react";

// src/react/hooks/useTranslation.js
var OVERRIDES = {
  "sidebar.sectionHeader.stroke": "Stroke",
  "sidebar.sectionHeader.fill": "Fill",
  "sidebar.sectionHeader.background": "Background",
  "sidebar.sectionHeader.backgroundImage": "Background image",
  "sidebar.sectionHeader.width": "Width",
  "sidebar.sectionHeader.edge": "Edge style",
  "sidebar.sectionHeader.head": "Arrow head",
  "sidebar.sectionHeader.type": "Type",
  "sidebar.sectionHeader.name": "Name",
  "sidebar.sectionHeader.color": "Color",
  "sidebar.sectionHeader.fit": "Fit",
  "sidebar.sectionHeader.roughness": "Roughness",
  "sidebar.sectionHeader.sloppiness": "Sloppiness",
  "sidebar.sectionHeader.taper": "Taper",
  "menu.canvasBackground": "Canvas background",
  "menu.canvasProperties": "Canvas properties",
  "menu.exportImage": "Export as image",
  "menu.findText": "Find text",
  "menu.quickSave": "Quick save",
  "menu.resetCanvas": "Reset canvas",
  "menu.saveShare": "Save & share",
  "menu.showGrid": "Show grid",
  "menu.signIn": "Sign in",
  "menu.signOut": "Sign out",
  "prefs.toolLock": "Tool lock",
  "prefs.toggleGrid": "Toggle grid",
  "prefs.snapObjects": "Snap to objects",
  "prefs.snapMidpoints": "Snap to midpoints",
  "prefs.zenMode": "Zen mode",
  "prefs.viewMode": "View mode",
  "prefs.canvasShapeProps": "Canvas & shape properties",
  "prefs.arrowBinding": "Arrow binding",
  "prefs.language": "Language",
  "sidebar.bringForward": "Bring forward",
  "sidebar.bringToFront": "Bring to front",
  "sidebar.sendBackward": "Send backward",
  "sidebar.sendToBack": "Send to back",
  "sidebar.fillColor": "Fill color",
  "sidebar.strokeColor": "Stroke color",
  "sidebar.codeMode": "Code mode",
  "sidebar.renderText": "Render text",
  "sidebar.newLine": "New line"
};
function camelToWords(s) {
  return s.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/-/g, " ");
}
function autoFormat(key) {
  const last = key.split(".").pop() || key;
  const words = camelToWords(last);
  return words.charAt(0).toUpperCase() + words.slice(1);
}
function tImpl(key, fallbackOrOpts) {
  if (typeof key !== "string") return fallbackOrOpts ?? "";
  let fallback = "";
  if (typeof fallbackOrOpts === "string") {
    fallback = fallbackOrOpts;
  } else if (fallbackOrOpts && typeof fallbackOrOpts === "object") {
    fallback = fallbackOrOpts.defaultValue || "";
  }
  if (fallback) return fallback;
  if (OVERRIDES[key]) return OVERRIDES[key];
  return autoFormat(key);
}
function useTranslation() {
  return {
    t: tImpl,
    locale: "en",
    setLocale: () => {
    }
  };
}

// src/react/components/AppMenu.jsx
import { Fragment as Fragment2, jsx as jsx4, jsxs as jsxs4 } from "react/jsx-runtime";
var CANVAS_BACKGROUNDS = [
  { color: "#000", label: "menu.canvasBg.black" },
  { color: "#161718", label: "menu.canvasBg.darkGray" },
  { color: "#13171C", label: "menu.canvasBg.blueBlack" },
  { color: "#181605", label: "menu.canvasBg.darkYellow" },
  { color: "#1B1615", label: "menu.canvasBg.darkBrown" }
];
function AppMenu() {
  const { t, language } = useTranslation();
  const LINKS = [
    { label: t("links.documentation"), icon: "bx-book-open", href: "/docs" },
    { label: t("links.github"), icon: "bxl-github", href: "https://github.com/elixpo/sketch.elixpo" },
    { label: t("links.reportIssue"), icon: "bx-bug", href: "https://github.com/elixpo/sketch.elixpo/issues" }
  ];
  const PREFERENCE_ITEMS = [
    { label: t("prefs.toolLock"), shortcut: "Q", id: "toolLock" },
    { label: t("prefs.snapObjects"), shortcut: "Alt+S", id: "snapObjects" },
    { label: t("prefs.toggleGrid"), shortcut: "Ctrl+'", id: "toggleGrid" },
    { label: t("prefs.zenMode"), shortcut: "Alt+Z", id: "zenMode" },
    { label: t("prefs.viewMode"), shortcut: "Alt+R", id: "viewMode" },
    { label: t("prefs.canvasShapeProps"), shortcut: "Alt+/", id: "properties" },
    { label: t("prefs.arrowBinding"), id: "arrowBinding", toggle: true },
    { label: t("prefs.snapMidpoints"), id: "snapMidpoints", toggle: true }
  ];
  const menuOpen = useUIStore_default((s) => s.menuOpen);
  const closeMenu = useUIStore_default((s) => s.closeMenu);
  const toggleSaveModal = useUIStore_default((s) => s.toggleSaveModal);
  const toggleCommandPalette = useUIStore_default((s) => s.toggleCommandPalette);
  const toggleHelpModal = useUIStore_default((s) => s.toggleHelpModal);
  const toggleExportImageModal = useUIStore_default((s) => s.toggleExportImageModal);
  const theme = useUIStore_default((s) => s.theme);
  const setTheme = useUIStore_default((s) => s.setTheme);
  const persistUIPrefs = useUIStore_default((s) => s.persistUIPrefs);
  const canvasBackground = useSketchStore_default((s) => s.canvasBackground);
  const setCanvasBackground = useSketchStore_default((s) => s.setCanvasBackground);
  const clearShapes = useSketchStore_default((s) => s.clearShapes);
  const clearHistory = useSketchStore_default((s) => s.clearHistory);
  const gridEnabled = useSketchStore_default((s) => s.gridEnabled);
  const toggleGrid = useSketchStore_default((s) => s.toggleGrid);
  const viewMode = useSketchStore_default((s) => s.viewMode);
  const zenMode = useSketchStore_default((s) => s.zenMode);
  const toolLock = useSketchStore_default((s) => s.toolLock);
  const snapToObjects = useSketchStore_default((s) => s.snapToObjects);
  const toggleViewMode = useSketchStore_default((s) => s.toggleViewMode);
  const toggleZenMode = useSketchStore_default((s) => s.toggleZenMode);
  const toggleToolLock = useSketchStore_default((s) => s.toggleToolLock);
  const toggleSnapToObjects = useSketchStore_default((s) => s.toggleSnapToObjects);
  const layoutMode = useSketchStore_default((s) => s.layoutMode);
  const setLayoutMode = useSketchStore_default((s) => s.setLayoutMode);
  const handleSetLayout = (mode) => {
    if (mode === layoutMode) return;
    setLayoutMode(mode);
    persistLayoutMode(mode);
  };
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const authUser = useAuthStore((s) => s.user);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const [prefsOpen, setPrefsOpen] = useState2(false);
  const handleOpen = () => {
    const serializer = window.__sceneSerializer;
    if (serializer) {
      serializer.upload().then((result) => {
        if (result && result.success) closeMenu();
        else if (result && result.error) {
          console.warn("[Open] Invalid scene file:", result.error);
        }
      });
    }
    closeMenu();
  };
  return /* @__PURE__ */ jsxs4(Fragment2, { children: [
    menuOpen && /* @__PURE__ */ jsx4(
      "div",
      {
        className: "fixed inset-0 z-[999]",
        onClick: () => {
          closeMenu();
          setPrefsOpen(false);
        }
      }
    ),
    /* @__PURE__ */ jsxs4(
      "div",
      {
        className: `absolute top-14 right-4 w-[230px] max-h-[calc(100vh-140px)] overflow-y-auto no-scrollbar bg-surface/75 backdrop-blur-lg rounded-2xl z-[1000] border border-border-light p-1.5 font-[lixFont] text-[13px] transition-all duration-200 ${menuOpen ? "opacity-100 blur-0 pointer-events-auto" : "opacity-0 blur-[20px] pointer-events-none"}`,
        children: [
          /* @__PURE__ */ jsxs4(
            "button",
            {
              onClick: handleOpen,
              className: "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-text-secondary text-[12.5px] hover:bg-surface-hover cursor-pointer transition-all duration-200",
              children: [
                /* @__PURE__ */ jsxs4("span", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsx4("i", { className: "bx bx-folder-open text-sm" }),
                  t("menu.open")
                ] }),
                /* @__PURE__ */ jsx4("span", { className: "text-text-dim text-xs", children: "Ctrl+O" })
              ]
            }
          ),
          /* @__PURE__ */ jsxs4(
            "button",
            {
              onClick: () => {
                const serializer = window.__sceneSerializer;
                if (serializer) {
                  const workspaceName = useUIStore_default.getState().workspaceName || "Untitled";
                  const sceneData = serializer.save(workspaceName);
                  const sessionId = window.__sessionID;
                  const key = sessionId ? `lixsketch-autosave-${sessionId}` : "lixsketch-autosave";
                  localStorage.setItem(key, JSON.stringify(sceneData));
                  useUIStore_default.getState().setSaveStatus("local");
                  triggerCloudSync();
                }
                closeMenu();
              },
              className: "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-text-secondary text-[12.5px] hover:bg-surface-hover cursor-pointer transition-all duration-200",
              children: [
                /* @__PURE__ */ jsxs4("span", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsx4("i", { className: "bx bx-check-circle text-sm" }),
                  t("menu.quickSave")
                ] }),
                /* @__PURE__ */ jsx4("span", { className: "text-text-dim text-xs", children: "Ctrl+S" })
              ]
            }
          ),
          /* @__PURE__ */ jsxs4(
            "button",
            {
              onClick: () => {
                toggleSaveModal();
                closeMenu();
              },
              className: "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-text-secondary text-[12.5px] hover:bg-surface-hover cursor-pointer transition-all duration-200",
              children: [
                /* @__PURE__ */ jsxs4("span", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsx4("i", { className: "bx bx-save text-sm" }),
                  t("menu.saveShare")
                ] }),
                /* @__PURE__ */ jsx4("span", { className: "text-text-dim text-xs", children: "Ctrl+Shift+S" })
              ]
            }
          ),
          /* @__PURE__ */ jsxs4(
            "button",
            {
              onClick: () => {
                toggleExportImageModal();
                closeMenu();
              },
              className: "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-text-secondary text-[12.5px] hover:bg-surface-hover cursor-pointer transition-all duration-200",
              children: [
                /* @__PURE__ */ jsxs4("span", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsx4("i", { className: "bx bx-image text-sm" }),
                  t("menu.exportImage")
                ] }),
                /* @__PURE__ */ jsx4("span", { className: "text-text-dim text-xs", children: "Ctrl+Shift+E" })
              ]
            }
          ),
          /* @__PURE__ */ jsx4("hr", { className: "border-border-light my-1" }),
          /* @__PURE__ */ jsxs4(
            "button",
            {
              onClick: () => {
                toggleCommandPalette();
                closeMenu();
              },
              className: "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all duration-200 text-accent-blue bg-accent-blue/10 hover:bg-accent-blue/20 cursor-pointer",
              children: [
                /* @__PURE__ */ jsxs4("span", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsx4("i", { className: "bx bx-command text-sm" }),
                  t("menu.commands")
                ] }),
                /* @__PURE__ */ jsx4("span", { className: "text-text-dim text-xs", children: "Ctrl+/" })
              ]
            }
          ),
          /* @__PURE__ */ jsxs4(
            "button",
            {
              onClick: () => {
                useUIStore_default.getState().toggleFindBar();
                closeMenu();
              },
              className: "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-text-secondary text-[12.5px] hover:bg-surface-hover cursor-pointer transition-all duration-200",
              children: [
                /* @__PURE__ */ jsxs4("span", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsx4("i", { className: "bx bx-search text-sm" }),
                  t("menu.findText")
                ] }),
                /* @__PURE__ */ jsx4("span", { className: "text-text-dim text-xs", children: "Ctrl+F" })
              ]
            }
          ),
          /* @__PURE__ */ jsx4(
            "button",
            {
              onClick: () => {
                useUIStore_default.getState().toggleCanvasProperties();
                closeMenu();
              },
              className: "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-text-secondary text-[12.5px] hover:bg-surface-hover cursor-pointer transition-all duration-200",
              children: /* @__PURE__ */ jsxs4("span", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsx4("i", { className: "bx bx-info-circle text-sm" }),
                t("menu.canvasProperties")
              ] })
            }
          ),
          /* @__PURE__ */ jsx4(
            "button",
            {
              onClick: () => {
                toggleHelpModal();
                closeMenu();
              },
              className: "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-text-secondary text-[12.5px] hover:bg-surface-hover cursor-pointer transition-all duration-200",
              children: /* @__PURE__ */ jsxs4("span", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsx4("i", { className: "bx bx-help-circle text-sm" }),
                t("menu.help")
              ] })
            }
          ),
          /* @__PURE__ */ jsx4("hr", { className: "border-border-light my-1" }),
          /* @__PURE__ */ jsxs4("div", { className: "px-3 py-1.5", children: [
            /* @__PURE__ */ jsxs4("p", { className: "text-text-dim text-[10px] uppercase tracking-wider mb-1.5 flex items-center gap-1.5", children: [
              /* @__PURE__ */ jsx4("i", { className: "bx bx-file-blank text-[11px]" }),
              "Document"
            ] }),
            /* @__PURE__ */ jsx4("div", { className: "flex items-center gap-1 bg-surface/60 border border-border-light rounded-lg p-0.5", children: [
              { key: "canvas", icon: "bx-pen", label: "Canvas" },
              { key: "split", icon: "bx-layout", label: "Split" },
              { key: "docs", icon: "bxs-notepad", label: "Docs" }
            ].map((m) => {
              const active = layoutMode === m.key;
              return /* @__PURE__ */ jsxs4(
                "button",
                {
                  onClick: () => handleSetLayout(m.key),
                  title: m.label,
                  className: `flex-1 flex items-center justify-center gap-1 h-6 rounded-md text-[10.5px] transition-all duration-150 ${active ? "bg-accent-blue text-text-primary" : "text-text-muted hover:text-text-primary hover:bg-surface-hover"}`,
                  children: [
                    /* @__PURE__ */ jsx4("i", { className: `bx ${m.icon} text-[11px]` }),
                    m.label
                  ]
                },
                m.key
              );
            }) })
          ] }),
          /* @__PURE__ */ jsxs4(
            "button",
            {
              onClick: () => {
                triggerCloudSync();
                triggerDocCloudSync();
                closeMenu();
              },
              className: "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-text-secondary text-[12.5px] hover:bg-surface-hover cursor-pointer transition-all duration-200",
              children: [
                /* @__PURE__ */ jsxs4("span", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsx4("i", { className: "bx bx-cloud-upload text-sm" }),
                  "Sync canvas + doc"
                ] }),
                /* @__PURE__ */ jsx4("span", { className: "text-text-dim text-xs", children: "Ctrl+S" })
              ]
            }
          ),
          /* @__PURE__ */ jsx4("hr", { className: "border-border-light my-1" }),
          /* @__PURE__ */ jsxs4(
            "button",
            {
              onClick: () => setPrefsOpen((p) => !p),
              className: `w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-text-secondary text-[12.5px] hover:bg-surface-hover cursor-pointer transition-all duration-200 ${prefsOpen ? "bg-surface-hover" : ""}`,
              children: [
                /* @__PURE__ */ jsxs4("span", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsx4("i", { className: "bx bx-cog text-sm" }),
                  t("menu.preferences")
                ] }),
                /* @__PURE__ */ jsx4("i", { className: `bx bx-chevron-down text-sm text-text-dim transition-transform duration-150 ${prefsOpen ? "rotate-180" : ""}` })
              ]
            }
          ),
          prefsOpen && /* @__PURE__ */ jsxs4("div", { className: "ml-2 border-l border-border-light pl-1", children: [
            /* @__PURE__ */ jsxs4("div", { className: "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-text-secondary text-[11px] transition-all duration-200", children: [
              /* @__PURE__ */ jsx4("span", { className: "flex items-center gap-2", children: t("prefs.language") }),
              /* @__PURE__ */ jsxs4(
                "select",
                {
                  className: "bg-surface-hover text-text-primary text-[10px] rounded px-1 outline-none border border-border-light",
                  value: language,
                  onChange: (e) => persistUIPrefs({ language: e.target.value }),
                  children: [
                    /* @__PURE__ */ jsx4("option", { value: "en", children: "English" }),
                    /* @__PURE__ */ jsx4("option", { value: "bg", children: "\u0411\u044A\u043B\u0433\u0430\u0440\u0441\u043A\u0438" }),
                    /* @__PURE__ */ jsx4("option", { value: "de", children: "Deutsch" })
                  ]
                }
              )
            ] }),
            PREFERENCE_ITEMS.map((item) => {
              const isActive = item.id === "toolLock" && toolLock || item.id === "snapObjects" && snapToObjects || item.id === "toggleGrid" && gridEnabled || item.id === "zenMode" && zenMode || item.id === "viewMode" && viewMode || item.toggle;
              const handleClick = () => {
                if (item.id === "toolLock") toggleToolLock();
                else if (item.id === "snapObjects") toggleSnapToObjects();
                else if (item.id === "toggleGrid") toggleGrid();
                else if (item.id === "zenMode") {
                  toggleZenMode();
                  closeMenu();
                } else if (item.id === "viewMode") {
                  toggleViewMode();
                  closeMenu();
                }
              };
              return /* @__PURE__ */ jsxs4(
                "button",
                {
                  onClick: handleClick,
                  className: "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-text-secondary text-[11px] hover:bg-surface-hover cursor-pointer transition-all duration-200",
                  children: [
                    /* @__PURE__ */ jsxs4("span", { className: "flex items-center gap-2", children: [
                      isActive && /* @__PURE__ */ jsx4("i", { className: "bx bx-check text-sm text-accent-blue" }),
                      item.label
                    ] }),
                    item.shortcut && /* @__PURE__ */ jsx4("span", { className: "text-text-dim text-[10px]", children: item.shortcut })
                  ]
                },
                item.id
              );
            })
          ] }),
          /* @__PURE__ */ jsxs4(
            "button",
            {
              onClick: toggleGrid,
              className: "w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-text-secondary text-[12.5px] hover:bg-surface-hover cursor-pointer transition-all duration-200",
              children: [
                /* @__PURE__ */ jsxs4("span", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsx4("i", { className: "bx bx-grid-alt text-sm" }),
                  t("menu.showGrid")
                ] }),
                /* @__PURE__ */ jsx4("div", { className: `w-7 h-4 rounded-full transition-all duration-150 relative ${gridEnabled ? "bg-accent-blue" : "bg-white/10"}`, children: /* @__PURE__ */ jsx4("div", { className: `absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all duration-150 ${gridEnabled ? "left-3.5" : "left-0.5"}` }) })
              ]
            }
          ),
          /* @__PURE__ */ jsx4(
            "button",
            {
              onClick: () => {
                const serializer = window.__sceneSerializer;
                if (serializer?.resetCanvas) serializer.resetCanvas();
                clearShapes();
                clearHistory();
                closeMenu();
              },
              className: "w-full flex items-center justify-between px-3 py-2 rounded-lg text-red-400 text-xs hover:bg-red-500/10 cursor-pointer transition-all duration-200",
              children: /* @__PURE__ */ jsxs4("span", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ jsx4("i", { className: "bx bx-reset text-sm" }),
                t("menu.resetCanvas")
              ] })
            }
          ),
          /* @__PURE__ */ jsx4("hr", { className: "border-border-light my-1" }),
          LINKS.map((link) => {
            const isExternal = link.href.startsWith("http");
            return /* @__PURE__ */ jsxs4(
              "a",
              {
                href: link.href,
                ...isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {},
                onClick: closeMenu,
                className: "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-text-secondary text-[12.5px] hover:bg-surface-hover cursor-pointer transition-all duration-200",
                children: [
                  /* @__PURE__ */ jsx4("i", { className: `bx ${link.icon} text-sm` }),
                  link.label
                ]
              },
              link.label
            );
          }),
          /* @__PURE__ */ jsx4("hr", { className: "border-border-light my-1" }),
          isAuthenticated ? /* @__PURE__ */ jsxs4(Fragment2, { children: [
            /* @__PURE__ */ jsxs4("div", { className: "px-3 py-2 flex items-center gap-2", children: [
              authUser?.avatar ? /* @__PURE__ */ jsx4("img", { src: authUser.avatar, alt: "", className: "w-5 h-5 rounded-full" }) : /* @__PURE__ */ jsx4("i", { className: "bx bx-user-circle text-sm text-accent-blue" }),
              /* @__PURE__ */ jsx4("span", { className: "text-text-secondary text-xs truncate flex-1", children: authUser?.displayName || authUser?.email })
            ] }),
            /* @__PURE__ */ jsx4(
              "button",
              {
                onClick: () => {
                  logout();
                  closeMenu();
                },
                className: "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all duration-200 text-red-400 hover:bg-red-500/10 cursor-pointer",
                children: /* @__PURE__ */ jsxs4("span", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsx4("i", { className: "bx bx-log-out text-sm" }),
                  t("menu.signOut")
                ] })
              }
            )
          ] }) : /* @__PURE__ */ jsxs4(
            "button",
            {
              onClick: () => {
                login();
                closeMenu();
              },
              className: "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-all duration-200 text-text-secondary hover:bg-surface-hover",
              children: [
                /* @__PURE__ */ jsxs4("span", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ jsx4("i", { className: "bx bx-log-in text-sm" }),
                  t("menu.signIn")
                ] }),
                /* @__PURE__ */ jsx4("span", { className: "text-text-dim text-[10px] px-1.5 py-0.5 rounded bg-accent-blue/15 text-accent-blue", children: "Elixpo" })
              ]
            }
          ),
          /* @__PURE__ */ jsx4("hr", { className: "border-border-light my-1" }),
          /* @__PURE__ */ jsxs4("div", { className: "px-3 py-2", children: [
            /* @__PURE__ */ jsx4("p", { className: "text-text-dim text-xs uppercase tracking-wider mb-2", children: t("menu.theme") }),
            /* @__PURE__ */ jsx4("div", { className: "flex items-center gap-1", children: [
              { value: "light", icon: "bxs-sun" },
              { value: "dark", icon: "bxs-moon" },
              { value: "system", icon: "bx-laptop" }
            ].map((t2) => /* @__PURE__ */ jsx4(
              "button",
              {
                onClick: () => setTheme(t2.value),
                className: `flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs cursor-pointer transition-all duration-200 ${theme === t2.value ? "bg-accent text-text-primary" : "text-text-muted hover:bg-surface-hover"}`,
                children: /* @__PURE__ */ jsx4("i", { className: `bx ${t2.icon} text-sm` })
              },
              t2.value
            )) })
          ] }),
          /* @__PURE__ */ jsxs4("div", { className: "px-3 py-2", children: [
            /* @__PURE__ */ jsx4("p", { className: "text-text-dim text-xs uppercase tracking-wider mb-2", children: t("menu.canvasBackground") }),
            /* @__PURE__ */ jsx4("div", { className: "flex items-center gap-1.5", children: CANVAS_BACKGROUNDS.map((bg) => /* @__PURE__ */ jsx4(
              "button",
              {
                onClick: () => setCanvasBackground(bg.color),
                title: t(bg.label),
                className: `w-7 h-7 rounded-full border-2 cursor-pointer transition-all duration-200 ${canvasBackground === bg.color ? "border-accent scale-110" : "border-border hover:border-border-light"}`,
                style: { backgroundColor: bg.color }
              },
              bg.color
            )) })
          ] })
        ]
      }
    )
  ] });
}

// src/react/components/sidebars/ShapeSidebar.jsx
import { useState as useState3, useRef as useRef3, useEffect as useEffect3 } from "react";
import { jsx as jsx5, jsxs as jsxs5 } from "react/jsx-runtime";
function ToolbarButton({ icon, preview, children, tooltip }) {
  const [open, setOpen] = useState3(false);
  const ref = useRef3(null);
  useEffect3(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);
  return /* @__PURE__ */ jsxs5("div", { ref, className: "relative flex items-center", children: [
    /* @__PURE__ */ jsxs5(
      "button",
      {
        onClick: () => setOpen(!open),
        title: tooltip,
        className: `h-9 flex items-center gap-1.5 px-3 rounded-lg transition-all duration-100 ${open ? "bg-surface-active text-text-primary" : "text-text-muted hover:text-text-primary hover:bg-surface-hover"}`,
        children: [
          preview || icon && /* @__PURE__ */ jsx5("i", { className: `bx ${icon} text-base` }),
          /* @__PURE__ */ jsx5("svg", { className: `w-2 h-2 opacity-40 transition-transform duration-100 ${open ? "rotate-180" : ""}`, viewBox: "0 0 8 5", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: /* @__PURE__ */ jsx5("path", { d: "M1 1l3 3 3-3" }) })
        ]
      }
    ),
    open && /* @__PURE__ */ jsxs5("div", { className: "absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-20", children: [
      /* @__PURE__ */ jsx5("div", { className: "bg-surface-card border border-border-light rounded-xl p-3 shadow-xl shadow-black/10 min-w-max", children }),
      /* @__PURE__ */ jsx5("div", { className: "absolute -bottom-[5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-surface-card border-r border-b border-border-light" })
    ] })
  ] });
}
function Divider() {
  return /* @__PURE__ */ jsx5("div", { className: "w-px h-5 bg-surface-hover mx-0.5 shrink-0" });
}
function ShapeSidebar({ visible, children }) {
  const viewMode = useSketchStore_default((s) => s.viewMode);
  const show = visible && !viewMode;
  return /* @__PURE__ */ jsx5(
    "div",
    {
      className: `absolute bottom-14 left-1/2 -translate-x-1/2 bg-surface border border-border-light rounded-xl px-2 py-1.5 z-[999] font-[lixFont] transition-all duration-200 ${show ? "opacity-100 pointer-events-auto translate-y-0" : "opacity-0 pointer-events-none translate-y-2"}`,
      children: /* @__PURE__ */ jsx5("div", { className: "flex items-center gap-0.5", children })
    }
  );
}
function LayerControls() {
  const { t } = useTranslation();
  const doLayer = (method) => {
    const shape = window.currentShape;
    if (!shape || !window.__layerOrder) return;
    window.__layerOrder[method](shape);
  };
  return /* @__PURE__ */ jsxs5("div", { className: "flex items-center gap-0.5", children: [
    /* @__PURE__ */ jsx5(
      "button",
      {
        onClick: () => doLayer("sendToBack"),
        title: t("sidebar.sendToBack", { defaultValue: "Send to back" }),
        className: "h-9 w-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-100",
        children: /* @__PURE__ */ jsx5("i", { className: "bx bx-chevrons-down text-base" })
      }
    ),
    /* @__PURE__ */ jsx5(
      "button",
      {
        onClick: () => doLayer("sendBackward"),
        title: t("sidebar.sendBackward"),
        className: "h-9 w-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-100",
        children: /* @__PURE__ */ jsx5("i", { className: "bx bx-chevron-down text-base" })
      }
    ),
    /* @__PURE__ */ jsx5(
      "button",
      {
        onClick: () => doLayer("bringForward"),
        title: t("sidebar.bringForward"),
        className: "h-9 w-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-100",
        children: /* @__PURE__ */ jsx5("i", { className: "bx bx-chevron-up text-base" })
      }
    ),
    /* @__PURE__ */ jsx5(
      "button",
      {
        onClick: () => doLayer("bringToFront"),
        title: t("sidebar.bringToFront", { defaultValue: "Bring to front" }),
        className: "h-9 w-8 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-100",
        children: /* @__PURE__ */ jsx5("i", { className: "bx bx-chevrons-up text-base" })
      }
    )
  ] });
}

// src/react/components/sidebars/RectangleSidebar.jsx
import { useState as useState4, useCallback as useCallback2 } from "react";
import { jsx as jsx6, jsxs as jsxs6 } from "react/jsx-runtime";
var STROKE_COLORS = ["#1a1a20", "#ffffff", "#FF8383", "#3A994C", "#56A2E8", "#FFD700", "#FF69B4", "#A855F7"];
var BG_COLORS = ["transparent", "#f0f0f0", "#ffcccb", "#90ee90", "#add8e6", "#FFE4B5", "#DDA0DD", "#2d2d2d"];
var FILLS = [
  { value: "hachure", label: "sidebar.fill.hachure" },
  { value: "solid", label: "sidebar.fill.solid" },
  { value: "dots", label: "sidebar.fill.dots" },
  { value: "cross-hatch", label: "sidebar.fill.cross" },
  { value: "transparent", label: "sidebar.fill.none" }
];
function ColorGrid({ colors, selected, onSelect }) {
  return /* @__PURE__ */ jsx6("div", { className: "grid grid-cols-4 gap-1.5", children: colors.map((c) => {
    const isTrans = c === "transparent";
    return /* @__PURE__ */ jsx6(
      "button",
      {
        onClick: () => onSelect(c),
        className: `w-7 h-7 rounded-md border-[1.5px] transition-all duration-100 ${selected === c ? "border-[#5B57D1] scale-110" : "border-white/[0.08] hover:border-white/20"}`,
        style: !isTrans ? { backgroundColor: c } : void 0,
        children: isTrans && /* @__PURE__ */ jsx6("svg", { className: "w-full h-full text-text-dim", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx6("line", { x1: "4", y1: "16", x2: "16", y2: "4", stroke: "currentColor", strokeWidth: "2" }) })
      },
      c
    );
  }) });
}
function RectangleSidebar() {
  const { t } = useTranslation();
  const activeTool = useSketchStore_default((s) => s.activeTool);
  const selectedShapeSidebar = useSketchStore_default((s) => s.selectedShapeSidebar);
  const [strokeColor, setStrokeColor] = useState4("#fff");
  const [bgColor, setBgColor] = useState4("transparent");
  const [thickness, setThickness] = useState4(2);
  const [lineStyle, setLineStyle] = useState4("solid");
  const [fillStyle, setFillStyle] = useState4("hachure");
  const update = useCallback2((changes, localSetters) => {
    Object.entries(localSetters).forEach(([, fn]) => fn());
    if (window.updateSelectedRectStyle) window.updateSelectedRectStyle(changes);
  }, []);
  const updateStroke = useCallback2((v) => {
    setStrokeColor(v);
    if (window.updateSelectedRectStyle) window.updateSelectedRectStyle({ stroke: v });
  }, []);
  const updateBg = useCallback2((v) => {
    setBgColor(v);
    if (window.updateSelectedRectStyle) window.updateSelectedRectStyle({ fill: v });
  }, []);
  const updateThickness = useCallback2((v) => {
    setThickness(v);
    if (window.updateSelectedRectStyle) window.updateSelectedRectStyle({ strokeWidth: v });
  }, []);
  const updateStyle = useCallback2((v) => {
    setLineStyle(v);
    if (window.updateSelectedRectStyle) window.updateSelectedRectStyle({ outlineStyle: v });
  }, []);
  const updateFill = useCallback2((v) => {
    setFillStyle(v);
    if (window.updateSelectedRectStyle) window.updateSelectedRectStyle({ fillStyle: v });
  }, []);
  return /* @__PURE__ */ jsxs6(ShapeSidebar, { visible: activeTool === TOOLS.RECTANGLE || selectedShapeSidebar === "rectangle", children: [
    /* @__PURE__ */ jsxs6(
      ToolbarButton,
      {
        tooltip: t("sidebar.strokeColor"),
        preview: /* @__PURE__ */ jsx6("span", { className: "w-4 h-4 rounded-md border border-white/20", style: { backgroundColor: strokeColor } }),
        children: [
          /* @__PURE__ */ jsx6("p", { className: "text-xs text-text-muted uppercase tracking-wider mb-2", children: t("sidebar.sectionHeader.stroke") }),
          /* @__PURE__ */ jsx6(ColorGrid, { colors: STROKE_COLORS, selected: strokeColor, onSelect: updateStroke })
        ]
      }
    ),
    /* @__PURE__ */ jsx6(Divider, {}),
    /* @__PURE__ */ jsxs6(
      ToolbarButton,
      {
        tooltip: t("sidebar.fillColor"),
        preview: /* @__PURE__ */ jsx6("span", { className: "w-4 h-4 rounded-md border border-white/20", style: { backgroundColor: bgColor === "transparent" ? "transparent" : bgColor }, children: bgColor === "transparent" && /* @__PURE__ */ jsx6("svg", { className: "w-full h-full text-text-dim", viewBox: "0 0 16 16", children: /* @__PURE__ */ jsx6("line", { x1: "2", y1: "14", x2: "14", y2: "2", stroke: "currentColor", strokeWidth: "1.5" }) }) }),
        children: [
          /* @__PURE__ */ jsx6("p", { className: "text-xs text-text-muted uppercase tracking-wider mb-2", children: t("sidebar.sectionHeader.background") }),
          /* @__PURE__ */ jsx6(ColorGrid, { colors: BG_COLORS, selected: bgColor, onSelect: updateBg })
        ]
      }
    ),
    /* @__PURE__ */ jsx6(Divider, {}),
    /* @__PURE__ */ jsxs6(ToolbarButton, { icon: "bxs-edit-alt", tooltip: t("sidebar.strokeWidth"), children: [
      /* @__PURE__ */ jsx6("p", { className: "text-xs text-text-muted uppercase tracking-wider mb-2", children: t("sidebar.sectionHeader.width") }),
      /* @__PURE__ */ jsx6("div", { className: "flex items-center gap-1", children: [1, 2, 4, 7].map((w) => /* @__PURE__ */ jsx6(
        "button",
        {
          onClick: () => updateThickness(w),
          className: `w-9 h-8 flex items-center justify-center rounded-lg transition-all duration-100 ${thickness === w ? "bg-[#5B57D1]/20 text-[#5B57D1]" : "text-text-muted hover:bg-white/[0.06]"}`,
          children: /* @__PURE__ */ jsx6("div", { className: "w-5 rounded-full bg-current", style: { height: Math.max(1, w) } })
        },
        w
      )) })
    ] }),
    /* @__PURE__ */ jsx6(Divider, {}),
    /* @__PURE__ */ jsxs6(ToolbarButton, { icon: "bxs-minus-circle", tooltip: "Stroke style", children: [
      /* @__PURE__ */ jsx6("p", { className: "text-xs text-text-muted uppercase tracking-wider mb-2", children: t("sidebar.style") }),
      /* @__PURE__ */ jsx6("div", { className: "flex items-center gap-1", children: [
        { v: "solid", d: "" },
        { v: "dashed", d: "6 4" },
        { v: "dotted", d: "2 3" }
      ].map((s) => /* @__PURE__ */ jsx6(
        "button",
        {
          onClick: () => updateStyle(s.v),
          className: `w-11 h-8 flex items-center justify-center rounded-lg transition-all duration-100 ${lineStyle === s.v ? "bg-[#5B57D1]/20" : "hover:bg-white/[0.06]"}`,
          children: /* @__PURE__ */ jsx6("svg", { width: "28", height: "4", viewBox: "0 0 28 4", children: /* @__PURE__ */ jsx6("line", { x1: "0", y1: "2", x2: "28", y2: "2", stroke: "#fff", strokeWidth: "2", strokeDasharray: s.d, strokeLinecap: "round" }) })
        },
        s.v
      )) })
    ] }),
    /* @__PURE__ */ jsx6(Divider, {}),
    /* @__PURE__ */ jsxs6(ToolbarButton, { icon: "bxs-brush", tooltip: "Fill style", children: [
      /* @__PURE__ */ jsx6("p", { className: "text-xs text-text-muted uppercase tracking-wider mb-2", children: t("sidebar.sectionHeader.fill") }),
      /* @__PURE__ */ jsx6("div", { className: "flex flex-col gap-0.5", children: FILLS.map((f) => /* @__PURE__ */ jsxs6(
        "button",
        {
          onClick: () => updateFill(f.value),
          className: `flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-100 ${fillStyle === f.value ? "bg-[#5B57D1] text-white" : "text-text-secondary hover:bg-white/[0.06]"}`,
          children: [
            /* @__PURE__ */ jsx6("span", { className: "w-1.5 h-1.5 rounded-full bg-current" }),
            t(f.label)
          ]
        },
        f.value
      )) })
    ] }),
    /* @__PURE__ */ jsx6(Divider, {}),
    /* @__PURE__ */ jsx6(LayerControls, {})
  ] });
}

// src/react/components/sidebars/CircleSidebar.jsx
import { useState as useState5, useCallback as useCallback3 } from "react";
import { jsx as jsx7, jsxs as jsxs7 } from "react/jsx-runtime";
var STROKE_COLORS2 = ["#1a1a20", "#ffffff", "#FF8383", "#3A994C", "#56A2E8", "#FFD700", "#FF69B4", "#A855F7"];
var BG_COLORS2 = ["transparent", "#f0f0f0", "#ffcccb", "#90ee90", "#add8e6", "#FFE4B5", "#DDA0DD", "#2d2d2d"];
var FILLS2 = [
  { value: "hachure", label: "sidebar.fill.hachure" },
  { value: "solid", label: "sidebar.fill.solid" },
  { value: "dots", label: "sidebar.fill.dots" },
  { value: "cross-hatch", label: "sidebar.fill.cross" },
  { value: "transparent", label: "sidebar.fill.none" }
];
function ColorGrid2({ colors, selected, onSelect }) {
  return /* @__PURE__ */ jsx7("div", { className: "grid grid-cols-4 gap-1.5", children: colors.map((c) => {
    const isTrans = c === "transparent";
    return /* @__PURE__ */ jsx7(
      "button",
      {
        onClick: () => onSelect(c),
        className: `w-7 h-7 rounded-md border-[1.5px] transition-all duration-100 ${selected === c ? "border-accent-blue scale-110" : "border-white/[0.08] hover:border-white/20"}`,
        style: !isTrans ? { backgroundColor: c } : void 0,
        children: isTrans && /* @__PURE__ */ jsx7("svg", { className: "w-full h-full text-text-dim", viewBox: "0 0 20 20", children: /* @__PURE__ */ jsx7("line", { x1: "4", y1: "16", x2: "16", y2: "4", stroke: "currentColor", strokeWidth: "2" }) })
      },
      c
    );
  }) });
}
function CircleSidebar() {
  const { t } = useTranslation();
  const activeTool = useSketchStore_default((s) => s.activeTool);
  const selectedShapeSidebar = useSketchStore_default((s) => s.selectedShapeSidebar);
  const [strokeColor, setStrokeColor] = useState5("#fff");
  const [bgColor, setBgColor] = useState5("transparent");
  const [thickness, setThickness] = useState5(2);
  const [lineStyle, setLineStyle] = useState5("solid");
  const [fillStyle, setFillStyle] = useState5("hachure");
  const updateStroke = useCallback3((v) => {
    setStrokeColor(v);
    if (window.updateSelectedCircleStyle) window.updateSelectedCircleStyle({ stroke: v });
  }, []);
  const updateBg = useCallback3((v) => {
    setBgColor(v);
    if (window.updateSelectedCircleStyle) window.updateSelectedCircleStyle({ fill: v });
  }, []);
  const updateThickness = useCallback3((v) => {
    setThickness(v);
    if (window.updateSelectedCircleStyle) window.updateSelectedCircleStyle({ strokeWidth: v });
  }, []);
  const updateStyle = useCallback3((v) => {
    setLineStyle(v);
    if (window.updateSelectedCircleStyle) window.updateSelectedCircleStyle({ outlineStyle: v });
  }, []);
  const updateFill = useCallback3((v) => {
    setFillStyle(v);
    if (window.updateSelectedCircleStyle) window.updateSelectedCircleStyle({ fillStyle: v });
  }, []);
  return /* @__PURE__ */ jsxs7(ShapeSidebar, { visible: activeTool === TOOLS.CIRCLE || selectedShapeSidebar === "circle", children: [
    /* @__PURE__ */ jsxs7(
      ToolbarButton,
      {
        tooltip: t("sidebar.strokeColor"),
        preview: /* @__PURE__ */ jsx7("span", { className: "w-4 h-4 rounded-md border border-white/20", style: { backgroundColor: strokeColor } }),
        children: [
          /* @__PURE__ */ jsx7("p", { className: "text-xs text-text-muted uppercase tracking-wider mb-2", children: t("sidebar.sectionHeader.stroke") }),
          /* @__PURE__ */ jsx7(ColorGrid2, { colors: STROKE_COLORS2, selected: strokeColor, onSelect: updateStroke })
        ]
      }
    ),
    /* @__PURE__ */ jsx7(Divider, {}),
    /* @__PURE__ */ jsxs7(
      ToolbarButton,
      {
        tooltip: t("sidebar.fillColor"),
        preview: /* @__PURE__ */ jsx7("span", { className: "w-4 h-4 rounded-md border border-white/20", style: { backgroundColor: bgColor === "transparent" ? "transparent" : bgColor }, children: bgColor === "transparent" && /* @__PURE__ */ jsx7("svg", { className: "w-full h-full text-text-dim", viewBox: "0 0 16 16", children: /* @__PURE__ */ jsx7("line", { x1: "2", y1: "14", x2: "14", y2: "2", stroke: "currentColor", strokeWidth: "1.5" }) }) }),
        children: [
          /* @__PURE__ */ jsx7("p", { className: "text-xs text-text-muted uppercase tracking-wider mb-2", children: t("sidebar.sectionHeader.background") }),
          /* @__PURE__ */ jsx7(ColorGrid2, { colors: BG_COLORS2, selected: bgColor, onSelect: updateBg })
        ]
      }
    ),
    /* @__PURE__ */ jsx7(Divider, {}),
    /* @__PURE__ */ jsxs7(ToolbarButton, { icon: "bxs-edit-alt", tooltip: t("sidebar.strokeWidth"), children: [
      /* @__PURE__ */ jsx7("p", { className: "text-xs text-text-muted uppercase tracking-wider mb-2", children: t("sidebar.sectionHeader.width") }),
      /* @__PURE__ */ jsx7("div", { className: "flex items-center gap-1", children: [1, 2, 4, 7].map((w) => /* @__PURE__ */ jsx7(
        "button",
        {
          onClick: () => updateThickness(w),
          className: `w-9 h-8 flex items-center justify-center rounded-lg transition-all duration-100 ${thickness === w ? "bg-[#5B57D1]/20 text-[#5B57D1]" : "text-text-muted hover:bg-white/[0.06]"}`,
          children: /* @__PURE__ */ jsx7("div", { className: "w-5 rounded-full bg-current", style: { height: Math.max(1, w) } })
        },
        w
      )) })
    ] }),
    /* @__PURE__ */ jsx7(Divider, {}),
    /* @__PURE__ */ jsxs7(ToolbarButton, { icon: "bxs-minus-circle", tooltip: "Stroke style", children: [
      /* @__PURE__ */ jsx7("p", { className: "text-xs text-text-muted uppercase tracking-wider mb-2", children: t("sidebar.style") }),
      /* @__PURE__ */ jsx7("div", { className: "flex items-center gap-1", children: [{ v: "solid", d: "" }, { v: "dashed", d: "6 4" }, { v: "dotted", d: "2 3" }].map((s) => /* @__PURE__ */ jsx7(
        "button",
        {
          onClick: () => updateStyle(s.v),
          className: `w-11 h-8 flex items-center justify-center rounded-lg transition-all duration-100 ${lineStyle === s.v ? "bg-[#5B57D1]/20" : "hover:bg-white/[0.06]"}`,
          children: /* @__PURE__ */ jsx7("svg", { width: "28", height: "4", viewBox: "0 0 28 4", children: /* @__PURE__ */ jsx7("line", { x1: "0", y1: "2", x2: "28", y2: "2", stroke: "#fff", strokeWidth: "2", strokeDasharray: s.d, strokeLinecap: "round" }) })
        },
        s.v
      )) })
    ] }),
    /* @__PURE__ */ jsx7(Divider, {}),
    /* @__PURE__ */ jsxs7(ToolbarButton, { icon: "bxs-brush", tooltip: "Fill style", children: [
      /* @__PURE__ */ jsx7("p", { className: "text-xs text-text-muted uppercase tracking-wider mb-2", children: t("sidebar.sectionHeader.fill") }),
      /* @__PURE__ */ jsx7("div", { className: "flex flex-col gap-0.5", children: FILLS2.map((f) => /* @__PURE__ */ jsxs7(
        "button",
        {
          onClick: () => updateFill(f.value),
          className: `flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-100 ${fillStyle === f.value ? "bg-[#5B57D1] text-white" : "text-text-secondary hover:bg-white/[0.06]"}`,
          children: [
            /* @__PURE__ */ jsx7("span", { className: "w-1.5 h-1.5 rounded-full bg-current" }),
            t(f.label)
          ]
        },
        f.value
      )) })
    ] }),
    /* @__PURE__ */ jsx7(Divider, {}),
    /* @__PURE__ */ jsx7(LayerControls, {})
  ] });
}

// src/react/components/sidebars/LineSidebar.jsx
import { useState as useState6, useCallback as useCallback4 } from "react";
import { jsx as jsx8, jsxs as jsxs8 } from "react/jsx-runtime";
var STROKE_COLORS3 = ["#1a1a20", "#ffffff", "#FF8383", "#3A994C", "#56A2E8", "#FFD700", "#FF69B4", "#A855F7"];
function ColorGrid3({ colors, selected, onSelect }) {
  return /* @__PURE__ */ jsx8("div", { className: "grid grid-cols-4 gap-1.5", children: colors.map((c) => /* @__PURE__ */ jsx8(
    "button",
    {
      onClick: () => onSelect(c),
      className: `w-7 h-7 rounded-md border-[1.5px] transition-all duration-100 ${selected === c ? "border-[#5B57D1] scale-110" : "border-white/[0.08] hover:border-white/20"}`,
      style: { backgroundColor: c }
    },
    c
  )) });
}
function LineSidebar() {
  const { t } = useTranslation();
  const activeTool = useSketchStore_default((s) => s.activeTool);
  const selectedShapeSidebar = useSketchStore_default((s) => s.selectedShapeSidebar);
  const [strokeColor, setStrokeColor] = useState6("#fff");
  const [thickness, setThickness] = useState6(2);
  const [lineStyle, setLineStyle] = useState6("solid");
  const [sloppiness, setSloppiness] = useState6(0);
  const [edge, setEdge] = useState6("smooth");
  const updateStroke = useCallback4((v) => {
    setStrokeColor(v);
    if (window.updateSelectedLineStyle) window.updateSelectedLineStyle({ stroke: v });
  }, []);
  const updateThickness = useCallback4((v) => {
    setThickness(v);
    if (window.updateSelectedLineStyle) window.updateSelectedLineStyle({ strokeWidth: v });
  }, []);
  const updateStyle = useCallback4((v) => {
    setLineStyle(v);
    if (window.updateSelectedLineStyle) window.updateSelectedLineStyle({ strokeStyle: v });
  }, []);
  const updateSloppiness = useCallback4((v) => {
    setSloppiness(v);
    if (window.updateSelectedLineStyle) window.updateSelectedLineStyle({ sloppiness: v });
  }, []);
  const updateEdge = useCallback4((v) => {
    setEdge(v);
    if (window.updateSelectedLineStyle) window.updateSelectedLineStyle({ edge: v === "smooth" ? 1 : 5 });
  }, []);
  return /* @__PURE__ */ jsxs8(ShapeSidebar, { visible: activeTool === TOOLS.LINE || selectedShapeSidebar === "line", children: [
    /* @__PURE__ */ jsxs8(
      ToolbarButton,
      {
        tooltip: t("sidebar.strokeColor"),
        preview: /* @__PURE__ */ jsx8("span", { className: "w-4 h-4 rounded-md border border-white/20", style: { backgroundColor: strokeColor } }),
        children: [
          /* @__PURE__ */ jsx8("p", { className: "text-xs text-text-muted uppercase tracking-wider mb-2", children: t("sidebar.sectionHeader.stroke") }),
          /* @__PURE__ */ jsx8(ColorGrid3, { colors: STROKE_COLORS3, selected: strokeColor, onSelect: updateStroke })
        ]
      }
    ),
    /* @__PURE__ */ jsx8(Divider, {}),
    /* @__PURE__ */ jsxs8(ToolbarButton, { icon: "bxs-edit-alt", tooltip: t("sidebar.strokeWidth"), children: [
      /* @__PURE__ */ jsx8("p", { className: "text-xs text-text-muted uppercase tracking-wider mb-2", children: t("sidebar.sectionHeader.width") }),
      /* @__PURE__ */ jsx8("div", { className: "flex items-center gap-1", children: [1, 2, 4, 7].map((w) => /* @__PURE__ */ jsx8(
        "button",
        {
          onClick: () => updateThickness(w),
          className: `w-9 h-8 flex items-center justify-center rounded-lg transition-all duration-100 ${thickness === w ? "bg-[#5B57D1]/20 text-[#5B57D1]" : "text-text-muted hover:bg-white/[0.06]"}`,
          children: /* @__PURE__ */ jsx8("div", { className: "w-5 rounded-full bg-current", style: { height: Math.max(1, w) } })
        },
        w
      )) })
    ] }),
    /* @__PURE__ */ jsx8(Divider, {}),
    /* @__PURE__ */ jsxs8(ToolbarButton, { icon: "bxs-minus-circle", tooltip: "Stroke style", children: [
      /* @__PURE__ */ jsx8("p", { className: "text-xs text-text-muted uppercase tracking-wider mb-2", children: t("sidebar.style") }),
      /* @__PURE__ */ jsx8("div", { className: "flex items-center gap-1", children: [{ v: "solid", d: "" }, { v: "dashed", d: "6 4" }, { v: "dotted", d: "2 3" }].map((s) => /* @__PURE__ */ jsx8(
        "button",
        {
          onClick: () => updateStyle(s.v),
          className: `w-11 h-8 flex items-center justify-center rounded-lg transition-all duration-100 ${lineStyle === s.v ? "bg-[#5B57D1]/20" : "hover:bg-white/[0.06]"}`,
          children: /* @__PURE__ */ jsx8("svg", { width: "28", height: "4", viewBox: "0 0 28 4", children: /* @__PURE__ */ jsx8("line", { x1: "0", y1: "2", x2: "28", y2: "2", stroke: "#fff", strokeWidth: "2", strokeDasharray: s.d, strokeLinecap: "round" }) })
        },
        s.v
      )) })
    ] }),
    /* @__PURE__ */ jsx8(Divider, {}),
    /* @__PURE__ */ jsxs8(ToolbarButton, { icon: "bxs-shape-polygon", tooltip: "Sloppiness", children: [
      /* @__PURE__ */ jsx8("p", { className: "text-xs text-text-muted uppercase tracking-wider mb-2", children: t("sidebar.sectionHeader.sloppiness") }),
      /* @__PURE__ */ jsx8("div", { className: "flex items-center gap-1", children: [{ v: 0, l: "0" }, { v: 2, l: "2" }, { v: 4, l: "4" }].map((s) => /* @__PURE__ */ jsx8(
        "button",
        {
          onClick: () => updateSloppiness(s.v),
          className: `w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-all duration-100 ${sloppiness === s.v ? "bg-[#5B57D1]/20 text-accent-blue" : "text-text-muted hover:bg-white/6"}`,
          children: s.l
        },
        s.v
      )) })
    ] }),
    /* @__PURE__ */ jsx8(Divider, {}),
    /* @__PURE__ */ jsxs8(ToolbarButton, { icon: "bxs-landscape", tooltip: "Edge", children: [
      /* @__PURE__ */ jsx8("p", { className: "text-xs text-text-muted uppercase tracking-wider mb-2", children: t("sidebar.sectionHeader.edge") }),
      /* @__PURE__ */ jsx8("div", { className: "flex flex-col gap-0.5", children: [{ v: "smooth", i: "bxs-droplet", l: "Smooth" }, { v: "rough", i: "bxs-bolt", l: "Rough" }].map((e) => /* @__PURE__ */ jsxs8(
        "button",
        {
          onClick: () => updateEdge(e.v),
          className: `flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-100 ${edge === e.v ? "bg-accent-blue text-white" : "text-text-secondary hover:bg-white/6"}`,
          children: [
            /* @__PURE__ */ jsx8("i", { className: `bx ${e.i} text-sm` }),
            " ",
            e.l
          ]
        },
        e.v
      )) })
    ] }),
    /* @__PURE__ */ jsx8(Divider, {}),
    /* @__PURE__ */ jsx8(LayerControls, {})
  ] });
}

// src/react/components/sidebars/ArrowSidebar.jsx
import { useState as useState7, useCallback as useCallback5 } from "react";
import { Fragment as Fragment3, jsx as jsx9, jsxs as jsxs9 } from "react/jsx-runtime";
var STROKE_COLORS4 = ["#1a1a20", "#ffffff", "#FF8383", "#3A994C", "#56A2E8", "#FFD700", "#FF69B4", "#A855F7"];
var HEAD_STYLES = [
  { value: "default", svg: '<svg width="22" height="12" viewBox="0 0 24 14"><line x1="2" y1="7" x2="16" y2="7" stroke="#fff" stroke-width="2"/><polyline points="13,2 19,7 13,12" fill="none" stroke="#fff" stroke-width="2" stroke-linejoin="round"/></svg>' },
  { value: "square", svg: '<svg width="22" height="12" viewBox="0 0 24 14"><line x1="2" y1="7" x2="14" y2="7" stroke="#fff" stroke-width="2"/><rect x="14" y="3" width="6" height="8" fill="none" stroke="#fff" stroke-width="1.5"/></svg>' },
  { value: "outline", svg: '<svg width="22" height="12" viewBox="0 0 24 14"><line x1="2" y1="7" x2="13" y2="7" stroke="#fff" stroke-width="2"/><polygon points="13,2 21,7 13,12" fill="none" stroke="#fff" stroke-width="1.5"/></svg>' },
  { value: "solid", svg: '<svg width="22" height="12" viewBox="0 0 24 14"><line x1="2" y1="7" x2="13" y2="7" stroke="#fff" stroke-width="2"/><polygon points="13,2 21,7 13,12" fill="#fff"/></svg>' }
];
function SvgIcon({ svg }) {
  return /* @__PURE__ */ jsx9("span", { dangerouslySetInnerHTML: { __html: svg } });
}
function ColorGrid4({ colors, selected, onSelect }) {
  return /* @__PURE__ */ jsx9("div", { className: "grid grid-cols-4 gap-1.5", children: colors.map((c) => /* @__PURE__ */ jsx9(
    "button",
    {
      onClick: () => onSelect(c),
      className: `w-7 h-7 rounded-md border-[1.5px] transition-all duration-100 ${selected === c ? "border-[#5B57D1] scale-110" : "border-white/[0.08] hover:border-white/20"}`,
      style: { backgroundColor: c }
    },
    c
  )) });
}
function ArrowSidebar() {
  const { t } = useTranslation();
  const activeTool = useSketchStore_default((s) => s.activeTool);
  const selectedShapeSidebar = useSketchStore_default((s) => s.selectedShapeSidebar);
  const [headStyle, setHeadStyle] = useState7("default");
  const [strokeColor, setStrokeColor] = useState7("#fff");
  const [thickness, setThickness] = useState7(2);
  const [outlineStyle, setOutlineStyle] = useState7("solid");
  const [arrowType, setArrowType] = useState7("straight");
  const [curvature, setCurvature] = useState7(20);
  const updateHead = useCallback5((v) => {
    setHeadStyle(v);
    if (window.arrowToolSettings) window.arrowToolSettings.headStyle = v;
    if (window.updateSelectedArrowStyle) window.updateSelectedArrowStyle({ arrowHeadStyle: v });
  }, []);
  const updateStroke = useCallback5((v) => {
    setStrokeColor(v);
    if (window.arrowToolSettings) window.arrowToolSettings.strokeColor = v;
    if (window.updateSelectedArrowStyle) window.updateSelectedArrowStyle({ stroke: v });
  }, []);
  const updateThickness = useCallback5((v) => {
    setThickness(v);
    if (window.arrowToolSettings) window.arrowToolSettings.strokeWidth = v;
    if (window.updateSelectedArrowStyle) window.updateSelectedArrowStyle({ strokeWidth: v });
  }, []);
  const updateOutline = useCallback5((v) => {
    setOutlineStyle(v);
    if (window.arrowToolSettings) window.arrowToolSettings.outlineStyle = v;
    if (window.updateSelectedArrowStyle) window.updateSelectedArrowStyle({ arrowOutlineStyle: v });
  }, []);
  const updateType = useCallback5((v) => {
    setArrowType(v);
    if (window.arrowToolSettings) window.arrowToolSettings.arrowCurved = v;
    if (window.updateSelectedArrowStyle) window.updateSelectedArrowStyle({ arrowCurved: v });
  }, []);
  const updateCurvature = useCallback5((v) => {
    setCurvature(v);
    if (window.arrowToolSettings) window.arrowToolSettings.curveAmount = v;
    if (window.updateSelectedArrowStyle) window.updateSelectedArrowStyle({ arrowCurveAmount: v });
  }, []);
  return /* @__PURE__ */ jsxs9(ShapeSidebar, { visible: activeTool === TOOLS.ARROW || selectedShapeSidebar === "arrow", children: [
    /* @__PURE__ */ jsxs9(ToolbarButton, { icon: "bxs-right-arrow", tooltip: "Arrow head", children: [
      /* @__PURE__ */ jsx9("p", { className: "text-xs text-text-secondary uppercase tracking-wider mb-2", children: t("sidebar.sectionHeader.head") }),
      /* @__PURE__ */ jsx9("div", { className: "flex items-center gap-1", children: HEAD_STYLES.map((h) => /* @__PURE__ */ jsx9(
        "button",
        {
          onClick: () => updateHead(h.value),
          className: `w-10 h-8 flex items-center justify-center rounded-lg transition-all duration-100 ${headStyle === h.value ? "bg-[#5B57D1]/20 text-[#5B57D1]" : "text-text-secondary hover:bg-white/[0.06]"}`,
          children: /* @__PURE__ */ jsx9(SvgIcon, { svg: h.svg })
        },
        h.value
      )) })
    ] }),
    /* @__PURE__ */ jsx9(Divider, {}),
    /* @__PURE__ */ jsxs9(
      ToolbarButton,
      {
        tooltip: t("sidebar.strokeColor"),
        preview: /* @__PURE__ */ jsx9("span", { className: "w-4 h-4 rounded-md border border-white/20", style: { backgroundColor: strokeColor } }),
        children: [
          /* @__PURE__ */ jsx9("p", { className: "text-xs text-text-secondary uppercase tracking-wider mb-2", children: t("sidebar.sectionHeader.stroke") }),
          /* @__PURE__ */ jsx9(ColorGrid4, { colors: STROKE_COLORS4, selected: strokeColor, onSelect: updateStroke })
        ]
      }
    ),
    /* @__PURE__ */ jsx9(Divider, {}),
    /* @__PURE__ */ jsxs9(ToolbarButton, { icon: "bxs-edit-alt", tooltip: t("sidebar.strokeWidth"), children: [
      /* @__PURE__ */ jsx9("p", { className: "text-xs text-text-secondary uppercase tracking-wider mb-2", children: t("sidebar.sectionHeader.width") }),
      /* @__PURE__ */ jsx9("div", { className: "flex items-center gap-1", children: [1, 2, 4, 7].map((w) => /* @__PURE__ */ jsx9(
        "button",
        {
          onClick: () => updateThickness(w),
          className: `w-9 h-8 flex items-center justify-center rounded-lg transition-all duration-100 ${thickness === w ? "bg-[#5B57D1]/20 text-[#5B57D1]" : "text-text-secondary hover:bg-white/[0.06]"}`,
          children: /* @__PURE__ */ jsx9("div", { className: "w-5 rounded-full bg-current", style: { height: Math.max(1, w) } })
        },
        w
      )) })
    ] }),
    /* @__PURE__ */ jsx9(Divider, {}),
    /* @__PURE__ */ jsxs9(ToolbarButton, { icon: "bxs-minus-circle", tooltip: "Stroke style", children: [
      /* @__PURE__ */ jsx9("p", { className: "text-xs text-text-secondary uppercase tracking-wider mb-2", children: t("sidebar.style") }),
      /* @__PURE__ */ jsx9("div", { className: "flex items-center gap-1", children: [{ v: "solid", d: "" }, { v: "dashed", d: "6 4" }, { v: "dotted", d: "2 3" }].map((s) => /* @__PURE__ */ jsx9(
        "button",
        {
          onClick: () => updateOutline(s.v),
          className: `w-11 h-8 flex items-center justify-center rounded-lg transition-all duration-100 ${outlineStyle === s.v ? "bg-[#5B57D1]/20" : "hover:bg-white/[0.06]"}`,
          children: /* @__PURE__ */ jsx9("svg", { width: "28", height: "4", viewBox: "0 0 28 4", children: /* @__PURE__ */ jsx9("line", { x1: "0", y1: "2", x2: "28", y2: "2", stroke: "#fff", strokeWidth: "2", strokeDasharray: s.d, strokeLinecap: "round" }) })
        },
        s.v
      )) })
    ] }),
    /* @__PURE__ */ jsx9(Divider, {}),
    /* @__PURE__ */ jsxs9(ToolbarButton, { icon: "bxs-share-alt", tooltip: "Arrow type", children: [
      /* @__PURE__ */ jsx9("p", { className: "text-xs text-text-secondary uppercase tracking-wider mb-2", children: t("sidebar.sectionHeader.type") }),
      /* @__PURE__ */ jsxs9("div", { className: "flex flex-col gap-0.5", children: [
        [
          { v: "straight", i: "bxs-right-arrow-alt", l: "Straight" },
          { v: "curved", i: "bxs-analyse", l: "Curved" },
          { v: "elbow", i: "bxs-network-chart", l: "Elbow" }
        ].map((a) => /* @__PURE__ */ jsxs9(
          "button",
          {
            onClick: () => updateType(a.v),
            className: `flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-100 ${arrowType === a.v ? "bg-[#5B57D1] text-white" : "text-text-secondary hover:bg-white/[0.06]"}`,
            children: [
              /* @__PURE__ */ jsx9("i", { className: `bx ${a.i} text-sm` }),
              " ",
              a.l
            ]
          },
          a.v
        )),
        arrowType === "curved" && /* @__PURE__ */ jsxs9(Fragment3, { children: [
          /* @__PURE__ */ jsx9("div", { className: "w-full h-px bg-white/[0.08] my-1" }),
          /* @__PURE__ */ jsx9("p", { className: "text-[9px] text-text-dim uppercase tracking-wider mb-1", children: "Curvature" }),
          /* @__PURE__ */ jsx9("div", { className: "flex items-center gap-1", children: [{ v: 8, l: "Lo" }, { v: 20, l: "Md" }, { v: 40, l: "Hi" }].map((c) => /* @__PURE__ */ jsx9(
            "button",
            {
              onClick: () => updateCurvature(c.v),
              className: `flex-1 py-1 rounded-md text-xs text-center transition-all duration-100 ${curvature === c.v ? "bg-[#5B57D1]/20 text-[#5B57D1]" : "text-text-secondary hover:bg-white/[0.06]"}`,
              children: c.l
            },
            c.v
          )) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx9(Divider, {}),
    /* @__PURE__ */ jsx9(LayerControls, {})
  ] });
}

// src/react/components/sidebars/PaintbrushSidebar.jsx
import { useState as useState8, useCallback as useCallback6 } from "react";
import { jsx as jsx10, jsxs as jsxs10 } from "react/jsx-runtime";
var STROKE_COLORS5 = ["#1a1a20", "#ffffff", "#FF8383", "#3A994C", "#56A2E8", "#FFD700", "#FF69B4", "#A855F7"];
var TAPER_MAP = { uniform: 0, pen: 0.5, brush: 0.8 };
function ColorGrid5({ colors, selected, onSelect }) {
  return /* @__PURE__ */ jsx10("div", { className: "grid grid-cols-4 gap-1.5", children: colors.map((c) => /* @__PURE__ */ jsx10(
    "button",
    {
      onClick: () => onSelect(c),
      className: `w-7 h-7 rounded-md border-[1.5px] transition-all duration-100 ${selected === c ? "border-[#5B57D1] scale-110" : "border-white/[0.08] hover:border-white/20"}`,
      style: { backgroundColor: c }
    },
    c
  )) });
}
function PaintbrushSidebar() {
  const { t } = useTranslation();
  const activeTool = useSketchStore_default((s) => s.activeTool);
  const selectedShapeSidebar = useSketchStore_default((s) => s.selectedShapeSidebar);
  const [strokeColor, setStrokeColor] = useState8("#fff");
  const [thickness, setThickness] = useState8(2);
  const [lineStyle, setLineStyle] = useState8("solid");
  const [taper, setTaper] = useState8("uniform");
  const [roughness, setRoughness] = useState8("smooth");
  const [opacity, setOpacity] = useState8(1);
  const updateStroke = useCallback6((v) => {
    setStrokeColor(v);
    if (window.updateSelectedFreehandStyle) window.updateSelectedFreehandStyle({ stroke: v });
  }, []);
  const updateThickness = useCallback6((v) => {
    setThickness(v);
    if (window.updateSelectedFreehandStyle) window.updateSelectedFreehandStyle({ strokeWidth: v });
  }, []);
  const updateTaper = useCallback6((v) => {
    setTaper(v);
    if (window.updateSelectedFreehandStyle) window.updateSelectedFreehandStyle({ thinning: TAPER_MAP[v] });
  }, []);
  const updateRoughness = useCallback6((v) => {
    setRoughness(v);
    if (window.updateSelectedFreehandStyle) window.updateSelectedFreehandStyle({ roughness: v });
  }, []);
  const updateOpacity = useCallback6((v) => {
    setOpacity(v);
    if (window.updateSelectedFreehandStyle) window.updateSelectedFreehandStyle({ opacity: v });
  }, []);
  return /* @__PURE__ */ jsxs10(ShapeSidebar, { visible: activeTool === TOOLS.FREEHAND || selectedShapeSidebar === "paintbrush", children: [
    /* @__PURE__ */ jsxs10(
      ToolbarButton,
      {
        tooltip: t("sidebar.strokeColor"),
        preview: /* @__PURE__ */ jsx10("span", { className: "w-4 h-4 rounded-md border border-white/20", style: { backgroundColor: strokeColor } }),
        children: [
          /* @__PURE__ */ jsx10("p", { className: "text-xs text-text-muted uppercase tracking-wider mb-2", children: t("sidebar.sectionHeader.stroke") }),
          /* @__PURE__ */ jsx10(ColorGrid5, { colors: STROKE_COLORS5, selected: strokeColor, onSelect: updateStroke })
        ]
      }
    ),
    /* @__PURE__ */ jsx10(Divider, {}),
    /* @__PURE__ */ jsxs10(ToolbarButton, { icon: "bxs-edit-alt", tooltip: t("sidebar.strokeWidth"), children: [
      /* @__PURE__ */ jsx10("p", { className: "text-xs text-text-muted uppercase tracking-wider mb-2", children: t("sidebar.sectionHeader.width") }),
      /* @__PURE__ */ jsx10("div", { className: "flex items-center gap-1", children: [1, 2, 4, 7].map((w) => /* @__PURE__ */ jsx10(
        "button",
        {
          onClick: () => updateThickness(w),
          className: `w-9 h-8 flex items-center justify-center rounded-lg transition-all duration-100 ${thickness === w ? "bg-[#5B57D1]/20 text-[#5B57D1]" : "text-text-muted hover:bg-white/[0.06]"}`,
          children: /* @__PURE__ */ jsx10("div", { className: "w-5 rounded-full bg-current", style: { height: Math.max(1, w) } })
        },
        w
      )) })
    ] }),
    /* @__PURE__ */ jsx10(Divider, {}),
    /* @__PURE__ */ jsxs10(ToolbarButton, { icon: "bxs-pen", tooltip: "Taper", children: [
      /* @__PURE__ */ jsx10("p", { className: "text-xs text-text-muted uppercase tracking-wider mb-2", children: t("sidebar.sectionHeader.taper") }),
      /* @__PURE__ */ jsx10("div", { className: "flex flex-col gap-0.5", children: [
        { v: "uniform", i: "bxs-minus-circle", l: "Uniform" },
        { v: "pen", i: "bxs-pen", l: "Pen" },
        { v: "brush", i: "bxs-brush", l: "Brush" }
      ].map((t2) => /* @__PURE__ */ jsxs10(
        "button",
        {
          onClick: () => updateTaper(t2.v),
          className: `flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-100 ${taper === t2.v ? "bg-[#5B57D1] text-white" : "text-text-secondary hover:bg-white/[0.06]"}`,
          children: [
            /* @__PURE__ */ jsx10("i", { className: `bx ${t2.i} text-sm` }),
            " ",
            t2.l
          ]
        },
        t2.v
      )) })
    ] }),
    /* @__PURE__ */ jsx10(Divider, {}),
    /* @__PURE__ */ jsxs10(ToolbarButton, { icon: "bxs-shape-polygon", tooltip: "Roughness", children: [
      /* @__PURE__ */ jsx10("p", { className: "text-xs text-text-muted uppercase tracking-wider mb-2", children: t("sidebar.sectionHeader.roughness") }),
      /* @__PURE__ */ jsx10("div", { className: "flex flex-col gap-0.5", children: [
        { v: "smooth", i: "bxs-droplet", l: "Smooth" },
        { v: "medium", i: "bxs-leaf", l: "Medium" },
        { v: "rough", i: "bxs-bolt", l: "Rough" }
      ].map((r) => /* @__PURE__ */ jsxs10(
        "button",
        {
          onClick: () => updateRoughness(r.v),
          className: `flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-100 ${roughness === r.v ? "bg-[#5B57D1] text-white" : "text-text-secondary hover:bg-white/[0.06]"}`,
          children: [
            /* @__PURE__ */ jsx10("i", { className: `bx ${r.i} text-sm` }),
            " ",
            r.l
          ]
        },
        r.v
      )) })
    ] }),
    /* @__PURE__ */ jsx10(Divider, {}),
    /* @__PURE__ */ jsxs10(ToolbarButton, { icon: "bxs-sun", tooltip: t("sidebar.opacity"), children: [
      /* @__PURE__ */ jsxs10("p", { className: "text-xs text-text-muted uppercase tracking-wider mb-2", children: [
        "Opacity ",
        Math.round(opacity * 100),
        "%"
      ] }),
      /* @__PURE__ */ jsx10(
        "input",
        {
          type: "range",
          min: "0",
          max: "1",
          step: "0.05",
          value: opacity,
          onChange: (e) => updateOpacity(parseFloat(e.target.value)),
          className: "w-28 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#5B57D1]"
        }
      )
    ] }),
    /* @__PURE__ */ jsx10(Divider, {}),
    /* @__PURE__ */ jsx10(LayerControls, {})
  ] });
}

// src/react/components/sidebars/TextSidebar.jsx
import { useState as useState9, useCallback as useCallback7, useEffect as useEffect4 } from "react";
import { Fragment as Fragment4, jsx as jsx11, jsxs as jsxs11 } from "react/jsx-runtime";
var TEXT_COLORS = ["#1a1a20", "#ffffff", "#FF8383", "#3A994C", "#56A2E8", "#FFD700", "#FF69B4", "#A855F7"];
var FONTS = [
  { value: "lixFont", label: "Lix" },
  { value: "lixCode", label: "Code" },
  { value: "lixDefault", label: "Default" },
  { value: "lixFancy", label: "Fancy" }
];
var SIZE_MAP = { S: "20px", M: "30px", L: "48px", XL: "72px" };
var LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "java",
  "c",
  "cpp",
  "csharp",
  "go",
  "rust",
  "ruby",
  "php",
  "swift",
  "kotlin",
  "html",
  "css",
  "sql",
  "bash",
  "json",
  "yaml",
  "markdown"
];
function TextSidebar() {
  const { t } = useTranslation();
  const activeTool = useSketchStore_default((s) => s.activeTool);
  const selectedShapeSidebar = useSketchStore_default((s) => s.selectedShapeSidebar);
  const [textColor, setTextColor] = useState9("#fff");
  const [fontSize, setFontSize] = useState9("M");
  const [font, setFont] = useState9("lixFont");
  const [codeMode, setCodeMode] = useState9(false);
  const [language, setLanguage] = useState9("javascript");
  useEffect4(() => {
    window.__onCodeModeChanged = (isCode) => {
      setCodeMode(isCode);
      window.isTextInCodeMode = isCode;
    };
    return () => {
      window.__onCodeModeChanged = null;
    };
  }, []);
  const updateColor = useCallback7((c) => {
    setTextColor(c);
    if (window.updateSelectedTextStyle) window.updateSelectedTextStyle({ color: c });
  }, []);
  const updateFont = useCallback7((f) => {
    setFont(f);
    if (window.updateSelectedTextStyle) window.updateSelectedTextStyle({ font: f });
  }, []);
  const updateSize = useCallback7((s) => {
    setFontSize(s);
    if (window.updateSelectedTextStyle) window.updateSelectedTextStyle({ fontSize: SIZE_MAP[s] });
  }, []);
  const toggleCodeMode = useCallback7(() => {
    const next = !codeMode;
    setCodeMode(next);
    window.isTextInCodeMode = next;
    if (next) {
      if (window.__convertTextToCode) window.__convertTextToCode();
    } else {
      if (window.__convertCodeToText) window.__convertCodeToText();
    }
  }, [codeMode]);
  const updateLanguage = useCallback7((lang) => {
    setLanguage(lang);
    if (window.__setCodeLanguage) window.__setCodeLanguage(lang);
  }, []);
  const visible = activeTool === TOOLS.TEXT || activeTool === TOOLS.CODE || selectedShapeSidebar === "text";
  return /* @__PURE__ */ jsxs11(Fragment4, { children: [
    /* @__PURE__ */ jsxs11(ShapeSidebar, { visible, children: [
      /* @__PURE__ */ jsxs11(
        ToolbarButton,
        {
          tooltip: t("sidebar.textColor"),
          preview: /* @__PURE__ */ jsx11("span", { className: "w-4 h-4 rounded-md border border-white/20", style: { backgroundColor: textColor } }),
          children: [
            /* @__PURE__ */ jsx11("p", { className: "text-xs text-text-muted uppercase tracking-wider mb-2", children: t("sidebar.color") }),
            /* @__PURE__ */ jsx11("div", { className: "grid grid-cols-4 gap-1.5", children: TEXT_COLORS.map((c) => /* @__PURE__ */ jsx11(
              "button",
              {
                onClick: () => updateColor(c),
                className: `w-7 h-7 rounded-md border-[1.5px] transition-all duration-100 ${textColor === c ? "border-[#5B57D1] scale-110" : "border-white/[0.08] hover:border-white/20"}`,
                style: { backgroundColor: c }
              },
              c
            )) })
          ]
        }
      ),
      !codeMode && /* @__PURE__ */ jsxs11(Fragment4, { children: [
        /* @__PURE__ */ jsx11(Divider, {}),
        /* @__PURE__ */ jsxs11(ToolbarButton, { icon: "bxs-font-family", tooltip: t("sidebar.font"), children: [
          /* @__PURE__ */ jsx11("p", { className: "text-xs text-text-muted uppercase tracking-wider mb-2", children: t("sidebar.font") }),
          /* @__PURE__ */ jsx11("div", { className: "flex flex-col gap-0.5", children: FONTS.map((f) => /* @__PURE__ */ jsx11(
            "button",
            {
              onClick: () => updateFont(f.value),
              className: `flex items-center px-2.5 py-1.5 rounded-lg text-xs transition-all duration-100 ${font === f.value ? "bg-[#5B57D1] text-white" : "text-text-secondary hover:bg-white/[0.06]"}`,
              style: { fontFamily: f.value },
              children: f.label
            },
            f.value
          )) })
        ] })
      ] }),
      /* @__PURE__ */ jsx11(Divider, {}),
      /* @__PURE__ */ jsxs11(ToolbarButton, { icon: "bxs-chevrons-up", tooltip: t("sidebar.size"), children: [
        /* @__PURE__ */ jsx11("p", { className: "text-xs text-text-muted uppercase tracking-wider mb-2", children: t("sidebar.size") }),
        /* @__PURE__ */ jsx11("div", { className: "flex items-center gap-1", children: ["S", "M", "L", "XL"].map((s) => /* @__PURE__ */ jsx11(
          "button",
          {
            onClick: () => updateSize(s),
            className: `w-8 h-8 flex items-center justify-center rounded-lg text-xs transition-all duration-100 ${fontSize === s ? "bg-[#5B57D1]/20 text-[#5B57D1]" : "text-text-muted hover:bg-white/[0.06]"}`,
            children: s
          },
          s
        )) })
      ] }),
      /* @__PURE__ */ jsx11(Divider, {}),
      /* @__PURE__ */ jsxs11(ToolbarButton, { icon: "bxs-terminal", tooltip: t("sidebar.codeMode"), children: [
        /* @__PURE__ */ jsx11("p", { className: "text-xs text-text-muted uppercase tracking-wider mb-2", children: t("sidebar.code") }),
        /* @__PURE__ */ jsxs11("div", { className: "flex flex-col gap-2", children: [
          /* @__PURE__ */ jsxs11(
            "button",
            {
              onClick: toggleCodeMode,
              className: `flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-100 ${codeMode ? "bg-[#5B57D1] text-white" : "text-text-secondary hover:bg-white/[0.06]"}`,
              children: [
                /* @__PURE__ */ jsx11("div", { className: `w-6 h-3 rounded-full transition-all duration-150 relative ${codeMode ? "bg-white/30" : "bg-white/10"}`, children: /* @__PURE__ */ jsx11("div", { className: `absolute top-0.5 w-2 h-2 rounded-full bg-white transition-all duration-150 ${codeMode ? "left-3.5" : "left-0.5"}` }) }),
                codeMode ? t("sidebar.on") : t("sidebar.off")
              ]
            }
          ),
          codeMode && /* @__PURE__ */ jsx11("div", { className: "flex flex-wrap gap-1 max-w-[180px]", children: LANGUAGES.map((lang) => /* @__PURE__ */ jsx11(
            "button",
            {
              onClick: () => updateLanguage(lang),
              className: `px-1.5 py-0.5 rounded text-[9px] transition-all duration-100 ${language === lang ? "bg-[#5B57D1]/20 text-[#5B57D1]" : "text-text-dim hover:bg-white/[0.06] hover:text-text-secondary"}`,
              children: lang
            },
            lang
          )) })
        ] })
      ] }),
      /* @__PURE__ */ jsx11(Divider, {}),
      /* @__PURE__ */ jsx11(LayerControls, {})
    ] }),
    /* @__PURE__ */ jsx11(
      "div",
      {
        className: `absolute bottom-7 left-1/2 -translate-x-1/2 z-[998] font-[lixFont] transition-all duration-200 ${visible ? "opacity-100 translate-y-0" : "opacity-0 pointer-events-none translate-y-2"}`,
        children: /* @__PURE__ */ jsxs11("p", { className: "text-[10px] text-white/30 leading-relaxed text-center whitespace-nowrap", children: [
          /* @__PURE__ */ jsx11("span", { className: "text-white/50", children: "Ctrl+Enter" }),
          " / ",
          /* @__PURE__ */ jsx11("span", { className: "text-white/50", children: "Enter" }),
          " \u2014 ",
          t("sidebar.renderText"),
          " \xA0\xA0",
          /* @__PURE__ */ jsx11("span", { className: "text-white/50", children: "Shift+Enter" }),
          " \u2014 ",
          t("sidebar.newLine")
        ] })
      }
    )
  ] });
}

// src/react/components/sidebars/FrameSidebar.jsx
import { useState as useState10, useCallback as useCallback8, useEffect as useEffect5 } from "react";
import { Fragment as Fragment5, jsx as jsx12, jsxs as jsxs12 } from "react/jsx-runtime";
var FILL_STYLES = [
  { id: "transparent", label: "None", icon: "bx-x" },
  { id: "solid", label: "Solid", icon: "bxs-square" },
  { id: "grid", label: "Grid", icon: "bx-grid-alt" }
];
var FILL_COLORS = [
  "#1e1e28",
  "#13171C",
  "#1a1a2e",
  "#0d1117",
  "#2d2d3a",
  "#ffffff"
];
function FrameSidebar() {
  const { t } = useTranslation();
  const activeTool = useSketchStore_default((s) => s.activeTool);
  const selectedShapeSidebar = useSketchStore_default((s) => s.selectedShapeSidebar);
  const toggleAIModal = useUIStore_default((s) => s.toggleAIModal);
  const [frameName, setFrameName] = useState10("Frame 1");
  const [isGraph, setIsGraph] = useState10(false);
  const [fillStyle, setFillStyle] = useState10("transparent");
  const [fillColor, setFillColor] = useState10("#1e1e28");
  useEffect5(() => {
    if (selectedShapeSidebar === "frame" || activeTool === TOOLS.FRAME) {
      const shape = typeof window !== "undefined" ? window.currentShape : null;
      if (shape && shape.shapeName === "frame") {
        if (shape.frameName) setFrameName(shape.frameName);
        setIsGraph(shape._frameType === "graph");
        setFillStyle(shape.fillStyle || "transparent");
        setFillColor(shape.fillColor || "#1e1e28");
      } else {
        setIsGraph(false);
        setFillStyle("transparent");
        setFillColor("#1e1e28");
      }
    }
  }, [selectedShapeSidebar, activeTool]);
  const updateName = useCallback8((e) => {
    const name = e.target.value;
    setFrameName(name);
    const shape = window.currentShape;
    if (shape && shape.shapeName === "frame") {
      shape.frameName = name;
      shape.draw();
    }
  }, []);
  const updateFillStyle = useCallback8((style) => {
    setFillStyle(style);
    const shape = window.currentShape;
    if (shape && shape.shapeName === "frame") {
      shape.fillStyle = style;
      shape.draw();
    }
  }, []);
  const updateFillColor = useCallback8((color) => {
    setFillColor(color);
    const shape = window.currentShape;
    if (shape && shape.shapeName === "frame") {
      shape.fillColor = color;
      shape.draw();
    }
  }, []);
  const resizeToFit = useCallback8(() => {
    const shape = window.currentShape;
    if (shape && shape.shapeName === "frame" && typeof shape.resizeToFitContents === "function") {
      shape.resizeToFitContents();
    }
  }, []);
  const handleAIEdit = useCallback8(() => {
    const shape = window.currentShape;
    if (shape && shape.shapeName === "frame") {
      window.__aiEditTargetFrame = shape;
      toggleAIModal();
    }
  }, [toggleAIModal]);
  return /* @__PURE__ */ jsxs12(ShapeSidebar, { visible: activeTool === TOOLS.FRAME || selectedShapeSidebar === "frame", children: [
    /* @__PURE__ */ jsxs12(ToolbarButton, { icon: "bxs-rename", tooltip: "Frame name", children: [
      /* @__PURE__ */ jsx12("p", { className: "text-xs text-text-muted uppercase tracking-wider mb-2", children: t("sidebar.sectionHeader.name") }),
      /* @__PURE__ */ jsx12(
        "input",
        {
          type: "text",
          value: frameName,
          onChange: updateName,
          className: "w-32 px-2.5 py-1.5 bg-white/[0.05] border border-white/[0.1] rounded-lg text-white text-xs outline-none focus:border-[#5B57D1]/50 transition-all duration-150 font-[lixFont]",
          spellCheck: false
        }
      )
    ] }),
    /* @__PURE__ */ jsx12(Divider, {}),
    /* @__PURE__ */ jsxs12(ToolbarButton, { icon: "bxs-palette", tooltip: "Fill style", children: [
      /* @__PURE__ */ jsx12("p", { className: "text-xs text-text-muted uppercase tracking-wider mb-2", children: t("sidebar.sectionHeader.background") }),
      /* @__PURE__ */ jsx12("div", { className: "flex gap-1 mb-2.5", children: FILL_STYLES.map((s) => /* @__PURE__ */ jsxs12(
        "button",
        {
          onClick: () => updateFillStyle(s.id),
          title: s.label,
          className: `flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-100 ${fillStyle === s.id ? "bg-white/[0.12] text-white" : "text-text-muted hover:text-white hover:bg-white/[0.06]"}`,
          children: [
            /* @__PURE__ */ jsx12("i", { className: `bx ${s.icon} text-sm` }),
            s.label
          ]
        },
        s.id
      )) }),
      fillStyle !== "transparent" && /* @__PURE__ */ jsxs12(Fragment5, { children: [
        /* @__PURE__ */ jsx12("p", { className: "text-xs text-text-muted uppercase tracking-wider mb-1.5", children: t("sidebar.sectionHeader.color") }),
        /* @__PURE__ */ jsxs12("div", { className: "flex items-center gap-1.5", children: [
          FILL_COLORS.map((c) => /* @__PURE__ */ jsx12(
            "button",
            {
              onClick: () => updateFillColor(c),
              title: c,
              className: `w-6 h-6 rounded-md border-2 transition-all duration-100 ${fillColor === c ? "border-accent-blue scale-110" : "border-white/10 hover:border-white/30"}`,
              style: { backgroundColor: c }
            },
            c
          )),
          /* @__PURE__ */ jsxs12("label", { className: "w-6 h-6 rounded-md border-2 border-white/10 hover:border-white/30 cursor-pointer overflow-hidden relative transition-all duration-100", title: "Custom color", children: [
            /* @__PURE__ */ jsx12(
              "input",
              {
                type: "color",
                value: fillColor,
                onChange: (e) => updateFillColor(e.target.value),
                className: "absolute inset-0 opacity-0 cursor-pointer"
              }
            ),
            /* @__PURE__ */ jsx12("i", { className: "bx bx-palette text-xs text-text-muted absolute inset-0 flex items-center justify-center" })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx12(Divider, {}),
    /* @__PURE__ */ jsxs12(ToolbarButton, { icon: "bx-image-alt", tooltip: "Background image", children: [
      /* @__PURE__ */ jsx12("p", { className: "text-xs text-text-muted uppercase tracking-wider mb-2", children: t("sidebar.sectionHeader.backgroundImage") }),
      /* @__PURE__ */ jsxs12("div", { className: "flex gap-1.5 mb-2", children: [
        /* @__PURE__ */ jsxs12(
          "button",
          {
            onClick: () => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = IMAGE_ACCEPT_ATTR;
              input.onchange = async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (!isAllowedImage(file)) {
                  console.warn("[FrameSidebar] Rejected file type:", file.type);
                  return;
                }
                const reader = new FileReader();
                reader.onload = async (ev) => {
                  const shape = window.currentShape;
                  if (!shape?.shapeName === "frame" || !shape.setImageFromURL) return;
                  try {
                    const compressed = await compressImage(ev.target.result, { maxWidth: 1280, quality: 0.5 });
                    shape.setImageFromURL(compressed.dataUrl, shape._frameImageFit || "cover");
                  } catch {
                    shape.setImageFromURL(ev.target.result, shape._frameImageFit || "cover");
                  }
                };
                reader.readAsDataURL(file);
              };
              input.click();
            },
            className: "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-text-secondary text-xs hover:bg-white/[0.06] hover:text-white transition-all duration-100",
            children: [
              /* @__PURE__ */ jsx12("i", { className: "bx bx-upload text-sm" }),
              "Set Image"
            ]
          }
        ),
        /* @__PURE__ */ jsxs12(
          "button",
          {
            onClick: () => {
              const shape = window.currentShape;
              if (shape?.shapeName === "frame" && shape.setImageFromURL) {
                shape.setImageFromURL(null);
                shape.draw();
              }
            },
            className: "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-text-secondary text-xs hover:bg-white/[0.06] hover:text-red-400 transition-all duration-100",
            children: [
              /* @__PURE__ */ jsx12("i", { className: "bx bx-x text-sm" }),
              "Remove"
            ]
          }
        )
      ] }),
      (() => {
        const shape = typeof window !== "undefined" ? window.currentShape : null;
        if (!shape?.shapeName === "frame" || !shape?._frameImageURL) return null;
        return /* @__PURE__ */ jsxs12(Fragment5, { children: [
          /* @__PURE__ */ jsx12("p", { className: "text-xs text-text-muted uppercase tracking-wider mb-1.5", children: t("sidebar.sectionHeader.fit") }),
          /* @__PURE__ */ jsx12("div", { className: "flex gap-1", children: [
            { id: "cover", label: "Cover" },
            { id: "contain", label: "Contain" },
            { id: "fill", label: "Stretch" }
          ].map((f) => /* @__PURE__ */ jsx12(
            "button",
            {
              onClick: () => {
                const s = window.currentShape;
                if (s?.shapeName === "frame" && s.setImageFromURL && s._frameImageURL) {
                  s.setImageFromURL(s._frameImageURL, f.id);
                }
              },
              className: `px-2 py-1 rounded-md text-[10px] transition-all ${shape._frameImageFit === f.id ? "bg-white/[0.12] text-white" : "text-text-muted hover:text-white hover:bg-white/[0.06]"}`,
              children: f.label
            },
            f.id
          )) })
        ] });
      })()
    ] }),
    /* @__PURE__ */ jsx12(Divider, {}),
    /* @__PURE__ */ jsx12(ToolbarButton, { icon: "bxs-expand", tooltip: "Actions", children: /* @__PURE__ */ jsxs12("button", { onClick: resizeToFit, className: "flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-text-secondary text-xs hover:bg-white/[0.06] hover:text-white transition-all duration-100", children: [
      /* @__PURE__ */ jsx12("i", { className: "bx bxs-expand text-sm" }),
      "Resize to Fit"
    ] }) }),
    /* @__PURE__ */ jsx12(Divider, {}),
    /* @__PURE__ */ jsx12(LayerControls, {})
  ] });
}

// src/react/components/sidebars/IconSidebar.jsx
import { useState as useState11, useEffect as useEffect6, useCallback as useCallback9, useRef as useRef4 } from "react";
import { jsx as jsx13, jsxs as jsxs13 } from "react/jsx-runtime";
var DEFAULT_ICONS_ORIGIN = "https://sketch.elixpo.com";
function getIconsBaseUrl() {
  if (typeof window === "undefined") return "";
  if (window.__lixsketchIconsOrigin) return window.__lixsketchIconsOrigin;
  if (typeof location !== "undefined" && /sketch\.elixpo/.test(location.host)) return "";
  return DEFAULT_ICONS_ORIGIN;
}
var iconResultCache = /* @__PURE__ */ new Map();
var CATEGORIES = [
  { value: null, label: "All", icon: "bxs-grid-alt" },
  { value: "tech", label: "Tech", icon: "bxs-chip" },
  { value: "devops", label: "DevOps", icon: "bxs-server" },
  { value: "design", label: "Design", icon: "bxs-palette" },
  { value: "social media", label: "Social", icon: "bxs-share-alt" },
  { value: "navigation", label: "Nav", icon: "bxs-navigation" },
  { value: "business", label: "Business", icon: "bxs-briefcase" },
  { value: "media", label: "Media", icon: "bxs-videos" }
];
function normalizeSvg(raw) {
  if (!raw) return raw;
  const tmp = document.createElement("div");
  tmp.innerHTML = raw;
  const svgEl = tmp.querySelector("svg");
  if (!svgEl) return raw;
  if (!svgEl.getAttribute("viewBox")) {
    const w = parseFloat(svgEl.getAttribute("width")) || 24;
    const h = parseFloat(svgEl.getAttribute("height")) || 24;
    svgEl.setAttribute("viewBox", `0 0 ${w} ${h}`);
  }
  svgEl.setAttribute("width", "100%");
  svgEl.setAttribute("height", "100%");
  return tmp.innerHTML;
}
function IconCell({ icon, onClick }) {
  const name = icon.filename?.replace(".svg", "").replace(/_/g, " ") || "";
  const normalizedSvg = typeof document !== "undefined" && icon.svg ? normalizeSvg(icon.svg) : icon.svg;
  return /* @__PURE__ */ jsx13(
    "button",
    {
      onClick,
      title: name,
      style: { width: "44px", height: "44px", overflow: "hidden", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", cursor: "pointer", background: "transparent", border: "none", padding: 0 },
      className: "hover:bg-surface-hover transition-colors duration-100",
      children: normalizedSvg ? /* @__PURE__ */ jsx13(
        "div",
        {
          style: { width: "24px", height: "24px", overflow: "visible", flexShrink: 0, pointerEvents: "none", filter: "brightness(0) invert(1)" },
          dangerouslySetInnerHTML: { __html: normalizedSvg }
        }
      ) : /* @__PURE__ */ jsx13(
        "img",
        {
          src: `/icons/${encodeURIComponent(icon.filename)}`,
          alt: "",
          style: { width: "24px", height: "24px", pointerEvents: "none", filter: "invert(1)" },
          loading: "lazy"
        }
      )
    }
  );
}
function IconSidebar() {
  const { t } = useTranslation();
  const activeTool = useSketchStore_default((s) => s.activeTool);
  const setActiveTool = useSketchStore_default((s) => s.setActiveTool);
  const visible = activeTool === TOOLS.ICON;
  const [query, setQuery] = useState11("");
  const [category, setCategory] = useState11(null);
  const [icons, setIcons] = useState11([]);
  const [loading, setLoading] = useState11(false);
  const debounceRef = useRef4(null);
  useEffect6(() => {
    if (!visible) return;
    const handler = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setActiveTool(TOOLS.SELECT);
      }
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [visible, setActiveTool]);
  useEffect6(() => {
    if (!visible) return;
    const svgEl = document.getElementById("freehand-canvas");
    if (!svgEl) return;
    const handleCanvasClick = () => setActiveTool(TOOLS.SELECT);
    svgEl.addEventListener("mousedown", handleCanvasClick);
    return () => svgEl.removeEventListener("mousedown", handleCanvasClick);
  }, [visible, setActiveTool]);
  const fetchIcons = useCallback9(async (searchQuery, cat) => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("q", searchQuery);
    if (cat) params.set("category", cat);
    params.set("inline", "1");
    const cacheKey = params.toString();
    if (iconResultCache.has(cacheKey)) {
      setIcons(iconResultCache.get(cacheKey));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${getIconsBaseUrl()}/api/icons/search?${cacheKey}`);
      if (res.ok) {
        const data = await res.json();
        const results = data.results || [];
        iconResultCache.set(cacheKey, results);
        setIcons(results);
      }
    } catch (err) {
      console.error("Icon fetch failed:", err);
    }
    setLoading(false);
  }, []);
  useEffect6(() => {
    if (!visible) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchIcons(query, category);
    }, query ? 300 : 0);
    return () => clearTimeout(debounceRef.current);
  }, [query, visible, category, fetchIcons]);
  const hasPreloaded = useRef4(false);
  useEffect6(() => {
    if (!visible || hasPreloaded.current) return;
    hasPreloaded.current = true;
    CATEGORIES.forEach((cat) => {
      const params = new URLSearchParams();
      if (cat.value) params.set("category", cat.value);
      params.set("inline", "1");
      const key = params.toString();
      if (!iconResultCache.has(key)) {
        fetch(`${getIconsBaseUrl()}/api/icons/search?${key}`).then((r) => r.ok ? r.json() : null).then((data) => {
          if (data?.results) iconResultCache.set(key, data.results);
        }).catch(() => {
        });
      }
    });
  }, [visible]);
  const handleIconClick = useCallback9((icon) => {
    if (typeof window === "undefined") return;
    const place = (svgContent) => {
      if (window.prepareIconPlacement) {
        window.prepareIconPlacement(svgContent);
      } else {
        window.iconToPlace = svgContent;
      }
    };
    if (icon.svg) {
      place(icon.svg);
    } else {
      fetch(`${getIconsBaseUrl()}/api/icons/serve?name=${encodeURIComponent(icon.filename)}`).then((r) => r.text()).then(place).catch(() => {
      });
    }
  }, []);
  return /* @__PURE__ */ jsxs13(
    "div",
    {
      className: `absolute top-[60px] right-2 bottom-[56px] w-[300px] bg-surface border border-border-light rounded-2xl z-[999] font-[lixFont] flex flex-col transition-transform duration-200 ${visible ? "translate-x-0" : "translate-x-full"}`,
      children: [
        /* @__PURE__ */ jsxs13("div", { className: "px-3.5 pt-3.5 pb-2 shrink-0", children: [
          /* @__PURE__ */ jsxs13("div", { className: "flex items-center justify-between mb-2.5", children: [
            /* @__PURE__ */ jsx13("h3", { className: "text-text-primary text-sm font-medium", children: "Icons" }),
            /* @__PURE__ */ jsx13(
              "button",
              {
                onClick: () => setActiveTool(TOOLS.SELECT),
                className: "w-6 h-6 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors duration-100",
                title: "Close (Esc)",
                children: /* @__PURE__ */ jsx13("i", { className: "bx bx-x text-lg" })
              }
            )
          ] }),
          /* @__PURE__ */ jsxs13("div", { className: "flex items-center gap-2 bg-surface-hover border border-border-light rounded-lg px-2.5 py-2", children: [
            /* @__PURE__ */ jsx13("i", { className: "bx bxs-search text-text-muted text-sm" }),
            /* @__PURE__ */ jsx13(
              "input",
              {
                id: "iconSearchInput",
                type: "text",
                value: query,
                onChange: (e) => setQuery(e.target.value),
                placeholder: "Search icons...",
                className: "flex-1 bg-transparent text-text-primary text-sm outline-none placeholder:text-text-dim",
                spellCheck: false
              }
            ),
            query && /* @__PURE__ */ jsx13("button", { onClick: () => setQuery(""), className: "text-text-dim hover:text-text-secondary", children: /* @__PURE__ */ jsx13("i", { className: "bx bxs-x-circle text-sm" }) })
          ] })
        ] }),
        /* @__PURE__ */ jsx13("div", { className: "flex flex-wrap gap-1 px-3.5 pb-2.5 shrink-0", children: CATEGORIES.map((cat) => /* @__PURE__ */ jsxs13(
          "button",
          {
            onClick: () => setCategory(cat.value),
            className: `flex items-center gap-1 px-2 py-1 rounded-md text-xs whitespace-nowrap transition-colors duration-100 ${category === cat.value ? "bg-accent-blue/20 text-accent-blue-hover" : "text-text-muted hover:bg-surface-hover hover:text-text-primary"}`,
            children: [
              /* @__PURE__ */ jsx13("i", { className: `bx ${cat.icon} text-xs` }),
              cat.label
            ]
          },
          cat.value || "all"
        )) }),
        /* @__PURE__ */ jsx13("div", { className: "h-px bg-surface-hover mx-3.5 shrink-0" }),
        /* @__PURE__ */ jsx13("div", { className: "flex-1 overflow-y-auto no-scrollbar px-3 py-2.5", id: "iconsContainer", children: loading ? /* @__PURE__ */ jsxs13("div", { className: "flex items-center justify-center py-12 text-text-muted text-sm", children: [
          /* @__PURE__ */ jsx13("i", { className: "bx bxs-hourglass bx-spin text-lg mr-2" }),
          "Loading..."
        ] }) : icons.length === 0 ? /* @__PURE__ */ jsx13("div", { className: "flex items-center justify-center py-12 text-text-muted text-sm", children: "No icons found" }) : /* @__PURE__ */ jsx13("div", { style: { display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: "2px" }, children: icons.map((icon, i) => /* @__PURE__ */ jsx13(
          IconCell,
          {
            icon,
            onClick: () => handleIconClick(icon)
          },
          icon.filename || i
        )) }) })
      ]
    }
  );
}

// src/react/components/sidebars/ImageSidebar.jsx
import { useCallback as useCallback10 } from "react";
import { jsx as jsx14, jsxs as jsxs14 } from "react/jsx-runtime";
function ImageSidebar() {
  const { t } = useTranslation();
  const selectedShapeSidebar = useSketchStore_default((s) => s.selectedShapeSidebar);
  const toggleImageGenerateModal = useUIStore_default((s) => s.toggleImageGenerateModal);
  const handleEditWithAI = useCallback10(() => {
    const shape = window.currentShape;
    if (!shape || shape.shapeName !== "image") return;
    const el = shape.element;
    const href = el?.getAttribute("href") || el?.getAttributeNS("http://www.w3.org/1999/xlink", "href") || "";
    const w = parseFloat(el?.getAttribute("width")) || 512;
    const h = parseFloat(el?.getAttribute("height")) || 512;
    window.__editImageRef = { imageUrl: href, width: w, height: h, shape };
    toggleImageGenerateModal();
  }, [toggleImageGenerateModal]);
  const handleReplace = useCallback10(() => {
    if (window.openImageFilePicker) {
      window.__replaceImageShape = window.currentShape;
      window.openImageFilePicker();
    }
  }, []);
  return /* @__PURE__ */ jsxs14(ShapeSidebar, { visible: selectedShapeSidebar === "image", children: [
    /* @__PURE__ */ jsxs14(
      "button",
      {
        onClick: handleEditWithAI,
        title: "Edit with AI",
        className: "h-9 flex items-center gap-1.5 px-3 rounded-lg text-text-muted hover:text-purple-400 hover:bg-purple-500/10 transition-all duration-100",
        children: [
          /* @__PURE__ */ jsx14("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "currentColor", stroke: "none", children: /* @__PURE__ */ jsx14("path", { d: "M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8L12 2z" }) }),
          /* @__PURE__ */ jsx14("span", { className: "text-xs", children: "AI Edit" })
        ]
      }
    ),
    /* @__PURE__ */ jsx14(Divider, {}),
    /* @__PURE__ */ jsxs14(
      "button",
      {
        onClick: handleReplace,
        title: "Replace image",
        className: "h-9 flex items-center gap-1.5 px-3 rounded-lg text-text-muted hover:text-white hover:bg-white/[0.06] transition-all duration-100",
        children: [
          /* @__PURE__ */ jsx14("i", { className: "bx bx-upload text-base" }),
          /* @__PURE__ */ jsx14("span", { className: "text-xs", children: "Replace" })
        ]
      }
    ),
    /* @__PURE__ */ jsx14(Divider, {}),
    /* @__PURE__ */ jsx14(LayerControls, {})
  ] });
}

// src/react/components/canvas/MultiSelectActions.jsx
import { useState as useState12, useEffect as useEffect7 } from "react";

// src/react/utils/toast.js
function showToast(message, options = {}) {
  const tone = options.tone || "info";
  const root = typeof document !== "undefined" ? document.getElementById("lixsketch-toast") : null;
  if (!root) {
    console.log(`[lixsketch:${tone}]`, message);
    return;
  }
  const el = document.createElement("div");
  el.className = `lixsketch-toast-item is-${tone}`;
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => {
    el.classList.add("is-leaving");
  }, 1800);
  setTimeout(() => {
    try {
      root.removeChild(el);
    } catch {
    }
  }, 2200);
}

// src/react/components/canvas/MultiSelectActions.jsx
import { jsx as jsx15, jsxs as jsxs15 } from "react/jsx-runtime";
function MultiSelectActions() {
  const [count, setCount] = useState12(0);
  const [groupState, setGroupState] = useState12("none");
  useEffect7(() => {
    const interval = setInterval(() => {
      const ms = window.multiSelection;
      const sel = ms?.selectedShapes;
      const n = sel ? sel.size : 0;
      setCount((prev) => prev !== n ? n : prev);
      if (n < 2) {
        setGroupState("none");
        return;
      }
      let withId = 0;
      let groupIds = /* @__PURE__ */ new Set();
      sel.forEach((s) => {
        if (s.groupId) {
          withId++;
          groupIds.add(s.groupId);
        }
      });
      if (withId === n && groupIds.size === 1) setGroupState("all");
      else if (withId > 0) setGroupState("partial");
      else setGroupState("none");
    }, 200);
    return () => clearInterval(interval);
  }, []);
  if (count < 2) return null;
  const handleFrame = () => {
    if (window.frameSelectedShapes) {
      window.frameSelectedShapes();
      setCount(0);
    }
  };
  const handleGroup = () => {
    const ms = window.multiSelection;
    const sel = ms?.selectedShapes;
    if (!sel || sel.size < 2) return;
    const newId = `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
    sel.forEach((s) => {
      s.groupId = newId;
    });
    if (typeof ms.updateControls === "function") ms.updateControls();
    showToast(`Grouped ${sel.size} shapes`, { tone: "success" });
  };
  const handleUngroup = () => {
    const ms = window.multiSelection;
    const sel = ms?.selectedShapes;
    if (!sel || sel.size === 0) return;
    const groupIds = /* @__PURE__ */ new Set();
    sel.forEach((s) => {
      if (s.groupId) groupIds.add(s.groupId);
    });
    if (groupIds.size === 0 || !Array.isArray(window.shapes)) return;
    let cleared = 0;
    for (const s of window.shapes) {
      if (s.groupId && groupIds.has(s.groupId)) {
        s.groupId = null;
        cleared++;
      }
    }
    if (typeof ms.updateControls === "function") ms.updateControls();
    showToast(`Ungrouped ${cleared} shapes`, { tone: "success" });
  };
  const grouped = groupState === "all";
  return /* @__PURE__ */ jsx15("div", { className: "absolute top-14 left-1/2 -translate-x-1/2 z-[1000] font-[lixFont]", children: /* @__PURE__ */ jsxs15("div", { className: "flex items-center gap-2 bg-surface/90 backdrop-blur-lg border border-border-light rounded-xl px-3 py-1.5 shadow-lg", children: [
    /* @__PURE__ */ jsxs15("span", { className: "text-text-muted text-xs", children: [
      count,
      " selected",
      grouped && /* @__PURE__ */ jsx15("span", { className: "ml-1 text-accent-blue", children: "\xB7 grouped" })
    ] }),
    /* @__PURE__ */ jsx15("div", { className: "w-px h-4 bg-border-light" }),
    !grouped && /* @__PURE__ */ jsxs15(
      "button",
      {
        onClick: handleFrame,
        className: "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-accent-blue hover:bg-accent-blue/10 transition-all duration-150",
        title: "Wrap selection in a frame",
        children: [
          /* @__PURE__ */ jsx15("i", { className: "bx bx-crop text-sm" }),
          "Frame it"
        ]
      }
    ),
    grouped ? /* @__PURE__ */ jsxs15(
      "button",
      {
        onClick: handleUngroup,
        className: "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-yellow-400 hover:bg-yellow-500/10 transition-all duration-150",
        title: "Ungroup (Ctrl+Shift+G)",
        children: [
          /* @__PURE__ */ jsx15("i", { className: "bx bx-unlink text-sm" }),
          "Ungroup"
        ]
      }
    ) : /* @__PURE__ */ jsxs15(
      "button",
      {
        onClick: handleGroup,
        className: "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs text-text-secondary hover:bg-surface-hover transition-all duration-150",
        title: "Group (Ctrl+G)",
        children: [
          /* @__PURE__ */ jsx15("i", { className: "bx bx-link text-sm" }),
          "Group"
        ]
      }
    )
  ] }) });
}

// src/react/components/canvas/ContextMenu.jsx
import { useState as useState13, useEffect as useEffect8, useCallback as useCallback11, useRef as useRef5 } from "react";
import { Fragment as Fragment6, jsx as jsx16, jsxs as jsxs16 } from "react/jsx-runtime";
function getCleanSVG() {
  const svgEl = window.svg;
  if (!svgEl) return null;
  const clone = svgEl.cloneNode(true);
  clone.querySelectorAll(
    "[data-selection], .selection-handle, .resize-handle, .rotation-handle, .anchor, .rotate-anchor, .resize-anchor, .rotation-anchor, .selection-outline"
  ).forEach((el) => el.remove());
  return clone;
}
function renderToCanvas(clone, scale, bgColor) {
  return new Promise((resolve) => {
    const svgData = new XMLSerializer().serializeToString(clone);
    const vb = window.svg.viewBox.baseVal;
    const canvas = document.createElement("canvas");
    canvas.width = vb.width * scale;
    canvas.height = vb.height * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    const img = new Image();
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      if (bgColor) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, vb.width, vb.height);
      }
      ctx.drawImage(img, 0, 0, vb.width, vb.height);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
function getShapeAtPoint(x, y) {
  const shapes = window.shapes;
  if (!shapes) return null;
  for (let i = shapes.length - 1; i >= 0; i--) {
    const shape = shapes[i];
    const el = shape.group || shape.element;
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      return shape;
    }
  }
  return null;
}
function MenuItem({ label, shortcut, onClick, disabled, danger }) {
  return /* @__PURE__ */ jsxs16(
    "button",
    {
      onClick,
      disabled,
      className: `w-full flex items-center justify-between px-3 py-1.5 text-xs transition-colors duration-100 ${disabled ? "text-text-dim cursor-default" : danger ? "text-red-400 hover:bg-red-500/15 cursor-pointer" : "text-text-secondary hover:bg-surface-hover cursor-pointer"}`,
      children: [
        /* @__PURE__ */ jsx16("span", { children: label }),
        shortcut && /* @__PURE__ */ jsx16("span", { className: "text-text-dim text-[10px] ml-6", children: shortcut })
      ]
    }
  );
}
function CheckMenuItem({ label, shortcut, checked, onClick }) {
  return /* @__PURE__ */ jsxs16(
    "button",
    {
      onClick,
      className: "w-full flex items-center justify-between px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-hover cursor-pointer transition-colors duration-100",
      children: [
        /* @__PURE__ */ jsxs16("span", { className: "flex items-center gap-2", children: [
          checked && /* @__PURE__ */ jsx16("i", { className: "bx bx-check text-sm text-accent-blue -ml-0.5" }),
          !checked && /* @__PURE__ */ jsx16("span", { className: "w-[14px]" }),
          label
        ] }),
        shortcut && /* @__PURE__ */ jsx16("span", { className: "text-text-dim text-[10px] ml-6", children: shortcut })
      ]
    }
  );
}
function Separator() {
  return /* @__PURE__ */ jsx16("hr", { className: "border-border-light my-1" });
}
function ContextMenu() {
  const [visible, setVisible] = useState13(false);
  const [position, setPosition] = useState13({ x: 0, y: 0 });
  const [targetShape, setTargetShape] = useState13(null);
  const menuRef = useRef5(null);
  const gridEnabled = useSketchStore_default((s) => s.gridEnabled);
  const snapToObjects = useSketchStore_default((s) => s.snapToObjects);
  const zenMode = useSketchStore_default((s) => s.zenMode);
  const viewMode = useSketchStore_default((s) => s.viewMode);
  const close = useCallback11(() => {
    setVisible(false);
    setTargetShape(null);
  }, []);
  useEffect8(() => {
    const handleContextMenu = (e) => {
      const svg = document.getElementById("freehand-canvas");
      if (!svg) return;
      if (!svg.contains(e.target) && e.target !== svg) return;
      e.preventDefault();
      const shape = getShapeAtPoint(e.clientX, e.clientY);
      const current = window.currentShape || null;
      setTargetShape(shape || current);
      setPosition({ x: e.clientX, y: e.clientY });
      setVisible(true);
    };
    const handleClick = () => close();
    const handleKeyDown = (e) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [close]);
  useEffect8(() => {
    if (!visible || !menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let { x, y } = position;
    if (x + rect.width > vw - 8) x = vw - rect.width - 8;
    if (y + rect.height > vh - 8) y = vh - rect.height - 8;
    if (x !== position.x || y !== position.y) setPosition({ x, y });
  }, [visible, position]);
  if (!visible) return null;
  const handlePaste = () => {
    if (typeof window.pasteClipboard === "function") window.pasteClipboard();
    else document.dispatchEvent(new KeyboardEvent("keydown", { key: "v", ctrlKey: true }));
    close();
  };
  const handleCopy = () => {
    if (typeof window.copySelected === "function") window.copySelected();
    else document.dispatchEvent(new KeyboardEvent("keydown", { key: "c", ctrlKey: true }));
    close();
  };
  const handleCut = () => {
    handleCopy();
    handleDeleteShape();
  };
  const handleSelectAll = () => {
    useSketchStore_default.getState().setActiveTool("select");
    if (window.multiSelection && window.shapes) {
      window.multiSelection.clearSelection();
      window.shapes.forEach((s) => window.multiSelection.addShape(s));
    }
    close();
  };
  const handleCopyPNG = async () => {
    const clone = getCleanSVG();
    if (!clone) {
      close();
      return;
    }
    const canvas = await renderToCanvas(clone, 2, "#121212");
    if (!canvas) {
      close();
      return;
    }
    canvas.toBlob((blob) => {
      if (blob) navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]).catch(() => {
      });
    }, "image/png");
    close();
  };
  const handleCopySVG = () => {
    const clone = getCleanSVG();
    if (!clone) {
      close();
      return;
    }
    const svgData = new XMLSerializer().serializeToString(clone);
    navigator.clipboard.writeText(svgData).catch(() => {
    });
    close();
  };
  const handleToggleGrid = () => {
    useSketchStore_default.getState().toggleGrid();
    close();
  };
  const handleToggleSnap = () => {
    useSketchStore_default.getState().toggleSnapToObjects();
    close();
  };
  const handleZenMode = () => {
    useSketchStore_default.getState().toggleZenMode();
    close();
  };
  const handleViewMode = () => {
    useSketchStore_default.getState().toggleViewMode();
    close();
  };
  const handleDeleteShape = () => {
    if (window.multiSelection?.selectedShapes?.size > 0) {
      if (typeof window.deleteSelectedShapes === "function") window.deleteSelectedShapes();
      close();
      return;
    }
    const shape = targetShape || window.currentShape;
    if (!shape) {
      close();
      return;
    }
    const shapes = window.shapes;
    if (shapes) {
      const idx = shapes.indexOf(shape);
      if (idx !== -1) shapes.splice(idx, 1);
    }
    if (typeof window.cleanupAttachments === "function") window.cleanupAttachments(shape);
    if (shape.parentFrame && typeof shape.parentFrame.removeShapeFromFrame === "function") {
      shape.parentFrame.removeShapeFromFrame(shape);
    }
    const el = shape.group || shape.element;
    if (el && el.parentNode) el.parentNode.removeChild(el);
    if (typeof window.pushDeleteAction === "function") window.pushDeleteAction(shape);
    window.currentShape = null;
    if (typeof window.disableAllSideBars === "function") window.disableAllSideBars();
    close();
  };
  const handleDuplicate = () => {
    if (typeof window.copySelected === "function") window.copySelected();
    setTimeout(() => {
      if (typeof window.pasteClipboard === "function") window.pasteClipboard();
    }, 50);
    close();
  };
  const handleLayerAction = (action) => {
    const shape = targetShape || window.currentShape;
    if (!shape || !window.__layerOrder) {
      close();
      return;
    }
    window.__layerOrder[action](shape);
    close();
  };
  const handleFlip = (axis) => {
    const shape = targetShape || window.currentShape;
    if (!shape) {
      close();
      return;
    }
    const el = shape.group || shape.element;
    if (!el) {
      close();
      return;
    }
    const current = el.getAttribute("transform") || "";
    const bbox = el.getBBox();
    const cx = bbox.x + bbox.width / 2;
    const cy = bbox.y + bbox.height / 2;
    const scaleStr = axis === "h" ? `translate(${cx * 2}, 0) scale(-1, 1)` : `translate(0, ${cy * 2}) scale(1, -1)`;
    el.setAttribute("transform", current + " " + scaleStr);
    close();
  };
  const handleWrapInFrame = () => {
    close();
  };
  const handleGroup = () => {
    const ms = window.multiSelection;
    const sel = ms?.selectedShapes;
    const targets = sel && sel.size > 1 ? Array.from(sel) : window.currentShape ? [window.currentShape] : [];
    if (targets.length > 1) {
      const newId = `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      for (const s of targets) s.groupId = newId;
      if (typeof ms?.updateControls === "function") ms.updateControls();
      showToast(`Grouped ${targets.length} shapes`, { tone: "success" });
    }
    close();
  };
  const handleUngroup = () => {
    const ms = window.multiSelection;
    const sel = ms?.selectedShapes;
    const targets = sel && sel.size > 0 ? Array.from(sel) : window.currentShape ? [window.currentShape] : [];
    const groupIds = new Set(targets.map((s) => s.groupId).filter(Boolean));
    if (groupIds.size > 0 && Array.isArray(window.shapes)) {
      let cleared = 0;
      for (const s of window.shapes) {
        if (s.groupId && groupIds.has(s.groupId)) {
          s.groupId = null;
          cleared++;
        }
      }
      if (typeof ms?.updateControls === "function") ms.updateControls();
      showToast(`Ungrouped ${cleared} shapes`, { tone: "success" });
    }
    close();
  };
  const selectionShapes = (() => {
    const sel = window.multiSelection?.selectedShapes;
    if (sel && sel.size > 0) return Array.from(sel);
    if (targetShape) return [targetShape];
    return [];
  })();
  const canGroup = selectionShapes.length > 1;
  const groupIdsInSelection = new Set(selectionShapes.map((s) => s.groupId).filter(Boolean));
  const canUngroup = groupIdsInSelection.size > 0;
  const fullyGrouped = selectionShapes.length > 1 && selectionShapes.every((s) => s.groupId) && groupIdsInSelection.size === 1;
  const handleCanvasProperties = () => {
    close();
  };
  const isShape = !!targetShape;
  return /* @__PURE__ */ jsx16(
    "div",
    {
      ref: menuRef,
      className: "fixed z-9999 min-w-[220px] py-1.5 bg-surface/90 backdrop-blur-xl rounded-xl border border-border-light shadow-2xl font-[lixFont] select-none",
      style: { left: position.x, top: position.y },
      onClick: (e) => e.stopPropagation(),
      children: isShape ? (
        /* ── Shape context menu ── */
        /* @__PURE__ */ jsxs16(Fragment6, { children: [
          /* @__PURE__ */ jsx16(MenuItem, { label: "Cut", shortcut: "Ctrl+X", onClick: handleCut }),
          /* @__PURE__ */ jsx16(MenuItem, { label: "Copy", shortcut: "Ctrl+C", onClick: handleCopy }),
          /* @__PURE__ */ jsx16(MenuItem, { label: "Paste", shortcut: "Ctrl+V", onClick: handlePaste }),
          /* @__PURE__ */ jsx16(Separator, {}),
          !fullyGrouped && /* @__PURE__ */ jsx16(MenuItem, { label: "Wrap selection in frame", onClick: handleWrapInFrame }),
          canGroup && !fullyGrouped && /* @__PURE__ */ jsx16(MenuItem, { label: "Group", shortcut: "Ctrl+G", onClick: handleGroup }),
          canUngroup && /* @__PURE__ */ jsx16(MenuItem, { label: "Ungroup", shortcut: "Ctrl+Shift+G", onClick: handleUngroup }),
          /* @__PURE__ */ jsx16(Separator, {}),
          /* @__PURE__ */ jsx16(MenuItem, { label: "Copy to clipboard as PNG", shortcut: "Shift+Alt+C", onClick: handleCopyPNG }),
          /* @__PURE__ */ jsx16(MenuItem, { label: "Copy to clipboard as SVG", onClick: handleCopySVG }),
          /* @__PURE__ */ jsx16(Separator, {}),
          /* @__PURE__ */ jsx16(MenuItem, { label: "Send backward", shortcut: "Ctrl+[", onClick: () => handleLayerAction("sendBackward") }),
          /* @__PURE__ */ jsx16(MenuItem, { label: "Bring forward", shortcut: "Ctrl+]", onClick: () => handleLayerAction("bringForward") }),
          /* @__PURE__ */ jsx16(MenuItem, { label: "Send to back", shortcut: "Ctrl+Shift+[", onClick: () => handleLayerAction("sendToBack") }),
          /* @__PURE__ */ jsx16(MenuItem, { label: "Bring to front", shortcut: "Ctrl+Shift+]", onClick: () => handleLayerAction("bringToFront") }),
          /* @__PURE__ */ jsx16(Separator, {}),
          /* @__PURE__ */ jsx16(MenuItem, { label: "Flip horizontal", shortcut: "Shift+H", onClick: () => handleFlip("h") }),
          /* @__PURE__ */ jsx16(MenuItem, { label: "Flip vertical", shortcut: "Shift+V", onClick: () => handleFlip("v") }),
          /* @__PURE__ */ jsx16(Separator, {}),
          /* @__PURE__ */ jsx16(MenuItem, { label: "Duplicate", shortcut: "Ctrl+D", onClick: handleDuplicate }),
          /* @__PURE__ */ jsx16(MenuItem, { label: "Delete", danger: true, onClick: handleDeleteShape })
        ] })
      ) : (
        /* ── Canvas context menu ── */
        /* @__PURE__ */ jsxs16(Fragment6, { children: [
          /* @__PURE__ */ jsx16(MenuItem, { label: "Paste", shortcut: "Ctrl+V", onClick: handlePaste }),
          /* @__PURE__ */ jsx16(MenuItem, { label: "Copy to clipboard as PNG", shortcut: "Shift+Alt+C", onClick: handleCopyPNG }),
          /* @__PURE__ */ jsx16(MenuItem, { label: "Copy to clipboard as SVG", onClick: handleCopySVG }),
          /* @__PURE__ */ jsx16(Separator, {}),
          /* @__PURE__ */ jsx16(MenuItem, { label: "Select all", shortcut: "Ctrl+A", onClick: handleSelectAll }),
          /* @__PURE__ */ jsx16(Separator, {}),
          /* @__PURE__ */ jsx16(CheckMenuItem, { label: "Toggle grid", shortcut: "Ctrl+'", checked: gridEnabled, onClick: handleToggleGrid }),
          /* @__PURE__ */ jsx16(CheckMenuItem, { label: "Snap to objects", shortcut: "Alt+S", checked: snapToObjects, onClick: handleToggleSnap }),
          /* @__PURE__ */ jsx16(Separator, {}),
          /* @__PURE__ */ jsx16(MenuItem, { label: "Find on canvas", shortcut: "Ctrl+F", onClick: () => {
            useUIStore_default.getState().toggleFindBar();
            close();
          } }),
          /* @__PURE__ */ jsx16(MenuItem, { label: "Zen mode", shortcut: "Alt+Z", onClick: handleZenMode }),
          /* @__PURE__ */ jsx16(MenuItem, { label: "View mode", shortcut: "Alt+R", onClick: handleViewMode }),
          /* @__PURE__ */ jsx16(Separator, {}),
          /* @__PURE__ */ jsx16(MenuItem, { label: "Reset canvas", danger: true, onClick: () => {
            const serializer = window.__sceneSerializer;
            if (serializer?.resetCanvas) serializer.resetCanvas();
            close();
          } })
        ] })
      )
    }
  );
}

// src/react/components/canvas/FindBar.jsx
import { useState as useState14, useEffect as useEffect9, useRef as useRef6, useCallback as useCallback12 } from "react";
import { jsx as jsx17, jsxs as jsxs17 } from "react/jsx-runtime";
function FindBar() {
  const open = useUIStore_default((s) => s.findBarOpen);
  const closeFindBar = useUIStore_default((s) => s.closeFindBar);
  const [query, setQuery] = useState14("");
  const [results, setResults] = useState14([]);
  const [activeIndex, setActiveIndex] = useState14(-1);
  const inputRef = useRef6(null);
  const highlightRef = useRef6(null);
  useEffect9(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setActiveIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      removeHighlight();
    }
  }, [open]);
  const removeHighlight = useCallback12(() => {
    if (highlightRef.current && highlightRef.current.parentNode) {
      highlightRef.current.parentNode.removeChild(highlightRef.current);
      highlightRef.current = null;
    }
  }, []);
  const highlightShape = useCallback12((result) => {
    removeHighlight();
    if (!result || !window.svg) return;
    const shape = result.shape;
    const x = shape.x || 0;
    const y = shape.y || 0;
    const w = shape.width || 100;
    const h = shape.height || 30;
    const ns = "http://www.w3.org/2000/svg";
    const rect = document.createElementNS(ns, "rect");
    rect.setAttribute("x", x - 4);
    rect.setAttribute("y", y - 4);
    rect.setAttribute("width", w + 8);
    rect.setAttribute("height", h + 8);
    rect.setAttribute("fill", "rgba(91, 87, 209, 0.15)");
    rect.setAttribute("stroke", "#5B57D1");
    rect.setAttribute("stroke-width", "2");
    rect.setAttribute("stroke-dasharray", "4,2");
    rect.setAttribute("rx", "4");
    rect.setAttribute("pointer-events", "none");
    rect.classList.add("find-highlight");
    window.svg.appendChild(rect);
    highlightRef.current = rect;
    const svgEl = window.svg;
    const vb = svgEl.viewBox.baseVal;
    const centerX = x + w / 2;
    const centerY = y + h / 2;
    const newX = centerX - vb.width / 2;
    const newY = centerY - vb.height / 2;
    svgEl.setAttribute("viewBox", `${newX} ${newY} ${vb.width} ${vb.height}`);
    if (window.currentViewBox) {
      window.currentViewBox.x = newX;
      window.currentViewBox.y = newY;
    }
  }, [removeHighlight]);
  const doSearch = useCallback12((q) => {
    const finder = window.__sceneSerializer?.findText;
    if (!finder || !q.trim()) {
      setResults([]);
      setActiveIndex(-1);
      removeHighlight();
      return;
    }
    const found = finder(q);
    setResults(found);
    if (found.length > 0) {
      setActiveIndex(0);
      highlightShape(found[0]);
    } else {
      setActiveIndex(-1);
      removeHighlight();
    }
  }, [highlightShape, removeHighlight]);
  const goToResult = useCallback12((idx) => {
    if (idx < 0 || idx >= results.length) return;
    setActiveIndex(idx);
    highlightShape(results[idx]);
  }, [results, highlightShape]);
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      closeFindBar();
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (results.length === 0) {
        doSearch(query);
      } else {
        const next = (activeIndex + 1) % results.length;
        goToResult(next);
      }
      return;
    }
  };
  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    doSearch(q);
  };
  if (!open) return null;
  return /* @__PURE__ */ jsx17("div", { className: "fixed top-14 right-4 z-[1000] font-[lixFont]", children: /* @__PURE__ */ jsxs17("div", { className: "flex items-center gap-2 bg-surface-card/95 backdrop-blur-lg border border-border-light rounded-xl px-3 py-2 shadow-xl min-w-[300px]", children: [
    /* @__PURE__ */ jsx17("i", { className: "bx bx-search text-text-muted text-sm" }),
    /* @__PURE__ */ jsx17(
      "input",
      {
        ref: inputRef,
        type: "text",
        value: query,
        onChange: handleChange,
        onKeyDown: handleKeyDown,
        placeholder: "Find text on canvas...",
        className: "flex-1 bg-transparent text-text-primary text-xs outline-none placeholder:text-text-dim font-[lixFont]"
      }
    ),
    results.length > 0 && /* @__PURE__ */ jsxs17("span", { className: "text-text-dim text-xs whitespace-nowrap", children: [
      activeIndex + 1,
      "/",
      results.length
    ] }),
    query && results.length === 0 && /* @__PURE__ */ jsx17("span", { className: "text-red-400/70 text-xs whitespace-nowrap", children: "No results" }),
    results.length > 1 && /* @__PURE__ */ jsxs17("div", { className: "flex items-center gap-0.5", children: [
      /* @__PURE__ */ jsx17(
        "button",
        {
          onClick: () => goToResult((activeIndex - 1 + results.length) % results.length),
          className: "w-5 h-5 flex items-center justify-center rounded text-text-muted hover:text-white hover:bg-white/10 transition-colors",
          children: /* @__PURE__ */ jsx17("i", { className: "bx bx-chevron-up text-sm" })
        }
      ),
      /* @__PURE__ */ jsx17(
        "button",
        {
          onClick: () => goToResult((activeIndex + 1) % results.length),
          className: "w-5 h-5 flex items-center justify-center rounded text-text-muted hover:text-white hover:bg-white/10 transition-colors",
          children: /* @__PURE__ */ jsx17("i", { className: "bx bx-chevron-down text-sm" })
        }
      )
    ] }),
    /* @__PURE__ */ jsx17(
      "button",
      {
        onClick: closeFindBar,
        className: "w-5 h-5 flex items-center justify-center rounded text-text-muted hover:text-white hover:bg-white/10 transition-colors",
        children: /* @__PURE__ */ jsx17("i", { className: "bx bx-x text-sm" })
      }
    )
  ] }) });
}

// src/react/components/canvas/ImageSourcePicker.jsx
import { useState as useState15, useEffect as useEffect10, useCallback as useCallback13, useRef as useRef7 } from "react";
import { jsx as jsx18, jsxs as jsxs18 } from "react/jsx-runtime";
function ImageSourcePicker() {
  const ref = useRef7(null);
  const toggleImageGenerateModal = useUIStore_default((s) => s.toggleImageGenerateModal);
  const activeTool = useSketchStore_default((s) => s.activeTool);
  const setActiveTool = useSketchStore_default((s) => s.setActiveTool);
  const visible = activeTool === "image";
  const handleGenerateAI = useCallback13(() => {
    setActiveTool("select");
    toggleImageGenerateModal();
  }, [setActiveTool, toggleImageGenerateModal]);
  const handleUpload = useCallback13(() => {
    setActiveTool("select");
    if (window.openImageFilePicker) {
      window.openImageFilePicker();
    }
  }, [setActiveTool]);
  useEffect10(() => {
    window.__showImageSourcePicker = () => {
    };
    return () => {
      delete window.__showImageSourcePicker;
    };
  }, []);
  useEffect10(() => {
    if (!visible) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setActiveTool("select");
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setActiveTool("select");
      }
      if (e.key === "g" || e.key === "G") {
        e.preventDefault();
        e.stopPropagation();
        handleGenerateAI();
      }
      if (e.key === "u" || e.key === "U") {
        e.preventDefault();
        e.stopPropagation();
        handleUpload();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handleClick);
      document.addEventListener("keydown", handleKeyDown, true);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [visible, setActiveTool, handleGenerateAI, handleUpload]);
  if (!visible) return null;
  let posX = 65;
  let posY = typeof window !== "undefined" ? window.innerHeight / 2 - 50 : 300;
  if (typeof document !== "undefined") {
    const imageBtn = document.querySelector('button[title="Image (9)"]');
    if (imageBtn) {
      const rect = imageBtn.getBoundingClientRect();
      posX = rect.right + 10;
      posY = rect.top - 10;
    }
  }
  return /* @__PURE__ */ jsx18(
    "div",
    {
      ref,
      className: "fixed z-[1100] font-[lixFont]",
      style: { left: posX, top: posY },
      children: /* @__PURE__ */ jsxs18("div", { className: "bg-surface-card border border-border-light rounded-xl p-1.5 shadow-2xl shadow-black/40 flex flex-col gap-1 min-w-[200px]", children: [
        /* @__PURE__ */ jsxs18(
          "button",
          {
            onClick: handleGenerateAI,
            className: "flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-muted hover:text-accent-blue hover:bg-surface-hover transition-all group",
            children: [
              /* @__PURE__ */ jsx18("div", { className: "w-8 h-8 rounded-lg bg-accent-blue/10 flex items-center justify-center group-hover:bg-accent-blue/20 transition-all", children: /* @__PURE__ */ jsxs18("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "text-accent-blue", children: [
                /* @__PURE__ */ jsx18("path", { d: "M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" }),
                /* @__PURE__ */ jsx18("path", { d: "M18 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" })
              ] }) }),
              /* @__PURE__ */ jsxs18("div", { className: "flex-1 text-left", children: [
                /* @__PURE__ */ jsx18("div", { className: "text-sm font-medium", children: "Generate with AI" }),
                /* @__PURE__ */ jsx18("div", { className: "text-[10px] text-text-dim", children: "10 generations \xB7 5 edits free" })
              ] }),
              /* @__PURE__ */ jsx18("kbd", { className: "text-[10px] text-text-dim bg-surface-dark px-1.5 py-0.5 rounded", children: "G" })
            ]
          }
        ),
        /* @__PURE__ */ jsx18("div", { className: "h-px bg-white/[0.06] mx-2" }),
        /* @__PURE__ */ jsxs18(
          "button",
          {
            onClick: handleUpload,
            className: "flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all group",
            children: [
              /* @__PURE__ */ jsx18("div", { className: "w-8 h-8 rounded-lg bg-surface-hover flex items-center justify-center group-hover:bg-surface-active transition-all", children: /* @__PURE__ */ jsx18("i", { className: "bx bx-upload text-lg" }) }),
              /* @__PURE__ */ jsxs18("div", { className: "flex-1 text-left", children: [
                /* @__PURE__ */ jsx18("div", { className: "text-sm font-medium", children: "Upload from device" }),
                /* @__PURE__ */ jsx18("div", { className: "text-[10px] text-text-dim", children: "PNG, JPG, SVG, WebP" })
              ] }),
              /* @__PURE__ */ jsx18("kbd", { className: "text-[10px] text-text-dim bg-surface-dark px-1.5 py-0.5 rounded", children: "U" })
            ]
          }
        )
      ] })
    }
  );
}

// src/react/components/canvas/CanvasLoadingOverlay.jsx
import { jsx as jsx19, jsxs as jsxs19 } from "react/jsx-runtime";
function CanvasLoadingOverlay() {
  const loading = useUIStore_default((s) => s.canvasLoading);
  const message = useUIStore_default((s) => s.canvasLoadingMessage);
  if (!loading) return null;
  return /* @__PURE__ */ jsx19("div", { className: "fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm font-[lixFont] pointer-events-all", children: /* @__PURE__ */ jsxs19("div", { className: "flex flex-col items-center gap-5", children: [
    /* @__PURE__ */ jsx19("style", { children: `
          @keyframes cl-glob {
            0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.7; }
            25% { transform: translate(10px, -6px) scale(1.12); opacity: 0.9; }
            50% { transform: translate(-5px, 8px) scale(0.9); opacity: 0.6; }
            75% { transform: translate(-8px, -4px) scale(1.08); opacity: 0.85; }
          }
          @keyframes cl-glob-2 {
            0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
            25% { transform: translate(-8px, 5px) scale(1.1); opacity: 0.85; }
            50% { transform: translate(6px, -8px) scale(0.95); opacity: 0.7; }
            75% { transform: translate(5px, 6px) scale(1.12); opacity: 0.9; }
          }
          @keyframes cl-float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-3px); }
          }
        ` }),
    /* @__PURE__ */ jsxs19("div", { className: "relative w-20 h-20", children: [
      /* @__PURE__ */ jsx19("div", { className: "absolute rounded-full", style: {
        width: 38,
        height: 38,
        top: 2,
        left: 4,
        background: "radial-gradient(circle, rgba(59,130,246,0.5) 0%, transparent 70%)",
        filter: "blur(10px)",
        animation: "cl-glob 3.5s ease-in-out infinite",
        willChange: "transform, opacity"
      } }),
      /* @__PURE__ */ jsx19("div", { className: "absolute rounded-full", style: {
        width: 34,
        height: 34,
        top: 14,
        right: 2,
        background: "radial-gradient(circle, rgba(168,85,247,0.45) 0%, transparent 70%)",
        filter: "blur(10px)",
        animation: "cl-glob-2 4s ease-in-out infinite",
        willChange: "transform, opacity"
      } }),
      /* @__PURE__ */ jsx19("div", { className: "absolute rounded-full", style: {
        width: 30,
        height: 30,
        bottom: 2,
        left: 12,
        background: "radial-gradient(circle, rgba(52,211,153,0.4) 0%, transparent 70%)",
        filter: "blur(10px)",
        animation: "cl-glob 4.2s ease-in-out infinite reverse",
        willChange: "transform, opacity"
      } }),
      /* @__PURE__ */ jsx19("div", { className: "absolute inset-0 flex items-center justify-center", style: { animation: "cl-float 2.5s ease-in-out infinite" }, children: /* @__PURE__ */ jsx19("div", { className: "w-9 h-9 rounded-lg bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] flex items-center justify-center", children: /* @__PURE__ */ jsxs19("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "white", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", className: "opacity-70", children: [
        /* @__PURE__ */ jsx19("rect", { x: "3", y: "3", width: "7", height: "7", rx: "1" }),
        /* @__PURE__ */ jsx19("rect", { x: "14", y: "3", width: "7", height: "7", rx: "1" }),
        /* @__PURE__ */ jsx19("rect", { x: "3", y: "14", width: "7", height: "7", rx: "1" }),
        /* @__PURE__ */ jsx19("rect", { x: "14", y: "14", width: "7", height: "7", rx: "1" })
      ] }) }) })
    ] }),
    /* @__PURE__ */ jsxs19("div", { className: "flex items-center gap-1.5", children: [
      /* @__PURE__ */ jsx19("span", { className: "w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce", style: { animationDelay: "0ms" } }),
      /* @__PURE__ */ jsx19("span", { className: "w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce", style: { animationDelay: "150ms" } }),
      /* @__PURE__ */ jsx19("span", { className: "w-1.5 h-1.5 rounded-full bg-emerald-400 animate-bounce", style: { animationDelay: "300ms" } })
    ] }),
    /* @__PURE__ */ jsx19("p", { className: "text-text-dim text-sm", children: message })
  ] }) });
}

// src/react/components/modals/ShortcutsModal.jsx
import { useMemo } from "react";
import { jsx as jsx20, jsxs as jsxs20 } from "react/jsx-runtime";
function ShortcutRow({ keys, action }) {
  return /* @__PURE__ */ jsxs20("div", { className: "flex items-center justify-between py-1.5", children: [
    /* @__PURE__ */ jsx20("span", { className: "text-text-secondary text-xs", children: action }),
    /* @__PURE__ */ jsx20("div", { className: "flex items-center gap-1", children: keys.split("+").map((key, i) => /* @__PURE__ */ jsxs20("span", { children: [
      i > 0 && /* @__PURE__ */ jsx20("span", { className: "text-text-dim text-xs mx-0.5", children: "+" }),
      /* @__PURE__ */ jsx20("kbd", { className: "px-1.5 py-0.5 bg-surface-dark rounded text-text-muted text-xs border border-border font-[lixFont]", children: key.trim() })
    ] }, i)) })
  ] });
}
function ShortcutSection({ title, shortcuts }) {
  return /* @__PURE__ */ jsxs20("div", { children: [
    /* @__PURE__ */ jsx20("h3", { className: "text-text-dim text-xs uppercase tracking-wider mb-2", children: title }),
    shortcuts.map((s) => /* @__PURE__ */ jsx20(ShortcutRow, { keys: s.keys, action: s.action }, s.action))
  ] });
}
function ShortcutsModal() {
  const { t } = useTranslation();
  const shortcutsModalOpen = useUIStore_default((s) => s.shortcutsModalOpen);
  const toggleShortcutsModal = useUIStore_default((s) => s.toggleShortcutsModal);
  const TOOL_SHORTCUTS2 = useMemo(() => [
    { keys: "H", action: t("shortcuts.pan") },
    { keys: "V / 1", action: t("shortcuts.selection") },
    { keys: "R / 2", action: t("shortcuts.rectangle") },
    { keys: "3", action: t("shortcuts.diamond") },
    { keys: "O / 4", action: t("shortcuts.circle") },
    { keys: "A / 5", action: t("shortcuts.arrow") },
    { keys: "L / 6", action: t("shortcuts.line") },
    { keys: "P / 7", action: t("shortcuts.freehand") },
    { keys: "T / 8", action: t("shortcuts.text") },
    { keys: "9", action: t("shortcuts.image") },
    { keys: "E / 0", action: t("shortcuts.eraser") },
    { keys: "F", action: t("shortcuts.frame") },
    { keys: "K", action: t("shortcuts.laser") }
  ], [t]);
  const ACTION_SHORTCUTS2 = useMemo(() => [
    { keys: "Ctrl+A", action: t("shortcuts.selectAll") },
    { keys: "Ctrl+G", action: t("shortcuts.group") },
    { keys: "Ctrl+Shift+G", action: t("shortcuts.ungroup") },
    { keys: "Ctrl+D", action: t("shortcuts.duplicate") },
    { keys: "Ctrl+S", action: t("shortcuts.quickSave") },
    { keys: "Ctrl+Shift+S", action: t("shortcuts.saveShare") },
    { keys: "Ctrl+F", action: t("shortcuts.findOnCanvas") },
    { keys: "Ctrl+C", action: t("shortcuts.copy") },
    { keys: "Ctrl+V", action: t("shortcuts.paste") },
    { keys: "Ctrl+Z", action: t("shortcuts.undo") },
    { keys: "Ctrl+Shift+Z", action: t("shortcuts.redo") },
    { keys: "Esc", action: t("shortcuts.deselect") },
    { keys: "Del", action: t("shortcuts.delete") },
    { keys: "Space", action: t("shortcuts.holdToPan") },
    { keys: "Shift", action: t("shortcuts.straightDraw") }
  ], [t]);
  const VIEW_SHORTCUTS2 = useMemo(() => [
    { keys: "Ctrl++", action: t("shortcuts.zoomIn") },
    { keys: "Ctrl+-", action: t("shortcuts.zoomOut") },
    { keys: "Ctrl+0", action: t("shortcuts.resetZoom") },
    { keys: "Ctrl+'", action: t("shortcuts.toggleGrid") },
    { keys: "Ctrl+/", action: t("shortcuts.shortcutsHelp") }
  ], [t]);
  if (!shortcutsModalOpen) return null;
  return /* @__PURE__ */ jsxs20(
    "div",
    {
      className: "fixed inset-0 z-[9999] flex items-center justify-center font-[lixFont]",
      onClick: toggleShortcutsModal,
      children: [
        /* @__PURE__ */ jsx20("div", { className: "absolute inset-0 bg-black/60 backdrop-blur-sm" }),
        /* @__PURE__ */ jsxs20(
          "div",
          {
            className: "relative bg-surface-card border border-border-light rounded-2xl p-6 max-w-[600px] w-full mx-4 max-h-[80vh] overflow-y-auto no-scrollbar",
            onClick: (e) => e.stopPropagation(),
            children: [
              /* @__PURE__ */ jsxs20("div", { className: "flex items-center justify-between mb-5", children: [
                /* @__PURE__ */ jsx20("h2", { className: "text-text-primary text-base font-medium", children: t("shortcuts.title") }),
                /* @__PURE__ */ jsx20(
                  "button",
                  {
                    onClick: toggleShortcutsModal,
                    className: "w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200",
                    children: /* @__PURE__ */ jsx20("i", { className: "bx bx-x text-xl" })
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs20("div", { className: "grid grid-cols-2 gap-6", children: [
                /* @__PURE__ */ jsx20(ShortcutSection, { title: t("shortcuts.tools"), shortcuts: TOOL_SHORTCUTS2 }),
                /* @__PURE__ */ jsxs20("div", { className: "flex flex-col gap-4", children: [
                  /* @__PURE__ */ jsx20(ShortcutSection, { title: t("shortcuts.actions"), shortcuts: ACTION_SHORTCUTS2 }),
                  /* @__PURE__ */ jsx20(ShortcutSection, { title: t("shortcuts.view"), shortcuts: VIEW_SHORTCUTS2 })
                ] })
              ] })
            ]
          }
        )
      ]
    }
  );
}

// src/react/components/modals/CommandPalette.jsx
import { useState as useState16, useEffect as useEffect11, useRef as useRef8 } from "react";
import { jsx as jsx21, jsxs as jsxs21 } from "react/jsx-runtime";
var COMMANDS = [
  // --- App ---
  { label: "Library", icon: "bx-library", section: "App" },
  { label: "Find on canvas", icon: "bx-search", section: "App", shortcut: "Ctrl+F", action: "findOnCanvas" },
  { label: "Live collaboration...", icon: "bx-group", section: "App" },
  { label: "Share", icon: "bx-share-alt", section: "App" },
  { label: "Toggle theme", icon: "bx-sun", section: "App", action: "toggleTheme" },
  // --- Export ---
  { label: "Export image...", icon: "bx-image", section: "Export", shortcut: "Ctrl+Shift+E", action: "exportImage" },
  { label: "Save to disk", icon: "bx-download", section: "Export", shortcut: "Ctrl+S", action: "save" },
  { label: "Copy to clipboard as PNG", icon: "bx-clipboard", section: "Export", shortcut: "Shift+Alt+C", action: "copyPNG" },
  { label: "Copy to clipboard as SVG", icon: "bx-code-alt", section: "Export", shortcut: null, action: "copySVG" },
  { label: "Open scene file", icon: "bx-folder-open", section: "Export", shortcut: "Ctrl+O", action: "load" },
  // --- Editor ---
  { label: "Undo", icon: "bx-undo", section: "Editor", action: "undo" },
  { label: "Redo", icon: "bx-redo", section: "Editor", action: "redo" },
  { label: "Zoom in", icon: "bx-plus", section: "Editor", shortcut: "Ctrl++" },
  { label: "Zoom out", icon: "bx-minus", section: "Editor", shortcut: "Ctrl+-" },
  { label: "Reset zoom", icon: "bx-reset", section: "Editor", shortcut: "Ctrl+0" },
  { label: "Zoom to fit all elements", icon: "bx-fullscreen", section: "Editor", shortcut: "Shift+1" },
  { label: "Toggle grid", icon: "bx-grid-alt", section: "Editor", shortcut: "Ctrl+'", action: "toggleGrid" },
  { label: "Shortcuts & help", icon: "bx-help-circle", section: "Editor", shortcut: "?", action: "help" },
  { label: "Select all", icon: "bx-select-multiple", section: "Editor", shortcut: "Ctrl+A", action: "selectAll" },
  { label: "Reset canvas", icon: "bx-trash", section: "Editor", shortcut: "Ctrl+Delete", action: "resetCanvas" },
  { label: "Canvas background", icon: "bx-palette", section: "Editor", action: "openMenu" },
  // --- Tools ---
  { label: "Hand (panning tool)", icon: "bx-hand", section: "Tools", shortcut: "H", action: "tool:pan" },
  { label: "Selection", icon: "bx-pointer", section: "Tools", shortcut: "V", action: "tool:select" },
  { label: "Rectangle", icon: "bx-rectangle", section: "Tools", shortcut: "R", action: "tool:rectangle" },
  { label: "Diamond", icon: "bx-diamond", section: "Tools", shortcut: "D", action: "tool:diamond" },
  { label: "Circle", icon: "bx-circle", section: "Tools", shortcut: "O", action: "tool:circle" },
  { label: "Arrow", icon: "bx-right-arrow-alt", section: "Tools", shortcut: "A", action: "tool:arrow" },
  { label: "Line", icon: "bx-minus", section: "Tools", shortcut: "L", action: "tool:line" },
  { label: "Draw", icon: "bx-pencil", section: "Tools", shortcut: "P", action: "tool:freehand" },
  { label: "Text", icon: "bx-text", section: "Tools", shortcut: "T", action: "tool:text" },
  { label: "Insert image", icon: "bx-image-add", section: "Tools", shortcut: "9", action: "tool:image" },
  { label: "Eraser", icon: "bx-eraser", section: "Tools", shortcut: "E", action: "tool:eraser" },
  { label: "Laser pointer", icon: "bxs-magic-wand", section: "Tools", shortcut: "K", action: "tool:laser" },
  { label: "Frame tool", icon: "bx-border-all", section: "Tools", shortcut: "F", action: "tool:frame" },
  // AI entries removed — feature is hidden behind a coming-soon screen.
  // Restore "Text to diagram..." / "Mermaid to diagram..." here when the
  // assistant ships.
  // --- Links ---
  { label: "GitHub", icon: "bxl-github", section: "Links", action: "link:github" },
  { label: "Report an issue", icon: "bx-bug", section: "Links", action: "link:issues" }
];
var TOOL_ACTION_MAP = {
  "tool:pan": TOOLS.PAN,
  "tool:select": TOOLS.SELECT,
  "tool:rectangle": TOOLS.RECTANGLE,
  "tool:diamond": TOOLS.RECTANGLE,
  // diamond is a rectangle variant
  "tool:circle": TOOLS.CIRCLE,
  "tool:arrow": TOOLS.ARROW,
  "tool:line": TOOLS.LINE,
  "tool:freehand": TOOLS.FREEHAND,
  "tool:text": TOOLS.TEXT,
  "tool:image": TOOLS.IMAGE,
  "tool:eraser": TOOLS.ERASER,
  "tool:laser": TOOLS.LASER,
  "tool:frame": TOOLS.FRAME
};
function CommandPalette() {
  const open = useUIStore_default((s) => s.commandPaletteOpen);
  const toggleCommandPalette = useUIStore_default((s) => s.toggleCommandPalette);
  const [query, setQuery] = useState16("");
  const [selectedIndex, setSelectedIndex] = useState16(0);
  const inputRef = useRef8(null);
  const listRef = useRef8(null);
  useEffect11(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);
  useEffect11(() => {
    if (!open) return;
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [selectedIndex, open]);
  useEffect11(() => {
    setSelectedIndex(0);
  }, [query]);
  if (!open) return null;
  const filtered = query ? COMMANDS.filter(
    (c) => c.label.toLowerCase().includes(query.toLowerCase())
  ) : COMMANDS;
  const sectionOrder = [];
  const sections = {};
  filtered.forEach((c) => {
    if (!sections[c.section]) {
      sections[c.section] = [];
      sectionOrder.push(c.section);
    }
    sections[c.section].push(c);
  });
  const handleCommand = (cmd) => {
    toggleCommandPalette();
    const action = cmd.action;
    if (!action) return;
    if (action.startsWith("tool:")) {
      const tool = TOOL_ACTION_MAP[action];
      if (tool) useSketchStore_default.getState().setActiveTool(tool);
      return;
    }
    if (action === "link:github") {
      window.open("https://github.com/elixpo/sketch.elixpo", "_blank");
      return;
    }
    if (action === "link:issues") {
      window.open("https://github.com/elixpo/sketch.elixpo/issues", "_blank");
      return;
    }
    const serializer = window.__sceneSerializer;
    switch (action) {
      case "toggleTheme": {
        const store = useUIStore_default.getState();
        store.setTheme(store.theme === "dark" ? "light" : "dark");
        break;
      }
      case "toggleGrid":
        useSketchStore_default.getState().toggleGrid();
        break;
      case "save": {
        const name = useUIStore_default.getState().workspaceName || "Untitled";
        serializer?.download(name);
        break;
      }
      case "load":
        serializer?.upload();
        break;
      case "exportImage":
        useUIStore_default.getState().toggleExportImageModal();
        break;
      case "copyPNG":
        serializer?.copyAsPNG();
        break;
      case "copySVG":
        serializer?.copyAsSVG();
        break;
      case "undo":
        if (typeof window.undo === "function") window.undo();
        break;
      case "redo":
        if (typeof window.redo === "function") window.redo();
        break;
      case "selectAll":
        useSketchStore_default.getState().setActiveTool(TOOLS.SELECT);
        if (window.multiSelection && window.shapes) {
          window.multiSelection.clearSelection();
          window.shapes.forEach((shape) => window.multiSelection.addShape(shape));
        }
        break;
      case "resetCanvas": {
        const serializer2 = window.__sceneSerializer;
        if (serializer2?.resetCanvas) {
          serializer2.resetCanvas();
        }
        useSketchStore_default.getState().clearShapes();
        useSketchStore_default.getState().clearHistory();
        break;
      }
      case "findOnCanvas":
        useUIStore_default.getState().toggleFindBar();
        break;
      case "help":
        useUIStore_default.getState().toggleHelpModal();
        break;
      case "aiModal":
        useUIStore_default.getState().toggleAIModal();
        break;
      case "openMenu":
        useUIStore_default.getState().toggleMenu();
        break;
    }
  };
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      toggleCommandPalette();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && filtered[selectedIndex]) {
      e.preventDefault();
      handleCommand(filtered[selectedIndex]);
    }
  };
  let flatIndex = -1;
  return /* @__PURE__ */ jsxs21(
    "div",
    {
      className: "fixed inset-0 z-[9999] flex items-start justify-center pt-[12vh] font-[lixFont]",
      onClick: toggleCommandPalette,
      children: [
        /* @__PURE__ */ jsx21("div", { className: "absolute inset-0 bg-black/60 backdrop-blur-sm" }),
        /* @__PURE__ */ jsxs21(
          "div",
          {
            className: "relative bg-surface-card border border-border-light rounded-2xl w-full max-w-[540px] mx-4 overflow-hidden",
            onClick: (e) => e.stopPropagation(),
            children: [
              /* @__PURE__ */ jsxs21("div", { className: "flex items-center gap-3 px-4 py-3 border-b border-border-light", children: [
                /* @__PURE__ */ jsx21("i", { className: "bx bx-search text-text-muted text-lg" }),
                /* @__PURE__ */ jsx21(
                  "input",
                  {
                    ref: inputRef,
                    type: "text",
                    value: query,
                    onChange: (e) => setQuery(e.target.value),
                    placeholder: "Search commands...",
                    className: "flex-1 bg-transparent text-text-primary text-sm outline-none placeholder:text-text-dim font-[lixFont]",
                    onKeyDown: handleKeyDown
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs21("div", { ref: listRef, className: "max-h-[55vh] overflow-y-auto no-scrollbar py-2", children: [
                filtered.length === 0 && /* @__PURE__ */ jsx21("div", { className: "px-4 py-6 text-center text-text-dim text-xs", children: "No commands found" }),
                sectionOrder.map((section) => /* @__PURE__ */ jsxs21("div", { children: [
                  /* @__PURE__ */ jsx21("div", { className: "px-4 pt-3 pb-1", children: /* @__PURE__ */ jsx21("span", { className: "text-text-dim text-xs uppercase tracking-wider", children: section }) }),
                  sections[section].map((cmd) => {
                    flatIndex++;
                    const idx = flatIndex;
                    return /* @__PURE__ */ jsxs21(
                      "button",
                      {
                        "data-index": idx,
                        onClick: () => handleCommand(cmd),
                        className: `w-full flex items-center justify-between px-4 py-2 text-text-secondary text-xs transition-all duration-100 ${idx === selectedIndex ? "bg-surface-hover text-text-primary" : "hover:bg-surface-hover/60"}`,
                        children: [
                          /* @__PURE__ */ jsxs21("span", { className: "flex items-center gap-3", children: [
                            /* @__PURE__ */ jsx21("i", { className: `bx ${cmd.icon} text-base text-text-muted` }),
                            cmd.label
                          ] }),
                          cmd.shortcut && /* @__PURE__ */ jsx21("div", { className: "flex items-center gap-0.5", children: cmd.shortcut.split("+").map((key, i) => /* @__PURE__ */ jsxs21("span", { children: [
                            i > 0 && /* @__PURE__ */ jsx21("span", { className: "text-text-dim text-xs mx-0.5", children: "+" }),
                            /* @__PURE__ */ jsx21("kbd", { className: "px-1.5 py-0.5 bg-surface-dark rounded text-text-dim text-xs border border-border", children: key.trim() })
                          ] }, i)) })
                        ]
                      },
                      cmd.label
                    );
                  })
                ] }, section))
              ] })
            ]
          }
        )
      ]
    }
  );
}

// src/react/components/modals/ExportImageModal.jsx
import { useState as useState17, useEffect as useEffect12, useRef as useRef9, useCallback as useCallback14 } from "react";
import { jsx as jsx22, jsxs as jsxs22 } from "react/jsx-runtime";
var SCALES = [1, 2, 3];
function getCleanSVG2() {
  const svgEl = window.svg;
  if (!svgEl) return null;
  const clone = svgEl.cloneNode(true);
  clone.querySelectorAll(
    "[data-selection], .selection-handle, .resize-handle, .rotation-handle, .anchor, .rotate-anchor"
  ).forEach((el) => el.remove());
  return clone;
}
function renderToCanvas2(clone, scale, bgColor) {
  return new Promise((resolve) => {
    const svgData = new XMLSerializer().serializeToString(clone);
    const vb = window.svg.viewBox.baseVal;
    const canvas = document.createElement("canvas");
    canvas.width = vb.width * scale;
    canvas.height = vb.height * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    const img = new Image();
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      if (bgColor) {
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, vb.width, vb.height);
      }
      ctx.drawImage(img, 0, 0, vb.width, vb.height);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
function ExportImageModal() {
  const open = useUIStore_default((s) => s.exportImageModalOpen);
  const toggleModal = useUIStore_default((s) => s.toggleExportImageModal);
  const [scale, setScale] = useState17(2);
  const [bgMode, setBgMode] = useState17("dark");
  const [previewUrl, setPreviewUrl] = useState17(null);
  const previewRef = useRef9(null);
  const getBgColor = useCallback14(() => {
    if (bgMode === "dark") return "#121212";
    if (bgMode === "light") return "#ffffff";
    return null;
  }, [bgMode]);
  useEffect12(() => {
    if (!open) return;
    let cancelled = false;
    const generate = async () => {
      const clone = getCleanSVG2();
      if (!clone) return;
      const canvas = await renderToCanvas2(clone, 1, getBgColor());
      if (cancelled || !canvas) return;
      setPreviewUrl(canvas.toDataURL("image/png"));
    };
    generate();
    return () => {
      cancelled = true;
    };
  }, [open, bgMode, getBgColor]);
  if (!open) return null;
  const handleExportPNG = async () => {
    const clone = getCleanSVG2();
    if (!clone) return;
    const canvas = await renderToCanvas2(clone, scale, getBgColor());
    if (!canvas) return;
    canvas.toBlob((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `lixsketch-export-${scale}x.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }, "image/png");
    toggleModal();
  };
  const handleExportSVG = () => {
    const clone = getCleanSVG2();
    if (!clone) return;
    const bg = getBgColor();
    if (bg) {
      const ns = "http://www.w3.org/2000/svg";
      const rect = document.createElementNS(ns, "rect");
      const vb = window.svg.viewBox.baseVal;
      rect.setAttribute("width", vb.width);
      rect.setAttribute("height", vb.height);
      rect.setAttribute("fill", bg);
      clone.insertBefore(rect, clone.firstChild);
    }
    const svgData = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "lixsketch-export.svg";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toggleModal();
  };
  const handleCopyPNG = async () => {
    const clone = getCleanSVG2();
    if (!clone) return;
    const canvas = await renderToCanvas2(clone, scale, getBgColor());
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]).catch((err) => console.warn("Clipboard write failed:", err));
    }, "image/png");
    toggleModal();
  };
  const handleCopySVG = () => {
    const clone = getCleanSVG2();
    if (!clone) return;
    const svgData = new XMLSerializer().serializeToString(clone);
    navigator.clipboard.writeText(svgData).catch(
      (err) => console.warn("Clipboard write failed:", err)
    );
    toggleModal();
  };
  return /* @__PURE__ */ jsxs22(
    "div",
    {
      className: "fixed inset-0 z-[9999] flex items-center justify-center font-[lixFont]",
      onClick: toggleModal,
      children: [
        /* @__PURE__ */ jsx22("div", { className: "absolute inset-0 bg-black/60 backdrop-blur-sm" }),
        /* @__PURE__ */ jsxs22(
          "div",
          {
            className: "relative bg-surface-card border border-border-light rounded-2xl w-full max-w-[720px] mx-4 overflow-hidden",
            onClick: (e) => e.stopPropagation(),
            children: [
              /* @__PURE__ */ jsxs22("div", { className: "flex items-center justify-between px-6 pt-5 pb-3", children: [
                /* @__PURE__ */ jsx22("h2", { className: "text-text-primary text-base font-medium", children: "Export Image" }),
                /* @__PURE__ */ jsx22(
                  "button",
                  {
                    onClick: toggleModal,
                    className: "w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200",
                    children: /* @__PURE__ */ jsx22("i", { className: "bx bx-x text-xl" })
                  }
                )
              ] }),
              /* @__PURE__ */ jsx22("hr", { className: "border-border-light mx-6" }),
              /* @__PURE__ */ jsxs22("div", { className: "flex gap-0", children: [
                /* @__PURE__ */ jsx22("div", { className: "flex-1 p-6 flex items-center justify-center min-h-[300px]", children: /* @__PURE__ */ jsx22(
                  "div",
                  {
                    ref: previewRef,
                    className: "w-full max-h-[320px] rounded-xl overflow-hidden border border-border-light flex items-center justify-center",
                    style: { background: bgMode === "none" ? "repeating-conic-gradient(#2a2a35 0% 25%, #1e1e28 0% 50%) 0 0 / 16px 16px" : getBgColor() },
                    children: previewUrl ? /* @__PURE__ */ jsx22(
                      "img",
                      {
                        src: previewUrl,
                        alt: "Export preview",
                        className: "w-full h-full object-contain max-h-[320px]"
                      }
                    ) : /* @__PURE__ */ jsx22("span", { className: "text-text-dim text-xs", children: "Generating preview..." })
                  }
                ) }),
                /* @__PURE__ */ jsxs22("div", { className: "w-[240px] border-l border-border-light p-5 flex flex-col gap-5", children: [
                  /* @__PURE__ */ jsxs22("div", { children: [
                    /* @__PURE__ */ jsx22("p", { className: "text-text-dim text-xs uppercase tracking-wider mb-2", children: "Background" }),
                    /* @__PURE__ */ jsx22("div", { className: "flex items-center gap-1", children: [
                      { value: "dark", label: "Dark", icon: "bxs-moon" },
                      { value: "light", label: "Light", icon: "bxs-sun" },
                      { value: "none", label: "None", icon: "bx-hide" }
                    ].map((opt) => /* @__PURE__ */ jsxs22(
                      "button",
                      {
                        onClick: () => setBgMode(opt.value),
                        className: `flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs transition-all duration-200 ${bgMode === opt.value ? "bg-accent text-text-primary" : "text-text-muted hover:bg-surface-hover"}`,
                        children: [
                          /* @__PURE__ */ jsx22("i", { className: `bx ${opt.icon} text-xs` }),
                          opt.label
                        ]
                      },
                      opt.value
                    )) })
                  ] }),
                  /* @__PURE__ */ jsxs22("div", { children: [
                    /* @__PURE__ */ jsx22("p", { className: "text-text-dim text-xs uppercase tracking-wider mb-2", children: "Scale" }),
                    /* @__PURE__ */ jsx22("div", { className: "flex items-center gap-1", children: SCALES.map((s) => /* @__PURE__ */ jsxs22(
                      "button",
                      {
                        onClick: () => setScale(s),
                        className: `flex-1 py-1.5 rounded-lg text-xs transition-all duration-200 ${scale === s ? "bg-accent text-text-primary" : "text-text-muted hover:bg-surface-hover"}`,
                        children: [
                          s,
                          "x"
                        ]
                      },
                      s
                    )) })
                  ] }),
                  /* @__PURE__ */ jsx22("hr", { className: "border-border-light" }),
                  /* @__PURE__ */ jsxs22("div", { className: "flex flex-col gap-2", children: [
                    /* @__PURE__ */ jsxs22(
                      "button",
                      {
                        onClick: handleExportPNG,
                        className: "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-accent-blue hover:bg-accent-blue-hover text-text-primary text-xs transition-all duration-200",
                        children: [
                          /* @__PURE__ */ jsx22("i", { className: "bx bx-image text-sm" }),
                          "Export as PNG"
                        ]
                      }
                    ),
                    /* @__PURE__ */ jsxs22(
                      "button",
                      {
                        onClick: handleExportSVG,
                        className: "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg bg-surface hover:bg-surface-hover border border-border text-text-secondary text-xs transition-all duration-200",
                        children: [
                          /* @__PURE__ */ jsx22("i", { className: "bx bx-code-alt text-sm" }),
                          "Export as SVG"
                        ]
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsx22("hr", { className: "border-border-light" }),
                  /* @__PURE__ */ jsxs22("div", { className: "flex flex-col gap-2", children: [
                    /* @__PURE__ */ jsxs22(
                      "button",
                      {
                        onClick: handleCopyPNG,
                        className: "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-text-secondary text-xs hover:bg-surface-hover border border-border transition-all duration-200",
                        children: [
                          /* @__PURE__ */ jsx22("i", { className: "bx bx-clipboard text-sm" }),
                          "Copy as PNG"
                        ]
                      }
                    ),
                    /* @__PURE__ */ jsxs22(
                      "button",
                      {
                        onClick: handleCopySVG,
                        className: "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-text-secondary text-xs hover:bg-surface-hover border border-border transition-all duration-200",
                        children: [
                          /* @__PURE__ */ jsx22("i", { className: "bx bx-copy text-sm" }),
                          "Copy as SVG"
                        ]
                      }
                    )
                  ] })
                ] })
              ] })
            ]
          }
        )
      ]
    }
  );
}

// src/react/components/modals/HelpModal.jsx
import { useState as useState18 } from "react";
import { jsx as jsx23, jsxs as jsxs23 } from "react/jsx-runtime";
var TOOL_SHORTCUTS = [
  { keys: "H", action: "Pan" },
  { keys: "V / 1", action: "Selection" },
  { keys: "R / 2", action: "Rectangle" },
  { keys: "3", action: "Diamond" },
  { keys: "O / 4", action: "Circle" },
  { keys: "A / 5", action: "Arrow" },
  { keys: "L / 6", action: "Line" },
  { keys: "P / 7", action: "Freehand" },
  { keys: "T / 8", action: "Text" },
  { keys: "9", action: "Image" },
  { keys: "E / 0", action: "Eraser" },
  { keys: "F", action: "Frame" },
  { keys: "K", action: "Laser" }
];
var ACTION_SHORTCUTS = [
  { keys: "Ctrl+A", action: "Select All" },
  { keys: "Ctrl+G", action: "Group" },
  { keys: "Ctrl+Shift+G", action: "Ungroup" },
  { keys: "Ctrl+D", action: "Duplicate" },
  { keys: "Ctrl+S", action: "Quick Save (canvas + doc)" },
  { keys: "Ctrl+C", action: "Copy" },
  { keys: "Ctrl+V", action: "Paste" },
  { keys: "Ctrl+Z", action: "Undo" },
  { keys: "Ctrl+Shift+Z", action: "Redo" },
  { keys: "Esc", action: "Deselect" },
  { keys: "Del / Backspace", action: "Delete" },
  { keys: "Space (hold)", action: "Pan" },
  { keys: "Shift (hold)", action: "Straight Draw" }
];
var VIEW_SHORTCUTS = [
  { keys: "Ctrl++", action: "Zoom In" },
  { keys: "Ctrl+-", action: "Zoom Out" },
  { keys: "Ctrl+0", action: "Reset Zoom" },
  { keys: "Ctrl+'", action: "Toggle Grid" },
  { keys: "Ctrl+/", action: "Command Palette" }
];
var DOC_BLOCK_SHORTCUTS = [
  { keys: "# Space", action: "Heading 1" },
  { keys: "## Space", action: "Heading 2" },
  { keys: "### Space", action: "Heading 3" },
  { keys: "> Space", action: "Quote" },
  { keys: "- Space", action: "Bulleted list" },
  { keys: "1. Space", action: "Numbered list" },
  { keys: "[] Space", action: "Checklist" },
  { keys: "``` Space", action: "Code block" },
  { keys: "--- Enter", action: "Divider" },
  { keys: "/", action: "Block menu" }
];
var DOC_INLINE_SHORTCUTS = [
  { keys: "Ctrl+B", action: "Bold" },
  { keys: "Ctrl+I", action: "Italic" },
  { keys: "Ctrl+U", action: "Underline" },
  { keys: "Ctrl+Shift+S", action: "Strikethrough" },
  { keys: "Ctrl+E", action: "Inline code" },
  { keys: "Tab", action: "Indent block" },
  { keys: "Shift+Tab", action: "Outdent block" },
  { keys: "Ctrl+Z", action: "Undo" },
  { keys: "Ctrl+Shift+Z", action: "Redo" }
];
var TABS = [
  { id: "canvas", label: "Canvas", icon: "bx-pen" },
  { id: "docs", label: "Document", icon: "bxs-notepad" }
];
function ShortcutRow2({ keys, action }) {
  return /* @__PURE__ */ jsxs23("div", { className: "flex items-center justify-between py-1.5", children: [
    /* @__PURE__ */ jsx23("span", { className: "text-text-secondary text-xs", children: action }),
    /* @__PURE__ */ jsx23("div", { className: "flex items-center gap-1", children: keys.split("+").map((key, i) => /* @__PURE__ */ jsxs23("span", { children: [
      i > 0 && /* @__PURE__ */ jsx23("span", { className: "text-text-dim text-xs mx-0.5", children: "+" }),
      /* @__PURE__ */ jsx23("kbd", { className: "px-1.5 py-0.5 bg-surface-dark rounded text-text-muted text-xs border border-border font-[lixFont]", children: key.trim() })
    ] }, i)) })
  ] });
}
function ShortcutSection2({ title, shortcuts }) {
  return /* @__PURE__ */ jsxs23("div", { children: [
    /* @__PURE__ */ jsx23("h3", { className: "text-text-dim text-xs uppercase tracking-wider mb-2", children: title }),
    shortcuts.map((s) => /* @__PURE__ */ jsx23(ShortcutRow2, { keys: s.keys, action: s.action }, s.action))
  ] });
}
function HelpModal() {
  const open = useUIStore_default((s) => s.helpModalOpen);
  const toggleHelpModal = useUIStore_default((s) => s.toggleHelpModal);
  const [activeTab, setActiveTab] = useState18("canvas");
  if (!open) return null;
  return /* @__PURE__ */ jsxs23(
    "div",
    {
      className: "fixed inset-0 z-[9999] flex items-center justify-center font-[lixFont]",
      onClick: toggleHelpModal,
      children: [
        /* @__PURE__ */ jsx23("div", { className: "absolute inset-0 bg-black/60 backdrop-blur-sm" }),
        /* @__PURE__ */ jsxs23(
          "div",
          {
            className: "relative bg-surface-card border border-border-light rounded-2xl w-full max-w-[800px] mx-4 max-h-[85vh] flex flex-col",
            onClick: (e) => e.stopPropagation(),
            children: [
              /* @__PURE__ */ jsxs23("div", { className: "flex items-center justify-between px-6 pt-5 pb-3", children: [
                /* @__PURE__ */ jsx23("h2", { className: "text-text-primary text-base font-medium", children: "Shortcuts" }),
                /* @__PURE__ */ jsx23(
                  "button",
                  {
                    onClick: toggleHelpModal,
                    className: "w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all duration-200",
                    children: /* @__PURE__ */ jsx23("i", { className: "bx bx-x text-xl" })
                  }
                )
              ] }),
              /* @__PURE__ */ jsx23("div", { className: "flex items-center gap-1 px-6 pb-3", children: TABS.map((tab) => /* @__PURE__ */ jsxs23(
                "button",
                {
                  onClick: () => setActiveTab(tab.id),
                  className: `px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 transition-all duration-200 ${activeTab === tab.id ? "bg-surface-hover text-text-primary" : "text-text-muted hover:text-text-secondary hover:bg-surface-hover/50"}`,
                  children: [
                    /* @__PURE__ */ jsx23("i", { className: `bx ${tab.icon} text-sm` }),
                    tab.label
                  ]
                },
                tab.id
              )) }),
              /* @__PURE__ */ jsx23("hr", { className: "border-border-light mx-6" }),
              /* @__PURE__ */ jsxs23("div", { className: "flex-1 overflow-y-auto no-scrollbar px-6 py-4", children: [
                activeTab === "canvas" && /* @__PURE__ */ jsxs23("div", { className: "grid grid-cols-2 gap-6", children: [
                  /* @__PURE__ */ jsx23(ShortcutSection2, { title: "Tools", shortcuts: TOOL_SHORTCUTS }),
                  /* @__PURE__ */ jsxs23("div", { className: "flex flex-col gap-4", children: [
                    /* @__PURE__ */ jsx23(ShortcutSection2, { title: "Actions", shortcuts: ACTION_SHORTCUTS }),
                    /* @__PURE__ */ jsx23(ShortcutSection2, { title: "View", shortcuts: VIEW_SHORTCUTS })
                  ] })
                ] }),
                activeTab === "docs" && /* @__PURE__ */ jsxs23("div", { className: "grid grid-cols-2 gap-6", children: [
                  /* @__PURE__ */ jsx23(ShortcutSection2, { title: "Block markdown", shortcuts: DOC_BLOCK_SHORTCUTS }),
                  /* @__PURE__ */ jsx23(ShortcutSection2, { title: "Formatting", shortcuts: DOC_INLINE_SHORTCUTS })
                ] })
              ] }),
              /* @__PURE__ */ jsx23("hr", { className: "border-border-light mx-6" }),
              /* @__PURE__ */ jsxs23("div", { className: "flex items-center gap-3 px-6 py-4 flex-wrap", children: [
                /* @__PURE__ */ jsxs23(
                  "a",
                  {
                    href: "/docs",
                    className: "flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-blue/10 hover:bg-accent-blue/20 border border-accent-blue/20 text-accent-blue text-xs transition-all duration-200",
                    children: [
                      /* @__PURE__ */ jsx23("i", { className: "bx bx-book-open text-sm" }),
                      "Documentation"
                    ]
                  }
                ),
                /* @__PURE__ */ jsxs23(
                  "a",
                  {
                    href: "https://github.com/elixpo/sketch.elixpo",
                    target: "_blank",
                    rel: "noopener noreferrer",
                    className: "flex items-center gap-2 px-3 py-2 rounded-lg bg-surface hover:bg-surface-hover border border-border text-text-secondary text-xs transition-all duration-200",
                    children: [
                      /* @__PURE__ */ jsx23("i", { className: "bx bxl-github text-sm" }),
                      "View Repository"
                    ]
                  }
                ),
                /* @__PURE__ */ jsxs23(
                  "a",
                  {
                    href: "https://github.com/elixpo/sketch.elixpo/issues",
                    target: "_blank",
                    rel: "noopener noreferrer",
                    className: "flex items-center gap-2 px-3 py-2 rounded-lg bg-surface hover:bg-surface-hover border border-border text-text-secondary text-xs transition-all duration-200",
                    children: [
                      /* @__PURE__ */ jsx23("i", { className: "bx bx-bug text-sm" }),
                      "Report An Issue"
                    ]
                  }
                )
              ] })
            ]
          }
        )
      ]
    }
  );
}

// src/react/components/modals/LixScriptModal.jsx
import { useCallback as useCallback15, useEffect as useEffect13, useRef as useRef10, useState as useState19 } from "react";
import { jsx as jsx24, jsxs as jsxs24 } from "react/jsx-runtime";
var SAMPLE = `# LixScript \u2014 paste shapes / arrows in a simple DSL.
# Hit Cmd/Ctrl+Enter to render onto the canvas.

rect A "Idea" 100 100 220 90
rect B "Plan"  400 100 220 90
rect C "Ship"  700 100 220 90

arrow A -> B
arrow B -> C
`;
function LixScriptModal() {
  const open = useUIStore_default((s) => s.aiModalOpen);
  const toggle = useUIStore_default((s) => s.toggleAIModal);
  const [source, setSource] = useState19(SAMPLE);
  const [busy, setBusy] = useState19(false);
  const [status, setStatus] = useState19(null);
  const taRef = useRef10(null);
  useEffect13(() => {
    if (!open) return;
    requestAnimationFrame(() => taRef.current?.focus());
    const onKey = (e) => {
      if (e.key === "Escape") toggle();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, toggle]);
  const render = useCallback15(async () => {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const mod = await import("./LixScriptParser-JYWJX375.js");
      const parsed = mod.parseLixScript(source);
      const resolved = mod.resolveShapeRefs ? mod.resolveShapeRefs(parsed) : parsed;
      mod.renderLixScript(resolved);
      setStatus({ tone: "success", message: `Rendered ${Array.isArray(resolved) ? resolved.length : "?"} elements.` });
      setTimeout(() => {
        toggle();
      }, 700);
    } catch (err) {
      console.warn("[LixScriptModal] parse failed:", err);
      setStatus({ tone: "error", message: err?.message || "Parse failed." });
    } finally {
      setBusy(false);
    }
  }, [source, busy, toggle]);
  const handleKeyDown = useCallback15((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      render();
    }
  }, [render]);
  if (!open) return null;
  return /* @__PURE__ */ jsx24(
    "div",
    {
      className: "fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-sm font-[lixFont]",
      onClick: toggle,
      role: "dialog",
      "aria-modal": "true",
      children: /* @__PURE__ */ jsxs24(
        "div",
        {
          onClick: (e) => e.stopPropagation(),
          className: "relative w-[560px] max-w-[94vw] bg-surface border border-border-light rounded-2xl p-5 shadow-2xl flex flex-col gap-3",
          children: [
            /* @__PURE__ */ jsx24(
              "button",
              {
                onClick: toggle,
                className: "absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors",
                title: "Close (Esc)",
                children: /* @__PURE__ */ jsx24("i", { className: "bx bx-x text-lg" })
              }
            ),
            /* @__PURE__ */ jsxs24("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx24("div", { className: "w-8 h-8 rounded-lg bg-accent-blue/10 border border-accent-blue/30 flex items-center justify-center", children: /* @__PURE__ */ jsx24("i", { className: "bx bx-code-alt text-accent-blue" }) }),
              /* @__PURE__ */ jsxs24("div", { className: "flex-1", children: [
                /* @__PURE__ */ jsx24("h2", { className: "text-text-primary text-sm font-medium", children: "LixScript" }),
                /* @__PURE__ */ jsx24("p", { className: "text-text-dim text-[11px]", children: "Type shapes + arrows, render directly. No AI involved." })
              ] })
            ] }),
            /* @__PURE__ */ jsx24(
              "textarea",
              {
                ref: taRef,
                value: source,
                onChange: (e) => setSource(e.target.value),
                onKeyDown: handleKeyDown,
                spellCheck: false,
                className: "w-full h-[260px] resize-none bg-surface-card border border-border-light rounded-lg px-3 py-2 text-[12px] text-text-primary font-[lixCode] outline-none focus:border-accent-blue/50"
              }
            ),
            /* @__PURE__ */ jsxs24("div", { className: "flex items-center justify-between", children: [
              status ? /* @__PURE__ */ jsx24("span", { className: `text-[11px] ${status.tone === "error" ? "text-red-400" : "text-green-400"}`, children: status.message }) : /* @__PURE__ */ jsx24("span", { className: "text-text-dim text-[11px]", children: "Cmd/Ctrl+Enter to render \xB7 Esc to close" }),
              /* @__PURE__ */ jsx24(
                "button",
                {
                  onClick: render,
                  disabled: busy,
                  className: "px-3 py-1.5 rounded-lg bg-accent-blue text-text-primary text-[12px] font-medium hover:bg-accent-blue-hover transition-colors disabled:opacity-50 disabled:pointer-events-none",
                  children: busy ? "Rendering\u2026" : "Render"
                }
              )
            ] })
          ]
        }
      )
    }
  );
}

// src/react/components/modals/GraphModal.jsx
import { useCallback as useCallback16, useEffect as useEffect14, useRef as useRef11, useState as useState20 } from "react";
import { jsx as jsx25, jsxs as jsxs25 } from "react/jsx-runtime";
var SAMPLE2 = `# One equation per line. Comments start with #.
# Hit Cmd/Ctrl+Enter to render onto the canvas.

y = x^2
y = sin(x) * 3
y = -x + 2
`;
var DEFAULT_SETTINGS = { xMin: -10, xMax: 10, yMin: -10, yMax: 10, showGrid: true };
function parseEquations(text) {
  return text.split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith("#"));
}
function GraphModal() {
  const open = useUIStore_default((s) => s.graphModalOpen);
  const toggle = useUIStore_default((s) => s.toggleGraphModal);
  const [source, setSource] = useState20(SAMPLE2);
  const [settings, setSettings] = useState20(DEFAULT_SETTINGS);
  const [busy, setBusy] = useState20(false);
  const [status, setStatus] = useState20(null);
  const taRef = useRef11(null);
  useEffect14(() => {
    if (!open) return;
    requestAnimationFrame(() => taRef.current?.focus());
    const onKey = (e) => {
      if (e.key === "Escape") toggle();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, toggle]);
  const render = useCallback16(async () => {
    if (busy) return;
    setBusy(true);
    setStatus(null);
    try {
      const equations = parseEquations(source);
      if (equations.length === 0) {
        setStatus({ tone: "error", message: "Add at least one equation." });
        return;
      }
      const { parseExpression } = await import("./GraphMathParser-2WMTY4IE.js");
      const bad = equations.find((eq) => !parseExpression(eq));
      if (bad) {
        setStatus({ tone: "error", message: `Could not parse: ${bad}` });
        return;
      }
      if (typeof window.__graphRenderer === "function") {
        window.__graphRenderer(equations, settings);
        setStatus({ tone: "success", message: `Plotted ${equations.length} equation(s).` });
        setTimeout(() => {
          toggle();
        }, 700);
      } else {
        setStatus({ tone: "error", message: "Graph engine not ready yet \u2014 wait a moment and retry." });
      }
    } catch (err) {
      console.warn("[GraphModal] render failed:", err);
      setStatus({ tone: "error", message: err?.message || "Render failed." });
    } finally {
      setBusy(false);
    }
  }, [source, settings, busy, toggle]);
  const handleKeyDown = useCallback16((e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      render();
    }
  }, [render]);
  const setRange = (key) => (e) => {
    const v = parseFloat(e.target.value);
    if (Number.isFinite(v)) setSettings((s) => ({ ...s, [key]: v }));
  };
  if (!open) return null;
  return /* @__PURE__ */ jsx25(
    "div",
    {
      className: "fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 backdrop-blur-sm font-[lixFont]",
      onClick: toggle,
      role: "dialog",
      "aria-modal": "true",
      children: /* @__PURE__ */ jsxs25(
        "div",
        {
          onClick: (e) => e.stopPropagation(),
          className: "relative w-[560px] max-w-[94vw] bg-surface border border-border-light rounded-2xl p-5 shadow-2xl flex flex-col gap-3",
          children: [
            /* @__PURE__ */ jsx25(
              "button",
              {
                onClick: toggle,
                className: "absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors",
                title: "Close (Esc)",
                children: /* @__PURE__ */ jsx25("i", { className: "bx bx-x text-lg" })
              }
            ),
            /* @__PURE__ */ jsxs25("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ jsx25("div", { className: "w-8 h-8 rounded-lg bg-accent-blue/10 border border-accent-blue/30 flex items-center justify-center", children: /* @__PURE__ */ jsx25("i", { className: "bx bx-line-chart text-accent-blue" }) }),
              /* @__PURE__ */ jsxs25("div", { className: "flex-1", children: [
                /* @__PURE__ */ jsx25("h2", { className: "text-text-primary text-sm font-medium", children: "Graph" }),
                /* @__PURE__ */ jsx25("p", { className: "text-text-dim text-[11px]", children: "One equation per line \u2014 plotted on the canvas. No AI involved." })
              ] })
            ] }),
            /* @__PURE__ */ jsx25(
              "textarea",
              {
                ref: taRef,
                value: source,
                onChange: (e) => setSource(e.target.value),
                onKeyDown: handleKeyDown,
                spellCheck: false,
                className: "w-full h-[200px] resize-none bg-surface-card border border-border-light rounded-lg px-3 py-2 text-[12px] text-text-primary font-[lixCode] outline-none focus:border-accent-blue/50"
              }
            ),
            /* @__PURE__ */ jsxs25("div", { className: "grid grid-cols-4 gap-2 text-[11px]", children: [
              /* @__PURE__ */ jsxs25("label", { className: "flex flex-col gap-0.5", children: [
                /* @__PURE__ */ jsx25("span", { className: "text-text-dim", children: "xMin" }),
                /* @__PURE__ */ jsx25(
                  "input",
                  {
                    type: "number",
                    value: settings.xMin,
                    onChange: setRange("xMin"),
                    className: "bg-surface-card border border-border-light rounded px-2 py-1 text-text-primary outline-none focus:border-accent-blue/50"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs25("label", { className: "flex flex-col gap-0.5", children: [
                /* @__PURE__ */ jsx25("span", { className: "text-text-dim", children: "xMax" }),
                /* @__PURE__ */ jsx25(
                  "input",
                  {
                    type: "number",
                    value: settings.xMax,
                    onChange: setRange("xMax"),
                    className: "bg-surface-card border border-border-light rounded px-2 py-1 text-text-primary outline-none focus:border-accent-blue/50"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs25("label", { className: "flex flex-col gap-0.5", children: [
                /* @__PURE__ */ jsx25("span", { className: "text-text-dim", children: "yMin" }),
                /* @__PURE__ */ jsx25(
                  "input",
                  {
                    type: "number",
                    value: settings.yMin,
                    onChange: setRange("yMin"),
                    className: "bg-surface-card border border-border-light rounded px-2 py-1 text-text-primary outline-none focus:border-accent-blue/50"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxs25("label", { className: "flex flex-col gap-0.5", children: [
                /* @__PURE__ */ jsx25("span", { className: "text-text-dim", children: "yMax" }),
                /* @__PURE__ */ jsx25(
                  "input",
                  {
                    type: "number",
                    value: settings.yMax,
                    onChange: setRange("yMax"),
                    className: "bg-surface-card border border-border-light rounded px-2 py-1 text-text-primary outline-none focus:border-accent-blue/50"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxs25("div", { className: "flex items-center justify-between", children: [
              status ? /* @__PURE__ */ jsx25("span", { className: `text-[11px] ${status.tone === "error" ? "text-red-400" : "text-green-400"}`, children: status.message }) : /* @__PURE__ */ jsx25("span", { className: "text-text-dim text-[11px]", children: "Cmd/Ctrl+Enter to render \xB7 Esc to close" }),
              /* @__PURE__ */ jsx25(
                "button",
                {
                  onClick: render,
                  disabled: busy,
                  className: "px-3 py-1.5 rounded-lg bg-accent-blue text-text-primary text-[12px] font-medium hover:bg-accent-blue-hover transition-colors disabled:opacity-50 disabled:pointer-events-none",
                  children: busy ? "Plotting\u2026" : "Plot"
                }
              )
            ] })
          ]
        }
      )
    }
  );
}

// src/react/LixSketchCanvas.jsx
import { jsx as jsx26, jsxs as jsxs26 } from "react/jsx-runtime";
var _saveScene = null;
var _loadScene = null;
async function ensureSceneSerializer() {
  if (_saveScene && _loadScene) return;
  const m = await import("./SceneSerializer-ESK6A5WB.js");
  _saveScene = m.saveScene;
  _loadScene = m.loadScene;
}
var SAVE_DEBOUNCE_MS = 1500;
function LixSketchCanvas({
  initialScene = null,
  onSceneChange = null,
  onUploadImage = null,
  onExit = null,
  className = "",
  style = null
}) {
  const wrapperRef = useRef12(null);
  const lastSceneJsonRef = useRef12("");
  const debounceRef = useRef12(null);
  const [bootstrapped, setBootstrapped] = useState21(false);
  useEffect15(() => {
    installImageUploadBridge(onUploadImage);
  }, [onUploadImage]);
  useEffect15(() => {
    if (typeof document === "undefined" || !document.fonts?.load) return;
    Promise.allSettled([
      document.fonts.load("1em lixFont"),
      document.fonts.load("1em lixCode")
    ]).catch(() => {
    });
  }, []);
  useEffect15(() => {
    if (!initialScene || bootstrapped) return;
    let cancelled = false;
    async function tryLoad() {
      if (cancelled) return;
      const serializer = window.__sceneSerializer;
      if (!serializer) {
        setTimeout(tryLoad, 200);
        return;
      }
      try {
        await ensureSceneSerializer();
        if (cancelled) return;
        const data = typeof initialScene === "string" ? JSON.parse(initialScene) : initialScene;
        if (data && data.format === "lixsketch") {
          _loadScene(data);
          lastSceneJsonRef.current = JSON.stringify(data);
        }
      } catch (err) {
        console.warn("[LixSketchCanvas] initialScene load failed:", err);
      }
      setBootstrapped(true);
    }
    tryLoad();
    return () => {
      cancelled = true;
    };
  }, [initialScene, bootstrapped]);
  useEffect15(() => {
    function handleKey(e) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = (e.key || "").toLowerCase();
      if (key !== "s" || e.shiftKey) return;
      e.preventDefault();
      (async () => {
        try {
          await ensureSceneSerializer();
          const scene = _saveScene("Untitled");
          const json = JSON.stringify(scene);
          lastSceneJsonRef.current = json;
          if (onSceneChange) {
            const metadata = {
              shapeCount: Array.isArray(scene.shapes) ? scene.shapes.length : 0,
              viewport: scene.viewport || null,
              zoom: scene.zoom || 1,
              sizeBytes: json.length,
              savedAt: Date.now()
            };
            onSceneChange(scene, metadata);
          }
          const toast = document.getElementById("lixsketch-save-toast");
          if (toast) {
            toast.classList.remove("hidden");
            clearTimeout(toast._hideTimer);
            toast._hideTimer = setTimeout(() => toast.classList.add("hidden"), 1800);
          }
          useUIStore_default.getState().setSaveStatus?.("cloud");
        } catch (err) {
          console.warn("[LixSketchCanvas] Ctrl+S save failed:", err);
        }
      })();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onSceneChange]);
  useEffect15(() => {
    if (!onSceneChange) return;
    let svg = null;
    let observer = null;
    const flush = async () => {
      try {
        await ensureSceneSerializer();
        const scene = _saveScene("Untitled");
        const json = JSON.stringify(scene);
        if (json === lastSceneJsonRef.current) return;
        lastSceneJsonRef.current = json;
        const metadata = {
          shapeCount: Array.isArray(scene.shapes) ? scene.shapes.length : 0,
          viewport: scene.viewport || null,
          zoom: scene.zoom || 1,
          sizeBytes: json.length,
          savedAt: Date.now()
        };
        onSceneChange(scene, metadata);
      } catch (err) {
        console.warn("[LixSketchCanvas] save failed:", err);
      }
    };
    const debounced = () => {
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(flush, SAVE_DEBOUNCE_MS);
    };
    function attach() {
      svg = window.svg;
      if (!svg) {
        setTimeout(attach, 200);
        return;
      }
      observer = new MutationObserver(debounced);
      observer.observe(svg, { childList: true, subtree: true, attributes: true });
      svg.addEventListener("mouseup", debounced);
    }
    attach();
    window.addEventListener("beforeunload", flush);
    return () => {
      if (observer) observer.disconnect();
      if (svg) svg.removeEventListener("mouseup", debounced);
      window.removeEventListener("beforeunload", flush);
      clearTimeout(debounceRef.current);
    };
  }, [onSceneChange]);
  return /* @__PURE__ */ jsxs26(
    "div",
    {
      ref: wrapperRef,
      className: `lixsketch-canvas-root canvas-mode ${className}`,
      style,
      children: [
        /* @__PURE__ */ jsx26(SVGCanvas, {}),
        /* @__PURE__ */ jsx26(Toolbar, {}),
        /* @__PURE__ */ jsx26(Footer, {}),
        /* @__PURE__ */ jsx26(AppMenu, {}),
        /* @__PURE__ */ jsx26(RectangleSidebar, {}),
        /* @__PURE__ */ jsx26(CircleSidebar, {}),
        /* @__PURE__ */ jsx26(LineSidebar, {}),
        /* @__PURE__ */ jsx26(ArrowSidebar, {}),
        /* @__PURE__ */ jsx26(PaintbrushSidebar, {}),
        /* @__PURE__ */ jsx26(TextSidebar, {}),
        /* @__PURE__ */ jsx26(FrameSidebar, {}),
        /* @__PURE__ */ jsx26(IconSidebar, {}),
        /* @__PURE__ */ jsx26(ImageSidebar, {}),
        /* @__PURE__ */ jsx26(MultiSelectActions, {}),
        /* @__PURE__ */ jsx26(ShortcutsModal, {}),
        /* @__PURE__ */ jsx26(CommandPalette, {}),
        /* @__PURE__ */ jsx26(ExportImageModal, {}),
        /* @__PURE__ */ jsx26(HelpModal, {}),
        /* @__PURE__ */ jsx26(LixScriptModal, {}),
        /* @__PURE__ */ jsx26(GraphModal, {}),
        /* @__PURE__ */ jsx26(ContextMenu, {}),
        /* @__PURE__ */ jsx26(FindBar, {}),
        /* @__PURE__ */ jsx26(ImageSourcePicker, {}),
        /* @__PURE__ */ jsx26(CanvasLoadingOverlay, {}),
        /* @__PURE__ */ jsxs26("div", { className: "lixsketch-floating-header absolute top-2 right-2 z-[1000] flex items-center gap-1.5 font-[lixFont]", children: [
          /* @__PURE__ */ jsx26(
            "button",
            {
              type: "button",
              title: "LixScript \u2014 write shapes in DSL",
              onClick: () => useUIStore_default.getState().toggleAIModal?.(),
              className: "w-9 h-9 flex items-center justify-center rounded-lg bg-surface border border-border-light text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors",
              children: /* @__PURE__ */ jsx26("i", { className: "bx bx-code-alt text-base" })
            }
          ),
          /* @__PURE__ */ jsx26(
            "button",
            {
              type: "button",
              title: "Graph \u2014 plot equations",
              onClick: () => useUIStore_default.getState().toggleGraphModal?.(),
              className: "w-9 h-9 flex items-center justify-center rounded-lg bg-surface border border-border-light text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors",
              children: /* @__PURE__ */ jsx26("i", { className: "bx bx-line-chart text-base" })
            }
          ),
          /* @__PURE__ */ jsx26(
            "button",
            {
              type: "button",
              title: "Help (?)",
              onClick: () => useUIStore_default.getState().toggleHelpModal?.(),
              className: "w-9 h-9 flex items-center justify-center rounded-lg bg-surface border border-border-light text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors",
              children: /* @__PURE__ */ jsx26("i", { className: "bx bx-help-circle text-base" })
            }
          ),
          /* @__PURE__ */ jsx26(
            "button",
            {
              type: "button",
              title: "Shortcuts (Ctrl+/)",
              onClick: () => useUIStore_default.getState().toggleShortcutsModal?.(),
              className: "w-9 h-9 flex items-center justify-center rounded-lg bg-surface border border-border-light text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors",
              children: /* @__PURE__ */ jsx26("i", { className: "bx bx-command text-base" })
            }
          ),
          /* @__PURE__ */ jsx26(
            "button",
            {
              type: "button",
              title: "Menu",
              onClick: () => useUIStore_default.getState().toggleMenu?.(),
              className: "w-9 h-9 flex items-center justify-center rounded-lg bg-surface border border-border-light text-text-muted hover:text-text-primary hover:bg-surface-hover transition-colors",
              children: /* @__PURE__ */ jsx26("i", { className: "bx bx-menu text-base" })
            }
          )
        ] }),
        /* @__PURE__ */ jsxs26(
          "div",
          {
            id: "lixsketch-save-toast",
            className: "hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 rounded-xl bg-surface/85 backdrop-blur-md border border-border-light text-text-secondary text-xs font-[lixFont] pointer-events-none",
            children: [
              /* @__PURE__ */ jsx26("i", { className: "bx bx-check text-green-400 mr-1.5" }),
              "Saved"
            ]
          }
        )
      ]
    }
  );
}
function installImageUploadBridge(onUploadImage) {
  if (typeof window === "undefined") return;
  if (!onUploadImage) {
    window.uploadImageToCloudinary = async () => {
    };
    return;
  }
  window.uploadImageToCloudinary = async function bridgedUpload(imageShape) {
    const href = imageShape?.element?.getAttribute("href") || "";
    if (!href.startsWith("data:")) return;
    imageShape.uploadStatus = "uploading";
    imageShape.uploadAbortController = new AbortController();
    const signal = imageShape.uploadAbortController.signal;
    imageShape.showUploadIndicator?.();
    try {
      let payloadDataUrl = href;
      try {
        const compressed = await compressImage(href);
        if (compressed?.dataUrl) payloadDataUrl = compressed.dataUrl;
      } catch (err) {
        console.warn("[LixSketchCanvas] compression failed, sending raw:", err);
      }
      if (signal.aborted) return;
      const result = await onUploadImage(payloadDataUrl);
      if (signal.aborted) return;
      if (!result?.url) throw new Error(result?.error || "Upload failed");
      imageShape.element.setAttribute("href", result.url);
      imageShape.element.setAttribute("data-href", result.url);
      if (result.publicId) imageShape.element.setAttribute("data-cloudinary-id", result.publicId);
      if (typeof result.sizeBytes === "number") {
        const oldSize = imageShape.element.__fileSize || 0;
        imageShape.element.__fileSize = result.sizeBytes;
        window.__roomImageBytesUsed = Math.max(
          0,
          (window.__roomImageBytesUsed || 0) - oldSize + result.sizeBytes
        );
      }
      imageShape.uploadStatus = "done";
    } catch (err) {
      if (!signal.aborted) {
        console.warn("[LixSketchCanvas] upload failed:", err);
        imageShape.uploadStatus = "failed";
      }
    } finally {
      imageShape.removeUploadIndicator?.();
      imageShape.uploadAbortController = null;
    }
  };
}

// src/react/toolsEnum.js
var TOOLS2 = {
  SELECT: "select",
  PAN: "pan",
  RECTANGLE: "rectangle",
  CIRCLE: "circle",
  LINE: "line",
  ARROW: "arrow",
  FREEHAND: "freehand",
  TEXT: "text",
  CODE: "code",
  ERASER: "eraser",
  LASER: "laser",
  IMAGE: "image",
  FRAME: "frame",
  ICON: "icon"
};

// src/EngineShortcuts.js
var SHORTCUT_MAP2 = {
  h: "pan",
  v: "select",
  1: "select",
  r: "rectangle",
  2: "rectangle",
  o: "circle",
  4: "circle",
  a: "arrow",
  5: "arrow",
  l: "line",
  6: "line",
  p: "freehand",
  7: "freehand",
  t: "text",
  8: "text",
  9: "image",
  e: "eraser",
  0: "eraser",
  i: "icon",
  f: "frame",
  k: "laser"
};
var TOOLS3 = {
  SELECT: "select",
  PAN: "pan",
  RECTANGLE: "rectangle",
  CIRCLE: "circle",
  LINE: "line",
  ARROW: "arrow",
  FREEHAND: "freehand",
  TEXT: "text",
  CODE: "code",
  ERASER: "eraser",
  LASER: "laser",
  IMAGE: "image",
  FRAME: "frame",
  ICON: "icon"
};
function isTypingTarget(target) {
  if (!target) return false;
  const tag = (target.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea") return true;
  if (target.isContentEditable) return true;
  return false;
}
function installEngineShortcuts(engine, options = {}) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return () => {
    };
  }
  const onToast = typeof options.onToast === "function" ? options.onToast : () => {
  };
  const skipWhen = typeof options.skipWhen === "function" ? options.skipWhen : null;
  const customSetTool = typeof options.setActiveTool === "function" ? options.setActiveTool : null;
  function setTool(tool) {
    if (customSetTool) {
      customSetTool(tool);
      return;
    }
    if (engine?.setActiveTool) engine.setActiveTool(tool);
  }
  function getActiveTool() {
    return engine?.activeTool || engine?.getActiveTool?.() || null;
  }
  function handleKeyDown(e) {
    const key = (e.key || "").toLowerCase();
    const isMod = e.ctrlKey || e.metaKey;
    if (isTypingTarget(e.target)) return;
    if (document.querySelector(".text-edit-overlay:not(.hidden)")) return;
    if (skipWhen && skipWhen(e)) return;
    if (isMod) {
      if (key === "a" && !e.shiftKey) {
        e.preventDefault();
        setTool(TOOLS3.SELECT);
        if (window.multiSelection && Array.isArray(window.shapes)) {
          window.multiSelection.clearSelection();
          window.shapes.forEach((shape) => window.multiSelection.addShape(shape));
        }
        return;
      }
      if (key === "g" && !e.shiftKey) {
        e.preventDefault();
        try {
          const ms = window.multiSelection;
          const sel = ms?.selectedShapes;
          const targets = sel && sel.size > 1 ? Array.from(sel) : window.currentShape ? [window.currentShape] : [];
          if (targets.length > 1) {
            const newId = `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
            for (const s of targets) s.groupId = newId;
            if (typeof ms?.updateControls === "function") ms.updateControls();
            onToast(`Grouped ${targets.length} shapes`, { tone: "success" });
          }
        } catch (err) {
          console.warn("[EngineShortcuts] group failed:", err);
        }
        return;
      }
      if (key === "g" && e.shiftKey) {
        e.preventDefault();
        try {
          const ms = window.multiSelection;
          const sel = ms?.selectedShapes;
          const targets = sel && sel.size > 0 ? Array.from(sel) : window.currentShape ? [window.currentShape] : [];
          const groupIds = new Set(targets.map((s) => s.groupId).filter(Boolean));
          if (groupIds.size > 0 && Array.isArray(window.shapes)) {
            let cleared = 0;
            for (const s of window.shapes) {
              if (s.groupId && groupIds.has(s.groupId)) {
                s.groupId = null;
                cleared++;
              }
            }
            if (typeof ms?.updateControls === "function") ms.updateControls();
            onToast(`Ungrouped ${cleared} shapes`, { tone: "success" });
          }
        } catch (err) {
          console.warn("[EngineShortcuts] ungroup failed:", err);
        }
        return;
      }
      if (key === "d") {
        e.preventDefault();
        return;
      }
      return;
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      if (window.multiSelection?.selectedShapes?.size > 0) {
        if (typeof window.deleteSelectedShapes === "function") {
          window.deleteSelectedShapes();
        }
        return;
      }
      if (window.currentShape) {
        const shape = window.currentShape;
        const shapes = window.shapes;
        if (shapes) {
          const idx = shapes.indexOf(shape);
          if (idx !== -1) shapes.splice(idx, 1);
        }
        if (typeof window.cleanupAttachments === "function") {
          window.cleanupAttachments(shape);
        }
        if (shape.parentFrame && typeof shape.parentFrame.removeShapeFromFrame === "function") {
          shape.parentFrame.removeShapeFromFrame(shape);
        }
        const el = shape.group || shape.element;
        if (el && el.parentNode) el.parentNode.removeChild(el);
        if (typeof window.pushDeleteAction === "function") {
          window.pushDeleteAction(shape);
        }
        window.currentShape = null;
        if (typeof window.disableAllSideBars === "function") {
          window.disableAllSideBars();
        }
      }
      return;
    }
    if (!e.shiftKey && !e.altKey) {
      const tool = SHORTCUT_MAP2[key];
      if (tool) {
        e.preventDefault();
        setTool(tool);
        return;
      }
      if (e.key === "Escape") {
        window.currentShape = null;
        if (typeof window.disableAllSideBars === "function") {
          window.disableAllSideBars();
        }
        return;
      }
    }
  }
  let spaceHeld = false;
  let toolBeforeSpace = null;
  function handleSpaceDown(e) {
    if (e.code !== "Space" || spaceHeld) return;
    if (isTypingTarget(e.target)) return;
    if (skipWhen && skipWhen(e)) return;
    e.preventDefault();
    spaceHeld = true;
    const active = getActiveTool();
    if (active && active !== TOOLS3.PAN) {
      toolBeforeSpace = active;
      setTool(TOOLS3.PAN);
    }
  }
  function handleKeyUp(e) {
    if (e.code === "Space" && spaceHeld) {
      spaceHeld = false;
      if (toolBeforeSpace) {
        setTool(toolBeforeSpace);
        toolBeforeSpace = null;
      }
    }
  }
  function handleWheel(e) {
    if (e.ctrlKey || e.metaKey) e.preventDefault();
  }
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keydown", handleSpaceDown);
  document.addEventListener("keyup", handleKeyUp);
  document.addEventListener("wheel", handleWheel, { passive: false });
  return function uninstall() {
    document.removeEventListener("keydown", handleKeyDown);
    document.removeEventListener("keydown", handleSpaceDown);
    document.removeEventListener("keyup", handleKeyUp);
    document.removeEventListener("wheel", handleWheel);
  };
}
export {
  ALLOWED_IMAGE_EXTENSIONS,
  ALLOWED_IMAGE_MIME_TYPES,
  IMAGE_ACCEPT_ATTR,
  LixSketchCanvas,
  SHORTCUT_MAP2 as SHORTCUT_MAP,
  TOOLS2 as TOOLS,
  compressImage,
  installEngineShortcuts,
  isAllowedImage,
  isAllowedImageDataUrl
};
//# sourceMappingURL=index.js.map
