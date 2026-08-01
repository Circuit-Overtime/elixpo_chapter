/* eslint-disable */
/**
 * Native renderers for Mermaid ER and chart diagrams.
 *
 * Preview is SVG, while canvas placement deliberately creates ordinary
 * LixSketch shapes. That keeps entities, attributes, relationships, bars,
 * points, and legend items independently selectable and editable.
 */

const NS = 'http://www.w3.org/2000/svg';
const PALETTE = [
    { fill: '#dfeee4', stroke: '#5f836c' },
    { fill: '#f4e3d4', stroke: '#a97852' },
    { fill: '#e9e1ef', stroke: '#7e6b91' },
    { fill: '#f3edc9', stroke: '#9a8745' },
    { fill: '#dcebed', stroke: '#5d7f82' },
    { fill: '#f1dedc', stroke: '#9a6863' },
];

function escapeXml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function isDark() {
    return typeof document !== 'undefined' && document.body?.classList.contains('theme-dark');
}

function theme() {
    return isDark()
        ? { bg: '#20232a', text: '#f0eee8', line: '#aaa89f', frame: '#77766f', panel: '#292d34' }
        : { bg: '#fbfaf6', text: '#343832', line: '#6e746c', frame: '#b9b7ac', panel: '#f5f2ea' };
}

function sourceLines(src) {
    return src.split('\n').map(line => line.trim()).filter(line => line && !line.startsWith('%%'));
}

export function detectStructuredMermaid(src) {
    const header = sourceLines(src)[0]?.toLowerCase() || '';
    if (header === 'erdiagram') return 'er';
    if (/^pie(?:\s|$)/.test(header) || /^xychart(?:-beta)?(?:\s|$)/.test(header)) return 'chart';
    return null;
}

// ---------------------------------------------------------------------
// Entity relationship diagrams
// ---------------------------------------------------------------------

export function parseERDiagram(src) {
    const lines = sourceLines(src);
    if (lines[0]?.toLowerCase() !== 'erdiagram') return null;

    const entityMap = new Map();
    const relationships = [];
    let current = null;

    const ensureEntity = (name) => {
        if (!entityMap.has(name)) entityMap.set(name, { name, attributes: [] });
        return entityMap.get(name);
    };

    for (let index = 1; index < lines.length; index++) {
        const line = lines[index];
        const entityStart = line.match(/^([\w-]+)\s*\{$/);
        if (entityStart) {
            current = ensureEntity(entityStart[1]);
            continue;
        }
        if (line === '}') {
            current = null;
            continue;
        }
        if (current) {
            const attribute = line.match(/^(\S+)\s+(\S+)(?:\s+(.+))?$/);
            if (attribute) {
                current.attributes.push({
                    type: attribute[1],
                    name: attribute[2],
                    key: attribute[3] || '',
                });
            }
            continue;
        }

        // CUSTOMER ||--o{ ORDER : places
        const relation = line.match(/^([\w-]+)\s+([|o}{.]+)(?:--|\.\.)([|o}{.]+)\s+([\w-]+)\s*:\s*(.+)$/);
        if (relation) {
            ensureEntity(relation[1]);
            ensureEntity(relation[4]);
            relationships.push({
                from: relation[1],
                fromCardinality: relation[2],
                toCardinality: relation[3],
                to: relation[4],
                label: relation[5],
            });
        }
    }

    if (entityMap.size === 0) return null;
    return { type: 'erDiagram', title: 'Entity relationship diagram', entities: [...entityMap.values()], relationships };
}

function layoutER(diagram) {
    const width = 230;
    const headerHeight = 44;
    const rowHeight = 30;
    const columns = Math.max(1, Math.ceil(Math.sqrt(diagram.entities.length)));
    return diagram.entities.map((entity, index) => ({
        ...entity,
        x: 60 + (index % columns) * 330,
        y: 55 + Math.floor(index / columns) * 270,
        width,
        headerHeight,
        rowHeight,
        height: headerHeight + Math.max(1, entity.attributes.length) * rowHeight,
        color: PALETTE[index % PALETTE.length],
    }));
}

export function renderERPreviewSVG(diagram) {
    if (!diagram?.entities?.length) return '';
    const TK = theme();
    const entities = layoutER(diagram);
    const byName = new Map(entities.map(entity => [entity.name, entity]));
    const maxX = Math.max(...entities.map(entity => entity.x + entity.width)) + 60;
    const maxY = Math.max(...entities.map(entity => entity.y + entity.height)) + 55;
    let content = `<rect width="${maxX}" height="${maxY}" rx="10" fill="${TK.bg}"/>`;
    content += `<defs><marker id="er-arrow" markerWidth="9" markerHeight="7" refX="8" refY="3.5" orient="auto"><path d="M1 1 L8 3.5 L1 6" fill="none" stroke="${TK.line}" stroke-width="1.4"/></marker></defs>`;

    for (const relation of diagram.relationships) {
        const from = byName.get(relation.from);
        const to = byName.get(relation.to);
        if (!from || !to) continue;
        const x1 = from.x + from.width / 2;
        const y1 = from.y + from.height / 2;
        const x2 = to.x + to.width / 2;
        const y2 = to.y + to.height / 2;
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        content += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${TK.line}" stroke-width="1.6" marker-end="url(#er-arrow)"/>`;
        content += `<text x="${mx}" y="${my - 8}" text-anchor="middle" fill="${TK.text}" font-size="12" font-family="lixFont">${escapeXml(`${relation.fromCardinality} ${relation.label} ${relation.toCardinality}`)}</text>`;
    }

    for (const entity of entities) {
        content += `<g><rect x="${entity.x}" y="${entity.y}" width="${entity.width}" height="${entity.height}" rx="8" fill="${TK.panel}" stroke="${entity.color.stroke}" stroke-width="1.5"/>`;
        content += `<rect x="${entity.x}" y="${entity.y}" width="${entity.width}" height="${entity.headerHeight}" rx="8" fill="${entity.color.fill}" stroke="${entity.color.stroke}" stroke-width="1.5"/>`;
        content += `<text x="${entity.x + entity.width / 2}" y="${entity.y + 27}" text-anchor="middle" fill="#343832" font-size="14" font-weight="600" font-family="lixFont">${escapeXml(entity.name)}</text>`;
        const attributes = entity.attributes.length ? entity.attributes : [{ type: '', name: 'No attributes', key: '' }];
        attributes.forEach((attribute, row) => {
            const y = entity.y + entity.headerHeight + row * entity.rowHeight;
            content += `<line x1="${entity.x}" y1="${y}" x2="${entity.x + entity.width}" y2="${y}" stroke="${TK.frame}" stroke-width="0.8"/>`;
            content += `<text x="${entity.x + 10}" y="${y + 20}" fill="${TK.text}" font-size="11" font-family="lixCode">${escapeXml([attribute.type, attribute.name, attribute.key].filter(Boolean).join('  '))}</text>`;
        });
        content += '</g>';
    }
    return `<svg xmlns="${NS}" width="600" height="450" viewBox="0 0 ${maxX} ${maxY}">${content}</svg>`;
}

// ---------------------------------------------------------------------
// Pie and XY charts
// ---------------------------------------------------------------------

function numberList(value) {
    return value.replace(/^\[|\]$/g, '').split(',').map(item => Number(item.trim())).filter(Number.isFinite);
}

export function parseChartDiagram(src) {
    const lines = sourceLines(src);
    const header = lines[0]?.toLowerCase() || '';
    if (/^pie(?:\s|$)/.test(header)) {
        let title = lines[0].replace(/^pie(?:\s+showData)?\s*/i, '').replace(/^title\s+/i, '').trim() || 'Pie chart';
        const values = [];
        for (let index = 1; index < lines.length; index++) {
            const titleMatch = lines[index].match(/^title\s+(.+)$/i);
            if (titleMatch) { title = titleMatch[1]; continue; }
            const item = lines[index].match(/^"?(.+?)"?\s*:\s*(-?\d+(?:\.\d+)?)$/);
            if (item) values.push({ label: item[1], value: Number(item[2]) });
        }
        return values.length ? { type: 'chart', kind: 'pie', title, categories: values.map(v => v.label), series: [{ name: title, values: values.map(v => v.value) }] } : null;
    }
    if (!/^xychart(?:-beta)?(?:\s|$)/.test(header)) return null;
    let title = 'Chart';
    let categories = [];
    const series = [];
    for (let index = 1; index < lines.length; index++) {
        const titleMatch = lines[index].match(/^title\s+"?(.+?)"?$/i);
        const axisMatch = lines[index].match(/^x-axis(?:\s+".*?")?\s+(\[.+\])/i);
        const seriesMatch = lines[index].match(/^(bar|line)(?:\s+"?([^"\[]+)"?)?\s+(\[.+\])$/i);
        if (titleMatch) title = titleMatch[1];
        else if (axisMatch) categories = axisMatch[1].replace(/^\[|\]$/g, '').split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        else if (seriesMatch) series.push({ kind: seriesMatch[1].toLowerCase(), name: seriesMatch[2]?.trim() || seriesMatch[1], values: numberList(seriesMatch[3]) });
    }
    const maxItems = Math.max(0, ...series.map(item => item.values.length));
    if (!categories.length) categories = Array.from({ length: maxItems }, (_, index) => String(index + 1));
    return series.length ? { type: 'chart', kind: 'xy', title, categories, series } : null;
}

export function renderChartPreviewSVG(chart) {
    if (!chart?.series?.length) return '';
    const TK = theme();
    const width = 720;
    const height = 450;
    const left = 70;
    const top = 60;
    const plotWidth = 580;
    const plotHeight = 300;
    const values = chart.series.flatMap(series => series.values);
    const maximum = Math.max(1, ...values.map(Math.abs));
    const categoryCount = Math.max(1, chart.categories.length);
    const slot = plotWidth / categoryCount;
    let content = `<rect width="${width}" height="${height}" rx="10" fill="${TK.bg}"/><text x="${width / 2}" y="32" text-anchor="middle" fill="${TK.text}" font-size="18" font-family="lixFont">${escapeXml(chart.title)}</text>`;
    content += `<line x1="${left}" y1="${top}" x2="${left}" y2="${top + plotHeight}" stroke="${TK.line}"/><line x1="${left}" y1="${top + plotHeight}" x2="${left + plotWidth}" y2="${top + plotHeight}" stroke="${TK.line}"/>`;

    chart.categories.forEach((category, index) => {
        content += `<text x="${left + slot * (index + .5)}" y="${top + plotHeight + 24}" text-anchor="middle" fill="${TK.text}" font-size="11" font-family="lixFont">${escapeXml(category)}</text>`;
    });

    chart.series.forEach((series, seriesIndex) => {
        const color = PALETTE[seriesIndex % PALETTE.length];
        if (series.kind === 'line') {
            const points = series.values.map((value, index) => `${left + slot * (index + .5)},${top + plotHeight - Math.abs(value) / maximum * plotHeight}`).join(' ');
            content += `<polyline points="${points}" fill="none" stroke="${color.stroke}" stroke-width="3"/>`;
            series.values.forEach((value, index) => content += `<circle cx="${left + slot * (index + .5)}" cy="${top + plotHeight - Math.abs(value) / maximum * plotHeight}" r="5" fill="${color.fill}" stroke="${color.stroke}" stroke-width="2"/>`);
        } else {
            const barWidth = Math.max(12, slot * .7 / chart.series.length);
            series.values.forEach((value, index) => {
                const barHeight = Math.abs(value) / maximum * plotHeight;
                const x = left + slot * index + slot * .15 + seriesIndex * barWidth;
                content += `<rect x="${x}" y="${top + plotHeight - barHeight}" width="${barWidth}" height="${barHeight}" rx="4" fill="${color.fill}" stroke="${color.stroke}" stroke-width="1.5"/><text x="${x + barWidth / 2}" y="${top + plotHeight - barHeight - 7}" text-anchor="middle" fill="${TK.text}" font-size="10" font-family="lixFont">${value}</text>`;
            });
        }
    });
    return `<svg xmlns="${NS}" width="600" height="450" viewBox="0 0 ${width} ${height}">${content}</svg>`;
}

// ---------------------------------------------------------------------
// Native canvas placement helpers
// ---------------------------------------------------------------------

function push(shape, frame) {
    if (!shape) return null;
    window.shapes.push(shape);
    if (window.pushCreateAction) window.pushCreateAction(shape);
    if (frame?.addShapeToFrame) frame.addShapeToFrame(shape);
    return shape;
}

function canvasOrigin(width, height) {
    const vb = window.currentViewBox || { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight };
    return { x: vb.x + vb.width / 2 - width / 2, y: vb.y + vb.height / 2 - height / 2 };
}

function createFrame(x, y, width, height, name, type) {
    const TK = theme();
    const frame = new window.Frame(x - 45, y - 45, width + 90, height + 90, {
        stroke: TK.frame, strokeWidth: 1, fill: 'transparent', opacity: .75, frameName: name,
    });
    frame._diagramType = type;
    push(frame);
    return frame;
}

export function renderEROnCanvas(diagram) {
    if (!diagram?.entities?.length || !window.Rectangle || !window.Arrow || !window.Frame) return false;
    const TK = theme();
    const entities = layoutER(diagram);
    const width = Math.max(...entities.map(entity => entity.x + entity.width)) + 40;
    const height = Math.max(...entities.map(entity => entity.y + entity.height)) + 40;
    const origin = canvasOrigin(width, height);
    const frame = createFrame(origin.x, origin.y, width, height, diagram.title, 'mermaid-er');
    const entityShapes = new Map();
    let first = null;

    for (const entity of entities) {
        const x = origin.x + entity.x;
        const y = origin.y + entity.y;
        const header = push(new window.Rectangle(x, y, entity.width, entity.headerHeight, {
            stroke: entity.color.stroke, strokeWidth: 1.5, fill: entity.color.fill, fillStyle: 'solid', roughness: 1,
            label: entity.name, labelColor: '#343832', labelFontSize: 15,
        }), frame);
        if (!first) first = header;
        entityShapes.set(entity.name, { shape: header, x, y, width: entity.width, height: entity.headerHeight });
        const attributes = entity.attributes.length ? entity.attributes : [{ type: '', name: 'No attributes', key: '' }];
        attributes.forEach((attribute, row) => push(new window.Rectangle(
            x, y + entity.headerHeight + row * entity.rowHeight, entity.width, entity.rowHeight,
            { stroke: TK.frame, strokeWidth: 1, fill: TK.panel, fillStyle: 'solid', roughness: .4,
                label: [attribute.type, attribute.name, attribute.key].filter(Boolean).join('  '), labelColor: TK.text, labelFontSize: 11 }
        ), frame));
    }

    for (const relation of diagram.relationships) {
        const from = entityShapes.get(relation.from);
        const to = entityShapes.get(relation.to);
        if (!from || !to) continue;
        const start = { x: from.x + from.width / 2, y: from.y + from.height / 2 };
        const end = { x: to.x + to.width / 2, y: to.y + to.height / 2 };
        const arrow = push(new window.Arrow(start, end, {
            stroke: TK.line, strokeWidth: 1.5, roughness: 1,
            label: `${relation.fromCardinality} ${relation.label} ${relation.toCardinality}`, labelColor: TK.text,
        }), frame);
        if (arrow && window.__autoAttach) {
            window.__autoAttach(arrow, from.shape, true, start);
            window.__autoAttach(arrow, to.shape, false, end);
        }
    }
    if (first?.selectShape) { window.currentShape = first; first.selectShape(); }
    return true;
}

export function renderChartOnCanvas(chart) {
    if (!chart?.series?.length || !window.Rectangle || !window.Circle || !window.Line || !window.Frame) return false;
    const TK = theme();
    const width = 720;
    const height = 450;
    const origin = canvasOrigin(width, height);
    const frame = createFrame(origin.x, origin.y, width, height, chart.title, 'mermaid-chart');
    const left = origin.x + 70;
    const top = origin.y + 65;
    const plotWidth = 580;
    const plotHeight = 300;
    const values = chart.series.flatMap(series => series.values);
    const maximum = Math.max(1, ...values.map(Math.abs));
    const slot = plotWidth / Math.max(1, chart.categories.length);
    let first = null;

    push(new window.Line({ x: left, y: top }, { x: left, y: top + plotHeight }, { stroke: TK.line, strokeWidth: 1.5, roughness: 0 }), frame);
    push(new window.Line({ x: left, y: top + plotHeight }, { x: left + plotWidth, y: top + plotHeight }, { stroke: TK.line, strokeWidth: 1.5, roughness: 0 }), frame);

    chart.series.forEach((series, seriesIndex) => {
        const color = PALETTE[seriesIndex % PALETTE.length];
        if (series.kind === 'line') {
            let previous = null;
            series.values.forEach((value, index) => {
                const point = { x: left + slot * (index + .5), y: top + plotHeight - Math.abs(value) / maximum * plotHeight };
                const dot = push(new window.Circle(point.x, point.y, 8, 8, {
                    stroke: color.stroke, strokeWidth: 2, fill: color.fill, fillStyle: 'solid', roughness: .5,
                    label: String(value), labelColor: TK.text, labelFontSize: 9,
                }), frame);
                if (!first) first = dot;
                if (previous) push(new window.Line(previous, point, { stroke: color.stroke, strokeWidth: 3, roughness: .5 }), frame);
                previous = point;
            });
        } else {
            const barWidth = Math.max(18, slot * .7 / chart.series.length);
            series.values.forEach((value, index) => {
                const barHeight = Math.max(8, Math.abs(value) / maximum * plotHeight);
                const x = left + slot * index + slot * .15 + seriesIndex * barWidth;
                const bar = push(new window.Rectangle(x, top + plotHeight - barHeight, barWidth, barHeight, {
                    stroke: color.stroke, strokeWidth: 1.5, fill: color.fill, fillStyle: 'solid', roughness: .7,
                    label: `${chart.categories[index] || index + 1}\n${value}`, labelColor: '#343832', labelFontSize: 11,
                }), frame);
                if (!first) first = bar;
            });
        }
    });
    if (first?.selectShape) { window.currentShape = first; first.selectShape(); }
    return true;
}
