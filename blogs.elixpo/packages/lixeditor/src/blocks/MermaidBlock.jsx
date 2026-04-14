'use client';

import { createReactBlockSpec } from '@blocknote/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useLixTheme as useTheme } from '../hooks/useLixTheme';

const darkConfig = {
  startOnLoad: false,
  securityLevel: 'loose',
  theme: 'dark',
  themeVariables: {
    primaryColor: '#232d3f',
    primaryTextColor: '#e4e4e7',
    primaryBorderColor: '#c4b5fd',
    lineColor: '#8b8fa3',
    secondaryColor: '#1e1e2e',
    tertiaryColor: '#141a26',
    fontFamily: "'lixFont', sans-serif",
    fontSize: '16px',
    nodeTextColor: '#e4e4e7',
    nodeBorder: '#c4b5fd',
    mainBkg: '#232d3f',
    clusterBkg: '#1a1f2e',
    clusterBorder: '#333',
    titleColor: '#c4b5fd',
    edgeLabelBackground: '#141a26',
    git0: '#c4b5fd',
    git1: '#7c5cbf',
    git2: '#4ade80',
    git3: '#f59e0b',
    git4: '#ef4444',
    git5: '#3b82f6',
    git6: '#ec4899',
    git7: '#14b8a6',
    gitBranchLabel0: '#e4e4e7',
    gitBranchLabel1: '#e4e4e7',
    gitBranchLabel2: '#e4e4e7',
    gitBranchLabel3: '#e4e4e7',
    gitInv0: '#141a26',
  },
  flowchart: { padding: 20, nodeSpacing: 50, rankSpacing: 60, curve: 'basis', htmlLabels: true, useMaxWidth: false },
  sequence: { useMaxWidth: false, boxMargin: 10, noteMargin: 10, messageMargin: 35, mirrorActors: false },
  gitGraph: { showBranches: true, showCommitLabel: true, mainBranchName: 'main', rotateCommitLabel: false },
};

const lightConfig = {
  startOnLoad: false,
  securityLevel: 'loose',
  theme: 'default',
  themeVariables: {
    primaryColor: '#e8e0ff',
    primaryTextColor: '#1a1a2e',
    primaryBorderColor: '#7c5cbf',
    lineColor: '#6b7280',
    secondaryColor: '#f3f0ff',
    tertiaryColor: '#f9fafb',
    fontFamily: "'lixFont', sans-serif",
    fontSize: '16px',
    nodeTextColor: '#1a1a2e',
    nodeBorder: '#7c5cbf',
    mainBkg: '#e8e0ff',
    clusterBkg: '#f3f0ff',
    clusterBorder: '#d1d5db',
    titleColor: '#7c5cbf',
    edgeLabelBackground: '#f9fafb',
    git0: '#7c5cbf',
    git1: '#9b7bf7',
    git2: '#16a34a',
    git3: '#d97706',
    git4: '#dc2626',
    git5: '#2563eb',
    git6: '#db2777',
    git7: '#0d9488',
  },
  flowchart: { padding: 20, nodeSpacing: 50, rankSpacing: 60, curve: 'basis', htmlLabels: true, useMaxWidth: false },
  sequence: { useMaxWidth: false, boxMargin: 10, noteMargin: 10, messageMargin: 35, mirrorActors: false },
  gitGraph: { showBranches: true, showCommitLabel: true, mainBranchName: 'main', rotateCommitLabel: false },
};

let mermaidModule = null;
let mermaidLoadPromise = null;
let renderQueue = Promise.resolve();
let lastTheme = null;

async function getMermaid(isDark) {
  if (!mermaidModule) {
    if (!mermaidLoadPromise) {
      // Import the full ESM bundle — the default 'mermaid' export maps to mermaid.core.mjs
      // which strips gitGraph, pie, timeline, etc. via lazy-loading that breaks with webpack.
      mermaidLoadPromise = import('mermaid').then(m => {
        mermaidModule = m.default;
        return mermaidModule;
      });
    }
    await mermaidLoadPromise;
  }
  const theme = isDark ? 'dark' : 'light';
  if (lastTheme !== theme) {
    lastTheme = theme;
    mermaidModule.initialize(isDark ? darkConfig : lightConfig);
  }
  return mermaidModule;
}

// Serialize render calls — mermaid is a singleton and concurrent renders cause conflicts
function queueRender(fn) {
  renderQueue = renderQueue.then(fn, fn);
  return renderQueue;
}

// Shared component that renders a mermaid diagram to SVG
function MermaidPreview({ diagram, isDark, interactive }) {
  const containerRef = useRef(null);
  const [svgHTML, setSvgHTML] = useState('');
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!diagram?.trim()) {
      setSvgHTML('');
      setError('');
      return;
    }
    let cancelled = false;
    const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    queueRender(async () => {
      if (cancelled) return;
      try {
        const mermaid = await getMermaid(isDark);
        if (cancelled) return;

        // Normalize diagram type keywords to correct casing (mermaid is case-sensitive)
        let diagramText = diagram.trim();
        diagramText = diagramText.replace(/^\s*gitgraph/i, 'gitGraph');
        diagramText = diagramText.replace(/^\s*sequencediagram/i, 'sequenceDiagram');
        diagramText = diagramText.replace(/^\s*classDiagram/i, 'classDiagram');
        diagramText = diagramText.replace(/^\s*stateDiagram/i, 'stateDiagram');
        diagramText = diagramText.replace(/^\s*erDiagram/i, 'erDiagram');
        diagramText = diagramText.replace(/^\s*gantt/i, 'gantt');

        const tempDiv = document.createElement('div');
        tempDiv.id = 'container-' + id;
        tempDiv.style.cssText = 'position:fixed;top:0;left:0;width:100vw;opacity:0;pointer-events:none;z-index:-9999;';
        document.body.appendChild(tempDiv);

        const { svg } = await mermaid.render(id, diagramText, tempDiv);
        tempDiv.remove();

        if (!cancelled) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(svg, 'image/svg+xml');
          const svgEl = doc.querySelector('svg');
          if (svgEl) {
            svgEl.removeAttribute('width');
            svgEl.setAttribute('style', 'width:100%;height:auto;max-width:100%;');
          }
          setSvgHTML(svgEl ? svgEl.outerHTML : svg);
          setError('');
          setZoom(1);
          setPan({ x: 0, y: 0 });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Invalid diagram syntax');
          setSvgHTML('');
        }
        try { document.getElementById(id)?.remove(); } catch {}
        try { document.getElementById('container-' + id)?.remove(); } catch {}
      }
    });

    return () => { cancelled = true; };
  }, [diagram, isDark]);

  // Mouse wheel zoom
  useEffect(() => {
    if (!interactive) return;
    const el = containerRef.current;
    if (!el) return;
    const handleWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setZoom((z) => {
        const delta = e.deltaY > 0 ? -0.1 : 0.1;
        return Math.min(3, Math.max(0.3, z + delta));
      });
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [svgHTML, interactive]);

  // Pan via drag
  const handleMouseDown = useCallback((e) => {
    if (!interactive || e.button !== 0) return;
    e.preventDefault();
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...pan };
  }, [pan, interactive]);

  const handleMouseMove = useCallback((e) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({ x: panStart.current.x + dx, y: panStart.current.y + dy });
  }, []);

  const handleMouseUp = useCallback(() => {
    dragging.current = false;
  }, []);

  useEffect(() => {
    if (!interactive) return;
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp, interactive]);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  if (error) {
    return (
      <div className="mermaid-viewport mermaid-viewport--compact">
        <pre style={{ color: '#f87171', fontSize: '12px', whiteSpace: 'pre-wrap', padding: '16px', margin: 0 }}>{error}</pre>
      </div>
    );
  }

  if (!diagram?.trim()) {
    return (
      <div className="mermaid-viewport mermaid-viewport--compact" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-faint)', fontSize: '12px' }}>Preview will appear here...</span>
      </div>
    );
  }

  if (!svgHTML) {
    return (
      <div className="mermaid-viewport mermaid-viewport--compact" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-faint)', fontSize: '13px' }}>Rendering...</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={interactive ? 'mermaid-viewport' : 'mermaid-viewport mermaid-viewport--compact'}
      onMouseDown={handleMouseDown}
    >
      <div
        className="mermaid-block-svg"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
        }}
        dangerouslySetInnerHTML={{ __html: svgHTML }}
      />
      {interactive && (
        <div className="mermaid-zoom-controls">
          <button
            onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.min(3, z + 0.2)); }}
            className="mermaid-zoom-btn"
            title="Zoom in"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <span className="mermaid-zoom-label">{Math.round(zoom * 100)}%</span>
          <button
            onClick={(e) => { e.stopPropagation(); setZoom((z) => Math.max(0.3, z - 0.2)); }}
            className="mermaid-zoom-btn"
            title="Zoom out"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); resetView(); }}
            className="mermaid-zoom-btn"
            title="Reset view"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/><polyline points="1 4 1 10 7 10"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export const MermaidBlock = createReactBlockSpec(
  {
    type: 'mermaidBlock',
    propSchema: {
      diagram: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const { isDark } = useTheme();
      const [editing, setEditing] = useState(!block.props.diagram);
      const [value, setValue] = useState(block.props.diagram || '');
      const [livePreview, setLivePreview] = useState(block.props.diagram || '');
      const inputRef = useRef(null);
      const debounceRef = useRef(null);

      useEffect(() => {
        if (editing && inputRef.current) inputRef.current.focus();
      }, [editing]);

      // Debounced live preview update while typing
      const handleCodeChange = useCallback((e) => {
        const v = e.target.value;
        setValue(v);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => setLivePreview(v), 400);
      }, []);

      useEffect(() => {
        return () => clearTimeout(debounceRef.current);
      }, []);

      const save = useCallback(() => {
        editor.updateBlock(block, { props: { diagram: value } });
        setEditing(false);
      }, [editor, block, value]);

      const handleDelete = useCallback(() => {
        try { editor.removeBlocks([block.id]); } catch {}
      }, [editor, block.id]);

      if (editing) {
        return (
          <div className="mermaid-block mermaid-block--editing">
            <div className="mermaid-block-header">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z"/>
              </svg>
              <span>Mermaid Diagram</span>
              <span style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--text-faint)' }}>Shift+Enter to save</span>
            </div>
            <textarea
              ref={inputRef}
              value={value}
              onChange={handleCodeChange}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); save(); }
                if (e.key === 'Escape') { setEditing(false); setValue(block.props.diagram || ''); setLivePreview(block.props.diagram || ''); }
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const start = e.target.selectionStart;
                  const end = e.target.selectionEnd;
                  const newVal = value.substring(0, start) + '    ' + value.substring(end);
                  setValue(newVal);
                  setLivePreview(newVal);
                  requestAnimationFrame(() => {
                    e.target.selectionStart = e.target.selectionEnd = start + 4;
                  });
                }
              }}
              placeholder={`graph TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[OK]\n    B -->|No| D[End]`}
              rows={8}
              className="mermaid-block-textarea"
            />
            {/* Live preview panel */}
            <div className="mermaid-live-preview">
              <div className="mermaid-live-preview-label">Preview</div>
              <MermaidPreview diagram={livePreview} isDark={isDark} interactive={false} />
            </div>
            <div className="mermaid-block-actions">
              <button onClick={() => { setEditing(false); setValue(block.props.diagram || ''); setLivePreview(block.props.diagram || ''); }} className="mermaid-btn-cancel">Cancel</button>
              <button onClick={save} className="mermaid-btn-save" disabled={!value.trim()}>Done</button>
            </div>
          </div>
        );
      }

      if (!block.props.diagram) {
        return (
          <div onClick={() => setEditing(true)} className="mermaid-block mermaid-block--empty">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="8.5" y="14" width="7" height="7" rx="1.5" />
              <line x1="6.5" y1="10" x2="6.5" y2="14" />
              <line x1="17.5" y1="10" x2="17.5" y2="14" />
              <line x1="6.5" y1="14" x2="8.5" y2="14" />
              <line x1="17.5" y1="14" x2="15.5" y2="14" />
            </svg>
            <span>Click to add a Mermaid diagram</span>
          </div>
        );
      }

      return (
        <div className="mermaid-block mermaid-block--rendered group" onDoubleClick={() => setEditing(true)}>
          <MermaidPreview diagram={block.props.diagram} isDark={isDark} interactive={true} />
          <div className="mermaid-block-hover">
            <button onClick={() => setEditing(true)} className="mermaid-hover-btn" title="Edit diagram">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button onClick={handleDelete} className="mermaid-hover-btn mermaid-hover-delete" title="Delete">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      );
    },
  }
);
