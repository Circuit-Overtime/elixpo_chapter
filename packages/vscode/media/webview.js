/* eslint-disable */
/**
 * LixSketch VS Code Webview Bridge
 * Exact website behavior. Auto-save is silent; toast only on Ctrl+S.
 */
(function () {
    const vscode = acquireVsCodeApi();
    const svgEl = document.getElementById('freehand-canvas');
    if (!svgEl) return;

    svgEl.setAttribute('viewBox', `0 0 ${window.innerWidth} ${window.innerHeight}`);

    let engine = null;
    let saveTimeout = null;
    let isLoading = false;
    let toolLocked = false;

    // ═══════════ TOOLBAR ═══════════
    const toolBtns = document.querySelectorAll('.tool-btn[data-tool]');
    const toolLockBtn = document.querySelector('.tool-btn[data-action="toollock"]');

    function setActiveTool(tool) {
        if (engine) engine.setActiveTool(tool);
        toolBtns.forEach(b => b.classList.remove('active'));
        const btn = document.querySelector(`.tool-btn[data-tool="${tool}"]`);
        if (btn) btn.classList.add('active');
        updateSidebar(tool);
    }

    toolBtns.forEach(btn => {
        btn.addEventListener('click', () => setActiveTool(btn.getAttribute('data-tool')));
    });

    if (toolLockBtn) {
        toolLockBtn.addEventListener('click', () => {
            toolLocked = !toolLocked;
            toolLockBtn.classList.toggle('active', toolLocked);
            const icon = toolLockBtn.querySelector('i');
            if (icon) icon.className = toolLocked ? 'bx bxs-lock-alt' : 'bx bx-lock-alt';
        });
    }

    const shortcutMap = {
        'v': 'select', 'h': 'pan', 'r': 'rectangle', 'o': 'circle',
        'a': 'arrow', 'l': 'line', 't': 'text', 'p': 'freehand',
        'e': 'eraser', 'f': 'frame', 'k': 'laser', 'd': 'freehand',
        '9': 'image',
    };

    document.addEventListener('keydown', (e) => {
        const tag = e.target.tagName;
        const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable;

        // Ctrl+S = manual save with toast
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
            e.preventDefault();
            doManualSave();
            return;
        }

        // Ctrl+/ = shortcuts modal
        if ((e.ctrlKey || e.metaKey) && e.key === '/') {
            e.preventDefault();
            toggleModal('shortcuts-modal');
            return;
        }

        // Escape = close modals/menu, or deselect
        if (e.key === 'Escape') {
            if (closeAnyOpen()) return;
        }

        // Don't handle tool shortcuts when typing
        if (isInput) return;

        // Tool shortcuts
        const tool = shortcutMap[e.key.toLowerCase()];
        if (tool && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            setActiveTool(tool);
            return;
        }

        // Q = tool lock
        if (e.key.toLowerCase() === 'q' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            if (toolLockBtn) toolLockBtn.click();
            return;
        }

        // ? = help
        if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            toggleModal('help-modal');
            return;
        }

        // Ctrl+Z / Ctrl+Shift+Z
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (e.shiftKey) { if (engine && engine.redo) engine.redo(); }
            else { if (engine && engine.undo) engine.undo(); }
            return;
        }

        // Ctrl+0/+/-
        if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); if (window.resetZoom) window.resetZoom(); return; }
        if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) { e.preventDefault(); if (window.zoomIn) window.zoomIn(); return; }
        if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); if (window.zoomOut) window.zoomOut(); return; }

        // Delete/Backspace = delete selected shapes (NOT save)
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (window.deleteSelectedShapes) {
                e.preventDefault();
                window.deleteSelectedShapes();
            }
            return;
        }
    });

    // ═══════════ SIDEBARS ═══════════
    const sidebarMap = {
        'rectangle': 'sidebar-rectangle', 'circle': 'sidebar-circle',
        'arrow': 'sidebar-arrow', 'line': 'sidebar-line',
        'freehand': 'sidebar-freehand', 'text': 'sidebar-text',
        'frame': 'sidebar-frame',
    };

    function updateSidebar(tool) {
        document.querySelectorAll('.sidebar').forEach(s => s.style.display = 'none');
        const id = sidebarMap[tool];
        if (id) { const el = document.getElementById(id); if (el) el.style.display = 'flex'; }
    }

    // Color swatches
    document.querySelectorAll('.color-grid').forEach(grid => {
        grid.addEventListener('click', (e) => {
            const swatch = e.target.closest('.color-swatch');
            if (!swatch) return;
            grid.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            const prop = grid.dataset.prop, value = swatch.dataset.value;
            if (prop && value !== undefined && window.setShapeProperty) window.setShapeProperty(prop, value);
        });
    });

    // Group buttons
    document.querySelectorAll('.btn-group').forEach(group => {
        group.addEventListener('click', (e) => {
            const btn = e.target.closest('.group-btn');
            if (!btn) return;
            group.querySelectorAll('.group-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const prop = group.dataset.prop, value = btn.dataset.value;
            if (prop && value !== undefined && window.setShapeProperty) window.setShapeProperty(prop, value);
        });
    });

    // Layer buttons
    document.querySelectorAll('.layer-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            if (action && window[action]) window[action]();
        });
    });

    // ═══════════ HEADER ═══════════
    const menuBtn = document.getElementById('menuBtn');
    const appMenu = document.getElementById('app-menu');
    const menuBackdrop = document.getElementById('menu-backdrop');
    const shortcutsBtn = document.getElementById('shortcutsBtn');
    const helpBtn = document.getElementById('helpBtn');

    function toggleMenu() {
        const open = appMenu.style.display === 'none';
        appMenu.style.display = open ? 'block' : 'none';
        menuBackdrop.style.display = open ? 'block' : 'none';
    }

    if (menuBtn) menuBtn.addEventListener('click', toggleMenu);
    if (menuBackdrop) menuBackdrop.addEventListener('click', toggleMenu);
    if (shortcutsBtn) shortcutsBtn.addEventListener('click', () => toggleModal('shortcuts-modal'));
    if (helpBtn) helpBtn.addEventListener('click', () => toggleModal('help-modal'));

    // Menu items
    document.querySelectorAll('.menu-item[data-action]').forEach(item => {
        item.addEventListener('click', () => {
            const action = item.dataset.action;
            toggleMenu();
            if (action === 'help') toggleModal('help-modal');
            if (action === 'shortcuts') toggleModal('shortcuts-modal');
            if (action === 'resetCanvas') {
                if (engine && engine.scene && engine.scene.reset) engine.scene.reset();
            }
        });
    });

    // Canvas background swatches
    document.querySelectorAll('.bg-swatch').forEach(swatch => {
        swatch.addEventListener('click', () => {
            document.querySelectorAll('.bg-swatch').forEach(s => s.classList.remove('active'));
            swatch.classList.add('active');
            const bg = swatch.dataset.bg;
            svgEl.style.background = bg;
        });
    });

    // ═══════════ MODALS ═══════════
    function toggleModal(id) {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
    }

    // Close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.close;
            if (id) document.getElementById(id).style.display = 'none';
        });
    });

    // Click backdrop to close
    document.querySelectorAll('.modal-backdrop').forEach(bd => {
        bd.addEventListener('click', () => {
            bd.parentElement.style.display = 'none';
        });
    });

    function closeAnyOpen() {
        let closed = false;
        document.querySelectorAll('.modal-overlay').forEach(m => {
            if (m.style.display !== 'none') { m.style.display = 'none'; closed = true; }
        });
        if (appMenu.style.display !== 'none') { toggleMenu(); closed = true; }
        return closed;
    }

    // ═══════════ FOOTER ═══════════
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    if (undoBtn) undoBtn.addEventListener('click', () => { if (engine && engine.undo) engine.undo(); });
    if (redoBtn) redoBtn.addEventListener('click', () => { if (engine && engine.redo) engine.redo(); });

    // ═══════════ AUTO-SAVE (silent, no toast) ═══════════
    const saveDot = document.getElementById('save-status');

    function scheduleAutoSave() {
        if (isLoading) return;
        // Mark as unsaved
        if (saveDot) saveDot.classList.add('unsaved');
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            if (!engine || !engine.scene) return;
            try {
                const sceneData = engine.scene.save('VS Code Diagram');
                if (sceneData) {
                    const json = typeof sceneData === 'string' ? sceneData : JSON.stringify(sceneData, null, 2);
                    vscode.postMessage({ type: 'update', content: json });
                    if (saveDot) saveDot.classList.remove('unsaved');
                }
            } catch (err) {
                console.warn('[LixSketch] Auto-save error:', err);
            }
        }, 800);
    }

    // ═══════════ MANUAL SAVE (Ctrl+S, with toast) ═══════════
    function doManualSave() {
        if (!engine || !engine.scene) return;
        try {
            const sceneData = engine.scene.save('VS Code Diagram');
            if (sceneData) {
                const json = typeof sceneData === 'string' ? sceneData : JSON.stringify(sceneData, null, 2);
                vscode.postMessage({ type: 'manual-save', content: json });
                if (saveDot) saveDot.classList.remove('unsaved');
                showSaveToast();
            }
        } catch (err) {
            console.warn('[LixSketch] Save error:', err);
        }
    }

    function showSaveToast() {
        const toast = document.getElementById('save-toast');
        if (!toast) return;
        toast.style.display = 'flex';
        setTimeout(() => { toast.style.display = 'none'; }, 1800);
    }

    // Observe SVG mutations for auto-save
    const observer = new MutationObserver(() => scheduleAutoSave());

    // ═══════════ INIT ENGINE ═══════════
    async function initEngine() {
        try {
            const { createSketchEngine } = LixSketch;
            engine = createSketchEngine(svgEl, {
                initialZoom: 1, minZoom: 0.4, maxZoom: 30,
                onEvent: (type, data) => {
                    if (type === 'zoom:change') {
                        const pct = document.getElementById('zoomPercent');
                        if (pct) pct.textContent = Math.round(data * 100) + '%';
                    }
                    if (type === 'tool:change') {
                        toolBtns.forEach(b => b.classList.remove('active'));
                        const btn = document.querySelector(`.tool-btn[data-tool="${data}"]`);
                        if (btn) btn.classList.add('active');
                        updateSidebar(data);
                    }
                    if (type === 'sidebar:select' && data && data.sidebar) {
                        const mapped = sidebarMap[data.sidebar];
                        if (mapped) {
                            document.querySelectorAll('.sidebar').forEach(s => s.style.display = 'none');
                            const el = document.getElementById(mapped);
                            if (el) el.style.display = 'flex';
                        }
                    }
                    if (type === 'sidebar:clear') {
                        const current = document.querySelector('.tool-btn.active');
                        const tool = current ? current.dataset.tool : 'select';
                        if (!sidebarMap[tool]) {
                            document.querySelectorAll('.sidebar').forEach(s => s.style.display = 'none');
                        }
                    }
                },
            });

            await engine.init();

            // Observe SVG for auto-save (but NOT on every tiny mutation)
            observer.observe(svgEl, { childList: true, subtree: true, attributes: true, characterData: true });

            // Save on mouseup (drawing done), not on every mutation
            svgEl.addEventListener('mouseup', scheduleAutoSave);

            // Zoom controls
            const zoomInBtn = document.getElementById('zoomIn');
            const zoomOutBtn = document.getElementById('zoomOut');
            const zoomPct = document.getElementById('zoomPercent');
            if (zoomInBtn && window.zoomIn) zoomInBtn.addEventListener('click', window.zoomIn);
            if (zoomOutBtn && window.zoomOut) zoomOutBtn.addEventListener('click', window.zoomOut);
            if (zoomPct && window.resetZoom) zoomPct.addEventListener('click', window.resetZoom);

            // Image tool: direct file picker (no AI in VS Code)
            window.__showImageSourcePicker = () => {
                if (window.openImageFilePicker) window.openImageFilePicker();
            };

            console.log('[LixSketch] Engine initialized');
            vscode.postMessage({ type: 'ready' });
        } catch (err) {
            console.error('[LixSketch] Engine init failed:', err);
        }
    }

    // ═══════════ MESSAGES FROM EXTENSION ═══════════
    window.addEventListener('message', (event) => {
        const msg = event.data;
        if (!msg) return;
        if (msg.type === 'load') {
            if (!engine || !engine.scene) {
                setTimeout(() => window.dispatchEvent(new MessageEvent('message', { data: msg })), 200);
                return;
            }
            try {
                isLoading = true;
                const content = msg.content.trim();
                if (content && content !== '{}') {
                    const sceneData = JSON.parse(content);
                    if (sceneData.shapes && sceneData.shapes.length > 0) engine.scene.load(sceneData);
                }
            } catch (err) {
                console.warn('[LixSketch] Load error:', err);
            } finally {
                setTimeout(() => { isLoading = false; }, 300);
            }
        }
    });

    initEngine();
})();
