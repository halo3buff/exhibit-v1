'use client';
import { useEffect, useState, useRef, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import SaveToExhibit from '@/components/SaveToExhibit';
import Sidebar, { SidebarSection, SidebarDivider, useSidebar } from '@/components/Sidebar';

// ── Seeded pseudo-random (stable layout per item index) ──────────────────────
function seededRand(seed) {
  const x = Math.sin(seed + 1) * 43758.5453123;
  return x - Math.floor(x);
}

// ── Scatter layout engine ─────────────────────────────────────────────────────
// Gravity-packer: N loose columns, each item placed in shortest column with
// slight x-jitter. Size varies by seeded random. No overlaps.
function useScatterLayout(items, containerWidth) {
  const [positions, setPositions] = useState([]);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const aspectsRef = useRef({});  // itemId → measured aspect ratio

  const recompute = useCallback(() => {
    if (!containerWidth || items.length === 0) return;

    const GAP        = 28;
    const MIN_W      = 200;
    const JITTER     = 18;   // max horizontal scatter pixels
    const SIZE_RANGE = 0.28; // ±28% size variation

    const cols     = Math.max(2, Math.floor((containerWidth + GAP) / (MIN_W + GAP)));
    const baseW    = (containerWidth - GAP * (cols - 1)) / cols;
    const colTops  = new Array(cols).fill(0);
    // Each column has a fixed x base
    const colX     = Array.from({ length: cols }, (_, c) => c * (baseW + GAP));

    const newPositions = items.map((item, idx) => {
      const rand      = seededRand(idx);
      const sizeScale = 1 - SIZE_RANGE / 2 + rand * SIZE_RANGE; // 0.86 – 1.14
      const w         = Math.round(baseW * sizeScale);
      const aspect    = aspectsRef.current[item.id] || 1.3; // default until measured
      const h         = Math.round(w / aspect) + 36; // 36px for caption

      // Find shortest column
      let shortestCol = 0;
      for (let c = 1; c < cols; c++) {
        if (colTops[c] < colTops[shortestCol]) shortestCol = c;
      }

      // Jitter x within ±JITTER without going outside canvas
      const jitter    = seededRand(idx + 999) * JITTER * 2 - JITTER;
      const x         = Math.max(0, Math.min(colX[shortestCol] + jitter, containerWidth - w));
      const y         = colTops[shortestCol];
      const colZone   = shortestCol; // for stagger animation

      colTops[shortestCol] += h + GAP;

      return { id: item.id, x, y, w, colZone };
    });

    setPositions(newPositions);
    setCanvasHeight(Math.max(...colTops));
  }, [items, containerWidth]);

  // Recompute when items or width changes
  useEffect(() => { recompute(); }, [recompute]);

  const onImageLoad = useCallback((itemId, naturalW, naturalH) => {
    if (naturalW && naturalH) {
      const prev = aspectsRef.current[itemId];
      const next = naturalW / naturalH;
      if (!prev || Math.abs(prev - next) > 0.05) {
        aspectsRef.current[itemId] = next;
        recompute();
      }
    }
  }, [recompute]);

  return { positions, canvasHeight, onImageLoad };
}

// ── ScatterGrid component ─────────────────────────────────────────────────────
function ScatterGrid({ items, onOpen, showTooltip, hideTooltip }) {
  const containerRef  = useRef(null);
  const [containerW, setContainerW] = useState(0);

  // Measure container width
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      const w = entries[0]?.contentRect.width;
      if (w) setContainerW(Math.floor(w));
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const { positions, canvasHeight, onImageLoad } = useScatterLayout(items, containerW);

  // Build position map for O(1) lookup
  const posMap = {};
  positions.forEach(p => { posMap[p.id] = p; });

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: canvasHeight || 'auto', minHeight: 400 }}>
      {items.map((item, idx) => {
        const pos = posMap[item.id];
        if (!pos) return null;

        // Stagger delay by column zone so items fade in column by column
        const delay = pos.colZone * 0.06 + (idx % 8) * 0.018;

        return (
          <div
            key={item.id}
            className="scatter-card"
            style={{
              position:  'absolute',
              left:       pos.x,
              top:        pos.y,
              width:      pos.w,
              cursor:    'pointer',
              animation: `scatter-in 0.5s cubic-bezier(0.16,1,0.3,1) ${Math.min(delay, 0.7)}s both`,
            }}
            onClick={() => { hideTooltip(); onOpen(item); }}
            onMouseEnter={() => showTooltip(item)}
            onMouseLeave={hideTooltip}
          >
            <img
              src={imgUrl(item.imageUrl, 1200)}
              alt={item.title}
              className="scatter-thumb"
              style={{ width: '100%', height: 'auto', display: 'block' }}
              loading={idx < 20 ? 'eager' : 'lazy'}
              decoding="async"
              onLoad={e => onImageLoad(item.id, e.target.naturalWidth, e.target.naturalHeight)}
            />
            <div style={{ marginTop: 7 }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 300, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>
                {item.title}
              </div>
              {item.author && item.author !== 'Unknown' && (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fg-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2, letterSpacing: '0.02em' }}>
                  {item.author}{item.year && item.year !== 'n.d.' ? `, ${item.year}` : ''}
                </div>
              )}
            </div>
          </div>
        );
      })}
      <style>{`
        @keyframes scatter-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}


const SUB_MAP = {
  'Graphic Design':    ['Posters & Advertising', 'Typography & Lettering', 'Identity & Branding', 'Editorial/Publication', 'Packaging'],
  'Painting':          ['Oil', 'Watercolor/Gouache', 'Tempera/Fresco'],
  'Prints & Drawings': ['Etching/Woodcut/Lithograph', 'Drawings', 'Collage'],
  'Photography':       ['Photograph'],
  'Decorative Arts':   ['Ceramics & Glass', 'Furniture', 'Textiles & Fashion', 'Metalwork & Jewelry'],
};

const PAGE_SIZE = 50;

const SOURCE_LABELS = {
  moma:               'MoMA',
  met:                'The Met',
  artic:              'Art Institute of Chicago',
  cooperhewitt:       'Cooper Hewitt',
  va:                 'Victoria & Albert Museum',
  rijks:              'Rijksmuseum',
  smithsonian:        'Smithsonian',
  zurich:             'Museum für Gestaltung Zürich',
  designarchive:      'AIGA Design Archives',
};

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
  designarchive: [
    ['Designer',       'author'],
    ['Year',           'year'],
    ['Category',       'subCategory'],
    ['Medium',         'medium'],
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
      const val = field === 'collection' ? sourceLabel : item[field];
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

// ── Filter link ───────────────────────────────────────────────────
function FilterLink({ children, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: active ? 500 : 400,
        letterSpacing: '0.18em', textTransform: 'uppercase',
        color: active ? 'var(--fg)' : 'var(--fg-faint)',
        background: 'none', border: 'none', padding: '0', cursor: 'pointer', transition: 'color 0.12s ease',
      }}
      onMouseEnter={e => { if (!active) e.target.style.color = 'var(--fg-muted)'; }}
      onMouseLeave={e => { if (!active) e.target.style.color = 'var(--fg-faint)'; }}
    >
      {children}
    </button>
  );
}

// ── Year range dual-handle slider ─────────────────────────────────
function YearSlider({ min, max, value, onChange }) {
  const [lo, hi] = value;
  const trackRef = useRef(null);
  const pct = (v) => ((v - min) / (max - min)) * 100;
  const dragHandle = (which, e) => {
    e.preventDefault();
    const track = trackRef.current; if (!track) return;
    const move = (ev) => {
      const rect = track.getBoundingClientRect();
      const raw  = ((ev.clientX - rect.left) / rect.width) * (max - min) + min;
      const snapped = Math.round(Math.max(min, Math.min(max, raw)) / 10) * 10;
      if (which === 'lo') onChange([Math.min(snapped, hi - 10), hi]);
      else                onChange([lo, Math.max(snapped, lo + 10)]);
    };
    const up = () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };
  return (
    <div style={{ padding: '4px 20px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(0,0,0,0.5)', letterSpacing: '0.06em' }}>{lo}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'rgba(0,0,0,0.5)', letterSpacing: '0.06em' }}>{hi}</span>
      </div>
      <div ref={trackRef} style={{ position: 'relative', height: 2, background: 'rgba(0,0,0,0.1)', cursor: 'pointer' }}>
        <div style={{ position: 'absolute', top: 0, height: '100%', left: `${pct(lo)}%`, right: `${100 - pct(hi)}%`, background: 'rgba(0,0,0,0.45)' }} />
        {[['lo', lo], ['hi', hi]].map(([which, val]) => (
          <div key={which} onMouseDown={(e) => dragHandle(which, e)}
            style={{ position: 'absolute', top: '50%', left: `${pct(val)}%`, transform: 'translate(-50%,-50%)', width: 12, height: 12, borderRadius: '50%', background: '#fafaf8', border: '1.5px solid rgba(0,0,0,0.4)', cursor: 'grab', zIndex: 2 }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Sidebar content ───────────────────────────────────────────────
function GallerySidebar({
  typeParam, subParam, onSubChange,
  availableSources, selectedSources, onSourceToggle,
  yearRange, yearValue, onYearChange,
  noDate, onNoDateChange,
  onBack, itemCount,
}) {
  const { open } = useSidebar();
  const subs = SUB_MAP[typeParam] || [];

  return (
    <>
      {/* ── Back link + count ── */}
      <div style={{ padding: open ? '0 20px 16px' : '0 0 16px', borderBottom: '1px solid rgba(0,0,0,0.06)', marginBottom: 16 }}>
        <button
          onClick={onBack}
          style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.52)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.15s', display: open ? 'block' : 'none' }}
          onMouseEnter={e => e.target.style.color = 'rgba(0,0,0,0.6)'}
          onMouseLeave={e => e.target.style.color = 'rgba(0,0,0,0.52)'}
        >
          ← Index
        </button>
        {open && itemCount > 0 && (
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em', color: 'rgba(0,0,0,0.40)', marginTop: 6, textTransform: 'uppercase' }}>
            {itemCount.toLocaleString()} items
          </p>
        )}
      </div>

      {/* Subcategory */}
      {subs.length > 0 && (
        <>
          <SidebarSection label="Category">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {['All', ...subs].map(sub => {
                const isActive = sub === 'All' ? !subParam : subParam === sub;
                return (
                  <button key={sub} onClick={() => onSubChange(sub === 'All' ? '' : sub)} title={sub}
                    style={{ padding: open ? '6px 20px' : '6px 0', textAlign: open ? 'left' : 'center', background: isActive ? 'rgba(0,0,0,0.05)' : 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: isActive ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.52)', fontWeight: isActive ? 500 : 400, transition: 'all 0.12s', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                    {open ? sub : sub[0]}
                  </button>
                );
              })}
            </div>
          </SidebarSection>
          <SidebarDivider />
        </>
      )}

      {/* Source institution filter */}
      {open && availableSources.length > 0 && (
        <>
          <SidebarSection label="Source">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {availableSources.map(({ source, n }) => {
                const isActive = selectedSources.includes(source);
                const label = SOURCE_LABELS[source] || source;
                return (
                  <button key={source} onClick={() => onSourceToggle(source)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 20px', background: isActive ? 'rgba(0,0,0,0.05)' : 'none', border: 'none', cursor: 'pointer', transition: 'all 0.12s', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: isActive ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.52)', fontWeight: isActive ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 7.5, color: 'rgba(0,0,0,0.36)', flexShrink: 0 }}>{n.toLocaleString()}</span>
                  </button>
                );
              })}
            </div>
          </SidebarSection>
          <SidebarDivider />
        </>
      )}

      {/* Year range */}
      {open && yearRange && (
        <SidebarSection label="Year">
          <YearSlider min={yearRange[0]} max={yearRange[1]} value={yearValue} onChange={onYearChange} />
          <button onClick={() => onNoDateChange(!noDate)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 20px', background: 'none', border: 'none', cursor: 'pointer', width: '100%' }}>
            <span style={{ width: 12, height: 12, flexShrink: 0, border: '1px solid rgba(0,0,0,0.3)', background: noDate ? 'rgba(0,0,0,0.65)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.12s' }}>
              {noDate && <span style={{ color: '#fff', fontSize: 8, lineHeight: 1 }}>✓</span>}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(0,0,0,0.55)' }}>Include undated</span>
          </button>
        </SidebarSection>
      )}
    </>
  );
}


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
    // Build URL — no `page` param so API uses pickRandom (preserves random order)
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




  const subs = SUB_MAP[typeParam] || [];

  // ── Loading state ─────────────────────────────────────────────
  if (loading && items.length === 0) return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 44px)' }}>
      <Sidebar><GallerySidebar typeParam={typeParam} subParam={subParam} onSubChange={handleSubChange} onBack={() => router.push('/wander')} itemCount={items.length} availableSources={availableSources} selectedSources={selectedSources} onSourceToggle={handleSourceToggle} yearRange={yearRange} yearValue={yearValue} onYearChange={handleYearChange} noDate={noDParam} onNoDateChange={handleNoDate} /></Sidebar>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--fg-faint)', marginBottom: 12 }}>Loading</p>
          <h2 style={{ fontFamily: 'var(--font-sans)', fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', fontWeight: 300, letterSpacing: '-0.02em', color: 'var(--fg)' }}>{displayTitle}</h2>
        </div>
      </div>
    </div>
  );

  if (!loading && items.length === 0) return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 44px)' }}>
      <Sidebar><GallerySidebar typeParam={typeParam} subParam={subParam} onSubChange={handleSubChange} onBack={() => router.push('/wander')} itemCount={items.length} availableSources={availableSources} selectedSources={selectedSources} onSourceToggle={handleSourceToggle} yearRange={yearRange} yearValue={yearValue} onYearChange={handleYearChange} noDate={noDParam} onNoDateChange={handleNoDate} /></Sidebar>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 300, color: 'var(--fg-muted)' }}>No results for "{displayTitle}"</p>
        <button onClick={() => router.push('/wander')} style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.3em', textTransform: 'uppercase', color: 'var(--fg-faint)', background: 'none', border: 'none', cursor: 'pointer' }}>
          ← Return to Index
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 44px)', background: 'var(--bg)' }}>

        <Sidebar>
          <GallerySidebar typeParam={typeParam} subParam={subParam} onSubChange={handleSubChange} onBack={() => router.push('/wander')} itemCount={items.length} availableSources={availableSources} selectedSources={selectedSources} onSourceToggle={handleSourceToggle} yearRange={yearRange} yearValue={yearValue} onYearChange={handleYearChange} noDate={noDParam} onNoDateChange={handleNoDate} />
        </Sidebar>

        <main style={{ flex: 1, minWidth: 0, padding: '32px 48px 80px 48px', background: 'var(--bg)' }}>

          {/* ── Category title — top right ── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 24, pointerEvents: 'none' }}>
            <p style={{
              fontFamily:    'var(--font-display)',
              fontSize:      'clamp(1.6rem, 2.8vw, 2.8rem)',
              fontWeight:    300,
              letterSpacing: '-0.02em',
              color:         'var(--fg)',
              opacity:       1,
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
      </div>

      <TooltipPortal tooltipRef={tooltipRef} />

      {/* ── Expanded view — floating metadata, warm blur backdrop ── */}
      <AnimatePresence>
        {selected && (
          <>
            {/* Warm milky blur backdrop — clicks outside to close */}
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

            {/* Content layer — image left of center, metadata floats right */}
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
              {/* Image — slightly left of center */}
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  flexShrink:     0,
                  maxWidth:       '50vw',
                  maxHeight:      '84vh',
                  pointerEvents:  'all',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'flex-end',
                }}
              >
                <img
                  key={selected.id}
                  src={imgUrl(selected.imageUrl, 1200)}
                  alt={selected.title}
                  style={{
                    maxWidth:   '100%',
                    maxHeight:  '84vh',
                    objectFit:  'contain',
                    display:    'block',
                    boxShadow:  '0 12px 60px rgba(0,0,0,0.12)',
                  }}
                />
              </div>

              {/* Floating metadata — no box, no border, pure typography */}
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  flexShrink:    0,
                  width:         '22rem',
                  maxHeight:     '84vh',
                  overflowY:     'auto',
                  pointerEvents: 'all',
                  display:       'flex',
                  flexDirection: 'column',
                  gap:           0,
                }}
              >
                {/* Source institution */}
                <p style={{
                  fontFamily:    'var(--font-mono)',
                  fontSize:      8,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color:         'rgba(0,0,0,0.35)',
                  margin:        0,
                  marginBottom:  10,
                }}>
                  {SOURCE_LABELS[selected.source?.toLowerCase()] || selected.source}
                </p>

                {/* Title */}
                <h2 style={{
                  fontFamily:    'var(--font-sans)',
                  fontSize:      '1.25rem',
                  fontWeight:    300,
                  letterSpacing: '-0.02em',
                  lineHeight:    1.3,
                  color:         'rgba(0,0,0,0.82)',
                  margin:        0,
                  marginBottom:  '2.5rem',
                }}>
                  {selected.title}
                </h2>

                {/* Metadata pairs — generous spacing, no container */}
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
                        <p style={{
                          fontFamily:    'var(--font-mono)',
                          fontSize:      7.5,
                          letterSpacing: '0.22em',
                          textTransform: 'uppercase',
                          color:         'rgba(0,0,0,0.3)',
                          margin:        0,
                          marginBottom:  4,
                        }}>
                          {label}
                        </p>
                        <p style={{
                          fontFamily: 'var(--font-sans)',
                          fontSize:   12,
                          fontWeight: 300,
                          color:      'rgba(0,0,0,0.72)',
                          lineHeight: 1.5,
                          margin:     0,
                        }}>
                          {value}
                        </p>
                      </div>
                    ))
                  }
                </div>

                {/* Source link */}
                {selected.link && (
                  <a
                    href={selected.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily:    'var(--font-mono)',
                      fontSize:      8,
                      letterSpacing: '0.2em',
                      textTransform: 'uppercase',
                      color:         'rgba(0,0,0,0.3)',
                      textDecoration:'none',
                      transition:    'color 0.15s',
                      marginBottom:  '1.5rem',
                      display:       'block',
                    }}
                    onMouseEnter={e => e.target.style.color = 'rgba(0,0,0,0.65)'}
                    onMouseLeave={e => e.target.style.color = 'rgba(0,0,0,0.3)'}
                  >
                    View at source →
                  </a>
                )}

                {/* Save to exhibit */}
                <div style={{ marginBottom: '2.5rem' }}>
                  <SaveToExhibit artworkId={selected.id} />
                </div>

                {/* spacer so metadata column doesn't feel cut off */}
                <div style={{ paddingBottom: '1rem' }} />
              </div>
            </motion.div>
            {/* ── Prev / Next — fixed bottom corners ── */}
            <motion.div
              key="prevnext"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              style={{ position: 'fixed', bottom: 36, left: 180, right: 0, zIndex: 52, pointerEvents: 'none', display: 'flex', justifyContent: 'space-between', padding: '0 52px' }}
            >
              <button
                onClick={() => setSelectedIdx(i => Math.max(i - 1, 0))}
                disabled={selectedIdx === 0}
                style={{
                  fontFamily:    'var(--font-mono)',
                  fontSize:      9,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color:         'rgba(0,0,0,0.72)',
                  background:    'none',
                  border:        'none',
                  cursor:        selectedIdx === 0 ? 'default' : 'pointer',
                  opacity:       selectedIdx === 0 ? 0.3 : 1,
                  pointerEvents: 'all',
                  padding:       0,
                  transition:    'color 0.15s',
                }}
                onMouseEnter={e => { if (selectedIdx > 0) e.target.style.color = 'rgba(0,0,0,0.9)'; }}
                onMouseLeave={e => e.target.style.color = 'rgba(0,0,0,0.72)'}
              >
                ← Prev
              </button>
              <span style={{
                fontFamily:    'var(--font-mono)',
                fontSize:      8,
                color:         'rgba(0,0,0,0.25)',
                letterSpacing: '0.1em',
                pointerEvents: 'none',
              }}>
                {selectedIdx + 1} / {items.length}
              </span>
              <button
                onClick={() => setSelectedIdx(i => Math.min(i + 1, items.length - 1))}
                disabled={selectedIdx === items.length - 1}
                style={{
                  fontFamily:    'var(--font-mono)',
                  fontSize:      9,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color:         'rgba(0,0,0,0.72)',
                  background:    'none',
                  border:        'none',
                  cursor:        selectedIdx === items.length - 1 ? 'default' : 'pointer',
                  opacity:       selectedIdx === items.length - 1 ? 0.3 : 1,
                  pointerEvents: 'all',
                  padding:       0,
                  transition:    'color 0.15s',
                }}
                onMouseEnter={e => { if (selectedIdx < items.length - 1) e.target.style.color = 'rgba(0,0,0,0.9)'; }}
                onMouseLeave={e => e.target.style.color = 'rgba(0,0,0,0.72)'}
              >
                Next →
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`
        .scatter-thumb { will-change: opacity, transform; transition: opacity 0.2s ease; }
        .scatter-card:hover .scatter-thumb { opacity: 0.82; }
      `}</style>
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