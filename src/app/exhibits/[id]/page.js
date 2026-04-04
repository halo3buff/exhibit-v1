'use client';
// src/app/exhibits/[id]/page.js — Canvas v3
// Infinite pan/zoom canvas with left sidebar
// Pan:      Space+drag or middle-mouse drag on empty canvas
// Zoom:     Scroll on empty canvas (cursor-centered)
// Scale img: Scroll while hovering an image
// Q:        Freehand pen mode
// X:        Delete mode

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { SOURCE_LABELS, TOOLTIP_SCHEMA } from '@/lib/constants';
import SaveToExhibit from '@/components/SaveToExhibit';

// ─── Utilities ────────────────────────────────────────────────────────────────

function imgUrl(url, size = 1200) {
  if (!url) return '';
  return `/api/img?url=${encodeURIComponent(url)}&size=${size}`;
}

function defaultTransform(i, total) {
  const cols = Math.ceil(Math.sqrt(total * 1.3));
  return {
    x:      90 + (i % cols) * 260 + (i % 3) * 18,
    y:      80 + Math.floor(i / cols) * 260 + (i % 2) * 22,
    scale:  0.78 + (i % 4) * 0.07,
    rotate: (((i * 137.5) % 5) - 2.5),
    zIndex: i + 1,
  };
}

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

function pointsToPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) d += ` L ${pts[i].x} ${pts[i].y}`;
  return d;
}

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
    if ((px - cx) ** 2 + (py - cy) ** 2 < threshold * threshold) return true;
  }
  return false;
}

// Convert screen coords → world coords given current pan/zoom
function screenToWorld(sx, sy, pan, zoom) {
  return { x: (sx - pan.x) / zoom, y: (sy - pan.y) / zoom };
}

function getModalRows(item) {
  const source = (item.source || '').toLowerCase();
  const schema = TOOLTIP_SCHEMA[source] || TOOLTIP_SCHEMA.default;
  const sourceLabel = SOURCE_LABELS[source] || item.source || '';
  return schema
    .map(([label, field]) => [label, field === 'collection' ? sourceLabel : item[field]])
    .filter(([, v]) => v?.toString().trim() && !['Unknown', 'n.d.', 'Uncategorized', ''].includes(v?.toString().trim()));
}

// ─── Sidebar icon buttons ──────────────────────────────────────────────────

function SidebarIconBtn({ active, onClick, title, children }) {
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        width:          32,
        height:         32,
        borderRadius:   4,
        background:     active ? 'rgba(0,0,0,0.08)' : 'none',
        border:         active ? '1px solid rgba(0,0,0,0.12)' : '1px solid transparent',
        cursor:         'pointer',
        color:          active ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.35)',
        transition:     'all 0.12s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'none'; }}
    >
      {children}
    </button>
  );
}

// ─── Canvas Sidebar ───────────────────────────────────────────────────────────

function CanvasSidebar({
  open, setOpen,
  exhibit, items,
  view, setView,
  editing, setEditing,
  titleVal, setTitleVal,
  saveTitle,
  togglePublic,
  qMode, setQMode,
  xMode, setXMode,
  onFlyTo,
  router, id,
  onDeleteExhibit,
}) {
  return (
    <motion.aside
      animate={{ width: open ? 220 : 48 }}
      transition={{ type: 'spring', stiffness: 340, damping: 30, mass: 0.8 }}
      style={{
        flexShrink:    0,
        height:        '100%',
        overflowX:     'hidden',
        overflowY:     open ? 'auto' : 'hidden',
        background:    'rgba(250,250,248,0.88)',
        backdropFilter:'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderRight:   '1px solid rgba(0,0,0,0.07)',
        display:       'flex',
        flexDirection: 'column',
        zIndex:        100,
        position:      'relative',
      }}
    >
      {/* ── Toggle ── */}
      <button
        onClick={() => setOpen(o => !o)}
        title={open ? 'Collapse' : 'Expand'}
        style={{
          flexShrink:     0,
          height:         48,
          width:          '100%',
          display:        'flex',
          alignItems:     'center',
          justifyContent: open ? 'flex-end' : 'center',
          paddingRight:   open ? 16 : 0,
          background:     'none',
          border:         'none',
          borderBottom:   '1px solid rgba(0,0,0,0.06)',
          cursor:         'pointer',
          color:          'rgba(0,0,0,0.28)',
          transition:     'color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'rgba(0,0,0,0.6)'}
        onMouseLeave={e => e.currentTarget.style.color = 'rgba(0,0,0,0.28)'}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{ transform: open ? 'none' : 'rotate(180deg)', transition: 'transform 0.2s' }}>
          <path d="M6.5 2L3.5 5L6.5 8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 0 24px', minWidth: open ? 220 : 48, overflowX: 'hidden' }}>

        {/* ── Back ── */}
        {open ? (
          <button onClick={() => router.push('/exhibits')}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 20px 14px', textAlign: 'left', transition: 'color 0.12s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(0,0,0,0.65)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(0,0,0,0.35)'}
          >← Exhibits</button>
        ) : (
          <button onClick={() => router.push('/exhibits')} title="Back to Exhibits"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 32, margin: '0 8px 8px', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(0,0,0,0.3)' }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M8 2L4 6L8 10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {/* ── Title ── */}
        {open && exhibit && (
          <div style={{ padding: '0 20px 16px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            {editing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  value={titleVal}
                  onChange={e => setTitleVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditing(false); }}
                  autoFocus
                  style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 300, color: 'rgba(0,0,0,0.8)', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(0,0,0,0.2)', outline: 'none', width: '100%', padding: '2px 0' }}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={saveTitle} style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.5)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Save</button>
                  <button onClick={() => setEditing(false)} style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.28)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Cancel</button>
                </div>
              </div>
            ) : (
              <h2 onClick={() => setEditing(true)} title="Click to rename"
                style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 400, color: 'rgba(0,0,0,0.78)', cursor: 'text', margin: '0 0 6px', lineHeight: 1.3, letterSpacing: '-0.01em' }}>
                {exhibit.title}
              </h2>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'rgba(0,0,0,0.28)', letterSpacing: '0.1em' }}>
                {items.length} {items.length === 1 ? 'piece' : 'pieces'}
              </span>
              <button onClick={togglePublic}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.28)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {exhibit.isPublic ? '● Public' : '○ Private'}
              </button>
            </div>
          </div>
        )}

        {/* ── View switcher ── */}
        {open ? (
          <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', gap: 6 }}>
            {['spread', 'catalogue'].map(v => (
              <button key={v} onClick={() => setView(v)}
                style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', color: view === v ? 'rgba(0,0,0,0.78)' : 'rgba(0,0,0,0.32)', background: view === v ? 'rgba(0,0,0,0.06)' : 'none', border: 'none', cursor: 'pointer', padding: '6px 0', transition: 'all 0.12s' }}>
                {v === 'spread' ? 'Canvas' : 'Catalogue'}
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '8px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <SidebarIconBtn active={view === 'spread'} onClick={() => setView('spread')} title="Canvas view">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="2" y="2" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
                <rect x="8" y="4" width="4" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
                <rect x="3" y="8" width="3" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
              </svg>
            </SidebarIconBtn>
            <SidebarIconBtn active={view === 'catalogue'} onClick={() => setView('catalogue')} title="Catalogue view">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <rect x="2" y="2" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
                <rect x="8" y="2" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
                <rect x="2" y="8" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
                <rect x="8" y="8" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
              </svg>
            </SidebarIconBtn>
          </div>
        )}

        {/* ── Tools (canvas-only) ── */}
        {view === 'spread' && (
          <div style={{ padding: open ? '12px 20px' : '8px', borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', flexDirection: open ? 'row' : 'column', gap: open ? 8 : 4, alignItems: open ? 'center' : 'center' }}>
            {open && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.28)', marginRight: 4 }}>Tools</span>}
            <SidebarIconBtn active={qMode} onClick={() => { setQMode(q => !q); if (xMode) setXMode(false); }} title="Pen mode (Q)">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 12L4 8L9 3L11 5L6 10L2 12Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                <path d="M9 3L11 5" stroke="currentColor" strokeWidth="1.2"/>
              </svg>
            </SidebarIconBtn>
            <SidebarIconBtn active={xMode} onClick={() => { setXMode(x => !x); if (qMode) setQMode(false); }} title="Delete mode (X)">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M3 3L11 11M11 3L3 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
              </svg>
            </SidebarIconBtn>
          </div>
        )}

        {/* ── Piece thumbnails ── */}
        {items.length > 0 && view === 'spread' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: open ? '12px 0' : '8px 0' }}>
            {open && (
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 7.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.28)', padding: '0 20px', marginBottom: 8 }}>Pieces</p>
            )}
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => onFlyTo(item.id)}
                title={item.title}
                style={{
                  display:     'flex',
                  alignItems:  'center',
                  gap:         10,
                  width:       '100%',
                  padding:     open ? '5px 20px' : '4px 8px',
                  background:  'none',
                  border:      'none',
                  cursor:      'pointer',
                  textAlign:   'left',
                  transition:  'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                <img
                  src={imgUrl(item.imageUrl, 80)}
                  alt={item.title}
                  style={{ width: 28, height: 28, objectFit: 'cover', flexShrink: 0, opacity: 0.85 }}
                />
                {open && (
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 300, color: 'rgba(0,0,0,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                    {item.title}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── Footer actions ── */}
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: open ? '12px 20px' : '8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {open ? (
            <>
              <a href="/gallery" target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.38)', textDecoration: 'none', transition: 'color 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(0,0,0,0.65)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(0,0,0,0.38)'}
              >+ Add pieces →</a>
              <button onClick={onDeleteExhibit}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(180,40,30,0.55)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left', transition: 'color 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.color = 'rgba(180,40,30,0.85)'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(180,40,30,0.55)'}
              >Delete exhibit</button>
            </>
          ) : (
            <SidebarIconBtn onClick={() => window.open('/gallery', '_blank')} title="Add pieces from gallery">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 2V10M2 6H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
            </SidebarIconBtn>
          )}
        </div>
      </div>
    </motion.aside>
  );
}

// ─── Canvas Note ──────────────────────────────────────────────────────────────

function CanvasNote({ note, onDrag, onUpdate, xMode, onXDelete, zoom }) {
  const [focused, setFocused] = useState(false);
  const [toolbar, setToolbar] = useState(false);
  const inputRef = useRef(null);
  const wrapRef  = useRef(null);

  useEffect(() => {
    if (note.content === '' && inputRef.current) {
      inputRef.current.focus(); setFocused(true); setToolbar(true);
    }
  }, []);

  const focusedRef  = useRef(false);
  const fontSizeRef = useRef(note.fontSize);
  focusedRef.current  = focused;
  fontSizeRef.current = note.fontSize;

  useEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const handle = (e) => {
      if (!focusedRef.current) return;
      e.preventDefault(); e.stopPropagation();
      const next = Math.max(8, Math.min(72, fontSizeRef.current + (e.deltaY > 0 ? -1 : 1)));
      onUpdate(note.id, { fontSize: next });
    };
    el.addEventListener('wheel', handle, { passive: false });
    return () => el.removeEventListener('wheel', handle);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id, onUpdate]);

  const handleDragStart = (e) => {
    if (focused || e.target === inputRef.current) return;
    if (xMode) { onXDelete(note.id); return; }
    e.preventDefault();
    const sx = e.clientX, sy = e.clientY, ox = note.x, oy = note.y;
    // Divide by zoom so drag speed matches world-space movement
    const onMove = (ev) => onDrag(note.id, ox + (ev.clientX - sx) / zoom, oy + (ev.clientY - sy) / zoom);
    const onUp   = () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div
      ref={wrapRef}
      onMouseDown={handleDragStart}
      onClick={e => { if (xMode) { e.stopPropagation(); onXDelete(note.id); } }}
      style={{
        position:  'absolute',
        left:      0, top: 0,
        transform: `translate(${note.x}px, ${note.y}px)`,
        zIndex:    focused ? 200 : 40,
        cursor:    xMode ? 'not-allowed' : (focused ? 'text' : 'grab'),
        userSelect: focused ? 'text' : 'none',
        minWidth:  120, maxWidth: 480,
      }}
    >
      <AnimatePresence>
        {toolbar && focused && (
          <motion.div key="toolbar" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }} transition={{ duration: 0.14 }}
            onMouseDown={e => e.preventDefault()}
            style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 2, background: 'rgba(14,13,12,0.88)', backdropFilter: 'blur(12px)', padding: '5px 8px', zIndex: 300, whiteSpace: 'nowrap' }}>
            <button onClick={() => onUpdate(note.id, { bold: !note.bold })}
              style={{ fontFamily: 'serif', fontSize: 13, fontWeight: 700, color: note.bold ? '#fff' : 'rgba(255,255,255,0.45)', background: note.bold ? 'rgba(255,255,255,0.12)' : 'none', border: 'none', cursor: 'pointer', padding: '2px 7px' }}>B</button>
            <button onClick={() => onUpdate(note.id, { italic: !note.italic })}
              style={{ fontFamily: 'serif', fontSize: 13, fontStyle: 'italic', color: note.italic ? '#fff' : 'rgba(255,255,255,0.45)', background: note.italic ? 'rgba(255,255,255,0.12)' : 'none', border: 'none', cursor: 'pointer', padding: '2px 7px' }}>I</button>
            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(255,255,255,0.4)', minWidth: 28, textAlign: 'center' }}>{Math.round(note.fontSize)}</span>
            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'rgba(255,255,255,0.28)' }}>scroll to resize</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div style={{ background: focused ? 'rgba(0,0,0,0.03)' : 'transparent', outline: focused ? '1px dashed rgba(0,0,0,0.12)' : 'none', outlineOffset: 6, padding: '2px 0', transition: 'background 0.15s' }}>
        {focused ? (
          <textarea ref={inputRef} value={note.content} onChange={e => onUpdate(note.id, { content: e.target.value })}
            onFocus={() => { setFocused(true); setToolbar(true); }}
            onBlur={() => { setFocused(false); setToolbar(false); }}
            onKeyDown={e => { if (e.key === 'Escape') inputRef.current?.blur(); }}
            rows={1}
            style={{ fontFamily: 'var(--font-sans)', fontSize: note.fontSize, fontWeight: note.bold ? 600 : 300, fontStyle: note.italic ? 'italic' : 'normal', lineHeight: 1.45, color: 'rgba(0,0,0,0.78)', background: 'transparent', border: 'none', outline: 'none', resize: 'none', padding: 0, width: Math.max(120, note.content.length * note.fontSize * 0.55 + 20), maxWidth: 480, minWidth: 80, overflow: 'hidden', display: 'block' }}
            onInput={e => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }}
          />
        ) : (
          <p onDoubleClick={() => { setFocused(true); setToolbar(true); setTimeout(() => inputRef.current?.focus(), 0); }}
            style={{ fontFamily: 'var(--font-sans)', fontSize: note.fontSize, fontWeight: note.bold ? 600 : 300, fontStyle: note.italic ? 'italic' : 'normal', lineHeight: 1.45, color: note.content ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.2)', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', cursor: xMode ? 'not-allowed' : 'grab', userSelect: 'none' }}>
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
        <motion.div key="hud" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.16 }}
          style={{ position: 'fixed', top: 72, left: '50%', transform: 'translateX(-50%)', zIndex: 400, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(12px)', padding: '7px 20px', display: 'flex', alignItems: 'center', gap: 10, pointerEvents: 'none' }}>
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Move to Exhibit picker ───────────────────────────────────────────────────

function MoveToExhibitPicker({ currentExhibitId, itemId, onDone }) {
  const [exhibits, setExhibits] = useState([]);
  const [moving, setMoving]     = useState(null);

  useEffect(() => {
    fetch('/api/exhibits')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.exhibits) setExhibits(d.exhibits.filter(e => e.id !== currentExhibitId)); })
      .catch(() => {});
  }, [currentExhibitId]);

  async function moveTo(targetId) {
    setMoving(targetId);
    try {
      await fetch(`/api/exhibits/${targetId}/items`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ artworkId: itemId }),
      });
      await fetch(`/api/exhibits/${currentExhibitId}/items/${itemId}`, { method: 'DELETE' });
      onDone();
    } catch (_) { setMoving(null); }
  }

  if (exhibits.length === 0) return (
    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--dark-faint)', letterSpacing: '0.1em' }}>No other exhibits</p>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {exhibits.map(ex => (
        <button key={ex.id} onClick={() => moveTo(ex.id)} disabled={!!moving}
          style={{ textAlign: 'left', fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 300, color: moving === ex.id ? 'rgba(247,246,241,0.9)' : 'rgba(247,246,241,0.55)', background: 'none', border: 'none', cursor: 'pointer', padding: '5px 0', borderBottom: '1px solid rgba(247,246,241,0.06)', transition: 'color 0.12s' }}
          onMouseEnter={e => { if (!moving) e.currentTarget.style.color = 'rgba(247,246,241,0.9)'; }}
          onMouseLeave={e => { if (!moving) e.currentTarget.style.color = 'rgba(247,246,241,0.55)'; }}
        >
          {moving === ex.id ? 'Moving…' : ex.title}
        </button>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExhibitPage() {
  const { id } = useParams();
  const router = useRouter();

  // Exhibit data
  const [exhibit,    setExhibit]    = useState(null);
  const [items,      setItems]      = useState([]);
  const [transforms, setTransforms] = useState({});
  const [loading,    setLoading]    = useState(true);

  // Canvas layers
  const [strokes,    setStrokes]    = useState([]);
  const [liveStroke, setLiveStroke] = useState(null);
  const [notes,      setNotes]      = useState([]);

  // Pan/zoom state — stored in refs for perf, mirrored to state for re-render
  const panRef  = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const [pan,  setPan]  = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // Modes
  const [qMode, setQMode] = useState(false);
  const [xMode, setXMode] = useState(false);
  const [spaceDown, setSpaceDown] = useState(false);

  // UI
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
  const [showMoveFor, setShowMoveFor] = useState(null); // itemId

  const tRef         = useRef({});
  const spreadRef    = useRef(null);
  const hoveredIdRef = useRef(null);
  const isDrawingRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef  = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  // Sync zoom/pan refs → state (batched via RAF for perf)
  const flushViewRef = useRef(null);
  const flushView = useCallback(() => {
    if (flushViewRef.current) return;
    flushViewRef.current = requestAnimationFrame(() => {
      flushViewRef.current = null;
      setPan({ ...panRef.current });
      setZoom(zoomRef.current);
    });
  }, []);

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

  // ── Load ──────────────────────────────────────────────────────────────────
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

  // ── Keyboard: Q/X/Space ──────────────────────────────────────────────────
  useEffect(() => {
    if (view !== 'spread') return;
    const onDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if ((e.key === 'q' || e.key === 'Q') && !e.repeat) setQMode(true);
      if ((e.key === 'x' || e.key === 'X') && !e.repeat) setXMode(true);
      if (e.key === ' ' && !e.repeat) { e.preventDefault(); setSpaceDown(true); }
    };
    const onUp = (e) => {
      if (e.key === 'q' || e.key === 'Q') { setQMode(false); setLiveStroke(null); isDrawingRef.current = false; }
      if (e.key === 'x' || e.key === 'X') setXMode(false);
      if (e.key === ' ') setSpaceDown(false);
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => { window.removeEventListener('keydown', onDown); window.removeEventListener('keyup', onUp); };
  }, [view]);

  // ── Wheel: zoom canvas OR scale image ─────────────────────────────────────
  useEffect(() => {
    if (view !== 'spread' || loading) return;
    const el = spreadRef.current; if (!el) return;

    const handle = (e) => {
      if (document.activeElement?.tagName === 'TEXTAREA') return;
      e.preventDefault();

      if (hoveredIdRef.current) {
        // Scale image
        const itemId = hoveredIdRef.current;
        const t = tRef.current[itemId]; if (!t) return;
        const next = { ...t, scale: Math.max(0.15, Math.min(4, t.scale + (e.deltaY > 0 ? -0.06 : 0.06))) };
        syncT(itemId, next); saveTransform(itemId, next);
      } else {
        // Zoom canvas, centered on cursor
        const rect = el.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const factor = e.deltaY > 0 ? 0.92 : 1.09;
        const newZoom = Math.max(0.15, Math.min(5, zoomRef.current * factor));
        // Adjust pan so the point under the cursor stays fixed
        panRef.current = {
          x: mx - (mx - panRef.current.x) * (newZoom / zoomRef.current),
          y: my - (my - panRef.current.y) * (newZoom / zoomRef.current),
        };
        zoomRef.current = newZoom;
        flushView();
      }
    };
    el.addEventListener('wheel', handle, { passive: false });
    return () => el.removeEventListener('wheel', handle);
  }, [view, loading, syncT, saveTransform, flushView]);

  // ── Canvas mousedown: pan, draw, or nothing ───────────────────────────────
  const onCanvasMouseDown = useCallback((e) => {
    if (e.target !== spreadRef.current && !e.target.classList.contains('canvas-bg-inner')) return;
    if (e.button === 1 || (e.button === 0 && spaceDown)) {
      // Pan
      e.preventDefault();
      isPanningRef.current = true;
      panStartRef.current = { mx: e.clientX, my: e.clientY, px: panRef.current.x, py: panRef.current.y };
      const onMove = (mv) => {
        if (!isPanningRef.current) return;
        panRef.current = {
          x: panStartRef.current.px + mv.clientX - panStartRef.current.mx,
          y: panStartRef.current.py + mv.clientY - panStartRef.current.my,
        };
        flushView();
      };
      const onUp = () => {
        isPanningRef.current = false;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      return;
    }

    if (e.button !== 0) return;

    if (qMode) {
      e.preventDefault();
      isDrawingRef.current = true;
      const rect = spreadRef.current.getBoundingClientRect();
      // Convert to world space
      const wpt = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, panRef.current, zoomRef.current);
      setLiveStroke([wpt]);

      const onMove = (mv) => {
        if (!isDrawingRef.current) return;
        const r = spreadRef.current?.getBoundingClientRect(); if (!r) return;
        const wp = screenToWorld(mv.clientX - r.left, mv.clientY - r.top, panRef.current, zoomRef.current);
        setLiveStroke(prev => prev ? [...prev, wp] : null);
      };
      const onUp = async () => {
        isDrawingRef.current = false;
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        setLiveStroke(prev => {
          if (!prev || prev.length < 2) return null;
          const pathData = pointsToPath(prev);
          const optimistic = { id: `opt-${Date.now()}`, exhibitId: id, pathData, color: 'rgba(0,0,0,0.55)', width: 1.5 };
          setStrokes(s => [...s, optimistic]);
          fetch(`/api/exhibits/${id}/strokes`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pathData, color: 'rgba(0,0,0,0.55)', width: 1.5 }),
          })
            .then(r => r.json())
            .then(({ stroke }) => { if (stroke) setStrokes(s => s.map(st => st.id === optimistic.id ? stroke : st)); })
            .catch(() => setStrokes(s => s.filter(st => st.id !== optimistic.id)));
          return null;
        });
      };
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
    }
  }, [qMode, spaceDown, id, flushView]);

  // ── Double-click on empty canvas: place note (world coords) ───────────────
  const onCanvasDblClick = useCallback(async (e) => {
    if (qMode || xMode || spaceDown) return;
    if (e.target !== spreadRef.current && !e.target.classList.contains('canvas-bg-inner')) return;
    const rect = spreadRef.current.getBoundingClientRect();
    const { x, y } = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, panRef.current, zoomRef.current);

    const optimistic = { id: `opt-${Date.now()}`, exhibitId: id, x, y, content: '', fontSize: 13, bold: 0, italic: 0 };
    setNotes(prev => [...prev, optimistic]);
    try {
      const r = await fetch(`/api/exhibits/${id}/notes`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x, y, content: '', fontSize: 13 }),
      });
      const { note } = await r.json();
      if (note) setNotes(prev => prev.map(n => n.id === optimistic.id ? note : n));
    } catch (_) { setNotes(prev => prev.filter(n => n.id !== optimistic.id)); }
  }, [qMode, xMode, spaceDown, id]);

  // ── Click on canvas in X mode: delete stroke ─────────────────────────────
  const onCanvasClick = useCallback((e) => {
    if (!xMode) return;
    if (e.target !== spreadRef.current && !e.target.classList.contains('canvas-bg-inner')) return;
    const rect = spreadRef.current.getBoundingClientRect();
    const { x: px, y: py } = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, panRef.current, zoomRef.current);
    const hit = strokes.find(s => pathHitTest(s.pathData, px, py, 12 / zoomRef.current));
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

  // ── Fly to item: center canvas on item's world position ───────────────────
  const onFlyTo = useCallback((itemId) => {
    const t = tRef.current[itemId]; if (!t) return;
    const el = spreadRef.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    // Center the item in the viewport
    panRef.current = {
      x: rect.width  / 2 - t.x * zoomRef.current - (105 * t.scale * zoomRef.current),
      y: rect.height / 2 - t.y * zoomRef.current - (80  * t.scale * zoomRef.current),
    };
    flushView();
  }, [flushView]);

  // ── Artwork drag: delta must be divided by zoom ───────────────────────────
  const onDragStart = useCallback((e, itemId) => {
    if (e.button !== 0 || qMode || xMode || spaceDown) return;
    e.preventDefault(); e.stopPropagation();
    setActiveId(itemId); setCursor('grabbing');
    const t = tRef.current[itemId] || { x: 0, y: 0, scale: 1, rotate: 0, zIndex: 1 };
    const sx = e.clientX, sy = e.clientY, ox = t.x, oy = t.y, origRot = t.rotate;
    let lastX = sx, emaVX = 0;
    const onMove = (ev) => {
      const vx = ev.clientX - lastX;
      emaVX = vx * 0.55 + emaVX * 0.45;
      lastX = ev.clientX;
      syncT(itemId, {
        ...tRef.current[itemId],
        x: ox + (ev.clientX - sx) / zoomRef.current,
        y: oy + (ev.clientY - sy) / zoomRef.current,
        rotate: origRot + Math.max(-9, Math.min(9, emaVX * 0.55)),
      });
    };
    const onUp = () => {
      const cur = tRef.current[itemId];
      if (cur) { const settled = { ...cur, rotate: origRot }; syncT(itemId, settled); saveTransform(itemId, settled); }
      setActiveId(null); setCursor('default');
      window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  }, [syncT, saveTransform, qMode, xMode, spaceDown]);

  // ── Rotate handle ──────────────────────────────────────────────────────────
  const onRotateStart = useCallback((e, itemId) => {
    e.preventDefault(); e.stopPropagation();
    const imgEl = document.getElementById(`spread-img-${itemId}`); if (!imgEl) return;
    const r = imgEl.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const a0 = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
    const origRot = (tRef.current[itemId] || {}).rotate || 0;
    const onMove = (ev) => syncT(itemId, { ...tRef.current[itemId], rotate: origRot + Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI - a0 });
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

  // ── Modal keyboard nav ────────────────────────────────────────────────────
  useEffect(() => {
    if (!selected) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { setSelected(null); setEditingNote(null); setShowMoveFor(null); }
      if (e.key === 'ArrowRight') { const n = selectedIdx + 1; if (n < items.length) { setSelected(items[n]); setSelectedIdx(n); } }
      if (e.key === 'ArrowLeft')  { const n = selectedIdx - 1; if (n >= 0)            { setSelected(items[n]); setSelectedIdx(n); } }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, selectedIdx, items]);

  // ── Exhibit actions ───────────────────────────────────────────────────────
  async function removeItem(itemId) {
    await fetch(`/api/exhibits/${id}/items/${itemId}`, { method: 'DELETE' });
    setItems(prev => prev.filter(it => it.id !== itemId));
    delete tRef.current[itemId];
    setTransforms(prev => { const n = { ...prev }; delete n[itemId]; return n; });
    if (selected?.id === itemId) { setSelected(null); setShowMoveFor(null); }
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
  async function deleteExhibit() {
    if (!confirm(`Delete "${exhibit.title}"? This cannot be undone.`)) return;
    await fetch(`/api/exhibits/${id}`, { method: 'DELETE' });
    router.push('/exhibits');
  }

  // ── Cursor logic ──────────────────────────────────────────────────────────
  const spreadCursor = spaceDown
    ? (isPanningRef.current ? 'grabbing' : 'grab')
    : xMode ? 'crosshair'
    : qMode ? 'crosshair'
    : cursor;

  if (loading) return (
    <div style={{ height: 'calc(100vh - 44px)', background: '#fafaf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.25)' }}>Loading</p>
    </div>
  );

  const livePath = liveStroke && liveStroke.length > 1 ? pointsToPath(liveStroke) : null;
  const worldTransform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;

  return (
    <div style={{ height: 'calc(100vh - 44px)', overflow: 'hidden', display: 'flex', background: '#fafaf8' }}>

      {/* ── Left Sidebar ── */}
      <CanvasSidebar
        open={sidebarOpen} setOpen={setSidebarOpen}
        exhibit={exhibit} items={items}
        view={view} setView={setView}
        editing={editing} setEditing={setEditing}
        titleVal={titleVal} setTitleVal={setTitleVal}
        saveTitle={saveTitle}
        togglePublic={togglePublic}
        qMode={qMode} setQMode={setQMode}
        xMode={xMode} setXMode={setXMode}
        onFlyTo={onFlyTo}
        router={router} id={id}
        onDeleteExhibit={deleteExhibit}
      />

      {/* ── Canvas area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* ── Mode HUDs ── */}
        <ModeHUD mode={qMode && view === 'spread'}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(100,210,130,0.9)', display: 'inline-block', flexShrink: 0 }} />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.72)', margin: 0 }}>
            Pen mode — draw anywhere · release Q or click toolbar to exit
          </p>
        </ModeHUD>
        <ModeHUD mode={xMode && view === 'spread'}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(220,80,60,0.9)', display: 'inline-block', flexShrink: 0 }} />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.72)', margin: 0 }}>
            Delete mode — click a line or text to remove · release X or click toolbar to exit
          </p>
        </ModeHUD>
        <ModeHUD mode={spaceDown && view === 'spread'}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(120,160,240,0.9)', display: 'inline-block', flexShrink: 0 }} />
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.72)', margin: 0 }}>
            Pan mode — drag to move canvas
          </p>
        </ModeHUD>

        {/* ── SPREAD VIEW ── */}
        {view === 'spread' && (
          <div
            ref={spreadRef}
            onMouseDown={onCanvasMouseDown}
            onDoubleClick={onCanvasDblClick}
            onClick={onCanvasClick}
            style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#fafaf8', cursor: spreadCursor }}
          >
            {/* Grain overlay */}
            <div className="canvas-bg-inner" style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.038 }}>
                <filter id="grain2"><feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
                <rect width="100%" height="100%" filter="url(#grain2)"/>
              </svg>
            </div>

            {/* Empty state */}
            {items.length === 0 && strokes.length === 0 && notes.length === 0 && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 1, pointerEvents: 'none' }}>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 300, color: 'rgba(0,0,0,0.35)', margin: 0 }}>This exhibit is empty</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.2)', margin: 0 }}>Use the sidebar to add pieces from the gallery</p>
              </div>
            )}

            {/* ── World transform container — everything inside pans/zooms ── */}
            <div style={{ position: 'absolute', inset: 0, transformOrigin: '0 0', transform: worldTransform, willChange: 'transform' }}>

              {/* SVG stroke layer */}
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 6, overflow: 'visible' }}>
                {strokes.map(s => (
                  <path key={s.id} d={s.pathData}
                    stroke={xMode ? 'rgba(200,60,40,0.35)' : (s.color || 'rgba(0,0,0,0.55)')}
                    strokeWidth={s.width || 1.5} fill="none" strokeLinecap="round" strokeLinejoin="round"
                    style={{ transition: 'stroke 0.15s' }}
                  />
                ))}
                {livePath && (
                  <path d={livePath} stroke="rgba(0,0,0,0.55)" strokeWidth={1.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>

              {/* Artwork cards */}
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
                    onMouseEnter={() => { hoveredIdRef.current = item.id; if (!qMode && !xMode && !spaceDown) setCursor('grab'); }}
                    onMouseLeave={() => { hoveredIdRef.current = null; if (!qMode && !xMode && !spaceDown) setCursor('default'); }}>
                    <div className="spread-item-wrap" style={{ width: 210, transform: `translate(${t.x}px, ${t.y}px) rotate(${t.rotate}deg) scale(${t.scale})`, transformOrigin: 'center top', cursor: isActive ? 'grabbing' : (qMode || xMode || spaceDown ? 'default' : 'grab'), userSelect: 'none' }}>
                      <img
                        id={`spread-img-${item.id}`}
                        src={imgUrl(item.imageUrl, 1200)}
                        alt={item.title}
                        draggable={false}
                        onMouseDown={e => { bringToFront(item.id); onDragStart(e, item.id); }}
                        onDoubleClick={() => { if (!qMode && !xMode && !spaceDown) { setSelected(item); setSelectedIdx(items.indexOf(item)); setShowMoveFor(null); } }}
                        style={{ width: '100%', height: 'auto', display: 'block', boxShadow: shadow, transition: isActive ? 'none' : 'box-shadow 0.25s ease' }}
                      />
                      {!qMode && !xMode && !spaceDown && (
                        <div onMouseDown={e => { e.stopPropagation(); onRotateStart(e, item.id); }}
                          className="rot-handle"
                          style={{ position: 'absolute', top: -9, right: -9, width: 18, height: 18, borderRadius: '50%', background: '#fafaf8', border: '1px solid rgba(0,0,0,0.15)', cursor: 'crosshair', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s', color: 'rgba(0,0,0,0.4)' }}>
                          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                            <path d="M1 5C1 2.79 2.79 1 5 1C6.47 1 7.75 1.79 8.4 2.97" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                            <polyline points="7,2.5 8.5,2.8 8.2,4.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                      )}
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

              {/* Text notes */}
              {notes.map(note => (
                <CanvasNote key={note.id} note={note} zoom={zoom}
                  onDrag={handleNoteDrag} onUpdate={handleNoteUpdate}
                  xMode={xMode} onXDelete={deleteNote}
                />
              ))}
            </div>

            {/* ── Canvas legend (fixed to viewport, outside world) ── */}
            <div style={{ position: 'absolute', bottom: 22, left: 26, zIndex: 10, pointerEvents: 'none' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {[
                  ['Drag',        'move a piece'],
                  ['Scroll',      'zoom canvas  ·  or scale hovered piece'],
                  ['Space+drag',  'pan canvas'],
                  ['Hold Q',      'draw freehand lines'],
                  ['Hold X',      'delete lines or text'],
                  ['Dbl-click',   'open piece  ·  or place text'],
                ].map(([key, desc]) => (
                  <div key={key} style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.52)', minWidth: 86, fontWeight: 500 }}>{key}</span>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, color: 'rgba(0,0,0,0.42)', fontWeight: 300 }}>{desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Zoom indicator ── */}
            <div style={{ position: 'absolute', bottom: 22, right: 22, zIndex: 10, pointerEvents: 'none' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(0,0,0,0.28)', letterSpacing: '0.1em' }}>
                {Math.round(zoom * 100)}%
              </span>
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
                  onClick={() => { setSelected(item); setSelectedIdx(idx); setShowMoveFor(null); }}>
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
      </div>

      {/* ── Detail modal — gallery-style warm blur ── */}
      <AnimatePresence>
        {selected && (
          <>
            {/* Warm milky blur backdrop */}
            <motion.div key="bd"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
              onClick={() => { setSelected(null); setEditingNote(null); setShowMoveFor(null); }}
              style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(240,237,232,0.45)', backdropFilter: 'blur(22px) brightness(1.04) saturate(0.85)', WebkitBackdropFilter: 'blur(22px) brightness(1.04) saturate(0.85)', cursor: 'default' }}
            />

            <motion.div key="modal"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 340, damping: 32, mass: 0.9 }}
              style={{ position: 'fixed', inset: 0, zIndex: 501, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', padding: '3rem 4rem', gap: '5vw' }}
            >
              {/* Image */}
              <div onClick={e => e.stopPropagation()}
                style={{ flexShrink: 0, maxWidth: '50vw', maxHeight: '84vh', pointerEvents: 'all', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <img key={selected.id} src={imgUrl(selected.imageUrl, 1200)} alt={selected.title}
                  style={{ maxWidth: '100%', maxHeight: '84vh', objectFit: 'contain', display: 'block', boxShadow: '0 12px 60px rgba(0,0,0,0.12)' }} />
              </div>

              {/* Floating metadata */}
              <div onClick={e => e.stopPropagation()}
                style={{ flexShrink: 0, width: '22rem', maxHeight: '84vh', overflowY: 'auto', pointerEvents: 'all', display: 'flex', flexDirection: 'column' }}>

                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)', margin: '0 0 10px' }}>
                  {SOURCE_LABELS[selected.source?.toLowerCase()] || selected.source}
                </p>
                <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.25rem', fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1.3, color: 'rgba(0,0,0,0.82)', margin: '0 0 2.5rem' }}>
                  {selected.title}
                </h2>

                {/* Metadata pairs */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem', marginBottom: '2rem' }}>
                  {getModalRows(selected).map(([label, value]) => (
                    <div key={label}>
                      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 7.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.3)', margin: '0 0 4px' }}>{label}</p>
                      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 300, color: 'rgba(0,0,0,0.72)', lineHeight: 1.5, margin: 0 }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Annotation */}
                <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 7.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.3)', margin: 0 }}>Annotation</p>
                    {editingNote !== selected.id && (
                      <button onClick={() => { setEditingNote(selected.id); setNoteText(selected.note || ''); }}
                        style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                        {selected.note ? 'Edit' : '+ Add'}
                      </button>
                    )}
                  </div>
                  {editingNote === selected.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <textarea value={noteText} onChange={e => setNoteText(e.target.value)} autoFocus rows={4}
                        style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 300, color: 'rgba(0,0,0,0.7)', background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.1)', padding: '8px 10px', outline: 'none', resize: 'vertical', lineHeight: 1.5 }} />
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={() => saveNote(selected.id)} style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.7)', background: 'none', border: '1px solid rgba(0,0,0,0.2)', padding: '5px 12px', cursor: 'pointer' }}>Save</button>
                        <button onClick={() => setEditingNote(null)} style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'rgba(0,0,0,0.3)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 300, color: selected.note ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.28)', lineHeight: 1.55, fontStyle: 'italic', margin: 0 }}>
                      {selected.note || 'No annotation yet'}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: '1rem' }}>
                  {selected.link && (
                    <a href={selected.link} target="_blank" rel="noopener noreferrer"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.35)', textDecoration: 'none', transition: 'color 0.15s' }}
                      onMouseEnter={e => e.target.style.color = 'rgba(0,0,0,0.65)'}
                      onMouseLeave={e => e.target.style.color = 'rgba(0,0,0,0.35)'}
                    >View at source →</a>
                  )}

                  {/* Move to exhibit */}
                  <div>
                    <button onClick={() => setShowMoveFor(showMoveFor === selected.id ? null : selected.id)}
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.38)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.color = 'rgba(0,0,0,0.65)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'rgba(0,0,0,0.38)'}
                    >{showMoveFor === selected.id ? '↑ Cancel move' : 'Move to exhibit →'}</button>
                    <AnimatePresence>
                      {showMoveFor === selected.id && (
                        <motion.div key="move-picker"
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18 }}
                          style={{ overflow: 'hidden', marginTop: 8 }}>
                          <MoveToExhibitPicker
                            currentExhibitId={id}
                            itemId={selected.artworkId || selected.id}
                            onDone={() => {
                              removeItem(selected.id);
                              setSelected(null);
                              setShowMoveFor(null);
                            }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button onClick={() => removeItem(selected.id)}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(180,40,30,0.55)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, transition: 'color 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.color = 'rgba(180,40,30,0.85)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(180,40,30,0.55)'}
                  >Remove from exhibit</button>
                </div>

                {/* Prev / Next */}
                <div style={{ paddingTop: '1.5rem', borderTop: '1px solid rgba(0,0,0,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button onClick={() => { const n = selectedIdx - 1; if (n >= 0) { setSelected(items[n]); setSelectedIdx(n); setShowMoveFor(null); } }} disabled={selectedIdx === 0}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.55)', background: 'none', border: 'none', cursor: selectedIdx === 0 ? 'default' : 'pointer', opacity: selectedIdx === 0 ? 0.3 : 1 }}>← Prev</button>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'rgba(0,0,0,0.28)', letterSpacing: '0.06em' }}>{selectedIdx + 1} / {items.length}</span>
                  <button onClick={() => { const n = selectedIdx + 1; if (n < items.length) { setSelected(items[n]); setSelectedIdx(n); setShowMoveFor(null); } }} disabled={selectedIdx === items.length - 1}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.55)', background: 'none', border: 'none', cursor: selectedIdx === items.length - 1 ? 'default' : 'pointer', opacity: selectedIdx === items.length - 1 ? 0.3 : 1 }}>Next →</button>
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