/* eslint-disable */
import { pushOptionsChangeAction } from '../core/UndoRedo.js';

const CLOSED_SHAPES = new Set(['rectangle', 'circle']);

window.paintBucketSettings = window.paintBucketSettings || {
    fillColor: '#A98DEB',
    fillStyle: 'solid',
};

function getSVGPoint(event) {
    const viewBox = svg.viewBox.baseVal;
    const rect = svg.getBoundingClientRect();
    return {
        x: viewBox.x + ((event.clientX - rect.left) / rect.width) * viewBox.width,
        y: viewBox.y + ((event.clientY - rect.top) / rect.height) * viewBox.height,
    };
}

function findClosedShapeAt(x, y) {
    for (let index = shapes.length - 1; index >= 0; index -= 1) {
        const shape = shapes[index];
        if (!CLOSED_SHAPES.has(shape?.shapeName) || typeof shape.contains !== 'function') continue;
        if (shape.contains(x, y)) return shape;
    }
    return null;
}

export function handlePaintBucketDown(event) {
    if (!window.isPaintBucketToolActive || event.button !== 0) return;
    const { x, y } = getSVGPoint(event);
    const shape = findClosedShapeAt(x, y);
    if (!shape) {
        window.dispatchEvent(new CustomEvent('lixsketch:bucket-miss'));
        return;
    }

    const settings = window.paintBucketSettings;
    const transparent = settings.fillStyle === 'none' || settings.fillStyle === 'transparent';
    const nextFill = transparent ? 'transparent' : settings.fillColor;
    const nextStyle = transparent ? 'none' : settings.fillStyle;
    if (shape.options.fill === nextFill && shape.options.fillStyle === nextStyle) return;

    const oldOptions = { ...shape.options };
    const newOptions = { ...shape.options, fill: nextFill, fillStyle: nextStyle };
    pushOptionsChangeAction(shape, oldOptions, newOptions);
    shape.options = newOptions;
    shape.draw();
    window.dispatchEvent(new CustomEvent('lixsketch:bucket-filled', { detail: { shapeID: shape.shapeID } }));
}
