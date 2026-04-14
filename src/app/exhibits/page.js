'use client';
// src/app/exhibits/page.js
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import CreateModal from '@/components/exhibits/CreateModal';
import PreviewPanel from '@/components/exhibits/PreviewPanel';

// ── Inline exhibits list (replaces sidebar TOC) ──────────────────────────────
function ExhibitsList({ exhibits, hoveredId, setHoveredId, setHoveredExhibit, setHoverTick, router, onNew }) {
  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  }

  return (
    <div style={{
      width:      240,
      flexShrink: 0,
      height:     '100%',
      overflowY:  'auto',
      overflowX:  'hidden',
      background: 'var(--bg)',
      display:    'flex',
      flexDirection: 'column',
    }}>

      {/* Header */}
      <div style={{ padding: '24px 24px 20px', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 7, letterSpacing: '0.35em', textTransform: 'uppercase', color: 'var(--fg-faint)', marginBottom: 6 }}>
          Personal Archive
        </div>
        <div style={{ fontFamily: 'var(--font-condensed)', fontSize: 20, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', color: 'var(--fg)', lineHeight: 1 }}>
          EXHIBITS
        </div>
      </div>

      {/* Exhibit list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {exhibits.length === 0 && (
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 400, color: 'var(--fg-muted)', margin: 0 }}>No exhibits yet</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--fg-faint)', margin: 0 }}>
              Create one, then save pieces from the{' '}
              <Link href="/gallery?type=Graphic+Design" style={{ color: 'var(--fg-faint)', textDecoration: 'underline', textUnderlineOffset: 3 }}>gallery</Link>
            </p>
          </div>
        )}

        {exhibits.map((ex, i) => {
          const isHovered = hoveredId === ex.id;
          const dimmed    = !!hoveredId && !isHovered;
          return (
            <div
              key={ex.id}
              onMouseEnter={() => { setHoveredId(ex.id); setHoveredExhibit(ex); setHoverTick(t => t + 1); }}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => router.push(`/exhibits/${ex.id}`)}
              style={{
                padding:    '10px 24px',
                cursor:     'pointer',
                opacity:    dimmed ? 0.12 : 1,
                transition: 'opacity 0.1s ease, background 0.12s ease',
                background: isHovered ? 'var(--bg-hover)' : 'transparent',
                animation:  `toc-rise 0.45s cubic-bezier(0.16,1,0.3,1) ${i * 0.04}s both`,
              }}
            >
              <div style={{
                fontFamily:    'var(--font-condensed)',
                fontSize:      14,
                fontWeight:    700,
                textTransform: 'uppercase',
                letterSpacing: '0.01em',
                color:         'var(--fg)',
                overflow:      'hidden',
                textOverflow:  'ellipsis',
                whiteSpace:    'nowrap',
                marginBottom:  4,
                lineHeight:    1,
              }}>
                {ex.title}
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7.5, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>
                  {ex.itemCount} {ex.itemCount === 1 ? 'piece' : 'pieces'}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7.5, letterSpacing: '0.1em', color: 'var(--fg-faint)' }}>
                  {formatDate(ex.updatedAt || ex.createdAt)}
                </span>
              </div>
            </div>
          );
        })}

        {/* New exhibit button */}
        <button
          onClick={onNew}
          style={{
            padding:    '10px 24px',
            background: 'none',
            border:     'none',
            cursor:     'pointer',
            textAlign:  'left',
            width:      '100%',
            opacity:    hoveredId ? 0.12 : 1,
            transition: 'opacity 0.1s ease, background 0.12s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'var(--bg-hover)'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = hoveredId ? '0.12' : '1'; e.currentTarget.style.background = 'transparent'; }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>
            + New exhibit
          </span>
        </button>
      </div>

      {/* Count folio */}
      {exhibits.length > 0 && (
        <div style={{ padding: '12px 24px', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7.5, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>
            {exhibits.length} {exhibits.length === 1 ? 'exhibit' : 'exhibits'}
          </span>
        </div>
      )}
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
  const [hoverTick,      setHoverTick]      = useState(0);

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

  if (loading) return (
    <div style={{ height: 'calc(100vh - 44px)', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.4em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>Loading</p>
    </div>
  );

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 44px)', overflow: 'hidden', background: 'var(--bg)' }}>

      {/* ── Inline exhibits list ── */}
      <ExhibitsList
        exhibits={exhibits}
        hoveredId={hoveredId}
        setHoveredId={setHoveredId}
        setHoveredExhibit={setHoveredExhibit}
        setHoverTick={setHoverTick}
        router={router}
        onNew={() => setShowForm(true)}
      />

      {/* ── Preview area ── */}
      <div style={{ flex: 1, position: 'relative', height: '100%' }}>
        <PreviewPanel exhibit={hoveredId ? hoveredExhibit : null} hoverTick={hoverTick} />

        <AnimatePresence>
          {!hoveredId && exhibits.length > 0 && (
            <motion.div
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                position:       'absolute',
                inset:          0,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                pointerEvents:  'none',
              }}
            >
              <p style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      8,
                letterSpacing: '0.3em',
                textTransform: 'uppercase',
                color:         'var(--fg-faint)',
                margin:        0,
                userSelect:    'none',
              }}>
                H O V E R  A N  E X H I B I T
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Create modal ── */}
      {showForm && (
        <CreateModal
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
          creating={creating}
        />
      )}

      <style>{`
        @keyframes toc-rise {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .create-modal-title-input::placeholder { color: var(--fg-faint); }
        .create-modal-desc-input::placeholder  { color: var(--fg-faint); }
      `}</style>
    </div>
  );
}
