'use client';
// src/app/page.js
// Archive index: full-viewport scatter field with floating category filter strip.

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { hqUrl } from '@/lib/images';

const CATS = [
  'Graphic Design',
  'Painting',
  'Prints & Drawings',
  'Photography',
  'Decorative Arts',
];

function generateSlots() {
  const slots = [];
  const widths = Array.from({ length: 4 }, () => 14 + Math.random() * 12);
  for (let i = 0; i < 4; i++) {
    const w = widths[i];
    const h = w * (0.9 + Math.random() * 0.6);
    let left, top, placed = false;
    for (let a = 0; a < 200; a++) {
      left = 2 + Math.random() * (94 - w);
      top  = 8 + Math.random() * (82 - h);
      const overlap = slots.some(s => {
        const dx = Math.abs(left - s.left);
        const dy = Math.abs(top  - s.top);
        return dx < (w + s.w) / 2 + 4 && dy < (h + s.h) / 2 + 4;
      });
      if (!overlap) { placed = true; break; }
    }
    if (!placed) { left = 2 + Math.random() * (94 - w); top = 8 + Math.random() * (82 - h); }
    slots.push({ left, top, w, h });
  }
  return slots;
}

// ── Category filter strip (fixed, below nav) ─────────────────────────────────
function CategoryStrip({ counts, activeCat, hoveredCat, onHover, onLeave, onClick }) {
  return (
    <div style={{
      position:   'fixed',
      top:        44,
      left:       0,
      right:      0,
      height:     32,
      zIndex:     90,
      display:    'flex',
      alignItems: 'center',
      gap:        36,
      padding:    '0 36px',
      background: 'var(--bg)',
    }}>
      {CATS.map(cat => {
        const active = activeCat === cat;
        const dimmed = hoveredCat && hoveredCat !== cat;
        return (
          <button
            key={cat}
            onMouseEnter={() => onHover(cat)}
            onMouseLeave={onLeave}
            onClick={() => onClick(cat)}
            style={{
              display:    'flex',
              alignItems: 'baseline',
              gap:        6,
              background: 'none',
              border:     'none',
              cursor:     'pointer',
              padding:    0,
              opacity:    dimmed ? 0.2 : active ? 1 : 0.45,
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

// ── Main page ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();

  const [counts,      setCounts]      = useState({});
  const [totalCount,  setTotalCount]  = useState(0);
  const [panelImgs,   setPanelImgs]   = useState([]);
  const [slots,       setSlots]       = useState(() => generateSlots());
  const [activeKey,   setActiveKey]   = useState(null);
  const [activeCat,   setActiveCat]   = useState(null);
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
    if (fetchAbortRef.current) { fetchAbortRef.current.abort(); fetchAbortRef.current = null; }
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

  function handleCatHover(cat) {
    setHoveredCat(cat);
    loadImages(`cat:${cat}`, `/api/search?type=${encodeURIComponent(cat)}&limit=12`);
  }

  function handleCatClick(cat) {
    setActiveCat(cat === activeCat ? null : cat);
    loadImages(`cat:${cat}`, `/api/search?type=${encodeURIComponent(cat)}&limit=12`);
  }

  return (
    <>
      <CategoryStrip
        counts={counts}
        activeCat={activeCat}
        hoveredCat={hoveredCat}
        onHover={handleCatHover}
        onLeave={() => setHoveredCat(null)}
        onClick={handleCatClick}
      />

      {/* ── Scatter field: full remaining viewport ── */}
      <div style={{
        position:   'relative',
        height:     'calc(100vh - 44px)',
        overflow:   'hidden',
        background: 'var(--bg)',
      }}>

        {/* ── ARCHIVE header — small, top right ── */}
        <div style={{
          position:      'absolute',
          top:           44,
          right:         36,
          zIndex:        2,
          pointerEvents: 'none',
          userSelect:    'none',
          textAlign:     'right',
        }}>
          <div style={{
            fontFamily:    'var(--font-condensed)',
            fontSize:      'clamp(1.8rem, 3.2vw, 4rem)',
            fontWeight:    700,
            textTransform: 'uppercase',
            letterSpacing: '-0.01em',
            lineHeight:    0.88,
            color:         'var(--fg)',
          }}>
            ARCHIVE
          </div>
        </div>

        {/* ── Scattered artworks ── */}
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
                transition={{ duration: 0.22, ease: 'easeOut', delay: i * 0.05 }}
                style={{
                  position: 'absolute',
                  top:      `${slot.top}%`,
                  left:     `${slot.left}%`,
                  width:    `${slot.w}%`,
                }}
              >
                <img
                  src={hqUrl(img.url)}
                  alt={img.title || ''}
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                  onError={e => { e.target.style.opacity = '0'; }}
                />
                {img.title && (
                  <div style={{ marginTop: 6 }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: 10, fontWeight: 300, color: 'var(--fg-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>
                      {img.title}
                    </div>
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

        {/* ── Artwork count — bottom left ── */}
        {totalCount > 0 && (
          <div style={{
            position:      'absolute',
            bottom:        28,
            left:          36,
            pointerEvents: 'none',
            userSelect:    'none',
          }}>
            <span style={{
              fontFamily:    'var(--font-sans)',
              fontSize:      13,
              fontWeight:    300,
              letterSpacing: '-0.01em',
              color:         'var(--fg-faint)',
            }}>
              {totalCount.toLocaleString()}
            </span>
            <span style={{
              fontFamily:    'var(--font-mono)',
              fontSize:      7.5,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color:         'var(--fg-faint)',
              marginLeft:    8,
            }}>
              Works Catalogued
            </span>
          </div>
        )}

        {/* ── Folio watermark — bottom right ── */}
        <div style={{
          position:      'absolute',
          bottom:        28,
          right:         36,
          fontFamily:    'var(--font-mono)',
          fontSize:      7,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color:         'var(--fg-faint)',
          userSelect:    'none',
          pointerEvents: 'none',
        }}>
          {(() => {
            const d = new Date();
            const roman = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][d.getMonth()];
            return `${roman} · ${d.getFullYear()}`;
          })()}
        </div>
      </div>
    </>
  );
}
