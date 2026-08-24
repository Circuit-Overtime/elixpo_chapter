/* eslint-disable */
import { pushCreateAction, pushFrameAttachmentAction } from '../core/UndoRedo.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const MAX_POINTS = 96;
const MIN_SCREEN_SAMPLE_PX = 4;
const MIN_SHAPE_SIZE = 8;

let drawing = false;
let points = [];
let previewPath = null;
let previewFrame = 0;
let latestPrediction = null;

function getThemeStroke() {
    return document.body?.classList.contains('theme-dark') ? '#f7f4ff' : '#211a33';
}

function getSVGPoint(event) {
    const viewBox = svg.viewBox.baseVal;
    const rect = svg.getBoundingClientRect();
    return {
        x: viewBox.x + ((event.clientX - rect.left) / rect.width) * viewBox.width,
        y: viewBox.y + ((event.clientY - rect.top) / rect.height) * viewBox.height,
        pressure: event.pressure || 0.5,
    };
}

function distance(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
}

function orientedBounds(sample, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    for (const point of sample) {
        const u = point.x * cos + point.y * sin;
        const v = -point.x * sin + point.y * cos;
        minU = Math.min(minU, u);
        maxU = Math.max(maxU, u);
        minV = Math.min(minV, v);
        maxV = Math.max(maxV, v);
    }
    const centerU = (minU + maxU) / 2;
    const centerV = (minV + maxV) / 2;
    return {
        center: {
            x: centerU * cos - centerV * sin,
            y: centerU * sin + centerV * cos,
        },
        width: Math.max(MIN_SHAPE_SIZE, maxU - minU),
        height: Math.max(MIN_SHAPE_SIZE, maxV - minV),
        angle,
        minU,
        maxU,
        minV,
        maxV,
    };
}

function principalAngle(sample) {
    let meanX = 0;
    let meanY = 0;
    for (const point of sample) {
        meanX += point.x;
        meanY += point.y;
    }
    meanX /= sample.length;
    meanY /= sample.length;
    let xx = 0;
    let yy = 0;
    let xy = 0;
    for (const point of sample) {
        const dx = point.x - meanX;
        const dy = point.y - meanY;
        xx += dx * dx;
        yy += dy * dy;
        xy += dx * dy;
    }
    if (Math.abs(xx - yy) + Math.abs(xy) < 0.001) return 0;
    return Math.atan2(2 * xy, xx - yy) / 2;
}

function rectangleAngle(sample) {
    let x = 0;
    let y = 0;
    for (let index = 1; index < sample.length; index += 1) {
        const dx = sample[index].x - sample[index - 1].x;
        const dy = sample[index].y - sample[index - 1].y;
        const length = Math.hypot(dx, dy);
        if (length === 0) continue;
        const angle = Math.atan2(dy, dx) * 4;
        x += Math.cos(angle) * length;
        y += Math.sin(angle) * length;
    }
    return Math.atan2(y, x) / 4;
}

function closedShapePrediction(sample, pathLength) {
    const rectBounds = orientedBounds(sample, rectangleAngle(sample));
    const ellipseBounds = orientedBounds(sample, principalAngle(sample));
    let rectangleError = 0;
    let ellipseError = 0;

    const rectCos = Math.cos(rectBounds.angle);
    const rectSin = Math.sin(rectBounds.angle);
    const ellipseCos = Math.cos(ellipseBounds.angle);
    const ellipseSin = Math.sin(ellipseBounds.angle);
    const rectHalfW = rectBounds.width / 2;
    const rectHalfH = rectBounds.height / 2;
    const ellipseHalfW = ellipseBounds.width / 2;
    const ellipseHalfH = ellipseBounds.height / 2;

    for (const point of sample) {
        const rectDx = point.x - rectBounds.center.x;
        const rectDy = point.y - rectBounds.center.y;
        const rectU = Math.abs(rectDx * rectCos + rectDy * rectSin) / rectHalfW;
        const rectV = Math.abs(-rectDx * rectSin + rectDy * rectCos) / rectHalfH;
        rectangleError += Math.min(Math.abs(1 - rectU), Math.abs(1 - rectV));

        const ellipseDx = point.x - ellipseBounds.center.x;
        const ellipseDy = point.y - ellipseBounds.center.y;
        const ellipseU = (ellipseDx * ellipseCos + ellipseDy * ellipseSin) / ellipseHalfW;
        const ellipseV = (-ellipseDx * ellipseSin + ellipseDy * ellipseCos) / ellipseHalfH;
        ellipseError += Math.abs(1 - Math.hypot(ellipseU, ellipseV));
    }

    rectangleError /= sample.length;
    ellipseError /= sample.length;
    const rectangle = rectangleError <= ellipseError * 1.08;
    const bestError = rectangle ? rectangleError : ellipseError;
    if (bestError > 0.24) {
        return { type: 'freehand', points: sample.map((point) => ({ ...point })), pathLength };
    }
    const bounds = rectangle ? rectBounds : ellipseBounds;
    return {
        type: rectangle ? 'rectangle' : 'circle',
        ...bounds,
        pathLength,
    };
}

export function predictDrawnShape(sample) {
    if (!Array.isArray(sample) || sample.length < 2) return null;
    const start = sample[0];
    let pathLength = 0;
    let farthestIndex = 1;
    let farthestDistance = 0;
    let minX = start.x;
    let maxX = start.x;
    let minY = start.y;
    let maxY = start.y;

    for (let index = 1; index < sample.length; index += 1) {
        pathLength += distance(sample[index - 1], sample[index]);
        const fromStart = distance(start, sample[index]);
        if (fromStart > farthestDistance) {
            farthestDistance = fromStart;
            farthestIndex = index;
        }
        minX = Math.min(minX, sample[index].x);
        maxX = Math.max(maxX, sample[index].x);
        minY = Math.min(minY, sample[index].y);
        maxY = Math.max(maxY, sample[index].y);
    }

    const diagonal = Math.max(MIN_SHAPE_SIZE, Math.hypot(maxX - minX, maxY - minY));
    const end = sample[sample.length - 1];
    const closed = sample.length >= 8 && distance(start, end) <= diagonal * 0.28 && pathLength >= diagonal * 2.05;
    if (closed) return closedShapePrediction(sample, pathLength);

    const tip = sample[farthestIndex];
    let afterTipLength = 0;
    for (let index = farthestIndex + 1; index < sample.length; index += 1) {
        afterTipLength += distance(sample[index - 1], sample[index]);
    }
    let shaftLength = 0;
    for (let index = 1; index <= farthestIndex; index += 1) {
        shaftLength += distance(sample[index - 1], sample[index]);
    }
    const arrow = farthestIndex >= Math.floor(sample.length * 0.45)
        && farthestIndex < sample.length - 2
        && afterTipLength >= diagonal * 0.18
        && distance(end, tip) <= diagonal * 0.48
        && farthestDistance / Math.max(shaftLength, 1) >= 0.86;

    const directDistance = distance(start, end);
    const line = !arrow && directDistance / Math.max(pathLength, 1) >= 0.92;

    if (!arrow && !line) {
        return { type: 'freehand', points: sample.map((point) => ({ ...point })), pathLength };
    }

    return {
        type: arrow ? 'arrow' : 'line',
        start: { ...start },
        end: arrow ? { ...tip } : { ...end },
        width: Math.max(MIN_SHAPE_SIZE, maxX - minX),
        height: Math.max(MIN_SHAPE_SIZE, maxY - minY),
        pathLength,
    };
}

function rotatedPoint(center, x, y, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return { x: center.x + x * cos - y * sin, y: center.y + x * sin + y * cos };
}

function pathForPrediction(prediction) {
    if (!prediction) return '';
    if (prediction.type === 'rectangle') {
        const halfW = prediction.width / 2;
        const halfH = prediction.height / 2;
        const corners = [
            rotatedPoint(prediction.center, -halfW, -halfH, prediction.angle),
            rotatedPoint(prediction.center, halfW, -halfH, prediction.angle),
            rotatedPoint(prediction.center, halfW, halfH, prediction.angle),
            rotatedPoint(prediction.center, -halfW, halfH, prediction.angle),
        ];
        return `M ${corners[0].x} ${corners[0].y} L ${corners[1].x} ${corners[1].y} L ${corners[2].x} ${corners[2].y} L ${corners[3].x} ${corners[3].y} Z`;
    }
    if (prediction.type === 'circle') {
        const rx = prediction.width / 2;
        const ry = prediction.height / 2;
        const start = rotatedPoint(prediction.center, rx, 0, prediction.angle);
        const opposite = rotatedPoint(prediction.center, -rx, 0, prediction.angle);
        const rotation = prediction.angle * 180 / Math.PI;
        return `M ${start.x} ${start.y} A ${rx} ${ry} ${rotation} 1 0 ${opposite.x} ${opposite.y} A ${rx} ${ry} ${rotation} 1 0 ${start.x} ${start.y}`;
    }
    if (prediction.type === 'freehand') {
        if (!prediction.points.length) return '';
        return prediction.points.reduce((path, point, index) => `${path}${index === 0 ? 'M' : ' L'} ${point.x} ${point.y}`, '');
    }
    const { start, end } = prediction;
    let path = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
    if (prediction.type === 'arrow') {
        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const head = Math.min(24 / (window.currentZoom || 1), distance(start, end) * 0.25);
        const left = rotatedPoint(end, -head, head * 0.55, angle);
        const right = rotatedPoint(end, -head, -head * 0.55, angle);
        path += ` M ${left.x} ${left.y} L ${end.x} ${end.y} L ${right.x} ${right.y}`;
    }
    return path;
}

function ensurePreview() {
    if (previewPath?.isConnected) return;
    previewPath = document.createElementNS(SVG_NS, 'path');
    previewPath.dataset.recognitionPreview = 'true';
    previewPath.setAttribute('fill', 'rgba(148, 148, 158, 0.06)');
    previewPath.setAttribute('stroke', '#9696a0');
    previewPath.setAttribute('stroke-width', '2');
    previewPath.setAttribute('stroke-dasharray', '5 7');
    previewPath.setAttribute('stroke-linecap', 'round');
    previewPath.setAttribute('stroke-linejoin', 'round');
    previewPath.setAttribute('vector-effect', 'non-scaling-stroke');
    previewPath.setAttribute('pointer-events', 'none');
    svg.appendChild(previewPath);
}

function renderPreview() {
    previewFrame = 0;
    if (!drawing) return;
    latestPrediction = predictDrawnShape(points);
    ensurePreview();
    previewPath.setAttribute('d', pathForPrediction(latestPrediction));
    previewPath.setAttribute('fill', latestPrediction?.type === 'rectangle' || latestPrediction?.type === 'circle'
        ? 'rgba(148, 148, 158, 0.06)'
        : 'none');
}

function schedulePreview() {
    if (!previewFrame) previewFrame = requestAnimationFrame(renderPreview);
}

function cleanupPreview() {
    if (previewFrame) cancelAnimationFrame(previewFrame);
    previewFrame = 0;
    previewPath?.remove();
    previewPath = null;
}

function currentStyle() {
    const settings = window.freehandToolSettings || {};
    const outline = settings.strokeStyle || 'solid';
    return {
        stroke: settings.strokeColor || getThemeStroke(),
        fill: 'transparent',
        fillStyle: 'none',
        strokeWidth: settings.strokeWidth || 2,
        strokeDasharray: outline === 'dashed' ? '10,10' : (outline === 'dotted' ? '2,8' : ''),
        outline,
    };
}

function attachToContainingFrame(shape) {
    for (let index = shapes.length - 1; index >= 0; index -= 1) {
        const frame = shapes[index];
        if (frame.shapeName !== 'frame' || typeof frame.isShapeInFrame !== 'function') continue;
        if (!frame.isShapeInFrame(shape)) continue;
        frame.addShapeToFrame(shape);
        pushFrameAttachmentAction(frame, shape, 'attach', null);
        break;
    }
}

function createPredictedShape(prediction) {
    if (!prediction) return null;
    const style = currentStyle();
    let shape = null;
    if (prediction.type === 'rectangle') {
        shape = new window.Rectangle(
            prediction.center.x - prediction.width / 2,
            prediction.center.y - prediction.height / 2,
            prediction.width,
            prediction.height,
            style,
        );
        shape.rotation = prediction.angle * 180 / Math.PI;
        shape.draw();
    } else if (prediction.type === 'circle') {
        shape = new window.Circle(
            prediction.center.x,
            prediction.center.y,
            prediction.width / 2,
            prediction.height / 2,
            style,
        );
        shape.rotation = prediction.angle * 180 / Math.PI;
        shape.draw();
    } else if (prediction.type === 'freehand') {
        const brush = window.freehandToolSettings || {};
        shape = new window.FreehandStroke(
            prediction.points.map((point) => [point.x, point.y, point.pressure || 0.5]),
            {
                stroke: style.stroke,
                strokeWidth: style.strokeWidth,
                strokeStyle: style.outline,
                thinning: brush.thinning ?? 0.5,
                roughness: brush.roughness || 'smooth',
                strokeOpacity: brush.opacity ?? 1,
            },
        );
    } else if (prediction.type === 'arrow') {
        shape = new window.Arrow(prediction.start, prediction.end, {
            stroke: style.stroke,
            strokeWidth: style.strokeWidth,
            arrowOutlineStyle: style.outline,
            arrowCurved: 'straight',
        });
    } else {
        shape = new window.Line(prediction.start, prediction.end, {
            stroke: style.stroke,
            strokeWidth: style.strokeWidth,
            strokeDasharray: style.strokeDasharray,
            roughness: 1.5,
            bowing: 1,
        });
    }
    shapes.push(shape);
    pushCreateAction(shape);
    attachToContainingFrame(shape);
    return shape;
}

export function handleShapeRecognitionDown(event) {
    if (!window.isShapeRecognitionToolActive || event.button !== 0) return;
    drawing = true;
    points = [getSVGPoint(event)];
    latestPrediction = null;
    ensurePreview();
    schedulePreview();
}

export function handleShapeRecognitionMove(event) {
    if (!drawing || !window.isShapeRecognitionToolActive) return;
    const point = getSVGPoint(event);
    const last = points[points.length - 1];
    const threshold = MIN_SCREEN_SAMPLE_PX / (window.currentZoom || 1);
    if (distance(last, point) < threshold) return;
    if (points.length < MAX_POINTS) {
        points.push(point);
    } else {
        // Preserve the first point and evenly discard older detail. Memory and
        // recognition time stay constant even during very long gestures.
        points = [points[0], ...points.slice(2).filter((_, index) => index % 2 === 0), point];
    }
    schedulePreview();
}

export function handleShapeRecognitionUp(event) {
    if (!drawing) return;
    drawing = false;
    const rect = svg.getBoundingClientRect();
    if (event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom) {
        const point = getSVGPoint(event);
        if (distance(points[points.length - 1], point) > 0) points.push(point);
    }
    latestPrediction = predictDrawnShape(points);
    cleanupPreview();

    const prediction = latestPrediction;
    points = [];
    latestPrediction = null;
    if (!prediction || prediction.pathLength < MIN_SHAPE_SIZE) return;

    const shape = createPredictedShape(prediction);
    if (!shape) return;
    if (window.__sketchStoreApi) window.__sketchStoreApi.setActiveTool('select', { afterDraw: true });
    currentShape = shape;
    if (shape.shapeName === 'freehandStroke' && typeof shape.selectStroke === 'function') {
        shape.selectStroke();
    } else {
        shape.isSelected = true;
        if (typeof shape.addAnchors === 'function') shape.addAnchors();
    }
}

export function cancelShapeRecognition() {
    drawing = false;
    points = [];
    latestPrediction = null;
    cleanupPreview();
}

window.__cancelShapeRecognition = cancelShapeRecognition;
