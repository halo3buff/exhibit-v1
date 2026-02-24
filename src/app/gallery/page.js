'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// SUB_MAP: exact same names as wander/page.js and build-database.js v6.1
const SUB_MAP = {
  'Photography': [
    'Gelatin Silver', 'Albumen Print', 'Color Print',
    'Digital Print', 'Salted Paper', 'Daguerreotype', 'Tintype',
  ],
  'Painting': [
    'Oil', 'Acrylic', 'Watercolor', 'Tempera', 'Miniature',
  ],
  'Works on Paper': [
    'Lithograph', 'Print', 'Drawing', 'Letterpress',
    'Illustrated Book', 'Magazine', 'Screenprint',
    'Poster', 'Etching', 'Engraving', 'Woodcut', 'Linocut',
  ],
  'Sculpture': [
    'Bronze', 'Stone', 'Terracotta', 'Medal', 'Plaster',
  ],
  'Decorative Art': [
    'Metalwork', 'Glass', 'Industrial Design', 'Textile',
    'Ceramics', 'Furniture', 'Vessel', 'Basketry', 'Jewelry',
  ],
  'Architecture': [
    'Drawing', 'Model', 'Plan', 'Elevation', 'Rendering',
  ],
};

/* ── TOOLTIP ─────────────────────────────────────────────────────────────── */
function ItemTooltip({ item, mousePos }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!ref.current) return;
    const { width, height } = ref.current.getBoundingClientRect();
    const OFFSET = 18;
    let x = mousePos.x + OFFSET;
    let y = mousePos.y + OFFSET;
    if (x + width  > window.innerWidth  - 12) x = mousePos.x - width  - OFFSET;
    if (y + height > window.innerHeight - 12) y = mousePos.y - height - OFFSET;
    setPos({ x: Math.max(12, x), y: Math.max(12, y) });
  }, [mousePos, item]);

  const SOURCE_LABELS = {
    moma: 'MoMA', met: 'The Met', artic: 'Art Institute of Chicago',
    cooperhewitt: 'Cooper Hewitt', va: 'Victoria & Albert',
    zurich: 'Museum für Gestaltung Zürich',
  };
  const sourceLabel = SOURCE_LABELS[item.source?.toLowerCase()] || item.source;

  const fields = [
    { label: 'Artist',         value: item.author },
    { label: 'Year',           value: item.year },
    { label: 'Medium',         value: item.medium },
    { label: 'Category',       value: item.type },
    { label: 'Sub-category',   value: item.sub_category },
    { label: 'Classification', value: item.classification },
    { label: 'Collection',     value: sourceLabel },
  ].filter(f => f.value?.toString().trim());

  return (
    <div ref={ref}
      style={{ position:'fixed', left:pos.x, top:pos.y, zIndex:9999, pointerEvents:'none', width:288 }}
      className="gallery-tooltip">
      <div style={{ background:'#0a0a0a', color:'#f5f5f0', boxShadow:'0 8px 40px rgba(0,0,0,0.35)' }}>
        <div style={{ padding:'14px 16px 12px', borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
          <p style={{ fontSize:11, fontWeight:500, letterSpacing:'0.01em', lineHeight:1.45,
            color:'#f5f5f0', margin:0, display:'-webkit-box', WebkitLineClamp:3,
            WebkitBoxOrient:'vertical', overflow:'hidden' }}>
            {item.title}
          </p>
        </div>
        <div style={{ padding:'10px 0' }}>
          {fields.map(({ label, value }) => (
            <div key={label} style={{ display:'grid', gridTemplateColumns:'88px 1fr',
              gap:'0 10px', padding:'4px 16px', alignItems:'baseline' }}>
              <span style={{ fontSize:8.5, letterSpacing:'0.12em', textTransform:'uppercase',
                color:'rgba(245,245,240,0.35)', fontWeight:400, whiteSpace:'nowrap' }}>{label}</span>
              <span style={{ fontSize:10.5, color:'rgba(245,245,240,0.82)', lineHeight:1.4,
                letterSpacing:'0.01em', wordBreak:'break-word' }}>{value}</span>
            </div>
          ))}
        </div>
        <div style={{ padding:'9px 16px', borderTop:'1px solid rgba(255,255,255,0.07)',
          display:'flex', alignItems:'center' }}>
          <span style={{ fontSize:7.5, letterSpacing:'0.14em', textTransform:'uppercase',
            color:'rgba(245,245,240,0.22)' }}>Click to expand</span>
          <span style={{ marginLeft:'auto', fontSize:7.5, letterSpacing:'0.1em',
            textTransform:'uppercase', color:'rgba(245,245,240,0.18)' }}>{sourceLabel}</span>
        </div>
      </div>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2,
        background:'linear-gradient(90deg, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0.08) 100%)' }} />
    </div>
  );
}

/* ── MAIN GALLERY PAGE ───────────────────────────────────────────────────── */
export default function GalleryPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const typeParam = searchParams.get('type') || '';
  const subParam  = searchParams.get('sub')  || '';

  // Display: "Photography" or "Photography — Gelatin Silver"
  const displayTitle = subParam ? `${typeParam} — ${subParam}` : typeParam || 'Gallery';

  const [items,        setItems]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState(null);
  const [brokenImages, setBrokenImages] = useState(new Set());
  const [hoveredItem,  setHoveredItem]  = useState(null);
  const [mousePos,     setMousePos]     = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e) => setMousePos({ x: e.clientX, y: e.clientY }), []);
  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [handleMouseMove]);

  // Fetch items whenever type OR sub changes
  useEffect(() => {
    if (!typeParam) { setLoading(false); return; }
    setLoading(true);
    setBrokenImages(new Set());

    // Build API URL — include &sub= param when a sub-category is selected
    const subQ = subParam ? `&sub=${encodeURIComponent(subParam)}` : '';
    fetch(`/api/search?type=${encodeURIComponent(typeParam)}${subQ}`)
      .then(r => r.json())
      .then(d  => { setItems(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => { setItems([]); setLoading(false); });
  }, [typeParam, subParam]);

  // Standard broken image (404 / network error)
  const handleImageError = (itemId) => setBrokenImages(prev => new Set([...prev, itemId]));

  // Placeholder detection: ARTIC/IA return a tiny box (200 OK) instead of 404.
  // Real images requested at 843px wide — anything < 200px is a placeholder.
  const handleImageLoad = (e, itemId) => {
    if (e.target.naturalWidth > 0 && e.target.naturalWidth < 200) {
      setBrokenImages(prev => new Set([...prev, itemId]));
    }
  };

  const subs         = SUB_MAP[typeParam] || [];
  const visibleItems = items.filter(item => !brokenImages.has(item.id));
  const hovered      = hoveredItem ? visibleItems.find(i => i.id === hoveredItem) : null;

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <p className="text-xs uppercase tracking-wider opacity-40 mb-2">Loading</p>
        <h2 className="text-2xl font-light">{displayTitle}</h2>
      </div>
    </div>
  );

  if (!visibleItems.length) return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
      <p className="text-sm opacity-60 mb-2">No results for "{displayTitle}"</p>
      {subParam && (
        <p className="text-xs opacity-40 mb-4">
          Try{' '}
          <button className="underline"
            onClick={() => router.push(`/gallery?type=${encodeURIComponent(typeParam)}`)}>
            all {typeParam}
          </button>
          {' '}or rebuild the database: <code className="text-[10px]">node scripts/build-database.js</code>
        </p>
      )}
      <button onClick={() => router.push('/wander')}
        className="text-xs uppercase tracking-wide opacity-40 hover:opacity-100">
        ← Return to Index
      </button>
    </div>
  );

  return (
    <>
      <style>{`
        .gallery-tooltip { animation: tooltip-in 0.12s cubic-bezier(0.16,1,0.3,1) both; }
        @keyframes tooltip-in { from{opacity:0;transform:translateY(4px) scale(0.98);}to{opacity:1;transform:none;} }
        .gallery-card:hover .gallery-thumb { transform: scale(1.03); }
        .gallery-thumb { transition: transform 0.4s cubic-bezier(0.16,1,0.3,1); }

        /* Sub-filter pills bar */
        .sf-pill {
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 4px 10px;
          border: 1px solid rgba(0,0,0,0.15);
          cursor: pointer;
          white-space: nowrap;
          background: transparent;
          color: rgba(0,0,0,0.5);
          transition: all 0.12s ease;
        }
        .sf-pill:hover { background: black; color: white; border-color: black; }
        .sf-pill.active { background: black; color: white; border-color: black; }
        .sf-pill.all-pill { border-color: rgba(0,0,0,0.4); color: rgba(0,0,0,0.7); font-weight: 600; }
        .sf-pill.all-pill.active { background: black; color: white; }
      `}</style>

      <main className="min-h-screen bg-white p-12">

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="mb-10 pb-5 border-b border-black/10">
          <button onClick={() => router.push('/wander')}
            className="text-[10px] uppercase tracking-wide opacity-40 hover:opacity-100 mb-4 block">
            ← Return to Index
          </button>

          <h1 className="text-3xl font-light tracking-tight">{displayTitle}</h1>
          <p className="text-xs opacity-40 mt-1">{visibleItems.length} items</p>

          {/* Sub-filter pill bar — only renders if this category has sub-categories */}
          {subs.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-5">
              {/* All pill */}
              <button
                className={`sf-pill all-pill${!subParam ? ' active' : ''}`}
                onClick={() => router.push(`/gallery?type=${encodeURIComponent(typeParam)}`)}
              >
                All
              </button>

              {/* One pill per sub-category */}
              {subs.map(sub => (
                <button
                  key={sub}
                  className={`sf-pill${subParam === sub ? ' active' : ''}`}
                  onClick={() =>
                    router.push(`/gallery?type=${encodeURIComponent(typeParam)}&sub=${encodeURIComponent(sub)}`)
                  }
                >
                  {sub}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Image grid ─────────────────────────────────────────── */}
        <div className="grid gap-6"
          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
          {visibleItems.map((item, idx) => (
            <div key={item.id}
              className="cursor-pointer gallery-card relative"
              onClick={() => setSelected(item)}
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}>
              <div className="w-full aspect-square border border-black/20 overflow-hidden bg-white">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover gallery-thumb"
                  loading={idx < 30 ? 'eager' : 'lazy'}
                  onLoad={(e) => handleImageLoad(e, item.id)}
                  onError={() => handleImageError(item.id)}
                />
              </div>
              <p className="text-[9px] uppercase tracking-wide opacity-40 mt-2 truncate">
                {item.title}
              </p>
            </div>
          ))}
        </div>
      </main>

      {/* Floating tooltip */}
      {hovered && <ItemTooltip item={hovered} mousePos={mousePos} />}

      {/* Detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 bg-white/95 flex items-center justify-center p-16"
          onClick={() => setSelected(null)}>
          <div className="max-w-5xl w-full flex gap-16 items-start"
            onClick={e => e.stopPropagation()}>
            <div className="flex-1">
              <img src={selected.imageUrl} alt={selected.title}
                className="w-full h-auto object-contain border border-black/10" />
            </div>
            <div className="w-[300px] space-y-6">
              <div>
                <h2 className="text-xl font-light mb-2">{selected.title}</h2>
                <p className="text-sm opacity-60">{selected.author}</p>
                <p className="text-xs opacity-40 mt-1">{selected.year}</p>
              </div>
              {selected.medium && (
                <div className="pt-4 border-t border-black/10">
                  <p className="text-[9px] uppercase tracking-wide opacity-40 mb-1">Medium</p>
                  <p className="text-xs opacity-70">{selected.medium}</p>
                </div>
              )}
              {selected.sub_category && (
                <div>
                  <p className="text-[9px] uppercase tracking-wide opacity-40 mb-1">Sub-Category</p>
                  {/* Clicking sub_category navigates to that filtered view */}
                  <button
                    className="text-xs opacity-70 underline underline-offset-2 text-left"
                    onClick={() => {
                      setSelected(null);
                      router.push(
                        `/gallery?type=${encodeURIComponent(selected.type)}&sub=${encodeURIComponent(selected.sub_category)}`
                      );
                    }}>
                    {selected.sub_category}
                  </button>
                </div>
              )}
              {selected.department && (
                <div>
                  <p className="text-[9px] uppercase tracking-wide opacity-40 mb-1">Department</p>
                  <p className="text-xs opacity-70">{selected.department}</p>
                </div>
              )}
              <div className="pt-4 border-t border-black/10">
                <p className="text-[9px] uppercase tracking-wide opacity-40 mb-1">Collection</p>
                <p className="text-xs">{selected.source}</p>
              </div>
              <div className="flex gap-3 pt-4">
                <a href={selected.link} target="_blank" rel="noopener noreferrer"
                  className="text-[10px] uppercase tracking-wide px-4 py-2 border border-black/20 hover:bg-black hover:text-white transition">
                  View Original
                </a>
                <button onClick={() => setSelected(null)}
                  className="text-[10px] uppercase tracking-wide px-4 py-2 opacity-40 hover:opacity-100">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}