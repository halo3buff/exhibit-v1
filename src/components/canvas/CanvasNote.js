'use client';
// src/components/canvas/CanvasNote.js
// Draggable, editable text note placed in world-space on the canvas.

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CanvasNote({ note, onDrag, onUpdate, xMode, onXDelete, zoom }) {
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
