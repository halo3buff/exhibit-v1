'use client';
// src/components/gallery/FilterLink.js
// Small uppercase filter toggle button used in the gallery sidebar.

export default function FilterLink({ children, active, onClick }) {
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
