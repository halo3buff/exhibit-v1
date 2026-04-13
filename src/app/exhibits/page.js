// src/app/exhibits/page.js
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CreateModal from '@/components/exhibits/CreateModal';
import PreviewPanel from '@/components/exhibits/PreviewPanel';

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

  function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  }

  const onEnter = useCallback((ex) => {
    setHoveredId(ex.id);
    setHoveredExhibit(ex);
    setHoverTick(t => t + 1);
  }, []);
  const onLeave = useCallback(() => { setHoveredId(null); }, []);

  if (loading) return (
    <div style={{ height: 'calc(100vh - 44px)', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.4em', textTransform: 'uppercase', color: '#cccccc' }}>Loading</p>
    </div>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', height: 'calc(100vh - 44px)', overflow: 'hidden', background: '#ffffff' }}>

      {/* ── LEFT 300px ── */}
      <div style={{ display: 'flex', flexDirection: 'column', padding: '56px 40px 48px 56px', height: 'calc(100vh - 44px)', overflow: 'hidden', background: '#ffffff' }}>

        <div style={{ marginBottom: 48, flexShrink: 0 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.4em', textTransform: 'uppercase', color: '#888888', marginBottom: 10 }}>Personal Archive</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 400, letterSpacing: '-0.02em', color: '#0d0d0d' }}>Exhibits</div>
        </div>

        {exhibits.length === 0 && (
          <div style={{ paddingTop: 32, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 400, color: '#0d0d0d', margin: 0 }}>No exhibits yet</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888888', margin: 0 }}>
              Create one below, then save pieces from the{' '}
              <Link href="/gallery?type=Graphic+Design" style={{ color: '#888888', textDecoration: 'underline', textUnderlineOffset: 3 }}>gallery</Link>
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
                style={{ display: 'grid', gridTemplateColumns: '2.2rem 1fr 16px', gap: '0 16px', alignItems: 'baseline', padding: '14px 0', cursor: 'pointer', opacity: dimmed ? 0.15 : 1, transition: 'opacity 0.1s ease', animation: `toc-rise 0.45s cubic-bezier(0.16,1,0.3,1) ${i * 0.04}s both` }}
              >
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 300, color: '#d0d0d0', lineHeight: 1, letterSpacing: '0em', transition: 'color 0.2s', userSelect: 'none', paddingTop: 2 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 400, letterSpacing: '0.005em', color: isHovered ? '#0d0d0d' : '#444444', transition: 'color 0.15s', overflow: isHovered ? 'visible' : 'hidden', textOverflow: isHovered ? 'clip' : 'ellipsis', whiteSpace: isHovered ? 'normal' : 'nowrap', marginBottom: 4 }}>{ex.title}</div>
                  {ex.description && (
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 400, color: '#aaaaaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 5 }}>{ex.description}</div>
                  )}
                  <div style={{ display: 'flex', gap: 16 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#bbbbbb' }}>{ex.itemCount} {ex.itemCount === 1 ? 'piece' : 'pieces'}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#bbbbbb' }}>{formatDate(ex.updatedAt || ex.createdAt)}</span>
                  </div>
                </div>
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', opacity: isHovered ? 1 : 0, transition: 'opacity 0.1s', userSelect: 'none' }}>
                  <svg width="14" height="8" viewBox="0 0 14 8" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M0 4H12M9 1L12 4L9 7" stroke="#0d0d0d" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
              </div>
            );
          })}

          <button
            onClick={() => setShowForm(true)}
            style={{ display: 'grid', gridTemplateColumns: '2.2rem 1fr 16px', gap: '0 16px', alignItems: 'baseline', padding: '14px 0', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', opacity: hoveredId ? 0.15 : 1, transition: 'opacity 0.1s ease' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.querySelector('.new-label').style.color = '#0d0d0d'; e.currentTarget.querySelector('.new-num').style.color = '#e0e0e0'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = hoveredId ? '0.15' : '1'; e.currentTarget.querySelector('.new-label').style.color = '#bbbbbb'; e.currentTarget.querySelector('.new-num').style.color = '#e0e0e0'; }}
          >
            <span className="new-num" style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 300, color: '#e0e0e0', lineHeight: 1, letterSpacing: '0em', transition: 'color 0.2s', paddingTop: 2 }}>
              {String(exhibits.length + 1).padStart(2, '0')}
            </span>
            <span className="new-label" style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 400, color: '#bbbbbb', letterSpacing: '0.005em', transition: 'color 0.15s' }}>
              +{'\u2009'}New Exhibit
            </span>
            <span aria-hidden style={{ width: 16 }} />
          </button>
        </div>

        {exhibits.length > 0 && (
          <div style={{ paddingTop: 20, flexShrink: 0 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.25em', textTransform: 'uppercase', color: '#cccccc' }}>
              {exhibits.length} {exhibits.length === 1 ? 'exhibit' : 'exhibits'}
            </span>
          </div>
        )}
      </div>

      {/* ── RIGHT: editorial spread ── */}
      <div style={{ position: 'relative', height: 'calc(100vh - 44px)', overflow: 'hidden' }}>
        <PreviewPanel exhibit={hoveredId ? hoveredExhibit : null} hoverTick={hoverTick} />
      </div>

      {showForm && <CreateModal onSubmit={handleCreate} onCancel={() => setShowForm(false)} creating={creating} />}

      <style>{`
        @keyframes toc-rise {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .create-modal-title-input::placeholder { color: #d0d0d0; }
        .create-modal-desc-input::placeholder  { color: #d0d0d0; }
      `}</style>
    </div>
  );
}
