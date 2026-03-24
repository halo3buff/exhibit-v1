'use client';
// src/app/exhibits/[id]/page.js
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

function imgUrl(url, size = 1200) {
  if (!url) return '';
  return `/api/img?url=${encodeURIComponent(url)}&size=${size}`;
}

function defaultTransform(i, total) {
  const cols  = Math.ceil(Math.sqrt(total * 1.3));
  const col   = i % cols;
  const row   = Math.floor(i / cols);
  const rot   = (((i * 137.5) % 5) - 2.5);
  return {
    x:      90  + col * 220 + (i % 3) * 15,
    y:      80  + row * 220 + (i % 2) * 20,
    scale:  0.78 + (i % 4) * 0.07,
    rotate: rot,
    zIndex: i + 1,
  };
}

function debounce(fn, ms) {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

const SOURCE_LABELS = {
  met: 'The Met', artic: 'Art Institute of Chicago',
  cooperhewitt: 'Cooper Hewitt', va: 'Victoria & Albert Museum',
  rijks: 'Rijksmuseum', smithsonian: 'Smithsonian',
  designarchive: 'AIGA Design Archives',
};

const TOOLTIP_SCHEMA = {
  met:    [['Artist','author'],['Origin','origin'],['Date','year'],['Medium','medium'],['Object Type','objectType'],['Classification','classification'],['Department','department'],['Collection','collection']],
  artic:  [['Artist','author'],['Origin','origin'],['Date','year'],['Medium','medium'],['Artwork Type','objectType'],['Classification','classification'],['Department','department'],['Collection','collection']],
  va:     [['Maker','author'],['Origin','origin'],['Date','year'],['Materials','medium'],['Object Type','classification'],['Collection','collection']],
  rijks:  [['Artist','author'],['Origin','origin'],['Dating','year'],['Technique','medium'],['Object Type','objectType'],['Category','subCategory'],['Collection','collection']],
  smithsonian: [['Creator','author'],['Origin','origin'],['Date','year'],['Object Type','objectType'],['Medium','medium'],['Collection','collection']],
  cooperhewitt:[['Designer','author'],['Origin','origin'],['Date','year'],['Medium','medium'],['Object Type','objectType'],['Function','subCategory'],['Collection','collection']],
  designarchive:[['Designer','author'],['Year','year'],['Category','subCategory'],['Medium','medium'],['Collection','collection']],
  default:[['Artist','author'],['Origin','origin'],['Year','year'],['Medium','medium'],['Category','type'],['Sub-category','subCategory'],['Classification','classification'],['Collection','collection']],
};

function getModalRows(item) {
  const source = (item.source || '').toLowerCase();
  const schema = TOOLTIP_SCHEMA[source] || TOOLTIP_SCHEMA.default;
  const sourceLabel = SOURCE_LABELS[source] || item.source || '';
  return schema
    .map(([label, field]) => [label, field === 'collection' ? sourceLabel : item[field]])
    .filter(([, v]) => v?.toString().trim() && v !== 'Unknown' && v !== 'n.d.' && v !== 'Uncategorized' && v !== '');
}

// Magnetic button component
function MagneticBtn({ children, active, onClick }) {
  const ref = useRef(null);
  const onMove = useCallback((e) => {
    const el = ref.current; if (!el) return;
    const r  = el.getBoundingClientRect();
    const dx = (e.clientX - r.left - r.width / 2) * 0.3;
    const dy = (e.clientY - r.top  - r.height/ 2) * 0.3;
    el.style.transform = `translate(${dx}px, ${dy}px)`;
  }, []);
  const onLeave = useCallback(() => { if (ref.current) ref.current.style.transform = 'translate(0,0)'; }, []);
  return (
    <button ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} onClick={onClick}
      style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: active ? 'rgba(0,0,0,0.82)' : 'rgba(0,0,0,0.28)', fontWeight: active ? 500 : 400, background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px', transition: 'color 0.15s, transform 0.18s cubic-bezier(0.16,1,0.3,1)' }}>
      {children}
    </button>
  );
}

export default function ExhibitPage() {
  const { id }  = useParams();
  const router  = useRouter();

  const [exhibit,     setExhibit]     = useState(null);
  const [items,       setItems]       = useState([]);
  const [transforms,  setTransforms]  = useState({});
  const [loading,     setLoading]     = useState(true);
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

  // Non-passive wheel for scale — re-attaches whenever spread view becomes active
  useEffect(() => {
    if (view !== 'spread' || loading) return;
    const el = spreadRef.current; if (!el) return;
    const handle = (e) => {
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

  // Load
  useEffect(() => {
    fetch(`/api/exhibits/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) { router.push('/exhibits'); return; }
        setExhibit(d.exhibit); setTitleVal(d.exhibit.title);
        const tmap = {};
        d.items.forEach((item, i) => {
          try {
            const s = item.wallTransform ? JSON.parse(item.wallTransform) : null;
            tmap[item.id] = (s && typeof s.x === 'number') ? s : defaultTransform(i, d.items.length);
          } catch { tmap[item.id] = defaultTransform(i, d.items.length); }
        });
        tRef.current = { ...tmap };
        setTransforms(tmap); setItems(d.items); setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  // Drag with velocity tilt
  const onDragStart = useCallback((e, itemId) => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    setActiveId(itemId); setCursor('grabbing');
    const t = tRef.current[itemId] || { x: 0, y: 0, scale: 1, rotate: 0, zIndex: 1 };
    const sx = e.clientX, sy = e.clientY, ox = t.x, oy = t.y, origRot = t.rotate;
    let lastX = sx, emaVX = 0;

    const onMove = (e) => {
      const vx = e.clientX - lastX;
      emaVX = vx * 0.55 + emaVX * 0.45;
      lastX = e.clientX;
      const tilt = Math.max(-9, Math.min(9, emaVX * 0.55));
      syncT(itemId, { ...tRef.current[itemId], x: ox + e.clientX - sx, y: oy + e.clientY - sy, rotate: origRot + tilt });
    };
    const onUp = () => {
      const cur = tRef.current[itemId];
      if (cur) { const settled = { ...cur, rotate: origRot }; syncT(itemId, settled); saveTransform(itemId, settled); }
      setActiveId(null); setCursor('default');
      window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove); window.addEventListener('mouseup', onUp);
  }, [syncT, saveTransform]);

  // Rotate
  const onRotateStart = useCallback((e, itemId) => {
    e.preventDefault(); e.stopPropagation();
    const imgEl = document.getElementById(`spread-img-${itemId}`); if (!imgEl) return;
    const r = imgEl.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const a0 = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
    const origRot = (tRef.current[itemId] || {}).rotate || 0;
    const onMove = (e) => {
      const a = Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
      syncT(itemId, { ...tRef.current[itemId], rotate: origRot + a - a0 });
    };
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

  // Keyboard nav
  useEffect(() => {
    if (!selected) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { setSelected(null); setEditingNote(null); }
      if (e.key === 'ArrowRight') { const n = selectedIdx + 1; if (n < items.length) { setSelected(items[n]); setSelectedIdx(n); } }
      if (e.key === 'ArrowLeft')  { const n = selectedIdx - 1; if (n >= 0) { setSelected(items[n]); setSelectedIdx(n); } }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, selectedIdx, items]);

  async function removeItem(itemId) {
    await fetch(`/api/exhibits/${id}/items/${itemId}`, { method: 'DELETE' });
    setItems(prev => prev.filter(it => it.id !== itemId));
    delete tRef.current[itemId];
    setTransforms(prev => { const n = {...prev}; delete n[itemId]; return n; });
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

  if (loading) return (
    <div style={{ height: 'calc(100vh - 44px)', background: '#fafaf8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.25)' }}>Loading</p>
    </div>
  );

  return (
    <div style={{ height: 'calc(100vh - 44px)', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#fafaf8', cursor: view === 'spread' ? cursor : 'default' }}>

      {/* Glassmorphic header */}
      <header style={{ height: 64, flexShrink: 0, padding: '0 52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(250,250,248,0.72)', backdropFilter: 'blur(24px) saturate(180%)', WebkitBackdropFilter: 'blur(24px) saturate(180%)', borderBottom: '1px solid rgba(0,0,0,0.06)', zIndex: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <button onClick={() => router.push('/exhibits')} style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.24em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.15s' }}
            onMouseEnter={e => e.target.style.color = 'rgba(0,0,0,0.6)'} onMouseLeave={e => e.target.style.color = 'rgba(0,0,0,0.3)'}>
            ← Exhibits
          </button>
          {editing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input value={titleVal} onChange={e => setTitleVal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditing(false); }} autoFocus
                style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 300, letterSpacing: '-0.02em', color: 'rgba(0,0,0,0.8)', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(0,0,0,0.2)', outline: 'none', width: 280 }} />
              <button onClick={saveTitle} style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.4)', background: 'none', border: 'none', cursor: 'pointer' }}>Save</button>
            </div>
          ) : (
            <h1 onClick={() => setEditing(true)} title="Click to rename" style={{ fontFamily: 'var(--font-sans)', fontSize: 18, fontWeight: 300, letterSpacing: '-0.025em', color: 'rgba(0,0,0,0.82)', cursor: 'text', margin: 0, lineHeight: 1 }}>{exhibit.title}</h1>
          )}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(0,0,0,0.25)', letterSpacing: '0.1em' }}>{items.length} {items.length === 1 ? 'piece' : 'pieces'}</span>
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

      {/* SPREAD */}
      {view === 'spread' && (
        <div ref={spreadRef} style={{ flex: 1, position: 'relative', overflow: 'hidden', background: '#fafaf8' }}>
          {/* Grain */}
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0, opacity: 0.038 }}>
            <filter id="grain2"><feTurbulence type="fractalNoise" baseFrequency="0.68" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>
            <rect width="100%" height="100%" filter="url(#grain2)"/>
          </svg>

          {items.length === 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 1 }}>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 300, color: 'rgba(0,0,0,0.35)', margin: 0 }}>This exhibit is empty</p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', color: 'rgba(0,0,0,0.2)', margin: 0 }}>Add pieces from the gallery</p>
            </div>
          )}

          {items.map((item) => {
            const t = transforms[item.id] || defaultTransform(0, 1);
            const isActive = activeId === item.id;
            // inverse scale keeps caption text the same size regardless of image scale
            const invScale = t.scale > 0 ? 1 / t.scale : 1;
            // shadow depth tied to scale — bigger = "closer" = deeper shadow
            const sBlur  = 8  + t.scale * 20;
            const sY     = 2  + t.scale * 9;
            const sAlpha = 0.05 + Math.min(t.scale * 0.08, 0.22);
            const shadow = isActive
              ? `0 ${sY * 2.2}px ${sBlur * 2}px rgba(0,0,0,${Math.min(sAlpha * 2, 0.38)})`
              : `0 ${sY}px ${sBlur}px rgba(0,0,0,${sAlpha})`;

            return (
              <div
                key={item.id}
                style={{ position: 'absolute', left: 0, top: 0, zIndex: isActive ? 9999 : (t.zIndex || 1) }}
                onMouseEnter={() => { hoveredIdRef.current = item.id; setCursor('grab'); }}
                onMouseLeave={() => { hoveredIdRef.current = null; setCursor('default'); }}
              >
                <div
                  className="spread-item-wrap"
                  style={{
                    width: 210,
                    transform: `translate(${t.x}px, ${t.y}px) rotate(${t.rotate}deg) scale(${t.scale})`,
                    transformOrigin: 'center top',
                    cursor: isActive ? 'grabbing' : 'grab',
                    userSelect: 'none',
                    transition: isActive ? 'none' : 'none',
                  }}
                >
                  {/* Image */}
                  <img
                    id={`spread-img-${item.id}`}
                    src={imgUrl(item.imageUrl, 1200)}
                    alt={item.title}
                    draggable={false}
                    onMouseDown={e => { bringToFront(item.id); onDragStart(e, item.id); }}
                    onDoubleClick={() => { setSelected(item); setSelectedIdx(items.indexOf(item)); }}
                    style={{ width: '100%', height: 'auto', display: 'block', boxShadow: shadow, transition: isActive ? 'none' : 'box-shadow 0.25s ease' }}
                  />

                  {/* Rotate handle */}
                  <div onMouseDown={e => { e.stopPropagation(); onRotateStart(e, item.id); }}
                    className="rot-handle"
                    style={{ position: 'absolute', top: -9, right: -9, width: 18, height: 18, borderRadius: '50%', background: '#fafaf8', border: '1px solid rgba(0,0,0,0.15)', cursor: 'crosshair', zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.15s', color: 'rgba(0,0,0,0.4)' }}>
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                      <path d="M1 5C1 2.79 2.79 1 5 1C6.47 1 7.75 1.79 8.4 2.97" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      <polyline points="7,2.5 8.5,2.8 8.2,4.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>

                  {/* Caption — inverse scaled so text is always the same size */}
                  <div style={{
                    marginTop: 8,
                    transform: `scale(${invScale})`,
                    transformOrigin: 'top left',
                    width: `${100 * t.scale}%`,
                    pointerEvents: 'none',
                  }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 300, color: 'rgba(0,0,0,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>
                      {item.title}
                    </div>
                    {item.author && item.author !== 'Unknown' && (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(0,0,0,0.32)', marginTop: 2, letterSpacing: '0.08em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.author}{item.year && item.year !== 'n.d.' ? `, ${item.year}` : ''}
                      </div>
                    )}
                    {item.note && (
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, fontStyle: 'italic', color: 'rgba(0,0,0,0.28)', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        "{item.note}"
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

        </div>
      )}

      {/* CATALOGUE */}
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
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 300, color: 'rgba(0,0,0,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>{item.title}</div>
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

      {/* Modal */}
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
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 300, color: selected.note ? 'var(--dark-muted)' : 'var(--dark-faint)', lineHeight: 1.55, fontStyle: 'italic' }}>{selected.note || 'No annotation yet'}</p>
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