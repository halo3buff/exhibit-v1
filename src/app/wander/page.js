'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// ── Data ──────────────────────────────────────────────────────────
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
  { id: 'moma',         label: 'MoMA'         },
  { id: 'met',          label: 'The Met'      },
  { id: 'artic',        label: 'Art Inst.'    },
  { id: 'cooperhewitt', label: 'Cooper Hewitt' },
  { id: 'va',           label: 'V&A'          },
  { id: 'rijks',        label: 'Rijksmuseum'  },
  { id: 'smithsonian',  label: 'Smithsonian'  },
];

function thumbnailUrl(url, size = 600) {
  if (!url) return '';
  return `/api/img?url=${encodeURIComponent(url)}&size=${size}`;
}

// ── Graph builder ─────────────────────────────────────────────────
function buildGraph(layer, counts, W, H) {
  const nodes = [];

  // Category nodes — fixed pentagon
  CATS.forEach((cat, i) => {
    const angle  = (i / CATS.length) * Math.PI * 2 - Math.PI / 2;
    const radius = Math.min(W, H) * 0.27;
    nodes.push({
      id:    cat.id,
      label: cat.label,
      num:   cat.num,
      type:  'cat',
      x:     W / 2 + radius * Math.cos(angle),
      y:     H / 2 + radius * Math.sin(angle),
      vx: 0, vy: 0,
      r:     30,
      fixed: true,
      count: counts[cat.id] || 0,
    });
  });

  const edges = [];

  if (layer === 'sub') {
    CATS.forEach((cat, ci) => {
      const parent = nodes[ci];
      const subs   = SUB_MAP[cat.id] || [];
      subs.forEach((sub, si) => {
        const baseAngle = (ci / CATS.length) * Math.PI * 2 - Math.PI / 2;
        const spread    = subs.length > 1 ? (si / (subs.length - 1) - 0.5) * 1.3 : 0;
        const a         = baseAngle + spread * 0.85;
        const d         = 118 + Math.random() * 18;
        const idx       = nodes.length;
        nodes.push({
          id:       `${cat.id}::${sub}`,
          label:    sub,
          parentId: cat.id,
          type:     'sub',
          x:        parent.x + d * Math.cos(a) + (Math.random() - 0.5) * 16,
          y:        parent.y + d * Math.sin(a) + (Math.random() - 0.5) * 16,
          vx: 0, vy: 0,
          r:  11,
          fixed: false,
          navType: cat.id,
          navSub:  sub,
        });
        edges.push({ a: ci, b: idx, len: 122 });
      });
    });
  } else {
    // Source nodes — loose ring in center
    SOURCES.forEach((src, si) => {
      const angle = (si / SOURCES.length) * Math.PI * 2 - Math.PI / 2;
      const d     = Math.min(W, H) * 0.17;
      const idx   = nodes.length;
      nodes.push({
        id:    `src::${src.id}`,
        label:  src.label,
        srcId:  src.id,
        type:  'src',
        x:     W / 2 + d * Math.cos(angle) + (Math.random() - 0.5) * 50,
        y:     H / 2 + d * Math.sin(angle) + (Math.random() - 0.5) * 50,
        vx: 0, vy: 0,
        r:  15,
        fixed: false,
      });
      // Connect to every category
      for (let ci = 0; ci < CATS.length; ci++) {
        edges.push({ a: ci, b: idx, len: 195 });
      }
    });
  }

  return { nodes, edges };
}

// ── Physics ───────────────────────────────────────────────────────
function tick(nodes, edges, W, H) {
  const REP   = 4200;
  const SPR   = 0.038;
  const GRAV  = 0.007;
  const DAMP  = 0.80;

  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].fixed) continue;
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const d  = Math.sqrt(dx * dx + dy * dy) || 1;
      const f  = REP / (d * d);
      nodes[i].vx += f * dx / d;
      nodes[i].vy += f * dy / d;
    }
  }

  for (const e of edges) {
    const a = nodes[e.a], b = nodes[e.b];
    if (!a || !b) continue;
    const dx  = b.x - a.x, dy = b.y - a.y;
    const d   = Math.sqrt(dx * dx + dy * dy) || 1;
    const del = (d - e.len) * SPR;
    const fx  = del * dx / d, fy = del * dy / d;
    if (!a.fixed) { a.vx += fx; a.vy += fy; }
    if (!b.fixed) { b.vx -= fx; b.vy -= fy; }
  }

  let ke = 0;
  for (const n of nodes) {
    if (n.fixed) continue;
    n.vx += (W / 2 - n.x) * GRAV;
    n.vy += (H / 2 - n.y) * GRAV;
    n.vx *= DAMP;
    n.vy *= DAMP;
    n.x   = Math.max(n.r + 14, Math.min(W - n.r - 14, n.x + n.vx));
    n.y   = Math.max(n.r + 14, Math.min(H - n.r - 14, n.y + n.vy));
    ke   += n.vx * n.vx + n.vy * n.vy;
  }
  return ke;
}

// ── Canvas draw ───────────────────────────────────────────────────
function draw(ctx, nodes, edges, hovId, selId, W, H) {
  ctx.clearRect(0, 0, W, H);

  // Edges
  for (const e of edges) {
    const a = nodes[e.a], b = nodes[e.b];
    if (!a || !b) continue;
    const lit = a.id === hovId || b.id === hovId || a.id === selId || b.id === selId;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = lit ? 'rgba(0,0,0,0.24)' : 'rgba(0,0,0,0.07)';
    ctx.lineWidth   = lit ? 1.2 : 0.65;
    ctx.stroke();
  }

  // Nodes
  for (const n of nodes) {
    const isHov = n.id === hovId;
    const isSel = n.id === selId;
    const r     = isHov ? n.r + 3 : n.r;

    if (isSel) {
      ctx.shadowColor = 'rgba(0,0,0,0.16)';
      ctx.shadowBlur  = 14;
    }

    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);

    if (n.type === 'cat') {
      ctx.fillStyle = isSel ? '#000' : isHov ? '#222' : '#1a1a1a';
      ctx.fill();
    } else if (n.type === 'sub') {
      ctx.fillStyle   = isHov || isSel ? '#e2e2e0' : '#efefed';
      ctx.fill();
      ctx.strokeStyle = isHov || isSel ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.18)';
      ctx.lineWidth   = 1;
      ctx.stroke();
    } else {
      ctx.fillStyle = isSel ? '#111' : isHov ? '#282828' : '#383838';
      ctx.fill();
    }

    ctx.shadowBlur  = 0;
    ctx.shadowColor = 'transparent';

    // Labels
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    if (n.type === 'cat') {
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font      = '700 7.5px "DM Sans", system-ui, sans-serif';
      const lines   = n.label.split('\n');
      const lh      = 9;
      lines.forEach((line, li) => {
        ctx.fillText(line, n.x, n.y + (li - (lines.length - 1) / 2) * lh);
      });
    } else if (n.type === 'src') {
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.font      = '600 7px "DM Sans", system-ui, sans-serif';
      ctx.fillText(n.label, n.x, n.y);
    } else {
      ctx.fillStyle    = isHov || isSel ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.42)';
      ctx.font         = '500 6.5px "DM Mono", monospace';
      ctx.textBaseline = 'top';
      // Truncate if needed
      let text = n.label;
      const maxW = 78;
      while (ctx.measureText(text).width > maxW && text.length > 3) text = text.slice(0, -1);
      if (text !== n.label) text += '…';
      ctx.fillText(text, n.x, n.y + n.r + 3);
    }
  }
}

// ── Page ──────────────────────────────────────────────────────────
export default function WanderPage() {
  const router       = useRouter();
  const canvasRef    = useRef(null);
  const containerRef = useRef(null);
  const nodesRef     = useRef([]);
  const edgesRef     = useRef([]);
  const rafRef       = useRef(null);
  const dragRef      = useRef(null);
  const didDragRef   = useRef(false);
  const hovIdRef     = useRef(null);
  const selIdRef     = useRef(null);
  const sizeRef      = useRef({ W: 900, H: 700, dpr: 1 });

  const [layer,        setLayer]        = useState('sub');
  const [counts,       setCounts]       = useState({});
  const [previews,     setPreviews]     = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);

  // Fetch
  useEffect(() => {
    fetch('/api/search?limit=3')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.results) setPreviews(d.results); })
      .catch(() => {});
    fetch('/api/search?counts=1')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.counts) setCounts(d.counts); })
      .catch(() => {});
  }, []);

  // Init graph
  useEffect(() => {
    const container = containerRef.current;
    const canvas    = canvasRef.current;
    if (!container || !canvas) return;

    const rect = container.getBoundingClientRect();
    const W    = rect.width;
    const H    = rect.height;
    const dpr  = window.devicePixelRatio || 1;
    sizeRef.current = { W, H, dpr };

    canvas.width       = W * dpr;
    canvas.height      = H * dpr;
    canvas.style.width  = `${W}px`;
    canvas.style.height = `${H}px`;
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const { nodes, edges } = buildGraph(layer, counts, W, H);
    // Pre-settle physics
    for (let i = 0; i < 220; i++) tick(nodes, edges, W, H);

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
      tick(nodesRef.current, edgesRef.current, W, H);
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

  // Pointer handlers
  const onMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x    = e.clientX - rect.left;
    const y    = e.clientY - rect.top;

    if (dragRef.current) {
      const n = nodesRef.current[dragRef.current.idx];
      if (n && !n.fixed) {
        n.x = x + dragRef.current.ox;
        n.y = y + dragRef.current.oy;
        n.vx = 0; n.vy = 0;
        didDragRef.current = true;
      }
      return;
    }

    const hit       = nodeAt(x, y);
    hovIdRef.current = hit?.id || null;
    canvas.style.cursor = hit ? 'pointer' : 'default';
  }, []);

  const onMouseDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const hit = nodeAt(x, y);
    if (hit && !hit.fixed) {
      const idx = nodesRef.current.findIndex(n => n.id === hit.id);
      dragRef.current    = { idx, ox: hit.x - x, oy: hit.y - y };
      didDragRef.current = false;
    }
  }, []);

  const onMouseUp = useCallback((e) => {
    const wasDrag      = didDragRef.current;
    dragRef.current    = null;
    didDragRef.current = false;
    if (wasDrag) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x    = e.clientX - rect.left;
    const y    = e.clientY - rect.top;
    const hit  = nodeAt(x, y);

    if (hit) {
      selIdRef.current = hit.id;
      setSelectedNode(hit);
    } else {
      selIdRef.current = null;
      setSelectedNode(null);
    }
  }, []);

  function navigate(node) {
    if (node.type === 'cat') {
      router.push(`/gallery?type=${encodeURIComponent(node.id)}`);
    } else if (node.type === 'sub') {
      const [type, sub] = node.id.split('::');
      router.push(`/gallery?type=${encodeURIComponent(type)}&sub=${encodeURIComponent(sub)}`);
    }
  }

  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', height: '100vh', background: '#fdfdfc', overflow: 'hidden' }}>

      {/* ── Canvas side ────────────────────────────── */}
      <div ref={containerRef} style={{ position: 'relative', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          onMouseMove={onMouseMove}
          onMouseDown={onMouseDown}
          onMouseUp={onMouseUp}
          onMouseLeave={() => { hovIdRef.current = null; }}
          style={{ display: 'block' }}
        />

        {/* Title overlay */}
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          style={{ position: 'absolute', top: '2rem', left: '2rem', pointerEvents: 'none' }}
        >
          <h1 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1, color: '#1a1a1a' }}>
            DIGITAL@SCALE
          </h1>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.28)', marginTop: '0.3rem' }}>
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
            background: 'white', border: '1px solid rgba(0,0,0,0.1)', padding: 3,
          }}
        >
          {[
            { key: 'sub',    label: 'Disciplines'  },
            { key: 'source', label: 'Institutions' },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setLayer(key)}
              style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.44rem', fontWeight: 500,
                letterSpacing: '0.12em', textTransform: 'uppercase',
                padding: '5px 16px', border: 'none', cursor: 'pointer',
                background: layer === key ? '#1a1a1a' : 'transparent',
                color:      layer === key ? 'white'   : 'rgba(0,0,0,0.36)',
                transition: 'all 0.15s ease',
              }}
            >
              {label}
            </button>
          ))}
        </motion.div>

        {/* Hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.5 }}
          style={{
            position: 'absolute', bottom: '2.1rem', right: '1.75rem',
            fontFamily: 'var(--font-mono)', fontSize: '0.38rem',
            letterSpacing: '0.18em', textTransform: 'uppercase',
            color: 'rgba(0,0,0,0.18)', pointerEvents: 'none',
          }}
        >
          Drag · Click to explore
        </motion.p>
      </div>

      {/* ── Right panel ────────────────────────────── */}
      <div style={{ borderLeft: '1px solid rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Count header */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          style={{ padding: '1.75rem 1.5rem 1.25rem', borderBottom: '1px solid rgba(0,0,0,0.07)' }}
        >
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.42rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.24)', marginBottom: '0.4rem' }}>
            Index System
          </p>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', fontWeight: 300, letterSpacing: '-0.025em', lineHeight: 1, color: '#1a1a1a' }}>
            {totalCount > 0 ? totalCount.toLocaleString() : '—'}
          </h2>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.4rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.22)', marginTop: '0.3rem' }}>
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
              style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.07)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.38rem', letterSpacing: '0.18em', textTransform: 'uppercase', border: '1px solid rgba(0,0,0,0.13)', padding: '2px 7px', color: 'rgba(0,0,0,0.36)' }}>
                  {selectedNode.type === 'cat' ? 'Category' : selectedNode.type === 'sub' ? 'Discipline' : 'Institution'}
                </span>
                <button
                  onClick={() => { setSelectedNode(null); selIdRef.current = null; }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: '0.4rem', color: 'rgba(0,0,0,0.28)', letterSpacing: '0.1em' }}
                >
                  ✕
                </button>
              </div>

              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.45rem', fontWeight: 300, letterSpacing: '-0.015em', lineHeight: 1.2, color: '#1a1a1a', marginBottom: '0.4rem' }}>
                {selectedNode.label.replace(/\n/g, ' ')}
              </h3>

              {selectedNode.count > 0 && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.42rem', letterSpacing: '0.1em', color: 'rgba(0,0,0,0.36)', marginBottom: '1rem' }}>
                  {selectedNode.count.toLocaleString()} works
                </p>
              )}

              {selectedNode.type !== 'src' && (
                <button
                  onClick={() => navigate(selectedNode)}
                  style={{
                    width: '100%', fontFamily: 'var(--font-mono)', fontSize: '0.44rem',
                    fontWeight: 500, letterSpacing: '0.14em', textTransform: 'uppercase',
                    padding: '0.65rem 0', border: '1px solid rgba(0,0,0,0.18)',
                    background: 'transparent', color: 'rgba(0,0,0,0.6)', cursor: 'pointer',
                    transition: 'all 0.13s ease',
                  }}
                  onMouseEnter={e => { e.target.style.background = '#1a1a1a'; e.target.style.color = 'white'; e.target.style.borderColor = '#1a1a1a'; }}
                  onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = 'rgba(0,0,0,0.6)'; e.target.style.borderColor = 'rgba(0,0,0,0.18)'; }}
                >
                  Browse Collection →
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid rgba(0,0,0,0.07)' }}
            >
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.4rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.2)', lineHeight: 1.8 }}>
                Click any node<br />to explore the archive
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3 preview images */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ flex: 1, overflow: 'hidden', background: '#ebebea', borderBottom: i < 2 ? '1px solid rgba(0,0,0,0.07)' : 'none' }}>
              {previews[i] && (
                <motion.img
                  src={thumbnailUrl(previews[i].imageUrl)}
                  alt=""
                  initial={{ scale: 1.08, opacity: 0 }}
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