'use client';
// src/components/gallery/YearSlider.js
// Dual-handle year range slider for the gallery sidebar.

import { useRef } from 'react';

export default function YearSlider({ min, max, value, onChange }) {
  const [lo, hi] = value;
  const trackRef = useRef(null);
  const pct = (v) => ((v - min) / (max - min)) * 100;

  const dragHandle = (which, e) => {
    e.preventDefault();
    const track = trackRef.current; if (!track) return;
    const move = (ev) => {
      const rect    = track.getBoundingClientRect();
      const raw     = ((ev.clientX - rect.left) / rect.width) * (max - min) + min;
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
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fg-muted)', letterSpacing: '0.06em' }}>{lo}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--fg-muted)', letterSpacing: '0.06em' }}>{hi}</span>
      </div>
      <div ref={trackRef} style={{ position: 'relative', height: 2, background: 'var(--border-md)', cursor: 'pointer' }}>
        <div style={{ position: 'absolute', top: 0, height: '100%', left: `${pct(lo)}%`, right: `${100 - pct(hi)}%`, background: 'var(--fg-muted)' }} />
        {[['lo', lo], ['hi', hi]].map(([which, val]) => (
          <div key={which} onMouseDown={(e) => dragHandle(which, e)}
            style={{ position: 'absolute', top: '50%', left: `${pct(val)}%`, transform: 'translate(-50%,-50%)', width: 10, height: 10, background: 'var(--bg)', border: '1.5px solid var(--border-md)', cursor: 'grab', zIndex: 2 }}
          />
        ))}
      </div>
    </div>
  );
}
