// src/app/exhibits/page.js
'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

function hqUrl(url) {
  if (!url) return '';
  return `/api/img?url=${encodeURIComponent(url)}&size=1200`;
}

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Seeded PRNG (mulberry32). */
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fisherYates(arr, rng) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Pick up to 6 random pieces from the full pool (Fisher–Yates shuffle, then slice). */
function pickRandomSix(pool, seedStr) {
  if (!pool?.length) return [];
  const rng = mulberry32(hashSeed(seedStr));
  const shuffled = fisherYates([...pool], rng);
  return shuffled.slice(0, Math.min(6, shuffled.length));
}

/**
 * Irregular 2×3 partition with jittered insets — not a uniform grid visually.
 * Regions are disjoint; images are scaled inside with object-fit: contain (no crop).
 */
function buildOrganicBoxes(seed, count) {
  const rng = mulberry32(seed ^ 0x9e3779b9);
  const x1 = 0.18 + rng() * 0.16;
  let x2 = x1 + 0.12 + rng() * 0.18;
  x2 = Math.min(x2, 0.9);
  const x1c = Math.min(x1, x2 - 0.14);
  const y1 = 0.36 + rng() * 0.2;

  const regions = [
    { l: 0, t: 0, w: x1c, h: y1 },
    { l: x1c, t: 0, w: x2 - x1c, h: y1 },
    { l: x2, t: 0, w: 1 - x2, h: y1 },
    { l: 0, t: y1, w: x1c, h: 1 - y1 },
    { l: x1c, t: y1, w: x2 - x1c, h: 1 - y1 },
    { l: x2, t: y1, w: 1 - x2, h: 1 - y1 },
  ];

  const regionPick = fisherYates([0, 1, 2, 3, 4, 5], rng).slice(0, count);
  const boxes = [];
  for (let i = 0; i < count; i++) {
    const r = regions[regionPick[i]];
    const ix = rng() * 0.08 + 0.01;
    const iy = rng() * 0.08 + 0.01;
    const ox = rng() * 0.08 + 0.01;
    const oy = rng() * 0.08 + 0.01;
    const scale = 0.65 + rng() * 0.35;
    boxes.push({
      left: (r.l + ix * r.w) * 100,
      top: (r.t + iy * r.h) * 100,
      width: (r.w * (1 - ix - ox)) * 100,
      height: (r.h * (1 - iy - oy)) * 100,
      scale,
    });
  }
  return boxes;
}

// ── Create modal ──────────────────────────────────────────────────────────────
function CreateModal({ onSubmit, onCancel, creating }) {
  const [title, setTitle] = useState('');
  const [desc,  setDesc]  = useState('');
  return (
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(255,255,255,0.94)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#ffffff', border: 'none', padding: '52px 56px', width: 440, boxShadow: 'none', display: 'flex', flexDirection: 'column', gap: 18 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.4em', textTransform: 'uppercase', color: '#888', margin: 0, marginBottom: 24 }}>New Exhibit</p>
        <input className="create-modal-title-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" autoFocus
          onKeyDown={e => { if (e.key === 'Enter' && title.trim()) onSubmit(title, desc); if (e.key === 'Escape') onCancel(); }}
          style={{ fontFamily: 'var(--font-sans)', fontSize: 28, fontWeight: 700, letterSpacing: '-0.02em', color: '#0d0d0d', background: 'transparent', border: 'none', outline: 'none', width: '100%', padding: '4px 0' }} />
        <input className="create-modal-desc-input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description (optional)"
          onKeyDown={e => { if (e.key === 'Enter' && title.trim()) onSubmit(title, desc); if (e.key === 'Escape') onCancel(); }}
          style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 400, fontStyle: 'normal', color: '#555', background: 'transparent', border: 'none', outline: 'none', width: '100%', padding: '4px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
          <button onClick={() => title.trim() && onSubmit(title, desc)} disabled={creating || !title.trim()}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 8,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: creating || !title.trim() ? '#aaa' : '#ffffff',
              background: creating || !title.trim() ? '#e5e5e5' : '#0d0d0d',
              border: 'none',
              padding: '11px 28px',
              cursor: creating || !title.trim() ? 'default' : 'pointer',
              transition: 'all 0.15s',
            }}>
            {creating ? 'Creating…' : 'Create'}
          </button>
          <button onClick={onCancel} style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#aaa', background: 'none', border: 'none', cursor: 'pointer' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Organic preview scatter (absolute layout, no CSS grid formation) ────────

function PreviewScatter({ images, layoutSeed }) {
  const boxes = useMemo(
    () => buildOrganicBoxes(layoutSeed, images.length),
    [layoutSeed, images.length],
  );

  if (!images.length) return null;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 0 }}>
      {images.map((img, index) => (
        <motion.div
          key={`${img.url}-${index}`}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: index * 0.06, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'absolute',
            left:     `${boxes[index].left}%`,
            top:      `${boxes[index].top}%`,
            width:    `${boxes[index].width}%`,
            height:   `${boxes[index].height}%`,
            display:  'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'visible',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `scale(${boxes[index].scale})`,
              transformOrigin: 'center center',
            }}
          >
            <img
              src={hqUrl(img.url)}
              alt=""
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                display: 'block',
              }}
              draggable={false}
              onError={e => { e.currentTarget.style.opacity = '0'; }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ── Preview panel ─────────────────────────────────────────────────────────────
function PreviewPanel({ exhibit, hoverTick }) {
  const rawImages = exhibit?.previewImages?.length > 0
    ? exhibit.previewImages
    : exhibit?.coverImageUrl ? [exhibit.coverImageUrl] : [];

  const pool = useMemo(
    () => rawImages.map(img =>
      typeof img === 'string' ? { url: img, width: null, height: null } : img,
    ),
    [exhibit?.previewImages, exhibit?.coverImageUrl],
  );

  const pickSeed = exhibit?.id
    ? `${exhibit.id}:${hoverTick}:${pool.map(p => p.url).join('|')}`
    : '';

  const pickedImages = useMemo(
    () => (exhibit?.id ? pickRandomSix(pool, pickSeed) : []),
    [exhibit?.id, pool, pickSeed],
  );

  const layoutSeed = useMemo(
    () => hashSeed(`${pickSeed}:layout`),
    [pickSeed],
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
            style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '64px 72px 64px 64px', overflow: 'hidden', position: 'relative', minHeight: 0 }}
          >
            {/* ── Title block — top-right (chapter opener) ── */}
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.04 }}
              style={{
                position: 'absolute',
                top:      64,
                right:    72,
                left:     64,
                textAlign: 'right',
                flexShrink: 0,
                pointerEvents: 'none',
                zIndex: 1,
              }}
            >
              <div style={{
                fontFamily:    'var(--font-sans)',
                fontSize:      'clamp(2.8rem, 4.5vw, 5rem)',
                fontWeight:    700,
                letterSpacing: '-0.03em',
                lineHeight:    0.92,
                color:         '#0d0d0d',
              }}>
                {exhibit.title}
              </div>
              {exhibit.description && (
                <div style={{
                  fontFamily:    'var(--font-sans)',
                  fontSize:      11,
                  fontWeight:    400,
                  fontStyle:     'normal',
                  color:         '#888888',
                  marginTop:     12,
                  lineHeight:    1.7,
                  letterSpacing: '0.01em',
                  maxWidth:      480,
                  marginLeft:    'auto',
                }}>
                  {exhibit.description}
                </div>
              )}
            </motion.div>

            {/* ── Formation spread — fills remaining height (below title) ── */}
            <div style={{ flex: 1, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch', width: '100%', paddingTop: 'clamp(104px, 13vh, 168px)', minHeight: 0 }}>
              {pickedImages.length > 0
                ? <PreviewScatter images={pickedImages} layoutSeed={layoutSeed} />
                : <p style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 400, color: '#cccccc', margin: 0 }}>Empty exhibit</p>
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
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.35em', textTransform: 'uppercase', color: '#cccccc', fontWeight: 400, margin: 0, userSelect: 'none' }}>
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
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: '#0d0d0d' }}>Exhibits</div>
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
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 400, fontStyle: 'normal', color: '#aaaaaa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 5 }}>{ex.description}</div>
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
        .create-modal-title-input::placeholder {
          color: #d0d0d0;
        }
        .create-modal-desc-input::placeholder {
          color: #d0d0d0;
        }
      `}</style>
    </div>
  );
}