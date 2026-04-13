'use client';
// src/components/canvas/CanvasSidebar.js
// Left sidebar for the canvas editor: title, view switcher, tools, piece list, actions.

import { motion } from 'framer-motion';
import { imgUrl } from '@/lib/images';

// ── Sidebar icon button (collapsed-state controls) ─────────────────────────────

export function SidebarIconBtn({ active, onClick, title, children }) {
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

// ── Canvas Sidebar ─────────────────────────────────────────────────────────────

export default function CanvasSidebar({
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
