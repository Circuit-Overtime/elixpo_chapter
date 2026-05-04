/* eslint-disable */
/**
 * Engine-local keyboard shortcuts.
 *
 * These are the shortcuts that operate purely on engine state (tool switching,
 * shape deletion, selection, grouping, space-to-pan, escape-deselect). They
 * intentionally do NOT include product-level shortcuts (cloud save, modal
 * toggles, theme switches) — those belong to the consumer app.
 *
 * Usage:
 *   import { installEngineShortcuts } from '@elixpo/lixsketch';
 *   const uninstall = installEngineShortcuts(engine);
 *   // later:
 *   uninstall();
 *
 * Hosts can pass `options.onToast(message, tone)` to surface group/ungroup
 * confirmations, and `options.skipWhen(event)` to suppress shortcuts in
 * specific contexts (e.g. when the host's overlay is focused).
 */

import { TOOLS } from './index.js';

// Single-key tool shortcuts. Mirrors what the standalone product ships.
export const SHORTCUT_MAP = {
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
    k: TOOLS.LASER,
};

function isTypingTarget(target) {
    if (!target) return false;
    const tag = (target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea') return true;
    if (target.isContentEditable) return true;
    return false;
}

/**
 * Install engine-local keyboard shortcuts on `document`.
 *
 * @param {object} engine - The SketchEngine instance (must have `setActiveTool`).
 * @param {object} [options]
 * @param {function} [options.onToast] - (message, { tone }) => void; called
 *        for group/ungroup confirmations. No-op by default.
 * @param {function} [options.skipWhen] - (event) => boolean; return true to
 *        skip shortcut handling for an event. Use to defer to your own
 *        editor overlays. Default skips inputs/contenteditable only.
 * @param {function} [options.setActiveTool] - (tool) => void; override how
 *        tool switching is dispatched. Useful when the consumer has its
 *        own state store driving the engine — calling this keeps the UI
 *        in sync without polling. Defaults to engine.setActiveTool.
 * @returns {function} uninstall function
 */
export function installEngineShortcuts(engine, options = {}) {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return () => { };
    }

    const onToast = typeof options.onToast === 'function' ? options.onToast : () => { };
    const skipWhen = typeof options.skipWhen === 'function' ? options.skipWhen : null;
    const customSetTool = typeof options.setActiveTool === 'function' ? options.setActiveTool : null;

    function setTool(tool) {
        if (customSetTool) { customSetTool(tool); return; }
        if (engine?.setActiveTool) engine.setActiveTool(tool);
    }

    function getActiveTool() {
        return engine?.activeTool || engine?.getActiveTool?.() || null;
    }

    function handleKeyDown(e) {
        const key = (e.key || '').toLowerCase();

        // Always check ctrl/cmd shortcuts first — they should fire even when
        // selection is empty, but skip when the user is typing.
        const isMod = e.ctrlKey || e.metaKey;

        if (isTypingTarget(e.target)) return;
        if (document.querySelector('.text-edit-overlay:not(.hidden)')) return;
        if (skipWhen && skipWhen(e)) return;

        if (isMod) {
            if (key === 'a' && !e.shiftKey) {
                e.preventDefault();
                setTool(TOOLS.SELECT);
                if (window.multiSelection && Array.isArray(window.shapes)) {
                    window.multiSelection.clearSelection();
                    window.shapes.forEach((shape) => window.multiSelection.addShape(shape));
                }
                return;
            }
            if (key === 'g' && !e.shiftKey) {
                e.preventDefault();
                try {
                    const ms = window.multiSelection;
                    const sel = ms?.selectedShapes;
                    const targets = sel && sel.size > 1
                        ? Array.from(sel)
                        : (window.currentShape ? [window.currentShape] : []);
                    if (targets.length > 1) {
                        const newId = `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
                        for (const s of targets) s.groupId = newId;
                        if (typeof ms?.updateControls === 'function') ms.updateControls();
                        onToast(`Grouped ${targets.length} shapes`, { tone: 'success' });
                    }
                } catch (err) { console.warn('[EngineShortcuts] group failed:', err); }
                return;
            }
            if (key === 'g' && e.shiftKey) {
                e.preventDefault();
                try {
                    const ms = window.multiSelection;
                    const sel = ms?.selectedShapes;
                    const targets = sel && sel.size > 0
                        ? Array.from(sel)
                        : (window.currentShape ? [window.currentShape] : []);
                    const groupIds = new Set(targets.map((s) => s.groupId).filter(Boolean));
                    if (groupIds.size > 0 && Array.isArray(window.shapes)) {
                        let cleared = 0;
                        for (const s of window.shapes) {
                            if (s.groupId && groupIds.has(s.groupId)) { s.groupId = null; cleared++; }
                        }
                        if (typeof ms?.updateControls === 'function') ms.updateControls();
                        onToast(`Ungrouped ${cleared} shapes`, { tone: 'success' });
                    }
                } catch (err) { console.warn('[EngineShortcuts] ungroup failed:', err); }
                return;
            }
            // Ctrl+D = duplicate (engine-handled elsewhere — just preventDefault to
            // stop the browser's bookmark dialog).
            if (key === 'd') { e.preventDefault(); return; }
            return; // Other Ctrl combos are app-level; let the consumer handle them.
        }

        // Delete / Backspace — remove selected shapes.
        if (e.key === 'Delete' || e.key === 'Backspace') {
            e.preventDefault();

            if (window.multiSelection?.selectedShapes?.size > 0) {
                if (typeof window.deleteSelectedShapes === 'function') {
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
                if (typeof window.cleanupAttachments === 'function') {
                    window.cleanupAttachments(shape);
                }
                if (shape.parentFrame && typeof shape.parentFrame.removeShapeFromFrame === 'function') {
                    shape.parentFrame.removeShapeFromFrame(shape);
                }
                const el = shape.group || shape.element;
                if (el && el.parentNode) el.parentNode.removeChild(el);
                if (typeof window.pushDeleteAction === 'function') {
                    window.pushDeleteAction(shape);
                }
                window.currentShape = null;
                if (typeof window.disableAllSideBars === 'function') {
                    window.disableAllSideBars();
                }
            }
            return;
        }

        // Tool-switching shortcuts (no modifier).
        if (!e.shiftKey && !e.altKey) {
            const tool = SHORTCUT_MAP[key];
            if (tool) {
                e.preventDefault();
                setTool(tool);
                return;
            }

            if (e.key === 'Escape') {
                // Engine-level deselect; consumer handles modal-close ordering.
                window.currentShape = null;
                if (typeof window.disableAllSideBars === 'function') {
                    window.disableAllSideBars();
                }
                return;
            }
        }
    }

    // Space held = temporary pan. Releasing restores the previous tool.
    let spaceHeld = false;
    let toolBeforeSpace = null;

    function handleSpaceDown(e) {
        if (e.code !== 'Space' || spaceHeld) return;
        if (isTypingTarget(e.target)) return;
        if (skipWhen && skipWhen(e)) return;
        e.preventDefault();
        spaceHeld = true;
        const active = getActiveTool();
        if (active && active !== TOOLS.PAN) {
            toolBeforeSpace = active;
            setTool(TOOLS.PAN);
        }
    }

    function handleKeyUp(e) {
        if (e.code === 'Space' && spaceHeld) {
            spaceHeld = false;
            if (toolBeforeSpace) {
                setTool(toolBeforeSpace);
                toolBeforeSpace = null;
            }
        }
    }

    // Block browser zoom on Ctrl+wheel — engine's ZoomPan handles real zoom.
    function handleWheel(e) {
        if (e.ctrlKey || e.metaKey) e.preventDefault();
    }

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', handleSpaceDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('wheel', handleWheel, { passive: false });

    return function uninstall() {
        document.removeEventListener('keydown', handleKeyDown);
        document.removeEventListener('keydown', handleSpaceDown);
        document.removeEventListener('keyup', handleKeyUp);
        document.removeEventListener('wheel', handleWheel);
    };
}
