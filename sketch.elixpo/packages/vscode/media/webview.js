/* eslint-disable */
/**
 * LixSketch VS Code Webview Bridge
 *
 * Connects the @lixsketch/engine (loaded as IIFE global `LixSketch`)
 * to the VS Code extension via postMessage.
 */
(function () {
    const vscode = acquireVsCodeApi();

    const svgEl = document.getElementById('canvas-svg');
    if (!svgEl) {
        console.error('[LixSketch Webview] SVG element not found');
        return;
    }

    // Set initial viewBox
    svgEl.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);

    let engine = null;
    let saveTimeout = null;
    let isLoading = false;

    // ── Toolbar ──
    const toolBtns = document.querySelectorAll('.tool-btn[data-tool]');
    toolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tool = btn.getAttribute('data-tool');
            if (engine) engine.setActiveTool(tool);
            toolBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Keyboard shortcuts
    const shortcutMap = {
        'v': 'select', 'h': 'pan', 'r': 'rectangle', 'c': 'circle',
        'a': 'arrow', 'l': 'line', 't': 'text', 'd': 'freehand',
        'e': 'eraser', 'f': 'frame',
    };

    document.addEventListener('keydown', (e) => {
        // Don't intercept when typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

        const tool = shortcutMap[e.key.toLowerCase()];
        if (tool && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            if (engine) engine.setActiveTool(tool);
            toolBtns.forEach(b => b.classList.remove('active'));
            const active = document.querySelector(`.tool-btn[data-tool="${tool}"]`);
            if (active) active.classList.add('active');
        }

        // Ctrl+Z / Ctrl+Shift+Z for undo/redo
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                if (engine && engine.redo) engine.redo();
            } else {
                if (engine && engine.undo) engine.undo();
            }
        }
    });

    // ── Auto-save: debounce scene changes back to VS Code ──
    function scheduleAutoSave() {
        if (isLoading) return;
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            if (!engine || !engine.scene) return;
            try {
                const sceneData = engine.scene.save('VS Code Diagram');
                if (sceneData) {
                    const json = typeof sceneData === 'string' ? sceneData : JSON.stringify(sceneData, null, 2);
                    vscode.postMessage({ type: 'update', content: json });
                }
            } catch (err) {
                console.warn('[LixSketch Webview] Auto-save error:', err);
            }
        }, 500);
    }

    // Watch for DOM mutations on the SVG (shape additions, removals, attribute changes)
    const observer = new MutationObserver(() => {
        scheduleAutoSave();
    });

    // ── Initialize engine ──
    async function initEngine() {
        try {
            const { createSketchEngine } = LixSketch;
            engine = createSketchEngine(svgEl, {
                initialZoom: 1,
                minZoom: 0.4,
                maxZoom: 30,
                onEvent: (type, data) => {
                    if (type === 'zoom:change') {
                        const pct = document.getElementById('zoomPercent');
                        if (pct) pct.textContent = Math.round(data * 100) + '%';
                    }
                },
            });

            await engine.init();

            // Start observing SVG for changes -> auto-save
            observer.observe(svgEl, {
                childList: true,
                subtree: true,
                attributes: true,
                characterData: true,
            });

            // Also listen for mouseup/keyup as save triggers
            svgEl.addEventListener('mouseup', scheduleAutoSave);
            document.addEventListener('keyup', scheduleAutoSave);

            // Zoom controls
            const zoomInBtn = document.getElementById('zoomIn');
            const zoomOutBtn = document.getElementById('zoomOut');
            if (zoomInBtn && window.zoomIn) zoomInBtn.addEventListener('click', window.zoomIn);
            if (zoomOutBtn && window.zoomOut) zoomOutBtn.addEventListener('click', window.zoomOut);

            console.log('[LixSketch Webview] Engine initialized');

            // Tell extension we're ready to receive content
            vscode.postMessage({ type: 'ready' });
        } catch (err) {
            console.error('[LixSketch Webview] Engine init failed:', err);
        }
    }

    // ── Handle messages from extension ──
    window.addEventListener('message', (event) => {
        const msg = event.data;
        if (!msg) return;

        switch (msg.type) {
            case 'load':
                if (!engine || !engine.scene) {
                    // Engine not ready yet, retry after a short delay
                    setTimeout(() => {
                        window.dispatchEvent(new MessageEvent('message', { data: msg }));
                    }, 200);
                    return;
                }

                try {
                    isLoading = true;
                    const content = msg.content.trim();
                    if (content && content !== '{}' && content !== '') {
                        const sceneData = JSON.parse(content);
                        if (sceneData.shapes && sceneData.shapes.length > 0) {
                            engine.scene.load(sceneData);
                        }
                    }
                } catch (err) {
                    console.warn('[LixSketch Webview] Failed to load scene:', err);
                } finally {
                    setTimeout(() => { isLoading = false; }, 300);
                }
                break;
        }
    });

    // Resize handler
    window.addEventListener('resize', () => {
        if (svgEl && window.currentViewBox) {
            // The engine's ZoomPan handles resize internally
        }
    });

    // Start
    initEngine();
})();
