'use client';
// src/components/exhibits/PreviewPanel.js
// Right-side editorial spread that shows artwork previews for a hovered exhibit.

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { hqUrl } from '@/lib/images';
import { hashSeed, mulberry32, fisherYates } from '@/lib/random';

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
      left:   (r.l + ix * r.w) * 100,
      top:    (r.t + iy * r.h) * 100,
      width:  (r.w * (1 - ix - ox)) * 100,
      height: (r.h * (1 - iy - oy)) * 100,
      scale,
    });
  }
  return boxes;
}

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
          <div style={{
            width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: `scale(${boxes[index].scale})`,
            transformOrigin: 'center center',
          }}>
            <img
              src={hqUrl(img.url)}
              alt=""
              style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', display: 'block' }}
              draggable={false}
              onError={e => { e.currentTarget.style.opacity = '0'; }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default function PreviewPanel({ exhibit, hoverTick }) {
  const rawImages = exhibit?.previewImages?.length > 0
    ? exhibit.previewImages
    : exhibit?.coverImageUrl ? [exhibit.coverImageUrl] : [];

  const pool = useMemo(
    () => rawImages.map(img =>
      typeof img === 'string' ? { url: img, width: null, height: null } : img,
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exhibit?.previewImages, exhibit?.coverImageUrl],
  );

  const pickSeed = exhibit?.id
    ? `${exhibit.id}:${hoverTick}:${pool.map(p => p.url).join('|')}`
    : '';

  const pickedImages = useMemo(
    () => (exhibit?.id ? pickRandomSix(pool, pickSeed) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                fontWeight:    400,
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
