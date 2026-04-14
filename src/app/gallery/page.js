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
import GallerySidebar from '@/components/gallery/GallerySidebar';
import { useSidebarContent } from '@/hooks/useSidebarContent';

const PAGE_SIZE = 50;

// ── Gallery inner ─────────────────────────────────────────────────
function GalleryInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const typeParam    = searchParams.get('type')    || '';
  const subParam     = searchParams.get('sub')     || '';
  const sourceParam  = searchParams.get('source')  || '';
  const yearMinParam = searchParams.get('yearMin');
  const yearMaxParam = searchParams.get('yearMax');
  const noDParam     = searchParams.get('noDate') === '1';
  const displayTitle = subParam ? `${typeParam} — ${subParam}` : typeParam || 'Gallery';

  const [items,       setItems]       = useState([]);
  const [page,        setPage]        = useState(1);
  const [hasMore,     setHasMore]     = useState(true);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [availableSources, setAvailableSources] = useState([]);
  const [yearRange,        setYearRange]        = useState(null);

  const tooltipRef  = useRef(null);
  const loadingRef  = useRef(false);
  const ttRafRef    = useRef(null);
  const tooltipSize = useRef({ w: 280, h: 200 });

  const selected        = selectedIdx !== null ? items[selectedIdx] : null;
  const selectedSources = sourceParam ? sourceParam.split(',').filter(Boolean) : [];
  const yearValue       = yearRange
    ? [yearMinParam ? parseInt(yearMinParam) : yearRange[0], yearMaxParam ? parseInt(yearMaxParam) : yearRange[1]]
    : [1000, 2025];

  const updateParams = useCallback((updates) => {
    const p = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null || v === '' || v === undefined) p.delete(k);
      else p.set(k, String(v));
    });
    router.replace(`/gallery?${p.toString()}`, { scroll: false });
  }, [searchParams, router]);

  const handleSubChange    = useCallback((sub)    => updateParams({ sub: sub || null }), [updateParams]);
  const handleSourceToggle = useCallback((source) => {
    const next = selectedSources.includes(source)
      ? selectedSources.filter(s => s !== source)
      : [...selectedSources, source];
    updateParams({ source: next.length ? next.join(',') : null });
  }, [selectedSources, updateParams]);
  const handleYearChange   = useCallback(([lo, hi]) => {
    updateParams({ yearMin: lo <= (yearRange?.[0] ?? lo) ? null : lo, yearMax: hi >= (yearRange?.[1] ?? hi) ? null : hi });
  }, [yearRange, updateParams]);
  const handleNoDate       = useCallback((v) => updateParams({ noDate: v ? '1' : null }), [updateParams]);

  // Fetch source + year metadata when category changes
  useEffect(() => {
    if (!typeParam) return;
    Promise.all([
      fetch(`/api/search?sources=1&type=${encodeURIComponent(typeParam)}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/search?yearRange=1&type=${encodeURIComponent(typeParam)}`).then(r => r.json()).catch(() => ({})),
    ]).then(([s, y]) => {
      setAvailableSources(s.sources || []);
      if (y.minYear && y.maxYear) setYearRange([y.minYear, y.maxYear]);
    });
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

  // ── Data fetching ────────────────────────────────────────────
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

  // ── Sidebar content ───────────────────────────────────────────
  const sidebarProps = {
    typeParam, subParam, onSubChange: handleSubChange,
    availableSources, selectedSources, onSourceToggle: handleSourceToggle,
    yearRange, yearValue, onYearChange: handleYearChange,
    noDate: noDParam, onNoDateChange: handleNoDate,
    onBack: () => router.push('/'), itemCount: items.length,
  };

  const sidebarContent = useMemo(
    () => <GallerySidebar {...sidebarProps} />,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [typeParam, subParam, sourceParam, yearMinParam, yearMaxParam, noDParam, availableSources, selectedSources, yearRange, items.length],
  );

  useSidebarContent(sidebarContent);

  // ── Loading state ─────────────────────────────────────────────
  if (loading && items.length === 0) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--fg-faint)', marginBottom: 12 }}>Loading</p>
        <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', fontWeight: 300, letterSpacing: '-0.02em', color: 'var(--fg)' }}>{displayTitle}</h2>
      </div>
    </div>
  );

  if (!loading && items.length === 0) return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '1rem' }}>
      <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 300, color: 'var(--fg-muted)' }}>No results for "{displayTitle}"</p>
      <button onClick={() => router.push('/')} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--fg-faint)', background: 'none', border: 'none', cursor: 'pointer' }}>
        ← Return to Index
      </button>
    </div>
  );

  return (
    <>
      <main style={{ padding: '48px var(--gutter) 80px', background: 'var(--bg)' }}>

        {/* ── Category title ── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24, pointerEvents: 'none' }}>
          <p style={{
            fontFamily:    'var(--font-display)',
            fontSize:      'clamp(1.6rem, 2.8vw, 2.8rem)',
            fontWeight:    300,
            letterSpacing: '-0.02em',
            color:         'var(--fg)',
            margin:        0,
            lineHeight:    1,
            userSelect:    'none',
          }}>
            {displayTitle}
          </p>
        </div>

        {/* ── Scatter canvas grid ── */}
        <ScatterGrid
          items={items}
          onOpen={(item) => { hideTooltip(); setSelectedIdx(items.indexOf(item)); }}
          showTooltip={showTooltip}
          hideTooltip={hideTooltip}
        />

        {/* ── Load more ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '4rem 0 2rem', gap: '1rem' }}>
          {loadingMore && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>Loading…</p>
          )}
          {!loadingMore && hasMore && (
            <button
              onClick={() => setPage(p => p + 1)}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', border: '1px solid var(--border-md)', padding: '0.75rem 2.5rem', background: 'transparent', color: 'var(--fg-muted)', cursor: 'pointer', transition: 'all 0.15s ease' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--fg)'; e.currentTarget.style.color = 'var(--bg)'; e.currentTarget.style.borderColor = 'var(--fg)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--fg-muted)'; e.currentTarget.style.borderColor = 'var(--border-md)'; }}
            >
              Load More
            </button>
          )}
          {!hasMore && items.length > 0 && (
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>
              — {items.length.toLocaleString()} items —
            </p>
          )}
        </div>

      </main>

      <TooltipPortal tooltipRef={tooltipRef} />

      {/* ── Expanded view ── */}
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
                position:   'fixed',
                inset:      0,
                zIndex:     50,
                background: 'rgba(240,237,232,0.45)',
                backdropFilter:       'blur(22px) brightness(1.04) saturate(0.85)',
                WebkitBackdropFilter: 'blur(22px) brightness(1.04) saturate(0.85)',
                cursor:     'default',
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
              {/* Image */}
              <div
                onClick={e => e.stopPropagation()}
                style={{ flexShrink: 0, maxWidth: '50vw', maxHeight: '84vh', pointerEvents: 'all', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}
              >
                <img
                  key={selected.id}
                  src={imgUrl(selected.imageUrl, 1200)}
                  alt={selected.title}
                  style={{ maxWidth: '100%', maxHeight: '84vh', objectFit: 'contain', display: 'block', boxShadow: '0 12px 60px rgba(0,0,0,0.12)' }}
                />
              </div>

              {/* Floating metadata */}
              <div
                onClick={e => e.stopPropagation()}
                style={{ flexShrink: 0, width: '22rem', maxHeight: '84vh', overflowY: 'auto', pointerEvents: 'all', display: 'flex', flexDirection: 'column', gap: 0 }}
              >
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--fg-muted)', margin: '0 0 10px' }}>
                  {SOURCE_LABELS[selected.source?.toLowerCase()] || selected.source}
                </p>

                <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: '1.25rem', fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1.3, color: 'var(--fg)', margin: '0 0 2.5rem' }}>
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

            {/* ── Prev / Next ── */}
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
                style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--fg)', background: 'none', border: 'none', cursor: selectedIdx === 0 ? 'default' : 'pointer', opacity: selectedIdx === 0 ? 0.3 : 1, pointerEvents: 'all', padding: 0, transition: 'color 0.15s' }}
              >
                ← Prev
              </button>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--fg-faint)', letterSpacing: '0.1em', pointerEvents: 'none' }}>
                {selectedIdx + 1} / {items.length}
              </span>
              <button
                onClick={() => setSelectedIdx(i => Math.min(i + 1, items.length - 1))}
                disabled={selectedIdx === items.length - 1}
                style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--fg)', background: 'none', border: 'none', cursor: selectedIdx === items.length - 1 ? 'default' : 'pointer', opacity: selectedIdx === items.length - 1 ? 0.3 : 1, pointerEvents: 'all', padding: 0, transition: 'color 0.15s' }}
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
