// src/app/exhibits/page.js
'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { selectFormation } from '@/lib/formations';

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

// ── Formation slot ────────────────────────────────────────────────────────────
// Images are NEVER given an explicit height — the browser resolves aspect ratio
// naturally. maxHeight is the only vertical constraint, derived from viewport.
// This guarantees zero overflow regardless of image dimensions.

function FormationSlot({ url, slotStyle, index }) {
  const rowCount = slotStyle._rowCount || 1;
  // Allocate viewport height per row, minus gap and title block overhead
  const maxH = `calc((100vh - 44px - 120px - ${(rowCount - 1) * 20}px) / ${rowCount})`;

  return (
    <motion.div
      style={{
        gridArea:     slotStyle.area,
        alignSelf:    slotStyle.alignSelf    || 'center',
        justifySelf:  slotStyle.justifySelf  || 'center',
        width:        slotStyle.width        || '100%',
        marginTop:    slotStyle.marginTop    || 0,
        marginBottom: slotStyle.marginBottom || 0,
        minWidth:     0,
        minHeight:    0,
        display:      'flex',
        justifyContent: 'center',
        overflow:     'hidden',
      }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: [0.16, 1, 0.3, 1] }}
    >
      <img
        src={hqUrl(url)}
        alt=""
        style={{
          width:     'auto',
          height:    'auto',
          maxWidth:  '100%',
          maxHeight: maxH,
          objectFit: 'contain',
          display:   'block',
        }}
        draggable={false}
        onError={e => { e.currentTarget.style.opacity = '0'; }}
      />
    </motion.div>
  );
}

// ── Formation grid ────────────────────────────────────────────────────────────
// Outer wrapper is strictly height-bounded by the panel.
// Grid rows use minmax(0, 1fr) so they NEVER push outside their allocation.

function FormationGrid({ images }) {
  if (!images || images.length === 0) return null;

  const imageData = images.map(img => ({
    url:    img.url,
    width:  img.width  || 3,
    height: img.height || 4,
  }));

  const result = selectFormation(imageData);
  if (!result) return null;

  const { formation, slotMap } = result;
  const { grid, container, slots } = formation;

  // Count how many distinct grid rows the template uses
  const rowCount = (grid.areas || '"A"').trim().split('"').filter((s, i) => i % 2 === 1).length || 1;

  // Force all row tracks to be equal fractional, bounded by container
  const safeRows = Array(rowCount).fill('minmax(0, 1fr)').join(' ');

  return (
    <div style={{
      display:             'grid',
      gridTemplateColumns: grid.cols,
      gridTemplateRows:    safeRows,
      gridTemplateAreas:   grid.areas,
      gap:                 grid.gap,
      width:               container.maxWidth || '88%',
      maxWidth:            container.maxWidth || '88%',
      height:              '100%',
      margin:              container.margin   || '0 auto',
      alignContent:        'center',
      boxSizing:           'border-box',
      overflow:            'hidden',
    }}>
      {slots.map((slotStyle, i) => {
        const label    = ['A','B','C','D','E','F'][i];
        const imgEntry = slotMap[label];
        if (!imgEntry) return null;
        return (
          <FormationSlot
            key={`${imgEntry.url}-${i}`}
            url={imgEntry.url}
            slotStyle={{ ...slotStyle, _rowCount: rowCount }}
            index={i}
          />
        );
      })}
    </div>
  );
}

// ── Preview panel ─────────────────────────────────────────────────────────────
function PreviewPanel({ exhibit }) {
  const rawImages = exhibit?.previewImages?.length > 0
    ? exhibit.previewImages
    : exhibit?.coverImageUrl ? [exhibit.coverImageUrl] : [];

  const images = rawImages.map(img =>
    typeof img === 'string' ? { url: img, width: null, height: null } : img
  );

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <AnimatePresence mode="wait">
        {exhibit ? (
          <motion.div
            key={exhibit.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '40px', overflow: 'hidden' }}
          >
            {/* ── Title block ── */}
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.04 }}
              style={{
                textAlign:     'right',
                flexShrink:    0,
                borderBottom:  '1px solid var(--border)',
                paddingBottom: '16px',
                marginBottom:  '28px',
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
                  fontFamily: 'var(--font-display)',
                  fontSize:   '0.8rem',
                  fontWeight: 400,
                  fontStyle:  'italic',
                  color:      'var(--fg-muted)',
                  marginTop:  7,
                  lineHeight: 1.6,
                }}>
                  {exhibit.description}
                </div>
              )}
            </motion.div>

            {/* ── Formation spread — fills remaining height ── */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {images.length > 0
                ? <FormationGrid images={images} />
                : <p style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 300, color: 'var(--fg-faint)', margin: 0 }}>Empty exhibit</p>
              }
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

  const onEnter = useCallback((ex) => { setHoveredId(ex.id); setHoveredExhibit(ex); }, []);
  const onLeave = useCallback(() => { setHoveredId(null); }, []);

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