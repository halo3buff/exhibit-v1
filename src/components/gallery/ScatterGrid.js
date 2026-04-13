'use client';
// src/components/gallery/ScatterGrid.js
// Absolute-positioned scatter grid of artwork thumbnails.

import { useState, useRef, useEffect } from 'react';
import { imgUrl } from '@/lib/images';
import useScatterLayout from '@/hooks/useScatterLayout';

export default function ScatterGrid({ items, onOpen, showTooltip, hideTooltip }) {
  const containerRef = useRef(null);
  const [containerW, setContainerW] = useState(0);

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

  const posMap = {};
  positions.forEach(p => { posMap[p.id] = p; });

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: canvasHeight || 'auto', minHeight: 400 }}>
      {items.map((item, idx) => {
        const pos = posMap[item.id];
        if (!pos) return null;

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
    </div>
  );
}
