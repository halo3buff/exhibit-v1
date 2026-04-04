// src/app/exhibits/page.js
'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

function hqUrl(url) {
  if (!url) return '';
  return `/api/img?url=${encodeURIComponent(url)}&size=1200`;
}

// ── Create modal ──────────────────────────────────────────────────────────────
function CreateModal({ onSubmit, onCancel, creating }) {
  const [title, setTitle] = useState('');
  const [desc,  setDesc]  = useState('');
  return (
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(240,237,232,0.88)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg)', border: '1px solid var(--border-md)', padding: '40px 44px', width: 400, boxShadow: '0 12px 56px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--fg-faint)', margin: 0 }}>New Exhibit</p>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" autoFocus
          onKeyDown={e => { if (e.key === 'Enter' && title.trim()) onSubmit(title, desc); if (e.key === 'Escape') onCancel(); }}
          style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 300, letterSpacing: '-0.02em', color: 'var(--fg)', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border-md)', outline: 'none', width: '100%', padding: '4px 0' }} />
        <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)"
          onKeyDown={e => { if (e.key === 'Enter' && title.trim()) onSubmit(title, desc); if (e.key === 'Escape') onCancel(); }}
          style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontStyle: 'italic', fontWeight: 300, color: 'var(--fg-muted)', background: 'transparent', border: 'none', borderBottom: '1px solid var(--border)', outline: 'none', width: '100%', padding: '4px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
          <button onClick={() => title.trim() && onSubmit(title, desc)} disabled={creating || !title.trim()}
            style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--fg)', background: 'none', border: '1px solid var(--border-md)', padding: '9px 24px', cursor: creating || !title.trim() ? 'default' : 'pointer', opacity: creating || !title.trim() ? 0.35 : 1, transition: 'all 0.15s' }}>
            {creating ? 'Creating…' : 'Create'}
          </button>
          <button onClick={onCancel} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-faint)', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Preview panel ─────────────────────────────────────────────────────────────
function PreviewPanel({ exhibit }) {
  const images = exhibit?.previewImages?.length > 0
    ? exhibit.previewImages
    : exhibit?.coverImageUrl ? [exhibit.coverImageUrl] : [];

  return (
    <div style={{ position: 'absolute', inset: 0, padding: '40px', display: 'flex', flexDirection: 'column' }}>
      <AnimatePresence mode="wait">
        {exhibit ? (
          <motion.div
            key={exhibit.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '32px' }}
          >
            {/* ── Title block: Keeps its clean editorial position ── */}
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.04 }}
              style={{
                textAlign:     'right',
                flexShrink:    0,
                borderBottom: '1px solid var(--border)',
                paddingBottom: '16px'
              }}
            >
              <div style={{
                fontFamily:    'var(--font-display)',
                fontSize:      'clamp(1.4rem, 2vw, 2rem)',
                fontWeight:    700,
                letterSpacing: '0.025em',
                lineHeight:    1.05,
                color:         'var(--fg)',
              }}>
                {exhibit.title}
              </div>
              {exhibit.description && (
                <div style={{
                  fontFamily:  'var(--font-display)',
                  fontSize:    '0.8rem',
                  fontWeight:  400,
                  fontStyle:   'italic',
                  color:       'var(--fg-muted)',
                  marginTop:   7,
                  lineHeight:  1.6,
                }}>
                  {exhibit.description}
                </div>
              )}
            </motion.div>

            {/* ── Image spread: Viewport-aware containment ── */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexWrap: 'wrap',
              gap: '28px',
              alignContent: 'center',
              justifyContent: 'center',
              overflow: 'hidden' // Bulletproof screen containment
            }}>
              {images.map((url, i) => {
                // Dynamically adjust size based on the total number of images to prevent overflow
                const maxDim = images.length <= 2 ? '42vh' : images.length <= 4 ? '35vh' : '25vh';
                
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: i * 0.06 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      maxHeight: maxDim, // Caps height relative to viewport
                      maxWidth: images.length === 1 ? '100%' : '45%',
                    }}
                  >
                    <img
                      src={hqUrl(url)}
                      alt=""
                      style={{
                        maxHeight: '100%',
                        maxWidth: '100%',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain', // Preserves natural dimensions without stretching
                        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                        border: '1px solid var(--border-md)'
                      }}
                      draggable={false}
                      onError={e => { e.target.parentElement.style.display = 'none'; }}
                    />
                  </motion.div>
                );
              })}

              {images.length === 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <p style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 300, color: 'var(--fg-faint)', margin: 0 }}>Empty exhibit</p>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}
          >
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1rem, 1.4vw, 1.3rem)', fontWeight: 300, color: 'var(--fg-faint)', margin: 0, letterSpacing: '-0.02em', userSelect: 'none' }}>
              Hover an exhibit
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ExhibitsPage() {
  const router = useRouter();

  const [exhibits,       setExhibits]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [creating,       setCreating]       = useState(false);
  const [showForm,       setShowForm]       = useState(false);
  const [hoveredId,      setHoveredId]      = useState(null);
  const [hoveredExhibit, setHoveredExhibit] = useState(null);

  useEffect(() => {
    fetch('/api/exhibits')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.exhibits) setExhibits(d.exhibits); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function handleCreate(title, desc) {
    setCreating(true);
    const res  = await fetch('/api/exhibits', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title || 'Untitled Exhibit', description: desc }),
    });
    const data = await res.json();
    setCreating(false);
    if (res.ok) router.push(`/exhibits/${data.exhibit.id}`);
  }

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  }

  const onEnter = useCallback((ex) => {
    setHoveredId(ex.id);
    setHoveredExhibit(ex);
  }, []);

  const onLeave = useCallback(() => {
    setHoveredId(null);
  }, []);

  if (loading) return (
    <div style={{ height: 'calc(100vh - 44px)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>Loading</p>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', height: 'calc(100vh - 44px)', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── LEFT 280px ── */}
      <div style={{ display: 'flex', flexDirection: 'column', padding: '52px 32px 48px 48px', height: 'calc(100vh - 44px)', overflow: 'hidden', borderRight: '1px solid var(--border)' }}>

        <div style={{ marginBottom: 32, flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--fg-faint)', marginBottom: 6 }}>Personal Archive</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, letterSpacing: '0.26em', textTransform: 'uppercase', color: 'var(--fg)' }}>Exhibits</div>
        </div>

        <div style={{ height: 1, background: 'var(--border)', flexShrink: 0 }} />

        {exhibits.length === 0 && (
          <div style={{ paddingTop: 32, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 300, color: 'var(--fg-muted)', margin: 0 }}>No exhibits yet</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', color: 'var(--fg-faint)', margin: 0 }}>
              Create one below, then save pieces from the{' '}
              <Link href="/gallery?type=Graphic+Design" style={{ color: 'var(--fg-muted)', textDecoration: 'none', borderBottom: '1px solid var(--border-md)', paddingBottom: 1 }}>gallery</Link>
            </p>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {exhibits.map((ex, i) => {
            const isHovered = hoveredId === ex.id;
            const dimmed    = !!hoveredId && !isHovered;
            return (
              <div
                key={ex.id}
                onMouseEnter={() => onEnter(ex)}
                onMouseLeave={onLeave}
                onClick={() => router.push(`/exhibits/${ex.id}`)}
                style={{ display: 'grid', gridTemplateColumns: '2.6rem 1fr auto', gap: '0 14px', alignItems: 'baseline', padding: '13px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer', opacity: dimmed ? 0.22 : 1, transition: 'opacity 0.12s ease', animation: `toc-rise 0.45s cubic-bezier(0.16,1,0.3,1) ${i * 0.04}s both` }}
              >
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.1rem, 1.4vw, 1.5rem)', fontWeight: 300, color: isHovered ? 'var(--fg-muted)' : 'var(--fg-faint)', lineHeight: 1, letterSpacing: '-0.03em', transition: 'color 0.2s', userSelect: 'none', paddingTop: 2 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 400, letterSpacing: '0.01em', color: isHovered ? 'var(--fg)' : 'var(--fg-muted)', transition: 'color 0.15s', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>{ex.title}</div>
                  {ex.description && (
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontStyle: 'italic', fontWeight: 300, color: 'var(--fg-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>{ex.description}</div>
                  )}
                  <div style={{ display: 'flex', gap: 12 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em', color: 'var(--fg-faint)' }}>{ex.itemCount} {ex.itemCount === 1 ? 'piece' : 'pieces'}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.06em', color: 'var(--fg-faint)', opacity: 0.7 }}>{formatDate(ex.updatedAt || ex.createdAt)}</span>
                  </div>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: isHovered ? 'var(--fg-muted)' : 'rgba(0,0,0,0)', transition: 'color 0.15s', userSelect: 'none' }}>→</span>
              </div>
            );
          })}

          <button
            onClick={() => setShowForm(true)}
            style={{ display: 'grid', gridTemplateColumns: '2.6rem 1fr', gap: '0 14px', alignItems: 'baseline', padding: '13px 0', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left', width: '100%', opacity: hoveredId ? 0.22 : 1, transition: 'opacity 0.12s ease' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.querySelector('.new-label').style.color = 'var(--fg-muted)'; e.currentTarget.querySelector('.new-num').style.color = 'var(--fg-faint)'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = hoveredId ? '0.22' : '1'; e.currentTarget.querySelector('.new-label').style.color = 'var(--fg-faint)'; e.currentTarget.querySelector('.new-num').style.color = 'var(--border-md)'; }}
          >
            <span className="new-num" style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.1rem, 1.4vw, 1.5rem)', fontWeight: 300, color: 'var(--border-md)', lineHeight: 1, letterSpacing: '-0.03em', transition: 'color 0.2s', paddingTop: 2 }}>
              {String(exhibits.length + 1).padStart(2, '0')}
            </span>
            <span className="new-label" style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 400, color: 'var(--fg-faint)', letterSpacing: '0.01em', transition: 'color 0.15s' }}>
              + New Exhibit
            </span>
          </button>
        </div>

        {exhibits.length > 0 && (
          <div style={{ paddingTop: 16, flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>
              {exhibits.length} {exhibits.length === 1 ? 'exhibit' : 'exhibits'}
            </span>
          </div>
        )}
      </div>

      {/* ── RIGHT: editorial spread ── */}
      <div style={{ position: 'relative', height: 'calc(100vh - 44px)', overflow: 'hidden' }}>
        <PreviewPanel exhibit={hoveredId ? hoveredExhibit : null} />
      </div>

      {showForm && <CreateModal onSubmit={handleCreate} onCancel={() => setShowForm(false)} creating={creating} />}

      <style>{`
        @keyframes toc-rise {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}