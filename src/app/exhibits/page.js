'use client';
// src/app/exhibits/page.js
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import CreateModal from '@/components/exhibits/CreateModal';
import PreviewPanel from '@/components/exhibits/PreviewPanel';
import { useSidebarContent } from '@/hooks/useSidebarContent';

// ── Sidebar TOC ──────────────────────────────────────────────────────────────
function ExhibitsTOC({ exhibits, hoveredId, setHoveredId, setHoveredExhibit, setHoverTick, router, onNew }) {
  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  }

  return (
    <div style={{ padding: '16px 0 24px' }}>
      {/* Header */}
      <div style={{ padding: '0 24px 16px', borderBottom: '1px solid var(--border)', marginBottom: 4 }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.4em', textTransform: 'uppercase', color: 'var(--fg-faint)', marginBottom: 6 }}>
          Personal Archive
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 300, letterSpacing: '-0.01em', color: 'var(--fg)', fontStyle: 'italic' }}>
          Exhibits
        </div>
      </div>

      {/* Exhibit list */}
      <div style={{ overflowY: 'auto' }}>
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
                display:    'grid',
                gridTemplateColumns: '2rem 1fr',
                gap:        '0 12px',
                alignItems: 'baseline',
                padding:    '10px 24px',
                cursor:     'pointer',
                opacity:    dimmed ? 0.15 : 1,
                transition: 'opacity 0.1s ease',
                animation:  `toc-rise 0.45s cubic-bezier(0.16,1,0.3,1) ${i * 0.04}s both`,
              }}
            >
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 300, color: 'var(--fg-faint)', lineHeight: 1, userSelect: 'none', paddingTop: 2 }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 400, letterSpacing: '0.005em', color: isHovered ? 'var(--fg)' : 'var(--fg-muted)', transition: 'color 0.15s', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3 }}>
                  {ex.title}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7.5, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>
                    {ex.itemCount} {ex.itemCount === 1 ? 'piece' : 'pieces'}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>
                    {formatDate(ex.updatedAt || ex.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {/* New exhibit button */}
        <button
          onClick={onNew}
          style={{
            display:    'grid',
            gridTemplateColumns: '2rem 1fr',
            gap:        '0 12px',
            alignItems: 'baseline',
            padding:    '10px 24px',
            background: 'none',
            border:     'none',
            cursor:     'pointer',
            textAlign:  'left',
            width:      '100%',
            opacity:    hoveredId ? 0.15 : 1,
            transition: 'opacity 0.1s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = hoveredId ? '0.15' : '1'; }}
        >
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, fontWeight: 300, color: 'var(--fg-faint)', lineHeight: 1, paddingTop: 2 }}>
            {String(exhibits.length + 1).padStart(2, '0')}
          </span>
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 400, color: 'var(--fg-faint)', letterSpacing: '0.005em', transition: 'color 0.15s' }}>
            + New Exhibit
          </span>
        </button>
      </div>

      {/* Count folio */}
      {exhibits.length > 0 && (
        <div style={{ padding: '16px 24px 0', borderTop: '1px solid var(--border)', marginTop: 8 }}>
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

  // Sidebar content — memoised
  const sidebarContent = useMemo(() => (
    <ExhibitsTOC
      exhibits={exhibits}
      hoveredId={hoveredId}
      setHoveredId={setHoveredId}
      setHoveredExhibit={setHoveredExhibit}
      setHoverTick={setHoverTick}
      router={router}
      onNew={() => setShowForm(true)}
    />
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [exhibits, hoveredId]);

  useSidebarContent(sidebarContent);

  if (loading) return (
    <div style={{ height: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.4em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>Loading</p>
    </div>
  );

  return (
    <div style={{ height: '100vh', overflow: 'hidden', background: 'var(--bg)', position: 'relative' }}>

      {/* ── Editorial spread — full viewport ── */}
      <PreviewPanel exhibit={hoveredId ? hoveredExhibit : null} hoverTick={hoverTick} />

      {/* ── Empty state prompt when nothing hovered ── */}
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
              fontSize:      9,
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              color:         'var(--fg-faint)',
              margin:        0,
              userSelect:    'none',
            }}>
              Hover an exhibit
            </p>
          </motion.div>
        )}
      </AnimatePresence>

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
