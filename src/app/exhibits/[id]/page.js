'use client';
// src/app/exhibits/[id]/page.js — Canvas v2
// Q = freehand pen strokes (any line, anywhere)
// X = delete mode (hold X, click stroke or note to remove)
// Double-click empty canvas = create invisible text note
// Notes: scroll to resize font, floating toolbar for bold/italic

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Utilities ────────────────────────────────────────────────────────────────

function imgUrl(url, size = 1200) {
  if (!url) return '';
  return `/api/img?url=${encodeURIComponent(url)}&size=${size}`;
}

function defaultTransform(i, total) {
  const cols = Math.ceil(Math.sqrt(total * 1.3));
  return {
    x:      90 + (i % cols) * 240 + (i % 3) * 15,
    y:      80 + Math.floor(i / cols) * 240 + (i % 2) * 20,
    scale:  0.78 + (i % 4) * 0.07,
    rotate: (((i * 137.5) % 5) - 2.5),
    zIndex: i + 1,
  };
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// Encode a points array to a compact SVG path string
function pointsToPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i].x} ${pts[i].y}`;
  }
  return d;
}

// Rough hit-test: is (px,py) within `threshold` pixels of any segment in the path?
function pathHitTest(pathData, px, py, threshold = 10) {
  const segments = pathData.split(/[ML]/).filter(Boolean).map(s => {
    const [x, y] = s.trim().split(' ').map(Number);
    return { x, y };
  });
  for (let i = 0; i < segments.length - 1; i++) {
    const a = segments[i], b = segments[i + 1];
    if (isNaN(a.x) || isNaN(b.x)) continue;
    const dx = b.x - a.x, dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) continue;
    const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / len2));
    const cx = a.x + t * dx, cy = a.y + t * dy;
    const dist2 = (px - cx) ** 2 + (py - cy) ** 2;
    if (dist2 < threshold * threshold) return true;
  }
  return false;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SOURCE_LABELS = {
  met: 'The Met', artic: 'Art Institute of Chicago',
  cooperhewitt: 'Cooper Hewitt', va: 'Victoria & Albert Museum',
  rijks: 'Rijksmuseum', smithsonian: 'Smithsonian',
  designarchive: 'AIGA Design Archives',
};

const TOOLTIP_SCHEMA = {
  met:          [['Artist','author'],['Origin','origin'],['Date','year'],['Medium','medium'],['Object Type','objectType'],['Classification','classification'],['Department','department'],['Collection','collection']],
  artic:        [['Artist','author'],['Origin','origin'],['Date','year'],['Medium','medium'],['Artwork Type','objectType'],['Classification','classification'],['Department','department'],['Collection','collection']],
  va:           [['Maker','author'],['Origin','origin'],['Date','year'],['Materials','medium'],['Object Type','classification'],['Collection','collection']],
  rijks:        [['Artist','author'],['Origin','origin'],['Dating','year'],['Technique','medium'],['Object Type','objectType'],['Category','subCategory'],['Collection','collection']],
  smithsonian:  [['Creator','author'],['Origin','origin'],['Date','year'],['Object Type','objectType'],['Medium','medium'],['Collection','collection']],
  cooperhewitt: [['Designer','author'],['Origin','origin'],['Date','year'],['Medium','medium'],['Object Type','objectType'],['Function','subCategory'],['Collection','collection']],
  designarchive:[['Designer','author'],['Year','year'],['Category','subCategory'],['Medium','medium'],['Collection','collection']],
  default:      [['Artist','author'],['Origin','origin'],['Year','year'],['Medium','medium'],['Category','type'],['Sub-category','subCategory'],['Classification','classification'],['Collection','collection']],
};

function getModalRows(item) {
  const source = (item.source || '').toLowerCase();
  const schema = TOOLTIP_SCHEMA[source] || TOOLTIP_SCHEMA.default;
  const sourceLabel = SOURCE_LABELS[source] || item.source || '';
  return schema
    .map(([label, field]) => [label, field === 'collection' ? sourceLabel : item[field]])
    .filter(([, v]) => v?.toString().trim() && !['Unknown','n.d.','Uncategorized',''].includes(v?.toString().trim()));
}

// ─── MagneticBtn ─────────────────────────────────────────────────────────────

function MagneticBtn({ children, active, onClick }) {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.3}px,${(e.clientY - r.top - r.height / 2) * 0.3}px)`;
  };
  const onLeave = () => { if (ref.current) ref.current.style.transform = 'translate(0,0)'; };
  return (
    <button ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} onClick={onClick}
      style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: active ? 'rgba(0,0,0,0.82)' : 'rgba(0,0,0,0.28)', fontWeight: active ? 500 : 400, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px', transition: 'color 0.15s, transform 0.18s cubic-bezier(0.16,1,0.3,1)' }}>
      {children}
    </button>
  );
}

// ─── Canvas Note (invisible card, rich text) ─────────────────────────────────

function CanvasNote({ note, onDrag, onUpdate, xMode, onXDelete }) {
  const [focused,  setFocused]  = useState(false);
  const [toolbar,  setToolbar]  = useState(false); // show bold/italic bar
  const inputRef  = useRef(null);
  const wrapRef   = useRef(null);

  // Auto-focus newly created notes (empty content = just created)
  useEffect(() => {
    if (note.content === '' && inputRef.current) {
      inputRef.current.focus();
      setFocused(true);
      setToolbar(true);
    }
  }, []);

  // Refs keep values current inside the wheel handler without re-attaching
  const focusedRef  = useRef(false);
  const fontSizeRef = useRef(note.fontSize);
  focusedRef.current  = focused;
  fontSizeRef.current = note.fontSize;

  // Attach once per note lifetime — stale closures avoided entirely via refs
  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const handle = (e) => {
      if (!focusedRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY > 0 ? -1 : 1;
      const next  = Math.max(8, Math.min(72, fontSizeRef.current + delta));
      onUpdate(note.id, { fontSize: next });
    };
    el.addEventListener('wheel', handle, { passive: false });
    return () => el.removeEventListener('wheel', handle);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id, onUpdate]);

  const handleDragStart = (e) => {
    if (focused || e.target === inputRef.current) return;
    if (xMode) {
      onXDelete(note.id);
      return;
    }
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY, ox = note.x, oy = note.y;
    const onMove = (ev) => onDrag(note.id, ox + ev.clientX - sx, oy + ev.clientY - sy);
    const onUp   = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const handleClick = (e) => {
    if (xMode) { e.stopPropagation(); onXDelete(note.id); }
  };

  return (
    <div
      ref={wrapRef}
      onMouseDown={handleDragStart}
      onClick={handleClick}
      style={{
        position:  'absolute',
        left:      0,
        top:       0,
        transform: `translate(${note.x}px, ${note.y}px)`,
        zIndex:    focused ? 200 : 40,
        cursor:    xMode ? 'not-allowed' : (focused ? 'text' : 'grab'),
        userSelect: focused ? 'text' : 'none',
        minWidth:  120,
        maxWidth:  480,
      }}
    >
      {/* Floating toolbar — appears when focused */}
      <AnimatePresence>
        {toolbar && focused && (
          <motion.div
            key="toolbar"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.14 }}
            onMouseDown={e => e.preventDefault()} // don't steal focus
            style={{
              position:      'absolute',
              bottom:        '100%',
              left:          0,
              marginBottom:  8,
              display:       'flex',
              alignItems:    'center',
              gap:           2,
              background:    'rgba(14,13,12,0.88)',
              backdropFilter:'blur(12px)',
              padding:       '5px 8px',
              zIndex:        300,
              whiteSpace:    'nowrap',
            }}
          >
            {/* Bold */}
            <button
              onClick={() => onUpdate(note.id, { bold: !note.bold })}
              style={{ fontFamily: 'serif', fontSize: 13, fontWeight: 700, color: note.bold ? '#fff' : 'rgba(255,255,255,0.45)', background: note.bold ? 'rgba(255,255,255,0.12)' : 'none', border: 'none', cursor: 'pointer', padding: '2px 7px', transition: 'color 0.12s, background 0.12s' }}
            >B</button>

            {/* Italic */}
            <button
              onClick={() => onUpdate(note.id, { italic: !note.italic })}
              style={{ fontFamily: 'serif', fontSize: 13, fontStyle: 'italic', color: note.italic ? '#fff' : 'rgba(255,255,255,0.45)', background: note.italic ? 'rgba(255,255,255,0.12)' : 'none', border: 'none', cursor: 'pointer', padding: '2px 7px', transition: 'color 0.12s, background 0.12s' }}
            >I</button>

            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

            {/* Font size display */}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em', minWidth: 28, textAlign: 'center' }}>
              {Math.round(note.fontSize)}
            </span>

            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />

            {/* Scroll hint */}
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'rgba(255,255,255,0.28)', letterSpacing: '0.1em' }}>
              scroll to resize
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* The actual text input — invisible background */}
      <div
        style={{
          background:  focused ? 'rgba(0,0,0,0.03)' : 'transparent',
          outline:     focused ? '1px dashed rgba(0,0,0,0.12)' : 'none',
          outlineOffset: 6,
          padding:     '2px 0',
          transition:  'background 0.15s, outline 0.15s',
        }}
      >
        {focused ? (
          <textarea
            ref={inputRef}
            value={note.content}
            onChange={e => onUpdate(note.id, { content: e.target.value })}
            onFocus={() => { setFocused(true); setToolbar(true); }}
            onBlur={() => { setFocused(false); setToolbar(false); }}
            onKeyDown={e => { if (e.key === 'Escape') { inputRef.current?.blur(); } }}
            rows={1}
            style={{
              fontFamily:  note.bold ? 'var(--font-sans)' : 'var(--font-sans)',
              fontSize:    note.fontSize,
              fontWeight:  note.bold ? 600 : 300,
              fontStyle:   note.italic ? 'italic' : 'normal',
              lineHeight:  1.45,
              color:       'rgba(0,0,0,0.78)',
              background:  'transparent',
              border:      'none',
              outline:     'none',
              resize:      'none',
              padding:     0,
              width:       Math.max(120, note.content.length * note.fontSize * 0.55 + 20),
              maxWidth:    480,
              minWidth:    80,
              overflow:    'hidden',
              display:     'block',
            }}
            onInput={e => {
              // auto-height
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
          />
        ) : (
          <p
            onDoubleClick={() => { setFocused(true); setToolbar(true); setTimeout(() => inputRef.current?.focus(), 0); }}
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize:   note.fontSize,
              fontWeight: note.bold ? 600 : 300,
              fontStyle:  note.italic ? 'italic' : 'normal',
              lineHeight: 1.45,
              color:      note.content ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.2)',
              margin:     0,
              whiteSpace: 'pre-wrap',
              wordBreak:  'break-word',
              cursor:     xMode ? 'not-allowed' : 'grab',
              userSelect: 'none',
            }}
          >
            {note.content || '…'}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Mode HUD ─────────────────────────────────────────────────────────────────

function ModeHUD({ mode, children }) {
  return (
    <AnimatePresence>
      {mode && (
        <motion.div
          key="hud"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.16 }}
          style={{ position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)', zIndex: 400, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(12px)', padding: '7px 20px', display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'none' }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExhibitPage() {
  const { id } = useParams();
  const router = useRouter();

  // — Exhibit data
  const [exhibit,     setExhibit]     = useState(null);
  const [items,       setItems]       = useState([]);
  const [transforms,  setTransforms]  = useState({});
  const [loading,     setLoading]     = useState(true);

  // — Canvas layers
  const [strokes,     setStrokes]     = useState([]);   // persisted strokes
  const [liveStroke,  setLiveStroke]  = useState(null); // points[] being drawn now
  const [notes,       setNotes]       = useState([]);

  // — Modes
  const [qMode,       setQMode]       = useState(false); // pen mode
  const [xMode,       setXMode]       = useState(false); // delete mode

  // — UI state
  const [view,        setView]        = useState('spread');
  const [selected,    setSelected]    = useState(null);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [noteText,    setNoteText]    = useState('');
  const [editing,     setEditing]     = useState(false);
  const [titleVal,    setTitleVal]    = useState('');
  const [activeId,    setActiveId]    = useState(null);
  const [zTop,        setZTop]        = useState(100);
  const [cursor,      setCursor]      = useState('default');

  const tRef         = useRef({});
  const spreadRef    = useRef(null);
  const hoveredIdRef = useRef(null);
  const isDrawingRef = useRef(false);

  // ── Debounced persistence
  const syncT = useCallback((itemId, t) => {
    tRef.current[itemId] = t;
    setTransforms(prev => ({ ...prev, [itemId]: t }));
  }, []);

  const saveTransform = useCallback(
    debounce(async (itemId, t) => {
      try {
        await fetch(`/api/exhibits/${id}/items/${itemId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ wallTransform: JSON.stringify(t) }),
        });
      } catch (_) {}
    }, 600),
    [id]
  );

  const saveNoteDebounced = useCallback(
    debounce(async (noteId, fields) => {
      try {
        await fetch(`/api/exhibits/${id}/notes/${noteId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fields),
        });
      } catch (_) {}
    }, 500),
    [id]
  );

  // ── Scroll-to-scale (non-passive wheel on spread)
  useEffect(() => {
    if (view !== 'spread' || loading) return;
    const el = spreadRef.current; if (!el) return;
    const handle = (e) => {
      // Don't intercept if a note is focused (note handles its own scroll)
      if (document.activeElement?.tagName === 'TEXTAREA') return;
      if (!hoveredIdRef.current) return;
      e.preventDefault();
      const itemId = hoveredIdRef.current;
      const t = tRef.current[itemId]; if (!t) return;
      const next = { ...t, scale: Math.max(0.15, Math.min(4, t.scale + (e.deltaY > 0 ? -0.06 : 0.06))) };
      syncT(itemId, next); saveTransform(itemId, next);
    };
    el.addEventListener('wheel', handle, { passive: false });
    return () => el.removeEventListener('wheel', handle);
  }, [view, loading, syncT, saveTransform]);

  // ── Q / X keyboard modes
  useEffect(() => {
    if (view !== 'spread') return;
    const onDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if ((e.key === 'q' || e.key === 'Q') && !e.repeat) setQMode(true);
      if ((e.key === 'x' || e.key === 'X') && !e.repeat) setXMode(true);
    };
    const onUp = (e) => {
      if (e.key === 'q' || e.key === 'Q') { setQMode(false); setLiveStroke(null); isDrawingRef.current = false; }
      if (e.key === 'x' || e.key === 'X') setXMode(false);
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, [view]);

  // ── Load
  useEffect(() => {
    async function load() {
      try {
        const [exhibitRes, strokesRes, notesRes] = await Promise.all([
          fetch(`/api/exhibits/${id}`),
          fetch(`/api/exhibits/${id}/strokes`),
          fetch(`/api/exhibits/${id}/notes`),
        ]);
        if (!exhibitRes.ok) { router.push('/exhibits'); return; }
        const d = await exhibitRes.json();
        setExhibit(d.exhibit); setTitleVal(d.exhibit.title);

        const tmap = {};
        d.items.forEach((item, i) => {
          try {
            const s = item.wallTransform ? JSON.parse(item.wallTransform) : null;
            tmap[item.id] = (s && typeof s.x === 'number') ? s : defaultTransform(i, d.items.length);
          } catch { tmap[item.id] = defaultTransform(i, d.items.length); }
        });
        tRef.current = { ...tmap };
        setTransforms(tmap); setItems(d.items);

        if (strokesRes.ok) { const s = await strokesRes.json(); setStrokes(s.strokes || []); }
        if (notesRes.ok)   { const n = await notesRes.json();   setNotes(n.notes || []); }
      } catch (_) {}
      setLoading(false);
    }
    load();
  }, [id, router]);

  // ── Canvas mousedown: start pen stroke OR normal drag
  const onCanvasMouseDown = useCallback((e) => {
    // Only fire on the canvas bg itself, not on cards/notes
    if (e.target !== spreadRef.current && !e.target.classList.contains('canvas-bg-inner')) return;
    if (e.button !== 0) return;

    if (qMode) {
      e.preventDefault();
      isDrawingRef.current = true;
      const rect = spreadRef.current.getBoundingClientRect();
      const pt = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      setLiveStroke([pt]);

      const onMove = (mv) => {
        if (!isDrawingRef.current) return;
        const r = spreadRef.current?.getBoundingClientRect(); if (!r) return;
        setLiveStroke(prev => prev ? [...prev, { x: mv.clientX - r.left, y: mv.clientY - r.top }] : null);
      };

      const onUp = async () => {
        isDrawingRef.current = false;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);

        setLiveStroke(prev => {
          if (!prev || prev.length < 2) { return null; }
          const pathData = pointsToPath(prev);
          // Optimistically add, then persist
          const optimistic = { id: `opt-${Date.now()}`, exhibitId: id, pathData, color: 'rgba(0,0,0,0.55)', width: 1.5 };
          setStrokes(s => [...s, optimistic]);
          fetch(`/api/exhibits/${id}/strokes`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pathData, color: 'rgba(0,0,0,0.55)', width: 1.5 }),
          })
            .then(r => r.json())
            .then(({ stroke }) => {
              if (stroke) setStrokes(s => s.map(st => st.id === optimistic.id ? stroke : st));
            })
            .catch(() => setStrokes(s => s.filter(st => st.id !== optimistic.id)));
          return null;
        });
      };

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }
  }, [qMode, id]);

  // ── Double-click on empty canvas: create note
  const onCanvasDblClick = useCallback(async (e) => {
    if (qMode || xMode) return;
    if (e.target !== spreadRef.current && !e.target.classList.contains('canvas-bg-inner')) return;
    const rect = spreadRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - 4;
    const y = e.clientY - rect.top  - (13 / 2);

    const optimistic = { id: `opt-${Date.now()}`, exhibitId: id, x, y, content: '', fontSize: 13, bold: 0, italic: 0 };
    setNotes(prev => [...prev, optimistic]);

    try {
      const r = await fetch(`/api/exhibits/${id}/notes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y, content: '', fontSize: 13 }),
      });
      const { note } = await r.json();
      if (note) setNotes(prev => prev.map(n => n.id === optimistic.id ? note : n));
    } catch (_) {
      setNotes(prev => prev.filter(n => n.id !== optimistic.id));
    }
  }, [qMode, xMode, id]);

  // ── Stroke X-delete: click on canvas in X mode
  const onCanvasClick = useCallback((e) => {
    if (!xMode) return;
    if (e.target !== spreadRef.current && !e.target.classList.contains('canvas-bg-inner')) return;
    const rect = spreadRef.current.getBoundingClientRect();
    const px = e.clientX - rect.left, py = e.clientY - rect.top;
    // Find first stroke that the click lands near
    const hit = strokes.find(s => pathHitTest(s.pathData, px, py, 12));
    if (hit) deleteStroke(hit.id);
  }, [xMode, strokes]);

  async function deleteStroke(strokeId) {
    setStrokes(prev => prev.filter(s => s.id !== strokeId));
    try { await fetch(`/api/exhibits/${id}/strokes/${strokeId}`, { method: 'DELETE' }); } catch (_) {}
  }

  async function deleteNote(noteId) {
    setNotes(prev => prev.filter(n => n.id !== noteId));
    try { await fetch(`/api/exhibits/${id}/notes/${noteId}`, { method: 'DELETE' }); } catch (_) {}
  }

  function handleNoteUpdate(noteId, fields) {
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, ...fields } : n));
    saveNoteDebounced(noteId, fields);
  }

  function handleNoteDrag(noteId, x, y) {
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, x, y } : n));
    saveNoteDebounced(noteId, { x, y });
  }

  // ── Artwork drag (unchanged)
  const onDragStart = useCallback((e, itemId) => {
    if (e.button !== 0 || qMode || xMode) return;
    e.preventDefault(); e.stopPropagation();
    setActiveId(itemId); setCursor('grabbing');
    const t = tRef.current[itemId] || { x: 0, y: 0, scale: 1, rotate: 0, zIndex: 1 };
    const sx = e.clientX, sy = e.clientY, ox = t.x, oy = t.y, origRot = t.rotate;
    let lastX = sx, emaVX = 0;
    const onMove = (e) => {
      const vx = e.clientX - lastX;
      emaVX = vx * 0.55 + emaVX * 0.45;
      lastX = e.clientX;
      syncT(itemId, { ...tRef.current[itemId], x: ox + e.clientX - sx, y: oy + e.clientY - sy, rotate: origRot + Math.max(-9, Math.min(9, emaVX * 0.55)) });
    };
    const onUp = () => {
      const cur = tRef.current[itemId];
      if (cur) { const settled = { ...cur, rotate: origRot }; syncT(itemId, settled); saveTransform(itemId, settled); }
      setActiveId(null); setCursor('default');
      window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  }, [syncT, saveTransform, qMode, xMode]);

  // ── Rotate handle (unchanged)
  const onRotateStart = useCallback((e, itemId) => {
    e.preventDefault(); e.stopPropagation();
    const imgEl = document.getElementById(`spread-img-${itemId}`); if (!imgEl) return;
    const r = imgEl.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const a0 = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
    const origRot = (tRef.current[itemId] || {}).rotate || 0;
    const onMove = (e) => syncT(itemId, { ...tRef.current[itemId], rotate: origRot + Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI - a0 });
    const onUp = () => { saveTransform(itemId, tRef.current[itemId]); window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  }, [syncT, saveTransform]);

  const bringToFront = useCallback((itemId) => {
    setZTop(z => {
      const next = z + 1;
      const t = tRef.current[itemId];
      if (t) { const up = { ...t, zIndex: next }; syncT(itemId, up); }
      return next;
    });
  }, [syncT]);

  // ── Modal keyboard nav
  useEffect(() => {
    if (!selected) return;
    const onKey = (e) => {
      if (e.key === 'Escape')     { setSelected(null); setEditingNote(null); }
      if (e.key === 'ArrowRight') { const n = selectedIdx + 1; if (n < items.length) { setSelected(items[n]); setSelectedIdx(n); } }
      if (e.key === 'ArrowLeft')  { const n = selectedIdx - 1; if (n >= 0) { setSelected(items[n]); setSelectedIdx(n); } }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, selectedIdx, items]);

  // ── Exhibit actions
  async function removeItem(itemId) {
    await fetch(`/api/exhibits/${id}/items/${itemId}`, { method: 'DELETE' });
    setItems(prev => prev.filter(it => it.id !== itemId));
    delete tRef.current[itemId];
    setTransforms(prev => { const n = { ...prev }; delete n[itemId]; return n; });
    if (selected?.id === itemId) setSelected(null);
  }
  async function saveNote(itemId) {
    await fetch(`/api/exhibits/${id}/items/${itemId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: noteText }) });
    setItems(prev => prev.map(it => it.id === itemId ? { ...it, note: noteText } : it));
    if (selected?.id === itemId) setSelected(p => ({ ...p, note: noteText }));
    setEditingNote(null);
  }
  async function saveTitle() {
    await fetch(`/api/exhibits/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: titleVal }) });
    setExhibit(p => ({ ...p, title: titleVal })); setEditing(false);
  }
  async function togglePublic() {
    const v = !exhibit.isPublic;
    await fetch(`/api/exhibits/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isPublic: v }) });
    setExhibit(p => ({ ...p, isPublic: v }));
  }

  // ── Cursor logic
  const spreadCursor = xMode ? 'crosshair' : qMode ? 'crosshair' : cursor;

  // ── Loading
  if (loading) return (
    <div style={{ height: 'calc(100vh - 44px)', background: '#fafaf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.25)' }}>Loading</p>
    </div>
  );

  // ── Live stroke path string
  const livePath = liveStroke && liveStroke.length > 1 ? pointsToPath(liveStroke) : null;

  return (
    <div style={{ height: 'calc(100vh - 44px)', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fafaf8', cursor: view === 'spread' ? spreadCursor : 'default' }}>

      {/* ── Header ── */}
      <header style={{ height: 64, flexShrink: 0, padding: '0 52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(250,250,248,0.72)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderBottom: '1px solid rgba(0,0,0,0.06)', zIndex: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <button onClick={() => router.push('/exhibits')} style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.15s' }}
            onMouseEnter={e => e.target.style.color = 'rgba(0,0,0,0.6)'} onMouseLeave={e => e.target.style.color = 'rgba(0,0,0,0.3)'}>
            ← Exhibits
          </button>
          {editing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input value={titleVal} onChange={e => setTitleVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditing(false); }}
                autoFocus style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 300, letterSpacing: '-0.02em', color: 'rgba(0,0,0,0.8)', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(0,0,0,0.2)', outline: 'none', width: 280 }} />
              <button onClick={saveTitle} style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>Save</button>
            </div>
          ) : (
            <h1 onClick={() => setEditing(true)} title="Click to rename" style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 300, letterSpacing: '-0.025em', color: 'rgba(0,0,0,0.82)', cursor: 'text', margin: 0, lineHeight: 1 }}>{exhibit.title}</h1>
          )}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(0,0,0,0.25)', letterSpacing: '0.1em' }}>
            {items.length} {items.length === 1 ? 'piece' : 'pieces'}
          </span>
          <button onClick={togglePublic} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.25)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {exhibit.isPublic ? '● Public' : '○ Private'}
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MagneticBtn active={view === 'spread'}    onClick={() => setView('spread')}>Spread</MagneticBtn>
          <span style={{ color: 'rgba(0,0,0,0.15)', fontSize: 12 }}>·</span>
          <MagneticBtn active={view === 'catalogue'} onClick={() => setView('catalogue')}>Catalogue</MagneticBtn>
        </div>
      </header>

      {/* ── Mode HUDs ── */}
      <ModeHUD mode={qMode && view === 'spread'}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(100,210,130,0.9)', display: 'inline-block', flexShrink: 0 }} />
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.72)', margin: 0 }}>
          Pen mode — draw anywhere · release Q to exit
        </p>
      </ModeHUD>

      <ModeHUD mode={xMode && view === 'spread'}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(220,80,60,0.9)', display: 'inline-block', flexShrink: 0 }} />
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.72)', margin: 0 }}>
          Delete mode — click a line or text to remove · release X to exit
        </p>
      </ModeHUD>

      {/* ── SPREAD VIEW ── */}
      {view === 'spread' && (
        <div
          ref={spreadRef}
          onMouseDown={onCanvasMouseDown}
          onDoubleClick={onCanvasDblClick}
          onClick={onCanvasClick}
          style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#fafaf8' }}
        >
          {/* Grain */}
          <div className="canvas-bg-inner" style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.038 }}>
              <filter id="grain2"><feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
              <rect width="100%" height="100%" filter="url(#grain2)"/>
            </svg>
          </div>

          {/* Empty state */}
          {items.length === 0 && strokes.length === 0 && notes.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 1, pointerEvents: 'none' }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 300, color: 'rgba(0,0,0,0.35)', margin: 0 }}>This exhibit is empty</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.2)', margin: 0 }}>Add pieces from the gallery</p>
            </div>
          )}

          {/* ── SVG layer: persisted strokes + live stroke ── */}
          <svg
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 6, overflow: 'visible' }}
          >
            {/* Persisted strokes */}
            {strokes.map(s => (
              <path
                key={s.id}
                d={s.pathData}
                stroke={xMode ? 'rgba(200,60,40,0.35)' : (s.color || 'rgba(0,0,0,0.55)')}
                strokeWidth={s.width || 1.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ transition: 'stroke 0.15s' }}
              />
            ))}
            {/* Live freehand stroke */}
            {livePath && (
              <path
                d={livePath}
                stroke="rgba(0,0,0,0.55)"
                strokeWidth={1.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>

          {/* ── Artwork cards ── */}
          {items.map((item) => {
            const t = transforms[item.id] || defaultTransform(0, 1);
            const isActive = activeId === item.id;
            const sBlur  = 8  + t.scale * 20;
            const sY     = 2  + t.scale * 9;
            const sAlpha = 0.05 + Math.min(t.scale * 0.08, 0.22);
            const shadow = isActive
              ? `0 ${sY * 2.2}px ${sBlur * 2}px rgba(0,0,0,${Math.min(sAlpha * 2, 0.38)})`
              : `0 ${sY}px ${sBlur}px rgba(0,0,0,${sAlpha})`;
            const invScale = t.scale > 0 ? 1 / t.scale : 1;

            return (
              <div key={item.id} style={{ position: 'absolute', left: 0, top: 0, zIndex: isActive ? 9999 : (t.zIndex || 1) }}
                onMouseEnter={() => { hoveredIdRef.current = item.id; if (!qMode && !xMode) setCursor('grab'); }}
                onMouseLeave={() => { hoveredIdRef.current = null; if (!qMode && !xMode) setCursor('default'); }}>
                <div className="spread-item-wrap" style={{ width: 210, transform: `translate(${t.x}px, ${t.y}px) rotate(${t.rotate}deg) scale(${t.scale})`, transformOrigin: 'center top', cursor: isActive ? 'grabbing' : (qMode || xMode ? 'default' : 'grab'), userSelect: 'none' }}>
                  <img
                    id={`spread-img-${item.id}`}
                    src={imgUrl(item.imageUrl, 1200)}
                    alt={item.title}
                    draggable={false}
                    onMouseDown={e => { bringToFront(item.id); onDragStart(e, item.id); }}
                    onDoubleClick={() => { if (!qMode && !xMode) { setSelected(item); setSelectedIdx(items.indexOf(item)); } }}
                    style={{ width: '100%', height: 'auto', display: 'block', boxShadow: shadow, transition: isActive ? 'none' : 'box-shadow 0.25s ease' }}
                  />
                  {/* Rotate handle */}
                  {!qMode && !xMode && (
                    <div onMouseDown={e => { e.stopPropagation(); onRotateStart(e, item.id); }}
                      className="rot-handle"
                      style={{ position: 'absolute', top: -9, right: -9, width: 18, height: 18, borderRadius: '50%', background: '#fafaf8', border: '1px solid rgba(0,0,0,0.15)', cursor: 'crosshair', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s', color: 'rgba(0,0,0,0.4)' }}>
                      <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                        <path d="M1 5C1 2.79 2.79 1 5 1C6.47 1 7.75 1.79 8.4 2.97" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                        <polyline points="7,2.5 8.5,2.8 8.2,4.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  )}
                  {/* Caption */}
                  <div style={{ marginTop: 8, transform: `scale(${invScale})`, transformOrigin: 'top left', width: `${100 * t.scale}%`, pointerEvents: 'none' }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 300, color: 'rgba(0,0,0,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                    {item.author && item.author !== 'Unknown' && (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(0,0,0,0.32)', marginTop: 2, letterSpacing: '0.08em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.author}{item.year && item.year !== 'n.d.' ? `, ${item.year}` : ''}
                      </div>
                    )}
                    {item.note && <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, fontStyle: 'italic', color: 'rgba(0,0,0,0.28)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{item.note}"</div>}
                  </div>
                </div>
              </div>
            );
          })}

          {/* ── Text notes ── */}
          {notes.map(note => (
            <CanvasNote
              key={note.id}
              note={note}
              onDrag={handleNoteDrag}
              onUpdate={handleNoteUpdate}
              xMode={xMode}
              onXDelete={deleteNote}
            />
          ))}

          {/* ── Canvas legend — solid, legible ── */}
          <div style={{ position: 'absolute', bottom: 22, left: 26, zIndex: 10, pointerEvents: 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {[
                ['Drag',       'move a piece'],
                ['Scroll',     'scale hovered piece'],
                ['Hold Q',     'draw freehand lines'],
                ['Hold X',     'delete lines or text'],
                ['Dbl-click',  'open piece  ·  or place text'],
              ].map(([key, desc]) => (
                <div key={key} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                  <span style={{
                    fontFamily:    'var(--font-mono)',
                    fontSize:      9,
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    color:         'rgba(0,0,0,0.52)',
                    minWidth:      72,
                    fontWeight:    500,
                  }}>{key}</span>
                  <span style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize:   10,
                    color:      'rgba(0,0,0,0.42)',
                    fontWeight: 300,
                  }}>{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── CATALOGUE VIEW ── */}
      {view === 'catalogue' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '48px 52px 80px' }}>
          {items.length === 0 && <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 300, color: 'rgba(0,0,0,0.35)' }}>This exhibit is empty</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '48px 32px' }}>
            {items.map((item, idx) => (
              <div key={item.id} className="cat-item" style={{ cursor: 'pointer', animation: `cat-reveal 0.55s cubic-bezier(0.16,1,0.3,1) ${idx * 0.03}s both` }}
                onClick={() => { setSelected(item); setSelectedIdx(idx); }}>
                <div style={{ overflow: 'hidden' }}>
                  <img src={imgUrl(item.imageUrl, 400)} alt={item.title} className="cat-img" style={{ width: '100%', height: 'auto', display: 'block' }} />
                </div>
                <div style={{ marginTop: 7 }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 300, color: 'rgba(0,0,0,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                  {item.author && item.author !== 'Unknown' && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(0,0,0,0.32)', marginTop: 2, letterSpacing: '0.08em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.author}{item.year && item.year !== 'n.d.' ? `, ${item.year}` : ''}
                    </div>
                  )}
                  {item.note && <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, fontStyle: 'italic', color: 'rgba(0,0,0,0.28)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>"{item.note}"</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Detail modal ── */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div key="bd" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              onClick={() => { setSelected(null); setEditingNote(null); }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(10,9,8,0.92)', zIndex: 500 }} />
            <motion.div key="modal" initial={{ opacity: 0, scale: 0.97, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.8 }}
              style={{ position: 'fixed', inset: 0, zIndex: 501, display: 'flex', pointerEvents: 'none' }}>
              <div onClick={() => setSelected(null)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', minWidth: 0, pointerEvents: 'all', cursor: 'default' }}>
                <img src={imgUrl(selected.imageUrl, 1200)} alt={selected.title} onClick={e => e.stopPropagation()} style={{ maxHeight: '88vh', maxWidth: '100%', objectFit: 'contain' }} />
              </div>
              <div onClick={e => e.stopPropagation()} style={{ width: '17rem', flexShrink: 0, background: 'rgba(8,7,6,0.55)', backdropFilter: 'blur(22px) saturate(160%)', WebkitBackdropFilter: 'blur(22px) saturate(160%)', borderLeft: '1px solid rgba(247,246,241,0.07)', display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '2rem', pointerEvents: 'all' }}>
                <button onClick={() => { setSelected(null); setEditingNote(null); }} style={{ alignSelf: 'flex-end', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--dark-faint)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '2rem', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.target.style.color = 'var(--dark-fg)'} onMouseLeave={e => e.target.style.color = 'var(--dark-faint)'}>✕ Close</button>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--dark-faint)', marginBottom: 8 }}>{SOURCE_LABELS[selected.source?.toLowerCase()] || selected.source}</p>
                <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.05rem', fontWeight: 300, letterSpacing: '-0.01em', lineHeight: 1.35, color: 'var(--dark-fg)', marginBottom: '2rem' }}>{selected.title}</h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginBottom: '1.5rem' }}>
                  {getModalRows(selected).map(([label, value]) => (
                    <div key={label}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--dark-faint)', marginBottom: 3 }}>{label}</p>
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 300, color: 'var(--dark-muted)', lineHeight: 1.45 }}>{value}</p>
                    </div>
                  ))}
                </div>
                {/* Annotation */}
                <div style={{ borderTop: '1px solid rgba(247,246,241,0.07)', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--dark-faint)' }}>Annotation</p>
                    {editingNote !== selected.id && (
                      <button onClick={() => { setEditingNote(selected.id); setNoteText(selected.note || ''); }} style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--dark-faint)', background: 'none', border: 'none', cursor: 'pointer' }}>{selected.note ? 'Edit' : '+ Add'}</button>
                    )}
                  </div>
                  {editingNote === selected.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <textarea value={noteText} onChange={e => setNoteText(e.target.value)} autoFocus rows={4} style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 300, color: 'var(--dark-muted)', background: 'rgba(247,246,241,0.04)', border: '1px solid rgba(247,246,241,0.1)', padding: '8px 10px', outline: 'none', resize: 'vertical', lineHeight: 1.5 }} />
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={() => saveNote(selected.id)} style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--dark-fg)', background: 'none', border: '1px solid rgba(247,246,241,0.2)', padding: '5px 12px', cursor: 'pointer' }}>Save</button>
                        <button onClick={() => setEditingNote(null)} style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--dark-faint)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 300, color: selected.note ? 'var(--dark-muted)' : 'var(--dark-faint)', lineHeight: 1.55, fontStyle: 'italic' }}>
                      {selected.note || 'No annotation yet'}
                    </p>
                  )}
                </div>
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingTop: '1.5rem', borderTop: '1px solid rgba(247,246,241,0.07)' }}>
                  {selected.link && <a href={selected.link} target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--dark-faint)', textDecoration: 'none' }} onMouseEnter={e => e.target.style.color = 'var(--dark-muted)'} onMouseLeave={e => e.target.style.color = 'var(--dark-faint)'}>View at source →</a>}
                  <button onClick={() => removeItem(selected.id)} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c0392b', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>Remove from exhibit</button>
                </div>
                <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(247,246,241,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button onClick={() => { const n = selectedIdx - 1; if (n >= 0) { setSelected(items[n]); setSelectedIdx(n); } }} disabled={selectedIdx === 0} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--dark-muted)', background: 'none', border: 'none', cursor: selectedIdx === 0 ? 'default' : 'pointer', opacity: selectedIdx === 0 ? 0.3 : 1 }}>← Prev</button>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--dark-faint)', letterSpacing: '0.06em' }}>{selectedIdx + 1} / {items.length}</span>
                  <button onClick={() => { const n = selectedIdx + 1; if (n < items.length) { setSelected(items[n]); setSelectedIdx(n); } }} disabled={selectedIdx === items.length - 1} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--dark-muted)', background: 'none', border: 'none', cursor: selectedIdx === items.length - 1 ? 'default' : 'pointer', opacity: selectedIdx === items.length - 1 ? 0.3 : 1 }}>Next →</button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .spread-item-wrap:hover .rot-handle { opacity: 1 !important; }
        .cat-img { transition: transform 0.4s cubic-bezier(0.16,1,0.3,1); }
        .cat-item:hover .cat-img { transform: scale(1.03); }
        @keyframes cat-reveal { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}