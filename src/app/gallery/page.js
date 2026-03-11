'use client';
import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const SUB_MAP = {
  'Graphic Design':    ['Posters & Advertising', 'Typography & Lettering', 'Identity & Branding', 'Editorial/Publication', 'Packaging'],
  'Painting':          ['Oil', 'Watercolor/Gouache', 'Tempera/Fresco'],
  'Prints & Drawings': ['Etching/Woodcut/Lithograph', 'Drawings', 'Collage'],
  'Photography':       ['Photograph'],
  'Decorative Arts':   ['Ceramics & Glass', 'Furniture', 'Textiles & Fashion', 'Metalwork & Jewelry'],
};

const PAGE_SIZE = 50;

const SOURCE_LABELS = {
  moma:         'MoMA',
  met:          'The Met',
  artic:        'Art Institute of Chicago',
  cooperhewitt: 'Cooper Hewitt',
  va:           'Victoria & Albert Museum',
  rijks:        'Rijksmuseum',
  smithsonian:  'Smithsonian',
  zurich:       'Museum für Gestaltung Zürich',
};

// ── Dynamic tooltip schema — per source ───────────────────────────
// Each entry: [displayLabel, itemField]
// Fields map to what the DB column `item.X` holds for that source.
// "collection" is a special token → replaced with the resolved SOURCE_LABELS name.
const TOOLTIP_SCHEMA = {
  met: [
    ['Artist',         'author'],
    ['Origin',         'origin'],
    ['Date',           'year'],
    ['Medium',         'medium'],
    ['Object Type',    'objectType'],
    ['Classification', 'classification'],
    ['Department',     'department'],
    ['Collection',     'collection'],
  ],
  artic: [
    ['Artist',         'author'],
    ['Origin',         'origin'],
    ['Date',           'year'],
    ['Medium',         'medium'],
    ['Artwork Type',   'objectType'],
    ['Classification', 'classification'],
    ['Department',     'department'],
    ['Collection',     'collection'],
  ],
  va: [
    ['Maker',          'author'],
    ['Origin',         'origin'],
    ['Date',           'year'],
    ['Materials',      'medium'],
    ['Object Type',    'classification'],
    ['Collection',     'collection'],
  ],
  rijks: [
    ['Artist',         'author'],
    ['Origin',         'origin'],
    ['Dating',         'year'],
    ['Technique',      'medium'],
    ['Object Type',    'objectType'],
    ['Category',       'subCategory'],
    ['Collection',     'collection'],
  ],
  smithsonian: [
    ['Creator',        'author'],
    ['Origin',         'origin'],
    ['Date',           'year'],
    ['Object Type',    'objectType'],
    ['Medium',         'medium'],
    ['Collection',     'collection'],
  ],
  cooperhewitt: [
    ['Designer',       'author'],
    ['Origin',         'origin'],
    ['Date',           'year'],
    ['Medium',         'medium'],
    ['Object Type',    'objectType'],
    ['Function',       'subCategory'],
    ['Collection',     'collection'],
  ],
  moma: [
    ['Artist',         'author'],
    ['Origin',         'origin'],
    ['Date',           'year'],
    ['Medium',         'medium'],
    ['Classification', 'classification'],
    ['Department',     'department'],
    ['Collection',     'collection'],
  ],
  default: [
    ['Artist',         'author'],
    ['Origin',         'origin'],
    ['Year',           'year'],
    ['Medium',         'medium'],
    ['Category',       'type'],
    ['Sub-category',   'subCategory'],
    ['Classification', 'classification'],
    ['Collection',     'collection'],
  ],
};

function getTooltipRows(item) {
  const source      = (item.source || '').toLowerCase();
  const schema      = TOOLTIP_SCHEMA[source] || TOOLTIP_SCHEMA.default;
  const sourceLabel = SOURCE_LABELS[source] || item.source || '';
  return schema
    .map(([label, field]) => {
      let val;
      if (field === 'collection') val = sourceLabel;
      else val = item[field];
      return [label, val];
    })
    .filter(([, v]) => v?.toString().trim() && v !== 'Unknown' && v !== 'n.d.' && v !== 'Uncategorized' && v !== '');
}

function imgUrl(url, size) {
  if (!url) return '';
  return `/api/img?url=${encodeURIComponent(url)}&size=${size}`;
}

// ── Tooltip portal ────────────────────────────────────────────────
function TooltipPortal({ tooltipRef }) {
  return (
    <div ref={tooltipRef} style={{
      position: 'fixed', top: 0, left: 0, zIndex: 9999,
      pointerEvents: 'none', width: 280, display: 'none', willChange: 'transform',
    }}>
      <div style={{ background: 'var(--dark-bg)', color: 'var(--dark-fg)', boxShadow: '0 8px 48px rgba(0,0,0,0.4)' }}>
        <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--dark-border)' }}>
          <p className="tt-title" style={{
            fontSize: 11, fontFamily: 'var(--font-sans)', fontWeight: 400,
            letterSpacing: '0.01em', lineHeight: 1.45, color: 'var(--dark-fg)', margin: 0,
            display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }} />
        </div>
        <div className="tt-fields" style={{ padding: '8px 0' }} />
        <div style={{ padding: '8px 16px', borderTop: '1px solid var(--dark-border)', display: 'flex', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--dark-faint)' }}>
            Click to expand
          </span>
          <span className="tt-source" style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 7, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--dark-faint)' }} />
        </div>
      </div>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, rgba(247,246,241,0.3) 0%, rgba(247,246,241,0.06) 100%)' }} />
    </div>
  );
}

// ── Filter pill ───────────────────────────────────────────────────
function FilterPill({ children, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      fontFamily: 'var(--font-mono)', fontSize: '0.48rem',
      fontWeight: active ? 500 : 400, letterSpacing: '0.1em', textTransform: 'uppercase',
      padding: '0.35rem 0.85rem',
      border: `1px solid ${active ? 'var(--fg)' : 'var(--border-md)'}`,
      background: active ? 'var(--fg)' : 'transparent',
      color: active ? 'var(--bg)' : 'var(--fg-muted)',
      cursor: 'pointer', transition: 'all 0.14s ease', lineHeight: 1.2,
    }}>
      {children}
    </button>
  );
}

// ── Gallery inner ─────────────────────────────────────────────────
function GalleryInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const typeParam    = searchParams.get('type') || '';
  const subParam     = searchParams.get('sub')  || '';
  const displayTitle = subParam ? `${typeParam} — ${subParam}` : typeParam || 'Gallery';

  const [items,       setItems]       = useState([]);
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(true);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(null);

  const tooltipRef  = useRef(null);
  const loadingRef  = useRef(false);
  const ttRafRef    = useRef(null);
  const tooltipSize = useRef({ w: 280, h: 200 });
  const gridRef     = useRef(null);   // masonry container
  const shadowRafRef = useRef(null);  // RAF handle for shadow system
  const cursorRef    = useRef({ x: -9999, y: -9999 }); // latest cursor pos

  const selected = selectedIdx !== null ? items[selectedIdx] : null;

  // ── Tooltip ──────────────────────────────────────────────────
  const showTooltip = useCallback((item) => {
    const el = tooltipRef.current;
    if (!el) return;
    const sourceLabel = SOURCE_LABELS[item.source?.toLowerCase()] || item.source || '';
    el.querySelector('.tt-title').textContent  = item.title || '';
    el.querySelector('.tt-source').textContent = sourceLabel;
    const rows = getTooltipRows(item);
    el.querySelector('.tt-fields').innerHTML = rows.map(([l, v]) => `
      <div style="display:grid;grid-template-columns:88px 1fr;gap:0 10px;padding:4px 16px;align-items:baseline">
        <span style="font-family:var(--font-mono);font-size:7px;letter-spacing:0.14em;text-transform:uppercase;color:var(--dark-faint);white-space:nowrap">${l}</span>
        <span style="font-family:var(--font-sans);font-size:10px;color:var(--dark-muted);line-height:1.4;word-break:break-word">${v}</span>
      </div>`).join('');
    el.style.display = 'block';
    tooltipSize.current = { w: el.offsetWidth || 280, h: el.offsetHeight || 200 };
  }, []);

  const hideTooltip = useCallback(() => {
    if (tooltipRef.current) tooltipRef.current.style.display = 'none';
  }, []);

  // ── Tooltip mouse tracker ─────────────────────────────────────
  useEffect(() => {
    const OFFSET = 18;
    const onMove = (e) => {
      // Update cursor for shadow system
      cursorRef.current = { x: e.clientX, y: e.clientY };

      if (ttRafRef.current) return;
      ttRafRef.current = requestAnimationFrame(() => {
        ttRafRef.current = null;
        const el = tooltipRef.current;
        if (!el || el.style.display === 'none') return;
        const { w, h } = tooltipSize.current;
        let x = e.clientX + OFFSET, y = e.clientY + OFFSET;
        if (x + w > window.innerWidth  - 12) x = e.clientX - w - OFFSET;
        if (y + h > window.innerHeight - 12) y = e.clientY - h - OFFSET;
        el.style.transform = `translate(${Math.max(12, x)}px, ${Math.max(12, y)}px)`;
      });
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (ttRafRef.current) cancelAnimationFrame(ttRafRef.current);
    };
  }, []);

  // ── Directional shadow system ─────────────────────────────────
  // Runs in its own RAF loop — zero React state, pure DOM mutation.
  // For each card: calc angle from card-center → cursor, offset shadow in that direction.
  useEffect(() => {
    const RADIUS    = 320;  // px — influence radius
    const MAX_BLUR  = 28;   // px max shadow blur
    const MAX_DIST  = 12;   // px max shadow offset
    const MAX_ALPHA = 0.18; // max shadow opacity

    function shadowLoop() {
      const grid = gridRef.current;
      if (grid) {
        const cx = cursorRef.current.x;
        const cy = cursorRef.current.y;
        const cards = grid.querySelectorAll('.gallery-card-inner');

        for (const card of cards) {
          const rect   = card.getBoundingClientRect();
          const cardCx = rect.left + rect.width  / 2;
          const cardCy = rect.top  + rect.height / 2;

          const dx   = cx - cardCx;
          const dy   = cy - cardCy;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist > RADIUS) {
            // Outside influence — rest shadow
            card.style.boxShadow = '0 2px 8px rgba(13,12,10,0.06)';
            card.style.transform = 'translateY(0) translateZ(0)';
          } else {
            // Proximity 0..1 (1 = cursor right on card)
            const prox = 1 - dist / RADIUS;
            const ease = prox * prox; // quadratic — subtle far, strong close

            const angle  = Math.atan2(dy, dx);
            const ox     = Math.cos(angle) * MAX_DIST * ease;
            const oy     = Math.sin(angle) * MAX_DIST * ease;
            const blur   = 8 + MAX_BLUR * ease;
            const alpha  = 0.06 + MAX_ALPHA * ease;
            const lift   = ease * 2; // translateY upward

            card.style.boxShadow = `${ox.toFixed(1)}px ${oy.toFixed(1)}px ${blur.toFixed(0)}px rgba(13,12,10,${alpha.toFixed(3)})`;
            card.style.transform = `translateY(-${lift.toFixed(1)}px) translateZ(0)`;
          }
        }
      }
      shadowRafRef.current = requestAnimationFrame(shadowLoop);
    }

    shadowRafRef.current = requestAnimationFrame(shadowLoop);
    return () => cancelAnimationFrame(shadowRafRef.current);
  }, []);

  // ── Keyboard navigation ───────────────────────────────────────
  useEffect(() => {
    if (selectedIdx === null) return;
    const onKey = (e) => {
      if (e.key === 'Escape')     setSelectedIdx(null);
      if (e.key === 'ArrowRight') setSelectedIdx(i => Math.min(i + 1, items.length - 1));
      if (e.key === 'ArrowLeft')  setSelectedIdx(i => Math.max(i - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIdx, items.length]);

  // ── Data fetching ─────────────────────────────────────────────
  useEffect(() => {
    setItems([]); setPage(1); setHasMore(true); setLoading(true);
  }, [typeParam, subParam]);

  useEffect(() => {
    if (!typeParam) { setLoading(false); return; }
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (page > 1) setLoadingMore(true);
    const subQ = subParam ? `&sub=${encodeURIComponent(subParam)}` : '';
    fetch(`/api/search?type=${encodeURIComponent(typeParam)}${subQ}&limit=${PAGE_SIZE}`)
      .then(r => r.json())
      .then(d => {
        const results = Array.isArray(d.results) ? d.results : [];
        setItems(prev => {
          const seen = new Set(prev.map(i => i.id));
          return [...prev, ...results.filter(i => !seen.has(i.id))];
        });
        setHasMore(results.length === PAGE_SIZE);
        setLoading(false); setLoadingMore(false);
        loadingRef.current = false;
      })
      .catch(() => { setLoading(false); setLoadingMore(false); loadingRef.current = false; });
  }, [typeParam, subParam, page]);

  const subs = SUB_MAP[typeParam] || [];

  // ── Loading states ────────────────────────────────────────────
  if (loading && items.length === 0) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.45rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--fg-faint)', marginBottom: '0.75rem' }}>Loading</p>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 300, letterSpacing: '-0.02em', color: 'var(--fg)' }}>{displayTitle}</h2>
      </div>
    </div>
  );

  if (!loading && items.length === 0) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', color: 'var(--fg-muted)' }}>No results for &ldquo;{displayTitle}&rdquo;</p>
      <button onClick={() => router.push('/wander')} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.45rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--fg-faint)', background: 'none', border: 'none', cursor: 'pointer' }}>
        ← Return to Index
      </button>
    </div>
  );

  return (
    <>
      <main style={{ minHeight: '100vh', background: 'var(--bg)', padding: '3rem' }}>

        {/* Header */}
        <div className="anim-fade-up" style={{ marginBottom: '2.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => router.push('/wander')} style={{ fontFamily: 'var(--font-mono)', fontSize: '0.45rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--fg-faint)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1.25rem', display: 'block', transition: 'color 0.2s' }}>
            ← Index
          </button>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '1.25rem', marginBottom: subs.length > 0 ? '1.5rem' : '0' }}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.75rem, 3vw, 2.75rem)', fontWeight: 300, letterSpacing: '-0.025em', color: 'var(--fg)', lineHeight: 1 }}>
              {displayTitle}
            </h1>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.45rem', letterSpacing: '0.12em', color: 'var(--fg-faint)', textTransform: 'uppercase' }}>
              {items.length.toLocaleString()} items
            </span>
          </div>
          {subs.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              <FilterPill active={!subParam} onClick={() => router.push(`/gallery?type=${encodeURIComponent(typeParam)}`)}>All</FilterPill>
              {subs.map(sub => (
                <FilterPill key={sub} active={subParam === sub}
                  onClick={() => router.push(`/gallery?type=${encodeURIComponent(typeParam)}&sub=${encodeURIComponent(sub)}`)}>
                  {sub}
                </FilterPill>
              ))}
            </div>
          )}
        </div>

        {/* Masonry grid */}
        <div ref={gridRef} style={{ columns: 'auto 220px', columnGap: '10px' }}>
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="gallery-card"
              style={{
                breakInside: 'avoid',
                marginBottom: '10px',
                animation: `card-in 0.5s cubic-bezier(0.16,1,0.3,1) ${Math.min(idx * 0.02, 0.55)}s both`,
              }}
              onClick={() => { hideTooltip(); setSelectedIdx(idx); }}
              onMouseEnter={() => showTooltip(item)}
              onMouseLeave={hideTooltip}
            >
              {/*
                .gallery-card-inner gets the dynamic box-shadow.
                Separate from the outer wrapper so the animation on the
                outer doesn't fight with the shadow RAF loop.
              */}
              <div
                className="gallery-card-inner"
                style={{
                  overflow: 'hidden',
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  // Initial shadow — RAF loop takes over immediately
                  boxShadow: '0 2px 8px rgba(13,12,10,0.06)',
                  transition: 'box-shadow 0.1s ease, transform 0.1s ease',
                  willChange: 'box-shadow, transform',
                }}
              >
                <img
                  src={imgUrl(item.imageUrl, 400)}
                  alt={item.title}
                  className="gallery-thumb"
                  style={{ width: '100%', height: 'auto', display: 'block', transition: 'transform 0.45s cubic-bezier(0.16,1,0.3,1)', willChange: 'transform', transform: 'translateZ(0)' }}
                  loading={idx < 24 ? 'eager' : 'lazy'}
                  decoding="async"
                />
              </div>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.42rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--fg-faint)', marginTop: '0.4rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.title}
              </p>
            </div>
          ))}
        </div>

        {/* Load more */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 0 2rem', gap: '1rem' }}>
          {loadingMore && <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.45rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>Loading…</p>}
          {!loadingMore && hasMore && (
            <button onClick={() => setPage(p => p + 1)}
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.48rem', letterSpacing: '0.22em', textTransform: 'uppercase', border: '1px solid var(--border-md)', padding: '0.75rem 2.5rem', background: 'transparent', color: 'var(--fg-muted)', cursor: 'pointer', transition: 'all 0.15s ease' }}
              onMouseEnter={e => { e.target.style.background = 'var(--fg)'; e.target.style.color = 'var(--bg)'; e.target.style.borderColor = 'var(--fg)'; }}
              onMouseLeave={e => { e.target.style.background = 'transparent'; e.target.style.color = 'var(--fg-muted)'; e.target.style.borderColor = 'var(--border-md)'; }}>
              Load More
            </button>
          )}
          {!hasMore && items.length > 0 && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.42rem', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>
              — {items.length.toLocaleString()} items —
            </p>
          )}
        </div>
      </main>

      <TooltipPortal tooltipRef={tooltipRef} />

      {/* Modal */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div key="backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={() => setSelectedIdx(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(10,9,8,0.94)', zIndex: 50 }}
            />
            <motion.div key="modal"
              initial={{ opacity: 0, scale: 0.97, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30, mass: 0.8 }}
              style={{ position: 'fixed', inset: 0, zIndex: 51, display: 'flex', pointerEvents: 'none' }}
            >
              {/* Image */}
              <div onClick={() => setSelectedIdx(null)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', minWidth: 0, pointerEvents: 'all', cursor: 'default' }}>
                <img key={selected.id} src={imgUrl(selected.imageUrl, 1600)} alt={selected.title}
                  onClick={e => e.stopPropagation()}
                  style={{ maxHeight: '88vh', maxWidth: '100%', objectFit: 'contain', cursor: 'default' }}
                />
              </div>

              {/* Metadata */}
              <div onClick={e => e.stopPropagation()}
                style={{ width: '17rem', flexShrink: 0, background: 'rgba(8,7,6,0.28)', backdropFilter: 'blur(22px) saturate(160%)', WebkitBackdropFilter: 'blur(22px) saturate(160%)', borderLeft: '1px solid rgba(247,246,241,0.07)', display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '2rem', pointerEvents: 'all' }}>
                <button onClick={() => setSelectedIdx(null)}
                  style={{ alignSelf: 'flex-end', fontFamily: 'var(--font-mono)', fontSize: '0.45rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--dark-faint)', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '2rem', transition: 'color 0.15s' }}
                  onMouseEnter={e => { e.target.style.color = 'var(--dark-fg)'; }}
                  onMouseLeave={e => { e.target.style.color = 'var(--dark-faint)'; }}>
                  ✕ Close
                </button>

                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.42rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--dark-faint)', marginBottom: '0.6rem' }}>
                  {SOURCE_LABELS[selected.source?.toLowerCase()] || selected.source}
                </p>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 300, letterSpacing: '-0.01em', lineHeight: 1.3, color: 'var(--dark-fg)', marginBottom: '2rem' }}>
                  {selected.title}
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {[['Artist', selected.author], ['Year', selected.year], ['Medium', selected.medium],
                    ['Category', selected.type], ['Sub', selected.subCategory], ['Department', selected.department]]
                    .filter(([, v]) => v?.toString().trim())
                    .map(([label, value]) => (
                      <div key={label}>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.38rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--dark-faint)', marginBottom: '0.25rem' }}>{label}</p>
                        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.65rem', color: 'var(--dark-muted)', lineHeight: 1.45 }}>{value}</p>
                      </div>
                    ))}
                </div>

                {selected.link && (
                  <a href={selected.link} target="_blank" rel="noopener noreferrer"
                    style={{ marginTop: '2rem', display: 'block', fontFamily: 'var(--font-mono)', fontSize: '0.42rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--dark-faint)', textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => { e.target.style.color = 'var(--dark-muted)'; }}
                    onMouseLeave={e => { e.target.style.color = 'var(--dark-faint)'; }}>
                    View at source →
                  </a>
                )}

                <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid var(--dark-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button onClick={() => setSelectedIdx(i => Math.max(i - 1, 0))} disabled={selectedIdx === 0}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--dark-muted)', background: 'none', border: 'none', cursor: selectedIdx === 0 ? 'default' : 'pointer', opacity: selectedIdx === 0 ? 0.3 : 1 }}>
                    ← Prev
                  </button>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.4rem', color: 'var(--dark-faint)', letterSpacing: '0.06em' }}>
                    {selectedIdx + 1}/{items.length}
                  </span>
                  <button onClick={() => setSelectedIdx(i => Math.min(i + 1, items.length - 1))} disabled={selectedIdx === items.length - 1}
                    style={{ fontFamily: 'var(--font-mono)', fontSize: '0.44rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--dark-muted)', background: 'none', border: 'none', cursor: selectedIdx === items.length - 1 ? 'default' : 'pointer', opacity: selectedIdx === items.length - 1 ? 0.3 : 1 }}>
                    Next →
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .gallery-card { cursor: pointer; }
        .gallery-card:hover .gallery-thumb { transform: scale(1.04) translateZ(0); }
        .gallery-thumb { will-change: transform; transform: translateZ(0); }
        @keyframes card-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

export default function GalleryPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.45rem', letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>Loading</p>
      </div>
    }>
      <GalleryInner />
    </Suspense>
  );
}