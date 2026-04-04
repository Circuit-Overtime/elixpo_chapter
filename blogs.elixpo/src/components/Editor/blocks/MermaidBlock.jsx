'use client';

import { createReactBlockSpec } from '@blocknote/react';
import { useState, useEffect, useRef, useCallback } from 'react';

const mermaidConfig = {
  startOnLoad: false,
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
  },
  flowchart: {
    padding: 20,
    nodeSpacing: 50,
    rankSpacing: 60,
    curve: 'basis',
    htmlLabels: true,
    useMaxWidth: false,
  },
  sequence: {
    useMaxWidth: false,
    boxMargin: 10,
    noteMargin: 10,
    messageMargin: 35,
    mirrorActors: false,
  },
};

let mermaidModule = null;

async function getMermaid() {
  if (!mermaidModule) {
    mermaidModule = (await import('mermaid')).default;
    mermaidModule.initialize(mermaidConfig);
  }
  return mermaidModule;
}

function MermaidViewer({ diagram }) {
  const containerRef = useRef(null);
  const [svgHTML, setSvgHTML] = useState('');
  const [error, setError] = useState('');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  // Render mermaid to SVG string
  useEffect(() => {
    if (!diagram?.trim()) return;
    let cancelled = false;
    const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    (async () => {
      try {
        const mermaid = await getMermaid();
        // Container must be visible + in layout for SVG getBBox to work
        // Use a different ID for the container to avoid collision with mermaid's SVG id
        const tempDiv = document.createElement('div');
        tempDiv.id = 'container-' + id;
        tempDiv.style.cssText = 'position:fixed;top:0;left:0;width:100vw;opacity:0;pointer-events:none;z-index:-9999;';
        document.body.appendChild(tempDiv);

        const { svg } = await mermaid.render(id, diagram.trim(), tempDiv);

        tempDiv.remove();

        if (!cancelled) {
          setSvgHTML(svg);
          setError('');
          setZoom(1);
          setPan({ x: 0, y: 0 });
        }
      } catch (err) {
        console.error('[Mermaid] Render error:', err);
        if (!cancelled) {
          setError(err.message || 'Invalid diagram syntax');
          setSvgHTML('');
        }
        // Clean up any leftover temp elements
        try { document.getElementById(id)?.remove(); } catch {}
      }
    })();

    return () => { cancelled = true; };
  }, [diagram]);

  // Mouse wheel zoom — use native listener to avoid passive event issue
  useEffect(() => {
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
  }, [svgHTML]); // re-attach when SVG loads since containerRef might change

  // Pan via drag
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...pan };
  }, [pan]);

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
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  if (error) {
    return (
      <div className="mermaid-viewport">
        <pre style={{ color: '#f87171', fontSize: '12px', whiteSpace: 'pre-wrap', padding: '16px', margin: 0 }}>{error}</pre>
      </div>
    );
  }

  if (!svgHTML) {
    return (
      <div className="mermaid-viewport" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: 'var(--text-faint)', fontSize: '13px' }}>Loading diagram...</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mermaid-viewport"
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
      {/* Zoom controls */}
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
      const [editing, setEditing] = useState(!block.props.diagram);
      const [value, setValue] = useState(block.props.diagram || '');
      const inputRef = useRef(null);

      useEffect(() => {
        if (editing && inputRef.current) inputRef.current.focus();
      }, [editing]);

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
            </div>
            <textarea
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); save(); }
                if (e.key === 'Escape') { setEditing(false); setValue(block.props.diagram || ''); }
              }}
              placeholder={`graph TD\n    A[Start] --> B{Decision}\n    B -->|Yes| C[OK]\n    B -->|No| D[End]`}
              rows={8}
              className="mermaid-block-textarea"
            />
            <div className="mermaid-block-actions">
              <button onClick={() => { setEditing(false); setValue(block.props.diagram || ''); }} className="mermaid-btn-cancel">Cancel</button>
              <button onClick={save} className="mermaid-btn-save" disabled={!value.trim()}>Render</button>
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
          <MermaidViewer diagram={block.props.diagram} />
          <div className="mermaid-block-hover">
            <button onClick={() => setEditing(true)} className="mermaid-hover-btn" title="Edit">
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
