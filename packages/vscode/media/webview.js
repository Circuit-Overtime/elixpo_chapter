/* eslint-disable */
/**
 * LixSketch VS Code Webview Bridge
 *
 * Connects the @lixsketch/engine (loaded as IIFE global `LixSketch`)
 * to the VS Code extension via postMessage. Exact UI behavior matching the website.
 */
(function () {
    const vscode = acquireVsCodeApi();

    const svgEl = document.getElementById('freehand-canvas');
    if (!svgEl) {
        console.error('[LixSketch Webview] SVG element not found');
        return;
    }

    // Set initial viewBox
    svgEl.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);

    let engine = null;
    let saveTimeout = null;
    let isLoading = false;
    let toolLocked = false;
    let activeSidebar = null;

    // ═══════════ TOOLBAR ═══════════

    const toolBtns = document.querySelectorAll('.tool-btn[data-tool]');
    const toolLockBtn = document.querySelector('.tool-btn[data-action="toollock"]');

    function setActiveTool(tool) {
        if (engine) engine.setActiveTool(tool);
        toolBtns.forEach(b => b.classList.remove('active'));
        const activeBtn = document.querySelector(`.tool-btn[data-tool="${tool}"]`);
        if (activeBtn) activeBtn.classList.add('active');
        updateSidebar(tool);
    }

    toolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            setActiveTool(btn.getAttribute('data-tool'));
        });
    });

    // Tool lock
    if (toolLockBtn) {
        toolLockBtn.addEventListener('click', () => {
            toolLocked = !toolLocked;
            toolLockBtn.classList.toggle('active', toolLocked);
            const icon = toolLockBtn.querySelector('i');
            if (icon) {
                icon.className = toolLocked ? 'bx bxs-lock-alt' : 'bx bx-lock-alt';
            }
        });
    }

    // Keyboard shortcuts
    const shortcutMap = {
        'v': 'select', 'h': 'pan', 'r': 'rectangle', 'o': 'circle',
        'a': 'arrow', 'l': 'line', 't': 'text', 'p': 'freehand',
        'e': 'eraser', 'f': 'frame', 'k': 'laser', 'd': 'freehand',
        '9': 'image',
    };

    document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

        const tool = shortcutMap[e.key.toLowerCase()];
        if (tool && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            setActiveTool(tool);
        }

        // Q = tool lock
        if (e.key.toLowerCase() === 'q' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            if (toolLockBtn) toolLockBtn.click();
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

        // Ctrl+0 = reset zoom
        if ((e.ctrlKey || e.metaKey) && e.key === '0') {
            e.preventDefault();
            if (window.resetZoom) window.resetZoom();
        }

        // Ctrl+= / Ctrl+- = zoom
        if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
            e.preventDefault();
            if (window.zoomIn) window.zoomIn();
        }
        if ((e.ctrlKey || e.metaKey) && e.key === '-') {
            e.preventDefault();
            if (window.zoomOut) window.zoomOut();
        }

        // Delete / Backspace = delete selected
        if (e.key === 'Delete' || (e.key === 'Backspace' && !e.target.isContentEditable)) {
            if (window.deleteSelectedShapes) window.deleteSelectedShapes();
        }
    });

    // ═══════════ SIDEBARS ═══════════

    const sidebarMap = {
        'rectangle': 'sidebar-rectangle',
        'circle': 'sidebar-circle',
        'arrow': 'sidebar-arrow',
        'line': 'sidebar-line',
        'freehand': 'sidebar-freehand',
        'text': 'sidebar-text',
        'frame': 'sidebar-frame',
    };

    function updateSidebar(tool) {
        // Hide all sidebars
        document.querySelectorAll('.sidebar').forEach(s => s.style.display = 'none');

        const sidebarId = sidebarMap[tool];
        if (sidebarId) {
            const sidebar = document.getElementById(sidebarId);
            if (sidebar) sidebar.style.display = 'flex';
            activeSidebar = sidebarId;
        } else {
            activeSidebar = null;
        }
    }

    // Color swatch click handling
    document.querySelectorAll('.color-grid').forEach(grid => {
        grid.addEventListener('click', (e) => {
            const swatch = e.target.closest('.color-swatch');
            if (!swatch) return;
            grid.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            // Apply property to engine when shape property system is ready
            const prop = grid.dataset.prop;
            const value = swatch.dataset.value;
            if (prop && value !== undefined && window.setShapeProperty) {
                window.setShapeProperty(prop, value);
            }
        });
    });

    // Group button click handling
    document.querySelectorAll('.btn-group').forEach(group => {
        group.addEventListener('click', (e) => {
            const btn = e.target.closest('.group-btn');
            if (!btn) return;
            group.querySelectorAll('.group-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const prop = group.dataset.prop;
            const value = btn.dataset.value;
            if (prop && value !== undefined && window.setShapeProperty) {
                window.setShapeProperty(prop, value);
            }
        });
    });

    // Layer button click handling
    document.querySelectorAll('.layer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            if (action && window[action]) {
                window[action]();
            }
        });
    });

    // ═══════════ FOOTER ═══════════

    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');

    if (undoBtn) undoBtn.addEventListener('click', () => { if (engine && engine.undo) engine.undo(); });
    if (redoBtn) redoBtn.addEventListener('click', () => { if (engine && engine.redo) engine.redo(); });

    // ═══════════ AUTO-SAVE ═══════════

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
                    showSaveToast();
                }
            } catch (err) {
                console.warn('[LixSketch Webview] Auto-save error:', err);
            }
        }, 500);
    }

    function showSaveToast() {
        const toast = document.getElementById('save-toast');
        if (!toast) return;
        toast.style.display = 'flex';
        setTimeout(() => { toast.style.display = 'none'; }, 1500);
    }

    // Watch for DOM mutations on the SVG
    const observer = new MutationObserver(() => {
        scheduleAutoSave();
    });

    // ═══════════ INITIALIZE ENGINE ═══════════

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
                    if (type === 'tool:change') {
                        // Sync toolbar when engine changes tool
                        toolBtns.forEach(b => b.classList.remove('active'));
                        const activeBtn = document.querySelector(`.tool-btn[data-tool="${data}"]`);
                        if (activeBtn) activeBtn.classList.add('active');
                        updateSidebar(data);
                    }
                    if (type === 'sidebar:select') {
                        // Show the sidebar for the selected shape type
                        if (data && data.sidebar) {
                            const mappedId = sidebarMap[data.sidebar];
                            if (mappedId) {
                                document.querySelectorAll('.sidebar').forEach(s => s.style.display = 'none');
                                const sidebar = document.getElementById(mappedId);
                                if (sidebar) sidebar.style.display = 'flex';
                            }
                        }
                    }
                    if (type === 'sidebar:clear') {
                        // Only hide if we're not on a tool that has its own sidebar
                        const currentTool = document.querySelector('.tool-btn.active');
                        const currentToolName = currentTool ? currentTool.dataset.tool : 'select';
                        if (!sidebarMap[currentToolName]) {
                            document.querySelectorAll('.sidebar').forEach(s => s.style.display = 'none');
                        }
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
            const zoomPct = document.getElementById('zoomPercent');
            if (zoomInBtn && window.zoomIn) zoomInBtn.addEventListener('click', window.zoomIn);
            if (zoomOutBtn && window.zoomOut) zoomOutBtn.addEventListener('click', window.zoomOut);
            if (zoomPct && window.resetZoom) zoomPct.addEventListener('click', window.resetZoom);

            // Image tool: direct file picker in VS Code (no AI generation)
            window.__showImageSourcePicker = () => {
                if (window.openImageFilePicker) {
                    window.openImageFilePicker();
                }
            };

            console.log('[LixSketch Webview] Engine initialized');

            // Tell extension we're ready to receive content
            vscode.postMessage({ type: 'ready' });
        } catch (err) {
            console.error('[LixSketch Webview] Engine init failed:', err);
        }
    }

    // ═══════════ HANDLE MESSAGES FROM EXTENSION ═══════════

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
        // The engine's ZoomPan handles resize internally
    });

    // Start
    initEngine();
})();
