'use client';
// src/app/exhibits/[id]/page.js
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

function imgUrl(url, size = 800) {
  if (!url) return '';
  return `/api/img?url=${encodeURIComponent(url)}&size=${size}`;
}

// Generate a random pinboard position for each item
function randomPin(i, total) {
  // Divide canvas into a loose grid of zones, then offset randomly within each
  const cols = Math.ceil(Math.sqrt(total * 1.4));
  const col  = i % cols;
  const row  = Math.floor(i / cols);
  const zoneW = 80 / cols;
  const zoneH = 75 / Math.ceil(total / cols);
  return {
    left:   8 + col * zoneW + Math.random() * zoneW * 0.6,
    top:    6 + row * zoneH + Math.random() * zoneH * 0.6,
    width:  12 + Math.random() * 10,
    rotate: (Math.random() - 0.5) * 6,
  };
}

export default function ExhibitPage() {
  const { id }   = useParams();
  const router   = useRouter();

  const [exhibit,     setExhibit]     = useState(null);
  const [items,       setItems]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [view,        setView]        = useState('pinboard'); // 'pinboard' | 'grid'
  const [selected,    setSelected]    = useState(null);
  const [editingNote, setEditingNote] = useState(null);  // itemId being edited
  const [noteText,    setNoteText]    = useState('');
  const [editing,     setEditing]     = useState(false); // editing exhibit title
  const [titleVal,    setTitleVal]    = useState('');
  const pinsRef = useRef([]);

  useEffect(() => {
    fetch(`/api/exhibits/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) { router.push('/exhibits'); return; }
        setExhibit(d.exhibit);
        setItems(d.items);
        setTitleVal(d.exhibit.title);
        // Generate stable pins for this set of items
        pinsRef.current = d.items.map((_, i) => randomPin(i, d.items.length));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  async function removeItem(itemId) {
    await fetch(`/api/exhibits/${id}/items/${itemId}`, { method: 'DELETE' });
    setItems(prev => prev.filter(it => it.id !== itemId));
    if (selected?.id === itemId) setSelected(null);
  }

  async function saveNote(itemId) {
    await fetch(`/api/exhibits/${id}/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note: noteText }),
    });
    setItems(prev => prev.map(it => it.id === itemId ? { ...it, note: noteText } : it));
    if (selected?.id === itemId) setSelected(prev => ({ ...prev, note: noteText }));
    setEditingNote(null);
  }

  async function saveTitle() {
    await fetch(`/api/exhibits/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: titleVal }),
    });
    setExhibit(prev => ({ ...prev, title: titleVal }));
    setEditing(false);
  }

  async function togglePublic() {
    const newVal = !exhibit.isPublic;
    await fetch(`/api/exhibits/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isPublic: newVal }),
    });
    setExhibit(prev => ({ ...prev, isPublic: newVal }));
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>Loading</p>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Header ── */}
      <div style={{ padding: '36px 48px 24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <button
            onClick={() => router.push('/exhibits')}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--fg-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 16, display: 'block' }}
          >
            ← Exhibits
          </button>

          {/* Editable title */}
          {editing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                value={titleVal}
                onChange={e => setTitleVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditing(false); }}
                autoFocus
                style={{ fontFamily: 'var(--font-sans)', fontSize: 28, fontWeight: 300, letterSpacing: '-0.02em', color: 'var(--fg)', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-md)', outline: 'none', width: 320 }}
              />
              <button onClick={saveTitle} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--fg-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>Save</button>
            </div>
          ) : (
            <h1
              onClick={() => setEditing(true)}
              title="Click to edit"
              style={{ fontFamily: 'var(--font-sans)', fontSize: 28, fontWeight: 300, letterSpacing: '-0.02em', color: 'var(--fg)', cursor: 'text', lineHeight: 1 }}
            >
              {exhibit.title}
            </h1>
          )}

          <div style={{ marginTop: 8, display: 'flex', gap: 16, alignItems: 'center' }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.04em', color: 'var(--fg-faint)' }}>
              {items.length} {items.length === 1 ? 'piece' : 'pieces'}
            </span>
            <button
              onClick={togglePublic}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--fg-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {exhibit.isPublic ? '● Public' : '○ Private'}
            </button>
          </div>
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', gap: 20 }}>
          <ViewToggle label="Pinboard" active={view === 'pinboard'} onClick={() => setView('pinboard')} />
          <ViewToggle label="Grid" active={view === 'grid'} onClick={() => setView('grid')} />
        </div>
      </div>

      {/* ── Empty state ── */}
      {items.length === 0 && (
        <div style={{ padding: '80px 48px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: 15, fontWeight: 300, color: 'var(--fg-muted)', marginBottom: 8 }}>This exhibit is empty</p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.14em', color: 'var(--fg-faint)' }}>
            Add pieces by clicking "Save to Exhibit" in the gallery
          </p>
        </div>
      )}

      {/* ── Pinboard view ── */}
      {view === 'pinboard' && items.length > 0 && (
        <div style={{ position: 'relative', width: '100%', minHeight: '80vh', padding: '0 48px 80px' }}>
          {items.map((item, i) => {
            const pin = pinsRef.current[i] || randomPin(i, items.length);
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => setSelected(item)}
                style={{
                  position: 'absolute',
                  left: `${pin.left}%`,
                  top: `${pin.top}%`,
                  width: `${pin.width}%`,
                  transform: `rotate(${pin.rotate}deg)`,
                  cursor: 'pointer',
                  transformOrigin: 'center',
                  transition: 'transform 0.2s ease',
                  zIndex: 1,
                }}
                whileHover={{ scale: 1.04, zIndex: 10, rotate: 0 }}
              >
                <img
                  src={imgUrl(item.imageUrl, 600)}
                  alt={item.title}
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
                <div style={{ marginTop: 5 }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 9, fontWeight: 300, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title}
                  </div>
                  {item.note && (
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--fg-faint)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.note}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ── Grid view ── */}
      {view === 'grid' && items.length > 0 && (
        <div style={{ padding: '0 48px 80px', columns: 'auto 200px', columnGap: '24px' }}>
          {items.map((item, i) => (
            <div
              key={item.id}
              onClick={() => setSelected(item)}
              style={{ breakInside: 'avoid', marginBottom: '28px', cursor: 'pointer', animation: `card-in 0.4s ease ${i * 0.02}s both` }}
            >
              <img src={imgUrl(item.imageUrl, 400)} alt={item.title} style={{ width: '100%', height: 'auto', display: 'block' }} />
              <div style={{ marginTop: 7 }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 300, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                {item.note && (
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fg-faint)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.note}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Item detail modal ── */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => { setSelected(null); setEditingNote(null); }}
              style={{ position: 'fixed', inset: 0, background: 'rgba(10,9,8,0.92)', zIndex: 50 }}
            />
            <motion.div
              key="modal"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              style={{ position: 'fixed', inset: 0, zIndex: 51, display: 'flex', pointerEvents: 'none' }}
            >
              {/* Image */}
              <div
                onClick={() => setSelected(null)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', pointerEvents: 'all', cursor: 'default' }}
              >
                <img
                  src={imgUrl(selected.imageUrl, 1200)}
                  alt={selected.title}
                  onClick={e => e.stopPropagation()}
                  style={{ maxHeight: '88vh', maxWidth: '100%', objectFit: 'contain' }}
                />
              </div>

              {/* Sidebar */}
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  width: '18rem', flexShrink: 0,
                  background: 'rgba(8,7,6,0.3)', backdropFilter: 'blur(24px)',
                  borderLeft: '1px solid rgba(247,246,241,0.07)',
                  display: 'flex', flexDirection: 'column', overflowY: 'auto',
                  padding: '2rem', pointerEvents: 'all',
                }}
              >
                <button
                  onClick={() => setSelected(null)}
                  style={{ alignSelf: 'flex-end', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--dark-faint)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1.5rem' }}
                >
                  ✕ Close
                </button>

                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--dark-faint)', marginBottom: 6 }}>
                  {selected.source}
                </p>
                <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '1rem', fontWeight: 300, lineHeight: 1.35, color: 'var(--dark-fg)', marginBottom: '1.5rem' }}>
                  {selected.title}
                </h2>

                {/* Metadata */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginBottom: '1.5rem' }}>
                  {[['Artist', selected.author], ['Year', selected.year], ['Medium', selected.medium]]
                    .filter(([, v]) => v?.toString().trim())
                    .map(([l, v]) => (
                      <div key={l}>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--dark-faint)', marginBottom: 2 }}>{l}</p>
                        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 300, color: 'var(--dark-muted)', lineHeight: 1.45 }}>{v}</p>
                      </div>
                    ))}
                </div>

                {/* Personal note */}
                <div style={{ borderTop: '1px solid rgba(247,246,241,0.07)', paddingTop: '1.25rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--dark-faint)' }}>Your Note</p>
                    {editingNote !== selected.id && (
                      <button
                        onClick={() => { setEditingNote(selected.id); setNoteText(selected.note || ''); }}
                        style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--dark-faint)', background: 'none', border: 'none', cursor: 'pointer' }}
                      >
                        {selected.note ? 'Edit' : '+ Add'}
                      </button>
                    )}
                  </div>

                  {editingNote === selected.id ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <textarea
                        value={noteText}
                        onChange={e => setNoteText(e.target.value)}
                        autoFocus
                        rows={4}
                        style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 300, color: 'var(--dark-muted)', background: 'rgba(247,246,241,0.04)', border: '1px solid rgba(247,246,241,0.1)', padding: '8px 10px', outline: 'none', resize: 'vertical', lineHeight: 1.5 }}
                      />
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={() => saveNote(selected.id)} style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--dark-fg)', background: 'none', border: '1px solid rgba(247,246,241,0.2)', padding: '5px 12px', cursor: 'pointer' }}>Save</button>
                        <button onClick={() => setEditingNote(null)} style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--dark-faint)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 300, color: selected.note ? 'var(--dark-muted)' : 'var(--dark-faint)', lineHeight: 1.55, fontStyle: selected.note ? 'normal' : 'italic' }}>
                      {selected.note || 'No note yet'}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingTop: '1.5rem', borderTop: '1px solid rgba(247,246,241,0.07)' }}>
                  {selected.link && (
                    <a href={selected.link} target="_blank" rel="noopener noreferrer"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--dark-faint)', textDecoration: 'none' }}>
                      View at source →
                    </a>
                  )}
                  <button
                    onClick={() => removeItem(selected.id)}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#c0392b', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
                  >
                    Remove from exhibit
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes card-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function ViewToggle({ label, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase',
      color: active ? 'var(--fg)' : 'var(--fg-faint)', fontWeight: active ? 500 : 400,
      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
    }}>
      {label}
    </button>
  );
}