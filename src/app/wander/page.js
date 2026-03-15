'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

const CATS = [
  { id: 'Graphic Design'    },
  { id: 'Painting'          },
  { id: 'Prints & Drawings' },
  { id: 'Photography'       },
  { id: 'Decorative Arts'   },
];

const SUB_MAP = {
  'Graphic Design':    ['Posters & Advertising', 'Typography & Lettering', 'Identity & Branding', 'Editorial/Publication', 'Packaging'],
  'Painting':          ['Oil', 'Watercolor/Gouache', 'Tempera/Fresco'],
  'Prints & Drawings': ['Etching/Woodcut/Lithograph', 'Drawings', 'Collage'],
  'Photography':       ['Photograph'],
  'Decorative Arts':   ['Ceramics & Glass', 'Furniture', 'Textiles & Fashion', 'Metalwork & Jewelry'],
};

const SOURCES = [
  { id: 'met',           label: 'The Met'                  },
  { id: 'artic',         label: 'Art Institute of Chicago' },
  { id: 'cooperhewitt',  label: 'Cooper Hewitt'            },
  { id: 'va',            label: 'Victoria & Albert Museum' },
  { id: 'rijks',         label: 'Rijksmuseum'              },
  { id: 'smithsonian',   label: 'Smithsonian'              },
  { id: 'designarchive', label: 'AIGA Design Archives'     },
];

function hqUrl(url) {
  if (!url) return '';
  return `/api/img?url=${encodeURIComponent(url)}&size=1200`;
}

// Generates 4 random positions fresh on every image load.
// Tries to avoid overlaps via a simple rejection-sampling approach.
function generateSlots() {
  const slots = [];
  const widths = Array.from({ length: 4 }, () => 14 + Math.random() * 12);

  for (let i = 0; i < 4; i++) {
    const w = widths[i];
    const h = w * (0.9 + Math.random() * 0.6); // rough height estimate in vh

    let left, top, placed = false;

    for (let a = 0; a < 200; a++) {
      left = 2 + Math.random() * (94 - w);
      top  = 3 + Math.random() * (84 - h);

      const overlap = slots.some(s => {
        const dx = Math.abs(left - s.left);
        const dy = Math.abs(top  - s.top);
        return dx < (w + s.w) / 2 + 4 && dy < (h + s.h) / 2 + 4;
      });

      if (!overlap) { placed = true; break; }
    }

    if (!placed) {
      left = 2 + Math.random() * (94 - w);
      top  = 3 + Math.random() * (84 - h);
    }

    slots.push({ left, top, w, h });
  }

  return slots;
}

export default function WanderPage() {
  const router = useRouter();

  const [counts,      setCounts]      = useState({});
  const [totalCount,  setTotalCount]  = useState(0);
  const [expandedCat, setExpandedCat] = useState(null);
  const [panelImgs,   setPanelImgs]   = useState([]);
  const [slots,       setSlots]       = useState(() => generateSlots());
  const [activeKey,   setActiveKey]   = useState(null);
  const [hoveredCat,  setHoveredCat]  = useState(null);

  const imgCacheRef   = useRef({});
  const fetchAbortRef = useRef(null);

  useEffect(() => {
    fetch('/api/search?counts=1')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.counts) {
          setCounts(d.counts);
          setTotalCount(Object.values(d.counts).reduce((a, b) => a + b, 0));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch('/api/search?limit=12')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.results?.length) return;
        const entries = d.results
          .filter(r => r.imageUrl)
          .sort(() => Math.random() - 0.5)
          .slice(0, 4)
          .map(p => ({ url: p.imageUrl, title: p.title, author: p.author, year: p.year }));
        setPanelImgs(entries);
        setSlots(generateSlots());
        setActiveKey('__seed__');
      })
      .catch(() => {});
  }, []);

  const loadImages = useCallback((key, apiUrl) => {
    if (activeKey === key) return;
    if (imgCacheRef.current[key]) {
      setPanelImgs(imgCacheRef.current[key]);
      setSlots(generateSlots());
      setActiveKey(key);
      return;
    }
    if (fetchAbortRef.current) {
      fetchAbortRef.current.abort();
      fetchAbortRef.current = null;
    }
    const ctrl = new AbortController();
    fetchAbortRef.current = ctrl;
    fetch(apiUrl, { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d?.results?.length) return;
        const entries = d.results
          .filter(r => r.imageUrl)
          .sort(() => Math.random() - 0.5)
          .slice(0, 4)
          .map(p => ({ url: p.imageUrl, title: p.title, author: p.author, year: p.year }));
        imgCacheRef.current[key] = entries;
        setPanelImgs(entries);
        setSlots(generateSlots());
        setActiveKey(key);
      })
      .catch(() => {});
  }, [activeKey]);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '280px 1fr',
      height: '100vh',
      overflow: 'hidden',
      background: 'var(--bg)',
    }}>

      {/* LEFT */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '52px 32px 48px 48px',
        height: '100vh',
        overflow: 'hidden',
      }}>
        <div style={{ marginBottom: 36 }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600, letterSpacing: '0.26em', textTransform: 'uppercase', color: 'var(--fg)', marginBottom: 5 }}>EXHIBIT</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>Archive Index</div>
        </div>

        {totalCount > 0 && (
          <div style={{ marginBottom: 44 }}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 38, fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1, color: 'var(--fg)', marginBottom: 6 }}>{totalCount.toLocaleString()}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--fg-faint)' }}>works catalogued</div>
          </div>
        )}

        <div style={{ flex: 1, overflow: 'hidden' }}>
          {CATS.map(cat => {
            const subs   = SUB_MAP[cat.id] || [];
            const count  = counts[cat.id];
            const isOpen = expandedCat === cat.id;
            const dimmed = hoveredCat && hoveredCat !== cat.id;
            return (
              <div key={cat.id}>
                <div
                  onMouseEnter={() => { setHoveredCat(cat.id); loadImages(`cat:${cat.id}`, `/api/search?type=${encodeURIComponent(cat.id)}&limit=12`); }}
                  onMouseLeave={() => setHoveredCat(null)}
                  onClick={() => setExpandedCat(isOpen ? null : cat.id)}
                  style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '9px 0', cursor: 'pointer', userSelect: 'none', opacity: dimmed ? 0.22 : 1, transition: 'opacity 0.12s ease' }}
                >
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 400, color: 'var(--fg)', letterSpacing: '0.01em' }}>{cat.id}</span>
                  {count > 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fg-faint)', letterSpacing: '0.04em' }}>{count.toLocaleString()}</span>}
                </div>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div key="subs" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }} style={{ overflow: 'hidden', paddingBottom: 4 }}>
                      <div onClick={() => router.push(`/gallery?type=${encodeURIComponent(cat.id)}`)} style={{ padding: '5px 0 5px 16px', cursor: 'pointer', opacity: 0.4 }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--fg)' }}>All</span>
                      </div>
                      {subs.map(sub => (
                        <div key={sub}
                          onMouseEnter={() => loadImages(`sub:${cat.id}:${sub}`, `/api/search?type=${encodeURIComponent(cat.id)}&sub=${encodeURIComponent(sub)}&limit=12`)}
                          onClick={() => router.push(`/gallery?type=${encodeURIComponent(cat.id)}&sub=${encodeURIComponent(sub)}`)}
                          style={{ padding: '5px 0 5px 16px', cursor: 'pointer' }}
                        >
                          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 300, color: 'var(--fg-muted)', letterSpacing: '0.01em' }}>{sub}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        <div style={{ paddingTop: 28 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--fg-faint)', marginBottom: 10 }}>Collections</div>
          {SOURCES.map(src => (
            <div key={src.id} style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 300, color: 'var(--fg-faint)', lineHeight: 1.85, letterSpacing: '0.01em' }}>{src.label}</div>
          ))}
        </div>
      </div>

      {/* RIGHT: full images, random positions */}
      <div style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
        <AnimatePresence mode="sync">
          {panelImgs.map((img, i) => {
            const slot = slots[i];
            if (!slot || !img) return null;
            return (
              <motion.div
                key={`${activeKey}-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: 'easeOut', delay: i * 0.04 }}
                style={{
                  position: 'absolute',
                  top: `${slot.top}vh`,
                  left: `${slot.left}%`,
                  width: `${slot.w}%`,
                }}
              >
                {/* height: auto = full image, never cropped */}
                <img
                  src={hqUrl(img.url)}
                  alt={img.title || ''}
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                  onError={e => { e.target.style.opacity = '0'; }}
                />
                {img.title && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 300, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>{img.title}</div>
                    {img.author && img.author !== 'Unknown' && (
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fg-faint)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2, letterSpacing: '0.02em' }}>
                        {img.author}{img.year && img.year !== 'n.d.' ? `, ${img.year}` : ''}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

    </div>
  );
}