'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// ── Taxonomy ──────────────────────────────────────────────────────
const CATS = [
  { id: 'Graphic Design',    label: 'GRAPHIC\nDESIGN',    num: '01' },
  { id: 'Painting',          label: 'PAINTING',           num: '02' },
  { id: 'Prints & Drawings', label: 'PRINTS &\nDRAWINGS', num: '03' },
  { id: 'Photography',       label: 'PHOTO-\nGRAPHY',     num: '04' },
  { id: 'Decorative Arts',   label: 'DECORATIVE\nARTS',   num: '05' },
];

const SUB_MAP = {
  'Graphic Design':    ['Posters & Advertising','Typography & Lettering','Identity & Branding','Editorial/Publication','Packaging'],
  'Painting':          ['Oil','Watercolor/Gouache','Tempera/Fresco'],
  'Prints & Drawings': ['Etching/Woodcut/Lithograph','Drawings','Collage'],
  'Photography':       ['Photograph'],
  'Decorative Arts':   ['Ceramics & Glass','Furniture','Textiles & Fashion','Metalwork & Jewelry'],
};

const SOURCES = [
  { id: 'moma',         label: 'MoMA'          },
  { id: 'met',          label: 'The Met'       },
  { id: 'artic',        label: 'Art Inst.'     },
  { id: 'cooperhewitt', label: 'Cooper Hewitt' },
  { id: 'va',           label: 'V&A'           },
  { id: 'rijks',        label: 'Rijksmuseum'   },
  { id: 'smithsonian',  label: 'Smithsonian'   },
];

function thumbnailUrl(url, size = 600) {
  if (!url) return '';
  return `/api/img?url=${encodeURIComponent(url)}&size=${size}`;
}

// ── Graph builder — everything free-floating ──────────────────────
function buildGraph(layer, counts, W, H) {
  const cx = W / 2, cy = H / 2;
  const nodes = [];
  const edges = [];

  // Central "Exhibit" node — starts at center, fully free
  nodes.push({
    id: '__exhibit__', label: 'EXHIBIT', type: 'root',
    x: cx, y: cy, vx: 0, vy: 0, r: 36, fixed: false,
  });

  // Category nodes — pentagon around center
  CATS.forEach((cat, i) => {
    const angle = (i / CATS.length) * Math.PI * 2 - Math.PI / 2;
    const d     = Math.min(W, H) * 0.22;
    const idx   = nodes.length;
    nodes.push({
      id:    cat.id, label: cat.label, num: cat.num,
      type:  'cat',
      x:     cx + d * Math.cos(angle) + (Math.random() - 0.5) * 20,
      y:     cy + d * Math.sin(angle) + (Math.random() - 0.5) * 20,
      vx: 0, vy: 0, r: 28, fixed: false,
      count: counts[cat.id] || 0,
    });
    // Connect every category to the central Exhibit node
    edges.push({ a: 0, b: idx, len: Math.min(W, H) * 0.22 });
  });

  if (layer === 'sub') {
    CATS.forEach((cat, ci) => {
      const catIdx = ci + 1; // +1 because node[0] is __exhibit__
      const parent = nodes[catIdx];
      const subs   = SUB_MAP[cat.id] || [];
      subs.forEach((sub, si) => {
        const baseAngle = (ci / CATS.length) * Math.PI * 2 - Math.PI / 2;
        const spread    = subs.length > 1 ? (si / (subs.length - 1) - 0.5) * 1.4 : 0;
        const a         = baseAngle + spread * 0.9;
        const d         = 105 + Math.random() * 20;
        const idx       = nodes.length;
        nodes.push({
          id: `${cat.id}::${sub}`, label: sub,
          parentId: cat.id, type: 'sub',
          x: parent.x + d * Math.cos(a) + (Math.random() - 0.5) * 18,
          y: parent.y + d * Math.sin(a) + (Math.random() - 0.5) * 18,
          vx: 0, vy: 0, r: 10, fixed: false,
          navType: cat.id, navSub: sub,
        });
        edges.push({ a: catIdx, b: idx, len: 108 });
      });
    });
  } else {
    SOURCES.forEach((src, si) => {
      const angle = (si / SOURCES.length) * Math.PI * 2;
      const d     = Math.min(W, H) * 0.32;
      const idx   = nodes.length;
      nodes.push({
        id: `src::${src.id}`, label: src.label, srcId: src.id,
        type: 'src',
        x: cx + d * Math.cos(angle) + (Math.random() - 0.5) * 40,
        y: cy + d * Math.sin(angle) + (Math.random() - 0.5) * 40,
        vx: 0, vy: 0, r: 14, fixed: false,
      });
      // Each institution connects to every category
      for (let ci = 1; ci <= CATS.length; ci++) {
        edges.push({ a: ci, b: idx, len: 180 });
      }
    });
  }

  return { nodes, edges };
}

// ── Physics — Obsidian feel ───────────────────────────────────────
// Key: higher damping → almost-still drift; low thermal noise → subtle alive
function tick(nodes, edges, W, H, frameCount) {
  const REP   = 3800;
  const SPR   = 0.032;
  const DAMP  = 0.86;
  const NOISE = 0.06; // tiny thermal energy every frame

  // Repulsion between all nodes
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const ni = nodes[i], nj = nodes[j];
      const dx = ni.x - nj.x, dy = ni.y - nj.y;
      const d2 = dx * dx + dy * dy || 1;
      const d  = Math.sqrt(d2);
      const f  = REP / d2;
      const fx = f * dx / d, fy = f * dy / d;
      ni.vx += fx; ni.vy += fy;
      nj.vx -= fx; nj.vy -= fy;
    }
  }

  // Spring along edges
  for (const e of edges) {
    const a = nodes[e.a], b = nodes[e.b];
    if (!a || !b) continue;
    const dx  = b.x - a.x, dy = b.y - a.y;
    const d   = Math.sqrt(dx * dx + dy * dy) || 1;
    const del = (d - e.len) * SPR;
    const fx  = del * dx / d, fy = del * dy / d;
    a.vx += fx; a.vy += fy;
    b.vx -= fx; b.vy -= fy;
  }

  // Integrate + boundaries + thermal noise
  for (const n of nodes) {
    if (n.dragging) continue;

    // Subtle thermal noise — the "alive" quality
    const phase = frameCount * 0.031 + n.id.length * 0.7;
    n.vx += Math.sin(phase)              * NOISE;
    n.vy += Math.cos(phase * 1.3 + 1.1) * NOISE;

    n.vx *= DAMP;
    n.vy *= DAMP;
    n.x   = Math.max(n.r + 18, Math.min(W - n.r - 18, n.x + n.vx));
    n.y   = Math.max(n.r + 18, Math.min(H - n.r - 18, n.y + n.vy));
  }
}

// ── Canvas draw ───────────────────────────────────────────────────
function draw(ctx, nodes, edges, hovId, selId, W, H) {
  ctx.clearRect(0, 0, W, H);

  // Edges
  for (const e of edges) {
    const a = nodes[e.a], b = nodes[e.b];
    if (!a || !b) continue;
    const aLit = a.id === hovId || a.id === selId;
    const bLit = b.id === hovId || b.id === selId;
    const lit  = aLit || bLit;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = lit ? 'rgba(13,12,10,0.28)' : 'rgba(13,12,10,0.09)';
    ctx.lineWidth   = lit ? 1.1 : 0.6;
    ctx.stroke();
  }

  // Nodes
  for (const n of nodes) {
    const isHov = n.id === hovId;
    const isSel = n.id === selId;
    const r     = isHov ? n.r + 3 : n.r;

    if (isSel) { ctx.shadowColor = 'rgba(0,0,0,0.18)'; ctx.shadowBlur = 16; }

    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);

    if (n.type === 'root') {
      // Central node — clean black circle, slightly larger
      ctx.fillStyle = isSel ? '#000' : isHov ? '#1a1a1a' : '#0d0c0a';
      ctx.fill();
    } else if (n.type === 'cat') {
      ctx.fillStyle = isSel ? '#000' : isHov ? '#1f1f1d' : '#2a2826';
      ctx.fill();
    } else if (n.type === 'sub') {
      ctx.fillStyle   = isHov || isSel ? '#dbd9d3' : '#eae8e2';
      ctx.fill();
      ctx.strokeStyle = isHov || isSel ? 'rgba(13,12,10,0.55)' : 'rgba(13,12,10,0.2)';
      ctx.lineWidth   = 1;
      ctx.stroke();
    } else {
      // Source
      ctx.fillStyle = isSel ? '#0d0c0a' : isHov ? '#242220' : '#363330';
      ctx.fill();
    }

    ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';

    // Labels
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

    if (n.type === 'root') {
      ctx.fillStyle = 'rgba(240,237,232,0.95)';
      ctx.font      = '800 8px "DM Sans", system-ui';
      ctx.fillText('EXHIBIT', n.x, n.y);
    } else if (n.type === 'cat') {
      ctx.fillStyle = 'rgba(240,237,232,0.92)';
      ctx.font      = '700 7px "DM Sans", system-ui';
      const lines = n.label.split('\n');
      lines.forEach((ln, li) => ctx.fillText(ln, n.x, n.y + (li - (lines.length - 1) / 2) * 8.5));
    } else if (n.type === 'src') {
      ctx.fillStyle = 'rgba(240,237,232,0.88)';
      ctx.font      = '600 6.5px "DM Sans", system-ui';
      ctx.fillText(n.label, n.x, n.y);
    } else {
      // Sub — label below
      ctx.fillStyle    = isHov || isSel ? 'rgba(13,12,10,0.75)' : 'rgba(13,12,10,0.4)';
      ctx.font         = '500 6px "DM Mono", monospace';
      ctx.textBaseline = 'top';
      let text = n.label;
      while (ctx.measureText(text).width > 76 && text.length > 3) text = text.slice(0, -1);
      if (text !== n.label) text += '…';
      ctx.fillText(text, n.x, n.y + n.r + 3);
    }
  }
}

// ── Component ─────────────────────────────────────────────────────
export default function WanderPage() {
  const router       = useRouter();
  const canvasRef    = useRef(null);
  const containerRef = useRef(null);
  const nodesRef     = useRef([]);
  const edgesRef     = useRef([]);
  const rafRef       = useRef(null);
  const frameRef     = useRef(0);
  const dragRef      = useRef(null);
  const didDragRef   = useRef(false);
  const hovIdRef     = useRef(null);
  const selIdRef     = useRef(null);
  const sizeRef      = useRef({ W: 900, H: 700, dpr: 1 });

  const [layer,        setLayer]        = useState('sub');
  const [counts,       setCounts]       = useState({});
  const [previews,     setPreviews]     = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);

  const basePreviewsRef = useRef([]);
  const previewAbortRef = useRef(null);

  // Initial fetch — random previews + counts
  useEffect(() => {
    fetch('/api/search?limit=3')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.results) { basePreviewsRef.current = d.results; setPreviews(d.results); }
      })
      .catch(() => {});
    fetch('/api/search?counts=1')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.counts) setCounts(d.counts); })
      .catch(() => {});
  }, []);

  // Node-reactive previews — fetch images specific to the selected node
  useEffect(() => {
    if (previewAbortRef.current) previewAbortRef.current.abort();
    if (!selectedNode || selectedNode.type === 'root' || selectedNode.type === 'src') {
      setPreviews(basePreviewsRef.current);
      return;
    }
    const ctrl = new AbortController();
    previewAbortRef.current = ctrl;
    let url;
    if (selectedNode.type === 'cat') {
      url = `/api/search?type=${encodeURIComponent(selectedNode.id)}&limit=6`;
    } else {
      const [type, sub] = selectedNode.id.split('::');
      url = `/api/search?type=${encodeURIComponent(type)}&sub=${encodeURIComponent(sub)}&limit=6`;
    }
    fetch(url, { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.results?.length) return;
        const picked = d.results.filter(r => r.imageUrl).sort(() => Math.random() - 0.5).slice(0, 3);
        if (picked.length) setPreviews(picked);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [selectedNode]);

  // Init graph
  useEffect(() => {
    const container = containerRef.current;
    const canvas    = canvasRef.current;
    if (!container || !canvas) return;

    const rect = container.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    const dpr = window.devicePixelRatio || 1;
    sizeRef.current = { W, H, dpr };

    canvas.width       = W * dpr;
    canvas.height      = H * dpr;
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const { nodes, edges } = buildGraph(layer, counts, W, H);
    // Pre-settle — enough to untangle, not so much it looks frozen
    for (let i = 0; i < 280; i++) tick(nodes, edges, W, H, i);

    nodesRef.current = nodes;
    edgesRef.current = edges;
    setSelectedNode(null);
    selIdRef.current = null;
  }, [layer, counts]);

  // RAF loop
  useEffect(() => {
    function loop() {
      const canvas = canvasRef.current;
      if (!canvas) { rafRef.current = requestAnimationFrame(loop); return; }
      const ctx = canvas.getContext('2d');
      const { W, H } = sizeRef.current;
      frameRef.current++;
      tick(nodesRef.current, edgesRef.current, W, H, frameRef.current);
      draw(ctx, nodesRef.current, edgesRef.current, hovIdRef.current, selIdRef.current, W, H);
      rafRef.current = requestAnimationFrame(loop);
    }
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // Hit test
  function nodeAt(x, y) {
    return nodesRef.current.find(n => {
      const dx = n.x - x, dy = n.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= n.r + 6;
    }) || null;
  }

  const onMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;

    if (dragRef.current) {
      const n = nodesRef.current[dragRef.current.idx];
      if (n) {
        n.x = x + dragRef.current.ox;
        n.y = y + dragRef.current.oy;
        n.vx = 0; n.vy = 0;
        didDragRef.current = true;
      }
      return;
    }

    const hit = nodeAt(x, y);
    hovIdRef.current = hit?.id || null;
    canvas.style.cursor = hit ? 'pointer' : 'default';
  }, []);

  const onMouseDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left, y = e.clientY - rect.top;
    const hit = nodeAt(x, y);
    if (hit) {
      const idx = nodesRef.current.findIndex(n => n.id === hit.id);
      dragRef.current    = { idx, ox: hit.x - x, oy: hit.y - y };
      didDragRef.current = false;
      nodesRef.current[idx].dragging = true;
    }
  }, []);

  const onMouseUp = useCallback((e) => {
    if (dragRef.current !== null) {
      const idx = dragRef.current.idx;
      if (nodesRef.current[idx]) nodesRef.current[idx].dragging = false;
    }
    const wasDrag   = didDragRef.current;
    dragRef.current = null;
    didDragRef.current = false;
    if (wasDrag) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const hit  = nodeAt(e.clientX - rect.left, e.clientY - rect.top);

    if (hit) {
      selIdRef.current = hit.id;
      setSelectedNode(hit);
    } else {
      selIdRef.current = null;
      setSelectedNode(null);
    }
  }, []);

  function navigate(node) {
    if (node.type === 'cat') router.push(`/gallery?type=${encodeURIComponent(node.id)}`);
    else if (node.type === 'sub') {
      const [type, sub] = node.id.split('::');
      router.push(`/gallery?type=${encodeURIComponent(type)}&sub=${encodeURIComponent(sub)}`);
    }
  }

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 272px', height: '100vh', background: '#f0ede8', overflow: 'hidden' }}>

      {/* ── Canvas ──────────────────────────────────── */}
      <div ref={containerRef} style={{ position: 'relative', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          onMouseMove={onMouseMove}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onMouseLeave={() => { hovIdRef.current = null; }}
          style={{ display: 'block' }}
        />

        {/* Wordmark */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          style={{ position: 'absolute', top: '2rem', left: '2rem', pointerEvents: 'none' }}
        >
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.45rem', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1, color: '#0d0c0a' }}>
            DIGITAL@SCALE
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.43rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(13,12,10,0.3)', marginTop: '0.28rem' }}>
            Archive Map
          </p>
        </motion.div>

        {/* Layer toggle */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
          style={{
            position: 'absolute', bottom: '2rem', left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex', gap: 2,
            background: '#f0ede8',
            border: '1px solid rgba(13,12,10,0.12)',
            padding: 3,
          }}
        >
          {[
            { key: 'sub',    label: 'Disciplines'  },
            { key: 'source', label: 'Institutions' },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setLayer(key)} style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.43rem', fontWeight: 500,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              padding: '5px 16px', border: 'none', cursor: 'pointer',
              background: layer === key ? '#0d0c0a'         : 'transparent',
              color:      layer === key ? 'rgba(240,237,232,0.95)' : 'rgba(13,12,10,0.36)',
              transition: 'all 0.14s ease',
            }}>
              {label}
            </button>
          ))}
        </motion.div>

        {/* Hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          style={{
            position: 'absolute', bottom: '2.1rem', right: '1.75rem',
            fontFamily: 'var(--font-mono)', fontSize: '0.38rem',
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'rgba(13,12,10,0.18)', pointerEvents: 'none',
          }}
        >
          Drag · Click to explore
        </motion.p>
      </div>

      {/* ── Right panel ─────────────────────────────── */}
      <div style={{
        borderLeft: '1px solid rgba(13,12,10,0.08)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        background: '#f0ede8',
      }}>

        {/* Count header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          style={{ padding: '1.75rem 1.5rem 1.25rem', borderBottom: '1px solid rgba(13,12,10,0.07)' }}
        >
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.42rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(13,12,10,0.25)', marginBottom: '0.4rem' }}>
            Index System
          </p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 300, letterSpacing: '-0.025em', lineHeight: 1, color: '#0d0c0a' }}>
            {totalCount > 0 ? totalCount.toLocaleString() : '—'}
          </h2>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.4rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(13,12,10,0.22)', marginTop: '0.3rem' }}>
            works catalogued
          </p>
        </motion.div>

        {/* Node info / hint */}
        <AnimatePresence mode="wait">
          {selectedNode ? (
            <motion.div
              key={selectedNode.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(13,12,10,0.07)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.38rem', letterSpacing: '0.18em', textTransform: 'uppercase', border: '1px solid rgba(13,12,10,0.13)', padding: '2px 7px', color: 'rgba(13,12,10,0.36)' }}>
                  {selectedNode.type === 'root' ? 'Archive' : selectedNode.type === 'cat' ? 'Category' : selectedNode.type === 'sub' ? 'Discipline' : 'Institution'}
                </span>
                <button onClick={() => { setSelectedNode(null); selIdRef.current = null; }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.4rem', color: 'rgba(13,12,10,0.28)', letterSpacing: '0.1em' }}>
                  ✕
                </button>
              </div>

              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem', fontWeight: 300, letterSpacing: '-0.015em', lineHeight: 1.2, color: '#0d0c0a', marginBottom: '0.4rem' }}>
                {selectedNode.label.replace(/\n/g, ' ')}
              </h3>

              {selectedNode.count > 0 && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.42rem', letterSpacing: '0.1em', color: 'rgba(13,12,10,0.36)', marginBottom: '1rem' }}>
                  {selectedNode.count.toLocaleString()} works
                </p>
              )}

              {(selectedNode.type === 'cat' || selectedNode.type === 'sub') && (
                <button onClick={() => navigate(selectedNode)}
                  style={{
                    width: '100%', fontFamily: 'var(--font-mono)', fontSize: '0.44rem',
                    fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase',
                    padding: '0.65rem 0', border: '1px solid rgba(13,12,10,0.18)',
                    background: 'transparent', color: 'rgba(13,12,10,0.6)', cursor: 'pointer',
                    transition: 'all 0.13s ease',
                  }}
                  onMouseEnter={e => { e.target.style.background = '#0d0c0a'; e.target.style.color = 'rgba(240,237,232,0.92)'; e.target.style.borderColor = '#0d0c0a'; }}
                  onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = 'rgba(13,12,10,0.6)'; e.target.style.borderColor = 'rgba(13,12,10,0.18)'; }}
                >
                  Browse Collection →
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid rgba(13,12,10,0.07)' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.4rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(13,12,10,0.2)', lineHeight: 1.8 }}>
                Click any node<br />to explore the archive
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3 preview images */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              flex: 1, overflow: 'hidden',
              background: '#e4e1da',
              borderBottom: i < 2 ? '1px solid rgba(13,12,10,0.07)' : 'none',
            }}>
              {previews[i] && (
                <motion.img
                  src={thumbnailUrl(previews[i].imageUrl)}
                  alt=""
                  initial={{ scale: 1.07, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1], delay: 0.2 + i * 0.14 }}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={e => { e.target.style.opacity = '0'; }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}