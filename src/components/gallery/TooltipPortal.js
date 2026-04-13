'use client';
// src/components/gallery/TooltipPortal.js
// Fixed-position DOM tooltip rendered via ref; populated imperatively for perf.

export default function TooltipPortal({ tooltipRef }) {
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
