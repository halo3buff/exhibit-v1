'use client';
import { useEffect, useState, useRef, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import SaveToExhibit from '@/components/SaveToExhibit';
import { SOURCE_LABELS } from '@/lib/constants';
import { imgUrl } from '@/lib/images';
import { getArtworkFields } from '@/lib/artwork-fields';
import ScatterGrid from '@/components/gallery/ScatterGrid';
import TooltipPortal from '@/components/gallery/TooltipPortal';

const PAGE_SIZE = 50;

const CATS = [
  'Graphic Design',
  'Painting',
  'Prints & Drawings',
  'Photography',
  'Decorative Arts',
];

// ── Horizontal category strip (sticky below nav) ─────────────────────────────
function CategoryStrip({ counts, activeType, onSelect }) {
  return (
    <div style={{
      position:   'sticky',
      top:        44,
      zIndex:     90,
      display:    'flex',
      alignItems: 'center',
      gap:        36,
      padding:    '0 36px',
      height:     32,
      background: 'var(--bg)',
    }}>
      {CATS.map(cat => {
        const active = activeType === cat;
        return (
          <button
            key={cat}
            onClick={() => onSelect(cat)}
            style={{
              display:    'flex',
              alignItems: 'baseline',
              gap:        6,
              background: 'none',
              border:     'none',
              cursor:     'pointer',
              padding:    0,
              opacity:    activeType && !active ? 0.28 : active ? 1 : 0.55,
              transition: 'opacity 0.12s',
            }}
          >
            <span style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      8.5,
              fontWeight:    400,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color:         'var(--fg)',
            }}>
              {cat}
            </span>
            {counts[cat] > 0 && (
              <span style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      7.5,
                letterSpacing: '0.06em',
                color:         'var(--fg-faint)',
              }}>
                {counts[cat].toLocaleString()}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Collections / source filter row ──────────────────────────────────────────
function SourceStrip({ sources, selected, onToggle }) {
  if (!sources.length) return null;
  return (
    <div style={{
      position:   'sticky',
      top:        76,
      zIndex:     89,
      display:    'flex',
      alignItems: 'center',
      gap:        28,
      padding:    '0 36px',
      height:     28,
      background: 'var(--bg)',
    }}>
      {sources.map(({ source, n }) => {
        const active = selected.includes(source);
        const label  = SOURCE_LABELS[source] || source;
        return (
          <button
            key={source}
            onClick={() => onToggle(source)}
            style={{
              display:    'flex',
              alignItems: 'baseline',
              gap:        5,
              background: 'none',
              border:     'none',
              cursor:     'pointer',
              padding:    0,
              opacity:    selected.length && !active ? 0.22 : active ? 1 : 0.45,
              transition: 'opacity 0.12s',
            }}
          >
            <span style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      7.5,
              fontWeight:    400,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color:         'var(--fg)',
            }}>
              {label}
            </span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize:   7,
              color:      'var(--fg-faint)',
            }}>
              {n.toLocaleString()}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Gallery inner ─────────────────────────────────────────────────────────────
function GalleryInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const typeParam    = searchParams.get('type')    || '';
  const subParam     = searchParams.get('sub')     || '';
  const sourceParam  = searchParams.get('source')  || '';
  const yearMinParam = searchParams.get('yearMin');
  const yearMaxParam = searchParams.get('yearMax');
  const noDParam     = searchParams.get('noDate') === '1';

  const [items,            setItems]            = useState([]);
  const [page,             setPage]             = useState(1);
  const [hasMore,          setHasMore]          = useState(true);
  const [loading,          setLoading]          = useState(true);
  const [loadingMore,      setLoadingMore]      = useState(false);
  const [selectedIdx,      setSelectedIdx]      = useState(null);
  const [availableSources, setAvailableSources] = useState([]);
  const [globalCounts,     setGlobalCounts]     = useState({});

  const tooltipRef  = useRef(null);
  const loadingRef  = useRef(false);
  const ttRafRef    = useRef(null);
  const tooltipSize = useRef({ w: 280, h: 200 });

  const selected        = selectedIdx !== null ? items[selectedIdx] : null;
  const selectedSources = sourceParam ? sourceParam.split(',').filter(Boolean) : [];

  const updateParams = useCallback((updates) => {
    const p = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null || v === '' || v === undefined) p.delete(k);
      else p.set(k, String(v));
    });
    router.replace(`/gallery?${p.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handleCatSelect    = useCallback((cat) => {
    router.push(`/gallery?type=${encodeURIComponent(cat)}`, { scroll: false });
  }, [router]);

  const handleSourceToggle = useCallback((source) => {
    const next = selectedSources.includes(source)
      ? selectedSources.filter(s => s !== source)
      : [...selectedSources, source];
    updateParams({ source: next.length ? next.join(',') : null });
  }, [selectedSources, updateParams]);

  // Global category counts
  useEffect(() => {
    fetch('/api/search?counts=1')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.counts) setGlobalCounts(d.counts); })
      .catch(() => {});
  }, []);

  // Fetch available sources when category changes
  useEffect(() => {
    if (!typeParam) { setAvailableSources([]); return; }
    fetch(`/api/search?sources=1&type=${encodeURIComponent(typeParam)}`)
      .then(r => r.json())
      .then(s => setAvailableSources(s.sources || []))
      .catch(() => {});
  }, [typeParam]);

  // ── Tooltip ───────────────────────────────────────────────────
  const showTooltip = useCallback((item) => {
    const el = tooltipRef.current; if (!el) return;
    const sourceLabel = SOURCE_LABELS[item.source?.toLowerCase()] || item.source || '';
    el.querySelector('.tt-title').textContent  = item.title || '';
    el.querySelector('.tt-source').textContent = sourceLabel;
    const rows = getArtworkFields(item);
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
  }, [typeParam, subParam, sourceParam, yearMinParam, yearMaxParam, noDParam]);

  useEffect(() => {
    if (!typeParam) { setLoading(false); return; }
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (page > 1) setLoadingMore(true);
    const q = new URLSearchParams({ type: typeParam, limit: PAGE_SIZE });
    if (subParam)     q.set('sub',     subParam);
    if (sourceParam)  q.set('source',  sourceParam);
    if (yearMinParam) q.set('yearMin', yearMinParam);
    if (yearMaxParam) q.set('yearMax', yearMaxParam);
    if (noDParam)     q.set('noDate',  '1');
    fetch(`/api/search?${q}`)
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
  }, [typeParam, subParam, sourceParam, yearMinParam, yearMaxParam, noDParam, page]);

  const stripsHeight = 32 + (typeParam && availableSources.length ? 28 : 0);

  // ── Empty / no-category states ────────────────────────────────
  const noCategory = !typeParam;
  const noResults  = !loading && items.length === 0 && typeParam;

  return (
    <>
      <CategoryStrip
        counts={globalCounts}
        activeType={typeParam}
        onSelect={handleCatSelect}
      />

      {typeParam && (
        <SourceStrip
          sources={availableSources}
          selected={selectedSources}
          onToggle={handleSourceToggle}
        />
      )}

      <main style={{ padding: `40px 64px 80px`, background: 'var(--bg)', minHeight: `calc(100vh - 44px - ${stripsHeight}px)` }}>

        {/* ── Page header — small, top right ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 52, pointerEvents: 'none' }}>
          <div style={{ textAlign: 'right' }}>
            <h1 style={{
              fontFamily:    'var(--font-condensed)',
              fontSize:      'clamp(2rem, 4vw, 5rem)',
              fontWeight:    700,
              textTransform: 'uppercase',
              letterSpacing: '-0.01em',
              lineHeight:    0.88,
              color:         'var(--fg)',
              margin:        0,
              userSelect:    'none',
            }}>
              COLLECTION
            </h1>
            {typeParam && (
              <p style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      8,
                letterSpacing: '0.28em',
                textTransform: 'uppercase',
                color:         'var(--fg-faint)',
                margin:        '8px 0 0',
              }}>
                {typeParam.toUpperCase()}
                {items.length > 0 && ` — ${items.length.toLocaleString()}`}
              </p>
            )}
          </div>
        </div>

        {noCategory && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>
            Select a category above
          </p>
        )}

        {loading && items.length === 0 && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>Loading</p>
        )}

        {noResults && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>
            No results
          </p>
        )}

        {items.length > 0 && (
          <>
            <ScatterGrid
              items={items}
              onOpen={(item) => { hideTooltip(); setSelectedIdx(items.indexOf(item)); }}
              showTooltip={showTooltip}
              hideTooltip={hideTooltip}
            />

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', padding: '4rem 0 2rem', gap: '1rem' }}>
              {loadingMore && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>Loading…</p>
              )}
              {!loadingMore && hasMore && (
                <button
                  onClick={() => setPage(p => p + 1)}
                  style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', border: '1px solid var(--border-md)', padding: '12px 36px', background: 'transparent', color: 'var(--fg-muted)', cursor: 'pointer', transition: 'all 0.15s ease' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--fg)'; e.currentTarget.style.color = 'var(--bg)'; e.currentTarget.style.borderColor = 'var(--fg)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg-muted)'; e.currentTarget.style.borderColor = 'var(--border-md)'; }}
                >
                  Load More
                </button>
              )}
              {!hasMore && items.length > 0 && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>
                  {items.length.toLocaleString()} works
                </p>
              )}
            </div>
          </>
        )}
      </main>

      <TooltipPortal tooltipRef={tooltipRef} />

      {/* ── Expanded artwork view ── */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setSelectedIdx(null)}
              style={{
                position:             'fixed',
                inset:                0,
                zIndex:               50,
                background:           'rgba(232,229,222,0.5)',
                backdropFilter:       'blur(22px) brightness(1.04) saturate(0.85)',
                WebkitBackdropFilter: 'blur(22px) brightness(1.04) saturate(0.85)',
                cursor:               'default',
              }}
            />

            <motion.div
              key="modal"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ type: 'spring', stiffness: 340, damping: 32, mass: 0.9 }}
              style={{
                position:       'fixed',
                inset:          0,
                zIndex:         51,
                display:        'flex',
                alignItems:     'center',
                justifyContent: 'center',
                pointerEvents:  'none',
                padding:        '3rem 4rem',
                gap:            '5vw',
              }}
            >
              <div
                onClick={e => e.stopPropagation()}
                style={{ flexShrink: 0, maxWidth: '50vw', maxHeight: '84vh', pointerEvents: 'all', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}
              >
                <img
                  key={selected.id}
                  src={imgUrl(selected.imageUrl, 1200)}
                  alt={selected.title}
                  style={{ maxWidth: '100%', maxHeight: '84vh', objectFit: 'contain', display: 'block' }}
                />
              </div>

              <div
                onClick={e => e.stopPropagation()}
                style={{ flexShrink: 0, width: '22rem', maxHeight: '84vh', overflowY: 'auto', pointerEvents: 'all', display: 'flex', flexDirection: 'column', gap: 0 }}
              >
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.28em', textTransform: 'uppercase', color: 'var(--fg-faint)', margin: '0 0 12px' }}>
                  {SOURCE_LABELS[selected.source?.toLowerCase()] || selected.source}
                </p>

                <h2 style={{ fontFamily: 'var(--font-condensed)', fontSize: 'clamp(1.8rem, 3.5vw, 3rem)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '-0.01em', lineHeight: 0.92, color: 'var(--fg)', margin: '0 0 2rem' }}>
                  {selected.title}
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.4rem', marginBottom: '2rem' }}>
                  {[
                    ['Artist',     selected.author],
                    ['Year',       selected.year],
                    ['Medium',     selected.medium],
                    ['Category',   selected.type],
                    ['Sub',        selected.subCategory],
                    ['Department', selected.department],
                  ]
                    .filter(([, v]) => v?.toString().trim() && v !== 'Unknown' && v !== 'n.d.' && v !== 'Uncategorized')
                    .map(([label, value]) => (
                      <div key={label}>
                        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 7.5, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--fg-faint)', margin: '0 0 4px' }}>
                          {label}
                        </p>
                        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 300, color: 'var(--fg)', lineHeight: 1.5, margin: 0 }}>
                          {value}
                        </p>
                      </div>
                    ))
                  }
                </div>

                {selected.link && (
                  <a
                    href={selected.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--fg-faint)', textDecoration: 'none', transition: 'color 0.15s', marginBottom: '1.5rem', display: 'block' }}
                    onMouseEnter={e => e.target.style.color = 'var(--fg)'}
                    onMouseLeave={e => e.target.style.color = 'var(--fg-faint)'}
                  >
                    View at source →
                  </a>
                )}

                <div style={{ marginBottom: '2.5rem' }}>
                  <SaveToExhibit artworkId={selected.id} />
                </div>
              </div>
            </motion.div>

            <motion.div
              key="prevnext"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              style={{ position: 'fixed', bottom: 36, left: 0, right: 0, zIndex: 52, pointerEvents: 'none', display: 'flex', justifyContent: 'space-between', padding: '0 52px' }}
            >
              <button
                onClick={() => setSelectedIdx(i => Math.max(i - 1, 0))}
                disabled={selectedIdx === 0}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--fg)', background: 'none', border: 'none', cursor: selectedIdx === 0 ? 'default' : 'pointer', opacity: selectedIdx === 0 ? 0.3 : 1, pointerEvents: 'all', padding: 0 }}
              >
                ← Prev
              </button>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--fg-faint)', letterSpacing: '0.1em', pointerEvents: 'none' }}>
                {selectedIdx + 1} / {items.length}
              </span>
              <button
                onClick={() => setSelectedIdx(i => Math.min(i + 1, items.length - 1))}
                disabled={selectedIdx === items.length - 1}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--fg)', background: 'none', border: 'none', cursor: selectedIdx === items.length - 1 ? 'default' : 'pointer', opacity: selectedIdx === items.length - 1 ? 0.3 : 1, pointerEvents: 'all', padding: 0 }}
              >
                Next →
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default function GalleryPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>Loading</p>
      </div>
    }>
      <GalleryInner />
    </Suspense>
  );
}
